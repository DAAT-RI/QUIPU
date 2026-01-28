-- =====================================================
-- FIX: Allow multiple candidacies per DNI
-- 85 candidates have 2 postulations (e.g. presidente + senador)
-- The old UNIQUE(dni) constraint caused upsert to overwrite the first entry
-- =====================================================

-- Step 1: Drop the old unique constraint on dni alone
ALTER TABLE quipu_candidatos DROP CONSTRAINT IF EXISTS quipu_candidatos_dni_key;

-- Step 2: Add composite unique constraint (dni + cargo)
-- This allows the same person to have multiple candidacy records
ALTER TABLE quipu_candidatos
    ADD CONSTRAINT quipu_candidatos_dni_cargo_key UNIQUE (dni, cargo_eleccion);

-- Step 3: After running this, re-execute the candidatos migration:
--   python 002_migrate_to_supabase.py
-- This will insert the 85 previously-overwritten records.
--
-- Step 4: Reset sequence
-- SELECT setval('quipu_candidatos_id_seq', (SELECT COALESCE(MAX(id), 1) FROM quipu_candidatos));
