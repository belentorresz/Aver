import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
import {
  getLinkedStudents,
  getStudentDetails,
  linkStudent,
} from '../controllers/apoderado.controller.js';

export const apoderadoRouter = Router();

// Todas las rutas de apoderado requieren autenticación previa y rol APODERADO
apoderadoRouter.use(authenticate, requireRole('APODERADO'));

// Estudiantes vinculados a la cuenta del apoderado
apoderadoRouter.get('/estudiantes', getLinkedStudents);

// Detalle académico y seguimiento de un estudiante específico autorizado
apoderadoRouter.get('/estudiantes/:estudianteId', getStudentDetails);

// Vincular nuevo estudiante mediante código de invitación
apoderadoRouter.post('/vincular', linkStudent);
