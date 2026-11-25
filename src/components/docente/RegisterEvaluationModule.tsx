import { useEffect, useMemo, useState } from 'react';
import Tesseract from 'tesseract.js';
import * as XLSX from 'xlsx';
import { api } from '../../services/api';

type RegisterMode = 'choose' | 'camera' | 'excel' | 'direct' | 'review';
type Marca = 'LOGRADO' | 'NO_LOGRADO' | 'NO_OBSERVADO';
type NivelLogro = 'AD' | 'A' | 'B' | 'C' | '';

interface ReviewRow {
  rowKey: string;
  estudianteId: number | null;
  nombreArchivo?: string;
  codigoArchivo?: string;
  marks: Record<number, { marca: Marca; nivelLogro: NivelLogro; uncertain?: boolean; error?: string }>;
  rowError?: string;
  included: boolean;
}

function normalizeText(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseMarkValue(raw: unknown): { marca: Marca; nivelLogro: NivelLogro; valid: boolean; uncertain: boolean } {
  const s = normalizeText(String(raw ?? ''));
  if (!s) return { marca: 'NO_OBSERVADO', nivelLogro: '', valid: false, uncertain: true };

  if (['✓', '✔', 'logrado', 'si', 's', 'l', '1', 'true', 'ok', 'check'].includes(s)) {
    return { marca: 'LOGRADO', nivelLogro: 'A', valid: true, uncertain: false };
  }
  if (s === 'ad') return { marca: 'LOGRADO', nivelLogro: 'AD', valid: true, uncertain: false };
  if (s === 'a') return { marca: 'LOGRADO', nivelLogro: 'A', valid: true, uncertain: false };

  if (['×', 'x', '✗', 'no logrado', 'no_logrado', 'nl', 'no', 'n', '0', 'false'].includes(s)) {
    return { marca: 'NO_LOGRADO', nivelLogro: 'C', valid: true, uncertain: false };
  }
  if (s === 'c') return { marca: 'NO_LOGRADO', nivelLogro: 'C', valid: true, uncertain: false };

  if (['—', '-', '--', 'no observado', 'no_observado', 'no_obs', 'no_aplica', 'np'].includes(s)) {
    return { marca: 'NO_OBSERVADO', nivelLogro: '', valid: true, uncertain: false };
  }
  if (s === 'b') return { marca: 'NO_OBSERVADO', nivelLogro: 'B', valid: true, uncertain: false };

  return { marca: 'NO_OBSERVADO', nivelLogro: '', valid: false, uncertain: true };
}

function matchStudent(studentsList: any[], rawIdentifier: string): any | null {
  const target = normalizeText(rawIdentifier);
  if (!target) return null;

  // 1. Coincidencia exacta por código o DNI
  const byCodeOrDni = studentsList.find(
    (s) => normalizeText(s.codigo) === target || (s.dni && normalizeText(s.dni) === target)
  );
  if (byCodeOrDni) return byCodeOrDni;

  // 2. Coincidencia por nombre completo o "apellidos, nombres"
  const byFull = studentsList.find((s) => {
    const full1 = normalizeText(`${s.nombres} ${s.apellidos}`);
    const full2 = normalizeText(`${s.apellidos} ${s.nombres}`);
    return full1 === target || full2 === target || target.includes(full1) || full1.includes(target);
  });
  if (byFull) return byFull;

  // 3. Coincidencia parcial por apellido y nombre
  return (
    studentsList.find((s) => {
      const last = normalizeText(s.apellidos).split(' ')[0];
      const first = normalizeText(s.nombres).split(' ')[0];
      return last.length >= 3 && first.length >= 3 && target.includes(last) && target.includes(first);
    }) || null
  );
}

function parseOcrTextToRows(
  ocrText: string,
  aulaStudents: any[],
  criteriaCount: number
): ReviewRow[] {
  const lines = ocrText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return aulaStudents.map((st) => {
    const first = normalizeText(st.nombres).split(' ')[0];
    const last = normalizeText(st.apellidos).split(' ')[0];
    const code = normalizeText(st.codigo);

    const matchedLine = lines.find((line) => {
      const nl = normalizeText(line);
      return (code && nl.includes(code)) || (last.length >= 3 && nl.includes(last) && (!first || nl.includes(first)));
    });

    const marks: ReviewRow['marks'] = {};
    if (matchedLine) {
      // Extraer posibles marcas en la línea reconocida
      const tokenMatches = matchedLine.match(/(?:✓|✔|×|✗|—|\blogrado\b|\bno\s*logrado\b|\bad\b|\b[abcxvl]\b|-)/gi) || [];
      const extracted = tokenMatches.filter((t) => {
        const nt = normalizeText(t);
        return nt !== normalizeText(st.codigo) && nt !== first && nt !== last;
      });

      for (let cIdx = 0; cIdx < criteriaCount; cIdx++) {
        const rawTok = extracted[cIdx];
        if (rawTok) {
          const parsed = parseMarkValue(rawTok);
          marks[cIdx] = {
            marca: parsed.marca,
            nivelLogro: parsed.nivelLogro,
            uncertain: !parsed.valid,
          };
        } else {
          marks[cIdx] = { marca: 'NO_OBSERVADO', nivelLogro: '', uncertain: true };
        }
      }
    } else {
      for (let cIdx = 0; cIdx < criteriaCount; cIdx++) {
        marks[cIdx] = { marca: 'NO_OBSERVADO', nivelLogro: '', uncertain: true };
      }
    }

    return {
      rowKey: `ocr-${st.id}`,
      estudianteId: st.id,
      nombreArchivo: `${st.nombres} ${st.apellidos}`,
      codigoArchivo: st.codigo,
      marks,
      included: true,
    };
  });
}

export function RegisterEvaluationModule({
  aulas,
  students,
  areas,
  criteriosBase,
  onSaved,
}: {
  aulas: any[];
  students: any[];
  areas: any[];
  criteriosBase: any[];
  onSaved: (message: string) => void;
}) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [mode, setMode] = useState<RegisterMode>('choose');
  const [sourceType, setSourceType] = useState<'DIRECTO' | 'OCR' | 'EXCEL'>('DIRECTO');

  // Metadatos generales de la evaluación
  const [selectedAulaId, setSelectedAulaId] = useState<number | ''>(aulas[0]?.id || '');
  const [selectedAreaId, setSelectedAreaId] = useState<number | ''>(areas[0]?.id || '');
  const [titulo, setTitulo] = useState('');
  const [fecha, setFecha] = useState(todayStr);
  const [sesion, setSesion] = useState('Sesión 01');
  const [criterios, setCriterios] = useState<string[]>([
    'Identifica las ideas principales de un texto',
    'Ubica información explícita en el texto',
  ]);

  // Estado compartido de revisión y guardado
  const [reviewRows, setReviewRows] = useState<ReviewRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Estado OCR (Etapa 4)
  const [ocrFileName, setOcrFileName] = useState('');
  const [ocrPreviewUrl, setOcrPreviewUrl] = useState('');
  const [ocrImageFile, setOcrImageFile] = useState<File | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrRawText, setOcrRawText] = useState('');
  const [ocrProcessing, setOcrProcessing] = useState(false);

  // Estado Excel (Etapa 5)
  const [excelFileName, setExcelFileName] = useState('');
  const [excelWorkbook, setExcelWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [excelSheets, setExcelSheets] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState('');
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelRawRows, setExcelRawRows] = useState<Record<string, any>[]>([]);
  const [studentColumn, setStudentColumn] = useState('');
  const [criteriaColumns, setCriteriaColumns] = useState<string[]>([]);

  useEffect(() => {
    if (!selectedAulaId && aulas.length > 0) setSelectedAulaId(aulas[0].id);
  }, [aulas]);

  useEffect(() => {
    if (!selectedAreaId && areas.length > 0) setSelectedAreaId(areas[0].id);
  }, [areas]);

  // Cargar criterios sugeridos del área seleccionada
  useEffect(() => {
    if (!selectedAreaId || mode === 'review') return;
    const areaCrits = criteriosBase.filter((c) => c.area_id === Number(selectedAreaId));
    if (areaCrits.length > 0 && sourceType === 'DIRECTO') {
      setCriterios(areaCrits.slice(0, 3).map((c) => c.descripcion));
    }
  }, [selectedAreaId]);

  const aulaStudents = useMemo(() => {
    if (!selectedAulaId) return students;
    return students.filter((s) => s.aula_id === Number(selectedAulaId));
  }, [students, selectedAulaId]);

  const selectedAreaName = useMemo(
    () => areas.find((a) => a.id === Number(selectedAreaId))?.nombre || 'Comunicación',
    [areas, selectedAreaId]
  );

  const selectedAulaName = useMemo(() => {
    const a = aulas.find((item) => item.id === Number(selectedAulaId));
    return a ? `${a.grado} ${a.seccion}` : 'Todas las aulas';
  }, [aulas, selectedAulaId]);

  function startMode(next: 'camera' | 'excel' | 'direct') {
    setErrorMsg('');
    setSourceType(next === 'camera' ? 'OCR' : next === 'excel' ? 'EXCEL' : 'DIRECTO');
    if (next === 'direct') {
      const initialRows: ReviewRow[] = aulaStudents.map((st) => ({
        rowKey: `dir-${st.id}`,
        estudianteId: st.id,
        nombreArchivo: `${st.nombres} ${st.apellidos}`,
        codigoArchivo: st.codigo,
        marks: Object.fromEntries(
          criterios.map((_, idx) => [idx, { marca: 'LOGRADO' as Marca, nivelLogro: 'A' as NivelLogro, uncertain: false }])
        ),
        included: true,
      }));
      setReviewRows(initialRows);
    }
    setMode(next);
  }

  // =========================================================================
  // ETAPA 4: PROCESAMIENTO OCR REAL CON TESSERACT.JS
  // =========================================================================
  function handleSelectOcrFile(file: File | undefined) {
    if (!file) return;
    setErrorMsg('');
    setOcrImageFile(file);
    setOcrFileName(file.name);
    setOcrRawText('');
    setOcrProgress(0);
    const url = URL.createObjectURL(file);
    setOcrPreviewUrl(url);
  }

  async function runOcrRecognition() {
    if (!ocrImageFile) {
      setErrorMsg('Selecciona o toma una fotografía primero.');
      return;
    }
    if (aulaStudents.length === 0) {
      setErrorMsg('El aula seleccionada no tiene estudiantes registrados para asociar.');
      return;
    }

    setOcrProcessing(true);
    setErrorMsg('');
    setOcrProgress(0);
    setOcrStatus('Inicializando motor OCR (Tesseract.js)...');

    try {
      let text = '';
      try {
        const result = await Tesseract.recognize(ocrImageFile, 'spa', {
          logger: (m) => {
            if (m.status) setOcrStatus(m.status);
            if (typeof m.progress === 'number') setOcrProgress(Math.round(m.progress * 100));
          },
        });
        text = result.data.text || '';
      } catch {
        // Respaldo con modelo 'eng' si no se pudo descargar el paquete español
        const fallback = await Tesseract.recognize(ocrImageFile, 'eng', {
          logger: (m) => {
            if (m.status) setOcrStatus(m.status);
            if (typeof m.progress === 'number') setOcrProgress(Math.round(m.progress * 100));
          },
        });
        text = fallback.data.text || '';
      }

      setOcrRawText(text);
      const validCrits = criterios.filter((c) => c.trim().length >= 3);
      const activeCrits = validCrits.length > 0 ? validCrits : ['Criterio reconocido en lista'];
      setCriterios(activeCrits);

      const parsedRows = parseOcrTextToRows(text, aulaStudents, activeCrits.length);
      setReviewRows(parsedRows);
      if (!titulo.trim()) {
        setTitulo(`Lista de cotejo OCR · ${selectedAreaName}`);
      }
      setMode('review');
    } catch (err: any) {
      setErrorMsg(`No se pudo procesar la fotografía con OCR: ${err?.message || 'error inesperado'}`);
    } finally {
      setOcrProcessing(false);
    }
  }

  // =========================================================================
  // ETAPA 5: LECTURA Y VALIDACIÓN REAL DE EXCEL CON XLSX
  // =========================================================================
  function downloadExcelTemplate() {
    const rows = aulaStudents.map((st) => ({
      Codigo: st.codigo,
      Estudiante: `${st.nombres} ${st.apellidos}`,
      [criterios[0] || 'Criterio 1']: 'LOGRADO',
      [criterios[1] || 'Criterio 2']: 'NO_LOGRADO',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Evaluacion');
    XLSX.writeFile(wb, `Plantilla_AVer_${selectedAulaName.replace(/\s+/g, '_')}.xlsx`);
  }

  function applySheetSelection(wb: XLSX.WorkBook, targetSheet: string) {
    const sheet = wb.Sheets[targetSheet];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    setActiveSheet(targetSheet);
    setExcelRawRows(rows);
    setExcelHeaders(headers);

    const detectedStudentCol =
      headers.find((h) => ['codigo', 'código', 'dni', 'estudiante', 'alumno', 'nombre', 'nombres'].some((k) => normalizeText(h).includes(k))) ||
      headers[0] ||
      '';
    setStudentColumn(detectedStudentCol);

    const ignoredCols = new Set([detectedStudentCol, 'estudiante', 'nombre', 'nombres', 'apellidos', 'dni', 'codigo', 'código', 'observaciones', 'nivel']);
    const detectedCritCols = headers.filter((h) => h !== detectedStudentCol && !ignoredCols.has(normalizeText(h)));
    setCriteriaColumns(detectedCritCols.length > 0 ? detectedCritCols : headers.filter((h) => h !== detectedStudentCol));
  }

  async function handleSelectExcelFile(file: File | undefined) {
    if (!file) return;
    setErrorMsg('');
    setExcelFileName(file.name);

    try {
      const arrayBuf = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuf, { type: 'array' });
      if (!wb.SheetNames || wb.SheetNames.length === 0) {
        setErrorMsg('El archivo Excel no contiene hojas válidas.');
        return;
      }
      setExcelWorkbook(wb);
      setExcelSheets(wb.SheetNames);
      applySheetSelection(wb, wb.SheetNames[0]);

      // También notificar/parsear en backend para validar estructura con xlsx del servidor
      const bytes = new Uint8Array(arrayBuf);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const base64Data = btoa(binary);
      await api.parseDocenteExcel({ fileName: file.name, base64Data, sheetName: wb.SheetNames[0] }).catch(() => null);
    } catch (err: any) {
      setErrorMsg(`Error al leer el archivo Excel: ${err?.message || 'formato inválido'}`);
    }
  }

  function proceedExcelToReview() {
    setErrorMsg('');
    if (excelRawRows.length === 0) {
      setErrorMsg('El archivo seleccionado no tiene filas con datos.');
      return;
    }
    if (!studentColumn) {
      setErrorMsg('Selecciona la columna que identifica al estudiante.');
      return;
    }
    if (criteriaColumns.length === 0) {
      setErrorMsg('Selecciona al menos una columna de criterio de evaluación.');
      return;
    }

    const seenStudentIds = new Set<number>();
    const validatedRows: ReviewRow[] = excelRawRows.map((rawRow, idx) => {
      const rawIdVal = String(rawRow[studentColumn] ?? '').trim();
      const matched = matchStudent(aulaStudents, rawIdVal) || matchStudent(students, rawIdVal);

      let rowError = '';
      if (!matched) {
        rowError = `Estudiante "${rawIdVal || '(vacío)'}" no encontrado en tus registros`;
      } else if (seenStudentIds.has(matched.id)) {
        rowError = `Estudiante duplicado en el archivo Excel`;
      } else {
        seenStudentIds.add(matched.id);
      }

      const marks: ReviewRow['marks'] = {};
      criteriaColumns.forEach((col, cIdx) => {
        const parsed = parseMarkValue(rawRow[col]);
        marks[cIdx] = {
          marca: parsed.marca,
          nivelLogro: parsed.nivelLogro,
          uncertain: !parsed.valid,
          error: parsed.valid ? undefined : `Valor "${rawRow[col]}" inválido`,
        };
      });

      return {
        rowKey: `xl-${idx}`,
        estudianteId: matched ? matched.id : null,
        nombreArchivo: rawRow['Estudiante'] || rawIdVal,
        codigoArchivo: rawRow['Codigo'] || rawRow['Código'] || '',
        marks,
        rowError,
        included: Boolean(matched) && !rowError,
      };
    });

    setCriterios(criteriaColumns);
    setReviewRows(validatedRows);
    if (!titulo.trim()) {
      setTitulo(`Importación Excel · ${excelFileName.replace(/\.[^.]+$/, '')}`);
    }
    setMode('review');
  }

  // =========================================================================
  // CONFIRMACIÓN FINAL -> PERSISTENCIA EN POSTGRESQL
  // =========================================================================
  async function handleConfirmAndSave(estadoFinal: 'COMPLETADA' | 'BORRADOR' = 'COMPLETADA') {
    setErrorMsg('');
    if (!selectedAreaId) {
      setErrorMsg('Selecciona un área académica.');
      return;
    }
    if (titulo.trim().length < 3) {
      setErrorMsg('Ingresa un título válido para la evaluación.');
      return;
    }

    const cleanCriterios = criterios.map((c) => c.trim()).filter((c) => c.length >= 3);
    if (cleanCriterios.length === 0) {
      setErrorMsg('Debe haber al menos un criterio de evaluación válido (mínimo 3 caracteres).');
      return;
    }

    const includedRows = reviewRows.filter((r) => r.included && r.estudianteId);
    if (includedRows.length === 0) {
      setErrorMsg('Debe incluir al menos un estudiante válido para guardar.');
      return;
    }

    // Evitar estudiantes duplicados antes de enviar
    const dedupMap = new Map<number, ReviewRow>();
    for (const r of includedRows) {
      if (r.estudianteId && !dedupMap.has(r.estudianteId)) {
        dedupMap.set(r.estudianteId, r);
      }
    }

    const resultados: any[] = [];
    for (const row of dedupMap.values()) {
      cleanCriterios.forEach((_, cIdx) => {
        const cell = row.marks[cIdx] || { marca: 'NO_OBSERVADO', nivelLogro: '' };
        resultados.push({
          estudianteId: row.estudianteId!,
          criterioIndex: cIdx,
          marca: cell.marca,
          nivelLogro: cell.nivelLogro || null,
        });
      });
    }

    const payload: any = {
      aulaId: selectedAulaId ? Number(selectedAulaId) : null,
      areaId: Number(selectedAreaId),
      titulo: titulo.trim(),
      fecha,
      sesion: sesion.trim() || null,
      estado: estadoFinal,
      fuenteOrigen: sourceType,
      preventDuplicate: true,
      criterios: cleanCriterios.map((descripcion) => ({ descripcion })),
      resultados,
    };

    if (sourceType === 'OCR') {
      payload.archivo = {
        nombreArchivo: ocrFileName || 'lista_cotejo.jpg',
        tipo: 'IMAGEN_OCR',
        datosReconocidos: { rawText: ocrRawText },
        datosCorregidos: { criterios: cleanCriterios, totalEstudiantes: dedupMap.size },
      };
    } else if (sourceType === 'EXCEL') {
      payload.archivo = {
        nombreArchivo: excelFileName || 'registro.xlsx',
        tipo: 'EXCEL',
      };
    }

    setSaving(true);
    try {
      const res =
        sourceType === 'OCR'
          ? await api.confirmDocenteOcr(payload)
          : sourceType === 'EXCEL'
            ? await api.confirmDocenteExcel(payload)
            : await api.createDocenteEvaluacion(payload);

      if (res.success) {
        onSaved(res.message || 'Evaluación guardada correctamente en PostgreSQL');
      } else {
        setErrorMsg(res.message || 'No se pudo guardar la evaluación.');
      }
    } catch {
      setErrorMsg('Error de conexión al guardar en PostgreSQL.');
    } finally {
      setSaving(false);
    }
  }

  // =========================================================================
  // RENDERIZADO CONSERVANDO EL DISEÑO ORIGINAL DE FIGMA
  // =========================================================================
  if (mode === 'choose') {
    const modes = [
      { key: 'camera', title: 'Fotografía tu lista de cotejo', desc: 'Sube una fotografía de tu instrumento y reconoce texto y marcas reales con Tesseract.js.', tone: 'camera', opt: 'OPCIÓN 1' },
      { key: 'excel', title: 'Importa tu archivo Excel', desc: 'Carga archivos .xlsx o .csv, asocia columnas, valida filas y guarda sin duplicados.', tone: 'excel', opt: 'OPCIÓN 2' },
      { key: 'direct', title: 'Registrar directamente', desc: 'Ingresa los resultados de todos tus estudiantes directamente en PostgreSQL.', tone: 'direct', opt: 'OPCIÓN 3' },
    ] as const;

    return (
      <>
        <div className="page-header">
          <div>
            <h1>Registrar evaluación</h1>
            <p>Elige la forma más cómoda de incorporar tus resultados</p>
          </div>
        </div>
        <div className="register-intro">
          <div>✦</div>
          <p>
            <strong>Registra una sola vez, analiza sin repetir trabajo.</strong>
            <span>Las tres opciones pasan por una revisión obligatoria antes de guardarse en PostgreSQL.</span>
          </p>
        </div>
        <div className="register-options">
          {modes.map((m) => (
            <button type="button" className={`register-option ${m.tone}`} key={m.key} onClick={() => startMode(m.key)}>
              <span className="option-icon">
                {m.key === 'camera' ? '📷' : m.key === 'excel' ? '📊' : '✏️'}
              </span>
              <small>{m.opt}</small>
              <h2>{m.title}</h2>
              <p>{m.desc}</p>
              <b>Comenzar →</b>
            </button>
          ))}
        </div>
      </>
    );
  }

  // PASO 1: OCR (CÁMARA)
  if (mode === 'camera') {
    return (
      <>
        <div className="page-header">
          <div>
            <h1>Fotografiar lista física (OCR)</h1>
            <p>Paso 1 de 3 · Reconocimiento real con Tesseract.js</p>
          </div>
          <div className="page-actions">
            <button type="button" className="btn ghost" onClick={() => setMode('choose')}>Volver</button>
          </div>
        </div>

        <section className="card upload-card">
          <div className="upload-copy">
            <span className="badge purple">OCR Real · Tesseract.js</span>
            <h2>Sube una foto de tu lista de cotejo</h2>
            <p>El motor OCR extraerá el texto de la imagen para que revises y corrijas cada resultado antes de guardar.</p>
          </div>

          {errorMsg && <div className="auth-alert error" style={{ marginTop: '14px' }}>{errorMsg}</div>}

          <div className="form-grid" style={{ marginTop: '18px' }}>
            <label>
              Aula
              <select value={selectedAulaId} onChange={(e) => setSelectedAulaId(Number(e.target.value))}>
                {aulas.map((a) => (
                  <option key={a.id} value={a.id}>{a.grado} {a.seccion}</option>
                ))}
              </select>
            </label>
            <label>
              Área académica
              <select value={selectedAreaId} onChange={(e) => setSelectedAreaId(Number(e.target.value))}>
                {areas.map((ar) => (
                  <option key={ar.id} value={ar.id}>{ar.nombre}</option>
                ))}
              </select>
            </label>
            <label>
              Nombre de la evaluación
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Lista de cotejo Lectura" />
            </label>
            <label>
              Fecha
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </label>
          </div>

          <label className={`drop-zone ${ocrFileName ? 'has-file' : ''}`}>
            <input type="file" accept="image/*" onChange={(e) => handleSelectOcrFile(e.target.files?.[0])} />
            <span>{ocrFileName ? '✓' : '📷'}</span>
            {ocrFileName ? (
              <>
                <strong>{ocrFileName}</strong>
                <small>Imagen lista para reconocimiento OCR</small>
              </>
            ) : (
              <>
                <strong>Haz clic o arrastra una fotografía (.png, .jpg, .webp)</strong>
                <small>No se guardará nada automáticamente sin tu confirmación</small>
              </>
            )}
          </label>

          {ocrPreviewUrl && (
            <div style={{ marginTop: '14px', textAlign: 'center' }}>
              <img
                src={ocrPreviewUrl}
                alt="Vista previa de lista de cotejo"
                style={{ maxHeight: '220px', borderRadius: '10px', border: '1px solid #E9E5EF' }}
              />
            </div>
          )}

          {ocrProcessing && (
            <div style={{ marginTop: '14px', background: '#F6F2FC', padding: '12px', borderRadius: '10px' }}>
              <strong style={{ fontSize: '11px', color: '#492477' }}>
                Procesando OCR: {ocrProgress}% ({ocrStatus})
              </strong>
              <div style={{ height: '8px', background: '#E2D6F3', borderRadius: '4px', marginTop: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${ocrProgress}%`, height: '100%', background: '#7041B5', transition: 'width .2s' }} />
              </div>
            </div>
          )}

          <div className="form-footer">
            <button type="button" className="btn secondary" onClick={() => setMode('choose')}>Cancelar</button>
            <button type="button" className="btn primary" disabled={ocrProcessing || !ocrImageFile} onClick={runOcrRecognition}>
              {ocrProcessing ? `Reconociendo (${ocrProgress}%)...` : 'Reconocer datos con OCR →'}
            </button>
          </div>
        </section>
      </>
    );
  }

  // PASO 1: EXCEL (XLSX)
  if (mode === 'excel') {
    return (
      <>
        <div className="page-header">
          <div>
            <h1>Importar archivo Excel</h1>
            <p>Paso 1 de 3 · Lectura y validación real con SheetJS (xlsx)</p>
          </div>
          <div className="page-actions">
            <button type="button" className="btn secondary" onClick={downloadExcelTemplate}>
              Descargar plantilla .xlsx
            </button>
            <button type="button" className="btn ghost" onClick={() => setMode('choose')}>Volver</button>
          </div>
        </div>

        <section className="card upload-card">
          <div className="upload-copy">
            <span className="badge green">Importación Real · SheetJS xlsx</span>
            <h2>Selecciona tu archivo Excel o CSV</h2>
            <p>Asocia las columnas con tus estudiantes y criterios, valida fila por fila y evita duplicados.</p>
          </div>

          {errorMsg && <div className="auth-alert error" style={{ marginTop: '14px' }}>{errorMsg}</div>}

          <div className="form-grid" style={{ marginTop: '18px' }}>
            <label>
              Aula destino
              <select value={selectedAulaId} onChange={(e) => setSelectedAulaId(Number(e.target.value))}>
                {aulas.map((a) => (
                  <option key={a.id} value={a.id}>{a.grado} {a.seccion}</option>
                ))}
              </select>
            </label>
            <label>
              Área académica
              <select value={selectedAreaId} onChange={(e) => setSelectedAreaId(Number(e.target.value))}>
                {areas.map((ar) => (
                  <option key={ar.id} value={ar.id}>{ar.nombre}</option>
                ))}
              </select>
            </label>
            <label>
              Nombre de la evaluación
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Registro Comunicación Junio" />
            </label>
            <label>
              Fecha
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </label>
          </div>

          <label className={`drop-zone ${excelFileName ? 'has-file' : ''}`}>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => handleSelectExcelFile(e.target.files?.[0])} />
            <span>{excelFileName ? '✓' : '📄'}</span>
            {excelFileName ? (
              <>
                <strong>{excelFileName}</strong>
                <small>{excelRawRows.length} fila(s) leídas · {excelSheets.length} hoja(s)</small>
              </>
            ) : (
              <>
                <strong>Haz clic o arrastra tu archivo .xlsx, .xls o .csv</strong>
                <small>También puedes descargar la plantilla prellenada arriba</small>
              </>
            )}
          </label>

          {excelHeaders.length > 0 && (
            <div style={{ marginTop: '18px', borderTop: '1px solid #E9E5EF', paddingTop: '16px' }}>
              <div className="form-grid">
                {excelSheets.length > 1 && (
                  <label>
                    Hoja del libro Excel
                    <select
                      value={activeSheet}
                      onChange={(e) => excelWorkbook && applySheetSelection(excelWorkbook, e.target.value)}
                    >
                      {excelSheets.map((sh) => (
                        <option key={sh} value={sh}>{sh}</option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  Columna de estudiante (Código, DNI o Nombre)
                  <select value={studentColumn} onChange={(e) => setStudentColumn(e.target.value)}>
                    {excelHeaders.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ marginTop: '12px' }}>
                <strong style={{ fontSize: '11px', display: 'block', marginBottom: '6px' }}>
                  Columnas de criterios de evaluación a importar:
                </strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {excelHeaders
                    .filter((h) => h !== studentColumn)
                    .map((h) => (
                      <label key={h} className="agenda-student-check" style={{ padding: '6px 10px', border: '1px solid #DFDAE5', borderRadius: '8px' }}>
                        <input
                          type="checkbox"
                          checked={criteriaColumns.includes(h)}
                          onChange={() =>
                            setCriteriaColumns((prev) =>
                              prev.includes(h) ? prev.filter((c) => c !== h) : [...prev, h]
                            )
                          }
                        />
                        <span>{h}</span>
                      </label>
                    ))}
                </div>
              </div>
            </div>
          )}

          <div className="form-footer">
            <button type="button" className="btn secondary" onClick={() => setMode('choose')}>Cancelar</button>
            <button
              type="button"
              className="btn primary"
              disabled={excelRawRows.length === 0}
              onClick={proceedExcelToReview}
            >
              Validar filas y previsualizar →
            </button>
          </div>
        </section>
      </>
    );
  }

  // PASO 1: REGISTRO DIRECTO
  if (mode === 'direct') {
    return (
      <>
        <div className="page-header">
          <div>
            <h1>Registro directo</h1>
            <p>Paso 1 de 3 · Datos de la evaluación ({aulaStudents.length} estudiantes en el aula)</p>
          </div>
          <div className="page-actions">
            <button type="button" className="btn ghost" onClick={() => setMode('choose')}>Volver</button>
          </div>
        </div>

        <section className="card direct-form">
          {errorMsg && <div className="auth-alert error">{errorMsg}</div>}

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
                Aula
                <select
                  value={selectedAulaId}
                  onChange={(e) => {
                    const nextAula = Number(e.target.value);
                    setSelectedAulaId(nextAula);
                    const nextList = students.filter((s) => s.aula_id === nextAula);
                    setReviewRows(
                      nextList.map((st) => ({
                        rowKey: `dir-${st.id}`,
                        estudianteId: st.id,
                        nombreArchivo: `${st.nombres} ${st.apellidos}`,
                        codigoArchivo: st.codigo,
                        marks: Object.fromEntries(
                          criterios.map((_, idx) => [idx, { marca: 'LOGRADO' as Marca, nivelLogro: 'A' as NivelLogro, uncertain: false }])
                        ),
                        included: true,
                      }))
                    );
                  }}
                >
                  {aulas.map((a) => (
                    <option key={a.id} value={a.id}>{a.grado} {a.seccion}</option>
                  ))}
                </select>
              </label>
              <label>
                Área
                <select value={selectedAreaId} onChange={(e) => setSelectedAreaId(Number(e.target.value))}>
                  {areas.map((ar) => (
                    <option key={ar.id} value={ar.id}>{ar.nombre}</option>
                  ))}
                </select>
              </label>
              <label className="span-2">
                Nombre de la evaluación
                <input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej. Comprensión de textos narrativos II"
                />
              </label>
              <label>
                Fecha
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </label>
              <label>
                Sesión
                <input value={sesion} onChange={(e) => setSesion(e.target.value)} />
              </label>
            </div>
          </div>

          <div className="form-section">
            <div className="form-title">
              <span>2</span>
              <div>
                <h2>Criterios de evaluación</h2>
                <p>Puedes usar criterios sugeridos o editarlos libremente.</p>
              </div>
            </div>
            {criterios.map((crit, idx) => (
              <div className="criteria-input" key={idx}>
                <span>{idx + 1}</span>
                <input
                  value={crit}
                  onChange={(e) => {
                    const copy = [...criterios];
                    copy[idx] = e.target.value;
                    setCriterios(copy);
                  }}
                />
                {criterios.length > 1 && (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setCriterios(criterios.filter((_, i) => i !== idx))}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="add-link"
              onClick={() => setCriterios([...criterios, `Criterio ${criterios.length + 1}`])}
            >
              + Agregar otro criterio
            </button>
          </div>

          <div className="form-section">
            <div className="form-title">
              <span>3</span>
              <div>
                <h2>Resultados por estudiante ({aulaStudents.length} alumnos)</h2>
                <p>Selecciona ✓ (Logrado), × (No logrado) o — (No observado) para cada criterio.</p>
              </div>
            </div>
            <div className="results-table">
              <table>
                <thead>
                  <tr>
                    <th>Estudiante</th>
                    {criterios.map((c, i) => (
                      <th key={i}>{c.slice(0, 26)}{c.length > 26 ? '…' : ''}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reviewRows.map((row, rIdx) => (
                    <tr key={row.rowKey}>
                      <td>
                        <strong>{row.nombreArchivo}</strong>
                        <small style={{ marginLeft: '6px' }}>{row.codigoArchivo}</small>
                      </td>
                      {criterios.map((_, cIdx) => {
                        const cur = row.marks[cIdx]?.marca || 'LOGRADO';
                        return (
                          <td key={cIdx}>
                            <div className="mark-picker">
                              {([
                                ['LOGRADO', '✓'],
                                ['NO_LOGRADO', '×'],
                                ['NO_OBSERVADO', '—'],
                              ] as const).map(([val, sym]) => (
                                <button
                                  type="button"
                                  key={val}
                                  className={cur === val ? 'selected' : ''}
                                  onClick={() => {
                                    const next = [...reviewRows];
                                    next[rIdx] = {
                                      ...row,
                                      marks: {
                                        ...row.marks,
                                        [cIdx]: {
                                          marca: val,
                                          nivelLogro: val === 'LOGRADO' ? 'A' : val === 'NO_LOGRADO' ? 'C' : 'B',
                                          uncertain: false,
                                        },
                                      },
                                    };
                                    setReviewRows(next);
                                  }}
                                >
                                  {sym}
                                </button>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="form-footer">
            <button type="button" className="btn secondary" disabled={saving} onClick={() => handleConfirmAndSave('BORRADOR')}>
              Guardar borrador
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                if (!titulo.trim()) setTitulo(`Evaluación ${selectedAreaName} · ${fecha}`);
                setMode('review');
              }}
            >
              Revisar y confirmar →
            </button>
          </div>
        </section>
      </>
    );
  }

  // PASO 2: REVISIÓN Y CONFIRMACIÓN PREVIA AL GUARDADO
  const errorRowCount = reviewRows.filter((r) => Boolean(r.rowError)).length;
  const uncertainCellsCount = reviewRows.reduce(
    (acc, r) => acc + Object.values(r.marks).filter((m) => m.uncertain).length,
    0
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Revisar y confirmar</h1>
          <p>Paso 2 de 3 · Verifica y corrige los datos antes de guardar en PostgreSQL</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn ghost" onClick={() => setMode('choose')}>Salir</button>
        </div>
      </div>

      {errorMsg && <div className="auth-alert error" style={{ marginBottom: '16px' }}>{errorMsg}</div>}

      <div className="review-layout">
        <section className="card review-main">
          <div className="review-heading">
            <div>
              <span className={`badge ${uncertainCellsCount > 0 || errorRowCount > 0 ? 'yellow' : 'green'}`}>
                {errorRowCount > 0
                  ? `${errorRowCount} fila(s) con observaciones`
                  : uncertainCellsCount > 0
                    ? `${uncertainCellsCount} celda(s) por revisar`
                    : 'Datos verificados'}
              </span>
              <h2>Resultados listos para revisión ({sourceType})</h2>
              <p>Ningún dato ha sido guardado todavía. Corrige cualquier celda o estudiante antes de confirmar.</p>
            </div>
          </div>

          <div className="form-grid" style={{ marginTop: '14px' }}>
            <label>
              Título de la evaluación
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </label>
            <label>
              Fecha
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </label>
          </div>

          {sourceType === 'OCR' && (
            <details style={{ marginTop: '12px', background: '#F9F7FB', padding: '10px 14px', borderRadius: '10px' }}>
              <summary style={{ cursor: 'pointer', fontSize: '11px', fontWeight: 700, color: '#492477' }}>
                Ver texto bruto reconocido por Tesseract.js (editable / referencia)
              </summary>
              <textarea
                rows={4}
                value={ocrRawText}
                onChange={(e) => setOcrRawText(e.target.value)}
                style={{ width: '100%', marginTop: '8px', fontSize: '11px', padding: '8px', borderRadius: '8px', border: '1px solid #DDD7E3' }}
              />
            </details>
          )}

          <div style={{ marginTop: '12px' }}>
            <strong style={{ fontSize: '10px', color: '#766F87' }}>Criterios incluidos (editables):</strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
              {criterios.map((c, idx) => (
                <input
                  key={idx}
                  value={c}
                  onChange={(e) => {
                    const copy = [...criterios];
                    copy[idx] = e.target.value;
                    setCriterios(copy);
                  }}
                  style={{ height: '34px', borderRadius: '8px', border: '1px solid #DDD7E3', padding: '0 10px', fontSize: '11px' }}
                />
              ))}
            </div>
          </div>

          <div className="results-table review-table">
            <table>
              <thead>
                <tr>
                  <th>Incluir</th>
                  <th>Estudiante asignado</th>
                  {criterios.map((c, idx) => (
                    <th key={idx}>{c.slice(0, 22)}{c.length > 22 ? '…' : ''}</th>
                  ))}
                  <th>Validación</th>
                </tr>
              </thead>
              <tbody>
                {reviewRows.map((row, rIdx) => (
                  <tr key={row.rowKey}>
                    <td>
                      <input
                        type="checkbox"
                        checked={row.included}
                        disabled={!row.estudianteId}
                        onChange={(e) => {
                          const next = [...reviewRows];
                          next[rIdx] = { ...row, included: e.target.checked };
                          setReviewRows(next);
                        }}
                      />
                    </td>
                    <td>
                      <select
                        value={row.estudianteId || ''}
                        onChange={(e) => {
                          const nextId = e.target.value ? Number(e.target.value) : null;
                          const next = [...reviewRows];
                          next[rIdx] = {
                            ...row,
                            estudianteId: nextId,
                            rowError: nextId ? '' : 'Sin estudiante asignado',
                            included: Boolean(nextId),
                          };
                          setReviewRows(next);
                        }}
                        style={{ height: '32px', fontSize: '11px', maxWidth: '190px' }}
                      >
                        <option value="">-- Seleccionar ({row.nombreArchivo}) --</option>
                        {students.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.nombres} {st.apellidos} ({st.codigo})
                          </option>
                        ))}
                      </select>
                    </td>
                    {criterios.map((_, cIdx) => {
                      const cell = row.marks[cIdx] || { marca: 'NO_OBSERVADO' as Marca, nivelLogro: '' as NivelLogro };
                      return (
                        <td key={cIdx} className={cell.uncertain ? 'uncertain' : ''}>
                          <select
                            value={cell.marca}
                            onChange={(e) => {
                              const val = e.target.value as Marca;
                              const next = [...reviewRows];
                              next[rIdx] = {
                                ...row,
                                marks: {
                                  ...row.marks,
                                  [cIdx]: {
                                    ...cell,
                                    marca: val,
                                    nivelLogro: val === 'LOGRADO' ? 'A' : val === 'NO_LOGRADO' ? 'C' : 'B',
                                    uncertain: false,
                                    error: undefined,
                                  },
                                },
                              };
                              setReviewRows(next);
                            }}
                            style={{ height: '32px', fontSize: '10px' }}
                          >
                            <option value="LOGRADO">✓ Logrado</option>
                            <option value="NO_LOGRADO">× No logrado</option>
                            <option value="NO_OBSERVADO">— No observado</option>
                          </select>
                        </td>
                      );
                    })}
                    <td>
                      {row.rowError ? (
                        <span className="badge red">{row.rowError}</span>
                      ) : Object.values(row.marks).some((m) => m.uncertain) ? (
                        <span className="badge yellow">Revisar marca</span>
                      ) : (
                        <span className="badge green">Válido</span>
                      )}
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
              <dd>{selectedAulaName}</dd>
            </div>
            <div>
              <dt>Área</dt>
              <dd>{selectedAreaName}</dd>
            </div>
            <div>
              <dt>Estudiantes incluidos</dt>
              <dd>{reviewRows.filter((r) => r.included && r.estudianteId).length}</dd>
            </div>
            <div>
              <dt>Criterios</dt>
              <dd>{criterios.length}</dd>
            </div>
            <div>
              <dt>Fuente</dt>
              <dd>{sourceType === 'OCR' ? ocrFileName || 'OCR' : sourceType === 'EXCEL' ? excelFileName || 'Excel' : 'Directo'}</dd>
            </div>
          </dl>

          <div className="validation-note">
            <span>⚠</span>
            <p>
              <strong>Confirmación requerida.</strong>
              <span>Solo se guardará en PostgreSQL al presionar Confirmar registro.</span>
            </p>
          </div>

          <button
            type="button"
            className="btn primary"
            disabled={saving}
            onClick={() => handleConfirmAndSave('COMPLETADA')}
          >
            {saving ? 'Guardando en PostgreSQL...' : '✓ Confirmar registro'}
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => setMode(sourceType === 'OCR' ? 'camera' : sourceType === 'EXCEL' ? 'excel' : 'direct')}
          >
            Volver y corregir
          </button>
        </aside>
      </div>
    </>
  );
}
