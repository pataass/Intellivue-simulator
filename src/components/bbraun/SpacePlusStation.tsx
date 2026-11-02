import React, { useRef, useState } from 'react';
import {
  DataLockLevel,
  DrugBannerTheme,
  OcclusionLevel,
  PumpChannelState,
  SpacePlusScreenView,
  SyringeSizeMl,
} from '../../types/clinical';
import {
  calculateDoseFromRate,
  calculateRateFromDose,
  getDrugById,
  ICU_DRUG_LIBRARY,
  OCCLUSION_PRESSURE_MMHG,
} from '../../data/drugLibrary';
import { clinicalAudio } from '../../services/audioSynth';
import { ClinicalInformaticsPC } from '../mx800/ClinicalInformaticsPC';

interface SpacePlusStationProps {
  pumps: PumpChannelState[];
  patientWeightKg: number;
  acMainsConnected: boolean;
  batteryPct: number;
  onToggleAcMains: () => void;
  onUpdatePump: (
    pumpId: string,
    updater: (prev: PumpChannelState) => PumpChannelState
  ) => void;
  onBulkSetIvTubing?: (connected: boolean) => void;
  onTriggerDownstreamOcclusion: (pumpId: string) => void;
  onClearDownstreamOcclusion: (pumpId: string) => void;
  onReturnToLauncher?: () => void;
}

const BBRAUN_LOGO_SRC = '/assets/aistudio/image_36009f80.png';

const BbraunLeftTriangleSvg: React.FC<{ className?: string }> = ({
  className = 'h-2.5 w-2',
}) => (
  <svg viewBox="0 0 8 10" className={`${className} fill-current shrink-0`} aria-hidden="true">
    <polygon points="7.2,1 1,5 7.2,9" />
  </svg>
);

const BbraunHomeSvg: React.FC<{ className?: string }> = ({
  className = 'h-4 w-4',
}) => (
  <svg
    viewBox="0 0 16 16"
    className={`${className} stroke-current fill-none shrink-0`}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2.2 7.5 L8 2.5 L13.8 7.5" />
    <path d="M4.2 6.5 V13.5 H11.8 V6.5" />
  </svg>
);

const BbraunPowerSvg: React.FC<{ className?: string }> = ({
  className = 'h-3.5 w-3.5',
}) => (
  <svg
    viewBox="0 0 16 16"
    className={`${className} stroke-current fill-none shrink-0`}
    strokeWidth="1.65"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <line x1="8" y1="2" x2="8" y2="8" />
    <path d="M4.5 4.3 A 5.2 5.2 0 1 0 11.5 4.3" />
  </svg>
);

const BbraunEjectSvg: React.FC<{ className?: string }> = ({
  className = 'h-3.5 w-3.5',
}) => (
  <svg viewBox="0 0 14 14" className={`${className} fill-current shrink-0`} aria-hidden="true">
    <polygon points="7,2.2 12,8.5 2,8.5" />
    <rect x="2" y="10.2" width="10" height="1.8" rx="0.4" />
  </svg>
);

const BbraunWarnTriangleSvg: React.FC<{ className?: string }> = ({
  className = 'h-3 w-3',
}) => (
  <svg viewBox="0 0 14 13" className={`${className} fill-current shrink-0`} aria-hidden="true">
    <path d="M7 1 L13.5 12 H0.5 Z" />
    <rect x="6.3" y="4.5" width="1.4" height="3.8" fill="#111318" />
    <rect x="6.3" y="9.4" width="1.4" height="1.4" fill="#111318" />
  </svg>
);

const BbraunSignalBarsSvg: React.FC<{ className?: string }> = ({
  className = 'h-3 w-4',
}) => (
  <svg viewBox="0 0 16 12" className={`${className} fill-current shrink-0`} aria-hidden="true">
    <rect x="1" y="8" width="2.4" height="3" />
    <rect x="5" y="5.8" width="2.4" height="5.2" />
    <rect x="9" y="3.5" width="2.4" height="7.5" />
    <rect x="13" y="1.2" width="2.4" height="9.8" />
  </svg>
);

function getBannerStyle(theme: DrugBannerTheme): {
  bgStyle?: React.CSSProperties;
  className: string;
} {
  switch (theme) {
    case 'SPLIT_RED_BLUE':
      return {
        bgStyle: {
          background:
            'linear-gradient(12deg, #d63031 0%, #d63031 49.5%, #2b83da 50.5%, #2b83da 100%)',
        },
        className: 'text-white',
      };
    case 'OPIOID_BLUE':
      return { className: 'bg-[#8be0ff] text-neutral-950' };
    case 'VASOPRESSOR_VIOLET':
      return { className: 'bg-[#e3c6f9] text-neutral-950' };
    case 'SEDATIVE_YELLOW':
      return { className: 'bg-[#fde047] text-neutral-950' };
    case 'HEPARIN_WHITE':
      return { className: 'bg-[#f8fafc] text-neutral-950' };
    case 'INOTROPE_PINK':
      return { className: 'bg-[#fbcfe8] text-neutral-950' };
    case 'STANDARD_DARK':
    default:
      return { className: 'bg-[#1c1e22] text-white border-b border-white/10' };
  }
}

function getFluidLineColor(theme: DrugBannerTheme): string {
  switch (theme) {
    case 'SPLIT_RED_BLUE':
      return '#f87171';
    case 'OPIOID_BLUE':
      return '#38bdf8';
    case 'VASOPRESSOR_VIOLET':
      return '#c084fc';
    case 'SEDATIVE_YELLOW':
      return '#facc15';
    case 'INOTROPE_PINK':
      return '#f472b6';
    default:
      return '#34d399';
  }
}

function formatRemainingTime(volumeMl: number, rateMlH: number): string {
  if (rateMlH <= 0.01 || volumeMl <= 0) return '-- h -- min';
  const totalSec = Math.max(0, Math.round((volumeMl / rateMlH) * 3600));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h} h ${String(m).padStart(2, '0')} min ${String(s).padStart(2, '0')} s`;
  }
  return `${m} min ${String(s).padStart(2, '0')} s`;
}

const CVC_MANIFOLD_PORTS: Record<1 | 2 | 3 | 4, { lumen: string; hubColor: string }> = {
  1: { lumen: 'Proximal 16G (Carrier)', hubColor: '#f8fafc' },
  2: { lumen: 'Medial-1 18G (Antiarrhythmic)', hubColor: '#3b82f6' },
  3: { lumen: 'Medial-2 18G (Analgesia/Sed)', hubColor: '#eab308' },
  4: { lumen: 'Distal 16G (Vasopressor)', hubColor: '#b45309' },
};

export const SpacePlusStation: React.FC<SpacePlusStationProps> = ({
  pumps,
  patientWeightKg,
  acMainsConnected,
  batteryPct,
  onToggleAcMains,
  onUpdatePump,
  onBulkSetIvTubing,
  onTriggerDownstreamOcclusion,
  onClearDownstreamOcclusion,
  onReturnToLauncher,
}) => {
  const [towerViewMode, setTowerViewMode] = useState<'TOWER_4BAY' | 'CLOSEUP_GUI'>('TOWER_4BAY');
  const [editingPumpId, setEditingPumpId] = useState<string | null>(null);
  const [editTab, setEditTab] = useState<
    'RATE_DOSE' | 'IV_DISPOSABLES' | 'DRUG_LIBRARY' | 'OCCLUSION_LOCK' | 'MONOGRAPH'
  >('RATE_DOSE');
  const [pinEntry, setPinEntry] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [softLimitAck, setSoftLimitAck] = useState<boolean>(false);
  const [stationToast, setStationToast] = useState<string | null>(null);
  const powerHoldTimerRef = useRef<number | null>(null);

  const notify = (msg: string) => {
    clinicalAudio.playKeyClick(true);
    setStationToast(msg);
  };

  const anyCritical = pumps.some((p) => p.poweredOn && p.alarmState === 'CRITICAL');
  const anyPreAlarm =
    !anyCritical && pumps.some((p) => p.poweredOn && p.alarmState === 'PRE_ALARM');

  const connectedLinesCount = pumps.filter((p) => p.ivTubeConnected).length;
  const loadedContainersCount = pumps.filter((p) => p.containerLoaded).length;

  const startPowerHold = (pump: PumpChannelState) => {
    if (powerHoldTimerRef.current) window.clearInterval(powerHoldTimerRef.current);
    let progress = 0;
    powerHoldTimerRef.current = window.setInterval(() => {
      progress += 10;
      if (progress >= 100) {
        if (powerHoldTimerRef.current) window.clearInterval(powerHoldTimerRef.current);
        powerHoldTimerRef.current = null;
        clinicalAudio.playKeyClick(true);
        onUpdatePump(pump.id, (prev) => ({
          ...prev,
          poweredOn: !prev.poweredOn,
          powerHoldProgress: 0,
          running: false,
        }));
      } else {
        onUpdatePump(pump.id, (prev) => ({ ...prev, powerHoldProgress: progress }));
      }
    }, 120);
  };

  const cancelPowerHold = (pumpId: string) => {
    if (powerHoldTimerRef.current) {
      window.clearInterval(powerHoldTimerRef.current);
      powerHoldTimerRef.current = null;
    }
    onUpdatePump(pumpId, (prev) =>
      prev.powerHoldProgress > 0 ? { ...prev, powerHoldProgress: 0 } : prev
    );
  };

  const editingPump = pumps.find((p) => p.id === editingPumpId) ?? null;
  const editingDrug = editingPump ? getDrugById(editingPump.drugId) : null;

  const openEditor = (
    pumpId: string,
    tab: 'RATE_DOSE' | 'IV_DISPOSABLES' | 'DRUG_LIBRARY' | 'OCCLUSION_LOCK' | 'MONOGRAPH'
  ) => {
    clinicalAudio.playKeyClick();
    setEditingPumpId(pumpId);
    setEditTab(tab);
    setSoftLimitAck(false);
    setPinError(null);
  };

  const applyNewRate = (pump: PumpChannelState, nextRateMlH: number) => {
    if (pump.dataLockLevel >= 1) {
      setEditTab('OCCLUSION_LOCK');
      setPinError('Keypad locked — Enter PIN 9119 to unlock');
      return;
    }
    const drug = getDrugById(pump.drugId);
    const clamped = Math.max(0.1, Math.min(drug.hardMaxRateMlH, Number(nextRateMlH.toFixed(2))));
    onUpdatePump(pump.id, (prev) => ({
      ...prev,
      rateMlH: clamped,
      inKvoMode: false,
    }));
  };

  const toggleIvTube = (pump: PumpChannelState) => {
    const nextConnected = !pump.ivTubeConnected;
    onUpdatePump(pump.id, (prev) => ({
      ...prev,
      ivTubeConnected: nextConnected,
      ivTubePrimed: nextConnected ? true : prev.ivTubePrimed,
      alarmState: nextConnected ? 'NONE' : prev.running ? 'CRITICAL' : 'PRE_ALARM',
      alarmMessage: nextConnected ? null : 'IV line disconnected from patient CVC',
    }));
    notify(
      nextConnected
        ? `Slot ${pump.bayIndex}: IV line Luer-locked & primed to ${CVC_MANIFOLD_PORTS[pump.bayIndex].lumen}`
        : `Slot ${pump.bayIndex}: IV line disconnected from patient CVC manifold`
    );
  };

  const toggleContainerLoaded = (pump: PumpChannelState) => {
    const nextLoaded = !pump.containerLoaded;
    onUpdatePump(pump.id, (prev) => ({
      ...prev,
      containerLoaded: nextLoaded,
      disposableLocked: nextLoaded,
      running: nextLoaded ? prev.running : false,
      volumeRemainingMl:
        nextLoaded && prev.volumeRemainingMl <= 0 ? prev.containerTotalMl : prev.volumeRemainingMl,
      vtbiMl: nextLoaded && prev.vtbiMl <= 0 ? prev.containerTotalMl : prev.vtbiMl,
      alarmState: nextLoaded ? 'NONE' : 'PRE_ALARM',
      alarmMessage: nextLoaded
        ? null
        : prev.pumpType === 'SYRINGE'
          ? 'Insert OPS syringe'
          : 'Hang IV bag on stand',
    }));
    notify(
      nextLoaded
        ? `Slot ${pump.bayIndex}: ${
            pump.pumpType === 'SYRINGE'
              ? `${pump.syringeSizeMl} mL OPS Syringe Loaded`
              : `${pump.containerTotalMl} mL IV Bag Hung on Stand`
          }`
        : `Slot ${pump.bayIndex}: ${
            pump.pumpType === 'SYRINGE' ? 'OPS Syringe Removed' : 'IV Bag Unhung from Stand'
          }`
    );
  };

  const renderSinglePumpUnit = (pump: PumpChannelState) => {
    const drug = getDrugById(pump.drugId);
    const banner = getBannerStyle(drug.bannerTheme);
    const doseVal = calculateDoseFromRate(drug, pump.rateMlH, patientWeightKg);
    const maxAllowedMmHg = OCCLUSION_PRESSURE_MMHG[pump.occlusionLevel];
    const pressureFrac = Math.min(1, pump.linePressureMmHg / Math.max(100, maxAllowedMmHg));
    const isDosePrimary = drug.doseUnit !== 'mL/h';
    const isActivelyInfusing =
      pump.poweredOn &&
      pump.running &&
      pump.containerLoaded &&
      pump.ivTubeConnected &&
      !pump.occluded;

    const formattedDose =
      doseVal >= 50
        ? Math.round(doseVal).toString()
        : doseVal >= 10
          ? doseVal.toFixed(1).replace(/\.0$/, '')
          : doseVal.toFixed(2).replace(/0$/, '').replace(/\.$/, '');

    const formattedRate =
      pump.rateMlH >= 20
        ? pump.rateMlH.toFixed(1).replace(/\.0$/, '')
        : pump.rateMlH.toFixed(2).replace(/0$/, '').replace(/\.$/, '');

    const syringePct = pump.containerLoaded
      ? Math.max(0, Math.min(100, (pump.volumeRemainingMl / Math.max(10, pump.syringeSizeMl)) * 100))
      : 0;

    return (
      <div key={pump.id} className="relative flex items-center w-full">
        {/* Left White Spaceplus Station Locking Latch (shown in 4-Bay Tower mode) */}
        {towerViewMode === 'TOWER_4BAY' && (
          <div className="hidden md:flex flex-col items-center justify-between w-15 h-[160px] bg-gradient-to-b from-[#f8fafc] via-[#eef2f6] to-[#dde3ea] rounded-l-xl border border-r-0 border-[#cbd5e1] py-2 px-1 shadow-sm shrink-0">
            <div className="h-3.5 w-10 rounded-full bg-gradient-to-b from-[#cbd5e1] to-[#94a3b8] border border-slate-500/40" />
            <button
              type="button"
              onClick={() =>
                onUpdatePump(pump.id, (prev) => ({
                  ...prev,
                  bayLatchLocked: !prev.bayLatchLocked,
                }))
              }
              className={`px-1.5 py-1 rounded text-[8.5px] font-bold border cursor-pointer ${
                pump.bayLatchLocked
                  ? 'bg-white text-emerald-700 border-slate-300'
                  : 'bg-amber-100 text-amber-900 border-amber-400'
              }`}
              title="Toggle mechanical Spaceplus rack lock latch"
            >
              {pump.bayLatchLocked ? 'Press' : 'Open'}
            </button>
            <span className="text-[8px] font-mono text-slate-500">Slot {pump.bayIndex}</span>
          </div>
        )}

        {/* Main White Molded B. Braun Space®plus Pump Housing + Glossy Black Angled Bezel */}
        <div
          className={`flex-1 min-w-0 bg-gradient-to-b from-[#f9fafb] via-[#eff2f6] to-[#dfe4ec] p-1.5 sm:p-2 ${
            towerViewMode === 'TOWER_4BAY'
              ? 'rounded-r-2xl md:rounded-l-none rounded-l-2xl'
              : 'rounded-2xl'
          } border border-[#c8d0dc] shadow-[0_10px_24px_rgba(15,23,42,0.18)]`}
        >
          {/* Glossy Black Faceplate */}
          <div className="relative flex items-stretch rounded-xl bg-[#0b0c0f] border border-[#252830] px-2.5 py-2 shadow-inner">
            {/* LEFT HARDWARE LEDS + 3 CIRCULAR PHYSICAL KEYS (Home, Power, Stop/Start) */}
            <div className="flex items-center gap-2 pr-2.5 shrink-0">
              {/* 4 Miniature Vertical Hardware LEDs */}
              <div className="flex flex-col items-center justify-between h-[116px] py-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    pump.dataLockLevel > 0 ? 'bg-amber-300' : 'bg-neutral-600'
                  }`}
                  title={pump.dataLockLevel > 0 ? 'DataLock Active' : 'Status LED'}
                />
                <span
                  className={`inline-flex items-center justify-center ${
                    isActivelyInfusing
                      ? 'text-[#22c55e] drop-shadow-[0_0_5px_#22c55e]'
                      : 'text-neutral-700'
                  }`}
                  title="Infusion Running Indicator"
                >
                  <BbraunLeftTriangleSvg className="h-2.5 w-2" />
                </span>
                <span
                  className={`h-2 w-2 rounded-full ${
                    pump.alarmState === 'CRITICAL'
                      ? 'bg-red-500'
                      : pump.alarmState === 'PRE_ALARM'
                        ? 'bg-amber-400'
                        : 'bg-neutral-700'
                  }`}
                  title="Alarm Indicator LED"
                />
                <span
                  className={`h-2 w-2 rounded-xs ${
                    acMainsConnected ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                  title={acMainsConnected ? 'AC Mains Connected' : 'Running on Internal Battery'}
                />
              </div>

              {/* 3 Stacked Circular Physical Keys: Home, Power (Hold), Red Stop / Green Start */}
              <div className="flex flex-col items-center justify-between h-[122px]">
                {/* Home Button */}
                <button
                  type="button"
                  onClick={() => {
                    clinicalAudio.playKeyClick();
                    if (pump.screenView !== 'RUN_VIEW') {
                      onUpdatePump(pump.id, (prev) => ({ ...prev, screenView: 'RUN_VIEW' }));
                    } else {
                      openEditor(pump.id, 'DRUG_LIBRARY');
                    }
                  }}
                  className="h-9 w-9 rounded-full bg-[#16181d] hover:bg-[#232730] border-[1.5px] border-white/85 text-white flex items-center justify-center cursor-pointer active:scale-95"
                  title="Home / DoseGuard Drug Library"
                >
                  <BbraunHomeSvg className="h-4 w-4" />
                </button>

                {/* Power Button (Hold or Double-Click) */}
                <button
                  type="button"
                  onMouseDown={() => startPowerHold(pump)}
                  onMouseUp={() => cancelPowerHold(pump.id)}
                  onMouseLeave={() => cancelPowerHold(pump.id)}
                  onDoubleClick={() =>
                    onUpdatePump(pump.id, (prev) => ({
                      ...prev,
                      poweredOn: !prev.poweredOn,
                      running: false,
                    }))
                  }
                  className="relative h-9 w-9 rounded-full bg-[#16181d] hover:bg-[#232730] border-[1.5px] border-white/85 text-white flex items-center justify-center cursor-pointer"
                  title="Hold ~1.2s (or double-click) to Power Pump On/Off"
                >
                  <BbraunPowerSvg className="h-3.5 w-3.5" />
                  {pump.powerHoldProgress > 0 && (
                    <span className="absolute -top-2 -right-2 px-1 bg-amber-400 text-black text-[8px] font-mono font-bold rounded">
                      {pump.powerHoldProgress}%
                    </span>
                  )}
                </button>

                {/* Red Stop / Green Start Circular Key */}
                <button
                  type="button"
                  disabled={!pump.poweredOn}
                  onClick={() => {
                    clinicalAudio.playKeyClick(true);
                    if (pump.occluded) {
                      onClearDownstreamOcclusion(pump.id);
                      return;
                    }
                    if (!pump.containerLoaded) {
                      notify(
                        `Slot ${pump.bayIndex}: Load ${
                          pump.pumpType === 'SYRINGE' ? 'OPS Syringe' : 'IV Bag on Stand'
                        } before starting!`
                      );
                      openEditor(pump.id, 'IV_DISPOSABLES');
                      return;
                    }
                    if (!pump.ivTubeConnected) {
                      notify(
                        `Slot ${pump.bayIndex}: Connect IV tubing line to patient CVC manifold first!`
                      );
                      return;
                    }
                    onUpdatePump(pump.id, (prev) => {
                      if (!prev.disposableLocked) return prev;
                      return {
                        ...prev,
                        running: !prev.running,
                        bolusActive: false,
                        alarmState: 'NONE',
                        alarmMessage: null,
                      };
                    });
                  }}
                  className={`h-9 w-9 rounded-full font-extrabold text-[10px] tracking-tight text-white flex items-center justify-center shadow-md cursor-pointer active:scale-95 disabled:opacity-35 ${
                    pump.running
                      ? 'bg-[#e11d2e] hover:bg-[#f43f5e] border border-red-300/50'
                      : 'bg-[#16a34a] hover:bg-[#22c55e] border border-emerald-300/50'
                  }`}
                  title={pump.running ? 'Stop Infusion' : 'Start Infusion'}
                >
                  {pump.running ? 'Stop' : 'Start'}
                </button>
              </div>
            </div>

            {/* CENTER COLUMN: Silkscreen Header with Official B. Braun Logo + Touchscreen */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Top Silkscreen Row: Spaceplus Infusomat® / Perfusor® + Official Uploaded B|BRAUN Logo */}
              <div className="flex items-center justify-between pb-1 px-0.5">
                <div className="text-xs sm:text-[13px] tracking-tight text-white font-semibold flex items-center gap-2">
                  <span>
                    <span>Space</span>
                    <sup className="text-[8.5px] font-bold mx-0.5">plus</sup>
                    <span className="ml-1 font-normal text-neutral-200">
                      {pump.pumpType === 'SYRINGE' ? 'Perfusor®' : 'Infusomat®'}
                    </span>
                  </span>

                  {/* Quick inline disposable/tubing indicators */}
                  {!pump.containerLoaded && (
                    <span className="text-[9px] font-mono font-bold text-amber-300">
                      [NO {pump.pumpType === 'SYRINGE' ? 'SYRINGE' : 'BAG'}]
                    </span>
                  )}
                  {!pump.ivTubeConnected && (
                    <span className="text-[9px] font-mono font-bold text-cyan-300">
                      [TUBE UNPLUGGED]
                    </span>
                  )}
                </div>

                {/* Official Uploaded Green B | BRAUN Logo Image */}
                <img
                  src={BBRAUN_LOGO_SRC}
                  alt="B. Braun"
                  className="h-[18px] w-auto object-contain rounded-[1px]"
                />
              </div>

              {/* Dark Charcoal Touchscreen Display (#212428) */}
              {!pump.poweredOn ? (
                <div className="flex-1 h-[108px] bg-[#0e1013] border border-[#2b2f37] flex items-center justify-between px-4 text-xs font-mono text-neutral-500">
                  <span>PUMP STANDBY OFF — HOLD POWER BUTTON TO START SELF-TEST</span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdatePump(pump.id, (prev) => ({ ...prev, poweredOn: true }))
                    }
                    className="px-2.5 py-1 bg-[#1e293b] text-emerald-300 border border-emerald-600/40 rounded text-[11px] cursor-pointer"
                  >
                    Quick Power On
                  </button>
                </div>
              ) : (
                <div className="flex flex-col h-[112px] bg-[#22252a] border border-[#3a3e47] overflow-hidden">
                  {/* Alarm / Missing Tubing or Bag Banner */}
                  {(pump.alarmState !== 'NONE' || !pump.containerLoaded || !pump.ivTubeConnected) && (
                    <div
                      className={`flex items-center justify-between px-2.5 py-0.5 text-[10px] font-bold shrink-0 ${
                        pump.alarmState === 'CRITICAL'
                          ? 'bg-[#dc2626] text-white'
                          : 'bg-[#facc15] text-black'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5 truncate">
                        <BbraunWarnTriangleSvg className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {!pump.containerLoaded
                            ? pump.pumpType === 'SYRINGE'
                              ? 'No OPS syringe loaded in drive'
                              : 'No IV bag hung on stand'
                            : !pump.ivTubeConnected
                              ? 'IV giving set / tubing disconnected from patient CVC'
                              : pump.alarmMessage}
                        </span>
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {!pump.containerLoaded && (
                          <button
                            type="button"
                            onClick={() => toggleContainerLoaded(pump)}
                            className="px-1.5 py-0.2 bg-black/85 text-white text-[9.5px] rounded-xs cursor-pointer"
                          >
                            {pump.pumpType === 'SYRINGE' ? '+ Load Syringe' : '+ Hang IV Bag'}
                          </button>
                        )}
                        {!pump.ivTubeConnected && (
                          <button
                            type="button"
                            onClick={() => toggleIvTube(pump)}
                            className="px-1.5 py-0.2 bg-black/85 text-cyan-300 text-[9.5px] rounded-xs cursor-pointer"
                          >
                            + Plug IV Tube
                          </button>
                        )}
                        {pump.occluded && (
                          <button
                            type="button"
                            onClick={() => onClearDownstreamOcclusion(pump.id)}
                            className="px-1.5 py-0.2 bg-black/85 text-white text-[9.5px] rounded-xs cursor-pointer"
                          >
                            Release Kink &amp; Anti-Bolus
                          </button>
                        )}
                        {pump.containerLoaded && pump.volumeRemainingMl <= 0.05 && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdatePump(pump.id, (prev) => ({
                                ...prev,
                                volumeRemainingMl: prev.containerTotalMl,
                                vtbiMl: prev.containerTotalMl,
                                alarmState: 'NONE',
                                alarmMessage: null,
                              }))
                            }
                            className="px-1.5 py-0.2 bg-black/85 text-white text-[9.5px] rounded-xs cursor-pointer"
                          >
                            Refill {pump.containerTotalMl} mL
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Main 3-Zone Touchscreen Body */}
                  <div className="flex flex-1 min-h-0">
                    {/* ZONE 1: Left Run Chevrons + WiFi/Battery + Line Pressure Arc */}
                    <button
                      type="button"
                      onClick={() => openEditor(pump.id, 'OCCLUSION_LOCK')}
                      className="w-[66px] sm:w-[72px] bg-[#2a2e34] border-r border-[#3b4048] px-1.5 py-1 flex flex-col justify-between items-start text-left hover:bg-[#32373e] cursor-pointer shrink-0"
                      title="Click to configure Occlusion Pressure Level (L1–L9) or DataLock PIN"
                    >
                      <div className="flex items-center gap-[2px]">
                        {[4, 3, 2, 1, 0].map((idx) => (
                          <span
                            key={idx}
                            className={
                              isActivelyInfusing
                                ? 'text-[#22c55e] bb-chevron-flow inline-flex'
                                : 'text-neutral-600 inline-flex'
                            }
                            style={
                              isActivelyInfusing
                                ? { animationDelay: `${idx * 170}ms` }
                                : undefined
                            }
                          >
                            <BbraunLeftTriangleSvg className="h-2.5 w-2" />
                          </span>
                        ))}
                      </div>

                      {pump.intermittentMode && (
                        <span className="px-1 py-0.2 bg-[#8f96a0] text-neutral-950 font-extrabold text-[7.5px] tracking-tight leading-none">
                          INTERMIT
                        </span>
                      )}

                      <div className="w-full flex items-center justify-between text-[8.5px] font-mono text-neutral-300">
                        <span>WiFi</span>
                        <span className="tabular-nums">{Math.round(batteryPct)}%</span>
                      </div>

                      <div className="w-full flex items-end justify-between text-[8px] font-mono text-neutral-300 leading-none">
                        <div>
                          <div className="font-bold text-white tabular-nums">
                            {pump.ivTubeConnected ? pump.linePressureMmHg : 0}
                          </div>
                          <div className="text-[7px] text-neutral-400">mmHg</div>
                        </div>
                        <svg viewBox="0 0 32 18" className="w-7 h-4">
                          <path
                            d="M 3 16 A 13 13 0 0 1 29 16"
                            fill="none"
                            stroke="#525866"
                            strokeWidth="3.5"
                          />
                          <path
                            d="M 3 16 A 13 13 0 0 1 29 16"
                            fill="none"
                            stroke={
                              pressureFrac > 0.85
                                ? '#ef4444'
                                : pressureFrac > 0.65
                                  ? '#facc15'
                                  : '#22c55e'
                            }
                            strokeWidth="3.5"
                            strokeDasharray={`${
                              pump.ivTubeConnected ? Math.round(pressureFrac * 41) : 0
                            } 42`}
                          />
                        </svg>
                      </div>
                    </button>

                    {/* ZONE 2: Center Drug Banner + Syringe Graphic / Remaining Time & Volume */}
                    <div className="flex-1 flex flex-col min-w-0 border-r border-[#3b4048]">
                      <button
                        type="button"
                        onClick={() => openEditor(pump.id, 'DRUG_LIBRARY')}
                        style={banner.bgStyle}
                        className={`w-full px-2 py-1 text-center leading-tight hover:brightness-105 cursor-pointer shrink-0 ${banner.className}`}
                        title="Click Drug Banner to change medication in DoseGuard™ Library or view PubChem/openFDA Monograph"
                      >
                        <div className="text-xs sm:text-sm font-extrabold tracking-tight truncate">
                          {drug.tallManName}
                        </div>
                        <div className="text-[10px] font-bold opacity-90 truncate">
                          {drug.concentrationLabel}
                        </div>
                      </button>

                      {pump.screenView === 'DETAIL_VIEW' ? (
                        <div className="flex-1 px-2 py-1 grid grid-cols-3 gap-1 items-center font-mono text-[9.5px] text-neutral-200 bg-[#1c1f24]">
                          <div>
                            <div className="text-neutral-400 text-[8px]">VTBI</div>
                            <div className="font-bold tabular-nums">{pump.vtbiMl.toFixed(1)} mL</div>
                          </div>
                          <div>
                            <div className="text-neutral-400 text-[8px]">Infused</div>
                            <div className="font-bold text-emerald-300 tabular-nums">
                              {pump.volumeInfusedMl.toFixed(1)} mL
                            </div>
                          </div>
                          <div>
                            <div className="text-neutral-400 text-[8px]">IV Line</div>
                            <div className="font-bold">
                              {pump.ivTubeConnected ? 'Luer OK' : 'Unplugged'}
                            </div>
                          </div>
                        </div>
                      ) : pump.screenView === 'DRUG_GUARD_VIEW' ? (
                        <div className="flex-1 px-2 py-1 flex items-center justify-between font-mono text-[9.5px] text-neutral-200 bg-[#1c1f24]">
                          <div>
                            <div className="text-neutral-400 text-[8px]">DoseGuard™ Soft / Hard</div>
                            <div className="font-bold tabular-nums">
                              {drug.softMaxRateMlH} / {drug.hardMaxRateMlH} mL/h
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => openEditor(pump.id, 'MONOGRAPH')}
                            className="px-2 py-0.5 bg-[#0b57d0] text-white text-[9px] font-sans font-bold rounded-xs cursor-pointer"
                          >
                            PubChem / FDA
                          </button>
                        </div>
                      ) : pump.pumpType === 'SYRINGE' ? (
                        /* Perfusor® Graduated Green-Filled OPS Syringe Graphic */
                        <button
                          type="button"
                          onClick={() => openEditor(pump.id, 'IV_DISPOSABLES')}
                          className="flex-1 px-2 py-1 flex items-center bg-[#23262b] hover:bg-[#292d33] cursor-pointer"
                          title={
                            pump.containerLoaded
                              ? `OPS ${pump.syringeSizeMl} mL Syringe (${pump.volumeRemainingMl.toFixed(1)} mL left) — Click to swap/refill syringe or IV tubing`
                              : 'No OPS syringe loaded — Click to load 10/20/50 mL syringe'
                          }
                        >
                          {pump.containerLoaded ? (
                            <>
                              <div className="h-2.5 w-3.5 bg-gradient-to-b from-[#94a3b8] to-[#475569] rounded-l-xs border border-black/50 shrink-0" />
                              <div className="h-4 w-1.5 bg-[#cbd5e1] border-y border-black/50 shrink-0" />
                              <div className="relative flex-1 h-7 bg-gradient-to-b from-[#525760] via-[#2c3036] to-[#1a1d21] border border-[#7c8390] overflow-hidden flex items-center">
                                <div
                                  className="h-full bg-gradient-to-b from-[#46b888] via-[#2c8a63] to-[#1d6346] border-r-4 border-r-[#94a3b8] transition-all"
                                  style={{ width: `${syringePct}%` }}
                                />
                                <div className="absolute inset-0 flex flex-col justify-between px-2 py-0.5 pointer-events-none">
                                  <div className="flex justify-between w-full">
                                    {Array.from({ length: 14 }).map((_, t) => (
                                      <span
                                        key={t}
                                        className={`w-px bg-white/75 ${t % 3 === 0 ? 'h-2' : 'h-1'}`}
                                      />
                                    ))}
                                  </div>
                                  <div className="flex justify-between w-full text-[7.5px] font-mono font-bold text-white drop-shadow">
                                    <span>10</span>
                                    <span>20</span>
                                    <span>30</span>
                                    <span>B.Braun OPS {pump.syringeSizeMl}mL</span>
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-7 border border-dashed border-amber-400/70 rounded flex items-center justify-center text-[10px] font-mono font-bold text-amber-300">
                              + CLICK TO INSERT B. BRAUN OPS SYRINGE
                            </div>
                          )}
                        </button>
                      ) : (
                        /* Infusomat® Remaining Time, Volume & Animated 12-Finger Peristaltic Wave Strip */
                        <button
                          type="button"
                          onClick={() => openEditor(pump.id, 'IV_DISPOSABLES')}
                          className="flex-1 px-2.5 py-0.5 flex flex-col justify-between text-left hover:bg-[#2a2e35] cursor-pointer"
                          title="Click to manage IV Bag on stand, VTBI, or IV giving set tubing"
                        >
                          <div className="grid grid-cols-2 gap-2 items-center w-full">
                            <div>
                              <div className="text-[8px] text-neutral-400 leading-none">
                                Remaining Time
                              </div>
                              <div className="text-xs font-mono font-bold text-white tabular-nums leading-tight mt-0.5">
                                {pump.containerLoaded
                                  ? formatRemainingTime(pump.vtbiMl, pump.rateMlH)
                                  : 'NO BAG HUNG'}
                              </div>
                            </div>
                            {pump.intermittentMode && drug.intermittentSummary ? (
                              <div className="text-right font-mono leading-tight">
                                <div className="text-[11px] font-bold text-white">
                                  {drug.intermittentSummary.totalDoseLabel}
                                </div>
                                <div className="text-[9px] text-neutral-300">
                                  over{' '}
                                  <span className="font-bold text-white">
                                    {drug.intermittentSummary.overDurationLabel}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-right">
                                <div className="text-[8px] text-neutral-400 leading-none">
                                  Remaining Volume
                                </div>
                                <div className="text-xs font-mono font-bold text-white tabular-nums leading-tight mt-0.5">
                                  {pump.containerLoaded ? Math.round(pump.volumeRemainingMl) : 0}{' '}
                                  <span className="text-[9px] font-normal text-neutral-300">
                                    / {pump.containerTotalMl} mL
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Sinusoidal 12-Finger Peristaltic Mechanism Strip */}
                          <div className="w-full h-2.5 bg-[#17191d] border border-[#343942] px-1 flex items-center justify-between gap-[2px] overflow-hidden">
                            {Array.from({ length: 12 }).map((_, fIdx) => (
                              <span
                                key={fIdx}
                                className={`flex-1 h-1.5 rounded-[1px] ${
                                  isActivelyInfusing
                                    ? 'bg-emerald-400 peristaltic-finger'
                                    : pump.occluded
                                      ? 'bg-red-500'
                                      : 'bg-neutral-600/60'
                                }`}
                                style={
                                  isActivelyInfusing
                                    ? { animationDelay: `${(11 - fIdx) * 60}ms` }
                                    : undefined
                                }
                              />
                            ))}
                          </div>
                        </button>
                      )}
                    </div>

                    {/* ZONE 3: Right Large Dose Rate / Flow Rate Touchscreen Column */}
                    <button
                      type="button"
                      onClick={() => openEditor(pump.id, 'RATE_DOSE')}
                      className="w-[100px] sm:w-[122px] px-2 py-1 flex flex-col items-center justify-between bg-[#22252a] hover:bg-[#2c3037] cursor-pointer shrink-0"
                      title="Click to titrate Rate or Dose on B. Braun Touchscreen Keypad"
                    >
                      <span className="text-[8.5px] text-neutral-400 font-medium">
                        {pump.bolusActive
                          ? 'BOLUS ACTIVE'
                          : pump.inKvoMode
                            ? 'KVO MODE'
                            : isDosePrimary
                              ? 'Dose Rate'
                              : 'Flow Rate'}
                      </span>

                      <div className="text-2xl sm:text-[26px] font-sans font-bold text-white leading-none tabular-nums tracking-tight">
                        {pump.bolusActive
                          ? drug.bolusRateMlH
                          : pump.inKvoMode
                            ? pump.kvoRateMlH.toFixed(1)
                            : isDosePrimary
                              ? formattedDose
                              : formattedRate}
                      </div>

                      <div className="w-full text-center">
                        <div className="text-[9px] font-semibold text-neutral-200">
                          {pump.bolusActive || pump.inKvoMode ? 'mL/h' : drug.doseUnit}
                        </div>
                        {isDosePrimary && !pump.bolusActive && (
                          <div className="mt-0.5 pt-0.5 border-t border-white/10 text-[8.5px] font-mono text-neutral-300 tabular-nums">
                            {formattedRate} mL/h
                          </div>
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Bottom Touchscreen Softkey Strip: CHANGE VIEW + Orange-Accented BOLUS + IV TUBE BUTTON */}
                  <div className="flex h-6 bg-[#595d64] border-t border-[#737882] border-b-2 border-b-[#e86c1f] text-[9px] font-bold text-white shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        clinicalAudio.playKeyClick();
                        const order: SpacePlusScreenView[] = [
                          'RUN_VIEW',
                          'DETAIL_VIEW',
                          'DRUG_GUARD_VIEW',
                        ];
                        onUpdatePump(pump.id, (prev) => ({
                          ...prev,
                          screenView:
                            order[(order.indexOf(prev.screenView) + 1) % order.length],
                        }));
                      }}
                      className="w-[88px] border-r border-[#3a3d42] hover:bg-[#686d75] tracking-tight cursor-pointer"
                    >
                      CHANGE VIEW
                    </button>

                    <button
                      type="button"
                      disabled={!drug.bolusAllowed || !isActivelyInfusing}
                      onMouseDown={() => {
                        if (!drug.bolusAllowed || !isActivelyInfusing) return;
                        clinicalAudio.playKeyClick(true);
                        onUpdatePump(pump.id, (prev) => ({
                          ...prev,
                          bolusActive: true,
                        }));
                      }}
                      onMouseUp={() =>
                        onUpdatePump(pump.id, (prev) => ({
                          ...prev,
                          bolusActive: false,
                        }))
                      }
                      onMouseLeave={() =>
                        onUpdatePump(pump.id, (prev) =>
                          prev.bolusActive ? { ...prev, bolusActive: false } : prev
                        )
                      }
                      onClick={() => {
                        if (!drug.bolusAllowed || !isActivelyInfusing) return;
                        onUpdatePump(pump.id, (prev) => ({
                          ...prev,
                          volumeInfusedMl: Number(
                            (prev.volumeInfusedMl + drug.bolusDefaultMl).toFixed(2)
                          ),
                          volumeRemainingMl: Math.max(
                            0,
                            Number((prev.volumeRemainingMl - drug.bolusDefaultMl).toFixed(2))
                          ),
                          bolusDeliveredMl: Number(
                            (prev.bolusDeliveredMl + drug.bolusDefaultMl).toFixed(2)
                          ),
                          bolusEffectImpulse: Math.min(1.6, prev.bolusEffectImpulse + 0.45),
                        }));
                      }}
                      className="flex-1 flex items-center justify-center gap-1 hover:bg-[#686d75] disabled:opacity-45 cursor-pointer border-r border-[#3a3d42]"
                      title={
                        drug.bolusAllowed
                          ? `Hold for manual bolus (${drug.bolusRateMlH} mL/h) or click for ${drug.bolusDefaultMl} mL bolus`
                          : 'Bolus disabled by DoseGuard™ protocol'
                      }
                    >
                      <span className="inline-flex items-center gap-[1px] px-1.5 py-0.5 rounded-full bg-[#ef7d22] text-neutral-950">
                        <BbraunLeftTriangleSvg className="h-2 w-1.5" />
                        <BbraunLeftTriangleSvg className="h-2 w-1.5" />
                        <BbraunLeftTriangleSvg className="h-2 w-1.5" />
                      </span>
                      <span>
                        BOLUS
                        {pump.bolusDeliveredMl > 0
                          ? ` (${pump.bolusDeliveredMl.toFixed(1)}mL)`
                          : ''}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleIvTube(pump)}
                      className={`px-2 font-mono text-[8.5px] cursor-pointer ${
                        pump.ivTubeConnected
                          ? 'bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100'
                          : 'bg-[#0098d4] hover:bg-[#38bdf8] text-black font-extrabold'
                      }`}
                      title="Click to connect or disconnect this pump's IV giving set / extension tubing"
                    >
                      {pump.ivTubeConnected ? 'TUBE OK' : '+ PLUG TUBE'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT BEZEL EJECT / LOAD CONTAINER BUTTON */}
            <div className="pl-2 flex flex-col items-center justify-between border-l border-white/15 ml-2 shrink-0 py-1">
              <button
                type="button"
                onClick={() => toggleContainerLoaded(pump)}
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shadow cursor-pointer ${
                  pump.containerLoaded
                    ? 'bg-[#d4d8df] hover:bg-white text-neutral-900'
                    : 'bg-amber-400 text-black'
                }`}
                title={
                  pump.containerLoaded
                    ? pump.pumpType === 'SYRINGE'
                      ? 'Eject OPS Syringe from Perfusor®'
                      : 'Open Door / Unhang IV Bag'
                    : pump.pumpType === 'SYRINGE'
                      ? 'Load OPS Syringe into Perfusor®'
                      : 'Hang IV Bag & Close Door'
                }
              >
                <BbraunEjectSvg className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => openEditor(pump.id, 'IV_DISPOSABLES')}
                className="text-[8px] font-mono text-sky-300 hover:underline cursor-pointer"
                title="Configure IV Bag / OPS Syringe & Tubing"
              >
                {pump.pumpType === 'SYRINGE' ? 'Syringe' : 'IV Bag'}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PROTRUDING MOTORIZED SYRINGE DRIVE HEAD & ROTATING HELICAL LEAD-SCREW ON PERFUSOR® */}
        {pump.pumpType === 'SYRINGE' && (
          <div className="hidden sm:flex items-center -ml-1 shrink-0">
            {/* Molded Syringe Barrel Clamp Bracket */}
            <div className="h-24 w-10 rounded-xl bg-gradient-to-b from-[#f4f6f9] via-[#e4e8ef] to-[#cbd2de] border border-[#b6bfce] shadow-md flex flex-col items-center justify-between py-2">
              <span
                className={`h-1.5 w-4 rounded-full ${
                  isActivelyInfusing
                    ? 'bg-emerald-500 shadow-[0_0_6px_#22c55e]'
                    : pump.antiBolusRewinding
                      ? 'bg-amber-400'
                      : 'bg-slate-400'
                }`}
              />
              <div className="h-8 w-8 rounded-full border border-slate-300 flex items-center justify-center text-[7.5px] font-semibold text-slate-500">
                Pull
              </div>
              <span className="text-[7px] font-mono text-slate-500">
                {isActivelyInfusing ? 'DRIVE' : 'HOLD'}
              </span>
            </div>

            {/* Dual Guide Rod + Rotating Helical Lead-Screw Shaft */}
            <div
              className="flex flex-col justify-between h-8 transition-all duration-300"
              style={{
                width: `${pump.containerLoaded ? Math.round(10 + (syringePct / 100) * 28) : 10}px`,
              }}
            >
              {/* Upper Polished Stainless Guide Rod */}
              <div className="h-1.5 w-full bg-gradient-to-b from-[#f8fafc] via-[#cbd5e1] to-[#64748b] border-y border-slate-500" />
              {/* Center Rotating Helical Lead-Screw */}
              <div
                className={`h-3.5 w-full border-y border-slate-600 ${
                  pump.antiBolusRewinding
                    ? 'perfusor-screw-rewind'
                    : isActivelyInfusing
                      ? 'perfusor-screw-active'
                      : 'perfusor-screw-idle'
                }`}
              />
              {/* Lower Stabilizer Guide Rod */}
              <div className="h-1 w-full bg-gradient-to-b from-[#e2e8f0] to-[#64748b] border-y border-slate-500" />
            </div>

            {/* Motorized Piston Drive Claw Head */}
            <button
              type="button"
              onClick={() => {
                if (!pump.containerLoaded) {
                  toggleContainerLoaded(pump);
                } else {
                  onUpdatePump(pump.id, (prev) => ({
                    ...prev,
                    volumeRemainingMl: prev.syringeSizeMl,
                    vtbiMl: prev.syringeSizeMl,
                    containerTotalMl: prev.syringeSizeMl,
                    alarmState: 'NONE',
                    alarmMessage: null,
                  }));
                  notify(`Slot ${pump.bayIndex}: Fresh ${pump.syringeSizeMl} mL OPS Syringe Loaded`);
                }
              }}
              className={`h-26 w-16 rounded-r-3xl rounded-l-md border shadow-[6px_8px_18px_rgba(15,23,42,0.16)] flex flex-col items-center justify-center text-[8px] font-mono cursor-pointer transition-transform ${
                pump.containerLoaded
                  ? 'bg-gradient-to-b from-[#ffffff] via-[#eef2f6] to-[#d5dce6] border-[#bcc5d4] text-slate-700 hover:text-slate-950'
                  : 'bg-amber-100 border-amber-400 text-amber-900 font-bold'
              }`}
              title="Motorized Perfusor® Drive Head — Click to load or refill OPS syringe"
            >
              {pump.containerLoaded ? (
                <>
                  <span
                    className={`inline-flex items-center gap-0.5 text-[7.5px] font-bold ${
                      isActivelyInfusing ? 'text-emerald-600' : 'text-slate-500'
                    }`}
                  >
                    {isActivelyInfusing && <BbraunLeftTriangleSvg className="h-2 w-1.5" />}
                    <span>{isActivelyInfusing ? 'PUSH' : 'LOCKED'}</span>
                  </span>
                  <span className="font-bold text-[9.5px] tabular-nums">
                    {pump.volumeRemainingMl.toFixed(1)}mL
                  </span>
                  <span className="text-slate-500">OPS {pump.syringeSizeMl}</span>
                </>
              ) : (
                <>
                  <span>+ LOAD</span>
                  <span>SYRINGE</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* Top Station Workbench & IV Setup Control Bar */}
      <div className="w-full max-w-[1120px] mb-3 flex flex-wrap items-center justify-between gap-2 bg-[#161920] border border-[#2d3340] px-4 py-2.5 rounded-md text-slate-200">
        <div className="flex items-center gap-3">
          <img
            src={BBRAUN_LOGO_SRC}
            alt="B. Braun"
            className="h-6 w-auto object-contain rounded-[2px]"
          />
          <div>
            <div className="text-sm font-bold text-white flex flex-wrap items-center gap-2">
              <span>
                B. Braun Space®plus Infusion Station on Rolling ICU IV Stand
              </span>
              <span className="text-xs font-mono font-normal text-emerald-300">
                · {loadedContainersCount}/4 Bags/Syringes · {connectedLinesCount}/4 IV Lines Connected
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Hang IV bags on the top stand hooks, load 10/20/50 mL OPS syringes, and plug IV giving sets &amp; extension lines into the Patient CVC Manifold.
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {stationToast && (
            <span className="px-2.5 py-1 bg-[#1e293b] border border-emerald-500/40 text-emerald-200 font-mono text-xs rounded">
              {stationToast}
            </span>
          )}

          {onBulkSetIvTubing && (
            <>
              <button
                type="button"
                onClick={() => {
                  onBulkSetIvTubing(false);
                  notify('All IV lines disconnected — click each CVC port or [+ PLUG TUBE] to wire IV tubing');
                }}
                className="px-2.5 py-1 text-xs font-bold bg-[#262c38] hover:bg-[#323a4a] text-cyan-300 border border-cyan-500/40 rounded cursor-pointer"
              >
                Unplug All IV Tubes
              </button>
              <button
                type="button"
                onClick={() => {
                  onBulkSetIvTubing(true);
                  notify('All 4 IV giving sets & extension tubes connected & primed');
                }}
                className="px-2.5 py-1 text-xs font-bold bg-[#008f65] hover:bg-[#00a676] text-white border border-emerald-400/50 rounded cursor-pointer"
              >
                Connect All IV Tubes
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() =>
              setTowerViewMode((m) => (m === 'TOWER_4BAY' ? 'CLOSEUP_GUI' : 'TOWER_4BAY'))
            }
            className="px-2.5 py-1 text-xs font-bold bg-[#262c38] hover:bg-[#323a4a] text-white border border-slate-600 rounded cursor-pointer"
          >
            {towerViewMode === 'TOWER_4BAY' ? 'GUI Close-Up' : 'IV Stand View'}
          </button>

          <button
            type="button"
            onClick={onToggleAcMains}
            className={`px-2.5 py-1 text-xs font-mono font-bold rounded border cursor-pointer ${
              acMainsConnected
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50'
                : 'bg-amber-950/90 text-amber-300 border-amber-500/60'
            }`}
          >
            {acMainsConnected
              ? `AC Mains · Batt ${Math.round(batteryPct)}%`
              : `Battery · ${Math.round(batteryPct)}%`}
          </button>

          {onReturnToLauncher && (
            <button
              type="button"
              onClick={onReturnToLauncher}
              className="px-2.5 py-1 text-xs font-bold bg-[#1f64cb] hover:bg-[#2b7de9] text-white rounded cursor-pointer"
            >
              Main Menu
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* FULL ICU STAINLESS-STEEL IV STAND + HANGING BAGS + 4-BAY TOWER + CVC  */}
      {/* ===================================================================== */}
      <div className="w-full max-w-[1120px] flex flex-col items-center relative">
        {/* 1. TOP STAINLESS-STEEL 4-HOOK IV POLE CROSSBAR + HANGING IV BAGS & SYRINGE CADDY */}
        {towerViewMode === 'TOWER_4BAY' && (
          <div className="w-full max-w-[940px] flex flex-col items-center mb-1 relative">
            {/* Stainless Ram's-Horn 4-Hook Top Crossbar */}
            <div className="relative w-[780px] max-w-full flex flex-col items-center">
              {/* Central Pole Finial Cap */}
              <div className="w-6 h-4 rounded-t-full bg-gradient-to-r from-[#94a3b8] via-[#f8fafc] to-[#64748b] border border-slate-500" />
              {/* Horizontal Stainless Cross-Arm */}
              <div className="w-full h-3 rounded-full bg-gradient-to-b from-[#f8fafc] via-[#cbd5e1] to-[#64748b] border border-slate-500 shadow-md flex justify-around items-center px-8">
                {[1, 2, 3, 4].map((hk) => (
                  <div
                    key={hk}
                    className="w-5 h-5 -mt-2 rounded-full border-[3px] border-[#cbd5e1] bg-transparent shadow-sm"
                  />
                ))}
              </div>
            </div>

            {/* 4 Hanging Disposables Slots Underneath the 4 IV Stand Hooks */}
            <div className="w-[820px] max-w-full grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 px-2 relative z-10">
              {pumps.map((pump) => {
                const drug = getDrugById(pump.drugId);
                const fillPct = pump.containerLoaded
                  ? Math.max(
                      0,
                      Math.min(100, (pump.volumeRemainingMl / Math.max(1, pump.containerTotalMl)) * 100)
                    )
                  : 0;
                const fluidColor = getFluidLineColor(drug.bannerTheme);
                const isFlowing =
                  pump.poweredOn &&
                  pump.running &&
                  pump.containerLoaded &&
                  pump.ivTubeConnected &&
                  !pump.occluded;

                return (
                  <div key={`bag-${pump.id}`} className="flex flex-col items-center">
                    {/* Stainless Hanger Loop */}
                    <div className="w-1 h-2.5 bg-[#94a3b8]" />

                    {pump.pumpType === 'VOLUMETRIC' ? (
                      /* Hanging Translucent Medical PVC IV Fluid / Medication Bag + Drip Chamber */
                      <div className="flex flex-col items-center w-full max-w-[168px]">
                        {pump.containerLoaded ? (
                          <div
                            onClick={() => openEditor(pump.id, 'IV_DISPOSABLES')}
                            className="relative w-full h-[108px] rounded-2xl bg-gradient-to-b from-slate-200/20 via-slate-100/10 to-slate-300/25 border-2 border-slate-300/65 backdrop-blur-xs overflow-hidden flex flex-col justify-between p-2 cursor-pointer hover:border-emerald-400 shadow-lg"
                            title="Click IV Bag to swap volume (100/250/500/1000 mL), change medication, or unhang"
                          >
                            {/* Dynamic Translucent Fluid Level Inside Bag */}
                            <div
                              className="absolute inset-x-0 bottom-0 transition-all duration-300 opacity-45 pointer-events-none"
                              style={{
                                height: `${fillPct}%`,
                                backgroundColor: fluidColor,
                              }}
                            />

                            {/* Bag Pharmacy Label */}
                            <div className="relative z-10 bg-white/92 text-slate-900 rounded px-1.5 py-1 shadow-xs border border-slate-300">
                              <div className="flex items-center justify-between text-[8px] font-mono font-bold text-slate-500">
                                <span>SLOT {pump.bayIndex} BAG</span>
                                <span>{pump.containerTotalMl} mL</span>
                              </div>
                              <div className="text-[10.5px] font-extrabold truncate leading-tight">
                                {drug.tallManName}
                              </div>
                              <div className="text-[8.5px] font-mono text-slate-700 truncate">
                                {Math.round(pump.volumeRemainingMl)} / {pump.containerTotalMl} mL
                              </div>
                            </div>

                            {/* Quick Refill / Unhang Mini Controls */}
                            <div className="relative z-10 flex items-center justify-between gap-1 text-[8.5px] font-mono font-bold">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdatePump(pump.id, (prev) => ({
                                    ...prev,
                                    volumeRemainingMl: prev.containerTotalMl,
                                    vtbiMl: prev.containerTotalMl,
                                    alarmState: 'NONE',
                                    alarmMessage: null,
                                  }));
                                  notify(`Slot ${pump.bayIndex}: Refilled ${pump.containerTotalMl} mL IV Bag`);
                                }}
                                className="px-1.5 py-0.5 bg-slate-900/80 hover:bg-slate-900 text-emerald-300 rounded cursor-pointer"
                              >
                                Refill
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleContainerLoaded(pump);
                                }}
                                className="px-1.5 py-0.5 bg-slate-900/80 hover:bg-rose-700 text-slate-200 rounded cursor-pointer"
                              >
                                Unhang
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Empty IV Hook — Click to Hang Fresh IV Bag */
                          <button
                            type="button"
                            onClick={() => toggleContainerLoaded(pump)}
                            className="w-full h-[108px] rounded-2xl border-2 border-dashed border-amber-400/70 bg-amber-950/20 hover:bg-amber-950/40 flex flex-col items-center justify-center p-2 text-amber-300 font-mono text-xs font-bold cursor-pointer"
                          >
                            <span>+ Hang IV Bag</span>
                            <span className="text-[9.5px] text-amber-200/80 mt-0.5">
                              Slot {pump.bayIndex} ({drug.tallManName})
                            </span>
                          </button>
                        )}

                        {/* Transparent Medical IV Drip Chamber with Animated Falling Droplets + PVC Tube */}
                        <div className="flex flex-col items-center">
                          <div className="relative w-4.5 h-8 rounded-b-full border border-slate-300/80 bg-gradient-to-r from-slate-800/85 via-slate-700/45 to-slate-800/85 flex flex-col items-center justify-between pt-0.5 overflow-hidden shadow-inner">
                            {/* Top Spike Nozzle */}
                            <div className="w-1.5 h-1 bg-slate-300 rounded-b-xs" />
                            {/* Animated Falling Fluid Droplet */}
                            <span
                              className={`w-1.5 h-2 rounded-full ${
                                isFlowing ? 'iv-drop-anim' : 'opacity-20'
                              }`}
                              style={{ backgroundColor: fluidColor }}
                            />
                            {/* Meniscus Pool at Bottom of Drip Chamber */}
                            <div
                              className="w-full h-2.5 opacity-75 border-t border-white/40"
                              style={{ backgroundColor: fluidColor }}
                            />
                          </div>
                          {/* Translucent PVC Down-Tube with Specular Highlight */}
                          <div className="relative w-1.5 h-4 rounded-xs bg-slate-300/35 border-x border-white/35 overflow-hidden flex justify-center">
                            <div
                              className="w-1 h-full"
                              style={{
                                backgroundColor:
                                  pump.containerLoaded && pump.ivTubeConnected
                                    ? fluidColor
                                    : '#475569',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Ready-Rack OPS Pre-Filled Syringe Holder on Top Hook for Perfusor® Slots 3 & 4 */
                      <div className="w-full max-w-[168px] flex flex-col items-center">
                        <div
                          onClick={() => openEditor(pump.id, 'IV_DISPOSABLES')}
                          className="w-full h-[108px] rounded-xl bg-[#161b24]/95 border border-slate-600/80 hover:border-emerald-400 p-2 flex flex-col justify-between cursor-pointer shadow-md"
                          title="Click to configure B. Braun Original Perfusor® Syringe (10 / 20 / 50 mL)"
                        >
                          <div className="flex items-center justify-between text-[8.5px] font-mono text-slate-400">
                            <span>SLOT {pump.bayIndex} OPS</span>
                            <span className="text-emerald-300 font-bold">
                              {pump.syringeSizeMl} mL
                            </span>
                          </div>
                          <div className="text-[10.5px] font-extrabold text-white truncate">
                            {drug.tallManName}
                          </div>
                          <div className="text-[9px] font-mono text-slate-300">
                            {pump.containerLoaded
                              ? `${pump.volumeRemainingMl.toFixed(1)} mL in syringe`
                              : 'Syringe ejected'}
                          </div>

                          <div className="flex items-center justify-between gap-1 text-[8.5px] font-mono font-bold">
                            {([20, 50] as SyringeSizeMl[]).map((sz) => (
                              <button
                                key={sz}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdatePump(pump.id, (prev) => ({
                                    ...prev,
                                    containerLoaded: true,
                                    disposableLocked: true,
                                    syringeSizeMl: sz,
                                    containerTotalMl: sz,
                                    volumeRemainingMl: sz,
                                    vtbiMl: sz,
                                    alarmState: 'NONE',
                                    alarmMessage: null,
                                  }));
                                  notify(`Slot ${pump.bayIndex}: Loaded fresh ${sz} mL OPS Syringe`);
                                }}
                                className={`px-1.5 py-0.5 rounded cursor-pointer ${
                                  pump.containerLoaded && pump.syringeSizeMl === sz
                                    ? 'bg-[#00a676] text-white'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                              >
                                {sz}mL
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleContainerLoaded(pump);
                              }}
                              className="px-1.5 py-0.5 bg-slate-800 hover:bg-rose-700 text-slate-200 rounded cursor-pointer"
                            >
                              {pump.containerLoaded ? 'Eject' : 'Load'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Central Vertical Stainless Pole Segment Connecting Crossbar to Spaceplus Tower */}
            <div className="w-5 h-5 bg-gradient-to-r from-[#64748b] via-[#f8fafc] to-[#475569] border-x border-slate-500 -mt-3" />
          </div>
        )}

        {/* 2. CENTER WORKBENCH: SPACE®PLUS 4-BAY TOWER + INTERACTIVE IV TUBING HARNESS + PATIENT CVC MANIFOLD */}
        <div className="w-full flex flex-col xl:flex-row items-stretch justify-center gap-0">
          {/* B. Braun Space®plus 4-Slot Tower Assembly */}
          <div className="flex-1 max-w-[820px] flex flex-col items-center">
            {towerViewMode === 'TOWER_4BAY' && (
              <>
                {/* Top Molded Silver-Grey Carry Handle */}
                <div className="w-64 h-8 rounded-t-3xl border-x-[10px] border-t-[8px] border-[#cbd5e1] shadow-inner -mb-1" />

                {/* White Space®plus Station Crown with Official Uploaded B|BRAUN Logo & Glowing Status Light Bar */}
                <div className="w-full bg-gradient-to-b from-[#ffffff] via-[#f1f5f9] to-[#e2e8f0] rounded-t-2xl border border-[#cbd5e1] px-4 py-2 shadow-md flex items-center justify-between gap-4">
                  {/* Left Station Status Icons */}
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-600 border border-slate-300 rounded px-2.5 py-1 bg-white/90">
                    <BbraunSignalBarsSvg className="h-3 w-4 text-slate-700" />
                    <span>{acMainsConnected ? 'AC MAINS OK' : `BATT ${Math.round(batteryPct)}%`}</span>
                    <BbraunPowerSvg className="h-3.5 w-3.5 text-emerald-600" />
                  </div>

                  {/* Wide Translucent Space®plus Top Status Light Bar + Official B|BRAUN Tab */}
                  <div className="flex-1 max-w-md flex flex-col items-end">
                    <div className="mr-3 bg-[#00a676] px-1.5 py-0.5 rounded-t-xs">
                      <img
                        src={BBRAUN_LOGO_SRC}
                        alt="B. Braun"
                        className="h-3 w-auto object-contain"
                      />
                    </div>
                    <div
                      className={`w-full h-6 rounded-md border transition-all ${
                        anyCritical
                          ? 'bg-gradient-to-r from-red-600 via-red-400 to-red-600 border-red-700 shadow-[0_0_20px_rgba(239,68,68,0.8)]'
                          : anyPreAlarm
                            ? 'bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 border-amber-600 shadow-[0_0_16px_rgba(245,158,11,0.7)]'
                            : 'bg-gradient-to-r from-[#2dd4bf] via-[#67e8f9] to-[#2dd4bf] border-teal-500 shadow-[0_0_18px_rgba(45,212,191,0.65)]'
                      }`}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Stacked Pump Bays + Left Vertical Stainless Pole & Heavy-Duty Pole Clamp */}
            <div className="relative w-full flex items-stretch">
              {towerViewMode === 'TOWER_4BAY' && (
                <div className="hidden lg:flex flex-col items-center justify-center w-12 bg-gradient-to-b from-[#d8dee6] to-[#bfc8d4] rounded-bl-2xl border-l border-b border-[#adb8c6] relative shrink-0">
                  {/* Vertical Stainless Pole Running Behind Clamp */}
                  <div className="absolute -left-5 inset-y-0 w-4 bg-gradient-to-r from-[#64748b] via-[#f1f5f9] to-[#475569] border-x border-slate-600" />
                  {/* Molded Grey B. Braun Pole Clamp Knob */}
                  <div className="absolute -left-14 h-11 w-14 rounded-l-full bg-gradient-to-b from-[#d1d5db] via-[#9ca3af] to-[#6b7280] border border-slate-500 shadow-md flex items-center justify-start pl-2 text-[7.5px] font-mono font-bold text-white z-10">
                    CLAMP
                  </div>
                  <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-mono font-bold text-slate-600 tracking-widest">
                    SPACEPLUS STATION
                  </span>
                </div>
              )}

              {/* 4 Stacked Space®plus Pumps */}
              <div className="flex-1 min-w-0 flex flex-col gap-2 py-2 px-1 sm:px-2 bg-[#e8edf3]/30 rounded-b-2xl">
                {pumps.map((pump) => renderSinglePumpUnit(pump))}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: INTERACTIVE IV GIVING SET TUBING SVG + MULTI-LUMEN PATIENT CVC MANIFOLD */}
          {towerViewMode === 'TOWER_4BAY' && (
            <div className="w-full xl:w-[295px] flex xl:flex-row flex-col items-center justify-between pt-4 xl:pt-14">
              {/* Upgraded Multi-Layer Translucent Medical PVC IV Tubing SVG + Roller Clamps + Luer Hubs */}
              <svg
                viewBox="0 0 104 680"
                className="hidden xl:block w-[104px] h-[680px] shrink-0 overflow-visible"
              >
                {pumps.map((pump, idx) => {
                  const drug = getDrugById(pump.drugId);
                  const lineColor = getFluidLineColor(drug.bannerTheme);
                  const startY = 86 + idx * 166;
                  const endY = 175 + idx * 96;
                  const midX = 50;
                  const midY = (startY + endY) * 0.5;
                  const curvePath = `M 0 ${startY} C 42 ${startY}, 56 ${endY}, 98 ${endY}`;
                  const isFlowing =
                    pump.poweredOn &&
                    pump.running &&
                    pump.containerLoaded &&
                    pump.ivTubeConnected &&
                    !pump.occluded;

                  return (
                    <g
                      key={`tube-${pump.id}`}
                      onClick={() => toggleIvTube(pump)}
                      className="cursor-pointer group"
                    >
                      <title>
                        {pump.ivTubeConnected
                          ? `Slot ${pump.bayIndex} PVC IV Line Connected (${drug.tallManName}) — Click to unplug`
                          : `Slot ${pump.bayIndex} IV Line Disconnected — Click to Luer-Lock to Bed 1 · John Doe CVC`}
                      </title>
                      {pump.ivTubeConnected ? (
                        <>
                          {/* 1. Soft Depth Drop Shadow */}
                          <path
                            d={`M 0 ${startY + 3} C 42 ${startY + 3}, 56 ${endY + 3}, 98 ${endY + 3}`}
                            fill="none"
                            stroke="rgba(2, 6, 23, 0.65)"
                            strokeWidth="8.5"
                            strokeLinecap="round"
                          />
                          {/* 2. Frosted Translucent Medical PVC Outer Wall */}
                          <path
                            d={curvePath}
                            fill="none"
                            stroke="#e2e8f0"
                            strokeOpacity="0.48"
                            strokeWidth="7.5"
                            strokeLinecap="round"
                          />
                          {/* 3. Continuous Drug-Tinted Fluid Lumen */}
                          <path
                            d={curvePath}
                            fill="none"
                            stroke={pump.containerLoaded ? lineColor : '#334155'}
                            strokeOpacity={pump.containerLoaded ? '0.68' : '0.4'}
                            strokeWidth="3.8"
                            strokeLinecap="round"
                          />
                          {/* 4. Animated Flowing Micro-Stream Inside Lumen When Infusing */}
                          {isFlowing && (
                            <path
                              d={curvePath}
                              fill="none"
                              stroke="#ffffff"
                              strokeOpacity="0.82"
                              strokeWidth="1.9"
                              strokeDasharray="6 10"
                              className="iv-fluid-stream"
                            />
                          )}
                          {/* 5. Crisp Glassy PVC Specular Highlight */}
                          <path
                            d={`M 2 ${startY - 1.6} C 42 ${startY - 1.6}, 56 ${endY - 1.6}, 96 ${endY - 1.6}`}
                            fill="none"
                            stroke="#ffffff"
                            strokeOpacity="0.42"
                            strokeWidth="1.1"
                            strokeLinecap="round"
                          />
                          {/* 6. Inline Medical Roller Clamp / Slide Clamp */}
                          <g transform={`translate(${midX - 7}, ${midY - 8})`}>
                            <rect
                              x="0"
                              y="0"
                              width="14"
                              height="16"
                              rx="2.5"
                              fill={pump.occluded ? '#ef4444' : '#f8fafc'}
                              stroke="#334155"
                              strokeWidth="1.2"
                            />
                            <circle
                              cx="7"
                              cy={pump.occluded ? '11.5' : '5.5'}
                              r="2.6"
                              fill={pump.occluded ? '#7f1d1d' : '#0284c7'}
                            />
                          </g>
                          {/* 7. Threaded Luer-Lock Male Collar at Patient CVC Port */}
                          <rect
                            x="88"
                            y={endY - 5.5}
                            width="13"
                            height="11"
                            rx="2"
                            fill={lineColor}
                            stroke="#0f172a"
                            strokeWidth="1.3"
                          />
                          <line
                            x1="92"
                            y1={endY - 5}
                            x2="92"
                            y2={endY + 5}
                            stroke="#ffffff"
                            strokeOpacity="0.6"
                            strokeWidth="1"
                          />
                        </>
                      ) : (
                        /* Coiled Unplugged PVC Extension Tubing Stub with Protective Blue Luer Cap */
                        <>
                          <path
                            d={`M 0 ${startY} C 24 ${startY + 2}, 22 ${startY + 28}, 38 ${startY + 38}`}
                            fill="none"
                            stroke="#94a3b8"
                            strokeOpacity="0.55"
                            strokeWidth="6.5"
                            strokeLinecap="round"
                          />
                          <path
                            d={`M 0 ${startY} C 24 ${startY + 2}, 22 ${startY + 28}, 38 ${startY + 38}`}
                            fill="none"
                            stroke={lineColor}
                            strokeOpacity="0.55"
                            strokeWidth="2.6"
                            strokeLinecap="round"
                          />
                          <rect
                            x="33"
                            y={startY + 34}
                            width="11"
                            height="9"
                            rx="2"
                            fill="#0098d4"
                            stroke="#ffffff"
                            strokeWidth="1.2"
                          />
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Patient Multi-Lumen Central Venous Catheter (CVC) Manifold for Bed 1 · John Doe */}
              <div className="w-full xl:w-[202px] bg-[#151922] border border-[#2f384a] rounded-xl p-3 shadow-xl flex flex-col justify-between gap-2.5">
                <div className="border-b border-[#262e3d] pb-2">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400">
                    Bed 1 · John Doe
                  </div>
                  <div className="text-xs font-bold text-white mt-0.5">
                    4-Lumen Internal Jugular CVC
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Click any Luer-Lock port or PVC tube to connect or disconnect IV lines.
                  </div>
                </div>

                <div className="space-y-2.5">
                  {pumps.map((pump) => {
                    const drug = getDrugById(pump.drugId);
                    const portMeta = CVC_MANIFOLD_PORTS[pump.bayIndex];
                    const isFlowing =
                      pump.poweredOn &&
                      pump.running &&
                      pump.containerLoaded &&
                      pump.ivTubeConnected &&
                      !pump.occluded;

                    return (
                      <div
                        key={`cvc-${pump.id}`}
                        className={`rounded-lg border p-2 transition-colors ${
                          pump.ivTubeConnected
                            ? 'bg-[#1c222e] border-[#364156]'
                            : 'bg-[#182230] border-[#0098d4]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-200 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-black/50 shrink-0"
                              style={{ backgroundColor: portMeta.hubColor }}
                            />
                            Slot {pump.bayIndex}
                          </span>
                          <span
                            className={`text-[9.5px] font-mono font-bold ${
                              isFlowing
                                ? 'text-emerald-400'
                                : pump.ivTubeConnected
                                  ? 'text-slate-400'
                                  : 'text-cyan-300'
                            }`}
                          >
                            {isFlowing
                              ? `${pump.rateMlH} mL/h`
                              : pump.ivTubeConnected
                                ? 'Standby'
                                : 'UNPLUGGED'}
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-300 font-semibold truncate mb-1.5">
                          {portMeta.lumen}
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleIvTube(pump)}
                          className={`w-full py-1 px-2 rounded text-[10px] font-mono font-bold cursor-pointer ${
                            pump.ivTubeConnected
                              ? 'bg-emerald-900/70 hover:bg-rose-800 text-emerald-200 border border-emerald-600/40'
                              : 'bg-[#0098d4] hover:bg-[#38bdf8] text-black font-extrabold'
                          }`}
                        >
                          {pump.ivTubeConnected
                            ? `Connected (${drug.tallManName})`
                            : '+ Plug IV Tubing'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. BOTTOM ROLLING STAINLESS-STEEL ICU IV POLE PEDESTAL & 5-CASTER STAR BASE */}
        {towerViewMode === 'TOWER_4BAY' && (
          <div className="w-full max-w-[820px] flex flex-col items-center -mt-1 pointer-events-none">
            {/* Vertical Chrome Lower Pole Column + Black Height-Adjustment Locking Collar */}
            <div className="w-6 h-10 bg-gradient-to-r from-[#64748b] via-[#f8fafc] to-[#475569] border-x border-slate-500 flex items-center justify-center">
              <div className="w-8 h-3 rounded-xs bg-[#1e293b] border border-slate-500" />
            </div>
            {/* Weighted 5-Leg Star Base + Dual Medical Casters */}
            <div className="relative w-[420px] max-w-full flex flex-col items-center">
              <div className="w-16 h-4 rounded-t-lg bg-gradient-to-b from-[#94a3b8] to-[#475569] border border-slate-600" />
              <div className="w-full h-3.5 rounded-full bg-gradient-to-b from-[#cbd5e1] via-[#94a3b8] to-[#475569] border border-slate-600 shadow-lg" />
              <div className="w-full flex justify-between px-4 -mt-0.5">
                {[1, 2, 3, 4, 5].map((wheel) => (
                  <div key={wheel} className="flex flex-col items-center">
                    <div className="w-2.5 h-2 bg-[#64748b]" />
                    <div className="w-6 h-6 rounded-full bg-[#1e293b] border-2 border-[#94a3b8] flex items-center justify-center shadow-md">
                      <span className="w-2 h-2 rounded-full bg-[#cbd5e1]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Touchscreen Parameter / IV Disposables / Drug Library / Occlusion / Monograph Modal */}
      {editingPump && editingDrug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-lg bg-[#1c1f24] border border-[#3f4552] text-white shadow-2xl overflow-hidden">
            {/* Modal Header with Official Uploaded B|BRAUN Logo */}
            <div className="flex items-center justify-between bg-[#111317] px-4 py-2.5 border-b border-[#323741]">
              <div className="flex items-center gap-2.5">
                <img
                  src={BBRAUN_LOGO_SRC}
                  alt="B. Braun"
                  className="h-5 w-auto object-contain rounded-[1px]"
                />
                <span className="text-sm font-bold">
                  Slot {editingPump.bayIndex} · {editingPump.model} — {editingDrug.tallManName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingPumpId(null)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-[#2c313a] hover:bg-[#3c4350] rounded cursor-pointer"
              >
                <span>Close</span>
                <svg
                  viewBox="0 0 12 12"
                  className="h-3 w-3 stroke-current fill-none"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <line x1="2" y1="2" x2="10" y2="10" />
                  <line x1="10" y1="2" x2="2" y2="10" />
                </svg>
              </button>
            </div>

            {/* Sub-Navigation Tabs */}
            <div className="flex flex-wrap border-b border-[#323741] bg-[#171a1f] text-xs font-bold">
              {(
                [
                  { id: 'RATE_DOSE', label: 'Rate / Dose' },
                  { id: 'IV_DISPOSABLES', label: 'IV Bag / Syringe & Tubing' },
                  { id: 'DRUG_LIBRARY', label: 'DoseGuard™ Drugs' },
                  { id: 'OCCLUSION_LOCK', label: 'Pressure & PIN Lock' },
                  { id: 'MONOGRAPH', label: 'PubChem & openFDA' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setEditTab(t.id)}
                  className={`px-3.5 py-2.5 border-b-2 cursor-pointer ${
                    editTab === t.id
                      ? 'border-[#00a676] text-[#34d399] bg-[#21252c]'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-4">
              {editTab === 'RATE_DOSE' && (
                <div className="space-y-4">
                  {editingPump.rateMlH > editingDrug.softMaxRateMlH && !softLimitAck && (
                    <div className="p-3 rounded border border-amber-400 bg-amber-950/60 text-amber-200 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <BbraunWarnTriangleSvg className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                        <span>
                          DoseGuard™ Soft Upper Limit Exceeded (&gt; {editingDrug.softMaxRateMlH} mL/h · Hard Limit {editingDrug.hardMaxRateMlH} mL/h)
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setSoftLimitAck(true)}
                        className="px-2.5 py-1 bg-amber-400 text-black font-bold rounded cursor-pointer"
                      >
                        Override Soft Limit
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-lg bg-[#262a31] border border-[#3b414d] space-y-2">
                      <div className="text-xs text-slate-400">Flow Rate (mL/h)</div>
                      <div className="text-3xl font-mono font-bold text-white tabular-nums">
                        {editingPump.rateMlH.toFixed(2)} mL/h
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[-10, -1, -0.5, +0.5, +1, +10].map((step) => (
                          <button
                            key={step}
                            type="button"
                            onClick={() => applyNewRate(editingPump, editingPump.rateMlH + step)}
                            className="px-2.5 py-1.5 text-xs font-mono font-bold bg-[#363c46] hover:bg-[#49515e] rounded cursor-pointer"
                          >
                            {step > 0 ? `+${step}` : step}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#262a31] border border-[#3b414d] space-y-2">
                      <div className="text-xs text-slate-400">
                        Calculated Dose ({editingDrug.doseUnit} · {patientWeightKg} kg)
                      </div>
                      <div className="text-3xl font-mono font-bold text-[#38bdf8] tabular-nums">
                        {calculateDoseFromRate(
                          editingDrug,
                          editingPump.rateMlH,
                          patientWeightKg
                        ).toFixed(2)}{' '}
                        <span className="text-base">{editingDrug.doseUnit}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[0.5, 1.0, 1.5, 2.0].map((mult) => {
                          const targetDose = Number(
                            calculateDoseFromRate(
                              editingDrug,
                              editingDrug.defaultRateMlH * mult,
                              patientWeightKg
                            ).toFixed(2)
                          );
                          return (
                            <button
                              key={mult}
                              type="button"
                              onClick={() =>
                                applyNewRate(
                                  editingPump,
                                  calculateRateFromDose(editingDrug, targetDose, patientWeightKg)
                                )
                              }
                              className="px-2.5 py-1.5 text-xs font-mono bg-[#363c46] hover:bg-[#49515e] rounded cursor-pointer"
                            >
                              {targetDose} {editingDrug.doseUnit}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* VTBI & KVO */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-lg bg-[#262a31] border border-[#3b414d] text-xs">
                    <div>
                      <div className="text-slate-400 mb-1">VTBI Target (mL)</div>
                      <div className="flex items-center gap-1.5 font-mono">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdatePump(editingPump.id, (prev) => ({
                              ...prev,
                              vtbiMl: Math.max(5, prev.vtbiMl - 25),
                            }))
                          }
                          className="px-2.5 py-1 bg-[#363c46] rounded cursor-pointer"
                        >
                          -25
                        </button>
                        <span className="font-bold text-sm">{editingPump.vtbiMl.toFixed(1)} mL</span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdatePump(editingPump.id, (prev) => ({
                              ...prev,
                              vtbiMl: Math.min(prev.volumeRemainingMl, prev.vtbiMl + 25),
                            }))
                          }
                          className="px-2.5 py-1 bg-[#363c46] rounded cursor-pointer"
                        >
                          +25
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="text-slate-400 mb-1">Keep Vein Open (KVO)</div>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdatePump(editingPump.id, (prev) => ({
                            ...prev,
                            kvoEnabled: !prev.kvoEnabled,
                          }))
                        }
                        className={`px-3 py-1 font-bold rounded cursor-pointer ${
                          editingPump.kvoEnabled
                            ? 'bg-[#00a676] text-white'
                            : 'bg-[#363c46] text-slate-300'
                        }`}
                      >
                        KVO {editingPump.kvoEnabled ? `ON (${editingPump.kvoRateMlH} mL/h)` : 'OFF'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {editTab === 'IV_DISPOSABLES' && (
                <div className="space-y-4 text-xs">
                  {/* Container (IV Bag or OPS Syringe) Setup */}
                  <div className="p-4 rounded-lg bg-[#262a31] border border-[#3b414d] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-white">
                          {editingPump.pumpType === 'SYRINGE'
                            ? 'B. Braun Original Perfusor® Syringe (OPS)'
                            : 'IV Stand Fluid / Medication Bag'}
                        </div>
                        <div className="text-slate-400">
                          {editingPump.containerLoaded
                            ? `Loaded: ${editingPump.volumeRemainingMl.toFixed(1)} mL remaining of ${editingPump.containerTotalMl} mL`
                            : 'Not loaded — pump cannot infuse until container is installed'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleContainerLoaded(editingPump)}
                        className={`px-3 py-1.5 font-bold rounded cursor-pointer ${
                          editingPump.containerLoaded
                            ? 'bg-rose-700 hover:bg-rose-600 text-white'
                            : 'bg-[#00a676] hover:bg-emerald-500 text-white'
                        }`}
                      >
                        {editingPump.containerLoaded
                          ? editingPump.pumpType === 'SYRINGE'
                            ? 'Remove OPS Syringe'
                            : 'Unhang IV Bag'
                          : editingPump.pumpType === 'SYRINGE'
                            ? '+ Insert OPS Syringe'
                            : '+ Hang IV Bag on Stand'}
                      </button>
                    </div>

                    {editingPump.pumpType === 'SYRINGE' ? (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-slate-300 font-semibold">Select OPS Syringe Size:</span>
                        {([10, 20, 50] as SyringeSizeMl[]).map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => {
                              onUpdatePump(editingPump.id, (prev) => ({
                                ...prev,
                                containerLoaded: true,
                                disposableLocked: true,
                                syringeSizeMl: sz,
                                containerTotalMl: sz,
                                volumeRemainingMl: sz,
                                vtbiMl: sz,
                                alarmState: 'NONE',
                                alarmMessage: null,
                              }));
                              notify(`Slot ${editingPump.bayIndex}: Installed fresh ${sz} mL OPS Syringe`);
                            }}
                            className={`px-3 py-1.5 font-mono font-bold rounded cursor-pointer ${
                              editingPump.containerLoaded && editingPump.syringeSizeMl === sz
                                ? 'bg-[#00a676] text-white'
                                : 'bg-[#363c46] hover:bg-[#49515e] text-slate-200'
                            }`}
                          >
                            Load Fresh {sz} mL Syringe
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-slate-300 font-semibold">Hang Fresh IV Bag Size:</span>
                        {[100, 250, 500, 1000].map((bagMl) => (
                          <button
                            key={bagMl}
                            type="button"
                            onClick={() => {
                              onUpdatePump(editingPump.id, (prev) => ({
                                ...prev,
                                containerLoaded: true,
                                disposableLocked: true,
                                containerTotalMl: bagMl,
                                volumeRemainingMl: bagMl,
                                vtbiMl: bagMl,
                                alarmState: 'NONE',
                                alarmMessage: null,
                              }));
                              notify(`Slot ${editingPump.bayIndex}: Hung fresh ${bagMl} mL IV Bag on stand`);
                            }}
                            className={`px-3 py-1.5 font-mono font-bold rounded cursor-pointer ${
                              editingPump.containerLoaded && editingPump.containerTotalMl === bagMl
                                ? 'bg-[#00a676] text-white'
                                : 'bg-[#363c46] hover:bg-[#49515e] text-slate-200'
                            }`}
                          >
                            Hang {bagMl} mL Bag
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            onUpdatePump(editingPump.id, (prev) => ({
                              ...prev,
                              intermittentMode: !prev.intermittentMode,
                            }))
                          }
                          className={`px-3 py-1.5 font-bold rounded cursor-pointer ${
                            editingPump.intermittentMode
                              ? 'bg-sky-600 text-white'
                              : 'bg-[#363c46] text-slate-300'
                          }`}
                        >
                          INTERMIT {editingPump.intermittentMode ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* IV Giving Set / Extension Tubing Connection */}
                  <div className="p-4 rounded-lg bg-[#262a31] border border-[#3b414d] flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-white">
                        {editingPump.pumpType === 'SYRINGE'
                          ? 'Perfusor® Micro-Bore PE Extension Line'
                          : 'Infusomat® Space Line IV Giving Set'}
                      </div>
                      <div className="text-slate-400">
                        Target Port: <strong>{CVC_MANIFOLD_PORTS[editingPump.bayIndex].lumen}</strong> · Status:{' '}
                        <strong className={editingPump.ivTubeConnected ? 'text-emerald-400' : 'text-cyan-300'}>
                          {editingPump.ivTubeConnected ? 'Luer-Locked & Primed' : 'Disconnected'}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onUpdatePump(editingPump.id, (prev) => ({
                            ...prev,
                            ivTubePrimed: true,
                            volumeRemainingMl: Math.max(0, prev.volumeRemainingMl - 1.5),
                          }));
                          notify(`Slot ${editingPump.bayIndex}: Flushed 1.5 mL to prime IV line`);
                        }}
                        disabled={!editingPump.containerLoaded}
                        className="px-3 py-1.5 font-bold bg-[#363c46] hover:bg-[#49515e] text-white rounded disabled:opacity-40 cursor-pointer"
                      >
                        Prime Line (1.5 mL)
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleIvTube(editingPump)}
                        className={`px-3 py-1.5 font-bold rounded cursor-pointer ${
                          editingPump.ivTubeConnected
                            ? 'bg-rose-700 hover:bg-rose-600 text-white'
                            : 'bg-[#0098d4] hover:bg-[#38bdf8] text-black font-extrabold'
                        }`}
                      >
                        {editingPump.ivTubeConnected
                          ? 'Disconnect IV Tube'
                          : '+ Connect IV Tube to Patient CVC'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {editTab === 'DRUG_LIBRARY' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ICU_DRUG_LIBRARY.filter((d) =>
                    d.pumpTypeSuitability.includes(editingPump.pumpType)
                  ).map((d) => {
                    const b = getBannerStyle(d.bannerTheme);
                    const isCurrent = d.id === editingPump.drugId;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          clinicalAudio.playKeyClick(true);
                          onUpdatePump(editingPump.id, (prev) => ({
                            ...prev,
                            drugId: d.id,
                            rateMlH: d.defaultRateMlH,
                            containerLoaded: true,
                            containerTotalMl: d.standardDiluentVolumeMl,
                            volumeRemainingMl: d.standardDiluentVolumeMl,
                            vtbiMl: d.standardDiluentVolumeMl,
                            intermittentMode: Boolean(
                              d.intermittentCapable && d.id === 'amiodarone'
                            ),
                            alarmState: 'NONE',
                            alarmMessage: null,
                          }));
                          setEditTab('RATE_DOSE');
                        }}
                        className={`flex flex-col rounded-md overflow-hidden border text-left cursor-pointer ${
                          isCurrent ? 'border-2 border-[#00a676]' : 'border-[#3b414d]'
                        }`}
                      >
                        <div
                          style={b.bgStyle}
                          className={`px-3 py-1.5 font-extrabold text-xs flex justify-between ${b.className}`}
                        >
                          <span>{d.tallManName}</span>
                          <span>{d.concentrationLabel}</span>
                        </div>
                        <div className="p-2.5 bg-[#262a31] text-[11px] text-slate-300 space-y-1">
                          <div className="font-mono text-emerald-300">
                            Default: {d.defaultRateMlH} mL/h · Max Hard: {d.hardMaxRateMlH} mL/h ({d.doseUnit})
                          </div>
                          <div className="text-slate-400 line-clamp-1">{d.clinicalNote}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {editTab === 'OCCLUSION_LOCK' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-lg bg-[#262a31] border border-[#3b414d] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold">
                          Downstream Occlusion Pressure Threshold (L1 – L9)
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Current Line Pressure: {editingPump.linePressureMmHg} mmHg · Alarm Threshold:{' '}
                          {OCCLUSION_PRESSURE_MMHG[editingPump.occlusionLevel]} mmHg
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          editingPump.occluded
                            ? onClearDownstreamOcclusion(editingPump.id)
                            : onTriggerDownstreamOcclusion(editingPump.id)
                        }
                        className={`px-3 py-1.5 text-xs font-bold rounded cursor-pointer ${
                          editingPump.occluded
                            ? 'bg-emerald-600 text-white'
                            : 'bg-rose-600 hover:bg-rose-500 text-white'
                        }`}
                      >
                        {editingPump.occluded
                          ? 'Release Line Kink (Anti-Bolus Rewind)'
                          : 'Simulate Distal IV Line Kink'}
                      </button>
                    </div>

                    <div className="grid grid-cols-9 gap-1">
                      {([1, 2, 3, 4, 5, 6, 7, 8, 9] as OcclusionLevel[]).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() =>
                            onUpdatePump(editingPump.id, (prev) => ({
                              ...prev,
                              occlusionLevel: lvl,
                            }))
                          }
                          className={`py-1.5 text-xs font-mono font-bold rounded cursor-pointer ${
                            editingPump.occlusionLevel === lvl
                              ? 'bg-[#00a676] text-white'
                              : 'bg-[#363c46] text-slate-300'
                          }`}
                        >
                          <div>L{lvl}</div>
                          <div className="text-[9px] opacity-80">
                            {OCCLUSION_PRESSURE_MMHG[lvl]}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* B. Braun DataLock Level 0/1/2 with PIN 9119 */}
                  <div className="p-3.5 rounded-lg bg-[#262a31] border border-[#3b414d] space-y-2">
                    <div className="text-xs font-bold">
                      Keypad DataLock Security (Clinical PIN:{' '}
                      <span className="font-mono text-emerald-300">9119</span>)
                    </div>
                    {pinError && <div className="text-xs font-bold text-rose-400">{pinError}</div>}
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="password"
                        maxLength={4}
                        value={pinEntry}
                        onChange={(e) => setPinEntry(e.target.value)}
                        placeholder="Enter 9119"
                        className="w-28 bg-[#16191f] border border-slate-600 rounded px-2.5 py-1 text-xs font-mono text-white"
                      />
                      {([0, 1, 2] as DataLockLevel[]).map((lk) => (
                        <button
                          key={lk}
                          type="button"
                          onClick={() => {
                            if (pinEntry !== '9119' && editingPump.dataLockLevel > 0 && lk === 0) {
                              setPinError('Invalid PIN — Enter 9119 to unlock keypad');
                              return;
                            }
                            setPinError(null);
                            onUpdatePump(editingPump.id, (prev) => ({
                              ...prev,
                              dataLockLevel: lk,
                            }));
                          }}
                          className={`px-3 py-1 text-xs font-bold rounded cursor-pointer ${
                            editingPump.dataLockLevel === lk
                              ? 'bg-[#00a676] text-white'
                              : 'bg-[#363c46] text-slate-300'
                          }`}
                        >
                          {lk === 0 ? 'Unlocked (0)' : `DataLock Level ${lk}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {editTab === 'MONOGRAPH' && (
                <div className="h-[440px] rounded overflow-hidden border border-slate-600">
                  <ClinicalInformaticsPC
                    selectedDrugId={editingPump.drugId}
                    onSelectDrugId={(nextId) =>
                      onUpdatePump(editingPump.id, (prev) => ({ ...prev, drugId: nextId }))
                    }
                    pumps={pumps}
                    patientWeightKg={patientWeightKg}
                    onClose={() => setEditTab('RATE_DOSE')}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
