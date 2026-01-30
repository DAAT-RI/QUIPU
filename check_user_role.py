import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")

supabase: Client = create_client(url, key)

# Query the user with auth_user_id
result = supabase.table("quipu_usuarios").select("email, rol, nombre, auth_user_id, cliente_id").ilike("email", "%alejandro%").execute()

print("User alejandro@daat.cloud details:")
for user in result.data:
    print(f"  - email: {user['email']}")
    print(f"  - rol: {user['rol']}")
    print(f"  - nombre: {user.get('nombre', 'N/A')}")
    print(f"  - auth_user_id: {user.get('auth_user_id', 'NOT LINKED')}")
    print(f"  - cliente_id: {user.get('cliente_id', 'N/A')}")
