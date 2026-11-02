import React, { useMemo, useState } from 'react';
import {
  EcgLead,
  MonitorScreenView,
  PatientVitals,
  TrendPoint,
} from '../../types/clinical';
import {
  ALL_TWELVE_LEADS,
  synthesizeSingleLeadEcg,
} from '../../engine/physiologyEngine';

interface StMapMultiViewProps {
  vitals: PatientVitals;
  compactMode?: boolean;
  onUpdateStPointMs: (ms: 40 | 60 | 80) => void;
  onStoreStReference: () => void;
  onSelectPrimaryLead: (lead: EcgLead) => void;
  onSwitchScreenView: (view: MonitorScreenView) => void;
}

// Philips Cabrera Limb Plane axes (degrees in standard SVG coordinates where 0° = right / Lead I, +90° = down / aVF)
const FRONTAL_LIMB_AXES: {
  lead: EcgLead;
  label: string;
  angleDeg: number;
  invertSign?: boolean;
}[] = [
  { lead: 'aVL', label: 'aVL', angleDeg: -30 },
  { lead: 'I', label: 'I', angleDeg: 0 },
  { lead: 'aVR', label: '-aVR', angleDeg: 30, invertSign: true },
  { lead: 'II', label: 'II', angleDeg: 60 },
  { lead: 'aVF', label: 'aVF', angleDeg: 90 },
  { lead: 'III', label: 'III', angleDeg: 120 },
];

// Philips Horizontal Chest Plane axes (V1..V6)
const HORIZONTAL_CHEST_AXES: {
  lead: EcgLead;
  label: string;
  angleDeg: number;
}[] = [
  { lead: 'V1', label: 'V1', angleDeg: 115 },
  { lead: 'V2', label: 'V2', angleDeg: 90 },
  { lead: 'V3', label: 'V3', angleDeg: 68 },
  { lead: 'V4', label: 'V4', angleDeg: 45 },
  { lead: 'V5', label: 'V5', angleDeg: 22 },
  { lead: 'V6', label: 'V6', angleDeg: 0 },
];

function buildPolarPolygonPoints(
  axes: { lead: EcgLead; angleDeg: number; invertSign?: boolean }[],
  stMap: Record<EcgLead, number>,
  cx: number,
  cy: number,
  pxPerMm: number,
  maxRadiusPx: number
): string {
  return axes
    .map((ax) => {
      const rawMm = stMap[ax.lead] ?? 0;
      const signedMm = ax.invertSign ? -rawMm : rawMm;
      // Positive ST elevation extends outward along the lead axis; ST depression extends along the opposite (180°) pole
      const effectiveAngleDeg = signedMm >= 0 ? ax.angleDeg : ax.angleDeg + 180;
      const rad = (effectiveAngleDeg * Math.PI) / 180;
      const dist = Math.min(maxRadiusPx, Math.abs(signedMm) * pxPerMm);
      const x = cx + Math.cos(rad) * dist;
      const y = cy + Math.sin(rad) * dist;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export const StMapMultiView: React.FC<StMapMultiViewProps> = ({
  vitals,
  compactMode = false,
  onUpdateStPointMs,
  onStoreStReference,
  onSelectPrimaryLead,
  onSwitchScreenView,
}) => {
  const [subMode, setSubMode] = useState<'DUAL_POLAR_AND_TEMPLATES' | 'FRONTAL_ZOOM' | 'CHEST_ZOOM'>('DUAL_POLAR_AND_TEMPLATES');
  const [inspectedLead, setInspectedLead] = useState<EcgLead>(vitals.ecgLead);
  const [showRefOverlay, setShowRefOverlay] = useState<boolean>(true);

  const maxAbsSt = useMemo(
    () => Math.max(...ALL_TWELVE_LEADS.map((l) => Math.abs(vitals.stValues[l] ?? 0))),
    [vitals.stValues]
  );

  const polygonColor =
    maxAbsSt >= 2.0 ? '#ff3b30' : maxAbsSt >= 1.0 ? '#ffcc00' : '#39ff14';
  const polygonFill =
    maxAbsSt >= 2.0
      ? 'rgba(255, 59, 48, 0.36)'
      : maxAbsSt >= 1.0
        ? 'rgba(255, 204, 0, 0.32)'
        : 'rgba(57, 255, 20, 0.28)';

  const renderPolarDial = (
    title: string,
    subtitle: string,
    axes: { lead: EcgLead; label: string; angleDeg: number; invertSign?: boolean }[],
    size = 188
  ) => {
    const cx = size / 2;
    const cy = size / 2;
    const maxR = size * 0.37;
    const pxPerMm = maxR / 4.0; // 4 mm outer ring

    const livePts = buildPolarPolygonPoints(axes, vitals.stValues, cx, cy, pxPerMm, maxR);
    const refPts = buildPolarPolygonPoints(axes, vitals.stReference, cx, cy, pxPerMm, maxR);

    return (
      <div className="flex flex-col items-center justify-between bg-black border border-[#3a3f47] p-2">
        <div className="flex w-full items-center justify-between text-[10px] font-mono text-[#39ff14]">
          <span className="font-bold uppercase tracking-wider">{title}</span>
          <span className="text-neutral-400">{subtitle}</span>
        </div>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className={compactMode ? 'h-36 w-36' : 'h-44 w-44'}
        >
          {/* 1mm, 2mm, 3mm, 4mm concentric ST elevation rings */}
          {[1, 2, 3, 4].map((mm) => (
            <circle
              key={mm}
              cx={cx}
              cy={cy}
              r={mm * pxPerMm}
              fill="none"
              stroke={mm === 2 ? 'rgba(255, 255, 255, 0.36)' : 'rgba(255, 255, 255, 0.16)'}
              strokeDasharray={mm % 2 === 1 ? '1.2 2.2' : undefined}
              strokeWidth={mm === 2 ? 1 : 0.75}
            />
          ))}

          {/* Bipolar axes through origin */}
          {axes.map((ax) => {
            const rad = (ax.angleDeg * Math.PI) / 180;
            const xPos = cx + Math.cos(rad) * maxR;
            const yPos = cy + Math.sin(rad) * maxR;
            const xNeg = cx - Math.cos(rad) * maxR;
            const yNeg = cy - Math.sin(rad) * maxR;
            const lblX = cx + Math.cos(rad) * (maxR + 14);
            const lblY = cy + Math.sin(rad) * (maxR + 14);
            const val = ax.invertSign ? -(vitals.stValues[ax.lead] ?? 0) : vitals.stValues[ax.lead] ?? 0;
            const isSelected = inspectedLead === ax.lead;

            return (
              <g
                key={ax.label}
                onClick={() => {
                  setInspectedLead(ax.lead);
                  onSelectPrimaryLead(ax.lead);
                }}
                className="cursor-pointer"
              >
                <line
                  x1={xNeg}
                  y1={yNeg}
                  x2={xPos}
                  y2={yPos}
                  stroke="rgba(148, 163, 184, 0.28)"
                  strokeWidth={0.8}
                />
                <circle
                  cx={xPos}
                  cy={yPos}
                  r={2.3}
                  fill={Math.abs(val) >= 1.5 ? '#ff3b30' : '#39ff14'}
                />
                <text
                  x={lblX}
                  y={lblY + 3}
                  textAnchor="middle"
                  fill={isSelected ? '#ffffff' : '#39ff14'}
                  fontSize="9"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight={isSelected ? '700' : '600'}
                >
                  {ax.label}
                </text>
              </g>
            );
          })}

          {/* Stored Reference Baseline Polygon */}
          {showRefOverlay && (
            <polygon
              points={refPts}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={1.1}
              strokeDasharray="3 2"
            />
          )}

          {/* Live ST Elevation / Depression Polygon */}
          <polygon
            points={livePts}
            fill={polygonFill}
            stroke={polygonColor}
            strokeWidth={1.8}
          />
          <circle cx={cx} cy={cy} r={2} fill="#ffffff" />
        </svg>

        <div className="flex w-full items-center justify-between text-[9px] font-mono text-neutral-400">
          <span>Scale: 1 mm / ring (4 mm max)</span>
          <span style={{ color: polygonColor }}>
            Peak {maxAbsSt >= 0 ? `${maxAbsSt.toFixed(1)} mm` : '0.0 mm'}
          </span>
        </div>
      </div>
    );
  };

  // Build averaged single-complex QRS-ST template path for any lead
  const renderStComplexTile = (lead: EcgLead) => {
    const stVal = vitals.stValues[lead] ?? 0;
    const refVal = vitals.stReference[lead] ?? 0;
    const isInspected = inspectedLead === lead;
    const isPrimary = vitals.ecgLead === lead;
    const w = 96;
    const h = 52;
    const midY = 33;

    const pts: string[] = [];
    const steps = 120;
    for (let i = 0; i <= steps; i++) {
      const phase = 0.08 + (i / steps) * 0.66;
      const mv = synthesizeSingleLeadEcg(lead, phase, 0, {
        ...vitals,
        rhythm: vitals.rhythm === 'ASYSTOLE' ? 'SINUS' : vitals.rhythm,
        ecgGain: 1,
      });
      const x = (i / steps) * w;
      const y = Math.max(3, Math.min(h - 3, midY - mv * 18));
      pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }

    // J-point + offset marker X coordinate
    const jMarkerFrac = vitals.stPointMs === 40 ? 0.44 : vitals.stPointMs === 60 ? 0.48 : 0.52;
    const jX = ((jMarkerFrac - 0.08) / 0.66) * w;

    return (
      <button
        key={lead}
        type="button"
        onClick={() => {
          setInspectedLead(lead);
          onSelectPrimaryLead(lead);
        }}
        className={`flex flex-col justify-between bg-black p-1.5 text-left border transition-colors cursor-pointer ${
          isInspected
            ? 'border-[#39ff14]'
            : isPrimary
              ? 'border-[#2b7de9]'
              : 'border-[#2d323a] hover:border-neutral-500'
        }`}
        title={`Click to set Lead ${lead} as primary ECG trace and inspect ST point`}
      >
        <div className="flex w-full items-center justify-between text-[10px] font-mono leading-none">
          <span className="font-bold text-[#39ff14]">{lead}</span>
          <span
            className={`tabular-nums font-bold ${
              Math.abs(stVal) >= 2.0
                ? 'text-[#ff3b30]'
                : Math.abs(stVal) >= 1.0
                  ? 'text-[#ffcc00]'
                  : 'text-[#39ff14]'
            }`}
          >
            {stVal >= 0 ? `+${stVal.toFixed(1)}` : stVal.toFixed(1)}
          </span>
        </div>
        <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-full">
          {/* Crisp micro-dotted isoelectric reference line */}
          <line
            x1={0}
            y1={midY}
            x2={w}
            y2={midY}
            stroke="rgba(255,255,255,0.28)"
            strokeDasharray="1.2 2.4"
            strokeWidth={0.75}
          />
          {/* J + ms vertical measurement cursor */}
          <line
            x1={jX}
            y1={4}
            x2={jX}
            y2={h - 4}
            stroke="#38e8ff"
            strokeWidth={0.8}
          />
          <polyline
            fill="none"
            stroke={Math.abs(stVal) >= 2.0 ? '#ff4444' : '#46e838'}
            strokeWidth={1.45}
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pts.join(' ')}
          />
        </svg>
        <div className="flex w-full items-center justify-between text-[8px] font-mono text-neutral-400 leading-none">
          <span>Ref {refVal >= 0 ? `+${refVal.toFixed(1)}` : refVal.toFixed(1)}</span>
          <span>Δ {(stVal - refVal) >= 0 ? `+${(stVal - refVal).toFixed(1)}` : (stVal - refVal).toFixed(1)}</span>
        </div>
      </button>
    );
  };

  return (
    <div className="flex h-full w-full flex-col bg-black text-white select-none overflow-hidden border-l border-[#2c313a]">
      {/* Authentic Philips IntelliVue Window Title/Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 bg-[#363b44] px-2.5 py-1 border-b border-[#575e6b] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-tight text-white">
            ST Map Multi-View
          </span>
          <span className="text-[10px] font-mono text-[#39ff14] tabular-nums">
            STindx {vitals.stIndex.toFixed(1)} mm · J+{vitals.stPointMs}ms
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {(['DUAL_POLAR_AND_TEMPLATES', 'FRONTAL_ZOOM', 'CHEST_ZOOM'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSubMode(m)}
              className={`px-1.5 py-0.5 text-[10px] font-semibold border cursor-pointer ${
                subMode === m
                  ? 'bg-[#2b7de9] text-white border-[#7fb3ff]'
                  : 'bg-[#4b515c] text-neutral-100 border-[#6c7380] hover:bg-[#59606d]'
              }`}
            >
              {m === 'DUAL_POLAR_AND_TEMPLATES'
                ? 'Multi-View'
                : m === 'FRONTAL_ZOOM'
                  ? 'Limb Cabrera'
                  : 'Chest V1-V6'}
            </button>
          ))}

          {([40, 60, 80] as const).map((ms) => (
            <button
              key={ms}
              type="button"
              onClick={() => onUpdateStPointMs(ms)}
              className={`px-1.5 py-0.5 text-[10px] font-mono border cursor-pointer ${
                vitals.stPointMs === ms
                  ? 'bg-[#2563eb] text-white border-[#93c5fd]'
                  : 'bg-[#434852] text-neutral-200 border-[#656c78]'
              }`}
            >
              J+{ms}
            </button>
          ))}

          <button
            type="button"
            onClick={onStoreStReference}
            className="px-1.5 py-0.5 text-[10px] font-semibold bg-[#4b515c] hover:bg-[#5c6370] text-white border border-[#727a88] cursor-pointer"
            title="Save current 12-lead ST values as Reference polygon"
          >
            Update Ref
          </button>

          <button
            type="button"
            onClick={() => setShowRefOverlay((v) => !v)}
            className={`px-1.5 py-0.5 text-[10px] font-semibold border cursor-pointer ${
              showRefOverlay
                ? 'bg-[#3b424e] text-[#39ff14] border-[#39ff14]/60'
                : 'bg-[#3b424e] text-neutral-400 border-[#5f6673]'
            }`}
          >
            Ref {showRefOverlay ? 'On' : 'Off'}
          </button>

          <button
            type="button"
            onClick={() =>
              onSwitchScreenView(compactMode ? 'ST_MAP_FULL' : 'STANDARD_WAVES')
            }
            className="px-1.5 py-0.5 text-[10px] font-semibold bg-[#1c54b2] hover:bg-[#2563eb] text-white border border-[#6ca6ff] cursor-pointer"
          >
            {compactMode ? 'Full ST Screen' : 'Split Waves'}
          </button>
        </div>
      </div>

      {/* Main ST Map Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {subMode === 'FRONTAL_ZOOM' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center">
            {renderPolarDial('Frontal Plane (Cabrera)', 'Limb Leads I, II, III, aVR, aVL, aVF', FRONTAL_LIMB_AXES, 230)}
            <div className="grid grid-cols-2 gap-1.5">
              {(['aVL', 'I', 'aVR', 'II', 'aVF', 'III'] as EcgLead[]).map((l) =>
                renderStComplexTile(l)
              )}
            </div>
          </div>
        ) : subMode === 'CHEST_ZOOM' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center">
            {renderPolarDial('Horizontal Plane', 'Precordial Leads V1–V6', HORIZONTAL_CHEST_AXES, 230)}
            <div className="grid grid-cols-2 gap-1.5">
              {(['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as EcgLead[]).map((l) =>
                renderStComplexTile(l)
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Dual Polar ST Polygons */}
            <div className="grid grid-cols-2 gap-2">
              {renderPolarDial('Frontal Plane', 'Cabrera Limb', FRONTAL_LIMB_AXES)}
              {renderPolarDial('Horizontal Plane', 'Chest V1–V6', HORIZONTAL_CHEST_AXES)}
            </div>

            {/* 12-Lead Averaged ST Complexes */}
            <div
              className={`grid gap-1.5 ${
                compactMode ? 'grid-cols-3' : 'grid-cols-4 lg:grid-cols-6'
              }`}
            >
              {ALL_TWELVE_LEADS.map((lead) => renderStComplexTile(lead))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

interface TwelveLeadDiagnosticViewProps {
  vitals: PatientVitals;
  onSelectPrimaryLead: (lead: EcgLead) => void;
  onCloseToWaves: () => void;
}

export const TwelveLeadDiagnosticView: React.FC<TwelveLeadDiagnosticViewProps> = ({
  vitals,
  onSelectPrimaryLead,
  onCloseToWaves,
}) => {
  return (
    <div className="flex h-full w-full flex-col bg-black text-[#39ff14] select-none overflow-hidden">
      <div className="flex items-center justify-between bg-[#363b44] px-3 py-1 border-b border-[#5b6270] text-white shrink-0">
        <div className="flex items-center gap-3 text-xs">
          <span className="font-bold">Realtime 12-Lead ECG Analysis</span>
          <span className="font-mono text-[#39ff14]">
            25 mm/s · {vitals.ecgGain}0 mm/mV · 0.05–150 Hz Diag Filter
          </span>
        </div>
        <button
          type="button"
          onClick={onCloseToWaves}
          className="px-2 py-0.5 text-[11px] font-semibold bg-[#1c54b2] text-white border border-[#72a8ff] cursor-pointer"
        >
          Main Waves
        </button>
      </div>

      {/* 3x4 12-Lead Grid + Rhythm II Strip at bottom */}
      <div className="grid flex-1 grid-cols-4 grid-rows-3 gap-px bg-[#1b221b] p-1 overflow-hidden">
        {(['I', 'aVR', 'V1', 'V4', 'II', 'aVL', 'V2', 'V5', 'III', 'aVF', 'V3', 'V6'] as EcgLead[]).map(
          (lead) => {
            const st = vitals.stValues[lead] ?? 0;
            const w = 220;
            const h = 72;
            const mid = 42;
            const pts: string[] = [];
            const cycles = Math.max(2, Math.round((vitals.hr || 60) / 24));
            for (let x = 0; x <= w; x += 0.6) {
              const phase = ((x / w) * cycles) % 1;
              const yVal = synthesizeSingleLeadEcg(lead, phase, x * 0.02, vitals);
              const py = Math.max(4, Math.min(h - 4, mid - yVal * 20));
              pts.push(`${x.toFixed(2)},${py.toFixed(2)}`);
            }

            return (
              <button
                key={lead}
                type="button"
                onClick={() => onSelectPrimaryLead(lead)}
                className={`relative flex flex-col justify-between bg-black p-1.5 text-left cursor-pointer border ${
                  vitals.ecgLead === lead ? 'border-[#46e838]' : 'border-transparent hover:border-[#46e838]/50'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono leading-none">
                  <span className="font-bold text-[#46e838]">{lead}</span>
                  <span className={Math.abs(st) >= 1.5 ? 'text-[#ff4444]' : 'text-[#46e838]'}>
                    ST {st >= 0 ? `+${st.toFixed(1)}` : st.toFixed(1)}
                  </span>
                </div>
                <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full">
                  <line
                    x1={0}
                    y1={mid}
                    x2={w}
                    y2={mid}
                    stroke="rgba(70, 232, 56, 0.22)"
                    strokeDasharray="1.2 2.4"
                    strokeWidth={0.7}
                  />
                  <polyline
                    fill="none"
                    stroke="#46e838"
                    strokeWidth={1.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={pts.join(' ')}
                  />
                </svg>
              </button>
            );
          }
        )}
      </div>
    </div>
  );
};

interface CoThermodilutionViewProps {
  vitals: PatientVitals;
  onStartCoMeasurement: () => void;
  onCloseToWaves: () => void;
}

export const CoThermodilutionView: React.FC<CoThermodilutionViewProps> = ({
  vitals,
  onStartCoMeasurement,
  onCloseToWaves,
}) => {
  // Calculate derived SVR & PVR (dyn·s·cm⁻⁵)
  const svr = Math.round(((vitals.abpMap - vitals.cvp) * 80) / Math.max(1.2, vitals.coLMin));
  const pvr = Math.round(((vitals.papMap - 12) * 80) / Math.max(1.2, vitals.coLMin));
  const svMl = vitals.hr > 0 ? Math.round((vitals.coLMin * 1000) / vitals.hr) : 0;

  // Build high-resolution thermodilution wash-out curve
  const curvePts = useMemo(() => {
    const pts: string[] = [];
    const w = 360;
    const h = 130;
    const steps = 180;
    const peakScale = 5.2 / Math.max(2.0, vitals.coLMin);
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * 18; // seconds
      // Gamma-variate thermodilution curve
      const deltaT =
        t < 1.8
          ? 0
          : 1.35 *
            peakScale *
            Math.pow(t - 1.8, 2.1) *
            Math.exp(-(t - 1.8) / (1.55 * peakScale));
      const x = (i / steps) * w;
      const y = h - 16 - Math.min(h - 24, deltaT * 42);
      pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return pts.join(' ');
  }, [vitals.coLMin]);

  return (
    <div className="flex h-full w-full flex-col bg-black text-white select-none overflow-hidden">
      <div className="flex items-center justify-between bg-[#363b44] px-3 py-1 border-b border-[#5b6270] shrink-0">
        <span className="text-xs font-bold">
          Cardiac Output (M1012A C.O. / Hemodynamic Calculations)
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onStartCoMeasurement}
            className="px-2.5 py-0.5 text-[11px] font-bold bg-[#ea580c] hover:bg-[#f97316] text-white border border-orange-300 cursor-pointer"
          >
            {vitals.coMeasuring ? 'Injecting 10mL Cold Bolus…' : 'Start C.O. Bolus'}
          </button>
          <button
            type="button"
            onClick={onCloseToWaves}
            className="px-2 py-0.5 text-[11px] font-semibold bg-[#1c54b2] text-white border border-[#72a8ff] cursor-pointer"
          >
            Main Waves
          </button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 md:grid-cols-12 gap-3 p-3 overflow-y-auto">
        <div className="md:col-span-7 flex flex-col justify-between border border-[#3a3f47] p-3 bg-black">
          <div className="flex items-center justify-between text-xs font-mono text-[#fb923c]">
            <span>Thermodilution Blood Temp Curve (-ΔTb)</span>
            <span>Injectate: 10 mL Iced 0.9% NaCl · {vitals.coLastTime}</span>
          </div>
          <svg viewBox="0 0 360 130" className="w-full h-40 my-2">
            <line x1={0} y1={114} x2={360} y2={114} stroke="#525866" strokeWidth={1} />
            <polygon
              points={`0,114 ${curvePts} 360,114`}
              fill="rgba(251, 146, 60, 0.24)"
            />
            <polyline
              fill="none"
              stroke="#fb923c"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              points={curvePts}
            />
          </svg>
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <span>0 s (Inject)</span>
            <span>Area Under Curve ∝ 1 / C.O.</span>
            <span>18 s</span>
          </div>
        </div>

        <div className="md:col-span-5 grid grid-cols-2 gap-2 content-start font-mono">
          <div className="border border-[#3a3f47] p-2.5">
            <div className="text-[10px] text-[#fb923c]">C.O. (L/min)</div>
            <div className="text-3xl font-bold text-[#fb923c] tabular-nums">
              {vitals.coLMin.toFixed(1)}
            </div>
            <div className="text-[10px] text-neutral-400">Norm: 4.0–8.0</div>
          </div>
          <div className="border border-[#3a3f47] p-2.5">
            <div className="text-[10px] text-[#fb923c]">C.I. (L/min/m²)</div>
            <div className="text-3xl font-bold text-[#fb923c] tabular-nums">
              {vitals.ciLMinM2.toFixed(2)}
            </div>
            <div className="text-[10px] text-neutral-400">Norm: 2.5–4.0</div>
          </div>
          <div className="border border-[#3a3f47] p-2.5">
            <div className="text-[10px] text-[#ff4444]">SVR (dyn·s/cm⁵)</div>
            <div className="text-2xl font-bold text-[#ff4444] tabular-nums">{svr}</div>
            <div className="text-[10px] text-neutral-400">Norm: 800–1200</div>
          </div>
          <div className="border border-[#3a3f47] p-2.5">
            <div className="text-[10px] text-[#ffee33]">PVR (dyn·s/cm⁵)</div>
            <div className="text-2xl font-bold text-[#ffee33] tabular-nums">{pvr}</div>
            <div className="text-[10px] text-neutral-400">Norm: 100–250</div>
          </div>
          <div className="border border-[#3a3f47] p-2.5 col-span-2">
            <div className="text-[10px] text-[#39ff14]">Stroke Volume (SV)</div>
            <div className="text-xl font-bold text-[#39ff14] tabular-nums">
              {svMl} mL/beat · MAP {vitals.abpMap} · CVP {vitals.cvp} mmHg
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface VitalsTrendsViewProps {
  trends: TrendPoint[];
  onCloseToWaves: () => void;
}

export const VitalsTrendsView: React.FC<VitalsTrendsViewProps> = ({
  trends,
  onCloseToWaves,
}) => {
  const [tab, setTab] = useState<'TABULAR' | 'GRAPHICAL'>('TABULAR');
  const recent = [...trends].reverse();

  return (
    <div className="flex h-full w-full flex-col bg-black text-white select-none overflow-hidden">
      <div className="flex items-center justify-between bg-[#363b44] px-3 py-1 border-b border-[#5b6270] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold">Vitals Trend Review</span>
          <button
            type="button"
            onClick={() => setTab('TABULAR')}
            className={`px-2 py-0.5 text-[11px] font-semibold border cursor-pointer ${
              tab === 'TABULAR'
                ? 'bg-[#2b7de9] border-[#8ec0ff]'
                : 'bg-[#4b515c] border-[#6a7280]'
            }`}
          >
            Vital Signs Table
          </button>
          <button
            type="button"
            onClick={() => setTab('GRAPHICAL')}
            className={`px-2 py-0.5 text-[11px] font-semibold border cursor-pointer ${
              tab === 'GRAPHICAL'
                ? 'bg-[#2b7de9] border-[#8ec0ff]'
                : 'bg-[#4b515c] border-[#6a7280]'
            }`}
          >
            Graphical Trends
          </button>
        </div>
        <button
          type="button"
          onClick={onCloseToWaves}
          className="px-2 py-0.5 text-[11px] font-semibold bg-[#1c54b2] text-white border border-[#72a8ff] cursor-pointer"
        >
          Main Waves
        </button>
      </div>

      {tab === 'TABULAR' ? (
        <div className="flex-1 overflow-auto p-2">
          <table className="w-full border-collapse text-xs font-mono tabular-nums">
            <thead>
              <tr className="bg-[#23272e] text-left text-[11px] border-b border-[#49505d]">
                <th className="p-1.5 text-neutral-300">Time</th>
                <th className="p-1.5 text-[#39ff14]">HR</th>
                <th className="p-1.5 text-[#38e8ff]">SpO2</th>
                <th className="p-1.5 text-[#ff4444]">ABP (MAP)</th>
                <th className="p-1.5 text-[#ffee33]">PAPm</th>
                <th className="p-1.5 text-[#38d6ff]">CVP</th>
                <th className="p-1.5 text-[#e066ff]">ICP</th>
                <th className="p-1.5 text-white">etCO2</th>
                <th className="p-1.5 text-[#39ff14]">Tcore</th>
                <th className="p-1.5 text-[#c084fc]">Norad mL/h</th>
              </tr>
            </thead>
            <tbody>
              {recent.slice(0, 24).map((pt) => (
                <tr
                  key={pt.timestampMs}
                  className="border-b border-[#1c2026] hover:bg-[#161920]"
                >
                  <td className="p-1.5 text-neutral-300">{pt.timeLabel}</td>
                  <td className="p-1.5 text-[#39ff14] font-bold">{pt.hr}</td>
                  <td className="p-1.5 text-[#38e8ff]">{pt.spo2}%</td>
                  <td className="p-1.5 text-[#ff4444]">
                    {pt.abpSys}/{pt.abpDia} ({pt.abpMap})
                  </td>
                  <td className="p-1.5 text-[#ffee33]">({pt.papMap})</td>
                  <td className="p-1.5 text-[#38d6ff]">({pt.cvp})</td>
                  <td className="p-1.5 text-[#e066ff]">({pt.icp})</td>
                  <td className="p-1.5 text-white">{pt.etco2}</td>
                  <td className="p-1.5 text-[#39ff14]">{pt.tempCoreC.toFixed(1)}</td>
                  <td className="p-1.5 text-[#c084fc]">{pt.norepiRateMlH.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex-1 p-3 overflow-y-auto space-y-3">
          {[
            { label: 'HR (bpm)', color: '#39ff14', min: 30, max: 180, get: (p: TrendPoint) => p.hr },
            { label: 'ABP MAP (mmHg)', color: '#ff4444', min: 30, max: 140, get: (p: TrendPoint) => p.abpMap },
            { label: 'SpO2 (%)', color: '#38e8ff', min: 75, max: 100, get: (p: TrendPoint) => p.spo2 },
            { label: 'ICP (mmHg)', color: '#e066ff', min: 0, max: 35, get: (p: TrendPoint) => p.icp },
          ].map((row) => {
            const w = 640;
            const h = 62;
            const pts = trends
              .map((p, idx) => {
                const x = (idx / Math.max(1, trends.length - 1)) * w;
                const frac = (row.get(p) - row.min) / (row.max - row.min);
                const y = h - 6 - Math.max(0, Math.min(1, frac)) * (h - 12);
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(' ');
            const latest = trends[trends.length - 1];
            return (
              <div key={row.label} className="border border-[#2f3540] p-2">
                <div className="flex items-center justify-between text-xs font-mono mb-1" style={{ color: row.color }}>
                  <span>{row.label}</span>
                  <span className="font-bold">{latest ? row.get(latest) : '--'}</span>
                </div>
                <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-14">
                  <line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke="#2a2f3a" strokeDasharray="1.5 2.5" />
                  <polyline
                    fill="none"
                    stroke={row.color}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={pts}
                  />
                </svg>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
