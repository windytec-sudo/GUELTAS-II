export interface OperarioHorario {
  operario: string;
  horaInicio: string; // default "0"
  horaFin: string; // default "0"
  tiempoComidaMinutos: number; // 0, 30, 60, 90 (default 0)
}

export interface TareaRealizada {
  tarea: string;
  porcentaje: '0 %' | '25 %' | '50 %' | '75 %' | '100 %';
  operariosAsignados: string[];
}

export type ExtraWorkTipo = 'EXTRAWORK' | 'WAITING TIME' | 'RETRABAJO';

export interface ExtraWorkItem {
  id: string;
  tipo: ExtraWorkTipo;
  motivo: string; // Trabajo realizado o motivo de la parada
  numOperarios: number;
  tiempoInvertidoHoras: number;
  tiempoTotalHoras: number; // numOperarios * tiempoInvertidoHoras
}

export interface OTRecord {
  id: string;
  fechaCreacion: string;
  quienRealiza: string; // Pantalla 1
  fechaTrabajos: string; // Pantalla 2 (YYYY-MM-DD)
  aerogenerador: string; // Pantalla 3
  donde?: string; // Alias for aerogenerador
  operariosParticipantes: string[]; // Pantalla 4
  tiemposOperarios: OperarioHorario[]; // Pantalla 5
  tipoOT: string; // Pantalla 6
  tareas: TareaRealizada[]; // Pantalla 7
  extraworks: ExtraWorkItem[]; // Pantalla 8
  materialRotoFaltante: {
    hubo: boolean;
    detalle: string;
  }; // Pantalla 9
  observaciones: {
    hubo: boolean;
    detalle: string;
  }; // Pantalla 10
}

export interface MasterData {
  operarios: string[];
  aerogeneradores: string[];
  tiposOT: string[];
  tareasPorOT: Record<string, string[]>;
  googleSheetWebhookUrl?: string;
  ultimoSyncGoogleSheet?: string;
}
