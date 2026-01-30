#!/usr/bin/env python3
"""
Ejecuta SQL en Supabase usando la conexión directa.
"""
import os
from dotenv import load_dotenv
from supabase import create_client

# Cargar variables de entorno
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Usuario APESEG
    print("Insertando usuario APESEG...")
    result = supabase.table('quipu_usuarios').insert({
        'cliente_id': supabase.table('quipu_clientes').select('id').eq('nombre', 'APESEG').execute().data[0]['id'],
        'email': 'alejandro@daat.cloud',
        'nombre': 'Alejandro (APESEG Demo)',
        'rol': 'admin',
        'auth_user_id': 'c1312c18-5c1c-4c53-b29f-5fc6f364b649'
    }).execute()
    print(f"  APESEG: {result.data}")

    # Usuario NEWLINK
    print("Insertando usuario NEWLINK...")
    result = supabase.table('quipu_usuarios').insert({
        'cliente_id': supabase.table('quipu_clientes').select('id').eq('nombre', 'NEWLINK').execute().data[0]['id'],
        'email': 'alexander@daat.cloud',
        'nombre': 'Alexander (NEWLINK Demo)',
        'rol': 'admin',
        'auth_user_id': 'f7b3c107-d65b-414b-8d44-aa9b8e28fff3'
    }).execute()
    print(f"  NEWLINK: {result.data}")

    # Verificar
    print("\nUsuarios creados:")
    result = supabase.table('quipu_usuarios').select('email, nombre, rol').execute()
    for user in result.data:
        print(f"  - {user['email']} ({user['rol']})")

if __name__ == "__main__":
    main()
