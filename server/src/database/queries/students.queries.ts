import crypto from 'node:crypto';
import { query, withTransaction } from '../connection.js';

// AISLAMIENTO FUNDAMENTAL: Todas las operaciones reciben `docenteId` y filtran estrictamente por él

// Generador de códigos de vinculación seguros, aleatorios y no predecibles
export function generateSecureLinkCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // 32 caracteres legibles sin confusión (sin 0, O, 1, I)
  const bytes = crypto.randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `VINC-${code}`;
}

async function insertUniqueInvitation(client: any, docenteId: number, estudianteId: number): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const invCode = generateSecureLinkCode();
    try {
      await client.query(
        `INSERT INTO invitaciones_vinculacion (docente_id, estudiante_id, codigo_invitacion, expira_en)
         VALUES ($1, $2, $3, NOW() + INTERVAL '90 days')`,
        [docenteId, estudianteId, invCode]
      );
      return invCode;
    } catch (err: any) {
      if (err.code === '23505') continue; // Conflicto único, reintentar con otro código
      throw err;
    }
  }
  throw new Error('No se pudo generar un código de vinculación único. Inténtelo de nuevo.');
}

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
  aulaId?: number | null;
  nombres: string;
  apellidos: string;
  dni?: string;
  codigo?: string;
  colorAvatar?: string;
}) {
  return withTransaction(async (client) => {
    if (data.aulaId) {
      const aulaCheck = await client.query(
        'SELECT id FROM aulas WHERE id = $1 AND docente_id = $2',
        [data.aulaId, docenteId]
      );
      if (aulaCheck.rows.length === 0) {
        throw new Error('El aula seleccionada no existe o no pertenece a sus aulas autorizadas.');
      }
    }

    // Generar código de estudiante si no viene provisto
    let codigoFinal = data.codigo?.trim().toUpperCase();
    if (!codigoFinal) {
      const countRes = await client.query(
        'SELECT COUNT(*)::int as count FROM estudiantes WHERE docente_id = $1',
        [docenteId]
      );
      const nextNum = (countRes.rows[0].count || 0) + 1;
      codigoFinal = `EST-${String(nextNum).padStart(3, '0')}`;
    }

    // Validar DNI si está presente
    const cleanDni = data.dni?.trim() || null;
    if (cleanDni && !/^\d{8}$/.test(cleanDni)) {
      throw new Error('El DNI debe tener exactamente 8 dígitos numéricos.');
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
        cleanDni,
        codigoFinal,
        data.colorAvatar || '#D9C8EF',
      ]
    );
    const estudiante = res.rows[0];

    // Generar código de vinculación seguro e impredecible (ej. VINC-7K9M2P)
    const invCode = await insertUniqueInvitation(client, docenteId, estudiante.id);
    estudiante.codigo_vinculacion_apoderado = invCode;

    return estudiante;
  });
}

export async function createEstudiantesBatch(docenteId: number, aulaId: number, estudiantesList: Array<{
  nombres: string;
  apellidos: string;
  dni?: string;
  codigo?: string;
}>) {
  return withTransaction(async (client) => {
    // 1. Verificar aula del docente
    const aulaCheck = await client.query(
      'SELECT id, grado, seccion FROM aulas WHERE id = $1 AND docente_id = $2',
      [aulaId, docenteId]
    );
    if (aulaCheck.rows.length === 0) {
      throw new Error('El aula seleccionada no existe o no pertenece a su cuenta de docente.');
    }
    const aula = aulaCheck.rows[0];

    // 2. Obtener DNI y códigos existentes del docente para prevención de duplicados
    const existingRes = await client.query(
      'SELECT id, dni, codigo, nombres, apellidos FROM estudiantes WHERE docente_id = $1',
      [docenteId]
    );
    const existingDnis = new Set(existingRes.rows.filter(r => r.dni).map(r => r.dni));
    const existingCodes = new Set(existingRes.rows.map(r => r.codigo.toUpperCase()));

    const colors = ['#D9C8EF', '#BEE3D0', '#C8D9F5', '#F4C6A6', '#F3D6B8', '#D5CEF2', '#C8E3E2', '#F0CFCF'];
    const insertedStudents: any[] = [];
    const rejectedStudents: Array<{ item: any; motivo: string }> = [];
    const seenBatchDnis = new Set<string>();
    const seenBatchCodes = new Set<string>();

    let autoCodeCounter = existingRes.rows.length + 1;

    for (let i = 0; i < estudiantesList.length; i++) {
      const item = estudiantesList[i];
      const nombres = item.nombres?.trim();
      const apellidos = item.apellidos?.trim();
      const rawDni = item.dni ? String(item.dni).trim() : '';
      let codigo = item.codigo ? String(item.codigo).trim().toUpperCase() : '';

      // Validación de nombres y apellidos
      if (!nombres || !apellidos) {
        rejectedStudents.push({
          item,
          motivo: 'Faltan nombres o apellidos obligatorios.',
        });
        continue;
      }

      // Validación de DNI
      if (rawDni) {
        if (!/^\d{8}$/.test(rawDni)) {
          rejectedStudents.push({
            item,
            motivo: `El DNI "${rawDni}" no tiene el formato válido de 8 dígitos numéricos.`,
          });
          continue;
        }

        if (seenBatchDnis.has(rawDni)) {
          rejectedStudents.push({
            item,
            motivo: `El DNI "${rawDni}" está duplicado en el mismo archivo cargado.`,
          });
          continue;
        }

        if (existingDnis.has(rawDni)) {
          rejectedStudents.push({
            item,
            motivo: `Ya existe un estudiante registrado con el DNI "${rawDni}".`,
          });
          continue;
        }
      }

      // Generar o validar código
      if (!codigo) {
        while (existingCodes.has(`EST-${String(autoCodeCounter).padStart(3, '0')}`) || seenBatchCodes.has(`EST-${String(autoCodeCounter).padStart(3, '0')}`)) {
          autoCodeCounter++;
        }
        codigo = `EST-${String(autoCodeCounter).padStart(3, '0')}`;
        autoCodeCounter++;
      } else {
        if (seenBatchCodes.has(codigo)) {
          rejectedStudents.push({
            item,
            motivo: `El código "${codigo}" está repetido en la lista de importación.`,
          });
          continue;
        }
        if (existingCodes.has(codigo)) {
          rejectedStudents.push({
            item,
            motivo: `El código "${codigo}" ya está asignado a otro estudiante de sus aulas.`,
          });
          continue;
        }
      }

      if (rawDni) seenBatchDnis.add(rawDni);
      seenBatchCodes.add(codigo);

      const colorAvatar = colors[(insertedStudents.length + i) % colors.length];

      // Inserción en PostgreSQL
      const insertRes = await client.query(
        `INSERT INTO estudiantes (docente_id, aula_id, nombres, apellidos, dni, codigo, color_avatar)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [docenteId, aulaId, nombres, apellidos, rawDni || null, codigo, colorAvatar]
      );
      const student = insertRes.rows[0];

      // Generación de código de vinculación seguro
      const invCode = await insertUniqueInvitation(client, docenteId, student.id);
      student.codigo_vinculacion_apoderado = invCode;
      student.grado = aula.grado;
      student.seccion = aula.seccion;

      insertedStudents.push(student);
    }

    return {
      success: true,
      aula: `${aula.grado} ${aula.seccion}`,
      totalProcesados: estudiantesList.length,
      registradosCount: insertedStudents.length,
      rechazadosCount: rejectedStudents.length,
      registrados: insertedStudents,
      rechazados: rejectedStudents,
    };
  });
}

export async function regenerateStudentLinkCode(docenteId: number, estudianteId: number) {
  return withTransaction(async (client) => {
    const stCheck = await client.query(
      'SELECT id, nombres, apellidos, codigo FROM estudiantes WHERE id = $1 AND docente_id = $2',
      [estudianteId, docenteId]
    );
    if (stCheck.rows.length === 0) {
      throw new Error('Estudiante no encontrado o no pertenece a sus aulas.');
    }

    // Invalidar invitaciones anteriores no usadas
    await client.query(
      `UPDATE invitaciones_vinculacion 
       SET expira_en = NOW() - INTERVAL '1 second'
       WHERE estudiante_id = $1 AND usado = FALSE`,
      [estudianteId]
    );

    // Generar nuevo código de vinculación único
    const newCode = await insertUniqueInvitation(client, docenteId, estudianteId);
    return {
      estudianteId,
      codigo: newCode,
      estudianteNombre: `${stCheck.rows[0].nombres} ${stCheck.rows[0].apellidos}`,
    };
  });
}

export async function updateEstudiante(docenteId: number, estudianteId: number, data: {
  nombres: string;
  apellidos: string;
  dni?: string;
  codigo?: string;
  aulaId?: number | null;
  colorAvatar?: string;
}) {
  return withTransaction(async (client) => {
    const check = await client.query(
      'SELECT id FROM estudiantes WHERE id = $1 AND docente_id = $2',
      [estudianteId, docenteId]
    );
    if (check.rows.length === 0) {
      throw new Error('Estudiante no encontrado o no pertenece a sus aulas autorizadas.');
    }

    if (data.aulaId) {
      const aulaCheck = await client.query(
        'SELECT id FROM aulas WHERE id = $1 AND docente_id = $2',
        [data.aulaId, docenteId]
      );
      if (aulaCheck.rows.length === 0) {
        throw new Error('El aula seleccionada no pertenece a sus aulas autorizadas.');
      }
    }

    const cleanDni = data.dni?.trim() || null;
    if (cleanDni && !/^\d{8}$/.test(cleanDni)) {
      throw new Error('El DNI debe tener exactamente 8 dígitos.');
    }

    const res = await client.query(
      `UPDATE estudiantes
       SET nombres = $1,
           apellidos = $2,
           dni = $3,
           codigo = COALESCE($4, codigo),
           aula_id = $5,
           color_avatar = COALESCE($6, color_avatar),
           updated_at = NOW()
       WHERE id = $7 AND docente_id = $8
       RETURNING *`,
      [
        data.nombres.trim(),
        data.apellidos.trim(),
        cleanDni,
        data.codigo ? data.codigo.trim().toUpperCase() : null,
        data.aulaId ?? null,
        data.colorAvatar || null,
        estudianteId,
        docenteId,
      ]
    );
    return res.rows[0];
  });
}

export async function deleteEstudiante(docenteId: number, estudianteId: number) {
  return withTransaction(async (client) => {
    const check = await client.query(
      'SELECT id, nombres, apellidos FROM estudiantes WHERE id = $1 AND docente_id = $2',
      [estudianteId, docenteId]
    );
    if (check.rows.length === 0) {
      throw new Error('Estudiante no encontrado o no pertenece a sus aulas autorizadas.');
    }

    await client.query('DELETE FROM estudiantes WHERE id = $1 AND docente_id = $2', [estudianteId, docenteId]);
    return true;
  });
}

export async function deleteAula(docenteId: number, aulaId: number) {
  return withTransaction(async (client) => {
    const check = await client.query(
      'SELECT id, grado, seccion FROM aulas WHERE id = $1 AND docente_id = $2',
      [aulaId, docenteId]
    );
    if (check.rows.length === 0) {
      throw new Error('Aula no encontrada o no pertenece a su cuenta.');
    }

    await client.query('DELETE FROM aulas WHERE id = $1 AND docente_id = $2', [aulaId, docenteId]);
    return true;
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
