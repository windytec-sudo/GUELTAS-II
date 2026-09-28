import { MasterData } from '../types';

export const INITIAL_MASTER_DATA: MasterData = {
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
};
