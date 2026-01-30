#!/usr/bin/env python3
"""
Verificar qué candidatos del JNE faltan en Supabase
"""

import json
import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(Path(__file__).parent.parent.parent / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

INPUT_DIR = Path(r"C:\Entornos\candidatos\actualizar_vidas")
CANDIDATOS_FILE = INPUT_DIR / "candidatos_jne_2026_20260130_074153.json"


def main():
    print("Conectando a Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Cargar candidatos del JSON
    print("Cargando candidatos del JNE...")
    with open(CANDIDATOS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    candidatos_jne = data["candidatos"]
    print(f"  - {len(candidatos_jne):,} candidatos en archivo JNE")

    # Obtener TODOS los candidatos de Supabase (paginando)
    print("Obteniendo candidatos de Supabase...")
    all_db = []
    offset = 0
    while True:
        result = supabase.table("quipu_candidatos").select("dni, cargo_eleccion, nombre_completo").range(offset, offset + 999).execute()
        all_db.extend(result.data)
        if len(result.data) < 1000:
            break
        offset += 1000
    print(f"  - {len(all_db):,} candidatos en Supabase")

    # Crear set de claves existentes
    db_keys = {(c["dni"], c["cargo_eleccion"]) for c in all_db}

    # Encontrar faltantes
    faltantes = []
    for c in candidatos_jne:
        dni = c.get("strDocumentoIdentidad", "")
        cargo = c.get("idCargo")
        if dni and cargo and (dni, cargo) not in db_keys:
            faltantes.append({
                "dni": dni,
                "nombre": f"{c.get('strApellidoPaterno', '')} {c.get('strApellidoMaterno', '')}, {c.get('strNombres', '')}",
                "cargo": c.get("strCargo", ""),
                "partido": c.get("strOrganizacionPolitica", ""),
                "tipo_eleccion": c.get("strTipoEleccion", "")
            })

    print(f"\n{'='*60}")
    print(f"CANDIDATOS FALTANTES: {len(faltantes)}")
    print(f"{'='*60}")

    if faltantes:
        # Agrupar por tipo de elección
        por_tipo = {}
        for f in faltantes:
            tipo = f["tipo_eleccion"]
            if tipo not in por_tipo:
                por_tipo[tipo] = []
            por_tipo[tipo].append(f)

        print("\nPor tipo de elección:")
        for tipo, lista in sorted(por_tipo.items(), key=lambda x: -len(x[1])):
            print(f"  - {tipo}: {len(lista)}")

        print("\nPrimeros 20 faltantes:")
        for i, f in enumerate(faltantes[:20]):
            print(f"  {i+1}. {f['nombre']} ({f['dni']}) - {f['cargo']} - {f['partido']}")

        # Guardar lista completa
        output_file = Path(__file__).parent / "candidatos_faltantes.json"
        with open(output_file, "w", encoding="utf-8") as out:
            json.dump(faltantes, out, ensure_ascii=False, indent=2)
        print(f"\nLista completa guardada en: {output_file}")
    else:
        print("\n¡Todos los candidatos están en la base de datos!")

    # Verificar hojas de vida
    print(f"\n{'='*60}")
    print("VERIFICANDO HOJAS DE VIDA")
    print(f"{'='*60}")

    hv_db = []
    offset = 0
    while True:
        result = supabase.table("quipu_hojas_vida").select("id_hoja_vida, candidato_id").range(offset, offset + 999).execute()
        hv_db.extend(result.data)
        if len(result.data) < 1000:
            break
        offset += 1000
    print(f"  - {len(hv_db):,} hojas de vida en Supabase")

    # Candidatos sin hoja de vida
    cands_con_hv = {h["candidato_id"] for h in hv_db}
    cands_sin_hv = [c for c in all_db if c.get("dni") and c["dni"] not in {h.get("dni") for h in hv_db}]

    # Contar por tipo
    print(f"\n{'='*60}")
    print("RESUMEN POR TIPO DE ELECCIÓN")
    print(f"{'='*60}")

    tipos = supabase.rpc("count_candidatos_por_tipo").execute()
    if tipos.data:
        for t in tipos.data:
            print(f"  - {t['tipo_eleccion']}: {t['count']}")


if __name__ == "__main__":
    main()
