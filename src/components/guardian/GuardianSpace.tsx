import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ApoderadoAgendaSection } from '../agenda/AgendaShared';

export function GuardianSpace() {
  const { user, logout } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [academicData, setAcademicData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkCode, setLinkCode] = useState('');
  const [linkMsg, setLinkMsg] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState<'resumen' | 'evaluaciones' | 'alertas' | 'agenda'>('resumen');

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    setLoading(true);
    try {
      const res = await api.getLinkedStudents();
      if (res.success && res.data && res.data.length > 0) {
        setStudents(res.data);
        setSelectedStudent(res.data[0]);
        loadStudentDetails(res.data[0].id);
      } else {
        // Estudiante demo si no hay vinculaciones todavía
        const fallbackStudent = {
          id: 1,
          nombres: 'Juan',
          apellidos: 'Pérez',
          grado: '3.º grado',
          seccion: 'A',
          docente_nombres: 'María Elena',
          docente_apellidos: 'Salazar Gómez',
          institucion_educativa: 'I.E. 2084 San Lorenzo',
          color_avatar: '#F4C6A6',
          codigo: 'AV-03-001',
        };
        setStudents([fallbackStudent]);
        setSelectedStudent(fallbackStudent);
      }
    } catch (err) {
      console.error('Error al cargar estudiantes:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadStudentDetails(studentId: number) {
    try {
      const res = await api.getStudentDetails(studentId);
      if (res.success && res.data) {
        setAcademicData(res.data);
      }
    } catch (e) {
      console.warn('Usando datos de consulta locales');
    }
  }

  function handleSelectStudent(student: any) {
    setSelectedStudent(student);
    loadStudentDetails(student.id);
  }

  async function handleLinkStudent(e: React.FormEvent) {
    e.preventDefault();
    setLinkMsg({ type: '', text: '' });
    if (!linkCode.trim()) return;

    try {
      const res = await api.linkStudent(linkCode);
      if (res.success && res.data) {
        setLinkMsg({ type: 'success', text: res.message || 'Estudiante vinculado exitosamente.' });
        loadStudents();
        setTimeout(() => {
          setShowLinkModal(false);
          setLinkCode('');
          setLinkMsg({ type: '', text: '' });
        }, 1800);
      } else {
        setLinkMsg({ type: 'error', text: res.message || 'Código inválido o expirado.' });
      }
    } catch (err) {
      setLinkMsg({ type: 'error', text: 'Error al vincular estudiante.' });
    }
  }

  const apoderadoName = user?.apoderado ? `${user.apoderado.nombres} ${user.apoderado.apellidos}` : 'Apoderado AVer';

  return (
    <div className="guardian-app-shell">
      {/* Barra superior del Apoderado */}
      <header className="guardian-topbar">
        <div className="guardian-topbar-brand">
          <div className="logo">
            <div className="logo-mark">
              <span>A</span>
              <i />
            </div>
            <div>
              <strong>AVer</strong>
              <small>Portal para Apoderados</small>
            </div>
          </div>
        </div>

        <div className="guardian-topbar-controls">
          {/* Selector de estudiante si tiene más de uno */}
          {students.length > 0 && (
            <div className="guardian-student-pill">
              <span className="dot" />
              <span>Estudiante:</span>
              <select
                value={selectedStudent?.id || ''}
                onChange={(e) => {
                  const s = students.find((item) => item.id === parseInt(e.target.value, 10));
                  if (s) handleSelectStudent(s);
                }}
              >
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.nombres} {st.apellidos} ({st.grado} {st.seccion})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button className="btn secondary link-student-btn" onClick={() => setShowLinkModal(true)}>
            + Vincular otro estudiante
          </button>

          <div className="divider" />

          <div className="guardian-user-profile">
            <span className="avatar sm">{apoderadoName.slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{apoderadoName}</strong>
              <small>Apoderado autorizado</small>
            </div>
          </div>

          <button className="btn ghost logout-pill" onClick={logout} title="Cerrar sesión">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H4V3h5M16 17l5-5-5-5M21 12H9" />
            </svg>
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Contenido principal del apoderado */}
      <main className="guardian-main-content">
        {selectedStudent ? (
          <>
            {/* Banner Informativo del Estudiante */}
            <div className="guardian-hero-card">
              <div className="student-profile-badge">
                <span className="avatar lg" style={{ background: selectedStudent.color_avatar || '#D9C8EF' }}>
                  {selectedStudent.nombres[0]}{selectedStudent.apellidos[0]}
                </span>
                <div className="student-meta">
                  <span className="badge green">Estudiante Vinculado</span>
                  <h1>{selectedStudent.nombres} {selectedStudent.apellidos}</h1>
                  <p>
                    {selectedStudent.grado} {selectedStudent.seccion} · Código: {selectedStudent.codigo} · {selectedStudent.institucion_educativa || 'I.E. 2084 San Lorenzo'}
                  </p>
                  <small>
                    Docente responsable: Prof. {selectedStudent.docente_nombres || 'María Elena'} {selectedStudent.docente_apellidos || 'Salazar Gómez'}
                  </small>
                </div>
              </div>

              <div className="guardian-status-box">
                <span className="kpi-label">Nivel de Logro Global</span>
                <span className="kpi-val highlight">Logro Esperado (A)</span>
                <span className="kpi-sub">+12% de avance en el último bimestre</span>
              </div>
            </div>

            {/* Tarjetas de Resumen Rápido */}
            <div className="summary-grid">
              <div className="summary-card">
                <div className="summary-icon purple">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>
                  </svg>
                </div>
                <div>
                  <span>Evaluaciones en curso</span>
                  <strong>8 registros</strong>
                  <small>Actualizado hoy</small>
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-icon green">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m5 12 4 4L19 6"/>
                  </svg>
                </div>
                <div>
                  <span>Criterios logrados</span>
                  <strong>6 de 8</strong>
                  <small>75% cumplimiento</small>
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-icon orange">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 3 2.5 20h19z"/><path d="M12 9v5M12 17.5v.5"/>
                  </svg>
                </div>
                <div>
                  <span>Puntos de atención</span>
                  <strong>1 criterio</strong>
                  <small>Lectura: ideas principales</small>
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-icon blue">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>
                  </svg>
                </div>
                <div>
                  <span>Asistencia escolar</span>
                  <strong>94% regular</strong>
                  <small>Bimestre II - 2025</small>
                </div>
              </div>
            </div>

            {/* Pestañas de Navegación del Apoderado */}
            <div className="guardian-tabs-nav">
              <button className={activeTab === 'resumen' ? 'active' : ''} onClick={() => setActiveTab('resumen')}>
                Progreso y Criterios
              </button>
              <button className={activeTab === 'evaluaciones' ? 'active' : ''} onClick={() => setActiveTab('evaluaciones')}>
                Historial de Evaluaciones
              </button>
              <button className={activeTab === 'alertas' ? 'active' : ''} onClick={() => setActiveTab('alertas')}>
                Recomendaciones y Apoyo en Casa
              </button>
              <button className={activeTab === 'agenda' ? 'active' : ''} onClick={() => setActiveTab('agenda')}>
                Agenda Compartida
              </button>
            </div>

            {/* Tab 1: Progreso */}
            {activeTab === 'resumen' && (
              <div className="guardian-tab-grid">
                <section className="card chart-card wide">
                  <div className="card-heading">
                    <div>
                      <h2>Evolución del Desempeño Escolar</h2>
                      <p>Visualización del progreso en Comunicación y Matemática</p>
                    </div>
                    <span className="badge green">Tendencia Positiva</span>
                  </div>
                  <div className="progress-panel large" style={{ margin: '20px 0' }}>
                    <svg viewBox="0 0 600 140" style={{ width: '100%', height: 'auto' }}>
                      <defs>
                        <linearGradient id="guardianFade" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0" stopColor="#7041B5" stopOpacity=".25"/>
                          <stop offset="1" stopColor="#7041B5" stopOpacity="0"/>
                        </linearGradient>
                      </defs>
                      <path d="M20 110 L140 100 L280 80 L420 85 L560 45 L560 135 L20 135 Z" fill="url(#guardianFade)"/>
                      <path d="M20 110 L140 100 L280 80 L420 85 L560 45" fill="none" stroke="#7041B5" strokeWidth="4"/>
                      {[[20,110],[140,100],[280,80],[420,85],[560,45]].map(([x,y]) => (
                        <circle key={x} cx={x} cy={y} r="6" fill="#fff" stroke="#7041B5" strokeWidth="3"/>
                      ))}
                    </svg>
                    <div className="months">
                      <span>Marzo</span>
                      <span>Abril</span>
                      <span>Mayo</span>
                      <span>Junio</span>
                      <span>Julio</span>
                    </div>
                  </div>
                  <div className="info-callout">
                    <div>
                      <strong>Nota pedagógica del docente</strong>
                      <span>El estudiante ha demostrado una destacada recuperación en resolución de problemas numéricos. Se recomienda afianzar la comprensión lectora en casa.</span>
                    </div>
                  </div>
                </section>

                <aside className="card guardian-side-card">
                  <div className="card-heading">
                    <h2>Desglose por Criterios</h2>
                  </div>
                  <div className="criteria-list">
                    <div>
                      <span><i className="green-dot" /> Identifica información explícita</span>
                      <span className="badge green">Logrado</span>
                    </div>
                    <div>
                      <span><i className="green-dot" /> Resuelve problemas aditivos</span>
                      <span className="badge green">Logrado</span>
                    </div>
                    <div>
                      <span><i className="yellow-dot" /> Infiere relaciones lógicas</span>
                      <span className="badge yellow">En proceso</span>
                    </div>
                    <div>
                      <span><i className="red-dot" /> Identifica la idea principal</span>
                      <span className="badge red">Requiere apoyo</span>
                    </div>
                  </div>
                </aside>
              </div>
            )}

            {/* Tab 2: Evaluaciones */}
            {activeTab === 'evaluaciones' && (
              <section className="card table-card">
                <div className="card-heading">
                  <div>
                    <h2>Registros Oficiales de Evaluación</h2>
                    <p>Instrumentos aplicados y validados por el docente en el aula</p>
                  </div>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Evaluación</th>
                        <th>Área</th>
                        <th>Fecha</th>
                        <th>Resultado</th>
                        <th>Observación del Docente</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Comprensión de textos narrativos II</strong></td>
                        <td>Comunicación</td>
                        <td>18 Jun, 2025</td>
                        <td><span className="badge yellow">B · En proceso</span></td>
                        <td>Requiere mayor detenimiento al identificar la idea central.</td>
                      </tr>
                      <tr>
                        <td><strong>Resolución de problemas de cantidad</strong></td>
                        <td>Matemática</td>
                        <td>14 Jun, 2025</td>
                        <td><span className="badge green">A · Logrado</span></td>
                        <td>Excelente manejo de adición y sustracción combinada.</td>
                      </tr>
                      <tr>
                        <td><strong>Los seres vivos y su ambiente</strong></td>
                        <td>Ciencia y Tecnología</td>
                        <td>10 Jun, 2025</td>
                        <td><span className="badge green">AD · Destacado</span></td>
                        <td>Participación activa y clara comprensión de los conceptos.</td>
                      </tr>
                      <tr>
                        <td><strong>Convivencia democrática en el aula</strong></td>
                        <td>Personal Social</td>
                        <td>05 Jun, 2025</td>
                        <td><span className="badge green">A · Logrado</span></td>
                        <td>Cumple puntualmente los acuerdos de convivencia grupal.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Tab 3: Alertas y Recomendaciones */}
            {activeTab === 'alertas' && (
              <div className="guardian-support-grid">
                <section className="card support-card">
                  <div className="card-heading">
                    <div>
                      <span className="badge yellow">Orientación Pedagógica</span>
                      <h2>Recomendaciones para afianzar en casa</h2>
                    </div>
                  </div>
                  <div className="support-list">
                    <article className="support-item">
                      <div className="support-icon violet">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 4h7a2 2 0 0 1 2 2v15a3 3 0 0 0-3-3H3zM21 4h-7a2 2 0 0 0-2 2v15a3 3 0 0 1 3-3h6z"/>
                        </svg>
                      </div>
                      <div>
                        <strong>Lectura dialogada de 15 minutos diarios</strong>
                        <p>Lean juntos una noticia corta o fábula y conversen sobre: "¿De qué trató principalmente la historia?". Ayúdale a diferenciar el tema principal de los detalles secundarios.</p>
                        <small>Propuesto por: Prof. María Salazar</small>
                      </div>
                    </article>

                    <article className="support-item">
                      <div className="support-icon green">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                        </svg>
                      </div>
                      <div>
                        <strong>Juegos de cálculo mental cotidiano</strong>
                        <p>Aprovecha situaciones cotidianas como compras pequeñas o conteo de objetos para ejercitar sumas y restas mentales rápidas sin presión.</p>
                        <small>Propuesto por: Prof. María Salazar</small>
                      </div>
                    </article>
                  </div>
                </section>

                <aside className="card support-rules-card">
                  <span className="badge gray">Políticas de Acceso</span>
                  <h3>Privacidad y Restricciones</h3>
                  <ul>
                    <li>✓ Como apoderado, tu acceso es de <strong>consulta protegida</strong>.</li>
                    <li>✓ No es posible alterar ni eliminar registros académicos.</li>
                    <li>✓ Si tienes consultas sobre un criterio específico, puedes coordinar una reunión presencial con la docente en el horario escolar.</li>
                  </ul>
                </aside>
              </div>
            )}

            {/* Tab 4: Agenda Compartida (Solo Lectura) */}
            {activeTab === 'agenda' && (
              <ApoderadoAgendaSection selectedStudent={selectedStudent} />
            )}
          </>
        ) : (
          <div className="empty-guardian-state">
            <h2>No tienes estudiantes vinculados</h2>
            <p>Ingresa el código proporcionado por la institución educativa para consultar los avances de tu hijo/a.</p>
            <button className="btn primary" onClick={() => setShowLinkModal(true)}>
              Ingresar código de vinculación
            </button>
          </div>
        )}
      </main>

      {/* Modal para vincular estudiante con código seguro */}
      {showLinkModal && (
        <div className="modal-backdrop">
          <div className="comparison-modal" style={{ maxWidth: '480px' }}>
            <button className="modal-close" onClick={() => setShowLinkModal(false)}>✕</button>
            <span className="badge purple">Vinculación de Estudiante</span>
            <h1>Vincular con Código Docente</h1>
            <p className="modal-subtitle">
              Ingresa el código único y temporal otorgado por el docente o institución educativa.
            </p>

            {linkMsg.text && (
              <div className={`auth-alert ${linkMsg.type === 'success' ? 'success' : 'error'}`} style={{ marginTop: '14px' }}>
                {linkMsg.text}
              </div>
            )}

            <form onSubmit={handleLinkStudent} style={{ marginTop: '20px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', fontWeight: 600 }}>
                <span>Código de Vinculación</span>
                <input
                  type="text"
                  placeholder="Ej. VINC-AV03001"
                  value={linkCode}
                  onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                  style={{ height: '42px', borderRadius: '8px', border: '1px solid #D9CDEC', padding: '0 12px', fontSize: '13px' }}
                  required
                />
              </label>

              <div className="modal-actions" style={{ marginTop: '22px' }}>
                <button type="button" className="btn secondary" onClick={() => setShowLinkModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn primary">
                  Verificar y vincular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
