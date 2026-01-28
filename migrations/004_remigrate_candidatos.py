"""
Fix: Re-migrate candidatos with UNIQUE(dni, cargo_eleccion)

Prerequisite: Run 004_fix_candidato_unique_constraint.sql in Supabase SQL Editor first.

This script re-inserts all candidatos using the new composite unique constraint,
which allows 85 candidates with multiple candidacies to have separate records.
"""

import os
import json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

DATA_DIR = Path(__file__).parent.parent / "data"
CANDIDATOS_JSON = DATA_DIR / "candidatos_jne_2026.json"

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")


def main():
    from supabase import create_client

    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env")

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Load candidatos JSON
    print(f"Loading {CANDIDATOS_JSON}...")
    with open(CANDIDATOS_JSON, 'r', encoding='utf-8') as f:
        candidatos_raw = json.load(f)

    # Build partido_id map from existing DB
    print("Fetching partido IDs from Supabase...")
    partido_ids = {}
    result = supabase.table('quipu_partidos').select('id, nombre_oficial').execute()
    for p in result.data:
        partido_ids[p['nombre_oficial']] = p['id']
    print(f"  {len(partido_ids)} partidos found")

    # Prepare candidatos
    candidatos = []
    for c in candidatos_raw['candidatos']:
        candidato = {
            'dni': c.get('strDocumentoIdentidad'),
            'nombres': c.get('strNombres'),
            'apellido_paterno': c.get('strApellidoPaterno'),
            'apellido_materno': c.get('strApellidoMaterno'),
            'nombre_completo': f"{c.get('strNombres', '')} {c.get('strApellidoPaterno', '')} {c.get('strApellidoMaterno', '')}".strip(),
            'sexo': c.get('strSexo'),
            'organizacion_politica': c.get('strOrganizacionPolitica'),
            'tipo_eleccion': c.get('strTipoEleccion'),
            'cargo_postula': c.get('strCargo'),
            'cargo_eleccion': c.get('idCargo'),
            'ubigeo': c.get('strUbigeo'),
            'departamento': c.get('strDepartamento'),
            'provincia': c.get('strProvincia'),
            'distrito': c.get('strDistrito'),
            'foto_url': c.get('strNombre'),
            'estado': c.get('strEstadoCandidato'),
        }

        org = candidato['organizacion_politica']
        if org and org in partido_ids:
            candidato['partido_id'] = partido_ids[org]

        candidatos.append(candidato)

    # Count duplicates before insert
    from collections import Counter
    dni_counts = Counter(c['dni'] for c in candidatos if c['dni'])
    duplicates = {dni: count for dni, count in dni_counts.items() if count > 1}
    print(f"\n  Total candidatos in JSON: {len(candidatos)}")
    print(f"  Unique DNIs: {len(dni_counts)}")
    print(f"  DNIs with multiple candidacies: {len(duplicates)}")
    print(f"  Extra records to insert: {sum(c - 1 for c in duplicates.values())}")

    # Count existing records
    existing = supabase.table('quipu_candidatos').select('*', count='exact', head=True).execute()
    print(f"  Existing records in DB: {existing.count}")

    # Upsert with new composite constraint
    print(f"\nUpserting candidatos (on_conflict=dni,cargo_eleccion)...")
    batch_size = 100
    for i in range(0, len(candidatos), batch_size):
        batch = candidatos[i:i+batch_size]
        supabase.table('quipu_candidatos').upsert(batch, on_conflict='dni,cargo_eleccion').execute()

        done = min(i + batch_size, len(candidatos))
        if done % 1000 == 0 or done == len(candidatos):
            print(f"    {done:,}/{len(candidatos):,}")

    # Verify final count
    final = supabase.table('quipu_candidatos').select('*', count='exact', head=True).execute()
    print(f"\n  Records after migration: {final.count}")
    print(f"  New records inserted: {final.count - (existing.count or 0)}")

    # Re-link hojas de vida for any new records
    print("\nRe-linking hojas de vida...")
    # Build candidato_map (paginated)
    candidato_map = {}
    offset = 0
    page_size = 1000
    while True:
        result = (supabase.table('quipu_candidatos')
                  .select('id, dni')
                  .range(offset, offset + page_size - 1)
                  .execute())
        for c in result.data:
            if c.get('dni'):
                candidato_map[c['dni']] = c['id']
        if len(result.data) < page_size:
            break
        offset += page_size

    # Check hojas_vida with null candidato_id
    orphans = supabase.table('quipu_hojas_vida').select('id, id_hoja_vida, candidato_id', count='exact').is_('candidato_id', 'null').execute()
    print(f"  Hojas de vida with null candidato_id: {orphans.count}")

    print("\nDone!")
    print(f"\nReset sequence:")
    print(f"  SELECT setval('quipu_candidatos_id_seq', (SELECT COALESCE(MAX(id), 1) FROM quipu_candidatos));")


if __name__ == "__main__":
    main()
