import React from 'react';
import {
  MonitorModel,
  MonitorScenarioId,
  PatientVitals,
  PhilipsHardwareModule,
  PumpChannelState,
  PumpScenarioId,
  WorkspaceScreen,
} from '../types/clinical';
import { getDrugById } from '../data/drugLibrary';
import {
  MONITOR_SCENARIO_PRESETS,
  PUMP_SCENARIO_PRESETS,
} from '../engine/physiologyEngine';

interface LauncherScreenProps {
  vitals: PatientVitals;
  monitorModel: MonitorModel;
  onSelectMonitorModel: (model: MonitorModel) => void;
  pumps: PumpChannelState[];
  modules: PhilipsHardwareModule[];
  monitorScenario: MonitorScenarioId;
  onSelectMonitorScenario: (scenario: MonitorScenarioId) => void;
  pumpScenario: PumpScenarioId;
  assignedPumpSlot: 1 | 2 | 3 | 4;
  onSelectPumpScenario: (scenario: PumpScenarioId, slot: 1 | 2 | 3 | 4) => void;
  onLaunchStation: (station: WorkspaceScreen) => void;
}

const MONITOR_PREVIEW_IMG: Record<MonitorModel, string> = {
  MX800: '/assets/aistudio/image_e9a12d7e.png',
  MX700: '/assets/aistudio/image_1b677b24.png',
  MX400: '/assets/aistudio/image_ac3b1835.png',
};

export const LauncherScreen: React.FC<LauncherScreenProps> = ({
  vitals,
  monitorModel,
  onSelectMonitorModel,
  pumps,
  modules,
  monitorScenario,
  onSelectMonitorScenario,
  pumpScenario,
  assignedPumpSlot,
  onSelectPumpScenario,
  onLaunchStation,
}) => {
  const pluggedCount = modules.filter((m) => m.pluggedIn).length;
  const wiredCount = modules.filter((m) => m.pluggedIn && m.cableWired).length;
  const activeInfusingPumps = pumps.filter(
    (p) => p.poweredOn && p.running && p.containerLoaded && p.ivTubeConnected && !p.occluded
  );
  const connectedTubesCount = pumps.filter((p) => p.ivTubeConnected).length;

  return (
    <div className="min-h-screen w-full bg-[#0d1015] text-slate-100 flex flex-col justify-between select-none">
      {/* Top Clinical Simulation Header — Single Patient Bed 1 · John Doe */}
      <header className="border-b border-[#222834] bg-[#131720] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-slate-400">
            Bed 1 · John Doe · Critical Care Hardware Simulation
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">
            ICU Monitoring &amp; Smart Infusion Workstation
          </h1>
        </div>

        {/* Independent Assigned Monitor & Assigned IV Pump Scenario Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-sky-300">Monitor Scenario:</label>
            <select
              value={monitorScenario}
              onChange={(e) =>
                onSelectMonitorScenario(e.target.value as MonitorScenarioId)
              }
              className="bg-[#1b212d] border border-[#343d4f] rounded px-2.5 py-1.5 text-xs font-semibold text-white cursor-pointer"
            >
              {(Object.keys(MONITOR_SCENARIO_PRESETS) as MonitorScenarioId[]).map(
                (id) => (
                  <option key={id} value={id}>
                    {MONITOR_SCENARIO_PRESETS[id].title}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-emerald-300">
              IV Pump S{assignedPumpSlot}:
            </label>
            <select
              value={pumpScenario}
              onChange={(e) =>
                onSelectPumpScenario(
                  e.target.value as PumpScenarioId,
                  assignedPumpSlot
                )
              }
              className="bg-[#1b212d] border border-[#343d4f] rounded px-2.5 py-1.5 text-xs font-semibold text-white cursor-pointer"
            >
              {(Object.keys(PUMP_SCENARIO_PRESETS) as PumpScenarioId[]).map((id) => (
                <option key={id} value={id}>
                  {PUMP_SCENARIO_PRESETS[id].title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Center 3-Station Hardware Selector Grid */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 flex flex-col justify-center">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-slate-300">
            Select a Clinical Device Station for Bed 1 · John Doe · Each scenario runs strictly on its assigned monitor or IV pump
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* STATION 1: Philips IntelliVue MX800 / MX700 / MX400 Patient Monitor */}
          <div className="flex flex-col justify-between bg-[#151922] border border-[#2a3140] hover:border-[#3b82f6] rounded-lg overflow-hidden transition-colors">
            <div>
              <div className="h-52 bg-white border-b border-[#232936] p-3 flex items-center justify-center relative overflow-hidden">
                <img
                  src={MONITOR_PREVIEW_IMG[monitorModel]}
                  alt={`Philips IntelliVue ${monitorModel}`}
                  className="max-h-full max-w-full object-contain rounded"
                />
                <div className="absolute top-2.5 right-2.5 flex gap-1 bg-slate-950/90 border border-white/15 p-0.5 rounded text-[10px] font-mono">
                  {(['MX800', 'MX700', 'MX400'] as MonitorModel[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => onSelectMonitorModel(m)}
                      className={`px-2 py-0.5 font-bold rounded-xs cursor-pointer ${
                        monitorModel === m
                          ? 'bg-[#2563eb] text-white'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-base font-bold text-white">
                    Philips IntelliVue {monitorModel}
                  </h3>
                  <span className="font-monitor text-sm font-semibold text-[#39ff14]">
                    Bed 1 · HR {vitals.hr} · MAP {vitals.abpMap}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Light-silver Philips wave menus, Wave Overlapping (Overlapping A), Standby Mode, graphical Connected EMS Modules view, ST Maps, and video-calibrated Philips bell chimes.
                </p>
              </div>
            </div>

            <div className="px-4 pb-4 pt-2 grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onSelectMonitorModel('MX800');
                  onLaunchStation('INTELLIVUE');
                }}
                className="py-2 text-xs font-bold bg-[#1f64cb] hover:bg-[#2b7de9] text-white border border-[#6ca6ff] rounded cursor-pointer"
              >
                MX800
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectMonitorModel('MX700');
                  onLaunchStation('INTELLIVUE');
                }}
                className="py-2 text-xs font-bold bg-[#272e3b] hover:bg-[#333c4d] text-white border border-[#475268] rounded cursor-pointer"
              >
                MX700
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectMonitorModel('MX400');
                  onLaunchStation('INTELLIVUE');
                }}
                className="py-2 text-xs font-bold bg-[#272e3b] hover:bg-[#333c4d] text-white border border-[#475268] rounded cursor-pointer"
              >
                MX400
              </button>
            </div>
          </div>

          {/* STATION 2: B. Braun Space®plus Infusion Station on ICU IV Stand */}
          <div className="flex flex-col justify-between bg-[#151922] border border-[#2a3140] hover:border-[#00a676] rounded-lg overflow-hidden transition-colors">
            <div>
              <div className="h-52 bg-white border-b border-[#232936] p-3 flex items-center justify-center relative overflow-hidden">
                <img
                  src="/assets/aistudio/image_5cbdac56.png"
                  alt="B. Braun Spaceplus Infusion Station"
                  className="max-h-full max-w-full object-contain"
                />
                <img
                  src="/assets/aistudio/image_36009f80.png"
                  alt="B. Braun"
                  className="absolute top-2.5 right-2.5 h-5 w-auto object-contain rounded-[1px]"
                />
              </div>

              <div className="p-4 space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-base font-bold text-white">
                    B. Braun Space®plus IV Stand
                  </h3>
                  <span className="font-mono text-xs text-emerald-400">
                    {activeInfusingPumps.length}/4 Infusing · {connectedTubesCount}/4 Lines
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Animated Perfusor® rotating lead-screw &amp; syringe drive, Infusomat® peristaltic finger strip &amp; falling drip-chamber droplets, and curved medical PVC tubing wired to John Doe&apos;s CVC.
                </p>
              </div>
            </div>

            <div className="px-4 pb-4 pt-2">
              <button
                type="button"
                onClick={() => onLaunchStation('BBRAUN')}
                className="w-full py-2 text-xs font-bold bg-[#008f65] hover:bg-[#00a676] text-white border border-emerald-400/50 rounded cursor-pointer"
              >
                Open Space®plus IV Stand &amp; Pumps
              </button>
            </div>
          </div>

          {/* STATION 3: Philips M8048A FMS-8 & M3001A MMS Module Rack */}
          <div className="flex flex-col justify-between bg-[#151922] border border-[#2a3140] hover:border-amber-400 rounded-lg overflow-hidden transition-colors">
            <div>
              <div className="h-52 bg-white border-b border-[#232936] p-3 flex items-center justify-center relative overflow-hidden">
                <img
                  src="/assets/aistudio/image_92d916bc.png"
                  alt="Philips M8048A FMS-8 and M3001A MMS Module Rack"
                  className="max-h-full max-w-full object-contain"
                />
                <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-slate-900 text-white text-[10px] font-mono font-bold rounded-xs">
                  M8048A / M3001A
                </span>
              </div>

              <div className="p-4 space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-base font-bold text-white">
                    Philips MMS &amp; FMS-8 Rack
                  </h3>
                  <span className="font-mono text-xs text-sky-400">
                    {pluggedCount}/{modules.length} Docked · {wiredCount}/{modules.length} Wired
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Clickable Philips M-number plug-in modules (M3001A MMS, M3015A CO₂, M1008B NBP, M1029A TEMP, M1027A EEG, 3× M1006B PRESS, M1012A CCO/C.O.) wired to Bed 1 · John Doe.
                </p>
              </div>
            </div>

            <div className="px-4 pb-4 pt-2">
              <button
                type="button"
                onClick={() => onLaunchStation('MODULE_RACK')}
                className="w-full py-2 text-xs font-bold bg-[#334155] hover:bg-[#475569] text-white border border-slate-500 rounded cursor-pointer"
              >
                Open MMS &amp; FMS-8 Module Wiring Rack
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Live Coupled Physiology & Active Infusion Bar */}
      <footer className="border-t border-[#222834] bg-[#131720] px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs font-mono tabular-nums">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-slate-300 font-sans font-semibold">
            Bed 1 · John Doe:
          </span>
          <span className="text-[#39ff14]">HR {vitals.hr} bpm</span>
          <span className="text-[#38e8ff]">SpO₂ {vitals.spo2}%</span>
          <span className="text-[#ff6b4a]">
            {vitals.abpLabel} {vitals.abpSys}/{vitals.abpDia} ({vitals.abpMap})
          </span>
          <span className="text-[#f7e043]">
            PAP {vitals.papSys}/{vitals.papDia} ({vitals.papMap})
          </span>
          <span className="text-[#e879f9]">
            ICP ({vitals.icp}) · CPP {vitals.cpp}
          </span>
          <span className="text-white">etCO₂ {vitals.etco2} mmHg</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-slate-300">
          {pumps.map((p) => {
            const d = getDrugById(p.drugId);
            const active =
              p.poweredOn && p.running && p.containerLoaded && p.ivTubeConnected && !p.occluded;
            return (
              <span key={p.id}>
                S{p.bayIndex} {d.tallManName}:{' '}
                <strong className={active ? 'text-emerald-400' : 'text-slate-500'}>
                  {active ? `${p.rateMlH} mL/h` : !p.ivTubeConnected ? 'Unplugged' : 'Stop'}
                </strong>
              </span>
            );
          })}
        </div>
      </footer>
    </div>
  );
};
