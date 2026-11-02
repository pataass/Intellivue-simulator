import React from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import {
  MonitorModel,
  MonitorScenarioId,
  MonitorScreenView,
  PatientVitals,
  PhilipsHardwareModule,
  PumpChannelState,
  PumpScenarioId,
  WorkspaceScreen,
} from '../types/clinical';
import { calculateDoseFromRate, getDrugById } from '../data/drugLibrary';
import {
  MONITOR_SCENARIO_PRESETS,
  PUMP_SCENARIO_PRESETS,
} from '../engine/physiologyEngine';

export interface ManualVitalOffsets {
  hrOffset: number;
  mapOffset: number;
  icpOffset: number;
  spo2Offset: number;
  respOffset: number;
}

interface SimulationSidebarProps {
  activeStation: WorkspaceScreen;
  onSwitchStation: (station: WorkspaceScreen) => void;
  monitorModel: MonitorModel;
  onSelectMonitorModel: (model: MonitorModel) => void;
  screenView: MonitorScreenView;
  onSwitchScreenView: (view: MonitorScreenView) => void;
  showDockedRackUnderMonitor: boolean;
  onToggleDockedRackUnderMonitor: () => void;
  monitorScenario: MonitorScenarioId;
  onSelectMonitorScenario: (scenario: MonitorScenarioId) => void;
  pumpScenario: PumpScenarioId;
  assignedPumpSlot: 1 | 2 | 3 | 4;
  onChangeAssignedPumpSlot: (slot: 1 | 2 | 3 | 4) => void;
  onSelectPumpScenario: (scenario: PumpScenarioId, slot: 1 | 2 | 3 | 4) => void;
  offsets: ManualVitalOffsets;
  onChangeOffsets: (next: ManualVitalOffsets) => void;
  patientWeightKg: number;
  onChangePatientWeightKg: (kg: number) => void;
  vitals: PatientVitals;
  onToggleOverlapWaves: () => void;
  standbyMode: boolean;
  onToggleStandbyMode: () => void;
  modules: PhilipsHardwareModule[];
  onBulkWireModules: (wired: boolean) => void;
  pumps: PumpChannelState[];
  onBulkSetIvTubing: (connected: boolean) => void;
  onQuickTitratePump: (pumpId: string, deltaMlH: number) => void;
  onTogglePumpRun: (pumpId: string) => void;
  onDefibrillate: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export const SimulationSidebar: React.FC<SimulationSidebarProps> = ({
  activeStation,
  onSwitchStation,
  monitorModel,
  onSelectMonitorModel,
  screenView,
  onSwitchScreenView,
  showDockedRackUnderMonitor,
  onToggleDockedRackUnderMonitor,
  monitorScenario,
  onSelectMonitorScenario,
  pumpScenario,
  assignedPumpSlot,
  onChangeAssignedPumpSlot,
  onSelectPumpScenario,
  offsets,
  onChangeOffsets,
  patientWeightKg,
  onChangePatientWeightKg,
  vitals,
  onToggleOverlapWaves,
  standbyMode,
  onToggleStandbyMode,
  modules,
  onBulkWireModules,
  pumps,
  onBulkSetIvTubing,
  onQuickTitratePump,
  onTogglePumpRun,
  onDefibrillate,
  collapsed,
  onToggleCollapsed,
}) => {
  if (collapsed) {
    return (
      <aside className="w-11 shrink-0 bg-[#141820] border-l border-[#28303f] flex flex-col items-center py-3 gap-3 select-none">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="p-2 bg-[#232a38] hover:bg-[#2f394c] text-white rounded cursor-pointer"
          title="Expand External Simulation Settings Panel"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="[writing-mode:vertical-rl] rotate-180 text-[11px] font-mono font-bold text-slate-400 tracking-wider">
          SIMULATION SETTINGS
        </span>
      </aside>
    );
  }

  const wiredCount = modules.filter((m) => m.pluggedIn && m.cableWired).length;
  const ivConnectedCount = pumps.filter((p) => p.ivTubeConnected).length;

  return (
    <aside className="w-full xl:w-[340px] shrink-0 bg-[#141820] border-t xl:border-t-0 xl:border-l border-[#28303f] text-slate-200 flex flex-col max-h-screen xl:overflow-y-auto select-none">
      {/* Sidebar Header */}
      <div className="px-3.5 py-2.5 bg-[#0f131a] border-b border-[#262d3b] flex items-center justify-between">
        <div>
          <div className="text-[11px] font-mono text-slate-400">
            Bed 1 · John Doe
          </div>
          <div className="text-xs font-bold text-white">Simulation Settings</div>
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="hidden xl:inline-flex items-center gap-1 px-2 py-1 text-[11px] bg-[#232a38] hover:bg-[#2f394c] rounded text-slate-300 cursor-pointer"
          title="Collapse Sidebar"
        >
          <span>Hide</span>
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <div className="p-3.5 space-y-4 text-xs">
        {/* 1. Station Navigation */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold text-slate-400">
            Active Device Station
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onSwitchStation('LAUNCHER')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-semibold bg-[#222834] hover:bg-[#2d3545] border border-[#384152] rounded text-left cursor-pointer"
            >
              <Home className="h-3.5 w-3.5 text-slate-300 shrink-0" />
              <span>Main Screen</span>
            </button>
            <button
              type="button"
              onClick={() => onSwitchStation('INTELLIVUE')}
              className={`px-2.5 py-1.5 font-bold rounded border text-left cursor-pointer ${
                activeStation === 'INTELLIVUE'
                  ? 'bg-[#1f64cb] text-white border-[#7fb3ff]'
                  : 'bg-[#222834] hover:bg-[#2d3545] border-[#384152]'
              }`}
            >
              IntelliVue {monitorModel}
            </button>
            <button
              type="button"
              onClick={() => onSwitchStation('BBRAUN')}
              className={`px-2.5 py-1.5 font-bold rounded border text-left cursor-pointer ${
                activeStation === 'BBRAUN'
                  ? 'bg-[#008f65] text-white border-emerald-400'
                  : 'bg-[#222834] hover:bg-[#2d3545] border-[#384152]'
              }`}
            >
              B. Braun IV Stand
            </button>
            <button
              type="button"
              onClick={() => onSwitchStation('MODULE_RACK')}
              className={`px-2.5 py-1.5 font-bold rounded border text-left cursor-pointer ${
                activeStation === 'MODULE_RACK'
                  ? 'bg-slate-600 text-white border-slate-300'
                  : 'bg-[#222834] hover:bg-[#2d3545] border-[#384152]'
              }`}
            >
              MMS / FMS-8 Rack
            </button>
          </div>
        </div>

        {/* 2. Monitor Hardware Model & Screen Controls */}
        <div className="space-y-2 border-t border-[#262d3b] pt-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">
              Philips Monitor Model
            </span>
            <div className="flex gap-1">
              {(['MX800', 'MX700', 'MX400'] as MonitorModel[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    onSelectMonitorModel(m);
                    if (activeStation !== 'INTELLIVUE') {
                      onSwitchStation('INTELLIVUE');
                    }
                  }}
                  className={`px-2 py-0.5 font-mono font-bold rounded cursor-pointer ${
                    monitorModel === m
                      ? 'bg-[#2563eb] text-white'
                      : 'bg-[#222834] text-slate-400 hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {activeStation === 'INTELLIVUE' && (
            <>
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    { id: 'STANDARD_WAVES', label: 'Standard' },
                    { id: 'DYNAMIC_WAVES', label: 'Dynamic 4W' },
                    { id: 'ST_MAP_SPLIT', label: 'ST Split' },
                    { id: 'ST_MAP_FULL', label: 'ST Maps' },
                    { id: 'TWELVE_LEAD', label: '12-Lead' },
                    { id: 'CO_HEMO', label: 'C.O. Curve' },
                  ] as { id: MonitorScreenView; label: string }[]
                ).map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onSwitchScreenView(v.id)}
                    className={`py-1 px-1.5 text-[11px] font-semibold rounded border cursor-pointer ${
                      screenView === v.id
                        ? 'bg-[#1d4ed8] text-white border-[#60a5fa]'
                        : 'bg-[#1d222d] text-slate-300 border-[#313949] hover:bg-[#272e3d]'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={onToggleOverlapWaves}
                  className={`py-1.5 px-2 rounded border text-[11px] font-semibold cursor-pointer ${
                    vitals.overlapWaves
                      ? 'bg-[#1e3a5f] text-sky-200 border-sky-400'
                      : 'bg-[#1d222d] text-slate-300 border-[#313949] hover:bg-[#272e3d]'
                  }`}
                >
                  {vitals.overlapWaves ? 'Overlap: ON' : 'Overlap Waves'}
                </button>

                <button
                  type="button"
                  onClick={onToggleStandbyMode}
                  className={`py-1.5 px-2 rounded border text-[11px] font-semibold cursor-pointer ${
                    standbyMode
                      ? 'bg-amber-600 text-white border-amber-300'
                      : 'bg-[#1d222d] text-slate-300 border-[#313949] hover:bg-[#272e3d]'
                  }`}
                >
                  {standbyMode ? 'Exit Standby' : 'Standby Mode'}
                </button>

                <button
                  type="button"
                  onClick={onToggleDockedRackUnderMonitor}
                  className={`py-1.5 px-2 rounded border text-[11px] font-semibold cursor-pointer ${
                    showDockedRackUnderMonitor
                      ? 'bg-slate-700 text-white border-slate-400'
                      : 'bg-[#1d222d] text-slate-300 border-[#313949] hover:bg-[#272e3d]'
                  }`}
                >
                  {showDockedRackUnderMonitor ? 'Hide EMS' : 'Dock EMS'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* 3. Station-Assigned Scenario Control (Plays ONLY on Assigned Monitor OR Assigned IV Pump!) */}
        <div className="space-y-2 border-t border-[#262d3b] pt-3">
          {activeStation === 'BBRAUN' ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-300">
                  Assigned IV Pump Scenario
                </span>
                <div className="flex items-center gap-1 font-mono text-[10px]">
                  <span className="text-slate-400">Target:</span>
                  {([1, 2, 3, 4] as const).map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        onChangeAssignedPumpSlot(slot);
                        if (pumpScenario !== 'PUMP_NORMAL') {
                          onSelectPumpScenario(pumpScenario, slot);
                        }
                      }}
                      className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                        assignedPumpSlot === slot
                          ? 'bg-[#008f65] text-white'
                          : 'bg-[#1d222d] text-slate-400 hover:text-white'
                      }`}
                    >
                      S{slot}
                    </button>
                  ))}
                </div>
              </div>

              <select
                value={pumpScenario}
                onChange={(e) =>
                  onSelectPumpScenario(
                    e.target.value as PumpScenarioId,
                    assignedPumpSlot
                  )
                }
                className="w-full bg-[#1d222d] border border-emerald-600/50 rounded px-2.5 py-1.5 text-xs font-semibold text-white cursor-pointer"
              >
                {(Object.keys(PUMP_SCENARIO_PRESETS) as PumpScenarioId[]).map((id) => (
                  <option key={id} value={id}>
                    {PUMP_SCENARIO_PRESETS[id].title}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 leading-snug">
                Plays strictly on <strong>Slot {assignedPumpSlot}</strong> ({getDrugById(pumps[assignedPumpSlot - 1]?.drugId ?? 'sterofundin').tallManName}) without altering monitor scenario.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-sky-300">
                  Assigned Monitor Scenario (Bed 1)
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  IntelliVue {monitorModel}
                </span>
              </div>

              <select
                value={monitorScenario}
                onChange={(e) =>
                  onSelectMonitorScenario(e.target.value as MonitorScenarioId)
                }
                className="w-full bg-[#1d222d] border border-[#384152] rounded px-2.5 py-1.5 text-xs font-semibold text-white cursor-pointer"
              >
                {(Object.keys(MONITOR_SCENARIO_PRESETS) as MonitorScenarioId[]).map(
                  (id) => (
                    <option key={id} value={id}>
                      {MONITOR_SCENARIO_PRESETS[id].title}
                    </option>
                  )
                )}
              </select>
              <p className="text-[11px] text-slate-400 leading-snug">
                {MONITOR_SCENARIO_PRESETS[monitorScenario].subtitle}
              </p>

              {(vitals.rhythm === 'VTACH' ||
                vitals.rhythm === 'AFIB' ||
                vitals.rhythm === 'ASYSTOLE') && (
                <button
                  type="button"
                  onClick={onDefibrillate}
                  className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded border border-rose-300 shadow cursor-pointer"
                >
                  Deliver 200J Biphasic Cardioversion / ROSC
                </button>
              )}
            </>
          )}
        </div>

        {/* 4. Bedside Cable & IV Tubing Quick Controls */}
        <div className="space-y-1.5 border-t border-[#262d3b] pt-3">
          <div className="text-[11px] font-semibold text-slate-400">
            Bedside EMS Cables &amp; IV Tubing
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => onBulkWireModules(wiredCount < modules.length)}
              className="py-1.5 px-2 bg-[#1d222d] hover:bg-[#272e3d] border border-[#384152] rounded font-semibold text-sky-300 cursor-pointer"
            >
              {wiredCount < modules.length
                ? `Wire EMS (${wiredCount}/${modules.length})`
                : 'Unwire EMS Cables'}
            </button>
            <button
              type="button"
              onClick={() => onBulkSetIvTubing(ivConnectedCount < pumps.length)}
              className="py-1.5 px-2 bg-[#1d222d] hover:bg-[#272e3d] border border-[#384152] rounded font-semibold text-emerald-300 cursor-pointer"
            >
              {ivConnectedCount < pumps.length
                ? `Connect Tubes (${ivConnectedCount}/4)`
                : 'Unplug IV Tubes'}
            </button>
          </div>
        </div>

        {/* 5. Manual Physiological Offset Sliders */}
        <div className="space-y-2 border-t border-[#262d3b] pt-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">
              Physiology Modifiers (John Doe)
            </span>
            <button
              type="button"
              onClick={() =>
                onChangeOffsets({
                  hrOffset: 0,
                  mapOffset: 0,
                  icpOffset: 0,
                  spo2Offset: 0,
                  respOffset: 0,
                })
              }
              className="text-[10px] text-sky-400 hover:underline cursor-pointer"
            >
              Reset Offsets
            </button>
          </div>

          {(
            [
              { key: 'hrOffset', label: 'HR Offset', min: -35, max: 55, unit: 'bpm' },
              { key: 'mapOffset', label: 'ABP MAP Offset', min: -35, max: 40, unit: 'mmHg' },
              { key: 'icpOffset', label: 'ICP Offset', min: -8, max: 25, unit: 'mmHg' },
              { key: 'spo2Offset', label: 'SpO₂ Offset', min: -20, max: 5, unit: '%' },
              { key: 'respOffset', label: 'Resp / awRR Offset', min: -10, max: 16, unit: 'rpm' },
            ] as {
              key: keyof ManualVitalOffsets;
              label: string;
              min: number;
              max: number;
              unit: string;
            }[]
          ).map((sl) => (
            <div key={sl.key} className="space-y-0.5">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-slate-300">{sl.label}</span>
                <span className="text-white tabular-nums">
                  {offsets[sl.key] > 0 ? `+${offsets[sl.key]}` : offsets[sl.key]} {sl.unit}
                </span>
              </div>
              <input
                type="range"
                min={sl.min}
                max={sl.max}
                value={offsets[sl.key]}
                onChange={(e) =>
                  onChangeOffsets({
                    ...offsets,
                    [sl.key]: Number(e.target.value),
                  })
                }
                className="w-full accent-[#2563eb] h-1.5 cursor-pointer"
              />
            </div>
          ))}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-300">Patient Weight:</span>
            <div className="flex items-center gap-1 font-mono">
              <button
                type="button"
                onClick={() => onChangePatientWeightKg(Math.max(35, patientWeightKg - 5))}
                className="px-2 py-0.5 bg-[#232a38] rounded cursor-pointer"
              >
                -5
              </button>
              <span className="w-14 text-center font-bold">{patientWeightKg} kg</span>
              <button
                type="button"
                onClick={() => onChangePatientWeightKg(Math.min(160, patientWeightKg + 5))}
                className="px-2 py-0.5 bg-[#232a38] rounded cursor-pointer"
              >
                +5
              </button>
            </div>
          </div>
        </div>

        {/* 6. Cross-Station Coupled Telemetry & Quick Titration */}
        <div className="space-y-2 border-t border-[#262d3b] pt-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">
              {activeStation === 'BBRAUN'
                ? 'Bed 1 · John Doe Vitals'
                : 'B. Braun Space®plus Pumps'}
            </span>
            <button
              type="button"
              onClick={() =>
                onSwitchStation(activeStation === 'BBRAUN' ? 'INTELLIVUE' : 'BBRAUN')
              }
              className="inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:underline cursor-pointer"
            >
              <span>{activeStation === 'BBRAUN' ? 'Open Monitor' : 'Open IV Stand'}</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {activeStation === 'BBRAUN' ? (
            <div className="grid grid-cols-2 gap-1.5 font-mono text-xs bg-[#0d1015] border border-[#262d3b] p-2.5 rounded">
              <div className="text-[#39ff14]">
                HR: <strong>{vitals.hr}</strong> bpm
              </div>
              <div className="text-[#38e8ff]">
                SpO₂: <strong>{vitals.spo2}%</strong>
              </div>
              <div className="text-[#ff6b4a] col-span-2">
                {vitals.abpLabel}: <strong>{vitals.abpSys}/{vitals.abpDia} ({vitals.abpMap})</strong>
              </div>
              <div className="text-[#38d6ff]">
                CVP: <strong>({vitals.cvp})</strong>
              </div>
              <div className="text-[#e879f9]">
                ICP/CPP: <strong>{vitals.icp}/{vitals.cpp}</strong>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {pumps.map((p) => {
                const d = getDrugById(p.drugId);
                const dose = calculateDoseFromRate(d, p.rateMlH, patientWeightKg);
                const delivering =
                  p.poweredOn && p.running && p.containerLoaded && p.ivTubeConnected && !p.occluded;
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-[#0d1015] border border-[#262d3b] px-2 py-1.5 rounded font-mono text-[11px]"
                  >
                    <div className="min-w-0 pr-1">
                      <div className="font-sans font-bold text-white truncate">
                        S{p.bayIndex} {d.tallManName}
                      </div>
                      <div className="text-[10px] text-slate-400 tabular-nums">
                        {dose.toFixed(d.doseUnit === 'mL/h' ? 0 : 2)} {d.doseUnit} ({p.rateMlH} mL/h)
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onQuickTitratePump(p.id, d.doseUnit === 'mL/h' ? -10 : -1)}
                        className="px-1.5 py-0.5 bg-[#232a38] hover:bg-[#313b4e] rounded cursor-pointer"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => onQuickTitratePump(p.id, d.doseUnit === 'mL/h' ? 10 : 1)}
                        className="px-1.5 py-0.5 bg-[#232a38] hover:bg-[#313b4e] rounded cursor-pointer"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => onTogglePumpRun(p.id)}
                        className={`px-1.5 py-0.5 font-sans font-bold text-[10px] rounded cursor-pointer ${
                          delivering
                            ? 'bg-emerald-700 text-white'
                            : 'bg-rose-800 text-rose-100'
                        }`}
                      >
                        {delivering ? 'Run' : 'Stop'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
