import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { User } from '../../types/auth';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { DocenteAgendaSection } from '../agenda/AgendaShared';
import { RegisterEvaluationModule } from './RegisterEvaluationModule';

type Page =
  | 'Inicio'
  | 'Mis aulas'
  | 'Estudiantes'
  | 'Evaluaciones'
  | 'Registrar evaluación'
  | 'Análisis y seguimiento'
  | 'Actividades de refuerzo'
  | 'Historial'
  | 'Agenda para apoderados'
  | 'Configuración';

type IconName =
  | 'home'
  | 'class'
  | 'users'
  | 'clipboard'
  | 'plus'
  | 'chart'
  | 'spark'
  | 'history'
  | 'message'
  | 'settings'
  | 'logout'
  | 'bell'
  | 'search'
  | 'arrow'
  | 'camera'
  | 'file'
  | 'edit'
  | 'check'
  | 'warning'
  | 'calendar'
  | 'more'
  | 'book'
  | 'download'
  | 'menu'
  | 'close'
  | 'chevron';

const iconPaths: Record<IconName, ReactNode> = {
  home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
  class: <><path d="M4 5h16v13H4z" /><path d="M8 22h8M12 18v4M8 9h8M8 13h5" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  clipboard: <><path d="M9 5H6a2 2 0 0 0-2 2v13h16V7a2 2 0 0 0-2-2h-3" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="m8 13 2 2 5-5" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  spark: <><path d="m12 3 1.4 4.2L18 9l-4.6 1.8L12 15l-1.4-4.2L6 9l4.6-1.8zM19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z" /></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
  message: <><path d="M4 4h16v13H8l-4 4z" /><path d="M8 9h8M8 13h5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
  logout: <><path d="M9 21H4V3h5M16 17l5-5-5-5M21 12H9" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  arrow: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
  camera: <><path d="M4 7h4l2-3h4l2 3h4v13H4z" /><circle cx="12" cy="13" r="4" /></>,
  file: <><path d="M6 2h8l4 4v16H6zM14 2v5h5" /><path d="M8 12h8M8 16h8M8 20h5" /></>,
  edit: <><path d="m4 20 4.5-1 10-10-3.5-3.5-10 10zM13.5 7l3.5 3.5" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  warning: <><path d="M12 3 2.5 20h19z" /><path d="M12 9v5M12 17.5v.5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  book: <><path d="M3 4h7a2 2 0 0 1 2 2v15a3 3 0 0 0-3-3H3zM21 4h-7a2 2 0 0 0-2 2v15a3 3 0 0 1 3-3h6z" /></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5M4 21h16" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  close: <><path d="m5 5 14 14M19 5 5 19" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
};

function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  );
}

function getInitials(nombres?: string, apellidos?: string) {
  return `${(nombres || 'E')[0]}${(apellidos || 'S')[0]}`.toUpperCase();
}

function getStudentFullName(s: any) {
  return `${s?.nombres || ''} ${s?.apellidos || ''}`.trim() || 'Estudiante';
}

function getStudentClassroomLabel(s: any) {
  return s?.grado ? `${s.grado} ${s.seccion || ''}`.trim() : 'Sin aula asignada';
}

function getResultBadgeInfo(marca?: string | null, nivelLogro?: string | null) {
  if (!marca) return { label: 'Sin evaluar', tone: 'gray' as const };
  const nivel = nivelLogro || (marca === 'LOGRADO' ? 'A' : marca === 'NO_LOGRADO' ? 'C' : 'B');
  if (marca === 'LOGRADO') return { label: `${nivel} · Logro esperado`, tone: 'green' as const };
  if (marca === 'NO_LOGRADO') return { label: `${nivel} · En inicio`, tone: 'red' as const };
  return { label: `${nivel} · En proceso`, tone: 'yellow' as const };
}

function getStudentFollowupStatus(s: any) {
  if ((s?.alertas_activas || 0) > 0 || s?.ultima_marca === 'NO_LOGRADO') {
    return { label: 'Necesita apoyo', isDanger: true };
  }
  if (s?.ultima_marca === 'NO_OBSERVADO') {
    return { label: 'En seguimiento', isDanger: false };
  }
  if (s?.ultima_marca === 'LOGRADO') {
    return { label: s.ultimo_nivel_logro === 'AD' ? 'Avance destacado' : 'Avance esperado', isDanger: false };
  }
  return { label: 'Sin registros', isDanger: false };
}

function formatDateShort(d?: string | null) {
  if (!d) return '—';
  return String(d).slice(0, 10);
}

function Logo() {
  return (
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
  );
}

function Avatar({ student, size = 'md' }: { student: any; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`avatar ${size}`} style={{ background: student?.color_avatar || '#D9C8EF' }}>
      {getInitials(student?.nombres, student?.apellidos)}
    </span>
  );
}

function Badge({ children, tone = 'purple' }: { children: ReactNode; tone?: 'purple' | 'green' | 'yellow' | 'red' | 'gray' | 'blue' }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function PageHeader({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  );
}

function Button({
  children,
  variant = 'primary',
  icon,
  onClick,
  type = 'button',
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  return (
    <button type={type} className={`btn ${variant}`} onClick={onClick}>
      {icon && <Icon name={icon} size={17} />}
      {children}
    </button>
  );
}

function MiniBars({ criterios }: { criterios: any[] }) {
  const data = criterios.length > 0
    ? criterios.map((c) => {
      const pct = c.total > 0 ? Math.round((c.logrados / c.total) * 100) : 0;
      return {
        name: String(c.descripcion || '').slice(0, 22),
        value: pct,
        prev: Math.max(0, pct - 10),
      };
    })
    : [];

  if (data.length === 0) {
    return (
      <div style={{ padding: '40px 10px', textAlign: 'center', color: '#766F87', fontSize: '12px' }}>
        Aún no hay evaluaciones registradas para mostrar barras de desempeño por criterio.
      </div>
    );
  }

  return (
    <div className="bar-chart">
      <div className="chart-grid">
        <span>100%</span>
        <span>75%</span>
        <span>50%</span>
        <span>25%</span>
        <span>0%</span>
      </div>
      <div className="bar-columns">
        {data.map((item) => (
          <div className="bar-column" key={item.name}>
            <div className="bars">
              <i style={{ height: `${item.prev}%` }} />
              <b style={{ height: `${item.value}%` }}>
                <em>{item.value}%</em>
              </b>
            </div>
            <span>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Donut({ niveles, totalStudents }: { niveles: any[]; totalStudents: number }) {
  const counts: Record<string, number> = { AD: 0, A: 0, B: 0, C: 0 };
  let sum = 0;
  for (const row of niveles || []) {
    if (row.nivel in counts) {
      counts[row.nivel] += Number(row.total || 0);
      sum += Number(row.total || 0);
    }
  }

  const pct = (k: string) => (sum > 0 ? Math.round((counts[k] / sum) * 100) : 0);
  const pAD = pct('AD');
  const pA = pct('A');
  const pB = pct('B');
  const pC = pct('C');

  const gradient =
    sum > 0
      ? `conic-gradient(#7041B5 0 ${pAD}%, #8E67CF ${pAD}% ${pAD + pA}%, #EDBA55 ${pAD + pA}% ${pAD + pA + pB}%, #D96767 ${pAD + pA + pB}%)`
      : 'conic-gradient(#E9E5EF 0 100%)';

  return (
    <div className="donut-wrap">
      <div className="donut" style={{ background: gradient }}>
        <div>
          <strong>{totalStudents}</strong>
          <span>estudiantes</span>
        </div>
      </div>
      <div className="legend">
        {[
          ['AD', `${pAD}%`, 'ad'],
          ['A', `${pA}%`, 'a'],
          ['B', `${pB}%`, 'b'],
          ['C', `${pC}%`, 'c'],
        ].map(([a, b, c]) => (
          <div key={a}>
            <i className={c} />
            <span>{a}</span>
            <strong>{b}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

// 1. DASHBOARD
function Dashboard({
  go,
  teacherName,
  resumenData,
  students,
  evaluaciones,
  alertas,
  onOpenStudentAnalysis,
}: {
  go: (p: Page) => void;
  teacherName: string;
  resumenData: any;
  students: any[];
  evaluaciones: any[];
  alertas: any[];
  onOpenStudentAnalysis: (studentId: number) => void;
}) {
  const counts = resumenData?.resumen || {
    total_aulas: 0,
    total_estudiantes: students.length,
    total_evaluaciones: evaluaciones.length,
    evaluaciones_por_revisar: 0,
    alertas_activas: alertas.length,
    estudiantes_con_alerta: 0,
  };

  const attentionStudents = useMemo(() => {
    const withAlert = students.filter((s) => (s.alertas_activas || 0) > 0 || s.ultima_marca === 'NO_LOGRADO');
    return withAlert.slice(0, 3);
  }, [students]);

  const niveles = resumenData?.niveles || [];
  const totalResults = niveles.reduce((acc: number, r: any) => acc + Number(r.total || 0), 0);
  const achievedResults = niveles
    .filter((r: any) => r.nivel === 'AD' || r.nivel === 'A')
    .reduce((acc: number, r: any) => acc + Number(r.total || 0), 0);
  const achievedPct = totalResults > 0 ? Math.round((achievedResults / totalResults) * 100) : 0;

  return (
    <>
      <PageHeader title={`¡Hola, ${teacherName}!`} subtitle="Aquí puedes revisar el progreso real de tus estudiantes">
        <Button icon="plus" onClick={() => go('Registrar evaluación')}>
          Registrar evaluación
        </Button>
      </PageHeader>
      <div className="summary-grid">
        {[
          ['class', 'Aulas registradas', String(counts.total_aulas), 'En PostgreSQL', 'purple'],
          ['users', 'Estudiantes', String(counts.total_estudiantes), `En ${counts.total_aulas} aulas`, 'blue'],
          ['clipboard', 'Evaluaciones realizadas', String(counts.total_evaluaciones), `${counts.evaluaciones_por_revisar} por revisar`, 'green'],
          ['warning', 'Necesitan atención', String(counts.estudiantes_con_alerta), `${counts.alertas_activas} alertas activas`, 'orange'],
        ].map(([icon, label, number, meta, tone]) => (
          <div className="summary-card" key={label}>
            <div className={`summary-icon ${tone}`}>
              <Icon name={icon as IconName} />
            </div>
            <div>
              <span>{label}</span>
              <strong>{number}</strong>
              <small>{meta}</small>
            </div>
          </div>
        ))}
      </div>

      {counts.evaluaciones_por_revisar > 0 && (
        <div className="notice-row">
          <div className="notice-icon">
            <Icon name="clipboard" />
          </div>
          <div>
            <strong>Tienes {counts.evaluaciones_por_revisar} evaluación(es) pendiente(s) de revisión</strong>
            <span>Revisa los datos antes de incorporarlos al análisis.</span>
          </div>
          <button onClick={() => go('Evaluaciones')}>
            Revisar ahora <Icon name="arrow" size={16} />
          </button>
        </div>
      )}

      <div className="dashboard-grid">
        <section className="card chart-card wide">
          <div className="card-heading">
            <div>
              <h2>Desempeño por criterio</h2>
              <p>Porcentaje de logro según registros en PostgreSQL</p>
            </div>
            <div className="legend-inline">
              <span><i className="current" />Actual</span>
              <span><i className="previous" />Referencia</span>
            </div>
          </div>
          <MiniBars criterios={resumenData?.criteriosDesempeno || []} />
        </section>
        <section className="card chart-card">
          <div className="card-heading">
            <div>
              <h2>Niveles de logro</h2>
              <p>Distribución general</p>
            </div>
          </div>
          <Donut niveles={niveles} totalStudents={counts.total_estudiantes} />
          <p className="chart-note">
            <Icon name="spark" size={15} />{' '}
            {totalResults > 0
              ? `El ${achievedPct}% de los resultados alcanzó logro esperado o destacado.`
              : 'Registra tu primera evaluación para visualizar la distribución real.'}
          </p>
        </section>
      </div>

      <section className="section-block">
        <div className="section-title">
          <div>
            <h2>Estudiantes que necesitan atención</h2>
            <p>Alertas basadas en resultados registrados en PostgreSQL. Tú validas cada caso.</p>
          </div>
          <button onClick={() => go('Análisis y seguimiento')}>
            Ver análisis completo <Icon name="arrow" size={16} />
          </button>
        </div>
        {attentionStudents.length === 0 ? (
          <div className="card" style={{ padding: '20px', textAlign: 'center', color: '#766F87', fontSize: '12px' }}>
            No hay estudiantes con alertas activas en este momento.
          </div>
        ) : (
          <div className="attention-grid">
            {attentionStudents.map((student) => (
              <article className="student-alert-card" key={student.id}>
                <div className="student-top">
                  <Avatar student={student} />
                  <div>
                    <strong>{getStudentFullName(student)}</strong>
                    <span>{getStudentClassroomLabel(student)} · {student.ultimo_area || 'General'}</span>
                  </div>
                  <Badge tone={(student.alertas_activas || 0) > 0 ? 'red' : 'yellow'}>
                    {(student.alertas_activas || 0) > 0 ? 'Atención' : 'Seguimiento'}
                  </Badge>
                </div>
                <div className="criterion">
                  <span>Criterio observado</span>
                  <strong>{student.ultimo_criterio || 'Evaluación reciente'}</strong>
                </div>
                <div className="result-history">
                  <span>Último resultado</span>
                  <div>
                    <Badge tone={student.ultima_marca === 'NO_LOGRADO' ? 'red' : 'yellow'}>
                      {student.ultima_marca === 'NO_LOGRADO' ? 'No logrado' : 'En proceso'}
                    </Badge>
                  </div>
                </div>
                <button onClick={() => onOpenStudentAnalysis(student.id)}>
                  Ver seguimiento <Icon name="arrow" size={16} />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card recent-card">
        <div className="card-heading">
          <div>
            <h2>Actividad reciente</h2>
            <p>Últimos registros realizados</p>
          </div>
          <button onClick={() => go('Historial')}>Ver todo</button>
        </div>
        {evaluaciones.length === 0 ? (
          <p style={{ color: '#766F87', fontSize: '12px', marginTop: '14px' }}>
            Aún no has registrado evaluaciones en PostgreSQL. Usa "Registrar evaluación" para empezar.
          </p>
        ) : (
          <div className="activity-list">
            {evaluaciones.slice(0, 5).map((e) => (
              <div className="activity" key={e.id}>
                <span className={`activity-icon ${e.area_color || 'violet'}`}>
                  <Icon name={e.fuente_origen === 'OCR' ? 'camera' : 'clipboard'} />
                </span>
                <div>
                  <strong>{e.titulo}</strong>
                  <span>
                    {e.area_nombre || 'Área'} · {e.grado ? `${e.grado} ${e.seccion}` : 'General'}
                  </span>
                </div>
                <Badge tone={e.estado === 'POR_REVISAR' ? 'yellow' : 'green'}>{e.estado}</Badge>
                <time>{formatDateShort(e.fecha)}</time>
                <Icon name="chevron" size={17} />
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

// 2. MIS AULAS
function Classrooms({
  aulas,
  students,
  onEnterAula,
  onViewStudent,
  onCreatedAula,
}: {
  aulas: any[];
  students: any[];
  onEnterAula: (aulaId: number | 'ALL') => void;
  onViewStudent: (s: any) => void;
  onCreatedAula: () => void;
}) {
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [showNewModal, setShowNewModal] = useState(false);
  const [grado, setGrado] = useState('5.º grado');
  const [seccion, setSeccion] = useState('A');
  const [nivel, setNivel] = useState('Primaria');
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);

  const uniqueGrades = useMemo(
    () => Array.from(new Set(aulas.map((a) => a.grado).filter(Boolean))),
    [aulas]
  );

  const filteredRooms = useMemo(() => {
    return aulas.filter((a) => {
      if (gradeFilter !== 'ALL' && a.grado !== gradeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const label = `${a.grado} ${a.seccion} ${a.nivel}`.toLowerCase();
        if (!label.includes(q)) return false;
      }
      return true;
    });
  }, [aulas, gradeFilter, search]);

  const colors = ['violet', 'blue', 'green', 'orange'];

  async function handleCreateAula(e: React.FormEvent) {
    e.preventDefault();
    setFormErr('');
    setSaving(true);
    try {
      const res = await api.createDocenteAula({ grado, seccion, nivel, anioEscolar: '2025' });
      if (res.success) {
        setShowNewModal(false);
        onCreatedAula();
      } else {
        setFormErr(res.message || 'No se pudo crear el aula.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Mis aulas" subtitle="Organiza tus estudiantes y evaluaciones por aula (datos reales PostgreSQL)">
        <Button icon="plus" onClick={() => setShowNewModal(true)}>Nueva aula</Button>
      </PageHeader>
      <div className="filter-bar">
        <div className="search-box">
          <Icon name="search" size={18} />
          <input
            placeholder="Buscar por grado o sección..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="select-wrap">
          <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
            <option value="ALL">Todos los grados</option>
            {uniqueGrades.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <Icon name="chevron" size={15} />
        </label>
        <span className="records">{filteredRooms.length} aulas</span>
      </div>

      <div className="room-grid">
        {filteredRooms.map((a, idx) => (
          <article className="room-card" key={a.id}>
            <div className={`room-cover ${colors[idx % colors.length]}`}>
              <span>
                <Icon name={idx % 2 === 1 ? 'chart' : 'book'} size={30} />
              </span>
              <Badge tone="gray">{a.anio_escolar || '2025'}</Badge>
            </div>
            <div className="room-body">
              <p>{a.nivel || 'Primaria'}</p>
              <h2>{a.grado} {a.seccion}</h2>
              <div className="room-stats">
                <span>
                  <Icon name="users" size={16} /> <b>{a.total_estudiantes ?? 0}</b> estudiantes
                </span>
                <span>
                  <Icon name="clipboard" size={16} /> <b>{a.total_evaluaciones ?? 0}</b> evaluaciones
                </span>
              </div>
              <Button variant="secondary" onClick={() => onEnterAula(a.id)}>
                Ingresar al aula <Icon name="arrow" size={16} />
              </Button>
            </div>
          </article>
        ))}
      </div>

      <section className="card table-card">
        <div className="card-heading">
          <div>
            <h2>Vista completa de estudiantes ({students.length})</h2>
            <p>Todos los estudiantes registrados en tus aulas</p>
          </div>
          <button onClick={() => onEnterAula('ALL')}>Ver gestión individual</button>
        </div>
        <StudentTable students={students} onView={onViewStudent} />
      </section>

      {showNewModal && (
        <div className="modal-backdrop">
          <div className="comparison-modal" style={{ maxWidth: '460px' }}>
            <button type="button" className="modal-close" onClick={() => setShowNewModal(false)}>✕</button>
            <span className="badge purple">Nueva aula</span>
            <h1 style={{ fontSize: '20px' }}>Registrar aula en PostgreSQL</h1>
            {formErr && <div className="auth-alert error" style={{ marginTop: '12px' }}>{formErr}</div>}
            <form onSubmit={handleCreateAula} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', fontWeight: 600 }}>
                Grado
                <input value={grado} onChange={(e) => setGrado(e.target.value)} required style={{ height: '40px', borderRadius: '8px', border: '1px solid #DDD7E3', padding: '0 10px' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', fontWeight: 600 }}>
                Sección
                <input value={seccion} onChange={(e) => setSeccion(e.target.value)} required style={{ height: '40px', borderRadius: '8px', border: '1px solid #DDD7E3', padding: '0 10px' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', fontWeight: 600 }}>
                Nivel educativo
                <select value={nivel} onChange={(e) => setNivel(e.target.value)} style={{ height: '40px', borderRadius: '8px', border: '1px solid #DDD7E3', padding: '0 10px' }}>
                  <option value="Primaria">Primaria</option>
                  <option value="Secundaria">Secundaria</option>
                  <option value="Inicial">Inicial</option>
                </select>
              </label>
              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={() => setShowNewModal(false)}>Cancelar</button>
                <button type="submit" className="btn primary" disabled={saving}>{saving ? 'Creando...' : 'Guardar aula'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// TABLA COMPLETA DE ESTUDIANTES (SIN LÍMITE DE 5)
function StudentTable({
  students,
  selectedId,
  onView,
}: {
  students: any[];
  selectedId?: number | null;
  onView: (s: any) => void;
}) {
  if (students.length === 0) {
    return (
      <div style={{ padding: '28px', textAlign: 'center', color: '#766F87', fontSize: '12px' }}>
        No se encontraron estudiantes para los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Estudiante</th>
            <th>Código</th>
            <th>Último resultado</th>
            <th>Seguimiento</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {students.map((s) => {
            const resInfo = getResultBadgeInfo(s.ultima_marca, s.ultimo_nivel_logro);
            const followInfo = getStudentFollowupStatus(s);
            const isSelected = selectedId === s.id;
            return (
              <tr
                key={s.id}
                style={isSelected ? { background: '#F6F2FC' } : undefined}
              >
                <td>
                  <div className="person-cell">
                    <Avatar student={s} size="sm" />
                    <div>
                      <strong>{getStudentFullName(s)}</strong>
                      <span>{getStudentClassroomLabel(s)}</span>
                    </div>
                  </div>
                </td>
                <td className="muted">{s.codigo}</td>
                <td>
                  <Badge tone={resInfo.tone}>{resInfo.label}</Badge>
                </td>
                <td>
                  <span className={`status-dot ${followInfo.isDanger ? 'danger' : 'ok'}`} />
                  {followInfo.label}
                </td>
                <td>
                  <button className="table-action" onClick={() => onView(s)}>
                    Ver perfil <Icon name="chevron" size={15} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// 3. ESTUDIANTES
function StudentsPage({
  aulas,
  students,
  selectedAulaId,
  onChangeAula,
  selectedStudentId,
  onSelectStudent,
  onOpenFullAnalysis,
  alertFilterIds,
  alertFilterLabel,
  onClearAlertFilter,
  onStudentCreated,
}: {
  aulas: any[];
  students: any[];
  selectedAulaId: number | 'ALL';
  onChangeAula: (aulaId: number | 'ALL') => void;
  selectedStudentId: number | null;
  onSelectStudent: (id: number) => void;
  onOpenFullAnalysis: (id: number) => void;
  alertFilterIds: number[] | null;
  alertFilterLabel: string;
  onClearAlertFilter: () => void;
  onStudentCreated: () => void;
}) {
  const [search, setSearch] = useState('');
  const [profileTab, setProfileTab] = useState<'resumen' | 'historial' | 'refuerzos'>('resumen');
  const [analysis, setAnalysis] = useState<any>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Modal agregar estudiante
  const [showAddModal, setShowAddModal] = useState(false);
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [dni, setDni] = useState('');
  const [codigo, setCodigo] = useState('');
  const [newAulaId, setNewAulaId] = useState<string>(aulas[0]?.id ? String(aulas[0].id) : '');
  const [colorAvatar, setColorAvatar] = useState('#D9C8EF');
  const [addErr, setAddErr] = useState('');
  const [savingStudent, setSavingStudent] = useState(false);

  useEffect(() => {
    if (!newAulaId && aulas.length > 0) setNewAulaId(String(aulas[0].id));
  }, [aulas]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (selectedAulaId !== 'ALL' && s.aula_id !== selectedAulaId) return false;
      if (alertFilterIds && !alertFilterIds.includes(s.id)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${s.nombres} ${s.apellidos} ${s.codigo} ${s.dni || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [students, selectedAulaId, alertFilterIds, search]);

  const activeStudent = useMemo(() => {
    if (filteredStudents.length === 0) return null;
    return filteredStudents.find((s) => s.id === selectedStudentId) || filteredStudents[0];
  }, [filteredStudents, selectedStudentId]);

  useEffect(() => {
    if (!activeStudent?.id) {
      setAnalysis(null);
      return;
    }
    let cancelled = false;
    setLoadingAnalysis(true);
    api.getDocenteEstudianteAnalisis(activeStudent.id)
      .then((res) => {
        if (!cancelled && res.success) {
          setAnalysis(res.data);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAnalysis(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeStudent?.id]);

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    setAddErr('');
    setSavingStudent(true);
    try {
      const res = await api.addDocenteEstudiante({
        nombres,
        apellidos,
        dni: dni || undefined,
        codigo,
        aulaId: newAulaId ? Number(newAulaId) : null,
        colorAvatar,
      });
      if (res.success) {
        setShowAddModal(false);
        setNombres('');
        setApellidos('');
        setDni('');
        setCodigo('');
        onStudentCreated();
        if (res.data?.id) onSelectStudent(res.data.id);
      } else {
        setAddErr(res.message || 'No se pudo registrar el estudiante.');
      }
    } finally {
      setSavingStudent(false);
    }
  }

  const resultados = analysis?.resultados || [];
  const latestResult = resultados[0];
  const recomendaciones = analysis?.recomendaciones || [];

  return (
    <>
      <PageHeader title="Estudiantes" subtitle="Consulta el progreso individual y los criterios que requieren apoyo">
        <Button icon="plus" onClick={() => setShowAddModal(true)}>Agregar estudiante</Button>
      </PageHeader>

      {alertFilterIds && (
        <div className="notice-row" style={{ marginTop: 0, marginBottom: '16px' }}>
          <div className="notice-icon"><Icon name="warning" /></div>
          <div>
            <strong>Mostrando estudiantes con alerta: {alertFilterLabel}</strong>
            <span>{filteredStudents.length} estudiante(s) vinculado(s) a esta alerta.</span>
          </div>
          <button onClick={onClearAlertFilter}>Mostrar todos los estudiantes</button>
        </div>
      )}

      <div className="filter-bar">
        <div className="search-box">
          <Icon name="search" size={18} />
          <input
            placeholder="Buscar estudiante por nombre o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="select-wrap">
          <select
            value={selectedAulaId === 'ALL' ? 'ALL' : String(selectedAulaId)}
            onChange={(e) => onChangeAula(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
          >
            <option value="ALL">Todas las aulas</option>
            {aulas.map((a) => (
              <option key={a.id} value={String(a.id)}>
                {a.grado} {a.seccion} ({a.total_estudiantes ?? 0})
              </option>
            ))}
          </select>
          <Icon name="chevron" size={15} />
        </label>
        <span className="records">{filteredStudents.length} estudiante(s)</span>
      </div>

      <div className="student-layout">
        <section className="card table-card">
          <StudentTable
            students={filteredStudents}
            selectedId={activeStudent?.id}
            onView={(s) => onSelectStudent(s.id)}
          />
        </section>

        {activeStudent && (
          <aside className="student-profile">
            <div className="profile-head">
              <Avatar student={activeStudent} size="lg" />
              <div>
                <h2>{getStudentFullName(activeStudent)}</h2>
                <p>{getStudentClassroomLabel(activeStudent)} · {activeStudent.codigo}</p>
                {activeStudent.codigo_vinculacion_apoderado && (
                  <small style={{ fontSize: '9px', color: '#7041B5', fontWeight: 700 }}>
                    Código apoderado: {activeStudent.codigo_vinculacion_apoderado}
                  </small>
                )}
              </div>
            </div>

            <div className="profile-tabs">
              <button className={profileTab === 'resumen' ? 'active' : ''} onClick={() => setProfileTab('resumen')}>Resumen</button>
              <button className={profileTab === 'historial' ? 'active' : ''} onClick={() => setProfileTab('historial')}>Historial ({resultados.length})</button>
              <button className={profileTab === 'refuerzos' ? 'active' : ''} onClick={() => setProfileTab('refuerzos')}>Refuerzos ({recomendaciones.length})</button>
            </div>

            {loadingAnalysis ? (
              <p style={{ fontSize: '11px', color: '#766F87', padding: '20px 0' }}>Cargando datos reales del estudiante...</p>
            ) : profileTab === 'resumen' ? (
              <>
                <div className="profile-summary">
                  <div>
                    <span>Último nivel</span>
                    <strong className={latestResult?.marca === 'NO_LOGRADO' ? 'danger-text' : ''}>
                      {latestResult ? (latestResult.nivel_logro || (latestResult.marca === 'LOGRADO' ? 'A' : latestResult.marca === 'NO_LOGRADO' ? 'C' : 'B')) : '—'}
                    </strong>
                    <small>{latestResult ? getResultBadgeInfo(latestResult.marca, latestResult.nivel_logro).label : 'Sin registros'}</small>
                  </div>
                  <div>
                    <span>Evaluaciones</span>
                    <strong>{activeStudent.total_evaluaciones ?? 0}</strong>
                    <small>Registradas</small>
                  </div>
                  <div>
                    <span>Alertas activas</span>
                    <strong className={(analysis?.alertas?.length || 0) > 0 ? 'danger-text' : ''}>
                      {analysis?.alertas?.filter((al: any) => al.estado === 'ACTIVA').length || 0}
                    </strong>
                    <small>Por validar</small>
                  </div>
                </div>

                <div className="criteria-list">
                  <h3>Criterios evaluados recientemente</h3>
                  {resultados.length === 0 ? (
                    <p style={{ fontSize: '11px', color: '#766F87', margin: '10px 0' }}>
                      Este estudiante aún no tiene resultados registrados en evaluaciones.
                    </p>
                  ) : (
                    resultados.slice(0, 5).map((r: any) => (
                      <div key={r.id}>
                        <span>
                          <i className={r.marca === 'NO_LOGRADO' ? 'red-dot' : r.marca === 'LOGRADO' ? 'green-dot' : 'yellow-dot'} />
                          {r.criterio_descripcion}
                        </span>
                        <Badge tone={r.marca === 'NO_LOGRADO' ? 'red' : r.marca === 'LOGRADO' ? 'green' : 'yellow'}>
                          {r.marca === 'LOGRADO' ? 'Logrado' : r.marca === 'NO_LOGRADO' ? 'Requiere apoyo' : 'No observado'}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : profileTab === 'historial' ? (
              <div className="criteria-list" style={{ marginTop: '14px' }}>
                {resultados.length === 0 ? (
                  <p style={{ fontSize: '11px', color: '#766F87' }}>Sin evaluaciones registradas aún.</p>
                ) : (
                  resultados.map((r: any) => (
                    <div key={r.id} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                      <strong>{r.evaluacion_titulo} · {formatDateShort(r.evaluacion_fecha)}</strong>
                      <span style={{ color: '#766F87' }}>{r.criterio_descripcion}</span>
                      <Badge tone={r.marca === 'NO_LOGRADO' ? 'red' : r.marca === 'LOGRADO' ? 'green' : 'yellow'}>
                        {r.marca} {r.nivel_logro ? `(${r.nivel_logro})` : ''}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="criteria-list" style={{ marginTop: '14px' }}>
                {recomendaciones.length === 0 ? (
                  <p style={{ fontSize: '11px', color: '#766F87' }}>Sin actividades de refuerzo registradas aún.</p>
                ) : (
                  recomendaciones.map((rec: any) => (
                    <div key={rec.id} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                      <strong>{rec.titulo}</strong>
                      <span style={{ color: '#766F87' }}>{rec.descripcion}</span>
                      <Badge tone="purple">{rec.estado}</Badge>
                    </div>
                  ))
                )}
              </div>
            )}

            <Button onClick={() => onOpenFullAnalysis(activeStudent.id)}>Ver seguimiento completo</Button>
          </aside>
        )}
      </div>

      {showAddModal && (
        <div className="modal-backdrop">
          <div className="comparison-modal" style={{ maxWidth: '500px' }}>
            <button type="button" className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            <span className="badge purple">Nuevo estudiante</span>
            <h1 style={{ fontSize: '20px' }}>Registrar estudiante en aula</h1>
            <p className="modal-subtitle">Se generará automáticamente su código de vinculación para apoderados.</p>
            {addErr && <div className="auth-alert error" style={{ marginTop: '12px' }}>{addErr}</div>}
            <form onSubmit={handleAddStudent} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-grid">
                <label>
                  Nombres
                  <input value={nombres} onChange={(e) => setNombres(e.target.value)} required style={{ height: '40px', borderRadius: '8px', border: '1px solid #DDD7E3', padding: '0 10px' }} />
                </label>
                <label>
                  Apellidos
                  <input value={apellidos} onChange={(e) => setApellidos(e.target.value)} required style={{ height: '40px', borderRadius: '8px', border: '1px solid #DDD7E3', padding: '0 10px' }} />
                </label>
                <label>
                  Código único (Ej. AV-03-009)
                  <input value={codigo} onChange={(e) => setCodigo(e.target.value)} required style={{ height: '40px', borderRadius: '8px', border: '1px solid #DDD7E3', padding: '0 10px' }} />
                </label>
                <label>
                  DNI (opcional, 8 dígitos)
                  <input value={dni} onChange={(e) => setDni(e.target.value)} maxLength={8} style={{ height: '40px', borderRadius: '8px', border: '1px solid #DDD7E3', padding: '0 10px' }} />
                </label>
                <label>
                  Aula asignada
                  <select value={newAulaId} onChange={(e) => setNewAulaId(e.target.value)} style={{ height: '40px', borderRadius: '8px', border: '1px solid #DDD7E3', padding: '0 10px' }}>
                    {aulas.map((a) => (
                      <option key={a.id} value={String(a.id)}>{a.grado} {a.seccion}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Color de avatar
                  <select value={colorAvatar} onChange={(e) => setColorAvatar(e.target.value)} style={{ height: '40px', borderRadius: '8px', border: '1px solid #DDD7E3', padding: '0 10px' }}>
                    <option value="#D9C8EF">Lila</option>
                    <option value="#BEE3D0">Menta</option>
                    <option value="#C8D9F5">Celeste</option>
                    <option value="#F4C6A6">Durazno</option>
                  </select>
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={() => setShowAddModal(false)}>Cancelar</button>
                <button type="submit" className="btn primary" disabled={savingStudent}>
                  {savingStudent ? 'Guardando...' : 'Registrar estudiante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// 4. EVALUACIONES
function EvaluationsPage({
  go,
  aulas,
  areas,
  evaluaciones,
}: {
  go: (p: Page) => void;
  aulas: any[];
  areas: any[];
  evaluaciones: any[];
}) {
  const [search, setSearch] = useState('');
  const [aulaFilter, setAulaFilter] = useState('ALL');
  const [areaFilter, setAreaFilter] = useState('ALL');

  const filtered = useMemo(() => {
    return evaluaciones.filter((e) => {
      if (aulaFilter !== 'ALL' && String(e.aula_id || '') !== aulaFilter) return false;
      if (areaFilter !== 'ALL' && String(e.area_id || '') !== areaFilter) return false;
      if (search.trim() && !String(e.titulo || '').toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [evaluaciones, aulaFilter, areaFilter, search]);

  const completadas = filtered.filter((e) => e.estado === 'COMPLETADA').length;
  const porRevisar = filtered.filter((e) => e.estado === 'POR_REVISAR').length;
  const borradores = filtered.filter((e) => e.estado === 'BORRADOR').length;

  return (
    <>
      <PageHeader title="Evaluaciones" subtitle="Consulta y revisa todos tus registros de evaluación en PostgreSQL">
        <Button icon="plus" onClick={() => go('Registrar evaluación')}>Nueva evaluación</Button>
      </PageHeader>
      <div className="filter-bar">
        <div className="search-box">
          <Icon name="search" size={18} />
          <input placeholder="Buscar evaluación..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <label className="select-wrap">
          <select value={aulaFilter} onChange={(e) => setAulaFilter(e.target.value)}>
            <option value="ALL">Todas las aulas</option>
            {aulas.map((a) => (
              <option key={a.id} value={String(a.id)}>{a.grado} {a.seccion}</option>
            ))}
          </select>
          <Icon name="chevron" size={15} />
        </label>
        <label className="select-wrap">
          <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
            <option value="ALL">Todas las áreas</option>
            {areas.map((ar) => (
              <option key={ar.id} value={String(ar.id)}>{ar.nombre}</option>
            ))}
          </select>
          <Icon name="chevron" size={15} />
        </label>
      </div>
      <div className="evaluation-stats">
        <div>
          <span>{filtered.length}</span>
          <small>Total registradas</small>
        </div>
        <div>
          <span>{completadas}</span>
          <small>Completadas</small>
        </div>
        <div>
          <span>{porRevisar}</span>
          <small>Por revisar</small>
        </div>
        <div>
          <span>{borradores}</span>
          <small>Borradores</small>
        </div>
      </div>
      <section className="card table-card">
        {filtered.length === 0 ? (
          <div style={{ padding: '28px', textAlign: 'center', color: '#766F87', fontSize: '12px' }}>
            Aún no hay evaluaciones registradas con estos filtros.
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Evaluación</th>
                  <th>Aula y área</th>
                  <th>Fecha</th>
                  <th>Fuente</th>
                  <th>Estudiantes</th>
                  <th>Criterios</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <div className="evaluation-name">
                        <span className={e.area_color || 'violet'}>
                          <Icon name="clipboard" size={18} />
                        </span>
                        <strong>{e.titulo}</strong>
                      </div>
                    </td>
                    <td>
                      <strong>{e.grado ? `${e.grado} ${e.seccion}` : 'General'}</strong>
                      <small>{e.area_nombre || 'Sin área'}</small>
                    </td>
                    <td>{formatDateShort(e.fecha)}</td>
                    <td><Badge tone="purple">{e.fuente_origen}</Badge></td>
                    <td>{e.total_evaluados} de {e.total_estudiantes_aula || e.total_evaluados}</td>
                    <td>{e.total_criterios} criterios</td>
                    <td>
                      <Badge tone={e.estado === 'POR_REVISAR' ? 'yellow' : e.estado === 'BORRADOR' ? 'gray' : 'green'}>
                        {e.estado}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

// 6. ANÁLISIS Y SEGUIMIENTO
function Analysis({
  go,
  aulas,
  areas,
  students,
  alertas,
  resumenData,
  initialTab,
  selectedStudentId,
  onSelectStudentId,
  onViewAlertStudents,
  onPlanReinforcement,
}: {
  go: (p: Page) => void;
  aulas: any[];
  areas: any[];
  students: any[];
  alertas: any[];
  resumenData: any;
  initialTab: 'group' | 'individual';
  selectedStudentId: number | null;
  onSelectStudentId: (id: number) => void;
  onViewAlertStudents: (studentIds: number[], title: string) => void;
  onPlanReinforcement: (studentId: number) => void;
}) {
  const [tab, setTab] = useState<'group' | 'individual'>(initialTab);
  const [aulaFilter, setAulaFilter] = useState('ALL');
  const [areaFilter, setAreaFilter] = useState('ALL');

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  // Agrupar alertas por criterio/título para mostrar en la vista grupal + lista de estudiantes afectados
  const groupedAlerts = useMemo(() => {
    const map = new Map<string, { title: string; area: string; detail: string; level: string; studentIds: number[]; count: number }>();
    for (const al of alertas) {
      if (areaFilter !== 'ALL' && al.area_nombre !== areaFilter) continue;
      const key = `${al.criterio_id || al.titulo}`;
      if (!map.has(key)) {
        map.set(key, {
          title: al.criterio_descripcion || al.titulo,
          area: al.area_nombre || 'General',
          detail: al.detalle,
          level: al.nivel || 'ALTA',
          studentIds: [],
          count: 0,
        });
      }
      const g = map.get(key)!;
      if (!g.studentIds.includes(al.estudiante_id)) {
        g.studentIds.push(al.estudiante_id);
        g.count++;
      }
    }
    return Array.from(map.values());
  }, [alertas, areaFilter]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => aulaFilter === 'ALL' || String(s.aula_id || '') === aulaFilter);
  }, [students, aulaFilter]);

  const totalNiveles = (resumenData?.niveles || []).reduce((acc: number, n: any) => acc + Number(n.total || 0), 0);
  const logradosCount = (resumenData?.niveles || [])
    .filter((n: any) => n.nivel === 'AD' || n.nivel === 'A')
    .reduce((acc: number, n: any) => acc + Number(n.total || 0), 0);
  const logroPct = totalNiveles > 0 ? Math.round((logradosCount / totalNiveles) * 100) : 0;

  return (
    <>
      <PageHeader title="Análisis y seguimiento" subtitle="Convierte tus registros en información útil para orientar el apoyo">
        <label className="select-wrap">
          <select value={aulaFilter} onChange={(e) => setAulaFilter(e.target.value)}>
            <option value="ALL">Todas las aulas</option>
            {aulas.map((a) => (
              <option key={a.id} value={String(a.id)}>{a.grado} {a.seccion}</option>
            ))}
          </select>
          <Icon name="chevron" size={15} />
        </label>
        <label className="select-wrap">
          <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
            <option value="ALL">Todas las áreas</option>
            {areas.map((ar) => (
              <option key={ar.id} value={ar.nombre}>{ar.nombre}</option>
            ))}
          </select>
          <Icon name="chevron" size={15} />
        </label>
      </PageHeader>
      <div className="analysis-tabs">
        <button className={tab === 'group' ? 'active' : ''} onClick={() => setTab('group')}>
          <Icon name="users" /> Análisis grupal
        </button>
        <button className={tab === 'individual' ? 'active' : ''} onClick={() => setTab('individual')}>
          <Icon name="users" /> Análisis individual ({filteredStudents.length})
        </button>
      </div>

      {tab === 'group' ? (
        <>
          <div className="analysis-hero">
            <div>
              <Badge tone="red">
                <Icon name="warning" size={13} /> {groupedAlerts.length} alerta(s) requieren revisión
              </Badge>
              <h2>{groupedAlerts.length > 0 ? 'Hay criterios que necesitan tu atención' : 'Sin alertas críticas pendientes'}</h2>
              <p>Las alertas se generan automáticamente cuando un estudiante presenta dos resultados "No logrado" consecutivos en un mismo criterio.</p>
            </div>
            <div className="analysis-ring">
              <strong>{logroPct}%</strong>
              <span>logro grupal</span>
            </div>
          </div>

          <div className="dashboard-grid analysis-grid">
            <section className="card chart-card wide">
              <div className="card-heading">
                <div>
                  <h2>Logro por criterio</h2>
                  <p>Porcentaje de estudiantes que alcanzó el criterio</p>
                </div>
              </div>
              <MiniBars criterios={resumenData?.criteriosDesempeno || []} />
            </section>
            <section className="card difficulty-card">
              <div className="card-heading">
                <div>
                  <h2>Mayor dificultad</h2>
                  <p>Ordenado por prioridad</p>
                </div>
              </div>
              {groupedAlerts.length === 0 ? (
                <p style={{ fontSize: '11px', color: '#766F87', marginTop: '14px' }}>
                  No se detectaron dificultades repetidas hasta el momento.
                </p>
              ) : (
                groupedAlerts.map((a, i) => (
                  <div className="difficulty" key={a.title}>
                    <span>{i + 1}</span>
                    <div>
                      <strong>{a.title}</strong>
                      <small>{a.count} de {Math.max(students.length, 1)} estudiantes</small>
                      <i>
                        <b style={{ width: `${Math.min(100, Math.round((a.count / Math.max(students.length, 1)) * 100))}%` }} />
                      </i>
                    </div>
                    <em>{Math.round((a.count / Math.max(students.length, 1)) * 100)}%</em>
                  </div>
                ))
              )}
            </section>
          </div>

          <section className="section-block">
            <div className="section-title">
              <div>
                <h2>Alertas para validar</h2>
                <p>Haz clic en «Ver estudiantes» para filtrar el listado con los alumnos afectados por cada alerta.</p>
              </div>
            </div>
            {groupedAlerts.length === 0 ? (
              <div className="card" style={{ padding: '22px', textAlign: 'center', color: '#766F87', fontSize: '12px' }}>
                No hay alertas activas por validar en PostgreSQL.
              </div>
            ) : (
              <div className="alerts-list">
                {groupedAlerts.map((a, i) => (
                  <article className="smart-alert" key={a.title}>
                    <span className={a.level === 'ALTA' || i === 0 ? 'high' : 'medium'}>
                      <Icon name="warning" />
                    </span>
                    <div className="alert-main">
                      <div>
                        <Badge tone={a.level === 'ALTA' ? 'red' : 'yellow'}>Prioridad {a.level.toLowerCase()}</Badge>
                        <small>{a.area}</small>
                      </div>
                      <h3>{a.title}</h3>
                      <p>{a.detail}</p>
                    </div>
                    <div className="alert-count">
                      <strong>{a.count}</strong>
                      <span>estudiante(s)</span>
                    </div>
                    <div className="alert-actions">
                      <Button variant="secondary" onClick={() => onViewAlertStudents(a.studentIds, a.title)}>
                        Ver estudiantes
                      </Button>
                      <Button
                        onClick={() => {
                          if (a.studentIds[0]) onPlanReinforcement(a.studentIds[0]);
                          else go('Actividades de refuerzo');
                        }}
                      >
                        Planificar refuerzo
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <IndividualAnalysis
          students={filteredStudents}
          selectedStudentId={selectedStudentId}
          onSelectStudentId={onSelectStudentId}
          onPlanReinforcement={onPlanReinforcement}
        />
      )}
    </>
  );
}

function IndividualAnalysis({
  students,
  selectedStudentId,
  onSelectStudentId,
  onPlanReinforcement,
}: {
  students: any[];
  selectedStudentId: number | null;
  onSelectStudentId: (id: number) => void;
  onPlanReinforcement: (id: number) => void;
}) {
  const [search, setSearch] = useState('');
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const visibleStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter((s) => `${s.nombres} ${s.apellidos} ${s.codigo}`.toLowerCase().includes(q));
  }, [students, search]);

  const activeId = useMemo(() => {
    if (visibleStudents.length === 0) return null;
    const found = visibleStudents.find((s) => s.id === selectedStudentId);
    return found ? found.id : visibleStudents[0].id;
  }, [visibleStudents, selectedStudentId]);

  useEffect(() => {
    if (!activeId) {
      setAnalysisData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.getDocenteEstudianteAnalisis(activeId)
      .then((res) => {
        if (!cancelled && res.success) {
          setAnalysisData(res.data);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const st = analysisData?.estudiante || visibleStudents.find((s) => s.id === activeId);
  const resultados = analysisData?.resultados || [];
  const alertas = analysisData?.alertas || [];
  const followups = analysisData?.seguimientos || [];

  const latest = resultados[0];
  const previous = resultados[1];

  // Puntos reales para gráfico SVG según historial del estudiante
  const chartPoints = useMemo(() => {
    if (resultados.length === 0) return [];
    const chronological = [...resultados].slice(0, 6).reverse();
    return chronological.map((r: any, idx: number) => {
      const x = chronological.length === 1 ? 300 : 30 + (idx * 540) / (chronological.length - 1);
      const score = r.marca === 'LOGRADO' ? (r.nivel_logro === 'AD' ? 35 : 55) : r.marca === 'NO_OBSERVADO' ? 95 : 135;
      return { x, y: score, label: formatDateShort(r.evaluacion_fecha), title: r.evaluacion_titulo };
    });
  }, [resultados]);

  return (
    <div className="individual-analysis">
      <aside className="card student-selector">
        <div className="search-box">
          <Icon name="search" />
          <input
            placeholder="Buscar estudiante..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {visibleStudents.map((stItem) => (
          <button
            key={stItem.id}
            className={activeId === stItem.id ? 'selected' : ''}
            onClick={() => onSelectStudentId(stItem.id)}
          >
            <Avatar student={stItem} size="sm" />
            <span>
              <strong>{getStudentFullName(stItem)}</strong>
              <small>{getStudentClassroomLabel(stItem)} · {stItem.codigo}</small>
            </span>
            <Icon name="chevron" size={15} />
          </button>
        ))}
      </aside>

      {st ? (
        <section className="card individual-detail">
          <div className="profile-head">
            <Avatar student={st} size="lg" />
            <div>
              <h2>{getStudentFullName(st)}</h2>
              <p>{getStudentClassroomLabel(st)} · Código {st.codigo}</p>
            </div>
            <Badge tone={alertas.some((a: any) => a.estado === 'ACTIVA') ? 'red' : 'green'}>
              {alertas.some((a: any) => a.estado === 'ACTIVA') ? 'Requiere apoyo' : 'Seguimiento al día'}
            </Badge>
          </div>

          {loading ? (
            <p style={{ padding: '24px 0', color: '#766F87', fontSize: '12px' }}>Cargando análisis individual desde PostgreSQL...</p>
          ) : resultados.length === 0 ? (
            <div style={{ padding: '28px', textAlign: 'center', color: '#766F87', fontSize: '12px' }}>
              <strong>{getStudentFullName(st)}</strong> aún no tiene evaluaciones registradas.
            </div>
          ) : (
            <>
              <div className="comparison-cards">
                <div>
                  <small>Evaluación anterior</small>
                  <strong>{previous ? (previous.marca === 'LOGRADO' ? 'Logrado' : previous.marca === 'NO_LOGRADO' ? 'No logrado' : 'No observado') : 'Sin registro previo'}</strong>
                  <span>{previous ? `${formatDateShort(previous.evaluacion_fecha)} · ${previous.criterio_descripcion}` : '—'}</span>
                </div>
                <Icon name="arrow" />
                <div>
                  <small>Evaluación actual</small>
                  <strong>{latest ? (latest.marca === 'LOGRADO' ? 'Logrado' : latest.marca === 'NO_LOGRADO' ? 'No logrado' : 'No observado') : '—'}</strong>
                  <span>{latest ? `${formatDateShort(latest.evaluacion_fecha)} · ${latest.criterio_descripcion}` : '—'}</span>
                </div>
              </div>

              <div className="progress-panel large">
                <h3>Evolución por evaluación ({chartPoints.length} registros recientes)</h3>
                <svg viewBox="0 0 600 170">
                  {chartPoints.length > 1 && (
                    <path
                      d={chartPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ')}
                      fill="none"
                      stroke="#7041B5"
                      strokeWidth="4"
                    />
                  )}
                  {chartPoints.map((p, idx) => (
                    <circle key={idx} cx={p.x} cy={p.y} r="6" fill="#fff" stroke="#7041B5" strokeWidth="4" />
                  ))}
                </svg>
              </div>

              {alertas.length > 0 && (
                <div className="validation-note">
                  <Icon name="warning" />
                  <p>
                    <strong>Alerta activa en “{alertas[0].criterio_descripcion || alertas[0].titulo}”.</strong>
                    <span>{alertas[0].detalle}</span>
                  </p>
                </div>
              )}

              <div className="criteria-list" style={{ marginTop: '20px' }}>
                <h3>Historial de resultados y seguimientos ({resultados.length})</h3>
                {resultados.slice(0, 8).map((r: any) => (
                  <div key={r.id}>
                    <span>
                      <i className={r.marca === 'NO_LOGRADO' ? 'red-dot' : r.marca === 'LOGRADO' ? 'green-dot' : 'yellow-dot'} />
                      {r.evaluacion_titulo} — {r.criterio_descripcion}
                    </span>
                    <Badge tone={r.marca === 'NO_LOGRADO' ? 'red' : r.marca === 'LOGRADO' ? 'green' : 'yellow'}>
                      {r.marca} {r.nivel_logro ? `(${r.nivel_logro})` : ''}
                    </Badge>
                  </div>
                ))}
                {followups.length > 0 && followups.map((f: any) => (
                  <div key={`f-${f.id}`}>
                    <span><i className="yellow-dot" /> Seguimiento ({formatDateShort(f.fecha)}): {f.descripcion}</span>
                    <Badge tone="purple">{f.tipo}</Badge>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <Button onClick={() => onPlanReinforcement(st.id)}>Planificar refuerzo para {st.nombres}</Button>
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="card individual-detail">
          <p style={{ color: '#766F87', fontSize: '12px' }}>No hay estudiantes disponibles para analizar.</p>
        </section>
      )}
    </div>
  );
}

// 7. ACTIVIDADES DE REFUERZO
function Reinforcement({
  students,
  selectedStudentId,
  recomendaciones,
  onSaved,
}: {
  students: any[];
  selectedStudentId: number | null;
  recomendaciones: any[];
  onSaved: (msg: string) => void;
}) {
  const [targetStudentId, setTargetStudentId] = useState<number | ''>(selectedStudentId || students[0]?.id || '');
  const [editing, setEditing] = useState(true);
  const [titulo, setTitulo] = useState('Lectura breve: encontrar la idea central');
  const [descripcion, setDescripcion] = useState(
    'Leer un texto corto y responder preguntas sobre su contenido, diferenciando la idea principal de los detalles que la apoyan.'
  );
  const [fechaAplicacion, setFechaAplicacion] = useState(new Date().toISOString().slice(0, 10));
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedStudentId) setTargetStudentId(selectedStudentId);
    else if (!targetStudentId && students.length > 0) setTargetStudentId(students[0].id);
  }, [selectedStudentId, students]);

  const currentStudent = students.find((s) => s.id === Number(targetStudentId)) || students[0];

  async function handleSaveRecomendacion() {
    if (!currentStudent) return;
    setSaving(true);
    try {
      const res = await api.createDocenteRecomendacion({
        estudianteId: currentStudent.id,
        titulo,
        descripcion,
        estado: 'ACEPTADA',
        fechaAplicacion,
        observaciones,
      });
      if (res.success) {
        onSaved('Actividad de refuerzo guardada en PostgreSQL');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Actividades de refuerzo" subtitle="Organiza apoyos editables y guárdalos en PostgreSQL">
        <label className="select-wrap">
          <select value={targetStudentId} onChange={(e) => setTargetStudentId(Number(e.target.value))}>
            {students.map((st) => (
              <option key={st.id} value={st.id}>{getStudentFullName(st)} ({getStudentClassroomLabel(st)})</option>
            ))}
          </select>
          <Icon name="chevron" size={15} />
        </label>
      </PageHeader>

      {currentStudent && (
        <div className="reinforce-context">
          <div className="context-student">
            <Avatar student={currentStudent} size="lg" />
            <div>
              <small>Estudiante seleccionado</small>
              <h2>{getStudentFullName(currentStudent)}</h2>
              <span>{getStudentClassroomLabel(currentStudent)} · {currentStudent.codigo}</span>
            </div>
          </div>
          <div className="context-criterion">
            <small>Criterio observado</small>
            <strong>{currentStudent.ultimo_criterio || 'Seguimiento pedagógico general'}</strong>
          </div>
        </div>
      )}

      <div className="reinforce-layout">
        <section className="card evidence-panel">
          <div className="panel-label">
            <span>1</span>
            <div>
              <h2>Actividades registradas</h2>
              <p>Historial real de refuerzos en PostgreSQL ({recomendaciones.length}).</p>
            </div>
          </div>
          {recomendaciones.length === 0 ? (
            <p style={{ fontSize: '11px', color: '#766F87' }}>Aún no hay actividades guardadas. Acepta la propuesta de la derecha para registrar una.</p>
          ) : (
            <div className="evidence-timeline">
              {recomendaciones.slice(0, 6).map((rec) => (
                <div key={rec.id}>
                  <i />
                  <time>{formatDateShort(rec.fecha_aplicacion || rec.created_at)}</time>
                  <strong>{rec.estudiante_nombres} {rec.estudiante_apellidos} · {rec.titulo}</strong>
                  <Badge tone="purple">{rec.estado}</Badge>
                  <p>{rec.descripcion}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card proposal-panel">
          <div className="panel-label">
            <span>2</span>
            <div>
              <h2>Adapta la actividad propuesta</h2>
              <p>Los cambios se guardarán en la base de datos para el seguimiento y portal del apoderado.</p>
            </div>
          </div>
          <label>
            Título de la actividad
            <input disabled={!editing} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </label>
          <label>
            Descripción
            <textarea disabled={!editing} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </label>
          <div className="form-grid">
            <label>
              Fecha de aplicación
              <input type="date" value={fechaAplicacion} onChange={(e) => setFechaAplicacion(e.target.value)} />
            </label>
          </div>
          <label>
            Observaciones
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Agrega indicaciones o ajustes para el estudiante..."
            />
          </label>
          <div className="proposal-actions">
            <Button variant="secondary" icon="edit" onClick={() => setEditing(!editing)}>
              {editing ? 'Bloquear edición' : 'Editar propuesta'}
            </Button>
            <Button icon="check" onClick={handleSaveRecomendacion}>
              {saving ? 'Guardando...' : 'Guardar actividad en PostgreSQL'}
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}

// 8. HISTORIAL
function HistoryPage({ aulas, historial }: { aulas: any[]; historial: any }) {
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'EVAL' | 'REC'>('ALL');
  const [aulaFilter, setAulaFilter] = useState('ALL');

  const items = useMemo(() => {
    const evals = (historial?.evaluaciones || [])
      .filter((e: any) => aulaFilter === 'ALL' || String(e.aula_id || '') === aulaFilter)
      .map((e: any) => ({
        key: `ev-${e.id}`,
        kind: 'EVAL',
        date: formatDateShort(e.fecha),
        badge: `Evaluación · ${e.fuente_origen}`,
        tone: 'blue' as const,
        title: e.titulo,
        sub: `${e.area_nombre || 'Área'} · ${e.grado ? `${e.grado} ${e.seccion}` : 'General'}`,
        meta: `${e.total_evaluados} estudiantes · ${e.total_criterios} criterios`,
      }));

    const recs = (historial?.recomendaciones || []).map((r: any) => ({
      key: `rec-${r.id}`,
      kind: 'REC',
      date: formatDateShort(r.fecha_aplicacion || r.created_at),
      badge: 'Actividad de refuerzo',
      tone: 'purple' as const,
      title: r.titulo,
      sub: `${r.estudiante_nombres} ${r.estudiante_apellidos}`,
      meta: r.descripcion,
    }));

    return [...evals, ...recs]
      .filter((item) => typeFilter === 'ALL' || item.kind === typeFilter)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [historial, typeFilter, aulaFilter]);

  return (
    <>
      <PageHeader title="Historial" subtitle="Consulta evaluaciones y refuerzos reales registrados en PostgreSQL" />
      <div className="filter-bar">
        <label className="select-wrap">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}>
            <option value="ALL">Todos los tipos</option>
            <option value="EVAL">Evaluaciones</option>
            <option value="REC">Refuerzos</option>
          </select>
          <Icon name="chevron" size={15} />
        </label>
        <label className="select-wrap">
          <select value={aulaFilter} onChange={(e) => setAulaFilter(e.target.value)}>
            <option value="ALL">Todas las aulas</option>
            {aulas.map((a) => (
              <option key={a.id} value={String(a.id)}>{a.grado} {a.seccion}</option>
            ))}
          </select>
          <Icon name="chevron" size={15} />
        </label>
      </div>
      {items.length === 0 ? (
        <div className="card" style={{ padding: '28px', textAlign: 'center', color: '#766F87', fontSize: '12px' }}>
          No hay registros en el historial todavía.
        </div>
      ) : (
        <div className="timeline">
          {items.map((item) => (
            <div className="timeline-item" key={item.key}>
              <div className="timeline-date">{item.date}</div>
              <i />
              <article className="card">
                <span className={`history-icon ${item.tone}`}>
                  <Icon name={item.kind === 'REC' ? 'spark' : 'clipboard'} />
                </span>
                <div>
                  <Badge tone={item.tone}>{item.badge}</Badge>
                  <h2>{item.title}</h2>
                  <p>{item.sub}</p>
                  <small>{item.meta}</small>
                </div>
              </article>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// 10. CONFIGURACIÓN → MI PERFIL DOCENTE
const MAX_PHOTO_BYTES = 3 * 1024 * 1024; // 3 MB
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const NIVELES_EDUCATIVOS = ['Inicial', 'Primaria', 'Secundaria', 'Inicial y Primaria', 'Primaria y Secundaria'];

function SettingsPage({
  user,
  onUserUpdated,
  onNotify,
}: {
  user?: User | null;
  onUserUpdated: (updatedUser: User) => void;
  onNotify: (msg: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [nombres, setNombres] = useState(user?.docente?.nombres || '');
  const [apellidos, setApellidos] = useState(user?.docente?.apellidos || '');
  const [email, setEmail] = useState(user?.email || '');
  const [telefono, setTelefono] = useState(user?.docente?.telefono || '');
  const [institucionEducativa, setInstitucionEducativa] = useState(user?.docente?.institucionEducativa || '');
  const [nivelEducativo, setNivelEducativo] = useState(user?.docente?.nivelEducativo || 'Primaria');
  const [savedFoto, setSavedFoto] = useState<string | null>(user?.docente?.fotoPerfil || null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  function syncFormFromUser(u: User | null | undefined) {
    if (!u) return;
    setNombres(u.docente?.nombres || '');
    setApellidos(u.docente?.apellidos || '');
    setEmail(u.email || '');
    setTelefono(u.docente?.telefono || '');
    setInstitucionEducativa(u.docente?.institucionEducativa || '');
    setNivelEducativo(u.docente?.nivelEducativo || 'Primaria');
    setSavedFoto(u.docente?.fotoPerfil || null);
  }

  useEffect(() => {
    let cancelled = false;
    setLoadingProfile(true);
    api.getDocentePerfil()
      .then((res) => {
        if (!cancelled && res.success && res.user) {
          syncFormFromUser(res.user);
          onUserUpdated(res.user);
        }
      })
      .catch(() => {
        if (!cancelled) setErrorMsg('No se pudo consultar el perfil actualizado desde PostgreSQL.');
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasFormChanges = useMemo(() => {
    return (
      nombres.trim() !== (user?.docente?.nombres || '').trim() ||
      apellidos.trim() !== (user?.docente?.apellidos || '').trim() ||
      email.trim().toLowerCase() !== (user?.email || '').trim().toLowerCase() ||
      telefono.trim() !== (user?.docente?.telefono || '').trim() ||
      institucionEducativa.trim() !== (user?.docente?.institucionEducativa || '').trim() ||
      nivelEducativo.trim() !== (user?.docente?.nivelEducativo || 'Primaria').trim() ||
      photoPreview !== null
    );
  }, [nombres, apellidos, email, telefono, institucionEducativa, nivelEducativo, photoPreview, user]);

  function handleSelectPhoto(e: ChangeEvent<HTMLInputElement>) {
    setErrorMsg('');
    setSuccessMsg('');
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ALLOWED_PHOTO_TYPES.has(file.type.toLowerCase())) {
      setErrorMsg('Formato de imagen no permitido. Selecciona un archivo JPG, JPEG, PNG o WEBP.');
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      setErrorMsg('La fotografía supera el tamaño máximo permitido de 3 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoPreview(reader.result);
      } else {
        setErrorMsg('No se pudo leer el archivo seleccionado.');
      }
    };
    reader.onerror = () => setErrorMsg('Error al leer la fotografía desde tu dispositivo.');
    reader.readAsDataURL(file);
  }

  async function handleSavePhotoOnly() {
    if (!photoPreview) return;
    setErrorMsg('');
    setSuccessMsg('');
    setSavingPhoto(true);
    try {
      const res = await api.updateDocenteFoto(photoPreview);
      if (res.success && res.user) {
        setSavedFoto(res.user.docente?.fotoPerfil || null);
        setPhotoPreview(null);
        onUserUpdated(res.user);
        setSuccessMsg(res.message || 'Fotografía de perfil guardada permanentemente.');
        onNotify('Fotografía de perfil actualizada');
      } else {
        setErrorMsg(res.message || 'No se pudo guardar la fotografía.');
      }
    } catch {
      setErrorMsg('Error de conexión al guardar la fotografía.');
    } finally {
      setSavingPhoto(false);
    }
  }

  async function handleConfirmDeletePhoto() {
    setErrorMsg('');
    setSuccessMsg('');
    setDeletingPhoto(true);
    try {
      const res = await api.deleteDocenteFoto();
      if (res.success && res.user) {
        setSavedFoto(null);
        setPhotoPreview(null);
        setShowDeleteConfirm(false);
        onUserUpdated(res.user);
        setSuccessMsg(res.message || 'Fotografía eliminada. Se muestra tu avatar con iniciales.');
        onNotify('Fotografía de perfil eliminada');
      } else {
        setErrorMsg(res.message || 'No se pudo eliminar la fotografía.');
      }
    } catch {
      setErrorMsg('Error de conexión al eliminar la fotografía.');
    } finally {
      setDeletingPhoto(false);
    }
  }

  function handleCancelChanges() {
    setErrorMsg('');
    setSuccessMsg('');
    setPhotoPreview(null);
    syncFormFromUser(user);
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (nombres.trim().length < 2) {
      setErrorMsg('Los nombres deben tener al menos 2 caracteres.');
      return;
    }
    if (apellidos.trim().length < 2) {
      setErrorMsg('Los apellidos deben tener al menos 2 caracteres.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('Ingresa un correo electrónico válido.');
      return;
    }
    if (telefono.trim() && !/^[0-9+\-\s()]{6,20}$/.test(telefono.trim())) {
      setErrorMsg('El teléfono debe contener entre 6 y 20 caracteres numéricos válidos.');
      return;
    }
    if (institucionEducativa.trim().length < 3) {
      setErrorMsg('Ingresa el nombre de tu institución educativa.');
      return;
    }

    setSavingProfile(true);
    try {
      const profileRes = await api.updateDocentePerfil({
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        email: email.trim(),
        telefono: telefono.trim(),
        institucionEducativa: institucionEducativa.trim(),
        nivelEducativo: nivelEducativo.trim(),
      });

      if (!profileRes.success || !profileRes.user) {
        setErrorMsg(profileRes.message || 'No se pudieron guardar los cambios del perfil.');
        return;
      }

      let latestUser = profileRes.user;

      if (photoPreview) {
        const photoRes = await api.updateDocenteFoto(photoPreview);
        if (!photoRes.success || !photoRes.user) {
          onUserUpdated(latestUser);
          setErrorMsg(photoRes.message || 'Los datos del perfil se guardaron, pero hubo un problema al guardar la fotografía.');
          return;
        }
        latestUser = photoRes.user;
        setPhotoPreview(null);
      }

      syncFormFromUser(latestUser);
      onUserUpdated(latestUser);
      setSuccessMsg('Perfil docente actualizado y guardado en PostgreSQL.');
      onNotify('Perfil actualizado correctamente');
    } catch {
      setErrorMsg('Error de conexión al guardar los cambios del perfil.');
    } finally {
      setSavingProfile(false);
    }
  }

  const displayedPhoto = photoPreview || savedFoto;
  const initials = `${(nombres.trim()[0] || 'D')}${(apellidos.trim()[0] || 'A')}`.toUpperCase();
  const dni = user?.dni || user?.docente?.dni || '';
  const nivelOptions = NIVELES_EDUCATIVOS.includes(nivelEducativo)
    ? NIVELES_EDUCATIVOS
    : [nivelEducativo, ...NIVELES_EDUCATIVOS].filter(Boolean);

  return (
    <>
      <PageHeader title="Configuración" subtitle="Administra tu perfil docente y fotografía de cuenta" />
      <div className="settings-layout">
        <aside className="settings-nav">
          <button type="button" className="active">Mi perfil</button>
        </aside>

        <section className="card settings-form">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <h2>Mi perfil docente</h2>
              <p>Actualiza tus datos personales, contacto institucional y fotografía de perfil.</p>
            </div>
            {loadingProfile && <Badge tone="purple">Sincronizando...</Badge>}
          </div>

          {errorMsg && <div className="auth-alert error" style={{ marginTop: '14px' }}>{errorMsg}</div>}
          {successMsg && <div className="auth-alert success" style={{ marginTop: '14px' }}>{successMsg}</div>}

          {/* Fotografía de perfil */}
          <div className="profile-edit" style={{ flexWrap: 'wrap' }}>
            {displayedPhoto ? (
              <img
                src={displayedPhoto}
                alt={`Foto de ${nombres} ${apellidos}`}
                className="avatar lg"
                style={{ objectFit: 'cover', border: '2px solid #D9CDEC' }}
              />
            ) : (
              <span className="avatar lg">{initials}</span>
            )}

            <div style={{ gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleSelectPhoto}
                  style={{ display: 'none' }}
                />
                <Button
                  variant="secondary"
                  icon="camera"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {savedFoto || photoPreview ? 'Cambiar foto' : 'Subir foto'}
                </Button>

                {photoPreview && (
                  <>
                    <Button
                      icon="check"
                      onClick={handleSavePhotoOnly}
                    >
                      {savingPhoto ? 'Guardando foto...' : 'Guardar foto'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setPhotoPreview(null)}
                    >
                      Descartar vista previa
                    </Button>
                  </>
                )}

                {savedFoto && !photoPreview && (
                  <Button
                    variant="danger"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Eliminar foto
                  </Button>
                )}
              </div>

              <small>
                {photoPreview
                  ? 'Vista previa lista para guardar. Formatos permitidos: JPG, JPEG, PNG o WEBP (máx. 3 MB).'
                  : 'Formatos permitidos: JPG, JPEG, PNG o WEBP · Tamaño máximo: 3 MB.'}
              </small>
            </div>
          </div>

          <form onSubmit={handleSaveProfile}>
            <div className="form-grid">
              <label>
                Nombres
                <input
                  type="text"
                  value={nombres}
                  onChange={(e) => setNombres(e.target.value)}
                  required
                  minLength={2}
                  maxLength={150}
                  disabled={savingProfile}
                />
              </label>

              <label>
                Apellidos
                <input
                  type="text"
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  required
                  minLength={2}
                  maxLength={150}
                  disabled={savingProfile}
                />
              </label>

              <label>
                Correo electrónico
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={255}
                  disabled={savingProfile}
                />
              </label>

              <label>
                Teléfono
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej. 987654321"
                  maxLength={20}
                  disabled={savingProfile}
                />
              </label>

              <label>
                Institución educativa
                <input
                  type="text"
                  value={institucionEducativa}
                  onChange={(e) => setInstitucionEducativa(e.target.value)}
                  required
                  minLength={3}
                  maxLength={255}
                  disabled={savingProfile}
                />
              </label>

              <label>
                Nivel educativo
                <select
                  value={nivelEducativo}
                  onChange={(e) => setNivelEducativo(e.target.value)}
                  disabled={savingProfile}
                  style={{ height: '40px', border: '1px solid #DDD7E3', borderRadius: '8px', padding: '0 11px', fontSize: '10px', background: '#fff' }}
                >
                  {nivelOptions.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>

              <label className="span-2">
                DNI (identificador único no modificable)
                <input
                  type="text"
                  value={dni}
                  readOnly
                  disabled
                  style={{ background: '#F3EFF8', color: '#6E687A', cursor: 'not-allowed' }}
                />
              </label>
            </div>

            <div className="form-footer" style={{ marginTop: '22px' }}>
              <button
                type="button"
                className="btn secondary"
                onClick={handleCancelChanges}
                disabled={savingProfile || !hasFormChanges}
              >
                Cancelar cambios
              </button>
              <button
                type="submit"
                className="btn primary"
                disabled={savingProfile || savingPhoto}
              >
                {savingProfile ? 'Guardando cambios...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </section>
      </div>

      {showDeleteConfirm && (
        <div className="modal-backdrop">
          <div className="comparison-modal" style={{ maxWidth: '440px' }}>
            <button type="button" className="modal-close" onClick={() => setShowDeleteConfirm(false)}>✕</button>
            <span className="badge red">Confirmar eliminación</span>
            <h1 style={{ fontSize: '19px' }}>¿Eliminar tu fotografía de perfil?</h1>
            <p className="modal-subtitle">
              Se eliminará tu imagen actual de PostgreSQL y volverás a mostrar tu avatar con iniciales ({initials}).
            </p>
            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletingPhoto}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={handleConfirmDeletePhoto}
                disabled={deletingPhoto}
              >
                {deletingPhoto ? 'Eliminando...' : 'Sí, eliminar foto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// PANEL PRINCIPAL DEL DOCENTE
export function DocentePanel({ user, onLogout }: { user?: User | null; onLogout: () => void }) {
  const { updateUser } = useAuth();
  const [page, setPage] = useState<Page>('Inicio');
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState('');

  // Datos reales de PostgreSQL
  const [aulas, setAulas] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [criteriosBase, setCriteriosBase] = useState<any[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<any[]>([]);
  const [alertas, setAlertas] = useState<any[]>([]);
  const [resumenData, setResumenData] = useState<any>(null);
  const [historialData, setHistorialData] = useState<any>(null);
  const [recomendaciones, setRecomendaciones] = useState<any[]>([]);

  // Navegación contextual entre módulos
  const [selectedAulaId, setSelectedAulaId] = useState<number | 'ALL'>('ALL');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [alertFilterIds, setAlertFilterIds] = useState<number[] | null>(null);
  const [alertFilterLabel, setAlertFilterLabel] = useState('');
  const [analysisTab, setAnalysisTab] = useState<'group' | 'individual'>('group');

  useEffect(() => {
    refreshAll();
  }, []);

  async function refreshAll() {
    const [aulasRes, estRes, areasRes, critRes, evalRes, alRes, resRes, histRes, recRes] = await Promise.all([
      api.getDocenteAulas(),
      api.getDocenteEstudiantes(),
      api.getDocenteAreas(),
      api.getDocenteCriterios(),
      api.getDocenteEvaluaciones(),
      api.getDocenteAlertas(),
      api.getDocenteResumen(),
      api.getDocenteHistorial(),
      api.getDocenteRecomendaciones(),
    ]);
    if (aulasRes.success) setAulas(aulasRes.data || []);
    if (estRes.success) {
      const list = estRes.data || [];
      setStudents(list);
      if (!selectedStudentId && list.length > 0) setSelectedStudentId(list[0].id);
    }
    if (areasRes.success) setAreas(areasRes.data || []);
    if (critRes.success) setCriteriosBase(critRes.data || []);
    if (evalRes.success) setEvaluaciones(evalRes.data || []);
    if (alRes.success) setAlertas(alRes.data || []);
    if (resRes.success) setResumenData(resRes.data || null);
    if (histRes.success) setHistorialData(histRes.data || null);
    if (recRes.success) setRecomendaciones(recRes.data || []);
  }

  const title = useMemo(() => (page === 'Inicio' ? 'Resumen general' : page), [page]);

  const teacherName = user?.docente
    ? `${user.docente.nombres} ${user.docente.apellidos}`
    : 'Docente AVer';
  const schoolName = user?.docente?.institucionEducativa || 'Institución Educativa';
  const teacherInitials = user?.docente
    ? `${user.docente.nombres[0]}${user.docente.apellidos[0]}`
    : 'DA';

  const navItems: { label: Page; icon: IconName; badge?: string }[] = useMemo(() => [
    { label: 'Inicio', icon: 'home' },
    { label: 'Mis aulas', icon: 'class' },
    { label: 'Estudiantes', icon: 'users' },
    { label: 'Evaluaciones', icon: 'clipboard' },
    { label: 'Registrar evaluación', icon: 'plus' },
    { label: 'Análisis y seguimiento', icon: 'chart', badge: alertas.length > 0 ? String(alertas.length) : undefined },
    { label: 'Actividades de refuerzo', icon: 'spark' },
    { label: 'Historial', icon: 'history' },
    { label: 'Agenda para apoderados', icon: 'message' },
    { label: 'Configuración', icon: 'settings' },
  ], [alertas.length]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }

  function go(next: Page) {
    setPage(next);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleEvaluationSaved(msg: string) {
    showToast(msg);
    await refreshAll();
    setAnalysisTab('group');
    go('Análisis y seguimiento');
  }

  let content: ReactNode;
  switch (page) {
    case 'Inicio':
      content = (
        <Dashboard
          go={go}
          teacherName={user?.docente?.nombres || 'Docente'}
          resumenData={resumenData}
          students={students}
          evaluaciones={evaluaciones}
          alertas={alertas}
          onOpenStudentAnalysis={(id) => {
            setSelectedStudentId(id);
            setAnalysisTab('individual');
            go('Análisis y seguimiento');
          }}
        />
      );
      break;
    case 'Mis aulas':
      content = (
        <Classrooms
          aulas={aulas}
          students={students}
          onEnterAula={(aulaId) => {
            setSelectedAulaId(aulaId);
            setAlertFilterIds(null);
            go('Estudiantes');
          }}
          onViewStudent={(s) => {
            setSelectedStudentId(s.id);
            setSelectedAulaId(s.aula_id || 'ALL');
            go('Estudiantes');
          }}
          onCreatedAula={async () => {
            showToast('Aula registrada correctamente');
            await refreshAll();
          }}
        />
      );
      break;
    case 'Estudiantes':
      content = (
        <StudentsPage
          aulas={aulas}
          students={students}
          selectedAulaId={selectedAulaId}
          onChangeAula={setSelectedAulaId}
          selectedStudentId={selectedStudentId}
          onSelectStudent={setSelectedStudentId}
          onOpenFullAnalysis={(id) => {
            setSelectedStudentId(id);
            setAnalysisTab('individual');
            go('Análisis y seguimiento');
          }}
          alertFilterIds={alertFilterIds}
          alertFilterLabel={alertFilterLabel}
          onClearAlertFilter={() => {
            setAlertFilterIds(null);
            setAlertFilterLabel('');
          }}
          onStudentCreated={async () => {
            showToast('Estudiante registrado en PostgreSQL');
            await refreshAll();
          }}
        />
      );
      break;
    case 'Evaluaciones':
      content = <EvaluationsPage go={go} aulas={aulas} areas={areas} evaluaciones={evaluaciones} />;
      break;
    case 'Registrar evaluación':
      content = (
        <RegisterEvaluationModule
          aulas={aulas}
          students={students}
          areas={areas}
          criteriosBase={criteriosBase}
          onSaved={handleEvaluationSaved}
        />
      );
      break;
    case 'Análisis y seguimiento':
      content = (
        <Analysis
          go={go}
          aulas={aulas}
          areas={areas}
          students={students}
          alertas={alertas}
          resumenData={resumenData}
          initialTab={analysisTab}
          selectedStudentId={selectedStudentId}
          onSelectStudentId={setSelectedStudentId}
          onViewAlertStudents={(ids, label) => {
            setAlertFilterIds(ids);
            setAlertFilterLabel(label);
            setSelectedAulaId('ALL');
            if (ids[0]) setSelectedStudentId(ids[0]);
            go('Estudiantes');
          }}
          onPlanReinforcement={(id) => {
            setSelectedStudentId(id);
            go('Actividades de refuerzo');
          }}
        />
      );
      break;
    case 'Actividades de refuerzo':
      content = (
        <Reinforcement
          students={students}
          selectedStudentId={selectedStudentId}
          recomendaciones={recomendaciones}
          onSaved={async (msg) => {
            showToast(msg);
            await refreshAll();
          }}
        />
      );
      break;
    case 'Historial':
      content = <HistoryPage aulas={aulas} historial={historialData} />;
      break;
    case 'Agenda para apoderados':
      content = <DocenteAgendaSection aulas={aulas} students={students} onNotify={showToast} />;
      break;
    case 'Configuración':
      content = <SettingsPage user={user} onUserUpdated={updateUser} onNotify={showToast} />;
      break;
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-top">
          <Logo />
          <button className="mobile-close" onClick={() => setMenuOpen(false)}>
            <Icon name="close" />
          </button>
        </div>
        <nav>
          {navItems.map((item) => (
            <button
              key={item.label}
              className={page === item.label ? 'active' : ''}
              onClick={() => go(item.label)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.badge && <b>{item.badge}</b>}
            </button>
          ))}
        </nav>

        <button className="logout" onClick={onLogout} title="Cerrar sesión actual">
          <Icon name="logout" />
          <span>Cerrar sesión</span>
        </button>
      </aside>

      {menuOpen && <div className="mobile-overlay" onClick={() => setMenuOpen(false)} />}

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-button" onClick={() => setMenuOpen(true)}>
              <Icon name="menu" />
            </button>
            <div>
              <span>AVer</span>
              <strong>{title}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <button className="notification" onClick={() => go('Análisis y seguimiento')} title="Alertas">
              <Icon name="bell" />
              {alertas.length > 0 && <i />}
            </button>
            <span className="divider" />
            <button className="user-menu" onClick={() => go('Configuración')}>
              {user?.docente?.fotoPerfil ? (
                <img
                  src={user.docente.fotoPerfil}
                  alt={teacherName}
                  className="avatar"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <span className="avatar">{teacherInitials}</span>
              )}
              <span>
                <strong>{teacherName}</strong>
                <small>{schoolName}</small>
              </span>
              <Icon name="chevron" size={16} />
            </button>
          </div>
        </header>

        <main>{content}</main>
      </div>

      {toast && (
        <div className="toast">
          <span><Icon name="check" /></span>
          <div>
            <strong>{toast}</strong>
            <small>Sincronizado con PostgreSQL.</small>
          </div>
        </div>
      )}
    </div>
  );
}
