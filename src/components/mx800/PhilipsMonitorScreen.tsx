import React, { useEffect, useState } from 'react';
import {
  ActiveAlarm,
  AlarmThresholds,
  AlarmToneStandard,
  EcgLead,
  MonitorModel,
  MonitorScreenView,
  PatientVitals,
  PhilipsHardwareModule,
  TempUnit,
  TrendPoint,
  WaveTraceId,
} from '../../types/clinical';
import { clinicalAudio } from '../../services/audioSynth';
import {
  ClickableWaveChannel,
  DEFAULT_EIGHT_WAVE_SLOTS,
  WaveformCanvas,
} from './WaveformCanvas';
import {
  CoThermodilutionView,
  StMapMultiView,
  TwelveLeadDiagnosticView,
  VitalsTrendsView,
} from './StMapViews';
import { MonitorModals, PhilipsPopupId } from './MonitorModals';
import { ClinicalInformaticsPC } from './ClinicalInformaticsPC';

interface PhilipsMonitorScreenProps {
  vitals: PatientVitals;
  monitorModel: MonitorModel;
  modules: PhilipsHardwareModule[];
  onToggleModulePlugged: (slotId: string) => void;
  onToggleModuleCableWired: (slotId: string) => void;
  thresholds: AlarmThresholds;
  activeAlarms: ActiveAlarm[];
  alarmsSilencedSec: number;
  alarmsPaused: boolean;
  standbyMode: boolean;
  onSetStandbyMode: (standby: boolean) => void;
  onSilenceAlarms: () => void;
  onTogglePauseAlarms: () => void;
  onUpdateThresholds: (next: AlarmThresholds) => void;
  onUpdatePatientField: <K extends keyof PatientVitals>(
    field: K,
    value: PatientVitals[K]
  ) => void;
  patientWeightKg: number;
  onChangePatientWeightKg: (kg: number) => void;
  tempUnit: TempUnit;
  onToggleTempUnit: () => void;
  screenView: MonitorScreenView;
  onSwitchScreenView: (view: MonitorScreenView) => void;
  onTriggerNbp: (stat?: boolean) => void;
  onStopNbp: () => void;
  onStartVenipuncture: () => void;
  onZeroPressure: (channel: 'ABP' | 'PAP' | 'CVP' | 'ICP' | 'ALL') => void;
  onStoreStReference: () => void;
  onStartCoMeasurement: () => void;
  onOpenModulesStation: () => void;
  trends: TrendPoint[];
  selectedBiosciDrugId: string;
  onSelectBiosciDrugId: (drugId: string) => void;
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

const philipsSmartKey =
  'flex flex-col items-center justify-between h-[46px] min-w-[56px] flex-1 px-1 py-1 bg-[#69686e] hover:bg-[#78777e] active:bg-[#55545a] text-white border border-[#96959c] font-monitor cursor-pointer select-none';

const ConnectedModulesSlotIcon: React.FC<{
  modules: PhilipsHardwareModule[];
  onClick: () => void;
}> = ({ modules, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-[1.5px] px-1 py-[2px] border border-white/90 rounded-[2px] bg-black hover:border-[#38bdf8] cursor-pointer"
      title="Connected EMS Modules — Click to open graphical EMS rack menu"
    >
      {modules.map((m) => (
        <span
          key={m.slotId}
          className={`h-2.5 ${m.widthSlots === 2 ? 'w-1.5' : 'w-[3px]'} ${
            !m.pluggedIn
              ? 'bg-neutral-800'
              : m.cableWired
                ? 'bg-white'
                : 'bg-[#33c5ff]'
          }`}
        />
      ))}
    </button>
  );
};

const PhilipsInopBadge: React.FC = () => (
  <svg
    viewBox="0 0 14 14"
    className="inline-block h-3.5 w-3.5 shrink-0"
    aria-hidden="true"
  >
    <rect x="0.5" y="0.5" width="13" height="13" rx="1.5" fill="#ffffff" />
    <path
      d="M3 11 L7 3.5 L11 11 Z"
      fill="none"
      stroke="#111318"
      strokeWidth="1.2"
    />
    <line x1="2.5" y1="2.5" x2="11.5" y2="11.5" stroke="#111318" strokeWidth="1.2" />
  </svg>
);

const PhilipsScreensIcon: React.FC<{ className?: string }> = ({
  className = 'h-3 w-3.5',
}) => (
  <svg
    viewBox="0 0 16 12"
    className={`${className} stroke-current fill-none shrink-0`}
    strokeWidth="1.4"
    aria-hidden="true"
  >
    <rect x="1.5" y="4" width="9" height="6.5" rx="0.8" />
    <path d="M5 4 V1.5 H14.5 V8 H10.5" />
  </svg>
);

const PhilipsStandbySvg: React.FC<{ className?: string }> = ({
  className = 'h-3.5 w-3.5',
}) => (
  <svg
    viewBox="0 0 18 18"
    className={`${className} stroke-current fill-none shrink-0`}
    strokeWidth="1.8"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <line x1="9" y1="2.2" x2="9" y2="8.8" />
    <path d="M5.1 4.6 A 6 6 0 1 0 12.9 4.6" />
  </svg>
);

export const PhilipsMonitorScreen: React.FC<PhilipsMonitorScreenProps> = ({
  vitals,
  monitorModel,
  modules,
  onToggleModulePlugged,
  onToggleModuleCableWired,
  thresholds,
  activeAlarms,
  alarmsSilencedSec,
  alarmsPaused,
  standbyMode,
  onSetStandbyMode,
  onSilenceAlarms,
  onTogglePauseAlarms,
  onUpdateThresholds,
  onUpdatePatientField,
  patientWeightKg,
  onChangePatientWeightKg,
  tempUnit,
  onToggleTempUnit,
  screenView,
  onSwitchScreenView,
  onTriggerNbp,
  onStopNbp,
  onStartVenipuncture,
  onZeroPressure,
  onStoreStReference,
  onStartCoMeasurement,
  onOpenModulesStation,
  trends,
  selectedBiosciDrugId,
  onSelectBiosciDrugId,
  audioEnabled,
  alarmVolume,
  alarmToneStandard,
  qrsBeepEnabled,
  onChangeAlarmAudio,
}) => {
  const [activePopup, setActivePopup] = useState<PhilipsPopupId>(null);
  const [smartKeyPage, setSmartKeyPage] = useState<0 | 1>(0);
  const [sweepSpeed, setSweepSpeed] = useState<12.5 | 25 | 50>(25);
  const [waveFrozen, setWaveFrozen] = useState<boolean>(false);
  const [cursorActive, setCursorActive] = useState<boolean>(false);
  const [waveSlots, setWaveSlots] = useState<WaveTraceId[]>(() => [
    ...DEFAULT_EIGHT_WAVE_SLOTS,
  ]);
  const [selectedWaveSlotIndex, setSelectedWaveSlotIndex] = useState<number>(0);

  const [clockShort, setClockShort] = useState<string>('14:28');
  const [clockFull, setClockFull] = useState<string>('6 May  14:28');
  const [bundleSeconds, setBundleSeconds] = useState<number>(18 * 60 + 51);
  const [alarmAlternatePhase, setAlarmAlternatePhase] = useState<boolean>(false);
  const [numericAlarmFlash, setNumericAlarmFlash] = useState<boolean>(true);
  const [knobAngle, setKnobAngle] = useState<number>(0);

  // Resume from Standby on any keyboard key press
  useEffect(() => {
    if (!standbyMode) return;
    const handleKey = () => {
      clinicalAudio.playKeyClick(true);
      onSetStandbyMode(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [standbyMode, onSetStandbyMode]);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const shortT = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const d = now.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      });
      setClockShort(shortT);
      setClockFull(`${d}  ${shortT}`);
    };
    updateClock();
    const timer = window.setInterval(() => {
      updateClock();
      setBundleSeconds((s) => s + 1);
      setAlarmAlternatePhase((p) => !p);
    }, 1020);
    return () => window.clearInterval(timer);
  }, []);

  // Crisp ~1 Hz Yellow Flashing Phase for Alarming Numerical Parameters
  useEffect(() => {
    const flashTimer = window.setInterval(() => {
      setNumericAlarmFlash((f) => !f);
    }, 520);
    return () => window.clearInterval(flashTimer);
  }, []);

  const findMod = (key: PhilipsHardwareModule['parameterKey']) =>
    modules.find((m) => m.parameterKey === key && m.pluggedIn);

  const isWired = (key: PhilipsHardwareModule['parameterKey']) =>
    modules.some((m) => m.parameterKey === key && m.pluggedIn && m.cableWired);

  const highAlarms =
    alarmsPaused || standbyMode
      ? []
      : activeAlarms.filter((a) => a.priority === 'HIGH');
  const medAlarms =
    alarmsPaused || standbyMode
      ? []
      : activeAlarms.filter((a) => a.priority === 'MEDIUM');
  const lowInopAlarms = standbyMode
    ? []
    : activeAlarms.filter((a) => a.priority === 'LOW_INOP');

  const topRedAlarm = highAlarms[0] ?? null;
  const topYellowAlarm = medAlarms[0] ?? highAlarms[1] ?? null;
  const topCyanInop = lowInopAlarms[0] ?? null;

  /**
   * Zero-jitter numerical alarm class: constant padding is applied on the button itself,
   * and any active physiological alarm flashes bright Philips Yellow (#ffe600) cleanly!
   */
  const getParamAlarmClass = (
    paramKeys: ActiveAlarm['parameter'][],
    normalTextColorClass: string
  ): string => {
    if (alarmsPaused || standbyMode) return normalTextColorClass;
    const redHit = highAlarms.some((a) => paramKeys.includes(a.parameter));
    if (redHit) {
      return numericAlarmFlash
        ? 'bg-[#ffe600] text-[#0a0a0a]'
        : 'bg-[#dc1e1e] text-white';
    }
    const yellowHit = medAlarms.some((a) => paramKeys.includes(a.parameter));
    if (yellowHit) {
      return numericAlarmFlash
        ? 'bg-[#ffe600] text-[#0a0a0a]'
        : 'bg-transparent text-[#ffe600]';
    }
    return normalTextColorClass;
  };

  const formatTemp = (c: number) =>
    tempUnit === 'C' ? c.toFixed(1) : ((c * 9) / 5 + 32).toFixed(1);

  const handleWaveChannelClick = (ch: ClickableWaveChannel) => {
    clinicalAudio.playKeyClick();
    switch (ch) {
      case 'ECG':
      case 'ECG2':
        setActivePopup('ECG_SETUP');
        break;
      case 'SPO2':
        setActivePopup('SPO2_SETUP');
        break;
      case 'ABP':
      case 'OVERLAP_PRESS':
        setActivePopup('ABP_SETUP');
        break;
      case 'PAP':
        setActivePopup('PAP_SETUP');
        break;
      case 'CVP':
        setActivePopup('CVP_SETUP');
        break;
      case 'ICP':
        setActivePopup('ICP_SETUP');
        break;
      case 'CO2':
      case 'RESP':
      case 'AWP':
        setActivePopup('CO2_SETUP');
        break;
      case 'EEG':
        setActivePopup('WAVE_SELECT');
        break;
    }
  };

  const handleSelectWaveSlotFromCanvas = (
    slotIndex: number,
    _traceId: WaveTraceId,
    channel: ClickableWaveChannel
  ) => {
    setSelectedWaveSlotIndex(slotIndex);
    handleWaveChannelClick(channel);
  };

  const handleChangeWaveSlot = (slotIndex: number, nextTrace: WaveTraceId) => {
    setWaveSlots((prev) => {
      const next = [...prev];
      while (next.length < 8) next.push('OFF');
      next[slotIndex] = nextTrace;
      return next;
    });
  };

  const handleHeartbeatBeep = (spo2Val: number) => {
    if (!standbyMode && qrsBeepEnabled && audioEnabled && isWired('MMS')) {
      clinicalAudio.playQrsPulseBeep(spo2Val);
    }
  };

  const bundleMins = Math.floor(bundleSeconds / 60) % 60;
  const bundleHrs = Math.floor(bundleSeconds / 3600);
  const bundleClock = `${String(bundleHrs > 0 ? bundleHrs : 18).padStart(2, '0')}:${String(bundleMins).padStart(2, '0')}`;

  const isMx400 = monitorModel === 'MX400';
  const dynamicMode =
    monitorModel === 'MX700' ||
    screenView === 'DYNAMIC_WAVES' ||
    screenView === 'FOUR_WAVES';

  const showSepsisHorizon =
    monitorModel === 'MX800' &&
    !vitals.overlapWaves &&
    vitals.profileName === 'SSC Sepsis' &&
    screenView === 'STANDARD_WAVES';

  const screenHeaderTitle = (() => {
    if (vitals.overlapWaves || screenView === 'OVERLAP_WAVES') return 'Overlapping A';
    if (screenView === 'SIX_WAVES') return '6 Waves';
    if (screenView === 'EIGHT_WAVES') return '8 Waves';
    if (screenView === 'FOUR_WAVES' || screenView === 'DYNAMIC_WAVES') return '4 Waves';
    if (screenView === 'THREE_WAVES' || isMx400) return '3 Waves';
    return vitals.profileName;
  })();

  // Bezel Top-Left 3 Alarm Lamps: Spot 1 & Spot 2 alternate Red and Yellow; Spot 3 is steady Cyan-Blue
  const spot1Red =
    Boolean(topRedAlarm) && (!topYellowAlarm ? !alarmAlternatePhase : alarmAlternatePhase);
  const spot1Yellow =
    Boolean(topYellowAlarm) && Boolean(topRedAlarm) && !alarmAlternatePhase;
  const spot2Red =
    Boolean(topRedAlarm) && (!topYellowAlarm ? alarmAlternatePhase : !alarmAlternatePhase);
  const spot2Yellow =
    Boolean(topYellowAlarm) && (!topRedAlarm ? true : alarmAlternatePhase);
  const spot3BlueSteady =
    !standbyMode && (Boolean(topCyanInop) || alarmsPaused || alarmsSilencedSec > 0);

  const firstPhysioSlot =
    topRedAlarm && topYellowAlarm
      ? alarmAlternatePhase
        ? topRedAlarm
        : topYellowAlarm
      : topRedAlarm ?? topYellowAlarm;
  const secondPhysioSlot =
    topRedAlarm && topYellowAlarm
      ? alarmAlternatePhase
        ? topYellowAlarm
        : topRedAlarm
      : null;

  const perfBarsFilled = isWired('MMS')
    ? Math.max(1, Math.min(5, Math.round(vitals.perfusionIndex * 1.6)))
    : 0;

  return (
    <div
      className={`flex flex-col items-center w-full select-none ${
        isMx400 ? 'max-w-[820px]' : 'max-w-[1160px]'
      }`}
    >
      {/* MX400 Integrated White-Grey Portable Top Carry Handle */}
      {isMx400 && (
        <div className="w-[92%] h-14 rounded-t-[26px] border-x-[22px] border-t-[18px] border-[#dddfe3] bg-transparent shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)] -mb-2 z-0" />
      )}

      {/* Physical Philips IntelliVue Matte Dark-Charcoal Bezel */}
      <div
        className={`relative z-10 w-full rounded-[22px] bg-gradient-to-b from-[#202329] via-[#15181e] to-[#0f1116] ${
          isMx400 ? 'p-4 sm:p-6' : 'p-3.5 sm:p-5'
        } shadow-[0_24px_55px_rgba(0,0,0,0.68)] border border-[#343842]`}
      >
        {/* Top Bezel Row: 3 Alarm Light Lenses + IntelliVue Badge */}
        <div className="flex items-center justify-between px-2 pb-2.5">
          <div className="flex items-center gap-2">
            <div
              className={`h-2.5 w-10 rounded-xs border border-white/15 transition-colors duration-150 ${
                spot1Red
                  ? 'bg-[#ff1f1f] shadow-[0_0_14px_#ff1f1f]'
                  : spot1Yellow
                    ? 'bg-[#ffd800] shadow-[0_0_12px_#ffd800]'
                    : 'bg-[#3f434c]/70'
              }`}
              title="Alarm Lamp Spot 1 (Alternating Red / Yellow)"
            />
            <div
              className={`h-2.5 w-10 rounded-xs border border-white/15 transition-colors duration-150 ${
                spot2Red
                  ? 'bg-[#ff1f1f] shadow-[0_0_14px_#ff1f1f]'
                  : spot2Yellow
                    ? 'bg-[#ffd800] shadow-[0_0_12px_#ffd800]'
                    : 'bg-[#3f434c]/70'
              }`}
              title="Alarm Lamp Spot 2 (Alternating Red / Yellow)"
            />
            <div
              className={`h-2.5 w-20 rounded-xs border border-white/15 transition-colors ${
                spot3BlueSteady
                  ? 'bg-[#1ec8ff] shadow-[0_0_12px_#1ec8ff]'
                  : 'bg-[#3f434c]/70'
              }`}
              title="Low-Priority / Technical INOP Cyan-Blue Lamp (Steady)"
            />
          </div>

          <div className="flex items-baseline gap-1.5 tracking-tight">
            <span className="text-xs sm:text-sm font-medium text-[#c0c6d0]">
              IntelliVue
            </span>
            {!isMx400 && (
              <span className="text-sm sm:text-base font-bold text-[#eef2f7]">
                {monitorModel}
              </span>
            )}
          </div>
        </div>

        {/* Pure #000000 Philips LCD Screen */}
        <div
          className={`relative flex flex-col w-full font-monitor ${
            isMx400 ? 'h-[470px] sm:h-[510px]' : 'h-[565px] sm:h-[620px]'
          } bg-black border-2 border-[#050608] shadow-inner overflow-hidden`}
        >
          {/* PHILIPS STANDBY MODE OVERLAY */}
          {standbyMode && (
            <div
              onClick={() => {
                clinicalAudio.playKeyClick(true);
                onSetStandbyMode(false);
              }}
              className="absolute inset-0 z-40 flex flex-col cursor-pointer select-none bg-black"
              title="Click anywhere or press any key to resume monitoring Bed 1 · John Doe"
            >
              <div className="h-[46%] w-full bg-[#2b2b2b] flex items-center justify-center pt-4">
                <div className="text-6xl sm:text-[84px] font-sans font-black tracking-[0.06em] leading-none bg-gradient-to-b from-[#ffffff] via-[#e4e4e2] to-[#bdbab2] bg-clip-text text-transparent select-none">
                  PHILIPS
                </div>
              </div>

              <div className="relative h-0 w-full flex items-center justify-center z-10">
                <div
                  className="w-[330px] sm:w-[430px] h-[58px] sm:h-[68px] rounded-[11px] border border-[#e5e4df] shadow-[0_6px_20px_rgba(0,0,0,0.85)] flex items-baseline justify-center gap-6 sm:gap-9 px-6 pt-3 sm:pt-3.5"
                  style={{
                    background:
                      'linear-gradient(180deg, #f8f8f6 0%, #d4d1c7 46%, #aba69b 86%, #948f84 100%)',
                  }}
                >
                  <span className="font-sans text-2xl sm:text-[31px] font-medium tracking-tight text-[#141414]">
                    IntelliVue
                  </span>
                  <span className="font-sans text-base sm:text-[20px] font-semibold tracking-tight text-[#181818]">
                    Critical Care
                  </span>
                </div>
              </div>

              <div className="flex-1 w-full bg-black flex flex-col justify-end pb-4">
                <div className="w-full bg-[#212121] border-y border-[#353535] py-1.5 text-center">
                  <span className="font-sans text-lg sm:text-[21px] font-semibold tracking-[0.06em] text-white">
                    STANDBY
                  </span>
                </div>
                <div className="w-full bg-[#0c0c0c] border-b border-[#1c1c1c] py-1.5 text-center">
                  <span className="font-sans text-xs sm:text-[14px] font-medium text-[#e7c16a]">
                    Press any key or select any field on the screen to resume monitoring
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Top Status & Steady Non-Flashing Alarm Rectangles Bar */}
          <div className="flex items-center justify-between h-6 bg-[#20232a] border-b border-[#393e49] px-2 text-[13px] text-[#e2e8f0] shrink-0 gap-2">
            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
              {topCyanInop && (
                <button
                  type="button"
                  onClick={() => setActivePopup('MODULE_MGMT')}
                  className="px-2 py-0.5 bg-[#33c5ff] text-black font-semibold text-[12px] leading-none whitespace-nowrap cursor-pointer"
                  title="Steady Cyan Technical INOP — Click to inspect Connected EMS Modules"
                >
                  {topCyanInop.label}
                </button>
              )}

              {firstPhysioSlot && (
                <button
                  type="button"
                  onClick={() => setActivePopup('ALARM_LIMITS')}
                  className={`px-2 py-0.5 text-[12.5px] font-bold leading-none whitespace-nowrap cursor-pointer ${
                    firstPhysioSlot.priority === 'HIGH'
                      ? 'bg-[#e01e1e] text-white'
                      : 'bg-[#f5cf00] text-black'
                  }`}
                >
                  {firstPhysioSlot.label}
                </button>
              )}

              {secondPhysioSlot && (
                <button
                  type="button"
                  onClick={() => setActivePopup('ALARM_LIMITS')}
                  className={`hidden md:inline-block px-2 py-0.5 text-[12.5px] font-bold leading-none whitespace-nowrap cursor-pointer ${
                    secondPhysioSlot.priority === 'HIGH'
                      ? 'bg-[#e01e1e] text-white'
                      : 'bg-[#f5cf00] text-black'
                  }`}
                >
                  {secondPhysioSlot.label}
                </button>
              )}

              <span className="text-[12.5px] font-semibold text-neutral-200 pl-0.5 shrink-0">
                Bed 1
              </span>

              <button
                type="button"
                onClick={() => {
                  clinicalAudio.playKeyClick();
                  setActivePopup('PATIENT_ADMIT');
                }}
                className="inline-flex items-center gap-1.5 font-semibold text-white hover:text-[#93c5fd] truncate ml-1 cursor-pointer"
              >
                <svg
                  viewBox="0 0 12 13"
                  className="h-3.5 w-3 fill-white shrink-0"
                  aria-hidden="true"
                >
                  <circle cx="6" cy="2.8" r="2.1" />
                  <path d="M2.2 12 L3.4 6 L8.6 6 L9.8 12 Z" />
                </svg>
                <span>John Doe · {vitals.category}</span>
              </button>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {(alarmsSilencedSec > 0 || alarmsPaused) && (
                <span className="px-1.5 py-0.5 bg-[#f5cf00] text-black text-[11px] font-bold leading-none">
                  {alarmsPaused ? 'ALARMS PAUSED' : `SILENCED ${alarmsSilencedSec}s`}
                </span>
              )}

              <span className="text-[13px] font-semibold text-white tabular-nums">
                {isMx400 ? clockShort : clockFull}
              </span>

              <button
                type="button"
                onClick={() => {
                  clinicalAudio.playKeyClick();
                  setActivePopup('PROFILES_SCREENS');
                }}
                className="flex items-center gap-1 font-semibold text-white hover:text-[#93c5fd] cursor-pointer"
                title="Change Screen Layout (3 / 4 / 6 / 8 Waves, Overlapping A, ST Maps)"
              >
                <PhilipsScreensIcon className="h-3 w-3.5 text-neutral-200" />
                <span>{screenHeaderTitle}</span>
              </button>

              <svg
                viewBox="0 0 24 12"
                className="h-3 w-6 shrink-0"
                aria-hidden="true"
              >
                <line x1="3" y1="2" x2="3" y2="10.5" stroke="#ffffff" strokeWidth="1.2" />
                <path d="M1 4.5 L3 2 L5 4.5" fill="none" stroke="#ffffff" strokeWidth="1.1" />
                <polygon points="8,10.5 22,2 22,10.5" fill="#ffffff" />
              </svg>
            </div>
          </div>

          {/* Main Screen Interior */}
          <div className="relative flex-1 flex min-h-0 bg-black overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
              {screenView === 'ST_MAP_FULL' ? (
                <StMapMultiView
                  vitals={vitals}
                  compactMode={false}
                  onUpdateStPointMs={(ms) => onUpdatePatientField('stPointMs', ms)}
                  onStoreStReference={onStoreStReference}
                  onSelectPrimaryLead={(lead: EcgLead) =>
                    onUpdatePatientField('ecgLead', lead)
                  }
                  onSwitchScreenView={onSwitchScreenView}
                />
              ) : screenView === 'TWELVE_LEAD' ? (
                <TwelveLeadDiagnosticView
                  vitals={vitals}
                  onSelectPrimaryLead={(lead: EcgLead) =>
                    onUpdatePatientField('ecgLead', lead)
                  }
                  onCloseToWaves={() => onSwitchScreenView('STANDARD_WAVES')}
                />
              ) : screenView === 'CO_HEMO' ? (
                <CoThermodilutionView
                  vitals={vitals}
                  onStartCoMeasurement={onStartCoMeasurement}
                  onCloseToWaves={() => onSwitchScreenView('STANDARD_WAVES')}
                />
              ) : screenView === 'TRENDS' ? (
                <VitalsTrendsView
                  trends={trends}
                  onCloseToWaves={() => onSwitchScreenView('STANDARD_WAVES')}
                />
              ) : screenView === 'BIG_NUMBERS' ? (
                <div className="grid flex-1 grid-cols-2 gap-3 p-3 bg-black font-monitor tabular-nums">
                  <button
                    type="button"
                    onClick={() => setActivePopup('ECG_SETUP')}
                    className={`flex items-start justify-between border border-[#22262e] p-3 text-left cursor-pointer ${getParamAlarmClass(
                      ['hr', 'RHYTHM'],
                      'text-[#39ff14]'
                    )}`}
                  >
                    <div>
                      <div className="text-base font-bold">HR ({vitals.ecgLead})</div>
                      <div className="text-sm opacity-80 mt-0.5">
                        {thresholds.hr.high} / {thresholds.hr.low}
                      </div>
                    </div>
                    <div className="text-7xl sm:text-8xl font-bold leading-none">
                      {isWired('MMS')
                        ? vitals.rhythm === 'ASYSTOLE'
                          ? '0'
                          : vitals.hr
                        : '-?-'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePopup('SPO2_SETUP')}
                    className={`flex items-start justify-between border border-[#22262e] p-3 text-left cursor-pointer ${getParamAlarmClass(
                      ['spo2'],
                      'text-[#38e8ff]'
                    )}`}
                  >
                    <div>
                      <div className="text-base font-bold">SpO2 %</div>
                      <div className="text-sm opacity-80 mt-0.5">
                        {thresholds.spo2.high} / {thresholds.spo2.low}
                      </div>
                    </div>
                    <div className="text-7xl sm:text-8xl font-bold leading-none">
                      {isWired('MMS') && vitals.spo2 > 0 ? vitals.spo2 : '-?-'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePopup('ABP_SETUP')}
                    className={`flex items-start justify-between border border-[#22262e] p-3 text-left cursor-pointer ${getParamAlarmClass(
                      ['abpMap', 'abpSys'],
                      'text-[#ff5945]'
                    )}`}
                  >
                    <div>
                      <div className="text-base font-bold">{vitals.abpLabel} mmHg</div>
                      <div className="text-sm opacity-80 mt-0.5">
                        {thresholds.abpSys.high} / {thresholds.abpSys.low}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-5xl sm:text-6xl font-bold leading-none">
                        {isWired('ABP') ? `${vitals.abpSys}/${vitals.abpDia}` : '-?/-?'}
                      </div>
                      <div className="text-3xl font-bold mt-1">
                        ({isWired('ABP') ? vitals.abpMap : '?'})
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePopup('CO2_SETUP')}
                    className={`flex items-start justify-between border border-[#22262e] p-3 text-left cursor-pointer ${getParamAlarmClass(
                      ['etco2', 'respRate'],
                      'text-[#e9d5ff]'
                    )}`}
                  >
                    <div>
                      <div className="text-base font-bold">etCO2 / awRR</div>
                      <div className="text-sm opacity-80 mt-0.5">
                        {thresholds.etco2.high} / {thresholds.etco2.low}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-6xl sm:text-7xl font-bold leading-none">
                        {isWired('CO2') ? vitals.etco2 : '-?-'}
                      </div>
                      <div className="text-2xl font-bold mt-1">
                        RR {isWired('CO2') ? vitals.awrr : '--'}
                      </div>
                    </div>
                  </button>
                </div>
              ) : (
                /* Standard / 6-Wave / 8-Wave / 4-Wave / 3-Wave / Overlapping A Views */
                <>
                  <div className="flex flex-1 min-h-0 w-full">
                    {/* Left Waveforms + Bottom NBP & Status Strip */}
                    <div className="flex flex-col flex-1 min-w-0 bg-black">
                      <div className="flex-1 min-h-0">
                        <WaveformCanvas
                          vitals={vitals}
                          monitorModel={monitorModel}
                          screenView={screenView}
                          waveSlots={waveSlots}
                          dynamicWavesMode={dynamicMode}
                          modules={modules}
                          paused={waveFrozen}
                          cursorActive={cursorActive}
                          sweepSpeedMmPerSec={sweepSpeed}
                          onSelectChannel={handleWaveChannelClick}
                          onSelectWaveSlot={handleSelectWaveSlotFromCanvas}
                          onHeartbeatBeep={handleHeartbeatBeep}
                        />
                      </div>

                      {/* Bottom-Left NBP + STindx + Status Strip */}
                      <div className="flex flex-col bg-black px-2 pt-0.5 pb-0.5 shrink-0">
                        <div className="flex items-end justify-between">
                          {findMod('NBP') ? (
                            <button
                              type="button"
                              onClick={() => {
                                clinicalAudio.playKeyClick();
                                setActivePopup('NBP_SETUP');
                              }}
                              className="flex items-end gap-4 text-left hover:bg-white/5 px-1 py-0.5 cursor-pointer"
                            >
                              <div className="leading-none">
                                <div className="text-[12px] font-semibold text-[#e879f9]">
                                  NBP &nbsp;Pulse {vitals.pulseRate} &nbsp;&nbsp;&nbsp;
                                  {vitals.nbpRepeatMin === 0
                                    ? 'Man'
                                    : `Auto ${vitals.nbpRepeatMin}m`}{' '}
                                  &nbsp;&nbsp;&nbsp;{vitals.nbpTimestamp}
                                </div>
                                <div className="flex items-baseline gap-2 mt-0.5">
                                  <div className="text-[11px] text-[#e879f9]/90 leading-[1.05]">
                                    <div>Sys.</div>
                                    <div>160</div>
                                    <div>90</div>
                                  </div>
                                  <span className="text-[36px] sm:text-[42px] font-semibold tracking-tight text-[#e879f9] tabular-nums leading-[0.88]">
                                    {!isWired('NBP')
                                      ? 'Hose Off'
                                      : vitals.nbpInflating
                                        ? `Cuff ${vitals.nbpCuffPressure}`
                                        : vitals.venipunctureActive
                                          ? `Veni 60 (${vitals.venipunctureSecRemaining}s)`
                                          : `${vitals.nbpSys}/${vitals.nbpDia} (${vitals.nbpMap})`}
                                  </span>
                                </div>
                              </div>

                              <div className="hidden md:block text-[12px] text-[#e879f9] leading-tight tabular-nums pb-0.5">
                                <div className="font-semibold">NBP mmHg</div>
                                <div>
                                  {vitals.nbpTimestamp} &nbsp;&nbsp;{vitals.nbpSys}/{vitals.nbpDia}({vitals.nbpMap})
                                </div>
                                <div>08:45 &nbsp;&nbsp;120/80(90)</div>
                              </div>
                            </button>
                          ) : (
                            <span className="text-xs text-neutral-500">
                              NBP MODULE UNPLUGGED
                            </span>
                          )}

                          <div className="flex items-end gap-3 pb-0.5">
                            {!isMx400 && isWired('MMS') && (
                              <button
                                type="button"
                                onClick={() => onSwitchScreenView('ST_MAP_SPLIT')}
                                className="flex flex-col items-start px-1.5 py-0.5 hover:bg-white/5 cursor-pointer"
                                title="Open ST Map Multi-View"
                              >
                                <span className="text-[11px] font-semibold text-[#39ff14]">
                                  STindx
                                </span>
                                <span className="text-[30px] font-semibold text-[#39ff14] leading-none tabular-nums">
                                  {vitals.stIndex.toFixed(1)}
                                </span>
                              </button>
                            )}
                          </div>
                        </div>

                        {!isMx400 && (
                          <div className="flex items-center justify-between text-[11.5px] text-neutral-200 px-0.5 pt-0.5 leading-none">
                            <span>No alarm recording available</span>
                            <div className="flex items-center gap-2 pr-1">
                              <ConnectedModulesSlotIcon
                                modules={modules}
                                onClick={() => {
                                  clinicalAudio.playKeyClick();
                                  setActivePopup('MODULE_MGMT');
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Optional Center Split Pane (ST Map or Pure Pharmacology Reference iPC — ZERO IV Pump Context!) */}
                    {screenView === 'ST_MAP_SPLIT' && (
                      <div className="w-[42%] max-w-[440px] h-full shrink-0">
                        <StMapMultiView
                          vitals={vitals}
                          compactMode
                          onUpdateStPointMs={(ms) => onUpdatePatientField('stPointMs', ms)}
                          onStoreStReference={onStoreStReference}
                          onSelectPrimaryLead={(lead: EcgLead) =>
                            onUpdatePatientField('ecgLead', lead)
                          }
                          onSwitchScreenView={onSwitchScreenView}
                        />
                      </div>
                    )}

                    {screenView === 'IPC_BIOSCI' && (
                      <div className="w-[48%] max-w-[520px] h-full shrink-0">
                        <ClinicalInformaticsPC
                          selectedDrugId={selectedBiosciDrugId}
                          onSelectDrugId={onSelectBiosciDrugId}
                          hidePumpContext
                          patientWeightKg={patientWeightKg}
                          onClose={() => onSwitchScreenView('STANDARD_WAVES')}
                        />
                      </div>
                    )}

                    {/* Right Parameter Numerics Column — Yellow Flashing on Alarms! */}
                    <div
                      className={`${
                        isMx400
                          ? 'w-[148px] sm:w-[168px]'
                          : screenView === 'ST_MAP_SPLIT' || screenView === 'IPC_BIOSCI'
                            ? 'w-[215px]'
                            : 'w-[255px] sm:w-[300px]'
                      } shrink-0 bg-black px-2 py-1 flex flex-col justify-between font-monitor tabular-nums overflow-y-auto`}
                    >
                      {isMx400 ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setActivePopup('ECG_SETUP')}
                            className={`flex items-start justify-between text-left px-1.5 py-0.5 cursor-pointer ${getParamAlarmClass(
                              ['hr', 'RHYTHM'],
                              'text-[#39ff14]'
                            )}`}
                          >
                            <div className="text-[11px] leading-tight">
                              <div className="font-bold">HR</div>
                              <div>{thresholds.hr.high}</div>
                              <div>{thresholds.hr.low}</div>
                            </div>
                            <span className="text-[48px] font-semibold leading-[0.86]">
                              {isWired('MMS')
                                ? vitals.rhythm === 'ASYSTOLE'
                                  ? '0'
                                  : vitals.hr
                                : '-?-'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActivePopup('SPO2_SETUP')}
                            className={`flex items-start justify-between text-left px-1.5 py-0.5 cursor-pointer ${getParamAlarmClass(
                              ['spo2'],
                              'text-[#38e8ff]'
                            )}`}
                          >
                            <div className="text-[11px] leading-tight">
                              <div className="font-bold">SpO2</div>
                              <div>{thresholds.spo2.high}</div>
                              <div>{thresholds.spo2.low}</div>
                            </div>
                            <span className="text-[48px] font-semibold leading-[0.86]">
                              {isWired('MMS') && vitals.spo2 > 0 ? vitals.spo2 : '-?-'}
                            </span>
                          </button>

                          {findMod('ABP') && (
                            <button
                              type="button"
                              onClick={() => setActivePopup('ABP_SETUP')}
                              className={`flex items-start justify-between text-left px-1.5 py-0.5 cursor-pointer ${getParamAlarmClass(
                                ['abpMap', 'abpSys'],
                                'text-[#ff5945]'
                              )}`}
                            >
                              <div className="text-[11px] leading-tight">
                                <div className="font-bold">{vitals.abpLabel}</div>
                                <div>{thresholds.abpSys.high}</div>
                                <div>{thresholds.abpSys.low}</div>
                              </div>
                              <div className="text-right leading-none">
                                <div className="text-[28px] font-semibold">
                                  {isWired('ABP') ? `${vitals.abpSys}/${vitals.abpDia}` : '-?/-?'}
                                </div>
                                <div className="text-[22px] font-semibold">
                                  ({isWired('ABP') ? vitals.abpMap : '?'})
                                </div>
                              </div>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setActivePopup('CO2_SETUP')}
                            className={`flex items-start justify-between text-left px-1.5 py-0.5 cursor-pointer ${getParamAlarmClass(
                              ['etco2'],
                              'text-[#e9d5ff]'
                            )}`}
                          >
                            <div className="text-[11px] leading-tight">
                              <div className="font-bold">etCO2</div>
                              <div>{thresholds.etco2.high}</div>
                              <div>{thresholds.etco2.low}</div>
                            </div>
                            <span className="text-[40px] font-semibold leading-[0.88]">
                              {isWired('CO2') ? vitals.etco2 : '-?-'}
                            </span>
                          </button>
                        </>
                      ) : (
                        /* MX700 / MX800 Right Numerics Column */
                        <>
                          {/* Row 1: HR + Pulse / PVC / Tskin */}
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => setActivePopup('ECG_SETUP')}
                              className={`flex items-start gap-1.5 text-left px-1.5 py-0.5 cursor-pointer ${getParamAlarmClass(
                                ['hr', 'RHYTHM'],
                                'text-[#46e838]'
                              )}`}
                            >
                              <div className="text-[11.5px] leading-[1.05]">
                                <div className="font-bold">HR</div>
                                <div>{thresholds.hr.high}</div>
                                <div>{thresholds.hr.low}</div>
                                {!isWired('MMS') && <PhilipsInopBadge />}
                              </div>
                              <span className="text-[54px] sm:text-[60px] font-semibold leading-[0.82] tracking-tight">
                                {isWired('MMS')
                                  ? vitals.rhythm === 'ASYSTOLE'
                                    ? '0'
                                    : vitals.hr
                                  : '-?-'}
                              </span>
                            </button>

                            <div className="flex flex-col items-end text-right leading-tight">
                              <button
                                type="button"
                                onClick={() => setActivePopup('SPO2_SETUP')}
                                className="flex items-start gap-1.5 px-1 py-0.5 text-[#45d8ff] cursor-pointer"
                              >
                                <div className="text-[11px] leading-none text-left">
                                  <div className="font-semibold">Pulse</div>
                                  {isWired('MMS') ? (
                                    <span className="inline-block mt-0.5 px-1 py-[1px] bg-white text-black text-[9px] font-bold">
                                      {vitals.pulseSource === 'ABP' ? vitals.abpLabel : 'Pleth'}
                                    </span>
                                  ) : (
                                    <div className="mt-0.5">
                                      <PhilipsInopBadge />
                                    </div>
                                  )}
                                </div>
                                <span className="text-[34px] font-semibold leading-[0.88]">
                                  {isWired('MMS') ? vitals.pulseRate : '-?-'}
                                </span>
                              </button>

                              <div className="flex items-baseline gap-1.5 text-[#46e838] mt-0.5 px-1">
                                <span className="text-[11px]">PVC</span>
                                <span className="text-[18px] font-semibold leading-none">
                                  {vitals.pvcCount}
                                </span>
                              </div>

                              {findMod('TEMP') && (
                                <button
                                  type="button"
                                  onClick={() => setActivePopup('TEMP_SETUP')}
                                  className={`flex items-baseline gap-1.5 px-1 py-0.5 cursor-pointer ${getParamAlarmClass(
                                    ['tempCoreC'],
                                    'text-[#a3e635]'
                                  )}`}
                                >
                                  <span className="text-[11px]">Tskin</span>
                                  <span className="text-[20px] font-semibold leading-none">
                                    {isWired('TEMP') ? formatTemp(vitals.tempSkinC) : '-?-'}
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Row 2: SpO2 + RR */}
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => setActivePopup('SPO2_SETUP')}
                              className={`flex items-start gap-1.5 text-left px-1.5 py-0.5 cursor-pointer ${getParamAlarmClass(
                                ['spo2'],
                                'text-[#45d8ff]'
                              )}`}
                            >
                              <div className="flex items-end gap-1">
                                <svg
                                  viewBox="0 0 11 24"
                                  className="h-6 w-2.5 shrink-0"
                                  aria-hidden="true"
                                >
                                  <defs>
                                    <clipPath id="spo2-wedge-clip">
                                      <polygon points="1,1 10,1 10,23" />
                                    </clipPath>
                                  </defs>
                                  {perfBarsFilled > 0 && (
                                    <rect
                                      x="0"
                                      y={23 - (perfBarsFilled / 5) * 22}
                                      width="11"
                                      height={(perfBarsFilled / 5) * 22}
                                      fill="currentColor"
                                      clipPath="url(#spo2-wedge-clip)"
                                    />
                                  )}
                                  <polygon
                                    points="1,1 10,1 10,23"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.25"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                                <div className="text-[11px] leading-[1.05]">
                                  <div className="font-bold">SpO2</div>
                                  <div>{thresholds.spo2.high}</div>
                                  <div>{thresholds.spo2.low}</div>
                                </div>
                              </div>
                              <span className="text-[52px] sm:text-[56px] font-semibold leading-[0.82] tracking-tight">
                                {isWired('MMS') && vitals.spo2 > 0 ? vitals.spo2 : '-?-'}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setActivePopup('CO2_SETUP')}
                              className={`flex items-start gap-1.5 text-left px-1.5 py-0.5 cursor-pointer ${getParamAlarmClass(
                                ['respRate'],
                                'text-[#efe0a6]'
                              )}`}
                            >
                              <div className="text-[11px] leading-[1.05]">
                                <div className="font-bold">RR</div>
                                <div>{thresholds.respRate.high}</div>
                                <div>{thresholds.respRate.low}</div>
                                {!isWired('MMS') && <PhilipsInopBadge />}
                              </div>
                              <span className="text-[46px] font-semibold leading-[0.84]">
                                {isWired('MMS') ? vitals.respRate : '-?-'}
                              </span>
                            </button>
                          </div>

                          {/* Row 3: ABP / ART */}
                          {findMod('ABP') && (
                            <button
                              type="button"
                              onClick={() => setActivePopup('ABP_SETUP')}
                              className={`flex items-start justify-between text-left px-1.5 py-0.5 cursor-pointer ${getParamAlarmClass(
                                ['abpMap', 'abpSys'],
                                'text-[#ff5c5c]'
                              )}`}
                            >
                              <div className="text-[11px] leading-[1.02]">
                                <div className="font-bold">{vitals.abpLabel}</div>
                                <div>Sys.</div>
                                <div>{thresholds.abpSys.high}</div>
                                <div>{thresholds.abpSys.low}</div>
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-[40px] sm:text-[44px] font-semibold leading-[0.86] tracking-tight">
                                  {!isWired('ABP') || !vitals.abpZeroed
                                    ? '-?/-?'
                                    : `${vitals.abpSys}/${vitals.abpDia}`}
                                </span>
                                <span className="text-[28px] font-semibold leading-none">
                                  ({!isWired('ABP') || !vitals.abpZeroed ? '?' : vitals.abpMap})
                                </span>
                              </div>
                            </button>
                          )}

                          {/* Row 4: PAP */}
                          {findMod('PAP_CVP') && (
                            <button
                              type="button"
                              onClick={() => setActivePopup('PAP_SETUP')}
                              className={`flex items-start justify-between text-left px-1.5 py-0.5 cursor-pointer ${getParamAlarmClass(
                                ['papMap'],
                                vitals.overlapWaves ? 'text-[#f3a8d8]' : 'text-[#f7e043]'
                              )}`}
                            >
                              <div className="text-[11px] leading-[1.02]">
                                <div className="font-bold">PAP</div>
                                <div>Dia.</div>
                                <div>16</div>
                                <div>0</div>
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-[38px] sm:text-[42px] font-semibold leading-[0.86] tracking-tight">
                                  {!isWired('PAP_CVP') || !vitals.papZeroed
                                    ? '-?/-?'
                                    : `${vitals.papSys}/${vitals.papDia}`}
                                </span>
                                <span className="text-[27px] font-semibold leading-none">
                                  ({!isWired('PAP_CVP') || !vitals.papZeroed ? '?' : vitals.papMap})
                                </span>
                              </div>
                            </button>
                          )}

                          {/* Row 5: CVP + etCO2 */}
                          <div className="flex items-start justify-between gap-2">
                            {findMod('PAP_CVP') && (
                              <button
                                type="button"
                                onClick={() => setActivePopup('CVP_SETUP')}
                                className={`flex items-start gap-1.5 text-left px-1.5 py-0.5 cursor-pointer ${getParamAlarmClass(
                                  ['cvp'],
                                  'text-[#38d6ff]'
                                )}`}
                              >
                                <div className="text-[11px] leading-[1.02]">
                                  <div className="font-bold">CVP</div>
                                  <div>Mean</div>
                                  <div>{thresholds.cvp.high}</div>
                                  <div>{thresholds.cvp.low}</div>
                                </div>
                                <span className="text-[36px] font-semibold leading-[0.88] mt-1">
                                  ({isWired('PAP_CVP') && vitals.cvpZeroed ? vitals.cvp : '?'})
                                </span>
                              </button>
                            )}

                            {findMod('CO2') && (
                              <button
                                type="button"
                                onClick={() => setActivePopup('CO2_SETUP')}
                                className={`flex items-start gap-1.5 text-left px-1.5 py-0.5 cursor-pointer ${getParamAlarmClass(
                                  ['etco2'],
                                  'text-white'
                                )}`}
                              >
                                <div className="text-[11px] leading-[1.02]">
                                  <div className="font-bold">etCO2</div>
                                  <div>{thresholds.etco2.high}</div>
                                  <div>{thresholds.etco2.low}</div>
                                </div>
                                <span className="text-[38px] font-semibold leading-[0.86] mt-0.5">
                                  {isWired('CO2') ? vitals.etco2 : '-?-'}
                                </span>
                              </button>
                            )}
                          </div>

                          {/* Row 6: ICP / C.O. */}
                          <div className="flex items-start justify-between gap-1">
                            {findMod('ICP') && (
                              <button
                                type="button"
                                onClick={() => setActivePopup('ICP_SETUP')}
                                className={`flex items-start gap-1 text-left px-1.5 py-0.5 cursor-pointer ${getParamAlarmClass(
                                  ['icp'],
                                  'text-[#e879f9]'
                                )}`}
                              >
                                <div className="text-[10.5px] leading-tight">
                                  <div className="font-bold">ICP</div>
                                  <div>CPP {isWired('ICP') ? vitals.cpp : '?'}</div>
                                </div>
                                <span className="text-[28px] font-semibold leading-none mt-0.5">
                                  ({isWired('ICP') && vitals.icpZeroed ? vitals.icp : '?'})
                                </span>
                              </button>
                            )}

                            {findMod('CO') && (
                              <button
                                type="button"
                                onClick={() => onSwitchScreenView('CO_HEMO')}
                                className="flex items-start gap-1 text-left text-[#fb923c] px-1.5 py-0.5 cursor-pointer"
                              >
                                <div className="text-[10.5px] leading-tight">
                                  <div className="font-bold">C.O.</div>
                                  <div>CI {vitals.ciLMinM2.toFixed(1)}</div>
                                </div>
                                <span className="text-[26px] font-semibold leading-none mt-0.5">
                                  {isWired('CO') ? vitals.coLMin.toFixed(1) : '-?-'}
                                </span>
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* MX800 Sepsis Management Bundle Horizon Strip */}
                  {showSepsisHorizon && (
                    <div className="mx-1.5 mb-1 border border-white/75 bg-black px-2.5 py-1 flex items-center justify-between gap-3 shrink-0 h-12">
                      <div className="hidden md:block text-[11px] leading-tight text-neutral-200 max-w-[235px]">
                        <div className="font-bold text-white text-[12px]">
                          Sepsis Management Bundle · Bed 1
                        </div>
                        <div>MAP ≥ 65 mmHg · CVP 8–12 mmHg · John Doe</div>
                      </div>

                      <div className="border-x border-white/30 px-3 py-0.5 text-2xl font-bold text-white tabular-nums">
                        {bundleClock}
                      </div>

                      <div className="flex-1 flex items-center gap-4 text-[11px]">
                        <div className="flex-1">
                          <div className="flex justify-between text-[#ff8a80]">
                            <span>{vitals.abpLabel}m</span>
                            <span>Target ≥ 65 (Now {vitals.abpMap})</span>
                          </div>
                          <div className="relative h-3 bg-[#14171d] border border-white/25 mt-0.5 overflow-hidden">
                            <div
                              className="absolute inset-y-0 bg-[#ef4444]/45 border-r-2 border-[#ff8a80]"
                              style={{
                                width: `${Math.max(5, Math.min(100, ((vitals.abpMap - 40) / 80) * 100))}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex-1">
                          <div className="flex justify-between text-[#38d6ff]">
                            <span>CVPm</span>
                            <span>Target 8–12 (Now {vitals.cvp})</span>
                          </div>
                          <div className="relative h-3 bg-[#14171d] border border-white/25 mt-0.5 overflow-hidden">
                            <div className="absolute inset-y-0 left-[35%] w-[30%] bg-[#0d9488]/50 border-x border-[#38d6ff]/60" />
                            <div
                              className="absolute top-0 bottom-0 w-2 bg-[#38d6ff]"
                              style={{
                                left: `${Math.max(4, Math.min(94, (vitals.cvp / 22) * 100))}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* MX400 RIGHT-SIDE VERTICAL SMARTKEYS COLUMN */}
            {isMx400 && (
              <div className="w-[58px] bg-[#14161a] border-l border-[#343944] p-1 flex flex-col justify-between items-stretch shrink-0">
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      clinicalAudio.playKeyClick(true);
                      onSilenceAlarms();
                    }}
                    className="h-12 bg-[#ffe63b] hover:bg-[#fff066] text-black border border-white flex flex-col items-center justify-center p-1 cursor-pointer"
                  >
                    <svg viewBox="0 0 24 16" className="h-4 w-5 stroke-black fill-none" strokeWidth="2">
                      <path d="M2 13 L7 4 L12 13 Z" />
                      <path d="M14 9 L17 13 L22 3" />
                    </svg>
                    <span className="text-[10px] font-bold leading-none mt-1">
                      Silence
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      clinicalAudio.playKeyClick();
                      onTogglePauseAlarms();
                    }}
                    className="h-12 bg-[#363532] hover:bg-[#464541] text-white border-2 border-[#ffe66d] flex flex-col items-center justify-center p-1 cursor-pointer"
                  >
                    <svg viewBox="0 0 20 16" className="h-3.5 w-4 stroke-white fill-none" strokeWidth="1.8">
                      <path d="M4 13 L10 3 L16 13 Z" />
                    </svg>
                    <span className="text-[9.5px] font-bold leading-tight text-center mt-0.5">
                      {alarmsPaused ? 'Resume' : 'Pause Al.'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      clinicalAudio.playKeyClick();
                      setActivePopup('SMARTKEYS_POPUP');
                    }}
                    className="h-12 bg-[#69686e] hover:bg-[#7b7a80] text-white border border-[#96959c] flex flex-col items-center justify-center p-1 cursor-pointer"
                  >
                    <div className="grid grid-cols-3 gap-[2px]">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <span key={i} className="h-1 w-1 bg-white" />
                      ))}
                    </div>
                    <span className="text-[9.5px] font-bold leading-tight text-center mt-1">
                      Smart Keys
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      clinicalAudio.playKeyClick(true);
                      onSetStandbyMode(true);
                    }}
                    className="h-11 bg-[#69686e] hover:bg-[#7b7a80] text-white border border-[#96959c] flex flex-col items-center justify-center p-1 cursor-pointer"
                  >
                    <PhilipsStandbySvg className="h-3.5 w-3.5" />
                    <span className="text-[9.5px] font-bold leading-tight mt-0.5">
                      Standby
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      clinicalAudio.playKeyClick(true);
                      setActivePopup(null);
                      onSwitchScreenView('STANDARD_WAVES');
                    }}
                    className="h-12 bg-[#1e88ff] hover:bg-[#3897ff] text-white border border-[#9fd0ff] flex flex-col items-center justify-center p-1 cursor-pointer"
                  >
                    <span className="inline-block h-3 w-4 rounded-[2px] border-2 border-white" />
                    <span className="text-[9.5px] font-bold leading-tight text-center mt-1">
                      Main Screen
                    </span>
                  </button>
                </div>

                <div className="flex flex-col items-center gap-1 pb-1">
                  <ConnectedModulesSlotIcon
                    modules={modules}
                    onClick={() => setActivePopup('MODULE_MGMT')}
                  />
                  <button
                    type="button"
                    onClick={() => setActivePopup('ALARM_VOLUME')}
                    className="px-1.5 py-0.5 bg-[#2a2e36] border border-neutral-500 text-[9px] text-white cursor-pointer"
                  >
                    {audioEnabled ? `Vol ${alarmVolume}` : 'Muted'}
                  </button>
                </div>
              </div>
            )}

            {/* Authentic Light-Silver Floating Philips Setup Menus */}
            <MonitorModals
              activePopup={activePopup}
              onOpenPopup={setActivePopup}
              onClose={() => setActivePopup(null)}
              vitals={vitals}
              modules={modules}
              onToggleModulePlugged={onToggleModulePlugged}
              onToggleModuleCableWired={onToggleModuleCableWired}
              onOpenFullModuleRack={onOpenModulesStation}
              thresholds={thresholds}
              onUpdateThresholds={onUpdateThresholds}
              onUpdatePatientField={onUpdatePatientField}
              patientWeightKg={patientWeightKg}
              onChangePatientWeightKg={onChangePatientWeightKg}
              tempUnit={tempUnit}
              onToggleTempUnit={onToggleTempUnit}
              sweepSpeed={sweepSpeed}
              onChangeSweepSpeed={setSweepSpeed}
              waveFrozen={waveFrozen}
              onToggleWaveFrozen={() => setWaveFrozen((f) => !f)}
              cursorActive={cursorActive}
              onToggleCursorActive={() => setCursorActive((c) => !c)}
              onEnterStandby={() => onSetStandbyMode(true)}
              screenView={screenView}
              onSwitchScreenView={onSwitchScreenView}
              selectedWaveSlotIndex={selectedWaveSlotIndex}
              onSelectWaveSlotIndex={setSelectedWaveSlotIndex}
              waveSlots={waveSlots}
              onChangeWaveSlot={handleChangeWaveSlot}
              onTriggerNbp={onTriggerNbp}
              onStopNbp={onStopNbp}
              onStartVenipuncture={onStartVenipuncture}
              onZeroPressure={onZeroPressure}
              onStoreStReference={onStoreStReference}
              audioEnabled={audioEnabled}
              alarmVolume={alarmVolume}
              alarmToneStandard={alarmToneStandard}
              qrsBeepEnabled={qrsBeepEnabled}
              onChangeAlarmAudio={onChangeAlarmAudio}
            />
          </div>

          {/* BOTTOM HORIZONTAL SMARTKEYS BAR FOR MX700 & MX800 */}
          {!isMx400 && (
            <div className="flex items-center gap-[2px] bg-[#0e1014] px-1 py-1 border-t border-[#3b4049] shrink-0 overflow-x-auto">
              {/* 1. Yellow Silence Key */}
              <button
                type="button"
                onClick={() => {
                  clinicalAudio.playKeyClick(true);
                  onSilenceAlarms();
                }}
                className="flex flex-col items-center justify-between h-[46px] min-w-[54px] px-1.5 py-1 bg-[#fff04d] hover:bg-[#fff57a] text-black border border-white cursor-pointer shrink-0"
                title="Silence Active Alarms"
              >
                <svg viewBox="0 0 24 16" className="h-4 w-5 stroke-black fill-none" strokeWidth="2">
                  <path d="M2 13 L7 4 L12 13 Z" />
                  <path d="M14 9 L17 13 L22 3" />
                </svg>
                <span className="text-[11px] font-bold leading-none">
                  Silence
                </span>
              </button>

              {/* 2. Yellow Al. Off Key */}
              <button
                type="button"
                onClick={() => {
                  clinicalAudio.playKeyClick();
                  onTogglePauseAlarms();
                }}
                className={`flex flex-col items-center justify-between h-[46px] min-w-[56px] px-1 py-1 border-2 border-[#fff099] cursor-pointer shrink-0 ${
                  alarmsPaused
                    ? 'bg-[#ffe63b] text-black'
                    : 'bg-[#59524c] hover:bg-[#6a625b] text-white'
                }`}
              >
                <svg
                  viewBox="0 0 22 15"
                  className={`h-3.5 w-5 fill-none ${alarmsPaused ? 'stroke-black' : 'stroke-white'}`}
                  strokeWidth="2"
                >
                  <path d="M3 13 L9 3 L15 13 Z" />
                  <path d="M16 4 C19 6, 19 10, 16 12" />
                </svg>
                <span className="text-[9.5px] font-bold leading-none text-center">
                  {alarmsPaused ? 'Resume' : 'Yellow Al. Off'}
                </span>
              </button>

              {/* 3. Left Page Arrow */}
              <button
                type="button"
                onClick={() => {
                  clinicalAudio.playKeyClick();
                  setSmartKeyPage((p) => (p === 0 ? 1 : 0));
                }}
                className="flex items-center justify-center h-[46px] w-8 bg-[#57565c] hover:bg-[#68676e] text-white border border-[#85848c] cursor-pointer shrink-0"
                title="Previous SmartKeys Page"
              >
                <svg viewBox="0 0 18 12" className="h-3 w-4 fill-white" aria-hidden="true">
                  <polygon points="8,1 1,6 8,11" />
                  <polygon points="16,1 9,6 16,11" />
                </svg>
              </button>

              {smartKeyPage === 0 ? (
                <>
                  {/* Start / Stop NBP */}
                  <button
                    type="button"
                    onClick={() => {
                      clinicalAudio.playKeyClick(true);
                      if (vitals.nbpInflating) onStopNbp();
                      else onTriggerNbp(false);
                    }}
                    className={philipsSmartKey}
                  >
                    <svg viewBox="0 0 24 18" className="h-4 w-5 fill-white">
                      <circle cx="9" cy="4" r="2.6" />
                      <path d="M4 16 L6 8 L12 8 L14 16 Z" />
                      <circle cx="18" cy="6" r="3" fill="none" stroke="white" strokeWidth="1.6" />
                      <circle cx="18" cy="13" r="3" fill="none" stroke="white" strokeWidth="1.6" />
                    </svg>
                    <span className="text-[10px] font-bold leading-none text-center">
                      Start/Stop
                    </span>
                  </button>

                  {/* Zero ->0<- */}
                  <button
                    type="button"
                    onClick={() => {
                      clinicalAudio.playKeyClick(true);
                      onZeroPressure('ALL');
                    }}
                    className={philipsSmartKey}
                  >
                    <svg viewBox="0 0 28 16" className="h-4 w-6 stroke-white fill-none" strokeWidth="2">
                      <path d="M2 8 L8 8 M6 5 L9 8 L6 11" />
                      <ellipse cx="14" cy="8" rx="2.8" ry="4.5" />
                      <path d="M26 8 L20 8 M22 5 L19 8 L22 11" />
                    </svg>
                    <span className="text-[10px] font-bold leading-none text-center">
                      Zero
                    </span>
                  </button>

                  {/* Change Screen (3W / 4W / 6W / 8W / ST Maps) */}
                  <button
                    type="button"
                    onClick={() => {
                      clinicalAudio.playKeyClick();
                      setActivePopup('PROFILES_SCREENS');
                    }}
                    className={philipsSmartKey}
                    title="Change Screen Layout (6 Waves, 8 Waves, 4 Waves, ST Maps)"
                  >
                    <PhilipsScreensIcon className="h-4 w-4 text-white" />
                    <span className="text-[9.5px] font-bold leading-none text-center">
                      Change Screen
                    </span>
                  </button>

                  {/* Overlap Waves — Neutral Unmarked SmartKey Style */}
                  <button
                    type="button"
                    onClick={() => {
                      clinicalAudio.playKeyClick();
                      const next = !vitals.overlapWaves;
                      onUpdatePatientField('overlapWaves', next);
                      onUpdatePatientField(
                        'profileName',
                        next ? 'Overlapping A' : 'SSC Sepsis'
                      );
                    }}
                    className={philipsSmartKey}
                    title="Toggle Wave Overlapping (ABP + PAP + CVP)"
                  >
                    <svg viewBox="0 0 26 16" className="h-4 w-6 fill-none" strokeWidth="1.8">
                      <path d="M1 12 Q6 2 11 12 T25 10" stroke="#ffffff" />
                      <path d="M1 13 Q7 5 13 12 T25 12" stroke="#d4d4d8" />
                    </svg>
                    <span className="text-[9.5px] font-bold leading-none text-center">
                      Overlap Waves
                    </span>
                  </button>

                  {/* Monitor Standby */}
                  <button
                    type="button"
                    onClick={() => {
                      clinicalAudio.playKeyClick(true);
                      onSetStandbyMode(true);
                    }}
                    className={philipsSmartKey}
                    title="Enter Philips IntelliVue Standby Mode"
                  >
                    <svg viewBox="0 0 20 18" className="h-4 w-4 stroke-white fill-none" strokeWidth="1.9">
                      <path d="M10 2 L10 9" />
                      <path d="M5.5 4.8 A 6.5 6.5 0 1 0 14.5 4.8" />
                    </svg>
                    <span className="text-[9.5px] font-bold leading-none text-center">
                      Monitor Standby
                    </span>
                  </button>

                  {/* Alarm Limits */}
                  <button
                    type="button"
                    onClick={() => {
                      clinicalAudio.playKeyClick();
                      setActivePopup('ALARM_LIMITS');
                    }}
                    className={philipsSmartKey}
                  >
                    <svg viewBox="0 0 24 16" className="h-4 w-5 stroke-white fill-none" strokeWidth="1.8">
                      <path d="M2 13 L8 3 L14 13 Z" />
                      <polyline points="16,13 16,3 21,3 21,9" />
                    </svg>
                    <span className="text-[9.5px] font-bold leading-none text-center">
                      Alarm Limits
                    </span>
                  </button>

                  {/* Alarm Volume */}
                  <button
                    type="button"
                    onClick={() => {
                      clinicalAudio.playKeyClick();
                      setActivePopup('ALARM_VOLUME');
                    }}
                    className={philipsSmartKey}
                  >
                    <svg viewBox="0 0 26 16" className="h-4 w-6 fill-white">
                      <path d="M2 6 L5 2 L8 6 Z" />
                      <polygon points="4,14 23,14 23,5" />
                    </svg>
                    <span className="text-[9.5px] font-bold leading-none text-center">
                      Alarm Volume
                    </span>
                  </button>

                  {/* Vitals Trend */}
                  <button
                    type="button"
                    onClick={() => {
                      clinicalAudio.playKeyClick();
                      onSwitchScreenView(
                        screenView === 'TRENDS' ? 'STANDARD_WAVES' : 'TRENDS'
                      );
                    }}
                    className={philipsSmartKey}
                  >
                    <svg viewBox="0 0 22 16" className="h-3.5 w-5 stroke-white" strokeWidth="1.8">
                      <line x1="2" y1="3" x2="20" y2="3" />
                      <line x1="2" y1="7" x2="20" y2="7" />
                      <line x1="2" y1="11" x2="20" y2="11" />
                      <line x1="2" y1="15" x2="20" y2="15" />
                    </svg>
                    <span className="text-[9.5px] font-bold leading-none text-center">
                      Vitals Trend
                    </span>
                  </button>
                </>
              ) : (
                <>
                  {/* Select Waves */}
                  <button
                    type="button"
                    onClick={() => {
                      clinicalAudio.playKeyClick();
                      setActivePopup('WAVE_SELECT');
                    }}
                    className={philipsSmartKey}
                  >
                    <svg viewBox="0 0 24 16" className="h-4 w-5 stroke-white fill-none" strokeWidth="1.7">
                      <polyline points="1,10 5,10 8,3 11,14 14,8 23,8" />
                    </svg>
                    <span className="text-[9.5px] font-bold leading-none text-center">
                      Select Waves
                    </span>
                  </button>

                  {/* Veni Puncture */}
                  <button
                    type="button"
                    onClick={() => {
                      clinicalAudio.playKeyClick();
                      setActivePopup('VENIPUNCTURE');
                    }}
                    className={philipsSmartKey}
                  >
                    <svg viewBox="0 0 24 18" className="h-4 w-5 stroke-white fill-none" strokeWidth="1.7">
                      <circle cx="8" cy="4" r="2.2" fill="white" />
                      <path d="M4 16 L6 8 L11 8 L13 14" />
                      <rect x="16" y="3" width="3.5" height="9" />
                      <line x1="17.7" y1="12" x2="17.7" y2="16" />
                    </svg>
                    <span className="text-[9.5px] font-bold leading-none text-center">
                      Veni Puncture
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePopup('MODULE_MGMT')}
                    className={philipsSmartKey}
                  >
                    <div className="flex gap-[1.5px] border border-white px-1 py-0.5">
                      <span className="h-2 w-0.5 bg-white" />
                      <span className="h-2 w-0.5 bg-white" />
                      <span className="h-2 w-0.5 bg-white" />
                      <span className="h-2 w-0.5 bg-white" />
                    </div>
                    <span className="text-[9.5px] font-bold leading-none text-center">
                      EMS Modules
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onSwitchScreenView(
                        screenView === 'ST_MAP_SPLIT'
                          ? 'ST_MAP_FULL'
                          : screenView === 'ST_MAP_FULL'
                            ? 'STANDARD_WAVES'
                            : 'ST_MAP_SPLIT'
                      )
                    }
                    className={philipsSmartKey}
                  >
                    <svg viewBox="0 0 20 16" className="h-4 w-5 stroke-white fill-none" strokeWidth="1.7">
                      <polygon points="10,1 18,5 18,11 10,15 2,11 2,5" />
                    </svg>
                    <span className="text-[9.5px] font-bold leading-none text-center">
                      ST Map
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onSwitchScreenView(
                        screenView === 'TWELVE_LEAD'
                          ? 'STANDARD_WAVES'
                          : 'TWELVE_LEAD'
                      )
                    }
                    className={philipsSmartKey}
                  >
                    <svg viewBox="0 0 22 16" className="h-4 w-5 stroke-white fill-none" strokeWidth="1.5">
                      <rect x="2" y="2" width="18" height="12" />
                      <line x1="8" y1="2" x2="8" y2="14" />
                      <line x1="14" y1="2" x2="14" y2="14" />
                      <line x1="2" y1="8" x2="20" y2="8" />
                    </svg>
                    <span className="text-[9.5px] font-bold leading-none text-center">
                      Capture 12-L
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onSwitchScreenView(
                        screenView === 'CO_HEMO' ? 'STANDARD_WAVES' : 'CO_HEMO'
                      )
                    }
                    className={philipsSmartKey}
                  >
                    <span className="text-[11px] font-bold text-[#fb923c]">
                      C.O.
                    </span>
                    <span className="text-[9.5px] font-bold leading-none text-center">
                      Hemodyn
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onSwitchScreenView(
                        screenView === 'BIG_NUMBERS'
                          ? 'STANDARD_WAVES'
                          : 'BIG_NUMBERS'
                      )
                    }
                    className={philipsSmartKey}
                  >
                    <span className="text-xs font-bold">88</span>
                    <span className="text-[9.5px] font-bold leading-none text-center">
                      Big Num
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onSwitchScreenView(
                        screenView === 'IPC_BIOSCI'
                          ? 'STANDARD_WAVES'
                          : 'IPC_BIOSCI'
                      )
                    }
                    className={philipsSmartKey}
                  >
                    <span className="text-[11px] font-bold text-[#93c5fd]">
                      iPC
                    </span>
                    <span className="text-[9.5px] font-bold leading-none text-center">
                      Bioscience
                    </span>
                  </button>
                </>
              )}

              {/* Right Page Arrow */}
              <button
                type="button"
                onClick={() => {
                  clinicalAudio.playKeyClick();
                  setSmartKeyPage((p) => (p === 0 ? 1 : 0));
                }}
                className="flex items-center justify-center h-[46px] w-8 bg-[#57565c] hover:bg-[#68676e] text-white border border-[#85848c] cursor-pointer shrink-0"
                title="Next SmartKeys Page"
              >
                <svg viewBox="0 0 18 12" className="h-3 w-4 fill-white" aria-hidden="true">
                  <polygon points="2,1 9,6 2,11" />
                  <polygon points="10,1 17,6 10,11" />
                </svg>
              </button>

              {/* Main Setup */}
              <button
                type="button"
                onClick={() => {
                  clinicalAudio.playKeyClick();
                  setActivePopup(
                    activePopup === 'MAIN_SETUP' ? null : 'MAIN_SETUP'
                  );
                }}
                className="flex flex-col items-center justify-between h-[46px] min-w-[54px] px-1.5 py-1 bg-[#52555e] hover:bg-[#616570] text-white border-2 border-[#3399ff] cursor-pointer shrink-0"
              >
                <svg viewBox="0 0 22 15" className="h-3.5 w-5 stroke-white fill-none" strokeWidth="1.7">
                  <rect x="2" y="2" width="18" height="11" rx="3" />
                  <rect x="6" y="5" width="10" height="5" fill="white" />
                </svg>
                <span className="text-[9.5px] font-bold leading-none text-center">
                  Main Setup
                </span>
              </button>

              {/* Main Screen */}
              <button
                type="button"
                onClick={() => {
                  clinicalAudio.playKeyClick(true);
                  setActivePopup(null);
                  onSwitchScreenView(
                    monitorModel === 'MX700' ? 'DYNAMIC_WAVES' : 'STANDARD_WAVES'
                  );
                }}
                className="flex flex-col items-center justify-between h-[46px] min-w-[56px] px-1.5 py-1 bg-[#1e88ff] hover:bg-[#3897ff] text-white border-2 border-[#7cc0ff] cursor-pointer shrink-0"
              >
                <svg viewBox="0 0 22 15" className="h-3.5 w-5 stroke-white fill-none" strokeWidth="2">
                  <rect x="2" y="2" width="18" height="11" rx="4" />
                </svg>
                <span className="text-[9.5px] font-bold leading-none text-center">
                  Main Screen
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Bezel Row: PHILIPS Wordmark + Hardware Keys / SmartPoint Knob */}
        <div className="relative flex items-center justify-between pt-3 px-2">
          <div className="w-32 hidden sm:block text-[10px] font-mono text-neutral-500">
            Bed 1 · John Doe
          </div>

          <div className="mx-auto text-sm sm:text-base font-extrabold tracking-[0.22em] text-[#c2c8d2]">
            PHILIPS
          </div>

          {!isMx400 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSilenceAlarms}
                className="h-5 w-5 rounded-xs bg-[#eab308] text-black flex items-center justify-center cursor-pointer"
                title="Hardware Silence Key"
              >
                <svg viewBox="0 0 14 12" className="h-3 w-3 stroke-black fill-none" strokeWidth="2">
                  <polyline points="2,6 5.5,10 12,2" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivePopup(null);
                  onSetStandbyMode(false);
                  onSwitchScreenView(
                    monitorModel === 'MX700' ? 'DYNAMIC_WAVES' : 'STANDARD_WAVES'
                  );
                }}
                className="h-5 w-5 rounded-xs bg-[#1e88ff] text-white flex items-center justify-center cursor-pointer"
                title="Hardware Main Screen Key"
              >
                <svg viewBox="0 0 14 10" className="h-2.5 w-3.5 stroke-white fill-none" strokeWidth="1.6">
                  <rect x="1.5" y="1.5" width="11" height="7" rx="1.2" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => {
                  clinicalAudio.playKeyClick();
                  setKnobAngle((a) => a + 24);
                  setSmartKeyPage((p) => (p === 0 ? 1 : 0));
                }}
                style={{ transform: `rotate(${knobAngle}deg)` }}
                className="h-8 w-8 rounded-full bg-gradient-to-b from-[#3b3f47] to-[#1b1d22] border-2 border-[#4d535e] flex items-center justify-center cursor-pointer transition-transform"
                title="SmartPoint Rotary Knob"
              >
                <span className="h-2 w-0.5 bg-neutral-300 -mt-2" />
              </button>
            </div>
          ) : (
            <div className="w-32" />
          )}
        </div>
      </div>

      {/* Lower White-Cream Mounting Base */}
      <div
        className={`${
          isMx400 ? 'w-[96%] h-14' : 'w-[74%] max-w-2xl h-9'
        } rounded-b-xl bg-gradient-to-b from-[#eae8e1] to-[#d5d2c8] border-x border-b border-[#b2afa4] shadow-md px-6 flex items-center justify-between text-neutral-700`}
      >
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              clinicalAudio.playKeyClick(true);
              onSetStandbyMode(!standbyMode);
            }}
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-neutral-400 bg-white/75 hover:bg-white text-neutral-800 cursor-pointer"
            title="Toggle Philips Standby Mode"
          >
            <PhilipsStandbySvg className="h-3.5 w-3.5" />
          </button>
          <span
            className={`h-2 w-2 rounded-full ${
              standbyMode
                ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                : 'bg-[#22c55e] shadow-[0_0_8px_#22c55e]'
            }`}
          />
        </div>

        <div className="h-6 w-20 rounded border border-[#b0ada2] bg-[#dfdcd3] shadow-inner flex items-center justify-center">
          <span className="h-1 w-8 rounded-full bg-[#b5b2a6]" />
        </div>

        {isMx400 ? (
          <span className="px-2.5 py-1 rounded border border-neutral-400 bg-[#e2e0d8] font-sans text-xs font-bold tracking-wider text-neutral-600">
            MX400
          </span>
        ) : (
          <div className="hidden sm:flex items-center gap-2 text-[9px] font-mono text-neutral-600">
            <span className="px-1 py-0.5 border border-neutral-500 font-bold">
              EMS LINK OK · BED 1
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
