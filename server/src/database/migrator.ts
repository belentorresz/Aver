import fs from 'node:fs';
import path from 'node:path';
import { pool, query } from './connection.js';

export async function runMigrations() {
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
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const alreadyApplied = await query(
        'SELECT id FROM migrations_history WHERE migration_name = $1',
        [file]
      );

      if (alreadyApplied.rows.length === 0) {
        console.log(`Ejecutando migración: ${file}...`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');

        // Ejecutar script SQL completo
        await query(sql);

        // Registrar en historial
        await query(
          'INSERT INTO migrations_history (migration_name) VALUES ($1)',
          [file]
        );
        console.log(`Migración completada exitosamente: ${file}`);
      } else {
        // Ya ejecutada previamente
      }
    }
    console.log('--- Todas las migraciones están al día ---');
  } catch (error: any) {
    console.error('Error al ejecutar las migraciones SQL:', error.message);
    // No detenemos el servidor por completo si no hay DB configurada en local
    // para permitir inspección y mensaje claro al desarrollador
  }
}
