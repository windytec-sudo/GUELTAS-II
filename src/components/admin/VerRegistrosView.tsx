import React, { useState } from 'react';
import { MasterData, OTRecord, OperarioHorario, TareaRealizada, ExtraWorkItem, ExtraWorkTipo } from '../../types';
import { 
  ArrowLeft, 
  Trash2, 
  Edit3, 
  Save, 
  Calendar, 
  User, 
  Wind, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Sheet, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  X,
  Search,
  Plus,
  Users,
  Layers,
  AlertCircle
} from 'lucide-react';
import { syncToGoogleSheet } from '../../services/api';

interface VerRegistrosViewProps {
  records: OTRecord[];
  masterData?: MasterData;
  onUpdateRecord: (updated: OTRecord) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
  onBack: () => void;
  onOpenGoogleSheetSync: () => void;
}

// Helper: parse HH:MM to minutes
function parseTimeToMinutes(val: string): number | null {
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

function validateWorkTimes(horaInicio: string, horaFin: string) {
  const start = parseTimeToMinutes(horaInicio);
  const end = parseTimeToMinutes(horaFin);
  if (start === null || end === null) {
    return { isValid: false, diffMinutes: 0, errorMsg: 'Formato de hora no válido' };
  }
  if (end <= start) {
    return { isValid: false, diffMinutes: 0, errorMsg: 'La hora de fin debe ser mayor que la de inicio' };
  }
  return { isValid: true, diffMinutes: end - start, errorMsg: null };
}

export const VerRegistrosView: React.FC<VerRegistrosViewProps> = ({
  records,
  masterData,
  onUpdateRecord,
  onDeleteRecord,
  onBack,
  onOpenGoogleSheetSync
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(
    records.length > 0 ? records[0].id : null
  );

  // Edit record state (holds complete OT data during editing)
  const [editingRecord, setEditingRecord] = useState<OTRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<OTRecord | null>(null);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // Auxiliary state for adding a new task during edit
  const [newTareaText, setNewTareaText] = useState('');
  const [newOperarioToAdd, setNewOperarioToAdd] = useState('');

  // Auxiliary state for adding/editing extrawork during edit
  const [newExtraTipo, setNewExtraTipo] = useState<ExtraWorkTipo>('EXTRAWORK');
  const [newExtraMotivo, setNewExtraMotivo] = useState('');
  const [newExtraNumOp, setNewExtraNumOp] = useState('1');
  const [newExtraHoras, setNewExtraHoras] = useState('0');
  const [editingExtraWorkIndex, setEditingExtraWorkIndex] = useState<number | null>(null);

  const filteredRecords = records.filter((r) => {
    const term = searchTerm.toLowerCase();
    const aero = (r.donde || r.aerogenerador || '').toLowerCase();
    const quien = (r.quienRealiza || '').toLowerCase();
    const fecha = (r.fechaTrabajos || '').toLowerCase();
    const tipo = (r.tipoOT || '').toLowerCase();
    return aero.includes(term) || quien.includes(term) || fecha.includes(term) || tipo.includes(term) || r.id.toLowerCase().includes(term);
  });

  const handleGuardarCambios = async () => {
    setIsSavingChanges(true);
    setSaveMessage(null);
    try {
      const res = await syncToGoogleSheet();
      setSaveMessage(`¡Cambios guardados en la nube y sincronizados con Google Sheet exitosamente! (${res.totalRecords} registros)`);
      setTimeout(() => setSaveMessage(null), 4000);
    } catch {
      setSaveMessage('Cambios guardados en la nube.');
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsSavingChanges(false);
    }
  };

  const handleStartEdit = (r: OTRecord) => {
    // Deep clone record for editing
    setEditingRecord(JSON.parse(JSON.stringify(r)));
    setEditError(null);
    setNewTareaText('');
    setNewOperarioToAdd('');
    setNewExtraMotivo('');
    setNewExtraHoras('0');
    setNewExtraNumOp('1');
    setNewExtraTipo('EXTRAWORK');
    setEditingExtraWorkIndex(null);
  };

  // Helper when changing Tipo de OT: updates tasks according to the selected OT type from masterData
  const handleCambiarTipoOT = (nuevoTipoOT: string) => {
    if (!editingRecord) return;
    
    // Obtener tareas configuradas para el nuevo tipo de OT en Datos Maestros
    const tareasConfiguradas = (masterData?.tareasPorOT && masterData.tareasPorOT[nuevoTipoOT]) || [];
    const participantes = (editingRecord.tiemposOperarios || []).map((t) => t.operario);

    // Mapear manteniendo el porcentaje y operarios si la tarea ya existía, o crearla desde cero al 0%
    const nuevasTareas: TareaRealizada[] = tareasConfiguradas.map((nombreTarea) => {
      const tareaExistente = (editingRecord.tareas || []).find(
        (t) => t.tarea.trim().toLowerCase() === nombreTarea.trim().toLowerCase()
      );
      if (tareaExistente) {
        return { ...tareaExistente };
      }
      return {
        tarea: nombreTarea,
        porcentaje: '0 %',
        operariosAsignados: [...participantes]
      };
    });

    setEditingRecord({
      ...editingRecord,
      tipoOT: nuevoTipoOT,
      tareas: nuevasTareas
    });
  };

  const handleSaveEditedRecord = async () => {
    if (!editingRecord) return;
    setEditError(null);

    // Validate general
    if (!editingRecord.quienRealiza?.trim()) {
      setEditError('Debes indicar quién realiza la OT.');
      return;
    }
    if (!editingRecord.fechaTrabajos) {
      setEditError('Debes indicar la fecha de los trabajos.');
      return;
    }
    if (!editingRecord.aerogenerador?.trim()) {
      setEditError('Debes indicar el aerogenerador o lugar.');
      return;
    }
    if (!editingRecord.tipoOT?.trim()) {
      setEditError('Debes indicar el Tipo de OT.');
      return;
    }

    // Validate times of operarios
    if (editingRecord.tiemposOperarios && editingRecord.tiemposOperarios.length > 0) {
      for (const t of editingRecord.tiemposOperarios) {
        const val = validateWorkTimes(t.horaInicio, t.horaFin);
        if (!val.isValid) {
          setEditError(`Operario "${t.operario}": ${val.errorMsg || 'Hora Fin debe ser mayor que Hora Inicio'}`);
          return;
        }
        if (t.tiempoComidaMinutos > val.diffMinutes) {
          setEditError(`Operario "${t.operario}": El tiempo de comida (${t.tiempoComidaMinutos} min) no puede superar el tiempo trabajado (${val.diffMinutes} min)`);
          return;
        }
      }
    }

    // Ensure donde and aerogenerador match
    const finalRecord: OTRecord = {
      ...editingRecord,
      donde: editingRecord.aerogenerador,
      aerogenerador: editingRecord.aerogenerador,
      operariosParticipantes: (editingRecord.tiemposOperarios || []).map((t) => t.operario)
    };

    try {
      await onUpdateRecord(finalRecord);
      setEditingRecord(null);
      setSaveMessage('Registro actualizado en la nube correctamente.');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setEditError('Hubo un error al guardar los cambios en la nube.');
    }
  };

  // Helper to update operario schedule in edit form
  const handleUpdateOperarioTiempo = (
    index: number,
    field: 'horaInicio' | 'horaFin' | 'tiempoComidaMinutos',
    value: string | number
  ) => {
    if (!editingRecord) return;
    const updated = [...(editingRecord.tiemposOperarios || [])];
    updated[index] = { ...updated[index], [field]: value };
    setEditingRecord({ ...editingRecord, tiemposOperarios: updated });
  };

  // Helper to remove an operario in edit form
  const handleRemoveOperario = (index: number) => {
    if (!editingRecord) return;
    const updated = (editingRecord.tiemposOperarios || []).filter((_, i) => i !== index);
    setEditingRecord({ ...editingRecord, tiemposOperarios: updated });
  };

  // Helper to add an operario in edit form
  const handleAddOperarioToRecord = () => {
    if (!editingRecord || !newOperarioToAdd.trim()) return;
    const exists = (editingRecord.tiemposOperarios || []).some(
      (t) => t.operario.toLowerCase() === newOperarioToAdd.trim().toLowerCase()
    );
    if (exists) {
      setEditError('Ese operario ya está añadido a esta OT.');
      return;
    }
    const newEntry: OperarioHorario = {
      operario: newOperarioToAdd.trim(),
      horaInicio: '00:00',
      horaFin: '00:00',
      tiempoComidaMinutos: 0
    };
    setEditingRecord({
      ...editingRecord,
      tiemposOperarios: [...(editingRecord.tiemposOperarios || []), newEntry]
    });
    setNewOperarioToAdd('');
  };

  // Helper to update task percentage
  const handleUpdateTaskPercentage = (taskIndex: number, porcentaje: '0 %' | '25 %' | '50 %' | '75 %' | '100 %') => {
    if (!editingRecord) return;
    const updated = [...(editingRecord.tareas || [])];
    updated[taskIndex] = { ...updated[taskIndex], porcentaje };
    setEditingRecord({ ...editingRecord, tareas: updated });
  };

  // Helper to toggle assigned operario in a task
  const handleToggleTaskOperario = (taskIndex: number, operarioName: string) => {
    if (!editingRecord) return;
    const updated = [...(editingRecord.tareas || [])];
    const currentList = updated[taskIndex].operariosAsignados || [];
    const isAssigned = currentList.includes(operarioName);
    const newList = isAssigned
      ? currentList.filter((op) => op !== operarioName)
      : [...currentList, operarioName];
    updated[taskIndex] = { ...updated[taskIndex], operariosAsignados: newList };
    setEditingRecord({ ...editingRecord, tareas: updated });
  };

  // Helper to remove task
  const handleRemoveTask = (taskIndex: number) => {
    if (!editingRecord) return;
    const updated = (editingRecord.tareas || []).filter((_, i) => i !== taskIndex);
    setEditingRecord({ ...editingRecord, tareas: updated });
  };

  // Helper to add new task
  const handleAddNewTask = () => {
    if (!editingRecord || !newTareaText.trim()) return;
    const newTask: TareaRealizada = {
      tarea: newTareaText.trim(),
      porcentaje: '0 %',
      operariosAsignados: (editingRecord.tiemposOperarios || []).map((t) => t.operario)
    };
    setEditingRecord({
      ...editingRecord,
      tareas: [...(editingRecord.tareas || []), newTask]
    });
    setNewTareaText('');
  };

  // Helper to remove extrawork
  const handleRemoveExtraWork = (index: number) => {
    if (!editingRecord) return;
    const updated = (editingRecord.extraworks || []).filter((_, i) => i !== index);
    setEditingRecord({ ...editingRecord, extraworks: updated });
    if (editingExtraWorkIndex === index) {
      handleCancelEditExtraWork();
    } else if (editingExtraWorkIndex !== null && editingExtraWorkIndex > index) {
      setEditingExtraWorkIndex(editingExtraWorkIndex - 1);
    }
  };

  // Helper to prepare an extrawork item for editing
  const handleStartEditExtraWork = (index: number) => {
    if (!editingRecord || !editingRecord.extraworks || !editingRecord.extraworks[index]) return;
    const ew = editingRecord.extraworks[index];
    setEditingExtraWorkIndex(index);
    setNewExtraTipo(ew.tipo);
    setNewExtraMotivo(ew.motivo);
    setNewExtraNumOp(String(ew.numOperarios));
    setNewExtraHoras(String(ew.tiempoInvertidoHoras));
  };

  // Helper to cancel editing an extrawork item
  const handleCancelEditExtraWork = () => {
    setEditingExtraWorkIndex(null);
    setNewExtraMotivo('');
    setNewExtraHoras('0');
    setNewExtraNumOp('1');
    setNewExtraTipo('EXTRAWORK');
  };

  // Helper to add or save edited extrawork
  const handleSaveExtraWork = () => {
    if (!editingRecord || !newExtraMotivo.trim()) {
      setEditError('Por favor escribe el trabajo realizado o motivo de la parada.');
      return;
    }
    const numOp = parseFloat(newExtraNumOp) || 1;
    const hrs = parseFloat(newExtraHoras) || 0;
    const totalHoras = parseFloat((numOp * hrs).toFixed(2));

    if (editingExtraWorkIndex !== null) {
      // Modificar existente
      const updated = [...(editingRecord.extraworks || [])];
      const existing = updated[editingExtraWorkIndex];
      updated[editingExtraWorkIndex] = {
        ...existing,
        tipo: newExtraTipo,
        motivo: newExtraMotivo.trim(),
        numOperarios: numOp,
        tiempoInvertidoHoras: hrs,
        tiempoTotalHoras: totalHoras
      };
      setEditingRecord({
        ...editingRecord,
        extraworks: updated
      });
      handleCancelEditExtraWork();
    } else {
      // Crear nuevo
      const newItem: ExtraWorkItem = {
        id: `ew-${Date.now()}`,
        tipo: newExtraTipo,
        motivo: newExtraMotivo.trim(),
        numOperarios: numOp,
        tiempoInvertidoHoras: hrs,
        tiempoTotalHoras: totalHoras
      };
      setEditingRecord({
        ...editingRecord,
        extraworks: [...(editingRecord.extraworks || []), newItem]
      });
      handleCancelEditExtraWork();
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 space-y-6">
      {/* Cabecera */}
      <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded-md border border-sky-200">
            Registros de OTs
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1">REGISTROS GUARDADOS</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total: {records.length} {records.length === 1 ? 'parte de trabajo' : 'partes de trabajo'}
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver Atrás</span>
        </button>
      </div>

      {saveMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Buscador */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          id="search-records-input"
          placeholder="Buscar por operario, aerogenerador, fecha, tipo de OT..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500"
        />
      </div>

      {/* Listado de Registros */}
      <div className="space-y-3">
        {filteredRecords.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 space-y-2">
            <FileText className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-medium">No hay registros que coincidan con la búsqueda.</p>
          </div>
        ) : (
          filteredRecords.map((r) => {
            const isExpanded = expandedRecordId === r.id;
            const isEditingThis = editingRecord?.id === r.id;

            return (
              <div
                key={r.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-sky-300"
              >
                {/* Cabecera del registro */}
                <div
                  className="p-4 cursor-pointer flex items-center justify-between gap-3 bg-slate-50/70 hover:bg-sky-50/50 transition-colors"
                  onClick={() => setExpandedRecordId(isExpanded ? null : r.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-sky-100 text-sky-800 rounded-md">
                        {r.id}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {r.fechaTrabajos}
                      </span>
                      <span className="text-xs font-bold text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded-md">
                        {r.tipoOT}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 text-sm truncate flex items-center gap-1.5">
                      <Wind className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>{r.donde || r.aerogenerador}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Realizada por: <strong>{r.quienRealiza}</strong></span>
                    </div>
                  </div>

                  {/* Acciones de cabecera */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedRecordId(r.id);
                        handleStartEdit(r);
                      }}
                      className="p-2 text-slate-500 hover:text-sky-700 hover:bg-sky-100/60 rounded-lg transition-colors"
                      title="Editar registro completo"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRecordToDelete(r);
                      }}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Borrar registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="p-1 text-slate-400">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Detalle o Edición del registro */}
                {isExpanded && (
                  <div className="p-4 border-t border-slate-100 space-y-4 text-xs bg-white">
                    {isEditingThis && editingRecord ? (
                      /* FORMULARIO COMPLETO DE EDICIÓN CON TODOS LOS DATOS DE LA OT */
                      <div className="space-y-5 bg-sky-50/40 p-4 sm:p-5 rounded-2xl border-2 border-sky-300 animate-in fade-in">
                        <div className="flex items-center justify-between border-b border-sky-200 pb-2.5">
                          <div className="font-extrabold text-sky-950 text-base flex items-center gap-2">
                            <Edit3 className="w-5 h-5 text-sky-700" />
                            <span>Modificar OT Completa ({editingRecord.id})</span>
                          </div>
                          <span className="text-[11px] font-bold text-sky-800 bg-sky-100 px-2.5 py-1 rounded-full">
                            Edición Total
                          </span>
                        </div>

                        {editError && (
                          <div className="p-3 bg-rose-100 border border-rose-300 text-rose-900 rounded-xl font-bold text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>{editError}</span>
                          </div>
                        )}

                        {/* 1. DATOS GENERALES */}
                        <div className="space-y-3 bg-white p-3.5 rounded-xl border border-sky-200 shadow-2xs">
                          <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                            1. Datos Generales de la OT
                          </span>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Quién realiza */}
                            <div>
                              <label className="block font-bold text-slate-700 mb-1">Quién realiza la OT:</label>
                              {masterData?.operarios && masterData.operarios.length > 0 ? (
                                <select
                                  value={editingRecord.quienRealiza}
                                  onChange={(e) => setEditingRecord({ ...editingRecord, quienRealiza: e.target.value })}
                                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                                >
                                  <option value="">Seleccionar operario...</option>
                                  {masterData.operarios.map((op) => (
                                    <option key={op} value={op}>{op}</option>
                                  ))}
                                  {editingRecord.quienRealiza && !masterData.operarios.includes(editingRecord.quienRealiza) && (
                                    <option value={editingRecord.quienRealiza}>{editingRecord.quienRealiza}</option>
                                  )}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={editingRecord.quienRealiza}
                                  onChange={(e) => setEditingRecord({ ...editingRecord, quienRealiza: e.target.value })}
                                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                                />
                              )}
                            </div>

                            {/* Fecha */}
                            <div>
                              <label className="block font-bold text-slate-700 mb-1">Fecha de trabajos:</label>
                              <input
                                type="date"
                                value={editingRecord.fechaTrabajos}
                                onChange={(e) => setEditingRecord({ ...editingRecord, fechaTrabajos: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                              />
                            </div>

                            {/* Aerogenerador */}
                            <div>
                              <label className="block font-bold text-slate-700 mb-1">Aerogenerador / Lugar:</label>
                              {masterData?.aerogeneradores && masterData.aerogeneradores.length > 0 ? (
                                <select
                                  value={editingRecord.aerogenerador}
                                  onChange={(e) => setEditingRecord({
                                    ...editingRecord,
                                    aerogenerador: e.target.value,
                                    donde: e.target.value
                                  })}
                                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                                >
                                  <option value="">Seleccionar aerogenerador...</option>
                                  {masterData.aerogeneradores.map((aero) => (
                                    <option key={aero} value={aero}>{aero}</option>
                                  ))}
                                  {editingRecord.aerogenerador && !masterData.aerogeneradores.includes(editingRecord.aerogenerador) && (
                                    <option value={editingRecord.aerogenerador}>{editingRecord.aerogenerador}</option>
                                  )}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={editingRecord.aerogenerador}
                                  onChange={(e) => setEditingRecord({
                                    ...editingRecord,
                                    aerogenerador: e.target.value,
                                    donde: e.target.value
                                  })}
                                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                                />
                              )}
                            </div>

                            {/* Tipo de OT */}
                            <div>
                              <label className="block font-bold text-slate-700 mb-1">TIPO DE OT:</label>
                              {masterData?.tiposOT && masterData.tiposOT.length > 0 ? (
                                <select
                                  value={editingRecord.tipoOT}
                                  onChange={(e) => handleCambiarTipoOT(e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-sky-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                                >
                                  <option value="">Seleccionar tipo...</option>
                                  {masterData.tiposOT.map((tipo) => (
                                    <option key={tipo} value={tipo}>{tipo}</option>
                                  ))}
                                  {editingRecord.tipoOT && !masterData.tiposOT.includes(editingRecord.tipoOT) && (
                                    <option value={editingRecord.tipoOT}>{editingRecord.tipoOT}</option>
                                  )}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={editingRecord.tipoOT}
                                  onChange={(e) => handleCambiarTipoOT(e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none"
                                />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 2. OPERARIOS Y HORARIOS (INICIO, FIN, COMIDA) */}
                        <div className="space-y-3 bg-white p-3.5 rounded-xl border border-sky-200 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                              2. Operarios Participantes & Horarios
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Total: {(editingRecord.tiemposOperarios || []).length} operarios
                            </span>
                          </div>

                          <div className="space-y-2.5">
                            {(editingRecord.tiemposOperarios || []).map((t, opIdx) => {
                              const times = validateWorkTimes(t.horaInicio, t.horaFin);
                              const isInvalid = !times.isValid;

                              return (
                                <div
                                  key={opIdx}
                                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                                      <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[10px] flex items-center justify-center">
                                        {opIdx + 1}
                                      </span>
                                      <span>{t.operario}</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveOperario(opIdx)}
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                                      title="Quitar operario de la OT"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                        Hora Inicio:
                                      </label>
                                      <input
                                        type="time"
                                        value={t.horaInicio || '00:00'}
                                        onChange={(e) => handleUpdateOperarioTiempo(opIdx, 'horaInicio', e.target.value)}
                                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                        Hora Fin:
                                      </label>
                                      <input
                                        type="time"
                                        value={t.horaFin || '00:00'}
                                        onChange={(e) => handleUpdateOperarioTiempo(opIdx, 'horaFin', e.target.value)}
                                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                        Tiempo Comida:
                                      </label>
                                      <select
                                        value={t.tiempoComidaMinutos}
                                        onChange={(e) => handleUpdateOperarioTiempo(opIdx, 'tiempoComidaMinutos', parseInt(e.target.value, 10))}
                                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                                      >
                                        <option value={0}>0 minutos</option>
                                        <option value={30}>30 minutos</option>
                                        <option value={60}>60 minutos</option>
                                        <option value={90}>90 minutos</option>
                                      </select>
                                    </div>
                                  </div>

                                  {isInvalid && (
                                    <div className="text-[11px] font-bold text-rose-600">
                                      {times.errorMsg}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Añadir otro operario a esta OT */}
                          <div className="pt-2 flex gap-2 items-center">
                            {masterData?.operarios ? (
                              <select
                                value={newOperarioToAdd}
                                onChange={(e) => setNewOperarioToAdd(e.target.value)}
                                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                              >
                                <option value="">Seleccionar operario para añadir...</option>
                                {masterData.operarios
                                  .filter((op) => !(editingRecord.tiemposOperarios || []).some((t) => t.operario === op))
                                  .map((op) => (
                                    <option key={op} value={op}>{op}</option>
                                  ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                placeholder="Nombre operario..."
                                value={newOperarioToAdd}
                                onChange={(e) => setNewOperarioToAdd(e.target.value)}
                                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                              />
                            )}
                            <button
                              type="button"
                              onClick={handleAddOperarioToRecord}
                              disabled={!newOperarioToAdd.trim()}
                              className="px-3 py-1.5 bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Añadir Operario</span>
                            </button>
                          </div>
                        </div>

                        {/* 3. TAREAS REALIZADAS Y PORCENTAJES */}
                        <div className="space-y-3 bg-white p-3.5 rounded-xl border border-sky-200 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                              3. Tareas Realizadas y Porcentajes
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Total: {(editingRecord.tareas || []).length} tareas
                            </span>
                          </div>

                          <div className="space-y-2">
                            {(editingRecord.tareas || []).map((tareaItem, tIdx) => {
                              const participatingOps = (editingRecord.tiemposOperarios || []).map((t) => t.operario);

                              return (
                                <div
                                  key={tIdx}
                                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-slate-900 text-xs">
                                      {tareaItem.tarea}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveTask(tIdx)}
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md shrink-0"
                                      title="Quitar tarea"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {/* Botones de porcentaje */}
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                                      Porcentaje completado:
                                    </label>
                                    <div className="grid grid-cols-5 gap-1">
                                      {(['0 %', '25 %', '50 %', '75 %', '100 %'] as const).map((pct) => (
                                        <button
                                          key={pct}
                                          type="button"
                                          onClick={() => handleUpdateTaskPercentage(tIdx, pct)}
                                          className={`py-1 rounded-lg text-xs font-bold transition-colors ${
                                            tareaItem.porcentaje === pct
                                              ? 'bg-sky-700 text-white shadow-xs'
                                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                          }`}
                                        >
                                          {pct}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Operarios asignados a la tarea */}
                                  {participatingOps.length > 0 && (
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                                        Operarios que realizaron esta tarea:
                                      </label>
                                      <div className="flex flex-wrap gap-1.5">
                                        {participatingOps.map((op) => {
                                          const isAssigned = (tareaItem.operariosAsignados || []).includes(op);
                                          return (
                                            <button
                                              key={op}
                                              type="button"
                                              onClick={() => handleToggleTaskOperario(tIdx, op)}
                                              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-colors ${
                                                isAssigned
                                                  ? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-bold'
                                                  : 'bg-white border-slate-200 text-slate-500'
                                              }`}
                                            >
                                              {isAssigned ? '✓ ' : '+ '}{op}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Añadir nueva tarea */}
                          <div className="pt-2 flex gap-2 items-center">
                            <input
                              type="text"
                              placeholder="Escribir nueva tarea..."
                              value={newTareaText}
                              onChange={(e) => setNewTareaText(e.target.value)}
                              className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                            />
                            <button
                              type="button"
                              onClick={handleAddNewTask}
                              disabled={!newTareaText.trim()}
                              className="px-3 py-1.5 bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Añadir Tarea</span>
                            </button>
                          </div>
                        </div>

                        {/* 4. EXTRAWORKS / WAITING TIME / RETRABAJOS */}
                        <div className="space-y-3 bg-white p-3.5 rounded-xl border border-sky-200 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                              4. Extrawork, Waiting Time o Retrabajos
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Total: {(editingRecord.extraworks || []).length}
                            </span>
                          </div>

                          <div className="space-y-2">
                            {(editingRecord.extraworks || []).map((ew, ewIdx) => {
                              const isBeingEdited = editingExtraWorkIndex === ewIdx;
                              return (
                                <div
                                  key={ew.id || ewIdx}
                                  className={`p-3 rounded-xl border transition-all space-y-1.5 ${
                                    isBeingEdited 
                                      ? 'bg-amber-100 border-amber-500 shadow-sm ring-2 ring-amber-400/50' 
                                      : 'bg-amber-50/70 border-amber-200 text-amber-950'
                                  }`}
                                >
                                  <div className="flex items-center justify-between font-bold">
                                    <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded text-[10px] tracking-wide font-black">
                                      {ew.tipo}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-xs font-semibold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded">
                                        {ew.tiempoTotalHoras}h totales
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleStartEditExtraWork(ewIdx)}
                                        className={`p-1.5 rounded-md transition-colors ${
                                          isBeingEdited
                                            ? 'bg-amber-600 text-white shadow-xs'
                                            : 'text-slate-500 hover:text-amber-800 hover:bg-amber-200/60'
                                        }`}
                                        title="Editar este extrawork"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveExtraWork(ewIdx)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                        title="Quitar extrawork"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="font-medium text-xs text-slate-800">
                                    {ew.motivo}
                                  </div>
                                  <div className="text-[11px] text-amber-800 font-medium">
                                    {ew.numOperarios} operarios × {ew.tiempoInvertidoHoras} horas invertidas
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Formulario para Añadir o Modificar Extrawork */}
                          <div className={`p-3 rounded-xl border space-y-2 transition-all ${
                            editingExtraWorkIndex !== null 
                              ? 'bg-amber-50/90 border-amber-400 shadow-sm' 
                              : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                                {editingExtraWorkIndex !== null 
                                  ? `Modificando Extrawork #${editingExtraWorkIndex + 1}:` 
                                  : 'Añadir Extrawork a esta OT:'}
                              </span>
                              {editingExtraWorkIndex !== null && (
                                <button
                                  type="button"
                                  onClick={handleCancelEditExtraWork}
                                  className="text-[10px] text-slate-500 hover:text-slate-800 font-semibold px-2 py-0.5 bg-slate-200 hover:bg-slate-300 rounded"
                                >
                                  Cancelar Edición
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-600">Tipo:</label>
                                <select
                                  value={newExtraTipo}
                                  onChange={(e) => setNewExtraTipo(e.target.value as ExtraWorkTipo)}
                                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold"
                                >
                                  <option value="EXTRAWORK">EXTRAWORK</option>
                                  <option value="WAITING TIME">WAITING TIME</option>
                                  <option value="RETRABAJO">RETRABAJO</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-slate-600">Nº Operarios:</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={newExtraNumOp}
                                  onChange={(e) => setNewExtraNumOp(e.target.value)}
                                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-slate-600">Tiempo Invertido (h):</label>
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  value={newExtraHoras}
                                  onChange={(e) => setNewExtraHoras(e.target.value)}
                                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600">Trabajo realizado / motivo:</label>
                              <input
                                type="text"
                                placeholder="Escribe el motivo del extrawork, parada o retrabajo..."
                                value={newExtraMotivo}
                                onChange={(e) => setNewExtraMotivo(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                              />
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={handleSaveExtraWork}
                                disabled={!newExtraMotivo.trim()}
                                className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs"
                              >
                                {editingExtraWorkIndex !== null ? 'GUARDAR CAMBIOS DEL EXTRAWORK' : 'AÑADIR EXTRAWORK'}
                              </button>
                              {editingExtraWorkIndex !== null && (
                                <button
                                  type="button"
                                  onClick={handleCancelEditExtraWork}
                                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs"
                                >
                                  Cancelar
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 5. MATERIAL ROTO O FALTANTE */}
                        <div className="space-y-2 bg-white p-3.5 rounded-xl border border-sky-200 shadow-2xs">
                          <label className="block font-bold text-slate-700 mb-1">Material Roto o Faltante:</label>
                          <div className="flex gap-2 items-center mb-1.5">
                            <label className="flex items-center gap-1">
                              <input
                                type="radio"
                                checked={editingRecord.materialRotoFaltante?.hubo === true}
                                onChange={() => setEditingRecord({
                                  ...editingRecord,
                                  materialRotoFaltante: { ...editingRecord.materialRotoFaltante, hubo: true }
                                })}
                              />
                              <span>SÍ</span>
                            </label>
                            <label className="flex items-center gap-1 ml-3">
                              <input
                                type="radio"
                                checked={!editingRecord.materialRotoFaltante?.hubo}
                                onChange={() => setEditingRecord({
                                  ...editingRecord,
                                  materialRotoFaltante: { hubo: false, detalle: '' }
                                })}
                              />
                              <span>NO</span>
                            </label>
                          </div>
                          {editingRecord.materialRotoFaltante?.hubo && (
                            <textarea
                              rows={2}
                              value={editingRecord.materialRotoFaltante.detalle}
                              onChange={(e) => setEditingRecord({
                                ...editingRecord,
                                materialRotoFaltante: { ...editingRecord.materialRotoFaltante, detalle: e.target.value }
                              })}
                              placeholder="Detalla el material roto o faltante..."
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                            />
                          )}
                        </div>

                        {/* 6. OBSERVACIONES */}
                        <div className="space-y-2 bg-white p-3.5 rounded-xl border border-sky-200 shadow-2xs">
                          <label className="block font-bold text-slate-700 mb-1">Observaciones:</label>
                          <div className="flex gap-2 items-center mb-1.5">
                            <label className="flex items-center gap-1">
                              <input
                                type="radio"
                                checked={editingRecord.observaciones?.hubo === true}
                                onChange={() => setEditingRecord({
                                  ...editingRecord,
                                  observaciones: { ...editingRecord.observaciones, hubo: true }
                                })}
                              />
                              <span>SÍ</span>
                            </label>
                            <label className="flex items-center gap-1 ml-3">
                              <input
                                type="radio"
                                checked={!editingRecord.observaciones?.hubo}
                                onChange={() => setEditingRecord({
                                  ...editingRecord,
                                  observaciones: { hubo: false, detalle: '' }
                                })}
                              />
                              <span>NO</span>
                            </label>
                          </div>
                          {editingRecord.observaciones?.hubo && (
                            <textarea
                              rows={2}
                              value={editingRecord.observaciones.detalle}
                              onChange={(e) => setEditingRecord({
                                ...editingRecord,
                                observaciones: { ...editingRecord.observaciones, detalle: e.target.value }
                              })}
                              placeholder="Escribe las observaciones..."
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                            />
                          )}
                        </div>

                        {/* Botones de acción de edición */}
                        <div className="flex gap-2 pt-2 border-t border-sky-200">
                          <button
                            type="button"
                            onClick={handleSaveEditedRecord}
                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-sm"
                          >
                            <Check className="w-5 h-5" />
                            <span>GUARDAR CAMBIOS DE LA OT</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRecord(null);
                              setEditError(null);
                            }}
                            className="px-5 py-3 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-sm"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Vista de lectura detallada */
                      <>
                        {/* Operarios y horarios */}
                        <div>
                          <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                            Equipo & Horarios Registrados:
                          </span>
                          <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                            {(r.tiemposOperarios || []).map((t, idx) => (
                              <div key={idx} className="flex items-center justify-between text-slate-700">
                                <span className="font-semibold text-slate-900">• {t.operario}</span>
                                <span className="font-mono text-slate-600">
                                  Inicio: <strong>{t.horaInicio}</strong> | Fin: <strong>{t.horaFin}</strong> | Comida: <strong>{t.tiempoComidaMinutos} min</strong>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Tareas Realizadas y % */}
                        <div>
                          <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                            Tareas ({r.tipoOT}):
                          </span>
                          <div className="space-y-1.5">
                            {(r.tareas || []).map((t, idx) => (
                              <div key={idx} className="p-2 rounded-lg bg-sky-50/60 border border-sky-100 flex flex-col gap-1">
                                <div className="flex items-center justify-between font-medium text-slate-800">
                                  <span>{t.tarea}</span>
                                  <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                                    t.porcentaje === '100 %' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-200 text-sky-900'
                                  }`}>
                                    {t.porcentaje}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  Realizada por: <strong>{(t.operariosAsignados || []).join(', ') || 'No especificado'}</strong>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Extrawork / Waiting Time / Retrabajos */}
                        {r.extraworks && r.extraworks.length > 0 && (
                          <div>
                            <span className="font-bold text-amber-800 uppercase tracking-wider block mb-1.5">
                              Extraworks / Waiting Time / Retrabajos:
                            </span>
                            <div className="space-y-1.5">
                              {r.extraworks.map((ew, idx) => (
                                <div key={idx} className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-950">
                                  <div className="flex items-center justify-between font-bold">
                                    <span className="bg-amber-200/80 px-2 py-0.5 rounded text-[11px]">{ew.tipo}</span>
                                    <span>Total: {ew.tiempoTotalHoras} horas</span>
                                  </div>
                                  <p className="mt-1 font-medium">{ew.motivo}</p>
                                  <div className="text-[11px] text-amber-800 mt-0.5">
                                    {ew.numOperarios} operarios × {ew.tiempoInvertidoHoras} horas invertidas
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Material roto */}
                        {r.materialRotoFaltante?.hubo && (
                          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-950">
                            <span className="font-bold text-rose-800 block text-[11px] uppercase tracking-wider">
                              Material Roto o Faltante:
                            </span>
                            <p className="mt-0.5">{r.materialRotoFaltante.detalle}</p>
                          </div>
                        )}

                        {/* Observaciones */}
                        {r.observaciones?.hubo && (
                          <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-800">
                            <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                              Observaciones:
                            </span>
                            <p className="mt-0.5">{r.observaciones.detalle}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Botones de acción al pie de página */}
      <div className="pt-4 space-y-3">
        {/* Opción 2: GUARDAR CAMBIOS (Nube y Google Sheet) */}
        <button
          type="button"
          id="btn-guardar-cambios-ver-registros"
          onClick={handleGuardarCambios}
          disabled={isSavingChanges}
          className="w-full py-4 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm sm:text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 border border-slate-700 active:scale-[0.99]"
        >
          <Save className="w-5 h-5 text-sky-400" />
          <span>{isSavingChanges ? 'GUARDANDO Y SINCRONIZANDO...' : '2. GUARDAR CAMBIOS (NUBE & GOOGLE SHEET)'}</span>
        </button>

        {/* Opción 1: VOLVER ATRÁS */}
        <button
          type="button"
          id="btn-volver-atras-ver-registros"
          onClick={onBack}
          className="w-full py-3.5 px-6 bg-white hover:bg-slate-100 text-slate-700 rounded-2xl font-bold text-sm border-2 border-slate-300 transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>1. VOLVER ATRÁS</span>
        </button>
      </div>

      {/* Modal de confirmación de borrado de registro */}
      {recordToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">¿Eliminar registro OT?</h3>
                <span className="text-xs text-slate-500 font-medium">Esta acción no se puede deshacer</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <div>OT realizada por: <strong>{recordToDelete.quienRealiza}</strong></div>
              <div>Fecha: <strong>{recordToDelete.fechaTrabajos}</strong></div>
              <div>Aerogenerador: <strong>{recordToDelete.donde || recordToDelete.aerogenerador}</strong></div>
              <div>Tipo: <strong>{recordToDelete.tipoOT}</strong></div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                id="btn-cancelar-borrar-registro"
                onClick={() => setRecordToDelete(null)}
                className="flex-1 py-2.5 px-3 border border-slate-300 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="btn-confirmar-borrar-registro"
                onClick={async () => {
                  await onDeleteRecord(recordToDelete.id);
                  setRecordToDelete(null);
                }}
                className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
