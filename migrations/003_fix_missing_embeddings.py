"""
Fix: Genera embeddings faltantes (99 promesas Partido Morado)
Usa Gemini Embedding (gemini-embedding-001, 1536 dims)

Uso:
    python 003_fix_missing_embeddings.py
"""

import os
import json
import sqlite3
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

DB_PATH = Path(__file__).parent.parent / "data" / "promesas_v2.db"
EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMENSIONS = 1536


def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Obtener promesas sin embedding
    cursor.execute("""
        SELECT id, texto_normalizado, texto_original
        FROM promesas
        WHERE embedding IS NULL AND texto_original IS NOT NULL AND LENGTH(texto_original) > 10
    """)
    rows = cursor.fetchall()
    print(f"Promesas sin embedding: {len(rows)}")

    if not rows:
        print("Nada que hacer.")
        conn.close()
        return

    ids = [r[0] for r in rows]
    texts = [r[1] or r[2] for r in rows]  # Preferir normalizado, fallback a original

    # Generar embeddings con Gemini
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("Configurar GEMINI_API_KEY en .env")

    client = genai.Client(api_key=api_key)

    print(f"Generando {len(texts)} embeddings con {EMBEDDING_MODEL}...")
    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=texts,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT",
            output_dimensionality=EMBEDDING_DIMENSIONS
        )
    )

    # Actualizar SQLite
    updated = 0
    for i, embedding in enumerate(result.embeddings):
        emb_json = json.dumps(embedding.values)
        cursor.execute("UPDATE promesas SET embedding = ? WHERE id = ?", (emb_json, ids[i]))
        updated += 1

    conn.commit()
    conn.close()

    print(f"OK: {updated} embeddings generados y guardados.")


if __name__ == "__main__":
    main()
