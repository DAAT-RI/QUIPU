-- =====================================================
-- FIX: auto_match_stakeholder function
-- The previous version had issues with record field access
-- =====================================================

CREATE OR REPLACE FUNCTION auto_match_stakeholder(stakeholder_text TEXT)
RETURNS TABLE(candidato_id INTEGER, confidence DECIMAL, method TEXT) AS $$
DECLARE
    norm_text TEXT;
    apellidos_arr TEXT[];
    apellidos TEXT;
    found_id INTEGER;
BEGIN
    norm_text := normalize_stakeholder(stakeholder_text);
    
    -- Skip empty or very short strings
    IF length(norm_text) < 3 THEN
        RETURN QUERY SELECT NULL::INTEGER, 0::DECIMAL, 'none'::TEXT;
        RETURN;
    END IF;

    -- 1. Match exacto en nombre_completo normalizado
    SELECT c.id INTO found_id
    FROM quipu_candidatos c
    WHERE normalize_stakeholder(c.nombre_completo) = norm_text
    LIMIT 1;

    IF found_id IS NOT NULL THEN
        RETURN QUERY SELECT found_id, 1.0::DECIMAL, 'exact'::TEXT;
        RETURN;
    END IF;

    -- 2. Match por apellidos (últimas 2 palabras del stakeholder en nombre)
    apellidos_arr := string_to_array(norm_text, ' ');
    IF array_length(apellidos_arr, 1) >= 2 THEN
        apellidos := apellidos_arr[array_length(apellidos_arr, 1) - 1] || ' ' || apellidos_arr[array_length(apellidos_arr, 1)];
    ELSE
        apellidos := norm_text;
    END IF;

    SELECT c.id INTO found_id
    FROM quipu_candidatos c
    WHERE normalize_stakeholder(c.nombre_completo) LIKE '%' || apellidos || '%'
    LIMIT 1;

    IF found_id IS NOT NULL THEN
        RETURN QUERY SELECT found_id, 0.85::DECIMAL, 'apellidos'::TEXT;
        RETURN;
    END IF;

    -- 3. Match por apellido único (última palabra)
    SELECT c.id INTO found_id
    FROM quipu_candidatos c
    WHERE normalize_stakeholder(c.nombre_completo) LIKE '%' || apellidos_arr[array_length(apellidos_arr, 1)] || '%'
      AND length(apellidos_arr[array_length(apellidos_arr, 1)]) >= 4
    LIMIT 1;

    IF found_id IS NOT NULL THEN
        RETURN QUERY SELECT found_id, 0.7::DECIMAL, 'apellido_unico'::TEXT;
        RETURN;
    END IF;

    -- 4. Sin match
    RETURN QUERY SELECT NULL::INTEGER, 0::DECIMAL, 'none'::TEXT;
END;
$$ LANGUAGE plpgsql;
