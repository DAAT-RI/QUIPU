#!/usr/bin/env python3
import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(Path(__file__).parent.parent.parent / ".env")
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

# Verificar columnas de la vista
print("Columnas de v_quipu_candidatos_unicos:")
result = supabase.table("v_quipu_candidatos_unicos").select("*").limit(1).execute()
if result.data:
    cols = list(result.data[0].keys())
    for col in sorted(cols):
        print(f"  - {col}")
    print(f"\n¿Tiene foto_url? {'foto_url' in cols}")
    if 'foto_url' in cols:
        print(f"  Valor: {result.data[0].get('foto_url')}")
