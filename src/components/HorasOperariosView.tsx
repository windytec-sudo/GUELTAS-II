import React, { useState, useMemo } from 'react';
import { MasterData, OTRecord } from '../types';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Users, 
  Search, 
  FileSpreadsheet, 
  Copy, 
  Check, 
  Info,
  ChevronRight,
  Filter
} from 'lucide-react';

interface HorasOperariosViewProps {
  records: OTRecord[];
  masterData: MasterData;
  onBack: () => void;
}

// Helper: parse HH:MM to minutes
function parseTimeToMinutes(val: string): number | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
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

// Calculate effective hours for an operario in a single OT record
function calculateOperarioOTHours(record: OTRecord, operarioName: string): number {
  if (!record.tiemposOperarios || record.tiemposOperarios.length === 0) return 0;
  
  const tiempo = record.tiemposOperarios.find(
    (t) => t.operario.trim().toLowerCase() === operarioName.trim().toLowerCase()
  );
  if (!tiempo) return 0;

  const startMin = parseTimeToMinutes(tiempo.horaInicio);
  const endMin = parseTimeToMinutes(tiempo.horaFin);
  if (startMin === null || endMin === null || endMin <= startMin) return 0;

  const grossMin = endMin - startMin;
  const mealMin = tiempo.tiempoComidaMinutos || 0;
  const netMin = Math.max(0, grossMin - mealMin);

  return netMin / 60;
}

// Format date to very short: day and month in numbers "DD/MM"
function formatShortDate(dateStr: string): string {
  if (!dateStr) return '--/--';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const day = parts[2].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    return `${day}/${month}`;
  }
  return dateStr;
}

export const HorasOperariosView: React.FC<HorasOperariosViewProps> = ({
  records,
  masterData,
  onBack
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedCellDetail, setSelectedCellDetail] = useState<{
    operario: string;
    date: string;
    hours: number;
    matchingOTs: OTRecord[];
  } | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // 1. Get complete list of operarios: registered master data + any from records
  const allOperarios = useMemo(() => {
    const set = new Set<string>();
    (masterData.operarios || []).forEach((op) => {
      if (op.trim()) set.add(op.trim());
    });
    records.forEach((r) => {
      if (r.quienRealiza && r.quienRealiza.trim()) set.add(r.quienRealiza.trim());
      (r.operariosParticipantes || []).forEach((op) => {
        if (op.trim()) set.add(op.trim());
      });
      (r.tiemposOperarios || []).forEach((t) => {
        if (t.operario && t.operario.trim()) set.add(t.operario.trim());
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [masterData.operarios, records]);

  // 2. Get unique dates from records (chronologically sorted)
  const allUniqueDates = useMemo(() => {
    const dateSet = new Set<string>();
    records.forEach((r) => {
      if (r.fechaTrabajos && r.fechaTrabajos.trim()) {
        dateSet.add(r.fechaTrabajos.trim());
      }
    });
    return Array.from(dateSet).sort((a, b) => a.localeCompare(b));
  }, [records]);

  // Available months for filtering
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    allUniqueDates.forEach((d) => {
      const parts = d.split('-');
      if (parts.length >= 2) {
        months.add(`${parts[0]}-${parts[1]}`);
      }
    });
    return Array.from(months).sort();
  }, [allUniqueDates]);

  // Filtered dates based on month selection
  const displayedDates = useMemo(() => {
    if (selectedMonth === 'all') return allUniqueDates;
    return allUniqueDates.filter((d) => d.startsWith(selectedMonth));
  }, [allUniqueDates, selectedMonth]);

  // Filtered operarios by search term
  const displayedOperarios = useMemo(() => {
    if (!searchTerm.trim()) return allOperarios;
    const term = searchTerm.toLowerCase();
    return allOperarios.filter((op) => op.toLowerCase().includes(term));
  }, [allOperarios, searchTerm]);

  // Matrix of hours: [operario][date] => hours
  const hoursMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};

    allOperarios.forEach((op) => {
      matrix[op] = {};
      allUniqueDates.forEach((date) => {
        matrix[op][date] = 0;
      });
    });

    records.forEach((r) => {
      const date = r.fechaTrabajos?.trim();
      if (!date) return;

      allOperarios.forEach((op) => {
        const hrs = calculateOperarioOTHours(r, op);
        if (hrs > 0) {
          if (!matrix[op]) matrix[op] = {};
          matrix[op][date] = (matrix[op][date] || 0) + hrs;
        }
      });
    });

    return matrix;
  }, [allOperarios, allUniqueDates, records]);

  // Totals per operario across displayed dates
  const operarioTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    allOperarios.forEach((op) => {
      let sum = 0;
      displayedDates.forEach((d) => {
        sum += (hoursMatrix[op] && hoursMatrix[op][d]) || 0;
      });
      totals[op] = sum;
    });
    return totals;
  }, [allOperarios, displayedDates, hoursMatrix]);

  // Totals per date across all displayed operarios
  const dateTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    displayedDates.forEach((d) => {
      let sum = 0;
      displayedOperarios.forEach((op) => {
        sum += (hoursMatrix[op] && hoursMatrix[op][d]) || 0;
      });
      totals[d] = sum;
    });
    return totals;
  }, [displayedDates, displayedOperarios, hoursMatrix]);

  // Grand total hours
  const grandTotalHours = useMemo(() => {
    let sum = 0;
    displayedOperarios.forEach((op) => {
      sum += operarioTotals[op] || 0;
    });
    return sum;
  }, [displayedOperarios, operarioTotals]);

  // Copy table to clipboard as TSV for Excel/Sheets
  const handleCopyTable = () => {
    let tsv = 'OPERARIO\t' + displayedDates.map(formatShortDate).join('\t') + '\tTOTAL\n';
    displayedOperarios.forEach((op) => {
      const rowVals = displayedDates.map((d) => {
        const hrs = (hoursMatrix[op] && hoursMatrix[op][d]) || 0;
        return hrs > 0 ? hrs.toFixed(1).replace('.', ',') : '0';
      });
      const tot = (operarioTotals[op] || 0).toFixed(1).replace('.', ',');
      tsv += `${op}\t${rowVals.join('\t')}\t${tot}\n`;
    });
    
    // Total row
    const totalRowVals = displayedDates.map((d) => {
      return (dateTotals[d] || 0).toFixed(1).replace('.', ',');
    });
    tsv += `TOTAL DÍA\t${totalRowVals.join('\t')}\t${grandTotalHours.toFixed(1).replace('.', ',')}\n`;

    navigator.clipboard.writeText(tsv);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
  };

  const handleCellClick = (operario: string, date: string, hours: number) => {
    const matchingOTs = records.filter((r) => {
      if (r.fechaTrabajos !== date) return false;
      return (r.tiemposOperarios || []).some(
        (t) => t.operario.trim().toLowerCase() === operario.trim().toLowerCase()
      );
    });

    setSelectedCellDetail({
      operario,
      date,
      hours,
      matchingOTs
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 space-y-5 animate-in fade-in duration-200">
      {/* Barra de navegación superior */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 px-3 py-2 rounded-xl transition-colors shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Volver al Inicio</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyTable}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-800 bg-sky-50 border border-sky-200 hover:bg-sky-100 px-3 py-2 rounded-xl transition-colors shadow-2xs"
            title="Copiar datos para pegar en Excel o Google Sheets"
          >
            {copiedNotification ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-sky-600" />}
            <span>{copiedNotification ? 'Copiado al portapapeles' : 'Copiar Tabla'}</span>
          </button>
        </div>
      </div>

      {/* Cabecera y Título */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-sky-100 text-sky-800 text-xs font-bold border border-sky-200">
          <Clock className="w-3.5 h-3.5 text-sky-600" />
          <span>Control Horario Diario</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
          HORAS DE OPERARIOS
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 font-medium">
          Cómputo diario de horas invertidas por cada operario según los partes de trabajo guardados.
        </p>
      </div>

      {/* Tarjetas resumen de métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Horas
          </span>
          <div className="text-xl sm:text-2xl font-black text-sky-900 mt-0.5">
            {grandTotalHours.toFixed(1)}h
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Operarios Activos
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">
            {displayedOperarios.filter((op) => (operarioTotals[op] || 0) > 0).length}
            <span className="text-xs font-bold text-slate-400 ml-1">/ {displayedOperarios.length}</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Días con Trabajo
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">
            {displayedDates.length}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Partes de Trabajo
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">
            {records.length} OTs
          </div>
        </div>
      </div>

      {/* Controles de filtro: Buscador y Mes */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Buscador de operarios */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar operario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Filtro por mes */}
        {availableMonths.length > 1 && (
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">Todos los meses ({allUniqueDates.length} días)</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  Mes {m}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* TABLA PRINCIPAL DE HORAS POR OPERARIO Y DÍA */}
      {records.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">Aún no hay OTs guardadas</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Cuando los operarios completen partes de trabajo en "REALIZAR OT", aparecerá aquí el cómputo automático de horas por día y por operario.
          </p>
        </div>
      ) : displayedDates.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center text-xs text-slate-500">
          No hay fechas disponibles para el filtro seleccionado.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left text-xs border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-slate-900 text-white border-b border-slate-800">
                  {/* Primera columna fija: Nombre de los operarios */}
                  <th className="py-3 px-3.5 font-black uppercase tracking-wider sticky left-0 z-20 bg-slate-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] min-w-[140px] sm:min-w-[180px]">
                    OPERARIO
                  </th>

                  {/* Fila con las fechas muy cortas, sólo día y mes en número (DD/MM) */}
                  {displayedDates.map((dateStr) => (
                    <th
                      key={dateStr}
                      className="py-3 px-2.5 font-extrabold text-center tracking-wider text-sky-200 min-w-[58px] border-l border-slate-800/60"
                      title={`Fecha completa: ${dateStr}`}
                    >
                      <div className="font-mono text-xs">{formatShortDate(dateStr)}</div>
                    </th>
                  ))}

                  {/* Columna Total Operario */}
                  <th className="py-3 px-3 font-black text-center uppercase tracking-wider text-amber-300 border-l border-slate-800 min-w-[70px] bg-slate-950">
                    TOTAL
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium">
                {displayedOperarios.map((operario, opIdx) => {
                  const totalOp = operarioTotals[operario] || 0;
                  const isEven = opIdx % 2 === 0;

                  return (
                    <tr
                      key={operario}
                      className={`${isEven ? 'bg-white' : 'bg-slate-50/50'} hover:bg-sky-50/60 transition-colors`}
                    >
                      {/* Nombre del operario */}
                      <td className={`py-2.5 px-3.5 font-bold text-slate-900 sticky left-0 z-10 ${
                        isEven ? 'bg-white' : 'bg-slate-50'
                      } shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] truncate max-w-[180px]`}>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0 bg-sky-500" />
                          <span className="truncate">{operario}</span>
                        </div>
                      </td>

                      {/* Total de horas por día */}
                      {displayedDates.map((dateStr) => {
                        const hrs = (hoursMatrix[operario] && hoursMatrix[operario][dateStr]) || 0;
                        const hasHours = hrs > 0;

                        return (
                          <td
                            key={dateStr}
                            onClick={() => hasHours && handleCellClick(operario, dateStr, hrs)}
                            className={`py-2.5 px-1.5 text-center font-mono border-l border-slate-100 ${
                              hasHours
                                ? 'cursor-pointer hover:bg-sky-100 font-extrabold text-sky-950 bg-sky-50/30'
                                : 'text-slate-300'
                            }`}
                            title={hasHours ? `Pulsar para ver detalle: ${operario} el ${dateStr}` : 'Sin horas'}
                          >
                            {hasHours ? (
                              <span className="inline-block px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-900 text-xs">
                                {hrs.toFixed(1)}h
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Total de ese operario */}
                      <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900 border-l border-slate-200 bg-slate-100/50">
                        {totalOp > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-900 text-amber-300 text-xs font-bold">
                            {totalOp.toFixed(1)}h
                          </span>
                        ) : (
                          <span className="text-slate-400">0h</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Fila de Totales del día */}
              <tfoot>
                <tr className="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                  <td className="py-3 px-3.5 sticky left-0 z-20 bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)] uppercase tracking-wider text-xs">
                    TOTAL DÍA
                  </td>
                  {displayedDates.map((dateStr) => {
                    const dTotal = dateTotals[dateStr] || 0;
                    return (
                      <td
                        key={dateStr}
                        className="py-3 px-1.5 text-center font-mono text-xs border-l border-slate-200 font-black text-sky-950"
                      >
                        {dTotal > 0 ? `${dTotal.toFixed(1)}h` : '-'}
                      </td>
                    );
                  })}
                  <td className="py-3 px-3 text-center font-mono text-xs border-l border-slate-300 bg-slate-200 font-black text-slate-950">
                    {grandTotalHours.toFixed(1)}h
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Desplaza horizontalmente en el móvil para ver todos los días</span>
            <span>Pulsa sobre cualquier celda con horas para ver el detalle de la OT</span>
          </div>
        </div>
      )}

      {/* Modal de detalle de horas al pulsar una celda */}
      {selectedCellDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-sky-700 uppercase tracking-wider">
                  Detalle de Jornada
                </span>
                <h3 className="font-extrabold text-slate-900 text-lg">
                  {selectedCellDetail.operario}
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  Fecha: {selectedCellDetail.date} ({formatShortDate(selectedCellDetail.date)})
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Día</span>
                <span className="text-xl font-black text-sky-900">
                  {selectedCellDetail.hours.toFixed(1)}h
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Partes de trabajo (OTs) de este día:
              </span>

              {selectedCellDetail.matchingOTs.length === 0 ? (
                <div className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl">
                  No se encontraron detalles específicos para este registro.
                </div>
              ) : (
                selectedCellDetail.matchingOTs.map((ot) => {
                  const t = (ot.tiemposOperarios || []).find(
                    (item) => item.operario.trim().toLowerCase() === selectedCellDetail.operario.trim().toLowerCase()
                  );
                  const startMin = t ? parseTimeToMinutes(t.horaInicio) : null;
                  const endMin = t ? parseTimeToMinutes(t.horaFin) : null;
                  const gross = (startMin !== null && endMin !== null && endMin > startMin) ? endMin - startMin : 0;
                  const meal = t?.tiempoComidaMinutos || 0;
                  const netH = Math.max(0, gross - meal) / 60;

                  return (
                    <div
                      key={ot.id}
                      className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-900 font-extrabold text-sm">
                          {ot.donde || ot.aerogenerador}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-mono font-bold">
                          {netH.toFixed(1)}h efectivas
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-slate-600">
                        <div>Tipo OT: <strong>{ot.tipoOT}</strong></div>
                        <div>Registrado por: <strong>{ot.quienRealiza}</strong></div>
                      </div>

                      {t && (
                        <div className="p-2 bg-white rounded-xl border border-slate-200 text-slate-700 flex flex-wrap items-center justify-between gap-2 font-mono">
                          <span>Inicio: <strong>{t.horaInicio}</strong></span>
                          <span>Fin: <strong>{t.horaFin}</strong></span>
                          <span>Comida: <strong>{t.tiempoComidaMinutos}m</strong></span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedCellDetail(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
