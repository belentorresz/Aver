import { app } from './app.js';
import { config } from './config/env.js';
import { pool } from './database/connection.js';
import { runMigrations } from './database/migrator.js';

async function bootstrap() {
  console.log(`===============================================`);
  console.log(` Iniciando servidor AVer: "A ver cómo vamos" `);
  console.log(`===============================================`);

  // Intentar conectar y ejecutar migraciones si la base de datos está configurada
  if (config.DATABASE_URL) {
    try {
      const client = await pool.connect();
      console.log('Conexión exitosa a PostgreSQL mediante pg');
      client.release();
      await runMigrations();
    } catch (err: any) {
      console.error('Aviso: No se pudo conectar a PostgreSQL:', err.message);
      console.error('Verifique la variable DATABASE_URL en su archivo .env');
    }
  } else {
    console.warn('ADVERTENCIA: DATABASE_URL no está configurada en .env.');
    console.warn('Configure DATABASE_URL=postgresql://user:password@host:5432/dbname');
  }

  app.listen(config.PORT, () => {
    console.log(`Servidor API escuchando en puerto ${config.PORT}`);
    console.log(`Modo: ${config.NODE_ENV}`);
    console.log(`Endpoints base: http://localhost:${config.PORT}/api`);
  });
}

bootstrap();
