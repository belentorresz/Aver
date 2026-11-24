import { Router } from 'express';
import {
  registerDocente,
  loginDocente,
  registerApoderado,
  loginApoderado,
  requestPasswordReset,
  resetPassword,
  getMe,
} from '../controllers/auth.controller.js';
import {
  validateBody,
  RegisterDocenteSchema,
  LoginDocenteSchema,
  RegisterApoderadoSchema,
  LoginApoderadoSchema,
  RequestPasswordResetSchema,
  ResetPasswordSchema,
} from '../middlewares/validation.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export const authRouter = Router();

// Docentes
authRouter.post('/docente/register', validateBody(RegisterDocenteSchema), registerDocente);
authRouter.post('/docente/login', validateBody(LoginDocenteSchema), loginDocente);

// Apoderados
authRouter.post('/apoderado/register', validateBody(RegisterApoderadoSchema), registerApoderado);
authRouter.post('/apoderado/login', validateBody(LoginApoderadoSchema), loginApoderado);

// Recuperación de contraseña (segura, común para ambos roles)
authRouter.post('/forgot-password', validateBody(RequestPasswordResetSchema), requestPasswordReset);
authRouter.post('/reset-password', validateBody(ResetPasswordSchema), resetPassword);

// Sesión actual
authRouter.get('/me', authenticate, getMe);
