import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import { authRouter } from './routes/auth.routes.js';
import { docenteRouter } from './routes/docente.routes.js';
import { apoderadoRouter } from './routes/apoderado.routes.js';
import { config } from './config/env.js';

export const app = express();

// Seguridad con Helmet (permitiendo CSP para scripts locales si sirve frontend)
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// Habilitar CORS
app.use(
  cors({
    origin: config.NODE_ENV === 'production' ? true : [config.CLIENT_URL, 'http://localhost:8443', 'http://localhost:5173'],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas de API REST
app.use('/api/auth', authRouter);
app.use('/api/docente', docenteRouter);
app.use('/api/apoderado', apoderadoRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AVer API Backend',
    database: 'PostgreSQL (pg nativo)',
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// En producción (Render), servir la aplicación compilada de frontend Vite
if (config.NODE_ENV === 'production') {
  const distPath = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Middleware de manejo de errores global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error no controlado en la aplicación:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
  });
});
