import { useMemo, useState, type ReactNode } from 'react';
import { User } from '../../types/auth';

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
  home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
  class: <><path d="M4 5h16v13H4z"/><path d="M8 22h8M12 18v4M8 9h8M8 13h5"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  clipboard: <><path d="M9 5H6a2 2 0 0 0-2 2v13h16V7a2 2 0 0 0-2-2h-3"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m8 13 2 2 5-5"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  spark: <><path d="m12 3 1.4 4.2L18 9l-4.6 1.8L12 15l-1.4-4.2L6 9l4.6-1.8zM19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z"/></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></>,
  message: <><path d="M4 4h16v13H8l-4 4z"/><path d="M8 9h8M8 13h5"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  logout: <><path d="M9 21H4V3h5M16 17l5-5-5-5M21 12H9"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
  camera: <><path d="M4 7h4l2-3h4l2 3h4v13H4z"/><circle cx="12" cy="13" r="4"/></>,
  file: <><path d="M6 2h8l4 4v16H6zM14 2v5h5"/><path d="M8 12h8M8 16h8M8 20h5"/></>,
  edit: <><path d="m4 20 4.5-1 10-10-3.5-3.5-10 10zM13.5 7l3.5 3.5"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  warning: <><path d="M12 3 2.5 20h19z"/><path d="M12 9v5M12 17.5v.5"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  book: <><path d="M3 4h7a2 2 0 0 1 2 2v15a3 3 0 0 0-3-3H3zM21 4h-7a2 2 0 0 0-2 2v15a3 3 0 0 1 3-3h6z"/></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
  close: <><path d="m5 5 14 14M19 5 5 19"/></>,
  chevron: <path d="m9 18 6-6-6-6"/>,
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

const nav: { label: Page; icon: IconName; badge?: string }[] = [
  { label: 'Inicio', icon: 'home' },
  { label: 'Mis aulas', icon: 'class' },
  { label: 'Estudiantes', icon: 'users' },
  { label: 'Evaluaciones', icon: 'clipboard' },
  { label: 'Registrar evaluación', icon: 'plus' },
  { label: 'Análisis y seguimiento', icon: 'chart', badge: '3' },
  { label: 'Actividades de refuerzo', icon: 'spark' },
  { label: 'Historial', icon: 'history' },
  { label: 'Agenda para apoderados', icon: 'message' },
  { label: 'Configuración', icon: 'settings' },
];

const students = [
  { name: 'Juan Pérez', initials: 'JP', result: 'C', criterion: 'Identifica las ideas principales', trend: [36, 41, 44, 58], status: 'Necesita apoyo', color: '#F4C6A6' },
  { name: 'María López', initials: 'ML', result: 'AD', criterion: 'Comprende textos escritos', trend: [62, 75, 82, 94], status: 'Avance destacado', color: '#BEE3D0' },
  { name: 'Carlos Fernández', initials: 'CF', result: 'B', criterion: 'Resuelve problemas matemáticos', trend: [42, 49, 55, 61], status: 'En seguimiento', color: '#C8D9F5' },
  { name: 'Ana Torres', initials: 'AT', result: 'A', criterion: 'Reconoce operaciones básicas', trend: [60, 68, 78, 84], status: 'Avance esperado', color: '#E7C9EF' },
  { name: 'Sofía Ramírez', initials: 'SR', result: 'C', criterion: 'Comprende textos escritos', trend: [32, 39, 38, 46], status: 'Necesita apoyo', color: '#F3D6B8' },
  { name: 'Diego Quispe', initials: 'DQ', result: 'B', criterion: 'Identifica información explícita', trend: [46, 50, 58, 64], status: 'En seguimiento', color: '#D5CEF2' },
  { name: 'Valentina Rojas', initials: 'VR', result: 'A', criterion: 'Explica fenómenos científicos', trend: [64, 70, 79, 86], status: 'Avance esperado', color: '#C8E3E2' },
  { name: 'Mateo Sánchez', initials: 'MS', result: 'B', criterion: 'Resuelve problemas matemáticos', trend: [40, 51, 56, 62], status: 'En seguimiento', color: '#F0CFCF' },
];

const evaluations = [
  { title: 'Comprensión de textos narrativos', area: 'Comunicación', date: '18 Jun, 2025', students: 30, criteria: 3, status: 'Completada', color: 'violet' },
  { title: 'Resolución de problemas aditivos', area: 'Matemática', date: '14 Jun, 2025', students: 28, criteria: 4, status: 'Completada', color: 'blue' },
  { title: 'Los seres vivos y su ambiente', area: 'Ciencia y Tecnología', date: '10 Jun, 2025', students: 30, criteria: 3, status: 'Por revisar', color: 'green' },
  { title: 'Convivimos respetando acuerdos', area: 'Personal Social', date: '05 Jun, 2025', students: 29, criteria: 2, status: 'Completada', color: 'orange' },
];

const alerts = [
  { title: 'Comprende textos escritos', count: 12, area: 'Comunicación', detail: 'Resultado desfavorable en dos evaluaciones consecutivas', level: 'Alta' },
  { title: 'Resuelve problemas matemáticos', count: 8, area: 'Matemática', detail: 'Dificultad recurrente al elegir una operación', level: 'Media' },
  { title: 'Identifica las ideas principales', count: 6, area: 'Comunicación', detail: 'Requiere más evidencia para confirmar el seguimiento', level: 'Media' },
];

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

function Avatar({ student, size = 'md' }: { student: typeof students[number]; size?: 'sm' | 'md' | 'lg' }) {
  return <span className={`avatar ${size}`} style={{ background: student.color }}>{student.initials}</span>;
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

function Select({ children }: { children: ReactNode }) {
  return (
    <label className="select-wrap">
      <select>{children}</select>
      <Icon name="chevron" size={15} />
    </label>
  );
}

function MiniBars() {
  const data = [
    { name: 'Comprende textos', value: 68, prev: 54 },
    { name: 'Ideas principales', value: 52, prev: 48 },
    { name: 'Problemas aditivos', value: 74, prev: 61 },
    { name: 'Operaciones básicas', value: 81, prev: 70 },
  ];
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

function Donut() {
  return (
    <div className="donut-wrap">
      <div className="donut">
        <div>
          <strong>30</strong>
          <span>estudiantes</span>
        </div>
      </div>
      <div className="legend">
        {[
          ['AD', '20%', 'ad'],
          ['A', '40%', 'a'],
          ['B', '27%', 'b'],
          ['C', '13%', 'c'],
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
function Dashboard({ go, teacherName }: { go: (p: Page) => void; teacherName: string }) {
  return (
    <>
      <PageHeader title={`¡Hola, profesora ${teacherName}!`} subtitle="Aquí puedes revisar el progreso de tus estudiantes">
        <Button icon="plus" onClick={() => go('Registrar evaluación')}>
          Registrar evaluación
        </Button>
      </PageHeader>
      <div className="summary-grid">
        {[
          ['class', 'Aulas registradas', '4', '+1 este mes', 'purple'],
          ['users', 'Estudiantes', '118', 'En 4 aulas', 'blue'],
          ['clipboard', 'Evaluaciones realizadas', '24', '+6 este mes', 'green'],
          ['warning', 'Necesitan atención', '12', '3 alertas activas', 'orange'],
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
      <div className="notice-row">
        <div className="notice-icon">
          <Icon name="clipboard" />
        </div>
        <div>
          <strong>Tienes 2 evaluaciones pendientes de revisión</strong>
          <span>Revisa los datos antes de incorporarlos al análisis.</span>
        </div>
        <button onClick={() => go('Evaluaciones')}>
          Revisar ahora <Icon name="arrow" size={16} />
        </button>
      </div>
      <div className="dashboard-grid">
        <section className="card chart-card wide">
          <div className="card-heading">
            <div>
              <h2>Desempeño por criterio</h2>
              <p>3.º grado A · Últimas 4 evaluaciones</p>
            </div>
            <div className="legend-inline">
              <span>
                <i className="current" />
                Actual
              </span>
              <span>
                <i className="previous" />
                Anterior
              </span>
            </div>
          </div>
          <MiniBars />
        </section>
        <section className="card chart-card">
          <div className="card-heading">
            <div>
              <h2>Niveles de logro</h2>
              <p>Distribución del aula</p>
            </div>
            <button className="icon-btn">
              <Icon name="more" />
            </button>
          </div>
          <Donut />
          <p className="chart-note">
            <Icon name="spark" size={15} /> El 60% alcanzó el nivel esperado o destacado.
          </p>
        </section>
      </div>
      <section className="section-block">
        <div className="section-title">
          <div>
            <h2>Estudiantes que necesitan atención</h2>
            <p>Alertas basadas en resultados repetidos. Tú validas cada caso.</p>
          </div>
          <button onClick={() => go('Análisis y seguimiento')}>
            Ver análisis completo <Icon name="arrow" size={16} />
          </button>
        </div>
        <div className="attention-grid">
          {[students[0], students[4], students[2]].map((student, idx) => (
            <article className="student-alert-card" key={student.name}>
              <div className="student-top">
                <Avatar student={student} />
                <div>
                  <strong>{student.name}</strong>
                  <span>3.º grado A · Comunicación</span>
                </div>
                <Badge tone={idx === 2 ? 'yellow' : 'red'}>{idx === 2 ? 'En seguimiento' : 'Atención'}</Badge>
              </div>
              <div className="criterion">
                <span>Criterio con dificultad</span>
                <strong>{student.criterion}</strong>
              </div>
              <div className="result-history">
                <span>Últimos resultados</span>
                <div>
                  <Badge tone="red">No logrado</Badge>
                  <Icon name="arrow" size={14} />
                  <Badge tone={idx === 2 ? 'yellow' : 'red'}>{idx === 2 ? 'En proceso' : 'No logrado'}</Badge>
                </div>
              </div>
              <button onClick={() => go('Análisis y seguimiento')}>
                Ver seguimiento <Icon name="arrow" size={16} />
              </button>
            </article>
          ))}
        </div>
      </section>
      <section className="card recent-card">
        <div className="card-heading">
          <div>
            <h2>Actividad reciente</h2>
            <p>Últimos registros realizados</p>
          </div>
          <button onClick={() => go('Historial')}>Ver todo</button>
        </div>
        <div className="activity-list">
          {evaluations.slice(0, 3).map((e, i) => (
            <div className="activity" key={e.title}>
              <span className={`activity-icon ${e.color}`}>
                <Icon name={i === 2 ? 'camera' : 'clipboard'} />
              </span>
              <div>
                <strong>{e.title}</strong>
                <span>
                  {e.area} · 3.º grado A
                </span>
              </div>
              <Badge tone={e.status === 'Por revisar' ? 'yellow' : 'green'}>{e.status}</Badge>
              <time>{e.date}</time>
              <Icon name="chevron" size={17} />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

// 2. MIS AULAS
function Classrooms({ go }: { go: (p: Page) => void }) {
  const rooms = [
    ['3.º grado A', 'Comunicación', '30', '8', 'violet'],
    ['3.º grado A', 'Matemática', '30', '6', 'blue'],
    ['4.º grado B', 'Ciencia y Tecnología', '29', '5', 'green'],
    ['4.º grado B', 'Personal Social', '29', '5', 'orange'],
  ];
  return (
    <>
      <PageHeader title="Mis aulas" subtitle="Organiza tus estudiantes y evaluaciones por aula">
        <Button variant="secondary" icon="search">Buscar</Button>
        <Button icon="plus">Nueva aula</Button>
      </PageHeader>
      <div className="filter-bar">
        <div className="search-box">
          <Icon name="search" size={18} />
          <input placeholder="Buscar por aula o área..." />
        </div>
        <Select>
          <option>Todos los grados</option>
          <option>3.º grado</option>
          <option>4.º grado</option>
        </Select>
        <span className="records">4 aulas</span>
      </div>
      <div className="room-grid">
        {rooms.map(([grade, area, count, evals, color]) => (
          <article className="room-card" key={area}>
            <div className={`room-cover ${color}`}>
              <span>
                <Icon name={area === 'Matemática' ? 'chart' : 'book'} size={30} />
              </span>
              <Badge tone="gray">2025</Badge>
            </div>
            <div className="room-body">
              <p>{area}</p>
              <h2>{grade}</h2>
              <div className="room-stats">
                <span>
                  <Icon name="users" size={16} /> <b>{count}</b> estudiantes
                </span>
                <span>
                  <Icon name="clipboard" size={16} /> <b>{evals}</b> evaluaciones
                </span>
              </div>
              <Button variant="secondary" onClick={() => go('Estudiantes')}>
                Ingresar al aula <Icon name="arrow" size={16} />
              </Button>
            </div>
          </article>
        ))}
      </div>
      <section className="card table-card">
        <div className="card-heading">
          <div>
            <h2>Vista rápida · 3.º grado A</h2>
            <p>Últimos estudiantes actualizados</p>
          </div>
          <button onClick={() => go('Estudiantes')}>Ver todos</button>
        </div>
        <StudentTable onView={() => go('Estudiantes')} />
      </section>
    </>
  );
}

function StudentTable({ onView }: { onView: (s?: typeof students[number]) => void }) {
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
          {students.slice(0, 5).map((s, i) => (
            <tr key={s.name}>
              <td>
                <div className="person-cell">
                  <Avatar student={s} size="sm" />
                  <div>
                    <strong>{s.name}</strong>
                    <span>3.º grado A</span>
                  </div>
                </div>
              </td>
              <td className="muted">AV-03-{String(i + 1).padStart(3, '0')}</td>
              <td>
                <Badge tone={s.result === 'C' ? 'red' : s.result === 'B' ? 'yellow' : 'green'}>
                  {s.result} · {s.result === 'C' ? 'En inicio' : s.result === 'B' ? 'En proceso' : 'Logro esperado'}
                </Badge>
              </td>
              <td>
                <span className={`status-dot ${s.status.includes('apoyo') ? 'danger' : 'ok'}`} />
                {s.status}
              </td>
              <td>
                <button className="table-action" onClick={() => onView(s)}>
                  Ver perfil <Icon name="chevron" size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 3. ESTUDIANTES
function StudentsPage() {
  const [selected, setSelected] = useState<typeof students[number] | null>(students[0]);
  return (
    <>
      <PageHeader title="Estudiantes" subtitle="Consulta el progreso individual y los criterios que requieren apoyo">
        <Button variant="secondary" icon="download">Exportar</Button>
        <Button icon="plus">Agregar estudiante</Button>
      </PageHeader>
      <div className="filter-bar">
        <div className="search-box">
          <Icon name="search" size={18} />
          <input placeholder="Buscar estudiante..." />
        </div>
        <Select>
          <option>3.º grado A</option>
          <option>4.º grado B</option>
        </Select>
        <Select>
          <option>Todas las áreas</option>
          <option>Comunicación</option>
          <option>Matemática</option>
        </Select>
        <span className="records">30 estudiantes</span>
      </div>
      <div className="student-layout">
        <section className="card table-card">
          <StudentTable onView={(s) => setSelected(s || students[0])} />
        </section>
        {selected && (
          <aside className="student-profile">
            <div className="profile-head">
              <Avatar student={selected} size="lg" />
              <div>
                <h2>{selected.name}</h2>
                <p>3.º grado A · AV-03-001</p>
              </div>
              <button className="icon-btn">
                <Icon name="more" />
              </button>
            </div>
            <div className="profile-tabs">
              <button className="active">Resumen</button>
              <button>Historial</button>
              <button>Refuerzos</button>
            </div>
            <div className="profile-summary">
              <div>
                <span>Nivel actual</span>
                <strong className={selected.result === 'C' ? 'danger-text' : ''}>{selected.result}</strong>
                <small>{selected.result === 'C' ? 'En inicio' : 'En proceso'}</small>
              </div>
              <div>
                <span>Evaluaciones</span>
                <strong>8</strong>
                <small>Este periodo</small>
              </div>
              <div>
                <span>Asistencia</span>
                <strong>94%</strong>
                <small>Regular</small>
              </div>
            </div>
            <div className="progress-panel">
              <div>
                <h3>Evolución del desempeño</h3>
                <Badge tone="green">+12% desde abril</Badge>
              </div>
              <svg viewBox="0 0 340 120" role="img" aria-label="Evolución ascendente del desempeño">
                <defs>
                  <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#7041B5" stopOpacity=".2" />
                    <stop offset="1" stopColor="#7041B5" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M10 99 L90 91 L170 72 L250 77 L330 45 L330 110 L10 110Z" fill="url(#fade)" />
                <path d="M10 99 L90 91 L170 72 L250 77 L330 45" fill="none" stroke="#7041B5" strokeWidth="3" />
                {[[10, 99], [90, 91], [170, 72], [250, 77], [330, 45]].map(([x, y]) => (
                  <circle key={x} cx={x} cy={y} r="4" fill="#fff" stroke="#7041B5" strokeWidth="3" />
                ))}
              </svg>
              <div className="months">
                <span>Abr</span>
                <span>May</span>
                <span>Jun</span>
                <span>Jul</span>
                <span>Ago</span>
              </div>
            </div>
            <div className="criteria-list">
              <h3>Criterios recientes</h3>
              <div>
                <span>
                  <i className="red-dot" /> Identifica las ideas principales
                </span>
                <Badge tone="red">Requiere apoyo</Badge>
              </div>
              <div>
                <span>
                  <i className="green-dot" /> Ubica información explícita
                </span>
                <Badge tone="green">Mejoró</Badge>
              </div>
              <div>
                <span>
                  <i className="yellow-dot" /> Infiere información del texto
                </span>
                <Badge tone="yellow">En proceso</Badge>
              </div>
            </div>
            <Button>Ver seguimiento completo</Button>
          </aside>
        )}
      </div>
    </>
  );
}

// 4. EVALUACIONES
function EvaluationsPage({ go }: { go: (p: Page) => void }) {
  return (
    <>
      <PageHeader title="Evaluaciones" subtitle="Consulta y revisa todos tus registros de evaluación">
        <Button icon="plus" onClick={() => go('Registrar evaluación')}>Nueva evaluación</Button>
      </PageHeader>
      <div className="filter-bar">
        <div className="search-box">
          <Icon name="search" size={18} />
          <input placeholder="Buscar evaluación..." />
        </div>
        <Select>
          <option>Todas las aulas</option>
          <option>3.º grado A</option>
        </Select>
        <Select>
          <option>Todas las áreas</option>
          <option>Comunicación</option>
        </Select>
        <Select>
          <option>Junio 2025</option>
          <option>Mayo 2025</option>
        </Select>
      </div>
      <div className="evaluation-stats">
        <div>
          <span>24</span>
          <small>Total registradas</small>
        </div>
        <div>
          <span>20</span>
          <small>Completadas</small>
        </div>
        <div>
          <span>2</span>
          <small>Por revisar</small>
        </div>
        <div>
          <span>2</span>
          <small>Borradores</small>
        </div>
      </div>
      <section className="card table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Evaluación</th>
                <th>Aula y área</th>
                <th>Fecha</th>
                <th>Estudiantes</th>
                <th>Criterios</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {evaluations.map((e) => (
                <tr key={e.title}>
                  <td>
                    <div className="evaluation-name">
                      <span className={e.color}>
                        <Icon name="clipboard" size={18} />
                      </span>
                      <strong>{e.title}</strong>
                    </div>
                  </td>
                  <td>
                    <strong>3.º grado A</strong>
                    <small>{e.area}</small>
                  </td>
                  <td>{e.date}</td>
                  <td>{e.students} de 30</td>
                  <td>{e.criteria} criterios</td>
                  <td>
                    <Badge tone={e.status === 'Por revisar' ? 'yellow' : 'green'}>{e.status}</Badge>
                  </td>
                  <td>
                    <button className="icon-btn">
                      <Icon name="chevron" size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="info-callout">
        <Icon name="book" />
        <div>
          <strong>Tus datos mantienen su contexto</strong>
          <span>Cada resultado queda vinculado al estudiante, aula, área, sesión y criterio original.</span>
        </div>
      </div>
    </>
  );
}

// 5. REGISTRAR EVALUACIÓN
type RegisterMode = 'choose' | 'camera' | 'excel' | 'direct' | 'review';

function RegisterPage({ onSaved }: { onSaved: () => void }) {
  const [mode, setMode] = useState<RegisterMode>('choose');
  const [fileName, setFileName] = useState('');
  const [results, setResults] = useState<Record<string, string>>({});
  const modes = [
    { key: 'camera', icon: 'camera', title: 'Fotografía tu lista de cotejo', desc: 'Sube una fotografía de tu instrumento y organiza los resultados sin transcribirlos.', tone: 'camera' },
    { key: 'excel', icon: 'file', title: 'Importa tu archivo Excel', desc: 'Utiliza tus registros existentes y evita volver a ingresar la misma información.', tone: 'excel' },
    { key: 'direct', icon: 'edit', title: 'Registrar directamente', desc: 'Ingresa los resultados de tus estudiantes directamente en AVer.', tone: 'direct' },
  ];

  if (mode === 'choose') {
    return (
      <>
        <PageHeader title="Registrar evaluación" subtitle="Elige la forma más cómoda de incorporar tus resultados" />
        <div className="register-intro">
          <div>
            <Icon name="spark" />
          </div>
          <p>
            <strong>Registra una sola vez, analiza sin repetir trabajo.</strong>
            <span>Las tres opciones terminan en una revisión antes de guardar.</span>
          </p>
        </div>
        <div className="register-options">
          {modes.map((m) => (
            <button className={`register-option ${m.tone}`} key={m.key} onClick={() => setMode(m.key as RegisterMode)}>
              <span className="option-icon">
                <Icon name={m.icon as IconName} size={32} />
              </span>
              <small>OPCIÓN {modes.indexOf(m) + 1}</small>
              <h2>{m.title}</h2>
              <p>{m.desc}</p>
              <b>
                Comenzar <Icon name="arrow" size={17} />
              </b>
            </button>
          ))}
        </div>
        <section className="flow-explainer">
          <h2>Un flujo claro y seguro</h2>
          <div>
            {[
              ['download', '1', 'Incorpora tus datos'],
              ['edit', '2', 'Revisa y corrige'],
              ['check', '3', 'Confirma el registro'],
              ['chart', '4', 'Analiza el progreso'],
            ].map(([icon, n, t], i) => (
              <div key={t}>
                <span>
                  <Icon name={icon as IconName} />
                </span>
                <p>
                  <small>Paso {n}</small>
                  <strong>{t}</strong>
                </p>
                {i < 3 && <Icon name="arrow" className="flow-arrow" />}
              </div>
            ))}
          </div>
        </section>
      </>
    );
  }

  if (mode === 'camera' || mode === 'excel') {
    return (
      <>
        <PageHeader
          title={mode === 'camera' ? 'Fotografiar lista física' : 'Importar archivo Excel'}
          subtitle="Paso 1 de 3 · Incorporar datos"
        >
          <Button variant="ghost" onClick={() => setMode('choose')}>Volver</Button>
        </PageHeader>
        <Stepper current={1} />
        <section className="card upload-card">
          <div className="upload-copy">
            <Badge tone="purple">{mode === 'camera' ? 'Simulación OCR' : 'Flujo de prototipo'}</Badge>
            <h2>{mode === 'camera' ? 'Sube una foto clara de tu lista' : 'Selecciona tu registro existente'}</h2>
            <p>
              {mode === 'camera'
                ? 'Representaremos el reconocimiento de nombres, criterios, equis y checks. Podrás corregir cualquier marca dudosa.'
                : 'Representaremos la asociación de tus columnas con estudiantes, criterios y resultados.'}
            </p>
          </div>
          <label className={`drop-zone ${fileName ? 'has-file' : ''}`}>
            <input type="file" onChange={(e) => setFileName(e.target.files?.[0]?.name || 'Lista_cotejo_3A.jpg')} />
            <span>
              <Icon name={fileName ? 'check' : mode === 'camera' ? 'camera' : 'file'} size={34} />
            </span>
            {fileName ? (
              <>
                <strong>{fileName}</strong>
                <small>Archivo listo para procesar</small>
              </>
            ) : (
              <>
                <strong>{mode === 'camera' ? 'Arrastra una imagen o toma una fotografía' : 'Arrastra aquí tu archivo .xlsx o .csv'}</strong>
                <small>También puedes hacer clic para seleccionar</small>
              </>
            )}
          </label>
          <div className="prototype-note">
            <Icon name="warning" size={18} />
            <span>
              <strong>Función representada como simulación.</strong> El reconocimiento y la importación automática aún no están implementados.
            </span>
          </div>
          <div className="form-footer">
            <Button variant="secondary" onClick={() => setMode('choose')}>Cancelar</Button>
            <Button
              icon="arrow"
              onClick={() => {
                if (!fileName) setFileName(mode === 'camera' ? 'Lista_cotejo_3A.jpg' : 'Registro_Comunicacion_3A.xlsx');
                setMode('review');
              }}
            >
              {mode === 'camera' ? 'Procesar fotografía' : 'Continuar y asociar columnas'}
            </Button>
          </div>
        </section>
      </>
    );
  }

  if (mode === 'direct') {
    return (
      <>
        <PageHeader title="Registro directo" subtitle="Paso 1 de 3 · Datos de la evaluación">
          <Button variant="ghost" onClick={() => setMode('choose')}>Volver</Button>
        </PageHeader>
        <Stepper current={1} />
        <section className="card direct-form">
          <div className="form-section">
            <div className="form-title">
              <span>1</span>
              <div>
                <h2>Información general</h2>
                <p>Ubica esta evaluación en su contexto.</p>
              </div>
            </div>
            <div className="form-grid">
              <label>
                Aula<Select><option>3.º grado A</option></Select>
              </label>
              <label>
                Área<Select><option>Comunicación</option><option>Matemática</option></Select>
              </label>
              <label className="span-2">
                Nombre de la evaluación<input defaultValue="Comprensión de textos narrativos II" />
              </label>
              <label>
                Fecha<input type="date" defaultValue="2025-06-20" />
              </label>
              <label>
                Sesión<input defaultValue="Sesión 08" />
              </label>
            </div>
          </div>
          <div className="form-section">
            <div className="form-title">
              <span>2</span>
              <div>
                <h2>Criterios de evaluación</h2>
                <p>Las marcas y niveles de logro se mantienen como datos diferentes.</p>
              </div>
            </div>
            <div className="criteria-input">
              <span>1</span>
              <input defaultValue="Identifica las ideas principales de un texto" />
              <button className="icon-btn"><Icon name="close" size={16} /></button>
            </div>
            <div className="criteria-input">
              <span>2</span>
              <input defaultValue="Ubica información explícita en el texto" />
              <button className="icon-btn"><Icon name="close" size={16} /></button>
            </div>
            <button className="add-link">
              <Icon name="plus" size={16} /> Agregar otro criterio
            </button>
          </div>
          <div className="form-section">
            <div className="form-title">
              <span>3</span>
              <div>
                <h2>Resultados por estudiante</h2>
                <p>Selecciona una marca para cada criterio.</p>
              </div>
            </div>
            <div className="marks-legend">
              <Badge tone="green">✓ Logrado</Badge>
              <Badge tone="red">× No logrado</Badge>
              <Badge tone="gray">— No observado</Badge>
            </div>
            <div className="results-table">
              <table>
                <thead>
                  <tr>
                    <th>Estudiante</th>
                    <th>Ideas principales</th>
                    <th>Información explícita</th>
                  </tr>
                </thead>
                <tbody>
                  {students.slice(0, 6).map((s) => (
                    <tr key={s.name}>
                      <td>
                        <Avatar student={s} size="sm" />
                        <strong>{s.name}</strong>
                      </td>
                      {[1, 2].map((n) => (
                        <td key={n}>
                          <div className="mark-picker">
                            {['✓', '×', '—'].map((mark) => (
                              <button
                                className={results[`${s.name}${n}`] === mark ? 'selected' : ''}
                                onClick={() => setResults({ ...results, [`${s.name}${n}`]: mark })}
                                key={mark}
                              >
                                {mark}
                              </button>
                            ))}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="form-footer">
            <Button variant="secondary">Guardar borrador</Button>
            <Button icon="arrow" onClick={() => setMode('review')}>Revisar resultados</Button>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Revisar y confirmar" subtitle="Paso 2 de 3 · Verifica los datos antes de guardar">
        <Button variant="ghost" onClick={() => setMode('choose')}>Salir</Button>
      </PageHeader>
      <Stepper current={2} />
      <div className="review-layout">
        <section className="card review-main">
          <div className="review-heading">
            <div>
              <Badge tone="yellow">3 marcas por revisar</Badge>
              <h2>Resultados reconocidos</h2>
              <p>Corrige las celdas resaltadas antes de confirmar.</p>
            </div>
            <Button variant="secondary" icon="edit">Editar datos</Button>
          </div>
          <div className="results-table review-table">
            <table>
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Ideas principales</th>
                  <th>Información explícita</th>
                  <th>Validación</th>
                </tr>
              </thead>
              <tbody>
                {students.slice(0, 6).map((s, i) => (
                  <tr key={s.name}>
                    <td>
                      <Avatar student={s} size="sm" />
                      <strong>{s.name}</strong>
                    </td>
                    <td>
                      <Select>
                        <option>{i === 0 || i === 4 ? 'No logrado' : 'Logrado'}</option>
                        <option>Logrado</option>
                        <option>No observado</option>
                      </Select>
                    </td>
                    <td className={i === 2 ? 'uncertain' : ''}>
                      <Select>
                        <option>{i === 2 ? 'Revisar marca' : 'Logrado'}</option>
                        <option>No logrado</option>
                      </Select>
                    </td>
                    <td>
                      {i === 2 ? <Badge tone="yellow">Dudosa</Badge> : <Badge tone="green">Verificada</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <aside className="review-summary">
          <h2>Resumen del registro</h2>
          <dl>
            <div>
              <dt>Aula</dt>
              <dd>3.º grado A</dd>
            </div>
            <div>
              <dt>Área</dt>
              <dd>Comunicación</dd>
            </div>
            <div>
              <dt>Estudiantes</dt>
              <dd>30</dd>
            </div>
            <div>
              <dt>Criterios</dt>
              <dd>2</dd>
            </div>
            <div>
              <dt>Fuente</dt>
              <dd>{fileName || 'Registro directo'}</dd>
            </div>
          </dl>
          <div className="validation-note">
            <Icon name="warning" />
            <p>
              <strong>La valoración final es tu decisión.</strong>
              <span>AVer no convierte automáticamente checks o equis en niveles AD, A, B o C.</span>
            </p>
          </div>
          <Button icon="check" onClick={onSaved}>Confirmar registro</Button>
          <Button variant="ghost" onClick={() => setMode('direct')}>Volver y corregir</Button>
        </aside>
      </div>
    </>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <div className="stepper">
      {['Incorporar datos', 'Revisar resultados', 'Confirmar y guardar'].map((s, i) => (
        <div className={i + 1 <= current ? 'active' : ''} key={s}>
          <span>{i + 1 < current ? <Icon name="check" size={14} /> : i + 1}</span>
          <b>{s}</b>
          {i < 2 && <i />}
        </div>
      ))}
    </div>
  );
}

// 6. ANÁLISIS Y SEGUIMIENTO
function Analysis({ go }: { go: (p: Page) => void }) {
  const [tab, setTab] = useState<'group' | 'individual'>('group');
  return (
    <>
      <PageHeader title="Análisis y seguimiento" subtitle="Convierte tus registros en información útil para orientar el apoyo">
        <Select><option>3.º grado A</option></Select>
        <Select><option>Comunicación</option></Select>
      </PageHeader>
      <div className="analysis-tabs">
        <button className={tab === 'group' ? 'active' : ''} onClick={() => setTab('group')}>
          <Icon name="users" /> Análisis grupal
        </button>
        <button className={tab === 'individual' ? 'active' : ''} onClick={() => setTab('individual')}>
          <Icon name="users" /> Análisis individual
        </button>
      </div>
      {tab === 'group' ? (
        <>
          <div className="analysis-hero">
            <div>
              <Badge tone="red">
                <Icon name="warning" size={13} /> 3 alertas requieren revisión
              </Badge>
              <h2>Hay criterios que necesitan tu atención</h2>
              <p>Las alertas muestran patrones observados; no son diagnósticos. Revisa las evidencias y valida cada caso.</p>
            </div>
            <div className="analysis-ring">
              <strong>68%</strong>
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
                <Select><option>Últimas 4 evaluaciones</option></Select>
              </div>
              <MiniBars />
            </section>
            <section className="card difficulty-card">
              <div className="card-heading">
                <div>
                  <h2>Mayor dificultad</h2>
                  <p>Ordenado por prioridad</p>
                </div>
              </div>
              {alerts.map((a, i) => (
                <div className="difficulty" key={a.title}>
                  <span>{i + 1}</span>
                  <div>
                    <strong>{a.title}</strong>
                    <small>{a.count} de 30 estudiantes</small>
                    <i>
                      <b style={{ width: `${(a.count / 30) * 100}%` }} />
                    </i>
                  </div>
                  <em>{Math.round((a.count / 30) * 100)}%</em>
                </div>
              ))}
            </section>
          </div>
          <section className="section-block">
            <div className="section-title">
              <div>
                <h2>Alertas para validar</h2>
                <p>Generadas cuando un estudiante presenta un resultado desfavorable en el mismo criterio dos veces.</p>
              </div>
              <button>¿Cómo funcionan?</button>
            </div>
            <div className="alerts-list">
              {alerts.map((a, i) => (
                <article className="smart-alert" key={a.title}>
                  <span className={i === 0 ? 'high' : 'medium'}>
                    <Icon name="warning" />
                  </span>
                  <div className="alert-main">
                    <div>
                      <Badge tone={i === 0 ? 'red' : 'yellow'}>Prioridad {a.level.toLowerCase()}</Badge>
                      <small>{a.area}</small>
                    </div>
                    <h3>{a.title}</h3>
                    <p>{a.detail}</p>
                    <div className="evidence">
                      <span>Evaluación 1 <b>No logrado</b></span>
                      <Icon name="arrow" size={14} />
                      <span>Evaluación 2 <b>No logrado</b></span>
                    </div>
                  </div>
                  <div className="alert-count">
                    <strong>{a.count}</strong>
                    <span>estudiantes</span>
                  </div>
                  <div className="alert-actions">
                    <Button variant="secondary">Ver estudiantes</Button>
                    <Button onClick={() => go('Actividades de refuerzo')}>Planificar refuerzo</Button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <IndividualAnalysis />
      )}
    </>
  );
}

function IndividualAnalysis() {
  const s = students[0];
  return (
    <div className="individual-analysis">
      <aside className="card student-selector">
        <div className="search-box">
          <Icon name="search" />
          <input placeholder="Buscar estudiante" />
        </div>
        {students.slice(0, 6).map((st, i) => (
          <button className={i === 0 ? 'selected' : ''} key={st.name}>
            <Avatar student={st} size="sm" />
            <span>
              <strong>{st.name}</strong>
              <small>3.º grado A</small>
            </span>
            <Icon name="chevron" size={15} />
          </button>
        ))}
      </aside>
      <section className="card individual-detail">
        <div className="profile-head">
          <Avatar student={s} size="lg" />
          <div>
            <h2>{s.name}</h2>
            <p>Comunicación · Periodo abril—junio</p>
          </div>
          <Badge tone="red">Requiere apoyo</Badge>
        </div>
        <div className="comparison-cards">
          <div>
            <small>Evaluación anterior</small>
            <strong>No logrado</strong>
            <span>14 may 2025</span>
          </div>
          <Icon name="arrow" />
          <div>
            <small>Evaluación actual</small>
            <strong>No logrado</strong>
            <span>18 jun 2025</span>
          </div>
        </div>
        <div className="progress-panel large">
          <h3>Evolución por evaluación</h3>
          <svg viewBox="0 0 600 170">
            <path d="M20 135 L150 120 L280 128 L410 96 L570 83" fill="none" stroke="#7041B5" strokeWidth="4" />
            {[[20, 135], [150, 120], [280, 128], [410, 96], [570, 83]].map(([x, y]) => (
              <circle key={x} cx={x} cy={y} r="6" fill="#fff" stroke="#7041B5" strokeWidth="4" />
            ))}
          </svg>
        </div>
        <div className="validation-note">
          <Icon name="warning" />
          <p>
            <strong>Patrón observado en “Identifica las ideas principales”.</strong>
            <span>Revisa las dos evidencias antes de decidir el siguiente paso.</span>
          </p>
        </div>
      </section>
    </div>
  );
}

// 7. ACTIVIDADES DE REFUERZO
function Reinforcement({ onCompare }: { onCompare: () => void }) {
  const [editing, setEditing] = useState(false);
  const [accepted, setAccepted] = useState(false);
  return (
    <>
      <PageHeader title="Actividades de refuerzo" subtitle="Organiza apoyos editables y observa cambios posteriores">
        <Button variant="secondary" icon="history">Ver aplicadas</Button>
      </PageHeader>
      <div className="reinforce-context">
        <div className="context-student">
          <Avatar student={students[0]} size="lg" />
          <div>
            <small>Estudiante</small>
            <h2>Juan Pérez</h2>
            <span>3.º grado A · Comunicación</span>
          </div>
        </div>
        <div className="context-criterion">
          <small>Criterio a reforzar</small>
          <strong>Comprende textos escritos</strong>
          <span>
            <Icon name="warning" size={15} /> 2 resultados desfavorables consecutivos
          </span>
        </div>
      </div>
      <div className="reinforce-layout">
        <section className="card evidence-panel">
          <div className="panel-label">
            <span>1</span>
            <div>
              <h2>Revisa la evidencia</h2>
              <p>Resultados que originaron la alerta.</p>
            </div>
          </div>
          <div className="evidence-timeline">
            <div>
              <i />
              <time>14 may 2025</time>
              <strong>Comprensión de textos I</strong>
              <Badge tone="red">No logrado</Badge>
              <p>No identifica la idea que resume el texto.</p>
            </div>
            <div>
              <i />
              <time>18 jun 2025</time>
              <strong>Comprensión de textos II</strong>
              <Badge tone="red">No logrado</Badge>
              <p>Selecciona información secundaria como idea principal.</p>
            </div>
          </div>
          <button className="evidence-link">
            Ver resultados originales <Icon name="arrow" size={15} />
          </button>
        </section>
        <section className="card proposal-panel">
          <div className="panel-label">
            <span>2</span>
            <div>
              <h2>Adapta la actividad propuesta</h2>
              <p>Esta es una propuesta editable, no una recomendación validada.</p>
            </div>
          </div>
          <Badge tone="purple">
            <Icon name="spark" size={13} /> Propuesta de apoyo
          </Badge>
          <label>
            Título de la actividad
            <input disabled={!editing} defaultValue="Lectura breve: encontrar la idea central" />
          </label>
          <label>
            Descripción
            <textarea
              disabled={!editing}
              defaultValue="Leer un texto corto y responder preguntas sobre su contenido, diferenciando la idea principal de los detalles que la apoyan."
            />
          </label>
          <div className="form-grid">
            <label>
              Fecha de aplicación
              <input type="date" disabled={!accepted} defaultValue="2025-06-24" />
            </label>
            <label>
              Modalidad
              <Select>
                <option>Trabajo en grupo pequeño</option>
                <option>Individual</option>
              </Select>
            </label>
          </div>
          <label>
            Observaciones
            <textarea disabled={!accepted} placeholder="Agrega indicaciones o ajustes para el estudiante..." />
          </label>
          <div className="proposal-actions">
            <Button variant="ghost">Descartar</Button>
            <Button variant="secondary" icon="edit" onClick={() => setEditing(!editing)}>
              {editing ? 'Finalizar edición' : 'Editar propuesta'}
            </Button>
            <Button icon="check" onClick={() => setAccepted(true)}>
              {accepted ? 'Actividad aceptada' : 'Aceptar actividad'}
            </Button>
          </div>
        </section>
      </div>
      <section className="card next-step">
        <span><Icon name="chart" /></span>
        <div>
          <h2>{accepted ? 'Actividad lista para aplicar' : 'Después de aplicar la actividad'}</h2>
          <p>Registra una nueva evaluación del mismo criterio para comparar el cambio observado.</p>
        </div>
        <Button onClick={onCompare}>Registrar resultado posterior</Button>
      </section>
    </>
  );
}

function Comparison({ close }: { close: () => void }) {
  return (
    <div className="modal-backdrop">
      <div className="comparison-modal">
        <button className="modal-close" onClick={close}>
          <Icon name="close" />
        </button>
        <Badge tone="green">
          <Icon name="check" size={13} /> Seguimiento actualizado
        </Badge>
        <h1>Comparación de resultados</h1>
        <p className="modal-subtitle">Visualiza el cambio observado antes y después de la actividad.</p>
        <div className="comparison-student">
          <Avatar student={students[0]} size="lg" />
          <div>
            <strong>Juan Pérez</strong>
            <span>3.º grado A · Comunicación</span>
          </div>
        </div>
        <div className="compare-flow">
          <div className="before">
            <small>ANTES DEL REFUERZO</small>
            <span className="result-symbol">×</span>
            <strong>No logrado</strong>
            <time>18 jun 2025</time>
          </div>
          <div className="activity-applied">
            <span><Icon name="book" /></span>
            <small>ACTIVIDAD APLICADA</small>
            <strong>Lectura breve: encontrar la idea central</strong>
            <time>24 jun 2025</time>
          </div>
          <div className="after">
            <small>DESPUÉS DEL REFUERZO</small>
            <span className="result-symbol">✓</span>
            <strong>Logrado</strong>
            <time>30 jun 2025</time>
          </div>
        </div>
        <div className="improvement-message">
          <Icon name="chart" />
          <p>
            <strong>Se observa una mejora en el criterio evaluado.</strong>
            <span>Este cambio no confirma que la actividad haya sido la causa. Continúa observando el desempeño.</span>
          </p>
        </div>
        <div className="modal-actions">
          <Button variant="secondary" onClick={close}>Cerrar</Button>
          <Button>Ver seguimiento de Juan</Button>
        </div>
      </div>
    </div>
  );
}

// 8. HISTORIAL
function HistoryPage() {
  return (
    <>
      <PageHeader title="Historial" subtitle="Consulta registros originales, apoyos y evaluaciones posteriores sin mezclarlos">
        <Button variant="secondary" icon="download">Exportar historial</Button>
      </PageHeader>
      <div className="filter-bar">
        <Select>
          <option>Todos los tipos</option>
          <option>Evaluaciones</option>
          <option>Refuerzos</option>
        </Select>
        <Select>
          <option>3.º grado A</option>
        </Select>
        <Select>
          <option>Junio 2025</option>
        </Select>
      </div>
      <div className="timeline">
        {[
          ['30 JUN', 'Evaluación posterior registrada', 'Juan Pérez · Comprende textos escritos', 'Resultado: Logrado', 'green'],
          ['24 JUN', 'Actividad de refuerzo aplicada', 'Juan Pérez · Lectura breve: encontrar la idea central', 'Con observaciones del docente', 'purple'],
          ['18 JUN', 'Evaluación original registrada', 'Comprensión de textos narrativos · 3.º grado A', '30 estudiantes · 3 criterios', 'blue'],
          ['14 JUN', 'Evaluación original registrada', 'Resolución de problemas aditivos · 3.º grado A', '28 estudiantes · 4 criterios', 'orange'],
        ].map(([date, title, sub, meta, tone], i) => (
          <div className="timeline-item" key={title + date}>
            <div className="timeline-date">{date}</div>
            <i />
            <article className="card">
              <span className={`history-icon ${tone}`}>
                <Icon name={i === 1 ? 'spark' : 'clipboard'} />
              </span>
              <div>
                <Badge tone={i === 0 ? 'green' : i === 1 ? 'purple' : 'gray'}>
                  {i === 0 ? 'Resultado posterior' : i === 1 ? 'Actividad de refuerzo' : 'Registro original'}
                </Badge>
                <h2>{title}</h2>
                <p>{sub}</p>
                <small>{meta}</small>
              </div>
              <button className="icon-btn">
                <Icon name="chevron" />
              </button>
            </article>
          </div>
        ))}
      </div>
    </>
  );
}

// 9. AGENDA PARA APODERADOS
function AgendaPage() {
  return (
    <>
      <PageHeader title="Agenda para apoderados" subtitle="Comunicación privada y clara sobre cada estudiante">
        <Badge tone="purple">Módulo futuro</Badge>
        <Button icon="plus">Crear aviso</Button>
      </PageHeader>
      <div className="future-banner">
        <span><Icon name="message" /></span>
        <div>
          <strong>Propuesta complementaria</strong>
          <p>Esta vista representa una futura comunicación privada. Todavía no está implementada ni envía mensajes reales.</p>
        </div>
      </div>
      <div className="agenda-layout">
        <section>
          <div className="section-title">
            <div>
              <h2>Avisos preparados</h2>
              <p>Vista conceptual del docente</p>
            </div>
            <Select><option>Todos los estudiantes</option></Select>
          </div>
          {students.slice(0, 4).map((s, i) => (
            <article className="card notice-card" key={s.name}>
              <Avatar student={s} />
              <div>
                <div>
                  <strong>{s.name}</strong>
                  <Badge tone={i === 0 ? 'yellow' : 'green'}>{i === 0 ? 'No leído' : 'Leído'}</Badge>
                </div>
                <h3>{i % 2 === 0 ? 'Actividad breve para reforzar en casa' : 'Recordatorio de actividad pendiente'}</h3>
                <p>
                  {i % 2 === 0
                    ? 'Conversar sobre la lectura enviada e identificar juntos de qué trata principalmente.'
                    : 'Completar la ficha entregada en clase y enviarla el viernes.'}
                </p>
                <span>
                  <Icon name="calendar" size={15} /> Publicado el {18 - i} de junio
                </span>
              </div>
              <button className="icon-btn">
                <Icon name="more" />
              </button>
            </article>
          ))}
        </section>
        <aside className="guardian-preview">
          <div className="phone-top">
            <Logo />
            <Icon name="bell" />
          </div>
          <small>VISTA DEL APODERADO</small>
          <div className="guardian-student">
            <Avatar student={students[0]} />
            <div>
              <strong>Juan Pérez</strong>
              <span>3.º grado A</span>
            </div>
            <Icon name="chevron" />
          </div>
          <h3>Avisos recientes</h3>
          <div className="guardian-message">
            <span><Icon name="book" /></span>
            <Badge tone="yellow">Pendiente</Badge>
            <strong>Actividad para casa</strong>
            <p>Conversen sobre la lectura enviada e identifiquen de qué trata principalmente.</p>
            <small>Prof. María Salazar · Hoy</small>
          </div>
          <div className="privacy-note">
            <Icon name="check" />
            <span>Solo verás información de tus hijos vinculados.</span>
          </div>
        </aside>
      </div>
    </>
  );
}

// 10. CONFIGURACIÓN
function SettingsPage({ teacherName, schoolName, dni }: { teacherName: string; schoolName: string; dni: string }) {
  const parts = teacherName.split(' ');
  const nombres = parts.slice(0, 2).join(' ') || 'María Elena';
  const apellidos = parts.slice(2).join(' ') || 'Salazar Gómez';

  return (
    <>
      <PageHeader title="Configuración" subtitle="Personaliza tu cuenta y preferencias" />
      <div className="settings-layout">
        <aside className="settings-nav">
          <button className="active">Perfil docente</button>
          <button>Institución educativa</button>
          <button>Notificaciones</button>
          <button>Escala de evaluación</button>
          <button>Privacidad y datos</button>
        </aside>
        <section className="card settings-form">
          <h2>Perfil docente</h2>
          <p>Esta información se utiliza para identificar tus registros y aislar tus aulas.</p>
          <div className="profile-edit">
            <span className="avatar lg">{nombres[0] || 'M'}{apellidos[0] || 'S'}</span>
            <div>
              <Button variant="secondary">Cambiar foto</Button>
              <small>DNI: {dni || '74839201'} · JPG o PNG · Máximo 2 MB</small>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Nombres
              <input defaultValue={nombres} />
            </label>
            <label>
              Apellidos
              <input defaultValue={apellidos} />
            </label>
            <label>
              Institución Educativa
              <input defaultValue={schoolName || 'I.E. 2084 San Lorenzo'} />
            </label>
            <label>
              Rol
              <Select>
                <option>Docente de primaria</option>
                <option>Docente de secundaria</option>
              </Select>
            </label>
          </div>
          <hr />
          <h3>Preferencias de seguimiento</h3>
          <label className="toggle-row">
            <span>
              <strong>Alertas de dificultad repetida</strong>
              <small>Avisar cuando un resultado desfavorable se repita en el mismo criterio.</small>
            </span>
            <input type="checkbox" defaultChecked />
          </label>
          <label className="toggle-row">
            <span>
              <strong>Resumen semanal</strong>
              <small>Recibir un resumen de registros pendientes.</small>
            </span>
            <input type="checkbox" defaultChecked />
          </label>
          <div className="form-footer">
            <Button>Guardar cambios</Button>
          </div>
        </section>
      </div>
    </>
  );
}

// PANEL PRINCIPAL DEL DOCENTE
export function DocentePanel({ user, onLogout }: { user?: User | null; onLogout: () => void }) {
  const [page, setPage] = useState<Page>('Inicio');
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [compare, setCompare] = useState(false);
  const title = useMemo(() => (page === 'Inicio' ? 'Resumen general' : page), [page]);

  const teacherName = user?.docente
    ? `${user.docente.nombres} ${user.docente.apellidos}`
    : 'María Salazar';
  const schoolName = user?.docente?.institucionEducativa || 'I.E. 2084 San Lorenzo';
  const teacherInitials = user?.docente
    ? `${user.docente.nombres[0]}${user.docente.apellidos[0]}`
    : 'MS';

  function go(next: Page) {
    setPage(next);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function saved() {
    setToast('Evaluación guardada correctamente');
    go('Análisis y seguimiento');
    window.setTimeout(() => setToast(''), 3500);
  }

  let content: ReactNode;
  switch (page) {
    case 'Inicio':
      content = <Dashboard go={go} teacherName={user?.docente?.nombres || 'María'} />;
      break;
    case 'Mis aulas':
      content = <Classrooms go={go} />;
      break;
    case 'Estudiantes':
      content = <StudentsPage />;
      break;
    case 'Evaluaciones':
      content = <EvaluationsPage go={go} />;
      break;
    case 'Registrar evaluación':
      content = <RegisterPage onSaved={saved} />;
      break;
    case 'Análisis y seguimiento':
      content = <Analysis go={go} />;
      break;
    case 'Actividades de refuerzo':
      content = <Reinforcement onCompare={() => setCompare(true)} />;
      break;
    case 'Historial':
      content = <HistoryPage />;
      break;
    case 'Agenda para apoderados':
      content = <AgendaPage />;
      break;
    case 'Configuración':
      content = <SettingsPage teacherName={teacherName} schoolName={schoolName} dni={user?.dni || ''} />;
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
          {nav.map((item) => (
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
        <div className="sidebar-help">
          <span><Icon name="spark" /></span>
          <strong>¿Necesitas ayuda?</strong>
          <p>Consulta la guía rápida de AVer.</p>
          <button>Ver guía</button>
        </div>
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
            <button className="icon-btn search-trigger">
              <Icon name="search" />
            </button>
            <button className="notification">
              <Icon name="bell" />
              <i />
            </button>
            <span className="divider" />
            <button className="user-menu" onClick={() => go('Configuración')}>
              <span className="avatar">{teacherInitials}</span>
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
            <small>Los resultados ya están disponibles para el análisis.</small>
          </div>
        </div>
      )}

      {compare && <Comparison close={() => setCompare(false)} />}
    </div>
  );
}
