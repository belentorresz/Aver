import { AuthResponse, User } from '../types/auth';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('aver_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // Auth Docente
  async registerDocente(data: {
    nombres: string;
    apellidos: string;
    dni: string;
    email: string;
    password: string;
    confirmPassword: string;
    institucionEducativa: string;
    nivelEducativo: string;
    telefono?: string;
  }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/docente/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async loginDocente(data: { dni: string; password: string }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/docente/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Auth Apoderado
  async registerApoderado(data: {
    nombres: string;
    apellidos: string;
    dni: string;
    email: string;
    password: string;
    confirmPassword: string;
    telefono?: string;
    codigoVinculacion?: string;
  }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/apoderado/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async loginApoderado(data: { dni: string; password: string }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/apoderado/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Recuperación de contraseñas
  async requestPasswordReset(dniOrEmail: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dniOrEmail }),
    });
    return res.json();
  },

  async resetPassword(data: { token: string; newPassword: string; confirmPassword: string }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getMe(): Promise<{ success: boolean; user?: User; message?: string }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  // Apoderado queries
  async getLinkedStudents(): Promise<{ success: boolean; data?: any[]; message?: string }> {
    const res = await fetch(`${API_BASE}/apoderado/estudiantes`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  async getStudentDetails(estudianteId: number): Promise<{ success: boolean; data?: any; message?: string }> {
    const res = await fetch(`${API_BASE}/apoderado/estudiantes/${estudianteId}`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  async linkStudent(codigo: string): Promise<{ success: boolean; data?: any; message?: string }> {
    const res = await fetch(`${API_BASE}/apoderado/vincular`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ codigo }),
    });
    return res.json();
  },

  async getApoderadoAgenda(estudianteId?: number): Promise<{ success: boolean; data?: any[]; message?: string }> {
    const url = estudianteId
      ? `${API_BASE}/apoderado/agenda?estudianteId=${estudianteId}`
      : `${API_BASE}/apoderado/agenda`;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  // Docente queries
  async getDocenteResumen(): Promise<{ success: boolean; data?: any; message?: string }> {
    const res = await fetch(`${API_BASE}/docente/resumen`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  async getDocenteAreas(): Promise<{ success: boolean; data?: any[]; message?: string }> {
    const res = await fetch(`${API_BASE}/docente/areas`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  async getDocenteCriterios(areaId?: number): Promise<{ success: boolean; data?: any[]; message?: string }> {
    const url = areaId ? `${API_BASE}/docente/criterios?areaId=${areaId}` : `${API_BASE}/docente/criterios`;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  async getDocenteAulas(): Promise<{ success: boolean; data?: any[]; message?: string }> {
    const res = await fetch(`${API_BASE}/docente/aulas`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  async createDocenteAula(data: {
    grado: string;
    seccion: string;
    nivel?: string;
    anioEscolar?: string;
  }): Promise<{ success: boolean; data?: any; message?: string }> {
    const res = await fetch(`${API_BASE}/docente/aulas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getDocenteEstudiantes(aulaId?: number): Promise<{ success: boolean; data?: any[]; message?: string }> {
    const url = aulaId ? `${API_BASE}/docente/estudiantes?aulaId=${aulaId}` : `${API_BASE}/docente/estudiantes`;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  async getDocenteEstudianteDetalle(id: number): Promise<{ success: boolean; data?: any; message?: string }> {
    const res = await fetch(`${API_BASE}/docente/estudiantes/${id}`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  async getDocenteEstudianteAnalisis(id: number): Promise<{ success: boolean; data?: any; message?: string }> {
    const res = await fetch(`${API_BASE}/docente/estudiantes/${id}/analisis`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  async addDocenteEstudiante(data: {
    nombres: string;
    apellidos: string;
    dni?: string;
    codigo: string;
    aulaId?: number | null;
    colorAvatar?: string;
  }): Promise<{ success: boolean; data?: any; message?: string }> {
    const res = await fetch(`${API_BASE}/docente/estudiantes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getDocenteEvaluaciones(aulaId?: number): Promise<{ success: boolean; data?: any[]; message?: string }> {
    const url = aulaId ? `${API_BASE}/docente/evaluaciones?aulaId=${aulaId}` : `${API_BASE}/docente/evaluaciones`;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  async createDocenteEvaluacion(data: any): Promise<{ success: boolean; data?: any; message?: string }> {
    const res = await fetch(`${API_BASE}/docente/evaluaciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async confirmDocenteOcr(data: any): Promise<{ success: boolean; data?: any; message?: string }> {
    const res = await fetch(`${API_BASE}/docente/ocr/confirmar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async parseDocenteExcel(data: {
    fileName: string;
    base64Data: string;
    sheetName?: string;
  }): Promise<{ success: boolean; data?: any; message?: string }> {
    const res = await fetch(`${API_BASE}/docente/excel/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async confirmDocenteExcel(data: any): Promise<{ success: boolean; data?: any; message?: string }> {
    const res = await fetch(`${API_BASE}/docente/excel/confirmar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getDocenteAlertas(): Promise<{ success: boolean; data?: any[]; message?: string }> {
    const res = await fetch(`${API_BASE}/docente/alertas`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  async updateAlertaEstado(id: number, estado: 'ACTIVA' | 'REVISADA' | 'DESCARTADA'): Promise<{ success: boolean; data?: any; message?: string }> {
    const res = await fetch(`${API_BASE}/docente/alertas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ estado }),
    });
    return res.json();
  },

  async getDocenteHistorial(aulaId?: number): Promise<{ success: boolean; data?: any; message?: string }> {
    const url = aulaId ? `${API_BASE}/docente/historial?aulaId=${aulaId}` : `${API_BASE}/docente/historial`;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  async getDocenteRecomendaciones(): Promise<{ success: boolean; data?: any[]; message?: string }> {
    const res = await fetch(`${API_BASE}/docente/recomendaciones`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  async createDocenteRecomendacion(data: any): Promise<{ success: boolean; data?: any; message?: string }> {
    const res = await fetch(`${API_BASE}/docente/recomendaciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Agenda compartida Docente
  async getDocenteAgenda(filters?: { tipo?: string; estado?: string; aulaId?: number }): Promise<{ success: boolean; data?: any[]; message?: string }> {
    const params = new URLSearchParams();
    if (filters?.tipo && filters.tipo !== 'TODOS') params.set('tipo', filters.tipo);
    if (filters?.estado && filters.estado !== 'TODOS') params.set('estado', filters.estado);
    if (filters?.aulaId) params.set('aulaId', String(filters.aulaId));
    const qs = params.toString();
    const res = await fetch(`${API_BASE}/docente/agenda${qs ? `?${qs}` : ''}`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  async createDocenteAgenda(data: any): Promise<{ success: boolean; data?: any; message?: string }> {
    const res = await fetch(`${API_BASE}/docente/agenda`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateDocenteAgenda(id: number, data: any): Promise<{ success: boolean; data?: any; message?: string }> {
    const res = await fetch(`${API_BASE}/docente/agenda/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async cancelDocenteAgenda(id: number, motivo?: string): Promise<{ success: boolean; data?: any; message?: string }> {
    const res = await fetch(`${API_BASE}/docente/agenda/${id}/cancelar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ motivo }),
    });
    return res.json();
  },

  // Perfil del docente
  async getDocentePerfil(): Promise<{ success: boolean; user?: User; message?: string }> {
    const res = await fetch(`${API_BASE}/docente/perfil`, {
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },

  async updateDocentePerfil(data: {
    nombres: string;
    apellidos: string;
    email: string;
    telefono?: string;
    institucionEducativa: string;
    nivelEducativo: string;
  }): Promise<{ success: boolean; user?: User; message?: string }> {
    const res = await fetch(`${API_BASE}/docente/perfil`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateDocenteFoto(fotoPerfil: string): Promise<{ success: boolean; user?: User; message?: string }> {
    const res = await fetch(`${API_BASE}/docente/perfil/foto`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ fotoPerfil }),
    });
    return res.json();
  },

  async deleteDocenteFoto(): Promise<{ success: boolean; user?: User; message?: string }> {
    const res = await fetch(`${API_BASE}/docente/perfil/foto`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    return res.json();
  },
};
