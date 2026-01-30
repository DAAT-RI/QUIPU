#!/usr/bin/env python3
"""
Actualiza usuarios APESEG y crea usuario Master.
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

    # 1. Actualizar APESEG con nuevo auth_user_id
    print("Actualizando usuario APESEG...")
    result = supabase.table('quipu_usuarios').update({
        'auth_user_id': '1c40361a-133e-4906-a655-4a35bea10526'
    }).eq('email', 'alejandro@daat.cloud').execute()
    print(f"  APESEG actualizado: {result.data}")

    # 2. Crear usuario Master (sin cliente_id)
    print("\nCreando usuario Master...")
    result = supabase.table('quipu_usuarios').insert({
        'cliente_id': None,  # Sin cliente = ve todo
        'email': 'master@daat.cloud',
        'nombre': 'Master Admin',
        'rol': 'superadmin',
        'auth_user_id': 'c1312c18-5c1c-4c53-b29f-5fc6f364b649'
    }).execute()
    print(f"  Master creado: {result.data}")

    # 3. Verificar
    print("\nUsuarios actuales:")
    result = supabase.table('quipu_usuarios').select('email, nombre, rol, cliente_id').execute()
    for user in result.data:
        cliente = user['cliente_id'] if user['cliente_id'] else 'MASTER (todos)'
        print(f"  - {user['email']} ({user['rol']}) -> cliente_id: {cliente}")

if __name__ == "__main__":
    main()
