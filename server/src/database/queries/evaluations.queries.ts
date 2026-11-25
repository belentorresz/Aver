import { query, withTransaction } from '../connection.js';

// AISLAMIENTO DOCENTE: Evaluaciones, resultados, análisis, refuerzos e historial

export async function findAreasAcademicas() {
  const res = await query('SELECT id, nombre, descripcion, color FROM areas_academicas ORDER BY id');
  return res.rows;
}

export async function findCriteriosByDocente(docenteId: number, areaId?: number) {
  const params: any[] = [docenteId];
  let sql = `
    SELECT c.*, a.nombre as area_nombre, a.color as area_color
    FROM criterios_evaluacion c
    JOIN areas_academicas a ON a.id = c.area_id
    WHERE (c.docente_id IS NULL OR c.docente_id = $1)
  `;
  if (areaId) {
    params.push(areaId);
    sql += ` AND c.area_id = $2`;
  }
  sql += ` ORDER BY a.id, c.orden, c.id`;
  const res = await query(sql, params);
  return res.rows;
}

export async function findEvaluacionesByDocente(docenteId: number, aulaId?: number) {
  const params: any[] = [docenteId];
  let sql = `
    SELECT ev.*, a.grado, a.seccion, ar.nombre as area_nombre, ar.color as area_color,
           COUNT(DISTINCT r.estudiante_id)::int as total_evaluados,
           COUNT(DISTINCT r.criterio_id)::int as total_criterios,
           (SELECT COUNT(*)::int FROM estudiantes e WHERE e.aula_id = ev.aula_id AND e.docente_id = $1) as total_estudiantes_aula
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

  sql += ` GROUP BY ev.id, a.grado, a.seccion, ar.nombre, ar.color ORDER BY ev.fecha DESC, ev.created_at DESC`;
  const res = await query(sql, params);
  return res.rows;
}

export async function findAlertasByDocente(docenteId: number) {
  const res = await query(
    `SELECT al.*, e.nombres as estudiante_nombres, e.apellidos as estudiante_apellidos,
            e.codigo as estudiante_codigo, e.color_avatar as estudiante_color,
            a.grado, a.seccion,
            c.descripcion as criterio_descripcion, ar.nombre as area_nombre
     FROM alertas al
     JOIN estudiantes e ON e.id = al.estudiante_id
     LEFT JOIN aulas a ON a.id = e.aula_id
     LEFT JOIN criterios_evaluacion c ON c.id = al.criterio_id
     LEFT JOIN areas_academicas ar ON ar.id = c.area_id
     WHERE al.docente_id = $1 AND al.estado = 'ACTIVA'
     ORDER BY al.created_at DESC`,
    [docenteId]
  );
  return res.rows;
}

export async function updateAlertaEstado(docenteId: number, alertaId: number, estado: 'ACTIVA' | 'REVISADA' | 'DESCARTADA') {
  const res = await query(
    `UPDATE alertas
     SET estado = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND docente_id = $3
     RETURNING *`,
    [estado, alertaId, docenteId]
  );
  return res.rows[0] || null;
}

export interface SaveEvaluacionInput {
  aulaId?: number | null;
  areaId: number;
  titulo: string;
  fecha: string;
  sesion?: string;
  estado?: 'BORRADOR' | 'POR_REVISAR' | 'COMPLETADA';
  fuenteOrigen: 'DIRECTO' | 'OCR' | 'EXCEL';
  preventDuplicate?: boolean;
  archivo?: {
    nombreArchivo: string;
    tipo: 'EXCEL' | 'IMAGEN_OCR';
    datosReconocidos?: any;
    datosCorregidos?: any;
  };
  criterios: {
    id?: number;
    descripcion: string;
  }[];
  resultados: {
    estudianteId: number;
    criterioIndex: number;
    marca: 'LOGRADO' | 'NO_LOGRADO' | 'NO_OBSERVADO';
    nivelLogro?: 'AD' | 'A' | 'B' | 'C' | null;
    observaciones?: string;
  }[];
}

export async function saveEvaluacionCompletaTransaction(docenteId: number, input: SaveEvaluacionInput) {
  return withTransaction(async (client) => {
    // 1. Verificar propiedad de aula
    if (input.aulaId) {
      const aulaCheck = await client.query(
        'SELECT id FROM aulas WHERE id = $1 AND docente_id = $2',
        [input.aulaId, docenteId]
      );
      if (aulaCheck.rows.length === 0) {
        throw new Error('El aula seleccionada no pertenece al docente.');
      }
    }

    // 2. Verificar que todos los estudiantes pertenezcan al docente
    const uniqueStudentIds = Array.from(new Set(input.resultados.map((r) => r.estudianteId)));
    if (uniqueStudentIds.length > 0) {
      const stCheck = await client.query(
        'SELECT id FROM estudiantes WHERE docente_id = $1 AND id = ANY($2::int[])',
        [docenteId, uniqueStudentIds]
      );
      if (stCheck.rows.length !== uniqueStudentIds.length) {
        throw new Error('Uno o más estudiantes no existen o no pertenecen al docente.');
      }
    }

    // 3. Evitar duplicados si se solicita (especialmente en importación Excel/OCR)
    if (input.preventDuplicate !== false) {
      const dupCheck = await client.query(
        `SELECT id FROM evaluaciones
         WHERE docente_id = $1
           AND aula_id IS NOT DISTINCT FROM $2
           AND area_id = $3
           AND LOWER(TRIM(titulo)) = LOWER(TRIM($4))
           AND fecha = $5::date
         LIMIT 1`,
        [docenteId, input.aulaId ?? null, input.areaId, input.titulo, input.fecha]
      );
      if (dupCheck.rows.length > 0) {
        const err: any = new Error(
          `Ya existe una evaluación registrada con el título "${input.titulo}" en esa aula y fecha (${input.fecha}). Modifica el título o la fecha para evitar duplicados.`
        );
        err.status = 409;
        throw err;
      }
    }

    // 4. Registrar archivo importado y revisión OCR si aplica
    let archivoId: number | null = null;
    if (input.archivo) {
      const fileRes = await client.query(
        `INSERT INTO archivos_importados (docente_id, nombre_archivo, tipo, estado)
         VALUES ($1, $2, $3, 'PROCESADO')
         RETURNING id`,
        [docenteId, input.archivo.nombreArchivo, input.archivo.tipo]
      );
      archivoId = fileRes.rows[0].id;

      if (input.archivo.tipo === 'IMAGEN_OCR') {
        await client.query(
          `INSERT INTO revisiones_ocr (archivo_id, docente_id, datos_reconocidos, datos_corregidos, confirmado)
           VALUES ($1, $2, $3::jsonb, $4::jsonb, TRUE)`,
          [
            archivoId,
            docenteId,
            JSON.stringify(input.archivo.datosReconocidos || {}),
            JSON.stringify(input.archivo.datosCorregidos || {}),
          ]
        );
      }
    }

    // 5. Resolver o crear criterios en criterios_evaluacion
    const criterioIds: number[] = [];
    for (let idx = 0; idx < input.criterios.length; idx++) {
      const crit = input.criterios[idx];
      if (crit.id) {
        const cCheck = await client.query(
          'SELECT id FROM criterios_evaluacion WHERE id = $1 AND (docente_id IS NULL OR docente_id = $2)',
          [crit.id, docenteId]
        );
        if (cCheck.rows.length > 0) {
          criterioIds.push(cCheck.rows[0].id);
          continue;
        }
      }

      const desc = crit.descripcion.trim();
      const existingCrit = await client.query(
        `SELECT id FROM criterios_evaluacion
         WHERE area_id = $1 AND LOWER(TRIM(descripcion)) = LOWER($2)
           AND (docente_id IS NULL OR docente_id = $3)
         LIMIT 1`,
        [input.areaId, desc, docenteId]
      );
      if (existingCrit.rows.length > 0) {
        criterioIds.push(existingCrit.rows[0].id);
      } else {
        const insCrit = await client.query(
          `INSERT INTO criterios_evaluacion (area_id, docente_id, descripcion, orden)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [input.areaId, docenteId, desc, idx + 1]
        );
        criterioIds.push(insCrit.rows[0].id);
      }
    }

    // 6. Insertar evaluación
    const evalRes = await client.query(
      `INSERT INTO evaluaciones (docente_id, aula_id, area_id, titulo, fecha, sesion, estado, fuente_origen, archivo_id)
       VALUES ($1, $2, $3, $4, $5::date, $6, $7, $8, $9)
       RETURNING *`,
      [
        docenteId,
        input.aulaId ?? null,
        input.areaId,
        input.titulo.trim(),
        input.fecha,
        input.sesion?.trim() || null,
        input.estado || 'COMPLETADA',
        input.fuenteOrigen,
        archivoId,
      ]
    );
    const evaluacion = evalRes.rows[0];

    // 7. Insertar resultados académicos y detectar alertas por 2+ NO_LOGRADO consecutivos
    let resultadosGuardados = 0;
    let alertasGeneradas = 0;

    for (const r of input.resultados) {
      const criterioId = criterioIds[r.criterioIndex];
      if (!criterioId) continue;

      await client.query(
        `INSERT INTO resultados_academicos (evaluacion_id, estudiante_id, criterio_id, marca, nivel_logro, observaciones)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (evaluacion_id, estudiante_id, criterio_id)
         DO UPDATE SET marca = EXCLUDED.marca, nivel_logro = EXCLUDED.nivel_logro, observaciones = EXCLUDED.observaciones, updated_at = CURRENT_TIMESTAMP`,
        [
          evaluacion.id,
          r.estudianteId,
          criterioId,
          r.marca,
          r.nivelLogro || null,
          r.observaciones?.trim() || null,
        ]
      );
      resultadosGuardados++;

      if (r.marca === 'NO_LOGRADO' && (input.estado || 'COMPLETADA') === 'COMPLETADA') {
        const prevRes = await client.query(
          `SELECT r.marca
           FROM resultados_academicos r
           JOIN evaluaciones ev ON ev.id = r.evaluacion_id
           WHERE r.estudiante_id = $1 AND r.criterio_id = $2 AND ev.docente_id = $3 AND ev.estado = 'COMPLETADA'
           ORDER BY ev.fecha DESC, ev.created_at DESC
           LIMIT 2`,
          [r.estudianteId, criterioId, docenteId]
        );

        if (prevRes.rows.length >= 2 && prevRes.rows[0].marca === 'NO_LOGRADO' && prevRes.rows[1].marca === 'NO_LOGRADO') {
          const activeAlertCheck = await client.query(
            `SELECT id FROM alertas
             WHERE docente_id = $1 AND estudiante_id = $2 AND criterio_id = $3 AND estado = 'ACTIVA'
             LIMIT 1`,
            [docenteId, r.estudianteId, criterioId]
          );

          if (activeAlertCheck.rows.length === 0) {
            const critDesc = input.criterios[r.criterioIndex]?.descripcion || 'Criterio evaluado';
            await client.query(
              `INSERT INTO alertas (docente_id, estudiante_id, criterio_id, evaluacion_id, nivel, titulo, detalle, estado)
               VALUES ($1, $2, $3, $4, 'ALTA', $5, $6, 'ACTIVA')`,
              [
                docenteId,
                r.estudianteId,
                criterioId,
                evaluacion.id,
                critDesc,
                'Resultado desfavorable (No logrado) en dos evaluaciones consecutivas en este criterio.',
              ]
            );
            alertasGeneradas++;
          }
        }
      }
    }

    // 8. Auditoría
    await client.query(
      `INSERT INTO registros_auditoria (accion, entidad, entidad_id, detalles)
       VALUES ('CREAR_EVALUACION', 'evaluaciones', $1, $2::jsonb)`,
      [
        evaluacion.id,
        JSON.stringify({
          docenteId,
          fuenteOrigen: input.fuenteOrigen,
          resultadosGuardados,
          alertasGeneradas,
        }),
      ]
    );

    return {
      evaluacion,
      resultadosGuardados,
      alertasGeneradas,
      criterioIds,
    };
  });
}

export async function findDashboardResumen(docenteId: number) {
  const countsRes = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM aulas WHERE docente_id = $1) as total_aulas,
       (SELECT COUNT(*)::int FROM estudiantes WHERE docente_id = $1) as total_estudiantes,
       (SELECT COUNT(*)::int FROM evaluaciones WHERE docente_id = $1) as total_evaluaciones,
       (SELECT COUNT(*)::int FROM evaluaciones WHERE docente_id = $1 AND estado = 'POR_REVISAR') as evaluaciones_por_revisar,
       (SELECT COUNT(*)::int FROM alertas WHERE docente_id = $1 AND estado = 'ACTIVA') as alertas_activas,
       (SELECT COUNT(DISTINCT estudiante_id)::int FROM alertas WHERE docente_id = $1 AND estado = 'ACTIVA') as estudiantes_con_alerta`,
    [docenteId]
  );

  const nivelesRes = await query(
    `SELECT COALESCE(r.nivel_logro,
              CASE WHEN r.marca = 'LOGRADO' THEN 'A'
                   WHEN r.marca = 'NO_OBSERVADO' THEN 'B'
                   ELSE 'C' END) as nivel,
            COUNT(*)::int as total
     FROM resultados_academicos r
     JOIN evaluaciones ev ON ev.id = r.evaluacion_id
     WHERE ev.docente_id = $1
     GROUP BY 1`,
    [docenteId]
  );

  const criteriosRes = await query(
    `SELECT c.id, c.descripcion,
            COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE r.marca = 'LOGRADO')::int as logrados
     FROM resultados_academicos r
     JOIN evaluaciones ev ON ev.id = r.evaluacion_id
     JOIN criterios_evaluacion c ON c.id = r.criterio_id
     WHERE ev.docente_id = $1
     GROUP BY c.id, c.descripcion
     ORDER BY total DESC
     LIMIT 4`,
    [docenteId]
  );

  return {
    resumen: countsRes.rows[0],
    niveles: nivelesRes.rows,
    criteriosDesempeno: criteriosRes.rows,
  };
}

export async function findHistorialByDocente(docenteId: number, aulaId?: number) {
  const params: any[] = [docenteId];
  let evalSql = `
    SELECT ev.id, ev.titulo, ev.fecha, ev.estado, ev.fuente_origen,
           a.grado, a.seccion, ar.nombre as area_nombre, ar.color as area_color,
           COUNT(DISTINCT r.estudiante_id)::int as total_evaluados,
           COUNT(DISTINCT r.criterio_id)::int as total_criterios
    FROM evaluaciones ev
    LEFT JOIN aulas a ON a.id = ev.aula_id
    LEFT JOIN areas_academicas ar ON ar.id = ev.area_id
    LEFT JOIN resultados_academicos r ON r.evaluacion_id = ev.id
    WHERE ev.docente_id = $1
  `;
  if (aulaId) {
    params.push(aulaId);
    evalSql += ` AND ev.aula_id = $2`;
  }
  evalSql += ` GROUP BY ev.id, a.grado, a.seccion, ar.nombre, ar.color ORDER BY ev.fecha DESC, ev.created_at DESC`;

  const evalsRes = await query(evalSql, params);

  const recRes = await query(
    `SELECT rec.*, e.nombres as estudiante_nombres, e.apellidos as estudiante_apellidos,
            c.descripcion as criterio_descripcion
     FROM recomendaciones rec
     JOIN estudiantes e ON e.id = rec.estudiante_id
     LEFT JOIN criterios_evaluacion c ON c.id = rec.criterio_id
     WHERE rec.docente_id = $1
     ORDER BY COALESCE(rec.fecha_aplicacion, rec.created_at::date) DESC`,
    [docenteId]
  );

  return {
    evaluaciones: evalsRes.rows,
    recomendaciones: recRes.rows,
  };
}

export async function findRecomendacionesByDocente(docenteId: number) {
  const res = await query(
    `SELECT rec.*, e.nombres as estudiante_nombres, e.apellidos as estudiante_apellidos,
            e.color_avatar as estudiante_color, a.grado, a.seccion,
            c.descripcion as criterio_descripcion, ar.nombre as area_nombre
     FROM recomendaciones rec
     JOIN estudiantes e ON e.id = rec.estudiante_id
     LEFT JOIN aulas a ON a.id = e.aula_id
     LEFT JOIN criterios_evaluacion c ON c.id = rec.criterio_id
     LEFT JOIN areas_academicas ar ON ar.id = c.area_id
     WHERE rec.docente_id = $1
     ORDER BY rec.created_at DESC`,
    [docenteId]
  );
  return res.rows;
}

export async function createRecomendacion(docenteId: number, data: {
  estudianteId: number;
  criterioId?: number | null;
  titulo: string;
  descripcion: string;
  estado?: 'PROPUESTA' | 'ACEPTADA' | 'APLICADA' | 'DESCARTADA';
  fechaAplicacion?: string | null;
  observaciones?: string | null;
}) {
  const stCheck = await query('SELECT id FROM estudiantes WHERE id = $1 AND docente_id = $2', [data.estudianteId, docenteId]);
  if (stCheck.rows.length === 0) {
    throw new Error('Estudiante no encontrado o no pertenece al docente.');
  }

  const res = await query(
    `INSERT INTO recomendaciones (docente_id, estudiante_id, criterio_id, titulo, descripcion, estado, fecha_aplicacion, observaciones)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      docenteId,
      data.estudianteId,
      data.criterioId || null,
      data.titulo.trim(),
      data.descripcion.trim(),
      data.estado || 'ACEPTADA',
      data.fechaAplicacion || null,
      data.observaciones?.trim() || null,
    ]
  );
  return res.rows[0];
}
