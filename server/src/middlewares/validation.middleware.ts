import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((e) => e.message);
        res.status(400).json({
          success: false,
          message: errorMessages[0] || 'Error de validación en los datos enviados',
          errors: error.errors,
        });
        return;
      }
      res.status(400).json({ success: false, message: 'Datos de solicitud inválidos' });
    }
  };
}

// Esquemas Zod estrictos
export const RegisterDocenteSchema = z.object({
  nombres: z.string().min(2, 'Los nombres deben tener al menos 2 caracteres'),
  apellidos: z.string().min(2, 'Los apellidos deben tener al menos 2 caracteres'),
  dni: z.string().regex(/^\d{8}$/, 'El DNI debe tener exactamente 8 dígitos numéricos'),
  email: z.string().email('Debe ingresar un correo electrónico válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string(),
  institucionEducativa: z.string().min(3, 'Debe ingresar la institución educativa'),
  nivelEducativo: z.string().min(2, 'Debe especificar el nivel educativo'),
  telefono: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

export const LoginDocenteSchema = z.object({
  dni: z.string().regex(/^\d{8}$/, 'El DNI debe tener exactamente 8 dígitos'),
  password: z.string().min(1, 'Ingrese su contraseña'),
});

export const RegisterApoderadoSchema = z.object({
  nombres: z.string().min(2, 'Los nombres deben tener al menos 2 caracteres'),
  apellidos: z.string().min(2, 'Los apellidos deben tener al menos 2 caracteres'),
  dni: z.string().regex(/^\d{8}$/, 'El DNI debe tener exactamente 8 dígitos numéricos'),
  email: z.string().email('Debe ingresar un correo electrónico válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string(),
  telefono: z.string().optional(),
  codigoVinculacion: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

export const LoginApoderadoSchema = z.object({
  dni: z.string().regex(/^\d{8}$/, 'El DNI debe tener exactamente 8 dígitos'),
  password: z.string().min(1, 'Ingrese su contraseña'),
});

export const RequestPasswordResetSchema = z.object({
  dniOrEmail: z.string().min(3, 'Ingrese su DNI o correo electrónico registrado'),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(10, 'Token de recuperación inválido'),
  newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});
