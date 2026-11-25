# AVer — "A ver cómo vamos"

Plataforma académica de seguimiento escolar orientada a instituciones educativas, con acceso independiente para **docentes** y **apoderados**, persistencia en **PostgreSQL** mediante consultas SQL directas con `pg` (sin ORM) y arquitectura full-stack con **React + TypeScript + Vite + Node.js + Express**.

---

## Funcionalidades principales

### Portal del Docente
- **Autenticación segura:** Registro e inicio de sesión por **DNI (8 dígitos)** y contraseña cifrada con `bcrypt` + tokens `JWT`, con aislamiento estricto de datos por docente.
- **Dashboard y Mis Aulas:** Resumen general en tiempo real, creación de aulas, conteo real de estudiantes y evaluaciones desde PostgreSQL.
- **Gestión de Estudiantes y Análisis Individual:** Listado completo sin límites artificiales, filtrado por aula o alerta, registro de nuevos alumnos con código automático de vinculación familiar y análisis individual dinámico por estudiante.
- **Registro de Evaluaciones (3 modalidades):**
  1. **Directo:** Registro por aula, área, criterios editables y marcas (`Logrado`, `No logrado`, `No observado`).
  2. **Fotografía (OCR con Tesseract.js):** Reconocimiento real de listas físicas con barra de progreso, edición del texto y celdas dudosas antes de confirmar el guardado.
  3. **Importación Excel (SheetJS `xlsx`):** Descarga de plantilla `.xlsx`, selección de hoja y mapeo de columnas, validación fila por fila, detección de duplicados y confirmación previa al guardado.
- **Alertas Automáticas y Refuerzo:** Detección automática de alertas cuando un estudiante acumula dos resultados consecutivos `NO_LOGRADO` en un criterio, botón **«Ver estudiantes»**, planificación de actividades de refuerzo e historial cronológico.
- **Agenda Compartida:** Vista de calendario mensual y listado con creación, edición, filtros y cancelación con motivo para reuniones, evaluaciones, actividades y comunicados.
- **Configuración → Mi Perfil:** Edición real de nombres, apellidos, correo electrónico (validado sin duplicados), teléfono, institución educativa y nivel educativo (con DNI bloqueado), además de carga, vista previa, reemplazo y eliminación persistente de fotografía de perfil almacenada en PostgreSQL.

### Portal del Apoderado
- **Autenticación y Vinculación:** Registro e inicio de sesión independientes por DNI, con vinculación segura mediante código otorgado por el docente (`VINC-...`).
- **Consulta Protegida (solo lectura):** Progreso del estudiante vinculado, historial oficial de evaluaciones, recomendaciones de apoyo en casa y acceso a la **Agenda Compartida** filtrada estrictamente por sus estudiantes vinculados.

---

## Tecnologías utilizadas

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS v4, Tesseract.js (`ocr`), SheetJS (`xlsx`).
- **Backend:** Node.js, Express, TypeScript, `pg` (driver nativo de PostgreSQL sin Prisma ni ORM).
- **Seguridad y Validación:** `bcryptjs`, `jsonwebtoken`, `zod`, `helmet`, `cors`, consultas SQL parametrizadas.
- **Base de Datos:** PostgreSQL (esquema relacional con migraciones SQL transaccionales).

---

## Estructura del proyecto

```text
D:\Aver
├── server/
│   ├── database/
│   │   └── migrations/
│   │       ├── 001_initial_schema.sql      # 21 tablas relacionales base
│   │       ├── 002_seed_data.sql           # Áreas curriculares y criterios iniciales
│   │       ├── 003_agenda_eventos.sql      # Agenda compartida docente-apoderado
│   │       └── 004_docente_perfil_foto.sql # Columna persistente de fotografía docente
│   ├── src/
│   │   ├── config/env.ts                   # Carga de variables de entorno
│   │   ├── controllers/                    # Controladores auth, docente, apoderado y agenda
│   │   ├── database/
│   │   │   ├── connection.ts               # Pool pg y helper transaccional
│   │   │   ├── migrator.ts                 # Ejecutor transaccional de migraciones SQL
│   │   │   └── queries/                    # Consultas SQL parametrizadas puras
│   │   ├── middlewares/                    # JWT auth, control por rol y esquemas Zod
│   │   ├── routes/                         # Rutas REST /api/auth, /api/docente, /api/apoderado
│   │   ├── services/                       # Utilidades criptográficas bcrypt/JWT
│   │   ├── app.ts                          # Configuración Express + estáticos en producción
│   │   └── server.ts                       # Arranque del servidor API
│   ├── test/                               # Pruebas de conexión, seguridad y verificación en BD
│   └── tsconfig.json
├── src/
│   ├── components/
│   │   ├── agenda/AgendaShared.tsx         # Agenda compartida rediseñada (docente y apoderado)
│   │   ├── auth/AuthScreens.tsx            # Registro, login y recuperación de contraseña
│   │   ├── docente/
│   │   │   ├── DocentePanel.tsx            # Panel docente completo y Mi Perfil
│   │   │   └── RegisterEvaluationModule.tsx# Registro directo, OCR Tesseract.js e importación xlsx
│   │   └── guardian/GuardianSpace.tsx      # Portal familiar (solo lectura)
│   ├── context/AuthContext.tsx
│   ├── services/api.ts                     # Cliente HTTP hacia /api
│   ├── types/auth.ts
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .env.example
├── .gitignore
├── package.json
├── render.yaml                             # Configuración Blueprint para Render
└── vite.config.ts
```

---

## Requisitos previos

- **Node.js** 20 o 22+
- **pnpm** 10+ (activable con `corepack enable`)
- **PostgreSQL** 15+ (probado con PostgreSQL 18.6)

---

## Instalación local y configuración de PostgreSQL

1. **Clonar el repositorio e instalar dependencias:**
   ```bash
   git clone https://github.com/belentorresz/Aver.git
   cd Aver
   corepack enable
   pnpm install
   ```

2. **Crear la base de datos en PostgreSQL:**
   ```sql
   CREATE DATABASE aver_db;
   ```

3. **Configurar variables de entorno:**
   Copia `.env.example` a `.env` en la raíz del proyecto y completa tus datos locales (nunca subas `.env` al repositorio):
   ```env
   NODE_ENV=development
   PORT=5000
   CLIENT_URL=http://localhost:8443
   JWT_SECRET=tu_clave_secreta_larga_y_segura
   JWT_EXPIRES_IN=7d
   DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/aver_db
   ```

4. **Probar conexión y ejecutar migraciones SQL:**
   ```bash
   pnpm run test:db
   pnpm run migrate
   ```

---

## Comandos principales

| Comando | Descripción |
| :--- | :--- |
| `pnpm run dev` | Inicia el frontend Vite en desarrollo (puerto `8443`, proxy `/api` → `:5000`) |
| `pnpm run server:dev` | Inicia el backend Express con recarga en caliente (`tsx watch`) |
| `pnpm run migrate` | Ejecuta migraciones SQL pendientes en desarrollo |
| `pnpm run migrate:prod` | Ejecuta migraciones SQL compiladas en producción (`dist-server/`) |
| `pnpm run build` | Compila el frontend (`dist/`) y el backend (`dist-server/`) |
| `pnpm start` | Inicia la aplicación completa en producción (`node dist-server/server.js`) |
| `pnpm run test:security` | Ejecuta las 39 pruebas unitarias de criptografía, JWT, Zod y aislamiento |
| `pnpm run test:db` | Verifica la conectividad con PostgreSQL sin exponer credenciales |

---

## Despliegue en Render

El proyecto está listo para desplegarse como **Web Service** único en Render (el servidor Express sirve la API `/api/*` y el frontend compilado de Vite desde `dist/`):

1. Crea una base de datos **PostgreSQL** en Render y copia su **Internal Database URL** (o External URL).
2. Crea un **Web Service** conectado al repositorio `https://github.com/belentorresz/Aver.git` (rama `main`) o utiliza el archivo incluido `render.yaml`:
   - **Build Command:** `corepack enable && pnpm install --frozen-lockfile=false && pnpm run build`
   - **Start Command:** `pnpm run migrate:prod && pnpm start`
   - **Health Check Path:** `/api/health`
3. Configura las **Environment Variables** en Render:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = *(URL de tu PostgreSQL de Render)*
   - `JWT_SECRET` = *(cadena aleatoria segura de al menos 32 caracteres)*
   - `JWT_EXPIRES_IN` = `7d`
   - `CLIENT_URL` = *(URL pública asignada por Render, ej. `https://aver-plataforma.onrender.com`)*

Las fotografías de perfil docente se almacenan validadas dentro de PostgreSQL (`docentes.foto_perfil`), por lo que se conservan tras reinicios o nuevos despliegues del contenedor en Render.
