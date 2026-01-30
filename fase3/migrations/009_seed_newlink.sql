-- =====================================================
-- FASE 3: Seed Cliente Demo - NEWLINK
-- Generado desde Seguimiento NEWLINK.csv
-- Total candidatos: 49 (de 50 - 1 no encontrado en DB)
-- =====================================================

-- 1. Crear cliente NEWLINK
INSERT INTO quipu_clientes (nombre, tipo, sector, plan, max_candidatos, contacto_email)
VALUES ('NEWLINK', 'consultora', 'comunicaciones', 'enterprise', 100, 'demo@newlink.com.pe')
ON CONFLICT DO NOTHING;

-- 2. Asignar candidatos al cliente
-- Nota: Si hay duplicados de DNI, preferir cargos más altos
INSERT INTO quipu_cliente_candidatos (cliente_id, candidato_id)
SELECT
    (SELECT id FROM quipu_clientes WHERE nombre = 'NEWLINK'),
    candidato_id
FROM (
    SELECT DISTINCT ON (c.dni)
        c.id as candidato_id,
        c.dni
    FROM quipu_candidatos c
    WHERE c.dni IN (
        '09376064',  -- Absalón Vásquez Villanueva
        '45591954',  -- Adriana Tudela Gutiérrez
        '45209282',  -- Alejandro Muñante Barrios
        '10762763',  -- Alejandro Salas (ALEJANDRO ANTONIO SALAS ZEGARRA)
        '80295748',  -- Alejandro Salas (CESAR ALEJANDRO MURILLO SALAS)
        '29299579',  -- Alex Paredes Gonzales
        '41187802',  -- Américo Gonza
        '10783805',  -- Anahí Durand
        '09145206',  -- Augusto Peñaloza
        '06449530',  -- Carla García
        '02417724',  -- Carlos Zeballos Madariaga
        '09536896',  -- Cecilia Chacón de Vettori
        '08726151',  -- Crisólogo Cáceres
        '41137240',  -- Daniel Mora
        '40411110',  -- David Felipe Novoa Guibovich
        '70546213',  -- Diana González
        '09303898',  -- Edward Málaga Trillo
        '08274679',  -- Fernán Romano Altuve-Febres
        '01311614',  -- Flavio Cruz Mamani
        '21871411',  -- Gilbert Félix Violeta López
        '10273657',  -- Gino Costa
        '45218393',  -- Indira Huilca Flores
        '07755878',  -- Jaime Delgado Zegarra
        '40672251',  -- Javier Bedoya Denegri
        '02408529',  -- Javier Bernal Salas
        '00190779',  -- Jorge Chávez Cresta
        '06656534',  -- Jorge del Castillo (JORGE ALFONSO ALEJANDRO DEL CASTILLO GALVEZ)
        '09966802',  -- Jorge del Castillo (JORGE LUIS CASTILLO BENDEZU)
        '43328757',  -- Jorge Montoya
        '23272702',  -- Juan José Santivañez
        '06654879',  -- Juan Sheput Moore
        '32304953',  -- Julia Príncipe Trujillo
        '25799622',  -- Katherine Ampuero
        '42699423',  -- Kelly Portalatino
        '80143959',  -- Lady Camones Soriano
        '42134579',  -- Margot Palacios Huamán
        '08251768',  -- María Cecilia Bákula Budge
        '02794608',  -- Marisol Espinoza Cruz
        '40433187',  -- Miguel Ángel Torres Morales
        '26705695',  -- Mirtha Vásquez Chuquilín
        '10806296',  -- Norma Yarrow Lumbreras
        '43445916',  -- Olivarez Gonza Rivera
        '07831436',  -- Patricia Juárez
        '08199906',  -- Pedro Cateriano
        '40204874',  -- Ruth Luque Ibarra
        '72200895',  -- Sigrid Bazán
        '42750152',  -- Silvana Robles Araujo
        '16423581',  -- Winston Huamán Henríquez
        '47306100'   -- Zaira Arias
    )
    ORDER BY c.dni,
        CASE
            WHEN c.cargo_postula ILIKE '%PRESIDENTE DE LA%' THEN 1
            WHEN c.cargo_postula ILIKE '%VICEPRESIDENTE%' THEN 2
            WHEN c.cargo_postula ILIKE '%SENADOR%' THEN 3
            WHEN c.cargo_postula ILIKE '%DIPUTADO%' THEN 4
            ELSE 5
        END
) AS candidatos_unicos
ON CONFLICT DO NOTHING;

-- 3. Verificar cuántos candidatos se asignaron
-- SELECT COUNT(*) as candidatos_asignados
-- FROM quipu_cliente_candidatos
-- WHERE cliente_id = (SELECT id FROM quipu_clientes WHERE nombre = 'NEWLINK');

-- NOTA: 1 candidato del CSV no encontrado en quipu_candidatos:
-- - Jean Paul Benavente (Primero La Gente)
--
-- Pendientes de verificar si están inscritos:
-- - Cecilia Garcia Rodriguez (Podemos)
-- - Raúl Nobecilla Olaeche (Podemos)
