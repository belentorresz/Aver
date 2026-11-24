-- 001_initial_schema.sql
-- Esquema completo relacional para AVer (A ver cómo vamos)
-- Uso exclusivo de PostgreSQL puro (sin ORM)

-- 1. Tabla de control de migraciones
CREATE TABLE IF NOT EXISTS migrations_history (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de usuarios (Docentes y Apoderados)
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    dni VARCHAR(8) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('DOCENTE', 'APODERADO')),
    activo BOOLEAN DEFAULT TRUE,
    email_verificado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usuarios_dni ON usuarios(dni);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- 3. Tabla de instituciones educativas
CREATE TABLE IF NOT EXISTS instituciones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    codigo_modular VARCHAR(20) UNIQUE,
    nivel VARCHAR(50),
    region VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Perfiles de Docentes
CREATE TABLE IF NOT EXISTS docentes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    nombres VARCHAR(150) NOT NULL,
    apellidos VARCHAR(150) NOT NULL,
    dni VARCHAR(8) NOT NULL UNIQUE,
    institucion_educativa VARCHAR(255) NOT NULL,
    nivel_educativo VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_docentes_usuario_id ON docentes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_docentes_dni ON docentes(dni);

-- 5. Perfiles de Apoderados
CREATE TABLE IF NOT EXISTS apoderados (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    nombres VARCHAR(150) NOT NULL,
    apellidos VARCHAR(150) NOT NULL,
    dni VARCHAR(8) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    direccion VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_apoderados_usuario_id ON apoderados(usuario_id);
CREATE INDEX IF NOT EXISTS idx_apoderados_dni ON apoderados(dni);

-- 6. Aulas (asociadas estrictamente al docente propietario)
CREATE TABLE IF NOT EXISTS aulas (
    id SERIAL PRIMARY KEY,
    docente_id INTEGER NOT NULL REFERENCES docentes(id) ON DELETE CASCADE,
    grado VARCHAR(50) NOT NULL,
    seccion VARCHAR(10) NOT NULL,
    nivel VARCHAR(50) DEFAULT 'Primaria',
    anio_escolar VARCHAR(10) DEFAULT '2025',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(docente_id, grado, seccion, anio_escolar)
);

CREATE INDEX IF NOT EXISTS idx_aulas_docente_id ON aulas(docente_id);

-- 7. Estudiantes (aislados por docente y aula)
CREATE TABLE IF NOT EXISTS estudiantes (
    id SERIAL PRIMARY KEY,
    docente_id INTEGER NOT NULL REFERENCES docentes(id) ON DELETE CASCADE,
    aula_id INTEGER REFERENCES aulas(id) ON DELETE SET NULL,
    nombres VARCHAR(150) NOT NULL,
    apellidos VARCHAR(150) NOT NULL,
    dni VARCHAR(8),
    codigo VARCHAR(50) NOT NULL,
    color_avatar VARCHAR(20) DEFAULT '#D9C8EF',
    estado VARCHAR(50) DEFAULT 'ACTIVO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(docente_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_estudiantes_docente_id ON estudiantes(docente_id);
CREATE INDEX IF NOT EXISTS idx_estudiantes_aula_id ON estudiantes(aula_id);

-- 8. Relación Apoderado - Estudiante (con autorización y vinculación)
CREATE TABLE IF NOT EXISTS relaciones_apoderado_estudiante (
    id SERIAL PRIMARY KEY,
    apoderado_id INTEGER NOT NULL REFERENCES apoderados(id) ON DELETE CASCADE,
    estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
    parentesco VARCHAR(50) DEFAULT 'Padre/Madre/Tutor',
    estado_vinculacion VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (estado_vinculacion IN ('PENDIENTE', 'ACTIVO', 'REVOCADO')),
    fecha_vinculacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(apoderado_id, estudiante_id)
);

CREATE INDEX IF NOT EXISTS idx_relaciones_apoderado ON relaciones_apoderado_estudiante(apoderado_id);
CREATE INDEX IF NOT EXISTS idx_relaciones_estudiante ON relaciones_apoderado_estudiante(estudiante_id);

-- 9. Áreas académicas
CREATE TABLE IF NOT EXISTS areas_academicas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    color VARCHAR(30) DEFAULT 'violet',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Criterios de evaluación
CREATE TABLE IF NOT EXISTS criterios_evaluacion (
    id SERIAL PRIMARY KEY,
    area_id INTEGER NOT NULL REFERENCES areas_academicas(id) ON DELETE CASCADE,
    docente_id INTEGER REFERENCES docentes(id) ON DELETE CASCADE,
    descripcion TEXT NOT NULL,
    orden INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_criterios_area_id ON criterios_evaluacion(area_id);
CREATE INDEX IF NOT EXISTS idx_criterios_docente_id ON criterios_evaluacion(docente_id);

-- 11. Archivos importados (OCR / Excel)
CREATE TABLE IF NOT EXISTS archivos_importados (
    id SERIAL PRIMARY KEY,
    docente_id INTEGER NOT NULL REFERENCES docentes(id) ON DELETE CASCADE,
    nombre_archivo VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('EXCEL', 'IMAGEN_OCR')),
    ruta_archivo TEXT,
    estado VARCHAR(50) DEFAULT 'PROCESADO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_archivos_docente_id ON archivos_importados(docente_id);

-- 12. Evaluaciones registradas
CREATE TABLE IF NOT EXISTS evaluaciones (
    id SERIAL PRIMARY KEY,
    docente_id INTEGER NOT NULL REFERENCES docentes(id) ON DELETE CASCADE,
    aula_id INTEGER REFERENCES aulas(id) ON DELETE SET NULL,
    area_id INTEGER REFERENCES areas_academicas(id) ON DELETE SET NULL,
    titulo VARCHAR(255) NOT NULL,
    fecha DATE NOT NULL,
    sesion VARCHAR(100),
    estado VARCHAR(30) NOT NULL DEFAULT 'COMPLETADA' CHECK (estado IN ('BORRADOR', 'POR_REVISAR', 'COMPLETADA')),
    fuente_origen VARCHAR(30) NOT NULL DEFAULT 'DIRECTO' CHECK (fuente_origen IN ('DIRECTO', 'OCR', 'EXCEL')),
    archivo_id INTEGER REFERENCES archivos_importados(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evaluaciones_docente_id ON evaluaciones(docente_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_aula_id ON evaluaciones(aula_id);

-- 13. Resultados académicos individuales por criterio
CREATE TABLE IF NOT EXISTS resultados_academicos (
    id SERIAL PRIMARY KEY,
    evaluacion_id INTEGER NOT NULL REFERENCES evaluaciones(id) ON DELETE CASCADE,
    estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
    criterio_id INTEGER NOT NULL REFERENCES criterios_evaluacion(id) ON DELETE CASCADE,
    marca VARCHAR(20) NOT NULL CHECK (marca IN ('LOGRADO', 'NO_LOGRADO', 'NO_OBSERVADO')),
    nivel_logro VARCHAR(5) CHECK (nivel_logro IN ('AD', 'A', 'B', 'C')),
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(evaluacion_id, estudiante_id, criterio_id)
);

CREATE INDEX IF NOT EXISTS idx_resultados_evaluacion ON resultados_academicos(evaluacion_id);
CREATE INDEX IF NOT EXISTS idx_resultados_estudiante ON resultados_academicos(estudiante_id);

-- 14. Revisiones OCR pendientes o confirmadas
CREATE TABLE IF NOT EXISTS revisiones_ocr (
    id SERIAL PRIMARY KEY,
    archivo_id INTEGER NOT NULL REFERENCES archivos_importados(id) ON DELETE CASCADE,
    docente_id INTEGER NOT NULL REFERENCES docentes(id) ON DELETE CASCADE,
    datos_reconocidos JSONB NOT NULL,
    datos_corregidos JSONB,
    confirmado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_revisiones_docente ON revisiones_ocr(docente_id);

-- 15. Alertas académicas (generadas por repetición de dificultades)
CREATE TABLE IF NOT EXISTS alertas (
    id SERIAL PRIMARY KEY,
    docente_id INTEGER NOT NULL REFERENCES docentes(id) ON DELETE CASCADE,
    estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
    criterio_id INTEGER REFERENCES criterios_evaluacion(id) ON DELETE SET NULL,
    evaluacion_id INTEGER REFERENCES evaluaciones(id) ON DELETE SET NULL,
    nivel VARCHAR(20) NOT NULL DEFAULT 'ALTA' CHECK (nivel IN ('ALTA', 'MEDIA', 'BAJA')),
    titulo VARCHAR(255) NOT NULL,
    detalle TEXT NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA', 'REVISADA', 'DESCARTADA')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alertas_docente ON alertas(docente_id);
CREATE INDEX IF NOT EXISTS idx_alertas_estudiante ON alertas(estudiante_id);

-- 16. Seguimientos académicos
CREATE TABLE IF NOT EXISTS seguimientos (
    id SERIAL PRIMARY KEY,
    docente_id INTEGER NOT NULL REFERENCES docentes(id) ON DELETE CASCADE,
    estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
    criterio_id INTEGER REFERENCES criterios_evaluacion(id) ON DELETE SET NULL,
    tipo VARCHAR(50) DEFAULT 'SEGUIMIENTO_INDIVIDUAL',
    descripcion TEXT NOT NULL,
    fecha DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_seguimientos_docente ON seguimientos(docente_id);
CREATE INDEX IF NOT EXISTS idx_seguimientos_estudiante ON seguimientos(estudiante_id);

-- 17. Recomendaciones y propuestas de apoyo
CREATE TABLE IF NOT EXISTS recomendaciones (
    id SERIAL PRIMARY KEY,
    docente_id INTEGER NOT NULL REFERENCES docentes(id) ON DELETE CASCADE,
    estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
    criterio_id INTEGER REFERENCES criterios_evaluacion(id) ON DELETE SET NULL,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'PROPUESTA' CHECK (estado IN ('PROPUESTA', 'ACEPTADA', 'APLICADA', 'DESCARTADA')),
    fecha_aplicacion DATE,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recomendaciones_docente ON recomendaciones(docente_id);
CREATE INDEX IF NOT EXISTS idx_recomendaciones_estudiante ON recomendaciones(estudiante_id);

-- 18. Tokens seguros para recuperación de contraseña
CREATE TABLE IF NOT EXISTS tokens_recuperacion (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expira_en TIMESTAMP WITH TIME ZONE NOT NULL,
    usado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tokens_recuperacion_hash ON tokens_recuperacion(token_hash);

-- 19. Tokens para verificación de email
CREATE TABLE IF NOT EXISTS tokens_verificacion (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expira_en TIMESTAMP WITH TIME ZONE NOT NULL,
    usado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 20. Invitaciones y códigos de vinculación apoderado-estudiante
CREATE TABLE IF NOT EXISTS invitaciones_vinculacion (
    id SERIAL PRIMARY KEY,
    docente_id INTEGER NOT NULL REFERENCES docentes(id) ON DELETE CASCADE,
    estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
    codigo_invitacion VARCHAR(32) NOT NULL UNIQUE,
    expira_en TIMESTAMP WITH TIME ZONE NOT NULL,
    usado BOOLEAN DEFAULT FALSE,
    apoderado_id INTEGER REFERENCES apoderados(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invitaciones_codigo ON invitaciones_vinculacion(codigo_invitacion);

-- 21. Registros de auditoría
CREATE TABLE IF NOT EXISTS registros_auditoria (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    accion VARCHAR(100) NOT NULL,
    entidad VARCHAR(100) NOT NULL,
    entidad_id INTEGER,
    detalles JSONB,
    ip VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON registros_auditoria(usuario_id);
