-- =====================================================
-- Búsqueda de candidatos NEWLINK en quipu_candidatos
-- Ejecutar en Supabase para obtener IDs/DNIs
-- =====================================================

SELECT
    id,
    dni,
    nombre_completo,
    cargo_postula,
    'Mirtha Vasquez Chuquilin' as buscado
FROM quipu_candidatos
WHERE nombre_completo ILIKE '%Mirtha%Vasquez%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Jaime Delgado Zegarra'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Jaime%Delgado%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Ruth Luque Ibarra'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Ruth%Luque%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Indira Huilca Flores'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Indira%Huilca%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Gilbert Felix Violeta Lopez'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Violeta%Lopez%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Crisologo Cáceres'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Crisologo%Caceres%' OR nombre_completo ILIKE '%Crisologo%Cáceres%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'David Felipe Novoa Guibovich'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Novoa%Guibovich%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Javier Bedoya Denegri'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Bedoya%Denegri%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Sigrid Bazán'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Sigrid%Bazan%' OR nombre_completo ILIKE '%Sigrid%Bazán%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Olivarez Gonza Rivera'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Olivarez%Gonza%' OR nombre_completo ILIKE '%Gonza%Rivera%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Marisol Espinoza Cruz'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Marisol%Espinoza%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Lady Camones Soriano'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Lady%Camones%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Juan José Santivañez'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Santivanez%' OR nombre_completo ILIKE '%Santivañez%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Carla García'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Carla%Garcia%' OR nombre_completo ILIKE '%Carla%García%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Jorge del Castillo'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Jorge%Castillo%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Fernan Romano Altuve'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Altuve%Febres%' OR nombre_completo ILIKE '%Fernan%Altuve%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Adriana Tudela Gutiérrez'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Adriana%Tudela%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'María Cecilia Bakula Budge'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Bakula%' OR nombre_completo ILIKE '%Bákula%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Augusto Peñaloza'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Augusto%Penaloza%' OR nombre_completo ILIKE '%Augusto%Peñaloza%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Diana Gonzáles'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Diana%Gonzales%' OR nombre_completo ILIKE '%Diana%González%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Carlos Zeballos Madariaga'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Zeballos%Madariaga%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Miguel Angel Torres Morales'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Torres%Morales%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Cecilia Chacon de Vettori'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Chacon%Vettori%' OR nombre_completo ILIKE '%Chacón%Vettori%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Patricia Juárez'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Patricia%Juarez%' OR nombre_completo ILIKE '%Patricia%Juárez%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Silvana Robles Araujo'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Silvana%Robles%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Anahi Durand'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Anahi%Durand%' OR nombre_completo ILIKE '%Anahí%Durand%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Margot Palacios Huaman'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Margot%Palacios%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Zaira Arias'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Zaira%Arias%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Pedro Cateriano'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Pedro%Cateriano%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Gino Costa'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Gino%Costa%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Julia Principe Trujillo'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Julia%Principe%' OR nombre_completo ILIKE '%Julia%Príncipe%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Edward Málaga Trillo'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Edward%Malaga%' OR nombre_completo ILIKE '%Edward%Málaga%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Juan Sheput Moore'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Sheput%Moore%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Flavio Cruz Mamani'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Flavio%Cruz%Mamani%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Kelly Portalatino'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Kelly%Portalatino%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Américo Gonza'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Americo%Gonza%' OR nombre_completo ILIKE '%Américo%Gonza%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Jorge Chavez Cresta'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Chavez%Cresta%' OR nombre_completo ILIKE '%Chávez%Cresta%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Alejandro Salas'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Alejandro%Salas%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Cecilia Garcia Rodriguez'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Cecilia%Garcia%Rodriguez%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Raúl Nobecilla Olaeche'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Nobecilla%Olaeche%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Jean Paul Benavente'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Jean%Paul%Benavente%' OR nombre_completo ILIKE '%Benavente%Garcia%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Norma Yarrow Lumbreras'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Yarrow%Lumbreras%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Alejandro Muñante Barrios'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Munante%Barrios%' OR nombre_completo ILIKE '%Muñante%Barrios%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Absalón Vásquez Villanueva'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Absalon%Vasquez%' OR nombre_completo ILIKE '%Absalón%Vásquez%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Katherine Ampuero'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Katherine%Ampuero%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Javier Bernal Salas'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Javier%Bernal%Salas%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Alex Paredes Gonzales'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Alex%Paredes%Gonzales%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Winston Huamán Henriquez'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Winston%Huaman%' OR nombre_completo ILIKE '%Winston%Huamán%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Daniel Mora'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Daniel%Mora%Zevallos%' OR nombre_completo ILIKE '%Daniel%Mora%'

UNION ALL
SELECT id, dni, nombre_completo, cargo_postula, 'Jorge Montoya'
FROM quipu_candidatos WHERE nombre_completo ILIKE '%Jorge%Montoya%Manrique%' OR nombre_completo ILIKE '%Jorge%Montoya%'

ORDER BY buscado;
