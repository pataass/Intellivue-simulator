import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  EcgLead,
  MonitorModel,
  MonitorScreenView,
  PatientVitals,
  PhilipsHardwareModule,
  WaveTraceId,
} from '../../types/clinical';
import {
  ALL_TWELVE_LEADS,
  sampleAllTwelveLeadsEcg,
  samplePhysiologicalWaveforms,
} from '../../engine/physiologyEngine';

export type ClickableWaveChannel =
  | 'ECG'
  | 'ECG2'
  | 'SPO2'
  | 'ABP'
  | 'PAP'
  | 'CVP'
  | 'OVERLAP_PRESS'
  | 'ICP'
  | 'CO2'
  | 'RESP'
  | 'AWP'
  | 'EEG';

export const DEFAULT_EIGHT_WAVE_SLOTS: WaveTraceId[] = [
  'ECG_II',
  'PLETH',
  'ABP',
  'PAP',
  'CVP',
  'CO2',
  'ICP',
  'RESP',
];

interface WaveformCanvasProps {
  vitals: PatientVitals;
  monitorModel: MonitorModel;
  screenView?: MonitorScreenView;
  waveSlots?: WaveTraceId[];
  dynamicWavesMode?: boolean;
  modules: PhilipsHardwareModule[];
  paused?: boolean;
  cursorActive?: boolean;
  sweepSpeedMmPerSec?: 12.5 | 25 | 50;
  onSelectChannel?: (channel: ClickableWaveChannel) => void;
  onSelectWaveSlot?: (
    slotIndex: number,
    traceId: WaveTraceId,
    channel: ClickableWaveChannel
  ) => void;
  onHeartbeatBeep?: (spo2: number) => void;
}

interface LaneDescriptor {
  slotIndex: number;
  traceId: WaveTraceId;
  id: ClickableWaveChannel;
  ecgLead?: EcgLead;
  label: string;
  filterTag?: string;
  subLabel?: string;
  color: string;
  wired: boolean;
  abpWired?: boolean;
  papCvpWired?: boolean;
  scaleTop?: string;
  scaleMid?: string;
  scaleBot?: string;
  weight: number;
  topFrac: number;
  botFrac: number;
}

const WIRED_BIT_MMS = 1 << 0;
const WIRED_BIT_ABP = 1 << 1;
const WIRED_BIT_PAP = 1 << 2;
const WIRED_BIT_CVP = 1 << 3;
const WIRED_BIT_ICP = 1 << 4;
const WIRED_BIT_CO2 = 1 << 5;
const WIRED_BIT_EEG = 1 << 6;

interface SweepRingBuffer {
  numCols: number;
  populated: Uint8Array;
  wiredMask: Uint8Array;
  ecgLeads: Record<EcgLead, Float32Array>;
  pleth: Float32Array;
  respWave: Float32Array;
  abpMmHg: Float32Array;
  papMmHg: Float32Array;
  cvpMmHg: Float32Array;
  icpMmHg: Float32Array;
  eegUv: Float32Array;
}

interface Co2SweepRingBuffer {
  numCols: number;
  populated: Uint8Array;
  wiredMask: Uint8Array;
  co2MmHg: Float32Array;
  awpCmH2O: Float32Array;
}

function createSweepRingBuffer(numCols: number): SweepRingBuffer {
  const ecgLeads = {} as Record<EcgLead, Float32Array>;
  for (const lead of ALL_TWELVE_LEADS) {
    ecgLeads[lead] = new Float32Array(numCols);
  }
  return {
    numCols,
    populated: new Uint8Array(numCols),
    wiredMask: new Uint8Array(numCols),
    ecgLeads,
    pleth: new Float32Array(numCols),
    respWave: new Float32Array(numCols),
    abpMmHg: new Float32Array(numCols),
    papMmHg: new Float32Array(numCols),
    cvpMmHg: new Float32Array(numCols),
    icpMmHg: new Float32Array(numCols),
    eegUv: new Float32Array(numCols),
  };
}

function createCo2SweepRingBuffer(numCols: number): Co2SweepRingBuffer {
  return {
    numCols,
    populated: new Uint8Array(numCols),
    wiredMask: new Uint8Array(numCols),
    co2MmHg: new Float32Array(numCols),
    awpCmH2O: new Float32Array(numCols),
  };
}

function parseEcgLeadFromTrace(trace: WaveTraceId): EcgLead | null {
  if (!trace.startsWith('ECG_')) return null;
  const candidate = trace.slice(4) as EcgLead;
  return ALL_TWELVE_LEADS.includes(candidate) ? candidate : null;
}

export const WaveformCanvas: React.FC<WaveformCanvasProps> = ({
  vitals,
  monitorModel,
  screenView = 'STANDARD_WAVES',
  waveSlots = DEFAULT_EIGHT_WAVE_SLOTS,
  dynamicWavesMode = false,
  modules,
  paused = false,
  cursorActive = false,
  sweepSpeedMmPerSec = 25,
  onSelectChannel,
  onSelectWaveSlot,
  onHeartbeatBeep,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const vitalsRef = useRef<PatientVitals>(vitals);
  const modulesRef = useRef<PhilipsHardwareModule[]>(modules);
  const pausedRef = useRef<boolean>(paused);
  const speedRef = useRef<number>(sweepSpeedMmPerSec);
  const lanesRef = useRef<LaneDescriptor[]>([]);
  const beepCbRef = useRef(onHeartbeatBeep);

  const [cursorFracX, setCursorFracX] = useState<number>(0.54);

  useEffect(() => {
    vitalsRef.current = vitals;
  }, [vitals]);

  useEffect(() => {
    modulesRef.current = modules;
  }, [modules]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    speedRef.current = sweepSpeedMmPerSec;
  }, [sweepSpeedMmPerSec]);

  useEffect(() => {
    beepCbRef.current = onHeartbeatBeep;
  }, [onHeartbeatBeep]);

  const findMod = (key: PhilipsHardwareModule['parameterKey']) =>
    modules.find((m) => m.parameterKey === key && m.pluggedIn);

  const mmsMod = findMod('MMS');
  const abpMod = findMod('ABP');
  const papCvpMod = findMod('PAP_CVP');
  const icpMod = findMod('ICP');
  const co2Mod = findMod('CO2');
  const eegMod = findMod('EEG');

  const activeLanes: LaneDescriptor[] = useMemo(() => {
    const abpMidStr = String(Math.round(vitals.abpScale / 2));
    const rhythmSubLabel = vitals.paced
      ? 'Paced Rhythm'
      : vitals.rhythm === 'SINUS'
        ? 'SV Rhythm'
        : vitals.rhythm === 'VTACH'
          ? '*** V-Tach'
          : vitals.rhythm === 'AFIB'
            ? 'AFib'
            : '*** Asystole';

    const buildLaneForTrace = (
      traceId: WaveTraceId,
      slotIndex: number,
      isFirstEcg: boolean
    ): Omit<LaneDescriptor, 'topFrac' | 'botFrac'> | null => {
      if (traceId === 'OFF') return null;

      const ecgLead = parseEcgLeadFromTrace(traceId);
      if (ecgLead) {
        if (!mmsMod) return null;
        return {
          slotIndex,
          traceId,
          id: isFirstEcg ? 'ECG' : 'ECG2',
          ecgLead,
          label: ecgLead,
          filterTag: 'M',
          subLabel: isFirstEcg ? rhythmSubLabel : undefined,
          color: '#46e838',
          wired: mmsMod.cableWired,
          weight: isFirstEcg ? 1.08 : 0.96,
        };
      }

      switch (traceId) {
        case 'PLETH':
          if (!mmsMod) return null;
          return {
            slotIndex,
            traceId,
            id: 'SPO2',
            label: 'Pleth',
            color: '#45d8ff',
            wired: mmsMod.cableWired,
            weight: 1.08,
          };
        case 'ABP':
          if (!abpMod) return null;
          return {
            slotIndex,
            traceId,
            id: 'ABP',
            label: vitals.abpLabel,
            color: '#ef4444',
            wired: abpMod.cableWired && vitals.abpZeroed,
            scaleTop: String(vitals.abpScale),
            scaleMid: abpMidStr,
            scaleBot: '0',
            weight: 1.08,
          };
        case 'PAP':
          if (!papCvpMod) return null;
          return {
            slotIndex,
            traceId,
            id: 'PAP',
            label: 'PAP',
            color: '#f7e043',
            wired: papCvpMod.cableWired && vitals.papZeroed,
            scaleTop: '30',
            scaleMid: '15',
            scaleBot: '0',
            weight: 1.04,
          };
        case 'CVP':
          if (!papCvpMod) return null;
          return {
            slotIndex,
            traceId,
            id: 'CVP',
            label: 'CVP',
            color: '#38d6ff',
            wired: papCvpMod.cableWired && vitals.cvpZeroed,
            scaleTop: '30',
            scaleMid: '15',
            scaleBot: '0',
            weight: 1.0,
          };
        case 'OVERLAP_PRESS': {
          if (!abpMod && !papCvpMod) return null;
          const abpTop = vitals.abpScale === 150 ? 120 : vitals.abpScale;
          const abpBot = vitals.abpScale === 150 ? 70 : 0;
          const abpMid = Math.round((abpTop + abpBot) / 2);
          return {
            slotIndex,
            traceId,
            id: 'OVERLAP_PRESS',
            label: vitals.abpLabel,
            color: '#ff6b3d',
            wired: Boolean(
              (abpMod && abpMod.cableWired) || (papCvpMod && papCvpMod.cableWired)
            ),
            abpWired: Boolean(abpMod && abpMod.cableWired && vitals.abpZeroed),
            papCvpWired: Boolean(papCvpMod && papCvpMod.cableWired),
            scaleTop: String(abpTop),
            scaleMid: String(abpMid),
            scaleBot: String(abpBot),
            weight: 2.3,
          };
        }
        case 'ICP':
          if (!icpMod) return null;
          return {
            slotIndex,
            traceId,
            id: 'ICP',
            label: 'ICP',
            color: '#e879f9',
            wired: icpMod.cableWired && vitals.icpZeroed,
            scaleTop: '30',
            scaleMid: '15',
            scaleBot: '0',
            weight: 1.04,
          };
        case 'CO2':
          if (!co2Mod) return null;
          return {
            slotIndex,
            traceId,
            id: 'CO2',
            label: 'CO2',
            color: '#e2e8f0',
            wired: co2Mod.cableWired,
            scaleTop: '40',
            scaleBot: '0',
            weight: 1.06,
          };
        case 'AWP':
          if (!co2Mod) return null;
          return {
            slotIndex,
            traceId,
            id: 'AWP',
            label: 'AWP',
            color: '#cbd5e1',
            wired: co2Mod.cableWired,
            scaleTop: '40',
            scaleBot: '0',
            weight: 1.0,
          };
        case 'RESP':
          if (!mmsMod) return null;
          return {
            slotIndex,
            traceId,
            id: 'RESP',
            label: 'Resp',
            color: '#efe0a6',
            wired: mmsMod.cableWired,
            weight: 0.96,
          };
        case 'EEG':
          if (!eegMod) return null;
          return {
            slotIndex,
            traceId,
            id: 'EEG',
            label: 'EEG',
            color: '#fde047',
            wired: eegMod.cableWired,
            scaleTop: '+50',
            scaleMid: '0',
            scaleBot: '-50',
            weight: 0.94,
          };
      }
    };

    const isOverlapScreen =
      vitals.overlapWaves || screenView === 'OVERLAP_WAVES';

    let targetSlotEntries: { slotIndex: number; traceId: WaveTraceId }[] = [];

    if (isOverlapScreen) {
      const primaryEcg: WaveTraceId = `ECG_${vitals.ecgLead}`;
      const secondaryEcg: WaveTraceId = `ECG_${vitals.secondaryEcgLead}`;
      if (monitorModel === 'MX400') {
        targetSlotEntries = [
          { slotIndex: 0, traceId: primaryEcg },
          { slotIndex: 2, traceId: 'OVERLAP_PRESS' },
          { slotIndex: 1, traceId: 'PLETH' },
        ];
      } else {
        targetSlotEntries = [
          { slotIndex: 0, traceId: primaryEcg },
          { slotIndex: 1, traceId: secondaryEcg },
          { slotIndex: 2, traceId: 'OVERLAP_PRESS' },
          { slotIndex: 3, traceId: 'PLETH' },
          { slotIndex: 5, traceId: co2Mod ? 'CO2' : 'RESP' },
        ];
      }
    } else {
      let desiredCount = 6;
      if (monitorModel === 'MX400' || screenView === 'THREE_WAVES') {
        desiredCount = 3;
      } else if (
        screenView === 'FOUR_WAVES' ||
        screenView === 'DYNAMIC_WAVES' ||
        (monitorModel === 'MX700' &&
          screenView !== 'SIX_WAVES' &&
          screenView !== 'EIGHT_WAVES')
      ) {
        desiredCount = 4;
      } else if (screenView === 'EIGHT_WAVES') {
        desiredCount = 8;
      } else {
        // SIX_WAVES, STANDARD_WAVES, ST_MAP_SPLIT, IPC_BIOSCI
        desiredCount = 6;
      }

      for (let i = 0; i < desiredCount; i++) {
        const fallback = DEFAULT_EIGHT_WAVE_SLOTS[i] ?? 'OFF';
        const chosen = waveSlots[i] ?? fallback;
        targetSlotEntries.push({ slotIndex: i, traceId: chosen });
      }
    }

    const raw: Omit<LaneDescriptor, 'topFrac' | 'botFrac'>[] = [];
    let seenEcg = false;

    for (const entry of targetSlotEntries) {
      const isEcg = entry.traceId.startsWith('ECG_');
      const built = buildLaneForTrace(
        entry.traceId,
        entry.slotIndex,
        isEcg && !seenEcg
      );
      if (built) {
        if (isEcg) seenEcg = true;
        raw.push(built);
      }
    }

    const totalWeight = Math.max(
      0.1,
      raw.reduce((acc, item) => acc + item.weight, 0)
    );
    let cursor = 0;
    return raw.map((item) => {
      const topFrac = cursor / totalWeight;
      cursor += item.weight;
      const botFrac = cursor / totalWeight;
      return {
        ...item,
        topFrac,
        botFrac,
      };
    });
  }, [
    mmsMod,
    abpMod,
    papCvpMod,
    icpMod,
    co2Mod,
    eegMod,
    monitorModel,
    screenView,
    waveSlots,
    dynamicWavesMode,
    vitals.ecgLead,
    vitals.secondaryEcgLead,
    vitals.paced,
    vitals.rhythm,
    vitals.abpScale,
    vitals.abpLabel,
    vitals.abpZeroed,
    vitals.papZeroed,
    vitals.cvpZeroed,
    vitals.icpZeroed,
    vitals.overlapWaves,
  ]);

  useEffect(() => {
    lanesRef.current = activeLanes;
  }, [activeLanes]);

  // Persistent Dual Ring-Buffer + Full-Frame Continuous-Path Renderer:
  // 1) Main hemodynamic/ECG ring buffer at monitor sweep speed (12.5 / 25 / 50 mm/s)
  // 2) Speed-adjacent slower Respiratory/etCO2 ring buffer (default 0.25x = 6.25 mm/s) showing ~8–16 solid-filled exhales
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const SAMPLE_STEP_CSS = 0.5;
    const LEFT_MARGIN = 42;
    const ERASE_GAP_CSS = 16;

    let animId = 0;
    let width = 0;
    let height = 0;
    let nativeDpr = 1;
    let supersample = 2;
    let dpr = 2;
    let ring: SweepRingBuffer = createSweepRingBuffer(600);
    let co2Ring: Co2SweepRingBuffer = createCo2SweepRingBuffer(600);

    let beatPhase = 0;
    let respPhase = 0;
    let simTimeSec = 0;
    let currentBeatJitter = 1.0;
    let colCursor = -1;
    let colFracCarry = 0;

    let co2RespPhase = 0;
    let co2SimTimeSec = 0;
    let co2Cursor = -1;
    let co2FracCarry = 0;
    let lastCo2Ratio = vitalsRef.current.co2SpeedRatio;

    let lastFrameMs = performance.now();

    const computeWiredMask = (
      v: PatientVitals,
      mods: PhilipsHardwareModule[]
    ): number => {
      let mask = 0;
      for (const m of mods) {
        if (!m.pluggedIn || !m.cableWired) continue;
        if (m.parameterKey === 'MMS') mask |= WIRED_BIT_MMS;
        else if (m.parameterKey === 'ABP' && v.abpZeroed) mask |= WIRED_BIT_ABP;
        else if (m.parameterKey === 'PAP_CVP') {
          if (v.papZeroed) mask |= WIRED_BIT_PAP;
          if (v.cvpZeroed) mask |= WIRED_BIT_CVP;
        } else if (m.parameterKey === 'ICP' && v.icpZeroed) mask |= WIRED_BIT_ICP;
        else if (m.parameterKey === 'CO2') mask |= WIRED_BIT_CO2;
        else if (m.parameterKey === 'EEG') mask |= WIRED_BIT_EEG;
      }
      return mask;
    };

    const seedCo2BufferOnly = (targetCols: number) => {
      const nextCo2 = createCo2SweepRingBuffer(targetCols);
      const v = vitalsRef.current;
      const mods = modulesRef.current;
      const mask = computeWiredMask(v, mods);
      const co2MmPerSec = speedRef.current * (v.co2SpeedRatio || 0.25);
      const co2PxPerSec = Math.max(12, (co2MmPerSec / 25) * 96);
      const co2ColsPerSec = co2PxPerSec / SAMPLE_STEP_CSS;
      const dtCo2 = 1 / co2ColsPerSec;
      const co2EraseCols = Math.max(8, Math.round((ERASE_GAP_CSS * 0.65) / SAMPLE_STEP_CSS));
      const totalSeedSteps = Math.floor(targetCols * 1.42);
      let cCur = -1;

      for (let s = 0; s < totalSeedSteps; s++) {
        co2SimTimeSec += dtCo2;
        if (v.respRate > 0 && v.rhythm !== 'ASYSTOLE') {
          co2RespPhase = (co2RespPhase + (v.respRate / 60) * dtCo2) % 1;
        }
        cCur = (cCur + 1) % targetCols;
        const samples = samplePhysiologicalWaveforms(
          0.1,
          co2RespPhase,
          co2SimTimeSec,
          v
        );
        nextCo2.populated[cCur] = 1;
        nextCo2.wiredMask[cCur] = mask;
        nextCo2.co2MmHg[cCur] = samples.co2MmHg;
        nextCo2.awpCmH2O[cCur] = samples.awpCmH2O;
      }

      for (let g = 1; g <= co2EraseCols; g++) {
        nextCo2.populated[(cCur + g) % targetCols] = 0;
      }

      co2Ring = nextCo2;
      co2Cursor = cCur;
      co2FracCarry = 0;
      lastCo2Ratio = v.co2SpeedRatio;
    };

    const seedRingBufferFullScreen = (targetCols: number) => {
      const nextRing = createSweepRingBuffer(targetCols);
      const v = vitalsRef.current;
      const mods = modulesRef.current;
      const mask = computeWiredMask(v, mods);
      const pxPerSec = (speedRef.current / 25) * 116;
      const colsPerSec = pxPerSec / SAMPLE_STEP_CSS;
      const dtPerCol = 1 / colsPerSec;
      const eraseGapCols = Math.max(12, Math.round(ERASE_GAP_CSS / SAMPLE_STEP_CSS));
      const totalSeedSteps = Math.floor(targetCols * 1.42);
      let cursor = -1;

      for (let s = 0; s < totalSeedSteps; s++) {
        simTimeSec += dtPerCol;
        const prevBeat = beatPhase;
        if (v.hr > 0 && v.rhythm !== 'ASYSTOLE') {
          beatPhase = (beatPhase + (v.hr / 60) * dtPerCol) % 1;
        } else {
          beatPhase = (beatPhase + dtPerCol * 0.5) % 1;
        }
        if (v.respRate > 0 && v.rhythm !== 'ASYSTOLE') {
          respPhase = (respPhase + (v.respRate / 60) * dtPerCol) % 1;
        }

        let ecgBeatPhase = beatPhase;
        if (beatPhase > prevBeat) {
          if (prevBeat < 0.30 && beatPhase >= 0.30) ecgBeatPhase = 0.30;
          else if (prevBeat < 0.28 && beatPhase >= 0.28) ecgBeatPhase = 0.28;
          else if (prevBeat < 0.32 && beatPhase >= 0.32) ecgBeatPhase = 0.32;
        }

        cursor = (cursor + 1) % targetCols;
        const samples = samplePhysiologicalWaveforms(
          ecgBeatPhase,
          respPhase,
          simTimeSec,
          v
        );
        const allTwelve = sampleAllTwelveLeadsEcg(ecgBeatPhase, simTimeSec, v);

        nextRing.populated[cursor] = 1;
        nextRing.wiredMask[cursor] = mask;
        for (const lead of ALL_TWELVE_LEADS) {
          nextRing.ecgLeads[lead][cursor] = allTwelve[lead];
        }
        nextRing.pleth[cursor] = samples.pleth;
        nextRing.respWave[cursor] = samples.respWave;
        nextRing.abpMmHg[cursor] = samples.abpMmHg;
        nextRing.papMmHg[cursor] = samples.papMmHg;
        nextRing.cvpMmHg[cursor] = samples.cvpMmHg;
        nextRing.icpMmHg[cursor] = samples.icpMmHg;
        nextRing.eegUv[cursor] = samples.eegUv;
      }

      for (let g = 1; g <= eraseGapCols; g++) {
        nextRing.populated[(cursor + g) % targetCols] = 0;
      }

      ring = nextRing;
      colCursor = cursor;
      colFracCarry = 0;

      seedCo2BufferOnly(targetCols);
    };

    const initializeOrResize = () => {
      const rect = canvas.getBoundingClientRect();
      const nextNativeDpr = Math.max(1, window.devicePixelRatio || 1);
      const nextSupersample = nextNativeDpr < 2 ? 2 : 1;
      const nextDpr = nextNativeDpr * nextSupersample;
      const nextW = Math.max(240, Math.floor(rect.width));
      const nextH = Math.max(180, Math.floor(rect.height));

      if (nextW === width && nextH === height && nextDpr === dpr) {
        return;
      }

      nativeDpr = nextNativeDpr;
      supersample = nextSupersample;
      dpr = nextDpr;
      width = nextW;
      height = nextH;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      const sweepSpan = Math.max(80, width - LEFT_MARGIN - 3);
      const nextCols = Math.max(160, Math.floor(sweepSpan / SAMPLE_STEP_CSS));
      if (nextCols !== ring.numCols || colCursor < 0) {
        seedRingBufferFullScreen(nextCols);
      }
    };

    initializeOrResize();
    const ro = new ResizeObserver(() => initializeOrResize());
    ro.observe(canvas);

    const drawPixelLockedDottedLine = (
      xStartCss: number,
      xEndCss: number,
      yCss: number,
      color: string,
      alpha: number
    ) => {
      if (xEndCss <= xStartCss) return;
      const physUnit = supersample;
      const dotSizePhys = Math.max(1, Math.round(nativeDpr));
      const dotW = dotSizePhys * physUnit;
      const dotH = dotSizePhys * physUnit;
      const pitch = 3 * dotSizePhys * physUnit;

      const yBack = Math.round((yCss * dpr) / physUnit) * physUnit;
      const x0Back = Math.ceil((xStartCss * dpr) / pitch) * pitch;
      const x1Back = Math.floor(xEndCss * dpr);

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      for (let xb = x0Back; xb + dotW <= x1Back; xb += pitch) {
        ctx.fillRect(xb, yBack, dotW, dotH);
      }
      ctx.restore();
    };

    const drawPixelLockedSolidLine = (
      xStartCss: number,
      xEndCss: number,
      yCss: number,
      color: string,
      alpha: number
    ) => {
      if (xEndCss <= xStartCss) return;
      const physUnit = supersample;
      const lineH = Math.max(1, Math.round(nativeDpr)) * physUnit;
      const yBack = Math.round((yCss * dpr) / physUnit) * physUnit;
      const x0Back = Math.round(xStartCss * dpr);
      const x1Back = Math.round(xEndCss * dpr);
      if (x1Back <= x0Back) return;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(x0Back, yBack, x1Back - x0Back, lineH);
      ctx.restore();
    };

    const getPlethPlotBounds = (yTop: number, yBot: number) => {
      const pTop = yTop + (yBot - yTop) * 0.15;
      const pBot = yBot - (yBot - yTop) * 0.08;
      return { pTop, pBot, pSpan: pBot - pTop };
    };

    const drawAllBackgroundGridsAndLabels = (w: number, h: number) => {
      const lanes = lanesRef.current;
      const v = vitalsRef.current;
      const rightEdge = w - 3;

      for (const lane of lanes) {
        const yTop = lane.topFrac * h + 5;
        const yBot = lane.botFrac * h - 4;

        if (lane.id === 'OVERLAP_PRESS') {
          const plotTop = yTop + 11;
          const plotBot = yBot - 4;
          const spanY = plotBot - plotTop;

          for (let r = 1; r < 6; r++) {
            drawPixelLockedSolidLine(
              LEFT_MARGIN,
              rightEdge,
              plotTop + (spanY * r) / 6,
              '#cbd5e1',
              0.14
            );
          }

          ctx.save();
          ctx.strokeStyle = 'rgba(203, 213, 225, 0.14)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let gx = LEFT_MARGIN + 28; gx <= rightEdge; gx += 28) {
            const sx = Math.round(gx) + 0.5;
            ctx.moveTo(sx, plotTop);
            ctx.lineTo(sx, plotBot);
          }
          ctx.stroke();

          const sweepSpan = Math.max(100, rightEdge - LEFT_MARGIN);
          const zone1End = LEFT_MARGIN + sweepSpan * 0.33;
          const zone2End = LEFT_MARGIN + sweepSpan * 0.65;

          const drawZoneBounds = (zStart: number, zEnd: number, color: string) => {
            drawPixelLockedSolidLine(zStart, zEnd, plotTop, color, 0.82);
            drawPixelLockedSolidLine(zStart, zEnd, plotTop + spanY * 0.5, color, 0.72);
            drawPixelLockedSolidLine(zStart, zEnd, plotBot, color, 0.82);
          };

          drawZoneBounds(LEFT_MARGIN, zone1End - 4, '#ff6b3d');
          drawZoneBounds(zone1End + 4, zone2End - 4, '#f3a8d8');
          drawZoneBounds(zone2End + 4, rightEdge, '#38d6ff');

          ctx.font = '600 11px "Barlow Condensed", sans-serif';
          ctx.fillStyle = '#f3a8d8';
          ctx.fillText('PAP', zone1End + 2, yTop + 6);
          ctx.fillText('30', zone1End + 22, plotTop + 4);
          ctx.fillText('15', zone1End + 22, plotTop + spanY * 0.5 + 4);
          ctx.fillText('0', zone1End + 26, plotBot + 3);

          ctx.fillStyle = '#38d6ff';
          ctx.fillText('CVP', zone2End + 2, yTop + 6);
          ctx.fillText('30', zone2End + 22, plotTop + 4);
          ctx.fillText('15', zone2End + 22, plotTop + spanY * 0.5 + 4);
          ctx.fillText('0', zone2End + 26, plotBot + 3);
          ctx.restore();
        } else if (lane.id === 'SPO2') {
          const { pTop, pBot, pSpan } = getPlethPlotBounds(yTop, yBot);
          drawPixelLockedDottedLine(LEFT_MARGIN, rightEdge, pTop, '#45d8ff', 0.76);
          drawPixelLockedDottedLine(LEFT_MARGIN, rightEdge, pTop + pSpan * 0.25, '#45d8ff', 0.48);
          if (lane.wired) {
            drawPixelLockedSolidLine(LEFT_MARGIN, rightEdge, pTop + pSpan * 0.5, '#45d8ff', 0.65);
          }
          drawPixelLockedDottedLine(LEFT_MARGIN, rightEdge, pTop + pSpan * 0.75, '#45d8ff', 0.48);
          drawPixelLockedDottedLine(LEFT_MARGIN, rightEdge, pBot, '#45d8ff', 0.76);
        } else if (
          lane.id === 'ABP' ||
          lane.id === 'PAP' ||
          lane.id === 'CVP' ||
          lane.id === 'ICP' ||
          lane.id === 'EEG'
        ) {
          const plotTop = yTop + 6;
          const plotBot = yBot - 2;
          const plotMid = (plotTop + plotBot) * 0.5;
          drawPixelLockedDottedLine(LEFT_MARGIN, rightEdge, plotTop, lane.color, 0.76);
          drawPixelLockedDottedLine(LEFT_MARGIN, rightEdge, plotMid, lane.color, 0.6);
          drawPixelLockedDottedLine(LEFT_MARGIN, rightEdge, plotBot, lane.color, 0.76);
        } else if (lane.id === 'CO2' || lane.id === 'AWP') {
          const plotTop = yTop + 7;
          const plotBot = yBot - 2;
          drawPixelLockedDottedLine(LEFT_MARGIN, rightEdge, plotTop, '#cbd5e1', 0.68);
          drawPixelLockedDottedLine(LEFT_MARGIN, rightEdge, plotBot, '#cbd5e1', 0.68);
        }

        // Left Margin Labels & Calibration Bars
        ctx.save();
        ctx.font = '700 12.5px "Barlow Condensed", sans-serif';
        ctx.fillStyle = lane.color;
        ctx.fillText(lane.label, 4, yTop + 7);

        if (lane.filterTag) {
          ctx.font = '600 9.5px "Barlow Condensed", sans-serif';
          ctx.fillText(lane.filterTag, 4, yTop + 17);
        }

        if (lane.id === 'ECG' || lane.id === 'ECG2') {
          const calHeight = Math.min(28, (yBot - yTop) * 0.54) * Math.min(1.5, v.ecgGain);
          const calBaseY = yTop + (yBot - yTop) * 0.72;
          ctx.fillStyle = lane.color;
          ctx.fillRect(22, calBaseY - calHeight, 1.8, calHeight);
          ctx.font = '600 9.5px "Barlow Condensed", sans-serif';
          ctx.fillText('1mV', 25.5, calBaseY);

          if (lane.id === 'ECG' && lane.subLabel && lane.wired) {
            ctx.font = '600 11.5px "Barlow Condensed", sans-serif';
            ctx.fillStyle = '#e2e8f0';
            const textW = ctx.measureText(lane.subLabel).width;
            ctx.fillText(lane.subLabel, w - textW - 8, yTop + 6);
          }
        } else if (lane.id === 'RESP') {
          const calHeight = Math.min(22, (yBot - yTop) * 0.46);
          const calBaseY = yTop + (yBot - yTop) * 0.74;
          ctx.fillStyle = lane.color;
          ctx.fillRect(22, calBaseY - calHeight, 1.8, calHeight);
          ctx.font = '600 9.5px "Barlow Condensed", sans-serif';
          ctx.fillText('1Ohm', 25.5, calBaseY);
        } else if (lane.id === 'OVERLAP_PRESS') {
          const plotTop = yTop + 11;
          const plotBot = yBot - 4;
          const plotMid = (plotTop + plotBot) * 0.5;
          ctx.font = '600 11px "Barlow Condensed", sans-serif';
          ctx.fillStyle = '#ff6b3d';
          if (lane.scaleTop) ctx.fillText(lane.scaleTop, 22, plotTop + 4);
          if (lane.scaleMid) ctx.fillText(lane.scaleMid, 25, plotMid + 4);
          if (lane.scaleBot) ctx.fillText(lane.scaleBot, 25, plotBot + 3);
        } else if (
          lane.id === 'ABP' ||
          lane.id === 'PAP' ||
          lane.id === 'CVP' ||
          lane.id === 'ICP' ||
          lane.id === 'EEG'
        ) {
          const plotTop = yTop + 6;
          const plotBot = yBot - 2;
          const plotMid = (plotTop + plotBot) * 0.5;
          ctx.font = '600 10.5px "Barlow Condensed", sans-serif';
          ctx.fillStyle = lane.color;
          if (lane.scaleTop) {
            const tw = ctx.measureText(lane.scaleTop).width;
            ctx.fillText(lane.scaleTop, LEFT_MARGIN - tw - 4, plotTop + 3.5);
          }
          if (lane.scaleMid) {
            const mw = ctx.measureText(lane.scaleMid).width;
            ctx.fillText(lane.scaleMid, LEFT_MARGIN - mw - 4, plotMid + 3.5);
          }
          if (lane.scaleBot) {
            const bw = ctx.measureText(lane.scaleBot).width;
            ctx.fillText(lane.scaleBot, LEFT_MARGIN - bw - 4, plotBot + 3);
          }
        } else if (lane.id === 'CO2' || lane.id === 'AWP') {
          const plotTop = yTop + 7;
          const plotBot = yBot - 2;
          ctx.font = '600 10.5px "Barlow Condensed", sans-serif';
          ctx.fillStyle = '#e2e8f0';
          if (lane.scaleTop) {
            const tw = ctx.measureText(lane.scaleTop).width;
            ctx.fillText(lane.scaleTop, LEFT_MARGIN - tw - 4, plotTop + 3.5);
          }
          if (lane.scaleBot) {
            const bw = ctx.measureText(lane.scaleBot).width;
            ctx.fillText(lane.scaleBot, LEFT_MARGIN - bw - 4, plotBot + 3);
          }
        }

        ctx.restore();
      }
    };

    const isColWiredForLane = (laneId: ClickableWaveChannel, mask: number): boolean => {
      switch (laneId) {
        case 'ECG':
        case 'ECG2':
        case 'SPO2':
        case 'RESP':
          return (mask & WIRED_BIT_MMS) !== 0;
        case 'ABP':
          return (mask & WIRED_BIT_ABP) !== 0;
        case 'PAP':
          return (mask & WIRED_BIT_PAP) !== 0;
        case 'CVP':
          return (mask & WIRED_BIT_CVP) !== 0;
        case 'ICP':
          return (mask & WIRED_BIT_ICP) !== 0;
        case 'CO2':
        case 'AWP':
          return (mask & WIRED_BIT_CO2) !== 0;
        case 'EEG':
          return (mask & WIRED_BIT_EEG) !== 0;
        case 'OVERLAP_PRESS':
          return (mask & (WIRED_BIT_ABP | WIRED_BIT_PAP | WIRED_BIT_CVP)) !== 0;
      }
    };

    const computeColumnY = (
      lane: LaneDescriptor,
      col: number,
      v: PatientVitals,
      h: number
    ): number => {
      const yTop = lane.topFrac * h + 5;
      const yBot = lane.botFrac * h - 4;

      if (lane.id === 'CO2' || lane.id === 'AWP') {
        const wired = isColWiredForLane(lane.id, co2Ring.wiredMask[col]);
        const plotTop = yTop + 7;
        const plotBot = yBot - 2;
        if (!wired) return plotBot;
        const val =
          lane.id === 'CO2' ? co2Ring.co2MmHg[col] : co2Ring.awpCmH2O[col];
        const frac = Math.max(0, Math.min(1.03, val / 40));
        return plotBot - frac * (plotBot - plotTop);
      }

      const wired = isColWiredForLane(lane.id, ring.wiredMask[col]);

      if (!wired) {
        if (lane.id === 'SPO2') {
          const { pTop, pSpan } = getPlethPlotBounds(yTop, yBot);
          return pTop + pSpan * 0.5;
        }
        if (lane.id === 'RESP') {
          return yTop + (yBot - yTop) * 0.74;
        }
        if (lane.id === 'ECG' || lane.id === 'ECG2') {
          return yTop + (yBot - yTop) * 0.68;
        }
        return (yTop + yBot) * 0.55;
      }

      switch (lane.id) {
        case 'ECG':
        case 'ECG2': {
          const leadKey = lane.ecgLead ?? v.ecgLead;
          const baseline = yTop + (yBot - yTop) * 0.68;
          const amp = (yBot - yTop) * (lane.id === 'ECG' ? 0.44 : 0.41);
          const sample = ring.ecgLeads[leadKey][col];
          return Math.max(yTop + 1, Math.min(yBot - 1, baseline - sample * amp));
        }
        case 'SPO2': {
          const { pTop, pBot, pSpan } = getPlethPlotBounds(yTop, yBot);
          return Math.max(pTop, Math.min(pBot, pBot - ring.pleth[col] * pSpan));
        }
        case 'RESP': {
          const mid = yTop + (yBot - yTop) * 0.62;
          const amp = (yBot - yTop) * 0.36;
          return Math.max(yTop + 2, Math.min(yBot - 2, mid - ring.respWave[col] * amp));
        }
        case 'ABP': {
          const plotTop = yTop + 6;
          const plotBot = yBot - 2;
          const frac = Math.max(0, Math.min(1.04, ring.abpMmHg[col] / v.abpScale));
          return plotBot - frac * (plotBot - plotTop);
        }
        case 'PAP': {
          const plotTop = yTop + 6;
          const plotBot = yBot - 2;
          const frac = Math.max(0, Math.min(1.05, ring.papMmHg[col] / 30));
          return plotBot - frac * (plotBot - plotTop);
        }
        case 'CVP': {
          const plotTop = yTop + 6;
          const plotBot = yBot - 2;
          const frac = Math.max(0, Math.min(1.04, ring.cvpMmHg[col] / 30));
          return plotBot - frac * (plotBot - plotTop);
        }
        case 'ICP': {
          const plotTop = yTop + 6;
          const plotBot = yBot - 2;
          const frac = Math.max(0, Math.min(1.05, ring.icpMmHg[col] / 30));
          return plotBot - frac * (plotBot - plotTop);
        }
        case 'EEG': {
          const plotTop = yTop + 6;
          const plotBot = yBot - 2;
          const mid = (plotTop + plotBot) * 0.5;
          return mid - ring.eegUv[col] * (plotBot - plotTop) * 0.42;
        }
        case 'OVERLAP_PRESS':
        case 'CO2':
        case 'AWP':
          return (yTop + yBot) * 0.5;
      }
    };

    const drawContinuousLaneTrace = (lane: LaneDescriptor, v: PatientVitals, h: number) => {
      const n = ring.numCols;

      if (lane.id === 'OVERLAP_PRESS') {
        const yTop = lane.topFrac * h + 5;
        const yBot = lane.botFrac * h - 4;
        const plotTop = yTop + 11;
        const plotBot = yBot - 4;
        const span = plotBot - plotTop;

        const strokeOverlapSubTrace = (
          bit: number,
          color: string,
          lineW: number,
          valFn: (c: number) => number
        ) => {
          ctx.save();
          ctx.strokeStyle = color;
          ctx.lineWidth = lineW;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';

          let inRun = false;
          ctx.beginPath();
          for (let c = 0; c < n; c++) {
            const ok = ring.populated[c] === 1 && (ring.wiredMask[c] & bit) !== 0;
            if (!ok) {
              if (inRun) {
                ctx.stroke();
                ctx.beginPath();
                inRun = false;
              }
              continue;
            }
            const x = LEFT_MARGIN + c * SAMPLE_STEP_CSS;
            const y = valFn(c);
            if (!inRun) {
              ctx.moveTo(x, y);
              inRun = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
          if (inRun) ctx.stroke();
          ctx.restore();
        };

        strokeOverlapSubTrace(WIRED_BIT_CVP, '#38d6ff', 1.6, (c) => {
          const frac = Math.max(0, Math.min(1.02, ring.cvpMmHg[c] / 30));
          return plotBot - frac * span;
        });
        strokeOverlapSubTrace(WIRED_BIT_PAP, '#f3a8d8', 1.7, (c) => {
          const frac = Math.max(0, Math.min(1.04, ring.papMmHg[c] / 30));
          return plotBot - frac * span;
        });
        strokeOverlapSubTrace(WIRED_BIT_ABP, '#ff6b3d', 1.75, (c) => {
          const abpLow = v.abpScale === 150 ? 68 : 0;
          const abpHigh = v.abpScale === 150 ? 122 : v.abpScale;
          const frac = Math.max(
            0,
            Math.min(1.03, (ring.abpMmHg[c] - abpLow) / Math.max(10, abpHigh - abpLow))
          );
          return plotBot - frac * span;
        });
        return;
      }

      if (lane.id === 'CO2' || lane.id === 'AWP') {
        const yBot = lane.botFrac * h - 4;
        const plotBot = yBot - 2;
        const cn = co2Ring.numCols;

        let c = 0;
        while (c < cn) {
          if (co2Ring.populated[c] !== 1) {
            c++;
            continue;
          }
          const runWired = isColWiredForLane(lane.id, co2Ring.wiredMask[c]);
          const runStart = c;
          while (
            c + 1 < cn &&
            co2Ring.populated[c + 1] === 1 &&
            isColWiredForLane(lane.id, co2Ring.wiredMask[c + 1]) === runWired
          ) {
            c++;
          }
          const runEnd = c;

          if (runWired && runEnd > runStart) {
            ctx.save();
            ctx.fillStyle = lane.id === 'CO2' ? '#dde4ed' : '#c2cddb';
            ctx.beginPath();
            ctx.moveTo(LEFT_MARGIN + runStart * SAMPLE_STEP_CSS, plotBot);
            for (let k = runStart; k <= runEnd; k++) {
              ctx.lineTo(
                LEFT_MARGIN + k * SAMPLE_STEP_CSS,
                computeColumnY(lane, k, v, h)
              );
            }
            ctx.lineTo(LEFT_MARGIN + runEnd * SAMPLE_STEP_CSS, plotBot);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.45;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.beginPath();
            for (let k = runStart; k <= runEnd; k++) {
              const x = LEFT_MARGIN + k * SAMPLE_STEP_CSS;
              const y = computeColumnY(lane, k, v, h);
              if (k === runStart) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();
          } else if (!runWired && runEnd > runStart) {
            ctx.save();
            ctx.strokeStyle = lane.color;
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.moveTo(LEFT_MARGIN + runStart * SAMPLE_STEP_CSS, plotBot);
            ctx.lineTo(LEFT_MARGIN + runEnd * SAMPLE_STEP_CSS, plotBot);
            ctx.stroke();
            ctx.restore();
          }

          c++;
        }
        return;
      }

      ctx.save();
      ctx.strokeStyle = lane.color;
      ctx.lineWidth = 1.65;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      let inRun = false;
      ctx.beginPath();
      for (let c = 0; c < n; c++) {
        if (ring.populated[c] !== 1) {
          if (inRun) {
            ctx.stroke();
            ctx.beginPath();
            inRun = false;
          }
          continue;
        }
        const x = LEFT_MARGIN + c * SAMPLE_STEP_CSS;
        const y = computeColumnY(lane, c, v, h);
        if (!inRun) {
          ctx.moveTo(x, y);
          inRun = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      if (inRun) {
        ctx.stroke();
      }
      ctx.restore();
    };

    const renderFrame = (nowMs: number) => {
      const dtSec = Math.min(0.05, Math.max(0.001, (nowMs - lastFrameMs) / 1000));
      lastFrameMs = nowMs;

      if (width > 48 && height > 48) {
        const v = vitalsRef.current;
        const mods = modulesRef.current;
        const n = ring.numCols;
        if (colCursor >= n) colCursor = colCursor % n;
        if (co2Cursor >= co2Ring.numCols) co2Cursor = co2Cursor % co2Ring.numCols;

        if (v.co2SpeedRatio !== lastCo2Ratio && n > 10) {
          seedCo2BufferOnly(n);
        }

        if (!pausedRef.current && n > 10) {
          const mask = computeWiredMask(v, mods);

          // 1A. Main Hemodynamic / ECG Sweep Accumulator (12.5 / 25 / 50 mm/s)
          const pxPerSec = (speedRef.current / 25) * 116;
          const colsPerSec = pxPerSec / SAMPLE_STEP_CSS;
          const dtPerCol = 1 / colsPerSec;

          colFracCarry += colsPerSec * dtSec;
          const colsToWrite = Math.min(n, Math.floor(colFracCarry));
          colFracCarry -= colsToWrite;

          const eraseGapCols = Math.max(12, Math.round(ERASE_GAP_CSS / SAMPLE_STEP_CSS));

          for (let s = 0; s < colsToWrite; s++) {
            simTimeSec += dtPerCol;
            const prevBeat = beatPhase;

            if (v.hr > 0 && v.rhythm !== 'ASYSTOLE') {
              const effHr = v.hr * currentBeatJitter;
              beatPhase += (effHr / 60) * dtPerCol;
              if (beatPhase >= 1) {
                beatPhase -= 1;
                currentBeatJitter =
                  v.rhythm === 'AFIB'
                    ? 0.72 + Math.random() * 0.56
                    : 0.999 + Math.random() * 0.002;
              }
              if (prevBeat < 0.30 && beatPhase >= 0.30 && beepCbRef.current) {
                beepCbRef.current(v.spo2);
              }
            } else {
              beatPhase = (beatPhase + dtPerCol * 0.5) % 1;
            }

            if (v.respRate > 0 && v.rhythm !== 'ASYSTOLE') {
              respPhase = (respPhase + (v.respRate / 60) * dtPerCol) % 1;
            }

            let ecgBeatPhase = beatPhase;
            if (beatPhase > prevBeat) {
              if (prevBeat < 0.30 && beatPhase >= 0.30) ecgBeatPhase = 0.30;
              else if (prevBeat < 0.28 && beatPhase >= 0.28) ecgBeatPhase = 0.28;
              else if (prevBeat < 0.32 && beatPhase >= 0.32) ecgBeatPhase = 0.32;
            }

            colCursor = (colCursor + 1) % n;

            const samples = samplePhysiologicalWaveforms(
              ecgBeatPhase,
              respPhase,
              simTimeSec,
              v
            );
            const allTwelve = sampleAllTwelveLeadsEcg(ecgBeatPhase, simTimeSec, v);

            ring.populated[colCursor] = 1;
            ring.wiredMask[colCursor] = mask;
            for (const lead of ALL_TWELVE_LEADS) {
              ring.ecgLeads[lead][colCursor] = allTwelve[lead];
            }
            ring.pleth[colCursor] = samples.pleth;
            ring.respWave[colCursor] = samples.respWave;
            ring.abpMmHg[colCursor] = samples.abpMmHg;
            ring.papMmHg[colCursor] = samples.papMmHg;
            ring.cvpMmHg[colCursor] = samples.cvpMmHg;
            ring.icpMmHg[colCursor] = samples.icpMmHg;
            ring.eegUv[colCursor] = samples.eegUv;

            for (let g = 1; g <= eraseGapCols; g++) {
              ring.populated[(colCursor + g) % n] = 0;
            }
          }

          // 1B. Coupled Slower Respiratory / etCO2 Sweep Accumulator (adjacent to main speed, e.g. 6.25 mm/s at 25 mm/s)
          const co2MmPerSec = speedRef.current * (v.co2SpeedRatio || 0.25);
          const co2PxPerSec = Math.max(12, (co2MmPerSec / 25) * 96);
          const co2ColsPerSec = co2PxPerSec / SAMPLE_STEP_CSS;
          const dtCo2 = 1 / co2ColsPerSec;

          co2FracCarry += co2ColsPerSec * dtSec;
          const co2ColsToWrite = Math.min(co2Ring.numCols, Math.floor(co2FracCarry));
          co2FracCarry -= co2ColsToWrite;

          const co2EraseCols = Math.max(8, Math.round((ERASE_GAP_CSS * 0.65) / SAMPLE_STEP_CSS));

          for (let cs = 0; cs < co2ColsToWrite; cs++) {
            co2SimTimeSec += dtCo2;
            if (v.respRate > 0 && v.rhythm !== 'ASYSTOLE') {
              co2RespPhase = (co2RespPhase + (v.respRate / 60) * dtCo2) % 1;
            }
            co2Cursor = (co2Cursor + 1) % co2Ring.numCols;
            const cSamples = samplePhysiologicalWaveforms(
              0.1,
              co2RespPhase,
              co2SimTimeSec,
              v
            );
            co2Ring.populated[co2Cursor] = 1;
            co2Ring.wiredMask[co2Cursor] = mask;
            co2Ring.co2MmHg[co2Cursor] = cSamples.co2MmHg;
            co2Ring.awpCmH2O[co2Cursor] = cSamples.awpCmH2O;

            for (let g = 1; g <= co2EraseCols; g++) {
              co2Ring.populated[(co2Cursor + g) % co2Ring.numCols] = 0;
            }
          }
        }

        // 2. Full-Frame Tear-Free Rasterization
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        drawAllBackgroundGridsAndLabels(width, height);

        for (const lane of lanesRef.current) {
          drawContinuousLaneTrace(lane, v, height);
        }
      }

      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / Math.max(1, rect.width);
    const relY = (e.clientY - rect.top) / Math.max(1, rect.height);

    if (cursorActive) {
      setCursorFracX(Math.max(0.08, Math.min(0.95, relX)));
      return;
    }

    const hit = activeLanes.find((l) => relY >= l.topFrac && relY <= l.botFrac);
    if (!hit) return;

    if (onSelectWaveSlot) {
      onSelectWaveSlot(hit.slotIndex, hit.traceId, hit.id);
    } else if (onSelectChannel) {
      onSelectChannel(hit.id);
    }
  };

  if (activeLanes.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-sm font-monitor text-neutral-400">
        NO MODULES PLUGGED IN — OPEN CONNECTED MODULES OR EMS RACK
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="block h-full w-full cursor-pointer"
        title={
          cursorActive
            ? 'Wave Cursor Active — Click anywhere along the trace to move caliper cursor'
            : 'Click any waveform trace to choose displayed parameter or configure wave settings'
        }
      />

      {paused && (
        <div className="pointer-events-none absolute top-1.5 right-3 px-2 py-0.5 bg-[#d4d6da] text-[#111318] border border-[#484b52] font-monitor text-xs font-bold">
          WAVES FROZEN
        </div>
      )}

      {cursorActive && (
        <div
          className="pointer-events-none absolute inset-y-0 w-px bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)]"
          style={{ left: `${cursorFracX * 100}%` }}
        >
          <div className="ml-1.5 mt-2 px-2 py-0.5 bg-[#d4d6da] text-[#111318] border border-[#484b52] font-monitor text-xs font-semibold whitespace-nowrap shadow">
            {vitals.abpLabel} {vitals.abpSys}/{vitals.abpDia} ({vitals.abpMap}) · PAP {vitals.papSys}/{vitals.papDia} · HR {vitals.hr}
          </div>
        </div>
      )}
    </div>
  );
};
