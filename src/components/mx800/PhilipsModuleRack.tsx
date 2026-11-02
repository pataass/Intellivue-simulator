import React, { useState } from 'react';
import { PatientVitals, PhilipsHardwareModule } from '../../types/clinical';
import { clinicalAudio } from '../../services/audioSynth';

interface PhilipsModuleRackProps {
  modules: PhilipsHardwareModule[];
  vitals: PatientVitals;
  compactMode?: boolean;
  onToggleModulePlugged: (slotId: string) => void;
  onToggleModuleCableWired: (slotId: string) => void;
  onBulkWireModules?: (wired: boolean) => void;
  onTriggerNbp: (stat?: boolean) => void;
  onStopNbp: () => void;
  onZeroPressure: (channel: 'ABP' | 'PAP' | 'CVP' | 'ICP' | 'ALL') => void;
  onStartCoMeasurement: () => void;
  onReturnToMonitor?: () => void;
}

const DefibProofHeartSvg: React.FC<{ className?: string }> = ({
  className = 'h-3 w-6',
}) => (
  <svg
    viewBox="0 0 28 14"
    className={`${className} shrink-0`}
    aria-hidden="true"
  >
    <line x1="3" y1="2" x2="3" y2="12" stroke="currentColor" strokeWidth="1.4" />
    <line x1="0.5" y1="7" x2="5.5" y2="7" stroke="currentColor" strokeWidth="1.2" />
    <path
      d="M14 11.4 C14 11.4 8.6 7.9 8.6 4.8 C8.6 3.1 10 2 11.5 2 C12.6 2 13.5 2.6 14 3.5 C14.5 2.6 15.4 2 16.5 2 C18 2 19.4 3.1 19.4 4.8 C19.4 7.9 14 11.4 14 11.4 Z"
      fill="currentColor"
    />
    <line x1="25" y1="2" x2="25" y2="12" stroke="currentColor" strokeWidth="1.4" />
    <line x1="22.5" y1="7" x2="27.5" y2="7" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

const CircularMultipoleSocket: React.FC<{
  bgClass: string;
  pinCount?: number;
  wired: boolean;
  pluggedIn: boolean;
  cableColorHex: string;
  cableName: string;
  onToggleWire: (e: React.MouseEvent) => void;
}> = ({
  bgClass,
  pinCount = 8,
  wired,
  pluggedIn,
  cableColorHex,
  cableName,
  onToggleWire,
}) => {
  return (
    <button
      type="button"
      onClick={onToggleWire}
      disabled={!pluggedIn}
      title={
        !pluggedIn
          ? 'Insert module into FMS-8 slot first'
          : wired
            ? `${cableName} WIRED — Click socket to unplug cable`
            : `${cableName} UNWIRED — Click socket to wire patient cable`
      }
      className={`relative h-[52px] w-full ${bgClass} border-t border-black/30 flex items-center justify-center shadow-inner cursor-pointer group disabled:cursor-not-allowed`}
    >
      <div
        className={`h-9 w-9 rounded-full bg-[#202226] border-2 ${
          !pluggedIn
            ? 'border-black/50'
            : wired
              ? 'border-black/80 shadow-[0_2px_6px_rgba(0,0,0,0.65)]'
              : 'border-cyan-300 ring-2 ring-cyan-400/60'
        } flex items-center justify-center transition-all group-hover:scale-105`}
      >
        {wired && pluggedIn ? (
          /* Molded Patient Cable Plug Inserted into Multipole Socket */
          <div className="relative h-7 w-7 rounded-full bg-gradient-to-b from-[#3d424b] to-[#191b20] border border-white/25 flex items-center justify-center shadow-md">
            <span
              className="h-3.5 w-3.5 rounded-full border border-black/60 shadow-inner"
              style={{ backgroundColor: cableColorHex }}
            />
          </div>
        ) : (
          /* Exposed Multipole Female Pin Holes (Unwired) */
          <div className="relative h-6 w-6 rounded-full bg-[#363940] border border-black/70 flex items-center justify-center">
            <div className="grid grid-cols-3 gap-0.5">
              {Array.from({ length: Math.min(9, pinCount) }).map((_, idx) => (
                <span key={idx} className="h-1 w-1 rounded-full bg-[#0b0c0e]" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tiny Wire Status Tag */}
      {pluggedIn && (
        <span
          className={`absolute bottom-0.5 right-1 px-1 text-[7px] font-mono font-bold leading-tight rounded-[2px] ${
            wired
              ? 'bg-black/65 text-emerald-300'
              : 'bg-[#0098d4] text-black font-extrabold'
          }`}
        >
          {wired ? 'WIRED' : 'WIRE'}
        </span>
      )}
    </button>
  );
};

export const PhilipsModuleRack: React.FC<PhilipsModuleRackProps> = ({
  modules,
  vitals,
  compactMode = false,
  onToggleModulePlugged,
  onToggleModuleCableWired,
  onBulkWireModules,
  onTriggerNbp,
  onStopNbp,
  onZeroPressure,
  onStartCoMeasurement,
  onReturnToMonitor,
}) => {
  const [selectedSlotId, setSelectedSlotId] = useState<string>('mms-m3001a');
  const [lastActionToast, setLastActionToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    clinicalAudio.playKeyClick(true);
    setLastActionToast(msg);
  };

  const mmsMain = modules.find((m) => m.slotId === 'mms-m3001a');
  const mmsExt = modules.find((m) => m.slotId === 'mms-ext-m3015a');
  const fmsModules = modules.filter((m) => m.slotId.startsWith('fms-'));
  const selectedModule =
    modules.find((m) => m.slotId === selectedSlotId) ?? modules[0];

  const dockedCount = modules.filter((m) => m.pluggedIn).length;
  const wiredCount = modules.filter((m) => m.pluggedIn && m.cableWired).length;

  const handleModuleButton = (mod: PhilipsHardwareModule, btn: string) => {
    if (!mod.pluggedIn) {
      triggerToast(`${mod.mNumber} is unplugged — insert module first`);
      return;
    }
    if (!mod.cableWired) {
      triggerToast(`! ${mod.mNumber} patient cable is unwired — click socket to wire cable`);
      return;
    }

    if (mod.parameterKey === 'NBP') {
      if (btn === 'START') {
        onTriggerNbp(false);
        triggerToast('M1008B: NBP Single Cuff Inflation Started');
      } else if (btn === 'STAT') {
        onTriggerNbp(true);
        triggerToast('M1008B: 5-Minute NBP STAT Series Activated');
      } else if (btn === 'STOP') {
        onStopNbp();
        triggerToast('M1008B: NBP Cuff Deflated / Stopped');
      } else {
        onTriggerNbp(false);
        triggerToast('M1008B: NBP Measurement Triggered');
      }
    } else if (mod.parameterKey === 'ABP') {
      if (btn === 'Zero') {
        onZeroPressure('ABP');
        triggerToast('M1006B #1: Radial ABP Zeroed to 0 mmHg');
      } else {
        triggerToast(
          `M1006B #1: ABP ${vitals.abpSys}/${vitals.abpDia} (${vitals.abpMap}) mmHg`
        );
      }
    } else if (mod.parameterKey === 'PAP_CVP') {
      if (btn === 'Zero') {
        onZeroPressure('PAP');
        onZeroPressure('CVP');
        triggerToast('M1006B #2: PAP & CVP Transducers Zeroed');
      } else {
        triggerToast(
          `M1006B #2: PAP ${vitals.papSys}/${vitals.papDia} · CVP (${vitals.cvp}) mmHg`
        );
      }
    } else if (mod.parameterKey === 'ICP') {
      if (btn === 'Zero') {
        onZeroPressure('ICP');
        triggerToast('M1006B #3: Parenchymal ICP Zeroed');
      } else {
        triggerToast(`M1006B #3: ICP (${vitals.icp}) · CPP ${vitals.cpp} mmHg`);
      }
    } else if (mod.parameterKey === 'CO') {
      onStartCoMeasurement();
      triggerToast('M1012A: 10 mL Iced Bolus Thermodilution C.O. Started');
    } else if (mod.parameterKey === 'TEMP') {
      triggerToast(
        `M1029A: Dual Temp Tcore ${vitals.tempCoreC.toFixed(1)}°C / Tskin ${vitals.tempSkinC.toFixed(1)}°C`
      );
    } else if (mod.parameterKey === 'EEG') {
      triggerToast(`M1027A: 2-Ch EEG Impedance < 5 kΩ · BIS ${vitals.eegBis}`);
    } else if (mod.parameterKey === 'MMS') {
      if (btn === 'Zero') {
        onZeroPressure('ALL');
        triggerToast('M3001A MMS: All Pressure Channels Zeroed');
      } else {
        onTriggerNbp(false);
        triggerToast('M3001A MMS: NBP Triggered');
      }
    } else if (mod.parameterKey === 'CO2') {
      triggerToast(
        `M3015A: Sidestream CO₂ Zero Calibrated (etCO₂ ${vitals.etco2} mmHg)`
      );
    }
  };

  // Compute horizontal X anchors (in 960px SVG coordinate space) for cable harness visualization
  const cableCoordinateSpecs: {
    mod: PhilipsHardwareModule;
    portX: number;
    hookX: number;
  }[] = [
    ...(mmsMain ? [{ mod: mmsMain, portX: 42, hookX: 255 }] : []),
    ...(mmsExt ? [{ mod: mmsExt, portX: 126, hookX: 255 }] : []),
    ...fmsModules.map((m, idx) => {
      // M1008B is double width (176px), single modules are 88px
      const xCenters = [292, 430, 522, 614, 706, 798, 886];
      const hookCenters = [375, 495, 495, 615, 735, 735, 855];
      return {
        mod: m,
        portX: xCenters[idx] ?? 500,
        hookX: hookCenters[idx] ?? 615,
      };
    }),
  ];

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* Top Action / Status Strip */}
      <div className="w-full max-w-[1040px] mb-3 flex flex-wrap items-center justify-between gap-2 bg-[#161920] border border-[#2d3340] px-4 py-2.5 text-slate-200 rounded-md">
        <div>
          <div className="text-sm font-bold text-white flex flex-wrap items-center gap-2">
            <span>
              Philips M8048A Flexible Module Server (FMS-8) + M3001A MMS &amp; M3015A Extension
            </span>
            <span className="text-xs font-mono font-normal text-sky-300">
              · {dockedCount}/{modules.length} Docked · {wiredCount}/{modules.length} Patient Cables Wired
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Click any module&apos;s <strong>front colored connector socket</strong> to wire/unwire its patient sensor cable, click the top M-number latch to hot-swap modules, or press white membrane keys (<span className="font-mono text-white">START</span>, <span className="font-mono text-white">STAT</span>, <span className="font-mono text-white">Zero</span>, <span className="font-mono text-white">C.O.</span>).
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {lastActionToast && (
            <span className="px-2.5 py-1 bg-[#1e293b] border border-sky-500/40 text-sky-200 font-mono text-xs rounded">
              {lastActionToast}
            </span>
          )}

          {onBulkWireModules && (
            <>
              <button
                type="button"
                onClick={() => {
                  onBulkWireModules(false);
                  triggerToast('All patient cables unwired — click each socket to wire modules');
                }}
                className="px-2.5 py-1.5 text-xs font-bold bg-[#262b36] hover:bg-[#323947] text-cyan-300 border border-cyan-500/40 rounded cursor-pointer"
              >
                Unwire All Cables
              </button>
              <button
                type="button"
                onClick={() => {
                  onBulkWireModules(true);
                  triggerToast('All MMS & FMS-8 patient sensor cables wired');
                }}
                className="px-2.5 py-1.5 text-xs font-bold bg-emerald-800 hover:bg-emerald-700 text-white border border-emerald-500/50 rounded cursor-pointer"
              >
                Wire All Cables
              </button>
            </>
          )}

          {!compactMode && onReturnToMonitor && (
            <button
              type="button"
              onClick={onReturnToMonitor}
              className="px-3 py-1.5 text-xs font-bold bg-[#1f64cb] hover:bg-[#2b7de9] text-white border border-[#7fb3ff] rounded cursor-pointer"
            >
              Open IntelliVue Screen
            </button>
          )}
        </div>
      </div>

      {/* Physical 3D Brushed-Silver Hardware Assembly + Interactive Patient Cable Harness */}
      <div className="w-full max-w-[1040px] overflow-x-auto pb-2">
        <div className="min-w-[980px] flex flex-col items-center">
          <div className="flex items-stretch">
            {/* LEFT SECTION: Docked M3001A MMS + M3015A CO2 Extension (Wider 84px each so all letters & M-numbers fit cleanly!) */}
            {[mmsMain, mmsExt].map(
              (mms) =>
                mms && (
                  <div
                    key={mms.slotId}
                    onClick={() => setSelectedSlotId(mms.slotId)}
                    className={`relative w-[84px] flex flex-col justify-between rounded-l-md bg-gradient-to-b from-[#eaedf2] via-[#d7dbe2] to-[#c2c7d0] border-2 ${
                      selectedSlotId === mms.slotId
                        ? 'border-[#2563eb]'
                        : 'border-[#8f96a3]'
                    } shadow-lg transition-all ${
                      mms.pluggedIn ? 'opacity-100' : 'opacity-45 translate-y-2 grayscale'
                    } cursor-pointer mr-0.5`}
                  >
                    {/* Teal Quick-Release Top Latch + Full Unclipped M-Number */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clinicalAudio.playKeyClick();
                        onToggleModulePlugged(mms.slotId);
                        triggerToast(
                          mms.pluggedIn
                            ? `${mms.mNumber} Ejected from MMS Mount`
                            : `${mms.mNumber} Docked into MMS Mount`
                        );
                      }}
                      className="h-5 w-full bg-[#38b2ac] hover:bg-[#2c9a94] px-1 text-[9.5px] font-mono font-extrabold text-slate-950 flex items-center justify-center border-b border-teal-900/40 whitespace-nowrap cursor-pointer"
                      title={
                        mms.pluggedIn
                          ? `Click latch to unplug ${mms.mNumber}`
                          : `Click latch to insert ${mms.mNumber}`
                      }
                    >
                      {mms.pluggedIn ? mms.mNumber : 'INSERT'}
                    </button>

                    {/* Silkscreen Sub-Header (Cleanly Fitted) */}
                    <div className="px-1.5 pt-1 text-center border-b border-black/10 pb-0.5">
                      <div className="text-[10px] font-extrabold text-neutral-900 leading-none whitespace-nowrap">
                        {mms.shortLabel}
                      </div>
                      <div className="text-[8px] font-mono font-bold text-neutral-600 leading-tight whitespace-nowrap">
                        {mms.slotId === 'mms-m3001a' ? 'ECG/SpO₂/NBP' : 'Sidestream CO₂'}
                      </div>
                    </div>

                    {/* 4 Stacked Color-Coded Multipole Front Ports — Clickable to Wire/Unwire Patient Trunk Cable! */}
                    <button
                      type="button"
                      disabled={!mms.pluggedIn}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleModuleCableWired(mms.slotId);
                        triggerToast(
                          mms.cableWired
                            ? `${mms.mNumber}: ${mms.cableName} Unwired`
                            : `${mms.mNumber}: ${mms.cableName} Wired`
                        );
                      }}
                      title={
                        !mms.pluggedIn
                          ? 'Insert MMS module first'
                          : mms.cableWired
                            ? `${mms.cableName} WIRED — Click ports to unwire`
                            : `${mms.cableName} UNWIRED — Click ports to wire patient cables`
                      }
                      className={`flex-1 py-1.5 px-1.5 flex flex-col justify-around items-center cursor-pointer hover:bg-black/5 ${
                        mms.pluggedIn && !mms.cableWired
                          ? 'ring-2 ring-inset ring-[#0098d4]'
                          : ''
                      }`}
                    >
                      {mms.slotId === 'mms-m3001a' ? (
                        <>
                          {[
                            { lbl: 'NBP/P', bg: '#8b3d88', plug: '#c084fc' },
                            { lbl: 'Temp', bg: '#7c5841', plug: '#d97706' },
                            { lbl: 'SpO₂', bg: '#2f6f9f', plug: '#38bdf8' },
                            { lbl: 'ECG', bg: '#4b5563', plug: '#22c55e' },
                          ].map((port) => (
                            <div key={port.lbl} className="flex items-center justify-between w-full px-1">
                              <span className="text-[8px] font-extrabold text-neutral-800 whitespace-nowrap">
                                {port.lbl}
                              </span>
                              <div
                                className="h-6 w-6 rounded-full border border-black/60 flex items-center justify-center shadow-inner"
                                style={{ backgroundColor: port.bg }}
                              >
                                {mms.cableWired && mms.pluggedIn ? (
                                  <span
                                    className="h-3.5 w-3.5 rounded-full border border-black/70 shadow"
                                    style={{ backgroundColor: port.plug }}
                                  />
                                ) : (
                                  <span className="h-2.5 w-2.5 rounded-full bg-neutral-950" />
                                )}
                              </div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <>
                          {[
                            { lbl: 'Press', bg: '#8b3d88', plug: '#e879f9' },
                            { lbl: 'Temp', bg: '#6c4f6e', plug: '#a78bfa' },
                            { lbl: 'CO₂', bg: '#4b5563', plug: '#fde047' },
                            { lbl: 'PiCCO', bg: '#d97724', plug: '#fb923c' },
                          ].map((port) => (
                            <div key={port.lbl} className="flex items-center justify-between w-full px-1">
                              <span className="text-[8px] font-extrabold text-neutral-800 whitespace-nowrap">
                                {port.lbl}
                              </span>
                              <div
                                className="h-6 w-6 rounded-full border border-black/60 flex items-center justify-center shadow-inner"
                                style={{ backgroundColor: port.bg }}
                              >
                                {mms.cableWired && mms.pluggedIn ? (
                                  <span
                                    className="h-3.5 w-3.5 rounded-full border border-black/70 shadow"
                                    style={{ backgroundColor: port.plug }}
                                  />
                                ) : (
                                  <span className="h-2.5 w-2.5 rounded-full bg-neutral-950" />
                                )}
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </button>

                    {/* Bottom Wire Status Badge */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!mms.pluggedIn) return;
                        onToggleModuleCableWired(mms.slotId);
                      }}
                      className={`px-1 py-0.5 text-center text-[8px] font-mono font-bold border-t border-black/15 ${
                        !mms.pluggedIn
                          ? 'bg-neutral-400 text-neutral-700'
                          : mms.cableWired
                            ? 'bg-emerald-900/90 text-emerald-200'
                            : 'bg-[#0098d4] text-black font-extrabold'
                      }`}
                    >
                      {!mms.pluggedIn
                        ? 'UNPLUGGED'
                        : mms.cableWired
                          ? 'WIRED'
                          : '! CLICK TO WIRE'}
                    </div>
                  </div>
                )
            )}

            {/* Brushed Grey MMS-to-FMS Coupler Block */}
            <div className="w-7 bg-gradient-to-b from-[#9ea4ae] via-[#8b919b] to-[#747a84] border-y-2 border-l border-[#646973] shadow-inner flex items-center justify-center">
              <span className="[writing-mode:vertical-rl] rotate-180 text-[9px] font-mono font-bold text-neutral-900 tracking-widest whitespace-nowrap">
                M8048A FMS-8
              </span>
            </div>

            {/* CENTER SECTION: Brushed Aluminum 8-Slot FMS Housing */}
            <div className="bg-gradient-to-b from-[#cfd4dc] via-[#aeb4be] to-[#8c929c] p-2.5 border-y-2 border-[#7b818b] shadow-[0_18px_36px_rgba(0,0,0,0.45)] flex items-stretch gap-1.5">
              {fmsModules.map((mod) => {
                const isDouble = mod.widthSlots === 2;
                const isSelected = selectedSlotId === mod.slotId;

                return (
                  <div
                    key={mod.slotId}
                    onClick={() => setSelectedSlotId(mod.slotId)}
                    className={`relative flex flex-col justify-between rounded-xs transition-all cursor-pointer ${
                      isDouble ? 'w-[176px]' : 'w-[88px]'
                    } ${
                      mod.pluggedIn
                        ? 'opacity-100 shadow-[0_4px_10px_rgba(0,0,0,0.45)]'
                        : 'opacity-40 translate-y-2 grayscale'
                    } ${
                      isDouble
                        ? 'bg-gradient-to-b from-[#858990] via-[#71757c] to-[#5e6268]'
                        : 'bg-gradient-to-b from-[#dcdfe5] via-[#c7cbd2] to-[#b2b7bf]'
                    } border ${
                      isSelected ? 'border-2 border-[#2563eb]' : 'border-[#52565e]'
                    }`}
                  >
                    {/* Top Stacked Label + M-Number Latch — Guaranteed Zero Clipping on Every Module! */}
                    <div className="px-1.5 pt-1.5 pb-1 border-b border-black/10">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-[10.5px] font-extrabold tracking-tight leading-none whitespace-nowrap ${
                            isDouble ? 'text-white' : 'text-neutral-900'
                          }`}
                        >
                          {mod.shortLabel}
                        </span>
                        <span
                          className={`text-[7.5px] font-mono font-bold leading-none whitespace-nowrap ${
                            isDouble ? 'text-neutral-200' : 'text-neutral-600'
                          }`}
                        >
                          S{mod.slotNumberLabel}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          clinicalAudio.playKeyClick();
                          onToggleModulePlugged(mod.slotId);
                          triggerToast(
                            mod.pluggedIn
                              ? `${mod.mNumber} (${mod.shortLabel}) Unplugged`
                              : `${mod.mNumber} (${mod.shortLabel}) Docked in Slot ${mod.slotNumberLabel}`
                          );
                        }}
                        className={`mt-1 w-full py-0.5 text-[9px] font-mono font-extrabold rounded-[2px] border whitespace-nowrap text-center cursor-pointer ${
                          mod.pluggedIn
                            ? isDouble
                              ? 'bg-black/30 text-white border-white/25 hover:bg-rose-600'
                              : 'bg-white/65 text-neutral-900 border-black/25 hover:bg-rose-600 hover:text-white'
                            : 'bg-emerald-600 text-white border-emerald-800'
                        }`}
                        title={
                          mod.pluggedIn
                            ? `Click to unplug ${mod.mNumber} from FMS-8 Slot ${mod.slotNumberLabel}`
                            : `Click to plug ${mod.mNumber} into FMS-8 Slot ${mod.slotNumberLabel}`
                        }
                      >
                        {mod.pluggedIn ? mod.mNumber : `INSERT ${mod.mNumber}`}
                      </button>

                      {/* Sub-channel Tag (e.g. ABP, PAP/CVP, ICP) */}
                      <div
                        className={`mt-0.5 text-[7.5px] font-mono font-semibold truncate ${
                          isDouble ? 'text-neutral-200' : 'text-neutral-700'
                        }`}
                      >
                        {mod.statusText}
                      </div>
                    </div>

                    {/* Middle Tactile Membrane Keys & IR Window */}
                    {isDouble ? (
                      /* M1008B NBP Double-Width Control Band (4 white rectangular keys: NBP, STAT, START, STOP) */
                      <div className="mx-1.5 my-1 bg-[#cfd3da] border border-[#8d929b] p-1.5 shadow-inner">
                        <div className="grid grid-cols-4 gap-1">
                          {mod.buttons.map((b) => (
                            <div key={b} className="flex flex-col items-center">
                              <span className="text-[8px] font-extrabold text-neutral-900 mb-0.5 whitespace-nowrap">
                                {b}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleModuleButton(mod, b);
                                }}
                                className="h-3.5 w-full bg-gradient-to-b from-white to-[#dfe3e8] border border-neutral-500 shadow-xs active:translate-y-px cursor-pointer"
                                title={`Press ${mod.mNumber} ${b} key`}
                              />
                            </div>
                          ))}
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[8px] font-mono font-bold text-neutral-800">
                          <DefibProofHeartSvg className="h-2.5 w-5 text-neutral-800" />
                          <span>
                            {!mod.cableWired
                              ? 'HOSE UNWIRED'
                              : vitals.nbpInflating
                                ? `${vitals.nbpCuffPressure} mmHg`
                                : `${vitals.nbpSys}/${vitals.nbpDia}`}
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Single-Width Philips Module Faceplate (Dark IR Lens + White Oval Keys + Defib Heart) */
                      <div className="px-1.5 py-1 flex flex-col justify-end space-y-1.5">
                        {/* Small Dark IR Communication Window */}
                        <div className="h-1.5 w-4 rounded-xs bg-[#2c2f35] border border-black/30" />

                        {/* 1 or 2 White Oval Hardware Keys */}
                        <div className="flex items-center justify-between gap-1">
                          {mod.buttons.map((b) => (
                            <div key={b} className="flex flex-col items-center flex-1 min-w-0">
                              <span className="text-[8px] font-extrabold text-neutral-900 mb-0.5 whitespace-nowrap">
                                {b}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleModuleButton(mod, b);
                                }}
                                className="h-3 w-7 rounded-full bg-gradient-to-b from-white to-[#e2e5ea] border border-neutral-500 shadow-xs active:translate-y-px cursor-pointer"
                                title={`Press ${mod.mNumber} ${b} key`}
                              />
                            </div>
                          ))}
                        </div>

                        <div className="text-neutral-700">
                          <DefibProofHeartSvg className="h-2.5 w-5 text-neutral-700" />
                        </div>
                      </div>
                    )}

                    {/* Bottom Color-Coded Patient Cable Connector Block — Clickable to Wire/Unwire Cable! */}
                    {mod.socketColor === 'PURPLE_SQUARE' ? (
                      <button
                        type="button"
                        disabled={!mod.pluggedIn}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleModuleCableWired(mod.slotId);
                          triggerToast(
                            mod.cableWired
                              ? `${mod.mNumber}: NBP Air Hose Disconnected`
                              : `${mod.mNumber}: NBP Air Hose Connected`
                          );
                        }}
                        title={
                          mod.cableWired
                            ? `${mod.cableName} WIRED — Click socket to disconnect`
                            : `${mod.cableName} UNWIRED — Click socket to connect`
                        }
                        className="relative h-[52px] w-full flex items-center justify-between px-2.5 pb-1 cursor-pointer group"
                      >
                        <span
                          className={`px-1.5 py-0.5 text-[7.5px] font-mono font-bold rounded-[2px] ${
                            mod.cableWired && mod.pluggedIn
                              ? 'bg-emerald-950/90 text-emerald-300'
                              : 'bg-[#0098d4] text-black font-extrabold'
                          }`}
                        >
                          {mod.cableWired ? 'HOSE WIRED' : 'CLICK WIRE'}
                        </span>
                        <div
                          className={`h-10 w-10 bg-[#8d3b8b] border ${
                            mod.pluggedIn && !mod.cableWired
                              ? 'border-cyan-300 ring-2 ring-cyan-400'
                              : 'border-black/60'
                          } flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform`}
                        >
                          {mod.cableWired && mod.pluggedIn ? (
                            <div className="h-7 w-7 rounded-full bg-gradient-to-b from-[#4c515c] to-[#1e2026] border border-white/30 flex items-center justify-center shadow">
                              <span
                                className="h-3.5 w-3.5 rounded-full"
                                style={{ backgroundColor: mod.cableColorHex }}
                              />
                            </div>
                          ) : (
                            <div className="h-6 w-6 rounded-full border-2 border-[#4d1d4c] bg-[#6e2b6c] flex items-center justify-center">
                              <span className="h-2.5 w-2.5 rounded-full bg-[#191419]" />
                            </div>
                          )}
                        </div>
                      </button>
                    ) : mod.socketColor === 'BROWN' ? (
                      <CircularMultipoleSocket
                        bgClass="bg-[#7b5843]"
                        pinCount={6}
                        wired={mod.cableWired}
                        pluggedIn={mod.pluggedIn}
                        cableColorHex={mod.cableColorHex}
                        cableName={mod.cableName}
                        onToggleWire={(e) => {
                          e.stopPropagation();
                          onToggleModuleCableWired(mod.slotId);
                          triggerToast(
                            mod.cableWired
                              ? `${mod.mNumber}: ${mod.cableName} Unwired`
                              : `${mod.mNumber}: ${mod.cableName} Wired`
                          );
                        }}
                      />
                    ) : mod.socketColor === 'YELLOW' ? (
                      <CircularMultipoleSocket
                        bgClass="bg-[#e8db4f]"
                        pinCount={9}
                        wired={mod.cableWired}
                        pluggedIn={mod.pluggedIn}
                        cableColorHex={mod.cableColorHex}
                        cableName={mod.cableName}
                        onToggleWire={(e) => {
                          e.stopPropagation();
                          onToggleModuleCableWired(mod.slotId);
                          triggerToast(
                            mod.cableWired
                              ? `${mod.mNumber}: ${mod.cableName} Unwired`
                              : `${mod.mNumber}: ${mod.cableName} Wired`
                          );
                        }}
                      />
                    ) : mod.socketColor === 'ORANGE' ? (
                      <CircularMultipoleSocket
                        bgClass="bg-[#d9772b]"
                        pinCount={9}
                        wired={mod.cableWired}
                        pluggedIn={mod.pluggedIn}
                        cableColorHex={mod.cableColorHex}
                        cableName={mod.cableName}
                        onToggleWire={(e) => {
                          e.stopPropagation();
                          onToggleModuleCableWired(mod.slotId);
                          triggerToast(
                            mod.cableWired
                              ? `${mod.mNumber}: ${mod.cableName} Unwired`
                              : `${mod.mNumber}: ${mod.cableName} Wired`
                          );
                        }}
                      />
                    ) : (
                      <CircularMultipoleSocket
                        bgClass="bg-[#8b3d88]"
                        pinCount={8}
                        wired={mod.cableWired}
                        pluggedIn={mod.pluggedIn}
                        cableColorHex={mod.cableColorHex}
                        cableName={mod.cableName}
                        onToggleWire={(e) => {
                          e.stopPropagation();
                          onToggleModuleCableWired(mod.slotId);
                          triggerToast(
                            mod.cableWired
                              ? `${mod.mNumber}: ${mod.cableName} Unwired`
                              : `${mod.mNumber}: ${mod.cableName} Wired`
                          );
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* RIGHT SECTION: Integrated Brushed-Silver Carry Handle */}
            <div className="w-14 rounded-r-md bg-gradient-to-b from-[#e4e7ec] via-[#c7ccd5] to-[#9fa5b0] border-2 border-l-0 border-[#7b818b] shadow-lg flex items-center justify-center p-2">
              <div className="h-36 w-5 rounded-sm bg-[#12151c] border border-[#6e7480] shadow-inner" />
            </div>
          </div>

          {/* 5 Curved White Lower Cable-Management J-Hooks + Live Routed Patient Sensor Cables SVG */}
          <div className="relative w-[960px] h-[94px] -mt-0.5">
            {/* White Molded J-Hooks */}
            <div className="absolute inset-x-0 top-0 ml-[195px] w-[710px] flex justify-around items-start pointer-events-none z-10">
              {[1, 2, 3, 4, 5].map((hook) => (
                <div
                  key={hook}
                  className="w-12 h-14 rounded-b-full border-x-[7px] border-b-[7px] border-[#e2e5ea] shadow-md"
                />
              ))}
            </div>

            {/* Interactive SVG Patient Sensor Cables Routed Through the J-Hooks */}
            <svg
              viewBox="0 0 960 94"
              className="w-full h-full overflow-visible relative z-20"
            >
              {cableCoordinateSpecs.map(({ mod, portX, hookX }, idx) => {
                if (!mod.pluggedIn || !mod.cableWired) return null;
                const patientBusX = 480 + (idx - 4) * 38;
                return (
                  <g
                    key={mod.slotId}
                    onClick={() => {
                      onToggleModuleCableWired(mod.slotId);
                      triggerToast(`${mod.mNumber}: ${mod.cableName} Unwired`);
                    }}
                    className="cursor-pointer hover:opacity-80"
                  >
                    <title>{`${mod.mNumber} (${mod.cableName}) — Click cable to unwire`}</title>
                    {/* Strain-relief boot under port */}
                    <rect
                      x={portX - 4}
                      y={0}
                      width={8}
                      height={10}
                      rx={2}
                      fill="#1f242d"
                      stroke={mod.cableColorHex}
                      strokeWidth="1.2"
                    />
                    {/* Outer cable shadow */}
                    <path
                      d={`M ${portX} 8 C ${portX} 42, ${hookX} 34, ${hookX} 48 C ${hookX} 64, ${patientBusX} 74, ${patientBusX} 92`}
                      fill="none"
                      stroke="#05070b"
                      strokeWidth="6.5"
                      strokeLinecap="round"
                    />
                    {/* Color-coded medical cable jacket */}
                    <path
                      d={`M ${portX} 8 C ${portX} 42, ${hookX} 34, ${hookX} 48 C ${hookX} 64, ${patientBusX} 74, ${patientBusX} 92`}
                      fill="none"
                      stroke={mod.cableColorHex}
                      strokeWidth="3.8"
                      strokeLinecap="round"
                    />
                  </g>
                );
              })}

              {/* Patient Bedside Sensor Manifold Bar */}
              <rect
                x="265"
                y="78"
                width="430"
                height="16"
                rx="3"
                fill="#161b24"
                stroke="#334155"
                strokeWidth="1"
              />
              <text
                x="480"
                y="89"
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                PATIENT BEDSIDE TRANSDUCER &amp; ELECTRODE TRUNK HARNESS ({wiredCount}/{modules.length} WIRED)
              </text>
            </svg>
          </div>
        </div>
      </div>

      {/* Full-Station Module Inspector & Complete M-Number Wiring Matrix */}
      {!compactMode && (
        <div className="w-full max-w-[1040px] mt-3 grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Selected Module Detail & Wiring Control Panel */}
          <div className="lg:col-span-5 bg-[#161920] border border-[#2d3340] rounded-md p-3.5 text-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between border-b border-[#292f3b] pb-2 mb-2.5 gap-2">
                <div>
                  <div className="font-mono text-xs font-bold text-[#60a5fa]">
                    PHILIPS {selectedModule.mNumber} · SLOT {selectedModule.slotNumberLabel}
                  </div>
                  <h3 className="text-sm font-bold text-white mt-0.5">
                    {selectedModule.fullName}
                  </h3>
                </div>
                <div className="text-right font-mono text-[11px] shrink-0">
                  <div
                    className={
                      selectedModule.pluggedIn ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
                    }
                  >
                    {selectedModule.pluggedIn ? 'DOCKED' : 'UNPLUGGED'}
                  </div>
                  <div
                    className={
                      selectedModule.pluggedIn && selectedModule.cableWired
                        ? 'text-sky-300'
                        : 'text-amber-300 font-bold'
                    }
                  >
                    {selectedModule.cableWired ? 'CABLE WIRED' : '! UNWIRED'}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300 mb-3">
                <div>
                  <span className="text-slate-400">Patient Sensor Cable: </span>
                  <span className="font-semibold text-white">{selectedModule.cableName}</span>
                </div>
                <div>
                  <span className="text-slate-400">Monitor Channel: </span>
                  <span className="font-mono text-slate-200">{selectedModule.statusText}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onToggleModulePlugged(selectedModule.slotId)}
                className={`px-3 py-1.5 text-xs font-bold rounded cursor-pointer ${
                  selectedModule.pluggedIn
                    ? 'bg-rose-700 hover:bg-rose-600 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {selectedModule.pluggedIn
                  ? `Unplug ${selectedModule.mNumber}`
                  : `Insert ${selectedModule.mNumber}`}
              </button>

              <button
                type="button"
                disabled={!selectedModule.pluggedIn}
                onClick={() => onToggleModuleCableWired(selectedModule.slotId)}
                className={`px-3 py-1.5 text-xs font-bold rounded cursor-pointer disabled:opacity-40 ${
                  selectedModule.cableWired
                    ? 'bg-[#2a3140] hover:bg-[#374053] text-cyan-300 border border-cyan-500/40'
                    : 'bg-[#0098d4] hover:bg-[#38bdf8] text-black font-extrabold'
                }`}
              >
                {selectedModule.cableWired ? 'Unwire Patient Cable' : 'Wire Patient Cable'}
              </button>

              {selectedModule.buttons.map((b) => (
                <button
                  key={b}
                  type="button"
                  disabled={!selectedModule.pluggedIn || !selectedModule.cableWired}
                  onClick={() => handleModuleButton(selectedModule, b)}
                  className="px-3 py-1.5 text-xs font-bold bg-slate-200 hover:bg-white text-slate-900 rounded disabled:opacity-40 cursor-pointer"
                >
                  Press [{b}]
                </button>
              ))}
            </div>
          </div>

          {/* Complete Philips M-Number & Cable Wiring Inventory Matrix */}
          <div className="lg:col-span-7 bg-[#161920] border border-[#2d3340] rounded-md p-3 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-[#2c3240] text-slate-400 text-[11px]">
                  <th className="py-1 px-2">Slot</th>
                  <th className="py-1 px-2">Philips M#</th>
                  <th className="py-1 px-2">Label</th>
                  <th className="py-1 px-2">Patient Cable</th>
                  <th className="py-1 px-2 text-right">Rack / Wire</th>
                </tr>
              </thead>
              <tbody>
                {modules.map((m) => (
                  <tr
                    key={m.slotId}
                    onClick={() => setSelectedSlotId(m.slotId)}
                    className={`border-b border-[#202530] cursor-pointer ${
                      selectedSlotId === m.slotId ? 'bg-[#1f293d]' : 'hover:bg-[#1b1f29]'
                    }`}
                  >
                    <td className="py-1.5 px-2 text-slate-400">{m.slotNumberLabel}</td>
                    <td className="py-1.5 px-2 font-bold text-[#93c5fd]">{m.mNumber}</td>
                    <td className="py-1.5 px-2 font-bold text-white">{m.shortLabel}</td>
                    <td className="py-1.5 px-2 text-slate-300 truncate max-w-[190px]">
                      {m.cableName}
                    </td>
                    <td className="py-1.5 px-2 text-right whitespace-nowrap space-x-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleModulePlugged(m.slotId);
                        }}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${
                          m.pluggedIn
                            ? 'bg-emerald-900/70 text-emerald-300'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {m.pluggedIn ? 'Docked' : 'Unplugged'}
                      </button>
                      <button
                        type="button"
                        disabled={!m.pluggedIn}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleModuleCableWired(m.slotId);
                        }}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer disabled:opacity-35 ${
                          m.cableWired
                            ? 'bg-sky-900/80 text-sky-200'
                            : 'bg-[#0098d4] text-black font-extrabold'
                        }`}
                      >
                        {m.cableWired ? 'Wired' : 'Wire Cable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
