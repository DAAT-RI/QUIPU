# Fase 3: Auth Multi-Tenant + Normalización de Datos

## Resumen

Esta fase implementa:
1. **Multi-tenant**: Clientes con candidatos y temas asignados
2. **Normalización**: Temas, organizaciones, declaraciones con FKs
3. **Coherencia**: Link promesas ↔ declaraciones
4. **RLS**: Row Level Security para filtrar por cliente

## Orden de Ejecución

```bash
# 1. Ejecutar migraciones SQL en Supabase
psql $DATABASE_URL -f migrations/001_quipu_clientes.sql
psql $DATABASE_URL -f migrations/002_quipu_temas.sql
psql $DATABASE_URL -f migrations/003_quipu_organizaciones.sql
psql $DATABASE_URL -f migrations/004_quipu_declaraciones.sql
psql $DATABASE_URL -f migrations/005_quipu_coherencia.sql
psql $DATABASE_URL -f migrations/006_quipu_views.sql
psql $DATABASE_URL -f migrations/007_quipu_rls.sql

# 2. Poblar catálogo de temas
python scripts/seed_temas.py

# 3. Sincronizar MASTER → declaraciones
python scripts/sync_master_declaraciones.py

# 4. Crear cliente de prueba
python scripts/create_test_client.py
```

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Modelo de datos, diagramas, queries SQL |
| [FRONTEND_MIGRATION.md](FRONTEND_MIGRATION.md) | Impacto en frontend, hooks a modificar, componentes nuevos |

## Estructura

```
fase3/
├── README.md
├── ARCHITECTURE.md             # Arquitectura de datos
├── FRONTEND_MIGRATION.md       # Guía migración frontend
├── migrations/
│   ├── 001_quipu_clientes.sql      # Clientes + usuarios
│   ├── 002_quipu_temas.sql         # Catálogo de temas
│   ├── 003_quipu_organizaciones.sql # Gremios/empresas
│   ├── 004_quipu_declaraciones.sql  # Declaraciones normalizadas
│   ├── 005_quipu_coherencia.sql     # Link promesa ↔ declaración
│   ├── 006_quipu_views.sql          # Vistas para frontend
│   └── 007_quipu_rls.sql            # Row Level Security
└── scripts/
    ├── seed_temas.py               # Poblar catálogo inicial
    ├── sync_master_declaraciones.py # Extraer de MASTER
    └── create_test_client.py       # Cliente APESEG de prueba
```

## Modelo de Datos

```
┌─────────────────────────────────────────────────────────────────┐
│                        CAPA MULTI-TENANT                        │
│                                                                 │
│  quipu_clientes ──► quipu_cliente_candidatos ◄── quipu_candidatos
│        │                                                        │
│        └──────────► quipu_cliente_temas ◄─────── quipu_temas    │
│                                                                 │
│  quipu_usuarios (auth)                                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        CAPA DE DATOS                            │
│                                                                 │
│  QUIPU_MASTER (inmutable) ──sync──► quipu_declaraciones         │
│                                          │                      │
│                                          ├─► candidato_id       │
│                                          ├─► tema_id            │
│                                          └─► embedding          │
│                                                                 │
│  quipu_promesas_planes ◄──► quipu_promesa_declaracion           │
└─────────────────────────────────────────────────────────────────┘
```

## Verificación

1. `SELECT * FROM quipu_clientes;` → Cliente APESEG existe
2. `SELECT * FROM quipu_cliente_candidatos WHERE cliente_id = 1;` → 15+ candidatos
3. `SELECT * FROM quipu_declaraciones LIMIT 10;` → Declaraciones con candidato_id
4. Login como usuario de APESEG → Solo ve sus candidatos/temas