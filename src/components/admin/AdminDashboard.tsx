import React from 'react';
import { 
  Building2, 
  FileText, 
  Sheet, 
  ArrowLeft, 
  Home, 
  ShieldCheck, 
  Users, 
  Wind, 
  Layers 
} from 'lucide-react';
import { MasterData, OTRecord } from '../../types';

interface AdminDashboardProps {
  masterData: MasterData;
  records: OTRecord[];
  onSelectOption: (option: 'datos_obra' | 'ver_registros' | 'google_sheet') => void;
  onBackToHome: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  masterData,
  records,
  onSelectOption,
  onBackToHome
}) => {
  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      {/* Tarjeta de Bienvenida Admin */}
      <div className="bg-gradient-to-r from-slate-900 to-sky-950 text-white rounded-2xl p-5 shadow-lg border border-sky-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-sky-300">
                Panel de Control
              </div>
              <h2 className="text-lg font-extrabold text-white">ADMINISTRACIÓN</h2>
            </div>
          </div>
          <button
            type="button"
            id="admin-menu-back-to-home"
            onClick={onBackToHome}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
          >
            <Home className="w-3.5 h-3.5 text-sky-300" />
            <span>Inicio</span>
          </button>
        </div>

        {/* Resumen rápido de datos en la nube */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/10 text-center">
          <div className="bg-white/5 rounded-xl py-2 px-1">
            <div className="text-base font-extrabold text-sky-300">{records.length}</div>
            <div className="text-[10px] text-slate-300 font-medium">OTs registradas</div>
          </div>
          <div className="bg-white/5 rounded-xl py-2 px-1">
            <div className="text-base font-extrabold text-sky-300">{masterData.operarios.length}</div>
            <div className="text-[10px] text-slate-300 font-medium">Operarios</div>
          </div>
          <div className="bg-white/5 rounded-xl py-2 px-1">
            <div className="text-base font-extrabold text-sky-300">{masterData.aerogeneradores.length}</div>
            <div className="text-[10px] text-slate-300 font-medium">Aerogeneradores</div>
          </div>
        </div>
      </div>

      {/* Las 3 Opciones Principales de Administración */}
      <div className="space-y-3.5">
        {/* Opción 1: DATOS DE LA OBRA */}
        <button
          type="button"
          id="btn-admin-datos-de-la-obra"
          onClick={() => onSelectOption('datos_obra')}
          className="w-full text-left bg-white hover:bg-sky-50/50 p-5 rounded-2xl border-2 border-slate-200 hover:border-sky-500 shadow-xs hover:shadow-md transition-all group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base group-hover:text-sky-900">
                  DATOS DE LA OBRA
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Operarios, Aerogeneradores, Tipos de OT y Tareas
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded-md border border-sky-200 shrink-0">
              Configurar
            </span>
          </div>
        </button>

        {/* Opción 2: VER REGISTROS */}
        <button
          type="button"
          id="btn-admin-ver-registros"
          onClick={() => onSelectOption('ver_registros')}
          className="w-full text-left bg-white hover:bg-sky-50/50 p-5 rounded-2xl border-2 border-slate-200 hover:border-sky-500 shadow-xs hover:shadow-md transition-all group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base group-hover:text-indigo-900">
                  VER REGISTROS
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Consultar, editar o borrar OTs guardadas y guardar cambios
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-200 shrink-0">
              {records.length} Registros
            </span>
          </div>
        </button>

        {/* Opción 3: GUARDAR DATOS EN GOOGLE SHEET */}
        <button
          type="button"
          id="btn-admin-guardar-google-sheet"
          onClick={() => onSelectOption('google_sheet')}
          className="w-full text-left bg-white hover:bg-emerald-50/50 p-5 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 shadow-xs hover:shadow-md transition-all group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Sheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base group-hover:text-emerald-900">
                  GUARDAR DATOS EN GOOGLE SHEET
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Actualizar y sincronizar todos los partes en Google Sheets
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 shrink-0">
              Sincronizar
            </span>
          </div>
        </button>
      </div>

      {/* Botón Volver a Pantalla Principal */}
      <div className="pt-2">
        <button
          type="button"
          id="btn-volver-pantalla-principal"
          onClick={onBackToHome}
          className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-sky-400" />
          <span>VOLVER A PANTALLA PRINCIPAL</span>
        </button>
      </div>
    </div>
  );
};
