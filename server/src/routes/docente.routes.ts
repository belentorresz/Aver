import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
import {
  getAulas,
  getEstudiantes,
  getEstudianteDetalle,
  addEstudiante,
  getEvaluaciones,
  getAlertas,
} from '../controllers/docente.controller.js';

export const docenteRouter = Router();

// Todas las rutas de docente requieren autenticación previa y rol DOCENTE
docenteRouter.use(authenticate, requireRole('DOCENTE'));

docenteRouter.get('/aulas', getAulas);
docenteRouter.get('/estudiantes', getEstudiantes);
docenteRouter.get('/estudiantes/:id', getEstudianteDetalle);
docenteRouter.post('/estudiantes', addEstudiante);
docenteRouter.get('/evaluaciones', getEvaluaciones);
docenteRouter.get('/alertas', getAlertas);
