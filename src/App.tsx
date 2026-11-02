import React, { useEffect, useRef, useState } from 'react';
import {
  ActiveAlarm,
  AlarmThresholds,
  AlarmToneStandard,
  MonitorModel,
  MonitorScenarioId,
  MonitorScreenView,
  PatientVitals,
  PhilipsHardwareModule,
  PumpChannelState,
  PumpScenarioId,
  TempUnit,
  TrendPoint,
  TwelveLeadStMap,
  WorkspaceScreen,
} from './types/clinical';
import {
  ALL_TWELVE_LEADS,
  computeStIndex,
  DEFAULT_ALARM_THRESHOLDS,
  evaluateSystemAlarms,
  generateInitialTrends,
  INITIAL_PHILIPS_MODULES,
  MONITOR_SCENARIO_PRESETS,
  NORMAL_ST_MAP,
  stepPumpsAndPharmacokinetics,
} from './engine/physiologyEngine';
import { getDrugById, OCCLUSION_PRESSURE_MMHG } from './data/drugLibrary';
import { clinicalAudio } from './services/audioSynth';
import { LauncherScreen } from './components/LauncherScreen';
import {
  ManualVitalOffsets,
  SimulationSidebar,
} from './components/SimulationSidebar';
import { PhilipsMonitorScreen } from './components/mx800/PhilipsMonitorScreen';
import { PhilipsModuleRack } from './components/mx800/PhilipsModuleRack';
import { SpacePlusStation } from './components/bbraun/SpacePlusStation';

const INITIAL_SPACEPLUS_PUMPS: PumpChannelState[] = [
  {
    id: 'spaceplus-slot-1',
    bayIndex: 1,
    name: 'Slot 1',
    model: 'Spaceplus Infusomat®',
    pumpType: 'VOLUMETRIC',
    poweredOn: true,
    powerHoldProgress: 0,
    running: true,
    intermittentMode: false,
    screenView: 'RUN_VIEW',
    bolusActive: false,
    bolusDeliveredMl: 0,
    drugId: 'sterofundin',
    rateMlH: 80.0,
    vtbiMl: 490.0,
    volumeRemainingMl: 490.0,
    containerTotalMl: 1000,
    volumeInfusedMl: 510.0,
    syringeSizeMl: 50,
    containerLoaded: true,
    ivTubeConnected: true,
    ivTubePrimed: true,
    kvoEnabled: true,
    kvoRateMlH: 3.0,
    inKvoMode: false,
    occlusionLevel: 5,
    linePressureMmHg: 118,
    occluded: false,
    antiBolusRewinding: false,
    bayLatchLocked: true,
    disposableLocked: true,
    dataLockLevel: 0,
    alarmState: 'NONE',
    alarmMessage: null,
    effectSiteConcentration: 0.32,
    bolusEffectImpulse: 0,
  },
  {
    id: 'spaceplus-slot-2',
    bayIndex: 2,
    name: 'Slot 2',
    model: 'Spaceplus Infusomat®',
    pumpType: 'VOLUMETRIC',
    poweredOn: true,
    powerHoldProgress: 0,
    running: true,
    intermittentMode: true,
    screenView: 'RUN_VIEW',
    bolusActive: false,
    bolusDeliveredMl: 0,
    drugId: 'amiodarone',
    rateMlH: 1.0,
    vtbiMl: 22.0,
    volumeRemainingMl: 85.0,
    containerTotalMl: 100,
    volumeInfusedMl: 15.0,
    syringeSizeMl: 50,
    containerLoaded: true,
    ivTubeConnected: true,
    ivTubePrimed: true,
    kvoEnabled: true,
    kvoRateMlH: 0.5,
    inKvoMode: false,
    occlusionLevel: 5,
    linePressureMmHg: 210,
    occluded: false,
    antiBolusRewinding: false,
    bayLatchLocked: true,
    disposableLocked: true,
    dataLockLevel: 0,
    alarmState: 'NONE',
    alarmMessage: null,
    effectSiteConcentration: 0.15,
    bolusEffectImpulse: 0,
  },
  {
    id: 'spaceplus-slot-3',
    bayIndex: 3,
    name: 'Slot 3',
    model: 'Spaceplus Perfusor®',
    pumpType: 'SYRINGE',
    poweredOn: true,
    powerHoldProgress: 0,
    running: true,
    intermittentMode: false,
    screenView: 'RUN_VIEW',
    bolusActive: false,
    bolusDeliveredMl: 0,
    drugId: 'sufentanil',
    rateMlH: 15.0,
    vtbiMl: 26.0,
    volumeRemainingMl: 26.0,
    containerTotalMl: 50,
    volumeInfusedMl: 24.0,
    syringeSizeMl: 50,
    containerLoaded: true,
    ivTubeConnected: true,
    ivTubePrimed: true,
    kvoEnabled: true,
    kvoRateMlH: 0.5,
    inKvoMode: false,
    occlusionLevel: 4,
    linePressureMmHg: 210,
    occluded: false,
    antiBolusRewinding: false,
    bayLatchLocked: true,
    disposableLocked: true,
    dataLockLevel: 0,
    alarmState: 'NONE',
    alarmMessage: null,
    effectSiteConcentration: 0.4,
    bolusEffectImpulse: 0,
  },
  {
    id: 'spaceplus-slot-4',
    bayIndex: 4,
    name: 'Slot 4',
    model: 'Spaceplus Perfusor®',
    pumpType: 'SYRINGE',
    poweredOn: true,
    powerHoldProgress: 0,
    running: true,
    intermittentMode: false,
    screenView: 'RUN_VIEW',
    bolusActive: false,
    bolusDeliveredMl: 0,
    drugId: 'norepinephrine',
    rateMlH: 5.0,
    vtbiMl: 34.0,
    volumeRemainingMl: 34.0,
    containerTotalMl: 50,
    volumeInfusedMl: 16.0,
    syringeSizeMl: 50,
    containerLoaded: true,
    ivTubeConnected: true,
    ivTubePrimed: true,
    kvoEnabled: true,
    kvoRateMlH: 0.5,
    inKvoMode: false,
    occlusionLevel: 4,
    linePressureMmHg: 165,
    occluded: false,
    antiBolusRewinding: false,
    bayLatchLocked: true,
    disposableLocked: true,
    dataLockLevel: 0,
    alarmState: 'NONE',
    alarmMessage: null,
    effectSiteConcentration: 0.95,
    bolusEffectImpulse: 0,
  },
];

export default function App() {
  const [activeStation, setActiveStation] = useState<WorkspaceScreen>('LAUNCHER');
  const [monitorModel, setMonitorModel] = useState<MonitorModel>('MX800');
  const [screenView, setScreenView] = useState<MonitorScreenView>('STANDARD_WAVES');
  const [standbyMode, setStandbyMode] = useState<boolean>(false);
  const [showDockedRackUnderMonitor, setShowDockedRackUnderMonitor] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Independent Station-Scoped Scenarios: Monitor Scenario vs Assigned IV Pump Scenario!
  const [monitorScenario, setMonitorScenario] = useState<MonitorScenarioId>('BASELINE');
  const [pumpScenario, setPumpScenario] = useState<PumpScenarioId>('PUMP_NORMAL');
  const [assignedPumpSlot, setAssignedPumpSlot] = useState<1 | 2 | 3 | 4>(1);

  const [patientWeightKg, setPatientWeightKg] = useState<number>(75);
  const [tempUnit, setTempUnit] = useState<TempUnit>('C');
  const [offsets, setOffsets] = useState<ManualVitalOffsets>({
    hrOffset: 0,
    mapOffset: 0,
    icpOffset: 0,
    spo2Offset: 0,
    respOffset: 0,
  });

  const [modules, setModules] = useState<PhilipsHardwareModule[]>(INITIAL_PHILIPS_MODULES);
  const [pumps, setPumps] = useState<PumpChannelState[]>(INITIAL_SPACEPLUS_PUMPS);
  const [acMainsConnected, setAcMainsConnected] = useState<boolean>(true);
  const [batteryPct, setBatteryPct] = useState<number>(100);

  const [thresholds, setThresholds] = useState<AlarmThresholds>(DEFAULT_ALARM_THRESHOLDS);
  const [alarmsSilencedSec, setAlarmsSilencedSec] = useState<number>(0);
  const [alarmsPaused, setAlarmsPaused] = useState<boolean>(false);

  // Philips Audible Alarm & 625Hz SmartTone QRS Beep (configured via Monitor's Alarm Volume SmartKey)
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [alarmVolume, setAlarmVolume] = useState<number>(7);
  const [alarmToneStandard, setAlarmToneStandard] = useState<AlarmToneStandard>('PHILIPS');
  const [qrsBeepEnabled, setQrsBeepEnabled] = useState<boolean>(true);

  const [selectedBiosciDrugId, setSelectedBiosciDrugId] = useState<string>('norepinephrine');

  const [vitals, setVitals] = useState<PatientVitals>({
    patientName: 'John Doe',
    bedLabel: 'Bed 1',
    admitted: true,
    category: 'Adult',
    paced: false,
    profileName: 'SSC Sepsis',
    overlapWaves: false,
    hr: 60,
    pvcCount: 0,
    rhythm: 'SINUS',
    ecgLead: 'II',
    secondaryEcgLead: 'V5',
    ecgGain: 1,
    dottedPressureWaves: false,
    abpLabel: 'ABP',
    pulseSource: 'SpO2',
    stValues: { ...NORMAL_ST_MAP },
    stReference: { ...NORMAL_ST_MAP },
    stIndex: computeStIndex(NORMAL_ST_MAP),
    stPointMs: 60,
    spo2: 96,
    pulseRate: 60,
    perfusionIndex: 2.8,
    abpSys: 120,
    abpDia: 70,
    abpMap: 91,
    abpZeroed: true,
    abpScale: 150,
    papSys: 28,
    papDia: 15,
    papMap: 21,
    papZeroed: true,
    cvp: 9,
    cvpZeroed: true,
    icp: 9,
    cpp: 82,
    icpZeroed: true,
    nbpSys: 120,
    nbpDia: 80,
    nbpMap: 90,
    nbpTimestamp: '09:01',
    nbpRepeatMin: 15,
    nbpStatActive: false,
    nbpInflating: false,
    nbpCuffPressure: 0,
    venipunctureActive: false,
    venipunctureSecRemaining: 0,
    etco2: 34,
    imco2: 0,
    awrr: 15,
    respRate: 15,
    pipCmH2O: 30,
    peepCmH2O: 3.0,
    tidalVolumeMl: 400,
    tempCoreC: 37.0,
    tempSkinC: 37.0,
    coLMin: 5.2,
    ciLMinM2: 2.74,
    coMeasuring: false,
    coLastTime: '08:55',
    eegBis: 46,
  });

  const [trends, setTrends] = useState<TrendPoint[]>(() =>
    generateInitialTrends(Date.now())
  );

  const monitorScenarioRef = useRef(monitorScenario);
  const offsetsRef = useRef(offsets);
  const weightRef = useRef(patientWeightKg);
  const mainsRef = useRef(acMainsConnected);
  const battRef = useRef(batteryPct);

  useEffect(() => {
    monitorScenarioRef.current = monitorScenario;
  }, [monitorScenario]);

  useEffect(() => {
    offsetsRef.current = offsets;
  }, [offsets]);

  useEffect(() => {
    weightRef.current = patientWeightKg;
  }, [patientWeightKg]);

  useEffect(() => {
    mainsRef.current = acMainsConnected;
  }, [acMainsConnected]);

  useEffect(() => {
    battRef.current = batteryPct;
  }, [batteryPct]);

  const handleChangeAlarmAudio = (next: {
    enabled?: boolean;
    volume?: number;
    standard?: AlarmToneStandard;
    qrsBeep?: boolean;
  }) => {
    if (typeof next.volume === 'number') {
      const clampedVol = Math.max(0, Math.min(10, Math.round(next.volume)));
      setAlarmVolume(clampedVol);
      clinicalAudio.setVolume(clampedVol);
      if (clampedVol > 0 && next.enabled === undefined && !audioEnabled) {
        setAudioEnabled(true);
        clinicalAudio.setEnabled(true);
      }
    }
    if (next.standard) {
      setAlarmToneStandard(next.standard);
      clinicalAudio.setToneStandard(next.standard);
    }
    if (typeof next.qrsBeep === 'boolean') {
      setQrsBeepEnabled(next.qrsBeep);
    }
    if (typeof next.enabled === 'boolean') {
      setAudioEnabled(next.enabled);
      clinicalAudio.setEnabled(next.enabled);
      if (next.enabled) {
        clinicalAudio.playKeyClick(true);
      }
    }
  };

  // Monitor Scenario Handler: Plays ONLY on IntelliVue Monitor (Bed 1 · John Doe) without touching B. Braun IV pumps!
  const handleSelectMonitorScenario = (nextScenario: MonitorScenarioId) => {
    setMonitorScenario(nextScenario);
    if (nextScenario === 'ANTERIOR_STEMI' || nextScenario === 'INFERIOR_ISCHEMIA') {
      if (
        activeStation === 'INTELLIVUE' &&
        monitorModel !== 'MX400' &&
        screenView === 'STANDARD_WAVES'
      ) {
        setScreenView('ST_MAP_SPLIT');
      }
    }
  };

  // Pump Scenario Handler: Plays ONLY on the assigned B. Braun IV pump slot without altering Monitor physiological scenario!
  const handleSelectPumpScenario = (
    nextPumpScenario: PumpScenarioId,
    targetSlot: 1 | 2 | 3 | 4
  ) => {
    setPumpScenario(nextPumpScenario);
    setAssignedPumpSlot(targetSlot);

    setPumps((prev) =>
      prev.map((p) => {
        if (p.bayIndex !== targetSlot) {
          return p;
        }

        if (nextPumpScenario === 'OCCLUSION_DOWNSTREAM') {
          return {
            ...p,
            occluded: true,
            running: false,
            linePressureMmHg: OCCLUSION_PRESSURE_MMHG[p.occlusionLevel] + 50,
            alarmState: 'CRITICAL',
            alarmMessage: `Occlusion (> L${p.occlusionLevel})`,
          };
        }

        if (nextPumpScenario === 'SYRINGE_EMPTY') {
          return {
            ...p,
            volumeRemainingMl: 0,
            running: false,
            alarmState: 'CRITICAL',
            alarmMessage: p.pumpType === 'SYRINGE' ? 'Syringe empty' : 'IV Bag empty',
          };
        }

        if (nextPumpScenario === 'AIR_OR_UNPLUGGED_LINE') {
          return {
            ...p,
            ivTubeConnected: false,
            running: false,
            alarmState: 'CRITICAL',
            alarmMessage: 'IV line disconnected from Bed 1 CVC',
          };
        }

        // PUMP_NORMAL restores assigned pump slot to clean running state
        return {
          ...p,
          occluded: false,
          containerLoaded: true,
          ivTubeConnected: true,
          ivTubePrimed: true,
          volumeRemainingMl:
            p.volumeRemainingMl <= 0 ? p.containerTotalMl * 0.65 : p.volumeRemainingMl,
          vtbiMl: p.vtbiMl <= 0 ? p.containerTotalMl * 0.65 : p.vtbiMl,
          linePressureMmHg: 120,
          alarmState: 'NONE',
          alarmMessage: null,
          running: true,
        };
      })
    );
  };

  // Core 4Hz PK/PD & Hemodynamic Coupled Simulation Loop
  useEffect(() => {
    let tickCount = 0;
    const interval = window.setInterval(() => {
      const dtSec = 0.25;
      tickCount += 1;

      setBatteryPct((prevBatt) => {
        if (mainsRef.current) return Math.min(100, prevBatt + 0.08);
        return Math.max(0, prevBatt - 0.06);
      });

      if (tickCount % 4 === 0) {
        setAlarmsSilencedSec((s) => (s > 0 ? s - 1 : 0));
      }

      setPumps((prevPumps) => {
        const pk = stepPumpsAndPharmacokinetics(
          prevPumps,
          dtSec,
          weightRef.current,
          mainsRef.current,
          battRef.current
        );

        const preset = MONITOR_SCENARIO_PRESETS[monitorScenarioRef.current].modifiers;
        const off = offsetsRef.current;

        setVitals((prevVitals) => {
          const rhythm = preset.rhythm;
          const rawHr =
            rhythm === 'ASYSTOLE'
              ? 0
              : Math.max(
                  24,
                  Math.min(220, Math.round(preset.baseHr + pk.netDeltaHr + off.hrOffset))
                );

          const rawMap =
            rhythm === 'ASYSTOLE'
              ? 15
              : Math.max(
                  22,
                  Math.min(175, Math.round(preset.baseAbpMap + pk.netDeltaMap + off.mapOffset))
                );

          const pp =
            rhythm === 'ASYSTOLE'
              ? 0
              : Math.max(12, Math.round(preset.basePulsePressure + pk.netDeltaSysExtra));

          const abpDia =
            rhythm === 'ASYSTOLE' ? 14 : Math.max(18, Math.round(rawMap - pp * 0.42));
          const abpSys = rhythm === 'ASYSTOLE' ? 16 : abpDia + pp;

          const papSys = Math.max(12, Math.round(preset.basePapSys + pk.netDeltaPap));
          const papDia = Math.max(6, Math.round(preset.basePapDia + pk.netDeltaPap * 0.6));
          const papMap = Math.round(papDia + (papSys - papDia) / 3);

          const cvp = Math.max(0, Math.min(28, Math.round(preset.baseCvp + pk.netDeltaCvp)));
          const icp = Math.max(
            1,
            Math.min(45, Math.round(preset.baseIcp + pk.netDeltaIcp + off.icpOffset))
          );
          const cpp = Math.max(0, rawMap - icp);

          const spo2 =
            rhythm === 'ASYSTOLE'
              ? 0
              : Math.max(60, Math.min(100, Math.round(preset.baseSpo2 + off.spo2Offset)));

          const respRate =
            rhythm === 'ASYSTOLE'
              ? 0
              : Math.max(
                  4,
                  Math.min(48, Math.round(preset.baseRespRate + pk.netDeltaResp + off.respOffset))
                );

          const etco2 =
            rhythm === 'ASYSTOLE'
              ? 6
              : Math.max(10, Math.min(75, Math.round(preset.baseEtco2 - (respRate - 15) * 0.45)));

          const nextStValues = {} as TwelveLeadStMap;
          for (const lead of ALL_TWELVE_LEADS) {
            const baseSt = preset.stTemplate[lead] ?? 0;
            nextStValues[lead] = Number((baseSt + pk.netDeltaSt * 0.4).toFixed(1));
          }

          const coTarget =
            rhythm === 'ASYSTOLE'
              ? 0
              : Math.max(1.8, Math.min(9.5, Number((3.4 + (rawMap - 55) * 0.045).toFixed(1))));
          const bsa = Math.sqrt((175 * weightRef.current) / 3600);
          const ciTarget = Number((coTarget / Math.max(1.2, bsa)).toFixed(2));

          let nbpInflating = prevVitals.nbpInflating;
          let nbpCuffPressure = prevVitals.nbpCuffPressure;
          let nbpSys = prevVitals.nbpSys;
          let nbpDia = prevVitals.nbpDia;
          let nbpMap = prevVitals.nbpMap;
          let nbpTimestamp = prevVitals.nbpTimestamp;
          let venipunctureActive = prevVitals.venipunctureActive;
          let venipunctureSecRemaining = prevVitals.venipunctureSecRemaining;

          if (venipunctureActive) {
            nbpCuffPressure = 60;
            if (tickCount % 4 === 0) {
              venipunctureSecRemaining = Math.max(0, venipunctureSecRemaining - 1);
              if (venipunctureSecRemaining <= 0) {
                venipunctureActive = false;
                nbpCuffPressure = 0;
              }
            }
          } else if (nbpInflating) {
            nbpCuffPressure += 22;
            if (nbpCuffPressure >= abpSys + 32) {
              nbpInflating = false;
              nbpCuffPressure = 0;
              nbpSys = abpSys;
              nbpDia = abpDia;
              nbpMap = rawMap;
              nbpTimestamp = new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              });
              clinicalAudio.playNbpComplete();
            }
          }

          const updatedVitals: PatientVitals = {
            ...prevVitals,
            hr: rawHr,
            pvcCount: rhythm === 'VTACH' ? 28 : rhythm === 'AFIB' ? 3 : 0,
            rhythm,
            stValues: nextStValues,
            stIndex: computeStIndex(nextStValues),
            spo2,
            pulseRate: rhythm === 'ASYSTOLE' ? 0 : rawHr,
            perfusionIndex: Math.max(0, Number((preset.basePi + pk.netDeltaPi).toFixed(1))),
            abpSys,
            abpDia,
            abpMap: rawMap,
            papSys,
            papDia,
            papMap,
            cvp,
            icp,
            cpp,
            nbpInflating,
            nbpCuffPressure,
            nbpSys,
            nbpDia,
            nbpMap,
            nbpTimestamp,
            venipunctureActive,
            venipunctureSecRemaining,
            etco2,
            awrr: respRate,
            respRate,
            tempCoreC: preset.baseTempC,
            tempSkinC: Number((preset.baseTempC - 0.1).toFixed(1)),
            coLMin: coTarget,
            ciLMinM2: ciTarget,
          };

          if (tickCount % 48 === 0) {
            const norepiPump = pk.updatedPumps.find((p) => p.drugId === 'norepinephrine');
            const crystPump = pk.updatedPumps.find((p) => p.drugId === 'sterofundin');
            const now = Date.now();
            setTrends((old) => [
              ...old.slice(-60),
              {
                timestampMs: now,
                timeLabel: new Date(now).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                hr: updatedVitals.hr,
                spo2: updatedVitals.spo2,
                abpSys: updatedVitals.abpSys,
                abpDia: updatedVitals.abpDia,
                abpMap: updatedVitals.abpMap,
                papMap: updatedVitals.papMap,
                cvp: updatedVitals.cvp,
                icp: updatedVitals.icp,
                etco2: updatedVitals.etco2,
                respRate: updatedVitals.respRate,
                tempCoreC: updatedVitals.tempCoreC,
                norepiRateMlH:
                  norepiPump?.running && norepiPump.ivTubeConnected ? norepiPump.rateMlH : 0,
                crystalloidMlH:
                  crystPump?.running && crystPump.ivTubeConnected ? crystPump.rateMlH : 0,
              },
            ]);
          }

          return updatedVitals;
        });

        return pk.updatedPumps;
      });
    }, 250);

    return () => window.clearInterval(interval);
  }, []);

  // Monitor alarms isolated strictly to IntelliVue physiological & EMS module state
  const activeAlarms: ActiveAlarm[] = evaluateSystemAlarms(
    vitals,
    thresholds,
    modules
  );

  const highestActivePriority = activeAlarms.some((a) => a.priority === 'HIGH')
    ? 'HIGH'
    : activeAlarms.some((a) => a.priority === 'MEDIUM')
      ? 'MEDIUM'
      : activeAlarms.some((a) => a.priority === 'LOW_INOP')
        ? 'LOW_INOP'
        : null;

  // Video-Calibrated Philips Audible Alarm Loop (1020ms Red bell chime cadence from My_parameters_b9db6ae2.mp4, muted in Standby!)
  useEffect(() => {
    if (
      !audioEnabled ||
      alarmVolume <= 0 ||
      standbyMode ||
      alarmsPaused ||
      alarmsSilencedSec > 0 ||
      !highestActivePriority
    ) {
      return;
    }

    const playNow = () => {
      if (highestActivePriority === 'HIGH') {
        clinicalAudio.playHighPriorityBurst();
      } else if (highestActivePriority === 'MEDIUM') {
        clinicalAudio.playMediumPriorityBurst();
      } else if (highestActivePriority === 'LOW_INOP') {
        clinicalAudio.playLowPriorityInop();
      }
    };

    playNow();
    const cadenceMs =
      highestActivePriority === 'HIGH'
        ? 1020
        : highestActivePriority === 'MEDIUM'
          ? 2200
          : 10000;
    const id = window.setInterval(playNow, cadenceMs);
    return () => window.clearInterval(id);
  }, [
    audioEnabled,
    alarmVolume,
    alarmToneStandard,
    standbyMode,
    alarmsPaused,
    alarmsSilencedSec,
    highestActivePriority,
  ]);

  const handleSelectMonitorModel = (model: MonitorModel) => {
    setMonitorModel(model);
    if (model === 'MX700') {
      setScreenView('DYNAMIC_WAVES');
    } else {
      setScreenView('STANDARD_WAVES');
    }
  };

  const handleTriggerNbp = (stat = false) => {
    setVitals((prev) => ({
      ...prev,
      venipunctureActive: false,
      venipunctureSecRemaining: 0,
      nbpInflating: true,
      nbpCuffPressure: 42,
      nbpStatActive: stat ? true : prev.nbpStatActive,
    }));
  };

  const handleStopNbp = () => {
    setVitals((prev) => ({
      ...prev,
      nbpInflating: false,
      nbpCuffPressure: 0,
      nbpStatActive: false,
      venipunctureActive: false,
      venipunctureSecRemaining: 0,
    }));
  };

  const handleStartVenipuncture = () => {
    setVitals((prev) => ({
      ...prev,
      nbpInflating: false,
      nbpStatActive: false,
      venipunctureActive: true,
      venipunctureSecRemaining: 170,
      nbpCuffPressure: 60,
    }));
  };

  const handleZeroPressure = (channel: 'ABP' | 'PAP' | 'CVP' | 'ICP' | 'ALL') => {
    setVitals((prev) => ({
      ...prev,
      abpZeroed: channel === 'ABP' || channel === 'ALL' ? true : prev.abpZeroed,
      papZeroed: channel === 'PAP' || channel === 'ALL' ? true : prev.papZeroed,
      cvpZeroed: channel === 'CVP' || channel === 'ALL' ? true : prev.cvpZeroed,
      icpZeroed: channel === 'ICP' || channel === 'ALL' ? true : prev.icpZeroed,
    }));
  };

  const handleStoreStReference = () => {
    setVitals((prev) => ({
      ...prev,
      stReference: { ...prev.stValues },
    }));
  };

  const handleStartCoMeasurement = () => {
    setVitals((prev) => ({
      ...prev,
      coMeasuring: true,
    }));
    window.setTimeout(() => {
      setVitals((prev) => ({
        ...prev,
        coMeasuring: false,
        coLastTime: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
      }));
    }, 2400);
  };

  const handleToggleModulePlugged = (slotId: string) => {
    setModules((prev) =>
      prev.map((m) => (m.slotId === slotId ? { ...m, pluggedIn: !m.pluggedIn } : m))
    );
  };

  const handleToggleModuleCableWired = (slotId: string) => {
    setModules((prev) =>
      prev.map((m) => (m.slotId === slotId ? { ...m, cableWired: !m.cableWired } : m))
    );
  };

  const handleBulkWireModules = (wired: boolean) => {
    setModules((prev) =>
      prev.map((m) => ({
        ...m,
        pluggedIn: wired ? true : m.pluggedIn,
        cableWired: wired,
      }))
    );
  };

  const handleBulkSetIvTubing = (connected: boolean) => {
    setPumps((prev) =>
      prev.map((p) => ({
        ...p,
        ivTubeConnected: connected,
        ivTubePrimed: connected ? true : p.ivTubePrimed,
        alarmState: connected ? 'NONE' : p.running ? 'CRITICAL' : 'PRE_ALARM',
        alarmMessage: connected ? null : 'IV line disconnected from Bed 1 CVC',
      }))
    );
  };

  const handleUpdatePump = (
    pumpId: string,
    updater: (prev: PumpChannelState) => PumpChannelState
  ) => {
    setPumps((prev) => prev.map((p) => (p.id === pumpId ? updater(p) : p)));
  };

  const handleTriggerOcclusion = (pumpId: string) => {
    setPumps((prev) =>
      prev.map((p) =>
        p.id === pumpId
          ? {
              ...p,
              occluded: true,
              running: false,
              linePressureMmHg: OCCLUSION_PRESSURE_MMHG[p.occlusionLevel] + 55,
              alarmState: 'CRITICAL',
              alarmMessage: `Occlusion (> L${p.occlusionLevel})`,
            }
          : p
      )
    );
  };

  const handleClearOcclusion = (pumpId: string) => {
    setPumps((prev) =>
      prev.map((p) =>
        p.id === pumpId
          ? {
              ...p,
              antiBolusRewinding: true,
              alarmMessage: 'Anti-bolus rewind active…',
            }
          : p
      )
    );
    window.setTimeout(() => {
      setPumps((prev) =>
        prev.map((p) =>
          p.id === pumpId
            ? {
                ...p,
                occluded: false,
                antiBolusRewinding: false,
                linePressureMmHg: 115,
                alarmState: 'NONE',
                alarmMessage: null,
                running: true,
              }
            : p
        )
      );
    }, 900);
  };

  if (activeStation === 'LAUNCHER') {
    return (
      <LauncherScreen
        vitals={vitals}
        monitorModel={monitorModel}
        onSelectMonitorModel={handleSelectMonitorModel}
        pumps={pumps}
        modules={modules}
        monitorScenario={monitorScenario}
        onSelectMonitorScenario={handleSelectMonitorScenario}
        pumpScenario={pumpScenario}
        assignedPumpSlot={assignedPumpSlot}
        onSelectPumpScenario={handleSelectPumpScenario}
        onLaunchStation={(station) => setActiveStation(station)}
      />
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0c0e13] text-slate-100 flex flex-col xl:flex-row overflow-x-hidden">
      <main className="flex-1 min-w-0 p-3 sm:p-5 flex flex-col items-center justify-center gap-5 overflow-y-auto">
        {activeStation === 'INTELLIVUE' && (
          <div className="w-full max-w-[1160px] flex flex-col items-center gap-4">
            <PhilipsMonitorScreen
              vitals={vitals}
              monitorModel={monitorModel}
              modules={modules}
              onToggleModulePlugged={handleToggleModulePlugged}
              onToggleModuleCableWired={handleToggleModuleCableWired}
              thresholds={thresholds}
              activeAlarms={activeAlarms}
              alarmsSilencedSec={alarmsSilencedSec}
              alarmsPaused={alarmsPaused}
              standbyMode={standbyMode}
              onSetStandbyMode={setStandbyMode}
              onSilenceAlarms={() => setAlarmsSilencedSec(120)}
              onTogglePauseAlarms={() => setAlarmsPaused((p) => !p)}
              onUpdateThresholds={setThresholds}
              onUpdatePatientField={(field, val) =>
                setVitals((prev) => ({ ...prev, [field]: val }))
              }
              patientWeightKg={patientWeightKg}
              onChangePatientWeightKg={setPatientWeightKg}
              tempUnit={tempUnit}
              onToggleTempUnit={() => setTempUnit((u) => (u === 'C' ? 'F' : 'C'))}
              screenView={screenView}
              onSwitchScreenView={setScreenView}
              onTriggerNbp={handleTriggerNbp}
              onStopNbp={handleStopNbp}
              onStartVenipuncture={handleStartVenipuncture}
              onZeroPressure={handleZeroPressure}
              onStoreStReference={handleStoreStReference}
              onStartCoMeasurement={handleStartCoMeasurement}
              onOpenModulesStation={() => setActiveStation('MODULE_RACK')}
              trends={trends}
              pumps={pumps}
              selectedBiosciDrugId={selectedBiosciDrugId}
              onSelectBiosciDrugId={setSelectedBiosciDrugId}
              audioEnabled={audioEnabled}
              alarmVolume={alarmVolume}
              alarmToneStandard={alarmToneStandard}
              qrsBeepEnabled={qrsBeepEnabled}
              onChangeAlarmAudio={handleChangeAlarmAudio}
            />

            {showDockedRackUnderMonitor && (
              <PhilipsModuleRack
                modules={modules}
                vitals={vitals}
                compactMode
                onToggleModulePlugged={handleToggleModulePlugged}
                onToggleModuleCableWired={handleToggleModuleCableWired}
                onBulkWireModules={handleBulkWireModules}
                onTriggerNbp={handleTriggerNbp}
                onStopNbp={handleStopNbp}
                onZeroPressure={handleZeroPressure}
                onStartCoMeasurement={handleStartCoMeasurement}
              />
            )}
          </div>
        )}

        {activeStation === 'BBRAUN' && (
          <SpacePlusStation
            pumps={pumps}
            patientWeightKg={patientWeightKg}
            acMainsConnected={acMainsConnected}
            batteryPct={batteryPct}
            onToggleAcMains={() => setAcMainsConnected((m) => !m)}
            onUpdatePump={handleUpdatePump}
            onBulkSetIvTubing={handleBulkSetIvTubing}
            onTriggerDownstreamOcclusion={handleTriggerOcclusion}
            onClearDownstreamOcclusion={handleClearOcclusion}
            onReturnToLauncher={() => setActiveStation('LAUNCHER')}
          />
        )}

        {activeStation === 'MODULE_RACK' && (
          <PhilipsModuleRack
            modules={modules}
            vitals={vitals}
            compactMode={false}
            onToggleModulePlugged={handleToggleModulePlugged}
            onToggleModuleCableWired={handleToggleModuleCableWired}
            onBulkWireModules={handleBulkWireModules}
            onTriggerNbp={handleTriggerNbp}
            onStopNbp={handleStopNbp}
            onZeroPressure={handleZeroPressure}
            onStartCoMeasurement={handleStartCoMeasurement}
            onReturnToMonitor={() => setActiveStation('INTELLIVUE')}
          />
        )}
      </main>

      <SimulationSidebar
        activeStation={activeStation}
        onSwitchStation={setActiveStation}
        monitorModel={monitorModel}
        onSelectMonitorModel={handleSelectMonitorModel}
        screenView={screenView}
        onSwitchScreenView={setScreenView}
        showDockedRackUnderMonitor={showDockedRackUnderMonitor}
        onToggleDockedRackUnderMonitor={() =>
          setShowDockedRackUnderMonitor((v) => !v)
        }
        monitorScenario={monitorScenario}
        onSelectMonitorScenario={handleSelectMonitorScenario}
        pumpScenario={pumpScenario}
        assignedPumpSlot={assignedPumpSlot}
        onChangeAssignedPumpSlot={setAssignedPumpSlot}
        onSelectPumpScenario={handleSelectPumpScenario}
        offsets={offsets}
        onChangeOffsets={setOffsets}
        patientWeightKg={patientWeightKg}
        onChangePatientWeightKg={setPatientWeightKg}
        vitals={vitals}
        onToggleOverlapWaves={() =>
          setVitals((prev) => {
            const next = !prev.overlapWaves;
            return {
              ...prev,
              overlapWaves: next,
              profileName: next ? 'Overlapping A' : 'SSC Sepsis',
            };
          })
        }
        standbyMode={standbyMode}
        onToggleStandbyMode={() => setStandbyMode((s) => !s)}
        modules={modules}
        onBulkWireModules={handleBulkWireModules}
        pumps={pumps}
        onBulkSetIvTubing={handleBulkSetIvTubing}
        onQuickTitratePump={(pumpId, deltaMlH) =>
          handleUpdatePump(pumpId, (prev) => {
            const d = getDrugById(prev.drugId);
            return {
              ...prev,
              rateMlH: Math.max(
                0.1,
                Math.min(d.hardMaxRateMlH, Number((prev.rateMlH + deltaMlH).toFixed(2)))
              ),
            };
          })
        }
        onTogglePumpRun={(pumpId) =>
          handleUpdatePump(pumpId, (prev) => ({
            ...prev,
            running: !prev.running,
          }))
        }
        onDefibrillate={() => {
          clinicalAudio.playKeyClick(true);
          setMonitorScenario('BASELINE');
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
      />
    </div>
  );
}
