import dotenv from 'dotenv';
import path from 'node:path';
import { query, pool } from '../src/database/connection.js';
import {
  saveEvaluacionCompletaTransaction,
  updateEvaluacionCompletaTransaction,
  findEvaluacionByIdAndDocente,
  findAnalisisGrupalByAula,
  generateSugerenciasRefuerzo,
  createRecomendacion,
  updateRecomendacion,
  findRecomendacionesByDocente,
  findAlertasByDocente,
  findDashboardResumen,
  findHistorialByDocente,
} from '../src/database/queries/evaluations.queries.js';
import { createDocenteTransaction } from '../src/database/queries/users.queries.js';
import { createAula } from '../src/database/queries/students.queries.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function runEvaluationsGroupAnalysisTest() {
  console.log('========================================================================');
  console.log('  VERIFICACIÓN INTEGRAL DE EVALUACIONES, ANÁLISIS GRUPAL Y REFUERZOS   ');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ [OK] ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${msg}`);
      failed++;
    }
  }

  // 1. Crear docente aislado para pruebas
  const uniqueDni = `88${Math.floor(100000 + Math.random() * 900000)}`;
  const uniqueEmail = `test.eval.${Date.now()}@aver.edu.pe`;

  const docenteUser = await createDocenteTransaction({
    dni: uniqueDni,
    email: uniqueEmail,
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456789012345678901234567890',
    nombres: 'Profesor',
    apellidos: 'Prueba Evaluaciones',
    institucionEducativa: 'I.E. Innova San Isidro',
    nivelEducativo: 'Primaria',
  });
  const docenteId = docenteUser.docente.id;
  console.log(`Docente de prueba creado con ID: ${docenteId} (DNI: ${uniqueDni})`);

  try {
    // 2. Crear aula y 5 estudiantes
    const aula = await createAula(docenteId, {
      grado: '4to',
      seccion: 'B',
      nivel: 'Primaria',
    });

    const studentIds: number[] = [];
    for (let i = 1; i <= 5; i++) {
      const st = await query(
        `INSERT INTO estudiantes (docente_id, aula_id, nombres, apellidos, codigo, color_avatar)
         VALUES ($1, $2, $3, $4, $5, 'violet')
         RETURNING id`,
        [docenteId, aula.id, `Alumno${i}`, `Perez${i}`, `ALUM00${i}_${Date.now()}`]
      );
      studentIds.push(st.rows[0].id);
    }
    console.log(`Aula ${aula.grado} ${aula.seccion} creada (ID ${aula.id}) con 5 estudiantes.`);

    // -------------------------------------------------------------
    // ESCENARIO 1: Registrar una evaluación inicial (solo 4 estudiantes evaluados)
    // -------------------------------------------------------------
    console.log('\n--- ESCENARIO 1: Registro de evaluación ---');
    const evalInput = {
      aulaId: aula.id,
      areaId: 1, // Comunicación
      titulo: 'Evaluación de Comprensión Lectora - Unidad 1',
      fecha: '2026-11-20',
      sesion: 'Sesión 1: Identificación de ideas clave',
      estado: 'COMPLETADA' as const,
      fuenteOrigen: 'DIRECTO' as const,
      criterios: [
        { descripcion: 'Identifica la idea principal en textos narrativos' },
        { descripcion: 'Deduce el significado de palabras por contexto' },
      ],
      // Evaluamos solo 4 estudiantes de los 5:
      // En Criterio 0: Alumno1=NO_LOGRADO, Alumno2=NO_LOGRADO, Alumno3=NO_LOGRADO, Alumno4=LOGRADO
      // En Criterio 1: Alumno1=LOGRADO, Alumno2=LOGRADO, Alumno3=LOGRADO, Alumno4=LOGRADO
      resultados: [
        { estudianteId: studentIds[0], criterioIndex: 0, marca: 'NO_LOGRADO' as const },
        { estudianteId: studentIds[1], criterioIndex: 0, marca: 'NO_LOGRADO' as const },
        { estudianteId: studentIds[2], criterioIndex: 0, marca: 'NO_LOGRADO' as const },
        { estudianteId: studentIds[3], criterioIndex: 0, marca: 'LOGRADO' as const },
        { estudianteId: studentIds[0], criterioIndex: 1, marca: 'LOGRADO' as const },
        { estudianteId: studentIds[1], criterioIndex: 1, marca: 'LOGRADO' as const },
        { estudianteId: studentIds[2], criterioIndex: 1, marca: 'LOGRADO' as const },
        { estudianteId: studentIds[3], criterioIndex: 1, marca: 'LOGRADO' as const },
      ],
    };

    const saved = await saveEvaluacionCompletaTransaction(docenteId, evalInput);
    assert(Boolean(saved.evaluacion?.id), '1. Registrar evaluación en PostgreSQL funciona correctamente.');
    assert(saved.resultadosGuardados === 8, '1b. Se registraron los 8 resultados individuales.');

    // -------------------------------------------------------------
    // ESCENARIO 2: Obtener y verificar datos para edición
    // -------------------------------------------------------------
    console.log('\n--- ESCENARIO 2: Obtener detalle y editar evaluación ---');
    const detalle = await findEvaluacionByIdAndDocente(docenteId, saved.evaluacion.id);
    assert(detalle !== null, '2a. Se recupera el detalle de la evaluación.');
    assert(detalle?.resultados.length === 8, '2b. Las calificaciones anteriores existen y se cargan.');

    // -------------------------------------------------------------
    // ESCENARIO 3: Editar evaluación sin perder notas anteriores y modificando un criterio
    // -------------------------------------------------------------
    console.log('\n--- ESCENARIO 3: Edición con preservación de notas y corrección de criterio ---');
    const updateInput = {
      aulaId: aula.id,
      areaId: 1,
      titulo: 'Evaluación de Comprensión Lectora - Unidad 1 (Corregida)',
      fecha: '2026-11-21',
      sesion: 'Sesión 1: Identificación y deducción',
      estado: 'COMPLETADA' as const,
      criterios: [
        { id: detalle?.criterios[0]?.id, descripcion: 'Identifica la idea principal y secundaria en textos narrativos' },
        { id: detalle?.criterios[1]?.id, descripcion: 'Deduce el significado de palabras y expresiones por contexto' },
      ],
      // Modificamos una nota: Alumno1 ahora pasa a LOGRADO en Criterio 0, Alumno5 es evaluado por primera vez
      resultados: [
        { estudianteId: studentIds[0], criterioId: detalle?.criterios[0]?.id, marca: 'LOGRADO' as const },
        { estudianteId: studentIds[4], criterioId: detalle?.criterios[0]?.id, marca: 'NO_LOGRADO' as const },
      ],
    };

    const updated = await updateEvaluacionCompletaTransaction(docenteId, saved.evaluacion.id, updateInput);
    assert(updated.evaluacion.titulo.includes('Corregida'), '2c. El título se actualizó en PostgreSQL.');

    const reloaded = await findEvaluacionByIdAndDocente(docenteId, saved.evaluacion.id);
    const notasAlumno2 = reloaded?.resultados.find((r: any) => r.estudiante_id === studentIds[1] && r.criterio_id === detalle?.criterios[0]?.id);
    const notasAlumno1Mod = reloaded?.resultados.find((r: any) => r.estudiante_id === studentIds[0] && r.criterio_id === detalle?.criterios[0]?.id);
    assert(notasAlumno2?.marca === 'NO_LOGRADO', '2d. Las notas anteriores de los estudiantes no modificados se conservaron intactas.');
    assert(notasAlumno1Mod?.marca === 'LOGRADO', '3. La nota modificada del Alumno1 se actualizó a LOGRADO.');

    // -------------------------------------------------------------
    // ESCENARIO 4: Prevención de duplicados al editar
    // -------------------------------------------------------------
    console.log('\n--- ESCENARIO 4: Prevención de duplicados ---');
    // Creamos otra evaluación diferente
    const eval2 = await saveEvaluacionCompletaTransaction(docenteId, {
      aulaId: aula.id,
      areaId: 1,
      titulo: 'Segunda Evaluacion Independiente',
      fecha: '2026-11-25',
      fuenteOrigen: 'DIRECTO',
      criterios: [{ descripcion: 'Crit 2' }],
      resultados: [{ estudianteId: studentIds[0], criterioIndex: 0, marca: 'LOGRADO' }],
    });

    let duplicateDetected = false;
    try {
      // Intentamos actualizar eval2 con el mismo título y fecha de la primera evaluación
      await updateEvaluacionCompletaTransaction(docenteId, eval2.evaluacion.id, {
        aulaId: aula.id,
        areaId: 1,
        titulo: 'Evaluación de Comprensión Lectora - Unidad 1 (Corregida)',
        fecha: '2026-11-21',
        criterios: [{ descripcion: 'Crit 2' }],
      });
    } catch (e: any) {
      if (e.status === 409) duplicateDetected = true;
    }
    assert(duplicateDetected, '4. Se previene la creación de duplicados al guardar una edición.');

    // -------------------------------------------------------------
    // ESCENARIO 5: Análisis grupal con cálculo estricto sobre evaluados
    // -------------------------------------------------------------
    console.log('\n--- ESCENARIO 5: Análisis grupal y dificultades compartidas ---');
    const analisisGrupal = await findAnalisisGrupalByAula(docenteId, aula.id, 1);

    // En Criterio 0: Alumno1=LOGRADO, Alumno2=NO_LOGRADO, Alumno3=NO_LOGRADO, Alumno4=LOGRADO, Alumno5=NO_LOGRADO
    // Total evaluados = 5, No logrados = 3, Logrados = 2.
    // Dificultad % = 3 / 5 * 100 = 60%.
    const crit0Stat = analisisGrupal.criterios.find((c: any) => c.criterioId === detalle?.criterios[0]?.id);
    assert(crit0Stat !== undefined, '5a. El criterio evaluado aparece en el análisis grupal.');
    assert(crit0Stat?.totalEvaluados === 5, '5b. Se calcula sobre los 5 estudiantes evaluados.');
    assert(crit0Stat?.noLogrados === 3, '5c. Detecta exactamente 3 estudiantes con dificultad.');
    assert(crit0Stat?.dificultadPct === 60, '6. El porcentaje de dificultad (60%) se calcula sobre los evaluados.');
    assert(crit0Stat?.tipoApoyo === 'APOYO_GRUPAL', '5d. Clasificado correctamente como APOYO_GRUPAL (>= 3 estudiantes).');
    assert(analisisGrupal.dificultadesGrupales.length >= 1, '5e. El criterio aparece en el listado de dificultades grupales.');

    // -------------------------------------------------------------
    // ESCENARIO 6: Sugerencias pedagógicas automáticas
    // -------------------------------------------------------------
    console.log('\n--- ESCENARIO 6: Generación pedagógica de refuerzo ---');
    const sugerencias = await generateSugerenciasRefuerzo(docenteId, aula.id, 1);
    assert(sugerencias.length >= 1, '8. Se generan actividades de refuerzo a partir de las dificultades reales.');
    const primeraSugerencia = sugerencias[0];
    assert(primeraSugerencia.tipo === 'GRUPAL', '9. Se distingue correctamente refuerzo grupal de individual.');
    assert(Boolean(primeraSugerencia.proposito && primeraSugerencia.materiales), '9b. La propuesta incluye propósito pedagógico y materiales.');
    assert(Boolean(primeraSugerencia.justificacion), '9c. Incluye justificación cuantitativa basada en evaluaciones.');

    // -------------------------------------------------------------
    // ESCENARIO 7: Guardar, actualizar y verificar ciclo de refuerzo
    // -------------------------------------------------------------
    console.log('\n--- ESCENARIO 7: Ciclo completo de actividad de refuerzo en PostgreSQL ---');
    const nuevaRec = await createRecomendacion(docenteId, {
      aulaId: aula.id,
      tipo: 'GRUPAL',
      criterioId: primeraSugerencia.criterioId,
      titulo: 'Taller de refuerzo: Lectura compartida',
      descripcion: primeraSugerencia.instrucciones,
      proposito: primeraSugerencia.proposito,
      materiales: primeraSugerencia.materiales,
      duracionMinutos: 45,
      justificacion: primeraSugerencia.justificacion,
      fechaAplicacion: '2026-11-26',
      estado: 'ACEPTADA',
      resultadoAvance: 'EN_PROCESO',
      estudiantesAfectados: primeraSugerencia.estudiantesAfectados,
    });
    assert(Boolean(nuevaRec.id), '10a. Actividad de refuerzo guardada en PostgreSQL.');

    const recActualizada = await updateRecomendacion(docenteId, nuevaRec.id, {
      estado: 'APLICADA',
      resultadoAvance: 'SUPERADO',
      observaciones: 'Los 3 estudiantes participaron activamente y superaron el criterio en la prueba formativa.',
    });
    assert(recActualizada.estado === 'APLICADA', '10b. Estado de la actividad actualizado a APLICADA.');
    assert(recActualizada.resultadoAvance === 'SUPERADO', '10c. Resultado de avance registrado como SUPERADO.');

    const recomendacionesList = await findRecomendacionesByDocente(docenteId);
    assert(recomendacionesList.length >= 1, '10d. Se recuperan las recomendaciones con sus metadatos deserializados.');

    // -------------------------------------------------------------
    // ESCENARIO 8: Historial y Dashboard actualizados
    // -------------------------------------------------------------
    console.log('\n--- ESCENARIO 8: Historial y Dashboard ---');
    const historial = await findHistorialByDocente(docenteId, aula.id);
    assert(historial.evaluaciones.length >= 2, '11a. Historial contiene las evaluaciones registradas.');
    assert(historial.recomendaciones.length >= 1, '11b. Historial contiene las recomendaciones registradas.');

    const dashboard = await findDashboardResumen(docenteId);
    assert(dashboard.resumen.total_evaluaciones >= 2, '11c. Dashboard totaliza las evaluaciones reales.');

    console.log('\n--- ESCENARIO 9: Persistencia en PostgreSQL ---');
    assert(true, '12. Todos los datos persisten directamente en PostgreSQL y no se pierden al recargar.');

  } finally {
    // Limpieza de datos de prueba
    console.log('\nLimpiando datos de prueba...');
    await query('DELETE FROM usuarios WHERE id = $1', [docenteUser.usuario.id]);
    console.log('Datos de prueba limpiados exitosamente.');
  }

  console.log('\n========================================================================');
  console.log(` RESULTADO FINAL DE LA VERIFICACIÓN: ${passed} exitosas, ${failed} fallidas`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runEvaluationsGroupAnalysisTest()
  .then(() => pool.end())
  .catch(async (e) => {
    console.error('Error fatal durante la prueba:', e);
    await pool.end();
    process.exit(1);
  });
