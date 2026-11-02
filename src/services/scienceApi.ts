import {
  CombinedBioscienceDrugRecord,
  OpenFdaMonograph,
  OpenFdaReactionCount,
  PubChemCompoundProfile,
} from '../types/clinical';

/**
 * Exponential backoff retry helper per Science Skill specification
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3,
  baseDelayMs = 600
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);
    if (response.ok) {
      return response;
    }
    if (
      (response.status === 429 || response.status >= 500) &&
      attempt < maxRetries
    ) {
      const retryAfter = Number(response.headers.get('Retry-After'));
      const delay =
        !Number.isNaN(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : baseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `HTTP ${response.status} (${response.statusText}) from ${url}: ${errorBody.slice(0, 240)}`
    );
  }
  throw new Error(`Exhausted retries for ${url}`);
}

const sessionCache = new Map<string, CombinedBioscienceDrugRecord>();

interface PugViewNode {
  TOCHeading?: string;
  Section?: PugViewNode[];
  Information?: Array<{
    Name?: string;
    Value?: {
      StringWithMarkup?: Array<{ String?: string }>;
    };
  }>;
}

function extractFirstPugViewText(rootSection: PugViewNode | undefined, maxChars = 460): string | null {
  if (!rootSection) return null;
  const collected: string[] = [];

  function walk(node: PugViewNode) {
    if (collected.length >= 2) return;
    if (node.Information) {
      for (const info of node.Information) {
        const markups = info.Value?.StringWithMarkup;
        if (markups) {
          for (const item of markups) {
            const text = item.String?.trim();
            if (text && text.length > 28 && !text.startsWith('http')) {
              collected.push(text);
              if (collected.length >= 2) return;
            }
          }
        }
      }
    }
    if (node.Section) {
      for (const child of node.Section) {
        walk(child);
      }
    }
  }

  walk(rootSection);
  if (collected.length === 0) return null;
  const joined = collected.join(' ');
  return joined.length > maxChars ? `${joined.slice(0, maxChars).trim()}…` : joined;
}

export async function fetchPubChemCompound(queryName: string): Promise<PubChemCompoundProfile> {
  const encoded = encodeURIComponent(queryName.trim().toLowerCase());
  const cidUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encoded}/cids/JSON`;
  const cidRes = await fetchWithRetry(cidUrl);
  const cidJson = await cidRes.json();
  const cid: number | undefined = cidJson?.IdentifierList?.CID?.[0];

  if (!cid) {
    throw new Error(`No PubChem CID resolved for "${queryName}"`);
  }

  const propFields = [
    'Title',
    'IUPACName',
    'MolecularFormula',
    'MolecularWeight',
    'CanonicalSMILES',
    'ConnectivitySMILES',
    'IsomericSMILES',
    'InChIKey',
    'XLogP',
    'TPSA',
    'HBondDonorCount',
    'HBondAcceptorCount',
    'RotatableBondCount',
    'Complexity',
    'Charge',
  ].join(',');

  const propUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/${propFields}/JSON`;
  const propRes = await fetchWithRetry(propUrl);
  const propJson = await propRes.json();
  const p = propJson?.PropertyTable?.Properties?.[0];

  if (!p) {
    throw new Error(`No computed properties returned for CID ${cid}`);
  }

  // Optional PUG-View annotations (Pharmacology + Safety/GHS) — non-blocking if section absent
  let pharmacologySummary: string | null = null;
  let ghsHazardSummary: string | null = null;

  const [pharmResult, safetyResult] = await Promise.allSettled([
    fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/${cid}/JSON?heading=Pharmacology+and+Biochemistry`
    ).then((r) => (r.ok ? r.json() : null)),
    fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/${cid}/JSON?heading=Safety+and+Hazards`
    ).then((r) => (r.ok ? r.json() : null)),
  ]);

  if (pharmResult.status === 'fulfilled' && pharmResult.value?.Record?.Section?.[0]) {
    pharmacologySummary = extractFirstPugViewText(pharmResult.value.Record.Section[0], 480);
  }
  if (safetyResult.status === 'fulfilled' && safetyResult.value?.Record?.Section?.[0]) {
    ghsHazardSummary = extractFirstPugViewText(safetyResult.value.Record.Section[0], 340);
  }

  const mw = Number(p.MolecularWeight ?? 0);
  const xLogP = typeof p.XLogP === 'number' ? p.XLogP : p.XLogP !== undefined ? Number(p.XLogP) : null;
  const tpsa = Number(p.TPSA ?? 0);
  const hbd = Number(p.HBondDonorCount ?? 0);
  const hba = Number(p.HBondAcceptorCount ?? 0);
  const rotBonds = Number(p.RotatableBondCount ?? 0);

  // Lipinski Rule of 5 evaluation
  let violations = 0;
  if (mw > 500) violations++;
  if (xLogP !== null && !Number.isNaN(xLogP) && xLogP > 5) violations++;
  if (hbd > 5) violations++;
  if (hba > 10) violations++;

  const veberPass = rotBonds <= 10 && tpsa <= 140;
  const bbbLikely = tpsa > 0 && tpsa < 90 && mw <= 450;

  const smiles =
    p.CanonicalSMILES ||
    p.IsomericSMILES ||
    p.ConnectivitySMILES ||
    '';

  return {
    queryName,
    cid,
    title: p.Title || queryName,
    iupacName: p.IUPACName || 'Not specified',
    molecularFormula: p.MolecularFormula || '—',
    molecularWeight: mw,
    canonicalSmiles: smiles,
    inChIKey: p.InChIKey || '—',
    xLogP: xLogP !== null && !Number.isNaN(xLogP) ? xLogP : null,
    tpsa,
    hBondDonors: hbd,
    hBondAcceptors: hba,
    rotatableBonds: rotBonds,
    complexity: Number(p.Complexity ?? 0),
    charge: Number(p.Charge ?? 0),
    image2dUrl: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?image_size=300x300`,
    pubchemUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
    pharmacologySummary,
    ghsHazardSummary,
    lipinskiViolations: violations,
    lipinskiPass: violations <= 1,
    veberPass,
    bbbLikely,
  };
}

function cleanLabelExcerpt(arr: unknown, maxChars = 540): string | null {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const raw = String(arr[0] ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw) return null;
  return raw.length > maxChars ? `${raw.slice(0, maxChars).trim()}…` : raw;
}

export async function fetchOpenFdaMonograph(
  genericName: string,
  brandHint?: string
): Promise<OpenFdaMonograph> {
  const upperGeneric = genericName.trim().toUpperCase();
  const encodedUpper = encodeURIComponent(`"${upperGeneric}"`);
  const encodedLower = encodeURIComponent(`"${genericName.trim().toLowerCase()}"`);

  // Step 1: Query Structured Product Labeling (SPL) with .exact first, fallback to tokenized or brand
  const labelCandidates = [
    `https://api.fda.gov/drug/label.json?search=openfda.generic_name.exact:${encodedUpper}&limit=1`,
    `https://api.fda.gov/drug/label.json?search=openfda.generic_name:${encodedLower}&limit=1`,
  ];
  if (brandHint) {
    labelCandidates.push(
      `https://api.fda.gov/drug/label.json?search=openfda.brand_name.exact:${encodeURIComponent(`"${brandHint.toUpperCase()}"`)}&limit=1`
    );
  }

  let labelRecord: Record<string, any> | null = null;
  let usedLabelUrl = labelCandidates[0];

  for (const candidateUrl of labelCandidates) {
    try {
      const res = await fetch(candidateUrl);
      if (res.ok) {
        const data = await res.json();
        if (data?.results?.[0]) {
          labelRecord = data.results[0];
          usedLabelUrl = candidateUrl;
          break;
        }
      }
    } catch {
      // Try next fallback candidate
    }
  }

  // Step 2: Query FAERS Adverse Event Reaction counts (.exact MedDRA Preferred Terms)
  const eventCandidates = [
    `https://api.fda.gov/drug/event.json?search=patient.drug.openfda.generic_name.exact:${encodedUpper}&count=patient.reaction.reactionmeddrapt.exact&limit=8`,
    `https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:${encodedUpper}&count=patient.reaction.reactionmeddrapt.exact&limit=8`,
  ];

  let topReactions: OpenFdaReactionCount[] = [];
  let usedEventsUrl = eventCandidates[0];

  for (const evUrl of eventCandidates) {
    try {
      const res = await fetch(evUrl);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.results) && data.results.length > 0) {
          topReactions = data.results.slice(0, 8).map((r: { term: string; count: number }) => ({
            term: r.term,
            count: r.count,
          }));
          usedEventsUrl = evUrl;
          break;
        }
      }
    } catch {
      // Try next candidate
    }
  }

  // Also grab total serious/all report count if available
  let totalAdverseEvents = topReactions.reduce((acc, item) => acc + item.count, 0);
  try {
    const metaRes = await fetch(
      `https://api.fda.gov/drug/event.json?search=patient.drug.openfda.generic_name:${encodedLower}&limit=1`
    );
    if (metaRes.ok) {
      const metaJson = await metaRes.json();
      if (typeof metaJson?.meta?.results?.total === 'number') {
        totalAdverseEvents = metaJson.meta.results.total;
      }
    }
  } catch {
    // Keep summed fallback
  }

  if (!labelRecord && topReactions.length === 0) {
    throw new Error(`No openFDA SPL label or FAERS records found for "${genericName}"`);
  }

  const openfdaMeta = labelRecord?.openfda ?? {};

  return {
    queryName: genericName,
    brandNames: Array.isArray(openfdaMeta.brand_name) ? openfdaMeta.brand_name.slice(0, 4) : [],
    genericNames: Array.isArray(openfdaMeta.generic_name) ? openfdaMeta.generic_name.slice(0, 3) : [genericName],
    manufacturerNames: Array.isArray(openfdaMeta.manufacturer_name)
      ? openfdaMeta.manufacturer_name.slice(0, 3)
      : [],
    route: Array.isArray(openfdaMeta.route) ? openfdaMeta.route.slice(0, 3) : ['INTRAVENOUS'],
    pharmClassMoa: Array.isArray(openfdaMeta.pharm_class_moa) ? openfdaMeta.pharm_class_moa.slice(0, 3) : [],
    pharmClassEpc: Array.isArray(openfdaMeta.pharm_class_epc) ? openfdaMeta.pharm_class_epc.slice(0, 3) : [],
    boxedWarning: cleanLabelExcerpt(labelRecord?.boxed_warning, 560),
    indicationsAndUsage: cleanLabelExcerpt(labelRecord?.indications_and_usage, 520),
    dosageAndAdministration: cleanLabelExcerpt(labelRecord?.dosage_and_administration, 560),
    contraindications: cleanLabelExcerpt(labelRecord?.contraindications, 420),
    warningsAndPrecautions: cleanLabelExcerpt(
      labelRecord?.warnings_and_cautions ?? labelRecord?.warnings,
      460
    ),
    topReactions,
    totalAdverseEvents,
    sourceLabelUrl: usedLabelUrl,
    sourceEventsUrl: usedEventsUrl,
  };
}

export async function fetchBioscienceDrugMonograph(
  genericName: string,
  brandHint?: string,
  forceRefresh = false
): Promise<CombinedBioscienceDrugRecord> {
  const key = genericName.trim().toLowerCase();
  if (!forceRefresh && sessionCache.has(key)) {
    return sessionCache.get(key)!;
  }

  const [pubchemSettled, fdaSettled] = await Promise.allSettled([
    fetchPubChemCompound(genericName),
    fetchOpenFdaMonograph(genericName, brandHint),
  ]);

  const record: CombinedBioscienceDrugRecord = {
    pubchem: pubchemSettled.status === 'fulfilled' ? pubchemSettled.value : null,
    openfda: fdaSettled.status === 'fulfilled' ? fdaSettled.value : null,
    pubchemError:
      pubchemSettled.status === 'rejected'
        ? pubchemSettled.reason instanceof Error
          ? pubchemSettled.reason.message
          : 'PubChem query failed'
        : undefined,
    openfdaError:
      fdaSettled.status === 'rejected'
        ? fdaSettled.reason instanceof Error
          ? fdaSettled.reason.message
          : 'openFDA query failed'
        : undefined,
    fetchedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };

  sessionCache.set(key, record);
  return record;
}
