import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import {
  findAgendaEventosByDocente,
  createAgendaEvento,
  updateAgendaEvento,
  cancelAgendaEvento,
  findAgendaEventosByApoderado,
} from '../database/queries/agenda.queries.js';

export async function getDocenteAgenda(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docenteId = req.user!.docenteId!;
    const tipo = req.query.tipo as string | undefined;
    const estado = req.query.estado as string | undefined;
    const aulaId = req.query.aulaId ? parseInt(req.query.aulaId as string, 10) : undefined;

    const eventos = await findAgendaEventosByDocente(docenteId, {
      tipo,
      estado,
      aulaId: Number.isFinite(aulaId) ? aulaId : undefined,
    });
    res.json({ success: true, data: eventos });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function postDocenteAgenda(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docenteId = req.user!.docenteId!;
    const evento = await createAgendaEvento(docenteId, req.body);
    res.status(201).json({
      success: true,
      message: 'Evento creado y compartido correctamente en la agenda.',
      data: evento,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function putDocenteAgenda(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docenteId = req.user!.docenteId!;
    const eventoId = parseInt(req.params.id, 10);
    const updated = await updateAgendaEvento(docenteId, eventoId, req.body);
    if (!updated) {
      res.status(404).json({ success: false, message: 'Evento no encontrado o sin autorización.' });
      return;
    }
    res.json({
      success: true,
      message: 'Evento actualizado correctamente.',
      data: updated,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function patchCancelDocenteAgenda(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docenteId = req.user!.docenteId!;
    const eventoId = parseInt(req.params.id, 10);
    const { motivo } = req.body || {};
    const cancelled = await cancelAgendaEvento(docenteId, eventoId, motivo);
    if (!cancelled) {
      res.status(404).json({ success: false, message: 'Evento no encontrado o sin autorización.' });
      return;
    }
    res.json({
      success: true,
      message: 'Evento cancelado correctamente.',
      data: cancelled,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function getApoderadoAgenda(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const apoderadoId = req.user!.apoderadoId!;
    const estudianteId = req.query.estudianteId ? parseInt(req.query.estudianteId as string, 10) : undefined;
    const eventos = await findAgendaEventosByApoderado(
      apoderadoId,
      Number.isFinite(estudianteId) ? estudianteId : undefined
    );
    res.json({ success: true, data: eventos });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
