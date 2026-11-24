import { query, withTransaction } from '../connection.js';

export interface UserRow {
  id: number;
  dni: string;
  email: string;
  password_hash: string;
  rol: 'DOCENTE' | 'APODERADO';
  activo: boolean;
  email_verificado: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DocenteRow {
  id: number;
  usuario_id: number;
  nombres: string;
  apellidos: string;
  dni: string;
  institucion_educativa: string;
  nivel_educativo: string;
  telefono?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ApoderadoRow {
  id: number;
  usuario_id: number;
  nombres: string;
  apellidos: string;
  dni: string;
  telefono?: string;
  direccion?: string;
  created_at: Date;
  updated_at: Date;
}

export async function findUserByDni(dni: string): Promise<UserRow | null> {
  const res = await query<UserRow>(
    'SELECT * FROM usuarios WHERE dni = $1 LIMIT 1',
    [dni]
  );
  return res.rows[0] || null;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const res = await query<UserRow>(
    'SELECT * FROM usuarios WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [email]
  );
  return res.rows[0] || null;
}

export async function findUserById(id: number): Promise<UserRow | null> {
  const res = await query<UserRow>(
    'SELECT * FROM usuarios WHERE id = $1 LIMIT 1',
    [id]
  );
  return res.rows[0] || null;
}

export async function findDocenteByUsuarioId(usuarioId: number): Promise<DocenteRow | null> {
  const res = await query<DocenteRow>(
    'SELECT * FROM docentes WHERE usuario_id = $1 LIMIT 1',
    [usuarioId]
  );
  return res.rows[0] || null;
}

export async function findApoderadoByUsuarioId(usuarioId: number): Promise<ApoderadoRow | null> {
  const res = await query<ApoderadoRow>(
    'SELECT * FROM apoderados WHERE usuario_id = $1 LIMIT 1',
    [usuarioId]
  );
  return res.rows[0] || null;
}

export async function createDocenteTransaction(data: {
  dni: string;
  email: string;
  passwordHash: string;
  nombres: string;
  apellidos: string;
  institucionEducativa: string;
  nivelEducativo: string;
  telefono?: string;
}): Promise<{ usuario: UserRow; docente: DocenteRow }> {
  return withTransaction(async (client) => {
    // 1. Insertar usuario base
    const userRes = await client.query<UserRow>(
      `INSERT INTO usuarios (dni, email, password_hash, rol, activo, email_verificado)
       VALUES ($1, LOWER($2), $3, 'DOCENTE', TRUE, FALSE)
       RETURNING *`,
      [data.dni, data.email, data.passwordHash]
    );
    const usuario = userRes.rows[0];

    // 2. Insertar perfil docente
    const docenteRes = await client.query<DocenteRow>(
      `INSERT INTO docentes (usuario_id, nombres, apellidos, dni, institucion_educativa, nivel_educativo, telefono)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        usuario.id,
        data.nombres,
        data.apellidos,
        data.dni,
        data.institucionEducativa,
        data.nivelEducativo,
        data.telefono || null,
      ]
    );
    const docente = docenteRes.rows[0];

    // 3. Crear aulas y estudiantes iniciales de demostración para el docente recién registrado
    const aulaRes = await client.query(
      `INSERT INTO aulas (docente_id, grado, seccion, nivel, anio_escolar)
       VALUES ($1, '3.º grado', 'A', 'Primaria', '2025')
       RETURNING id`,
      [docente.id]
    );
    const aulaId = aulaRes.rows[0].id;

    // Aulas adicionales del diseño
    await client.query(
      `INSERT INTO aulas (docente_id, grado, seccion, nivel, anio_escolar)
       VALUES 
       ($1, '3.º grado', 'B', 'Primaria', '2025'),
       ($1, '4.º grado', 'A', 'Primaria', '2025'),
       ($1, '4.º grado', 'B', 'Primaria', '2025')
       ON CONFLICT DO NOTHING`,
      [docente.id]
    );

    // Estudiantes iniciales vinculados al docente
    const demoStudents = [
      { nombres: 'Juan', apellidos: 'Pérez', codigo: 'AV-03-001', color: '#F4C6A6', dni: '74839201' },
      { nombres: 'María', apellidos: 'López', codigo: 'AV-03-002', color: '#BEE3D0', dni: '74839202' },
      { nombres: 'Carlos', apellidos: 'Fernández', codigo: 'AV-03-003', color: '#C8D9F5', dni: '74839203' },
      { nombres: 'Ana', apellidos: 'Torres', codigo: 'AV-03-004', color: '#E7C9EF', dni: '74839204' },
      { nombres: 'Sofía', apellidos: 'Ramírez', codigo: 'AV-03-005', color: '#F3D6B8', dni: '74839205' },
      { nombres: 'Diego', apellidos: 'Quispe', codigo: 'AV-03-006', color: '#D5CEF2', dni: '74839206' },
      { nombres: 'Valentina', apellidos: 'Rojas', codigo: 'AV-03-007', color: '#C8E3E2', dni: '74839207' },
      { nombres: 'Mateo', apellidos: 'Sánchez', codigo: 'AV-03-008', color: '#F0CFCF', dni: '74839208' },
    ];

    for (const s of demoStudents) {
      const studentRes = await client.query(
        `INSERT INTO estudiantes (docente_id, aula_id, nombres, apellidos, dni, codigo, color_avatar)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [docente.id, aulaId, s.nombres, s.apellidos, s.dni, s.codigo, s.color]
      );
      
      // Generar código de vinculación para que un apoderado pueda registrarse y vincularse
      const invCode = `VINC-${s.codigo.replace(/[^A-Z0-9]/g, '')}`;
      await client.query(
        `INSERT INTO invitaciones_vinculacion (docente_id, estudiante_id, codigo_invitacion, expira_en)
         VALUES ($1, $2, $3, NOW() + INTERVAL '30 days')
         ON CONFLICT (codigo_invitacion) DO NOTHING`,
        [docente.id, studentRes.rows[0].id, invCode]
      );
    }

    return { usuario, docente };
  });
}

export async function createApoderadoTransaction(data: {
  dni: string;
  email: string;
  passwordHash: string;
  nombres: string;
  apellidos: string;
  telefono?: string;
  codigoVinculacion?: string;
}): Promise<{ usuario: UserRow; apoderado: ApoderadoRow; estudianteVinculado?: any }> {
  return withTransaction(async (client) => {
    // Si se proveyó código de vinculación, validarlo primero
    let invitacion: any = null;
    if (data.codigoVinculacion) {
      const invRes = await client.query(
        `SELECT * FROM invitaciones_vinculacion 
         WHERE codigo_invitacion = $1 AND usado = FALSE AND expira_en > NOW()
         LIMIT 1`,
        [data.codigoVinculacion.trim().toUpperCase()]
      );
      if (invRes.rows.length === 0) {
        throw new Error('El código de vinculación no es válido o ha expirado.');
      }
      invitacion = invRes.rows[0];
    }

    // 1. Insertar usuario base
    const userRes = await client.query<UserRow>(
      `INSERT INTO usuarios (dni, email, password_hash, rol, activo, email_verificado)
       VALUES ($1, LOWER($2), $3, 'APODERADO', TRUE, FALSE)
       RETURNING *`,
      [data.dni, data.email, data.passwordHash]
    );
    const usuario = userRes.rows[0];

    // 2. Insertar perfil apoderado
    const apoderadoRes = await client.query<ApoderadoRow>(
      `INSERT INTO apoderados (usuario_id, nombres, apellidos, dni, telefono)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [usuario.id, data.nombres, data.apellidos, data.dni, data.telefono || null]
    );
    const apoderado = apoderadoRes.rows[0];

    // 3. Si hubo código de vinculación, asociar al estudiante
    let estudianteVinculado = null;
    if (invitacion) {
      await client.query(
        `INSERT INTO relaciones_apoderado_estudiante (apoderado_id, estudiante_id, estado_vinculacion)
         VALUES ($1, $2, 'ACTIVO')
         ON CONFLICT (apoderado_id, estudiante_id) DO UPDATE SET estado_vinculacion = 'ACTIVO'`,
        [apoderado.id, invitacion.estudiante_id]
      );

      await client.query(
        `UPDATE invitaciones_vinculacion 
         SET usado = TRUE, apoderado_id = $1 
         WHERE id = $2`,
        [apoderado.id, invitacion.id]
      );

      const stRes = await client.query(
        'SELECT * FROM estudiantes WHERE id = $1',
        [invitacion.estudiante_id]
      );
      estudianteVinculado = stRes.rows[0];
    }

    return { usuario, apoderado, estudianteVinculado };
  });
}

export async function createPasswordResetToken(
  usuarioId: number,
  tokenHash: string,
  expiraEn: Date
) {
  // Invalida tokens previos
  await query(
    'UPDATE tokens_recuperacion SET usado = TRUE WHERE usuario_id = $1 AND usado = FALSE',
    [usuarioId]
  );
  const res = await query(
    `INSERT INTO tokens_recuperacion (usuario_id, token_hash, expira_en)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [usuarioId, tokenHash, expiraEn]
  );
  return res.rows[0];
}

export async function findValidResetToken(tokenHash: string) {
  const res = await query(
    `SELECT * FROM tokens_recuperacion 
     WHERE token_hash = $1 AND usado = FALSE AND expira_en > NOW()
     LIMIT 1`,
    [tokenHash]
  );
  return res.rows[0] || null;
}

export async function updateUserPassword(usuarioId: number, passwordHash: string) {
  await query(
    `UPDATE usuarios 
     SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $2`,
    [passwordHash, usuarioId]
  );
}

export async function markResetTokenUsed(tokenId: number) {
  await query(
    'UPDATE tokens_recuperacion SET usado = TRUE WHERE id = $1',
    [tokenId]
  );
}

export async function markEmailVerified(usuarioId: number) {
  await query(
    'UPDATE usuarios SET email_verificado = TRUE WHERE id = $1',
    [usuarioId]
  );
}
