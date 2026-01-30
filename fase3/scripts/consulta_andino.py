#!/usr/bin/env python3
import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(Path(__file__).parent.parent.parent / ".env")
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

# Buscar candidatos al Parlamento Andino
result = supabase.table("quipu_candidatos").select(
    "id, dni, nombre_completo, cargo_postula, organizacion_politica"
).ilike("tipo_eleccion", "%ANDINO%").order("organizacion_politica").execute()

print(f"Candidatos al Parlamento Andino: {len(result.data)}\n")

# Agrupar por partido
partidos = {}
for c in result.data:
    p = c["organizacion_politica"]
    if p not in partidos:
        partidos[p] = []
    partidos[p].append(c)

for partido, candidatos in sorted(partidos.items()):
    print(f"\n{partido} ({len(candidatos)}):")
    for c in candidatos[:5]:
        print(f"  - {c['nombre_completo']}")
    if len(candidatos) > 5:
        print(f"  ... y {len(candidatos) - 5} más")
