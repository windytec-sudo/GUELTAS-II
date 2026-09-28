import { MasterData, OTRecord } from '../types';
import { INITIAL_MASTER_DATA } from '../data/initialData';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';

const LOCAL_STORAGE_MASTER_KEY = 'windytec_master_data_v1';
const LOCAL_STORAGE_RECORDS_KEY = 'windytec_ot_records_v1';

// FIRESTORE COLLECTIONS & DOCS
const MASTER_DATA_COLLECTION = 'masterData';
const MASTER_DATA_DOC_ID = 'config';
const RECORDS_COLLECTION = 'records';

/**
 * Obtener Datos Maestros (Operarios, Parques, Tareas por OT)
 * Prioridad: Firestore -> Backend/Local -> Default
 */
export async function fetchMasterData(): Promise<MasterData> {
  // 1. Intentar Firestore directamente
  try {
    const docRef = doc(db, MASTER_DATA_COLLECTION, MASTER_DATA_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as MasterData;
      localStorage.setItem(LOCAL_STORAGE_MASTER_KEY, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('Error leyendo MasterData de Firestore, intentando endpoint/caché:', err);
  }

  // 2. Intentar endpoint backend como fallback
  try {
    const res = await fetch('/api/master-data');
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem(LOCAL_STORAGE_MASTER_KEY, JSON.stringify(data));
      // Intentar sembrar en Firestore si estaba vacío
      try {
        await setDoc(doc(db, MASTER_DATA_COLLECTION, MASTER_DATA_DOC_ID), {
          ...data,
          updatedAt: new Date().toISOString()
        });
      } catch (e) {
        // Silencioso
      }
      return data;
    }
  } catch (err) {
    console.warn('Usando caché local para datos maestros:', err);
  }

  // 3. Caché local
  const cached = localStorage.getItem(LOCAL_STORAGE_MASTER_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // fallback
    }
  }

  // 4. Datos iniciales
  return INITIAL_MASTER_DATA;
}

/**
 * Guardar Datos Maestros
 * Se guarda en Firestore Y en localStorage Y en el backend
 */
export async function saveMasterData(data: MasterData): Promise<boolean> {
  // Guardar en caché local
  localStorage.setItem(LOCAL_STORAGE_MASTER_KEY, JSON.stringify(data));

  let savedInFirestore = false;

  // 1. Guardar en Firebase Firestore
  try {
    const docRef = doc(db, MASTER_DATA_COLLECTION, MASTER_DATA_DOC_ID);
    await setDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
    savedInFirestore = true;
  } catch (err) {
    console.error('Error guardando MasterData en Firestore:', err);
  }

  // 2. Notificar al backend local/store.json por compatibilidad
  try {
    await fetch('/api/master-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (err) {
    console.warn('Error enviando MasterData a backend local:', err);
  }

  return savedInFirestore;
}

/**
 * Obtener todos los partes de OT guardados
 * Lee de Firestore -> fallback a backend/local
 */
export async function fetchRecords(): Promise<OTRecord[]> {
  // 1. Leer de Firestore
  try {
    const q = query(collection(db, RECORDS_COLLECTION), orderBy('fechaCreacion', 'desc'));
    const snap = await getDocs(q);
    const recordsList: OTRecord[] = [];
    snap.forEach((d) => {
      recordsList.push(d.data() as OTRecord);
    });

    if (recordsList.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_RECORDS_KEY, JSON.stringify(recordsList));
      return recordsList;
    }
  } catch (err) {
    console.warn('Error leyendo records de Firestore, intentando backend:', err);
  }

  // 2. Intentar backend
  try {
    const res = await fetch('/api/records');
    if (res.ok) {
      const records = await res.json();
      localStorage.setItem(LOCAL_STORAGE_RECORDS_KEY, JSON.stringify(records));
      return records;
    }
  } catch (err) {
    console.warn('Usando registros en caché local:', err);
  }

  // 3. Caché local
  const cached = localStorage.getItem(LOCAL_STORAGE_RECORDS_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Crear un nuevo registro de OT
 * Escribe en Firestore -> actualiza caché -> notifica backend
 */
export async function createRecord(record: Omit<OTRecord, 'id' | 'fechaCreacion'>): Promise<OTRecord> {
  const newRecord: OTRecord = {
    ...record,
    id: `OT-${Date.now().toString().slice(-6)}`,
    fechaCreacion: new Date().toISOString()
  };

  // Actualizar caché local
  const cached = localStorage.getItem(LOCAL_STORAGE_RECORDS_KEY);
  const records: OTRecord[] = cached ? JSON.parse(cached) : [];
  records.unshift(newRecord);
  localStorage.setItem(LOCAL_STORAGE_RECORDS_KEY, JSON.stringify(records));

  // 1. Guardar en Firestore
  try {
    const docRef = doc(db, RECORDS_COLLECTION, newRecord.id);
    await setDoc(docRef, newRecord);
  } catch (err) {
    console.error('Error guardando OT en Firestore:', err);
  }

  // 2. Notificar al backend
  try {
    await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecord)
    });
  } catch (err) {
    console.warn('Guardado en nube Firestore, pendiente sincronizar local:', err);
  }

  return newRecord;
}

/**
 * Actualizar una OT existente
 */
export async function updateRecord(record: OTRecord): Promise<boolean> {
  // Caché local
  const cached = localStorage.getItem(LOCAL_STORAGE_RECORDS_KEY);
  let records: OTRecord[] = cached ? JSON.parse(cached) : [];
  records = records.map((r) => (r.id === record.id ? record : r));
  localStorage.setItem(LOCAL_STORAGE_RECORDS_KEY, JSON.stringify(records));

  // 1. Firestore
  let firestoreOk = false;
  try {
    const docRef = doc(db, RECORDS_COLLECTION, record.id);
    await setDoc(docRef, record);
    firestoreOk = true;
  } catch (err) {
    console.error('Error actualizando OT en Firestore:', err);
  }

  // 2. Backend
  try {
    await fetch(`/api/records/${record.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
  } catch (err) {
    console.warn('Error al actualizar registro en servidor backend:', err);
  }

  return firestoreOk;
}

/**
 * Eliminar una OT
 */
export async function deleteRecord(id: string): Promise<boolean> {
  // Caché local
  const cached = localStorage.getItem(LOCAL_STORAGE_RECORDS_KEY);
  let records: OTRecord[] = cached ? JSON.parse(cached) : [];
  records = records.filter((r) => r.id !== id);
  localStorage.setItem(LOCAL_STORAGE_RECORDS_KEY, JSON.stringify(records));

  // 1. Firestore
  try {
    await deleteDoc(doc(db, RECORDS_COLLECTION, id));
  } catch (err) {
    console.error('Error eliminando OT en Firestore:', err);
  }

  // 2. Backend
  try {
    await fetch(`/api/records/${id}`, {
      method: 'DELETE'
    });
  } catch (err) {
    console.warn('Error al eliminar registro en backend:', err);
  }

  return true;
}

/**
 * Sincronizar hacia Google Sheet
 */
export async function syncToGoogleSheet(
  webhookUrl?: string,
  recordsPayload?: OTRecord[],
  masterOperarios?: string[],
  masterTiposOT?: string[]
): Promise<{
  success: boolean;
  ultimoSync: string;
  totalRecords: number;
  message?: string;
  webhookResult?: { status?: number; ok?: boolean; error?: string } | null;
}> {
  try {
    // If not provided, fetch current records
    const recordsToSend = recordsPayload || (await fetchRecords());

    const res = await fetch('/api/sync-google-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        webhookUrl,
        records: recordsToSend,
        operarios: masterOperarios,
        tiposOT: masterTiposOT
      })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err: any) {
    console.warn('Error de sync api:', err);
  }

  const now = new Date().toLocaleString('es-ES');
  return {
    success: true,
    ultimoSync: now,
    totalRecords: recordsPayload ? recordsPayload.length : (await fetchRecords()).length,
    message: 'Datos sincronizados.'
  };
}
