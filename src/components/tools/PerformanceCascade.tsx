'use client';

import { useState, useRef, useEffect } from 'react';
import { useCascade } from '@/lib/use-cascade';
import type { GemPillar, GemMetric, Deal, MonthlyActivation } from '@/lib/use-cascade';

// --- Pure logic (ported from MC performance/page.tsx) ---

function normalizeName(name: string): string {
  return name.toLowerCase()
    .replace(/\b(oü|ou|ltd\.?|as|gmbh)\b/gi, '')
    .replace(/\b(existing|portfolio|deals?)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

const ATTIO_TO_MONTHLY: Record<string, string> = {
  'adaur.ee': 'Adaur Grupp OÜ',
  'prisma kinnisvarad oü': 'Prisma Arimajaed',
  '1estate kinnisvara': '1Estate Group OÜ',
  'perton ehitus oü': 'Perton Living OÜ',
  'stay larsen oü': 'Scandium Living',
  'prefera apartments oü': 'Perfera Apartments OÜ',
  'preferra apartments': 'Perfera Apartments OÜ',
  'freija invest oü': 'Freija',
  'vim agentuuri kinnisvara oü': 'VIM Agentuuri',
  'viljar puusepp fie': 'Scandium Living',
  'vvv bussi- & autorent + giid': 'VV Haldus OÜ',
  'amro living': 'Mr Internet OÜ',
};

function findActivationMatch<T>(
  dealCompany: string,
  lookup: Map<string, T>,
): { key: string; value: T } | undefined {
  const lower = dealCompany.toLowerCase();
  const exact = lookup.get(lower);
  if (exact) return { key: lower, value: exact };

  const mapped = ATTIO_TO_MONTHLY[lower];
  if (mapped) {
    const mappedLower = mapped.toLowerCase();
    const mappedResult = lookup.get(mappedLower);
    if (mappedResult) return { key: mappedLower, value: mappedResult };
  }

  const dealNorm = normalizeName(dealCompany);
  if (dealNorm.length < 3) return undefined;

  for (const [key, val] of lookup) {
    if (normalizeName(key) === dealNorm) return { key, value: val };
  }

  for (const [key, val] of lookup) {
    const keyNorm = normalizeName(key);
    if (keyNorm.length >= 4 && dealNorm.length >= 4) {
      if (keyNorm.includes(dealNorm) || dealNorm.includes(keyNorm)) return { key, value: val };
    }
  }

  return undefined;
}

function applyPeriodFilter(
  deals: Deal[],
  monthlyActivation: MonthlyActivation | null,
  selectedPeriod: string,
): Deal[] {
  if (!monthlyActivation) return deals;
  const periods = Object.keys(monthlyActivation);
  if (periods.length === 0) return deals;

  function matchAndDedup<T extends { amount: number }>(
    allDeals: Deal[],
    lookup: Map<string, T>,
    applyData: (deal: Deal, data: T) => Deal,
    noData: (deal: Deal) => Deal,
  ): Deal[] {
    const usedActivationKeys = new Set<string>();
    const result: Deal[] = [];
    for (const d of allDeals) {
      const match = findActivationMatch(d.company, lookup);
      if (!match) { result.push(noData(d)); continue; }
      if (usedActivationKeys.has(match.key)) continue;
      usedActivationKeys.add(match.key);
      result.push(applyData(d, match.value));
    }
    return result;
  }

  if (selectedPeriod === 'all') {
    const agg = new Map<string, { amount: number; maxTenants: number; requests: number }>();
    for (const period of periods) {
      for (const entry of monthlyActivation[period]) {
        const key = entry.company.toLowerCase();
        const prev = agg.get(key) || { amount: 0, maxTenants: 0, requests: 0 };
        prev.amount += entry.amount;
        prev.maxTenants = Math.max(prev.maxTenants, entry.uniqueTenants);
        prev.requests += entry.requests;
        agg.set(key, prev);
      }
    }
    return matchAndDedup(deals, agg,
      (d, data) => ({ ...d, monthlyTpv: Math.round(data.amount), activeTenants: data.maxTenants, totalTenants: data.maxTenants }),
      (d) => d,
    );
  }

  const monthData = monthlyActivation[selectedPeriod];
  if (!monthData) return deals.map((d) => ({ ...d, monthlyTpv: 0, activeTenants: 0, totalTenants: 0 }));

  const lookup = new Map<string, { amount: number; uniqueTenants: number }>();
  for (const entry of monthData) {
    lookup.set(entry.company.toLowerCase(), { amount: entry.amount, uniqueTenants: entry.uniqueTenants });
  }
  return matchAndDedup(deals, lookup,
    (d, data) => ({ ...d, monthlyTpv: Math.round(data.amount), activeTenants: data.uniqueTenants, totalTenants: data.uniqueTenants }),
    (d) => ({ ...d, monthlyTpv: 0, activeTenants: 0, totalTenants: 0 }),
  );
}

function formatNumber(n: number, unit: string): string {
  if (unit === '\u00a3' || unit === '£') {
    if (n >= 1000000) return `£${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `£${(n / 1000).toFixed(0)}K`;
    return `£${n}`;
  }
  if (unit === '%') return `${Number(n) % 1 === 0 ? n : Number(n).toFixed(1)}%`;
  return `${n}`;
}

function formatActualTarget(actual: number, target: number, unit: string): string {
  return `${formatNumber(actual, unit)} / ${formatNumber(target, unit)}`;
}

function formatTpv(n: number): string {
  if (n >= 1000000) return `£${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `£${(n / 1000).toFixed(0)}K`;
  if (n === 0) return '\u2014';
  return `£${n}`;
}

function formatGoalDate(iso: string | null): string {
  if (!iso) return '\u2014';
  const d = new Date(iso);
  const day = d.getUTCDate();
  const mon = d.toLocaleString('default', { month: 'short', timeZone: 'UTC' });
  const yr = String(d.getUTCFullYear()).slice(2);
  return `${day} ${mon} '${yr}`;
}

const HEALTH_COLORS = { green: '#22c55e', yellow: '#eab308', red: '#ef4444', muted: '#6b7280' };

function healthColor(actual: number, target: number): string {
  if (target <= 0) return HEALTH_COLORS.muted;
  const ratio = actual / target;
  if (ratio >= 0.7) return HEALTH_COLORS.green;
  if (ratio >= 0.4) return HEALTH_COLORS.yellow;
  return HEALTH_COLORS.red;
}

function healthFromTwo(a1: number, t1: number, a2: number, t2: number): string {
  if (t1 <= 0 && t2 <= 0) return HEALTH_COLORS.muted;
  const r1 = t1 > 0 ? a1 / t1 : 1;
  const r2 = t2 > 0 ? a2 / t2 : 1;
  const worst = Math.min(r1, r2);
  if (worst >= 0.7) return HEALTH_COLORS.green;
  if (worst >= 0.4) return HEALTH_COLORS.yellow;
  return HEALTH_COLORS.red;
}

function dealHealthColor(deal: Deal, pillarId: string): string {
  if (pillarId === 'engagement') {
    const total = deal.totalTenants ?? 0;
    if (total === 0) return HEALTH_COLORS.muted;
    const pct = (deal.activeTenants ?? 0) / total;
    if (pct >= 0.5) return HEALTH_COLORS.green;
    if (pct >= 0.2) return HEALTH_COLORS.yellow;
    return HEALTH_COLORS.red;
  }
  if (deal.stage === 'Won') return HEALTH_COLORS.green;
  if (deal.stage === 'Offer Sent' || deal.stage === 'Demo Done') return HEALTH_COLORS.yellow;
  return HEALTH_COLORS.red;
}

// --- UI Components (adapted to SP dark glass-card theme) ---

function HealthDot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      style={{ width: size, height: size, background: color }}
    />
  );
}

function MetricBar({ metric }: { metric: GemMetric }) {
  const pct = metric.target > 0 ? Math.round((metric.current / metric.target) * 100) : 0;
  const barColor = healthColor(metric.current, metric.target);
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-500 uppercase tracking-wider">{metric.name}</span>
        <span className="font-mono text-slate-300">
          {formatNumber(metric.current, metric.unit)} / {formatNumber(metric.target, metric.unit)}
        </span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, pct)}%`, background: barColor }}
        />
      </div>
    </div>
  );
}

function formatPeriodLabel(period: string): { label: string; short: string } {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1);
  return {
    label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
    short: d.toLocaleString('default', { month: 'short' }) + " '" + String(y).slice(2),
  };
}

function PeriodDropdown({
  selected,
  onChange,
  periods,
}: {
  selected: string;
  onChange: (value: string) => void;
  periods: { value: string; label: string; short: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = periods.find((p) => p.value === selected);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 glass-card rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:border-white/20 transition-colors"
      >
        <span>{current?.short || selected}</span>
        <svg className={`w-3.5 h-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 glass-card rounded-lg shadow-lg z-50 py-1 min-w-[180px] max-h-[280px] overflow-y-auto">
          {periods.map((period) => (
            <button
              key={period.value}
              onClick={() => { onChange(period.value); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                period.value === selected
                  ? 'bg-emerald-500/15 text-emerald-400 font-medium'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type SortDir = 'asc' | 'desc';

function SortHeader<K extends string>({ label, sortKey, current, dir, onSort, align }: {
  label: string; sortKey: K; current: K; dir: SortDir;
  onSort: (k: K) => void; align?: string;
}) {
  const active = current === sortKey;
  return (
    <th
      className={`py-0.5 font-medium cursor-pointer select-none hover:text-slate-300 transition-colors ${align || 'text-right'}`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {active && <span className="ml-0.5">{dir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
    </th>
  );
}

type GrowthSortKey = 'company' | 'stage' | 'tpv';
const STAGE_ORDER: Record<string, number> = { 'Lead': 0, 'Contacted': 1, 'Demo Done': 2, 'Offer Sent': 3, 'Won': 4 };

function sortGrowthDeals(deals: Deal[], key: GrowthSortKey, dir: SortDir): Deal[] {
  return [...deals].sort((a, b) => {
    if (key === 'company') {
      const va = a.company.toLowerCase(), vb = b.company.toLowerCase();
      return dir === 'asc' ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1);
    }
    if (key === 'stage') {
      const va = STAGE_ORDER[a.stage] ?? -1, vb = STAGE_ORDER[b.stage] ?? -1;
      return dir === 'asc' ? va - vb : vb - va;
    }
    return dir === 'asc' ? a.tpv - b.tpv : b.tpv - a.tpv;
  });
}

function useGrowthSort(defaultKey: GrowthSortKey = 'tpv', defaultDir: SortDir = 'desc') {
  const [sortKey, setSortKey] = useState<GrowthSortKey>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);
  function handleSort(key: GrowthSortKey) {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }
  return { sortKey, sortDir, handleSort };
}

function GrowthDetail({ deals }: { deals: Deal[] }) {
  const pipeline = deals.filter((d) => d.stage !== 'Won');
  const signed = deals.filter((d) => d.stage === 'Won');
  const pSort = useGrowthSort('tpv', 'desc');
  const sSort = useGrowthSort('tpv', 'desc');
  const sortedPipeline = sortGrowthDeals(pipeline, pSort.sortKey, pSort.sortDir);
  const sortedSigned = sortGrowthDeals(signed, sSort.sortKey, sSort.sortDir);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {sortedPipeline.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pipeline ({sortedPipeline.length})</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500">
                <SortHeader label="Deal" sortKey="company" current={pSort.sortKey} dir={pSort.sortDir} onSort={pSort.handleSort} align="text-left" />
                <SortHeader label="Stage" sortKey="stage" current={pSort.sortKey} dir={pSort.sortDir} onSort={pSort.handleSort} align="text-left" />
                <SortHeader label="TPV Goal" sortKey="tpv" current={pSort.sortKey} dir={pSort.sortDir} onSort={pSort.handleSort} align="text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedPipeline.map((d) => (
                <tr key={d.company}>
                  <td className="py-1"><span className="flex items-center gap-1.5"><HealthDot color={dealHealthColor(d, 'growth')} size={6} />{d.company}</span></td>
                  <td className="py-1 text-slate-500">{d.stage}</td>
                  <td className="py-1 text-right font-mono">{formatTpv(d.tpv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {sortedSigned.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Signed ({sortedSigned.length})</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500">
                <SortHeader label="Deal" sortKey="company" current={sSort.sortKey} dir={sSort.sortDir} onSort={sSort.handleSort} align="text-left" />
                <SortHeader label="TPV Goal" sortKey="tpv" current={sSort.sortKey} dir={sSort.sortDir} onSort={sSort.handleSort} align="text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedSigned.map((d) => (
                <tr key={d.company}>
                  <td className="py-1"><span className="flex items-center gap-1.5"><HealthDot color={dealHealthColor(d, 'growth')} size={6} />{d.company}</span></td>
                  <td className="py-1 text-right font-mono">{formatTpv(d.tpv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type EngagementSortKey = 'company' | 'tenants' | 'activation' | 'monthlyTpv';

function EngagementDetail({ deals }: { deals: Deal[] }) {
  const withData = deals.filter((d) => (d.totalTenants ?? 0) > 0 || (d.monthlyTpv ?? 0) > 0);
  const noData = deals.filter((d) => (d.totalTenants ?? 0) === 0 && (d.monthlyTpv ?? 0) === 0);
  const [sortKey, setSortKey] = useState<EngagementSortKey>('activation');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedDeal, setExpandedDeal] = useState<string | null>(null);

  function handleSort(key: EngagementSortKey) {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const sorted = [...withData].sort((a, b) => {
    if (sortKey === 'company') {
      const va = a.company.toLowerCase(), vb = b.company.toLowerCase();
      return sortDir === 'asc' ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1);
    }
    let va = 0, vb = 0;
    if (sortKey === 'tenants') { va = a.activeTenants ?? 0; vb = b.activeTenants ?? 0; }
    else if (sortKey === 'activation') {
      const at = a.totalTenants ?? 0, bt = b.totalTenants ?? 0;
      va = at > 0 ? (a.activeTenants ?? 0) / at : 0;
      vb = bt > 0 ? (b.activeTenants ?? 0) / bt : 0;
    } else if (sortKey === 'monthlyTpv') { va = a.monthlyTpv ?? 0; vb = b.monthlyTpv ?? 0; }
    return sortDir === 'asc' ? va - vb : vb - va;
  });

  return (
    <div>
      {sorted.length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500">
              <SortHeader label="Company" sortKey="company" current={sortKey} dir={sortDir} onSort={handleSort} align="text-left" />
              <SortHeader label="Tenants" sortKey="tenants" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Activation" sortKey="activation" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Monthly TPV" sortKey="monthlyTpv" current={sortKey} dir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.map((d) => {
              const active = d.activeTenants ?? 0;
              const total = d.totalTenants ?? 0;
              const pct = total > 0 ? Math.round((active / total) * 100) : 0;
              const isOpen = expandedDeal === d.company;
              return (
                <>
                  <tr key={d.company} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-1">
                      <button onClick={() => setExpandedDeal(isOpen ? null : d.company)} className="flex items-center gap-1.5 hover:underline cursor-pointer text-left">
                        <HealthDot color={dealHealthColor(d, 'engagement')} size={6} />
                        {d.company}
                        <span className="text-[9px] text-slate-500">{isOpen ? '\u25BC' : '\u25B6'}</span>
                      </button>
                    </td>
                    <td className="py-1 text-right font-mono">{active}/{total}</td>
                    <td className="py-1 text-right font-mono">{pct}%</td>
                    <td className="py-1 text-right font-mono">{formatTpv(d.monthlyTpv ?? 0)}</td>
                  </tr>
                  {isOpen && (
                    <tr key={`${d.company}-detail`}>
                      <td colSpan={4} className="p-0 bg-[#0B1120]">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-slate-600 text-[10px]">
                              <th className="text-left py-0.5 px-4 font-medium">Deal</th>
                              <th className="text-left py-0.5 font-medium">Stage</th>
                              <th className="text-right py-0.5 font-medium">TPV (Actual / Goal)</th>
                              <th className="text-right py-0.5 pr-2 font-medium">Goal Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="text-slate-500">
                              <td className="py-1 px-4">{d.company}</td>
                              <td className="py-1">{d.stage}</td>
                              <td className="py-1 text-right font-mono">
                                <span className="inline-flex items-center gap-1.5">
                                  {formatTpv(d.monthlyTpv ?? 0)} / {formatTpv(d.tpv)}
                                  <HealthDot color={healthColor(d.monthlyTpv ?? 0, d.tpv)} size={6} />
                                </span>
                              </td>
                              <td className="py-1 text-right pr-2 font-mono">{formatGoalDate(d.expectedClose)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      )}
      {noData.length > 0 && (
        <p className="text-xs text-slate-600 mt-2">{noData.length} deal{noData.length > 1 ? 's' : ''} without activation data</p>
      )}
      {sorted.length === 0 && withData.length === 0 && (
        <p className="text-xs text-slate-600 py-2">No activation data yet</p>
      )}
    </div>
  );
}

type MonetizationSortKey = 'company' | 'monthlyTpv' | 'takeRate' | 'revenue';

function MonetizationDetail({ deals }: { deals: Deal[] }) {
  const active = deals.filter((d) => (d.monthlyTpv ?? 0) > 0 || (d.takeRate ?? 0) > 0);
  const inactive = deals.filter((d) => (d.monthlyTpv ?? 0) === 0 && (d.takeRate ?? 0) === 0);
  const [sortKey, setSortKey] = useState<MonetizationSortKey>('revenue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  function handleSort(key: MonetizationSortKey) {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const sorted = [...active].sort((a, b) => {
    if (sortKey === 'company') {
      const va = a.company.toLowerCase(), vb = b.company.toLowerCase();
      return sortDir === 'asc' ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1);
    }
    let va = 0, vb = 0;
    if (sortKey === 'monthlyTpv') { va = a.monthlyTpv ?? 0; vb = b.monthlyTpv ?? 0; }
    else if (sortKey === 'takeRate') { va = a.takeRate ?? 0; vb = b.takeRate ?? 0; }
    else { va = (a.monthlyTpv ?? 0) * (a.takeRate ?? 0) / 100; vb = (b.monthlyTpv ?? 0) * (b.takeRate ?? 0) / 100; }
    return sortDir === 'asc' ? va - vb : vb - va;
  });

  return (
    <div>
      {sorted.length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500">
              <SortHeader label="Company" sortKey="company" current={sortKey} dir={sortDir} onSort={handleSort} align="text-left" />
              <SortHeader label="Monthly TPV" sortKey="monthlyTpv" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Take Rate" sortKey="takeRate" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Revenue" sortKey="revenue" current={sortKey} dir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.map((d) => {
              const rate = d.takeRate ?? 0;
              const mTpv = d.monthlyTpv ?? 0;
              const rev = mTpv * rate / 100;
              return (
                <tr key={d.company} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-1">
                    <span className="flex items-center gap-1.5">
                      <HealthDot color={rate >= 4.5 ? HEALTH_COLORS.green : rate >= 2.0 ? HEALTH_COLORS.yellow : HEALTH_COLORS.red} size={6} />
                      {d.company}
                    </span>
                  </td>
                  <td className="py-1 text-right font-mono">{formatTpv(mTpv)}</td>
                  <td className="py-1 text-right font-mono">{rate > 0 ? `${rate}%` : '\u2014'}</td>
                  <td className="py-1 text-right font-mono">{rev > 0 ? formatTpv(Math.round(rev)) : '\u2014'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="font-bold border-t-2 border-white/10">
              <td className="py-1">Total</td>
              <td className="py-1 text-right font-mono">{formatTpv(sorted.reduce((s, d) => s + (d.monthlyTpv ?? 0), 0))}</td>
              <td className="py-1 text-right font-mono">
                {(() => {
                  const totalTpv = sorted.reduce((s, d) => s + (d.monthlyTpv ?? 0), 0);
                  const totalRev = sorted.reduce((s, d) => s + (d.monthlyTpv ?? 0) * (d.takeRate ?? 0) / 100, 0);
                  return totalTpv > 0 ? `${(totalRev / totalTpv * 100).toFixed(1)}%` : '\u2014';
                })()}
              </td>
              <td className="py-1 text-right font-mono">
                {formatTpv(Math.round(sorted.reduce((s, d) => s + (d.monthlyTpv ?? 0) * (d.takeRate ?? 0) / 100, 0)))}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
      {inactive.length > 0 && (
        <p className="text-xs text-slate-600 mt-2">{inactive.length} deal{inactive.length > 1 ? 's' : ''} not yet generating revenue</p>
      )}
      {sorted.length === 0 && (
        <p className="text-xs text-slate-600 py-2">No revenue data yet</p>
      )}
    </div>
  );
}

function ManagerDetail({ deals, pillarId }: { deals: Deal[]; pillarId: string }) {
  if (deals.length === 0) return <p className="text-xs text-slate-600 py-2">No deals assigned</p>;
  if (pillarId === 'engagement') return <EngagementDetail deals={deals} />;
  if (pillarId === 'monetization') return <MonetizationDetail deals={deals} />;
  return <GrowthDetail deals={deals} />;
}

function Scorecard({ pillar, deals }: { pillar: GemPillar; deals: Deal[] }) {
  const leading = pillar.leading;
  const lagging = pillar.lagging;
  const team = pillar.team;
  // Team expanded by default for sales focus
  const [teamExpanded, setTeamExpanded] = useState(true);
  const [expandedManager, setExpandedManager] = useState<string | null>(null);
  if (!leading || !team) return null;

  const hasTwoMetrics = !!lagging;
  const colCount = 3 + (lagging ? 1 : 0);

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-white/5">
        <HealthDot
          color={healthFromTwo(leading.current, leading.target, lagging?.current ?? 0, lagging?.target ?? 0)}
          size={12}
        />
        <span className="font-bold text-base text-white">{pillar.name.toUpperCase()}</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full leading-none whitespace-nowrap bg-white/5 text-slate-500">
          PRIORITY {pillar.priority}
        </span>
      </div>

      {/* Metrics */}
      <div className={`grid gap-4 px-4 py-3 border-b border-white/5 ${hasTwoMetrics ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
        <div>
          {hasTwoMetrics && <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Leading</span>}
          <MetricBar metric={leading} />
        </div>
        {lagging && (
          <div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Lagging</span>
            <MetricBar metric={lagging} />
          </div>
        )}
      </div>

      {/* Collapsible team scorecard */}
      <div>
        <button
          onClick={() => setTeamExpanded(!teamExpanded)}
          className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-white/[0.02] transition-colors"
        >
          <span className="text-xs text-slate-500">{teamExpanded ? '\u25BC' : '\u25B6'}</span>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Sales Team ({team.length})
          </span>
        </button>
        {teamExpanded && (
          <div className="px-4 pb-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wider">
                  <th className="text-left py-1 font-medium">Sales Manager</th>
                  <th className="text-left py-1 font-medium">Territory</th>
                  <th className="text-right py-1 font-medium">{leading.name}</th>
                  {lagging && <th className="text-right py-1 font-medium">{lagging.name}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {team.map((member) => {
                  const isExpanded = expandedManager === member.name;
                  const memberDeals = deals.filter((d) => d.owner === member.name);
                  return (
                    <>
                      <tr key={member.name} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-2 font-medium text-slate-200">
                          <div className="flex items-center gap-1.5">
                            <HealthDot color={healthFromTwo(member.leading, member.leadingTarget, member.lagging, member.laggingTarget)} />
                            <button
                              onClick={() => setExpandedManager(isExpanded ? null : member.name)}
                              className="hover:underline cursor-pointer text-left"
                            >
                              {member.name}
                              <span className="text-[10px] text-slate-500 ml-1">{isExpanded ? '\u25BC' : '\u25B6'}</span>
                            </button>
                          </div>
                        </td>
                        <td className="py-2 text-slate-500">{member.role}</td>
                        <td className="py-2 text-right font-mono text-xs text-slate-300">
                          {formatActualTarget(member.leading, member.leadingTarget, leading.unit)}
                        </td>
                        {lagging && (
                          <td className="py-2 text-right font-mono text-xs text-slate-300">
                            {formatActualTarget(member.lagging, member.laggingTarget, lagging.unit)}
                          </td>
                        )}
                      </tr>
                      {isExpanded && (
                        <tr key={`${member.name}-detail`}>
                          <td colSpan={colCount} className="px-3 py-3 bg-[#0B1120]">
                            <ManagerDetail deals={memberDeals} pillarId={pillar.id} />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
                <tr className="font-bold border-t-2 border-white/10">
                  <td className="py-2 text-slate-200">{leading.unit === '%' ? 'Average' : 'Total'}</td>
                  <td className="py-2"></td>
                  <td className="py-2 text-right font-mono text-xs text-slate-300">
                    {leading.unit === '%'
                      ? formatActualTarget(
                          team.length > 0 ? team.reduce((s, m) => s + m.leading, 0) / team.length : 0,
                          team.length > 0 ? team.reduce((s, m) => s + m.leadingTarget, 0) / team.length : 0, '%')
                      : formatActualTarget(team.reduce((s, m) => s + m.leading, 0), team.reduce((s, m) => s + m.leadingTarget, 0), leading.unit)}
                  </td>
                  {lagging && (
                    <td className="py-2 text-right font-mono text-xs text-slate-300">
                      {formatActualTarget(team.reduce((s, m) => s + m.lagging, 0), team.reduce((s, m) => s + m.laggingTarget, 0), lagging.unit)}
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Gem derivation logic (ported from MC) ---

function deriveGems(gems: GemPillar[], deals: Deal[]): GemPillar[] {
  return gems.map((pillar) => {
    if (!pillar.team || deals.length === 0) return pillar;

    if (pillar.id === 'growth') {
      const updatedTeam = pillar.team.map((m) => {
        const owned = deals.filter((d) => d.owner === m.name);
        return { ...m, leading: owned.filter((d) => d.stage !== 'Won').length, lagging: owned.filter((d) => d.stage === 'Won').length };
      });
      return {
        ...pillar, team: updatedTeam,
        leading: pillar.leading ? { ...pillar.leading, current: updatedTeam.reduce((s, m) => s + m.leading, 0) } : pillar.leading,
        lagging: pillar.lagging ? { ...pillar.lagging, current: updatedTeam.reduce((s, m) => s + m.lagging, 0) } : pillar.lagging,
      };
    }

    if (pillar.id === 'engagement') {
      const updatedTeam = pillar.team.map((m) => {
        const owned = deals.filter((d) => d.owner === m.name);
        const totalActive = owned.reduce((s, d) => s + (d.activeTenants ?? 0), 0);
        const totalTenants = owned.reduce((s, d) => s + (d.totalTenants ?? 0), 0);
        const activation = totalTenants > 0 ? Math.round((totalActive / totalTenants) * 100) : 0;
        const mTpv = owned.reduce((s, d) => s + (d.monthlyTpv ?? 0), 0);
        return { ...m, leading: activation, lagging: mTpv };
      });
      const allActive = deals.reduce((s, d) => s + (d.activeTenants ?? 0), 0);
      const allTenants = deals.reduce((s, d) => s + (d.totalTenants ?? 0), 0);
      const totalActivation = allTenants > 0 ? Math.round((allActive / allTenants) * 100) : 0;
      const totalMTpv = deals.reduce((s, d) => s + (d.monthlyTpv ?? 0), 0);
      return {
        ...pillar, team: updatedTeam,
        leading: pillar.leading ? { ...pillar.leading, current: totalActivation } : pillar.leading,
        lagging: pillar.lagging ? { ...pillar.lagging, current: totalMTpv } : pillar.lagging,
      };
    }

    if (pillar.id === 'monetization') {
      const updatedTeam = pillar.team.map((m) => {
        const owned = deals.filter((d) => d.owner === m.name);
        const mTpv = owned.reduce((s, d) => s + (d.monthlyTpv ?? 0), 0);
        const mRev = owned.reduce((s, d) => s + (d.monthlyTpv ?? 0) * (d.takeRate ?? 0) / 100, 0);
        const avgRate = mTpv > 0 ? mRev / mTpv * 100 : 0;
        return { ...m, leading: Number(avgRate.toFixed(1)), lagging: Math.round(mRev) };
      });
      const totalRev = deals.reduce((s, d) => s + (d.monthlyTpv ?? 0) * (d.takeRate ?? 0) / 100, 0);
      return {
        ...pillar, team: updatedTeam,
        lagging: pillar.lagging ? { ...pillar.lagging, current: Math.round(totalRev) } : pillar.lagging,
      };
    }

    return pillar;
  });
}

// --- Loading skeleton ---

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass-card rounded-2xl p-4 space-y-3">
          <div className="h-6 w-32 bg-white/5 rounded animate-pulse" />
          <div className="h-2 bg-white/5 rounded-full animate-pulse" />
          <div className="h-2 bg-white/5 rounded-full w-3/4 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// --- Main component ---

export default function PerformanceCascade() {
  const { data, loading } = useCascade();
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  if (loading) return <LoadingSkeleton />;

  if (!data || !data.cascade?.gem?.length) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-white">Performance Data Unavailable</p>
          <p className="text-xs text-slate-500">Waiting for first sync from Mission Control...</p>
        </div>
      </div>
    );
  }

  // Build period options
  const availablePeriods: { value: string; label: string; short: string }[] = [
    { value: 'all', label: 'All Time', short: 'All' },
  ];
  if (data.monthlyActivation) {
    const sortedKeys = Object.keys(data.monthlyActivation).sort();
    for (const key of sortedKeys) {
      const { label, short } = formatPeriodLabel(key);
      availablePeriods.push({ value: key, label, short });
    }
  }

  const rawDeals = data.pipeline?.deals || [];
  const deals = applyPeriodFilter(rawDeals, data.monthlyActivation, selectedPeriod);
  const gems = deriveGems(data.cascade.gem, deals);

  const lastUpdated = new Date(data.timestamp);
  const ago = Math.round((Date.now() - lastUpdated.getTime()) / 60000);
  const agoText = ago < 1 ? 'just now' : ago < 60 ? `${ago}m ago` : `${Math.floor(ago / 60)}h ago`;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Performance</h1>
          <p className="text-xs text-slate-500 mt-0.5">Last updated {agoText}</p>
        </div>
        <PeriodDropdown selected={selectedPeriod} onChange={setSelectedPeriod} periods={availablePeriods} />
      </div>

      <div className="space-y-4">
        {gems.map((pillar) => (
          <Scorecard key={pillar.id} pillar={pillar} deals={deals} />
        ))}
      </div>
    </div>
  );
}
