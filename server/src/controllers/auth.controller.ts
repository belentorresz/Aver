import { Request, Response } from 'express';
import {
  findUserByDni,
  findUserByEmail,
  findDocenteByUsuarioId,
  findApoderadoByUsuarioId,
  createDocenteTransaction,
  createApoderadoTransaction,
  createPasswordResetToken,
  findValidResetToken,
  updateUserPassword,
  markResetTokenUsed,
} from '../database/queries/users.queries.js';
import {
  hashPassword,
  comparePassword,
  generateToken,
  generateSecureToken,
  hashString,
} from '../services/auth.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export async function registerDocente(req: Request, res: Response): Promise<void> {
  try {
    const { nombres, apellidos, dni, email, password, institucionEducativa, nivelEducativo, telefono } = req.body;

    // 1. Validar unicidad de DNI
    const existingDni = await findUserByDni(dni);
    if (existingDni) {
      res.status(409).json({
        success: false,
        message: 'Ya existe una cuenta registrada con este número de DNI.',
      });
      return;
    }

    // 2. Validar unicidad de correo
    const existingEmail = await findUserByEmail(email);
    if (existingEmail) {
      res.status(409).json({
        success: false,
        message: 'Ya existe una cuenta registrada con este correo electrónico.',
      });
      return;
    }

    // 3. Hashear contraseña con bcrypt
    const passwordHash = await hashPassword(password);

    // 4. Crear usuario y docente en transacción SQL
    const { usuario, docente } = await createDocenteTransaction({
      dni,
      email,
      passwordHash,
      nombres,
      apellidos,
      institucionEducativa,
      nivelEducativo,
      telefono,
    });

    // 5. Generar token JWT
    const token = generateToken({
      userId: usuario.id,
      dni: usuario.dni,
      email: usuario.email,
      rol: 'DOCENTE',
      docenteId: docente.id,
    });

    res.status(201).json({
      success: true,
      message: 'Docente registrado exitosamente. Se ha enviado un enlace de verificación a su correo.',
      token,
      user: {
        id: usuario.id,
        dni: usuario.dni,
        email: usuario.email,
        rol: usuario.rol,
        docente: {
          id: docente.id,
          nombres: docente.nombres,
          apellidos: docente.apellidos,
          institucionEducativa: docente.institucion_educativa,
          nivelEducativo: docente.nivel_educativo,
        },
      },
    });
  } catch (error: any) {
    console.error('Error en registerDocente:', error);
    res.status(500).json({
      success: false,
      message: 'Ocurrió un error al procesar el registro del docente: ' + error.message,
    });
  }
}

export async function loginDocente(req: Request, res: Response): Promise<void> {
  try {
    const { dni, password } = req.body;

    // 1. Buscar usuario por DNI
    const usuario = await findUserByDni(dni);
    if (!usuario) {
      res.status(401).json({
        success: false,
        message: 'DNI o contraseña incorrectos.',
      });
      return;
    }

    // 2. Verificar que el rol sea DOCENTE
    if (usuario.rol !== 'DOCENTE') {
      res.status(403).json({
        success: false,
        message: 'Esta cuenta no tiene perfil docente. Ingrese por el acceso de apoderados.',
      });
      return;
    }

    // 3. Validar contraseña
    const passwordMatches = await comparePassword(password, usuario.password_hash);
    if (!passwordMatches) {
      res.status(401).json({
        success: false,
        message: 'DNI o contraseña incorrectos.',
      });
      return;
    }

    if (!usuario.activo) {
      res.status(403).json({
        success: false,
        message: 'Su cuenta está inactiva. Comuníquese con la administración.',
      });
      return;
    }

    // 4. Obtener perfil docente
    const docente = await findDocenteByUsuarioId(usuario.id);
    if (!docente) {
      res.status(500).json({
        success: false,
        message: 'No se encontró el perfil de docente asociado.',
      });
      return;
    }

    // 5. Emitir JWT
    const token = generateToken({
      userId: usuario.id,
      dni: usuario.dni,
      email: usuario.email,
      rol: 'DOCENTE',
      docenteId: docente.id,
    });

    res.json({
      success: true,
      message: `¡Bienvenida/o, docente ${docente.nombres}!`,
      token,
      user: {
        id: usuario.id,
        dni: usuario.dni,
        email: usuario.email,
        rol: usuario.rol,
        docente: {
          id: docente.id,
          nombres: docente.nombres,
          apellidos: docente.apellidos,
          institucionEducativa: docente.institucion_educativa,
          nivelEducativo: docente.nivel_educativo,
        },
      },
    });
  } catch (error: any) {
    console.error('Error en loginDocente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión: ' + error.message,
    });
  }
}

export async function registerApoderado(req: Request, res: Response): Promise<void> {
  try {
    const { nombres, apellidos, dni, email, password, telefono, codigoVinculacion } = req.body;

    const existingDni = await findUserByDni(dni);
    if (existingDni) {
      res.status(409).json({
        success: false,
        message: 'Ya existe una cuenta registrada con este número de DNI.',
      });
      return;
    }

    const existingEmail = await findUserByEmail(email);
    if (existingEmail) {
      res.status(409).json({
        success: false,
        message: 'Ya existe una cuenta registrada con este correo electrónico.',
      });
      return;
    }

    const passwordHash = await hashPassword(password);

    const { usuario, apoderado, estudianteVinculado } = await createApoderadoTransaction({
      dni,
      email,
      passwordHash,
      nombres,
      apellidos,
      telefono,
      codigoVinculacion,
    });

    const token = generateToken({
      userId: usuario.id,
      dni: usuario.dni,
      email: usuario.email,
      rol: 'APODERADO',
      apoderadoId: apoderado.id,
    });

    res.status(201).json({
      success: true,
      message: estudianteVinculado
        ? `Apoderado registrado y vinculado con éxito a ${estudianteVinculado.nombres} ${estudianteVinculado.apellidos}.`
        : 'Apoderado registrado con éxito. Podrá vincular a su estudiante con el código otorgado por su docente.',
      token,
      user: {
        id: usuario.id,
        dni: usuario.dni,
        email: usuario.email,
        rol: usuario.rol,
        apoderado: {
          id: apoderado.id,
          nombres: apoderado.nombres,
          apellidos: apoderado.apellidos,
        },
        estudianteVinculado,
      },
    });
  } catch (error: any) {
    console.error('Error en registerApoderado:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al procesar el registro del apoderado',
    });
  }
}

export async function loginApoderado(req: Request, res: Response): Promise<void> {
  try {
    const { dni, password } = req.body;

    const usuario = await findUserByDni(dni);
    if (!usuario) {
      res.status(401).json({
        success: false,
        message: 'DNI o contraseña incorrectos.',
      });
      return;
    }

    if (usuario.rol !== 'APODERADO') {
      res.status(403).json({
        success: false,
        message: 'Esta cuenta pertenece al perfil docente. Ingrese por el acceso de docentes.',
      });
      return;
    }

    const passwordMatches = await comparePassword(password, usuario.password_hash);
    if (!passwordMatches) {
      res.status(401).json({
        success: false,
        message: 'DNI o contraseña incorrectos.',
      });
      return;
    }

    const apoderado = await findApoderadoByUsuarioId(usuario.id);
    if (!apoderado) {
      res.status(500).json({
        success: false,
        message: 'No se encontró el perfil de apoderado asociado.',
      });
      return;
    }

    const token = generateToken({
      userId: usuario.id,
      dni: usuario.dni,
      email: usuario.email,
      rol: 'APODERADO',
      apoderadoId: apoderado.id,
    });

    res.json({
      success: true,
      message: `¡Bienvenida/o, ${apoderado.nombres}!`,
      token,
      user: {
        id: usuario.id,
        dni: usuario.dni,
        email: usuario.email,
        rol: usuario.rol,
        apoderado: {
          id: apoderado.id,
          nombres: apoderado.nombres,
          apellidos: apoderado.apellidos,
        },
      },
    });
  } catch (error: any) {
    console.error('Error en loginApoderado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión: ' + error.message,
    });
  }
}

export async function requestPasswordReset(req: Request, res: Response): Promise<void> {
  try {
    const { dniOrEmail } = req.body;

    // Regla de seguridad: NO revelar si el usuario o DNI existe
    const genericResponse = {
      success: true,
      message: 'Si la información ingresada corresponde a una cuenta registrada, se ha enviado un enlace seguro para restablecer su contraseña.',
    };

    let usuario = null;
    if (/^\d{8}$/.test(dniOrEmail.trim())) {
      usuario = await findUserByDni(dniOrEmail.trim());
    } else {
      usuario = await findUserByEmail(dniOrEmail.trim());
    }

    if (!usuario) {
      res.json(genericResponse);
      return;
    }

    const { token, hash } = generateSecureToken();
    const expiraEn = new Date(Date.now() + 1000 * 60 * 60 * 2); // 2 horas

    await createPasswordResetToken(usuario.id, hash, expiraEn);

    // En ambiente de desarrollo, adjuntamos el token para pruebas fáciles
    res.json({
      ...genericResponse,
      ...(process.env.NODE_ENV !== 'production' && {
        devResetToken: token,
        devInfo: `Token de recuperación generado para pruebas: ${token}`,
      }),
    });
  } catch (error: any) {
    console.error('Error en requestPasswordReset:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar la solicitud de recuperación.',
    });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { token, newPassword } = req.body;
    const tokenHash = hashString(token);

    const tokenRow = await findValidResetToken(tokenHash);
    if (!tokenRow) {
      res.status(400).json({
        success: false,
        message: 'El enlace o código de recuperación es inválido o ya ha expirado.',
      });
      return;
    }

    const passwordHash = await hashPassword(newPassword);
    await updateUserPassword(tokenRow.usuario_id, passwordHash);
    await markResetTokenUsed(tokenRow.id);

    res.json({
      success: true,
      message: 'Su contraseña ha sido actualizada exitosamente. Ya puede iniciar sesión con su nueva clave.',
    });
  } catch (error: any) {
    console.error('Error en resetPassword:', error);
    res.status(500).json({
      success: false,
      message: 'Error al restablecer la contraseña: ' + error.message,
    });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }

    const usuario = await findUserByDni(req.user.dni);
    if (!usuario) {
      res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      return;
    }

    let docente = null;
    let apoderado = null;

    if (usuario.rol === 'DOCENTE') {
      docente = await findDocenteByUsuarioId(usuario.id);
    } else if (usuario.rol === 'APODERADO') {
      apoderado = await findApoderadoByUsuarioId(usuario.id);
    }

    res.json({
      success: true,
      user: {
        id: usuario.id,
        dni: usuario.dni,
        email: usuario.email,
        rol: usuario.rol,
        docente,
        apoderado,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
