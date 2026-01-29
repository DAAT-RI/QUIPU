#!/usr/bin/env python3
"""
Script para reclasificar las categorías de promesas usando Gemini AI.
Reemplaza las 15 categorías genéricas por las 267 categorías específicas de docs/categorias.json

Uso:
    python 004_reclassify_categories_gemini.py [--dry-run] [--batch-size N] [--limit N]
    python 004_reclassify_categories_gemini.py --resume  # Continúa desde el último checkpoint

Requiere:
    - SUPABASE_URL y SUPABASE_SERVICE_KEY en variables de entorno
    - GEMINI_API_KEY para Gemini
"""

import os
import json
import time
import argparse
import signal
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from tqdm import tqdm

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
CHECKPOINT_PATH = Path(__file__).parent / ".reclassify_checkpoint.json"

with open(CATEGORIES_PATH, "r", encoding="utf-8") as f:
    CATEGORIES_267 = json.load(f)

# Estado global para checkpoint
checkpoint_state = {
    "last_id": 0,
    "total_processed": 0,
    "total_updated": 0,
    "total_unchanged": 0,
    "total_errors": 0,
    "category_counts": {}
}


def save_checkpoint():
    """Guarda el estado actual en un archivo checkpoint."""
    with open(CHECKPOINT_PATH, "w", encoding="utf-8") as f:
        json.dump(checkpoint_state, f, ensure_ascii=False, indent=2)


def load_checkpoint() -> dict:
    """Carga el estado desde el archivo checkpoint."""
    if CHECKPOINT_PATH.exists():
        with open(CHECKPOINT_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def clear_checkpoint():
    """Elimina el archivo checkpoint."""
    if CHECKPOINT_PATH.exists():
        CHECKPOINT_PATH.unlink()

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


def fetch_promesas_after_id(supabase: Client, after_id: int, limit: int = 50):
    """Obtiene promesas con ID mayor al especificado."""
    query = supabase.table("quipu_promesas_planes").select(
        "id, texto_original, resumen, categoria"
    ).gt("id", after_id).order("id").limit(limit)

    result = query.execute()
    return result.data


def count_promesas(supabase: Client) -> int:
    """Cuenta el total de promesas."""
    result = supabase.table("quipu_promesas_planes").select("id", count="exact").execute()
    return result.count or 0


def count_remaining(supabase: Client, after_id: int) -> int:
    """Cuenta promesas con ID mayor al especificado."""
    result = supabase.table("quipu_promesas_planes").select("id", count="exact").gt("id", after_id).execute()
    return result.count or 0


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
    global checkpoint_state

    parser = argparse.ArgumentParser(description="Reclasifica promesas usando Gemini AI")
    parser.add_argument("--dry-run", action="store_true", help="Solo muestra cambios sin aplicarlos")
    parser.add_argument("--batch-size", type=int, default=50, help="Promesas por batch (default: 50)")
    parser.add_argument("--limit", type=int, help="Limitar número total de promesas a procesar en esta sesión")
    parser.add_argument("--delay", type=float, default=0.1, help="Delay entre llamadas a Gemini (segundos)")
    parser.add_argument("--resume", action="store_true", help="Continuar desde el último checkpoint")
    parser.add_argument("--reset", action="store_true", help="Eliminar checkpoint y empezar desde cero")
    args = parser.parse_args()

    print("=" * 60)
    print("RECLASIFICACIÓN DE CATEGORÍAS CON GEMINI AI")
    print("=" * 60)

    # Reset checkpoint si se solicita
    if args.reset:
        clear_checkpoint()
        print("Checkpoint eliminado. Empezando desde cero.\n")

    # Cargar checkpoint si existe
    start_after_id = 0
    if args.resume or CHECKPOINT_PATH.exists():
        saved = load_checkpoint()
        if saved:
            checkpoint_state.update(saved)
            start_after_id = saved["last_id"]
            print(f"[RESUME] Continuando desde ID > {start_after_id}")
            print(f"  Ya procesadas: {saved['total_processed']}")
            print(f"  Ya actualizadas: {saved['total_updated']}")
            print()

    print(f"Categorías disponibles: {len(CATEGORIES_267)}")
    print(f"Modo: {'DRY-RUN (sin cambios)' if args.dry_run else 'PRODUCCIÓN'}")
    print(f"Batch size: {args.batch_size}")
    print(f"Delay: {args.delay}s")
    print()

    # Inicializar
    print("Inicializando clientes...")
    supabase, client = init_clients()
    print("OK\n")

    # Contar promesas restantes
    total_promesas = count_promesas(supabase)
    remaining = count_remaining(supabase, start_after_id)
    target = min(args.limit, remaining) if args.limit else remaining

    print(f"Total promesas en BD: {total_promesas}")
    print(f"Restantes por procesar: {remaining}")
    if args.limit:
        print(f"Límite esta sesión: {args.limit}")
    print()

    if remaining == 0:
        print("¡No hay promesas pendientes!")
        clear_checkpoint()
        return

    # Handler para Ctrl+C
    def handle_interrupt(signum, frame):
        print(f"\n\n[INTERRUMPIDO] Guardando checkpoint...")
        save_checkpoint()
        print(f"Último ID: {checkpoint_state['last_id']}")
        print(f"Para continuar: python {Path(__file__).name} --resume")
        exit(0)

    signal.signal(signal.SIGINT, handle_interrupt)

    # Estadísticas de sesión
    session_processed = 0

    # Progress bar
    with tqdm(total=target, desc="Clasificando", unit="promesas") as pbar:
        current_id = start_after_id

        while session_processed < target:
            # Obtener batch
            promesas = fetch_promesas_after_id(supabase, current_id, args.batch_size)
            if not promesas:
                break

            for promesa in promesas:
                if args.limit and session_processed >= args.limit:
                    break

                promesa_id = promesa["id"]
                texto = promesa.get("resumen") or promesa["texto_original"]
                categoria_actual = promesa["categoria"]

                # Clasificar
                nueva_categoria = classify_promesa(client, texto)

                # Actualizar checkpoint
                current_id = promesa_id
                checkpoint_state["last_id"] = promesa_id

                if nueva_categoria is None:
                    checkpoint_state["total_errors"] += 1
                    pbar.update(1)
                    session_processed += 1
                    continue

                # Contabilizar
                cat_counts = checkpoint_state["category_counts"]
                cat_counts[nueva_categoria] = cat_counts.get(nueva_categoria, 0) + 1

                # Actualizar si cambió
                if nueva_categoria != categoria_actual:
                    if update_categoria(supabase, promesa_id, nueva_categoria, args.dry_run):
                        checkpoint_state["total_updated"] += 1
                        pbar.set_postfix(
                            upd=checkpoint_state["total_updated"],
                            err=checkpoint_state["total_errors"]
                        )
                    else:
                        checkpoint_state["total_errors"] += 1
                else:
                    checkpoint_state["total_unchanged"] += 1

                checkpoint_state["total_processed"] += 1
                session_processed += 1
                pbar.update(1)

                # Delay para no saturar API
                time.sleep(args.delay)

            # Guardar checkpoint cada batch
            if not args.dry_run:
                save_checkpoint()

    # Resumen final
    print("\n" + "=" * 60)
    print("RESUMEN FINAL")
    print("=" * 60)
    print(f"Procesadas esta sesión: {session_processed}")
    print(f"Total acumulado: {checkpoint_state['total_processed']}")
    print(f"Total actualizadas: {checkpoint_state['total_updated']}")
    print(f"Total sin cambio: {checkpoint_state['total_unchanged']}")
    print(f"Total errores: {checkpoint_state['total_errors']}")
    print(f"Último ID: {checkpoint_state['last_id']}")
    print()
    print("Top 20 categorías:")
    for cat, count in sorted(checkpoint_state["category_counts"].items(), key=lambda x: -x[1])[:20]:
        print(f"  {count:5d} - {cat}")

    # Verificar si terminamos
    remaining_after = count_remaining(supabase, checkpoint_state["last_id"])
    if remaining_after == 0:
        print("\n¡MIGRACIÓN COMPLETADA!")
        clear_checkpoint()
    else:
        print(f"\nQuedan {remaining_after} promesas.")
        print(f"Para continuar: python {Path(__file__).name} --resume")

    if args.dry_run:
        print("\n[DRY-RUN] No se aplicaron cambios.")


if __name__ == "__main__":
    main()
