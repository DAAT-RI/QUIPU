#!/usr/bin/env python3
"""
Sincroniza QUIPU_MASTER → quipu_declaraciones
"""
import os
from dotenv import load_dotenv
from supabase import create_client, Client
import google.generativeai as genai

load_dotenv()

supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

if os.getenv("GEMINI_API_KEY"):
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


def normalizar(texto):
    import unicodedata
    texto = unicodedata.normalize('NFD', texto)
    return ''.join(c for c in texto if unicodedata.category(c) != 'Mn').lower().strip()


def buscar_candidato(stakeholder):
    if not stakeholder:
        return None
    apellido = stakeholder.strip().split()[-1]
    r = supabase.table('quipu_candidatos').select('id').ilike('nombre_completo', f'%{apellido}%').limit(1).execute()
    return r.data[0]['id'] if r.data else None


def buscar_tema(tema_raw):
    if not tema_raw:
        return None
    temas = supabase.table('quipu_temas').select('id, nombre, keywords').execute()
    tema_norm = normalizar(tema_raw)
    for t in temas.data:
        if normalizar(t['nombre']) == tema_norm:
            return t['id']
        for kw in (t.get('keywords') or []):
            if normalizar(kw) in tema_norm:
                return t['id']
    return None


def generar_embedding(texto):
    if not os.getenv("GEMINI_API_KEY") or not texto:
        return None
    try:
        r = genai.embed_content(model="models/text-embedding-004", content=texto, task_type="retrieval_document")
        return r['embedding']
    except:
        return None


def sync_entry(entry):
    master_id = entry['id']
    interacciones = entry.get('interacciones') or []
    count = 0

    for idx, inter in enumerate(interacciones):
        contenido = inter.get('content', '')
        if not contenido:
            continue

        exists = supabase.table('quipu_declaraciones').select('id').eq('master_id', master_id).eq('indice_interaccion', idx).execute()
        if exists.data:
            continue

        data = {
            'master_id': master_id,
            'indice_interaccion': idx,
            'tipo': inter.get('type', 'unknown'),
            'contenido': contenido,
            'stakeholder_raw': inter.get('stakeholder', ''),
            'tema_raw': inter.get('tema', ''),
            'candidato_id': buscar_candidato(inter.get('stakeholder')),
            'tema_id': buscar_tema(inter.get('tema')),
            'fecha': entry.get('fecha'),
            'canal': entry.get('canal'),
            'url_fuente': entry.get('ruta'),
            'titulo_master': entry.get('titulo'),
            'resumen_master': entry.get('resumen'),
        }

        emb = generar_embedding(contenido)
        if emb:
            data['embedding'] = emb

        try:
            supabase.table('quipu_declaraciones').insert(data).execute()
            count += 1
            print(f"  + {inter.get('stakeholder', 'N/A')[:30]}")
        except Exception as e:
            print(f"  ! Error: {e}")

    return count


def main():
    print("SYNC: QUIPU_MASTER → quipu_declaraciones\n")
    entries = supabase.table('QUIPU_MASTER').select('*').order('fecha', desc=True).execute()
    total = 0
    for i, entry in enumerate(entries.data, 1):
        print(f"[{i}/{len(entries.data)}] {entry.get('canal', 'N/A')}")
        total += sync_entry(entry)
    print(f"\nTotal: {total} declaraciones insertadas")


if __name__ == "__main__":
    main()
