import fs from 'node:fs';
import path from 'node:path';
import { pool, query, withTransaction } from './connection.js';

export async function runMigrations(): Promise<boolean> {
  console.log('--- Iniciando verificación de migraciones PostgreSQL ---');
  try {
    // 1. Asegurar tabla de historial de migraciones
    await query(`
      CREATE TABLE IF NOT EXISTS migrations_history (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Leer archivos .sql del directorio de migraciones
    const migrationsDir = path.resolve(process.cwd(), 'server', 'database', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.warn(`Directorio de migraciones no encontrado en: ${migrationsDir}`);
      return false;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    let appliedCount = 0;

    for (const file of files) {
      const alreadyApplied = await query(
        'SELECT id FROM migrations_history WHERE migration_name = $1',
        [file]
      );

      if (alreadyApplied.rows.length === 0) {
        console.log(`Ejecutando migración: ${file}...`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');

        // Ejecutar script SQL completo de manera transaccional
        await withTransaction(async (client) => {
          await client.query(sql);
          // Registrar en historial dentro de la misma transacción
          await client.query(
            'INSERT INTO migrations_history (migration_name) VALUES ($1)',
            [file]
          );
        });

        console.log(`✅ Migración completada exitosamente: ${file}`);
        appliedCount++;
      } else {
        console.log(`ℹ️  Migración ya aplicada previamente: ${file}`);
      }
    }

    if (appliedCount > 0) {
      console.log(`--- Se aplicaron ${appliedCount} migraciones exitosamente ---`);
    } else {
      console.log('--- Todas las migraciones están al día (0 pendientes) ---');
    }
    return true;
  } catch (error: any) {
    console.error('❌ Error al ejecutar las migraciones SQL:', error.message);
    throw error;
  }
}


// Soporte para ejecución directa vía CLI exclusivamente con: npm run migrate
const isDirectExecution = Boolean(
  process.argv[1] &&
  (
    process.argv[1].endsWith('migrator.ts') ||
    process.argv[1].endsWith('migrator.js')
  )
);

if (isDirectExecution) {
  (async () => {
    try {
      await runMigrations();
      console.log('Migraciones ejecutadas exitosamente.');
    } catch (err: any) {
      console.error(
        'Error durante la ejecución de migraciones:',
        err.message
      );
      process.exitCode = 1;
    } finally {
      try {
        await pool.end();
      } catch (closeError: any) {
        console.error('Error al cerrar el pool:', closeError.message);
        process.exitCode = 1;
      }
    }
  })();
}
