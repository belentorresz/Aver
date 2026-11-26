import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
import {
  validateBody,
  CreateAulaSchema,
  CreateEstudianteSchema,
  UpdateEstudianteSchema,
  BatchCreateEstudiantesSchema,
  SaveEvaluacionSchema,
  UpdateEvaluacionSchema,
  AgendaEventoSchema,
  CancelAgendaEventoSchema,
  CreateRecomendacionSchema,
  UpdateRecomendacionSchema,
  UpdateDocentePerfilSchema,
  UpdateDocenteFotoSchema,
} from '../middlewares/validation.middleware.js';
import {
  getAulas,
  addAula,
  removeAula,
  getEstudiantes,
  getEstudianteDetalle,
  getEstudianteAnalisis,
  addEstudiante,
  importEstudiantesBatch,
  regenerateCodigoEstudiante,
  editEstudiante,
  removeEstudiante,
  getAreas,
  getCriterios,
  getEvaluaciones,
  getEvaluacionDetalle,
  editEvaluacion,
  createEvaluacion,
  parseExcelFile,
  getAlertas,
  patchAlertaEstado,
  getDashboardResumen,
  getHistorial,
  getRecomendaciones,
  addRecomendacion,
  editRecomendacion,
  getAnalisisGrupal,
  getSugerenciasRefuerzo,
  getPerfilDocente,
  updatePerfilDocente,
  updatePerfilFotoDocente,
  deletePerfilFotoDocente,
} from '../controllers/docente.controller.js';
import {
  getDocenteAgenda,
  postDocenteAgenda,
  putDocenteAgenda,
  patchCancelDocenteAgenda,
} from '../controllers/agenda.controller.js';

export const docenteRouter = Router();

// Todas las rutas de docente requieren autenticación previa y rol DOCENTE
docenteRouter.use(authenticate, requireRole('DOCENTE'));

docenteRouter.get('/resumen', getDashboardResumen);
docenteRouter.get('/areas', getAreas);
docenteRouter.get('/criterios', getCriterios);

docenteRouter.get('/aulas', getAulas);
docenteRouter.post('/aulas', validateBody(CreateAulaSchema), addAula);
docenteRouter.delete('/aulas/:id', removeAula);

docenteRouter.get('/estudiantes', getEstudiantes);
docenteRouter.get('/estudiantes/:id', getEstudianteDetalle);
docenteRouter.get('/estudiantes/:id/analisis', getEstudianteAnalisis);
docenteRouter.post('/estudiantes', validateBody(CreateEstudianteSchema), addEstudiante);
docenteRouter.post('/estudiantes/batch', validateBody(BatchCreateEstudiantesSchema), importEstudiantesBatch);
docenteRouter.post('/estudiantes/:id/regenerar-codigo', regenerateCodigoEstudiante);
docenteRouter.put('/estudiantes/:id', validateBody(UpdateEstudianteSchema), editEstudiante);
docenteRouter.delete('/estudiantes/:id', removeEstudiante);

docenteRouter.get('/evaluaciones', getEvaluaciones);
docenteRouter.get('/evaluaciones/:id', getEvaluacionDetalle);
docenteRouter.put('/evaluaciones/:id', validateBody(UpdateEvaluacionSchema), editEvaluacion);
docenteRouter.post('/evaluaciones', validateBody(SaveEvaluacionSchema), createEvaluacion);
docenteRouter.post('/ocr/confirmar', validateBody(SaveEvaluacionSchema), createEvaluacion);
docenteRouter.post('/excel/parse', parseExcelFile);
docenteRouter.post('/excel/confirmar', validateBody(SaveEvaluacionSchema), createEvaluacion);

docenteRouter.get('/analisis-grupal', getAnalisisGrupal);
docenteRouter.get('/refuerzo/sugerencias', getSugerenciasRefuerzo);

docenteRouter.get('/alertas', getAlertas);
docenteRouter.patch('/alertas/:id', patchAlertaEstado);

docenteRouter.get('/historial', getHistorial);
docenteRouter.get('/recomendaciones', getRecomendaciones);
docenteRouter.post('/recomendaciones', validateBody(CreateRecomendacionSchema), addRecomendacion);
docenteRouter.put('/recomendaciones/:id', validateBody(UpdateRecomendacionSchema), editRecomendacion);

// Agenda compartida (Docente CRUD + Cancelación)
docenteRouter.get('/agenda', getDocenteAgenda);
docenteRouter.post('/agenda', validateBody(AgendaEventoSchema), postDocenteAgenda);
docenteRouter.put('/agenda/:id', validateBody(AgendaEventoSchema), putDocenteAgenda);
docenteRouter.patch('/agenda/:id/cancelar', validateBody(CancelAgendaEventoSchema), patchCancelDocenteAgenda);

// Perfil del docente autenticado
docenteRouter.get('/perfil', getPerfilDocente);
docenteRouter.put('/perfil', validateBody(UpdateDocentePerfilSchema), updatePerfilDocente);
docenteRouter.put('/perfil/foto', validateBody(UpdateDocenteFotoSchema), updatePerfilFotoDocente);
docenteRouter.delete('/perfil/foto', deletePerfilFotoDocente);
