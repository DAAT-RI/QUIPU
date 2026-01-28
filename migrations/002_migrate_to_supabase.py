"""
Script de migración: SQLite → Supabase
Proyecto: Quipu - Sistema Electoral Peru 2026

Uso:
    python 002_migrate_to_supabase.py

Requiere:
    - pip install supabase python-dotenv
    - Archivo .env con SUPABASE_URL y SUPABASE_KEY
"""

import os
import json
import time
import sqlite3
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Configuración
DATA_DIR = Path(__file__).parent.parent / "data"
SQLITE_DB = DATA_DIR / "promesas_v2.db"
HOJAS_VIDA_JSON = DATA_DIR / "hojas_vida_completas.json"
CANDIDATOS_JSON = DATA_DIR / "candidatos_jne_2026.json"

# Supabase config
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # Usar service key para bypass RLS


def get_supabase_client():
    """Inicializa cliente Supabase"""
    from supabase import create_client

    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Configurar SUPABASE_URL y SUPABASE_SERVICE_KEY en .env")

    return create_client(SUPABASE_URL, SUPABASE_KEY)


def migrate_partidos(sqlite_conn, supabase):
    """Migra tabla partidos_politicos"""
    print("\n[1/4] Migrando partidos_politicos...")

    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM partidos_politicos")
    columns = [desc[0] for desc in cursor.description]

    partidos = []
    for row in cursor.fetchall():
        partido = dict(zip(columns, row))
        # Convertir metadata de TEXT a JSONB si existe
        if partido.get('metadata'):
            try:
                partido['metadata'] = json.loads(partido['metadata'])
            except:
                partido['metadata'] = None
        partidos.append(partido)

    # Insertar en batches
    batch_size = 50
    for i in range(0, len(partidos), batch_size):
        batch = partidos[i:i+batch_size]
        supabase.table('quipu_partidos').upsert(batch).execute()

    print(f"    ✓ {len(partidos)} partidos migrados")
    return {p['nombre_oficial']: p['id'] for p in partidos}


def migrate_promesas(sqlite_conn, supabase):
    """Migra tabla promesas con embeddings"""
    print("\n[2/4] Migrando promesas...")

    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM promesas")
    total = cursor.fetchone()[0]
    print(f"    Total a migrar: {total:,}")

    cursor.execute("SELECT * FROM promesas")
    columns = [desc[0] for desc in cursor.description]

    batch_size = 20  # Batches chicos por peso de embeddings (1536 floats)
    migrated = 0

    while True:
        rows = cursor.fetchmany(batch_size)
        if not rows:
            break

        promesas = []
        for row in rows:
            promesa = dict(zip(columns, row))

            # Convertir embedding de JSON TEXT a array
            if promesa.get('embedding'):
                try:
                    promesa['embedding'] = json.loads(promesa['embedding'])
                except:
                    promesa['embedding'] = None

            promesas.append(promesa)

        # Retry con backoff por si hay timeout
        for attempt in range(3):
            try:
                supabase.table('quipu_promesas_planes').upsert(promesas).execute()
                break
            except Exception as e:
                if attempt < 2:
                    wait = 2 ** (attempt + 1)
                    print(f"    [RETRY] Timeout en batch, reintentando en {wait}s...")
                    time.sleep(wait)
                else:
                    raise

        migrated += len(promesas)

        if migrated % 500 == 0:
            print(f"    {migrated:,}/{total:,} promesas...")

    print(f"    ✓ {migrated:,} promesas migradas")


def migrate_candidatos(supabase, partido_ids):
    """Migra candidatos desde JSON"""
    print("\n[3/4] Migrando candidatos...")

    if not CANDIDATOS_JSON.exists():
        print("    [SKIP] candidatos_jne_2026.json no encontrado")
        return {}

    with open(CANDIDATOS_JSON, 'r', encoding='utf-8') as f:
        candidatos_raw = json.load(f)

    candidatos = []
    for c in candidatos_raw['candidatos']:
        dni = c.get('strDocumentoIdentidad')
        candidato = {
            'dni': dni,
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

        # Vincular con partido
        org = candidato['organizacion_politica']
        if org and org in partido_ids:
            candidato['partido_id'] = partido_ids[org]

        candidatos.append(candidato)

    # Insertar en batches (upsert por DNI)
    batch_size = 100
    for i in range(0, len(candidatos), batch_size):
        batch = candidatos[i:i+batch_size]
        supabase.table('quipu_candidatos').upsert(batch, on_conflict='dni').execute()

        if (i + batch_size) % 1000 == 0:
            print(f"    {i + batch_size:,}/{len(candidatos):,} candidatos...")

    print(f"    ✓ {len(candidatos):,} candidatos migrados")

    # Retornar mapeo dni -> id para vincular hojas_vida
    # Paginar porque Supabase retorna max 1000 rows por defecto
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

    print(f"    Mapeo DNI→ID: {len(candidato_map):,} candidatos")
    return candidato_map


def migrate_hojas_vida(supabase, candidato_ids):
    """Migra hojas de vida desde JSON"""
    print("\n[4/4] Migrando hojas de vida...")

    if not HOJAS_VIDA_JSON.exists():
        print("    [SKIP] hojas_vida_completas.json no encontrado")
        return

    with open(HOJAS_VIDA_JSON, 'r', encoding='utf-8') as f:
        hojas_raw = json.load(f)

    hojas = []
    for h in hojas_raw['hojas_vida']:
        id_hv = h.get('hv_id')
        educacion = h.get('educacion', {})
        sentencias = h.get('sentencias', {})
        bienes = h.get('bienes', {})

        hoja = {
            'id_hoja_vida': id_hv,
            'candidato_id': candidato_ids.get(h.get('dni')),
            'educacion_basica': {
                'primaria': educacion.get('edu_primaria'),
                'secundaria': educacion.get('edu_secundaria'),
            },
            'educacion_tecnica': None,
            'educacion_universitaria': educacion.get('edu_universitaria'),
            'posgrado': educacion.get('edu_posgrado'),
            'experiencia_laboral': h.get('experiencia_laboral'),
            'cargos_partidarios': h.get('cargos_partidarios'),
            'cargos_eleccion': None,
            'renuncias_partidos': None,
            'sentencias_penales': sentencias.get('penales'),
            'sentencias_obligaciones': sentencias.get('obligaciones'),
            'bienes_muebles': bienes.get('muebles'),
            'bienes_inmuebles': bienes.get('inmuebles'),
            'ingresos': h.get('ingresos'),
        }
        hojas.append(hoja)

    # Insertar en batches
    batch_size = 100
    for i in range(0, len(hojas), batch_size):
        batch = hojas[i:i+batch_size]
        supabase.table('quipu_hojas_vida').upsert(batch, on_conflict='id_hoja_vida').execute()

        if (i + batch_size) % 1000 == 0:
            print(f"    {i + batch_size:,}/{len(hojas):,} hojas...")

    print(f"    ✓ {len(hojas):,} hojas de vida migradas")


def main():
    print("=" * 60)
    print("MIGRACIÓN SQLite → Supabase")
    print("Proyecto: Quipu - Sistema Electoral Peru 2026")
    print("=" * 60)

    # Conectar SQLite
    print(f"\nConectando a SQLite: {SQLITE_DB}")
    sqlite_conn = sqlite3.connect(SQLITE_DB)

    # Conectar Supabase
    print("Conectando a Supabase...")
    supabase = get_supabase_client()

    try:
        # 1. Migrar partidos
        partido_ids = migrate_partidos(sqlite_conn, supabase)

        # 2. Migrar promesas
        migrate_promesas(sqlite_conn, supabase)

        # 3. Migrar candidatos
        candidato_ids = migrate_candidatos(supabase, partido_ids)

        # 4. Migrar hojas de vida
        migrate_hojas_vida(supabase, candidato_ids)

        print("\n" + "=" * 60)
        print("MIGRACIÓN COMPLETADA")
        print("=" * 60)

        print("\n[POST] Ejecutar en Supabase SQL Editor para resetear sequences:")
        print("""
    SELECT setval('quipu_partidos_id_seq', (SELECT COALESCE(MAX(id), 1) FROM quipu_partidos));
    SELECT setval('quipu_promesas_planes_id_seq', (SELECT COALESCE(MAX(id), 1) FROM quipu_promesas_planes));
        """)

    finally:
        sqlite_conn.close()


if __name__ == "__main__":
    main()
