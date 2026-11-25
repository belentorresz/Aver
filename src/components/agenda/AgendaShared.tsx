import { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';

type EventType = 'REUNION' | 'EVALUACION' | 'ACTIVIDAD' | 'COMUNICADO';
type EventStatus = 'PROGRAMADO' | 'COMPLETADO' | 'CANCELADO';
type EventModalidad = 'PRESENCIAL' | 'VIRTUAL' | 'INFORMATIVO';
type DestinatarioTipo = 'TODOS' | 'AULA' | 'ESTUDIANTES';

const TYPE_META: Record<EventType, { label: string; tone: string; color: string; bg: string }> = {
  REUNION: { label: 'Reunión', tone: 'purple', color: '#7041B5', bg: '#EDE5F8' },
  EVALUACION: { label: 'Evaluación', tone: 'blue', color: '#3F6FA9', bg: '#E6EFFB' },
  ACTIVIDAD: { label: 'Actividad', tone: 'green', color: '#2D7549', bg: '#DDF4E5' },
  COMUNICADO: { label: 'Comunicado', tone: 'yellow', color: '#90661D', bg: '#FFF1CC' },
};

const STATUS_META: Record<EventStatus, { label: string; tone: string }> = {
  PROGRAMADO: { label: 'Programado', tone: 'green' },
  COMPLETADO: { label: 'Completado', tone: 'gray' },
  CANCELADO: { label: 'Cancelado', tone: 'red' },
};

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const WEEKDAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function toDateKey(dateVal: string | Date): string {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') return dateVal.slice(0, 10);
  return dateVal.toISOString().slice(0, 10);
}

function formatReadableDate(dateStr: string): string {
  const key = toDateKey(dateStr);
  if (!key) return '';
  const [y, m, d] = key.split('-').map(Number);
  return `${d} de ${MONTHS_ES[(m || 1) - 1]} de ${y}`;
}

function formatTime(t?: string | null): string {
  if (!t) return '';
  return String(t).slice(0, 5);
}

function buildCalendarDays(year: number, monthIndex: number) {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  // Monday-first offset (0 = Mon ... 6 = Sun)
  const startOffset = (firstDay.getDay() + 6) % 7;
  const days: { dateKey: string; day: number; inMonth: boolean }[] = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    const dt = new Date(year, monthIndex, -i);
    days.push({
      dateKey: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`,
      day: dt.getDate(),
      inMonth: false,
    });
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({
      dateKey: `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      day: d,
      inMonth: true,
    });
  }

  while (days.length % 7 !== 0) {
    const nextIdx = days.length - startOffset - lastDay.getDate() + 1;
    const dt = new Date(year, monthIndex + 1, nextIdx);
    days.push({
      dateKey: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`,
      day: dt.getDate(),
      inMonth: false,
    });
  }

  return days;
}

// =========================================================================
// AGENDA COMPARTIDA — PANEL DOCENTE (CREAR, EDITAR, CANCELAR, FILTRAR)
// =========================================================================
export function DocenteAgendaSection({
  aulas,
  students,
  onNotify,
}: {
  aulas: any[];
  students: any[];
  onNotify?: (msg: string) => void;
}) {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [viewMode, setViewMode] = useState<'calendario' | 'lista'>('calendario');
  const [calMonth, setCalMonth] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDay, setSelectedDay] = useState<string>('');

  const [filterTipo, setFilterTipo] = useState<string>('TODOS');
  const [filterEstado, setFilterEstado] = useState<string>('TODOS');
  const [filterAula, setFilterAula] = useState<string>('ALL');

  // Modal Crear / Editar
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingEvento, setEditingEvento] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [tipo, setTipo] = useState<EventType>('REUNION');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(todayKey);
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('10:00');
  const [modalidad, setModalidad] = useState<EventModalidad>('PRESENCIAL');
  const [ubicacion, setUbicacion] = useState('');
  const [destinatariosTipo, setDestinatariosTipo] = useState<DestinatarioTipo>('AULA');
  const [aulaId, setAulaId] = useState<string>(aulas[0]?.id ? String(aulas[0].id) : '');
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [estado, setEstado] = useState<EventStatus>('PROGRAMADO');

  // Modal Cancelar
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    loadEventos();
  }, []);

  useEffect(() => {
    if (!aulaId && aulas.length > 0) {
      setAulaId(String(aulas[0].id));
    }
  }, [aulas]);

  async function loadEventos() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getDocenteAgenda();
      if (res.success) {
        setEventos(res.data || []);
      } else {
        setError(res.message || 'No se pudo cargar la agenda.');
      }
    } catch {
      setError('Error de conexión al cargar la agenda compartida.');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal(prefillDate?: string) {
    setEditingEvento(null);
    setFormError('');
    setTipo('REUNION');
    setTitulo('');
    setDescripcion('');
    setFecha(prefillDate || selectedDay || todayKey);
    setHoraInicio('09:00');
    setHoraFin('10:00');
    setModalidad('PRESENCIAL');
    setUbicacion('');
    setDestinatariosTipo(aulas.length > 0 ? 'AULA' : 'TODOS');
    setAulaId(aulas[0]?.id ? String(aulas[0].id) : '');
    setSelectedStudentIds([]);
    setEstado('PROGRAMADO');
    setShowFormModal(true);
  }

  function openEditModal(ev: any) {
    setEditingEvento(ev);
    setFormError('');
    setTipo(ev.tipo);
    setTitulo(ev.titulo || '');
    setDescripcion(ev.descripcion || '');
    setFecha(toDateKey(ev.fecha));
    setHoraInicio(formatTime(ev.hora_inicio) || '');
    setHoraFin(formatTime(ev.hora_fin) || '');
    setModalidad(ev.modalidad || 'PRESENCIAL');
    setUbicacion(ev.ubicacion || '');
    setDestinatariosTipo(ev.destinatarios_tipo || 'AULA');
    setAulaId(ev.aula_id ? String(ev.aula_id) : (aulas[0]?.id ? String(aulas[0].id) : ''));
    const estIds = Array.isArray(ev.estudiantes_destinatarios)
      ? ev.estudiantes_destinatarios.map((s: any) => s.id)
      : [];
    setSelectedStudentIds(estIds);
    setEstado(ev.estado || 'PROGRAMADO');
    setShowFormModal(true);
  }

  async function handleSaveEvento(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (titulo.trim().length < 3) {
      setFormError('El título debe tener al menos 3 caracteres.');
      return;
    }
    if (!fecha) {
      setFormError('Selecciona una fecha válida.');
      return;
    }
    if (destinatariosTipo === 'AULA' && !aulaId) {
      setFormError('Selecciona el aula destinataria.');
      return;
    }
    if (destinatariosTipo === 'ESTUDIANTES' && selectedStudentIds.length === 0) {
      setFormError('Selecciona al menos un estudiante.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        tipo,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        fecha,
        horaInicio: horaInicio || null,
        horaFin: horaFin || null,
        modalidad,
        ubicacion: ubicacion.trim() || null,
        destinatariosTipo,
        aulaId: destinatariosTipo === 'AULA' && aulaId ? Number(aulaId) : null,
        estudianteIds: destinatariosTipo === 'ESTUDIANTES' ? selectedStudentIds : [],
        estado,
      };

      const res = editingEvento
        ? await api.updateDocenteAgenda(editingEvento.id, payload)
        : await api.createDocenteAgenda(payload);

      if (res.success) {
        setShowFormModal(false);
        await loadEventos();
        onNotify?.(editingEvento ? 'Evento actualizado en la agenda' : 'Evento compartido en la agenda');
      } else {
        setFormError(res.message || 'Error al guardar el evento.');
      }
    } catch {
      setFormError('Error de conexión al guardar el evento.');
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmCancel() {
    if (!cancelTarget) return;
    setSaving(true);
    try {
      const res = await api.cancelDocenteAgenda(cancelTarget.id, cancelReason);
      if (res.success) {
        setCancelTarget(null);
        setCancelReason('');
        await loadEventos();
        onNotify?.('Evento cancelado y notificado a apoderados');
      } else {
        setError(res.message || 'No se pudo cancelar el evento.');
      }
    } finally {
      setSaving(false);
    }
  }

  const filteredEventos = useMemo(() => {
    return eventos.filter((ev) => {
      if (filterTipo !== 'TODOS' && ev.tipo !== filterTipo) return false;
      if (filterEstado !== 'TODOS' && ev.estado !== filterEstado) return false;
      if (filterAula !== 'ALL' && String(ev.aula_id || '') !== filterAula) return false;
      if (selectedDay && toDateKey(ev.fecha) !== selectedDay) return false;
      return true;
    });
  }, [eventos, filterTipo, filterEstado, filterAula, selectedDay]);

  const calendarDays = useMemo(
    () => buildCalendarDays(calMonth.year, calMonth.month),
    [calMonth]
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const ev of eventos) {
      if (filterTipo !== 'TODOS' && ev.tipo !== filterTipo) continue;
      if (filterEstado !== 'TODOS' && ev.estado !== filterEstado) continue;
      if (filterAula !== 'ALL' && String(ev.aula_id || '') !== filterAula) continue;
      const k = toDateKey(ev.fecha);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(ev);
    }
    return map;
  }, [eventos, filterTipo, filterEstado, filterAula]);

  const stats = useMemo(() => {
    const programados = eventos.filter((e) => e.estado === 'PROGRAMADO').length;
    const reuniones = eventos.filter((e) => e.tipo === 'REUNION' && e.estado !== 'CANCELADO').length;
    const evaluaciones = eventos.filter((e) => e.tipo === 'EVALUACION' && e.estado !== 'CANCELADO').length;
    const cancelados = eventos.filter((e) => e.estado === 'CANCELADO').length;
    return { total: eventos.length, programados, reuniones, evaluaciones, cancelados };
  }, [eventos]);

  function toggleStudent(id: number) {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  return (
    <div className="agenda-pro-root">
      {/* Encabezado profesional */}
      <div className="agenda-pro-header">
        <div>
          <span className="badge purple">Agenda compartida en tiempo real</span>
          <h1>Agenda académica y comunicación familiar</h1>
          <p>Programa reuniones, evaluaciones, actividades y comunicados visibles para los apoderados vinculados.</p>
        </div>
        <div className="agenda-pro-header-actions">
          <div className="agenda-view-switch">
            <button
              type="button"
              className={viewMode === 'calendario' ? 'active' : ''}
              onClick={() => setViewMode('calendario')}
            >
              Calendario
            </button>
            <button
              type="button"
              className={viewMode === 'lista' ? 'active' : ''}
              onClick={() => {
                setViewMode('lista');
                setSelectedDay('');
              }}
            >
              Lista ({eventos.length})
            </button>
          </div>
          <button type="button" className="btn primary" onClick={() => openCreateModal()}>
            + Nuevo evento
          </button>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="agenda-pro-stats">
        <div className="agenda-stat-card">
          <span>Eventos programados</span>
          <strong>{stats.programados}</strong>
          <small>Activos en calendario</small>
        </div>
        <div className="agenda-stat-card">
          <span>Reuniones con familias</span>
          <strong>{stats.reuniones}</strong>
          <small>Citaciones y entrevistas</small>
        </div>
        <div className="agenda-stat-card">
          <span>Evaluaciones agendadas</span>
          <strong>{stats.evaluaciones}</strong>
          <small>Fechas comunicadas</small>
        </div>
        <div className="agenda-stat-card">
          <span>Eventos cancelados</span>
          <strong>{stats.cancelados}</strong>
          <small>Con historial visible</small>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="agenda-pro-filters">
        <div className="agenda-type-chips">
          {(['TODOS', 'REUNION', 'EVALUACION', 'ACTIVIDAD', 'COMUNICADO'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`agenda-chip ${filterTipo === t ? 'active' : ''}`}
              onClick={() => setFilterTipo(t)}
            >
              {t === 'TODOS' ? 'Todos' : TYPE_META[t].label}
            </button>
          ))}
        </div>

        <div className="agenda-select-filters">
          <label className="select-wrap">
            <select value={filterAula} onChange={(e) => setFilterAula(e.target.value)}>
              <option value="ALL">Todas las aulas</option>
              {aulas.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.grado} {a.seccion}
                </option>
              ))}
            </select>
          </label>
          <label className="select-wrap">
            <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
              <option value="TODOS">Todos los estados</option>
              <option value="PROGRAMADO">Programado</option>
              <option value="COMPLETADO">Completado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </label>
        </div>
      </div>

      {error && <div className="auth-alert error">{error}</div>}

      <div className={`agenda-pro-workspace ${viewMode === 'lista' ? 'list-only' : ''}`}>
        {viewMode === 'calendario' && (
          <section className="card agenda-calendar-card">
            <div className="agenda-cal-top">
              <h2>
                {MONTHS_ES[calMonth.month]} {calMonth.year}
              </h2>
              <div className="agenda-cal-nav">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() =>
                    setCalMonth((prev) =>
                      prev.month === 0
                        ? { year: prev.year - 1, month: 11 }
                        : { year: prev.year, month: prev.month - 1 }
                    )
                  }
                >
                  ← Anterior
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    setCalMonth({ year: today.getFullYear(), month: today.getMonth() });
                    setSelectedDay('');
                  }}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() =>
                    setCalMonth((prev) =>
                      prev.month === 11
                        ? { year: prev.year + 1, month: 0 }
                        : { year: prev.year, month: prev.month + 1 }
                    )
                  }
                >
                  Siguiente →
                </button>
              </div>
            </div>

            <div className="agenda-cal-weekdays">
              {WEEKDAYS_ES.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            <div className="agenda-cal-grid">
              {calendarDays.map((cell) => {
                const dayEvents = eventsByDate.get(cell.dateKey) || [];
                const isSelected = selectedDay === cell.dateKey;
                const isToday = todayKey === cell.dateKey;
                return (
                  <div
                    key={cell.dateKey}
                    className={`agenda-cal-cell ${cell.inMonth ? '' : 'muted-day'} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                    onClick={() => setSelectedDay(isSelected ? '' : cell.dateKey)}
                  >
                    <div className="agenda-cal-cell-head">
                      <span>{cell.day}</span>
                      <button
                        type="button"
                        className="agenda-day-add"
                        title="Crear evento en esta fecha"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCreateModal(cell.dateKey);
                        }}
                      >
                        +
                      </button>
                    </div>
                    <div className="agenda-cal-pills">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <div
                          key={ev.id}
                          className={`agenda-mini-pill ${ev.estado === 'CANCELADO' ? 'cancelled' : ''}`}
                          style={{
                            background: TYPE_META[ev.tipo as EventType]?.bg || '#EDE5F8',
                            color: TYPE_META[ev.tipo as EventType]?.color || '#492477',
                          }}
                          title={`${ev.titulo} (${STATUS_META[ev.estado as EventStatus]?.label || ev.estado})`}
                        >
                          {ev.titulo}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <small className="agenda-more-count">+{dayEvents.length - 3} más</small>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Listado de eventos */}
        <section className="card agenda-events-panel">
          <div className="agenda-panel-head">
            <div>
              <h2>
                {selectedDay
                  ? `Eventos del ${formatReadableDate(selectedDay)}`
                  : 'Todos los eventos registrados'}
              </h2>
              <p>
                {filteredEventos.length} evento(s) mostrado(s)
                {selectedDay && (
                  <>
                    {' · '}
                    <button
                      type="button"
                      className="auth-text-link"
                      onClick={() => setSelectedDay('')}
                    >
                      Ver todos los días
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>

          {loading ? (
            <p className="agenda-empty-msg">Cargando eventos desde PostgreSQL...</p>
          ) : filteredEventos.length === 0 ? (
            <div className="agenda-empty-box">
              <strong>No hay eventos para los filtros seleccionados</strong>
              <p>Crea una reunión, evaluación, actividad o comunicado para compartirlo con los apoderados.</p>
              <button type="button" className="btn primary" onClick={() => openCreateModal(selectedDay || todayKey)}>
                + Crear primer evento
              </button>
            </div>
          ) : (
            <div className="agenda-cards-stack">
              {filteredEventos.map((ev) => {
                const tMeta = TYPE_META[ev.tipo as EventType] || TYPE_META.COMUNICADO;
                const sMeta = STATUS_META[ev.estado as EventStatus] || STATUS_META.PROGRAMADO;
                const targetLabel =
                  ev.destinatarios_tipo === 'TODOS'
                    ? 'Todos los estudiantes'
                    : ev.destinatarios_tipo === 'AULA'
                      ? `${ev.grado || ''} ${ev.seccion || ''}`.trim() || 'Aula asignada'
                      : `${(ev.estudiantes_destinatarios || []).length} estudiante(s) específico(s)`;

                return (
                  <article
                    key={ev.id}
                    className={`agenda-event-card ${ev.estado === 'CANCELADO' ? 'is-cancelled' : ''}`}
                  >
                    <div className="agenda-event-top">
                      <div className="agenda-event-badges">
                        <span className={`badge ${tMeta.tone}`}>{tMeta.label}</span>
                        <span className={`badge ${sMeta.tone}`}>{sMeta.label}</span>
                        <span className="badge gray">{targetLabel}</span>
                      </div>
                      <time className="agenda-event-date">
                        {formatReadableDate(ev.fecha)}
                        {ev.hora_inicio && ` · ${formatTime(ev.hora_inicio)}`}
                        {ev.hora_fin && ` - ${formatTime(ev.hora_fin)}`}
                      </time>
                    </div>

                    <h3>{ev.titulo}</h3>
                    {ev.descripcion && <p className="agenda-event-desc">{ev.descripcion}</p>}

                    <div className="agenda-event-meta">
                      <span>Modalidad: <b>{ev.modalidad}</b></span>
                      {ev.ubicacion && <span>Lugar / Enlace: <b>{ev.ubicacion}</b></span>}
                    </div>

                    {ev.destinatarios_tipo === 'ESTUDIANTES' && Array.isArray(ev.estudiantes_destinatarios) && ev.estudiantes_destinatarios.length > 0 && (
                      <div className="agenda-student-chips">
                        {ev.estudiantes_destinatarios.map((s: any) => (
                          <span key={s.id}>{s.nombres} {s.apellidos}</span>
                        ))}
                      </div>
                    )}

                    {ev.estado === 'CANCELADO' && ev.motivo_cancelacion && (
                      <div className="agenda-cancel-note">
                        Motivo de cancelación: {ev.motivo_cancelacion}
                      </div>
                    )}

                    <div className="agenda-event-actions">
                      <button type="button" className="btn secondary" onClick={() => openEditModal(ev)}>
                        Editar
                      </button>
                      {ev.estado !== 'CANCELADO' && (
                        <button
                          type="button"
                          className="btn danger"
                          onClick={() => {
                            setCancelTarget(ev);
                            setCancelReason('');
                          }}
                        >
                          Cancelar evento
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Modal Crear / Editar Evento */}
      {showFormModal && (
        <div className="modal-backdrop">
          <div className="comparison-modal" style={{ maxWidth: '640px' }}>
            <button type="button" className="modal-close" onClick={() => setShowFormModal(false)}>✕</button>
            <span className="badge purple">{editingEvento ? 'Editar evento' : 'Nuevo evento compartido'}</span>
            <h1 style={{ fontSize: '20px' }}>
              {editingEvento ? 'Actualizar evento de la agenda' : 'Programar evento en la agenda'}
            </h1>
            <p className="modal-subtitle">
              Este evento se guardará en PostgreSQL y será visible inmediatamente para los apoderados destinatarios.
            </p>

            {formError && <div className="auth-alert error" style={{ marginTop: '14px' }}>{formError}</div>}

            <form onSubmit={handleSaveEvento} className="agenda-modal-form">
              <div className="form-grid">
                <label>
                  Tipo de evento
                  <select value={tipo} onChange={(e) => setTipo(e.target.value as EventType)}>
                    <option value="REUNION">Reunión</option>
                    <option value="EVALUACION">Evaluación</option>
                    <option value="ACTIVIDAD">Actividad</option>
                    <option value="COMUNICADO">Comunicado</option>
                  </select>
                </label>

                <label>
                  Modalidad
                  <select value={modalidad} onChange={(e) => setModalidad(e.target.value as EventModalidad)}>
                    <option value="PRESENCIAL">Presencial</option>
                    <option value="VIRTUAL">Virtual</option>
                    <option value="INFORMATIVO">Informativo</option>
                  </select>
                </label>

                <label className="span-2">
                  Título del evento
                  <input
                    type="text"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ej. Reunión de avance del II Bimestre"
                    required
                  />
                </label>

                <label>
                  Fecha
                  <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <label>
                    Hora inicio
                    <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
                  </label>
                  <label>
                    Hora fin
                    <input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} />
                  </label>
                </div>

                <label className="span-2">
                  Ubicación o enlace (opcional)
                  <input
                    type="text"
                    value={ubicacion}
                    onChange={(e) => setUbicacion(e.target.value)}
                    placeholder="Ej. Aula 3.º A o enlace de Google Meet"
                  />
                </label>

                <label>
                  Destinatarios
                  <select
                    value={destinatariosTipo}
                    onChange={(e) => setDestinatariosTipo(e.target.value as DestinatarioTipo)}
                  >
                    <option value="AULA">Por aula específica</option>
                    <option value="TODOS">Todos mis estudiantes</option>
                    <option value="ESTUDIANTES">Estudiantes específicos</option>
                  </select>
                </label>

                {destinatariosTipo === 'AULA' && (
                  <label>
                    Aula destinataria
                    <select value={aulaId} onChange={(e) => setAulaId(e.target.value)} required>
                      <option value="">Seleccionar aula</option>
                      {aulas.map((a) => (
                        <option key={a.id} value={String(a.id)}>
                          {a.grado} {a.seccion} ({a.total_estudiantes ?? 0} est.)
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {editingEvento && (
                  <label>
                    Estado del evento
                    <select value={estado} onChange={(e) => setEstado(e.target.value as EventStatus)}>
                      <option value="PROGRAMADO">Programado</option>
                      <option value="COMPLETADO">Completado</option>
                      <option value="CANCELADO">Cancelado</option>
                    </select>
                  </label>
                )}

                {destinatariosTipo === 'ESTUDIANTES' && (
                  <div className="span-2 agenda-student-picker">
                    <span>Selecciona los estudiantes destinatarios ({selectedStudentIds.length} seleccionados):</span>
                    <div className="agenda-student-picker-list">
                      {students.map((st) => (
                        <label key={st.id} className="agenda-student-check">
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(st.id)}
                            onChange={() => toggleStudent(st.id)}
                          />
                          <span>
                            {st.nombres} {st.apellidos} ({st.grado} {st.seccion})
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <label className="span-2">
                  Descripción e indicaciones para el apoderado
                  <textarea
                    rows={3}
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Detalle de temas, materiales requeridos o indicaciones..."
                  />
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={() => setShowFormModal(false)}>
                  Cerrar
                </button>
                <button type="submit" className="btn primary" disabled={saving}>
                  {saving ? 'Guardando...' : editingEvento ? 'Guardar cambios' : 'Publicar evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cancelar Evento */}
      {cancelTarget && (
        <div className="modal-backdrop">
          <div className="comparison-modal" style={{ maxWidth: '480px' }}>
            <button type="button" className="modal-close" onClick={() => setCancelTarget(null)}>✕</button>
            <span className="badge red">Cancelar evento</span>
            <h1 style={{ fontSize: '19px' }}>¿Confirmas cancelar "{cancelTarget.titulo}"?</h1>
            <p className="modal-subtitle">
              El evento no se eliminará; quedará marcado como CANCELADO para que los apoderados estén informados.
            </p>
            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', fontWeight: 600 }}>
                Motivo de cancelación (opcional)
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ej. Reprogramado por actividad institucional..."
                  style={{ borderRadius: '8px', border: '1px solid #DDD7E3', padding: '10px', fontSize: '12px' }}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn secondary" onClick={() => setCancelTarget(null)}>
                Volver
              </button>
              <button type="button" className="btn danger" disabled={saving} onClick={handleConfirmCancel}>
                {saving ? 'Cancelando...' : 'Confirmar cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// AGENDA COMPARTIDA — PORTAL DEL APODERADO (SOLO LECTURA)
// =========================================================================
export function ApoderadoAgendaSection({ selectedStudent }: { selectedStudent: any }) {
  const today = new Date();
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTipo, setFilterTipo] = useState<string>('TODOS');
  const [calMonth, setCalMonth] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDay, setSelectedDay] = useState('');

  useEffect(() => {
    if (selectedStudent?.id) {
      loadAgenda(selectedStudent.id);
    } else {
      setEventos([]);
      setLoading(false);
    }
  }, [selectedStudent?.id]);

  async function loadAgenda(estudianteId: number) {
    setLoading(true);
    try {
      const res = await api.getApoderadoAgenda(estudianteId);
      if (res.success && Array.isArray(res.data)) {
        setEventos(res.data);
      } else {
        setEventos([]);
      }
    } catch {
      setEventos([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return eventos.filter((ev) => {
      if (filterTipo !== 'TODOS' && ev.tipo !== filterTipo) return false;
      if (selectedDay && toDateKey(ev.fecha) !== selectedDay) return false;
      return true;
    });
  }, [eventos, filterTipo, selectedDay]);

  const calendarDays = useMemo(
    () => buildCalendarDays(calMonth.year, calMonth.month),
    [calMonth]
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const ev of eventos) {
      if (filterTipo !== 'TODOS' && ev.tipo !== filterTipo) continue;
      const k = toDateKey(ev.fecha);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(ev);
    }
    return map;
  }, [eventos, filterTipo]);

  return (
    <div className="agenda-pro-root guardian-agenda">
      <div className="agenda-pro-header">
        <div>
          <span className="badge purple">Agenda compartida · Solo lectura</span>
          <h1>Eventos y comunicados para {selectedStudent.nombres} {selectedStudent.apellidos}</h1>
          <p>
            Consulta reuniones, evaluaciones, actividades y avisos publicados por el docente del aula{' '}
            {selectedStudent.grado} {selectedStudent.seccion}.
          </p>
        </div>
        <div className="agenda-type-chips">
          {(['TODOS', 'REUNION', 'EVALUACION', 'ACTIVIDAD', 'COMUNICADO'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`agenda-chip ${filterTipo === t ? 'active' : ''}`}
              onClick={() => setFilterTipo(t)}
            >
              {t === 'TODOS' ? 'Todos' : TYPE_META[t].label}
            </button>
          ))}
        </div>
      </div>

      <div className="agenda-pro-workspace">
        <section className="card agenda-calendar-card">
          <div className="agenda-cal-top">
            <h2>{MONTHS_ES[calMonth.month]} {calMonth.year}</h2>
            <div className="agenda-cal-nav">
              <button
                type="button"
                className="btn secondary"
                onClick={() =>
                  setCalMonth((prev) =>
                    prev.month === 0
                      ? { year: prev.year - 1, month: 11 }
                      : { year: prev.year, month: prev.month - 1 }
                  )
                }
              >
                ←
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setCalMonth({ year: today.getFullYear(), month: today.getMonth() });
                  setSelectedDay('');
                }}
              >
                Hoy
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() =>
                  setCalMonth((prev) =>
                    prev.month === 11
                      ? { year: prev.year + 1, month: 0 }
                      : { year: prev.year, month: prev.month + 1 }
                  )
                }
              >
                →
              </button>
            </div>
          </div>

          <div className="agenda-cal-weekdays">
            {WEEKDAYS_ES.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="agenda-cal-grid">
            {calendarDays.map((cell) => {
              const dayEvents = eventsByDate.get(cell.dateKey) || [];
              const isSelected = selectedDay === cell.dateKey;
              return (
                <div
                  key={cell.dateKey}
                  className={`agenda-cal-cell ${cell.inMonth ? '' : 'muted-day'} ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedDay(isSelected ? '' : cell.dateKey)}
                >
                  <div className="agenda-cal-cell-head">
                    <span>{cell.day}</span>
                  </div>
                  <div className="agenda-cal-pills">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        className={`agenda-mini-pill ${ev.estado === 'CANCELADO' ? 'cancelled' : ''}`}
                        style={{
                          background: TYPE_META[ev.tipo as EventType]?.bg || '#EDE5F8',
                          color: TYPE_META[ev.tipo as EventType]?.color || '#492477',
                        }}
                      >
                        {ev.titulo}
                      </div>
                    ))}
                    {dayEvents.length > 2 && <small className="agenda-more-count">+{dayEvents.length - 2}</small>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card agenda-events-panel">
          <div className="agenda-panel-head">
            <div>
              <h2>
                {selectedDay ? `Agenda del ${formatReadableDate(selectedDay)}` : 'Próximos eventos y avisos'}
              </h2>
              <p>
                {filtered.length} evento(s) compartido(s)
                {selectedDay && (
                  <>
                    {' · '}
                    <button type="button" className="auth-text-link" onClick={() => setSelectedDay('')}>
                      Ver todos
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>

          {loading ? (
            <p className="agenda-empty-msg">Consultando agenda escolar...</p>
          ) : filtered.length === 0 ? (
            <div className="agenda-empty-box">
              <strong>No hay eventos registrados todavía</strong>
              <p>Cuando el docente publique una reunión, evaluación, actividad o comunicado para este estudiante aparecerá aquí automáticamente.</p>
            </div>
          ) : (
            <div className="agenda-cards-stack">
              {filtered.map((ev) => {
                const tMeta = TYPE_META[ev.tipo as EventType] || TYPE_META.COMUNICADO;
                const sMeta = STATUS_META[ev.estado as EventStatus] || STATUS_META.PROGRAMADO;
                return (
                  <article
                    key={`${ev.id}-${ev.estudiante_id}`}
                    className={`agenda-event-card ${ev.estado === 'CANCELADO' ? 'is-cancelled' : ''}`}
                  >
                    <div className="agenda-event-top">
                      <div className="agenda-event-badges">
                        <span className={`badge ${tMeta.tone}`}>{tMeta.label}</span>
                        <span className={`badge ${sMeta.tone}`}>{sMeta.label}</span>
                      </div>
                      <time className="agenda-event-date">
                        {formatReadableDate(ev.fecha)}
                        {ev.hora_inicio && ` · ${formatTime(ev.hora_inicio)}`}
                        {ev.hora_fin && ` - ${formatTime(ev.hora_fin)}`}
                      </time>
                    </div>

                    <h3>{ev.titulo}</h3>
                    {ev.descripcion && <p className="agenda-event-desc">{ev.descripcion}</p>}

                    <div className="agenda-event-meta">
                      <span>Publicado por: <b>Prof. {ev.docente_nombres} {ev.docente_apellidos}</b></span>
                      <span>Modalidad: <b>{ev.modalidad}</b></span>
                      {ev.ubicacion && <span>Lugar / Enlace: <b>{ev.ubicacion}</b></span>}
                    </div>

                    {ev.estado === 'CANCELADO' && (
                      <div className="agenda-cancel-note">
                        Evento cancelado por el docente{ev.motivo_cancelacion ? `: ${ev.motivo_cancelacion}` : '.'}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
