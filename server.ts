import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { generateSheet1Data, generateSheet2Data, generateSheet3Data } from './src/utils/googleSheets';

const app = express();
const PORT = 3000;

app.use(express.json());

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

const INITIAL_DATA = {
  masterData: {
    operarios: [
      'Carlos Gómez',
      'Manuel Rivas',
      'David Fernández',
      'Javier Pérez',
      'Antonio Silva',
      'Marcos Lorenzo'
    ],
    aerogeneradores: [
      'WTG-01 (Parque Monte Redondo)',
      'WTG-02 (Parque Monte Redondo)',
      'WTG-03 (Parque Barbanza)',
      'WTG-04 (Parque Barbanza)',
      'WTG-05 (Parque Ourol)',
      'WTG-06 (Parque Ourol)'
    ],
    tiposOT: [
      'Mantenimiento Preventivo',
      'Mantenimiento Correctivo',
      'Inspección de Palas',
      'Retrofit Eléctrico',
      'Revisión Anual'
    ],
    tareasPorOT: {
      'Mantenimiento Preventivo': [
        'Revisión apriete tornillería bridas y pala',
        'Comprobación nivel de aceite multiplicadora',
        'Engrase de rodamientos principales y generador',
        'Inspección visual exterior e interior de góndola',
        'Prueba de disparo frenos de emergencia'
      ],
      'Mantenimiento Correctivo': [
        'Sustitución motor paso de pala (Pitch)',
        'Reparación fuga hidráulica grupo de presión',
        'Sustitución de contactores en armario de control',
        'Alineación eje generador con multiplicadora',
        'Reemplazo sensor de revoluciones del rotor'
      ],
      'Inspección de Palas': [
        'Inspección borde de ataque y tips',
        'Verificación receptores pararrayos y continuidad',
        'Comprobación drenajes y sellados en raíz',
        'Limpieza y reparación superficial de gelcoat'
      ],
      'Retrofit Eléctrico': [
        'Actualización firmware autómata PLC',
        'Instalación sensores de vibración avanzados',
        'Sustitución anemómetro y veleta ultrasónica',
        'Revisión cableado de fibra óptica en torre'
      ],
      'Revisión Anual': [
        'Calibración de instrumentos anemométricos',
        'Comprobación de aislamiento eléctrico del generador',
        'Verificación y recarga extintores automáticos',
        'Prueba funcional completa de parada por sobrevelocidad'
      ]
    },
    googleSheetWebhookUrl: '',
    ultimoSyncGoogleSheet: ''
  },
  records: []
};

function readStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
      return INITIAL_DATA;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading store:', err);
    return INITIAL_DATA;
  }
}

function writeStore(data: any) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing store:', err);
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Master Data endpoints
app.get('/api/master-data', (req, res) => {
  const store = readStore();
  res.json(store.masterData || INITIAL_DATA.masterData);
});

app.post('/api/master-data', (req, res) => {
  const store = readStore();
  store.masterData = req.body;
  writeStore(store);
  res.json({ success: true, masterData: store.masterData });
});

// Records endpoints
app.get('/api/records', (req, res) => {
  const store = readStore();
  res.json(store.records || []);
});

app.post('/api/records', (req, res) => {
  const store = readStore();
  if (!store.records) store.records = [];
  const newRecord = {
    ...req.body,
    id: req.body.id || `OT-${Date.now().toString().slice(-6)}`,
    fechaCreacion: req.body.fechaCreacion || new Date().toISOString()
  };
  store.records.unshift(newRecord);
  writeStore(store);
  res.status(201).json({ success: true, record: newRecord });
});

app.put('/api/records/:id', (req, res) => {
  const { id } = req.params;
  const store = readStore();
  if (!store.records) store.records = [];
  const idx = store.records.findIndex((r: any) => r.id === id);
  if (idx !== -1) {
    store.records[idx] = { ...store.records[idx], ...req.body };
    writeStore(store);
    res.json({ success: true, record: store.records[idx] });
  } else {
    res.status(404).json({ error: 'Registro no encontrado' });
  }
});

app.delete('/api/records/:id', (req, res) => {
  const { id } = req.params;
  const store = readStore();
  if (!store.records) store.records = [];
  store.records = store.records.filter((r: any) => r.id !== id);
  writeStore(store);
  res.json({ success: true });
});

// Bulk Save / Google Sheet sync endpoint
app.post('/api/sync-google-sheet', async (req, res) => {
  const store = readStore();
  // Prefer records sent by the frontend client (which has Firestore & local cache), fallback to store
  const clientRecords = Array.isArray(req.body.records) ? req.body.records : null;
  const records = (clientRecords && clientRecords.length > 0) ? clientRecords : (store.records || []);
  
  if (clientRecords && clientRecords.length > 0) {
    store.records = clientRecords;
  }

  const webhookUrl = req.body.webhookUrl || store.masterData?.googleSheetWebhookUrl;
  const operarios = req.body.operarios || store.masterData?.operarios;
  const tiposOT = req.body.tiposOT || store.masterData?.tiposOT;
  
  const now = new Date().toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  store.masterData = {
    ...store.masterData,
    ultimoSyncGoogleSheet: now
  };
  if (webhookUrl) {
    store.masterData.googleSheetWebhookUrl = webhookUrl;
  }
  writeStore(store);

  let webhookResult = null;
  if (webhookUrl && webhookUrl.startsWith('http')) {
    try {
      const hoja1 = generateSheet1Data(records);
      const hoja2 = generateSheet2Data(records, operarios);
      const hoja3 = generateSheet3Data(records, tiposOT);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        redirect: 'follow',
        body: JSON.stringify({
          empresa: 'S. E. WINDYTEC S. L.',
          fechaSync: now,
          totalRegistros: records.length,
          mantenerFormato: true,
          hoja1,
          hoja2,
          hoja3,
          registros: records
        })
      });
      const responseText = await response.text();
      let isSuccess = response.ok;
      let parsedError = null;

      try {
        const json = JSON.parse(responseText);
        if (json.success === false || json.error) {
          isSuccess = false;
          parsedError = json.error || 'Error reportado por Apps Script';
        }
      } catch (e) {
        // If not JSON and not ok or redirected to Google Login
        if (responseText.includes('accounts.google.com') || response.status === 401 || response.status === 403) {
          isSuccess = false;
          parsedError = 'Acceso no autorizado (401). En Apps Script debes seleccionar en "Quién tiene acceso": "Cualquier usuario" (Anyone).';
        }
      }

      webhookResult = { 
        status: response.status, 
        ok: isSuccess, 
        error: parsedError 
      };
    } catch (fetchErr: any) {
      console.error('Webhook error:', fetchErr);
      webhookResult = { error: fetchErr.message };
    }
  }

  res.json({
    success: true,
    totalRecords: records.length,
    ultimoSync: now,
    webhookResult
  });
});

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor iniciado en http://0.0.0.0:${PORT}`);
  });
}

start();
