-- 003_agenda_eventos.sql
-- Tabla para la Agenda Compartida entre Docentes y Apoderados

CREATE TABLE IF NOT EXISTS agenda_eventos (
    id SERIAL PRIMARY KEY,
    docente_id INTEGER NOT NULL REFERENCES docentes(id) ON DELETE CASCADE,
    aula_id INTEGER REFERENCES aulas(id) ON DELETE SET NULL,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('REUNION', 'EVALUACION', 'ACTIVIDAD', 'COMUNICADO')),
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT NOT NULL DEFAULT '',
    fecha DATE NOT NULL,
    hora_inicio TIME,
    hora_fin TIME,
    ubicacion VARCHAR(255),
    modalidad VARCHAR(30) NOT NULL DEFAULT 'PRESENCIAL' CHECK (modalidad IN ('PRESENCIAL', 'VIRTUAL', 'INFORMATIVO')),
    destinatarios_tipo VARCHAR(20) NOT NULL DEFAULT 'AULA' CHECK (destinatarios_tipo IN ('TODOS', 'AULA', 'ESTUDIANTES')),
    estado VARCHAR(20) NOT NULL DEFAULT 'PROGRAMADO' CHECK (estado IN ('PROGRAMADO', 'COMPLETADO', 'CANCELADO')),
    motivo_cancelacion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agenda_eventos_docente ON agenda_eventos(docente_id);
CREATE INDEX IF NOT EXISTS idx_agenda_eventos_fecha ON agenda_eventos(fecha);
CREATE INDEX IF NOT EXISTS idx_agenda_eventos_aula ON agenda_eventos(aula_id);

CREATE TABLE IF NOT EXISTS agenda_evento_estudiantes (
    id SERIAL PRIMARY KEY,
    evento_id INTEGER NOT NULL REFERENCES agenda_eventos(id) ON DELETE CASCADE,
    estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
    UNIQUE(evento_id, estudiante_id)
);

CREATE INDEX IF NOT EXISTS idx_agenda_evt_est_evento ON agenda_evento_estudiantes(evento_id);
CREATE INDEX IF NOT EXISTS idx_agenda_evt_est_estudiante ON agenda_evento_estudiantes(estudiante_id);
