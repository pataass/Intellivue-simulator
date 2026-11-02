import React, { useState } from 'react';
import {
  AlarmThresholds,
  AlarmToneStandard,
  Co2SpeedRatio,
  EcgLead,
  MonitorScreenView,
  PatientVitals,
  PhilipsHardwareModule,
  TempUnit,
  WaveTraceId,
} from '../../types/clinical';
import { ALL_TWELVE_LEADS } from '../../engine/physiologyEngine';
import {
  calculateDoseFromRate,
  calculateRateFromDose,
  ICU_DRUG_LIBRARY,
} from '../../data/drugLibrary';
import { clinicalAudio } from '../../services/audioSynth';

export type PhilipsPopupId =
  | null
  | 'WAVE_SELECT'
  | 'MODULE_MGMT'
  | 'ALARM_VOLUME'
  | 'VENIPUNCTURE'
  | 'SMARTKEYS_POPUP'
  | 'ECG_SETUP'
  | 'SPO2_SETUP'
  | 'ABP_SETUP'
  | 'PAP_SETUP'
  | 'CVP_SETUP'
  | 'ICP_SETUP'
  | 'NBP_SETUP'
  | 'CO2_SETUP'
  | 'TEMP_SETUP'
  | 'ALARM_LIMITS'
  | 'DRUG_CALC'
  | 'PATIENT_ADMIT'
  | 'PROFILES_SCREENS'
  | 'SYSTEM_CHECK'
  | 'RECORDINGS'
  | 'MAIN_SETUP';

interface MonitorModalsProps {
  activePopup: PhilipsPopupId;
  onOpenPopup: (popup: PhilipsPopupId) => void;
  onClose: () => void;
  vitals: PatientVitals;
  modules: PhilipsHardwareModule[];
  onToggleModulePlugged: (slotId: string) => void;
  onToggleModuleCableWired: (slotId: string) => void;
  onOpenFullModuleRack: () => void;
  thresholds: AlarmThresholds;
  onUpdateThresholds: (next: AlarmThresholds) => void;
  onUpdatePatientField: <K extends keyof PatientVitals>(
    field: K,
    value: PatientVitals[K]
  ) => void;
  patientWeightKg: number;
  onChangePatientWeightKg: (kg: number) => void;
  tempUnit: TempUnit;
  onToggleTempUnit: () => void;
  sweepSpeed: 12.5 | 25 | 50;
  onChangeSweepSpeed: (speed: 12.5 | 25 | 50) => void;
  waveFrozen: boolean;
  onToggleWaveFrozen: () => void;
  cursorActive: boolean;
  onToggleCursorActive: () => void;
  onEnterStandby: () => void;
  screenView: MonitorScreenView;
  onSwitchScreenView: (view: MonitorScreenView) => void;
  selectedWaveSlotIndex: number;
  onSelectWaveSlotIndex: (slotIndex: number) => void;
  waveSlots: WaveTraceId[];
  onChangeWaveSlot: (slotIndex: number, trace: WaveTraceId) => void;
  onTriggerNbp: (stat?: boolean) => void;
  onStopNbp: () => void;
  onStartVenipuncture: () => void;
  onZeroPressure: (channel: 'ABP' | 'PAP' | 'CVP' | 'ICP' | 'ALL') => void;
  onStoreStReference: () => void;
  audioEnabled: boolean;
  alarmVolume: number;
  alarmToneStandard: AlarmToneStandard;
  qrsBeepEnabled: boolean;
  onChangeAlarmAudio: (next: {
    enabled?: boolean;
    volume?: number;
    standard?: AlarmToneStandard;
    qrsBeep?: boolean;
  }) => void;
}

const silverBtn =
  'px-2.5 py-1 text-[13px] font-monitor font-semibold text-[#111318] bg-[#c5c8cf] hover:bg-[#b8bcc5] active:bg-[#aeb2bc] border border-[#7b7f89] cursor-pointer select-none';

const silverBtnActive =
  'px-2.5 py-1 text-[13px] font-monitor font-bold text-white bg-[#1e6fd9] hover:bg-[#287be8] border border-[#124994] cursor-pointer select-none';

const menuRowClass =
  'w-full flex items-center justify-between px-3.5 py-2 text-left font-monitor text-[16px] font-medium text-[#111318] hover:bg-[#c3c7cf] active:bg-[#b7bbc4] border-b border-[#aeb1b8] cursor-pointer select-none';

const WAVE_TRACE_CATALOG: {
  group: string;
  items: { id: WaveTraceId; label: string }[];
}[] = [
  {
    group: 'ECG Leads',
    items: [
      { id: 'ECG_I', label: 'ECG I' },
      { id: 'ECG_II', label: 'ECG II' },
      { id: 'ECG_III', label: 'ECG III' },
      { id: 'ECG_aVR', label: 'ECG aVR' },
      { id: 'ECG_aVL', label: 'ECG aVL' },
      { id: 'ECG_aVF', label: 'ECG aVF' },
      { id: 'ECG_V1', label: 'ECG V1' },
      { id: 'ECG_V2', label: 'ECG V2' },
      { id: 'ECG_V3', label: 'ECG V3' },
      { id: 'ECG_V4', label: 'ECG V4' },
      { id: 'ECG_V5', label: 'ECG V5' },
      { id: 'ECG_V6', label: 'ECG V6' },
    ],
  },
  {
    group: 'Pulse & Invasive Pressures',
    items: [
      { id: 'PLETH', label: 'SpO2 Pleth' },
      { id: 'ABP', label: 'ABP / ART' },
      { id: 'PAP', label: 'PAP' },
      { id: 'CVP', label: 'CVP' },
      { id: 'OVERLAP_PRESS', label: 'Overlap (ABP+PAP+CVP)' },
      { id: 'ICP', label: 'ICP' },
    ],
  },
  {
    group: 'Capnography, Resp & Neuro',
    items: [
      { id: 'CO2', label: 'CO2 Capnogram' },
      { id: 'RESP', label: 'Resp Impedance' },
      { id: 'AWP', label: 'AWP Airway' },
      { id: 'EEG', label: 'EEG Cerebral' },
      { id: 'OFF', label: 'Wave Off' },
    ],
  },
];

function getTraceShortLabel(id: WaveTraceId, abpLabel: string): string {
  if (id === 'ABP') return abpLabel;
  for (const grp of WAVE_TRACE_CATALOG) {
    const hit = grp.items.find((x) => x.id === id);
    if (hit) return hit.label;
  }
  return id;
}

function getSocketColorHex(color: PhilipsHardwareModule['socketColor']): string {
  switch (color) {
    case 'MMS_MULTI':
      return '#16a34a';
    case 'ORANGE':
      return '#ea580c';
    case 'PURPLE_SQUARE':
    case 'PURPLE':
      return '#9333ea';
    case 'BROWN':
      return '#92400e';
    case 'YELLOW':
      return '#ca8a04';
    case 'CYAN':
      return '#0284c7';
  }
}

export const MonitorModals: React.FC<MonitorModalsProps> = ({
  activePopup,
  onOpenPopup,
  onClose,
  vitals,
  modules,
  onToggleModulePlugged,
  onToggleModuleCableWired,
  onOpenFullModuleRack,
  thresholds,
  onUpdateThresholds,
  onUpdatePatientField,
  patientWeightKg,
  onChangePatientWeightKg,
  tempUnit,
  onToggleTempUnit,
  sweepSpeed,
  onChangeSweepSpeed,
  waveFrozen,
  onToggleWaveFrozen,
  cursorActive,
  onToggleCursorActive,
  onEnterStandby,
  screenView,
  onSwitchScreenView,
  selectedWaveSlotIndex,
  onSelectWaveSlotIndex,
  waveSlots,
  onChangeWaveSlot,
  onTriggerNbp,
  onStopNbp,
  onStartVenipuncture,
  onZeroPressure,
  onStoreStReference,
  audioEnabled,
  alarmVolume,
  alarmToneStandard,
  qrsBeepEnabled,
  onChangeAlarmAudio,
}) => {
  const [calcDrugId, setCalcDrugId] = useState<string>('norepinephrine');
  const [calcRateMlH, setCalcRateMlH] = useState<number>(5.0);
  const [showPressureSetupSub, setShowPressureSetupSub] = useState<boolean>(false);
  const [selectedEmsSlotId, setSelectedEmsSlotId] = useState<string>('mms-m3001a');
  const [recordingMessage, setRecordingMessage] = useState<string | null>(null);

  if (!activePopup) return null;

  const adjustLimit = (
    key: keyof AlarmThresholds,
    bound: 'low' | 'high',
    delta: number
  ) => {
    const cur = thresholds[key];
    const nextVal = Number((cur[bound] + delta).toFixed(1));
    onUpdateThresholds({
      ...thresholds,
      [key]: {
        ...cur,
        [bound]:
          bound === 'low'
            ? Math.min(cur.high - 1, nextVal)
            : Math.max(cur.low + 1, nextVal),
      },
    });
  };

  const toggleAlarmEnabled = (key: keyof AlarmThresholds) => {
    onUpdateThresholds({
      ...thresholds,
      [key]: { ...thresholds[key], enabled: !thresholds[key].enabled },
    });
  };

  const cycleSweepSpeed = () => {
    const order: (12.5 | 25 | 50)[] = [12.5, 25, 50];
    onChangeSweepSpeed(order[(order.indexOf(sweepSpeed) + 1) % order.length]);
  };

  const cycleCo2SpeedRatio = () => {
    const ratios: Co2SpeedRatio[] = [0.25, 0.5, 1];
    const curIdx = ratios.indexOf(vitals.co2SpeedRatio);
    const nextRatio = ratios[(curIdx + 1) % ratios.length];
    onUpdatePatientField('co2SpeedRatio', nextRatio);
  };

  const cycleAbpScale = () => {
    const scales: (100 | 150 | 200 | 300)[] = [100, 150, 200, 300];
    const next = scales[(scales.indexOf(vitals.abpScale) + 1) % scales.length];
    onUpdatePatientField('abpScale', next);
  };

  const applyOptimumAbpScale = () => {
    const opt: 100 | 150 | 200 | 300 =
      vitals.abpSys <= 95
        ? 100
        : vitals.abpSys <= 145
          ? 150
          : vitals.abpSys <= 195
            ? 200
            : 300;
    onUpdatePatientField('abpScale', opt);
  };

  const cycleAbpLabel = () => {
    const labels: ('ABP' | 'ART' | 'Ao')[] = ['ABP', 'ART', 'Ao'];
    const next = labels[(labels.indexOf(vitals.abpLabel) + 1) % labels.length];
    onUpdatePatientField('abpLabel', next);
  };

  const clampedSlotIndex = Math.max(0, Math.min(7, selectedWaveSlotIndex));
  const currentSlotTrace = waveSlots[clampedSlotIndex] ?? 'ECG_II';

  const popupTitles: Record<Exclude<PhilipsPopupId, null>, string> = {
    WAVE_SELECT: `Select   Wave   (Slot ${clampedSlotIndex + 1})`,
    MODULE_MGMT: 'Connected   Modules',
    ALARM_VOLUME: 'Alarm   Volume',
    VENIPUNCTURE: 'Veni   Puncture',
    SMARTKEYS_POPUP: 'SmartKeys',
    ECG_SETUP: `${vitals.ecgLead}      Wave`,
    SPO2_SETUP: 'Pleth      Wave',
    ABP_SETUP: `${vitals.abpLabel}      Wave`,
    PAP_SETUP: 'PAP      Wave',
    CVP_SETUP: 'CVP      Wave',
    ICP_SETUP: 'ICP      Wave',
    NBP_SETUP: 'Setup      NBP',
    CO2_SETUP: 'CO2      Wave',
    TEMP_SETUP: 'Setup      Temp',
    ALARM_LIMITS: 'Alarm      Limits',
    DRUG_CALC: 'Clinical   Calculations',
    PATIENT_ADMIT: 'Patient   Demographics',
    PROFILES_SCREENS: 'Change   Screen',
    SYSTEM_CHECK: 'System      Status',
    RECORDINGS: 'Recordings',
    MAIN_SETUP: 'Main      Setup',
  };

  const isCompactWaveMenu =
    activePopup === 'ABP_SETUP' ||
    activePopup === 'PAP_SETUP' ||
    activePopup === 'CVP_SETUP' ||
    activePopup === 'ICP_SETUP';

  const isWideWindow =
    activePopup === 'MODULE_MGMT' ||
    activePopup === 'ALARM_LIMITS' ||
    activePopup === 'DRUG_CALC' ||
    activePopup === 'WAVE_SELECT';

  const selectedCalcDrug =
    ICU_DRUG_LIBRARY.find((d) => d.id === calcDrugId) ?? ICU_DRUG_LIBRARY[0];
  const calcDose = calculateDoseFromRate(
    selectedCalcDrug,
    calcRateMlH,
    patientWeightKg
  );

  const selectedModule =
    modules.find((m) => m.slotId === selectedEmsSlotId) ?? modules[0];

  const pluggedCount = modules.filter((m) => m.pluggedIn).length;
  const effectiveCo2Speed = Number((sweepSpeed * vitals.co2SpeedRatio).toFixed(2));

  const renderWaveSlotBar = () => (
    <div className="flex items-center justify-between bg-[#bfc3cc] border-b border-[#989ca6] px-3 py-1.5 font-monitor text-[14px]">
      <span>
        Wave Slot <strong>#{clampedSlotIndex + 1}</strong> :{' '}
        <strong>{getTraceShortLabel(currentSlotTrace, vitals.abpLabel)}</strong>
      </span>
      <button
        type="button"
        onClick={() => {
          clinicalAudio.playKeyClick();
          onOpenPopup('WAVE_SELECT');
        }}
        className={silverBtnActive}
      >
        Change Wave
      </button>
    </div>
  );

  return (
    <div
      className={`absolute left-5 sm:left-11 top-5 z-30 max-h-[88%] flex flex-col bg-[#d4d6da] text-[#111318] border border-[#4a4d54] shadow-[0_14px_34px_rgba(0,0,0,0.68)] select-none overflow-hidden ${
        isWideWindow
          ? 'w-[92%] max-w-[660px]'
          : isCompactWaveMenu
            ? 'w-[295px] sm:w-[320px]'
            : 'w-[90%] max-w-[440px]'
      }`}
    >
      {/* Philips Brushed Light-Grey Title Bar */}
      <div className="flex items-center justify-between bg-[#c9ccd2] border-b border-[#9fa3ab] px-2.5 py-1.5 shrink-0">
        <button
          type="button"
          onClick={() => {
            clinicalAudio.playKeyClick();
            onOpenPopup(activePopup === 'MODULE_MGMT' ? 'MAIN_SETUP' : 'MODULE_MGMT');
          }}
          className="h-6 w-7 flex items-center justify-center border border-[#7c8089] bg-[#d6d8dc] hover:bg-[#bfc3cb] cursor-pointer"
          title="Open Connected EMS / FMS Modules Graphic"
        >
          <svg viewBox="0 0 20 14" className="w-4 h-3 stroke-[#1f2329] fill-none" strokeWidth="1.4">
            <rect x="1.5" y="1.5" width="17" height="5" />
            <circle cx="5" cy="4" r="0.9" fill="#1f2329" />
            <circle cx="9" cy="4" r="0.9" fill="#1f2329" />
            <rect x="1.5" y="7.5" width="17" height="5" />
            <circle cx="5" cy="10" r="0.9" fill="#1f2329" />
            <circle cx="9" cy="10" r="0.9" fill="#1f2329" />
          </svg>
        </button>

        <span className="font-monitor text-[17px] font-semibold tracking-wide text-[#14171c] whitespace-pre">
          {popupTitles[activePopup]}
        </span>

        <button
          type="button"
          onClick={() => {
            clinicalAudio.playKeyClick();
            onClose();
          }}
          className="h-6 w-7 flex items-center justify-center text-[#181b20] hover:bg-[#b8bcc4] cursor-pointer"
          title="Close Menu"
        >
          <svg
            viewBox="0 0 14 14"
            className="h-3.5 w-3.5 stroke-[#181b20] fill-none"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="2.5" y1="2.5" x2="11.5" y2="11.5" />
            <line x1="11.5" y1="2.5" x2="2.5" y2="11.5" />
          </svg>
        </button>
      </div>

      {/* Menu Body */}
      <div className="flex-1 overflow-y-auto">
        {/* ================================================================= */}
        {/* 0. INTERACTIVE WAVE SLOT PARAMETER SELECTOR ('WAVE_SELECT')       */}
        {/* Click any wave trace on the monitor to assign any parameter/lead! */}
        {/* ================================================================= */}
        {activePopup === 'WAVE_SELECT' && (
          <div className="p-3 space-y-3 font-monitor">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#aeb1b8]">
              <div>
                <div className="text-[16px] font-bold text-[#111318]">
                  Choose Displayed Waveform for Wave Slot #{clampedSlotIndex + 1}
                </div>
                <div className="text-[13px] text-[#353942]">
                  Select any wave slot (1–8) and assign any ECG lead, pressure, capnogram, or respiratory trace.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  clinicalAudio.playKeyClick();
                  onOpenPopup('PROFILES_SCREENS');
                }}
                className={silverBtn}
              >
                Screen Views (3W / 4W / 6W / 8W)
              </button>
            </div>

            {/* Slot 1..8 Selector Strip */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
              {Array.from({ length: 8 }).map((_, idx) => {
                const tr = waveSlots[idx] ?? 'OFF';
                const isSel = idx === clampedSlotIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      clinicalAudio.playKeyClick();
                      onSelectWaveSlotIndex(idx);
                    }}
                    className={`p-1.5 text-left border cursor-pointer ${
                      isSel
                        ? 'bg-[#1e6fd9] text-white border-[#124994]'
                        : 'bg-[#c5c8cf] text-[#111318] border-[#7b7f89] hover:bg-[#b8bcc5]'
                    }`}
                  >
                    <div className="text-[11px] font-bold leading-none">
                      Slot {idx + 1}
                    </div>
                    <div className="text-[12px] font-semibold truncate mt-0.5">
                      {getTraceShortLabel(tr, vitals.abpLabel)}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Grouped Trace Picker */}
            <div className="space-y-2.5">
              {WAVE_TRACE_CATALOG.map((grp) => (
                <div key={grp.group} className="space-y-1">
                  <div className="text-[13px] font-bold text-[#2b303a]">
                    {grp.group}
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                    {grp.items.map((item) => {
                      const active = currentSlotTrace === item.id;
                      const displayLabel =
                        item.id === 'ABP' ? `${vitals.abpLabel} Wave` : item.label;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            clinicalAudio.playKeyClick(true);
                            onChangeWaveSlot(clampedSlotIndex, item.id);
                            if (
                              screenView !== 'SIX_WAVES' &&
                              screenView !== 'EIGHT_WAVES' &&
                              screenView !== 'FOUR_WAVES' &&
                              screenView !== 'THREE_WAVES' &&
                              screenView !== 'STANDARD_WAVES' &&
                              screenView !== 'DYNAMIC_WAVES' &&
                              screenView !== 'OVERLAP_WAVES'
                            ) {
                              onSwitchScreenView('SIX_WAVES');
                            }
                          }}
                          className={active ? silverBtnActive : silverBtn}
                        >
                          {displayLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 1. EXACT PHILIPS PRESSURE WAVE MENU (ART / ABP / PAP / CVP / ICP) */}
        {/* ================================================================= */}
        {isCompactWaveMenu && (
          <div className="flex flex-col">
            {renderWaveSlotBar()}

            <button
              type="button"
              onClick={() => {
                clinicalAudio.playKeyClick();
                onToggleWaveFrozen();
              }}
              className={menuRowClass}
            >
              <span className="pl-5">
                {waveFrozen ? 'Unfreeze Wave' : 'Freeze Wave'}
              </span>
              {waveFrozen && (
                <span className="text-xs font-bold text-[#1e6fd9]">ACTIVE</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                clinicalAudio.playKeyClick();
                onToggleCursorActive();
              }}
              className={menuRowClass}
            >
              <span className="pl-5">
                {cursorActive ? 'Deactivate Cursor' : 'Activate Cursor'}
              </span>
              {cursorActive && (
                <span className="text-xs font-bold text-[#1e6fd9]">ON</span>
              )}
            </button>

            {activePopup === 'ABP_SETUP' && (
              <button
                type="button"
                onClick={() => {
                  clinicalAudio.playKeyClick();
                  cycleAbpLabel();
                }}
                className={menuRowClass}
              >
                <span className="pl-5">Label</span>
                <span className="pr-3 font-semibold">: &nbsp;&nbsp;&nbsp;{vitals.abpLabel}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                clinicalAudio.playKeyClick();
                if (activePopup === 'ABP_SETUP') cycleAbpScale();
              }}
              className={menuRowClass}
            >
              <span className="flex items-center gap-1.5">
                <svg
                  viewBox="0 0 14 12"
                  className="h-3 w-3.5 fill-[#22252b] shrink-0"
                  aria-hidden="true"
                >
                  {[1, 3.5, 6, 8.5, 11].map((cx) => (
                    <React.Fragment key={cx}>
                      <rect x={cx} y="2" width="1.3" height="1.3" />
                      <rect x={cx} y="8.5" width="1.3" height="1.3" />
                    </React.Fragment>
                  ))}
                </svg>
                <span>Scale</span>
              </span>
              <span className="pr-2 font-semibold">
                : &nbsp;&nbsp;&nbsp;
                {activePopup === 'ABP_SETUP' ? `${vitals.abpScale} mmHg` : '30 mmHg'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                clinicalAudio.playKeyClick();
                applyOptimumAbpScale();
              }}
              className={menuRowClass}
            >
              <span className="pl-5">Optimum Scale</span>
            </button>

            <button
              type="button"
              onClick={() => {
                clinicalAudio.playKeyClick(true);
                onZeroPressure(
                  activePopup === 'ABP_SETUP'
                    ? 'ABP'
                    : activePopup === 'PAP_SETUP'
                      ? 'PAP'
                      : activePopup === 'CVP_SETUP'
                        ? 'CVP'
                        : 'ICP'
                );
              }}
              className={menuRowClass}
            >
              <span className="flex items-center gap-1.5">
                <svg
                  viewBox="0 0 18 12"
                  className="h-3 w-4 stroke-[#22252b] fill-none shrink-0"
                  strokeWidth="1.4"
                  aria-hidden="true"
                >
                  <path d="M1 6 L5.5 6 M3.8 4 L6 6 L3.8 8" />
                  <ellipse cx="9" cy="6" rx="1.9" ry="3.2" />
                  <path d="M17 6 L12.5 6 M14.2 4 L12 6 L14.2 8" />
                </svg>
                <span>
                  Zero{' '}
                  {activePopup === 'ABP_SETUP'
                    ? vitals.abpLabel
                    : activePopup.replace('_SETUP', '')}
                </span>
              </span>
            </button>

            {activePopup === 'ABP_SETUP' && (
              <button
                type="button"
                onClick={() => {
                  clinicalAudio.playKeyClick();
                  onUpdatePatientField(
                    'pulseSource',
                    vitals.pulseSource === 'ABP' ? 'SpO2' : 'ABP'
                  );
                }}
                className={menuRowClass}
              >
                <span className="pl-5">Pulse ({vitals.abpLabel})</span>
                <span className="pr-2 text-sm font-semibold">
                  {vitals.pulseSource === 'ABP' ? 'Active' : 'SpO2'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                clinicalAudio.playKeyClick();
                const nextOverlap = !vitals.overlapWaves;
                onUpdatePatientField('overlapWaves', nextOverlap);
                onUpdatePatientField(
                  'profileName',
                  nextOverlap ? 'Overlapping A' : 'SSC Sepsis'
                );
              }}
              className={menuRowClass}
            >
              <span className="pl-5">Overlap Waves</span>
              <span className="pr-2 text-sm font-semibold text-[#1e6fd9]">
                {vitals.overlapWaves ? 'Overlapping A' : 'Off'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                clinicalAudio.playKeyClick();
                setShowPressureSetupSub((s) => !s);
              }}
              className={menuRowClass}
            >
              <span className="pl-5">
                Setup{' '}
                {activePopup === 'ABP_SETUP'
                  ? vitals.abpLabel
                  : activePopup.replace('_SETUP', '')}
              </span>
              <svg
                viewBox="0 0 12 12"
                className="mr-2 h-3 w-3 stroke-[#1f2329] fill-none shrink-0"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {showPressureSetupSub ? (
                  <polyline points="2,8 6,4 10,8" />
                ) : (
                  <polyline points="2,4 6,8 10,4" />
                )}
              </svg>
            </button>

            {showPressureSetupSub && (
              <div className="bg-[#c8cbd2] border-b border-[#aeb1b8] px-3.5 py-2.5 space-y-2 text-sm font-monitor">
                {activePopup === 'ABP_SETUP' && (
                  <div className="flex items-center justify-between">
                    <span>
                      MAP Limits: {thresholds.abpMap.low}..{thresholds.abpMap.high} mmHg
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => adjustLimit('abpMap', 'low', -5)}
                        className={silverBtn}
                      >
                        Low -5
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustLimit('abpMap', 'low', 5)}
                        className={silverBtn}
                      >
                        Low +5
                      </button>
                    </div>
                  </div>
                )}
                {activePopup === 'PAP_SETUP' && (
                  <div className="flex items-center justify-between">
                    <span>
                      PAPm Limits: {thresholds.papMap.low}..{thresholds.papMap.high} mmHg
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => adjustLimit('papMap', 'high', -2)}
                        className={silverBtn}
                      >
                        High -2
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustLimit('papMap', 'high', 2)}
                        className={silverBtn}
                      >
                        High +2
                      </button>
                    </div>
                  </div>
                )}
                {activePopup === 'CVP_SETUP' && (
                  <div className="flex items-center justify-between">
                    <span>
                      CVPm Limits: {thresholds.cvp.low}..{thresholds.cvp.high} mmHg
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => adjustLimit('cvp', 'high', -2)}
                        className={silverBtn}
                      >
                        High -2
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustLimit('cvp', 'high', 2)}
                        className={silverBtn}
                      >
                        High +2
                      </button>
                    </div>
                  </div>
                )}
                {activePopup === 'ICP_SETUP' && (
                  <div className="flex items-center justify-between">
                    <span>
                      ICPm High: {thresholds.icp.high} mmHg (CPP {vitals.cpp})
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => adjustLimit('icp', 'high', -2)}
                        className={silverBtn}
                      >
                        -2
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustLimit('icp', 'high', 2)}
                        className={silverBtn}
                      >
                        +2
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                clinicalAudio.playKeyClick();
                cycleSweepSpeed();
              }}
              className={menuRowClass}
            >
              <span className="pl-5">Change Speed</span>
              <span className="pr-2 text-sm font-semibold">{sweepSpeed} mm/s</span>
            </button>

            <button
              type="button"
              onClick={() => {
                clinicalAudio.playKeyClick();
                onOpenPopup('WAVE_SELECT');
              }}
              className={`${menuRowClass} border-b-0`}
            >
              <span className="pl-5">Change Wave</span>
              <span className="pr-2 text-xs font-bold text-[#1e6fd9]">
                Slot {clampedSlotIndex + 1}
              </span>
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* 2. GRAPHICAL EMS / FMS-8 CONNECTED MODULES HARDWARE ILLUSTRATION  */}
        {/* ================================================================= */}
        {activePopup === 'MODULE_MGMT' && (
          <div className="p-3 space-y-3 font-monitor">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#aeb1b8]">
              <div>
                <div className="text-[16px] font-bold text-[#111318]">
                  Philips EMS / FMS-8 (M8048A) Graphical Rack Topology
                </div>
                <div className="text-[13px] text-[#333740]">
                  Only physically plugged-in modules appear seated in the EMS housing ({pluggedCount} of {modules.length} occupied). Click any bay to inspect, eject, insert, or wire cables.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullModuleRack();
                }}
                className={`${silverBtnActive} inline-flex items-center gap-1.5`}
              >
                <span>Open Full Rack View</span>
                <svg
                  viewBox="0 0 12 12"
                  className="h-3 w-3 stroke-current fill-none"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2 6 H10 M7 3 L10 6 L7 9" />
                </svg>
              </button>
            </div>

            <div className="rounded bg-gradient-to-b from-[#7f848e] via-[#60656f] to-[#4a4e57] p-2.5 border-2 border-[#3a3d45] shadow-inner">
              <div className="flex items-center justify-between text-[11px] font-mono text-white/90 px-1 pb-1.5">
                <span>PHILIPS INTELLIVUE EMS / M8048A FMS-8 BACKPLANE</span>
                <span>BED 1 · JOHN DOE</span>
              </div>

              <div className="grid grid-cols-9 gap-1 bg-[#17191e] p-1.5 border border-[#2c3038]">
                {modules.map((m) => {
                  const isSelected = m.slotId === selectedModule.slotId;
                  const sockHex = getSocketColorHex(m.socketColor);

                  return (
                    <button
                      key={m.slotId}
                      type="button"
                      onClick={() => {
                        clinicalAudio.playKeyClick();
                        setSelectedEmsSlotId(m.slotId);
                      }}
                      className={`relative h-[138px] flex flex-col justify-between transition-all cursor-pointer col-span-1 ${
                        isSelected
                          ? 'ring-2 ring-[#1e6fd9]'
                          : 'hover:brightness-105'
                      }`}
                      title={`Slot ${m.slotNumberLabel}: ${
                        m.pluggedIn ? `${m.mNumber} ${m.shortLabel}` : 'Empty EMS Bay'
                      }`}
                    >
                      {m.pluggedIn ? (
                        <div className="w-full h-full bg-gradient-to-b from-[#eceef2] via-[#d7dbe2] to-[#bfc4ce] border border-[#6e737d] p-1 flex flex-col items-center justify-between shadow">
                          <div className="w-full text-center">
                            <div className="h-1.5 w-6 mx-auto bg-[#8d939e] mb-0.5" />
                            <div className="text-[9.5px] font-mono font-bold text-[#2b303a] leading-none">
                              {m.mNumber}
                            </div>
                            <div className="text-[11px] font-monitor font-bold text-[#111318] leading-tight mt-0.5 truncate">
                              {m.shortLabel}
                            </div>
                          </div>

                          <div className="flex flex-col gap-0.5 w-full px-0.5">
                            {m.buttons.slice(0, 2).map((b) => (
                              <span
                                key={b}
                                className="block w-full bg-[#686d78] text-white text-[8px] font-bold leading-tight py-[1px] text-center"
                              >
                                {b}
                              </span>
                            ))}
                          </div>

                          <div className="w-full flex flex-col items-center pb-0.5">
                            <div
                              className="w-7 h-7 rounded-xs border-2 border-[#232730] flex items-center justify-center relative"
                              style={{ backgroundColor: sockHex }}
                            >
                              {m.cableWired ? (
                                <div className="w-4 h-4 rounded-full bg-[#181b20] border border-white/80 flex items-center justify-center shadow">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#39ff14]" />
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-[2px]">
                                  <span className="w-1 h-1 rounded-full bg-black/75" />
                                  <span className="w-1 h-1 rounded-full bg-black/75" />
                                  <span className="w-1 h-1 rounded-full bg-black/75" />
                                  <span className="w-1 h-1 rounded-full bg-black/75" />
                                </div>
                              )}
                            </div>
                            <span
                              className={`mt-0.5 text-[8.5px] font-mono font-bold leading-none ${
                                m.cableWired ? 'text-[#0e6f2c]' : 'text-[#b91c1c]'
                              }`}
                            >
                              {m.cableWired ? 'WIRED' : 'NO CABLE'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-b from-[#0b0d11] via-[#13171e] to-[#0b0d11] border border-dashed border-[#3b414d] p-1 flex flex-col items-center justify-between text-[#6b7280]">
                          <span className="text-[9px] font-mono">
                            BAY {m.slotNumberLabel}
                          </span>
                          <div className="w-5 h-8 border border-[#2d333f] bg-[#07080b] flex flex-col items-center justify-center gap-1">
                            <span className="w-3 h-0.5 bg-amber-500/45" />
                            <span className="w-3 h-0.5 bg-amber-500/45" />
                            <span className="w-3 h-0.5 bg-amber-500/45" />
                          </div>
                          <span className="text-[8.5px] font-mono uppercase">
                            Empty
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#c7cad1] border border-[#969aa3] px-3 py-2">
              <div>
                <div className="text-[15px] font-bold text-[#111318]">
                  Slot {selectedModule.slotNumberLabel} · {selectedModule.mNumber} — {selectedModule.fullName}
                </div>
                <div className="text-[13px] text-[#2d313a]">
                  Status:{' '}
                  <strong>
                    {!selectedModule.pluggedIn
                      ? 'Module Unplugged (Empty EMS Bay)'
                      : selectedModule.cableWired
                        ? `Module Seated & Sensor Wired (${selectedModule.cableName})`
                        : 'Module Seated — Patient Sensor Cable Unplugged (! INOP)'}
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    clinicalAudio.playKeyClick(true);
                    onToggleModulePlugged(selectedModule.slotId);
                  }}
                  className={selectedModule.pluggedIn ? silverBtn : silverBtnActive}
                >
                  {selectedModule.pluggedIn ? 'Eject Module' : '+ Insert Module'}
                </button>
                {selectedModule.pluggedIn && (
                  <button
                    type="button"
                    onClick={() => {
                      clinicalAudio.playKeyClick(true);
                      onToggleModuleCableWired(selectedModule.slotId);
                    }}
                    className={selectedModule.cableWired ? silverBtn : silverBtnActive}
                  >
                    {selectedModule.cableWired ? 'Unplug Sensor Cable' : '+ Wire Sensor Cable'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 3. ECG WAVE MENU                                                  */}
        {/* ================================================================= */}
        {activePopup === 'ECG_SETUP' && (
          <div className="flex flex-col font-monitor">
            {renderWaveSlotBar()}

            <button
              type="button"
              onClick={onToggleWaveFrozen}
              className={menuRowClass}
            >
              <span>{waveFrozen ? 'Unfreeze Wave' : 'Freeze Wave'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleCursorActive}
              className={menuRowClass}
            >
              <span>{cursorActive ? 'Deactivate Cursor' : 'Activate Cursor'}</span>
            </button>

            <div className="px-3.5 py-2.5 border-b border-[#aeb1b8] space-y-2">
              <div className="text-[14px] font-bold">Primary ECG Lead ({vitals.ecgLead})</div>
              <div className="grid grid-cols-6 gap-1">
                {ALL_TWELVE_LEADS.map((lead: EcgLead) => (
                  <button
                    key={lead}
                    type="button"
                    onClick={() => {
                      onUpdatePatientField('ecgLead', lead);
                      onChangeWaveSlot(clampedSlotIndex, `ECG_${lead}` as WaveTraceId);
                    }}
                    className={vitals.ecgLead === lead ? silverBtnActive : silverBtn}
                  >
                    {lead}
                  </button>
                ))}
              </div>

              <div className="text-[14px] font-bold pt-1">
                Secondary ECG Lead ({vitals.secondaryEcgLead})
              </div>
              <div className="grid grid-cols-6 gap-1">
                {(['V1', 'V2', 'V5', 'aVR', 'I', 'III'] as EcgLead[]).map((lead) => (
                  <button
                    key={lead}
                    type="button"
                    onClick={() => onUpdatePatientField('secondaryEcgLead', lead)}
                    className={
                      vitals.secondaryEcgLead === lead ? silverBtnActive : silverBtn
                    }
                  >
                    {lead}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const gains: (0.5 | 1 | 2 | 4)[] = [0.5, 1, 2, 4];
                onUpdatePatientField(
                  'ecgGain',
                  gains[(gains.indexOf(vitals.ecgGain) + 1) % gains.length]
                );
              }}
              className={menuRowClass}
            >
              <span>Adjust Size</span>
              <span className="font-bold">: &nbsp;&nbsp;x{vitals.ecgGain}</span>
            </button>

            <button
              type="button"
              onClick={() => onUpdatePatientField('paced', !vitals.paced)}
              className={menuRowClass}
            >
              <span>Paced Mode</span>
              <span className="font-bold">: &nbsp;&nbsp;{vitals.paced ? 'On' : 'Off'}</span>
            </button>

            <button type="button" onClick={cycleSweepSpeed} className={menuRowClass}>
              <span>Change Speed</span>
              <span className="font-bold">: &nbsp;&nbsp;{sweepSpeed} mm/s</span>
            </button>

            <div className="px-3.5 py-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onSwitchScreenView('ST_MAP_SPLIT');
                  onClose();
                }}
                className={silverBtnActive}
              >
                ST Map Split
              </button>
              <button
                type="button"
                onClick={() => {
                  onSwitchScreenView('TWELVE_LEAD');
                  onClose();
                }}
                className={silverBtn}
              >
                Capture 12-Lead
              </button>
              <button
                type="button"
                onClick={onStoreStReference}
                className={silverBtn}
              >
                Store ST Ref
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 4. SPO2 / PLETH WAVE MENU                                         */}
        {/* ================================================================= */}
        {activePopup === 'SPO2_SETUP' && (
          <div className="flex flex-col font-monitor">
            {renderWaveSlotBar()}
            <button type="button" onClick={onToggleWaveFrozen} className={menuRowClass}>
              <span>{waveFrozen ? 'Unfreeze Wave' : 'Freeze Wave'}</span>
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdatePatientField(
                  'pulseSource',
                  vitals.pulseSource === 'SpO2' ? 'ABP' : 'SpO2'
                )
              }
              className={menuRowClass}
            >
              <span>Pulse (SpO2)</span>
              <span className="font-bold">
                : &nbsp;{vitals.pulseSource === 'SpO2' ? 'Active' : vitals.abpLabel}
              </span>
            </button>
            <div className="px-3.5 py-2.5 border-b border-[#aeb1b8] flex items-center justify-between">
              <span className="text-[15px]">
                SpO2 Low Limit: <strong>{thresholds.spo2.low}%</strong> (Perf {vitals.perfusionIndex.toFixed(1)})
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => adjustLimit('spo2', 'low', -1)}
                  className={silverBtn}
                >
                  -1%
                </button>
                <button
                  type="button"
                  onClick={() => adjustLimit('spo2', 'low', 1)}
                  className={silverBtn}
                >
                  +1%
                </button>
              </div>
            </div>
            <button type="button" onClick={cycleSweepSpeed} className={menuRowClass}>
              <span>Change Speed</span>
              <span className="font-bold">: &nbsp;{sweepSpeed} mm/s</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenPopup('WAVE_SELECT')}
              className={`${menuRowClass} border-b-0`}
            >
              <span>Change Wave</span>
              <span className="text-xs font-bold text-[#1e6fd9]">
                Slot {clampedSlotIndex + 1}
              </span>
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* 5. ALARM VOLUME & PHILIPS BELL CHIMES                             */}
        {/* ================================================================= */}
        {activePopup === 'ALARM_VOLUME' && (
          <div className="p-3.5 space-y-3 font-monitor">
            <div className="flex items-center justify-between pb-2 border-b border-[#aeb1b8]">
              <div>
                <div className="text-[16px] font-bold">Audible Philips Monitor Sound</div>
                <div className="text-[13px] text-[#353942]">
                  Authentic Philips IntelliVue crystal bell chimes &amp; 625 Hz QRS/SpO₂ pulse tone
                </div>
              </div>
              <button
                type="button"
                onClick={() => onChangeAlarmAudio({ enabled: !audioEnabled })}
                className={audioEnabled ? silverBtnActive : silverBtn}
              >
                {audioEnabled ? 'Sound: ON' : 'Sound: MUTED'}
              </button>
            </div>

            <div>
              <div className="text-[14px] font-semibold mb-1">
                Alarm Volume: {audioEnabled ? alarmVolume : 0} / 10
              </div>
              <div className="grid grid-cols-11 gap-1 items-end h-12 bg-[#bec2ca] p-1.5 border border-[#8c919b]">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => {
                  const active = audioEnabled && v <= alarmVolume && v > 0;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        onChangeAlarmAudio({ enabled: v > 0, volume: v });
                        if (v > 0) {
                          setTimeout(() => clinicalAudio.playMediumPriorityBurst(), 35);
                        }
                      }}
                      style={{ height: `${Math.max(26, v * 9 + 10)}%` }}
                      className={`w-full text-[11px] font-bold flex items-end justify-center border cursor-pointer ${
                        active
                          ? 'bg-[#1e6fd9] text-white border-[#124994]'
                          : 'bg-[#d4d6da] text-[#22252b] border-[#7c8089]'
                      }`}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#aeb1b8]">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onChangeAlarmAudio({ standard: 'PHILIPS', enabled: true })
                  }
                  className={
                    alarmToneStandard === 'PHILIPS' ? silverBtnActive : silverBtn
                  }
                >
                  Philips Bell Tone
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChangeAlarmAudio({ standard: 'IEC', enabled: true })
                  }
                  className={
                    alarmToneStandard === 'IEC' ? silverBtnActive : silverBtn
                  }
                >
                  IEC 60601
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  onChangeAlarmAudio({
                    enabled: true,
                    qrsBeep: !qrsBeepEnabled,
                  })
                }
                className={qrsBeepEnabled ? silverBtnActive : silverBtn}
              >
                QRS Pulse Tone: {qrsBeepEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#aeb1b8]">
              <span className="text-[13px] font-bold mr-1">Test Tones:</span>
              <button
                type="button"
                onClick={() => {
                  onChangeAlarmAudio({ enabled: true });
                  setTimeout(() => clinicalAudio.playHighPriorityBurst(), 25);
                }}
                className="px-2.5 py-1 bg-[#d91c1c] text-white font-bold text-xs cursor-pointer"
              >
                *** Red Chime
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeAlarmAudio({ enabled: true });
                  setTimeout(() => clinicalAudio.playMediumPriorityBurst(), 25);
                }}
                className="px-2.5 py-1 bg-[#f5cf00] text-black font-bold text-xs cursor-pointer"
              >
                ** Yellow Chime
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeAlarmAudio({ enabled: true });
                  setTimeout(() => clinicalAudio.playLowPriorityInop(), 25);
                }}
                className="px-2.5 py-1 bg-[#33c5ff] text-black font-bold text-xs cursor-pointer"
              >
                ! Cyan INOP
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 6. NBP, VENIPUNCTURE, CO2 (ADJACENT SLOWER SPEED), TEMP           */}
        {/* ================================================================= */}
        {activePopup === 'VENIPUNCTURE' && (
          <div className="p-3.5 space-y-2.5 font-monitor">
            <div className="text-[15px] font-semibold">
              {vitals.venipunctureActive
                ? `Cuff Holding at 60 mmHg — Auto-deflate in ${vitals.venipunctureSecRemaining}s`
                : 'Inflate brachial cuff to 60 mmHg venous stasis for phlebotomy / IV cannulation.'}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onStartVenipuncture} className={silverBtnActive}>
                Start Venipuncture (60 mmHg)
              </button>
              <button type="button" onClick={onStopNbp} className={silverBtn}>
                Deflate Cuff
              </button>
            </div>
          </div>
        )}

        {activePopup === 'NBP_SETUP' && (
          <div className="flex flex-col font-monitor">
            <button type="button" onClick={() => onTriggerNbp(false)} className={menuRowClass}>
              <span>Start / Stop NBP</span>
              <span className="font-bold">
                {vitals.nbpSys}/{vitals.nbpDia} ({vitals.nbpMap})
              </span>
            </button>
            <button type="button" onClick={() => onTriggerNbp(true)} className={menuRowClass}>
              <span>NBP STAT (5 min Continuous)</span>
            </button>
            <button type="button" onClick={onStartVenipuncture} className={menuRowClass}>
              <span>Venipuncture (60 mmHg)</span>
            </button>
            <div className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-1.5">
              <span className="text-[15px] font-semibold">Repeat Time:</span>
              <div className="flex gap-1">
                {([0, 5, 10, 15, 30, 60] as const).map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => onUpdatePatientField('nbpRepeatMin', min)}
                    className={vitals.nbpRepeatMin === min ? silverBtnActive : silverBtn}
                  >
                    {min === 0 ? 'Man' : `${min}m`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activePopup === 'CO2_SETUP' && (
          <div className="flex flex-col font-monitor">
            {renderWaveSlotBar()}
            <button type="button" onClick={onToggleWaveFrozen} className={menuRowClass}>
              <span>{waveFrozen ? 'Unfreeze Wave' : 'Freeze Wave'}</span>
            </button>
            <div className="px-3.5 py-2.5 border-b border-[#aeb1b8] flex items-center justify-between">
              <span className="text-[15px]">
                etCO2 Limits: {thresholds.etco2.low}..{thresholds.etco2.high} mmHg
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => adjustLimit('etco2', 'low', -2)}
                  className={silverBtn}
                >
                  Low -2
                </button>
                <button
                  type="button"
                  onClick={() => adjustLimit('etco2', 'high', 2)}
                  className={silverBtn}
                >
                  High +2
                </button>
              </div>
            </div>

            {/* ADJACENT MAIN SWEEP SPEED & SLOWER CO2 CAPNOGRAM SWEEP SPEED */}
            <div className="grid grid-cols-2 border-b border-[#aeb1b8] bg-[#cbced5]">
              <button
                type="button"
                onClick={() => {
                  clinicalAudio.playKeyClick();
                  cycleSweepSpeed();
                }}
                className="flex flex-col items-start justify-between px-3 py-2 border-r border-[#aeb1b8] hover:bg-[#bec2ca] cursor-pointer text-left"
              >
                <span className="text-[12px] text-[#353942]">Monitor Speed</span>
                <span className="text-[16px] font-bold text-[#111318]">
                  {sweepSpeed} mm/s
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  clinicalAudio.playKeyClick();
                  cycleCo2SpeedRatio();
                }}
                className="flex flex-col items-start justify-between px-3 py-2 hover:bg-[#bec2ca] cursor-pointer text-left"
                title="Adjust CO2 capnogram sweep speed relative to monitor speed (slower shows more exhalations)"
              >
                <span className="text-[12px] text-[#124994] font-semibold">
                  CO2 Speed ({vitals.co2SpeedRatio}x)
                </span>
                <span className="text-[16px] font-bold text-[#111318]">
                  {effectiveCo2Speed} mm/s
                </span>
              </button>
            </div>

            <div className="px-3.5 py-2 border-b border-[#aeb1b8] flex items-center justify-between gap-1.5">
              <span className="text-[13px] font-semibold text-[#2d313a]">
                Capnogram Density:
              </span>
              <div className="flex gap-1">
                {(
                  [
                    { ratio: 0.25 as Co2SpeedRatio, label: '6.25 mm/s (More Exhales)' },
                    { ratio: 0.5 as Co2SpeedRatio, label: '12.5 mm/s' },
                    { ratio: 1 as Co2SpeedRatio, label: '25 mm/s' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.ratio}
                    type="button"
                    onClick={() => {
                      clinicalAudio.playKeyClick();
                      onUpdatePatientField('co2SpeedRatio', opt.ratio);
                    }}
                    className={
                      vitals.co2SpeedRatio === opt.ratio ? silverBtnActive : silverBtn
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenPopup('WAVE_SELECT')}
              className={`${menuRowClass} border-b-0`}
            >
              <span>Change Wave</span>
              <span className="text-xs font-bold text-[#1e6fd9]">
                Slot {clampedSlotIndex + 1}
              </span>
            </button>
          </div>
        )}

        {activePopup === 'TEMP_SETUP' && (
          <div className="p-3.5 flex items-center justify-between font-monitor text-[15px]">
            <div>
              Tcore {vitals.tempCoreC.toFixed(1)} °C · Tskin {vitals.tempSkinC.toFixed(1)} °C
            </div>
            <button type="button" onClick={onToggleTempUnit} className={silverBtnActive}>
              Unit: °{tempUnit}
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* 7. CHANGE SCREEN / MULTI-WAVE VIEWS (6 WAVES, 8 WAVES, 4W, 3W...) */}
        {/* ================================================================= */}
        {activePopup === 'PROFILES_SCREENS' && (
          <div className="flex flex-col font-monitor">
            <div className="px-3.5 py-1.5 bg-[#bfc3cc] border-b border-[#9fa3ab] flex items-center justify-between text-[13px] font-bold">
              <span>Select Screen Layout (Click any wave on screen to change trace)</span>
              <button
                type="button"
                onClick={() => onOpenPopup('WAVE_SELECT')}
                className={silverBtnActive}
              >
                Configure Wave Slots
              </button>
            </div>

            {(
              [
                {
                  label: 'Screen : 6 Waves ICU (Configurable Slots 1–6)',
                  view: 'SIX_WAVES' as MonitorScreenView,
                  profile: '6 Waves',
                  overlap: false,
                },
                {
                  label: 'Screen : 8 Waves High-Density (Slots 1–8)',
                  view: 'EIGHT_WAVES' as MonitorScreenView,
                  profile: '8 Waves',
                  overlap: false,
                },
                {
                  label: 'Screen : 4 Waves Dynamic (Slots 1–4)',
                  view: 'FOUR_WAVES' as MonitorScreenView,
                  profile: '4 Waves',
                  overlap: false,
                },
                {
                  label: 'Screen : 3 Waves Compact (Slots 1–3)',
                  view: 'THREE_WAVES' as MonitorScreenView,
                  profile: '3 Waves',
                  overlap: false,
                },
                {
                  label: 'Profile : Overlapping A (ABP + PAP + CVP Overlap)',
                  view: 'OVERLAP_WAVES' as MonitorScreenView,
                  profile: 'Overlapping A',
                  overlap: true,
                },
                {
                  label: 'Profile : SSC Sepsis Multi-Wave + Horizon',
                  view: 'STANDARD_WAVES' as MonitorScreenView,
                  profile: 'SSC Sepsis',
                  overlap: false,
                },
                {
                  label: 'Screen : ST Map Split View',
                  view: 'ST_MAP_SPLIT' as MonitorScreenView,
                  profile: vitals.profileName,
                  overlap: false,
                },
                {
                  label: 'Screen : ST Map Full Diagnostic',
                  view: 'ST_MAP_FULL' as MonitorScreenView,
                  profile: vitals.profileName,
                  overlap: false,
                },
                {
                  label: 'Screen : Realtime 12-Lead ECG',
                  view: 'TWELVE_LEAD' as MonitorScreenView,
                  profile: vitals.profileName,
                  overlap: false,
                },
                {
                  label: 'Screen : Big Numbers',
                  view: 'BIG_NUMBERS' as MonitorScreenView,
                  profile: vitals.profileName,
                  overlap: false,
                },
                {
                  label: 'Screen : Vitals Trends Table & Horizon',
                  view: 'TRENDS' as MonitorScreenView,
                  profile: vitals.profileName,
                  overlap: false,
                },
                {
                  label: 'Screen : C.O. Thermodilution Hemodynamics',
                  view: 'CO_HEMO' as MonitorScreenView,
                  profile: vitals.profileName,
                  overlap: false,
                },
              ] as const
            ).map((row, idx, arr) => {
              const isActive =
                row.view === 'OVERLAP_WAVES'
                  ? vitals.overlapWaves || screenView === 'OVERLAP_WAVES'
                  : !vitals.overlapWaves && screenView === row.view;
              return (
                <button
                  key={row.label}
                  type="button"
                  onClick={() => {
                    clinicalAudio.playKeyClick(true);
                    onUpdatePatientField('overlapWaves', row.overlap);
                    onUpdatePatientField('profileName', row.profile);
                    onSwitchScreenView(row.view);
                    onClose();
                  }}
                  className={`${menuRowClass} ${
                    idx === arr.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <span>{row.label}</span>
                  {isActive && (
                    <span className="text-xs font-bold text-[#1e6fd9]">ACTIVE</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ================================================================= */}
        {/* 8. PATIENT DEMOGRAPHICS (SINGLE PATIENT: JOHN DOE ON BED 1)       */}
        {/* ================================================================= */}
        {activePopup === 'PATIENT_ADMIT' && (
          <div className="p-3.5 space-y-2.5 font-monitor text-[15px]">
            <div className="flex items-center justify-between border-b border-[#aeb1b8] pb-2">
              <div>
                <div className="text-xs uppercase text-[#454952]">Assigned Care Unit Bed</div>
                <div className="text-lg font-bold text-[#111318]">Bed 1 — John Doe</div>
              </div>
              <span className="px-2 py-0.5 bg-[#1e6fd9] text-white text-xs font-bold">
                ADMITTED
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-[#aeb1b8] pb-2">
              <span>Patient Category</span>
              <div className="flex gap-1">
                {(['Adult', 'Pediatric'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => onUpdatePatientField('category', cat)}
                    className={vitals.category === cat ? silverBtnActive : silverBtn}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span>Patient Weight (Clinical Calcs)</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onChangePatientWeightKg(Math.max(35, patientWeightKg - 5))}
                  className={silverBtn}
                >
                  -5 kg
                </button>
                <span className="font-bold px-2">{patientWeightKg} kg</span>
                <button
                  type="button"
                  onClick={() => onChangePatientWeightKg(Math.min(160, patientWeightKg + 5))}
                  className={silverBtn}
                >
                  +5 kg
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 9. ALARM LIMITS, CLINICAL CALCS, RECORDINGS, MAIN SETUP           */}
        {/* ================================================================= */}
        {activePopup === 'ALARM_LIMITS' && (
          <div className="p-2.5 space-y-1 font-monitor text-[14px]">
            {(
              [
                { key: 'hr', label: 'HR (bpm)', step: 5 },
                { key: 'spo2', label: 'SpO2 (%)', step: 1 },
                { key: 'abpSys', label: `${vitals.abpLabel} Sys (mmHg)`, step: 5 },
                { key: 'abpMap', label: `${vitals.abpLabel} MAP (mmHg)`, step: 5 },
                { key: 'papMap', label: 'PAP Mean (mmHg)', step: 2 },
                { key: 'cvp', label: 'CVP Mean (mmHg)', step: 2 },
                { key: 'icp', label: 'ICP Mean (mmHg)', step: 2 },
                { key: 'etco2', label: 'etCO2 (mmHg)', step: 2 },
                { key: 'respRate', label: 'Resp / awRR (rpm)', step: 2 },
                { key: 'tempCoreC', label: 'Temp (°C)', step: 0.5 },
              ] as { key: keyof AlarmThresholds; label: string; step: number }[]
            ).map((item) => {
              const r = thresholds[item.key];
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between border-b border-[#aeb1b8] px-2 py-1"
                >
                  <span className="font-bold w-36">{item.label}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => adjustLimit(item.key, 'low', -item.step)}
                      className={silverBtn}
                    >
                      -
                    </button>
                    <span className="w-9 text-center font-bold">{r.low}</span>
                    <button
                      type="button"
                      onClick={() => adjustLimit(item.key, 'low', item.step)}
                      className={silverBtn}
                    >
                      +
                    </button>
                    <span className="mx-1">..</span>
                    <button
                      type="button"
                      onClick={() => adjustLimit(item.key, 'high', -item.step)}
                      className={silverBtn}
                    >
                      -
                    </button>
                    <span className="w-9 text-center font-bold">{r.high}</span>
                    <button
                      type="button"
                      onClick={() => adjustLimit(item.key, 'high', item.step)}
                      className={silverBtn}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleAlarmEnabled(item.key)}
                    className={r.enabled ? silverBtnActive : silverBtn}
                  >
                    {r.enabled ? 'On' : 'Off'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {activePopup === 'DRUG_CALC' && (
          <div className="p-3.5 space-y-3 font-monitor text-[14px]">
            <div className="text-xs text-[#333740]">
              Standalone bedside nomogram reference (does not control external infusion hardware).
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold mb-1">Reference Agent</label>
                <select
                  value={calcDrugId}
                  onChange={(e) => {
                    const d = ICU_DRUG_LIBRARY.find((x) => x.id === e.target.value);
                    setCalcDrugId(e.target.value);
                    if (d) setCalcRateMlH(d.defaultRateMlH);
                  }}
                  className="w-full border border-[#7c8089] bg-white text-[#111318] px-2 py-1 font-semibold"
                >
                  {ICU_DRUG_LIBRARY.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.concentrationLabel})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Nomogram Rate (mL/h)</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setCalcRateMlH((r) => Math.max(0.1, Number((r - 0.5).toFixed(1))))
                    }
                    className={silverBtn}
                  >
                    -0.5
                  </button>
                  <span className="px-2 font-bold text-base">
                    {calcRateMlH.toFixed(1)} mL/h
                  </span>
                  <button
                    type="button"
                    onClick={() => setCalcRateMlH((r) => Number((r + 0.5).toFixed(1)))}
                    className={silverBtn}
                  >
                    +0.5
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-[#c5c8cf] border border-[#969aa3] p-2.5 flex items-center justify-between">
              <span>Calculated Dose ({patientWeightKg} kg · John Doe):</span>
              <strong className="text-lg text-[#124994]">
                {calcDose.toFixed(2)} {selectedCalcDrug.doseUnit}
              </strong>
            </div>

            <div className="grid grid-cols-5 gap-1 text-center text-xs">
              {[0.5, 1.0, 1.5, 2.0, 3.0].map((mult) => {
                const r = Number((selectedCalcDrug.defaultRateMlH * mult).toFixed(1));
                const d = calculateDoseFromRate(selectedCalcDrug, r, patientWeightKg);
                const backR = calculateRateFromDose(selectedCalcDrug, d, patientWeightKg);
                return (
                  <div key={mult} className="border border-[#969aa3] bg-[#dfe1e6] p-1">
                    <div className="font-bold">{backR.toFixed(1)} mL/h</div>
                    <div>{d.toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activePopup === 'RECORDINGS' && (
          <div className="p-3.5 space-y-2.5 font-monitor text-[15px]">
            <div>
              Realtime 25 mm/s Dual-Trace Thermal Strip Recorder (II + {vitals.abpLabel})
            </div>
            <button
              type="button"
              onClick={() =>
                setRecordingMessage(
                  `Recorded Bed 1 · John Doe @ ${new Date().toLocaleTimeString()} — HR ${vitals.hr}, ${vitals.abpLabel} ${vitals.abpSys}/${vitals.abpDia}`
                )
              }
              className={silverBtnActive}
            >
              Start Realtime Strip Recording
            </button>
            {recordingMessage && (
              <div className="p-2 bg-white border border-[#8e929b] text-xs font-mono">
                {recordingMessage}
              </div>
            )}
          </div>
        )}

        {(activePopup === 'SMARTKEYS_POPUP' || activePopup === 'MAIN_SETUP') && (
          <div className="flex flex-col font-monitor">
            <button
              type="button"
              onClick={() => onOpenPopup('PROFILES_SCREENS')}
              className={menuRowClass}
            >
              <span>Change Screen (3 / 4 / 6 / 8 Waves &amp; Views)</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenPopup('WAVE_SELECT')}
              className={menuRowClass}
            >
              <span>Select Displayed Waveforms (Slots 1–8)</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenPopup('MODULE_MGMT')}
              className={menuRowClass}
            >
              <span>Connected Modules (EMS Diagram)</span>
              <span className="text-xs font-bold text-[#1e6fd9]">[||||||||]</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const next = !vitals.overlapWaves;
                onUpdatePatientField('overlapWaves', next);
                onUpdatePatientField(
                  'profileName',
                  next ? 'Overlapping A' : 'SSC Sepsis'
                );
              }}
              className={menuRowClass}
            >
              <span>Overlap Waves</span>
              <span className="font-bold">
                : &nbsp;{vitals.overlapWaves ? 'Overlapping A' : 'Off'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onOpenPopup('ALARM_LIMITS')}
              className={menuRowClass}
            >
              <span>Alarm Limits</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenPopup('ALARM_VOLUME')}
              className={menuRowClass}
            >
              <span>Alarm Volume &amp; QRS Tone</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenPopup('PATIENT_ADMIT')}
              className={menuRowClass}
            >
              <span>Patient (Bed 1 · John Doe)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEnterStandby();
              }}
              className={`${menuRowClass} border-b-0 font-bold`}
            >
              <span className="inline-flex items-center gap-2">
                <svg
                  viewBox="0 0 16 16"
                  className="h-3.5 w-3.5 stroke-[#111318] fill-none shrink-0"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <line x1="8" y1="2" x2="8" y2="8" />
                  <path d="M4.5 4.2 A 5.2 5.2 0 1 0 11.5 4.2" />
                </svg>
                <span>Monitor Standby</span>
              </span>
            </button>
          </div>
        )}

        {activePopup === 'SYSTEM_CHECK' && (
          <div className="p-3.5 font-monitor text-[15px] space-y-1">
            <div>Bed 1 · John Doe — Philips IntelliVue Clinical Host</div>
            <div>Plugged EMS Modules: {pluggedCount} / {modules.length}</div>
            <div>Sweep Speed: {sweepSpeed} mm/s · CO2 Speed: {effectiveCo2Speed} mm/s</div>
          </div>
        )}
      </div>
    </div>
  );
};
