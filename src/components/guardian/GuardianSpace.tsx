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
        // Para un apoderado nuevo: Su portal debe aparecer vacío mientras no haya vinculado a un estudiante
        setStudents([]);
        setSelectedStudent(null);
        setAcademicData(null);
      }
    } catch (err) {
      console.error('Error al cargar estudiantes:', err);
      setStudents([]);
      setSelectedStudent(null);
      setAcademicData(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadStudentDetails(studentId: number) {
    try {
      const res = await api.getStudentDetails(studentId);
      if (res.success && res.data) {
        setAcademicData(res.data);
      } else {
        setAcademicData(null);
      }
    } catch (e) {
      console.warn('No se pudieron obtener detalles académicos del estudiante.');
      setAcademicData(null);
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

  const evaluaciones = academicData?.evaluaciones || [];
  const alertas = academicData?.alertas || [];
  const recomendaciones = academicData?.recomendaciones || [];

  const totalEvaluaciones = evaluaciones.length;
  const logradosCount = evaluaciones.filter((ev: any) => ev.marca === 'LOGRADO' || ev.nivel_logro === 'AD' || ev.nivel_logro === 'A').length;
  const logradosPct = totalEvaluaciones > 0 ? Math.round((logradosCount / totalEvaluaciones) * 100) : 0;
  const atencionCount = evaluaciones.filter((ev: any) => ev.marca === 'NO_LOGRADO' || ev.nivel_logro === 'C').length;

  let nivelGlobal = 'Sin evaluaciones';
  let nivelSub = 'Esperando primer registro del docente';
  if (totalEvaluaciones > 0) {
    if (logradosPct >= 85) {
      nivelGlobal = 'Logro Destacado (AD)';
      nivelSub = `${logradosPct}% de criterios logrados con nivel sobresaliente`;
    } else if (logradosPct >= 65) {
      nivelGlobal = 'Logro Esperado (A)';
      nivelSub = `${logradosPct}% de criterios logrados satisfactoriamente`;
    } else if (logradosPct >= 40) {
      nivelGlobal = 'En Proceso (B)';
      nivelSub = `${logradosPct}% de avance en competencias evaluadas`;
    } else {
      nivelGlobal = 'En Inicio / Apoyo (C)';
      nivelSub = `Requiere refuerzo en ${atencionCount} criterio(s)`;
    }
  }

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
            + Vincular estudiante
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
                  {(selectedStudent.nombres || 'E')[0]}{(selectedStudent.apellidos || 'S')[0]}
                </span>
                <div className="student-meta">
                  <span className="badge green">Estudiante Vinculado</span>
                  <h1>{selectedStudent.nombres} {selectedStudent.apellidos}</h1>
                  <p>
                    {selectedStudent.grado ? `${selectedStudent.grado} ${selectedStudent.seccion}` : 'Aula asignada'} · Código: {selectedStudent.codigo} {selectedStudent.institucion_educativa ? `· ${selectedStudent.institucion_educativa}` : ''}
                  </p>
                  <small>
                    Docente responsable: Prof. {selectedStudent.docente_nombres || 'Docente'} {selectedStudent.docente_apellidos || ''}
                  </small>
                </div>
              </div>

              <div className="guardian-status-box">
                <span className="kpi-label">Nivel de Logro Global</span>
                <span className="kpi-val highlight">{nivelGlobal}</span>
                <span className="kpi-sub">{nivelSub}</span>
              </div>
            </div>

            {/* Tarjetas de Resumen Rápido con datos reales */}
            <div className="summary-grid">
              <div className="summary-card">
                <div className="summary-icon purple">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
                  </svg>
                </div>
                <div>
                  <span>Evaluaciones registradas</span>
                  <strong>{totalEvaluaciones} registro(s)</strong>
                  <small>{totalEvaluaciones > 0 ? 'En PostgreSQL' : 'Sin registros aún'}</small>
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-icon green">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                </div>
                <div>
                  <span>Criterios logrados</span>
                  <strong>{logradosCount} de {totalEvaluaciones}</strong>
                  <small>{logradosPct}% de cumplimiento</small>
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-icon orange">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 3 2.5 20h19z" /><path d="M12 9v5M12 17.5v.5" />
                  </svg>
                </div>
                <div>
                  <span>Puntos de atención</span>
                  <strong>{atencionCount} criterio(s)</strong>
                  <small>{atencionCount > 0 ? 'Requieren refuerzo' : 'Sin alertas pedagógicas'}</small>
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-icon blue">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" />
                  </svg>
                </div>
                <div>
                  <span>Recomendaciones activas</span>
                  <strong>{recomendaciones.length + alertas.length} orientaciones</strong>
                  <small>Para apoyo en casa</small>
                </div>
              </div>
            </div>

            {/* Pestañas de Navegación del Apoderado */}
            <div className="guardian-tabs-nav">
              <button className={activeTab === 'resumen' ? 'active' : ''} onClick={() => setActiveTab('resumen')}>
                Progreso y Criterios
              </button>
              <button className={activeTab === 'evaluaciones' ? 'active' : ''} onClick={() => setActiveTab('evaluaciones')}>
                Historial de Evaluaciones ({evaluaciones.length})
              </button>
              <button className={activeTab === 'alertas' ? 'active' : ''} onClick={() => setActiveTab('alertas')}>
                Recomendaciones y Apoyo en Casa ({recomendaciones.length + alertas.length})
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
                      <h2>Desempeño en Evaluaciones Curriculares</h2>
                      <p>Resultados oficiales registrados y validados por el docente en el aula</p>
                    </div>
                    <span className={`badge ${logradosPct >= 65 ? 'green' : logradosPct >= 40 ? 'yellow' : 'red'}`}>
                      {totalEvaluaciones > 0 ? `${logradosPct}% Logro` : 'Sin datos'}
                    </span>
                  </div>

                  {evaluaciones.length === 0 ? (
                    <div style={{ padding: '36px', textAlign: 'center', color: '#766F87', fontSize: '13px' }}>
                      Aún no hay evaluaciones registradas en el sistema para este estudiante.
                    </div>
                  ) : (
                    <div className="criteria-list" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {evaluaciones.map((ev: any, idx: number) => {
                        const isLogrado = ev.marca === 'LOGRADO' || ev.nivel_logro === 'A' || ev.nivel_logro === 'AD';
                        const isNoLogrado = ev.marca === 'NO_LOGRADO' || ev.nivel_logro === 'C';
                        return (
                          <div key={ev.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#FAF7FE', borderRadius: '8px', border: '1px solid #EAE3F5' }}>
                            <div>
                              <strong style={{ fontSize: '13px', color: '#29243A' }}>{ev.criterio_descripcion || ev.evaluacion_titulo}</strong>
                              <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#766F87' }}>
                                {ev.area_nombre || 'General'} · {ev.evaluacion_fecha ? new Date(ev.evaluacion_fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Evaluación reciente'}
                              </p>
                            </div>
                            <span className={`badge ${isLogrado ? 'green' : isNoLogrado ? 'red' : 'yellow'}`}>
                              {ev.nivel_logro ? `${ev.nivel_logro} · ` : ''}{isLogrado ? 'Logrado' : isNoLogrado ? 'Requiere apoyo' : 'En proceso'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <aside className="card guardian-side-card">
                  <div className="card-heading">
                    <h2>Resumen de Criterios</h2>
                  </div>
                  <div className="criteria-list">
                    <div>
                      <span><i className="green-dot" /> Criterios Logrados (AD/A)</span>
                      <span className="badge green">{logradosCount}</span>
                    </div>
                    <div>
                      <span><i className="yellow-dot" /> En Proceso (B)</span>
                      <span className="badge yellow">{evaluaciones.filter((e: any) => e.marca === 'NO_OBSERVADO' || e.nivel_logro === 'B').length}</span>
                    </div>
                    <div>
                      <span><i className="red-dot" /> Necesitan Refuerzo (C)</span>
                      <span className="badge red">{atencionCount}</span>
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
                    <h2>Registros Oficiales de Evaluación ({evaluaciones.length})</h2>
                    <p>Instrumentos aplicados y validados por el docente en el aula (datos reales PostgreSQL)</p>
                  </div>
                </div>
                {evaluaciones.length === 0 ? (
                  <div style={{ padding: '36px', textAlign: 'center', color: '#766F87', fontSize: '13px' }}>
                    No hay registros de evaluación oficiales para este estudiante aún.
                  </div>
                ) : (
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
                        {evaluaciones.map((ev: any, idx: number) => {
                          const isLogrado = ev.marca === 'LOGRADO' || ev.nivel_logro === 'A' || ev.nivel_logro === 'AD';
                          const isNoLogrado = ev.marca === 'NO_LOGRADO' || ev.nivel_logro === 'C';
                          return (
                            <tr key={ev.id || idx}>
                              <td><strong>{ev.evaluacion_titulo || 'Evaluación curricular'}</strong></td>
                              <td>{ev.area_nombre || 'General'}</td>
                              <td>{ev.evaluacion_fecha ? new Date(ev.evaluacion_fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                              <td>
                                <span className={`badge ${isLogrado ? 'green' : isNoLogrado ? 'red' : 'yellow'}`}>
                                  {ev.nivel_logro ? `${ev.nivel_logro} · ` : ''}{isLogrado ? 'Logrado' : isNoLogrado ? 'No logrado' : 'En proceso'}
                                </span>
                              </td>
                              <td>{ev.observaciones || 'Criterio evaluado en sesión de clase.'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
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
                  {alertas.length === 0 && recomendaciones.length === 0 ? (
                    <div style={{ padding: '36px', textAlign: 'center', color: '#766F87', fontSize: '13px' }}>
                      No hay alertas pedagógicas ni recomendaciones activas registradas en este momento.
                    </div>
                  ) : (
                    <div className="support-list">
                      {alertas.map((al: any, idx: number) => (
                        <article className="support-item" key={`al-${idx}`}>
                          <div className="support-icon orange">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 3 2.5 20h19z" /><path d="M12 9v5M12 17.5v.5" />
                            </svg>
                          </div>
                          <div>
                            <strong>Alerta Pedagógica: {al.titulo}</strong>
                            <p>{al.detalle || 'El estudiante requiere afianzar las competencias del área.'}</p>
                            <small>Nivel: {al.nivel} · Registrado el {al.created_at ? new Date(al.created_at).toLocaleDateString('es-PE') : 'recientemente'}</small>
                          </div>
                        </article>
                      ))}
                      {recomendaciones.map((rec: any, idx: number) => (
                        <article className="support-item" key={`rec-${idx}`}>
                          <div className="support-icon violet">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 4h7a2 2 0 0 1 2 2v15a3 3 0 0 0-3-3H3zM21 4h-7a2 2 0 0 0-2 2v15a3 3 0 0 1 3-3h6z" />
                            </svg>
                          </div>
                          <div>
                            <strong>{rec.titulo}</strong>
                            <p>{rec.descripcion}</p>
                            <small>Estado: {rec.estado} {rec.fecha_aplicacion ? `· Aplicación: ${new Date(rec.fecha_aplicacion).toLocaleDateString('es-PE')}` : ''}</small>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
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
