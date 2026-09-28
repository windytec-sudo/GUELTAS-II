import { OTRecord } from '../types';

export interface SheetDataPayload {
  headers: string[];
  rows: (string | number)[][];
  totalRow?: (string | number)[];
}

// Helper: parse HH:MM to minutes
export function parseTimeToMinutes(val: string): number | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
  }
  const num = parseFloat(trimmed);
  if (!isNaN(num) && num >= 0 && num <= 24) {
    const h = Math.floor(num);
    const m = Math.round((num - h) * 60);
    return h * 60 + m;
  }
  return null;
}

export function calculateOperarioHoursInRecord(t: { horaInicio: string; horaFin: string; tiempoComidaMinutos: number }): number {
  const start = parseTimeToMinutes(t.horaInicio);
  const end = parseTimeToMinutes(t.horaFin);
  if (start === null || end === null || end <= start) return 0;
  const netMinutes = Math.max(0, (end - start) - (t.tiempoComidaMinutos || 0));
  return parseFloat((netMinutes / 60).toFixed(2));
}

/**
 * HOJA 1: REGISTRO DE OTS
 * Columnas exactas solicitadas por el usuario:
 * 1. CODIGO DE LA OT
 * 2. RESPONSABLE (Quien realiza la OT)
 * 3. FECHA
 * 4. AEG (Donde se realizan los trabajos)
 * 5. EQUIPO DE TRABAJO (son los operarios que participan en la OT)
 * 6. HORA INICIO
 * 7. HORA FIN
 * 8. TIEMPO COMIDA
 * 9. TIPO OT
 * 10. TAREAS REALIZADAS: Por filas e iniciada con una viñeta: Nombre de la tarea, Porcentaje de la Tarea, quien realizó la tarea.
 * 11. EXTRAS: Por filas y encabezados por una viñeta, en mayúsculas EXTRAWORK, WAITING TIME o RETRABAJO, según fuese seleccionado, a continuación lo que se escribiese sobre eso, Numero de OPERARIOS x horas por operario = TOTAL HORAS
 * 12. MATERIAL ROTO O FALTANTE
 * 13. OBSERVACIONES
 */
export function generateSheet1Data(records: OTRecord[]): SheetDataPayload {
  const headers = [
    'CODIGO DE LA OT',
    'RESPONSABLE',
    'FECHA',
    'AEG',
    'EQUIPO DE TRABAJO',
    'HORA INICIO',
    'HORA FIN',
    'TIEMPO COMIDA',
    'TIPO OT',
    'TAREAS REALIZADAS',
    'EXTRAS',
    'MATERIAL ROTO O FALTANTE',
    'OBSERVACIONES'
  ];

  const rows: string[][] = records.map((r) => {
    // Lista ordenada de operarios participantes en el equipo
    const operarios: string[] = [];
    if (r.operariosParticipantes && r.operariosParticipantes.length > 0) {
      r.operariosParticipantes.forEach((op) => {
        if (op && !operarios.includes(op)) operarios.push(op);
      });
    }
    // Incluir también cualquier operario con horario registrado en tiemposOperarios si no estuviese en la lista
    (r.tiemposOperarios || []).forEach((t) => {
      if (t.operario && !operarios.includes(t.operario)) {
        operarios.push(t.operario);
      }
    });

    let equipo = '-';
    let horaInicio = '-';
    let horaFin = '-';
    let tiempoComida = '-';

    if (operarios.length > 0) {
      equipo = operarios.join('\n');

      const iniciosList: string[] = [];
      const finesList: string[] = [];
      const comidasList: string[] = [];

      operarios.forEach((op) => {
        const t = (r.tiemposOperarios || []).find(
          (x) => x.operario.trim().toLowerCase() === op.trim().toLowerCase()
        );

        if (t) {
          iniciosList.push(t.horaInicio || '-');
          finesList.push(t.horaFin || '-');
          const comidaMin = t.tiempoComidaMinutos !== undefined ? t.tiempoComidaMinutos : 0;
          comidasList.push(`${comidaMin} min`);
        } else {
          iniciosList.push('-');
          finesList.push('-');
          comidasList.push('-');
        }
      });

      horaInicio = iniciosList.join('\n');
      horaFin = finesList.join('\n');
      tiempoComida = comidasList.join('\n');
    }

    // Tareas realizadas: por filas e iniciada con viñeta (•): Nombre de la tarea, Porcentaje, quién realizó la tarea
    let tareasTexto = '• Sin tareas registradas';
    if (r.tareas && r.tareas.length > 0) {
      tareasTexto = r.tareas.map((t) => {
        const ops = (t.operariosAsignados && t.operariosAsignados.length > 0)
          ? t.operariosAsignados.join(', ')
          : (operarios.length > 0 ? operarios.join(', ') : 'Equipo completo');
        return `• ${t.tarea}, ${t.porcentaje}, ${ops}`;
      }).join('\n');
    }

    // Extras: por filas y encabezados por viñeta, en mayúsculas EXTRAWORK, WAITING TIME o RETRABAJO: Motivo, Num Op x Horas = Total
    let extrasTexto = '• Ninguno';
    if (r.extraworks && r.extraworks.length > 0) {
      extrasTexto = r.extraworks.map((e) => {
        const tipoUpper = (e.tipo || 'EXTRAWORK').toUpperCase();
        return `• ${tipoUpper}: ${e.motivo}, ${e.numOperarios} op x ${e.tiempoInvertidoHoras}h = ${e.tiempoTotalHoras}h`;
      }).join('\n');
    }

    // Material roto o faltante
    const materialRoto = r.materialRotoFaltante?.hubo
      ? `SÍ: ${r.materialRotoFaltante.detalle || 'Sin detalle especificado'}`
      : 'NO';

    // Observaciones
    const observaciones = r.observaciones?.hubo
      ? `SÍ: ${r.observaciones.detalle || 'Sin observaciones adicionales'}`
      : 'NO';

    return [
      r.id,
      r.quienRealiza || '-',
      r.fechaTrabajos || '-',
      r.donde || r.aerogenerador || '-',
      equipo,
      horaInicio,
      horaFin,
      tiempoComida,
      r.tipoOT || '-',
      tareasTexto,
      extrasTexto,
      materialRoto,
      observaciones
    ];
  });

  return { headers, rows };
}

/**
 * HOJA 2: HORAS POR OPERARIO
 * Matriz con operarios en filas, fechas en columnas (DD/MM), totales por operario y totales por día
 */
export function generateSheet2Data(records: OTRecord[], masterOperarios?: string[]): SheetDataPayload {
  // Extraer todas las fechas ordenadas cronológicamente
  const rawDates = Array.from(
    new Set(records.map((r) => r.fechaTrabajos).filter((f): f is string => Boolean(f)))
  ).sort();

  // Mapeo fecha corta DD/MM
  const dateShortMap: Record<string, string> = {};
  rawDates.forEach((d) => {
    const parts = d.split('-');
    if (parts.length === 3) {
      dateShortMap[d] = `${parts[2]}/${parts[1]}`;
    } else {
      dateShortMap[d] = d;
    }
  });

  // Extraer todos los operarios
  const operariosSet = new Set<string>();
  (masterOperarios || []).forEach((op) => operariosSet.add(op));
  records.forEach((r) => {
    (r.tiemposOperarios || []).forEach((t) => operariosSet.add(t.operario));
    (r.operariosParticipantes || []).forEach((op) => operariosSet.add(op));
  });
  const operariosList = Array.from(operariosSet).sort((a, b) => a.localeCompare(b));

  const headers = ['OPERARIO', ...rawDates.map((d) => dateShortMap[d]), 'TOTAL HORAS'];

  // Sumas diarias de todos los operarios
  const dailyTotals: Record<string, number> = {};
  rawDates.forEach((d) => { dailyTotals[d] = 0; });
  let grandTotal = 0;

  const rows: (string | number)[][] = operariosList.map((op) => {
    let opTotal = 0;
    const rowCols: (string | number)[] = [op];

    rawDates.forEach((dateStr) => {
      // Filtrar OTs de esa fecha
      const otsDelDia = records.filter((r) => r.fechaTrabajos === dateStr);
      let horasDiaOp = 0;

      otsDelDia.forEach((ot) => {
        const tiempoOp = (ot.tiemposOperarios || []).find(
          (t) => t.operario.toLowerCase() === op.toLowerCase()
        );
        if (tiempoOp) {
          horasDiaOp += calculateOperarioHoursInRecord(tiempoOp);
        }
      });

      const rounded = parseFloat(horasDiaOp.toFixed(2));
      opTotal += rounded;
      dailyTotals[dateStr] += rounded;
      rowCols.push(rounded > 0 ? `${rounded}h` : '-');
    });

    const roundedOpTotal = parseFloat(opTotal.toFixed(2));
    grandTotal += roundedOpTotal;
    rowCols.push(`${roundedOpTotal}h`);

    return rowCols;
  });

  const totalRow: (string | number)[] = [
    'TOTAL DÍA',
    ...rawDates.map((d) => `${parseFloat(dailyTotals[d].toFixed(2))}h`),
    `${parseFloat(grandTotal.toFixed(2))}h`
  ];

  return { headers, rows, totalRow };
}

/**
 * HOJA 3: HORAS POR TIPO DE OT
 * Resumen de horas invertidas por cada Tipo de OT
 */
export function generateSheet3Data(records: OTRecord[], masterTiposOT?: string[]): SheetDataPayload {
  const tiposSet = new Set<string>();
  (masterTiposOT || []).forEach((t) => tiposSet.add(t));
  records.forEach((r) => {
    if (r.tipoOT) tiposSet.add(r.tipoOT);
  });
  const tiposList = Array.from(tiposSet).sort((a, b) => a.localeCompare(b));

  const headers = [
    'TIPO DE OT',
    'Nº DE OTS',
    'TOTAL HORAS TRABAJADAS',
    'PROMEDIO HORAS / OT',
    'AEROGENERADORES ATENDIDOS'
  ];

  let totalOTsCount = 0;
  let totalHorasAll = 0;

  const rows: (string | number)[][] = tiposList.map((tipo) => {
    const ots = records.filter((r) => r.tipoOT === tipo);
    const numOTs = ots.length;
    totalOTsCount += numOTs;

    let horasTipo = 0;
    const aerosSet = new Set<string>();

    ots.forEach((ot) => {
      if (ot.donde || ot.aerogenerador) aerosSet.add(ot.donde || ot.aerogenerador);
      (ot.tiemposOperarios || []).forEach((t) => {
        horasTipo += calculateOperarioHoursInRecord(t);
      });
    });

    const roundedHoras = parseFloat(horasTipo.toFixed(2));
    totalHorasAll += roundedHoras;

    const promedio = numOTs > 0 ? parseFloat((roundedHoras / numOTs).toFixed(2)) : 0;
    const aerosStr = Array.from(aerosSet).join(', ') || '-';

    return [
      tipo,
      numOTs,
      `${roundedHoras}h`,
      `${promedio}h`,
      aerosStr
    ];
  });

  const avgGlobal = totalOTsCount > 0 ? parseFloat((totalHorasAll / totalOTsCount).toFixed(2)) : 0;
  const totalRow = [
    'TOTAL GENERAL',
    totalOTsCount,
    `${parseFloat(totalHorasAll.toFixed(2))}h`,
    `${avgGlobal}h`,
    '-'
  ];

  return { headers, rows, totalRow };
}

/**
 * Formato para copiar al Portapapeles (TSV / Tab-Separated Values) compatible con pegar directo en Google Sheets
 */
export function formatSheetToClipboard(payload: SheetDataPayload): string {
  const lines: string[] = [];
  lines.push(payload.headers.join('\t'));

  payload.rows.forEach((row) => {
    const cleanRow = row.map((cell) => {
      const str = String(cell ?? '');
      // En TSV, reemplazamos saltos de línea con espacio o los dejamos entrecomillados si Google Sheets los admite
      if (str.includes('\n') || str.includes('\t') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    lines.push(cleanRow.join('\t'));
  });

  if (payload.totalRow) {
    lines.push(payload.totalRow.map((cell) => String(cell ?? '')).join('\t'));
  }

  return lines.join('\n');
}

/**
 * Formato CSV estándar descargable
 */
export function formatSheetToCSV(payload: SheetDataPayload): string {
  const escapeCSV = (val: string | number | undefined) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const lines: string[] = [];
  lines.push(payload.headers.map(escapeCSV).join(','));

  payload.rows.forEach((row) => {
    lines.push(row.map(escapeCSV).join(','));
  });

  if (payload.totalRow) {
    lines.push(payload.totalRow.map(escapeCSV).join(','));
  }

  return '\uFEFF' + lines.join('\r\n');
}

export function downloadSheetCSV(payload: SheetDataPayload, filename: string) {
  const csvData = formatSheetToCSV(payload);
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Código de Google Apps Script optimizado para S. E. WINDYTEC S. L.
 * Mantiene intacto el formato personalizado del usuario (anchos de columna, colores, bordes y fuentes).
 */
export function getGoogleAppsScriptCode(): string {
  return `/**
 * GOOGLE APPS SCRIPT - S. E. WINDYTEC S. L.
 * Sincronización Automática de Partes de Trabajo en 3 Hojas:
 * 1. REGISTRO DE OTS
 * 2. HORAS POR OPERARIO
 * 3. HORAS POR TIPO DE OT
 * 
 * ✅ MANTIENE EL FORMATO DEL GOOGLE SHEET:
 * - NO borra ni modifica los anchos de columna que hayas ajustado a mano.
 * - NO altera los colores de celdas, colores de cabecera, bordes ni tipos de letra.
 * - Utiliza clearContents() para actualizar únicamente los datos y valores.
 */
function doPost(e) {
  try {
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);

    var contents = e.postData.contents;
    var data = JSON.parse(contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Hoja 1: Registro de OTs
    if (data.hoja1) {
      escribirHoja(ss, "REGISTRO DE OTS", data.hoja1, true);
    }

    // 2. Hoja 2: Horas por Operario
    if (data.hoja2) {
      escribirHoja(ss, "HORAS POR OPERARIO", data.hoja2, false);
    }

    // 3. Hoja 3: Horas por Tipo de OT
    if (data.hoja3) {
      escribirHoja(ss, "HORAS POR TIPO DE OT", data.hoja3, false);
    }

    lock.releaseLock();
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "¡Sincronización completada con éxito manteniendo tu formato personalizado!",
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    app: "S. E. WINDYTEC S. L. - Sincronizador Activo (Respetando Formato y Anchos)",
    horaServidor: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function obtenerOCrearHoja(ss, nombre) {
  var sheet = ss.getSheetByName(nombre);
  var esNueva = false;
  if (!sheet) {
    sheet = ss.insertSheet(nombre);
    esNueva = true;
  }
  return { sheet: sheet, esNueva: esNueva };
}

function escribirHoja(ss, nombreHoja, payload, esHoja1) {
  var res = obtenerOCrearHoja(ss, nombreHoja);
  var sheet = res.sheet;
  var esNueva = res.esNueva;

  var headers = payload.headers || [];
  var rows = payload.rows || [];
  var totalRow = payload.totalRow;

  // 1. LIMPIEZA DE CONTENIDOS PREVIOS:
  // Usamos clearContents() en lugar de clear():
  // Esto elimina solo los datos anteriores SIN tocar formatos, colores, anchos de columna, ni bordes.
  sheet.clearContents();

  // 2. ESCRIBIR CABECERA (Fila 1)
  if (headers.length > 0) {
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);

    // Solo si la hoja fue recién creada por primera vez, le aplicamos un estilo base inicial.
    // Si la hoja ya existía en tu Google Sheet, ¡NO se tocan tus colores ni formatos!
    if (esNueva) {
      headerRange.setBackground("#0369a1")
                 .setFontColor("#ffffff")
                 .setFontWeight("bold")
                 .setFontSize(10)
                 .setHorizontalAlignment("center")
                 .setVerticalAlignment("middle");
      sheet.setRowHeight(1, 36);
      sheet.setFrozenRows(1);
    }
  }

  var currentRow = 2;

  // 3. ESCRIBIR FILAS DE DATOS (Fila 2 en adelante)
  if (rows.length > 0) {
    var dataRange = sheet.getRange(currentRow, 1, rows.length, headers.length);
    dataRange.setValues(rows);

    // Solo si la hoja es completamente nueva aplicamos configuración por defecto
    if (esNueva) {
      dataRange.setFontSize(9);
      if (esHoja1) {
        dataRange.setWrap(true);
        dataRange.setVerticalAlignment("top");
        sheet.getRange(currentRow, 6, rows.length, 3).setHorizontalAlignment("center");
      } else {
        if (headers.length > 1) {
          sheet.getRange(currentRow, 2, rows.length, headers.length - 1).setHorizontalAlignment("center");
        }
      }
      dataRange.setBorder(true, true, true, true, true, true, "#e2e8f0", SpreadsheetApp.BorderStyle.SOLID);
    }
    currentRow += rows.length;
  }

  // 4. FILA DE TOTAL (si existe)
  if (totalRow && totalRow.length === headers.length) {
    var totRange = sheet.getRange(currentRow, 1, 1, headers.length);
    totRange.setValues([totalRow]);

    if (esNueva) {
      totRange.setFontWeight("bold");
      totRange.setBackground("#f8fafc");
      totRange.setVerticalAlignment("middle");
      if (headers.length > 1) {
        sheet.getRange(currentRow, 2, 1, headers.length - 1).setHorizontalAlignment("center");
      }
      totRange.setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    }
  }

  // 5. ANCHOS DE COLUMNA:
  // Si la hoja ya existía, NUNCA se tocan los anchos de columna para respetar
  // exactamente el tamaño que el usuario haya establecido en su Google Sheet.
  if (esNueva) {
    for (var c = 1; c <= headers.length; c++) {
      sheet.autoResizeColumn(c);
      if (esHoja1) {
        if (c === 5 && sheet.getColumnWidth(c) < 180) sheet.setColumnWidth(c, 180);
        if ((c === 6 || c === 7 || c === 8) && sheet.getColumnWidth(c) < 110) sheet.setColumnWidth(c, 110);
        if ((c === 10 || c === 11) && sheet.getColumnWidth(c) < 320) sheet.setColumnWidth(c, 320);
      }
    }
  }
}`;
}
