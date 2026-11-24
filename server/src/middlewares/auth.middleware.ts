import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../services/auth.service.js';
import { findUserById, findDocenteByUsuarioId, findApoderadoByUsuarioId } from '../database/queries/users.queries.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Acceso no autorizado: Debe iniciar sesión para continuar.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyToken(token);
    const user = await findUserById(payload.userId);

    if (!user || !user.activo) {
      res.status(401).json({
        success: false,
        message: 'Sesión inválida o cuenta desactivada.',
      });
      return;
    }

    // Asegurar IDs de perfil si no vinieron en el token
    if (payload.rol === 'DOCENTE' && !payload.docenteId) {
      const docente = await findDocenteByUsuarioId(payload.userId);
      if (docente) payload.docenteId = docente.id;
    } else if (payload.rol === 'APODERADO' && !payload.apoderadoId) {
      const apoderado = await findApoderadoByUsuarioId(payload.userId);
      if (apoderado) payload.apoderadoId = apoderado.id;
    }

    req.user = payload;
    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      message: 'Token de sesión expirado o inválido. Inicie sesión nuevamente.',
    });
  }
}

export function requireRole(allowedRole: 'DOCENTE' | 'APODERADO') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }

    if (req.user.rol !== allowedRole) {
      res.status(403).json({
        success: false,
        message: `Acceso restringido: Esta sección requiere rol de ${allowedRole}.`,
      });
      return;
    }

    next();
  };
}
