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

export async function findEvaluacionByIdAndDocente(docenteId: number, evaluacionId: number) {
  const evalRes = await query(
    `SELECT ev.*, a.grado, a.seccion, ar.nombre as area_nombre, ar.color as area_color
     FROM evaluaciones ev
     LEFT JOIN aulas a ON a.id = ev.aula_id
     LEFT JOIN areas_academicas ar ON ar.id = ev.area_id
     WHERE ev.id = $1 AND ev.docente_id = $2`,
    [evaluacionId, docenteId]
  );

  if (evalRes.rows.length === 0) {
    return null;
  }

  const evaluacion = evalRes.rows[0];

  // Obtener criterios evaluados en esta evaluación
  const criteriosRes = await query(
    `SELECT DISTINCT c.id, c.descripcion, c.orden, c.area_id
     FROM resultados_academicos r
     JOIN criterios_evaluacion c ON c.id = r.criterio_id
     WHERE r.evaluacion_id = $1
     ORDER BY c.orden, c.id`,
    [evaluacionId]
  );

  // Obtener resultados registrados de estudiantes
  const resultadosRes = await query(
    `SELECT r.*, e.nombres as estudiante_nombres, e.apellidos as estudiante_apellidos,
            e.codigo as estudiante_codigo, e.color_avatar as estudiante_color
     FROM resultados_academicos r
     JOIN estudiantes e ON e.id = r.estudiante_id
     WHERE r.evaluacion_id = $1
     ORDER BY e.apellidos, e.nombres`,
    [evaluacionId]
  );

  // Obtener todos los estudiantes del aula para que el docente pueda ver el estado completo
  let estudiantesAula: any[] = [];
  if (evaluacion.aula_id) {
    const stRes = await query(
      `SELECT id, nombres, apellidos, codigo, color_avatar
       FROM estudiantes
       WHERE aula_id = $1 AND docente_id = $2
       ORDER BY apellidos, nombres`,
      [evaluacion.aula_id, docenteId]
    );
    estudiantesAula = stRes.rows;
  }

  return {
    evaluacion,
    criterios: criteriosRes.rows,
    resultados: resultadosRes.rows,
    estudiantesAula,
  };
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

    // 3. Evitar duplicados si se solicita
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

export interface UpdateEvaluacionInput {
  aulaId?: number | null;
  areaId: number;
  titulo: string;
  fecha: string;
  sesion?: string | null;
  estado?: 'BORRADOR' | 'POR_REVISAR' | 'COMPLETADA';
  criterios: {
    id?: number;
    descripcion: string;
  }[];
  resultados?: {
    estudianteId: number;
    criterioId?: number;
    criterioIndex?: number;
    marca: 'LOGRADO' | 'NO_LOGRADO' | 'NO_OBSERVADO';
    nivelLogro?: 'AD' | 'A' | 'B' | 'C' | null;
    observaciones?: string | null;
  }[];
}

export async function updateEvaluacionCompletaTransaction(
  docenteId: number,
  evaluacionId: number,
  input: UpdateEvaluacionInput
) {
  return withTransaction(async (client) => {
    // 1. Verificar que la evaluación exista y pertenezca al docente
    const evalCheck = await client.query(
      'SELECT id, aula_id, area_id, estado FROM evaluaciones WHERE id = $1 AND docente_id = $2',
      [evaluacionId, docenteId]
    );
    if (evalCheck.rows.length === 0) {
      const err: any = new Error('Evaluación no encontrada o no pertenece al docente.');
      err.status = 404;
      throw err;
    }

    // 2. Verificar propiedad de aula si cambia
    if (input.aulaId) {
      const aulaCheck = await client.query(
        'SELECT id FROM aulas WHERE id = $1 AND docente_id = $2',
        [input.aulaId, docenteId]
      );
      if (aulaCheck.rows.length === 0) {
        throw new Error('El aula seleccionada no pertenece al docente.');
      }
    }

    // 3. Evitar duplicados con otra evaluación distinta
    const dupCheck = await client.query(
      `SELECT id FROM evaluaciones
       WHERE docente_id = $1
         AND id <> $2
         AND aula_id IS NOT DISTINCT FROM $3
         AND area_id = $4
         AND LOWER(TRIM(titulo)) = LOWER(TRIM($5))
         AND fecha = $6::date
       LIMIT 1`,
      [docenteId, evaluacionId, input.aulaId ?? null, input.areaId, input.titulo, input.fecha]
    );
    if (dupCheck.rows.length > 0) {
      const err: any = new Error(
        `Ya existe otra evaluación registrada con el título "${input.titulo}" en esa aula y fecha (${input.fecha}).`
      );
      err.status = 409;
      throw err;
    }

    // 4. Actualizar cabecera de la evaluación en PostgreSQL
    const updEvalRes = await client.query(
      `UPDATE evaluaciones
       SET titulo = $1,
           fecha = $2::date,
           sesion = $3,
           aula_id = $4,
           area_id = $5,
           estado = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND docente_id = $8
       RETURNING *`,
      [
        input.titulo.trim(),
        input.fecha,
        input.sesion?.trim() || null,
        input.aulaId ?? null,
        input.areaId,
        input.estado || 'COMPLETADA',
        evaluacionId,
        docenteId,
      ]
    );
    const evaluacionActualizada = updEvalRes.rows[0];

    // 5. Manejar criterios: actualizar descripciones o crear nuevos si es necesario
    const criterioIds: number[] = [];
    for (let idx = 0; idx < input.criterios.length; idx++) {
      const crit = input.criterios[idx];
      const desc = crit.descripcion.trim();

      if (crit.id) {
        // Verificar si pertenece al docente para actualizar descripción
        const critDocente = await client.query(
          'SELECT id, docente_id FROM criterios_evaluacion WHERE id = $1 AND (docente_id IS NULL OR docente_id = $2)',
          [crit.id, docenteId]
        );
        if (critDocente.rows.length > 0) {
          if (critDocente.rows[0].docente_id === docenteId) {
            await client.query(
              'UPDATE criterios_evaluacion SET descripcion = $1 WHERE id = $2',
              [desc, crit.id]
            );
          }
          criterioIds.push(crit.id);
          continue;
        }
      }

      // Buscar o insertar criterio
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

    // 6. Actualizar o insertar calificaciones de estudiantes
    let resultadosModificados = 0;
    let alertasActualizadas = 0;

    if (input.resultados && input.resultados.length > 0) {
      for (const r of input.resultados) {
        let criterioId = r.criterioId;
        if (!criterioId && typeof r.criterioIndex === 'number') {
          criterioId = criterioIds[r.criterioIndex];
        }
        if (!criterioId) continue;

        await client.query(
          `INSERT INTO resultados_academicos (evaluacion_id, estudiante_id, criterio_id, marca, nivel_logro, observaciones)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (evaluacion_id, estudiante_id, criterio_id)
           DO UPDATE SET marca = EXCLUDED.marca,
                         nivel_logro = EXCLUDED.nivel_logro,
                         observaciones = EXCLUDED.observaciones,
                         updated_at = CURRENT_TIMESTAMP`,
          [
            evaluacionId,
            r.estudianteId,
            criterioId,
            r.marca,
            r.nivelLogro || null,
            r.observaciones?.trim() || null,
          ]
        );
        resultadosModificados++;

        // 7. Recálculo dinámico de alertas para este estudiante y criterio
        const ultimosResultados = await client.query(
          `SELECT r.marca, ev.id as eval_id
           FROM resultados_academicos r
           JOIN evaluaciones ev ON ev.id = r.evaluacion_id
           WHERE r.estudiante_id = $1 AND r.criterio_id = $2 AND ev.docente_id = $3 AND ev.estado = 'COMPLETADA'
           ORDER BY ev.fecha DESC, ev.created_at DESC
           LIMIT 2`,
          [r.estudianteId, criterioId, docenteId]
        );

        const tieneDosNoLogrados =
          ultimosResultados.rows.length >= 2 &&
          ultimosResultados.rows[0].marca === 'NO_LOGRADO' &&
          ultimosResultados.rows[1].marca === 'NO_LOGRADO';

        if (tieneDosNoLogrados) {
          // Asegurar que existe una alerta ACTIVA
          const activeAlertCheck = await client.query(
            `SELECT id FROM alertas
             WHERE docente_id = $1 AND estudiante_id = $2 AND criterio_id = $3 AND estado = 'ACTIVA'
             LIMIT 1`,
            [docenteId, r.estudianteId, criterioId]
          );

          if (activeAlertCheck.rows.length === 0) {
            const critInfo = await client.query(
              'SELECT descripcion FROM criterios_evaluacion WHERE id = $1',
              [criterioId]
            );
            const critDesc = critInfo.rows[0]?.descripcion || 'Criterio evaluado';

            await client.query(
              `INSERT INTO alertas (docente_id, estudiante_id, criterio_id, evaluacion_id, nivel, titulo, detalle, estado)
               VALUES ($1, $2, $3, $4, 'ALTA', $5, $6, 'ACTIVA')`,
              [
                docenteId,
                r.estudianteId,
                criterioId,
                evaluacionId,
                critDesc,
                'Resultado desfavorable (No logrado) en dos evaluaciones consecutivas en este criterio.',
              ]
            );
            alertasActualizadas++;
          }
        } else {
          // Si el estudiante ahora tiene LOGRADO o ya no cumple la condición de 2 fallos consecutivos,
          // desactivar cualquier alerta activa que se haya originado en esta evaluación
          const alertDeactivate = await client.query(
            `UPDATE alertas
             SET estado = 'REVISADA', updated_at = CURRENT_TIMESTAMP
             WHERE docente_id = $1 AND estudiante_id = $2 AND criterio_id = $3 AND estado = 'ACTIVA' AND evaluacion_id = $4
             RETURNING id`,
            [docenteId, r.estudianteId, criterioId, evaluacionId]
          );
          if (alertDeactivate.rows.length > 0) {
            alertasActualizadas++;
          }
        }
      }
    }

    // 8. Auditoría
    await client.query(
      `INSERT INTO registros_auditoria (accion, entidad, entidad_id, detalles)
       VALUES ('EDITAR_EVALUACION', 'evaluaciones', $1, $2::jsonb)`,
      [
        evaluacionId,
        JSON.stringify({
          docenteId,
          resultadosModificados,
          alertasActualizadas,
        }),
      ]
    );

    return {
      evaluacion: evaluacionActualizada,
      resultadosModificados,
      alertasActualizadas,
      criterioIds,
    };
  });
}

// -------------------------------------------------------------
// ANÁLISIS GRUPAL CON DETECCIÓN DE DIFICULTADES REALES COMPARTIDAS
// -------------------------------------------------------------
export async function findAnalisisGrupalByAula(docenteId: number, aulaId?: number, areaId?: number) {
  const params: any[] = [docenteId];
  let filterConditions = 'ev.docente_id = $1 AND ev.estado = \'COMPLETADA\'';

  if (aulaId) {
    params.push(aulaId);
    filterConditions += ` AND ev.aula_id = $${params.length}`;
  }

  if (areaId) {
    params.push(areaId);
    filterConditions += ` AND ev.area_id = $${params.length}`;
  }

  // 1. Obtener métricas por criterio considerando ÚNICAMENTE a los estudiantes realmente evaluados
  const criteriosStatsSql = `
    SELECT
      c.id as criterio_id,
      c.descripcion as criterio_descripcion,
      c.orden as criterio_orden,
      ar.id as area_id,
      ar.nombre as area_nombre,
      ar.color as area_color,
      COUNT(DISTINCT r.estudiante_id)::int as total_evaluados,
      COUNT(DISTINCT r.estudiante_id) FILTER (WHERE r.marca = 'LOGRADO')::int as logrados,
      COUNT(DISTINCT r.estudiante_id) FILTER (WHERE r.marca = 'NO_LOGRADO')::int as no_logrados,
      COUNT(DISTINCT r.estudiante_id) FILTER (WHERE r.marca = 'NO_OBSERVADO')::int as no_observados
    FROM resultados_academicos r
    JOIN evaluaciones ev ON ev.id = r.evaluacion_id
    JOIN criterios_evaluacion c ON c.id = r.criterio_id
    JOIN areas_academicas ar ON ar.id = c.area_id
    WHERE ${filterConditions}
    GROUP BY c.id, c.descripcion, c.orden, ar.id, ar.nombre, ar.color
    ORDER BY no_logrados DESC, total_evaluados DESC
  `;

  const criteriosStatsRes = await query(criteriosStatsSql, params);

  // 2. Obtener lista detallada de estudiantes con dificultad (NO_LOGRADO) en cada criterio
  const estudiantesDificultadSql = `
    SELECT DISTINCT
      c.id as criterio_id,
      e.id as estudiante_id,
      e.nombres as estudiante_nombres,
      e.apellidos as estudiante_apellidos,
      e.codigo as estudiante_codigo,
      e.color_avatar as estudiante_color,
      a.grado,
      a.seccion,
      r.marca,
      r.nivel_logro,
      r.observaciones,
      ev.fecha as evaluacion_fecha
    FROM resultados_academicos r
    JOIN evaluaciones ev ON ev.id = r.evaluacion_id
    JOIN estudiantes e ON e.id = r.estudiante_id
    LEFT JOIN aulas a ON a.id = e.aula_id
    JOIN criterios_evaluacion c ON c.id = r.criterio_id
    WHERE ${filterConditions} AND r.marca = 'NO_LOGRADO'
    ORDER BY c.id, e.apellidos, e.nombres
  `;

  const estDificultadRes = await query(estudiantesDificultadSql, params);

  // Mapear estudiantes a sus respectivos criterios
  const dificultadesPorCriterio = new Map<number, any[]>();
  for (const row of estDificultadRes.rows) {
    if (!dificultadesPorCriterio.has(row.criterio_id)) {
      dificultadesPorCriterio.set(row.criterio_id, []);
    }
    dificultadesPorCriterio.get(row.criterio_id)!.push({
      id: row.estudiante_id,
      nombres: row.estudiante_nombres,
      apellidos: row.estudiante_apellidos,
      codigo: row.estudiante_codigo,
      colorAvatar: row.estudiante_color,
      grado: row.grado,
      seccion: row.seccion,
      marca: row.marca,
      nivelLogro: row.nivel_logro,
      observaciones: row.observaciones,
      fecha: row.evaluacion_fecha,
    });
  }

  // 3. Procesar criterios y clasificar en APOYO_GRUPAL vs APOYO_INDIVIDUAL
  const criteriosProcesados = criteriosStatsRes.rows.map((row) => {
    const total = Number(row.total_evaluados) || 0;
    const logrados = Number(row.logrados) || 0;
    const noLogrados = Number(row.no_logrados) || 0;
    const noObservados = Number(row.no_observados) || 0;
    const logroPct = total > 0 ? Math.round((logrados / total) * 100) : 0;
    const dificultadPct = total > 0 ? Math.round((noLogrados / total) * 100) : 0;

    const estudiantes = dificultadesPorCriterio.get(row.criterio_id) || [];

    // Umbral pedagógico:
    // Apoyo Grupal: cuando 3+ estudiantes tienen dificultad O cuando >= 35% de los evaluados (con al menos 2 estudiantes)
    // Apoyo Individual: cuando 1 o 2 estudiantes tienen dificultad (< 35% del aula)
    let tipoApoyo: 'APOYO_GRUPAL' | 'APOYO_INDIVIDUAL' | 'SIN_DIFICULTAD' = 'SIN_DIFICULTAD';
    let prioridad: 'ALTA' | 'MEDIA' | 'BAJA' = 'BAJA';

    if (noLogrados >= 3 || (dificultadPct >= 35 && noLogrados >= 2)) {
      tipoApoyo = 'APOYO_GRUPAL';
      prioridad = dificultadPct >= 50 || noLogrados >= 5 ? 'ALTA' : 'MEDIA';
    } else if (noLogrados > 0) {
      tipoApoyo = 'APOYO_INDIVIDUAL';
      prioridad = 'BAJA';
    }

    return {
      criterioId: row.criterio_id,
      criterioDescripcion: row.criterio_descripcion,
      areaId: row.area_id,
      areaNombre: row.area_nombre,
      areaColor: row.area_color,
      totalEvaluados: total,
      logrados,
      noLogrados,
      noObservados,
      logroPct,
      dificultadPct,
      tipoApoyo,
      prioridad,
      estudiantesAfectados: estudiantes,
    };
  });

  // Dificultades grupales (las que afectan a una porción representativa del aula)
  const dificultadesGrupales = criteriosProcesados
    .filter((c) => c.tipoApoyo === 'APOYO_GRUPAL')
    .sort((a, b) => b.dificultadPct - a.dificultadPct || b.noLogrados - a.noLogrados);

  // Dificultades individuales
  const dificultadesIndividuales = criteriosProcesados
    .filter((c) => c.tipoApoyo === 'APOYO_INDIVIDUAL')
    .sort((a, b) => b.noLogrados - a.noLogrados);

  // 4. Métricas generales del grupo evaluado
  const totalEvaluadosGlobal = new Set<number>();
  for (const c of criteriosProcesados) {
    for (const est of c.estudiantesAfectados) {
      totalEvaluadosGlobal.add(est.id);
    }
  }

  // Estudiantes totales inscritos en el aula o docente
  let totalEstudiantesAula = 0;
  if (aulaId) {
    const totalAulaRes = await query(
      'SELECT COUNT(*)::int as total FROM estudiantes WHERE aula_id = $1 AND docente_id = $2',
      [aulaId, docenteId]
    );
    totalEstudiantesAula = totalAulaRes.rows[0]?.total || 0;
  } else {
    const totalDocenteRes = await query(
      'SELECT COUNT(*)::int as total FROM estudiantes WHERE docente_id = $1',
      [docenteId]
    );
    totalEstudiantesAula = totalDocenteRes.rows[0]?.total || 0;
  }

  // Promedio de logro grupal
  const sumLogros = criteriosProcesados.reduce((acc, c) => acc + c.logrados, 0);
  const sumEvaluados = criteriosProcesados.reduce((acc, c) => acc + c.totalEvaluados, 0);
  const logroGrupalPromedio = sumEvaluados > 0 ? Math.round((sumLogros / sumEvaluados) * 100) : 0;

  return {
    totalEstudiantesAula,
    totalEvaluadosUnicos: totalEvaluadosGlobal.size,
    logroGrupalPromedio,
    criterios: criteriosProcesados,
    dificultadesGrupales,
    dificultadesIndividuales,
  };
}

// -------------------------------------------------------------
// GENERACIÓN AUTOMÁTICA DE SUGERENCIAS DE REFUERZO PEDAGÓGICO
// -------------------------------------------------------------
export async function generateSugerenciasRefuerzo(docenteId: number, aulaId?: number, areaId?: number) {
  const analisis = await findAnalisisGrupalByAula(docenteId, aulaId, areaId);
  const sugerencias: any[] = [];

  // 1. Generar para dificultades grupales
  for (const diff of analisis.dificultadesGrupales) {
    const nombresArea = diff.areaNombre;
    const estCount = diff.noLogrados;
    const pct = diff.dificultadPct;
    const total = diff.totalEvaluados;

    let propuestaTitulo = `Taller grupal: Refuerzo en ${diff.criterioDescripcion}`;
    let proposito = `Desarrollar y consolidar la capacidad de los estudiantes para: "${diff.criterioDescripcion}" mediante dinámicas colaborativas y práctica guiada.`;
    let instrucciones = `1. Explicación interactiva con ejemplos visuales y modelado paso a paso por el docente.\n2. Trabajo en parejas resolviendo ejercicios prácticos de aplicación.\n3. Puesta en común y retroalimentación formativa inmediata grupal.`;
    let materiales = 'Fichas didácticas impresas, organizadores visuales, pizarra interactiva/papelógrafos y marcadores.';

    if (nombresArea.toLowerCase().includes('comunic')) {
      propuestaTitulo = `Taller de lectura comprensiva y deducción`;
      proposito = `Mejorar la comprensión lectora y la capacidad de inferir ideas principales y secundarias en textos de complejidad gradual.`;
      instrucciones = `1. Lectura compartida en voz alta de un texto modelo identificando palabras clave.\n2. Preguntas guía de nivel literal e inferencial.\n3. Redacción de síntesis en tríos y debate colectivo.`;
      materiales = 'Textos breves seleccionados, guías de comprensión lectora, tarjetas de vocabulario.';
    } else if (nombresArea.toLowerCase().includes('matem')) {
      propuestaTitulo = `Laboratorio práctico de resolución de problemas`;
      proposito = `Afianzar las estrategias heurísticas y operativas para resolver problemas aditivos y multiplicativos contextualizados.`;
      instrucciones = `1. Presentación de situaciones problemáticas vivenciales cotidianas.\n2. Uso de material concreto y esquemas gráficos para representar cantidades.\n3. Socialización de diferentes caminos de resolución.`;
      materiales = 'Material base diez, regletas de colores, fichas de problemas con retos graduales.';
    }

    sugerencias.push({
      criterioId: diff.criterioId,
      criterioDescripcion: diff.criterioDescripcion,
      areaId: diff.areaId,
      areaNombre: diff.areaNombre,
      tipo: 'GRUPAL',
      prioridad: diff.prioridad,
      titulo: propuestaTitulo,
      proposito,
      instrucciones,
      materiales,
      duracionMinutos: 45,
      justificacion: `${estCount} de ${total} estudiantes evaluados (${pct}%) presentaron dificultades en este criterio en el aula.`,
      estudiantesAfectados: diff.estudiantesAfectados,
      estudiantesIds: diff.estudiantesAfectados.map((e: any) => e.id),
    });
  }

  // 2. Generar para dificultades individuales
  for (const diff of analisis.dificultadesIndividuales) {
    for (const est of diff.estudiantesAfectados) {
      sugerencias.push({
        criterioId: diff.criterioId,
        criterioDescripcion: diff.criterioDescripcion,
        areaId: diff.areaId,
        areaNombre: diff.areaNombre,
        tipo: 'INDIVIDUAL',
        prioridad: 'BAJA',
        titulo: `Acompañamiento personalizado: ${diff.criterioDescripcion}`,
        proposito: `Brindar tutoría individual y andamiaje directo a ${est.nombres} ${est.apellidos} para superar la dificultad observada.`,
        instrucciones: `1. Diagnóstico breve de la duda o concepción errónea específica del alumno.\n2. Ejercicio guiado uno a uno con retroalimentación paso a paso.\n3. Ejercicio de aplicación autónomo con verificación de logro.`,
        materiales: 'Ficha de trabajo adaptada, guía visual de pasos.',
        duracionMinutos: 30,
        justificacion: `Atención focalizada para ${est.nombres} ${est.apellidos} debido a resultado "No logrado" en ${diff.criterioDescripcion}.`,
        estudiantesAfectados: [est],
        estudiantesIds: [est.id],
      });
    }
  }

  return sugerencias;
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

  // Obtener criterios de desempeño calculando porcentaje real sobre estudiantes evaluados
  const criteriosRes = await query(
    `SELECT c.id, c.descripcion,
            COUNT(DISTINCT r.estudiante_id)::int as total,
            COUNT(DISTINCT r.estudiante_id) FILTER (WHERE r.marca = 'LOGRADO')::int as logrados
     FROM resultados_academicos r
     JOIN evaluaciones ev ON ev.id = r.evaluacion_id
     JOIN criterios_evaluacion c ON c.id = r.criterio_id
     WHERE ev.docente_id = $1
     GROUP BY c.id, c.descripcion
     ORDER BY total DESC
     LIMIT 8`,
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
  const recRes = await findRecomendacionesByDocente(docenteId);

  return {
    evaluaciones: evalsRes.rows,
    recomendaciones: recRes,
  };
}

export async function findRecomendacionesByDocente(docenteId: number) {
  const res = await query(
    `SELECT rec.*, e.nombres as estudiante_nombres, e.apellidos as estudiante_apellidos,
            e.color_avatar as estudiante_color, a.grado, a.seccion,
            c.descripcion as criterio_descripcion, ar.nombre as area_nombre, ar.color as area_color
     FROM recomendaciones rec
     LEFT JOIN estudiantes e ON e.id = rec.estudiante_id
     LEFT JOIN aulas a ON a.id = e.aula_id
     LEFT JOIN criterios_evaluacion c ON c.id = rec.criterio_id
     LEFT JOIN areas_academicas ar ON ar.id = c.area_id
     WHERE rec.docente_id = $1
     ORDER BY rec.created_at DESC`,
    [docenteId]
  );

  // Deserializar metadatos enriquecidos de observaciones si existen
  return res.rows.map((row) => {
    let parsedMeta: any = null;
    if (row.observaciones && row.observaciones.startsWith('{') && row.observaciones.endsWith('}')) {
      try {
        parsedMeta = JSON.parse(row.observaciones);
      } catch {
        parsedMeta = null;
      }
    }

    return {
      ...row,
      tipo: parsedMeta?.tipo || 'INDIVIDUAL',
      proposito: parsedMeta?.proposito || '',
      materiales: parsedMeta?.materiales || '',
      duracionMinutos: parsedMeta?.duracionMinutos || 45,
      justificacion: parsedMeta?.justificacion || '',
      resultadoAvance: parsedMeta?.resultadoAvance || 'EN_PROCESO',
      estudiantesAfectados: parsedMeta?.estudiantesAfectados || (row.estudiante_id ? [{ id: row.estudiante_id, nombres: row.estudiante_nombres, apellidos: row.estudiante_apellidos }] : []),
      comparacionResultados: parsedMeta?.comparacion || null,
      observacionesDocente: parsedMeta?.notasDocente || row.observaciones || '',
    };
  });
}

export interface CreateRecomendacionInput {
  estudianteId?: number | null;
  aulaId?: number | null;
  criterioId?: number | null;
  tipo?: 'INDIVIDUAL' | 'GRUPAL';
  titulo: string;
  descripcion: string;
  proposito?: string | null;
  materiales?: string | null;
  duracionMinutos?: number;
  justificacion?: string | null;
  estado?: 'PROPUESTA' | 'ACEPTADA' | 'APLICADA' | 'DESCARTADA';
  fechaAplicacion?: string | null;
  resultadoAvance?: 'SUPERADO' | 'EN_PROCESO' | 'NO_SUPERADO' | null;
  observaciones?: string | null;
  estudiantesAfectados?: any[];
}

export async function createRecomendacion(docenteId: number, data: CreateRecomendacionInput) {
  let targetStudentId = data.estudianteId || null;

  // Si no se proporcionó estudianteId pero hay estudiantesAfectados o aula, asignar el primer estudiante
  if (!targetStudentId) {
    if (data.estudiantesAfectados && data.estudiantesAfectados.length > 0 && data.estudiantesAfectados[0].id) {
      targetStudentId = data.estudiantesAfectados[0].id;
    } else if (data.aulaId) {
      const firstSt = await query(
        'SELECT id FROM estudiantes WHERE aula_id = $1 AND docente_id = $2 LIMIT 1',
        [data.aulaId, docenteId]
      );
      if (firstSt.rows.length > 0) {
        targetStudentId = firstSt.rows[0].id;
      }
    }
  }

  // Si todavía no hay estudianteId, buscar cualquier estudiante del docente para satisfacer la restricción NOT NULL de la BD
  if (!targetStudentId) {
    const anySt = await query('SELECT id FROM estudiantes WHERE docente_id = $1 LIMIT 1', [docenteId]);
    if (anySt.rows.length > 0) {
      targetStudentId = anySt.rows[0].id;
    } else {
      throw new Error('Debe existir al menos un estudiante en su registro para asignar la actividad de refuerzo.');
    }
  }

  // Estructurar metadatos en observaciones
  const meta = {
    tipo: data.tipo || 'INDIVIDUAL',
    aulaId: data.aulaId || null,
    proposito: data.proposito || '',
    materiales: data.materiales || '',
    duracionMinutos: data.duracionMinutos || 45,
    justificacion: data.justificacion || '',
    resultadoAvance: data.resultadoAvance || 'EN_PROCESO',
    estudiantesAfectados: data.estudiantesAfectados || [],
    notasDocente: data.observaciones || '',
  };

  const res = await query(
    `INSERT INTO recomendaciones (docente_id, estudiante_id, criterio_id, titulo, descripcion, estado, fecha_aplicacion, observaciones)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      docenteId,
      targetStudentId,
      data.criterioId || null,
      data.titulo.trim(),
      data.descripcion.trim(),
      data.estado || 'ACEPTADA',
      data.fechaAplicacion || null,
      JSON.stringify(meta),
    ]
  );

  return {
    ...res.rows[0],
    ...meta,
    observacionesDocente: meta.notasDocente,
  };
}

export async function updateRecomendacion(docenteId: number, id: number, data: {
  titulo?: string;
  descripcion?: string;
  estado?: 'PROPUESTA' | 'ACEPTADA' | 'APLICADA' | 'DESCARTADA';
  fechaAplicacion?: string | null;
  resultadoAvance?: 'SUPERADO' | 'EN_PROCESO' | 'NO_SUPERADO' | null;
  observaciones?: string | null;
  proposito?: string | null;
  materiales?: string | null;
  duracionMinutos?: number;
  estudiantesAfectados?: any[];
  comparacion?: any;
}) {
  const existing = await query('SELECT * FROM recomendaciones WHERE id = $1 AND docente_id = $2', [id, docenteId]);
  if (existing.rows.length === 0) {
    const err: any = new Error('Actividad de refuerzo no encontrada.');
    err.status = 404;
    throw err;
  }

  const rec = existing.rows[0];
  let meta: any = {};
  if (rec.observaciones && rec.observaciones.startsWith('{') && rec.observaciones.endsWith('}')) {
    try {
      meta = JSON.parse(rec.observaciones);
    } catch {
      meta = {};
    }
  }

  if (data.proposito !== undefined) meta.proposito = data.proposito;
  if (data.materiales !== undefined) meta.materiales = data.materiales;
  if (data.duracionMinutos !== undefined) meta.duracionMinutos = data.duracionMinutos;
  if (data.resultadoAvance !== undefined) meta.resultadoAvance = data.resultadoAvance;
  if (data.estudiantesAfectados !== undefined) meta.estudiantesAfectados = data.estudiantesAfectados;
  if (data.comparacion !== undefined) meta.comparacion = data.comparacion;
  if (data.observaciones !== undefined) meta.notasDocente = data.observaciones;

  const res = await query(
    `UPDATE recomendaciones
     SET titulo = COALESCE($1, titulo),
         descripcion = COALESCE($2, descripcion),
         estado = COALESCE($3, estado),
         fecha_aplicacion = COALESCE($4, fecha_aplicacion),
         observaciones = $5,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $6 AND docente_id = $7
     RETURNING *`,
    [
      data.titulo?.trim() || null,
      data.descripcion?.trim() || null,
      data.estado || null,
      data.fechaAplicacion || null,
      JSON.stringify(meta),
      id,
      docenteId,
    ]
  );

  return {
    ...res.rows[0],
    ...meta,
    observacionesDocente: meta.notasDocente,
  };
}
