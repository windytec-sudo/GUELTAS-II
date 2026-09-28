import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { DatosObraView } from './components/admin/DatosObraView';
import { VerRegistrosView } from './components/admin/VerRegistrosView';
import { GoogleSheetSyncModal } from './components/admin/GoogleSheetSyncModal';
import { HorasOperariosView } from './components/HorasOperariosView';
import { OTWizard } from './components/wizard/OTWizard';
import { MasterData, OTRecord } from './types';
import { INITIAL_MASTER_DATA } from './data/initialData';
import { 
  fetchMasterData, 
  saveMasterData, 
  fetchRecords, 
  updateRecord, 
  deleteRecord 
} from './services/api';
import { validateFirebaseConnection } from './services/firebase';
import { PWAInstallPrompt } from './components/common/PWAInstallPrompt';
import { 
  ClipboardList, 
  ShieldCheck, 
  Wind, 
  CheckCircle2, 
  HardHat, 
  Layers, 
  Cloud,
  Clock
} from 'lucide-react';

type AppView = 
  | 'home' 
  | 'wizard' 
  | 'horas_operarios'
  | 'admin_menu' 
  | 'admin_datos_obra' 
  | 'admin_ver_registros' 
  | 'admin_google_sheet';

export default function App() {
  const [view, setView] = useState<AppView>('home');
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [masterData, setMasterData] = useState<MasterData>(INITIAL_MASTER_DATA);
  const [records, setRecords] = useState<OTRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial master data and records from cloud server (Firebase Firestore)
  useEffect(() => {
    async function loadData() {
      try {
        validateFirebaseConnection();
        const [loadedMaster, loadedRecords] = await Promise.all([
          fetchMasterData(),
          fetchRecords()
        ]);
        setMasterData(loadedMaster);
        setRecords(loadedRecords);
      } catch (err) {
        console.error('Error cargando datos:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleUpdateMasterData = async (updated: MasterData) => {
    setMasterData(updated);
    await saveMasterData(updated);
  };

  const handleUpdateRecord = async (updatedRecord: OTRecord) => {
    await updateRecord(updatedRecord);
    setRecords((prev) => prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r)));
  };

  const handleDeleteRecord = async (id: string) => {
    await deleteRecord(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const handleFinishWizard = async () => {
    const updatedRecords = await fetchRecords();
    setRecords(updatedRecords);
    setView('home');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Cabecera común requerida en todas las pantallas con nombre de empresa */}
      <Header
        subtitle="Ots de TRABAJO"
        showBack={view !== 'home'}
        onBack={() => {
          if (view === 'admin_datos_obra' || view === 'admin_ver_registros' || view === 'admin_google_sheet') {
            setView('admin_menu');
          } else {
            setView('home');
          }
        }}
      />

      <main className="flex-1 pb-10">
        {/* PANTALLA PRINCIPAL */}
        {view === 'home' && (
          <div className="max-w-xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-200">
            {/* Título de la Aplicación y Bienvenida */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold border border-sky-200">
                <Cloud className="w-3.5 h-3.5 text-sky-600" />
                <span>Almacenamiento Seguro en la Nube</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                Ots de TRABAJO
              </h1>
              <p className="text-sm font-semibold text-slate-600 max-w-sm mx-auto">
                Partes de trabajo diarios, control de tareas, operarios y tiempos en aerogeneradores.
              </p>
            </div>

            {/* LAS 2 OPCIONES PRINCIPALES REQUERIDAS EN EL PROMPT:
                1. “REALIZAR OT”
                2. “ENTRAR COMO ADMINISTRADOR”
            */}
            <div className="space-y-4 pt-2">
              {/* Instalación de la app independiente */}
              <PWAInstallPrompt />

              {/* Opción 1: REALIZAR OT */}
              <button
                type="button"
                id="btn-realizar-ot"
                onClick={() => setView('wizard')}
                className="w-full text-left bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-200 group flex items-center justify-between border border-sky-400/40"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform backdrop-blur-xs">
                    <ClipboardList className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-xs font-bold tracking-wider uppercase text-sky-200">
                      Acceso Operarios
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black leading-tight mt-0.5">
                      REALIZAR OT
                    </h2>
                    <p className="text-xs text-sky-100 mt-1 font-medium">
                      Cumplimentar nuevo parte de trabajo paso a paso
                    </p>
                  </div>
                </div>
              </button>

              {/* Opción 2: HORAS DE OPERARIOS */}
              <button
                type="button"
                id="btn-horas-operarios"
                onClick={() => setView('horas_operarios')}
                className="w-full text-left bg-white hover:bg-slate-50 text-slate-900 p-6 rounded-3xl shadow-md hover:shadow-lg transition-all duration-200 group flex items-center justify-between border-2 border-sky-200 hover:border-sky-500"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Clock className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-xs font-bold tracking-wider uppercase text-sky-700">
                      Control de Horas
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black leading-tight mt-0.5 text-slate-900">
                      HORAS DE OPERARIOS
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Tabla diaria de horas trabajadas por cada operario
                    </p>
                  </div>
                </div>
              </button>

              {/* Opción 3: ENTRAR COMO ADMINISTRADOR */}
              <button
                type="button"
                id="btn-entrar-como-administrador"
                onClick={() => setIsAdminLoginOpen(true)}
                className="w-full text-left bg-white hover:bg-slate-100 text-slate-900 p-6 rounded-3xl shadow-md hover:shadow-lg transition-all duration-200 group flex items-center justify-between border-2 border-slate-200 hover:border-slate-800"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-xs font-bold tracking-wider uppercase text-slate-500">
                      Dirección de Empresa
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black leading-tight mt-0.5 text-slate-900">
                      ENTRAR COMO ADMINISTRADOR
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Datos de la obra, registros guardados y Google Sheets
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* Pie de Pantalla Principal con Datos de Empresa */}
            <div className="pt-6 border-t border-slate-200 text-center space-y-1">
              <div className="font-extrabold text-slate-700 text-xs tracking-wider">
                S. E. WINDYTEC S. L.
              </div>
              <p className="text-[11px] text-slate-400">
                Sistema móvil para gestión de partes de trabajo (OTs)
              </p>
            </div>
          </div>
        )}

        {/* WIZARD DE 11 PANTALLAS PARA REALIZAR OT */}
        {view === 'wizard' && (
          <OTWizard
            masterData={masterData}
            onFinish={handleFinishWizard}
            onCancel={() => setView('home')}
          />
        )}

        {/* HORAS DE OPERARIOS */}
        {view === 'horas_operarios' && (
          <HorasOperariosView
            records={records}
            masterData={masterData}
            onBack={() => setView('home')}
          />
        )}

        {/* ADMINISTRACIÓN: MENÚ PRINCIPAL */}
        {view === 'admin_menu' && (
          <AdminDashboard
            masterData={masterData}
            records={records}
            onSelectOption={(opt) => {
              if (opt === 'datos_obra') setView('admin_datos_obra');
              if (opt === 'ver_registros') setView('admin_ver_registros');
              if (opt === 'google_sheet') setView('admin_google_sheet');
            }}
            onBackToHome={() => setView('home')}
          />
        )}

        {/* ADMINISTRACIÓN: DATOS DE LA OBRA */}
        {view === 'admin_datos_obra' && (
          <DatosObraView
            masterData={masterData}
            onUpdateMasterData={handleUpdateMasterData}
            onBackToAdminMenu={() => setView('admin_menu')}
            onBackToHome={() => setView('home')}
          />
        )}

        {/* ADMINISTRACIÓN: VER REGISTROS */}
        {view === 'admin_ver_registros' && (
          <VerRegistrosView
            records={records}
            masterData={masterData}
            onUpdateRecord={handleUpdateRecord}
            onDeleteRecord={handleDeleteRecord}
            onBack={() => setView('admin_menu')}
            onOpenGoogleSheetSync={() => setView('admin_google_sheet')}
          />
        )}

        {/* ADMINISTRACIÓN: GUARDAR DATOS EN GOOGLE SHEET */}
        {view === 'admin_google_sheet' && (
          <GoogleSheetSyncModal
            records={records}
            masterData={masterData}
            onUpdateMasterData={handleUpdateMasterData}
            onBack={() => setView('admin_menu')}
          />
        )}
      </main>

      {/* MODAL DE CONTRASEÑA ADMIN (2015) */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onSuccess={() => {
          setIsAdminLoginOpen(false);
          setView('admin_menu');
        }}
      />
    </div>
  );
}
