export type UserRole = 'DOCENTE' | 'APODERADO';

export interface DocenteProfile {
  id: number;
  nombres: string;
  apellidos: string;
  dni?: string;
  institucionEducativa: string;
  nivelEducativo: string;
  telefono?: string;
  fotoPerfil?: string | null;
}

export interface ApoderadoProfile {
  id: number;
  nombres: string;
  apellidos: string;
  dni?: string;
  telefono?: string;
  direccion?: string;
}

export interface User {
  id: number;
  dni: string;
  email: string;
  rol: UserRole;
  docente?: DocenteProfile;
  apoderado?: ApoderadoProfile;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
  errors?: any[];
  devResetToken?: string;
}
