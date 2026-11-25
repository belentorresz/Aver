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

export const CreateAulaSchema = z.object({
  grado: z.string().min(2, 'Ingrese el grado del aula'),
  seccion: z.string().min(1, 'Ingrese la sección').max(10, 'Sección demasiado larga'),
  nivel: z.string().optional(),
  anioEscolar: z.string().optional(),
});

export const CreateEstudianteSchema = z.object({
  nombres: z.string().min(2, 'Ingrese los nombres del estudiante'),
  apellidos: z.string().min(2, 'Ingrese los apellidos del estudiante'),
  dni: z.string().regex(/^\d{8}$/, 'El DNI debe tener 8 dígitos').optional().or(z.literal('')),
  codigo: z.string().min(2, 'Ingrese un código único para el estudiante').optional().or(z.literal('')),
  aulaId: z.coerce.number().int().positive().optional().nullable(),
  colorAvatar: z.string().optional(),
});

export const UpdateEstudianteSchema = z.object({
  nombres: z.string().min(2, 'Ingrese los nombres del estudiante'),
  apellidos: z.string().min(2, 'Ingrese los apellidos del estudiante'),
  dni: z.string().regex(/^\d{8}$/, 'El DNI debe tener 8 dígitos').optional().or(z.literal('')),
  codigo: z.string().min(2, 'Código inválido').optional().or(z.literal('')),
  aulaId: z.coerce.number().int().positive().optional().nullable(),
  colorAvatar: z.string().optional(),
});

export const BatchCreateEstudiantesSchema = z.object({
  aulaId: z.coerce.number().int().positive('Debe seleccionar un aula válida'),
  estudiantes: z.array(z.object({
    nombres: z.string().min(1, 'El nombre es obligatorio'),
    apellidos: z.string().min(1, 'El apellido es obligatorio'),
    dni: z.string().optional().or(z.literal('')),
    codigo: z.string().optional().or(z.literal('')),
  })).min(1, 'Debe incluir al menos un estudiante para importar'),
});

export const SaveEvaluacionSchema = z.object({
  aulaId: z.coerce.number().int().positive().optional().nullable(),
  areaId: z.coerce.number().int().positive('Seleccione un área académica'),
  titulo: z.string().min(3, 'El título de la evaluación debe tener al menos 3 caracteres'),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  sesion: z.string().optional().nullable(),
  estado: z.enum(['BORRADOR', 'POR_REVISAR', 'COMPLETADA']).optional(),
  fuenteOrigen: z.enum(['DIRECTO', 'OCR', 'EXCEL']).default('DIRECTO'),
  preventDuplicate: z.boolean().optional(),
  archivo: z.object({
    nombreArchivo: z.string().min(1),
    tipo: z.enum(['EXCEL', 'IMAGEN_OCR']),
    datosReconocidos: z.any().optional(),
    datosCorregidos: z.any().optional(),
  }).optional(),
  criterios: z.array(z.object({
    id: z.coerce.number().int().positive().optional(),
    descripcion: z.string().min(3, 'La descripción del criterio es requerida'),
  })).min(1, 'Debe incluir al menos un criterio de evaluación'),
  resultados: z.array(z.object({
    estudianteId: z.coerce.number().int().positive(),
    criterioIndex: z.coerce.number().int().min(0),
    marca: z.enum(['LOGRADO', 'NO_LOGRADO', 'NO_OBSERVADO']),
    nivelLogro: z.enum(['AD', 'A', 'B', 'C']).optional().nullable(),
    observaciones: z.string().optional().nullable(),
  })).min(1, 'Debe incluir al menos un resultado de estudiante'),
});

export const AgendaEventoSchema = z.object({
  aulaId: z.coerce.number().int().positive().optional().nullable(),
  tipo: z.enum(['REUNION', 'EVALUACION', 'ACTIVIDAD', 'COMUNICADO']),
  titulo: z.string().min(3, 'El título del evento es obligatorio'),
  descripcion: z.string().default(''),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  horaInicio: z.string().optional().nullable(),
  horaFin: z.string().optional().nullable(),
  ubicacion: z.string().optional().nullable(),
  modalidad: z.enum(['PRESENCIAL', 'VIRTUAL', 'INFORMATIVO']).optional(),
  destinatariosTipo: z.enum(['TODOS', 'AULA', 'ESTUDIANTES']).default('AULA'),
  estudianteIds: z.array(z.coerce.number().int().positive()).optional(),
  estado: z.enum(['PROGRAMADO', 'COMPLETADO', 'CANCELADO']).optional(),
});

export const CancelAgendaEventoSchema = z.object({
  motivo: z.string().max(500).optional(),
});

export const CreateRecomendacionSchema = z.object({
  estudianteId: z.coerce.number().int().positive(),
  criterioId: z.coerce.number().int().positive().optional().nullable(),
  titulo: z.string().min(3, 'Ingrese el título de la actividad de refuerzo'),
  descripcion: z.string().min(5, 'Ingrese la descripción de la actividad'),
  estado: z.enum(['PROPUESTA', 'ACEPTADA', 'APLICADA', 'DESCARTADA']).optional(),
  fechaAplicacion: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
});

export const UpdateDocentePerfilSchema = z.object({
  nombres: z.string().trim().min(2, 'Los nombres deben tener al menos 2 caracteres').max(150),
  apellidos: z.string().trim().min(2, 'Los apellidos deben tener al menos 2 caracteres').max(150),
  email: z.string().trim().email('Debe ingresar un correo electrónico válido').max(255),
  telefono: z
    .string()
    .trim()
    .refine(
      (val) => val === '' || /^[0-9+\-\s()]{6,20}$/.test(val),
      'El teléfono debe tener entre 6 y 20 caracteres numéricos válidos'
    )
    .optional()
    .nullable(),
  institucionEducativa: z.string().trim().min(3, 'Debe ingresar la institución educativa').max(255),
  nivelEducativo: z.string().trim().min(2, 'Debe especificar el nivel educativo').max(100),
});

const MAX_PROFILE_PHOTO_BYTES = 3 * 1024 * 1024; // 3 MB

function isValidImageMagicBytes(buf: Buffer, mimeSubtype: string): boolean {
  if (buf.length < 12) return false;
  if (mimeSubtype === 'jpeg' || mimeSubtype === 'jpg') {
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (mimeSubtype === 'png') {
    return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  if (mimeSubtype === 'webp') {
    return (
      buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  return false;
}

export const UpdateDocenteFotoSchema = z.object({
  fotoPerfil: z.string().superRefine((val, ctx) => {
    const match = val.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Formato no permitido. Usa una imagen JPG, JPEG, PNG o WEBP.',
      });
      return;
    }
    const buf = Buffer.from(match[2], 'base64');
    if (buf.byteLength === 0 || buf.byteLength > MAX_PROFILE_PHOTO_BYTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La fotografía supera el límite máximo permitido de 3 MB.',
      });
      return;
    }
    if (!isValidImageMagicBytes(buf, match[1].toLowerCase())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El archivo no corresponde a una imagen JPG, PNG o WEBP válida.',
      });
    }
  }),
});
