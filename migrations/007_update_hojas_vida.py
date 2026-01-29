"""
Migration 007: Actualizar Hojas de Vida JNE 2026

Fuente: hojas_vida_jne_2026_20260129_143748.json (53.3MB, 8,116 registros)
Destino: quipu_hojas_vida (Supabase)

Prerequisito: Ejecutar 007_add_hojas_vida_columns.sql en Supabase SQL Editor primero.

Nuevos campos:
- estado_hv, porcentaje_completitud, fecha_termino_registro
- verificaciones (JSONB): sunedu, sunarp, minedu_tec, infogob, rop, rop_renuncia
- indicadores (JSONB): 15 booleanos (tiene_experiencia_laboral, etc)
- cargos_postula, titularidades, declaraciones_juradas (JSONB)
- carne_extranjeria, ubigeo_nacimiento, ubigeo_domicilio
"""

import os
import json
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Archivo fuente
JSON_FILE = Path("C:/Entornos/candidatos/actualizar_vidas/hojas_vida_jne_2026_20260129_143748.json")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")


def parse_date(date_str):
    """Parsea fecha DD/MM/YYYY HH:MM:SS a ISO"""
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, "%d/%m/%Y %H:%M:%S").isoformat()
    except:
        try:
            # Intentar formato alternativo DD/MM/YYYY
            return datetime.strptime(date_str, "%d/%m/%Y").isoformat()
        except:
            return None


def safe_get(d, *keys, default=None):
    """Obtener valor anidado de forma segura"""
    result = d
    for key in keys:
        if isinstance(result, dict):
            result = result.get(key, default)
        else:
            return default
    return result


def map_hoja_vida(h):
    """Mapea registro JSON a estructura de Supabase"""

    # Extraer educacion de forma segura
    educacion = h.get('educacion', {}) or {}

    # Extraer bienes de forma segura
    bienes = h.get('bienes', {}) or {}

    # Extraer sentencias de forma segura
    sentencias = h.get('sentencias', {}) or {}

    return {
        'id_hoja_vida': str(h.get('hv_id') or h.get('id_hoja_vida') or ''),

        # Nuevos campos de estado
        'estado_hv': h.get('estado_hv'),
        'porcentaje_completitud': h.get('porcentaje_completitud'),
        'fecha_termino_registro': parse_date(h.get('fecha_termino_registro')),

        # Verificaciones agrupadas en JSONB
        'verificaciones': {
            'sunedu': h.get('verificacion_sunedu'),
            'sunarp': h.get('verificacion_sunarp'),
            'minedu_tec': h.get('verificacion_minedu_tec'),
            'infogob': h.get('verificacion_infogob'),
            'rop': h.get('verificacion_rop'),
            'rop_renuncia': h.get('verificacion_rop_renuncia'),
        },

        # Indicadores booleanos (vienen ya como objeto en el JSON)
        'indicadores': h.get('indicadores'),

        # Educacion (mapeo existente + nuevos campos)
        'educacion_basica': {
            'primaria': educacion.get('edu_primaria'),
            'secundaria': educacion.get('edu_secundaria'),
            'tiene_basica': educacion.get('tiene_educacion_basica'),
        } if educacion.get('edu_primaria') or educacion.get('edu_secundaria') else None,
        'educacion_tecnica': educacion.get('edu_tecnica') or None,
        'educacion_universitaria': educacion.get('edu_universitaria'),
        'posgrado': educacion.get('edu_posgrado'),

        # Experiencia y cargos
        'experiencia_laboral': h.get('experiencia_laboral'),
        'cargos_partidarios': h.get('cargos_partidarios'),
        'cargos_eleccion': h.get('cargos_eleccion'),
        'cargos_postula': h.get('cargos_postula'),
        'renuncias_partidos': h.get('renuncias_partidos'),
        'titularidades': h.get('titularidades'),
        'declaraciones_juradas': h.get('declaraciones_juradas'),

        # Legal
        'sentencias_penales': sentencias.get('penales'),
        'sentencias_obligaciones': sentencias.get('obligaciones'),
        'procesos_penales': h.get('procesos_penales'),

        # Patrimonio
        'bienes_muebles': bienes.get('muebles'),
        'bienes_inmuebles': bienes.get('inmuebles'),
        'ingresos': h.get('ingresos'),

        # Ubicacion
        'carne_extranjeria': h.get('carne_extranjeria') or None,
        'ubigeo_nacimiento': h.get('ubigeo_nacimiento'),
        'ubigeo_domicilio': h.get('ubigeo_domicilio'),
    }


def main():
    from supabase import create_client

    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env")

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Verificar que existe el archivo JSON
    if not JSON_FILE.exists():
        raise FileNotFoundError(f"No se encuentra: {JSON_FILE}")

    print(f"Cargando {JSON_FILE}...")
    print(f"  Tamano: {JSON_FILE.stat().st_size / 1024 / 1024:.1f} MB")

    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # El JSON tiene estructura {metadata, hojas_vida}
    if isinstance(data, dict) and 'hojas_vida' in data:
        hojas_raw = data['hojas_vida']
    elif isinstance(data, list):
        hojas_raw = data
    elif isinstance(data, dict):
        # Buscar la key que contiene la lista
        for key in ['data', 'registros', 'candidatos']:
            if key in data and isinstance(data[key], list):
                hojas_raw = data[key]
                break
        else:
            hojas_raw = list(data.values()) if all(isinstance(v, dict) for v in data.values()) else [data]
    else:
        raise ValueError(f"Formato JSON no reconocido: {type(data)}")

    print(f"  Registros en JSON: {len(hojas_raw):,}")

    # Contar registros existentes
    existing = supabase.table('quipu_hojas_vida').select('*', count='exact', head=True).execute()
    print(f"  Registros existentes en DB: {existing.count}")

    # Construir mapa de candidato_id por DNI (paginado)
    print("\nObteniendo mapa de candidatos...")
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
    print(f"  {len(candidato_map):,} candidatos mapeados")

    # Mapear hojas de vida
    print("\nMapeando hojas de vida...")
    hojas = []
    sin_dni = 0
    sin_candidato = 0

    for h in hojas_raw:
        hoja = map_hoja_vida(h)

        # Intentar vincular con candidato por DNI
        dni = h.get('dni') or h.get('strDocumentoIdentidad')
        if dni:
            if dni in candidato_map:
                hoja['candidato_id'] = candidato_map[dni]
            else:
                sin_candidato += 1
        else:
            sin_dni += 1

        hojas.append(hoja)

    print(f"  Total hojas mapeadas: {len(hojas):,}")
    print(f"  Sin DNI: {sin_dni}")
    print(f"  Con DNI pero sin candidato: {sin_candidato}")

    # Upsert en batches
    print(f"\nUpsert hojas de vida (on_conflict=id_hoja_vida)...")
    batch_size = 100
    errores = 0

    for i in range(0, len(hojas), batch_size):
        batch = hojas[i:i+batch_size]
        try:
            supabase.table('quipu_hojas_vida').upsert(
                batch,
                on_conflict='id_hoja_vida'
            ).execute()
        except Exception as e:
            errores += 1
            print(f"  Error en batch {i//batch_size}: {e}")
            # Intentar uno por uno
            for hoja in batch:
                try:
                    supabase.table('quipu_hojas_vida').upsert(
                        [hoja],
                        on_conflict='id_hoja_vida'
                    ).execute()
                except Exception as e2:
                    print(f"    Error individual {hoja.get('id_hoja_vida')}: {e2}")

        done = min(i + batch_size, len(hojas))
        if done % 500 == 0 or done == len(hojas):
            print(f"  {done:,}/{len(hojas):,}")

    # Verificar resultado
    print("\n" + "="*50)
    print("VERIFICACION")
    print("="*50)

    final = supabase.table('quipu_hojas_vida').select('*', count='exact', head=True).execute()
    print(f"  Registros finales: {final.count:,}")

    # Verificar nuevos campos
    query = """
    SELECT
        COUNT(*) as total,
        COUNT(estado_hv) as con_estado,
        COUNT(indicadores) as con_indicadores,
        AVG(porcentaje_completitud) as completitud_promedio,
        COUNT(CASE WHEN estado_hv = 'CONFIRMADA' THEN 1 END) as confirmadas
    FROM quipu_hojas_vida
    """

    # Query de verificacion manual
    print(f"\n  Ejecuta esta query en Supabase para verificar:")
    print(f"  {query}")

    # Estadisticas basicas
    con_estado = supabase.table('quipu_hojas_vida').select('id', count='exact', head=True).not_.is_('estado_hv', 'null').execute()
    con_indicadores = supabase.table('quipu_hojas_vida').select('id', count='exact', head=True).not_.is_('indicadores', 'null').execute()

    print(f"\n  Con estado_hv: {con_estado.count:,}")
    print(f"  Con indicadores: {con_indicadores.count:,}")

    if errores:
        print(f"\n  ADVERTENCIA: {errores} batches con errores")

    print("\nDone!")


if __name__ == "__main__":
    main()
