import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import {
  findLinkedStudentsByApoderado,
  findStudentAcademicDetailsForGuardian,
  linkStudentWithCode,
} from '../database/queries/guardians.queries.js';

export async function getLinkedStudents(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const apoderadoId = req.user!.apoderadoId!;
    const estudiantes = await findLinkedStudentsByApoderado(apoderadoId);
    res.json({ success: true, data: estudiantes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getStudentDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const apoderadoId = req.user!.apoderadoId!;
    const estudianteId = parseInt(req.params.estudianteId, 10);

    const details = await findStudentAcademicDetailsForGuardian(apoderadoId, estudianteId);
    res.json({ success: true, data: details });
  } catch (error: any) {
    res.status(403).json({
      success: false,
      message: error.message || 'No autorizado para consultar este estudiante.',
    });
  }
}

export async function linkStudent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const apoderadoId = req.user!.apoderadoId!;
    const { codigo } = req.body;

    if (!codigo) {
      res.status(400).json({ success: false, message: 'Debe ingresar un código de vinculación válido.' });
      return;
    }

    const estudiante = await linkStudentWithCode(apoderadoId, codigo);
    res.json({
      success: true,
      message: `¡Estudiante ${estudiante.nombres} ${estudiante.apellidos} vinculado exitosamente a su cuenta!`,
      data: estudiante,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Código de vinculación inválido o expirado.',
    });
  }
}
