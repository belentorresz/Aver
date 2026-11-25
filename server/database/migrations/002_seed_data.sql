-- 002_seed_data.sql
-- Datos iniciales y de referencia para la plataforma AVer

-- 1. Áreas curriculares oficiales del diseño Figma
INSERT INTO areas_academicas (nombre, descripcion, color)
VALUES
    ('Comunicación', 'Desarrollo de competencias comunicativas orales y escritas', 'violet'),
    ('Matemática', 'Resolución de problemas de cantidad, forma y regularidad', 'blue'),
    ('Ciencia y Tecnología', 'Indagación y explicación del mundo físico y seres vivos', 'green'),
    ('Personal Social', 'Construcción de la identidad y convivencia democrática', 'orange')
ON CONFLICT (nombre) DO NOTHING;

-- 2. Criterios de evaluación base
INSERT INTO criterios_evaluacion (area_id, descripcion, orden)
SELECT a.id, 'Identifica las ideas principales de un texto', 1
FROM areas_academicas a 
WHERE a.nombre = 'Comunicación'
  AND NOT EXISTS (
    SELECT 1 FROM criterios_evaluacion c 
    WHERE c.area_id = a.id AND c.descripcion = 'Identifica las ideas principales de un texto' AND c.docente_id IS NULL
  );

INSERT INTO criterios_evaluacion (area_id, descripcion, orden)
SELECT a.id, 'Ubica información explícita en el texto', 2
FROM areas_academicas a 
WHERE a.nombre = 'Comunicación'
  AND NOT EXISTS (
    SELECT 1 FROM criterios_evaluacion c 
    WHERE c.area_id = a.id AND c.descripcion = 'Ubica información explícita en el texto' AND c.docente_id IS NULL
  );

INSERT INTO criterios_evaluacion (area_id, descripcion, orden)
SELECT a.id, 'Infiere información deduciendo características y relaciones', 3
FROM areas_academicas a 
WHERE a.nombre = 'Comunicación'
  AND NOT EXISTS (
    SELECT 1 FROM criterios_evaluacion c 
    WHERE c.area_id = a.id AND c.descripcion = 'Infiere información deduciendo características y relaciones' AND c.docente_id IS NULL
  );

INSERT INTO criterios_evaluacion (area_id, descripcion, orden)
SELECT a.id, 'Resuelve problemas de cantidad aditivos', 1
FROM areas_academicas a 
WHERE a.nombre = 'Matemática'
  AND NOT EXISTS (
    SELECT 1 FROM criterios_evaluacion c 
    WHERE c.area_id = a.id AND c.descripcion = 'Resuelve problemas de cantidad aditivos' AND c.docente_id IS NULL
  );

INSERT INTO criterios_evaluacion (area_id, descripcion, orden)
SELECT a.id, 'Reconoce y aplica operaciones básicas', 2
FROM areas_academicas a 
WHERE a.nombre = 'Matemática'
  AND NOT EXISTS (
    SELECT 1 FROM criterios_evaluacion c 
    WHERE c.area_id = a.id AND c.descripcion = 'Reconoce y aplica operaciones básicas' AND c.docente_id IS NULL
  );
