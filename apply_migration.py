import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")

supabase: Client = create_client(url, key)

# Read the migration file
with open("migrations/008_fix_usuarios_rls.sql", "r") as f:
    sql = f.read()

print("Executing RLS fix migration...")
print("-" * 50)
print(sql)
print("-" * 50)

# Execute using rpc - we need to use raw SQL
# Since supabase-py doesn't have direct SQL execution, we'll need to use postgres directly
# Let's use psycopg2 instead

import psycopg2

# Supabase database connection string
# Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
# For direct connection: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

project_ref = "pjhnmjcwliqhjntcgood"
# We need the database password - let's try getting it from service key or use another method

print("Note: Direct SQL execution requires database password.")
print("Please run this SQL manually in the Supabase SQL Editor:")
print("\nhttps://supabase.com/dashboard/project/" + project_ref + "/sql/new")
