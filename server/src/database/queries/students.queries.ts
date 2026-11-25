import { query, withTransaction } from '../connection.js';

// AISLAMIENTO FUNDAMENTAL: Todas las operaciones reciben `docenteId` y filtran estrictamente por él

export async function findAulasByDocente(docenteId: number) {
  const res = await query(
    `SELECT a.*,
            (SELECT COUNT(*)::int FROM estudiantes e WHERE e.aula_id = a.id AND e.docente_id = $1) as total_estudiantes,
            (SELECT COUNT(*)::int FROM evaluaciones ev WHERE ev.aula_id = a.id AND ev.docente_id = $1) as total_evaluaciones
     FROM aulas a
     WHERE a.docente_id = $1
     ORDER BY a.grado, a.seccion`,
    [docenteId]
  );
  return res.rows;
}

export async function createAula(docenteId: number, data: {
  grado: string;
  seccion: string;
  nivel?: string;
  anioEscolar?: string;
}) {
  const res = await query(
    `INSERT INTO aulas (docente_id, grado, seccion, nivel, anio_escolar)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *, 0::int as total_estudiantes, 0::int as total_evaluaciones`,
    [
      docenteId,
      data.grado.trim(),
      data.seccion.trim().toUpperCase(),
      data.nivel?.trim() || 'Primaria',
      data.anioEscolar?.trim() || '2025',
    ]
  );
  return res.rows[0];
}

export async function findEstudiantesByDocente(docenteId: number, aulaId?: number) {
  const params: any[] = [docenteId];
  let sql = `
    SELECT e.*, a.grado, a.seccion,
           iv.codigo_invitacion as codigo_vinculacion_apoderado,
           lr.marca as ultima_marca,
           lr.nivel_logro as ultimo_nivel_logro,
           lr.criterio_descripcion as ultimo_criterio,
           lr.area_nombre as ultimo_area,
           lr.evaluacion_fecha as ultima_fecha,
           COALESCE(st_stats.total_evaluaciones, 0)::int as total_evaluaciones,
           COALESCE(al_stats.alertas_activas, 0)::int as alertas_activas
    FROM estudiantes e
    LEFT JOIN aulas a ON e.aula_id = a.id
    LEFT JOIN LATERAL (
      SELECT codigo_invitacion
      FROM invitaciones_vinculacion
      WHERE estudiante_id = e.id AND usado = FALSE
      ORDER BY created_at DESC
      LIMIT 1
    ) iv ON TRUE
    LEFT JOIN LATERAL (
      SELECT r.marca, r.nivel_logro, c.descripcion as criterio_descripcion,
             ar.nombre as area_nombre, ev.fecha as evaluacion_fecha
      FROM resultados_academicos r
      JOIN evaluaciones ev ON ev.id = r.evaluacion_id
      JOIN criterios_evaluacion c ON c.id = r.criterio_id
      LEFT JOIN areas_academicas ar ON ar.id = ev.area_id
      WHERE r.estudiante_id = e.id AND ev.docente_id = $1
      ORDER BY ev.fecha DESC, r.created_at DESC
      LIMIT 1
    ) lr ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(DISTINCT r.evaluacion_id)::int as total_evaluaciones
      FROM resultados_academicos r
      JOIN evaluaciones ev ON ev.id = r.evaluacion_id
      WHERE r.estudiante_id = e.id AND ev.docente_id = $1
    ) st_stats ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int as alertas_activas
      FROM alertas al
      WHERE al.estudiante_id = e.id AND al.docente_id = $1 AND al.estado = 'ACTIVA'
    ) al_stats ON TRUE
    WHERE e.docente_id = $1
  `;

  if (aulaId) {
    params.push(aulaId);
    sql += ` AND e.aula_id = $2`;
  }

  sql += ` ORDER BY e.apellidos, e.nombres`;
  const res = await query(sql, params);
  return res.rows;
}

export async function findEstudianteByIdAndDocente(estudianteId: number, docenteId: number) {
  const res = await query(
    `SELECT e.*, a.grado, a.seccion,
            (SELECT iv.codigo_invitacion
             FROM invitaciones_vinculacion iv
             WHERE iv.estudiante_id = e.id AND iv.usado = FALSE
             ORDER BY iv.created_at DESC
             LIMIT 1) as codigo_vinculacion_apoderado
     FROM estudiantes e
     LEFT JOIN aulas a ON e.aula_id = a.id
     WHERE e.id = $1 AND e.docente_id = $2`,
    [estudianteId, docenteId]
  );
  return res.rows[0] || null;
}

export async function createEstudiante(docenteId: number, data: {
  aulaId?: number;
  nombres: string;
  apellidos: string;
  dni?: string;
  codigo: string;
  colorAvatar?: string;
}) {
  return withTransaction(async (client) => {
    if (data.aulaId) {
      const aulaCheck = await client.query(
        'SELECT id FROM aulas WHERE id = $1 AND docente_id = $2',
        [data.aulaId, docenteId]
      );
      if (aulaCheck.rows.length === 0) {
        throw new Error('El aula seleccionada no existe o no pertenece al docente.');
      }
    }

    const res = await client.query(
      `INSERT INTO estudiantes (docente_id, aula_id, nombres, apellidos, dni, codigo, color_avatar)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        docenteId,
        data.aulaId || null,
        data.nombres.trim(),
        data.apellidos.trim(),
        data.dni?.trim() || null,
        data.codigo.trim().toUpperCase(),
        data.colorAvatar || '#D9C8EF',
      ]
    );
    const estudiante = res.rows[0];

    // Crear código de vinculación para apoderado
    const invCode = `VINC-${data.codigo.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
    await client.query(
      `INSERT INTO invitaciones_vinculacion (docente_id, estudiante_id, codigo_invitacion, expira_en)
       VALUES ($1, $2, $3, NOW() + INTERVAL '30 days')
       ON CONFLICT (codigo_invitacion) DO NOTHING`,
      [docenteId, estudiante.id, invCode]
    );

    return estudiante;
  });
}

export async function findEstudianteAnalisisCompleto(estudianteId: number, docenteId: number) {
  const student = await findEstudianteByIdAndDocente(estudianteId, docenteId);
  if (!student) return null;

  const resultsRes = await query(`
    SELECT r.id, r.marca, r.nivel_logro, r.observaciones, r.created_at,
           ev.id as evaluacion_id, ev.titulo as evaluacion_titulo, ev.fecha as evaluacion_fecha,
           ev.sesion as evaluacion_sesion, ev.fuente_origen,
           c.id as criterio_id, c.descripcion as criterio_descripcion,
           ar.id as area_id, ar.nombre as area_nombre, ar.color as area_color
    FROM resultados_academicos r
    JOIN evaluaciones ev ON ev.id = r.evaluacion_id
    JOIN criterios_evaluacion c ON c.id = r.criterio_id
    LEFT JOIN areas_academicas ar ON ar.id = ev.area_id
    WHERE r.estudiante_id = $1 AND ev.docente_id = $2
    ORDER BY ev.fecha DESC, r.created_at DESC
  `, [estudianteId, docenteId]);

  const alertsRes = await query(`
    SELECT a.*, c.descripcion as criterio_descripcion, ar.nombre as area_nombre
    FROM alertas a
    LEFT JOIN criterios_evaluacion c ON c.id = a.criterio_id
    LEFT JOIN areas_academicas ar ON ar.id = c.area_id
    WHERE a.estudiante_id = $1 AND a.docente_id = $2
    ORDER BY a.created_at DESC
  `, [estudianteId, docenteId]);

  const followupsRes = await query(`
    SELECT s.*, c.descripcion as criterio_descripcion
    FROM seguimientos s
    LEFT JOIN criterios_evaluacion c ON c.id = s.criterio_id
    WHERE s.estudiante_id = $1 AND s.docente_id = $2
    ORDER BY s.fecha DESC, s.created_at DESC
  `, [estudianteId, docenteId]);

  const recommendationsRes = await query(`
    SELECT rec.*, c.descripcion as criterio_descripcion
    FROM recomendaciones rec
    LEFT JOIN criterios_evaluacion c ON c.id = rec.criterio_id
    WHERE rec.estudiante_id = $1 AND rec.docente_id = $2
    ORDER BY rec.created_at DESC
  `, [estudianteId, docenteId]);

  return {
    estudiante: student,
    resultados: resultsRes.rows,
    alertas: alertsRes.rows,
    seguimientos: followupsRes.rows,
    recomendaciones: recommendationsRes.rows,
  };
}
