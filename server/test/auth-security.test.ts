import { hashPassword, comparePassword, generateToken, verifyToken, generateSecureToken, hashString } from '../src/services/auth.service.js';
import { RegisterDocenteSchema, LoginDocenteSchema, RegisterApoderadoSchema, LoginApoderadoSchema } from '../src/middlewares/validation.middleware.js';
import fs from 'node:fs';
import path from 'node:path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    console.log(`  [PASS] ${desc}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${desc}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log(' EJECUTANDO PRUEBAS DE AUTENTICACIÓN Y SEGURIDAD');
  console.log('====================================================');

  // 1. Pruebas de Hashing de Contraseñas
  console.log('\n1. Verificación de Criptografía (bcrypt & SHA-256):');
  const plainPassword = 'ClaveSegura2026!';
  const hash = await hashPassword(plainPassword);
  assert(hash.startsWith('$2'), 'Contraseña cifrada con algoritmo bcrypt');
  assert(hash !== plainPassword, 'La contraseña no se almacena en texto plano');
  assert(await comparePassword(plainPassword, hash), 'Contraseña correcta valida correctamente');
  assert(!(await comparePassword('ClaveErronea', hash)), 'Contraseña incorrecta es rechazada');

  // 2. Tokens JWT y Payloads con Roles
  console.log('\n2. Verificación de Tokens JWT y Roles:');
  const teacherToken = generateToken({
    userId: 10,
    dni: '74839201',
    email: 'docente@aver.edu.pe',
    rol: 'DOCENTE',
    docenteId: 5,
  });
  const decodedTeacher = verifyToken(teacherToken);
  assert(decodedTeacher.rol === 'DOCENTE', 'Token de docente incluye rol DOCENTE');
  assert(decodedTeacher.docenteId === 5, 'Token incluye ID del perfil docente aislado');

  const guardianToken = generateToken({
    userId: 20,
    dni: '09876543',
    email: 'apoderado@correo.com',
    rol: 'APODERADO',
    apoderadoId: 8,
  });
  const decodedGuardian = verifyToken(guardianToken);
  assert(decodedGuardian.rol === 'APODERADO', 'Token de apoderado incluye rol APODERADO');
  assert(decodedGuardian.apoderadoId === 8, 'Token incluye ID del perfil apoderado');

  // 3. Validación de DNI estricto (8 dígitos)
  console.log('\n3. Validación de DNI (8 dígitos exactos) y Esquemas Zod:');
  const validDocenteData = {
    nombres: 'María Elena',
    apellidos: 'Salazar Gómez',
    dni: '74839201',
    email: 'maria@escuela.pe',
    password: 'password123',
    confirmPassword: 'password123',
    institucionEducativa: 'I.E. 2084 San Lorenzo',
    nivelEducativo: 'Primaria',
  };

  const validParsed = RegisterDocenteSchema.safeParse(validDocenteData);
  assert(validParsed.success, 'Registro docente con datos válidos y DNI de 8 dígitos es aceptado');

  const invalidDniData = { ...validDocenteData, dni: '74839' };
  const invalidDniParsed = RegisterDocenteSchema.safeParse(invalidDniData);
  assert(!invalidDniParsed.success, 'DNI con menos de 8 dígitos es rechazado');

  const alphaDniData = { ...validDocenteData, dni: '7483920A' };
  const alphaDniParsed = RegisterDocenteSchema.safeParse(alphaDniData);
  assert(!alphaDniParsed.success, 'DNI con caracteres alfanuméricos es rechazado');

  const mismatchPassData = { ...validDocenteData, confirmPassword: 'differentPassword' };
  const mismatchParsed = RegisterDocenteSchema.safeParse(mismatchPassData);
  assert(!mismatchParsed.success, 'Contraseñas que no coinciden son rechazadas');

  // 4. Tokens seguros de recuperación
  console.log('\n4. Tokens temporales de recuperación de contraseña:');
  const { token, hash: tokenHash } = generateSecureToken();
  assert(token.length >= 32, 'Token seguro tiene longitud criptográfica suficiente');
  assert(hashString(token) === tokenHash, 'Hash SHA-256 del token de recuperación coincide exactamente');

  // 5. Verificación de Migraciones SQL
  console.log('\n5. Verificación del Esquema SQL (001_initial_schema.sql):');
  const schemaPath = path.resolve(process.cwd(), 'server', 'database', 'migrations', '001_initial_schema.sql');
  assert(fs.existsSync(schemaPath), 'Archivo 001_initial_schema.sql existe');
  const sqlContent = fs.readFileSync(schemaPath, 'utf-8');

  const requiredTables = [
    'usuarios',
    'docentes',
    'apoderados',
    'instituciones',
    'estudiantes',
    'aulas',
    'relaciones_apoderado_estudiante',
    'areas_academicas',
    'criterios_evaluacion',
    'evaluaciones',
    'resultados_academicos',
    'archivos_importados',
    'revisiones_ocr',
    'alertas',
    'seguimientos',
    'recomendaciones',
    'tokens_recuperacion',
    'tokens_verificacion',
    'invitaciones_vinculacion',
    'registros_auditoria',
    'migrations_history',
  ];

  for (const table of requiredTables) {
    const tableRegex = new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`, 'i');
    assert(tableRegex.test(sqlContent), `Tabla relacional '${table}' definida en SQL`);
  }

  // 6. Verificación de aislamiento en consultas
  console.log('\n6. Verificación de cláusulas de aislamiento de docentes:');
  const studentQueryPath = path.resolve(process.cwd(), 'server', 'src', 'database', 'queries', 'students.queries.ts');
  const studentSql = fs.readFileSync(studentQueryPath, 'utf-8');
  assert(studentSql.includes('WHERE e.docente_id = $1'), 'Consultas de estudiantes filtran estrictamente por docente_id');
  assert(studentSql.includes('WHERE e.id = $1 AND e.docente_id = $2'), 'Consulta individual de estudiante comprueba propiedad del docente');

  const guardianQueryPath = path.resolve(process.cwd(), 'server', 'src', 'database', 'queries', 'guardians.queries.ts');
  const guardianSql = fs.readFileSync(guardianQueryPath, 'utf-8');
  assert(guardianSql.includes("estado_vinculacion = 'ACTIVO'"), 'Acceso de apoderado restringido únicamente a relaciones con estado ACTIVO');

  console.log('\n====================================================');
  console.log(` RESULTADO FINAL: ${passed} pasadas, ${failed} fallidas`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
