import { Response } from 'express';
import * as XLSX from 'xlsx';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import {
  findAulasByDocente,
  createAula,
  deleteAula,
  findEstudiantesByDocente,
  findEstudianteByIdAndDocente,
  findEstudianteAnalisisCompleto,
  createEstudiante,
  createEstudiantesBatch,
  regenerateStudentLinkCode,
  updateEstudiante,
  deleteEstudiante,
} from '../database/queries/students.queries.js';
import {
  findAreasAcademicas,
  findCriteriosByDocente,
  findEvaluacionesByDocente,
  findAlertasByDocente,
  updateAlertaEstado,
  saveEvaluacionCompletaTransaction,
  findDashboardResumen,
  findHistorialByDocente,
  findRecomendacionesByDocente,
  createRecomendacion,
} from '../database/queries/evaluations.queries.js';
import {
  findDocenteProfileByUsuarioId,
  updateDocenteProfileTransaction,
  updateDocenteFotoPerfil,
} from '../database/queries/users.queries.js';

export async function getAulas(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docenteId = req.user!.docenteId!;
    const aulas = await findAulasByDocente(docenteId);
    res.json({ success: true, data: aulas });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function addAula(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docenteId = req.user!.docenteId!;
    const aula = await createAula(docenteId, req.body);
    res.status(201).json({ success: true, message: 'Aula creada correctamente.', data: aula });
  } catch (error: any) {
    const status = error.code === '23505' ? 409 : 400;
    const message = error.code === '23505' ? 'Ya existe un aula con ese grado, sección y año escolar.' : error.message;
    res.status(status).json({ success: false, message });
  }
}

export async function importEstudiantesBatch(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docenteId = req.user!.docenteId!;
    const { aulaId, estudiantes } = req.body;

    const result = await createEstudiantesBatch(docenteId, Number(aulaId), estudiantes);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function regenerateCodigoEstudiante(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docenteId = req.user!.docenteId!;
    const estudianteId = parseInt(req.params.id, 10);

    const result = await regenerateStudentLinkCode(docenteId, estudianteId);
    res.json({
      success: true,
      message: 'Código de vinculación regenerado exitosamente.',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function editEstudiante(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docenteId = req.user!.docenteId!;
    const estudianteId = parseInt(req.params.id, 10);

    const updated = await updateEstudiante(docenteId, estudianteId, req.body);
    res.json({
      success: true,
      message: 'Datos del estudiante actualizados correctamente.',
      data: updated,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function removeEstudiante(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docenteId = req.user!.docenteId!;
    const estudianteId = parseInt(req.params.id, 10);

    await deleteEstudiante(docenteId, estudianteId);
    res.json({
      success: true,
      message: 'Estudiante eliminado correctamente del registro.',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function removeAula(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docenteId = req.user!.docenteId!;
    const aulaId = parseInt(req.params.id, 10);

    await deleteAula(docenteId, aulaId);
    res.json({
      success: true,
      message: 'Aula eliminada correctamente.',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function getEstudiantes(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docenteId = req.user!.docenteId!;
    const aulaId = req.query.aulaId ? parseInt(req.query.aulaId as string, 10) : undefined;
    const estudiantes = await findEstudiantesByDocente(docenteId, Number.isFinite(aulaId) ? aulaId : undefined);
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

export async function getEstudianteAnalisis(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docenteId = req.user!.docenteId!;
    const estudianteId = parseInt(req.params.id, 10);
    const analisis = await findEstudianteAnalisisCompleto(estudianteId, docenteId);

    if (!analisis) {
      res.status(404).json({
        success: false,
        message: 'Estudiante no encontrado o no pertenece a sus aulas autorizadas.',
      });
      return;
    }

    res.json({ success: true, data: analisis });
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
      dni: dni || undefined,
      codigo,
      aulaId: aulaId ? Number(aulaId) : undefined,
      colorAvatar,
    });

    res.status(201).json({
      success: true,
      message: 'Estudiante registrado correctamente en su aula.',
      data: estudiante,
    });
  } catch (error: any) {
    const status = error.code === '23505' ? 409 : 400;
    const message = error.code === '23505' ? 'Ya existe un estudiante con ese código en su registro.' : error.message;
    res.status(status).json({ success: false, message });
  }
}

export async function getAreas(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const areas = await findAreasAcademicas();
    res.json({ success: true, data: areas });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getCriterios(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docenteId = req.user!.docenteId!;
    const areaId = req.query.areaId ? parseInt(req.query.areaId as string, 10) : undefined;
    const criterios = await findCriteriosByDocente(docenteId, Number.isFinite(areaId) ? areaId : undefined);
    res.json({ success: true, data: criterios });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getEvaluaciones(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docenteId = req.user!.docenteId!;
    const aulaId = req.query.aulaId ? parseInt(req.query.aulaId as string, 10) : undefined;
    const evaluaciones = await findEvaluacionesByDocente(docenteId, Number.isFinite(aulaId) ? aulaId : undefined);
    res.json({ success: true, data: evaluaciones });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createEvaluacion(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docenteId = req.user!.docenteId!;
    const saved = await saveEvaluacionCompletaTransaction(docenteId, req.body);
    res.status(201).json({
      success: true,
      message: `Evaluación guardada correctamente (${saved.resultadosGuardados} resultados registrados).`,
      data: saved,
    });
  } catch (error: any) {
    res.status(error.status || 400).json({ success: false, message: error.message });
  }
}

export async function parseExcelFile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { fileName, base64Data, sheetName } = req.body;
    if (!base64Data || typeof base64Data !== 'string') {
      res.status(400).json({ success: false, message: 'No se recibió contenido del archivo Excel.' });
      return;
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames;
    if (sheetNames.length === 0) {
      res.status(400).json({ success: false, message: 'El archivo Excel no contiene hojas válidas.' });
      return;
    }

    const targetSheet = sheetName && sheetNames.includes(sheetName) ? sheetName : sheetNames[0];
    const sheet = workbook.Sheets[targetSheet];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

    res.json({
      success: true,
      data: {
        fileName: fileName || 'archivo.xlsx',
        sheetNames,
        activeSheet: targetSheet,
        headers,
        rows,
      },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: `Error al analizar el archivo Excel: ${error.message}` });
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

export async function patchAlertaEstado(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docenteId = req.user!.docenteId!;
    const alertaId = parseInt(req.params.id, 10);
    const { estado } = req.body;
    if (!['ACTIVA', 'REVISADA', 'DESCARTADA'].includes(estado)) {
      res.status(400).json({ success: false, message: 'Estado de alerta inválido.' });
      return;
    }
    const updated = await updateAlertaEstado(docenteId, alertaId, estado);
    if (!updated) {
      res.status(404).json({ success: false, message: 'Alerta no encontrada.' });
      return;
    }
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getDashboardResumen(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docenteId = req.user!.docenteId!;
    const resumen = await findDashboardResumen(docenteId);
    res.json({ success: true, data: resumen });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getHistorial(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docenteId = req.user!.docenteId!;
    const aulaId = req.query.aulaId ? parseInt(req.query.aulaId as string, 10) : undefined;
    const historial = await findHistorialByDocente(docenteId, Number.isFinite(aulaId) ? aulaId : undefined);
    res.json({ success: true, data: historial });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getRecomendaciones(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docenteId = req.user!.docenteId!;
    const recomendaciones = await findRecomendacionesByDocente(docenteId);
    res.json({ success: true, data: recomendaciones });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function addRecomendacion(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const docenteId = req.user!.docenteId!;
    const rec = await createRecomendacion(docenteId, req.body);
    res.status(201).json({ success: true, message: 'Actividad de refuerzo registrada correctamente.', data: rec });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function getPerfilDocente(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const usuarioId = req.user!.userId;
    const user = await findDocenteProfileByUsuarioId(usuarioId);
    if (!user) {
      res.status(404).json({ success: false, message: 'Perfil docente no encontrado.' });
      return;
    }
    res.json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updatePerfilDocente(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const usuarioId = req.user!.userId;
    const docenteId = req.user!.docenteId!;
    const { nombres, apellidos, email, telefono, institucionEducativa, nivelEducativo } = req.body;

    const updatedUser = await updateDocenteProfileTransaction(usuarioId, docenteId, {
      nombres,
      apellidos,
      email,
      telefono,
      institucionEducativa,
      nivelEducativo,
    });

    res.json({
      success: true,
      message: 'Perfil actualizado correctamente en PostgreSQL.',
      user: updatedUser,
    });
  } catch (error: any) {
    res.status(error.status || 400).json({ success: false, message: error.message });
  }
}

export async function updatePerfilFotoDocente(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const usuarioId = req.user!.userId;
    const docenteId = req.user!.docenteId!;
    const { fotoPerfil } = req.body;

    const updatedUser = await updateDocenteFotoPerfil(usuarioId, docenteId, fotoPerfil);
    if (!updatedUser) {
      res.status(404).json({ success: false, message: 'Perfil docente no encontrado.' });
      return;
    }

    res.json({
      success: true,
      message: 'Fotografía de perfil guardada correctamente.',
      user: updatedUser,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function deletePerfilFotoDocente(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const usuarioId = req.user!.userId;
    const docenteId = req.user!.docenteId!;

    const updatedUser = await updateDocenteFotoPerfil(usuarioId, docenteId, null);
    if (!updatedUser) {
      res.status(404).json({ success: false, message: 'Perfil docente no encontrado.' });
      return;
    }

    res.json({
      success: true,
      message: 'Fotografía de perfil eliminada correctamente.',
      user: updatedUser,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
