import { query } from '../connection.js';

// AISLAMIENTO FUNDAMENTAL: Todas las operaciones reciben `docenteId` y filtran estrictamente por él

export async function findAulasByDocente(docenteId: number) {
  const res = await query(
    `SELECT a.*, 
            COUNT(e.id) as total_estudiantes
     FROM aulas a
     LEFT JOIN estudiantes e ON e.aula_id = a.id AND e.docente_id = $1
     WHERE a.docente_id = $1
     GROUP BY a.id
     ORDER BY a.grado, a.seccion`,
    [docenteId]
  );
  return res.rows;
}

export async function findEstudiantesByDocente(docenteId: number, aulaId?: number) {
  const params: any[] = [docenteId];
  let sql = `
    SELECT e.*, a.grado, a.seccion,
           iv.codigo_invitacion as codigo_vinculacion_apoderado
    FROM estudiantes e
    LEFT JOIN aulas a ON e.aula_id = a.id
    LEFT JOIN invitaciones_vinculacion iv ON iv.estudiante_id = e.id AND iv.usado = FALSE
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
            iv.codigo_invitacion as codigo_vinculacion_apoderado
     FROM estudiantes e
     LEFT JOIN aulas a ON e.aula_id = a.id
     LEFT JOIN invitaciones_vinculacion iv ON iv.estudiante_id = e.id AND iv.usado = FALSE
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
  const res = await query(
    `INSERT INTO estudiantes (docente_id, aula_id, nombres, apellidos, dni, codigo, color_avatar)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      docenteId,
      data.aulaId || null,
      data.nombres,
      data.apellidos,
      data.dni || null,
      data.codigo,
      data.colorAvatar || '#D9C8EF',
    ]
  );
  const estudiante = res.rows[0];

  // Crear código de vinculación para apoderado
  const invCode = `VINC-${data.codigo.replace(/[^A-Z0-9]/g, '')}`;
  await query(
    `INSERT INTO invitaciones_vinculacion (docente_id, estudiante_id, codigo_invitacion, expira_en)
     VALUES ($1, $2, $3, NOW() + INTERVAL '30 days')
     ON CONFLICT (codigo_invitacion) DO NOTHING`,
    [docenteId, estudiante.id, invCode]
  );

  return estudiante;
}
