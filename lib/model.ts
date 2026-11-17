// Token Launch Radar Econometric Valuation Engine & Playbook Generator
// Authored by @ssass88 for make.fun token-radar-01 bounty

export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

export interface ModelConstants {
  base_multiple: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
}

export const RADAR_MODEL: ModelConstants = {
  base_multiple: 0.28,
  growth_weight: 0.45,
  growth_floor: -50,
  growth_cap: 150,
  maturity_floor: 0.65,
  maturity_range: 0.35,
  maturity_days: 1095,
  unknown_age_days: 365,
};

export const MODEL_VERSION = 'ssass88-radar-v2';
export const EARLY_DISCOVERY_LIMIT = 160;
export const LIVE_MARKET_DISPLAY = 24;

export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    base_multiple: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  growth_multiplier: number;
  maturity_multiplier: number;
}

export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  rows: RadarRow[];
  live: LiveRow[];
}

const MILLISECONDS_PER_DAY = 86_400_000;

export function calculateAgeDays(asOf: string, listedAt: string | null): number | null {
  if (!listedAt) return null;
  const tAsOf = Date.parse(`${asOf}T00:00:00Z`);
  const tListed = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(tAsOf) || !Number.isFinite(tListed)) return null;
  return Math.max(0, Math.floor((tAsOf - tListed) / MILLISECONDS_PER_DAY));
}

export function computeImpliedValuation(
  p: SnapshotProtocol,
  asOf: string,
  model: ModelConstants = RADAR_MODEL,
): {
  implied: number;
  growthPct: number;
  growthMult: number;
  maturityMult: number;
  age: number | null;
} {
  const age = calculateAgeDays(asOf, p.listed_at);
  const rawGrowth = typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : 0;
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;

  const effectiveAge = age ?? model.unknown_age_days;
  const maturityRatio = Math.min(Math.max(effectiveAge, 0), model.maturity_days) / model.maturity_days;
  const maturityMult = model.maturity_floor + maturityRatio * model.maturity_range;

  const baseValuation = p.tvl_usd * model.base_multiple;
  const implied = Math.max(1, Math.round(baseValuation * growthMult * maturityMult));

  return { implied, growthPct, growthMult, maturityMult, age };
}

const VERSION_SUFFIX_RE = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

export function isPreTokenProtocol(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

export function isValidCandidate(p: SnapshotProtocol): boolean {
  return isPreTokenProtocol(p) && p.category !== 'CEX' && !VERSION_SUFFIX_RE.test(p.name);
}

function truncate4(v: number): number {
  return Math.round(v * 1e4) / 1e4;
}

export function formatStepText(step: FarmStep): string {
  let combined = `${step.text} Required capital: ${step.cost}. Estimated duration: ${step.time}.`;
  if (combined.length > 600) combined = `${combined.slice(0, 595)}...`;
  if (combined.length < 20) combined = `${combined} Maintain position actively.`;
  return combined;
}

function resolvePrimaryChain(p: SnapshotProtocol): string {
  return p.chains && p.chains.length > 0 ? p.chains[0]! : 'Ethereum';
}

function computeRecommendedCapital(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 2_000_000_000) return 250;
  if (p.tvl_usd >= 500_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

function computeHoldingDays(age: number | null): number {
  if (age === null) return 30;
  if (age < 120) return 60;
  if (age < 300) return 45;
  return 30;
}

function generatePrimaryAction(p: SnapshotProtocol, capital: number, chain: string): string {
  const cat = (p.category ?? '').toLowerCase();
  const title = p.name;
  if (cat.includes('lend') || cat.includes('cdp') || cat.includes('borrow')) {
    return `Supply $${capital} USDC into ${title}'s core lending market on ${chain} to accrue borrowing power and protocol yield.`;
  }
  if (cat.includes('dex') || cat.includes('amm') || cat.includes('yield')) {
    return `Provide $${capital} in liquidity to the primary stable or ETH pair on ${title} (${chain}) and keep LP position active.`;
  }
  if (cat.includes('bridge') || cat.includes('cross')) {
    return `Execute transfer of $${capital} through ${title} into ${chain} and deploy bridged balance in downstream ecosystem dApps.`;
  }
  if (cat.includes('stak') || cat.includes('restak')) {
    return `Deposit $${capital} equivalent of native L1 asset into ${title} liquid staking pool and retain generated receipt tokens.`;
  }
  if (cat.includes('perpetual') || cat.includes('derivat') || cat.includes('margin')) {
    return `Deposit $${capital} USDC collateral into ${title} account on ${chain} and execute low-leverage delta-neutral volume trades.`;
  }
  if (cat.includes('prediction') || cat.includes('oracle')) {
    return `Deposit $${capital} into ${title} verification or prediction contracts and take active event positions.`;
  }
  if (cat.includes('rwa') || cat.includes('treasury')) {
    return `Mint and hold $${capital} of yield-bearing RWA tokens on ${title} through verified smart contracts on ${chain}.`;
  }
  return `Deposit $${capital} of liquid assets into verified smart contract pools on ${title} (${chain}) and monitor rewards.`;
}

export function generatePlaybook(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = resolvePrimaryChain(p);
  const capital = computeRecommendedCapital(p);
  const holdPeriod = computeHoldingDays(age);
  const primaryAction = generatePrimaryAction(p, capital, chain);

  return [
    {
      text: 'Provision a dedicated, clean farming wallet with hardware security and fund initial native gas tokens.',
      cost: 'under $3 in native gas',
      time: '5 minutes setup',
    },
    {
      text: primaryAction,
      cost: `$${capital} allocated capital and ~$5 in gas fees`,
      time: '15 minutes execution',
    },
    {
      text: 'Perform regular recurring on-chain interactions (such as compounding, rebalancing, or governance voting) weekly.',
      cost: 'approx $1.50 per week in gas',
      time: '10 minutes weekly',
    },
    {
      text: `Maintain your active deposit continuously for at least ${holdPeriod} days to capture historical snapshot windows.`,
      cost: `$${capital} locked in position`,
      time: `${holdPeriod} days holding window`,
    },
    {
      text: 'Review protocol official announcements, points leaderboards, and verify eligibility only through verified domains.',
      cost: 'no monetary fee',
      time: '10 minutes periodic audit',
    },
    {
      text: 'Log transaction hashes, initial timestamps, and liquidation thresholds in a dedicated tracking spreadsheet.',
      cost: 'zero operational cost',
      time: '5 minutes documentation',
    },
  ];
}

export function buildBoard(snapshot: Snapshot, model: ModelConstants = RADAR_MODEL): BoardRow[] {
  const protocolMap = new Map<string, SnapshotProtocol>();
  for (const p of snapshot.protocols) {
    protocolMap.set(p.slug, p);
  }

  const selectedMap = new Map<string, SnapshotProtocol>();

  // 1. Mandatory Watchlist Protocols (Floor coverage)
  for (const watchlistSlug of snapshot.watchlist) {
    const p = protocolMap.get(watchlistSlug);
    if (p) {
      selectedMap.set(watchlistSlug, p);
    }
  }

  // 2. Early Discovery Expansion (Pre-token protocols below watchlist floor)
  const candidates = snapshot.protocols
    .filter((p) => !selectedMap.has(p.slug) && isValidCandidate(p) && p.tvl_usd < snapshot.floor_usd)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || a.slug.localeCompare(b.slug))
    .slice(0, EARLY_DISCOVERY_LIMIT);

  for (const cand of candidates) {
    selectedMap.set(cand.slug, cand);
  }

  // 3. Compute Valuations
  const evaluated = [...selectedMap.values()].map((p) => {
    const valuation = computeImpliedValuation(p, snapshot.as_of, model);
    return { p, ...valuation };
  });

  // 4. Sort strictly descending by implied value, tie-break by slug
  evaluated.sort((a, b) => b.implied - a.implied || a.p.slug.localeCompare(b.p.slug));

  return evaluated.map((item, index) => ({
    rank: index + 1,
    slug: item.p.slug,
    name: item.p.name,
    category: item.p.category,
    chains: item.p.chains,
    tvl_usd: item.p.tvl_usd,
    change_7d: item.p.change_7d,
    mcap_usd: item.p.mcap_usd,
    listed_at: item.p.listed_at,
    gecko_id: item.p.gecko_id,
    symbol: item.p.symbol,
    token_status: 'pre-token',
    age_days: item.age,
    implied_value_usd: item.implied,
    model: {
      base_multiple: model.base_multiple,
      growth_pct: item.growthPct,
      growth_multiplier: truncate4(item.growthMult),
      maturity_multiplier: truncate4(item.maturityMult),
      age_days: item.age,
    },
    farm_steps: generatePlaybook(item.p, item.age).map(formatStepText),
  }));
}

export function extractLiveTokens(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreTokenProtocol(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_MARKET_DISPLAY)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

export function toRadarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
  };
}

export function buildRadar(snapshot: Snapshot, model: ModelConstants = RADAR_MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = extractLiveTokens(snapshot);
  const earlyCount = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;

  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: earlyCount,
    live_size: live.length,
    rows: board.map(toRadarRow),
    live,
  };

  return { board, radar };
}

export function parseSnapshot(rawText: string): Snapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    throw new Error('snapshot.json parse failed: invalid JSON format');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('snapshot.json is not an object');
  }

  const s = parsed as Record<string, unknown>;
  if (typeof s.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.as_of)) throw new Error('snapshot.json invalid as_of');
  if (typeof s.source !== 'string') throw new Error('snapshot.json invalid source');
  if (typeof s.floor_usd !== 'number' || s.floor_usd <= 0) throw new Error('snapshot.json invalid floor_usd');
  if (!Array.isArray(s.protocols) || !Array.isArray(s.watchlist)) throw new Error('snapshot.json invalid protocols or watchlist');

  const protocols: SnapshotProtocol[] = s.protocols.map((entry, idx) => {
    if (typeof entry !== 'object' || entry === null) throw new Error(`protocol[${idx}] invalid`);
    const p = entry as Record<string, unknown>;
    return {
      slug: String(p.slug),
      name: String(p.name),
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: Number(p.tvl_usd),
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });

  return {
    as_of: s.as_of,
    source: s.source,
    floor_usd: s.floor_usd,
    protocols,
    watchlist: s.watchlist as string[],
  };
}

export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugSet = new Set(board.map((r) => r.slug));
  const missingWatchlist = snapshot.watchlist.filter((s) => !slugSet.has(s));
  if (missingWatchlist.length > 0) {
    return `Watchlist coverage incomplete: missing ${missingWatchlist.length} slugs: ${missingWatchlist.slice(0, 5).join(', ')}`;
  }

  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) {
    if (ranks[i] !== i + 1) return `Rank sequence invalid: expected ${i + 1}, found ${ranks[i]}`;
  }

  for (let i = 1; i < board.length; i++) {
    if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) {
      return `Ascending implied value error: row ${i + 1} ($${board[i]!.implied_value_usd}) > row ${i} ($${board[i - 1]!.implied_value_usd})`;
    }
  }

  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return 'Flat value error: all rows hold identical implied value';
  }

  for (const row of board) {
    if (row.farm_steps.length < 3 || row.farm_steps.length > 12) {
      return `Protocol ${row.slug} has invalid farm_steps count: ${row.farm_steps.length}`;
    }
    for (const step of row.farm_steps) {
      if (step.length < 20 || step.length > 600) {
        return `Protocol ${row.slug} farm step length out of bounds (${step.length} chars)`;
      }
    }
  }

  return null;
}

export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
