import React, { useState } from 'react';
import { MasterData } from '../../types';
import { 
  Users, 
  Wind, 
  FolderKanban, 
  CheckSquare, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  ArrowLeft,
  Home,
  Save
} from 'lucide-react';

interface DatosObraViewProps {
  masterData: MasterData;
  onUpdateMasterData: (updated: MasterData) => void;
  onBackToAdminMenu: () => void;
  onBackToHome: () => void;
}

type TabType = 'operarios' | 'aerogeneradores' | 'tiposOT' | 'tareasPorOT';

export const DatosObraView: React.FC<DatosObraViewProps> = ({
  masterData,
  onUpdateMasterData,
  onBackToAdminMenu,
  onBackToHome
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('operarios');
  const [newItemText, setNewItemText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  // For Tareas por OT
  const [selectedTipoOT, setSelectedTipoOT] = useState<string>(
    masterData.tiposOT[0] || ''
  );
  const [newTareaText, setNewTareaText] = useState('');
  const [editingTareaIndex, setEditingTareaIndex] = useState<number | null>(null);
  const [editingTareaText, setEditingTareaText] = useState('');

  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'category' | 'tarea';
    category?: 'operarios' | 'aerogeneradores' | 'tiposOT';
    index: number;
    name: string;
  } | null>(null);

  const showSavedBadge = () => {
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 2000);
  };

  const showValidationWarning = (msg: string) => {
    setValidationMsg(msg);
    setTimeout(() => setValidationMsg(null), 3500);
  };

  // Handlers for Simple Lists (Operarios, Aerogenerador, Tipo OT)
  const handleAddItem = (category: 'operarios' | 'aerogeneradores' | 'tiposOT') => {
    const trimmed = newItemText.trim();
    if (!trimmed) return;
    if (masterData[category].includes(trimmed)) {
      showValidationWarning('Ese registro ya existe en el listado.');
      return;
    }

    const updated = {
      ...masterData,
      [category]: [...masterData[category], trimmed],
      // If adding a Tipo de OT, initialize its empty task list
      tareasPorOT:
        category === 'tiposOT'
          ? { ...masterData.tareasPorOT, [trimmed]: masterData.tareasPorOT[trimmed] || [] }
          : masterData.tareasPorOT
    };

    onUpdateMasterData(updated);
    setNewItemText('');
    showSavedBadge();
  };

  const handleEditItem = (category: 'operarios' | 'aerogeneradores' | 'tiposOT', index: number) => {
    const trimmed = editingText.trim();
    if (!trimmed) return;

    const oldName = masterData[category][index];
    const updatedList = [...masterData[category]];
    updatedList[index] = trimmed;

    let updatedTareas = masterData.tareasPorOT;
    if (category === 'tiposOT') {
      const existingTareas = updatedTareas[oldName] || [];
      const { [oldName]: _, ...rest } = updatedTareas;
      updatedTareas = { ...rest, [trimmed]: existingTareas };
      if (selectedTipoOT === oldName) {
        setSelectedTipoOT(trimmed);
      }
    }

    const updated = {
      ...masterData,
      [category]: updatedList,
      tareasPorOT: updatedTareas
    };

    onUpdateMasterData(updated);
    setEditingIndex(null);
    setEditingText('');
    showSavedBadge();
  };

  const requestDeleteItem = (category: 'operarios' | 'aerogeneradores' | 'tiposOT', index: number) => {
    const itemToDelete = masterData[category][index];
    setDeleteConfirm({
      type: 'category',
      category,
      index,
      name: itemToDelete
    });
  };

  const confirmDeleteItem = (category: 'operarios' | 'aerogeneradores' | 'tiposOT', index: number) => {
    const itemToDelete = masterData[category][index];
    const updatedList = masterData[category].filter((_, i) => i !== index);

    let updatedTareas = masterData.tareasPorOT;
    if (category === 'tiposOT') {
      const { [itemToDelete]: _, ...rest } = updatedTareas;
      updatedTareas = rest;
      if (selectedTipoOT === itemToDelete) {
        setSelectedTipoOT(updatedList[0] || '');
      }
    }

    const updated = {
      ...masterData,
      [category]: updatedList,
      tareasPorOT: updatedTareas
    };

    onUpdateMasterData(updated);
    setDeleteConfirm(null);
    showSavedBadge();
  };

  // Handlers for Tareas por OT
  const handleAddTarea = () => {
    const trimmed = newTareaText.trim();
    if (!trimmed || !selectedTipoOT) return;

    const currentTareas = masterData.tareasPorOT[selectedTipoOT] || [];
    if (currentTareas.includes(trimmed)) {
      showValidationWarning('Esta tarea ya existe para este Tipo de OT.');
      return;
    }

    const updated = {
      ...masterData,
      tareasPorOT: {
        ...masterData.tareasPorOT,
        [selectedTipoOT]: [...currentTareas, trimmed]
      }
    };

    onUpdateMasterData(updated);
    setNewTareaText('');
    showSavedBadge();
  };

  const handleEditTarea = (index: number) => {
    const trimmed = editingTareaText.trim();
    if (!trimmed || !selectedTipoOT) return;

    const currentTareas = [...(masterData.tareasPorOT[selectedTipoOT] || [])];
    currentTareas[index] = trimmed;

    const updated = {
      ...masterData,
      tareasPorOT: {
        ...masterData.tareasPorOT,
        [selectedTipoOT]: currentTareas
      }
    };

    onUpdateMasterData(updated);
    setEditingTareaIndex(null);
    setEditingTareaText('');
    showSavedBadge();
  };

  const requestDeleteTarea = (index: number) => {
    if (!selectedTipoOT) return;
    const tarea = (masterData.tareasPorOT[selectedTipoOT] || [])[index];
    setDeleteConfirm({
      type: 'tarea',
      index,
      name: tarea
    });
  };

  const confirmDeleteTarea = (index: number) => {
    if (!selectedTipoOT) return;
    const currentTareas = (masterData.tareasPorOT[selectedTipoOT] || []).filter((_, i) => i !== index);

    const updated = {
      ...masterData,
      tareasPorOT: {
        ...masterData.tareasPorOT,
        [selectedTipoOT]: currentTareas
      }
    };

    onUpdateMasterData(updated);
    setDeleteConfirm(null);
    showSavedBadge();
  };

  const renderSimpleManager = (
    title: string,
    category: 'operarios' | 'aerogeneradores' | 'tiposOT',
    placeholder: string
  ) => {
    const list = masterData[category] || [];

    return (
      <div className="space-y-4">
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5">
          <p className="text-xs text-sky-900 font-medium leading-relaxed">
            Puedes agregar nuevos registros, editarlos pulsando sobre ellos o eliminarlos. Se guardarán en la nube para que aparezcan en las OTs de todos los operarios.
          </p>
        </div>

        {/* Formulario Agregar */}
        <div className="flex gap-2">
          <input
            type="text"
            id={`new-${category}-input`}
            placeholder={placeholder}
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddItem(category);
              }
            }}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500 bg-white"
          />
          <button
            type="button"
            id={`add-${category}-btn`}
            onClick={() => handleAddItem(category)}
            disabled={!newItemText.trim()}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir</span>
          </button>
        </div>

        {/* Listado */}
        <div className="space-y-2">
          {list.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
              No hay registros todavía. Añade el primero arriba.
            </div>
          ) : (
            list.map((item, index) => {
              const isEditing = editingIndex === index;
              return (
                <div
                  key={`${item}-${index}`}
                  className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-2 hover:border-sky-300 transition-colors"
                >
                  {isEditing ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm border border-sky-400 rounded-lg focus:outline-hidden ring-1 ring-sky-400"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleEditItem(category, index)}
                        className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                        title="Guardar cambio"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingIndex(null);
                          setEditingText('');
                        }}
                        className="p-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                        title="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-slate-800 flex-1 truncate">
                        {item}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingIndex(index);
                            setEditingText(item);
                          }}
                          className="p-2 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => requestDeleteItem(category, index)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Borrar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderTareasPorOT = () => {
    const tareas = selectedTipoOT ? masterData.tareasPorOT[selectedTipoOT] || [] : [];

    return (
      <div className="space-y-4">
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5">
          <p className="text-xs text-sky-900 font-medium leading-relaxed">
            Elige un <strong>TIPO DE OT</strong> para ver, agregar, editar o borrar todas las tareas que contenga.
          </p>
        </div>

        {/* Selector de Tipo de OT */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Seleccionar Tipo de OT:
          </label>
          <select
            id="admin-select-tipo-ot-for-tareas"
            value={selectedTipoOT}
            onChange={(e) => {
              setSelectedTipoOT(e.target.value);
              setEditingTareaIndex(null);
            }}
            className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
          >
            {masterData.tiposOT.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo} ({(masterData.tareasPorOT[tipo] || []).length} tareas)
              </option>
            ))}
          </select>
        </div>

        {/* Agregar nueva tarea para este Tipo de OT */}
        {selectedTipoOT ? (
          <div className="space-y-3 pt-1">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Nueva tarea para «{selectedTipoOT}»:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="new-tarea-text-input"
                placeholder="Escribe el nombre de la tarea..."
                value={newTareaText}
                onChange={(e) => setNewTareaText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTarea();
                  }
                }}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500 bg-white"
              />
              <button
                type="button"
                id="add-tarea-btn"
                onClick={handleAddTarea}
                disabled={!newTareaText.trim()}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir</span>
              </button>
            </div>

            {/* Listado de tareas */}
            <div className="space-y-2 pt-2">
              {tareas.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                  No hay tareas registradas para este tipo de OT.
                </div>
              ) : (
                tareas.map((tarea, index) => {
                  const isEditing = editingTareaIndex === index;
                  return (
                    <div
                      key={`${tarea}-${index}`}
                      className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-2 hover:border-sky-300 transition-colors"
                    >
                      {isEditing ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editingTareaText}
                            onChange={(e) => setEditingTareaText(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-sm border border-sky-400 rounded-lg focus:outline-hidden ring-1 ring-sky-400"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleEditTarea(index)}
                            className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                            title="Guardar cambio"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTareaIndex(null);
                              setEditingTareaText('');
                            }}
                            className="p-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="w-6 h-6 rounded-md bg-sky-100 text-sky-800 text-xs font-bold flex items-center justify-center shrink-0">
                              {index + 1}
                            </span>
                            <span className="text-sm font-medium text-slate-800 truncate">
                              {tarea}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTareaIndex(index);
                                setEditingTareaText(tarea);
                              }}
                              className="p-2 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => requestDeleteTarea(index)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Borrar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500 text-sm">
            Primero debes registrar algún Tipo de OT.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      {/* Cabecera de sección */}
      <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded-md border border-sky-200">
              Administración
            </span>
            {saveSuccessNotice && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 animate-pulse">
                ✓ Guardado en nube
              </span>
            )}
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1">DATOS DE LA OBRA</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestión centralizada de operarios, aerogeneradores, tipos y tareas
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToAdminMenu}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Menú Admin</span>
        </button>
      </div>

      {/* Selector de pestañas / 4 opciones requeridas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          type="button"
          id="tab-operarios"
          onClick={() => {
            setActiveTab('operarios');
            setEditingIndex(null);
          }}
          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
            activeTab === 'operarios'
              ? 'bg-sky-600 border-sky-600 text-white shadow-md'
              : 'bg-white border-slate-200 text-slate-700 hover:border-sky-300'
          }`}
        >
          <Users className={`w-5 h-5 mb-2 ${activeTab === 'operarios' ? 'text-white' : 'text-sky-600'}`} />
          <div>
            <div className="text-xs font-bold leading-tight">1. OPERARIOS</div>
            <div className={`text-xs mt-0.5 ${activeTab === 'operarios' ? 'text-sky-100' : 'text-slate-400'}`}>
              {masterData.operarios.length} registrados
            </div>
          </div>
        </button>

        <button
          type="button"
          id="tab-aerogenerador"
          onClick={() => {
            setActiveTab('aerogeneradores');
            setEditingIndex(null);
          }}
          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
            activeTab === 'aerogeneradores'
              ? 'bg-sky-600 border-sky-600 text-white shadow-md'
              : 'bg-white border-slate-200 text-slate-700 hover:border-sky-300'
          }`}
        >
          <Wind className={`w-5 h-5 mb-2 ${activeTab === 'aerogeneradores' ? 'text-white' : 'text-sky-600'}`} />
          <div>
            <div className="text-xs font-bold leading-tight">2. AEROGENERADOR</div>
            <div className={`text-xs mt-0.5 ${activeTab === 'aerogeneradores' ? 'text-sky-100' : 'text-slate-400'}`}>
              {masterData.aerogeneradores.length} registrados
            </div>
          </div>
        </button>

        <button
          type="button"
          id="tab-tipo-ot"
          onClick={() => {
            setActiveTab('tiposOT');
            setEditingIndex(null);
          }}
          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
            activeTab === 'tiposOT'
              ? 'bg-sky-600 border-sky-600 text-white shadow-md'
              : 'bg-white border-slate-200 text-slate-700 hover:border-sky-300'
          }`}
        >
          <FolderKanban className={`w-5 h-5 mb-2 ${activeTab === 'tiposOT' ? 'text-white' : 'text-sky-600'}`} />
          <div>
            <div className="text-xs font-bold leading-tight">3. TIPO DE OT</div>
            <div className={`text-xs mt-0.5 ${activeTab === 'tiposOT' ? 'text-sky-100' : 'text-slate-400'}`}>
              {masterData.tiposOT.length} tipos
            </div>
          </div>
        </button>

        <button
          type="button"
          id="tab-tareas-por-ot"
          onClick={() => {
            setActiveTab('tareasPorOT');
            setEditingIndex(null);
          }}
          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
            activeTab === 'tareasPorOT'
              ? 'bg-sky-600 border-sky-600 text-white shadow-md'
              : 'bg-white border-slate-200 text-slate-700 hover:border-sky-300'
          }`}
        >
          <CheckSquare className={`w-5 h-5 mb-2 ${activeTab === 'tareasPorOT' ? 'text-white' : 'text-sky-600'}`} />
          <div>
            <div className="text-xs font-bold leading-tight">4. TAREAS POR OT</div>
            <div className={`text-xs mt-0.5 ${activeTab === 'tareasPorOT' ? 'text-sky-100' : 'text-slate-400'}`}>
              Por cada Tipo
            </div>
          </div>
        </button>
      </div>

      {/* Contenido de la pestaña activa */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
        {activeTab === 'operarios' &&
          renderSimpleManager('Operarios', 'operarios', 'Nombre del nuevo operario...')}

        {activeTab === 'aerogeneradores' &&
          renderSimpleManager(
            'Aerogeneradores',
            'aerogeneradores',
            'Ej: WTG-07 (Parque Eólico...)'
          )}

        {activeTab === 'tiposOT' &&
          renderSimpleManager('Tipos de OT', 'tiposOT', 'Ej: Mantenimiento Especial...')}

        {activeTab === 'tareasPorOT' && renderTareasPorOT()}
      </div>

      {/* 5. VOLVER A PANTALLA PRINCIPAL */}
      <div className="pt-2">
        <button
          type="button"
          id="btn-volver-pantalla-principal-desde-datos-obra"
          onClick={onBackToHome}
          className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
        >
          <Home className="w-4 h-4 text-sky-400" />
          <span>5. VOLVER A PANTALLA PRINCIPAL</span>
        </button>
      </div>

      {/* Alerta de validación en pantalla */}
      {validationMsg && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-amber-800 text-amber-50 px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold border border-amber-600 flex items-center gap-2">
          <span>{validationMsg}</span>
          <button
            type="button"
            onClick={() => setValidationMsg(null)}
            className="p-1 hover:bg-amber-700 rounded-md"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Modal de confirmación de borrado */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">¿Eliminar registro?</h3>
                <span className="text-xs text-slate-500 font-medium">Esta acción no se puede deshacer</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <div>Elemento a eliminar:</div>
              <div className="font-bold text-slate-900 text-sm break-words">
                "{deleteConfirm.name}"
              </div>
              {deleteConfirm.category === 'tiposOT' && (
                <div className="text-rose-600 font-semibold pt-1">
                  Aviso: Se eliminarán también todas las tareas asociadas a este Tipo de OT.
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                id="btn-cancelar-borrado-modal"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 px-3 border border-slate-300 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="btn-confirmar-borrado-modal"
                onClick={() => {
                  if (deleteConfirm.type === 'category' && deleteConfirm.category) {
                    confirmDeleteItem(deleteConfirm.category, deleteConfirm.index);
                  } else if (deleteConfirm.type === 'tarea') {
                    confirmDeleteTarea(deleteConfirm.index);
                  }
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
