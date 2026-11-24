import { query } from '../connection.js';

// AISLAMIENTO DOCENTE: Evaluaciones, resultados y análisis
export async function findEvaluacionesByDocente(docenteId: number, aulaId?: number) {
  const params: any[] = [docenteId];
  let sql = `
    SELECT ev.*, a.grado, a.seccion, ar.nombre as area_nombre, ar.color as area_color,
           COUNT(DISTINCT r.estudiante_id) as total_evaluados,
           COUNT(DISTINCT r.criterio_id) as total_criterios
    FROM evaluaciones ev
    LEFT JOIN aulas a ON a.id = ev.aula_id
    LEFT JOIN areas_academicas ar ON ar.id = ev.area_id
    LEFT JOIN resultados_academicos r ON r.evaluacion_id = ev.id
    WHERE ev.docente_id = $1
  `;

  if (aulaId) {
    params.push(aulaId);
    sql += ` AND ev.aula_id = $2`;
  }

  sql += ` GROUP BY ev.id, a.grado, a.seccion, ar.nombre, ar.color ORDER BY ev.fecha DESC`;
  const res = await query(sql, params);
  return res.rows;
}

export async function findAlertasByDocente(docenteId: number) {
  const res = await query(
    `SELECT al.*, e.nombres as estudiante_nombres, e.apellidos as estudiante_apellidos,
            c.descripcion as criterio_descripcion, ar.nombre as area_nombre
     FROM alertas al
     JOIN estudiantes e ON e.id = al.estudiante_id
     LEFT JOIN criterios_evaluacion c ON c.id = al.criterio_id
     LEFT JOIN areas_academicas ar ON ar.id = c.area_id
     WHERE al.docente_id = $1 AND al.estado = 'ACTIVA'
     ORDER BY al.created_at DESC`,
    [docenteId]
  );
  return res.rows;
}
