#!/usr/bin/env python3
"""
Crea cliente de prueba APESEG con candidatos presidenciales y temas de seguros
"""
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)


def main():
    print("Creando cliente de prueba: APESEG\n")

    # 1. Crear cliente
    cliente = supabase.table('quipu_clientes').upsert({
        'id': 1,
        'nombre': 'APESEG',
        'tipo': 'gremio',
        'sector': 'seguros',
        'contacto_email': 'demo@apeseg.org.pe',
        'plan': 'profesional',
        'max_candidatos': 20,
        'activo': True
    }, on_conflict='id').execute()
    print(f"✓ Cliente creado: {cliente.data[0]['nombre']}")

    # 2. Asignar candidatos presidenciales (top 15)
    candidatos = supabase.table('quipu_candidatos') \
        .select('id, nombre_completo') \
        .eq('tipo_eleccion', 'PRESIDENCIAL') \
        .ilike('cargo_postula', '%PRESIDENTE%') \
        .limit(15) \
        .execute()

    for c in candidatos.data:
        try:
            supabase.table('quipu_cliente_candidatos').upsert({
                'cliente_id': 1,
                'candidato_id': c['id']
            }, on_conflict='cliente_id,candidato_id').execute()
            print(f"  + Candidato: {c['nombre_completo']}")
        except:
            pass

    print(f"\n✓ {len(candidatos.data)} candidatos asignados")

    # 3. Asignar temas relevantes para seguros
    temas_seguros = ['Pensiones y AFP', 'Seguros', 'Sistema Financiero', 'Salud', 'Tributación']

    for tema_nombre in temas_seguros:
        tema = supabase.table('quipu_temas').select('id').eq('nombre', tema_nombre).execute()
        if tema.data:
            try:
                supabase.table('quipu_cliente_temas').upsert({
                    'cliente_id': 1,
                    'tema_id': tema.data[0]['id'],
                    'prioridad': 1 if tema_nombre in ['Pensiones y AFP', 'Seguros'] else 2,
                    'alertas_activas': True
                }, on_conflict='cliente_id,tema_id').execute()
                print(f"  + Tema: {tema_nombre}")
            except:
                pass

    print(f"\n✓ {len(temas_seguros)} temas asignados")

    # 4. Crear usuario de prueba
    try:
        supabase.table('quipu_usuarios').upsert({
            'cliente_id': 1,
            'email': 'demo@apeseg.org.pe',
            'nombre': 'Usuario Demo APESEG',
            'rol': 'admin'
        }, on_conflict='email').execute()
        print("\n✓ Usuario demo creado: demo@apeseg.org.pe")
    except Exception as e:
        print(f"\n! Usuario ya existe o error: {e}")

    print("\n" + "=" * 50)
    print("CLIENTE DE PRUEBA LISTO")
    print("=" * 50)


if __name__ == "__main__":
    main()
