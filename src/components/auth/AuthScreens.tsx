import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

type AuthMode = 'select' | 'docente-login' | 'docente-register' | 'apoderado-login' | 'apoderado-register' | 'forgot-password' | 'reset-password';

export function AuthScreens() {
  const { login } = useAuth();
  const [mode, setMode] = useState<AuthMode>('select');
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [devToken, setDevToken] = useState<string>('');

  // Estados de formularios
  const [docenteLoginDni, setDocenteLoginDni] = useState('');
  const [docenteLoginPass, setDocenteLoginPass] = useState('');

  const [apoderadoLoginDni, setApoderadoLoginDni] = useState('');
  const [apoderadoLoginPass, setApoderadoLoginPass] = useState('');

  // Registro Docente
  const [docRegNombres, setDocRegNombres] = useState('');
  const [docRegApellidos, setDocRegApellidos] = useState('');
  const [docRegDni, setDocRegDni] = useState('');
  const [docRegEmail, setDocRegEmail] = useState('');
  const [docRegPass, setDocRegPass] = useState('');
  const [docRegConfirmPass, setDocRegConfirmPass] = useState('');
  const [docRegColegio, setDocRegColegio] = useState('I.E. 2084 San Lorenzo');
  const [docRegNivel, setDocRegNivel] = useState('Primaria');

  // Registro Apoderado
  const [apoRegNombres, setApoRegNombres] = useState('');
  const [apoRegApellidos, setApoRegApellidos] = useState('');
  const [apoRegDni, setApoRegDni] = useState('');
  const [apoRegEmail, setApoRegEmail] = useState('');
  const [apoRegPass, setApoRegPass] = useState('');
  const [apoRegConfirmPass, setApoRegConfirmPass] = useState('');
  const [apoRegCodigo, setApoRegCodigo] = useState('');

  // Recuperación
  const [recoverDniOrEmail, setRecoverDniOrEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetConfirmPass, setResetConfirmPass] = useState('');

  function clearMessages() {
    setError('');
    setSuccessMsg('');
  }

  function switchMode(newMode: AuthMode) {
    clearMessages();
    setMode(newMode);
  }

  // --- Manejadores de envío ---

  async function handleDocenteLogin(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    if (!/^\d{8}$/.test(docenteLoginDni)) {
      setError('El DNI debe tener exactamente 8 dígitos.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.loginDocente({ dni: docenteLoginDni, password: docenteLoginPass });
      if (res.success && res.token && res.user) {
        login(res.token, res.user);
      } else {
        setError(res.message || 'Credenciales incorrectas');
      }
    } catch (err: any) {
      setError('Error de conexión con el servidor. Verifique que el backend esté activo.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDocenteRegister(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    if (!/^\d{8}$/.test(docRegDni)) {
      setError('El DNI debe tener exactamente 8 dígitos numéricos.');
      return;
    }
    if (docRegPass.length < 6) {
      setError('La contraseña debe tener un mínimo de 6 caracteres.');
      return;
    }
    if (docRegPass !== docRegConfirmPass) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.registerDocente({
        nombres: docRegNombres,
        apellidos: docRegApellidos,
        dni: docRegDni,
        email: docRegEmail,
        password: docRegPass,
        confirmPassword: docRegConfirmPass,
        institucionEducativa: docRegColegio,
        nivelEducativo: docRegNivel,
      });

      if (res.success && res.token && res.user) {
        login(res.token, res.user);
      } else {
        setError(res.message || 'Error al registrar docente');
      }
    } catch (err: any) {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  async function handleApoderadoLogin(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    if (!/^\d{8}$/.test(apoderadoLoginDni)) {
      setError('El DNI debe tener exactamente 8 dígitos.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.loginApoderado({ dni: apoderadoLoginDni, password: apoderadoLoginPass });
      if (res.success && res.token && res.user) {
        login(res.token, res.user);
      } else {
        setError(res.message || 'DNI o contraseña incorrectos');
      }
    } catch (err: any) {
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  async function handleApoderadoRegister(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    if (!/^\d{8}$/.test(apoRegDni)) {
      setError('El DNI debe tener exactamente 8 dígitos numéricos.');
      return;
    }
    if (apoRegPass.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (apoRegPass !== apoRegConfirmPass) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.registerApoderado({
        nombres: apoRegNombres,
        apellidos: apoRegApellidos,
        dni: apoRegDni,
        email: apoRegEmail,
        password: apoRegPass,
        confirmPassword: apoRegConfirmPass,
        codigoVinculacion: apoRegCodigo.trim() || undefined,
      });

      if (res.success && res.token && res.user) {
        login(res.token, res.user);
      } else {
        setError(res.message || 'Error al registrar apoderado');
      }
    } catch (err: any) {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      const res = await api.requestPasswordReset(recoverDniOrEmail);
      setSuccessMsg(res.message || 'Solicitud enviada correctamente.');
      if (res.devResetToken) {
        setDevToken(res.devResetToken);
        setResetToken(res.devResetToken);
      }
    } catch (err) {
      setError('Error al procesar solicitud de recuperación.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    if (resetNewPass.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (resetNewPass !== resetConfirmPass) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPassword({
        token: resetToken,
        newPassword: resetNewPass,
        confirmPassword: resetConfirmPass,
      });

      if (res.success) {
        setSuccessMsg(res.message || 'Contraseña actualizada.');
        setTimeout(() => switchMode('select'), 2000);
      } else {
        setError(res.message || 'Error al cambiar contraseña');
      }
    } catch (err) {
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <header className="auth-header">
        <div className="logo">
          <div className="logo-mark">
            <span>A</span>
            <i />
          </div>
          <div>
            <strong>AVer</strong>
            <small>A ver cómo vamos</small>
          </div>
        </div>
        <span className="badge purple">Plataforma de Seguimiento Académico</span>
      </header>

      {/* Pantalla 3.1: Selección de Tipo de Usuario */}
      {mode === 'select' && (
        <main className="auth-selection-main">
          <div className="auth-hero">
            <h1>Bienvenido a AVer</h1>
            <p>Selecciona tu perfil de acceso para ingresar a la plataforma</p>
          </div>

          <div className="role-cards-grid">
            {/* Tarjeta Docente */}
            <div className="role-card teacher-card">
              <div className="role-card-badge">Portal Docente</div>
              <div className="role-card-icon violet">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 5h16v13H4z"/><path d="M8 22h8M12 18v4M8 9h8M8 13h5"/>
                </svg>
              </div>
              <h2>Soy Docente</h2>
              <p>Gestiona tus aulas, registra evaluaciones, analiza el progreso y detecta alertas tempranas de aprendizaje.</p>
              <ul className="role-features">
                <li>✓ Registro y seguimiento de evaluaciones</li>
                <li>✓ Diagnósticos y alertas por criterio</li>
                <li>✓ Aislamiento y privacidad de datos por docente</li>
              </ul>
              <div className="role-actions">
                <button className="btn primary" onClick={() => switchMode('docente-login')}>
                  Ingresar como docente
                </button>
                <button className="btn ghost" onClick={() => switchMode('docente-register')}>
                  ¿Eres nuevo? Regístrate aquí
                </button>
              </div>
            </div>

            {/* Tarjeta Apoderado */}
            <div className="role-card guardian-card">
              <div className="role-card-badge">Portal Apoderados</div>
              <div className="role-card-icon green">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h2>Soy Apoderado</h2>
              <p>Acompaña la evolución académica de tu hijo con información clara, recomendaciones y reportes autorizados.</p>
              <ul className="role-features">
                <li>✓ Consulta exclusiva de estudiantes vinculados</li>
                <li>✓ Progreso académico y áreas a reforzar</li>
                <li>✓ Vinculación segura mediante código docente</li>
              </ul>
              <div className="role-actions">
                <button className="btn primary guardian-btn" onClick={() => switchMode('apoderado-login')}>
                  Ingresar como apoderado
                </button>
                <button className="btn ghost" onClick={() => switchMode('apoderado-register')}>
                  Registrarme y vincular estudiante
                </button>
              </div>
            </div>
          </div>

          <footer className="auth-footer-notice">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>Acceso seguro y protegido. Base de datos PostgreSQL con consultas directas y aislamiento total por usuario.</span>
          </footer>
        </main>
      )}

      {/* 3.3 Inicio de Sesión Docente */}
      {mode === 'docente-login' && (
        <div className="auth-modal-card">
          <button className="auth-back-link" onClick={() => switchMode('select')}>
            ← Volver a selección de perfil
          </button>
          <div className="auth-form-header">
            <span className="badge purple">Acceso Docente</span>
            <h2>Ingresa a tu panel de AVer</h2>
            <p>Utiliza tu número de DNI y contraseña registrada</p>
          </div>

          {error && <div className="auth-alert error">{error}</div>}
          {successMsg && <div className="auth-alert success">{successMsg}</div>}

          <form onSubmit={handleDocenteLogin} className="auth-form">
            <label>
              <span>Número de DNI</span>
              <input
                type="text"
                maxLength={8}
                placeholder="8 dígitos (ej. 71234567)"
                value={docenteLoginDni}
                onChange={(e) => setDocenteLoginDni(e.target.value.replace(/\D/g, ''))}
                required
              />
            </label>

            <label>
              <span>Contraseña</span>
              <input
                type="password"
                placeholder="Ingresa tu contraseña"
                value={docenteLoginPass}
                onChange={(e) => setDocenteLoginPass(e.target.value)}
                required
              />
            </label>

            <div className="auth-form-subline">
              <button type="button" className="auth-text-link" onClick={() => switchMode('forgot-password')}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button type="submit" className="btn primary auth-submit-btn" disabled={loading}>
              {loading ? 'Verificando...' : 'Iniciar sesión como docente'}
            </button>

            <div className="auth-switch-prompt">
              <span>¿No tienes una cuenta aún?</span>
              <button type="button" onClick={() => switchMode('docente-register')}>
                Regístrate aquí
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3.2 Registro Docente */}
      {mode === 'docente-register' && (
        <div className="auth-modal-card wide">
          <button className="auth-back-link" onClick={() => switchMode('docente-login')}>
            ← Volver al inicio de sesión
          </button>
          <div className="auth-form-header">
            <span className="badge purple">Nuevo Docente</span>
            <h2>Registro de Docente</h2>
            <p>Crea tu cuenta profesional en AVer para administrar tus aulas</p>
          </div>

          {error && <div className="auth-alert error">{error}</div>}

          <form onSubmit={handleDocenteRegister} className="auth-form">
            <div className="form-grid">
              <label>
                <span>Nombres</span>
                <input
                  type="text"
                  placeholder="Ej. María Elena"
                  value={docRegNombres}
                  onChange={(e) => setDocRegNombres(e.target.value)}
                  required
                />
              </label>

              <label>
                <span>Apellidos</span>
                <input
                  type="text"
                  placeholder="Ej. Salazar Gómez"
                  value={docRegApellidos}
                  onChange={(e) => setDocRegApellidos(e.target.value)}
                  required
                />
              </label>

              <label>
                <span>DNI (8 dígitos)</span>
                <input
                  type="text"
                  maxLength={8}
                  placeholder="70894512"
                  value={docRegDni}
                  onChange={(e) => setDocRegDni(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </label>

              <label>
                <span>Correo institucional o personal</span>
                <input
                  type="email"
                  placeholder="docente@escuela.edu.pe"
                  value={docRegEmail}
                  onChange={(e) => setDocRegEmail(e.target.value)}
                  required
                />
              </label>

              <label>
                <span>Institución Educativa</span>
                <input
                  type="text"
                  placeholder="Nombre de la I.E."
                  value={docRegColegio}
                  onChange={(e) => setDocRegColegio(e.target.value)}
                  required
                />
              </label>

              <label>
                <span>Nivel Educativo</span>
                <select value={docRegNivel} onChange={(e) => setDocRegNivel(e.target.value)}>
                  <option value="Primaria">Educación Primaria</option>
                  <option value="Secundaria">Educación Secundaria</option>
                  <option value="Inicial">Educación Inicial</option>
                </select>
              </label>

              <label>
                <span>Contraseña</span>
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={docRegPass}
                  onChange={(e) => setDocRegPass(e.target.value)}
                  required
                />
              </label>

              <label>
                <span>Confirmar contraseña</span>
                <input
                  type="password"
                  placeholder="Repite tu contraseña"
                  value={docRegConfirmPass}
                  onChange={(e) => setDocRegConfirmPass(e.target.value)}
                  required
                />
              </label>
            </div>

            <div className="auth-terms-note">
              Al registrarte aceptas las políticas de privacidad y protección de datos académicos de AVer.
            </div>

            <button type="submit" className="btn primary auth-submit-btn" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Completar registro de docente'}
            </button>
          </form>
        </div>
      )}

      {/* 4.1 Inicio de Sesión Apoderado */}
      {mode === 'apoderado-login' && (
        <div className="auth-modal-card">
          <button className="auth-back-link" onClick={() => switchMode('select')}>
            ← Volver a selección de perfil
          </button>
          <div className="auth-form-header">
            <span className="badge green">Acceso Apoderado</span>
            <h2>Espacio para Padres y Apoderados</h2>
            <p>Consulta el rendimiento y recomendaciones de tu hijo/a</p>
          </div>

          {error && <div className="auth-alert error">{error}</div>}
          {successMsg && <div className="auth-alert success">{successMsg}</div>}

          <form onSubmit={handleApoderadoLogin} className="auth-form">
            <label>
              <span>Número de DNI</span>
              <input
                type="text"
                maxLength={8}
                placeholder="DNI del apoderado (8 dígitos)"
                value={apoderadoLoginDni}
                onChange={(e) => setApoderadoLoginDni(e.target.value.replace(/\D/g, ''))}
                required
              />
            </label>

            <label>
              <span>Contraseña</span>
              <input
                type="password"
                placeholder="Ingresa tu contraseña"
                value={apoderadoLoginPass}
                onChange={(e) => setApoderadoLoginPass(e.target.value)}
                required
              />
            </label>

            <div className="auth-form-subline">
              <button type="button" className="auth-text-link" onClick={() => switchMode('forgot-password')}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button type="submit" className="btn primary auth-submit-btn guardian-bg" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar al espacio de apoderado'}
            </button>

            <div className="auth-switch-prompt">
              <span>¿No tienes cuenta de apoderado?</span>
              <button type="button" onClick={() => switchMode('apoderado-register')}>
                Regístrate y vincula a tu estudiante
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4.2 Registro y Vinculación Apoderado */}
      {mode === 'apoderado-register' && (
        <div className="auth-modal-card wide">
          <button className="auth-back-link" onClick={() => switchMode('apoderado-login')}>
            ← Volver al inicio de sesión
          </button>
          <div className="auth-form-header">
            <span className="badge green">Registro de Apoderado</span>
            <h2>Crea tu cuenta de Apoderado</h2>
            <p>Ingresa tus datos y el código otorgado por el docente para vincular a tu estudiante</p>
          </div>

          {error && <div className="auth-alert error">{error}</div>}

          <form onSubmit={handleApoderadoRegister} className="auth-form">
            <div className="form-grid">
              <label>
                <span>Nombres del apoderado</span>
                <input
                  type="text"
                  placeholder="Ej. Roberto Carlos"
                  value={apoRegNombres}
                  onChange={(e) => setApoRegNombres(e.target.value)}
                  required
                />
              </label>

              <label>
                <span>Apellidos del apoderado</span>
                <input
                  type="text"
                  placeholder="Ej. Pérez Quispe"
                  value={apoRegApellidos}
                  onChange={(e) => setApoRegApellidos(e.target.value)}
                  required
                />
              </label>

              <label>
                <span>DNI del apoderado (8 dígitos)</span>
                <input
                  type="text"
                  maxLength={8}
                  placeholder="09876543"
                  value={apoRegDni}
                  onChange={(e) => setApoRegDni(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </label>

              <label>
                <span>Correo electrónico de contacto</span>
                <input
                  type="email"
                  placeholder="apoderado@correo.com"
                  value={apoRegEmail}
                  onChange={(e) => setApoRegEmail(e.target.value)}
                  required
                />
              </label>

              <label>
                <span>Contraseña</span>
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={apoRegPass}
                  onChange={(e) => setApoRegPass(e.target.value)}
                  required
                />
              </label>

              <label>
                <span>Confirmar contraseña</span>
                <input
                  type="password"
                  placeholder="Repite tu contraseña"
                  value={apoRegConfirmPass}
                  onChange={(e) => setApoRegConfirmPass(e.target.value)}
                  required
                />
              </label>
            </div>

            <div className="invitation-code-box">
              <label>
                <strong>Código de Vinculación con el Estudiante (opcional o proporcionado por la I.E.)</strong>
                <small>Ejemplo: VINC-AV03001 (También puedes vincularlo después desde tu panel)</small>
                <input
                  type="text"
                  placeholder="VINC-XXXX"
                  value={apoRegCodigo}
                  onChange={(e) => setApoRegCodigo(e.target.value.toUpperCase())}
                />
              </label>
            </div>

            <button type="submit" className="btn primary auth-submit-btn guardian-bg" disabled={loading}>
              {loading ? 'Procesando...' : 'Registrar y vincular cuenta'}
            </button>
          </form>
        </div>
      )}

      {/* 3.4 y 4.4 Recuperación de Contraseña */}
      {mode === 'forgot-password' && (
        <div className="auth-modal-card">
          <button className="auth-back-link" onClick={() => switchMode('select')}>
            ← Cancelar y volver
          </button>
          <div className="auth-form-header">
            <span className="badge yellow">Seguridad</span>
            <h2>Recuperación de Contraseña</h2>
            <p>Ingresa tu DNI o correo para generar un enlace seguro de restablecimiento</p>
          </div>

          {error && <div className="auth-alert error">{error}</div>}
          {successMsg && <div className="auth-alert success">{successMsg}</div>}

          {devToken && (
            <div className="dev-token-box">
              <span className="badge purple">Modo de Pruebas</span>
              <p>Token generado en el backend:</p>
              <code>{devToken}</code>
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setResetToken(devToken);
                  switchMode('reset-password');
                }}
              >
                Continuar con este token →
              </button>
            </div>
          )}

          {!devToken && (
            <form onSubmit={handleForgotPassword} className="auth-form">
              <label>
                <span>DNI (8 dígitos) o Correo Electrónico</span>
                <input
                  type="text"
                  placeholder="Ej. 71234567 o docente@escuela.pe"
                  value={recoverDniOrEmail}
                  onChange={(e) => setRecoverDniOrEmail(e.target.value)}
                  required
                />
              </label>

              <button type="submit" className="btn primary auth-submit-btn" disabled={loading}>
                {loading ? 'Enviando...' : 'Solicitar enlace de recuperación'}
              </button>

              <div className="auth-switch-prompt">
                <span>¿Ya tienes un código de recuperación?</span>
                <button type="button" onClick={() => switchMode('reset-password')}>
                  Ingresar código aquí
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Formulario para establecer nueva contraseña */}
      {mode === 'reset-password' && (
        <div className="auth-modal-card">
          <button className="auth-back-link" onClick={() => switchMode('forgot-password')}>
            ← Volver a solicitud
          </button>
          <div className="auth-form-header">
            <span className="badge green">Nueva Clave</span>
            <h2>Restablecer Contraseña</h2>
            <p>Ingresa tu código de recuperación y define una nueva contraseña</p>
          </div>

          {error && <div className="auth-alert error">{error}</div>}
          {successMsg && <div className="auth-alert success">{successMsg}</div>}

          <form onSubmit={handleResetPassword} className="auth-form">
            <label>
              <span>Token / Código de recuperación</span>
              <input
                type="text"
                placeholder="Pega el código aquí"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                required
              />
            </label>

            <label>
              <span>Nueva Contraseña</span>
              <input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={resetNewPass}
                onChange={(e) => setResetNewPass(e.target.value)}
                required
              />
            </label>

            <label>
              <span>Confirmar Nueva Contraseña</span>
              <input
                type="password"
                placeholder="Repite la contraseña"
                value={resetConfirmPass}
                onChange={(e) => setResetConfirmPass(e.target.value)}
                required
              />
            </label>

            <button type="submit" className="btn primary auth-submit-btn" disabled={loading}>
              {loading ? 'Actualizando...' : 'Guardar nueva contraseña'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
