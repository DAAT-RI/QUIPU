#!/usr/bin/env python3
"""
Extrae DNIs únicos del CSV de candidatos y genera SQL para seed.
"""
import csv
from pathlib import Path

# Rutas
CSV_PATH = Path(__file__).parent.parent.parent / "CANDIDATOS_JNE_2026_APESEG.csv"
OUTPUT_SQL = Path(__file__).parent.parent / "migrations" / "008_seed_apeseg.sql"

def main():
    dnis = set()

    with open(CSV_PATH, encoding='utf-8-sig') as f:
        reader = csv.DictReader(f, delimiter=';')
        for row in reader:
            dni = row.get('DNI', '').strip()
            if dni:
                dnis.add(dni)

    dnis_sorted = sorted(dnis)
    print(f"Total DNIs únicos: {len(dnis_sorted)}")

    # Generar SQL
    sql = f"""-- =====================================================
-- FASE 3: Seed Cliente Demo - APESEG
-- Generado automáticamente desde CANDIDATOS_JNE_2026_APESEG.csv
-- Total DNIs: {len(dnis_sorted)}
-- =====================================================

-- 1. Crear cliente APESEG
INSERT INTO quipu_clientes (nombre, tipo, sector, plan, max_candidatos, contacto_email)
VALUES ('APESEG', 'gremio', 'seguros', 'enterprise', 200, 'demo@apeseg.com.pe')
ON CONFLICT DO NOTHING;

-- 2. Asignar candidatos al cliente
-- Nota: Solo inserta candidatos que existen en quipu_candidatos
INSERT INTO quipu_cliente_candidatos (cliente_id, candidato_id)
SELECT
    (SELECT id FROM quipu_clientes WHERE nombre = 'APESEG'),
    c.id
FROM quipu_candidatos c
WHERE c.dni IN (
    {','.join([f"'{dni}'" for dni in dnis_sorted])}
)
ON CONFLICT DO NOTHING;

-- 3. Verificar cuántos candidatos se asignaron
-- SELECT COUNT(*) as candidatos_asignados
-- FROM quipu_cliente_candidatos
-- WHERE cliente_id = (SELECT id FROM quipu_clientes WHERE nombre = 'APESEG');
"""

    with open(OUTPUT_SQL, 'w', encoding='utf-8') as f:
        f.write(sql)

    print(f"SQL generado: {OUTPUT_SQL}")
    print(f"\nPrimeros 10 DNIs: {dnis_sorted[:10]}")

if __name__ == "__main__":
    main()
