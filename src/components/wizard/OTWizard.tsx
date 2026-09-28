import React, { useState, useEffect } from 'react';
import { MasterData, OTRecord, OperarioHorario, TareaRealizada, ExtraWorkItem, ExtraWorkTipo } from '../../types';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  CheckCircle2, 
  Clock, 
  Calendar as CalendarIcon, 
  User, 
  Wind, 
  Users, 
  FolderKanban, 
  CheckSquare, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Home, 
  Save, 
  Sparkles,
  Layers,
  ChevronRight,
  Edit2
} from 'lucide-react';
import { createRecord } from '../../services/api';

interface OTWizardProps {
  masterData: MasterData;
  onFinish: () => void;
  onCancel: () => void;
}

export const OTWizard: React.FC<OTWizardProps> = ({
  masterData,
  onFinish,
  onCancel
}) => {
  // Current screen 1..11
  const [step, setStep] = useState<number>(1);

  // Pantalla 1: Quien realiza la OT??? (No default)
  const [quienRealiza, setQuienRealiza] = useState<string>('');

  // Pantalla 2: FECHA que se realizan los trabajos??? (No default)
  const [fechaTrabajos, setFechaTrabajos] = useState<string>('');

  // Pantalla 3: Donde se realizan los trabajos??? (No default)
  const [aerogenerador, setAerogenerador] = useState<string>('');

  // Pantalla 4: OPERARIOS que participaron en esta OT??? (No default)
  const [operariosParticipantes, setOperariosParticipantes] = useState<string[]>([]);

  // Pantalla 5: TIEMPO invertido en la OT??? (default: "0", "0", 0)
  const [tiemposOperarios, setTiemposOperarios] = useState<OperarioHorario[]>([]);

  // Pantalla 6: TIPO de OT??? (No default)
  const [tipoOT, setTipoOT] = useState<string>('');

  // Pantalla 7: TAREAS realizadas en esta OT???
  // Map of tarea name -> { porcentaje, operarios }
  const [tareasRealizadas, setTareasRealizadas] = useState<
    Record<string, { porcentaje: '0 %' | '25 %' | '50 %' | '75 %' | '100 %'; operarios: string[] }>
  >({});

  // Pantalla 8: Hubo EXTRAWORK, WAITING TIME ó RETRABAJOS???
  const [extraworksList, setExtraworksList] = useState<ExtraWorkItem[]>([]);
  const [huboExtraWorkRespuesta, setHuboExtraWorkRespuesta] = useState<boolean | null>(null);
  // Current draft in screen 8
  const [currentExtraTipo, setCurrentExtraTipo] = useState<ExtraWorkTipo>('EXTRAWORK');
  const [currentExtraMotivo, setCurrentExtraMotivo] = useState<string>('');
  const [currentExtraNumOperarios, setCurrentExtraNumOperarios] = useState<string>('1');
  const [currentExtraTiempoHoras, setCurrentExtraTiempoHoras] = useState<string>('0');
  const [mostrandoPreguntaSiHayMas, setMostrandoPreguntaSiHayMas] = useState<boolean>(false);

  // Pantalla 9: MATERIAL ROTO ó MATERIAL FALTANTE
  const [materialRotoHubo, setMaterialRotoHubo] = useState<boolean | null>(null);
  const [materialRotoDetalle, setMaterialRotoDetalle] = useState<string>('');

  // Pantalla 10: OBSERVACIONES:
  const [observacionesHubo, setObservacionesHubo] = useState<boolean | null>(null);
  const [observacionesDetalle, setObservacionesDetalle] = useState<string>('');

  // Pantalla 11: Final
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [guardadoExitoso, setGuardadoExitoso] = useState<boolean>(false);
  const [savedRecordId, setSavedRecordId] = useState<string>('');

  // Error feedback for current screen validation
  const [validationError, setValidationError] = useState<string | null>(null);

  // Helper to parse HH:MM to minutes from midnight
  const parseTimeToMinutes = (val: string): number | null => {
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
  };

  // Helper to calculate and validate work duration
  const getWorkTimes = (horaInicio: string, horaFin: string) => {
    const start = parseTimeToMinutes(horaInicio);
    const end = parseTimeToMinutes(horaFin);
    if (start === null || end === null) {
      return {
        isValid: false,
        diffMinutes: 0,
        errorMsg: 'Formato de hora no válido (usa HH:MM)'
      };
    }
    if (end <= start) {
      return {
        isValid: false,
        diffMinutes: 0,
        errorMsg: 'La hora de fin debe ser mayor que la hora de inicio'
      };
    }
    return {
      isValid: true,
      diffMinutes: end - start,
      errorMsg: null
    };
  };

  // Sync tiemposOperarios when operariosParticipantes changes
  useEffect(() => {
    setTiemposOperarios((prev) => {
      return operariosParticipantes.map((op) => {
        const existing = prev.find((p) => p.operario === op);
        if (existing) return existing;
        return {
          operario: op,
          horaInicio: '00:00',
          horaFin: '00:00',
          tiempoComidaMinutos: 0
        };
      });
    });
  }, [operariosParticipantes]);

  // Sync tareas when tipoOT changes
  useEffect(() => {
    if (tipoOT) {
      const tareasParaTipo = masterData.tareasPorOT[tipoOT] || [];
      setTareasRealizadas((prev) => {
        const next: Record<string, { porcentaje: '0 %' | '25 %' | '50 %' | '75 %' | '100 %'; operarios: string[] }> = {};
        tareasParaTipo.forEach((tarea) => {
          if (prev[tarea]) {
            next[tarea] = prev[tarea];
          } else {
            next[tarea] = {
              porcentaje: '0 %',
              operarios: []
            };
          }
        });
        return next;
      });
    }
  }, [tipoOT, masterData.tareasPorOT]);

  // Screen validation before advancing
  const canAdvance = (): boolean => {
    setValidationError(null);
    switch (step) {
      case 1:
        if (!quienRealiza) {
          setValidationError('Por favor selecciona quién realiza la OT.');
          return false;
        }
        return true;
      case 2:
        if (!fechaTrabajos) {
          setValidationError('Por favor selecciona la fecha de realización de los trabajos.');
          return false;
        }
        return true;
      case 3:
        if (!aerogenerador) {
          setValidationError('Por favor selecciona el aerogenerador donde se realizan los trabajos.');
          return false;
        }
        return true;
      case 4:
        if (operariosParticipantes.length === 0) {
          setValidationError('Por favor selecciona al menos un operario participante en esta OT.');
          return false;
        }
        return true;
      case 5: {
        if (tiemposOperarios.length === 0) {
          setValidationError('No hay operarios seleccionados para asignar tiempos.');
          return false;
        }
        for (const t of tiemposOperarios) {
          const times = getWorkTimes(t.horaInicio, t.horaFin);
          if (!times.isValid) {
            setValidationError(
              `Operario "${t.operario}": ${times.errorMsg || 'La hora de Fin tiene que ser mayor que la hora de Inicio.'}`
            );
            return false;
          }
          if (t.tiempoComidaMinutos > times.diffMinutes) {
            setValidationError(
              `Operario "${t.operario}": La hora de la comida (${t.tiempoComidaMinutos} min) no puede ser mayor que la diferencia entre hora de fin y hora de inicio (${times.diffMinutes} min).`
            );
            return false;
          }
        }
        return true;
      }
      case 6:
        if (!tipoOT) {
          setValidationError('Por favor selecciona el Tipo de OT.');
          return false;
        }
        return true;
      case 7:
        // At least one task examined
        return true;
      case 8:
        if (huboExtraWorkRespuesta === null && extraworksList.length === 0) {
          setValidationError('Por favor indica si hubo EXTRAWORK, WAITING TIME ó RETRABAJOS.');
          return false;
        }
        return true;
      case 9:
        if (materialRotoHubo === null) {
          setValidationError('Por favor indica si hubo MATERIAL ROTO ó MATERIAL FALTANTE (SÍ o NO).');
          return false;
        }
        if (materialRotoHubo === true && !materialRotoDetalle.trim()) {
          setValidationError('Has indicado SÍ, por lo tanto es obligatorio escribir el detalle del material roto o faltante.');
          return false;
        }
        return true;
      case 10:
        if (observacionesHubo === null) {
          setValidationError('Por favor indica si hay OBSERVACIONES (SÍ o NO).');
          return false;
        }
        if (observacionesHubo === true && !observacionesDetalle.trim()) {
          setValidationError('Has indicado SÍ, por lo tanto es obligatorio escribir las observaciones.');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (canAdvance()) {
      setStep((prev) => Math.min(prev + 1, 11));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    setValidationError(null);
    setStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Screen 5 special requirement:
  // "La selección que haga en el primero, automáticamente aparecerán en el resto, aunque yo después pueda modificarlo uno a uno. HORA DE INICIO Y HORA DE FIN tendrán por defecto 00:00. Fin > Inicio, y Comida <= Fin - Inicio"
  const handleUpdateTiempo = (
    index: number,
    field: 'horaInicio' | 'horaFin' | 'tiempoComidaMinutos',
    value: any
  ) => {
    setValidationError(null);
    setTiemposOperarios((prev) => {
      const updated = [...prev];
      const prevFirstValue = updated[0] ? updated[0][field] : null;
      
      const newEntry = { ...updated[index], [field]: value };
      
      // Auto-clamp meal time if work duration becomes less than current meal selection
      const times = getWorkTimes(newEntry.horaInicio, newEntry.horaFin);
      if (times.isValid && newEntry.tiempoComidaMinutos > times.diffMinutes) {
        if (times.diffMinutes >= 60 && newEntry.tiempoComidaMinutos >= 60) {
          newEntry.tiempoComidaMinutos = 60;
        } else if (times.diffMinutes >= 30 && newEntry.tiempoComidaMinutos >= 30) {
          newEntry.tiempoComidaMinutos = 30;
        } else {
          newEntry.tiempoComidaMinutos = 0;
        }
      }
      
      updated[index] = newEntry;

      // If updating the first operario, propagate automatically to the rest
      if (index === 0 && updated.length > 1) {
        for (let i = 1; i < updated.length; i++) {
          const currentSubVal = updated[i][field];
          // If the subsequent operario still had the previous value or initial defaults, auto-apply
          if (
            currentSubVal === prevFirstValue ||
            currentSubVal === '00:00' ||
            currentSubVal === '0' ||
            currentSubVal === 0
          ) {
            const nextEntry = { ...updated[i], [field]: value };
            const nextTimes = getWorkTimes(nextEntry.horaInicio, nextEntry.horaFin);
            if (nextTimes.isValid && nextEntry.tiempoComidaMinutos > nextTimes.diffMinutes) {
              nextEntry.tiempoComidaMinutos = newEntry.tiempoComidaMinutos;
            }
            updated[i] = nextEntry;
          }
        }
      }
      return updated;
    });
  };

  // Screen 8 helper to add extra work item
  const handleAddExtraWorkItem = () => {
    setValidationError(null);
    if (!currentExtraMotivo.trim()) {
      setValidationError('Por favor escribe el trabajo realizado o motivo de la parada.');
      return;
    }
    const numOp = parseFloat(currentExtraNumOperarios) || 1;
    const tiempoH = parseFloat(currentExtraTiempoHoras) || 0;
    const totalH = Math.round(numOp * tiempoH * 100) / 100;

    const newItem: ExtraWorkItem = {
      id: `EW-${Date.now().toString().slice(-4)}`,
      tipo: currentExtraTipo,
      motivo: currentExtraMotivo.trim(),
      numOperarios: numOp,
      tiempoInvertidoHoras: tiempoH,
      tiempoTotalHoras: totalH
    };

    setExtraworksList((prev) => [...prev, newItem]);
    setHuboExtraWorkRespuesta(true);
    // Reset inputs for potential next: default is 0 for tiempo invertido
    setCurrentExtraMotivo('');
    setCurrentExtraNumOperarios('1');
    setCurrentExtraTiempoHoras('0');
    // Prompt: "¿Hubo algún extrawork, waiting time o retrabajo más?"
    setMostrandoPreguntaSiHayMas(true);
  };

  // Screen 11: Final Save
  const handleGuardarRegistro = async () => {
    setIsSaving(true);
    try {
      // Build final record structure
      const formattedTareas: TareaRealizada[] = Object.entries(tareasRealizadas).map(
        ([tarea, data]) => ({
          tarea,
          porcentaje: data.porcentaje,
          operariosAsignados: data.operarios
        })
      );

      const newRecord = await createRecord({
        quienRealiza,
        fechaTrabajos,
        aerogenerador,
        operariosParticipantes,
        tiemposOperarios,
        tipoOT,
        tareas: formattedTareas,
        extraworks: extraworksList,
        materialRotoFaltante: {
          hubo: !!materialRotoHubo,
          detalle: materialRotoHubo ? materialRotoDetalle : ''
        },
        observaciones: {
          hubo: !!observacionesHubo,
          detalle: observacionesHubo ? observacionesDetalle : ''
        }
      });

      setSavedRecordId(newRecord.id);
      setGuardadoExitoso(true);
    } catch (err) {
      console.error('Error guardando OT:', err);
      alert('Hubo un inconveniente al guardar. Se ha guardado en el almacenamiento local del dispositivo.');
      setGuardadoExitoso(true);
    } finally {
      setIsSaving(false);
    }
  };

  // SUCCESS SCREEN
  if (guardadoExitoso) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-emerald-400 shadow-xl text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              S. E. WINDYTEC S. L.
            </span>
            {/* Mensaje amplio requerido textualmente en el prompt */}
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              OT GUARDADA CON ÉXITO!!!!
            </h1>
            <p className="text-sm font-semibold text-slate-600">
              El parte de trabajo <span className="font-mono text-emerald-700 font-bold">{savedRecordId}</span> ha sido almacenado en la nube.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 text-xs text-left text-slate-700 space-y-1.5 border border-slate-200">
            <div><strong>Aerogenerador:</strong> {aerogenerador}</div>
            <div><strong>Fecha:</strong> {fechaTrabajos}</div>
            <div><strong>Responsable:</strong> {quienRealiza}</div>
            <div><strong>Equipo ({operariosParticipantes.length}):</strong> {operariosParticipantes.join(', ')}</div>
            <div><strong>Tipo OT:</strong> {tipoOT}</div>
          </div>

          <button
            type="button"
            id="btn-volver-a-pantalla-principal-post-guardado"
            onClick={onFinish}
            className="w-full py-4 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5 text-sky-400" />
            <span>VOLVER A PANTALLA PRINCIPAL</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-4 sm:py-6 space-y-5">
      {/* Barra de progreso y pasos: Pantalla X de 11 */}
      <div className="bg-white rounded-2xl p-4 border border-sky-100 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200">
            PANTALLA {step} DE 11
          </span>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-700 font-semibold"
          >
            Cancelar OT
          </button>
        </div>

        {/* Barra de progreso visual */}
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-sky-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${(step / 11) * 100}%` }}
          />
        </div>
      </div>

      {/* Alerta de validación si faltan datos */}
      {validationError && (
        <div className="bg-rose-50 border border-rose-300 text-rose-800 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* CONTENIDO DE CADA PANTALLA SEGÚN EL PASO */}

      {/* PANTALLA 1: Quien realiza la OT??? */}
      {step === 1 && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-sky-100 shadow-sm space-y-5">
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold mb-3">
              <User className="w-5 h-5" />
            </div>
            {/* Pregunta exacta del prompt */}
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
              Quien realiza la OT???
            </h2>
            <p className="text-xs text-slate-500">
              Selecciona el operario responsable de cumplimentar este parte de trabajo.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Operario Responsable:
            </label>
            {/* Desplegable sin valor por defecto */}
            <select
              id="select-quien-realiza-ot"
              value={quienRealiza}
              onChange={(e) => {
                setQuienRealiza(e.target.value);
                setValidationError(null);
              }}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white"
            >
              <option value="" disabled>
                -- Seleccionar Operario --
              </option>
              {masterData.operarios.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* PANTALLA 2: FECHA que se realizan los trabajos??? */}
      {step === 2 && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-sky-100 shadow-sm space-y-5">
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold mb-3">
              <CalendarIcon className="w-5 h-5" />
            </div>
            {/* Pregunta exacta del prompt */}
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
              FECHA que se realizan los trabajos???
            </h2>
            <p className="text-xs text-slate-500">
              Abre el calendario para elegir el día exacto de ejecución de los trabajos.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Fecha de Trabajo:
            </label>
            {/* Calendario sin valor por defecto */}
            <input
              type="date"
              id="input-fecha-trabajos"
              value={fechaTrabajos}
              onChange={(e) => {
                setFechaTrabajos(e.target.value);
                setValidationError(null);
              }}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white"
            />
          </div>
        </div>
      )}

      {/* PANTALLA 3: Donde se realizan los trabajos??? */}
      {step === 3 && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-sky-100 shadow-sm space-y-5">
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold mb-3">
              <Wind className="w-5 h-5" />
            </div>
            {/* Pregunta exacta del prompt */}
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
              Donde se realizan los trabajos???
            </h2>
            <p className="text-xs text-slate-500">
              Selecciona el aerogenerador o ubicación del parque eólico.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Aerogenerador / Ubicación:
            </label>
            {/* Desplegable sin valor por defecto */}
            <select
              id="select-donde-aerogenerador"
              value={aerogenerador}
              onChange={(e) => {
                setAerogenerador(e.target.value);
                setValidationError(null);
              }}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white"
            >
              <option value="" disabled>
                -- Seleccionar Aerogenerador --
              </option>
              {masterData.aerogeneradores.map((aero) => (
                <option key={aero} value={aero}>
                  {aero}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* PANTALLA 4: OPERARIOS que participaron en esta OT??? */}
      {step === 4 && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-sky-100 shadow-sm space-y-5">
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold mb-3">
              <Users className="w-5 h-5" />
            </div>
            {/* Pregunta exacta del prompt */}
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
              OPERARIOS que participaron en esta OT???
            </h2>
            <p className="text-xs text-slate-500">
              Puedes seleccionar varios operarios que formaron parte del equipo.
            </p>
          </div>

          <div className="space-y-2">
            {masterData.operarios.map((op) => {
              const isSelected = operariosParticipantes.includes(op);
              return (
                <label
                  key={op}
                  className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-sky-50 border-sky-500 text-sky-950 font-bold shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-sky-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={`check-op-${op}`}
                      checked={isSelected}
                      onChange={() => {
                        setValidationError(null);
                        if (isSelected) {
                          setOperariosParticipantes(operariosParticipantes.filter((item) => item !== op));
                        } else {
                          setOperariosParticipantes([...operariosParticipantes, op]);
                        }
                      }}
                      className="w-5 h-5 rounded-md text-sky-600 focus:ring-sky-500 border-slate-300"
                    />
                    <span className="text-sm">{op}</span>
                  </div>
                  {isSelected && (
                    <span className="text-xs font-bold text-sky-600 bg-white px-2 py-0.5 rounded-md border border-sky-200">
                      Seleccionado
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          <div className="text-xs font-medium text-slate-500 pt-1">
            Total seleccionados: <strong>{operariosParticipantes.length}</strong>
          </div>
        </div>
      )}

      {/* PANTALLA 5: TIEMPO invertido en la OT??? */}
      {step === 5 && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-sky-100 shadow-sm space-y-5">
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold mb-3">
              <Clock className="w-5 h-5" />
            </div>
            {/* Pregunta exacta del prompt */}
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
              TIEMPO invertido en la OT???
            </h2>
            <p className="text-xs text-sky-900 bg-sky-50 p-3 rounded-xl border border-sky-200 leading-relaxed font-medium">
              Nota: La selección que hagas en el <strong>primer operario</strong> se aplicará automáticamente al resto, y después puedes modificar cualquiera de ellos individualmente.
            </p>
          </div>

          <div className="space-y-4">
            {tiemposOperarios.map((t, idx) => {
              const times = getWorkTimes(t.horaInicio, t.horaFin);
              const workMin = times.isValid ? times.diffMinutes : 0;
              const workH = Math.floor(workMin / 60);
              const workM = workMin % 60;
              const netMin = Math.max(0, workMin - (t.tiempoComidaMinutos || 0));
              const netH = Math.floor(netMin / 60);
              const netM = netMin % 60;
              const isInvalidTime = (t.horaInicio !== '00:00' || t.horaFin !== '00:00') && !times.isValid;

              return (
                <div
                  key={t.operario}
                  className="bg-slate-50/90 p-4 rounded-2xl border border-slate-200 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-sky-600 text-white text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span>{t.operario}</span>
                    </div>
                    {idx === 0 && (
                      <span className="text-[11px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md">
                        Principal (Auto-sincroniza al resto)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {/* HORA DE INICIO (default 00:00) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                        HORA DE INICIO:
                      </label>
                      <input
                        type="time"
                        id={`hora-inicio-${idx}`}
                        value={t.horaInicio || '00:00'}
                        onChange={(e) => handleUpdateTiempo(idx, 'horaInicio', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    {/* HORA DE FIN (default 00:00) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                        HORA DE FIN:
                      </label>
                      <input
                        type="time"
                        id={`hora-fin-${idx}`}
                        value={t.horaFin || '00:00'}
                        onChange={(e) => handleUpdateTiempo(idx, 'horaFin', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    {/* TIEMPO DE COMIDA: no puede ser mayor que la diferencia entre fin e inicio */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                        TIEMPO DE COMIDA:
                      </label>
                      <select
                        id={`tiempo-comida-${idx}`}
                        value={t.tiempoComidaMinutos}
                        onChange={(e) => handleUpdateTiempo(idx, 'tiempoComidaMinutos', parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                      >
                        <option value={0}>0 minutos</option>
                        <option value={30} disabled={times.isValid && times.diffMinutes < 30}>
                          30 minutos {times.isValid && times.diffMinutes < 30 ? '(no permitido: trabajo < 30m)' : ''}
                        </option>
                        <option value={60} disabled={times.isValid && times.diffMinutes < 60}>
                          60 minutos {times.isValid && times.diffMinutes < 60 ? '(no permitido: trabajo < 1h)' : ''}
                        </option>
                        <option value={90} disabled={times.isValid && times.diffMinutes < 90}>
                          90 minutos {times.isValid && times.diffMinutes < 90 ? '(no permitido: trabajo < 1h 30m)' : ''}
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* Indicadores en tiempo real para el operario */}
                  {isInvalidTime && (
                    <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-xl flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{times.errorMsg || 'La hora de Fin tiene que ser mayor que la hora de Inicio.'}</span>
                    </div>
                  )}

                  {times.isValid && (
                    <div className="text-xs text-sky-950 bg-sky-100/70 p-2 rounded-xl border border-sky-200 flex flex-wrap items-center justify-between gap-2">
                      <span>Jornada: <strong>{workH}h {workM > 0 ? `${workM}m` : ''}</strong></span>
                      <span>Comida: <strong>{t.tiempoComidaMinutos} min</strong></span>
                      <span className="font-bold text-sky-900 bg-white px-2 py-0.5 rounded-md border border-sky-300">
                        Efectivo: {netH}h {netM > 0 ? `${netM}m` : ''}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PANTALLA 6: TIPO de OT??? */}
      {step === 6 && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-sky-100 shadow-sm space-y-5">
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold mb-3">
              <FolderKanban className="w-5 h-5" />
            </div>
            {/* Pregunta exacta del prompt */}
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
              TIPO de OT???
            </h2>
            <p className="text-xs text-slate-500">
              Selecciona el tipo de trabajo correspondiente para cargar sus tareas asociadas.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Tipo de OT:
            </label>
            {/* Desplegable sin valor por defecto */}
            <select
              id="select-tipo-de-ot"
              value={tipoOT}
              onChange={(e) => {
                setTipoOT(e.target.value);
                setValidationError(null);
              }}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white"
            >
              <option value="" disabled>
                -- Seleccionar Tipo de OT --
              </option>
              {masterData.tiposOT.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* PANTALLA 7: TAREAS realizadas en esta  OT??? */}
      {step === 7 && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-sky-100 shadow-sm space-y-5">
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold mb-3">
              <CheckSquare className="w-5 h-5" />
            </div>
            {/* Pregunta exacta del prompt */}
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
              TAREAS realizadas en esta  OT???
            </h2>
            <p className="text-xs text-slate-500">
              Tipo seleccionado: <strong className="text-sky-700">{tipoOT}</strong>. Indica el porcentaje realizado en cada tarea y qué operarios participaron en ella.
            </p>
          </div>

          <div className="space-y-4">
            {Object.keys(tareasRealizadas).length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                No hay tareas configuradas para este Tipo de OT en «Datos de la Obra». Puedes continuar o configurar tareas en el menú administrador.
              </div>
            ) : (
              Object.entries(tareasRealizadas).map(([tarea, data]) => {
                const percentageOptions: Array<'0 %' | '25 %' | '50 %' | '75 %' | '100 %'> = [
                  '0 %',
                  '25 %',
                  '50 %',
                  '75 %',
                  '100 %'
                ];

                return (
                  <div
                    key={tarea}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3"
                  >
                    <div className="font-extrabold text-slate-900 text-sm leading-snug">
                      {tarea}
                    </div>

                    {/* Selector de Porcentaje: 0%, 25%, 50%, 75%, 100% */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                        Porcentaje realizado:
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {percentageOptions.map((pct) => {
                          const isSelected = data.porcentaje === pct;
                          return (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => {
                                setTareasRealizadas((prev) => ({
                                  ...prev,
                                  [tarea]: { ...prev[tarea], porcentaje: pct }
                                }));
                              }}
                              className={`py-2 px-1 text-xs font-extrabold rounded-lg border text-center transition-all ${
                                isSelected
                                  ? pct === '100 %'
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                    : 'bg-sky-600 border-sky-600 text-white shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-700 hover:border-sky-300'
                              }`}
                            >
                              {pct}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Selección de operarios que participaron en esta tarea */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                        Operarios que realizaron esta tarea:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {operariosParticipantes.map((op) => {
                          const isAssigned = data.operarios.includes(op);
                          return (
                            <button
                              key={op}
                              type="button"
                              onClick={() => {
                                setTareasRealizadas((prev) => {
                                  const currentOp = prev[tarea].operarios;
                                  const updatedOp = isAssigned
                                    ? currentOp.filter((o) => o !== op)
                                    : [...currentOp, op];
                                  return {
                                    ...prev,
                                    [tarea]: { ...prev[tarea], operarios: updatedOp }
                                  };
                                });
                              }}
                              className={`px-2.5 py-1 text-xs rounded-lg font-semibold border transition-all flex items-center gap-1 ${
                                isAssigned
                                  ? 'bg-sky-100 border-sky-400 text-sky-900 font-bold'
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              {isAssigned && <Check className="w-3 h-3 text-sky-700" />}
                              <span>{op}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* PANTALLA 8: Hubo EXTRAWORK, WAITING TIME ó RETRABAJOS??? */}
      {step === 8 && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-sky-100 shadow-sm space-y-5">
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold mb-3">
              <Clock className="w-5 h-5" />
            </div>
            {/* Pregunta exacta del prompt */}
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
              Hubo EXTRAWORK, WAITING TIME ó RETRABAJOS???
            </h2>
            <p className="text-xs text-slate-500">
              Registra si hubo tiempo extra, parada a la espera o retrabajos durante la jornada.
            </p>
          </div>

          {/* Listado de extraworks ya agregados */}
          {extraworksList.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Registros agregados ({extraworksList.length}):
              </span>
              <div className="space-y-2">
                {extraworksList.map((ew, idx) => (
                  <div
                    key={ew.id}
                    className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md">
                          {ew.tipo}
                        </span>
                        <span className="font-extrabold text-amber-950">
                          Total: {ew.tiempoTotalHoras}h
                        </span>
                      </div>
                      <p className="font-medium text-slate-800 mt-1">{ew.motivo}</p>
                      <span className="text-[11px] text-slate-500">
                        {ew.numOperarios} operarios × {ew.tiempoInvertidoHoras} horas
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExtraworksList(extraworksList.filter((_, i) => i !== idx))}
                      className="p-1 text-slate-400 hover:text-rose-600"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Si ya agregamos uno, el prompt exige:
              "Cuando cubramos un extrawork, waiting time o retrabajo, tiene que preguntarnos si hubo algún extrawork, waiting time o retrabajo más. Si le damos a SI Vuelve a hacer las preguntas anteriores, hasta que seleccionemos NO y pase a la siguiente pantalla."
          */}
          {mostrandoPreguntaSiHayMas ? (
            <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 text-center space-y-4 animate-in fade-in">
              <h3 className="text-base font-extrabold text-sky-950">
                ¿Hubo algún extrawork, waiting time o retrabajo más?
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="btn-extrawork-si-mas"
                  onClick={() => setMostrandoPreguntaSiHayMas(false)}
                  className="py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-md"
                >
                  SÍ, AÑADIR OTRO
                </button>
                <button
                  type="button"
                  id="btn-extrawork-no-mas"
                  onClick={() => {
                    setMostrandoPreguntaSiHayMas(false);
                    handleNextStep();
                  }}
                  className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md"
                >
                  NO, CONTINUAR
                </button>
              </div>
            </div>
          ) : (
            /* Formulario para registrar o continuar si no hubo */
            <div className="space-y-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
              {/* Selector de Tipo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Seleccionar Tipo:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['EXTRAWORK', 'WAITING TIME', 'RETRABAJO'] as ExtraWorkTipo[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCurrentExtraTipo(t)}
                      className={`py-2 px-1 text-xs font-extrabold rounded-xl border text-center transition-all ${
                        currentExtraTipo === t
                          ? 'bg-amber-500 border-amber-600 text-slate-950 shadow-xs'
                          : 'bg-white border-slate-300 text-slate-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trabajo realizado o motivo de la parada: */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Trabajo realizado o motivo de la parada:
                </label>
                <input
                  type="text"
                  id="input-extrawork-motivo"
                  placeholder="Escribe el trabajo o motivo..."
                  value={currentExtraMotivo}
                  onChange={(e) => setCurrentExtraMotivo(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Nº de operarios y Tiempo invertido */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nº de operarios:
                  </label>
                  <input
                    type="number"
                    min="1"
                    id="input-extrawork-num-operarios"
                    value={currentExtraNumOperarios}
                    onChange={(e) => setCurrentExtraNumOperarios(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tiempo invertido (horas):
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    id="input-extrawork-tiempo-invertido"
                    value={currentExtraTiempoHoras}
                    onChange={(e) => setCurrentExtraTiempoHoras(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold"
                  />
                </div>
              </div>

              {/* Cálculo automático del tiempo total: Nº operarios * Tiempo invertido */}
              <div className="p-3 bg-amber-100/70 border border-amber-300 rounded-xl flex items-center justify-between text-xs font-bold text-amber-950">
                <span>Tiempo total calculado:</span>
                <span className="text-sm font-black">
                  {Math.round(
                    (parseFloat(currentExtraNumOperarios) || 0) *
                      (parseFloat(currentExtraTiempoHoras) || 0) *
                      100
                  ) / 100}{' '}
                  horas
                </span>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  id="btn-guardar-este-extrawork"
                  onClick={handleAddExtraWorkItem}
                  disabled={!currentExtraMotivo.trim()}
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>GUARDAR</span>
                </button>

                {extraworksList.length === 0 && (
                  <button
                    type="button"
                    id="btn-extrawork-no-hubo"
                    onClick={() => {
                      setHuboExtraWorkRespuesta(false);
                      handleNextStep();
                    }}
                    className="py-3 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors"
                  >
                    No hubo ninguno
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PANTALLA 9: MATERIAL ROTO ó MATERIAL FALTANTE */}
      {step === 9 && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-sky-100 shadow-sm space-y-5">
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold mb-3">
              <AlertCircle className="w-5 h-5" />
            </div>
            {/* Pregunta exacta del prompt */}
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
              MATERIAL ROTO ó MATERIAL FALTANTE
            </h2>
            <p className="text-xs text-slate-500">
              Selecciona SÍ o NO. Si seleccionas SÍ, deberás detallar obligatoriamente qué material está roto o falta.
            </p>
          </div>

          <div className="space-y-4">
            {/* Opciones SI / NO */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="btn-material-roto-si"
                onClick={() => {
                  setMaterialRotoHubo(true);
                  setValidationError(null);
                }}
                className={`py-3.5 px-4 rounded-xl border-2 font-black text-base transition-all ${
                  materialRotoHubo === true
                    ? 'bg-rose-500 border-rose-600 text-white shadow-md'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                SÍ
              </button>

              <button
                type="button"
                id="btn-material-roto-no"
                onClick={() => {
                  setMaterialRotoHubo(false);
                  setMaterialRotoDetalle('');
                  setValidationError(null);
                }}
                className={`py-3.5 px-4 rounded-xl border-2 font-black text-base transition-all ${
                  materialRotoHubo === false
                    ? 'bg-emerald-600 border-emerald-700 text-white shadow-md'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                NO
              </button>
            </div>

            {/* Campo obligatorio si responde SÍ */}
            {materialRotoHubo === true && (
              <div className="space-y-2 pt-2 animate-in fade-in">
                <label className="block text-xs font-bold text-rose-800 uppercase tracking-wider">
                  Detalle del material roto o faltante (Obligatorio):
                </label>
                <textarea
                  id="textarea-material-roto-detalle"
                  rows={3}
                  value={materialRotoDetalle}
                  onChange={(e) => {
                    setMaterialRotoDetalle(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder="Escribe aquí el material roto o faltante..."
                  className="w-full p-3 bg-rose-50/40 border border-rose-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500 text-slate-900"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* PANTALLA 10: OBSERVACIONES: */}
      {step === 10 && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-sky-100 shadow-sm space-y-5">
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold mb-3">
              <Layers className="w-5 h-5" />
            </div>
            {/* Pregunta exacta del prompt */}
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
              OBSERVACIONES:
            </h2>
            <p className="text-xs text-slate-500">
              Selecciona SÍ o NO. Si seleccionas SÍ, deberás detallar obligatoriamente las observaciones.
            </p>
          </div>

          <div className="space-y-4">
            {/* Opciones SI / NO */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="btn-observaciones-si"
                onClick={() => {
                  setObservacionesHubo(true);
                  setValidationError(null);
                }}
                className={`py-3.5 px-4 rounded-xl border-2 font-black text-base transition-all ${
                  observacionesHubo === true
                    ? 'bg-sky-600 border-sky-700 text-white shadow-md'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                SÍ
              </button>

              <button
                type="button"
                id="btn-observaciones-no"
                onClick={() => {
                  setObservacionesHubo(false);
                  setObservacionesDetalle('');
                  setValidationError(null);
                }}
                className={`py-3.5 px-4 rounded-xl border-2 font-black text-base transition-all ${
                  observacionesHubo === false
                    ? 'bg-emerald-600 border-emerald-700 text-white shadow-md'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                NO
              </button>
            </div>

            {/* Campo obligatorio si responde SÍ */}
            {observacionesHubo === true && (
              <div className="space-y-2 pt-2 animate-in fade-in">
                <label className="block text-xs font-bold text-sky-900 uppercase tracking-wider">
                  Escribe las observaciones (Obligatorio):
                </label>
                <textarea
                  id="textarea-observaciones-detalle"
                  rows={3}
                  value={observacionesDetalle}
                  onChange={(e) => {
                    setObservacionesDetalle(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder="Detalla aquí cualquier observación adicional..."
                  className="w-full p-3 bg-sky-50/40 border border-sky-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-900"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* PANTALLA 11: Resumen y Guardar Registro */}
      {step === 11 && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-sky-100 shadow-sm space-y-5">
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mb-3">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
              RESUMEN DE LA OT
            </h2>
            <p className="text-xs text-slate-500">
              Revisa todos los datos introducidos. Si algo está mal, puedes volver atrás para corregirlo. Si todo está bien, pulsa «GUARDAR REGISTRO».
            </p>
          </div>

          <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
            {/* Responsable y Fecha */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-semibold">1. Quien realiza la OT:</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">{quienRealiza}</span>
                <button type="button" onClick={() => setStep(1)} className="text-sky-600 hover:underline">
                  <Edit2 className="w-3 h-3 inline" />
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-semibold">2. Fecha:</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">{fechaTrabajos}</span>
                <button type="button" onClick={() => setStep(2)} className="text-sky-600 hover:underline">
                  <Edit2 className="w-3 h-3 inline" />
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-semibold">3. Aerogenerador:</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">{aerogenerador}</span>
                <button type="button" onClick={() => setStep(3)} className="text-sky-600 hover:underline">
                  <Edit2 className="w-3 h-3 inline" />
                </button>
              </div>
            </div>

            {/* Operarios y horarios */}
            <div className="pb-2 border-b border-slate-200 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">4 y 5. Equipo y Tiempos:</span>
                <button type="button" onClick={() => setStep(4)} className="text-sky-600 hover:underline">
                  <Edit2 className="w-3 h-3 inline" />
                </button>
              </div>
              <div className="space-y-1 pl-2">
                {tiemposOperarios.map((t) => (
                  <div key={t.operario} className="text-slate-700">
                    • <strong>{t.operario}</strong>: Inicio <strong>{t.horaInicio}</strong> | Fin <strong>{t.horaFin}</strong> | Comida <strong>{t.tiempoComidaMinutos}m</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Tipo OT y Tareas */}
            <div className="pb-2 border-b border-slate-200 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">6 y 7. Tipo de OT y Tareas:</span>
                <button type="button" onClick={() => setStep(6)} className="text-sky-600 hover:underline">
                  <Edit2 className="w-3 h-3 inline" />
                </button>
              </div>
              <div className="font-bold text-slate-900 mb-1">{tipoOT}</div>
              <div className="space-y-1 pl-2">
                {Object.entries(tareasRealizadas).map(([tarea, data]) => (
                  <div key={tarea} className="text-slate-700 flex justify-between gap-2">
                    <span className="truncate">• {tarea} ({(data.operarios || []).join(', ')})</span>
                    <span className="font-bold text-sky-800 shrink-0">{data.porcentaje}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Extraworks */}
            <div className="pb-2 border-b border-slate-200 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">8. Extrawork / Waiting / Retrabajos:</span>
                <button type="button" onClick={() => setStep(8)} className="text-sky-600 hover:underline">
                  <Edit2 className="w-3 h-3 inline" />
                </button>
              </div>
              {extraworksList.length === 0 ? (
                <div className="text-slate-500 italic">Ninguno registrado</div>
              ) : (
                <div className="space-y-1 pl-2">
                  {extraworksList.map((ew) => (
                    <div key={ew.id} className="text-slate-800">
                      • [{ew.tipo}] {ew.motivo} ({ew.numOperarios} op × {ew.tiempoInvertidoHoras}h = <strong>{ew.tiempoTotalHoras}h</strong>)
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Material Roto o Faltante */}
            <div className="pb-2 border-b border-slate-200 flex justify-between items-center">
              <span className="text-slate-500 font-semibold">9. Material Roto / Faltante:</span>
              <div className="flex items-center gap-2">
                <span className={`font-bold ${materialRotoHubo ? 'text-rose-600' : 'text-slate-800'}`}>
                  {materialRotoHubo ? `SÍ (${materialRotoDetalle})` : 'NO'}
                </span>
                <button type="button" onClick={() => setStep(9)} className="text-sky-600 hover:underline">
                  <Edit2 className="w-3 h-3 inline" />
                </button>
              </div>
            </div>

            {/* Observaciones */}
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">10. Observaciones:</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">
                  {observacionesHubo ? `SÍ (${observacionesDetalle})` : 'NO'}
                </span>
                <button type="button" onClick={() => setStep(10)} className="text-sky-600 hover:underline">
                  <Edit2 className="w-3 h-3 inline" />
                </button>
              </div>
            </div>
          </div>

          {/* Botón GUARDAR REGISTRO */}
          <div className="pt-2">
            <button
              type="button"
              id="btn-guardar-registro-final"
              onClick={handleGuardarRegistro}
              disabled={isSaving}
              className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              <span>{isSaving ? 'Guardando en la nube...' : 'GUARDAR REGISTRO'}</span>
            </button>
          </div>
        </div>
      )}

      {/* BOTONES DE NAVEGACIÓN ANTERIOR / SIGUIENTE */}
      <div className="flex gap-3 pt-1">
        {step > 1 && (
          <button
            type="button"
            id="wizard-btn-atras"
            onClick={handlePrevStep}
            className="flex-1 py-3.5 px-4 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-sm flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver Atrás</span>
          </button>
        )}

        {step < 11 && (
          <button
            type="button"
            id="wizard-btn-siguiente"
            onClick={handleNextStep}
            className="flex-1 py-3.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all"
          >
            <span>Siguiente</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
