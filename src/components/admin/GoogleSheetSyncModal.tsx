import React, { useState, useMemo } from 'react';
import { OTRecord, MasterData } from '../../types';
import { 
  Sheet, 
  Download, 
  Copy, 
  CheckCircle2, 
  Link2, 
  ArrowLeft, 
  ExternalLink,
  Code,
  Layers,
  Clock,
  Briefcase,
  Sparkles,
  HelpCircle,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { 
  generateSheet1Data, 
  generateSheet2Data, 
  generateSheet3Data, 
  formatSheetToClipboard, 
  downloadSheetCSV,
  getGoogleAppsScriptCode 
} from '../../utils/googleSheets';
import { syncToGoogleSheet } from '../../services/api';

interface GoogleSheetSyncModalProps {
  records: OTRecord[];
  masterData: MasterData;
  onUpdateMasterData: (updated: MasterData) => void;
  onBack: () => void;
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  records,
  masterData,
  onUpdateMasterData,
  onBack
}) => {
  const [webhookUrl, setWebhookUrl] = useState(masterData.googleSheetWebhookUrl || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Tab state for preview: 'hoja1' | 'hoja2' | 'hoja3'
  const [activePreviewTab, setActivePreviewTab] = useState<'hoja1' | 'hoja2' | 'hoja3'>('hoja1');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Generate data for the 3 sheets
  const hoja1Data = useMemo(() => generateSheet1Data(records), [records]);
  const hoja2Data = useMemo(() => generateSheet2Data(records, masterData.operarios), [records, masterData.operarios]);
  const hoja3Data = useMemo(() => generateSheet3Data(records, masterData.tiposOT), [records, masterData.tiposOT]);

  const appsScriptCode = useMemo(() => getGoogleAppsScriptCode(), []);

  const handleSyncGoogleSheet = async () => {
    setIsSyncing(true);
    setSyncStatusMessage(null);
    try {
      const result = await syncToGoogleSheet(
        webhookUrl, 
        records, 
        masterData.operarios, 
        masterData.tiposOT
      );
      const updatedMaster = {
        ...masterData,
        googleSheetWebhookUrl: webhookUrl,
        ultimoSyncGoogleSheet: result.ultimoSync
      };
      onUpdateMasterData(updatedMaster);
      
      if (result.webhookResult?.ok) {
        setSyncStatusMessage({
          type: 'success',
          text: `¡Google Sheet sincronizado con éxito! (${result.totalRecords} OTs procesadas y actualizadas en las 3 hojas a las ${result.ultimoSync})`
        });
      } else if (result.webhookResult?.error) {
        setSyncStatusMessage({
          type: 'error',
          text: `Error de conexión con el Webhook de Google: ${result.webhookResult.error}. Revisa que la URL de Apps Script esté bien configurada con acceso a "Cualquier usuario".`
        });
      } else if (!webhookUrl) {
        setSyncStatusMessage({
          type: 'success',
          text: `Registros guardados en el sistema a las ${result.ultimoSync}. Para sincronizar directamente con tu hoja de Google, introduce la URL del Apps Script abajo.`
        });
      } else {
        setSyncStatusMessage({
          type: 'success',
          text: `Datos enviados al Webhook de Google Sheets correctamente a las ${result.ultimoSync}.`
        });
      }
    } catch (err: any) {
      setSyncStatusMessage({
        type: 'error',
        text: `Error al intentar sincronizar: ${err?.message || 'Error desconocido'}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopySheetClipboard = (tab: 'hoja1' | 'hoja2' | 'hoja3') => {
    let payload = hoja1Data;
    let label = 'Hoja 1 (Registros de OTs)';
    if (tab === 'hoja2') {
      payload = hoja2Data;
      label = 'Hoja 2 (Horas por Operario)';
    } else if (tab === 'hoja3') {
      payload = hoja3Data;
      label = 'Hoja 3 (Horas por Tipo de OT)';
    }

    const tsv = formatSheetToClipboard(payload);
    navigator.clipboard.writeText(tsv);
    setCopyFeedback(`¡${label} copiada! Ve a tu Google Sheet y pulsa Ctrl+V`);
    setTimeout(() => setCopyFeedback(null), 3500);
  };

  const handleDownloadSheetCSV = (tab: 'hoja1' | 'hoja2' | 'hoja3') => {
    const today = new Date().toISOString().slice(0, 10);
    if (tab === 'hoja1') {
      downloadSheetCSV(hoja1Data, `Windytec_Hoja1_RegistrosOT_${today}.csv`);
    } else if (tab === 'hoja2') {
      downloadSheetCSV(hoja2Data, `Windytec_Hoja2_HorasOperarios_${today}.csv`);
    } else {
      downloadSheetCSV(hoja3Data, `Windytec_Hoja3_HorasTipoOT_${today}.csv`);
    }
  };

  const handleCopyScriptCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopyFeedback('¡Código Apps Script copiado al portapapeles!');
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 space-y-6">
      {/* Cabecera */}
      <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
            Sincronización a Demanda
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1">CONFIGURAR TU GOOGLE SHEET</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sincroniza los partes y horas en tu propia cuenta de Google cuando tú decidas
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

      {copyFeedback && (
        <div className="bg-emerald-50 border-2 border-emerald-400 text-emerald-950 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{copyFeedback}</span>
        </div>
      )}

      {/* Tarjeta de Acción Principal */}
      <div className="bg-gradient-to-br from-sky-800 via-sky-900 to-slate-900 text-white rounded-2xl p-6 shadow-md space-y-4">
        <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-xs border border-white/20">
              <Sheet className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg leading-tight">Sincronizar mi Google Sheet</h3>
              <p className="text-sky-200 text-xs mt-0.5">
                {records.length} {records.length === 1 ? 'parte de trabajo registrado' : 'partes de trabajo registrados'} listos para volcar en 3 hojas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sky-200 hover:text-white text-xs font-bold transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            <span>{showGuide ? 'Ocultar guía de configuración' : '¿Cómo configurar mi Google Sheet?'}</span>
          </button>
        </div>

        {masterData.ultimoSyncGoogleSheet && (
          <div className="bg-white/10 rounded-xl px-3.5 py-2 text-xs text-sky-200 flex items-center justify-between">
            <span>Última sincronización realizada:</span>
            <strong className="text-white font-mono">{masterData.ultimoSyncGoogleSheet}</strong>
          </div>
        )}

        {/* Protección de formato activada */}
        <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl px-3.5 py-2 text-xs text-emerald-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Formato personalizado protegido:</strong> La sincronización actualiza solo los datos sin tocar tus colores, fuentes ni anchos de columna en Google Sheets.
          </span>
        </div>

        {/* Input Webhook */}
        <div className="space-y-1.5 pt-1">
          <label className="block text-xs font-bold text-sky-200">
            URL de tu Webhook Apps Script (de tu Google Sheet):
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              id="google-sheet-webhook-input"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-slate-900/90 border border-sky-400/40 focus:border-sky-300 rounded-xl text-xs font-mono text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-400"
            />
            <button
              type="button"
              onClick={() => {
                onUpdateMasterData({ ...masterData, googleSheetWebhookUrl: webhookUrl });
                setCopyFeedback('URL de Google Sheet guardada en la aplicación.');
                setTimeout(() => setCopyFeedback(null), 2500);
              }}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-colors shrink-0"
            >
              Guardar URL
            </button>
          </div>
        </div>

        {/* Botón de Sincronización Inmediata */}
        <button
          type="button"
          id="btn-sync-ahora"
          onClick={handleSyncGoogleSheet}
          disabled={isSyncing}
          className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 text-slate-950 font-black text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'SINCRONIZANDO CON TU GOOGLE SHEET...' : 'ACTUALIZAR MI GOOGLE SHEET AHORA'}</span>
        </button>

        {syncStatusMessage && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2.5 animate-in fade-in ${
              syncStatusMessage.type === 'success'
                ? 'bg-emerald-100/95 text-emerald-950 border border-emerald-300'
                : 'bg-rose-100/95 text-rose-950 border border-rose-300'
            }`}
          >
            {syncStatusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{syncStatusMessage.text}</span>
          </div>
        )}
      </div>

      {/* GUÍA PASO A PASO PARA EL USUARIO */}
      {showGuide && (
        <div className="bg-white rounded-2xl p-6 border-2 border-sky-300 shadow-md space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-600" />
              <span>Instrucciones: Cómo tener este Google Sheet en tu cuenta</span>
            </h4>
            <span className="text-xs font-bold text-sky-800 bg-sky-100 px-2.5 py-1 rounded-full">
              Solo se hace 1 vez
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
            {/* Paso 1 */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs">1</span>
                <span>Crea tu Google Sheet</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Entra en tu cuenta de Google (<code className="font-bold text-sky-900">windytec@gmail.com</code>) y crea una hoja de cálculo nueva en blanco.
              </p>
              <a
                href="https://sheets.new"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-bold text-sky-700 hover:underline pt-1"
              >
                <span>Abrir Google Sheets en blanco</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Paso 2 */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs">2</span>
                <span>Abre Extensiones &gt; Apps Script</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                En el menú superior de tu Google Sheet, haz clic en <strong>Extensiones</strong> y selecciona <strong>Apps Script</strong>. Se abrirá una pestaña con un editor de código.
              </p>
            </div>

            {/* Paso 3 */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs">3</span>
                <span>Pega el Código de Sincronización</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Borra cualquier texto que haya en el editor y pega el código que hemos preparado para Windytec.
              </p>
              <button
                type="button"
                onClick={handleCopyScriptCode}
                className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-sky-400" />
                <span>COPIAR CÓDIGO APPS SCRIPT</span>
              </button>
            </div>

            {/* Paso 4 */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs">4</span>
                <span>Implementa como Aplicación Web</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                1. Pulsa el botón azul <strong>Implementar</strong> &gt; <strong>Nueva implementación</strong>.<br />
                2. En el icono del engranaje selecciona <strong>Aplicación web</strong>.<br />
                3. En <em>Quién tiene acceso</em>, selecciona <strong>Cualquier usuario (Anyone)</strong>.<br />
                4. Pulsa <strong>Implementar</strong>, copia la URL que termina en <code className="bg-slate-200 px-1 rounded">/exec</code> y pégala en el campo de arriba.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑAS DE ESTRUCTURA Y VISTA PREVIA DE LAS 3 HOJAS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm">
              Estructura de las 3 Hojas configuradas
            </h4>
            <p className="text-xs text-slate-500">
              Previsualiza los datos y cópialos directamente a tu hoja o descárgalos en CSV
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleCopySheetClipboard(activePreviewTab)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar esta hoja (Ctrl+V)</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownloadSheetCSV(activePreviewTab)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors border border-slate-300"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar .CSV</span>
            </button>
          </div>
        </div>

        {/* Selector de pestañas */}
        <div className="flex border-b border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setActivePreviewTab('hoja1')}
            className={`flex-1 py-3 px-3 text-xs font-extrabold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activePreviewTab === 'hoja1'
                ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Hoja 1: REGISTRO DE OTS</span>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full">
              {hoja1Data.rows.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActivePreviewTab('hoja2')}
            className={`flex-1 py-3 px-3 text-xs font-extrabold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activePreviewTab === 'hoja2'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Hoja 2: HORAS POR OPERARIO</span>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full">
              {hoja2Data.rows.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActivePreviewTab('hoja3')}
            className={`flex-1 py-3 px-3 text-xs font-extrabold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activePreviewTab === 'hoja3'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Hoja 3: HORAS POR TIPO DE OT</span>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full">
              {hoja3Data.rows.length}
            </span>
          </button>
        </div>

        {/* Contenido de la pestaña activa */}
        <div className="p-4 overflow-x-auto max-h-[420px] overflow-y-auto">
          {activePreviewTab === 'hoja1' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-600 bg-sky-50/60 p-2.5 rounded-lg border border-sky-200 flex items-center justify-between">
                <span>
                  <strong>Orden de columnas exacto:</strong> CODIGO DE LA OT, RESPONSABLE, FECHA, AEG, EQUIPO DE TRABAJO, HORA INICIO, HORA FIN, TIEMPO COMIDA, TIPO OT, TAREAS REALIZADAS (con viñetas), EXTRAS (con viñetas y cálculo), MATERIAL ROTO O FALTANTE, OBSERVACIONES.
                </span>
              </div>
              <table className="min-w-full text-xs border border-slate-200">
                <thead className="bg-sky-800 text-white font-bold sticky top-0">
                  <tr>
                    {hoja1Data.headers.map((h, i) => (
                      <th
                        key={i}
                        className={`px-3 py-2 whitespace-nowrap border-r border-sky-700 ${
                          i === 5 || i === 6 || i === 7 ? 'text-center' : 'text-left'
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {hoja1Data.rows.length === 0 ? (
                    <tr>
                      <td colSpan={hoja1Data.headers.length} className="px-4 py-8 text-center text-slate-400">
                        <p className="font-semibold text-slate-600">Aún no hay partes de trabajo (OTs) registrados en la base de datos.</p>
                        <p className="text-xs text-slate-400 mt-1">Crea una OT desde el botón "REALIZAR OT" en el menú principal y al sincronizar se volcarán automáticamente aquí.</p>
                      </td>
                    </tr>
                  ) : (
                    hoja1Data.rows.map((r, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50">
                      {r.map((cell, cIdx) => {
                        let cellStyle = 'whitespace-nowrap';
                        if (cIdx === 4) {
                          cellStyle = 'whitespace-pre-line min-w-[170px] font-semibold text-slate-900 leading-relaxed';
                        } else if (cIdx === 5 || cIdx === 6 || cIdx === 7) {
                          cellStyle = 'whitespace-pre-line text-center font-mono text-slate-800 min-w-[95px] leading-relaxed';
                        } else if (cIdx === 9 || cIdx === 10) {
                          cellStyle = 'whitespace-pre-line min-w-[280px] font-sans text-[11px] leading-relaxed';
                        }
                        return (
                          <td
                            key={cIdx}
                            className={`px-3 py-2 align-top border-r border-slate-100 ${cellStyle}`}
                          >
                            {String(cell)}
                          </td>
                        );
                      })}
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          )}

          {activePreviewTab === 'hoja2' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-600 bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200">
                <strong>Estructura:</strong> Operarios en filas, fechas ordenadas (formato corto DD/MM) en columnas, total acumulado por operario y totales por día.
              </div>
              <table className="min-w-full text-xs border border-slate-200">
                <thead className="bg-emerald-800 text-white font-bold sticky top-0">
                  <tr>
                    {hoja2Data.headers.map((h, i) => (
                      <th key={i} className="px-3 py-2 text-center whitespace-nowrap border-r border-emerald-700 first:text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {hoja2Data.rows.map((r, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50">
                      {r.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className={`px-3 py-2 whitespace-nowrap border-r border-slate-100 ${
                            cIdx === 0 ? 'font-bold text-slate-900 text-left' : 'text-center font-mono'
                          }`}
                        >
                          {String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {hoja2Data.totalRow && (
                    <tr className="bg-emerald-50 font-black text-emerald-950 border-t-2 border-emerald-500">
                      {hoja2Data.totalRow.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className={`px-3 py-2 whitespace-nowrap border-r border-emerald-200 ${
                            cIdx === 0 ? 'text-left' : 'text-center font-mono'
                          }`}
                        >
                          {String(cell)}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activePreviewTab === 'hoja3' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-600 bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-200">
                <strong>Estructura:</strong> Horas totales y promedio de horas invertidas según el TIPO DE OT configurado.
              </div>
              <table className="min-w-full text-xs border border-slate-200">
                <thead className="bg-indigo-800 text-white font-bold sticky top-0">
                  <tr>
                    {hoja3Data.headers.map((h, i) => (
                      <th key={i} className="px-3 py-2 text-center whitespace-nowrap border-r border-indigo-700 first:text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {hoja3Data.rows.map((r, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50">
                      {r.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className={`px-3 py-2 whitespace-nowrap border-r border-slate-100 ${
                            cIdx === 0 ? 'font-bold text-slate-900 text-left' : 'text-center font-mono'
                          }`}
                        >
                          {String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {hoja3Data.totalRow && (
                    <tr className="bg-indigo-50 font-black text-indigo-950 border-t-2 border-indigo-500">
                      {hoja3Data.totalRow.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className={`px-3 py-2 whitespace-nowrap border-r border-indigo-200 ${
                            cIdx === 0 ? 'text-left' : 'text-center font-mono'
                          }`}
                        >
                          {String(cell)}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Visor de Código Apps Script */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-sky-600" />
            <h4 className="font-bold text-slate-800 text-sm">Código Google Apps Script</h4>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopyScriptCode}
              className="px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs flex items-center gap-1 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar Código</span>
            </button>
            <button
              type="button"
              onClick={() => setShowScriptModal(!showScriptModal)}
              className="text-xs text-sky-700 hover:underline font-semibold"
            >
              {showScriptModal ? 'Ocultar código' : 'Ver código'}
            </button>
          </div>
        </div>

        {showScriptModal && (
          <div className="space-y-3 animate-in fade-in">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-1">
              <p className="font-extrabold flex items-center gap-1.5 text-emerald-800">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>¿Cómo actualizar tu código en Google Sheets para mantener tu formato?</span>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1">
                <li>Abre tu Google Sheet &gt; <strong>Extensiones &gt; Apps Script</strong>.</li>
                <li>Borra el código anterior y pega el código que aparece aquí abajo (usa el botón azul <strong>Copiar Código</strong>).</li>
                <li>Guarda los cambios pulsando el icono del <strong>Disquete (Guardar)</strong>.</li>
                <li>Haz clic arriba en <strong>Implementar &gt; Administrar implementaciones</strong>.</li>
                <li>Haz clic en el <strong>icono del lápiz (Editar)</strong> en tu implementación activa.</li>
                <li>En el desplegable <strong>Versión</strong>, selecciona <strong>Nueva versión</strong> y pulsa <strong>Implementar</strong>.</li>
              </ol>
              <p className="text-[11px] text-slate-500 pt-1">
                A partir de ese momento, cada vez que pulses "ACTUALIZAR MI GOOGLE SHEET AHORA", se mantendrán todos los anchos de columna, colores de celdas, cabeceras, bordes y fuentes que hayas personalizado.
              </p>
            </div>
            <p className="text-xs text-slate-500">
              Código completo listo para copiar:
            </p>
            <pre className="p-3 bg-slate-900 text-sky-200 rounded-xl text-[11px] font-mono overflow-x-auto max-h-64 overflow-y-auto">
              {appsScriptCode}
            </pre>
          </div>
        )}
      </div>

      {/* Volver */}
      <button
        type="button"
        onClick={onBack}
        className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all"
      >
        <ArrowLeft className="w-4 h-4 text-sky-400" />
        <span>VOLVER AL MENÚ DE ADMINISTRADOR</span>
      </button>
    </div>
  );
};
