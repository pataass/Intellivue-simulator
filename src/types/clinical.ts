export type WorkspaceScreen = 'LAUNCHER' | 'INTELLIVUE' | 'BBRAUN' | 'MODULE_RACK';

export type MonitorModel = 'MX400' | 'MX700' | 'MX800';

export type EcgLead =
  | 'I'
  | 'II'
  | 'III'
  | 'aVR'
  | 'aVL'
  | 'aVF'
  | 'V1'
  | 'V2'
  | 'V3'
  | 'V4'
  | 'V5'
  | 'V6';

export type CardiacRhythm = 'SINUS' | 'VTACH' | 'AFIB' | 'ASYSTOLE';

export type MonitorScreenView =
  | 'SIX_WAVES'
  | 'EIGHT_WAVES'
  | 'FOUR_WAVES'
  | 'THREE_WAVES'
  | 'OVERLAP_WAVES'
  | 'STANDARD_WAVES'
  | 'DYNAMIC_WAVES'
  | 'ST_MAP_SPLIT'
  | 'ST_MAP_FULL'
  | 'TWELVE_LEAD'
  | 'BIG_NUMBERS'
  | 'CO_HEMO'
  | 'TRENDS'
  | 'IPC_BIOSCI';

export type WaveTraceId =
  | 'ECG_I'
  | 'ECG_II'
  | 'ECG_III'
  | 'ECG_aVR'
  | 'ECG_aVL'
  | 'ECG_aVF'
  | 'ECG_V1'
  | 'ECG_V2'
  | 'ECG_V3'
  | 'ECG_V4'
  | 'ECG_V5'
  | 'ECG_V6'
  | 'PLETH'
  | 'ABP'
  | 'PAP'
  | 'CVP'
  | 'OVERLAP_PRESS'
  | 'ICP'
  | 'CO2'
  | 'RESP'
  | 'AWP'
  | 'EEG'
  | 'OFF';

export type Co2SpeedRatio = 0.25 | 0.5 | 1;

export type TempUnit = 'C' | 'F';

export type AlarmToneStandard = 'PHILIPS' | 'IEC';

export type BBraunHardwareLine = 'SPACE' | 'SPACE_PLUS';

export type BBraunSpaceLineType =
  | 'SPACE_LINE_STANDARD'
  | 'SPACE_LINE_UV'
  | 'SPACE_LINE_SAFESET';

export type MonitorScenarioId =
  | 'BASELINE'
  | 'SEPTIC_SHOCK'
  | 'ANTERIOR_STEMI'
  | 'INFERIOR_ISCHEMIA'
  | 'NEURO_ICP_SURGE'
  | 'ARRHYTHMIA_VTACH'
  | 'ARRHYTHMIA_ASYSTOLE'
  | 'ARRHYTHMIA_AFIB';

export type PumpScenarioId =
  | 'PUMP_NORMAL'
  | 'OCCLUSION_DOWNSTREAM'
  | 'SYRINGE_EMPTY'
  | 'AIR_OR_UNPLUGGED_LINE';

export type ClinicalScenarioId = MonitorScenarioId | Exclude<PumpScenarioId, 'PUMP_NORMAL'>;

export type TwelveLeadStMap = Record<EcgLead, number>;

export interface DirectVitalTargets {
  rhythm: CardiacRhythm;
  hr: number;
  abpSys: number;
  abpDia: number;
  spo2: number;
  etco2: number;
  respRate: number;
  papSys: number;
  papDia: number;
  cvp: number;
  icp: number;
  tempCoreC: number;
}

export interface PatientVitals {
  patientName: string;
  bedLabel: 'Bed 1';
  admitted: boolean;
  category: 'Adult' | 'Pediatric';
  paced: boolean;
  profileName: string;
  overlapWaves: boolean;
  co2SpeedRatio: Co2SpeedRatio;
  hr: number;
  pvcCount: number;
  rhythm: CardiacRhythm;
  ecgLead: EcgLead;
  secondaryEcgLead: EcgLead;
  ecgGain: 0.5 | 1 | 2 | 4;
  dottedPressureWaves: boolean;
  abpLabel: 'ABP' | 'ART' | 'Ao';
  pulseSource: 'SpO2' | 'ABP';
  stValues: TwelveLeadStMap;
  stReference: TwelveLeadStMap;
  stIndex: number;
  stPointMs: 40 | 60 | 80;
  spo2: number;
  pulseRate: number;
  perfusionIndex: number;
  abpSys: number;
  abpDia: number;
  abpMap: number;
  abpZeroed: boolean;
  abpScale: 100 | 150 | 200 | 300;
  papSys: number;
  papDia: number;
  papMap: number;
  papZeroed: boolean;
  cvp: number;
  cvpZeroed: boolean;
  icp: number;
  cpp: number;
  icpZeroed: boolean;
  nbpSys: number;
  nbpDia: number;
  nbpMap: number;
  nbpTimestamp: string;
  nbpRepeatMin: 0 | 5 | 10 | 15 | 30 | 60; // 0 = Manual
  nbpStatActive: boolean;
  nbpInflating: boolean;
  nbpCuffPressure: number;
  venipunctureActive: boolean;
  venipunctureSecRemaining: number;
  etco2: number;
  imco2: number;
  awrr: number;
  respRate: number;
  pipCmH2O: number;
  peepCmH2O: number;
  tidalVolumeMl: number;
  tempCoreC: number;
  tempSkinC: number;
  coLMin: number;
  ciLMinM2: number;
  coMeasuring: boolean;
  coLastTime: string;
  eegBis: number;
}

export interface AlarmRange {
  low: number;
  high: number;
  enabled: boolean;
}

export interface AlarmThresholds {
  hr: AlarmRange;
  spo2: AlarmRange;
  abpSys: AlarmRange;
  abpMap: AlarmRange;
  papMap: AlarmRange;
  cvp: AlarmRange;
  icp: AlarmRange;
  etco2: AlarmRange;
  respRate: AlarmRange;
  tempCoreC: AlarmRange;
}

export type AlarmPriority = 'HIGH' | 'MEDIUM' | 'LOW_INOP';

export interface ActiveAlarm {
  id: string;
  source: 'MX800' | 'PERFUSOR' | 'INFUSOMAT' | 'SPACESTATION' | 'INOP';
  priority: AlarmPriority;
  parameter?: keyof AlarmThresholds | 'RHYTHM' | 'PUMP' | 'ST' | 'INOP';
  label: string;
  detail: string;
  latched?: boolean;
}

export interface PhilipsHardwareModule {
  slotId: string;
  slotNumberLabel: string;
  mNumber: string;
  shortLabel: string;
  fullName: string;
  widthSlots: 1 | 2;
  socketColor:
    | 'PURPLE_SQUARE'
    | 'BROWN'
    | 'YELLOW'
    | 'PURPLE'
    | 'ORANGE'
    | 'CYAN'
    | 'MMS_MULTI';
  cableColorHex: string;
  cableName: string;
  buttons: string[];
  pluggedIn: boolean;
  cableWired: boolean;
  parameterKey:
    | 'MMS'
    | 'CO2'
    | 'NBP'
    | 'TEMP'
    | 'EEG'
    | 'ABP'
    | 'PAP_CVP'
    | 'CO'
    | 'ICP';
  statusText: string;
}

export type DoseUnit =
  | 'mcg/kg/min'
  | 'units/min'
  | 'mg/kg/h'
  | 'mcg/kg/h'
  | 'mcg/h'
  | 'mg/h'
  | 'mg/min'
  | 'U/kg/h'
  | 'mL/h';

export type DrugBannerTheme =
  | 'SPLIT_RED_BLUE'
  | 'OPIOID_BLUE'
  | 'VASOPRESSOR_VIOLET'
  | 'SEDATIVE_YELLOW'
  | 'HEPARIN_WHITE'
  | 'INOTROPE_PINK'
  | 'STANDARD_DARK';

export interface DrugDefinition {
  id: string;
  name: string;
  tallManName: string;
  genericQueryName: string;
  fdaBrandHint?: string;
  bannerTheme: DrugBannerTheme;
  category:
    | 'VASOPRESSOR'
    | 'INOTROPE'
    | 'SEDATIVE'
    | 'ANALGESIC'
    | 'ANTIARRHYTHMIC'
    | 'ANTICOAGULANT'
    | 'ANTIBIOTIC'
    | 'DIURETIC'
    | 'CRYSTALLOID';
  pumpTypeSuitability: ('SYRINGE' | 'VOLUMETRIC')[];
  concentrationMgPerMl: number;
  concentrationLabel: string;
  standardDiluentVolumeMl: number;
  totalDrugAmountLabel: string;
  doseUnit: DoseUnit;
  weightBased: boolean;
  intermittentCapable?: boolean;
  intermittentSummary?: { totalDoseLabel: string; overDurationLabel: string };
  defaultRateMlH: number;
  softMaxRateMlH: number;
  hardMaxRateMlH: number;
  bolusAllowed: boolean;
  bolusDefaultMl: number;
  bolusRateMlH: number;
  ke0PerSec: number;
  referenceRateMlH: number;
  pdEffects: {
    deltaMapMmHg: number;
    deltaSysExtraMmHg: number;
    deltaHrBpm: number;
    deltaCvpMmHg: number;
    deltaPapMmHg: number;
    deltaIcpMmHg: number;
    deltaRespRpm: number;
    deltaStMm: number;
    deltaPi: number;
  };
  clinicalNote: string;
}

export type PumpType = 'SYRINGE' | 'VOLUMETRIC';
export type OcclusionLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type DataLockLevel = 0 | 1 | 2;
export type SyringeSizeMl = 10 | 20 | 50;
export type SpacePlusScreenView = 'RUN_VIEW' | 'DETAIL_VIEW' | 'DRUG_GUARD_VIEW';

export interface PumpChannelState {
  id: string;
  bayIndex: 1 | 2 | 3 | 4;
  name: string;
  model:
    | 'Infusomat® Space'
    | 'Perfusor® Space'
    | 'Spaceplus Infusomat®'
    | 'Spaceplus Perfusor®';
  pumpType: PumpType;
  spaceLineType: BBraunSpaceLineType;
  poweredOn: boolean;
  powerHoldProgress: number;
  running: boolean;
  intermittentMode: boolean;
  screenView: SpacePlusScreenView;
  bolusActive: boolean;
  bolusDeliveredMl: number;
  drugId: string;
  rateMlH: number;
  vtbiMl: number;
  volumeRemainingMl: number;
  containerTotalMl: number;
  volumeInfusedMl: number;
  syringeSizeMl: SyringeSizeMl;
  containerLoaded: boolean;
  ivTubeConnected: boolean;
  ivTubePrimed: boolean;
  kvoEnabled: boolean;
  kvoRateMlH: number;
  inKvoMode: boolean;
  occlusionLevel: OcclusionLevel;
  linePressureMmHg: number;
  occluded: boolean;
  antiBolusRewinding: boolean;
  bayLatchLocked: boolean;
  disposableLocked: boolean;
  dataLockLevel: DataLockLevel;
  alarmState: 'NONE' | 'PRE_ALARM' | 'CRITICAL';
  alarmMessage: string | null;
  effectSiteConcentration: number;
  bolusEffectImpulse: number;
}

export interface TrendPoint {
  timestampMs: number;
  timeLabel: string;
  hr: number;
  spo2: number;
  abpSys: number;
  abpDia: number;
  abpMap: number;
  papMap: number;
  cvp: number;
  icp: number;
  etco2: number;
  respRate: number;
  tempCoreC: number;
  norepiRateMlH: number;
  crystalloidMlH: number;
}

export interface PubChemCompoundProfile {
  queryName: string;
  cid: number;
  title: string;
  iupacName: string;
  molecularFormula: string;
  molecularWeight: number;
  canonicalSmiles: string;
  inChIKey: string;
  xLogP: number | null;
  tpsa: number;
  hBondDonors: number;
  hBondAcceptors: number;
  rotatableBonds: number;
  complexity: number;
  charge: number;
  image2dUrl: string;
  pubchemUrl: string;
  pharmacologySummary: string | null;
  ghsHazardSummary: string | null;
  lipinskiViolations: number;
  lipinskiPass: boolean;
  veberPass: boolean;
  bbbLikely: boolean;
}

export interface OpenFdaReactionCount {
  term: string;
  count: number;
}

export interface OpenFdaMonograph {
  queryName: string;
  brandNames: string[];
  genericNames: string[];
  manufacturerNames: string[];
  route: string[];
  pharmClassMoa: string[];
  pharmClassEpc: string[];
  boxedWarning: string | null;
  indicationsAndUsage: string | null;
  dosageAndAdministration: string | null;
  contraindications: string | null;
  warningsAndPrecautions: string | null;
  topReactions: OpenFdaReactionCount[];
  totalAdverseEvents: number;
  sourceLabelUrl: string;
  sourceEventsUrl: string;
}

export interface CombinedBioscienceDrugRecord {
  pubchem: PubChemCompoundProfile | null;
  openfda: OpenFdaMonograph | null;
  pubchemError?: string;
  openfdaError?: string;
  fetchedAt: string;
}
