#!/usr/bin/env python3
import os
import json
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(Path(__file__).parent.parent.parent / ".env")
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

# Verificar Jean Paul Benavente
jp = supabase.table("quipu_candidatos").select("dni, nombre_completo, foto_url").eq("dni", "23932556").execute()
print("Jean Paul Benavente:")
print(f"  foto_url: {jp.data[0]['foto_url']}")

# Verificar algunos candidatos recientes (los últimos insertados)
recientes = supabase.table("quipu_candidatos").select("id, dni, nombre_completo, foto_url").order("id", desc=True).limit(10).execute()
print("\nÚltimos 10 candidatos insertados:")
for c in recientes.data:
    print(f"  {c['id']}: {c['nombre_completo'][:40]} - foto: {c['foto_url']}")

# Contar candidatos sin foto
sin_foto = supabase.table("quipu_candidatos").select("id", count="exact").is_("foto_url", "null").execute()
con_foto = supabase.table("quipu_candidatos").select("id", count="exact").neq("foto_url", "null").execute()
print(f"\nResumen:")
print(f"  - Con foto: {con_foto.count}")
print(f"  - Sin foto: {sin_foto.count}")

# Verificar datos del JNE para Jean Paul
INPUT_DIR = Path(r"C:\Entornos\candidatos\actualizar_vidas")
with open(INPUT_DIR / "candidatos_jne_2026_20260130_074153.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for c in data["candidatos"]:
    if c.get("strDocumentoIdentidad") == "23932556":
        print(f"\nDatos JNE para Jean Paul:")
        print(f"  strGuidFoto: {c.get('strGuidFoto')}")
        print(f"  strNombre (foto): {c.get('strNombre')}")
        break
