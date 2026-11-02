import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  FlaskConical,
  RefreshCw,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  CombinedBioscienceDrugRecord,
  PumpChannelState,
} from '../../types/clinical';
import {
  calculateDoseFromRate,
  getDrugById,
  ICU_DRUG_LIBRARY,
} from '../../data/drugLibrary';
import { fetchBioscienceDrugMonograph } from '../../services/scienceApi';

interface ClinicalInformaticsPCProps {
  selectedDrugId: string;
  onSelectDrugId: (drugId: string) => void;
  pumps?: PumpChannelState[];
  hidePumpContext?: boolean;
  patientWeightKg: number;
  onClose: () => void;
}

export const ClinicalInformaticsPC: React.FC<ClinicalInformaticsPCProps> = ({
  selectedDrugId,
  onSelectDrugId,
  pumps = [],
  hidePumpContext = false,
  patientWeightKg,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'PUBCHEM' | 'OPENFDA'>('PUBCHEM');
  const [record, setRecord] = useState<CombinedBioscienceDrugRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [imgError, setImgError] = useState<boolean>(false);
  const [copiedSmiles, setCopiedSmiles] = useState<boolean>(false);

  const selectedDrug = getDrugById(selectedDrugId);

  const loadDrugData = async (forceRefresh = false) => {
    setLoading(true);
    setImgError(false);
    try {
      const res = await fetchBioscienceDrugMonograph(
        selectedDrug.genericQueryName,
        selectedDrug.fdaBrandHint,
        forceRefresh
      );
      setRecord(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrugData(false);
  }, [selectedDrug.genericQueryName]);

  const handleCopySmiles = (smiles: string) => {
    if (!smiles) return;
    navigator.clipboard?.writeText(smiles).catch(() => {});
    setCopiedSmiles(true);
    setTimeout(() => setCopiedSmiles(false), 1800);
  };

  const pubchem = record?.pubchem;
  const openfda = record?.openfda;
  const maxReactionCount =
    openfda && openfda.topReactions.length > 0
      ? Math.max(...openfda.topReactions.map((r) => r.count))
      : 1;

  return (
    <div className="flex h-full w-full flex-col bg-[#f8fafc] text-slate-900 border-l border-[#262c3a] overflow-hidden">
      {/* Embedded iPC Window Header */}
      <div className="flex items-center justify-between gap-3 bg-white px-3.5 py-2 border-b border-[#e2e8f0] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FlaskConical className="h-4 w-4 text-[#0b57d0] shrink-0" />
          <span className="text-xs font-bold tracking-tight text-slate-900 truncate">
            IntelliSpace iPC · ICU Pharmacology &amp; Bioscience Reference
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => loadDrugData(true)}
            disabled={loading}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer whitespace-nowrap"
            title="Refresh live PubChem and openFDA records"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer whitespace-nowrap"
            title="Minimize iPC panel"
          >
            <X className="h-3.5 w-3.5" />
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* Quick-Try ICU Compound Selector Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-[#f1f5f9] px-3.5 py-1.5 border-b border-[#e2e8f0] shrink-0">
        <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap mr-1">
          Formulary:
        </span>
        {ICU_DRUG_LIBRARY.map((drug) => {
          const isRunningOnPump =
            !hidePumpContext &&
            pumps.some((p) => p.poweredOn && p.running && p.drugId === drug.id);
          const isSelected = drug.id === selectedDrug.id;
          return (
            <button
              key={drug.id}
              type="button"
              onClick={() => onSelectDrugId(drug.id)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                isSelected
                  ? 'bg-[#0b57d0] text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-[#e2e8f0] hover:bg-slate-50'
              }`}
            >
              {isRunningOnPump ? `${drug.name} (Active)` : drug.name}
            </button>
          );
        })}
      </div>

      {/* Sub-header Bar: Pure Reference Metadata on Philips Monitor vs PK/PD Summary in B. Braun Monograph */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-3.5 py-1.5 border-b border-[#e2e8f0] text-[11px] shrink-0">
        {hidePumpContext ? (
          <div className="flex items-center gap-2 text-slate-600">
            <span className="font-semibold text-slate-800">{selectedDrug.name}</span>
            <span aria-hidden="true">·</span>
            <span>{selectedDrug.concentrationLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              Bed 1 ({patientWeightKg} kg)
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-600">
            <span className="font-semibold text-slate-800">Active PK/PD Coupling:</span>
            {pumps
              .filter((p) => p.poweredOn)
              .map((p, idx) => {
                const d = getDrugById(p.drugId);
                const dose = calculateDoseFromRate(
                  d,
                  p.running ? p.rateMlH : 0,
                  patientWeightKg
                );
                const eqPct = Math.min(
                  100,
                  Math.round(
                    (p.effectSiteConcentration /
                      Math.max(
                        0.2,
                        (p.running ? p.rateMlH : 0) / Math.max(1, d.referenceRateMlH)
                      )) *
                      100
                  )
                );
                return (
                  <React.Fragment key={p.id}>
                    {idx > 0 && <span aria-hidden="true">·</span>}
                    <span className="font-mono tabular-nums text-slate-700">
                      Ch{p.bayIndex} {d.name}:{' '}
                      {p.running
                        ? `${dose.toFixed(d.doseUnit === 'mL/h' ? 0 : 2)} ${d.doseUnit}`
                        : 'Standby'}{' '}
                      (Ce {p.effectSiteConcentration.toFixed(2)}u
                      {p.running ? `, ~${eqPct}% eq` : ''})
                    </span>
                  </React.Fragment>
                );
              })}
          </div>
        )}

        {/* Sub-view switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded">
          <button
            type="button"
            onClick={() => setActiveTab('PUBCHEM')}
            className={`px-2.5 py-0.5 text-[11px] font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'PUBCHEM'
                ? 'bg-white text-[#0b57d0] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            PubChem Chemical Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('OPENFDA')}
            className={`px-2.5 py-0.5 text-[11px] font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'OPENFDA'
                ? 'bg-white text-[#0b57d0] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            openFDA Label &amp; FAERS
          </button>
        </div>
      </div>

      {/* Scrollable Workbench Content */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {loading ? (
          <div className="flex h-44 flex-col items-center justify-center rounded border border-[#e2e8f0] bg-white p-6 text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin text-[#0b57d0] mb-2" />
            <p className="text-xs font-medium text-slate-700">
              Querying authoritative PubChem PUG REST &amp; openFDA endpoints for {selectedDrug.name}…
            </p>
          </div>
        ) : activeTab === 'PUBCHEM' ? (
          pubchem ? (
            <div className="space-y-3">
              {/* Top Split: 2D Structure Depiction + Core Identifiers */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                {/* 2D Chemical Depiction with Resilient Fallback */}
                <div className="lg:col-span-4 flex flex-col items-center justify-between rounded border border-[#e2e8f0] bg-white p-3">
                  <div className="flex w-full items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span>2D Depiction</span>
                    <span className="font-mono text-slate-700 tabular-nums">CID {pubchem.cid}</span>
                  </div>
                  {!imgError ? (
                    <img
                      src={pubchem.image2dUrl}
                      alt={`2D chemical structure of ${pubchem.title} (PubChem CID ${pubchem.cid})`}
                      referrerPolicy="no-referrer"
                      onError={() => setImgError(true)}
                      className="h-36 w-36 object-contain"
                    />
                  ) : (
                    <div className="flex h-36 w-full flex-col items-center justify-center rounded bg-slate-50 border border-slate-200 p-2 text-center">
                      <FlaskConical className="h-7 w-7 text-[#0d9488] mb-1" />
                      <span className="text-xs font-semibold text-slate-800">{pubchem.title}</span>
                      <span className="text-[11px] font-mono text-slate-500">{pubchem.molecularFormula}</span>
                    </div>
                  )}
                  <a
                    href={pubchem.pubchemUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[#0b57d0] hover:underline"
                  >
                    <span>PubChem Record</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {/* Physicochemical Properties & Drug-Likeness */}
                <div className="lg:col-span-8 flex flex-col justify-between rounded border border-[#e2e8f0] bg-white p-3 space-y-2.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{selectedDrug.name}</h3>
                      <p className="text-[11px] text-slate-500">
                        {selectedDrug.concentrationLabel} · Computed Descriptor · PubChem PUG REST
                      </p>
                    </div>
                    <div className="text-[11px] font-mono text-slate-600 tabular-nums">
                      Lipinski: {pubchem.lipinskiPass ? 'PASS' : 'WARN'} ({pubchem.lipinskiViolations} viol) · Veber: {pubchem.veberPass ? 'PASS' : 'WARN'} · BBB: {pubchem.bbbLikely ? 'Permeable' : 'Polar/Restricted'}
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-500">Formula</div>
                      <div className="font-mono font-semibold text-slate-900">{pubchem.molecularFormula}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Mol. Weight</div>
                      <div className="font-mono font-semibold text-slate-900 tabular-nums">
                        {pubchem.molecularWeight.toFixed(2)} Da
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">XLogP</div>
                      <div className="font-mono font-semibold text-slate-900 tabular-nums">
                        {pubchem.xLogP !== null ? pubchem.xLogP.toFixed(2) : 'Ion/Salt'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">TPSA</div>
                      <div className="font-mono font-semibold text-slate-900 tabular-nums">
                        {pubchem.tpsa.toFixed(1)} Å²
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">H-Bond Donors</div>
                      <div className="font-mono font-semibold text-slate-900 tabular-nums">{pubchem.hBondDonors}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">H-Bond Acceptors</div>
                      <div className="font-mono font-semibold text-slate-900 tabular-nums">{pubchem.hBondAcceptors}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Rotatable Bonds</div>
                      <div className="font-mono font-semibold text-slate-900 tabular-nums">{pubchem.rotatableBonds}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Formal Charge</div>
                      <div className="font-mono font-semibold text-slate-900 tabular-nums">{pubchem.charge}</div>
                    </div>
                  </div>

                  {/* SMILES & InChIKey */}
                  {pubchem.canonicalSmiles && (
                    <div className="rounded bg-slate-50 border border-slate-200 px-2.5 py-1.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                        <span>Canonical SMILES · InChIKey: {pubchem.inChIKey}</span>
                        <button
                          type="button"
                          onClick={() => handleCopySmiles(pubchem.canonicalSmiles)}
                          className="inline-flex items-center gap-1 text-[#0b57d0] hover:underline cursor-pointer"
                        >
                          {copiedSmiles ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedSmiles ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="font-mono text-[11px] text-slate-800 break-all">
                        {pubchem.canonicalSmiles}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pharmacology & GHS Safety Summaries */}
              <div className="rounded border border-[#e2e8f0] bg-white p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-800">
                    Mechanism &amp; Curated Pharmacology
                  </span>
                  <span>Literature Curated · PubChem PUG-View</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-700">
                  {pubchem.pharmacologySummary || selectedDrug.clinicalNote}
                </p>
                {pubchem.ghsHazardSummary && (
                  <div className="pt-1.5 border-t border-slate-100 text-[11px] text-slate-600">
                    <span className="font-semibold text-amber-700">GHS / Handling Safety: </span>
                    {pubchem.ghsHazardSummary}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              Unable to retrieve PubChem compound record: {record?.pubchemError || 'Network unavailable'}.
            </div>
          )
        ) : openfda ? (
          <div className="space-y-3">
            {/* SPL Metadata Header */}
            <div className="rounded border border-[#e2e8f0] bg-white p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    FDA Structured Product Labeling (SPL): {selectedDrug.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {openfda.brandNames.length > 0 ? `Brands: ${openfda.brandNames.join(', ')} · ` : ''}
                    Route: {openfda.route.join(', ')} · Regulatory SPL · openFDA
                  </p>
                </div>
                <a
                  href={openfda.sourceLabelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0b57d0] hover:underline"
                >
                  <span>openFDA SPL JSON</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {(openfda.pharmClassEpc.length > 0 || openfda.pharmClassMoa.length > 0) && (
                <div className="text-[11px] text-slate-600">
                  {[...openfda.pharmClassEpc, ...openfda.pharmClassMoa].join(' · ')}
                </div>
              )}

              {/* Boxed Warning */}
              {openfda.boxedWarning && (
                <div className="rounded border border-rose-300 bg-rose-50/70 p-2.5 text-xs text-rose-950">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800 mb-1">
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                    <span>FDA BOXED WARNING</span>
                  </div>
                  <p className="leading-relaxed text-[11px]">{openfda.boxedWarning}</p>
                </div>
              )}

              {/* Indications & Dosage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                <div className="rounded border border-slate-200 bg-slate-50/60 p-2.5">
                  <div className="text-[11px] font-semibold text-slate-800 mb-1">
                    Indications &amp; Usage
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-700">
                    {openfda.indicationsAndUsage || selectedDrug.clinicalNote}
                  </p>
                </div>
                <div className="rounded border border-slate-200 bg-slate-50/60 p-2.5">
                  <div className="text-[11px] font-semibold text-slate-800 mb-1">
                    Dosage &amp; Administration
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-700">
                    {openfda.dosageAndAdministration ||
                      `Standard ICU concentration: ${selectedDrug.concentrationLabel} (${selectedDrug.doseUnit}).`}
                  </p>
                </div>
              </div>
            </div>

            {/* FAERS Top Adverse Reactions */}
            <div className="rounded border border-[#e2e8f0] bg-white p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-slate-900">
                    FDA FAERS Top Reported Adverse Events (MedDRA Preferred Terms)
                  </span>
                  <span className="ml-2 text-[11px] font-mono text-slate-500 tabular-nums">
                    Total Reports: {openfda.totalAdverseEvents.toLocaleString()}
                  </span>
                </div>
                <a
                  href={openfda.sourceEventsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0d9488] hover:underline"
                >
                  <span>FAERS Query</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {openfda.topReactions.length > 0 ? (
                <div className="space-y-1.5">
                  {openfda.topReactions.map((rx) => {
                    const widthPct = Math.max(4, Math.round((rx.count / maxReactionCount) * 100));
                    return (
                      <div key={rx.term} className="grid grid-cols-12 items-center gap-2 text-[11px]">
                        <span className="col-span-5 truncate font-medium text-slate-700" title={rx.term}>
                          {rx.term}
                        </span>
                        <div className="col-span-5 h-2 rounded-xs bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-[#0d9488]"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                        <span className="col-span-2 text-right font-mono text-slate-700 tabular-nums">
                          {rx.count.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  No aggregated MedDRA reaction counts returned for this query.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            openFDA label/event data unavailable: {record?.openfdaError || 'No matching FDA SPL found'}.
          </div>
        )}
      </div>
    </div>
  );
};
