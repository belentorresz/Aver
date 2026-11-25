-- 004_docente_perfil_foto.sql
-- Agrega columna persistente para la fotografía de perfil del docente en PostgreSQL

ALTER TABLE docentes
ADD COLUMN IF NOT EXISTS foto_perfil TEXT;
