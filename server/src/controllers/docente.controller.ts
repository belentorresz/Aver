import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import {
  findAulasByDocente,
  findEstudiantesByDocente,
  findEstudianteByIdAndDocente,
  createEstudiante,
} from '../database/queries/students.queries.js';
import {
  findEvaluacionesByDocente,
  findAlertasByDocente,
} from '../database/queries/evaluations.queries.js';

export async function getAulas(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docenteId = req.user!.docenteId!;
    const aulas = await findAulasByDocente(docenteId);
    res.json({ success: true, data: aulas });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getEstudiantes(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docenteId = req.user!.docenteId!;
    const aulaId = req.query.aulaId ? parseInt(req.query.aulaId as string, 10) : undefined;
    const estudiantes = await findEstudiantesByDocente(docenteId, aulaId);
    res.json({ success: true, data: estudiantes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getEstudianteDetalle(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docenteId = req.user!.docenteId!;
    const estudianteId = parseInt(req.params.id, 10);
    const estudiante = await findEstudianteByIdAndDocente(estudianteId, docenteId);

    if (!estudiante) {
      res.status(404).json({
        success: false,
        message: 'Estudiante no encontrado o no pertenece a sus aulas autorizadas.',
      });
      return;
    }

    res.json({ success: true, data: estudiante });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function addEstudiante(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docenteId = req.user!.docenteId!;
    const { nombres, apellidos, dni, codigo, aulaId, colorAvatar } = req.body;

    const estudiante = await createEstudiante(docenteId, {
      nombres,
      apellidos,
      dni,
      codigo,
      aulaId: aulaId ? parseInt(aulaId, 10) : undefined,
      colorAvatar,
    });

    res.status(201).json({
      success: true,
      message: 'Estudiante registrado correctamente en su aula.',
      data: estudiante,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function getEvaluaciones(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docenteId = req.user!.docenteId!;
    const aulaId = req.query.aulaId ? parseInt(req.query.aulaId as string, 10) : undefined;
    const evaluaciones = await findEvaluacionesByDocente(docenteId, aulaId);
    res.json({ success: true, data: evaluaciones });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getAlertas(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docenteId = req.user!.docenteId!;
    const alertas = await findAlertasByDocente(docenteId);
    res.json({ success: true, data: alertas });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
