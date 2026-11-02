import { DrugDefinition, OcclusionLevel } from '../types/clinical';

export const OCCLUSION_PRESSURE_MMHG: Record<OcclusionLevel, number> = {
  1: 75,
  2: 150,
  3: 225,
  4: 300,
  5: 450,
  6: 600,
  7: 700,
  8: 800,
  9: 900,
};

export const ICU_DRUG_LIBRARY: DrugDefinition[] = [
  {
    id: 'sterofundin',
    name: 'Sterofundin ISO',
    tallManName: 'Sterofundin',
    genericQueryName: 'sodium chloride',
    bannerTheme: 'STANDARD_DARK',
    category: 'CRYSTALLOID',
    pumpTypeSuitability: ['VOLUMETRIC'],
    concentrationMgPerMl: 6.8,
    concentrationLabel: '1000 mL Balanced Isotonic',
    standardDiluentVolumeMl: 1000,
    totalDrugAmountLabel: '1000 mL',
    doseUnit: 'mL/h',
    weightBased: false,
    defaultRateMlH: 80.0,
    softMaxRateMlH: 500.0,
    hardMaxRateMlH: 1200.0,
    bolusAllowed: true,
    bolusDefaultMl: 100.0,
    bolusRateMlH: 999,
    ke0PerSec: 0.09,
    referenceRateMlH: 250.0,
    pdEffects: {
      deltaMapMmHg: 7,
      deltaSysExtraMmHg: 5,
      deltaHrBpm: -4,
      deltaCvpMmHg: 3.5,
      deltaPapMmHg: 2.5,
      deltaIcpMmHg: 0.3,
      deltaRespRpm: 0,
      deltaStMm: 0,
      deltaPi: 0.4,
    },
    clinicalNote: 'Balanced isotonic crystalloid solution for intravascular fluid replacement.',
  },
  {
    id: 'pip_tazo',
    name: 'Piperacillin + Tazobactam',
    tallManName: 'Piperacillin + Tazobactam',
    genericQueryName: 'piperacillin',
    fdaBrandHint: 'ZOSYN',
    bannerTheme: 'STANDARD_DARK',
    category: 'ANTIBIOTIC',
    pumpTypeSuitability: ['VOLUMETRIC', 'SYRINGE'],
    concentrationMgPerMl: 4.5,
    concentrationLabel: '4.5 g / 1000 mL',
    standardDiluentVolumeMl: 1000,
    totalDrugAmountLabel: '4.5 g',
    doseUnit: 'mL/h',
    weightBased: false,
    intermittentCapable: true,
    intermittentSummary: { totalDoseLabel: '4.5 g', overDurationLabel: '3 h' },
    defaultRateMlH: 12.5,
    softMaxRateMlH: 250.0,
    hardMaxRateMlH: 400.0,
    bolusAllowed: false,
    bolusDefaultMl: 10.0,
    bolusRateMlH: 200,
    ke0PerSec: 0.05,
    referenceRateMlH: 50.0,
    pdEffects: {
      deltaMapMmHg: 0,
      deltaSysExtraMmHg: 0,
      deltaHrBpm: 0,
      deltaCvpMmHg: 0.3,
      deltaPapMmHg: 0,
      deltaIcpMmHg: 0,
      deltaRespRpm: 0,
      deltaStMm: 0,
      deltaPi: 0,
    },
    clinicalNote: 'Extended-infusion beta-lactam / beta-lactamase inhibitor antimicrobial.',
  },
  {
    id: 'amiodarone',
    name: 'Amiodarone',
    tallManName: 'AmiODAROne',
    genericQueryName: 'amiodarone',
    fdaBrandHint: 'NEXTERONE',
    bannerTheme: 'SPLIT_RED_BLUE',
    category: 'ANTIARRHYTHMIC',
    pumpTypeSuitability: ['VOLUMETRIC', 'SYRINGE'],
    concentrationMgPerMl: 150.0, // Matches reference photo 150mg / 1 mL (or 1.5 mg/mL diluted)
    concentrationLabel: '150 mg / 1 mL',
    standardDiluentVolumeMl: 100,
    totalDrugAmountLabel: '300 mg',
    doseUnit: 'mg/min',
    weightBased: false,
    intermittentCapable: true,
    intermittentSummary: { totalDoseLabel: '300 mg', overDurationLabel: '1 h' },
    defaultRateMlH: 1.0, // 2.5 mg/min at 150 mg/mL = 1.0 mL/h (exact match to photo!)
    softMaxRateMlH: 10.0,
    hardMaxRateMlH: 40.0,
    bolusAllowed: true,
    bolusDefaultMl: 1.0,
    bolusRateMlH: 60,
    ke0PerSec: 0.1,
    referenceRateMlH: 1.0,
    pdEffects: {
      deltaMapMmHg: -5,
      deltaSysExtraMmHg: -3,
      deltaHrBpm: -16,
      deltaCvpMmHg: 0,
      deltaPapMmHg: -1,
      deltaIcpMmHg: 0,
      deltaRespRpm: 0,
      deltaStMm: 0,
      deltaPi: 0.1,
    },
    clinicalNote: 'Class III antiarrhythmic for ventricular tachycardia and rapid atrial fibrillation.',
  },
  {
    id: 'sufentanil',
    name: 'Sufentanil',
    tallManName: 'SUFentanil',
    genericQueryName: 'sufentanil',
    fdaBrandHint: 'SUFENTA',
    bannerTheme: 'OPIOID_BLUE',
    category: 'ANALGESIC',
    pumpTypeSuitability: ['SYRINGE'],
    concentrationMgPerMl: 0.005, // 250 mcg / 50 mL = 5 mcg/mL = 0.005 mg/mL (exact match to photo!)
    concentrationLabel: '250 mcg / 50 mL',
    standardDiluentVolumeMl: 50,
    totalDrugAmountLabel: '250 mcg',
    doseUnit: 'mcg/h',
    weightBased: false,
    defaultRateMlH: 15.0, // 15 mL/h * 5 mcg/mL = 75 mcg/h (exact match to photo!)
    softMaxRateMlH: 30.0,
    hardMaxRateMlH: 50.0,
    bolusAllowed: true,
    bolusDefaultMl: 2.0, // 10 mcg bolus
    bolusRateMlH: 180,
    ke0PerSec: 0.11,
    referenceRateMlH: 15.0,
    pdEffects: {
      deltaMapMmHg: -5,
      deltaSysExtraMmHg: -2,
      deltaHrBpm: -7,
      deltaCvpMmHg: 0,
      deltaPapMmHg: -1,
      deltaIcpMmHg: -1.5,
      deltaRespRpm: -5,
      deltaStMm: 0,
      deltaPi: 0.3,
    },
    clinicalNote: 'Potent synthetic mu-opioid analgesic for continuous ICU sedation-analgesia.',
  },
  {
    id: 'heparin',
    name: 'Heparin Sodium',
    tallManName: 'Heparin',
    genericQueryName: 'heparin',
    bannerTheme: 'HEPARIN_WHITE',
    category: 'ANTICOAGULANT',
    pumpTypeSuitability: ['SYRINGE', 'VOLUMETRIC'],
    concentrationMgPerMl: 500, // 25,000 IU / 50 mL = 500 IU/mL (exact match to photo!)
    concentrationLabel: '25000 IU / 50 mL',
    standardDiluentVolumeMl: 50,
    totalDrugAmountLabel: '25000 IU',
    doseUnit: 'U/kg/h',
    weightBased: true,
    defaultRateMlH: 2.25, // 15 U/kg/h at 75 kg = 1125 U/h = 2.25 mL/h (exact match to photo!)
    softMaxRateMlH: 6.0,
    hardMaxRateMlH: 12.0,
    bolusAllowed: true,
    bolusDefaultMl: 5.0,
    bolusRateMlH: 150,
    ke0PerSec: 0.08,
    referenceRateMlH: 2.25,
    pdEffects: {
      deltaMapMmHg: 0,
      deltaSysExtraMmHg: 0,
      deltaHrBpm: 0,
      deltaCvpMmHg: 0,
      deltaPapMmHg: 0,
      deltaIcpMmHg: 0,
      deltaRespRpm: 0,
      deltaStMm: 0,
      deltaPi: 0,
    },
    clinicalNote: 'Unfractionated heparin infusion titrated to institutional anti-Xa / aPTT protocol.',
  },
  {
    id: 'norepinephrine',
    name: 'Noradrenalin (Norepinephrine)',
    tallManName: 'Noradrenalin',
    genericQueryName: 'norepinephrine',
    fdaBrandHint: 'LEVOPHED',
    bannerTheme: 'VASOPRESSOR_VIOLET',
    category: 'VASOPRESSOR',
    pumpTypeSuitability: ['SYRINGE', 'VOLUMETRIC'],
    concentrationMgPerMl: 0.1, // 5 mg / 50 mL = 0.1 mg/mL (exact match to Spaceplus tower photo!)
    concentrationLabel: '5 mg / 50 mL',
    standardDiluentVolumeMl: 50,
    totalDrugAmountLabel: '5 mg',
    doseUnit: 'mg/h',
    weightBased: false,
    defaultRateMlH: 5.0, // 5.0 mL/h * 0.1 mg/mL = 0.5 mg/h (~0.11 mcg/kg/min, exact match to photo!)
    softMaxRateMlH: 30.0,
    hardMaxRateMlH: 60.0,
    bolusAllowed: true,
    bolusDefaultMl: 0.5,
    bolusRateMlH: 180,
    ke0PerSec: 0.14,
    referenceRateMlH: 5.0,
    pdEffects: {
      deltaMapMmHg: 19,
      deltaSysExtraMmHg: 9,
      deltaHrBpm: -4,
      deltaCvpMmHg: 1.5,
      deltaPapMmHg: 3.0,
      deltaIcpMmHg: -1.0, // Restores CPP autoregulation
      deltaRespRpm: 0,
      deltaStMm: 0.1,
      deltaPi: -0.4,
    },
    clinicalNote: 'Primary alpha-1 / beta-1 catecholamine vasopressor in septic and distributive shock.',
  },
  {
    id: 'propofol',
    name: 'Propofol 1%',
    tallManName: 'PROPOfol',
    genericQueryName: 'propofol',
    fdaBrandHint: 'DIPRIVAN',
    bannerTheme: 'SEDATIVE_YELLOW',
    category: 'SEDATIVE',
    pumpTypeSuitability: ['SYRINGE', 'VOLUMETRIC'],
    concentrationMgPerMl: 10.0,
    concentrationLabel: '500 mg / 50 mL',
    standardDiluentVolumeMl: 50,
    totalDrugAmountLabel: '500 mg',
    doseUnit: 'mcg/kg/min',
    weightBased: true,
    defaultRateMlH: 9.0,
    softMaxRateMlH: 22.5,
    hardMaxRateMlH: 36.0,
    bolusAllowed: true,
    bolusDefaultMl: 2.0,
    bolusRateMlH: 300,
    ke0PerSec: 0.13,
    referenceRateMlH: 13.5,
    pdEffects: {
      deltaMapMmHg: -14,
      deltaSysExtraMmHg: -6,
      deltaHrBpm: -6,
      deltaCvpMmHg: -1.0,
      deltaPapMmHg: -2.0,
      deltaIcpMmHg: -4.0, // Reduces cerebral metabolic rate & ICP
      deltaRespRpm: -5,
      deltaStMm: 0,
      deltaPi: 0.8,
    },
    clinicalNote: 'GABA-A sedative-hypnotic; lowers ICP and cerebral metabolic oxygen demand with vasodilation.',
  },
  {
    id: 'dobutamine',
    name: 'Dobutamine',
    tallManName: 'DOBUTamine',
    genericQueryName: 'dobutamine',
    bannerTheme: 'INOTROPE_PINK',
    category: 'INOTROPE',
    pumpTypeSuitability: ['SYRINGE', 'VOLUMETRIC'],
    concentrationMgPerMl: 5.0,
    concentrationLabel: '250 mg / 50 mL',
    standardDiluentVolumeMl: 50,
    totalDrugAmountLabel: '250 mg',
    doseUnit: 'mcg/kg/min',
    weightBased: true,
    defaultRateMlH: 4.5,
    softMaxRateMlH: 13.5,
    hardMaxRateMlH: 20.0,
    bolusAllowed: false,
    bolusDefaultMl: 0.5,
    bolusRateMlH: 120,
    ke0PerSec: 0.12,
    referenceRateMlH: 4.5,
    pdEffects: {
      deltaMapMmHg: 4,
      deltaSysExtraMmHg: 14,
      deltaHrBpm: 16,
      deltaCvpMmHg: -1.5,
      deltaPapMmHg: -2.0,
      deltaIcpMmHg: 0.5,
      deltaRespRpm: 1,
      deltaStMm: -0.35,
      deltaPi: 1.1,
    },
    clinicalNote: 'Beta-1 adrenergic inotrope augmenting stroke volume and cardiac index.',
  },
  {
    id: 'vasopressin',
    name: 'Vasopressin',
    tallManName: 'VASOpressin',
    genericQueryName: 'vasopressin',
    fdaBrandHint: 'VASOSTRICT',
    bannerTheme: 'VASOPRESSOR_VIOLET',
    category: 'VASOPRESSOR',
    pumpTypeSuitability: ['SYRINGE'],
    concentrationMgPerMl: 0.4,
    concentrationLabel: '20 Units / 50 mL',
    standardDiluentVolumeMl: 50,
    totalDrugAmountLabel: '20 Units',
    doseUnit: 'units/min',
    weightBased: false,
    defaultRateMlH: 4.5,
    softMaxRateMlH: 6.0,
    hardMaxRateMlH: 9.0,
    bolusAllowed: false,
    bolusDefaultMl: 0.5,
    bolusRateMlH: 120,
    ke0PerSec: 0.09,
    referenceRateMlH: 4.5,
    pdEffects: {
      deltaMapMmHg: 15,
      deltaSysExtraMmHg: 5,
      deltaHrBpm: -5,
      deltaCvpMmHg: 1.0,
      deltaPapMmHg: 0.5,
      deltaIcpMmHg: 0,
      deltaRespRpm: 0,
      deltaStMm: 0.15,
      deltaPi: -0.5,
    },
    clinicalNote: 'V1 receptor vascular smooth muscle agonist for catecholamine-refractory shock.',
  },
];

export function getDrugById(id: string): DrugDefinition {
  return ICU_DRUG_LIBRARY.find((d) => d.id === id) ?? ICU_DRUG_LIBRARY[0];
}

export function calculateDoseFromRate(
  drug: DrugDefinition,
  rateMlH: number,
  patientWeightKg: number
): number {
  const safeWeight = Math.max(20, patientWeightKg);
  switch (drug.doseUnit) {
    case 'mcg/kg/min': {
      const mcgPerMin = (rateMlH * drug.concentrationMgPerMl * 1000) / 60;
      return mcgPerMin / safeWeight;
    }
    case 'mcg/kg/h': {
      return (rateMlH * drug.concentrationMgPerMl * 1000) / safeWeight;
    }
    case 'mcg/h': {
      return rateMlH * drug.concentrationMgPerMl * 1000;
    }
    case 'mg/h': {
      return rateMlH * drug.concentrationMgPerMl;
    }
    case 'mg/kg/h': {
      return (rateMlH * drug.concentrationMgPerMl) / safeWeight;
    }
    case 'U/kg/h': {
      // concentrationMgPerMl stores IU/mL
      return (rateMlH * drug.concentrationMgPerMl) / safeWeight;
    }
    case 'units/min':
    case 'mg/min': {
      return (rateMlH * drug.concentrationMgPerMl) / 60;
    }
    case 'mL/h':
    default:
      return rateMlH;
  }
}

export function calculateRateFromDose(
  drug: DrugDefinition,
  doseValue: number,
  patientWeightKg: number
): number {
  const safeWeight = Math.max(20, patientWeightKg);
  if (drug.concentrationMgPerMl <= 0) return 0;
  switch (drug.doseUnit) {
    case 'mcg/kg/min': {
      const mgPerH = (doseValue * safeWeight * 60) / 1000;
      return mgPerH / drug.concentrationMgPerMl;
    }
    case 'mcg/kg/h': {
      return doseValue * safeWeight / 1000 / drug.concentrationMgPerMl;
    }
    case 'mcg/h': {
      return doseValue / 1000 / drug.concentrationMgPerMl;
    }
    case 'mg/h': {
      return doseValue / drug.concentrationMgPerMl;
    }
    case 'mg/kg/h':
    case 'U/kg/h': {
      return (doseValue * safeWeight) / drug.concentrationMgPerMl;
    }
    case 'units/min':
    case 'mg/min': {
      return (doseValue * 60) / drug.concentrationMgPerMl;
    }
    case 'mL/h':
    default:
      return doseValue;
  }
}
