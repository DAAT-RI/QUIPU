#!/usr/bin/env python3
"""
Script para reclasificar las categorías de promesas usando Gemini AI.
Reemplaza las 15 categorías genéricas por las 267 categorías específicas de docs/categorias.json

Uso:
    python 004_reclassify_categories_gemini.py [--dry-run] [--batch-size N] [--limit N]

Requiere:
    - SUPABASE_URL y SUPABASE_SERVICE_KEY en variables de entorno
    - GOOGLE_API_KEY para Gemini
"""

import os
import json
import time
import argparse
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# Cargar .env
load_dotenv()

from google import genai
from supabase import create_client, Client

# Configuración
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")
GOOGLE_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

# Cargar categorías desde JSON
SCRIPT_DIR = Path(__file__).parent.parent
CATEGORIES_PATH = SCRIPT_DIR / "docs" / "categorias.json"

with open(CATEGORIES_PATH, "r", encoding="utf-8") as f:
    CATEGORIES_267 = json.load(f)

# Crear string de categorías para el prompt
CATEGORIES_LIST_STR = "\n".join(f"- {cat}" for cat in CATEGORIES_267)

# Prompt para Gemini
CLASSIFICATION_PROMPT = f"""Eres un clasificador de propuestas políticas de planes de gobierno del Perú.

Tu tarea es clasificar la siguiente propuesta en UNA de las categorías disponibles.

CATEGORÍAS DISPONIBLES:
{CATEGORIES_LIST_STR}

REGLAS:
1. Responde SOLO con el nombre exacto de la categoría, sin explicaciones
2. Si la propuesta podría encajar en múltiples categorías, elige la MÁS ESPECÍFICA
3. Si no encaja claramente en ninguna, usa "Otros"
4. Mantén las tildes y mayúsculas exactas de la categoría

PROPUESTA A CLASIFICAR:
{{texto}}

CATEGORÍA:"""


def init_clients():
    """Inicializa clientes de Supabase y Gemini."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY")
    if not GOOGLE_API_KEY:
        raise ValueError("Falta GEMINI_API_KEY o GOOGLE_API_KEY")

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    client = genai.Client(api_key=GOOGLE_API_KEY)

    return supabase, client


def classify_promesa(client, texto: str, max_retries: int = 3) -> Optional[str]:
    """Clasifica una promesa usando Gemini."""
    prompt = CLASSIFICATION_PROMPT.replace("{texto}", texto[:2000])  # Limitar texto

    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            categoria = response.text.strip()

            # Validar que la categoría existe
            if categoria in CATEGORIES_267:
                return categoria

            # Buscar match parcial (por si Gemini omite tildes)
            categoria_lower = categoria.lower()
            for cat in CATEGORIES_267:
                if cat.lower() == categoria_lower:
                    return cat

            print(f"  [WARN] Categoría no válida: '{categoria}', usando 'Otros'")
            return "Otros"

        except Exception as e:
            if attempt < max_retries - 1:
                wait = 2 ** attempt
                print(f"  [RETRY] Error: {e}, esperando {wait}s...")
                time.sleep(wait)
            else:
                print(f"  [ERROR] Falló después de {max_retries} intentos: {e}")
                return None

    return None


def fetch_promesas(supabase: Client, limit: Optional[int] = None, offset: int = 0):
    """Obtiene promesas de Supabase."""
    query = supabase.table("quipu_promesas_planes").select(
        "id, texto_original, resumen, categoria"
    ).order("id")

    if limit:
        query = query.range(offset, offset + limit - 1)

    result = query.execute()
    return result.data


def update_categoria(supabase: Client, promesa_id: int, nueva_categoria: str, dry_run: bool = False):
    """Actualiza la categoría de una promesa."""
    if dry_run:
        print(f"  [DRY-RUN] UPDATE id={promesa_id} SET categoria='{nueva_categoria}'")
        return True

    try:
        supabase.table("quipu_promesas_planes").update({
            "categoria": nueva_categoria
        }).eq("id", promesa_id).execute()
        return True
    except Exception as e:
        print(f"  [ERROR] No se pudo actualizar id={promesa_id}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Reclasifica promesas usando Gemini AI")
    parser.add_argument("--dry-run", action="store_true", help="Solo muestra cambios sin aplicarlos")
    parser.add_argument("--batch-size", type=int, default=50, help="Promesas por batch (default: 50)")
    parser.add_argument("--limit", type=int, help="Limitar número total de promesas a procesar")
    parser.add_argument("--offset", type=int, default=0, help="Offset inicial")
    parser.add_argument("--delay", type=float, default=0.5, help="Delay entre llamadas a Gemini (segundos)")
    args = parser.parse_args()

    print("=" * 60)
    print("RECLASIFICACIÓN DE CATEGORÍAS CON GEMINI AI")
    print("=" * 60)
    print(f"Categorías disponibles: {len(CATEGORIES_267)}")
    print(f"Modo: {'DRY-RUN (sin cambios)' if args.dry_run else 'PRODUCCIÓN'}")
    print(f"Batch size: {args.batch_size}")
    print(f"Delay: {args.delay}s")
    print()

    # Inicializar
    print("Inicializando clientes...")
    supabase, client = init_clients()
    print("OK\n")

    # Estadísticas
    total_processed = 0
    total_updated = 0
    total_unchanged = 0
    total_errors = 0
    category_counts = {}

    offset = args.offset

    while True:
        # Obtener batch
        promesas = fetch_promesas(supabase, args.batch_size, offset)
        if not promesas:
            break

        print(f"Procesando batch: offset={offset}, count={len(promesas)}")

        for promesa in promesas:
            promesa_id = promesa["id"]
            texto = promesa.get("resumen") or promesa["texto_original"]
            categoria_actual = promesa["categoria"]

            # Clasificar
            nueva_categoria = classify_promesa(client, texto)

            if nueva_categoria is None:
                total_errors += 1
                continue

            # Contabilizar
            category_counts[nueva_categoria] = category_counts.get(nueva_categoria, 0) + 1

            # Actualizar si cambió
            if nueva_categoria != categoria_actual:
                if update_categoria(supabase, promesa_id, nueva_categoria, args.dry_run):
                    total_updated += 1
                    print(f"  [{promesa_id}] {categoria_actual} -> {nueva_categoria}")
                else:
                    total_errors += 1
            else:
                total_unchanged += 1

            total_processed += 1

            # Delay para no saturar API
            time.sleep(args.delay)

            # Límite total
            if args.limit and total_processed >= args.limit:
                break

        # Progreso
        print(f"  Progreso: {total_processed} procesadas, {total_updated} actualizadas, {total_errors} errores\n")

        # Límite total
        if args.limit and total_processed >= args.limit:
            break

        offset += args.batch_size

    # Resumen final
    print("=" * 60)
    print("RESUMEN FINAL")
    print("=" * 60)
    print(f"Total procesadas: {total_processed}")
    print(f"Total actualizadas: {total_updated}")
    print(f"Total sin cambio: {total_unchanged}")
    print(f"Total errores: {total_errors}")
    print()
    print("Top 20 categorías asignadas:")
    for cat, count in sorted(category_counts.items(), key=lambda x: -x[1])[:20]:
        print(f"  {count:5d} - {cat}")

    if args.dry_run:
        print("\n[DRY-RUN] No se aplicaron cambios. Ejecuta sin --dry-run para aplicar.")


if __name__ == "__main__":
    main()
