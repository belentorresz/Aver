import { query, withTransaction } from '../connection.js';

export interface AgendaEventoInput {
  aulaId?: number | null;
  tipo: 'REUNION' | 'EVALUACION' | 'ACTIVIDAD' | 'COMUNICADO';
  titulo: string;
  descripcion: string;
  fecha: string;
  horaInicio?: string | null;
  horaFin?: string | null;
  ubicacion?: string | null;
  modalidad?: 'PRESENCIAL' | 'VIRTUAL' | 'INFORMATIVO';
  destinatariosTipo: 'TODOS' | 'AULA' | 'ESTUDIANTES';
  estudianteIds?: number[];
  estado?: 'PROGRAMADO' | 'COMPLETADO' | 'CANCELADO';
}

export async function findAgendaEventosByDocente(
  docenteId: number,
  filters?: { tipo?: string; estado?: string; aulaId?: number }
) {
  const params: any[] = [docenteId];
  let sql = `
    SELECT ev.*,
           a.grado, a.seccion,
           COALESCE(
             json_agg(
               json_build_object(
                 'id', e.id,
                 'nombres', e.nombres,
                 'apellidos', e.apellidos,
                 'codigo', e.codigo
               )
             ) FILTER (WHERE e.id IS NOT NULL),
             '[]'::json
           ) as estudiantes_destinatarios
    FROM agenda_eventos ev
    LEFT JOIN aulas a ON a.id = ev.aula_id
    LEFT JOIN agenda_evento_estudiantes aee ON aee.evento_id = ev.id
    LEFT JOIN estudiantes e ON e.id = aee.estudiante_id
    WHERE ev.docente_id = $1
  `;

  if (filters?.tipo && filters.tipo !== 'TODOS') {
    params.push(filters.tipo);
    sql += ` AND ev.tipo = $${params.length}`;
  }
  if (filters?.estado && filters.estado !== 'TODOS') {
    params.push(filters.estado);
    sql += ` AND ev.estado = $${params.length}`;
  }
  if (filters?.aulaId) {
    params.push(filters.aulaId);
    sql += ` AND ev.aula_id = $${params.length}`;
  }

  sql += ` GROUP BY ev.id, a.grado, a.seccion ORDER BY ev.fecha ASC, ev.hora_inicio ASC NULLS LAST, ev.created_at DESC`;
  const res = await query(sql, params);
  return res.rows;
}

export async function createAgendaEvento(docenteId: number, data: AgendaEventoInput) {
  return withTransaction(async (client) => {
    if (data.destinatariosTipo === 'AULA') {
      if (!data.aulaId) {
        throw new Error('Debe seleccionar un aula para eventos dirigidos a un aula.');
      }
      const aulaCheck = await client.query(
        'SELECT id FROM aulas WHERE id = $1 AND docente_id = $2',
        [data.aulaId, docenteId]
      );
      if (aulaCheck.rows.length === 0) {
        throw new Error('El aula seleccionada no pertenece al docente.');
      }
    }

    const studentIds = data.destinatariosTipo === 'ESTUDIANTES' ? Array.from(new Set(data.estudianteIds || [])) : [];
    if (data.destinatariosTipo === 'ESTUDIANTES') {
      if (studentIds.length === 0) {
        throw new Error('Debe seleccionar al menos un estudiante destinatario.');
      }
      const stCheck = await client.query(
        'SELECT id FROM estudiantes WHERE docente_id = $1 AND id = ANY($2::int[])',
        [docenteId, studentIds]
      );
      if (stCheck.rows.length !== studentIds.length) {
        throw new Error('Uno o más estudiantes seleccionados no pertenecen al docente.');
      }
    }

    const res = await client.query(
      `INSERT INTO agenda_eventos (
         docente_id, aula_id, tipo, titulo, descripcion, fecha,
         hora_inicio, hora_fin, ubicacion, modalidad, destinatarios_tipo, estado
       )
       VALUES ($1, $2, $3, $4, $5, $6::date, $7::time, $8::time, $9, $10, $11, $12)
       RETURNING *`,
      [
        docenteId,
        data.destinatariosTipo === 'AULA' ? data.aulaId : null,
        data.tipo,
        data.titulo.trim(),
        data.descripcion.trim(),
        data.fecha,
        data.horaInicio || null,
        data.horaFin || null,
        data.ubicacion?.trim() || null,
        data.modalidad || 'PRESENCIAL',
        data.destinatariosTipo,
        data.estado || 'PROGRAMADO',
      ]
    );
    const evento = res.rows[0];

    for (const estId of studentIds) {
      await client.query(
        `INSERT INTO agenda_evento_estudiantes (evento_id, estudiante_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [evento.id, estId]
      );
    }

    return evento;
  });
}

export async function updateAgendaEvento(docenteId: number, eventoId: number, data: AgendaEventoInput) {
  return withTransaction(async (client) => {
    const existing = await client.query(
      'SELECT id FROM agenda_eventos WHERE id = $1 AND docente_id = $2',
      [eventoId, docenteId]
    );
    if (existing.rows.length === 0) {
      return null;
    }

    if (data.destinatariosTipo === 'AULA') {
      if (!data.aulaId) {
        throw new Error('Debe seleccionar un aula para eventos dirigidos a un aula.');
      }
      const aulaCheck = await client.query(
        'SELECT id FROM aulas WHERE id = $1 AND docente_id = $2',
        [data.aulaId, docenteId]
      );
      if (aulaCheck.rows.length === 0) {
        throw new Error('El aula seleccionada no pertenece al docente.');
      }
    }

    const studentIds = data.destinatariosTipo === 'ESTUDIANTES' ? Array.from(new Set(data.estudianteIds || [])) : [];
    if (data.destinatariosTipo === 'ESTUDIANTES') {
      if (studentIds.length === 0) {
        throw new Error('Debe seleccionar al menos un estudiante destinatario.');
      }
      const stCheck = await client.query(
        'SELECT id FROM estudiantes WHERE docente_id = $1 AND id = ANY($2::int[])',
        [docenteId, studentIds]
      );
      if (stCheck.rows.length !== studentIds.length) {
        throw new Error('Uno o más estudiantes seleccionados no pertenecen al docente.');
      }
    }

    const res = await client.query(
      `UPDATE agenda_eventos
       SET aula_id = $1,
           tipo = $2,
           titulo = $3,
           descripcion = $4,
           fecha = $5::date,
           hora_inicio = $6::time,
           hora_fin = $7::time,
           ubicacion = $8,
           modalidad = $9,
           destinatarios_tipo = $10,
           estado = $11,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12 AND docente_id = $13
       RETURNING *`,
      [
        data.destinatariosTipo === 'AULA' ? data.aulaId : null,
        data.tipo,
        data.titulo.trim(),
        data.descripcion.trim(),
        data.fecha,
        data.horaInicio || null,
        data.horaFin || null,
        data.ubicacion?.trim() || null,
        data.modalidad || 'PRESENCIAL',
        data.destinatariosTipo,
        data.estado || 'PROGRAMADO',
        eventoId,
        docenteId,
      ]
    );

    await client.query('DELETE FROM agenda_evento_estudiantes WHERE evento_id = $1', [eventoId]);
    for (const estId of studentIds) {
      await client.query(
        `INSERT INTO agenda_evento_estudiantes (evento_id, estudiante_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [eventoId, estId]
      );
    }

    return res.rows[0];
  });
}

export async function cancelAgendaEvento(docenteId: number, eventoId: number, motivo?: string) {
  const res = await query(
    `UPDATE agenda_eventos
     SET estado = 'CANCELADO',
         motivo_cancelacion = $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND docente_id = $3
     RETURNING *`,
    [motivo?.trim() || null, eventoId, docenteId]
  );
  return res.rows[0] || null;
}

// SOLO LECTURA PARA APODERADO: devuelve eventos únicamente de estudiantes vinculados con estado_vinculacion = 'ACTIVO'
export async function findAgendaEventosByApoderado(apoderadoId: number, estudianteId?: number) {
  const params: any[] = [apoderadoId];
  let filterEstudiante = '';
  if (estudianteId) {
    params.push(estudianteId);
    filterEstudiante = ` AND e.id = $2`;
  }

  const res = await query(
    `SELECT * FROM (
       SELECT DISTINCT ON (ev.id, e.id)
              ev.id, ev.tipo, ev.titulo, ev.descripcion, ev.fecha, ev.hora_inicio, ev.hora_fin,
              ev.ubicacion, ev.modalidad, ev.destinatarios_tipo, ev.estado, ev.motivo_cancelacion,
              ev.created_at,
              e.id as estudiante_id, e.nombres as estudiante_nombres, e.apellidos as estudiante_apellidos,
              a.grado, a.seccion,
              d.nombres as docente_nombres, d.apellidos as docente_apellidos, d.institucion_educativa
       FROM relaciones_apoderado_estudiante r
       JOIN estudiantes e ON e.id = r.estudiante_id
       JOIN docentes d ON d.id = e.docente_id
       LEFT JOIN aulas a ON a.id = e.aula_id
       JOIN agenda_eventos ev ON ev.docente_id = e.docente_id
       LEFT JOIN agenda_evento_estudiantes aee ON aee.evento_id = ev.id AND aee.estudiante_id = e.id
       WHERE r.apoderado_id = $1
         AND r.estado_vinculacion = 'ACTIVO'
         ${filterEstudiante}
         AND (
           ev.destinatarios_tipo = 'TODOS'
           OR (ev.destinatarios_tipo = 'AULA' AND ev.aula_id = e.aula_id)
           OR (ev.destinatarios_tipo = 'ESTUDIANTES' AND aee.estudiante_id IS NOT NULL)
         )
       ORDER BY ev.id, e.id
     ) sub
     ORDER BY sub.fecha ASC, sub.hora_inicio ASC NULLS LAST, sub.created_at DESC`,
    params
  );
  return res.rows;
}
