import dotenv from 'dotenv';
import path from 'node:path';
import pg from 'pg';

// Cargar variables de entorno desde .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { Client } = pg;

function maskConnectionString(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    if (parsed.password) {
      parsed.password = '********';
    }
    return parsed.toString();
  } catch {
    // Si no es una URL parseable estándar, enmascarar lo que esté entre : y @
    return urlStr.replace(/:([^@/]+)@/, ':********@');
  }
}

async function testConnection() {
  console.log('====================================================');
  console.log(' PRUEBA DE CONEXIÓN SEGURA A POSTGRESQL (pg directo)');
  console.log('====================================================');

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString || connectionString.trim() === '') {
    console.error('\n❌ ERROR: La variable DATABASE_URL no está definida en el archivo .env.');
    console.error('Configure DATABASE_URL en su archivo .env antes de ejecutar esta prueba.\n');
    process.exit(1);
  }

  let rawPassword = '';
  try {
    const parsed = new URL(connectionString);
    rawPassword = parsed.password ? decodeURIComponent(parsed.password) : '';
  } catch {
    const match = connectionString.match(/:([^@/]+)@/);
    if (match) rawPassword = match[1];
  }

  const sanitize = (text: string): string => {
    if (!text || !rawPassword) return text;
    return text.split(rawPassword).join('********');
  };

    const maskedUri = maskConnectionString(connectionString);
    console.log(`\nParámetro detectado (protegido): ${sanitize(maskedUri)}`);
  const client = new Client({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' || connectionString.includes('render.com') || connectionString.includes('neon.tech') || connectionString.includes('supabase.co')
      ? { rejectUnauthorized: false }
      : false,
    connectionTimeoutMillis: 5000,
  });

  try {
    console.log('Intentando conectar con el servidor PostgreSQL...');
    await client.connect();
    console.log('✅ Conexión establecida con éxito.');

    // Ejecutar consulta de prueba básica (sin ejecutar migraciones)
    const res = await client.query(`
      SELECT 
        current_database() AS nombre_bd,
        current_user AS usuario_actual,
        version() AS version_motor,
        NOW() AS fecha_servidor;
    `);

    const info = res.rows[0];
    console.log('\n--- INFORMACIÓN DE LA SESIÓN POSTGRESQL ---');
    console.log(`Base de datos activa : ${info.nombre_bd}`);
    console.log(`Usuario conectado    : ${info.usuario_actual}`);
    console.log(`Fecha del servidor   : ${info.fecha_servidor}`);
    console.log(`Versión del motor    : ${info.version_motor.split(' on ')[0]}`);
    console.log('-------------------------------------------\n');

    console.log('🎉 ESTADO: PostgreSQL está listo y accesible mediante el driver `pg` nativo.');
    console.log('⚠️  Recordatorio: No se han ejecutado migraciones todavía, tal como fue indicado.\n');

    await client.end();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ ERROR AL CONECTAR CON POSTGRESQL:');
    console.error(`Código de error : ${error.code || 'DESCONOCIDO'}`);
    console.error(`Mensaje         : ${sanitize(error.message)}`);
    
    if (error.code === '28P01') {
      console.error('\n💡 Causa probable: Contraseña incorrecta para el usuario indicado.');
    } else if (error.code === '3D000') {
      console.error('\n💡 Causa probable: La base de datos especificada no existe.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Causa probable: El servicio de PostgreSQL no se está ejecutando o el puerto (5432) no está disponible.');
    } else if (error.code === 'ENOTFOUND') {
      console.error('\n💡 Causa probable: El host especificado no fue encontrado.');
    }

    console.error('\nRevise su archivo .env y confirme sus credenciales locales.\n');
    await client.end().catch(() => {});
    process.exit(1);
  }
}

testConnection();
