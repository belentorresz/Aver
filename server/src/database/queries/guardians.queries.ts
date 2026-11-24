import { query, withTransaction } from '../connection.js';

// Módulo de consultas para el apoderado: Permisos estrictamente de lectura y solo de estudiantes vinculados

export async function findLinkedStudentsByApoderado(apoderadoId: number) {
  const res = await query(
    `SELECT e.id, e.nombres, e.apellidos, e.dni, e.codigo, e.color_avatar,
            a.grado, a.seccion,
            d.nombres as docente_nombres, d.apellidos as docente_apellidos, d.institucion_educativa,
            r.parentesco, r.fecha_vinculacion
     FROM relaciones_apoderado_estudiante r
     JOIN estudiantes e ON e.id = r.estudiante_id
     JOIN docentes d ON d.id = e.docente_id
     LEFT JOIN aulas a ON a.id = e.aula_id
     WHERE r.apoderado_id = $1 AND r.estado_vinculacion = 'ACTIVO'
     ORDER BY e.apellidos, e.nombres`,
    [apoderadoId]
  );
  return res.rows;
}

export async function findStudentAcademicDetailsForGuardian(apoderadoId: number, estudianteId: number) {
  // 1. Verificar autorización estricta
  const authCheck = await query(
    `SELECT r.id FROM relaciones_apoderado_estudiante r
     WHERE r.apoderado_id = $1 AND r.estudiante_id = $2 AND r.estado_vinculacion = 'ACTIVO'`,
    [apoderadoId, estudianteId]
  );

  if (authCheck.rows.length === 0) {
    throw new Error('No autorizado: Este estudiante no está vinculado a su cuenta de apoderado.');
  }

  // 2. Información del estudiante y docente
  const studentRes = await query(
    `SELECT e.*, a.grado, a.seccion,
            d.nombres as docente_nombres, d.apellidos as docente_apellidos, d.institucion_educativa
     FROM estudiantes e
     JOIN docentes d ON d.id = e.docente_id
     LEFT JOIN aulas a ON a.id = e.aula_id
     WHERE e.id = $1`,
    [estudianteId]
  );

  // 3. Calificaciones y resultados académicos
  const resultsRes = await query(
    `SELECT r.*, ev.titulo as evaluacion_titulo, ev.fecha as evaluacion_fecha,
            c.descripcion as criterio_descripcion, ar.nombre as area_nombre
     FROM resultados_academicos r
     JOIN evaluaciones ev ON ev.id = r.evaluacion_id
     JOIN criterios_evaluacion c ON c.id = r.criterio_id
     LEFT JOIN areas_academicas ar ON ar.id = ev.area_id
     WHERE r.estudiante_id = $1
     ORDER BY ev.fecha DESC`,
    [estudianteId]
  );

  // 4. Alertas visibles y recomendaciones
  const alertsRes = await query(
    `SELECT a.titulo, a.detalle, a.nivel, a.created_at
     FROM alertas a
     WHERE a.estudiante_id = $1 AND a.estado = 'ACTIVA'
     ORDER BY a.created_at DESC`,
    [estudianteId]
  );

  const recommendationsRes = await query(
    `SELECT rec.titulo, rec.descripcion, rec.fecha_aplicacion, rec.estado
     FROM recomendaciones rec
     WHERE rec.estudiante_id = $1 AND rec.estado IN ('ACEPTADA', 'APLICADA')
     ORDER BY rec.created_at DESC`,
    [estudianteId]
  );

  return {
    estudiante: studentRes.rows[0],
    evaluaciones: resultsRes.rows,
    alertas: alertsRes.rows,
    recomendaciones: recommendationsRes.rows,
  };
}

export async function linkStudentWithCode(apoderadoId: number, codigo: string) {
  return withTransaction(async (client) => {
    const invRes = await client.query(
      `SELECT * FROM invitaciones_vinculacion 
       WHERE codigo_invitacion = $1 AND usado = FALSE AND expira_en > NOW()
       LIMIT 1`,
      [codigo.trim().toUpperCase()]
    );

    if (invRes.rows.length === 0) {
      throw new Error('Código de vinculación inválido o expirado');
    }

    const inv = invRes.rows[0];

    // Vincular al apoderado con el estudiante
    await client.query(
      `INSERT INTO relaciones_apoderado_estudiante (apoderado_id, estudiante_id, estado_vinculacion)
       VALUES ($1, $2, 'ACTIVO')
       ON CONFLICT (apoderado_id, estudiante_id) DO UPDATE SET estado_vinculacion = 'ACTIVO'`,
      [apoderadoId, inv.estudiante_id]
    );

    // Marcar código como usado
    await client.query(
      `UPDATE invitaciones_vinculacion 
       SET usado = TRUE, apoderado_id = $1 
       WHERE id = $2`,
      [apoderadoId, inv.id]
    );

    const stRes = await client.query(
      'SELECT id, nombres, apellidos, codigo FROM estudiantes WHERE id = $1',
      [inv.estudiante_id]
    );

    return stRes.rows[0];
  });
}
