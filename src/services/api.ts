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
};
