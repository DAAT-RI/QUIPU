#!/usr/bin/env python3
"""
Insertar candidatos faltantes uno por uno
"""

import json
import os
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(Path(__file__).parent.parent.parent / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

INPUT_DIR = Path(r"C:\Entornos\candidatos\actualizar_vidas")
CANDIDATOS_FILE = INPUT_DIR / "candidatos_jne_2026_20260130_074153.json"
HOJAS_VIDA_FILE = INPUT_DIR / "hojas_vida_jne_2026_20260130_080101.json"
FALTANTES_FILE = Path(__file__).parent / "candidatos_faltantes.json"


def parse_fecha(fecha_str):
    if not fecha_str:
        return None
    fecha_str = fecha_str.split(" ")[0]
    for fmt in ["%d/%m/%Y", "%Y-%m-%d"]:
        try:
            return datetime.strptime(fecha_str, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def build_nombre_completo(nombres, ap_paterno, ap_materno):
    partes = []
    if ap_paterno:
        partes.append(ap_paterno.upper())
    if ap_materno:
        partes.append(ap_materno.upper())
    apellidos = " ".join(partes)
    if nombres:
        return f"{apellidos}, {nombres.title()}" if apellidos else nombres.title()
    return apellidos


def build_foto_url(guid_foto):
    if not guid_foto:
        return None
    return f"https://plataformaelectoral.jne.gob.pe/Fotos/{guid_foto}.jpg"


def main():
    print("Conectando a Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Cargar faltantes
    with open(FALTANTES_FILE, "r", encoding="utf-8") as f:
        faltantes = json.load(f)
    print(f"  - {len(faltantes)} candidatos faltantes")

    # Cargar datos completos del JNE
    with open(CANDIDATOS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    candidatos_jne = {c["strDocumentoIdentidad"]: c for c in data["candidatos"] if c.get("strDocumentoIdentidad")}

    with open(HOJAS_VIDA_FILE, "r", encoding="utf-8") as f:
        data_hv = json.load(f)
    hv_por_dni = {h["dni"]: h for h in data_hv["hojas_vida"] if h.get("dni")}

    # Obtener mapa de partidos
    partidos = supabase.table("quipu_partidos").select("id, nombre_oficial").execute()
    partido_map = {p["nombre_oficial"]: p["id"] for p in partidos.data}

    # Insertar candidatos faltantes uno por uno
    print(f"\nInsertando {len(faltantes)} candidatos faltantes...")
    inserted = 0
    errors = 0

    for i, f in enumerate(faltantes):
        dni = f["dni"]
        c = candidatos_jne.get(dni)
        if not c:
            continue

        hv = hv_por_dni.get(dni, {})
        partido = c.get("strOrganizacionPolitica", "")

        record = {
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
            "partido_id": partido_map.get(partido),
            "tipo_eleccion": c.get("strTipoEleccion"),
            "cargo_postula": c.get("strCargo"),
            "cargo_eleccion": c.get("idCargo"),
            "designacion": c.get("strCodExpedienteExt"),
            "ubigeo": c.get("strUbigeo"),
            "departamento": c.get("strDepartamento"),
            "provincia": c.get("strProvincia") or None,
            "distrito": c.get("strDistrito") or None,
            "foto_url": build_foto_url(c.get("strGuidFoto")),
            "email": hv.get("email"),
            "estado": c.get("strEstadoCandidato"),
        }

        try:
            supabase.table("quipu_candidatos").insert(record).execute()
            inserted += 1
        except Exception as e:
            errors += 1
            if "duplicate" not in str(e).lower():
                print(f"  ✗ Error {dni}: {e}")

        if (i + 1) % 50 == 0:
            print(f"  - {i + 1}/{len(faltantes)} procesados ({inserted} insertados)")

    print(f"\n✓ {inserted} candidatos insertados, {errors} errores/duplicados")

    # Ahora insertar hojas de vida para los nuevos candidatos
    print(f"\nInsertando hojas de vida para candidatos nuevos...")

    # Obtener IDs de candidatos recién insertados
    nuevos_dnis = [f["dni"] for f in faltantes]
    nuevos_cands = []
    for dni in nuevos_dnis:
        result = supabase.table("quipu_candidatos").select("id, dni").eq("dni", dni).limit(1).execute()
        if result.data:
            nuevos_cands.append(result.data[0])

    hv_inserted = 0
    hv_errors = 0

    for nc in nuevos_cands:
        dni = nc["dni"]
        hv = hv_por_dni.get(dni)
        if not hv:
            continue

        educacion = hv.get("educacion", {})
        sentencias = hv.get("sentencias", {})
        bienes = hv.get("bienes", {})

        record = {
            "candidato_id": nc["id"],
            "id_hoja_vida": str(hv.get("hv_id", "")),
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
        }

        try:
            supabase.table("quipu_hojas_vida").insert(record).execute()
            hv_inserted += 1
        except Exception as e:
            hv_errors += 1
            if "duplicate" not in str(e).lower():
                print(f"  ✗ Error HV {dni}: {e}")

    print(f"✓ {hv_inserted} hojas de vida insertadas, {hv_errors} errores/duplicados")

    # Verificación final
    print(f"\n{'='*60}")
    print("VERIFICACIÓN FINAL")
    print(f"{'='*60}")

    count_c = supabase.table("quipu_candidatos").select("id", count="exact").execute()
    count_h = supabase.table("quipu_hojas_vida").select("id", count="exact").execute()

    print(f"  - Candidatos: {count_c.count}")
    print(f"  - Hojas de vida: {count_h.count}")

    # Verificar Jean Paul Benavente específicamente
    jp = supabase.table("quipu_candidatos").select("*").eq("dni", "23932556").execute()
    if jp.data:
        print(f"\n✓ Jean Paul Benavente encontrado:")
        print(f"  - ID: {jp.data[0]['id']}")
        print(f"  - Nombre: {jp.data[0]['nombre_completo']}")
        print(f"  - Cargo: {jp.data[0]['cargo_postula']}")
        print(f"  - Partido: {jp.data[0]['organizacion_politica']}")


if __name__ == "__main__":
    main()
