#!/usr/bin/env python3
"""
Ejecutar migración de candidatos JNE 2026 a Supabase
Usa el service key para insertar datos en batches
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Cargar variables de entorno
load_dotenv(Path(__file__).parent.parent.parent / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

INPUT_DIR = Path(r"C:\Entornos\candidatos\actualizar_vidas")
CANDIDATOS_FILE = INPUT_DIR / "candidatos_jne_2026_20260130_074153.json"
HOJAS_VIDA_FILE = INPUT_DIR / "hojas_vida_jne_2026_20260130_080101.json"

BATCH_SIZE = 100


def parse_fecha(fecha_str):
    """Convierte fecha JNE a formato ISO"""
    if not fecha_str:
        return None
    fecha_str = fecha_str.split(" ")[0]
    for fmt in ["%d/%m/%Y", "%Y-%m-%d"]:
        try:
            dt = datetime.strptime(fecha_str, fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def build_nombre_completo(nombres, ap_paterno, ap_materno):
    """Construye nombre completo: APELLIDOS, Nombres"""
    partes = []
    if ap_paterno:
        partes.append(ap_paterno.upper())
    if ap_materno:
        partes.append(ap_materno.upper())
    apellidos = " ".join(partes)
    if nombres:
        nombres_title = nombres.title()
        return f"{apellidos}, {nombres_title}" if apellidos else nombres_title
    return apellidos


def build_foto_url(guid_foto):
    """Construye URL de foto del JNE"""
    if not guid_foto:
        return None
    return f"https://plataformaelectoral.jne.gob.pe/Fotos/{guid_foto}.jpg"


def main():
    print("=" * 60)
    print("MIGRACIÓN DE CANDIDATOS JNE 2026 A SUPABASE")
    print("=" * 60)

    # Conectar a Supabase
    print(f"\nConectando a Supabase: {SUPABASE_URL}")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✓ Conexión establecida")

    # Cargar datos
    print("\nCargando datos del JNE...")
    with open(CANDIDATOS_FILE, "r", encoding="utf-8") as f:
        data_candidatos = json.load(f)
    candidatos = data_candidatos["candidatos"]
    print(f"  - {len(candidatos):,} candidatos")

    with open(HOJAS_VIDA_FILE, "r", encoding="utf-8") as f:
        data_hv = json.load(f)
    hojas_vida = data_hv["hojas_vida"]
    print(f"  - {len(hojas_vida):,} hojas de vida")

    # Indexar hojas de vida por DNI
    hv_por_dni = {hv["dni"]: hv for hv in hojas_vida if hv.get("dni")}

    # =========================================
    # PARTE 1: Partidos
    # =========================================
    print("\n" + "=" * 60)
    print("PARTE 1: Insertando partidos...")
    print("=" * 60)

    partidos = set(c.get("strOrganizacionPolitica", "") for c in candidatos if c.get("strOrganizacionPolitica"))
    print(f"  - {len(partidos)} partidos únicos encontrados")

    # Obtener partidos existentes
    existing = supabase.table("quipu_partidos").select("nombre_oficial").execute()
    existing_names = {p["nombre_oficial"] for p in existing.data}
    print(f"  - {len(existing_names)} partidos ya existen en la DB")

    nuevos_partidos = [{"nombre_oficial": p} for p in partidos if p not in existing_names]
    if nuevos_partidos:
        for i in range(0, len(nuevos_partidos), BATCH_SIZE):
            batch = nuevos_partidos[i:i + BATCH_SIZE]
            supabase.table("quipu_partidos").insert(batch).execute()
        print(f"  ✓ {len(nuevos_partidos)} partidos nuevos insertados")
    else:
        print("  - No hay partidos nuevos que insertar")

    # Crear mapa de partidos
    all_partidos = supabase.table("quipu_partidos").select("id, nombre_oficial").execute()
    partido_id_map = {p["nombre_oficial"]: p["id"] for p in all_partidos.data}

    # =========================================
    # PARTE 2: Candidatos
    # =========================================
    print("\n" + "=" * 60)
    print("PARTE 2: Insertando candidatos...")
    print("=" * 60)

    # Obtener candidatos existentes (por dni + cargo_eleccion)
    existing_cands = supabase.table("quipu_candidatos").select("dni, cargo_eleccion").execute()
    existing_keys = {(c["dni"], c["cargo_eleccion"]) for c in existing_cands.data}
    print(f"  - {len(existing_keys)} candidatos ya existen en la DB")

    # Preparar candidatos nuevos
    candidatos_nuevos = []
    for c in candidatos:
        dni = c.get("strDocumentoIdentidad", "")
        cargo_eleccion = c.get("idCargo")
        if not dni or (dni, cargo_eleccion) in existing_keys:
            continue

        hv = hv_por_dni.get(dni, {})
        partido = c.get("strOrganizacionPolitica", "")

        candidatos_nuevos.append({
            "id_hoja_vida": str(hv.get("hv_id", "")) if hv.get("hv_id") else None,
            "dni": dni,
            "nombres": c.get("strNombres"),
            "apellido_paterno": c.get("strApellidoPaterno"),
            "apellido_materno": c.get("strApellidoMaterno"),
            "nombre_completo": build_nombre_completo(
                c.get("strNombres"),
                c.get("strApellidoPaterno"),
                c.get("strApellidoMaterno")
            ),
            "sexo": c.get("strSexo"),
            "fecha_nacimiento": parse_fecha(c.get("strFechaNacimiento")),
            "organizacion_politica": partido,
            "partido_id": partido_id_map.get(partido),
            "tipo_eleccion": c.get("strTipoEleccion"),
            "cargo_postula": c.get("strCargo"),
            "cargo_eleccion": cargo_eleccion,
            "designacion": c.get("strCodExpedienteExt"),
            "ubigeo": c.get("strUbigeo"),
            "departamento": c.get("strDepartamento"),
            "provincia": c.get("strProvincia") or None,
            "distrito": c.get("strDistrito") or None,
            "foto_url": build_foto_url(c.get("strGuidFoto")),
            "email": hv.get("email"),
            "estado": c.get("strEstadoCandidato"),
        })

    print(f"  - {len(candidatos_nuevos)} candidatos nuevos a insertar")

    # Insertar en batches
    inserted = 0
    errors = 0
    for i in range(0, len(candidatos_nuevos), BATCH_SIZE):
        batch = candidatos_nuevos[i:i + BATCH_SIZE]
        try:
            supabase.table("quipu_candidatos").insert(batch).execute()
            inserted += len(batch)
            if (i + BATCH_SIZE) % 1000 == 0 or i + BATCH_SIZE >= len(candidatos_nuevos):
                print(f"    - {inserted:,} / {len(candidatos_nuevos):,} insertados...")
        except Exception as e:
            errors += len(batch)
            print(f"    ✗ Error en batch {i}: {e}")

    print(f"  ✓ {inserted:,} candidatos insertados, {errors} errores")

    # =========================================
    # PARTE 3: Hojas de vida
    # =========================================
    print("\n" + "=" * 60)
    print("PARTE 3: Insertando hojas de vida...")
    print("=" * 60)

    # Obtener hojas de vida existentes
    existing_hv = supabase.table("quipu_hojas_vida").select("id_hoja_vida").execute()
    existing_hv_ids = {h["id_hoja_vida"] for h in existing_hv.data}
    print(f"  - {len(existing_hv_ids)} hojas de vida ya existen")

    # Obtener mapa de candidatos (dni -> id, preferir cargo más importante)
    all_cands = supabase.table("quipu_candidatos").select("id, dni, cargo_postula").execute()

    # Ordenar por importancia del cargo
    def cargo_priority(cargo):
        if not cargo:
            return 99
        cargo = cargo.upper()
        if "PRESIDENTE DE LA REP" in cargo:
            return 1
        if "VICEPRESIDENTE" in cargo:
            return 2
        if "SENADOR" in cargo:
            return 3
        if "DIPUTADO" in cargo:
            return 4
        return 5

    cand_por_dni = {}
    for c in sorted(all_cands.data, key=lambda x: cargo_priority(x.get("cargo_postula"))):
        dni = c["dni"]
        if dni not in cand_por_dni:
            cand_por_dni[dni] = c["id"]

    # Preparar hojas de vida nuevas
    hojas_nuevas = []
    for hv in hojas_vida:
        hv_id = str(hv.get("hv_id", ""))
        dni = hv.get("dni", "")
        if not hv_id or hv_id in existing_hv_ids or dni not in cand_por_dni:
            continue

        educacion = hv.get("educacion", {})
        sentencias = hv.get("sentencias", {})
        bienes = hv.get("bienes", {})

        hojas_nuevas.append({
            "candidato_id": cand_por_dni[dni],
            "id_hoja_vida": hv_id,
            "educacion_basica": {
                "primaria": educacion.get("edu_primaria", ""),
                "secundaria": educacion.get("edu_secundaria", "")
            },
            "educacion_tecnica": educacion.get("edu_tecnica") or None,
            "educacion_universitaria": educacion.get("edu_universitaria", []),
            "posgrado": educacion.get("edu_posgrado", []),
            "experiencia_laboral": hv.get("experiencia_laboral", []),
            "cargos_partidarios": hv.get("cargos_partidarios", []),
            "cargos_eleccion": hv.get("cargos_eleccion", []),
            "renuncias_partidos": hv.get("renuncias_partidos", []),
            "sentencias_penales": sentencias.get("penales", []),
            "sentencias_obligaciones": sentencias.get("obligaciones", []),
            "bienes_muebles": bienes.get("muebles", []),
            "bienes_inmuebles": bienes.get("inmuebles", []),
            "ingresos": hv.get("ingresos", {}),
        })

    print(f"  - {len(hojas_nuevas)} hojas de vida nuevas a insertar")

    # Insertar en batches
    inserted = 0
    errors = 0
    for i in range(0, len(hojas_nuevas), BATCH_SIZE):
        batch = hojas_nuevas[i:i + BATCH_SIZE]
        try:
            supabase.table("quipu_hojas_vida").insert(batch).execute()
            inserted += len(batch)
            if (i + BATCH_SIZE) % 1000 == 0 or i + BATCH_SIZE >= len(hojas_nuevas):
                print(f"    - {inserted:,} / {len(hojas_nuevas):,} insertados...")
        except Exception as e:
            errors += len(batch)
            print(f"    ✗ Error en batch {i}: {e}")

    print(f"  ✓ {inserted:,} hojas de vida insertadas, {errors} errores")

    # =========================================
    # VERIFICACIÓN
    # =========================================
    print("\n" + "=" * 60)
    print("VERIFICACIÓN FINAL")
    print("=" * 60)

    count_partidos = supabase.table("quipu_partidos").select("id", count="exact").execute()
    count_candidatos = supabase.table("quipu_candidatos").select("id", count="exact").execute()
    count_hv = supabase.table("quipu_hojas_vida").select("id", count="exact").execute()

    print(f"  - Partidos: {count_partidos.count}")
    print(f"  - Candidatos: {count_candidatos.count}")
    print(f"  - Hojas de vida: {count_hv.count}")

    # Verificar clientes
    try:
        clientes = supabase.rpc("get_clientes_con_candidatos").execute()
        print(f"\n  Candidatos por cliente:")
        for c in clientes.data:
            print(f"    - {c['nombre']}: {c['total_candidatos']} candidatos")
    except:
        pass

    print("\n" + "=" * 60)
    print("¡MIGRACIÓN COMPLETADA!")
    print("=" * 60)


if __name__ == "__main__":
    main()
