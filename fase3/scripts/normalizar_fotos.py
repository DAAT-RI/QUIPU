#!/usr/bin/env python3
"""
Normalizar foto_url a URL completa en quipu_candidatos
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(Path(__file__).parent.parent.parent / ".env")
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

BASE_URL = "https://plataformaelectoral.jne.gob.pe/Fotos/"

print("Normalizando foto_url a URL completa...\n")

# Obtener candidatos con foto_url que NO empieza con http
offset = 0
to_update = []

while True:
    result = supabase.table("quipu_candidatos").select("id, foto_url").range(offset, offset + 999).execute()
    for r in result.data:
        url = r.get("foto_url")
        if url and not url.startswith("http"):
            to_update.append({
                "id": r["id"],
                "old": url,
                "new": BASE_URL + url
            })
    if len(result.data) < 1000:
        break
    offset += 1000

print(f"Candidatos a actualizar: {len(to_update)}")

if to_update:
    print("\nActualizando...")
    updated = 0
    errors = 0

    for item in to_update:
        try:
            supabase.table("quipu_candidatos").update({
                "foto_url": item["new"]
            }).eq("id", item["id"]).execute()
            updated += 1
        except Exception as e:
            errors += 1
            print(f"  Error ID {item['id']}: {e}")

        if updated % 500 == 0:
            print(f"  - {updated}/{len(to_update)} actualizados...")

    print(f"\n✓ {updated} registros actualizados, {errors} errores")

# Verificar resultado
print("\nVerificación final:")
result = supabase.table("quipu_candidatos").select("foto_url").limit(5).execute()
for r in result.data:
    print(f"  {r['foto_url'][:70]}...")

# Contar patrones después
con_http = supabase.table("quipu_candidatos").select("id", count="exact").like("foto_url", "http%").execute()
print(f"\nCandidatos con URL completa: {con_http.count}")
