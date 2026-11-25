import pg from 'pg';
import { config } from '../config/env.js';

const { Pool } = pg;

// Configuración de pool de conexiones PostgreSQL nativo con `pg`
const isLocalDatabase =
  !config.DATABASE_URL ||
  config.DATABASE_URL.includes('localhost') ||
  config.DATABASE_URL.includes('127.0.0.1');

const requiresSsl =
  process.env.DB_SSL === 'true' ||
  config.DATABASE_URL.includes('render.com') ||
  config.DATABASE_URL.includes('neon.tech') ||
  config.DATABASE_URL.includes('supabase.co') ||
  (config.NODE_ENV === 'production' && !isLocalDatabase && process.env.DB_SSL !== 'false');

const poolConfig: pg.PoolConfig = config.DATABASE_URL
  ? {
      connectionString: config.DATABASE_URL,
      ssl: requiresSsl ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432', 10),
      database: process.env.PGDATABASE || 'aver_db',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
    };

export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Error imprevisto en el cliente de la base de datos PostgreSQL:', err.message);
});

// Función de consulta parametrizada segura contra inyección SQL
export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (config.NODE_ENV === 'development') {
    // console.log('Consulta ejecutada:', { text: text.trim().slice(0, 100), duration, rows: res.rowCount });
  }
  return res;
}

// Función para ejecutar bloques transaccionales
export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
