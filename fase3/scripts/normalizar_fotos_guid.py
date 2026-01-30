#!/usr/bin/env python3
"""
Normalizar foto_url a solo GUID (extraer de URL completa)
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(Path(__file__).parent.parent.parent / ".env")
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

BASE_URL = "https://plataformaelectoral.jne.gob.pe/Fotos/"

print("Normalizando foto_url a solo GUID...\n")

# Obtener candidatos con foto_url que empieza con http
offset = 0
to_update = []

while True:
    result = supabase.table("quipu_candidatos").select("id, foto_url").range(offset, offset + 999).execute()
    for r in result.data:
        url = r.get("foto_url")
        if url and url.startswith("http"):
            # Extraer solo el GUID (filename)
            guid = url.split("/")[-1]  # ej: "xxx-xxx.jpg"
            to_update.append({
                "id": r["id"],
                "old": url,
                "new": guid
            })
    if len(result.data) < 1000:
        break
    offset += 1000

print(f"Candidatos a actualizar: {len(to_update)}")

if to_update:
    print(f"\nEjemplos de conversión:")
    for item in to_update[:3]:
        print(f"  {item['old'][:60]}...")
        print(f"  → {item['new']}")

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

        if updated % 200 == 0 and updated > 0:
            print(f"  - {updated}/{len(to_update)} actualizados...")

    print(f"\n✓ {updated} registros actualizados, {errors} errores")

# Verificación
print("\nVerificación final:")
sin_http = supabase.table("quipu_candidatos").select("id", count="exact").not_.like("foto_url", "http%").execute()
con_http = supabase.table("quipu_candidatos").select("id", count="exact").like("foto_url", "http%").execute()
print(f"  - Solo GUID: {sin_http.count}")
print(f"  - URL completa: {con_http.count}")
