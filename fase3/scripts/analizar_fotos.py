#!/usr/bin/env python3
import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(Path(__file__).parent.parent.parent / ".env")
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

print("Analizando patrones de foto_url...\n")

# Obtener todos los foto_url
all_fotos = []
offset = 0
while True:
    result = supabase.table("quipu_candidatos").select("id, foto_url").range(offset, offset + 999).execute()
    all_fotos.extend(result.data)
    if len(result.data) < 1000:
        break
    offset += 1000

print(f"Total registros: {len(all_fotos)}")

# Clasificar patrones
con_http = []
solo_guid = []
nulos = []

for f in all_fotos:
    url = f.get("foto_url")
    if not url:
        nulos.append(f)
    elif url.startswith("http"):
        con_http.append(f)
    else:
        solo_guid.append(f)

print(f"\nPatrones encontrados:")
print(f"  - URL completa (http...): {len(con_http)}")
print(f"  - Solo GUID/filename: {len(solo_guid)}")
print(f"  - NULL/vacío: {len(nulos)}")

if con_http:
    print(f"\nEjemplos con URL completa:")
    for f in con_http[:3]:
        print(f"  ID {f['id']}: {f['foto_url'][:80]}...")

if solo_guid:
    print(f"\nEjemplos con solo GUID:")
    for f in solo_guid[:3]:
        print(f"  ID {f['id']}: {f['foto_url']}")

# Verificar si los GUID tienen .jpg o no
if solo_guid:
    con_ext = [f for f in solo_guid if f['foto_url'].endswith('.jpg')]
    sin_ext = [f for f in solo_guid if not f['foto_url'].endswith('.jpg')]
    print(f"\nDentro de solo GUID:")
    print(f"  - Con .jpg: {len(con_ext)}")
    print(f"  - Sin .jpg: {len(sin_ext)}")
    if sin_ext:
        print(f"  Ejemplos sin .jpg: {[f['foto_url'] for f in sin_ext[:3]]}")
