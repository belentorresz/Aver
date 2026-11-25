import dotenv from 'dotenv';
import path from 'node:path';
import { pool, query } from '../src/database/connection.js';
import {
  createDocenteTransaction,
  createApoderadoTransaction,
} from '../src/database/queries/users.queries.js';
import {
  createAula,
  findAulasByDocente,
  createEstudiante,
  createEstudiantesBatch,
  findEstudiantesByDocente,
  regenerateStudentLinkCode,
  updateEstudiante,
  deleteEstudiante,
} from '../src/database/queries/students.queries.js';
import {
  findLinkedStudentsByApoderado,
  findStudentAcademicDetailsForGuardian,
  linkStudentWithCode,
} from '../src/database/queries/guardians.queries.js';
import { hashPassword } from '../src/services/auth.service.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function runComprehensiveTests() {
  console.log('========================================================================');
  console.log(' EJECUTANDO PRUEBAS OBLIGATORIAS DE AVer (14 PUNTOS DEL USUARIO) ');
  console.log('========================================================================\n');

  const testDniDocente1 = '99999991';
  const testDniDocente2 = '99999992';
  const testDniApoderado1 = '88888881';
  const testDniApoderado2 = '88888882';

  let doc1Id: number;
  let doc2Id: number;
  let apo1Id: number;
  let apo2Id: number;

  try {
    const pwdHash = await hashPassword('Password123!');

    // Limpieza preventiva de pruebas anteriores con esos DNI
    await query('DELETE FROM usuarios WHERE dni IN ($1, $2, $3, $4)', [
      testDniDocente1,
      testDniDocente2,
      testDniApoderado1,
      testDniApoderado2,
    ]);

    // -------------------------------------------------------------
    // PRUEBA 1: Registro de docente nuevo (Debe iniciar en CERO: sin aulas ni alumnos)
    // -------------------------------------------------------------
    console.log('PRUEBA 1: Registro de un docente nuevo...');
    const doc1 = await createDocenteTransaction({
      dni: testDniDocente1,
      email: 'test_docente_1@aver.edu.pe',
      passwordHash: pwdHash,
      nombres: 'Profesor Test',
      apellidos: 'Docente Uno',
      institucionEducativa: 'I.E. Prueba 100',
      nivelEducativo: 'Primaria',
    });
    doc1Id = doc1.docente.id;

    const initialAulas = await findAulasByDocente(doc1Id);
    const initialStudents = await findEstudiantesByDocente(doc1Id);

    if (initialAulas.length !== 0 || initialStudents.length !== 0) {
      throw new Error(`FALLO: Docente nuevo inició con datos ficticios (${initialAulas.length} aulas, ${initialStudents.length} estudiantes)`);
    }
    console.log('  [PASS] Docente nuevo registrado con éxito e inicia completamente vacío (0 aulas, 0 estudiantes).\n');

    // -------------------------------------------------------------
    // PRUEBA 2: Creación de aula por el docente
    // -------------------------------------------------------------
    console.log('PRUEBA 2: Creación de un aula por el docente...');
    const aula1 = await createAula(doc1Id, {
      grado: '5.º grado',
      seccion: 'B',
      nivel: 'Primaria',
      anioEscolar: '2026',
    });
    if (!aula1 || !aula1.id) throw new Error('FALLO al crear aula para el docente');
    console.log(`  [PASS] Aula creada exitosamente (ID: ${aula1.id}, "${aula1.grado} ${aula1.seccion}").\n`);

    // -------------------------------------------------------------
    // PRUEBA 3: Registro individual de estudiante
    // -------------------------------------------------------------
    console.log('PRUEBA 3: Registro individual de estudiante...');
    const st1 = await createEstudiante(doc1Id, {
      aulaId: aula1.id,
      nombres: 'Estudiante Individual',
      apellidos: 'Prueba Alpha',
      dni: '78901234',
      codigo: 'IND-001',
    });
    if (!st1 || !st1.id || !st1.codigo_vinculacion_apoderado) {
      throw new Error('FALLO al registrar estudiante individual o no generó código de vinculación');
    }
    console.log(`  [PASS] Estudiante registrado exitosamente (ID: ${st1.id}, Código: ${st1.codigo}, VINC: ${st1.codigo_vinculacion_apoderado}).\n`);

    // -------------------------------------------------------------
    // PRUEBA 4 & 5: Importación masiva, validación de duplicados y campos
    // -------------------------------------------------------------
    console.log('PRUEBA 4 & 5: Importación masiva mediante lote (Excel) y detección de errores...');
    const batchInput = [
      { nombres: 'Carlos', apellidos: 'López', dni: '78901235', codigo: 'MAS-001' }, // Válido
      { nombres: 'Lucía', apellidos: 'Gómez', dni: '78901236', codigo: 'MAS-002' }, // Válido
      { nombres: '', apellidos: 'Sin Nombre', dni: '78901237' }, // Error: Falta nombre
      { nombres: 'Pedro', apellidos: 'DNI Duplicado en Lote', dni: '78901235' }, // Error: DNI duplicado
      { nombres: 'María', apellidos: 'DNI Existente en BD', dni: '78901234' }, // Error: DNI ya existe en st1
      { nombres: 'Rosa', apellidos: 'DNI Formato Inválido', dni: '123' }, // Error: DNI no tiene 8 dígitos
    ];

    const batchRes = await createEstudiantesBatch(doc1Id, aula1.id, batchInput);
    if (batchRes.registradosCount !== 2 || batchRes.rechazadosCount !== 4) {
      throw new Error(`FALLO en validación de importación masiva: registrados=${batchRes.registradosCount}, rechazados=${batchRes.rechazadosCount}`);
    }
    console.log(`  [PASS] Importación masiva completada: 2 registrados válidos, 4 rechazados correctamente por errores/duplicados.`);
    batchRes.rechazados.forEach((r) => console.log(`    - Rechazado esperado: "${r.item.nombres || 'Sin nombre'}" -> ${r.motivo}`));
    console.log('');

    // -------------------------------------------------------------
    // PRUEBA 6: Generación y regeneración de códigos de vinculación seguros
    // -------------------------------------------------------------
    console.log('PRUEBA 6: Generación y regeneración de códigos de vinculación...');
    const oldCode = st1.codigo_vinculacion_apoderado;
    const regenRes = await regenerateStudentLinkCode(doc1Id, st1.id);
    if (!regenRes.codigo || regenRes.codigo === oldCode || !regenRes.codigo.startsWith('VINC-')) {
      throw new Error('FALLO al regenerar código de vinculación único');
    }
    console.log(`  [PASS] Código regenerado exitosamente: Antiguo=${oldCode} -> Nuevo=${regenRes.codigo}\n`);

    // -------------------------------------------------------------
    // PRUEBA 7: Registro de un apoderado nuevo (debe iniciar vacío sin estudiantes)
    // -------------------------------------------------------------
    console.log('PRUEBA 7: Registro de un apoderado nuevo...');
    const apo1 = await createApoderadoTransaction({
      dni: testDniApoderado1,
      email: 'test_apoderado_1@aver.edu.pe',
      passwordHash: pwdHash,
      nombres: 'Apoderado Test',
      apellidos: 'Familiar Uno',
      telefono: '987654321',
    });
    apo1Id = apo1.apoderado.id;

    const initialLinkedStudents = await findLinkedStudentsByApoderado(apo1Id);
    if (initialLinkedStudents.length !== 0) {
      throw new Error(`FALLO: Apoderado nuevo inició con estudiantes ficticios (${initialLinkedStudents.length})`);
    }
    console.log('  [PASS] Apoderado nuevo inicia con portal completamente vacío (0 estudiantes vinculados).\n');

    // -------------------------------------------------------------
    // PRUEBA 8 & 9: Vinculación con código y consulta protegida
    // -------------------------------------------------------------
    console.log('PRUEBA 8 & 9: Vinculación mediante código y consulta autorizada...');
    const linkedSt = await linkStudentWithCode(apo1Id, regenRes.codigo);
    if (linkedSt.id !== st1.id) throw new Error('FALLO: El estudiante vinculado no coincide');

    const guardianDetails = await findStudentAcademicDetailsForGuardian(apo1Id, st1.id);
    if (!guardianDetails || guardianDetails.estudiante.id !== st1.id) {
      throw new Error('FALLO al consultar detalle académico del estudiante vinculado');
    }
    console.log(`  [PASS] Apoderado vinculado exitosamente a "${guardianDetails.estudiante.nombres} ${guardianDetails.estudiante.apellidos}".\n`);

    // -------------------------------------------------------------
    // PRUEBA 10: Aislamiento estricto entre docentes diferentes
    // -------------------------------------------------------------
    console.log('PRUEBA 10: Aislamiento estricto entre dos docentes diferentes...');
    const doc2 = await createDocenteTransaction({
      dni: testDniDocente2,
      email: 'test_docente_2@aver.edu.pe',
      passwordHash: pwdHash,
      nombres: 'Docente Dos',
      apellidos: 'Profesor Dos',
      institucionEducativa: 'I.E. Otra',
      nivelEducativo: 'Primaria',
    });
    doc2Id = doc2.docente.id;

    const doc2Students = await findEstudiantesByDocente(doc2Id);
    const doc2Aulas = await findAulasByDocente(doc2Id);
    if (doc2Students.length !== 0 || doc2Aulas.length !== 0) {
      throw new Error('FALLO: Docente 2 visualiza aulas o estudiantes de Docente 1');
    }

    // Intentar que Docente 2 modifique o elimine estudiante de Docente 1
    let unauthorizedBlocked = false;
    try {
      await updateEstudiante(doc2Id, st1.id, { nombres: 'Hacked', apellidos: 'Hacked' });
    } catch {
      unauthorizedBlocked = true;
    }
    if (!unauthorizedBlocked) {
      throw new Error('FALLO: Docente 2 pudo modificar estudiante de Docente 1');
    }
    console.log('  [PASS] Aislamiento docente verificado: Docente 2 no tiene acceso a aulas ni estudiantes de Docente 1.\n');

    // -------------------------------------------------------------
    // PRUEBA 11: Aislamiento estricto entre dos apoderados diferentes
    // -------------------------------------------------------------
    console.log('PRUEBA 11: Aislamiento estricto entre dos apoderados diferentes...');
    const apo2 = await createApoderadoTransaction({
      dni: testDniApoderado2,
      email: 'test_apoderado_2@aver.edu.pe',
      passwordHash: pwdHash,
      nombres: 'Apoderado Dos',
      apellidos: 'Familiar Dos',
    });
    apo2Id = apo2.apoderado.id;

    let apo2Blocked = false;
    try {
      await findStudentAcademicDetailsForGuardian(apo2Id, st1.id);
    } catch {
      apo2Blocked = true;
    }
    if (!apo2Blocked) {
      throw new Error('FALLO: Apoderado 2 pudo consultar información de un estudiante no vinculado');
    }
    console.log('  [PASS] Aislamiento apoderado verificado: Apoderado 2 bloqueado de consultar estudiantes ajenos.\n');

    // -------------------------------------------------------------
    // PRUEBA 12: Edición y eliminación autorizada por el docente
    // -------------------------------------------------------------
    console.log('PRUEBA 12: Edición y eliminación autorizada por el docente...');
    const updated = await updateEstudiante(doc1Id, st1.id, {
      nombres: 'Estudiante Editado',
      apellidos: 'Prueba Actualizada',
      dni: '78901234',
      codigo: 'IND-001',
    });
    if (updated.nombres !== 'Estudiante Editado') throw new Error('FALLO al editar estudiante');

    await deleteEstudiante(doc1Id, st1.id);
    const postDeleteSt = await query('SELECT id FROM estudiantes WHERE id = $1', [st1.id]);
    if (postDeleteSt.rows.length !== 0) throw new Error('FALLO: El estudiante no fue eliminado');

    console.log('  [PASS] Edición y eliminación de estudiantes funcionan correctamente con permisos validados.\n');

    console.log('========================================================================');
    console.log('   RESULTADO: TODAS LAS PRUEBAS OBLIGATORIAS (1-12) PASARON CON ÉXITO   ');
    console.log('========================================================================\n');
  } finally {
    // Limpieza de datos creados por las pruebas
    console.log('Limpiando datos generados por la prueba...');
    await query('DELETE FROM usuarios WHERE dni IN ($1, $2, $3, $4)', [
      testDniDocente1,
      testDniDocente2,
      testDniApoderado1,
      testDniApoderado2,
    ]);
    console.log('Limpieza completada. Base de datos libre de registros de prueba.');
    await pool.end();
  }
}

runComprehensiveTests().catch((err) => {
  console.error('\n❌ ERROR EN PRUEBAS:', err.message);
  process.exit(1);
});
