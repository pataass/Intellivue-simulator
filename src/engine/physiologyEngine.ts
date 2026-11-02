import {
  ActiveAlarm,
  AlarmThresholds,
  CardiacRhythm,
  ClinicalScenarioId,
  DirectVitalTargets,
  EcgLead,
  MonitorScenarioId,
  PatientVitals,
  PhilipsHardwareModule,
  PumpChannelState,
  PumpScenarioId,
  TrendPoint,
  TwelveLeadStMap,
  WorkspaceScreen,
} from '../types/clinical';
import { getDrugById, OCCLUSION_PRESSURE_MMHG } from '../data/drugLibrary';

export const ALL_TWELVE_LEADS: EcgLead[] = [
  'I',
  'II',
  'III',
  'aVR',
  'aVL',
  'aVF',
  'V1',
  'V2',
  'V3',
  'V4',
  'V5',
  'V6',
];

export const NORMAL_ST_MAP: TwelveLeadStMap = {
  I: 0.2,
  II: 0.3,
  III: 0.1,
  aVR: -0.2,
  aVL: 0.1,
  aVF: 0.1,
  V1: 0.0,
  V2: -0.1,
  V3: -0.2,
  V4: 0.4,
  V5: 0.5,
  V6: 0.4,
};

export const ANTERIOR_STEMI_ST_MAP: TwelveLeadStMap = {
  I: 1.6,
  II: -0.9,
  III: -1.4,
  aVR: -0.6,
  aVL: 1.9,
  aVF: -1.2,
  V1: 2.2,
  V2: 3.8,
  V3: 4.1,
  V4: 3.2,
  V5: 1.8,
  V6: 0.8,
};

export const INFERIOR_ISCHEMIA_ST_MAP: TwelveLeadStMap = {
  I: -1.3,
  II: 2.6,
  III: 3.2,
  aVR: -0.8,
  aVL: -1.8,
  aVF: 2.9,
  V1: -0.9,
  V2: -1.4,
  V3: -0.8,
  V4: 0.2,
  V5: 0.4,
  V6: 0.5,
};

export function computeStIndex(st: TwelveLeadStMap): number {
  return Number((Math.abs(st.II) + Math.abs(st.V2) + Math.abs(st.V5)).toFixed(1));
}

export const INITIAL_PHILIPS_MODULES: PhilipsHardwareModule[] = [
  {
    slotId: 'mms-m3001a',
    slotNumberLabel: 'MMS',
    mNumber: 'M3001A',
    shortLabel: 'MMS',
    fullName: 'IntelliVue Multi-Measurement Module (ECG/Resp, FAST-SpO₂)',
    widthSlots: 1,
    socketColor: 'MMS_MULTI',
    cableColorHex: '#22c55e',
    cableName: '5-Lead ECG Trunk + FAST-SpO₂ Finger Sensor',
    buttons: ['Zero', 'NBP'],
    pluggedIn: true,
    cableWired: true,
    parameterKey: 'MMS',
    statusText: 'ECG · SpO₂ · Resp',
  },
  {
    slotId: 'mms-ext-m3015a',
    slotNumberLabel: 'EXT',
    mNumber: 'M3015A',
    shortLabel: 'CO₂',
    fullName: 'Microstream etCO₂ & Hemodynamic MMS Extension',
    widthSlots: 1,
    socketColor: 'ORANGE',
    cableColorHex: '#f59e0b',
    cableName: 'FilterLine® Sidestream etCO₂ Sampling Tube',
    buttons: ['Cal'],
    pluggedIn: true,
    cableWired: true,
    parameterKey: 'CO2',
    statusText: 'Microstream CO₂',
  },
  {
    slotId: 'fms-1-m1008b',
    slotNumberLabel: '1–2',
    mNumber: 'M1008B',
    shortLabel: 'NBP',
    fullName: 'Non-Invasive Blood Pressure Dual-Width Module',
    widthSlots: 2,
    socketColor: 'PURPLE_SQUARE',
    cableColorHex: '#9333ea',
    cableName: 'Adult Brachial NBP Air Hose (M1599B)',
    buttons: ['NBP', 'STAT', 'START', 'STOP'],
    pluggedIn: true,
    cableWired: true,
    parameterKey: 'NBP',
    statusText: 'Auto 15 min',
  },
  {
    slotId: 'fms-3-m1029a',
    slotNumberLabel: '3',
    mNumber: 'M1029A',
    shortLabel: 'TEMP',
    fullName: 'Dual Temperature Module (Tesof / Tskin)',
    widthSlots: 1,
    socketColor: 'BROWN',
    cableColorHex: '#a16207',
    cableName: 'Esophageal / Skin Thermistor Probe (21075A)',
    buttons: ['Temp'],
    pluggedIn: true,
    cableWired: true,
    parameterKey: 'TEMP',
    statusText: 'Tcore / Tskin',
  },
  {
    slotId: 'fms-4-m1027a',
    slotNumberLabel: '4',
    mNumber: 'M1027A',
    shortLabel: 'EEG',
    fullName: '2-Channel Cerebral / EEG Module',
    widthSlots: 1,
    socketColor: 'YELLOW',
    cableColorHex: '#eab308',
    cableName: '4-Electrode Frontal EEG Patient Leadset',
    buttons: ['EEG'],
    pluggedIn: true,
    cableWired: true,
    parameterKey: 'EEG',
    statusText: 'CSA / Impedance OK',
  },
  {
    slotId: 'fms-5-m1006b-abp',
    slotNumberLabel: '5',
    mNumber: 'M1006B',
    shortLabel: 'PRESS',
    fullName: 'Invasive Pressure #1 — Radial Arterial Line (ABP)',
    widthSlots: 1,
    socketColor: 'PURPLE',
    cableColorHex: '#ef4444',
    cableName: 'Radial Arterial Transducer Cable (Red Label)',
    buttons: ['Press', 'Zero'],
    pluggedIn: true,
    cableWired: true,
    parameterKey: 'ABP',
    statusText: 'ABP Radial',
  },
  {
    slotId: 'fms-6-m1006b-pap',
    slotNumberLabel: '6',
    mNumber: 'M1006B',
    shortLabel: 'PRESS',
    fullName: 'Invasive Pressure #2 — Swan-Ganz PAP & CVP',
    widthSlots: 1,
    socketColor: 'PURPLE',
    cableColorHex: '#eab308',
    cableName: 'Swan-Ganz Distal PAP / Proximal CVP Transducer',
    buttons: ['Press', 'Zero'],
    pluggedIn: true,
    cableWired: true,
    parameterKey: 'PAP_CVP',
    statusText: 'PAP / CVP',
  },
  {
    slotId: 'fms-7-m1012a',
    slotNumberLabel: '7',
    mNumber: 'M1012A',
    shortLabel: 'CCO/C.O.',
    fullName: 'Thermodilution & PiCCO Cardiac Output Module',
    widthSlots: 1,
    socketColor: 'ORANGE',
    cableColorHex: '#f97316',
    cableName: 'In-Line Injectate Temp & PA Thermistor Cable',
    buttons: ['C.O.', 'Start'],
    pluggedIn: true,
    cableWired: true,
    parameterKey: 'CO',
    statusText: 'Thermodilution C.O.',
  },
  {
    slotId: 'fms-8-m1006b-icp',
    slotNumberLabel: '8',
    mNumber: 'M1006B',
    shortLabel: 'PRESS',
    fullName: 'Invasive Pressure #3 — Parenchymal ICP',
    widthSlots: 1,
    socketColor: 'PURPLE',
    cableColorHex: '#d946ef',
    cableName: 'Codman / EVD Intracranial Pressure Transducer',
    buttons: ['Press', 'Zero'],
    pluggedIn: true,
    cableWired: true,
    parameterKey: 'ICP',
    statusText: 'ICP / CPP',
  },
];

export interface ScenarioBaselineModifiers {
  baseHr: number;
  baseAbpMap: number;
  basePulsePressure: number;
  basePapSys: number;
  basePapDia: number;
  baseCvp: number;
  baseIcp: number;
  baseSpo2: number;
  basePi: number;
  baseEtco2: number;
  baseRespRate: number;
  baseTempC: number;
  stTemplate: TwelveLeadStMap;
  rhythm: CardiacRhythm;
}

export const MONITOR_SCENARIO_PRESETS: Record<
  MonitorScenarioId,
  {
    title: string;
    subtitle: string;
    assignedDevice: string;
    targetStation: Extract<WorkspaceScreen, 'INTELLIVUE'>;
    severity: 'NOMINAL' | 'WARNING' | 'CRITICAL';
    modifiers: ScenarioBaselineModifiers;
  }
> = {
  BASELINE: {
    title: 'Normal ICU Monitoring (Bed 1 · John Doe)',
    subtitle: 'Sinus rhythm 60–66 bpm, ABP 120/70 (91), PAP 28/15 (21), CVP (9), SpO₂ 98%',
    assignedDevice: 'IntelliVue Patient Monitor · Bed 1',
    targetStation: 'INTELLIVUE',
    severity: 'NOMINAL',
    modifiers: {
      baseHr: 60,
      baseAbpMap: 72,
      basePulsePressure: 50,
      basePapSys: 25,
      basePapDia: 13,
      baseCvp: 8,
      baseIcp: 9,
      baseSpo2: 98,
      basePi: 2.2,
      baseEtco2: 33,
      baseRespRate: 15,
      baseTempC: 37.0,
      stTemplate: NORMAL_ST_MAP,
      rhythm: 'SINUS',
    },
  },
  SEPTIC_SHOCK: {
    title: 'SSC Sepsis — Distributive Hypotension',
    subtitle: 'Severe vasodilation (MAP < 55 mmHg), reflex tachycardia, low CVP on Bed 1 Monitor',
    assignedDevice: 'IntelliVue Patient Monitor · Bed 1',
    targetStation: 'INTELLIVUE',
    severity: 'CRITICAL',
    modifiers: {
      baseHr: 126,
      baseAbpMap: 38,
      basePulsePressure: 36,
      basePapSys: 22,
      basePapDia: 10,
      baseCvp: 3,
      baseIcp: 11,
      baseSpo2: 92,
      basePi: 0.8,
      baseEtco2: 27,
      baseRespRate: 26,
      baseTempC: 38.8,
      stTemplate: NORMAL_ST_MAP,
      rhythm: 'SINUS',
    },
  },
  ANTERIOR_STEMI: {
    title: 'Acute Anterior STEMI (ST Map Polygon Alert)',
    subtitle: 'Marked ST elevation in V1–V5, I, aVL with reciprocal inferior depression',
    assignedDevice: 'IntelliVue Patient Monitor · Bed 1',
    targetStation: 'INTELLIVUE',
    severity: 'CRITICAL',
    modifiers: {
      baseHr: 96,
      baseAbpMap: 62,
      basePulsePressure: 38,
      basePapSys: 36,
      basePapDia: 20,
      baseCvp: 12,
      baseIcp: 10,
      baseSpo2: 94,
      basePi: 1.6,
      baseEtco2: 33,
      baseRespRate: 20,
      baseTempC: 37.1,
      stTemplate: ANTERIOR_STEMI_ST_MAP,
      rhythm: 'SINUS',
    },
  },
  INFERIOR_ISCHEMIA: {
    title: 'Inferior STEMI (Leads II, III, aVF)',
    subtitle: 'Inferior wall ST elevation (+3.2 mm) with sinus bradycardia & hypotension',
    assignedDevice: 'IntelliVue Patient Monitor · Bed 1',
    targetStation: 'INTELLIVUE',
    severity: 'CRITICAL',
    modifiers: {
      baseHr: 48,
      baseAbpMap: 56,
      basePulsePressure: 36,
      basePapSys: 24,
      basePapDia: 12,
      baseCvp: 13,
      baseIcp: 9,
      baseSpo2: 95,
      basePi: 1.9,
      baseEtco2: 35,
      baseRespRate: 16,
      baseTempC: 36.8,
      stTemplate: INFERIOR_ISCHEMIA_ST_MAP,
      rhythm: 'SINUS',
    },
  },
  NEURO_ICP_SURGE: {
    title: 'Intracranial Hypertension (ICP 26 mmHg)',
    subtitle: 'Elevated ICP drops Cerebral Perfusion Pressure (CPP = MAP - ICP)',
    assignedDevice: 'IntelliVue Patient Monitor · Bed 1',
    targetStation: 'INTELLIVUE',
    severity: 'CRITICAL',
    modifiers: {
      baseHr: 54,
      baseAbpMap: 78,
      basePulsePressure: 58,
      basePapSys: 28,
      basePapDia: 14,
      baseCvp: 9,
      baseIcp: 26,
      baseSpo2: 97,
      basePi: 2.5,
      baseEtco2: 36,
      baseRespRate: 12,
      baseTempC: 37.4,
      stTemplate: NORMAL_ST_MAP,
      rhythm: 'SINUS',
    },
  },
  ARRHYTHMIA_VTACH: {
    title: 'Ventricular Tachycardia (176 bpm)',
    subtitle: 'Sustained wide-complex monomorphic VTach with arterial hypotension',
    assignedDevice: 'IntelliVue Patient Monitor · Bed 1',
    targetStation: 'INTELLIVUE',
    severity: 'CRITICAL',
    modifiers: {
      baseHr: 176,
      baseAbpMap: 44,
      basePulsePressure: 22,
      basePapSys: 34,
      basePapDia: 22,
      baseCvp: 14,
      baseIcp: 14,
      baseSpo2: 88,
      basePi: 0.6,
      baseEtco2: 19,
      baseRespRate: 26,
      baseTempC: 37.0,
      stTemplate: NORMAL_ST_MAP,
      rhythm: 'VTACH',
    },
  },
  ARRHYTHMIA_ASYSTOLE: {
    title: 'Cardiac Arrest — Asystole',
    subtitle: 'Ventricular standstill with flatline ECG, loss of ABP/Pleth, falling etCO₂',
    assignedDevice: 'IntelliVue Patient Monitor · Bed 1',
    targetStation: 'INTELLIVUE',
    severity: 'CRITICAL',
    modifiers: {
      baseHr: 0,
      baseAbpMap: 15,
      basePulsePressure: 0,
      basePapSys: 16,
      basePapDia: 14,
      baseCvp: 16,
      baseIcp: 15,
      baseSpo2: 0,
      basePi: 0,
      baseEtco2: 6,
      baseRespRate: 0,
      baseTempC: 36.6,
      stTemplate: NORMAL_ST_MAP,
      rhythm: 'ASYSTOLE',
    },
  },
  ARRHYTHMIA_AFIB: {
    title: 'Rapid Atrial Fibrillation / Extreme Tachy (148 bpm)',
    subtitle: 'Irregularly irregular rapid supraventricular rhythm on Bed 1 Monitor',
    assignedDevice: 'IntelliVue Patient Monitor · Bed 1',
    targetStation: 'INTELLIVUE',
    severity: 'WARNING',
    modifiers: {
      baseHr: 148,
      baseAbpMap: 64,
      basePulsePressure: 36,
      basePapSys: 30,
      basePapDia: 17,
      baseCvp: 10,
      baseIcp: 10,
      baseSpo2: 95,
      basePi: 1.9,
      baseEtco2: 33,
      baseRespRate: 19,
      baseTempC: 37.1,
      stTemplate: NORMAL_ST_MAP,
      rhythm: 'AFIB',
    },
  },
};

export const SCENARIO_DIRECT_TARGETS: Record<MonitorScenarioId, DirectVitalTargets> = {
  BASELINE: {
    rhythm: 'SINUS',
    hr: 60,
    abpSys: 120,
    abpDia: 70,
    spo2: 96,
    etco2: 34,
    respRate: 15,
    papSys: 28,
    papDia: 15,
    cvp: 9,
    icp: 9,
    tempCoreC: 37.0,
  },
  SEPTIC_SHOCK: {
    rhythm: 'SINUS',
    hr: 128,
    abpSys: 78,
    abpDia: 42,
    spo2: 91,
    etco2: 26,
    respRate: 28,
    papSys: 24,
    papDia: 11,
    cvp: 3,
    icp: 11,
    tempCoreC: 38.9,
  },
  ANTERIOR_STEMI: {
    rhythm: 'SINUS',
    hr: 98,
    abpSys: 96,
    abpDia: 58,
    spo2: 94,
    etco2: 32,
    respRate: 21,
    papSys: 38,
    papDia: 21,
    cvp: 13,
    icp: 10,
    tempCoreC: 37.1,
  },
  INFERIOR_ISCHEMIA: {
    rhythm: 'SINUS',
    hr: 46,
    abpSys: 88,
    abpDia: 52,
    spo2: 95,
    etco2: 35,
    respRate: 16,
    papSys: 25,
    papDia: 13,
    cvp: 15,
    icp: 9,
    tempCoreC: 36.8,
  },
  NEURO_ICP_SURGE: {
    rhythm: 'SINUS',
    hr: 52,
    abpSys: 168,
    abpDia: 92,
    spo2: 97,
    etco2: 36,
    respRate: 12,
    papSys: 29,
    papDia: 15,
    cvp: 9,
    icp: 26,
    tempCoreC: 37.4,
  },
  ARRHYTHMIA_VTACH: {
    rhythm: 'VTACH',
    hr: 176,
    abpSys: 72,
    abpDia: 46,
    spo2: 87,
    etco2: 19,
    respRate: 26,
    papSys: 35,
    papDia: 22,
    cvp: 15,
    icp: 14,
    tempCoreC: 37.0,
  },
  ARRHYTHMIA_ASYSTOLE: {
    rhythm: 'ASYSTOLE',
    hr: 0,
    abpSys: 16,
    abpDia: 14,
    spo2: 0,
    etco2: 6,
    respRate: 0,
    papSys: 16,
    papDia: 14,
    cvp: 16,
    icp: 15,
    tempCoreC: 36.6,
  },
  ARRHYTHMIA_AFIB: {
    rhythm: 'AFIB',
    hr: 148,
    abpSys: 104,
    abpDia: 66,
    spo2: 94,
    etco2: 33,
    respRate: 20,
    papSys: 31,
    papDia: 18,
    cvp: 11,
    icp: 10,
    tempCoreC: 37.1,
  },
};

export function getScenarioDirectVitalTargets(
  scenarioId: MonitorScenarioId
): DirectVitalTargets {
  return { ...SCENARIO_DIRECT_TARGETS[scenarioId] };
}

export const PUMP_SCENARIO_PRESETS: Record<
  PumpScenarioId,
  {
    title: string;
    subtitle: string;
    assignedDevice: string;
    assignedBay: 1 | 2 | 3 | 4 | null;
    targetStation: Extract<WorkspaceScreen, 'BBRAUN'>;
    severity: 'NOMINAL' | 'WARNING' | 'CRITICAL';
  }
> = {
  PUMP_NORMAL: {
    title: 'Normal Multi-Channel IV Delivery',
    subtitle: 'All assigned Space®plus Infusomat® & Perfusor® lines patent and infusing normally',
    assignedDevice: 'B. Braun Space®plus Station (Slots 1–4)',
    assignedBay: null,
    targetStation: 'BBRAUN',
    severity: 'NOMINAL',
  },
  OCCLUSION_DOWNSTREAM: {
    title: 'Downstream Line Occlusion (Assigned Pump)',
    subtitle: 'Distal IV catheter kink on assigned Infusomat® / Perfusor® triggers L-threshold alarm & anti-bolus',
    assignedDevice: 'Assigned B. Braun Space®plus Pump',
    assignedBay: 1,
    targetStation: 'BBRAUN',
    severity: 'CRITICAL',
  },
  SYRINGE_EMPTY: {
    title: 'Perfusor® OPS Syringe / Bag Depleted (Assigned Pump)',
    subtitle: 'Assigned Perfusor® / Infusomat® container reaches 0.0 mL and halts delivery',
    assignedDevice: 'Assigned B. Braun Space®plus Pump',
    assignedBay: 4,
    targetStation: 'BBRAUN',
    severity: 'CRITICAL',
  },
  AIR_OR_UNPLUGGED_LINE: {
    title: 'IV Giving Set Disconnected from CVC (Assigned Pump)',
    subtitle: 'Assigned pump Luer-Lock line unplugged from Bed 1 CVC manifold',
    assignedDevice: 'Assigned B. Braun Space®plus Pump',
    assignedBay: 2,
    targetStation: 'BBRAUN',
    severity: 'WARNING',
  },
};

// Unified lookup for Launcher compatibility
export const SCENARIO_PRESETS: Record<
  ClinicalScenarioId,
  {
    title: string;
    subtitle: string;
    assignedDevice: string;
    targetStation: 'INTELLIVUE' | 'BBRAUN';
    severity: 'NOMINAL' | 'WARNING' | 'CRITICAL';
  }
> = {
  ...MONITOR_SCENARIO_PRESETS,
  OCCLUSION_DOWNSTREAM: PUMP_SCENARIO_PRESETS.OCCLUSION_DOWNSTREAM,
  SYRINGE_EMPTY: PUMP_SCENARIO_PRESETS.SYRINGE_EMPTY,
  AIR_OR_UNPLUGGED_LINE: PUMP_SCENARIO_PRESETS.AIR_OR_UNPLUGGED_LINE,
};

export const DEFAULT_ALARM_THRESHOLDS: AlarmThresholds = {
  hr: { low: 50, high: 120, enabled: true },
  spo2: { low: 90, high: 100, enabled: true },
  abpSys: { low: 90, high: 160, enabled: true },
  abpMap: { low: 65, high: 110, enabled: true },
  papMap: { low: 10, high: 30, enabled: true },
  cvp: { low: 2, high: 14, enabled: true },
  icp: { low: 0, high: 20, enabled: true },
  etco2: { low: 25, high: 50, enabled: true },
  respRate: { low: 8, high: 30, enabled: true },
  tempCoreC: { low: 36.0, high: 39.0, enabled: true },
};

export function stepPumpsAndPharmacokinetics(
  pumps: PumpChannelState[],
  dtSec: number,
  patientWeightKg: number,
  acMainsConnected: boolean,
  batteryPct: number
) {
  let netDeltaMap = 0;
  let netDeltaSysExtra = 0;
  let netDeltaHr = 0;
  let netDeltaCvp = 0;
  let netDeltaPap = 0;
  let netDeltaIcp = 0;
  let netDeltaResp = 0;
  let netDeltaSt = 0;
  let netDeltaPi = 0;

  const weightScale = 75 / Math.max(30, patientWeightKg);

  const updatedPumps = pumps.map((pump) => {
    const drug = getDrugById(pump.drugId);
    const next = { ...pump };

    if (!next.poweredOn) {
      next.running = false;
      next.bolusActive = false;
      next.alarmState = 'NONE';
      next.alarmMessage = null;
    } else {
      if (!next.containerLoaded && next.running) {
        next.running = false;
        next.bolusActive = false;
        next.alarmState = 'CRITICAL';
        next.alarmMessage =
          next.pumpType === 'SYRINGE' ? 'No OPS syringe loaded' : 'No IV bag on stand';
      } else if (!next.ivTubeConnected && next.running) {
        next.running = false;
        next.bolusActive = false;
        next.alarmState = 'CRITICAL';
        next.alarmMessage = 'IV tubing not connected to patient';
      } else if (!next.disposableLocked && next.running) {
        next.running = false;
        next.bolusActive = false;
        next.alarmState = 'CRITICAL';
        next.alarmMessage =
          next.pumpType === 'SYRINGE' ? 'Syringe bracket open' : 'Pump door open';
      }

      const effectiveRateMlH =
        next.containerLoaded && next.ivTubeConnected
          ? next.bolusActive
            ? drug.bolusRateMlH
            : next.running
              ? next.inKvoMode
                ? next.kvoRateMlH
                : next.rateMlH
              : 0
          : 0;

      if (
        next.running &&
        next.containerLoaded &&
        next.ivTubeConnected &&
        !next.occluded &&
        !next.antiBolusRewinding
      ) {
        const deliveredMl = (effectiveRateMlH * dtSec) / 3600;
        next.volumeInfusedMl = Number((next.volumeInfusedMl + deliveredMl).toFixed(4));
        next.volumeRemainingMl = Math.max(
          0,
          Number((next.volumeRemainingMl - deliveredMl).toFixed(4))
        );

        if (next.bolusActive) {
          next.bolusDeliveredMl = Number((next.bolusDeliveredMl + deliveredMl).toFixed(3));
        }

        if (!next.inKvoMode) {
          next.vtbiMl = Math.max(0, Number((next.vtbiMl - deliveredMl).toFixed(4)));
        }

        if (next.volumeRemainingMl <= 0.001) {
          next.volumeRemainingMl = 0;
          next.running = false;
          next.bolusActive = false;
          next.alarmState = 'CRITICAL';
          next.alarmMessage = next.pumpType === 'SYRINGE' ? 'Syringe empty' : 'IV Bag empty';
        } else if (next.vtbiMl <= 0.001 && !next.inKvoMode) {
          if (next.kvoEnabled) {
            next.inKvoMode = true;
            next.alarmState = 'PRE_ALARM';
            next.alarmMessage = `VTBI done · KVO ${next.kvoRateMlH.toFixed(1)} mL/h`;
          } else {
            next.running = false;
            next.alarmState = 'PRE_ALARM';
            next.alarmMessage = 'Target VTBI reached';
          }
        } else {
          const maxAllowedMmHg = OCCLUSION_PRESSURE_MMHG[next.occlusionLevel];
          const nominalPressure =
            next.pumpType === 'SYRINGE'
              ? 75 + effectiveRateMlH * 1.9
              : 85 + effectiveRateMlH * 0.4;

          next.linePressureMmHg = Math.round(
            next.linePressureMmHg +
              (nominalPressure - next.linePressureMmHg) * Math.min(1, dtSec * 2.5)
          );

          if (next.linePressureMmHg >= maxAllowedMmHg) {
            next.occluded = true;
            next.running = false;
            next.bolusActive = false;
            next.alarmState = 'CRITICAL';
            next.alarmMessage = `Occlusion (> L${next.occlusionLevel} · ${maxAllowedMmHg} mmHg)`;
          } else if (!acMainsConnected && batteryPct <= 12) {
            next.alarmState = batteryPct <= 5 ? 'CRITICAL' : 'PRE_ALARM';
            next.alarmMessage = `Battery low (${Math.round(batteryPct)}%)`;
          } else if (
            next.volumeRemainingMl > 0 &&
            next.volumeRemainingMl <= (next.pumpType === 'SYRINGE' ? 3.0 : 30.0)
          ) {
            next.alarmState = 'PRE_ALARM';
            next.alarmMessage = 'Near empty';
          } else if (!next.inKvoMode) {
            next.alarmState = 'NONE';
            next.alarmMessage = null;
          }
        }
      } else if (next.occluded) {
        next.running = false;
        next.bolusActive = false;
        next.alarmState = 'CRITICAL';
        const maxAllowedMmHg = OCCLUSION_PRESSURE_MMHG[next.occlusionLevel];
        next.alarmMessage = `Occlusion (> L${next.occlusionLevel} · ${maxAllowedMmHg} mmHg)`;
      } else if (!next.ivTubeConnected) {
        next.linePressureMmHg = 0;
      }
    }

    const activeInfusionRate =
      next.poweredOn &&
      next.running &&
      next.containerLoaded &&
      next.ivTubeConnected &&
      !next.occluded
        ? next.inKvoMode
          ? next.kvoRateMlH
          : next.rateMlH
        : 0;

    const rawTargetUnits =
      drug.referenceRateMlH > 0
        ? (activeInfusionRate / drug.referenceRateMlH) * (drug.weightBased ? weightScale : 1)
        : 0;

    const saturatedTarget =
      rawTargetUnits <= 1.8 ? rawTargetUnits : 1.8 + Math.log1p(rawTargetUnits - 1.8) * 0.85;

    const alpha = 1 - Math.exp(-drug.ke0PerSec * dtSec);
    next.effectSiteConcentration = Number(
      (
        next.effectSiteConcentration +
        alpha * (saturatedTarget - next.effectSiteConcentration)
      ).toFixed(4)
    );

    if (
      next.bolusActive &&
      next.poweredOn &&
      next.containerLoaded &&
      next.ivTubeConnected &&
      !next.occluded
    ) {
      next.bolusEffectImpulse = Math.min(1.6, next.bolusEffectImpulse + dtSec * 0.28);
    } else {
      next.bolusEffectImpulse = Number(
        (next.bolusEffectImpulse * Math.exp(-0.09 * dtSec)).toFixed(4)
      );
    }

    const totalEffect = next.effectSiteConcentration + next.bolusEffectImpulse;

    netDeltaMap += totalEffect * drug.pdEffects.deltaMapMmHg;
    netDeltaSysExtra += totalEffect * drug.pdEffects.deltaSysExtraMmHg;
    netDeltaHr += totalEffect * drug.pdEffects.deltaHrBpm;
    netDeltaCvp += totalEffect * drug.pdEffects.deltaCvpMmHg;
    netDeltaPap += totalEffect * drug.pdEffects.deltaPapMmHg;
    netDeltaIcp += totalEffect * drug.pdEffects.deltaIcpMmHg;
    netDeltaResp += totalEffect * drug.pdEffects.deltaRespRpm;
    netDeltaSt += totalEffect * drug.pdEffects.deltaStMm;
    netDeltaPi += totalEffect * drug.pdEffects.deltaPi;

    return next;
  });

  return {
    updatedPumps,
    netDeltaMap,
    netDeltaSysExtra,
    netDeltaHr,
    netDeltaCvp,
    netDeltaPap,
    netDeltaIcp,
    netDeltaResp,
    netDeltaSt,
    netDeltaPi,
  };
}

/**
 * Evaluates strictly Philips IntelliVue Monitor physiological & MMS/FMS technical INOP alarms.
 * (B. Braun pump mechanical alarms remain isolated on the B. Braun Space®plus station!)
 */
export function evaluateSystemAlarms(
  vitals: PatientVitals,
  thresholds: AlarmThresholds,
  modules: PhilipsHardwareModule[]
): ActiveAlarm[] {
  const alarms: ActiveAlarm[] = [];

  const isOperational = (key: PhilipsHardwareModule['parameterKey']) =>
    modules.some((m) => m.parameterKey === key && m.pluggedIn && m.cableWired);

  // Technical INOP / Low-Priority Cyan (!) advisories for Philips MMS/FMS modules
  for (const mod of modules) {
    if (mod.pluggedIn && !mod.cableWired) {
      alarms.push({
        id: `inop-unwired-${mod.slotId}`,
        source: 'INOP',
        priority: 'LOW_INOP',
        parameter: 'INOP',
        label: mod.parameterKey === 'MMS' ? '! ECG Leads Off' : `! ${mod.shortLabel} Sensor Off`,
        detail: `Wire ${mod.mNumber} cable`,
      });
    }
  }

  if (!thresholds.hr.enabled) {
    alarms.push({
      id: 'inop-ecg-alm-off',
      source: 'INOP',
      priority: 'LOW_INOP',
      parameter: 'INOP',
      label: 'Some ECG AlarmsOff',
      detail: 'HR alarm limits disabled',
    });
  } else if (Object.values(thresholds).some((t) => !t.enabled)) {
    alarms.push({
      id: 'inop-some-alm-off',
      source: 'INOP',
      priority: 'LOW_INOP',
      parameter: 'INOP',
      label: 'Some Alarms Off',
      detail: 'Selected parameter limits off',
    });
  }

  if (isOperational('MMS')) {
    if (vitals.rhythm === 'ASYSTOLE' || vitals.hr === 0) {
      alarms.push({
        id: 'mx800-asystole',
        source: 'MX800',
        priority: 'HIGH',
        parameter: 'RHYTHM',
        label: '*** Asystole',
        detail: 'Cardiac standstill',
        latched: true,
      });
    } else if (vitals.rhythm === 'VTACH') {
      alarms.push({
        id: 'mx800-vtach',
        source: 'MX800',
        priority: 'HIGH',
        parameter: 'RHYTHM',
        label: `*** Vent Tach ${vitals.hr}`,
        detail: 'Sustained ventricular tachycardia',
        latched: true,
      });
    } else if (vitals.hr >= 140) {
      // Matches "*** Extreme Tachy" in reference video!
      alarms.push({
        id: 'mx800-ext-tachy',
        source: 'MX800',
        priority: 'HIGH',
        parameter: 'hr',
        label: `*** Extreme Tachy ${vitals.hr} > 140`,
        detail: 'Extreme tachycardia',
      });
    } else if (vitals.rhythm === 'AFIB') {
      alarms.push({
        id: 'mx800-afib',
        source: 'MX800',
        priority: 'MEDIUM',
        parameter: 'RHYTHM',
        label: '** AFib',
        detail: 'Irregular supraventricular rhythm',
      });
    }
  }

  if (vitals.rhythm !== 'ASYSTOLE') {
    if (isOperational('MMS') && vitals.stIndex >= 4.0) {
      alarms.push({
        id: 'mx800-st-high',
        source: 'MX800',
        priority: 'HIGH',
        parameter: 'ST',
        label: `*** ST Multi ${vitals.stIndex.toFixed(1)}`,
        detail: 'Acute ST elevation/depression',
      });
    }

    if (isOperational('ABP')) {
      if (thresholds.abpMap.enabled && vitals.abpMap < 52) {
        alarms.push({
          id: 'mx800-map-crit',
          source: 'MX800',
          priority: 'HIGH',
          parameter: 'abpMap',
          label: `*** ${vitals.abpLabel}m ${vitals.abpMap} < 52`,
          detail: 'Extreme arterial hypotension',
        });
      } else if (thresholds.abpMap.enabled && vitals.abpMap < thresholds.abpMap.low) {
        alarms.push({
          id: 'mx800-map-low',
          source: 'MX800',
          priority: 'MEDIUM',
          parameter: 'abpMap',
          label: `** ${vitals.abpLabel}m ${vitals.abpMap} < ${thresholds.abpMap.low}`,
          detail: 'MAP below threshold',
        });
      } else if (thresholds.abpMap.enabled && vitals.abpMap > thresholds.abpMap.high) {
        alarms.push({
          id: 'mx800-map-high',
          source: 'MX800',
          priority: 'MEDIUM',
          parameter: 'abpMap',
          label: `** ${vitals.abpLabel}m ${vitals.abpMap} > ${thresholds.abpMap.high}`,
          detail: 'MAP above threshold',
        });
      }

      if (thresholds.abpSys.enabled && vitals.abpSys > thresholds.abpSys.high) {
        alarms.push({
          id: 'mx800-sys-high',
          source: 'MX800',
          priority: 'MEDIUM',
          parameter: 'abpSys',
          label: `** ${vitals.abpLabel}s ${vitals.abpSys} > ${thresholds.abpSys.high}`,
          detail: 'Systolic ABP high',
        });
      } else if (thresholds.abpSys.enabled && vitals.abpSys < thresholds.abpSys.low) {
        alarms.push({
          id: 'mx800-sys-low',
          source: 'MX800',
          priority: 'MEDIUM',
          parameter: 'abpSys',
          label: `** ${vitals.abpLabel}s ${vitals.abpSys} < ${thresholds.abpSys.low}`,
          detail: 'Systolic ABP low',
        });
      }
    }

    if (isOperational('PAP_CVP')) {
      if (thresholds.papMap.enabled && vitals.papZeroed) {
        if (vitals.papMap > thresholds.papMap.high) {
          alarms.push({
            id: 'mx800-pap-high',
            source: 'MX800',
            priority: 'MEDIUM',
            parameter: 'papMap',
            label: `** PAPm ${vitals.papMap} > ${thresholds.papMap.high}`,
            detail: 'Pulmonary hypertension',
          });
        } else if (vitals.papMap < thresholds.papMap.low) {
          alarms.push({
            id: 'mx800-pap-low',
            source: 'MX800',
            priority: 'MEDIUM',
            parameter: 'papMap',
            label: `** PAPm ${vitals.papMap} < ${thresholds.papMap.low}`,
            detail: 'PAP mean low',
          });
        }
      }

      if (thresholds.cvp.enabled && vitals.cvpZeroed) {
        if (vitals.cvp > thresholds.cvp.high) {
          alarms.push({
            id: 'mx800-cvp-high',
            source: 'MX800',
            priority: 'MEDIUM',
            parameter: 'cvp',
            label: `** CVPm ${vitals.cvp} > ${thresholds.cvp.high}`,
            detail: 'Elevated central venous pressure',
          });
        } else if (vitals.cvp < thresholds.cvp.low) {
          alarms.push({
            id: 'mx800-cvp-low',
            source: 'MX800',
            priority: 'MEDIUM',
            parameter: 'cvp',
            label: `** CVPm ${vitals.cvp} < ${thresholds.cvp.low}`,
            detail: 'Low central venous pressure',
          });
        }
      }
    }

    if (isOperational('ICP') && thresholds.icp.enabled && vitals.icpZeroed) {
      if (vitals.icp > thresholds.icp.high) {
        alarms.push({
          id: 'mx800-icp-high',
          source: 'MX800',
          priority: vitals.icp >= 25 ? 'HIGH' : 'MEDIUM',
          parameter: 'icp',
          label: `${vitals.icp >= 25 ? '***' : '**'} ICPm ${vitals.icp} > ${thresholds.icp.high}`,
          detail: `CPP ${vitals.cpp} mmHg`,
        });
      } else if (vitals.icp < thresholds.icp.low) {
        alarms.push({
          id: 'mx800-icp-low',
          source: 'MX800',
          priority: 'MEDIUM',
          parameter: 'icp',
          label: `** ICPm ${vitals.icp} < ${thresholds.icp.low}`,
          detail: 'ICP below low limit',
        });
      }
    }

    if (isOperational('CO2') && thresholds.etco2.enabled) {
      if (vitals.etco2 > thresholds.etco2.high) {
        alarms.push({
          id: 'mx800-etco2-high',
          source: 'MX800',
          priority: 'MEDIUM',
          parameter: 'etco2',
          label: `** etCO2 ${vitals.etco2} > ${thresholds.etco2.high}`,
          detail: 'Hypercapnia',
        });
      } else if (vitals.etco2 < thresholds.etco2.low) {
        alarms.push({
          id: 'mx800-etco2-low',
          source: 'MX800',
          priority: vitals.etco2 < 15 ? 'HIGH' : 'MEDIUM',
          parameter: 'etco2',
          label: `${vitals.etco2 < 15 ? '***' : '**'} etCO2 ${vitals.etco2} < ${thresholds.etco2.low}`,
          detail: 'Hypocapnia / low cardiac output',
        });
      }
    }

    if (isOperational('MMS') && thresholds.respRate.enabled) {
      if (vitals.respRate === 0) {
        alarms.push({
          id: 'mx800-apnea',
          source: 'MX800',
          priority: 'HIGH',
          parameter: 'respRate',
          label: '*** Apnea',
          detail: 'No respiration detected',
        });
      } else if (vitals.respRate > thresholds.respRate.high) {
        alarms.push({
          id: 'mx800-rr-high',
          source: 'MX800',
          priority: 'MEDIUM',
          parameter: 'respRate',
          label: `** RR ${vitals.respRate} > ${thresholds.respRate.high}`,
          detail: 'Tachypnea',
        });
      } else if (vitals.respRate < thresholds.respRate.low) {
        alarms.push({
          id: 'mx800-rr-low',
          source: 'MX800',
          priority: 'MEDIUM',
          parameter: 'respRate',
          label: `** RR ${vitals.respRate} < ${thresholds.respRate.low}`,
          detail: 'Bradypnea',
        });
      }
    }

    if (isOperational('TEMP') && thresholds.tempCoreC.enabled) {
      if (vitals.tempCoreC > thresholds.tempCoreC.high) {
        alarms.push({
          id: 'mx800-temp-high',
          source: 'MX800',
          priority: 'MEDIUM',
          parameter: 'tempCoreC',
          label: `** Temp ${vitals.tempCoreC.toFixed(1)} > ${thresholds.tempCoreC.high.toFixed(1)}`,
          detail: 'Pyrexia / hyperthermia',
        });
      } else if (vitals.tempCoreC < thresholds.tempCoreC.low) {
        alarms.push({
          id: 'mx800-temp-low',
          source: 'MX800',
          priority: 'MEDIUM',
          parameter: 'tempCoreC',
          label: `** Temp ${vitals.tempCoreC.toFixed(1)} < ${thresholds.tempCoreC.low.toFixed(1)}`,
          detail: 'Hypothermia',
        });
      }
    }

    if (
      isOperational('MMS') &&
      thresholds.spo2.enabled &&
      vitals.spo2 > 0 &&
      vitals.spo2 < thresholds.spo2.low
    ) {
      alarms.push({
        id: 'mx800-spo2',
        source: 'MX800',
        priority: vitals.spo2 < 85 ? 'HIGH' : 'MEDIUM',
        parameter: 'spo2',
        label: `${vitals.spo2 < 85 ? '*** Desat' : '** SpO2'} ${vitals.spo2} < ${thresholds.spo2.low}`,
        detail: 'Arterial desaturation',
      });
    }

    if (
      isOperational('MMS') &&
      thresholds.hr.enabled &&
      vitals.rhythm !== 'VTACH' &&
      vitals.hr < 140
    ) {
      if (vitals.hr > thresholds.hr.high) {
        alarms.push({
          id: 'mx800-hr-high',
          source: 'MX800',
          priority: 'MEDIUM',
          parameter: 'hr',
          label: `** Tachy ${vitals.hr} > ${thresholds.hr.high}`,
          detail: 'Heart rate high',
        });
      } else if (vitals.hr < thresholds.hr.low) {
        alarms.push({
          id: 'mx800-hr-low',
          source: 'MX800',
          priority: vitals.hr < 40 ? 'HIGH' : 'MEDIUM',
          parameter: 'hr',
          label: `${vitals.hr < 40 ? '*** Extreme Brady' : '** Brady'} ${vitals.hr} < ${thresholds.hr.low}`,
          detail: 'Bradycardia',
        });
      }
    }
  }

  const rank = { HIGH: 0, MEDIUM: 1, LOW_INOP: 2 };
  return alarms.sort((a, b) => rank[a.priority] - rank[b.priority]);
}

const LEAD_MORPHOLOGY: Record<
  EcgLead,
  { p: number; q: number; r: number; s: number; t: number }
> = {
  I: { p: 0.10, q: -0.07, r: 0.82, s: -0.14, t: 0.22 },
  II: { p: 0.13, q: -0.08, r: 1.18, s: -0.18, t: 0.27 },
  III: { p: 0.07, q: -0.05, r: 0.54, s: -0.16, t: 0.14 },
  aVR: { p: -0.12, q: 0.07, r: -0.92, s: 0.15, t: -0.24 },
  aVL: { p: 0.06, q: -0.06, r: 0.52, s: -0.12, t: 0.15 },
  aVF: { p: 0.11, q: -0.07, r: 0.88, s: -0.16, t: 0.22 },
  V1: { p: 0.06, q: 0.0, r: 0.26, s: -0.92, t: -0.10 },
  V2: { p: 0.08, q: 0.0, r: 0.48, s: -0.84, t: 0.22 },
  V3: { p: 0.09, q: -0.03, r: 0.78, s: -0.54, t: 0.28 },
  V4: { p: 0.10, q: -0.07, r: 1.16, s: -0.28, t: 0.30 },
  V5: { p: 0.10, q: -0.09, r: 1.06, s: -0.16, t: 0.27 },
  V6: { p: 0.09, q: -0.08, r: 0.96, s: -0.11, t: 0.24 },
};

function gaussian(x: number, mu: number, sigma: number): number {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z);
}

function asymmetricBell(x: number, mu: number, sigmaLeft: number, sigmaRight: number): number {
  const s = x < mu ? sigmaLeft : sigmaRight;
  const z = (x - mu) / s;
  return Math.exp(-0.5 * z * z);
}

interface FourierTemplate {
  a: readonly number[];
  b: readonly number[];
  min: number;
  max: number;
}

/**
 * Evaluates a C-infinity smooth periodic Fourier template normalized strictly to [0, 1].
 * Zero corners, zero flat-tail artifacts, and seamless continuity across phase wrap 1 -> 0.
 */
function evalNormalizedFourier(phase: number, tpl: FourierTemplate): number {
  const p = ((phase % 1) + 1) % 1;
  let sum = tpl.a[0];
  const twoPiP = 2 * Math.PI * p;
  for (let k = 1; k < tpl.a.length; k++) {
    const th = twoPiP * k;
    sum += tpl.a[k] * Math.cos(th) + tpl.b[k] * Math.sin(th);
  }
  const norm = (sum - tpl.min) / (tpl.max - tpl.min);
  return Math.max(0, Math.min(1, norm));
}

// Fitted directly to real Philips IntelliVue SpO2 Plethysmogram (image_8e9d3721.png):
// Rounded trough at 0.00 -> brisk smooth rise to 1.00 -> smooth dip below center line (~0.30) -> soft dicrotic arch kissing center line (~0.49) -> smooth descent to 0.00
const PLETH_FOURIER: FourierTemplate = {
  a: [0.42702, -0.12937, -0.24553, -0.02292, -0.02052, 0.00806],
  b: [0, 0.25894, 0.10096, -0.0499, -0.01591, 0.00891],
  min: -0.01354,
  max: 0.98723,
};

// Fitted directly to real Philips IntelliVue Radial ABP (120/70):
// Brisk arterial upstroke -> rounded systolic peak -> distinct smooth dicrotic notch & wave -> clean diastolic runoff
const ABP_FOURIER: FourierTemplate = {
  a: [0.39044, -0.10929, -0.11545, -0.13948, -0.00755, -0.008, 0.00398],
  b: [0, 0.29159, 0.16931, -0.0216, -0.03007, -0.00274, -0.0012],
  min: -0.03463,
  max: 0.98256,
};

// Fitted directly to real Philips IntelliVue PAP (28/15):
// Smooth right-ventricular upstroke -> rounded crest -> pulmonary dicrotic shoulder -> diastolic runoff to 15 mmHg
const PAP_FOURIER: FourierTemplate = {
  a: [0.39866, -0.12816, -0.17893, -0.07169, -0.00332, 0.00137],
  b: [0, 0.30046, 0.14443, -0.06848, -0.00179, -0.00795],
  min: -0.02451,
  max: 0.9823,
};

// Fitted to physiological Central Venous Pressure (a-wave, c-inflection, x-descent, v-wave, y-descent)
const CVP_FOURIER: FourierTemplate = {
  a: [0.41997, 0.06261, -0.18784, -0.01071, -0.04954, -0.01588],
  b: [0, 0.13415, 0.33508, -0.03018, -0.00171, -0.01907],
  min: -0.00236,
  max: 1.00431,
};

export function synthesizeSingleLeadEcg(
  lead: EcgLead,
  beatPhase: number,
  timeSec: number,
  vitals: PatientVitals
): number {
  if (vitals.rhythm === 'ASYSTOLE' || vitals.hr <= 0) {
    return 0;
  }
  if (vitals.rhythm === 'VTACH') {
    const w = beatPhase * Math.PI * 2;
    const pol = lead === 'aVR' || lead === 'V1' ? -0.9 : 1.0;
    return (
      (Math.sin(w) * 0.92 + Math.sin(2 * w + 0.52) * 0.26) *
      pol *
      vitals.ecgGain
    );
  }

  const m = LEAD_MORPHOLOGY[lead];
  const pWave =
    vitals.rhythm === 'AFIB'
      ? 0
      : m.p * gaussian(beatPhase, 0.165, 0.021);

  const afibRipple =
    vitals.rhythm === 'AFIB'
      ? Math.sin(timeSec * 34) * 0.022 + Math.sin(timeSec * 51) * 0.014
      : 0;

  const atrialPace = vitals.paced && Math.abs(beatPhase - 0.13) < 0.003 ? 0.5 : 0;
  const ventPace = vitals.paced && Math.abs(beatPhase - 0.262) < 0.0035 ? 0.95 : 0;

  // Clean, narrow, flat-baseline Philips QRS complex
  const qWave = m.q * gaussian(beatPhase, 0.28, 0.0068);
  const rWave = m.r * gaussian(beatPhase, 0.30, 0.0085);
  const sWave = m.s * gaussian(beatPhase, 0.32, 0.0088);

  const stMm = vitals.stValues[lead] ?? 0;
  const stShiftActive = Math.abs(stMm) > 0.35 ? stMm : 0;
  const stPlateau =
    stShiftActive *
    0.11 *
    (1 / (1 + Math.exp(-(beatPhase - 0.342) / 0.011))) *
    (1 / (1 + Math.exp((beatPhase - 0.54) / 0.022)));

  const tWave =
    (m.t + stShiftActive * 0.05) * asymmetricBell(beatPhase, 0.515, 0.05, 0.038);

  return (
    (pWave +
      afibRipple +
      atrialPace +
      ventPace +
      qWave +
      rWave +
      sWave +
      stPlateau +
      tWave) *
    vitals.ecgGain
  );
}

export function sampleAllTwelveLeadsEcg(
  beatPhase: number,
  timeSec: number,
  vitals: PatientVitals
): Record<EcgLead, number> {
  const out = {} as Record<EcgLead, number>;
  for (const lead of ALL_TWELVE_LEADS) {
    out[lead] = synthesizeSingleLeadEcg(lead, beatPhase, timeSec, vitals);
  }
  return out;
}

export function samplePhysiologicalWaveforms(
  beatPhase: number,
  respPhase: number,
  timeSec: number,
  vitals: PatientVitals
): {
  ecg: number;
  ecgSecondary: number;
  pleth: number;
  respWave: number;
  abpMmHg: number;
  papMmHg: number;
  cvpMmHg: number;
  icpMmHg: number;
  co2MmHg: number;
  awpCmH2O: number;
  eegUv: number;
} {
  const ecg = synthesizeSingleLeadEcg(vitals.ecgLead, beatPhase, timeSec, vitals);
  const ecgSecondary = synthesizeSingleLeadEcg(
    vitals.secondaryEcgLead,
    beatPhase,
    timeSec,
    vitals
  );

  // Smooth Thoracic Impedance Respiration Wave
  let respWave = 0;
  if (vitals.respRate > 0 && vitals.rhythm !== 'ASYSTOLE') {
    const bell = Math.pow(0.5 - 0.5 * Math.cos(respPhase * Math.PI * 2), 1.3);
    respWave = (bell - 0.42) * 1.15;
  }

  // Crisp Philips Sidestream Capnogram (CO2 mmHg — flat 0 inspiratory baseline, steep rise, gently rising flat alveolar plateau, clean drop)
  let co2MmHg = vitals.imco2;
  if (vitals.respRate > 0 && vitals.etco2 > 0 && vitals.rhythm !== 'ASYSTOLE') {
    const base = vitals.imco2;
    const span = Math.max(0, vitals.etco2 - base);
    if (respPhase >= 0.34 && respPhase < 0.40) {
      const u = (respPhase - 0.34) / 0.06;
      const smoothUp = 0.5 - 0.5 * Math.cos(Math.PI * u);
      co2MmHg = base + span * 0.92 * smoothUp;
    } else if (respPhase >= 0.40 && respPhase < 0.88) {
      const u = (respPhase - 0.40) / 0.48;
      co2MmHg = base + span * (0.92 + 0.08 * u);
    } else if (respPhase >= 0.88 && respPhase < 0.93) {
      const u = (respPhase - 0.88) / 0.05;
      const smoothDown = 0.5 + 0.5 * Math.cos(Math.PI * u);
      co2MmHg = base + span * smoothDown;
    }
  }

  // Ventilator Airway Pressure (AWP cmH2O)
  let awpCmH2O = vitals.peepCmH2O;
  if (vitals.respRate > 0) {
    const spanP = Math.max(4, vitals.pipCmH2O - vitals.peepCmH2O);
    if (respPhase < 0.28) {
      const u = respPhase / 0.28;
      awpCmH2O = vitals.peepCmH2O + spanP * (0.5 - 0.5 * Math.cos(Math.PI * u));
    } else if (respPhase < 0.36) {
      const u = (respPhase - 0.28) / 0.08;
      awpCmH2O = vitals.peepCmH2O + spanP * (0.5 + 0.5 * Math.cos(Math.PI * u));
    }
  }

  // Radial Arterial Blood Pressure (ABP mmHg)
  let abpMmHg = vitals.abpMap;
  if (vitals.rhythm !== 'ASYSTOLE' && vitals.abpSys > vitals.abpDia + 2) {
    const pPhase = (beatPhase - 0.31 + 1) % 1;
    const pp = Math.max(8, vitals.abpSys - vitals.abpDia);
    abpMmHg = vitals.abpDia + pp * evalNormalizedFourier(pPhase, ABP_FOURIER);
  }

  // Pulmonary Artery Pressure (PAP mmHg)
  let papMmHg = vitals.papMap;
  if (vitals.rhythm !== 'ASYSTOLE' && vitals.papSys > vitals.papDia + 1) {
    const papPhase = (beatPhase - 0.33 + 1) % 1;
    const papPp = Math.max(4, vitals.papSys - vitals.papDia);
    papMmHg = vitals.papDia + papPp * evalNormalizedFourier(papPhase, PAP_FOURIER);
  }

  // Philips Auto-Scaled SpO2 Plethysmograph [0..1] (exact match to image_8e9d3721.png)
  let pleth = 0.5;
  if (vitals.rhythm !== 'ASYSTOLE' && vitals.perfusionIndex > 0.05) {
    const sPhase = (beatPhase - 0.38 + 1) % 1;
    const rawPleth = evalNormalizedFourier(sPhase, PLETH_FOURIER);
    // Philips FAST-SpO2 Pleth auto-scales normal perfusion (>= 1.1) across full [0..1] dotted envelope
    const autoScale = vitals.perfusionIndex >= 1.1 ? 1.0 : Math.max(0.28, vitals.perfusionIndex / 1.1);
    pleth = (1 - autoScale) * 0.5 + rawPleth * autoScale;
  }

  // Central Venous Pressure (CVP mmHg — gentle a/c/v venous oscillation around mean CVP)
  let cvpMmHg = vitals.cvp;
  if (vitals.rhythm !== 'ASYSTOLE') {
    const cPhase = (beatPhase - 0.14 + 1) % 1;
    const normCvp = evalNormalizedFourier(cPhase, CVP_FOURIER);
    cvpMmHg = Math.max(0, vitals.cvp - 1.9 + normCvp * 4.2);
  }

  // Intracranial Pressure (ICP mmHg)
  let icpMmHg = vitals.icp;
  if (vitals.rhythm !== 'ASYSTOLE') {
    const iPhase = (beatPhase - 0.35 + 1) % 1;
    const amp = vitals.icp >= 20 ? 5.0 : 2.8;
    const normIcp = evalNormalizedFourier(iPhase, PAP_FOURIER);
    icpMmHg = Math.max(0, vitals.icp - amp * 0.42 + amp * normIcp);
  }

  // Cerebral EEG wave
  const eegUv =
    Math.sin(timeSec * 28.0) * 0.34 +
    Math.sin(timeSec * 14.5 + 0.8) * 0.28;

  return {
    ecg,
    ecgSecondary,
    pleth,
    respWave,
    abpMmHg,
    papMmHg,
    cvpMmHg,
    icpMmHg,
    co2MmHg,
    awpCmH2O,
    eegUv,
  };
}

export function generateInitialTrends(nowMs: number): TrendPoint[] {
  const points: TrendPoint[] = [];
  const totalPoints = 49;
  for (let i = totalPoints - 1; i >= 0; i--) {
    const ts = nowMs - i * 5 * 60 * 1000;
    const progress = (totalPoints - 1 - i) / (totalPoints - 1);
    const map = Math.round(76 + progress * 14 + Math.sin(i * 0.6) * 2);
    const sys = Math.round(map + 29 + Math.cos(i * 0.5) * 2);
    const dia = Math.round(map - 20 + Math.sin(i * 0.4) * 2);
    const hr = Math.round(68 - progress * 8 + Math.sin(i * 0.7) * 2);
    points.push({
      timestampMs: ts,
      timeLabel: new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hr,
      spo2: Math.min(100, Math.round(96 + progress * 2)),
      abpSys: sys,
      abpDia: dia,
      abpMap: map,
      papMap: 21,
      cvp: 9,
      icp: 9,
      etco2: 33,
      respRate: 15,
      tempCoreC: 37.0,
      norepiRateMlH: 5.0,
      crystalloidMlH: 80,
    });
  }
  return points;
}
