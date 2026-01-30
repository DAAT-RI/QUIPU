#!/usr/bin/env python3
"""
Migración de candidatos JNE 2026 a quipu_candidatos y quipu_hojas_vida
Estrategia: Solo INSERT nuevos (ON CONFLICT DO NOTHING)
"""

import json
import re
from datetime import datetime
from pathlib import Path

# Rutas de archivos
INPUT_DIR = Path(r"C:\Entornos\candidatos\actualizar_vidas")
OUTPUT_DIR = Path(__file__).parent.parent / "migrations"

CANDIDATOS_FILE = INPUT_DIR / "candidatos_jne_2026_20260130_074153.json"
HOJAS_VIDA_FILE = INPUT_DIR / "hojas_vida_jne_2026_20260130_080101.json"
OUTPUT_SQL = OUTPUT_DIR / "010_actualizar_candidatos_jne.sql"


def escape_sql(value):
    """Escapa comillas simples para SQL"""
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, (dict, list)):
        json_str = json.dumps(value, ensure_ascii=False)
        return f"'{json_str.replace(chr(39), chr(39)+chr(39))}'"
    s = str(value).strip()
    if not s:
        return "NULL"
    return f"'{s.replace(chr(39), chr(39)+chr(39))}'"


def parse_fecha(fecha_str):
    """Convierte fecha JNE a formato PostgreSQL"""
    if not fecha_str:
        return "NULL"
    # Formato: "5/10/1980 00:00:00" o "17/09/1974"
    fecha_str = fecha_str.split(" ")[0]
    try:
        for fmt in ["%d/%m/%Y", "%Y-%m-%d"]:
            try:
                dt = datetime.strptime(fecha_str, fmt)
                return f"'{dt.strftime('%Y-%m-%d')}'"
            except ValueError:
                continue
    except:
        pass
    return "NULL"


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
        if apellidos:
            return f"{apellidos}, {nombres_title}"
        return nombres_title
    return apellidos


def build_foto_url(guid_foto):
    """Construye URL de foto del JNE"""
    if not guid_foto:
        return "NULL"
    return f"'https://plataformaelectoral.jne.gob.pe/Fotos/{guid_foto}.jpg'"


def main():
    print("Cargando datos del JNE...")

    # Cargar candidatos
    with open(CANDIDATOS_FILE, "r", encoding="utf-8") as f:
        data_candidatos = json.load(f)
    candidatos = data_candidatos["candidatos"]
    print(f"  - {len(candidatos):,} candidatos cargados")

    # Cargar hojas de vida
    with open(HOJAS_VIDA_FILE, "r", encoding="utf-8") as f:
        data_hv = json.load(f)
    hojas_vida = data_hv["hojas_vida"]
    print(f"  - {len(hojas_vida):,} hojas de vida cargadas")

    # Indexar hojas de vida por DNI
    hv_por_dni = {}
    for hv in hojas_vida:
        dni = hv.get("dni", "")
        if dni:
            hv_por_dni[dni] = hv
    print(f"  - {len(hv_por_dni):,} hojas de vida indexadas por DNI")

    # Extraer partidos únicos
    partidos = set()
    for c in candidatos:
        partido = c.get("strOrganizacionPolitica", "")
        if partido:
            partidos.add(partido)
    print(f"  - {len(partidos)} partidos encontrados")

    # Generar SQL
    print(f"\nGenerando SQL en {OUTPUT_SQL}...")

    with open(OUTPUT_SQL, "w", encoding="utf-8") as f:
        f.write("-- =====================================================\n")
        f.write("-- Migración: Candidatos JNE 2026\n")
        f.write(f"-- Generado: {datetime.now().isoformat()}\n")
        f.write(f"-- Fuente: {CANDIDATOS_FILE.name}\n")
        f.write(f"-- Total candidatos: {len(candidatos):,}\n")
        f.write("-- Estrategia: Solo INSERT nuevos (ON CONFLICT DO NOTHING)\n")
        f.write("-- =====================================================\n\n")

        # 1. Partidos
        f.write("-- =====================================================\n")
        f.write("-- PARTE 1: Partidos políticos\n")
        f.write("-- =====================================================\n\n")

        for partido in sorted(partidos):
            nombre_esc = escape_sql(partido)
            f.write(f"INSERT INTO quipu_partidos (nombre_oficial)\n")
            f.write(f"VALUES ({nombre_esc})\n")
            f.write("ON CONFLICT (nombre_oficial) DO NOTHING;\n\n")

        # 2. Candidatos
        f.write("\n-- =====================================================\n")
        f.write("-- PARTE 2: Candidatos\n")
        f.write("-- =====================================================\n\n")

        for i, c in enumerate(candidatos):
            dni = c.get("strDocumentoIdentidad", "")
            if not dni:
                continue

            nombres = c.get("strNombres", "")
            ap_paterno = c.get("strApellidoPaterno", "")
            ap_materno = c.get("strApellidoMaterno", "")
            nombre_completo = build_nombre_completo(nombres, ap_paterno, ap_materno)

            hv = hv_por_dni.get(dni, {})
            id_hoja_vida = hv.get("hv_id", "")

            f.write(f"INSERT INTO quipu_candidatos (\n")
            f.write("    id_hoja_vida, dni, nombres, apellido_paterno, apellido_materno,\n")
            f.write("    nombre_completo, sexo, fecha_nacimiento,\n")
            f.write("    organizacion_politica, partido_id,\n")
            f.write("    tipo_eleccion, cargo_postula, cargo_eleccion, designacion,\n")
            f.write("    ubigeo, departamento, provincia, distrito,\n")
            f.write("    foto_url, email, estado\n")
            f.write(") VALUES (\n")
            f.write(f"    {escape_sql(str(id_hoja_vida) if id_hoja_vida else None)},\n")
            f.write(f"    {escape_sql(dni)},\n")
            f.write(f"    {escape_sql(nombres)},\n")
            f.write(f"    {escape_sql(ap_paterno)},\n")
            f.write(f"    {escape_sql(ap_materno)},\n")
            f.write(f"    {escape_sql(nombre_completo)},\n")
            f.write(f"    {escape_sql(c.get('strSexo', ''))},\n")
            f.write(f"    {parse_fecha(c.get('strFechaNacimiento', ''))},\n")
            f.write(f"    {escape_sql(c.get('strOrganizacionPolitica', ''))},\n")
            f.write(f"    (SELECT id FROM quipu_partidos WHERE nombre_oficial = {escape_sql(c.get('strOrganizacionPolitica', ''))}),\n")
            f.write(f"    {escape_sql(c.get('strTipoEleccion', ''))},\n")
            f.write(f"    {escape_sql(c.get('strCargo', ''))},\n")
            f.write(f"    {escape_sql(c.get('idCargo'))},\n")
            f.write(f"    {escape_sql(c.get('strCodExpedienteExt', ''))},\n")
            f.write(f"    {escape_sql(c.get('strUbigeo', ''))},\n")
            f.write(f"    {escape_sql(c.get('strDepartamento', ''))},\n")
            f.write(f"    {escape_sql(c.get('strProvincia', ''))},\n")
            f.write(f"    {escape_sql(c.get('strDistrito', ''))},\n")
            f.write(f"    {build_foto_url(c.get('strGuidFoto', ''))},\n")
            f.write(f"    {escape_sql(hv.get('email'))},\n")
            f.write(f"    {escape_sql(c.get('strEstadoCandidato', ''))}\n")
            f.write(")\nON CONFLICT (dni, cargo_eleccion) DO NOTHING;\n\n")

            if (i + 1) % 1000 == 0:
                print(f"  - {i + 1:,} candidatos procesados...")

        # 3. Hojas de vida
        f.write("\n-- =====================================================\n")
        f.write("-- PARTE 3: Hojas de vida\n")
        f.write("-- =====================================================\n\n")

        for i, hv in enumerate(hojas_vida):
            hv_id = hv.get("hv_id")
            dni = hv.get("dni", "")
            if not hv_id or not dni:
                continue

            educacion = hv.get("educacion", {})

            f.write(f"INSERT INTO quipu_hojas_vida (\n")
            f.write("    candidato_id, id_hoja_vida,\n")
            f.write("    educacion_basica, educacion_tecnica, educacion_universitaria, posgrado,\n")
            f.write("    experiencia_laboral, cargos_partidarios, cargos_eleccion, renuncias_partidos,\n")
            f.write("    sentencias_penales, sentencias_obligaciones,\n")
            f.write("    bienes_muebles, bienes_inmuebles, ingresos\n")
            f.write(") SELECT\n")
            f.write(f"    c.id,\n")
            f.write(f"    {escape_sql(str(hv_id))},\n")

            # Educación básica como JSONB
            edu_basica = {
                "primaria": educacion.get("edu_primaria", ""),
                "secundaria": educacion.get("edu_secundaria", "")
            }
            f.write(f"    {escape_sql(edu_basica)},\n")
            f.write(f"    {escape_sql(educacion.get('edu_tecnica', ''))},\n")
            f.write(f"    {escape_sql(educacion.get('edu_universitaria', []))},\n")
            f.write(f"    {escape_sql(educacion.get('edu_posgrado', []))},\n")

            f.write(f"    {escape_sql(hv.get('experiencia_laboral', []))},\n")
            f.write(f"    {escape_sql(hv.get('cargos_partidarios', []))},\n")
            f.write(f"    {escape_sql(hv.get('cargos_eleccion', []))},\n")
            f.write(f"    {escape_sql(hv.get('renuncias_partidos', []))},\n")

            sentencias = hv.get("sentencias", {})
            f.write(f"    {escape_sql(sentencias.get('penales', []))},\n")
            f.write(f"    {escape_sql(sentencias.get('obligaciones', []))},\n")

            bienes = hv.get("bienes", {})
            f.write(f"    {escape_sql(bienes.get('muebles', []))},\n")
            f.write(f"    {escape_sql(bienes.get('inmuebles', []))},\n")
            f.write(f"    {escape_sql(hv.get('ingresos', {}))}\n")

            f.write(f"FROM quipu_candidatos c\n")
            f.write(f"WHERE c.dni = {escape_sql(dni)}\n")
            f.write(f"ORDER BY\n")
            f.write(f"    CASE\n")
            f.write(f"        WHEN c.cargo_postula ILIKE '%PRESIDENTE DE LA REP%' THEN 1\n")
            f.write(f"        WHEN c.cargo_postula ILIKE '%VICEPRESIDENTE%' THEN 2\n")
            f.write(f"        WHEN c.cargo_postula ILIKE '%SENADOR%' THEN 3\n")
            f.write(f"        WHEN c.cargo_postula ILIKE '%DIPUTADO%' THEN 4\n")
            f.write(f"        ELSE 5\n")
            f.write(f"    END\n")
            f.write(f"LIMIT 1\n")
            f.write("ON CONFLICT (id_hoja_vida) DO NOTHING;\n\n")

            if (i + 1) % 1000 == 0:
                print(f"  - {i + 1:,} hojas de vida procesadas...")

        # 4. Verificación
        f.write("\n-- =====================================================\n")
        f.write("-- VERIFICACIÓN\n")
        f.write("-- =====================================================\n\n")
        f.write("-- SELECT COUNT(*) as total_candidatos FROM quipu_candidatos;\n")
        f.write("-- SELECT COUNT(DISTINCT dni) as candidatos_unicos FROM quipu_candidatos;\n")
        f.write("-- SELECT COUNT(*) as hojas_vida FROM quipu_hojas_vida;\n")
        f.write("-- SELECT tipo_eleccion, COUNT(*) FROM quipu_candidatos GROUP BY tipo_eleccion ORDER BY 2 DESC;\n")

    print(f"\n¡Listo! SQL generado en:\n  {OUTPUT_SQL}")
    print(f"\nPara ejecutar en Supabase:")
    print(f"  1. Abre el SQL Editor en Supabase")
    print(f"  2. Copia y pega el contenido del archivo")
    print(f"  3. Ejecuta por partes (partidos, candidatos, hojas de vida)")


if __name__ == "__main__":
    main()
