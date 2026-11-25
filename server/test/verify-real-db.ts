import dotenv from 'dotenv';
import path from 'node:path';
import { pool, query } from '../src/database/connection.js';
import {
  findUserByDni,
  findDocenteByUsuarioId,
  findApoderadoByUsuarioId,
  createDocenteTransaction,
  createApoderadoTransaction,
} from '../src/database/queries/users.queries.js';
import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
} from '../src/services/auth.service.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const EXPECTED_TABLES = [
  'alertas',
  'apoderados',
  'archivos_importados',
  'areas_academicas',
  'aulas',
  'criterios_evaluacion',
  'docentes',
  'estudiantes',
  'evaluaciones',
  'instituciones',
  'invitaciones_vinculacion',
  'migrations_history',
  'recomendaciones',
  'registros_auditoria',
  'relaciones_apoderado_estudiante',
  'resultados_academicos',
  'revisiones_ocr',
  'seguimientos',
  'tokens_recuperacion',
  'tokens_verificacion',
  'usuarios',
];

async function runRealVerification() {
  console.log('================================================================');
  console.log('   VERIFICACIÓN DE FUNCIONAMIENTO REAL EN POSTGRESQL (aver_db)  ');
  console.log('================================================================\n');

  let passedSteps = 0;
  let totalSteps = 6;

  try {
    // -------------------------------------------------------------
    // PASO 1: Verificar existencia de las 21 tablas relacionales
    // -------------------------------------------------------------
    console.log('PASO 1: Comprobando existencia de las 21 tablas en aver_db...');
    const tablesRes = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const existingTables = tablesRes.rows.map((r: any) => r.table_name);
    console.log(`  Tablas encontradas en la base de datos (${existingTables.length}):`);
    existingTables.forEach((t: string) => console.log(`    - ${t}`));

    const missingTables = EXPECTED_TABLES.filter((t) => !existingTables.includes(t));
    if (missingTables.length > 0) {
      throw new Error(`Faltan tablas requeridas en PostgreSQL: ${missingTables.join(', ')}`);
    }

    console.log(`  ✅ ÉXITO: Las 21 tablas requeridas existen en la base de datos.\n`);
    passedSteps++;

    // -------------------------------------------------------------
    // PASO 2: Verificar datos semilla (áreas académicas y criterios)
    // -------------------------------------------------------------
    console.log('PASO 2: Comprobando datos semilla en areas_academicas y criterios_evaluacion...');
    const areasRes = await query(`SELECT id, nombre, color FROM areas_academicas ORDER BY id;`);
    console.log(`  Áreas académicas registradas (${areasRes.rows.length}):`);
    areasRes.rows.forEach((a: any) => console.log(`    [ID ${a.id}] ${a.nombre} (Color: ${a.color})`));

    if (areasRes.rows.length < 4) {
      throw new Error('No se encontraron las 4 áreas académicas oficiales del diseño de Figma.');
    }

    const criteriosRes = await query(`
      SELECT c.id, c.descripcion, a.nombre AS area_nombre
      FROM criterios_evaluacion c
      JOIN areas_academicas a ON c.area_id = a.id
      ORDER BY c.id;
    `);
    console.log(`  Criterios base registrados (${criteriosRes.rows.length}):`);
    criteriosRes.rows.forEach((c: any) => console.log(`    - [${c.area_nombre}] ${c.descripcion}`));

    if (criteriosRes.rows.length === 0) {
      throw new Error('No se encontraron criterios de evaluación base en criterios_evaluacion.');
    }

    console.log(`  ✅ ÉXITO: Áreas y criterios iniciales correctamente sembrados.\n`);
    passedSteps++;

    // -------------------------------------------------------------
    // PASO 3: Limpieza previa de datos ficticios de prueba previa (idempotencia)
    // -------------------------------------------------------------
    console.log('PASO 3: Preparando entorno de pruebas con datos ficticios...');
    const TEST_DOCENTE_DNI = '99887766';
    const TEST_DOCENTE_EMAIL = 'profesor.ficticio@aver.edu.pe';
    const TEST_DOCENTE_PASS = 'PasswordSegura2026!';

    const TEST_APODERADO_DNI = '88776655';
    const TEST_APODERADO_EMAIL = 'apoderada.ficticia@aver.edu.pe';
    const TEST_APODERADO_PASS = 'ClaveApoderado2026!';

    // Eliminar si existían de una prueba anterior (limpieza segura)
    await query(`DELETE FROM usuarios WHERE dni IN ($1, $2);`, [TEST_DOCENTE_DNI, TEST_APODERADO_DNI]);
    console.log('  Ambiente preparado sin colisiones de prueba.\n');

    // -------------------------------------------------------------
    // PASO 4: Prueba real de registro de Docente y hash bcrypt
    // -------------------------------------------------------------
    console.log('PASO 4: Probando REGISTRO de Docente en PostgreSQL...');
    const passwordHash = await hashPassword(TEST_DOCENTE_PASS);

    // Verificación de seguridad de contraseña
    if (!passwordHash.startsWith('$2')) {
      throw new Error('El hash generado no corresponde al estándar bcrypt ($2a/$2b).');
    }
    if (passwordHash === TEST_DOCENTE_PASS) {
      throw new Error('VULNERABILIDAD CRÍTICA: La contraseña no fue hasheada.');
    }

    // Ejecutar transacción de registro docente
    const { usuario: createdUser, docente: createdDocente } = await createDocenteTransaction({
      dni: TEST_DOCENTE_DNI,
      email: TEST_DOCENTE_EMAIL,
      passwordHash,
      nombres: 'Carlos Eduardo',
      apellidos: 'Mendoza Quispe',
      institucionEducativa: 'I.E. 2084 San Lorenzo',
      nivelEducativo: 'Primaria',
      telefono: '987654321',
    });

    console.log(`  Usuario creado en tabla 'usuarios': ID ${createdUser.id}, Rol: ${createdUser.rol}`);
    console.log(`  Perfil creado en tabla 'docentes': ID ${createdDocente.id}, Nombres: ${createdDocente.nombres} ${createdDocente.apellidos}`);
    console.log(`  Hash bcrypt almacenado en BD: ${createdUser.password_hash.slice(0, 15)}... (longitud: ${createdUser.password_hash.length})`);

    // Validar que se crearon aulas y estudiantes demo asociados a este docente
    const aulasDocente = await query(`SELECT id, grado, seccion FROM aulas WHERE docente_id = $1;`, [createdDocente.id]);
    console.log(`  Aulas asignadas automáticamente al docente (${aulasDocente.rows.length}):`);
    aulasDocente.rows.forEach((a: any) => console.log(`    - Aula ID ${a.id}: ${a.grado} "${a.seccion}"`));

    const estudiantesDocente = await query(`SELECT id, nombres, apellidos, codigo FROM estudiantes WHERE docente_id = $1;`, [createdDocente.id]);
    console.log(`  Estudiantes asignados al docente (${estudiantesDocente.rows.length} alumnos):`);
    estudiantesDocente.rows.slice(0, 3).forEach((e: any) => console.log(`    - [${e.codigo}] ${e.nombres} ${e.apellidos}`));
    console.log(`    ... y ${estudiantesDocente.rows.length - 3} estudiantes más.`);

    // Obtener un código de vinculación generado para la prueba posterior del apoderado
    const invRes = await query(`
      SELECT codigo_invitacion, estudiante_id 
      FROM invitaciones_vinculacion 
      WHERE docente_id = $1 AND usado = FALSE 
      LIMIT 1;
    `, [createdDocente.id]);
    const linkCode = invRes.rows[0]?.codigo_invitacion;
    console.log(`  Código de vinculación generado para apoderados: ${linkCode}`);

    console.log(`  ✅ ÉXITO: Docente registrado, contraseña encriptada con bcrypt y datos aislados creados en BD.\n`);
    passedSteps++;

    // -------------------------------------------------------------
    // PASO 5: Prueba real de inicio de sesión de Docente
    // -------------------------------------------------------------
    console.log('PASO 5: Probando INICIO DE SESIÓN del Docente...');
    
    // 5.1 Caso exitoso
    const userDb = await findUserByDni(TEST_DOCENTE_DNI);
    if (!userDb) throw new Error('Usuario docente no encontrado en la base de datos tras el registro.');

    const isValidPass = await comparePassword(TEST_DOCENTE_PASS, userDb.password_hash);
    if (!isValidPass) throw new Error('La validación de contraseña con comparePassword falló con la clave correcta.');

    const teacherToken = generateToken({
      userId: userDb.id,
      dni: userDb.dni,
      email: userDb.email,
      rol: userDb.rol,
      docenteId: createdDocente.id,
    });
    const verifiedTeacherToken = verifyToken(teacherToken);
    console.log(`  Login exitoso: Token emitido y validado para rol ${verifiedTeacherToken.rol} (Docente ID: ${verifiedTeacherToken.docenteId})`);

    // 5.2 Caso de contraseña incorrecta
    const isInvalidPass = await comparePassword('ClaveErronea123!', userDb.password_hash);
    if (isInvalidPass) throw new Error('Fallo de seguridad: la contraseña incorrecta fue aceptada.');
    console.log('  Seguridad comprobada: Contraseña incorrecta rechazada adecuadamente.');

    // 5.3 Caso de DNI inexistente
    const nonExistent = await findUserByDni('00000000');
    if (nonExistent !== null) throw new Error('Se encontró un usuario para un DNI inexistente.');
    console.log('  Seguridad comprobada: DNI no registrado rechazado adecuadamente.');

    console.log(`  ✅ ÉXITO: Flujo completo de inicio de sesión del Docente verificado con PostgreSQL.\n`);
    passedSteps++;

    // -------------------------------------------------------------
    // PASO 6: Prueba real de registro e inicio de sesión de Apoderado
    // -------------------------------------------------------------
    console.log('PASO 6: Probando REGISTRO e INICIO DE SESIÓN de Apoderado con vinculación...');
    const apoPassHash = await hashPassword(TEST_APODERADO_PASS);

    const { usuario: createdApoUser, apoderado: createdApo, estudianteVinculado } = await createApoderadoTransaction({
      dni: TEST_APODERADO_DNI,
      email: TEST_APODERADO_EMAIL,
      passwordHash: apoPassHash,
      nombres: 'Rosa María',
      apellidos: 'Pérez Gómez',
      telefono: '912345678',
      codigoVinculacion: linkCode,
    });

    console.log(`  Apoderado registrado: ID ${createdApo.id}, Usuario ID ${createdApoUser.id}, Rol: ${createdApoUser.rol}`);
    if (estudianteVinculado) {
      console.log(`  Estudiante vinculado con éxito: ${estudianteVinculado.nombres} ${estudianteVinculado.apellidos}`);
    } else {
      throw new Error('La vinculación del estudiante mediante el código falló.');
    }

    // Verificar login del apoderado
    const apoDb = await findUserByDni(TEST_APODERADO_DNI);
    if (!apoDb) throw new Error('Usuario apoderado no encontrado en la base de datos.');

    const isApoPassValid = await comparePassword(TEST_APODERADO_PASS, apoDb.password_hash);
    if (!isApoPassValid) throw new Error('Fallo al validar contraseña de apoderado.');

    const apoToken = generateToken({
      userId: apoDb.id,
      dni: apoDb.dni,
      email: apoDb.email,
      rol: apoDb.rol,
      apoderadoId: createdApo.id,
    });
    const verifiedApoToken = verifyToken(apoToken);
    console.log(`  Login exitoso: Token de apoderado emitido para rol ${verifiedApoToken.rol} (Apoderado ID: ${verifiedApoToken.apoderadoId})`);

    // Comprobar aislamiento: El apoderado NO debe tener rol DOCENTE
    if (apoDb.rol === 'DOCENTE') {
      throw new Error('Aislamiento comprometido: el apoderado recibió privilegios de DOCENTE.');
    }
    console.log('  Aislamiento comprobado: Apoderado no tiene acceso a perfil docente.');

    console.log(`  ✅ ÉXITO: Registro, vinculación e inicio de sesión del Apoderado verificados con PostgreSQL.\n`);
    passedSteps++;

    // -------------------------------------------------------------
    // RESUMEN FINAL
    // -------------------------------------------------------------
    console.log('================================================================');
    console.log(` RESULTADO FINAL: ${passedSteps} de ${totalSteps} pasos completados con éxito.`);
    console.log(' PostgreSQL, Migraciones y Autenticación 100% OPERATIVAS.');
    console.log('================================================================');
  } catch (error: any) {
    console.error('\n❌ ERROR EN LA VERIFICACIÓN REAL:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runRealVerification();
