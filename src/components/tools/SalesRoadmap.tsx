'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  X,
  Copy,
  Play,
  Check,
  AlertCircle,
  Clock,
  Target,
  Users,
  MapPin,
  FileText,
} from 'lucide-react';
import { useRoadmap, useRoadmapRole } from '@/lib/use-roadmap';
import { useCascade } from '@/lib/use-cascade';
import {
  MANAGERS,
  EMPTY_STATE,
  type ManagerId,
  type RoadmapRole,
  type Roadmap,
  type Milestone,
  type WeeklyGoal,
  type WeeklyCheckIn,
  type RoadmapTemplate,
  type GoalStatus,
  type HealthStatus,
  type RoadmapState,
  type MilestoneStatus,
} from '@/lib/roadmap-types';

// --- Helpers ---

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getMonday(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return toISO(d);
}

function getCurrentWeekStart(): string {
  return getMonday(toISO(new Date()));
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function getWeeksBetween(start: string, end: string): string[] {
  const weeks: string[] = [];
  let current = getMonday(start);
  const endDate = end;
  while (current <= endDate) {
    weeks.push(current);
    current = addDays(current, 7);
  }
  return weeks;
}

function computeHealth(
  goals: WeeklyGoal[],
  milestones: Milestone[],
  currentWeek: string,
): HealthStatus {
  const thisWeekGoals = goals.filter((g) => g.weekStart === currentWeek);
  const completed = thisWeekGoals.filter((g) => g.status === 'completed').length;
  const thisWeekRate = thisWeekGoals.length > 0 ? completed / thisWeekGoals.length : 1;

  const today = toISO(new Date());
  const overdueMs = milestones.filter(
    (m) => m.targetDate < today && m.status !== 'completed',
  );

  // Check 2 consecutive weeks < 50%
  const prevWeek = addDays(currentWeek, -7);
  const prevGoals = goals.filter((g) => g.weekStart === prevWeek);
  const prevCompleted = prevGoals.filter((g) => g.status === 'completed').length;
  const prevRate = prevGoals.length > 0 ? prevCompleted / prevGoals.length : 1;

  if (overdueMs.length > 0 || (thisWeekRate < 0.5 && prevRate < 0.5)) return 'behind';

  const upcomingMs = milestones.filter(
    (m) => m.targetDate >= today && m.targetDate <= addDays(today, 7) && m.status !== 'completed',
  );
  const msProgress = upcomingMs.length > 0 ? 0.4 : 1; // rough proxy

  if (thisWeekRate < 0.7 || msProgress < 0.5) return 'at_risk';
  return 'on_track';
}

const HEALTH_COLORS: Record<HealthStatus, { bg: string; text: string; label: string }> = {
  on_track: { bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400', label: 'On Track' },
  at_risk: { bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-400', label: 'At Risk' },
  behind: { bg: 'bg-rose-500/10 border-rose-500/30', text: 'text-rose-400', label: 'Behind' },
};

// --- Onboarding Phases ---

interface OnboardingPhase {
  id: string;
  label: string;
  weekStart: number; // week offset from roadmap start (0-indexed)
  weekEnd: number;   // inclusive
  color: string;
  bgColor: string;
  borderColor: string;
}

const ONBOARDING_PHASES: OnboardingPhase[] = [
  { id: 'training', label: 'Training', weekStart: 0, weekEnd: 1, color: 'text-violet-400', bgColor: 'bg-violet-500/15', borderColor: 'border-violet-500/30' },
  { id: 'supported', label: 'Supported Sales', weekStart: 2, weekEnd: 3, color: 'text-blue-400', bgColor: 'bg-blue-500/15', borderColor: 'border-blue-500/30' },
  { id: 'standalone', label: 'Standalone Sales', weekStart: 4, weekEnd: 9, color: 'text-emerald-400', bgColor: 'bg-emerald-500/15', borderColor: 'border-emerald-500/30' },
  { id: 'full', label: 'Sales & Account Mgmt', weekStart: 10, weekEnd: 12, color: 'text-cyan-400', bgColor: 'bg-cyan-500/15', borderColor: 'border-cyan-500/30' },
];

const TRAINING_TOPICS = ['Sales & Product', 'Strategy & ICP', 'CRM & Tools', '1st Supported Deal'];

import type { TPVTarget } from '@/lib/roadmap-types';

const DEFAULT_TPV_TARGETS: TPVTarget[] = [
  { month: 1, label: 'Month 1', target: 5000 },
  { month: 2, label: 'Month 2', target: 25000 },
  { month: 3, label: 'Month 3', target: 75000 },
];

function formatTPV(value: number): string {
  if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `€${(value / 1000).toFixed(0)}K`;
  return `€${value}`;
}

// Predefined goals per week (0-indexed)
const WEEKLY_GOALS: Record<number, string[]> = {
  0: ['Complete sales process training', 'Complete product deep-dive', 'Shadow 2 discovery calls'],
  1: ['Complete strategy & ICP training', 'Set up CRM & tools', 'Deliver practice pitch to team'],
  2: ['Lead 3 discovery calls (with support)', 'Send 15 outreach messages', 'Update CRM with all contacts'],
  3: ['Lead 5 discovery calls (with support)', 'Send 1st proposal (supported)', 'Build pipeline of 10+ prospects'],
  4: ['Run 5 discovery calls', 'Send 15 outreach messages', 'Submit 2 proposals', 'Update CRM pipeline'],
  5: ['Run 5 discovery calls', 'Send 15 outreach messages', 'Submit 2 proposals', 'Follow up on open proposals'],
  6: ['Run 5 discovery calls', 'Send 15 outreach messages', 'Submit 2 proposals', 'Close 1 deal or advance 2 to proposal'],
  7: ['Run 5 discovery calls', 'Send 15 outreach messages', 'Submit 2 proposals', 'Follow up on open proposals'],
  8: ['Run 5 discovery calls', 'Send 15 outreach messages', 'Submit 2 proposals', 'Close 1 deal or advance 2 to proposal'],
  9: ['Run 5 discovery calls', 'Send 15 outreach messages', 'Submit 2 proposals', 'Follow up on open proposals'],
  10: ['Run 5 discovery calls', 'Send 15 outreach messages', 'Submit 2 proposals', 'Account review: check-in with 3 existing accounts'],
  11: ['Run 5 discovery calls', 'Send 15 outreach messages', 'Submit 2 proposals', 'Account review: check-in with 3 existing accounts'],
  12: ['Run 5 discovery calls', 'Send 15 outreach messages', 'Submit 2 proposals', 'Account review: check-in with 3 existing accounts', 'Prepare Q2 roadmap draft'],
};

// --- Role Picker ---

function RolePicker({ onSelect }: { onSelect: (r: RoadmapRole) => void }) {
  const roles: { id: RoadmapRole; label: string }[] = [
    { id: 'ceo', label: 'CEO (Risto)' },
    ...MANAGERS.map((m) => ({ id: m.id as RoadmapRole, label: `${m.name} (${m.region})` })),
  ];

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-80 space-y-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto">
          <Users size={20} className="text-emerald-400" />
        </div>
        <p className="text-sm font-bold text-white">Who are you?</p>
        <div className="space-y-2">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => onSelect(r.id)}
              className="w-full py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 hover:border-emerald-500/30 hover:text-white transition-all"
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Team Overview (View A) ---

interface ManagerCardProps {
  manager: (typeof MANAGERS)[number];
  roadmap: Roadmap | undefined;
  milestones: Milestone[];
  goals: WeeklyGoal[];
  pipelineStats: { deals: number; stale: number; tpv: number };
  onClick: () => void;
}

function ManagerCard({ manager, roadmap, milestones, goals, pipelineStats, onClick }: ManagerCardProps) {
  const currentWeek = getCurrentWeekStart();
  const thisWeekGoals = goals.filter((g) => g.weekStart === currentWeek);
  const thisWeekDone = thisWeekGoals.filter((g) => g.status === 'completed').length;
  const completedMs = milestones.filter((m) => m.status === 'completed').length;
  const msProgress = milestones.length > 0 ? Math.round((completedMs / milestones.length) * 100) : 0;
  const health = goals.length > 0 ? computeHealth(goals, milestones, currentWeek) : null;
  const hc = health ? HEALTH_COLORS[health] : null;
  const noGoalsThisWeek = thisWeekGoals.length === 0 && roadmap;

  return (
    <button onClick={onClick} className="glass-card rounded-2xl p-5 text-left hover:border-emerald-500/30 transition-all w-full">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-white font-bold text-sm">{manager.name}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <MapPin size={10} className="text-slate-500" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{manager.region}</span>
          </div>
        </div>
        {hc && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${hc.bg} ${hc.text}`}>
            {hc.label}
          </span>
        )}
      </div>

      {roadmap ? (
        <>
          <p className="text-xs text-slate-400 mb-3 truncate">{roadmap.title}</p>

          {/* Milestone progress */}
          <div className="mb-3">
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-slate-500">Milestones</span>
              <span className="text-slate-400">{completedMs}/{milestones.length}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-emerald-500/60 transition-all"
                style={{ width: `${msProgress}%` }}
              />
            </div>
          </div>

          {/* This week */}
          <div className={`rounded-xl p-3 mb-3 ${noGoalsThisWeek ? 'bg-amber-500/5 border border-amber-500/20' : 'bg-white/[0.03]'}`}>
            {noGoalsThisWeek ? (
              <div className="flex items-center gap-2">
                <AlertCircle size={12} className="text-amber-400" />
                <span className="text-[10px] text-amber-400 font-bold">No goals set this week</span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold">This Week</span>
                <span className="text-sm font-black text-white">
                  {thisWeekDone}<span className="text-slate-500">/{thisWeekGoals.length}</span>
                </span>
              </div>
            )}
          </div>

          {/* Pipeline stats */}
          <div className="flex gap-3 text-[10px]">
            <div>
              <span className="text-slate-500">Deals</span>
              <span className="text-white font-bold ml-1">{pipelineStats.deals}</span>
            </div>
            {pipelineStats.stale > 0 && (
              <div>
                <span className="text-slate-500">Stale</span>
                <span className="text-amber-400 font-bold ml-1">{pipelineStats.stale}</span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="py-6 text-center">
          <Plus size={16} className="text-slate-600 mx-auto mb-1" />
          <p className="text-[10px] text-slate-600 font-bold">No roadmap yet</p>
        </div>
      )}
    </button>
  );
}

function TeamOverview({
  state,
  cascadeDeals,
  onSelectManager,
  role,
}: {
  state: RoadmapState;
  cascadeDeals: { company: string; owner: string; daysInStage: number; tpv: number }[];
  onSelectManager: (id: ManagerId) => void;
  role: RoadmapRole;
}) {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-black text-white">Sales Roadmap</h1>
          <p className="text-xs text-slate-500 mt-0.5">90-day accountability tracker</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {MANAGERS.map((mgr) => {
          const roadmap = state.roadmaps.find(
            (r) => r.managerId === mgr.id && r.status === 'active',
          );
          const milestones = roadmap
            ? state.milestones.filter((m) => m.roadmapId === roadmap.id)
            : [];
          const goals = roadmap
            ? state.goals.filter((g) => g.roadmapId === roadmap.id)
            : [];

          const mgrDeals = cascadeDeals.filter(
            (d) => d.owner.toLowerCase().startsWith(mgr.name.toLowerCase()),
          );
          const pipelineStats = {
            deals: mgrDeals.length,
            stale: mgrDeals.filter((d) => d.daysInStage > 20).length,
            tpv: mgrDeals.reduce((s, d) => s + d.tpv, 0),
          };

          // Non-CEO users can only click their own card
          const canClick = role === 'ceo' || role === mgr.id;

          return (
            <ManagerCard
              key={mgr.id}
              manager={mgr}
              roadmap={roadmap}
              milestones={milestones}
              goals={goals}
              pipelineStats={pipelineStats}
              onClick={() => canClick && onSelectManager(mgr.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

// --- Onboarding Timeline Visual ---

function OnboardingTimeline({ roadmap, milestones, goals, isCeo, onUpdateTPV }: {
  roadmap: Roadmap;
  milestones: Milestone[];
  goals: WeeklyGoal[];
  isCeo: boolean;
  onUpdateTPV: (targets: TPVTarget[]) => void;
}) {
  const totalWeeks = 13;
  const currentWeek = getCurrentWeekStart();
  const roadmapStart = getMonday(roadmap.startDate);

  // Which week number are we in relative to roadmap start?
  const daysSinceStart = Math.floor((new Date(currentWeek).getTime() - new Date(roadmapStart).getTime()) / 86400000);
  const currentWeekIdx = Math.floor(daysSinceStart / 7);

  const tpvTargets = roadmap.tpvTargets ?? DEFAULT_TPV_TARGETS;
  const [editingTPV, setEditingTPV] = useState(false);
  const [tpvDraft, setTpvDraft] = useState(tpvTargets.map((t) => String(t.target)));

  // Monthly TPV targets — positioned at week 4, 8, 12
  const tpvMarkers = tpvTargets.map((t) => ({
    ...t,
    weekIdx: t.month * 4 - 1,
  }));

  const saveTPV = () => {
    const updated: TPVTarget[] = tpvTargets.map((t, i) => ({
      ...t,
      target: Number(tpvDraft[i]) || t.target,
    }));
    onUpdateTPV(updated);
    setEditingTPV(false);
  };

  return (
    <div className="glass-card rounded-2xl p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Onboarding Journey</h3>
        <span className="text-[10px] text-slate-500">
          {currentWeekIdx >= 0 && currentWeekIdx < totalWeeks
            ? `Week ${currentWeekIdx + 1} of ${totalWeeks}`
            : currentWeekIdx >= totalWeeks ? 'Complete' : 'Not started'}
        </span>
      </div>

      {/* Phase bars */}
      <div className="relative mb-6">
        {/* Background track */}
        <div className="flex gap-0.5 mb-1">
          {Array.from({ length: totalWeeks }).map((_, i) => {
            const phase = ONBOARDING_PHASES.find((p) => i >= p.weekStart && i <= p.weekEnd);
            const isCurrentW = i === currentWeekIdx;
            const isPast = i < currentWeekIdx;
            return (
              <div
                key={i}
                className={`h-8 flex-1 rounded-sm relative transition-all ${
                  phase ? phase.bgColor : 'bg-white/5'
                } ${isCurrentW ? 'ring-1 ring-white/40 scale-y-110' : ''} ${
                  isPast ? 'opacity-60' : ''
                }`}
                title={`Week ${i + 1}${phase ? ` — ${phase.label}` : ''}`}
              >
                {isCurrentW && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
            );
          })}
        </div>

        {/* Phase labels */}
        <div className="flex gap-0.5">
          {ONBOARDING_PHASES.map((phase) => {
            const span = phase.weekEnd - phase.weekStart + 1;
            const startPct = (phase.weekStart / totalWeeks) * 100;
            const widthPct = (span / totalWeeks) * 100;
            return (
              <div
                key={phase.id}
                className="text-center"
                style={{ position: 'absolute', left: `${startPct}%`, width: `${widthPct}%` }}
              >
                <span className={`text-[9px] font-bold ${phase.color}`}>{phase.label}</span>
              </div>
            );
          })}
        </div>
        <div className="h-4" /> {/* spacer for absolute labels */}
      </div>

      {/* Onboarding breakdown (weeks 1-4) */}
      <div className="mb-4">
        <p className="text-[10px] text-slate-500 font-bold mb-2">ONBOARDING (4 WEEKS)</p>
        <div className="grid grid-cols-4 gap-2">
          {TRAINING_TOPICS.map((topic, i) => {
            const weekGoals = goals.filter((g) => g.weekStart === addDays(roadmapStart, i * 7));
            const done = weekGoals.filter((g) => g.status === 'completed').length;
            const total = weekGoals.length;
            const isActive = i === currentWeekIdx;
            const isPast = i < currentWeekIdx;
            const isDone = isPast || (isActive && total > 0 && done === total);
            const phaseColor = i <= 1 ? 'violet' : 'blue';
            return (
              <div
                key={topic}
                className={`rounded-lg p-2.5 border text-center ${
                  isActive
                    ? `border-${phaseColor}-500/30 bg-${phaseColor}-500/10`
                    : isDone
                    ? 'border-emerald-500/20 bg-emerald-500/5'
                    : isPast
                    ? 'border-white/5 bg-white/[0.02] opacity-60'
                    : 'border-white/5 bg-white/[0.02]'
                }`}
              >
                <p className={`text-[10px] font-bold mb-0.5 ${isActive ? `text-${phaseColor}-400` : isDone ? 'text-emerald-400' : 'text-slate-400'}`}>
                  Wk {i + 1}
                </p>
                <p className={`text-[9px] ${isActive ? `text-${phaseColor}-300` : 'text-slate-500'}`}>{topic}</p>
                {total > 0 && (
                  <p className="text-[9px] text-slate-600 mt-1">{done}/{total}</p>
                )}
                {isDone && currentWeekIdx > i && <p className="text-[9px] text-emerald-500 mt-0.5">Done</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly TPV targets — editable */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-slate-500 font-bold">MONTHLY TPV TARGETS</p>
          {isCeo && !editingTPV && (
            <button onClick={() => { setTpvDraft(tpvTargets.map((t) => String(t.target))); setEditingTPV(true); }} className="text-[10px] text-emerald-400 font-bold hover:underline">
              Edit
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {tpvMarkers.map((t, idx) => {
            const isReached = currentWeekIdx > t.weekIdx;
            const isCurrent = currentWeekIdx >= t.weekIdx - 3 && currentWeekIdx <= t.weekIdx;
            const monthWeeks = Array.from({ length: 4 }, (_, i) => addDays(roadmapStart, (t.weekIdx - 3 + i) * 7));
            const tpvGoals = goals.filter(
              (g) => monthWeeks.includes(g.weekStart) && g.targetMetric?.toLowerCase().includes('tpv'),
            );
            const actualTPV = tpvGoals.length > 0
              ? tpvGoals.reduce((sum, g) => sum + (g.actualValue ?? 0), 0)
              : null;

            return (
              <div
                key={t.month}
                className={`rounded-xl p-3 border text-center ${
                  isCurrent
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : isReached
                    ? 'border-white/5 bg-white/[0.02]'
                    : 'border-white/5 bg-white/[0.02] opacity-50'
                }`}
              >
                <p className="text-[10px] text-slate-500 font-bold">{t.label}</p>
                {editingTPV ? (
                  <div className="mt-1 flex items-center justify-center gap-1">
                    <span className="text-xs text-slate-400">€</span>
                    <input
                      value={tpvDraft[idx]}
                      onChange={(e) => { const next = [...tpvDraft]; next[idx] = e.target.value; setTpvDraft(next); }}
                      type="number"
                      className="w-16 px-1.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-xs text-center focus:outline-none focus:border-emerald-500/30"
                    />
                  </div>
                ) : (
                  <p className={`text-sm font-black mt-0.5 ${isCurrent ? 'text-emerald-400' : isReached ? 'text-white' : 'text-slate-500'}`}>
                    {formatTPV(t.target)}
                  </p>
                )}
                {!editingTPV && actualTPV !== null && actualTPV > 0 && (
                  <p className="text-[9px] text-emerald-400/70 mt-0.5">Actual: {formatTPV(actualTPV)}</p>
                )}
                {!editingTPV && isCurrent && (
                  <div className="mt-1.5 h-0.5 rounded-full bg-emerald-500/20">
                    <div className="h-full rounded-full bg-emerald-500/60" style={{ width: `${Math.min(100, ((currentWeekIdx - (t.weekIdx - 3)) / 4) * 100)}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {editingTPV && (
          <div className="flex gap-2 mt-2">
            <button onClick={saveTPV} className="text-[10px] font-bold text-emerald-400 hover:underline">Save</button>
            <button onClick={() => setEditingTPV(false)} className="text-[10px] font-bold text-slate-500 hover:underline">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Manager Detail (View B) ---

function WeekSection({
  weekIdx,
  weekStart,
  goals,
  checkIn,
  isCurrentWeek,
  canEdit,
  onToggleGoal,
  onSaveNotes,
}: {
  weekIdx: number;
  weekStart: string;
  goals: WeeklyGoal[];
  checkIn: WeeklyCheckIn | undefined;
  isCurrentWeek: boolean;
  canEdit: boolean;
  onToggleGoal: (goalId: string) => void;
  onSaveNotes: (notes: string) => void;
}) {
  const [expanded, setExpanded] = useState(isCurrentWeek);
  const [notes, setNotes] = useState(checkIn?.ceoNotes ?? '');
  const [saved, setSaved] = useState(false);
  const predefined = WEEKLY_GOALS[weekIdx] ?? WEEKLY_GOALS[9] ?? [];
  const done = goals.filter((g) => g.status === 'completed').length;
  const weekEnd = addDays(weekStart, 6);
  const phase = ONBOARDING_PHASES.find((p) => weekIdx >= p.weekStart && weekIdx <= p.weekEnd);

  return (
    <div className={`rounded-xl border ${isCurrentWeek ? 'border-emerald-500/20 bg-emerald-500/[0.02]' : 'border-white/5 bg-white/[0.01]'} mb-2`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
          <span className="text-[10px] text-slate-500 font-bold">Wk {weekIdx + 1}</span>
          <span className="text-xs font-bold text-white">
            {formatDate(weekStart)} – {formatDate(weekEnd)}
          </span>
          {isCurrentWeek && (
            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">NOW</span>
          )}
          {phase && (
            <span className={`text-[9px] ${phase.color} opacity-60`}>{phase.label}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold ${done === predefined.length && predefined.length > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
            {done}/{predefined.length}
          </span>
          {predefined.length > 0 && (
            <div className="w-12 h-1 rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-emerald-500/60 transition-all"
                style={{ width: `${(done / predefined.length) * 100}%` }}
              />
            </div>
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {/* Predefined goals as checkboxes */}
          <div className="space-y-1.5 mb-3">
            {predefined.map((title, i) => {
              const goal = goals.find((g) => g.title === title);
              const isDone = goal?.status === 'completed';
              return (
                <label
                  key={i}
                  className={`flex items-center gap-3 py-1 ${canEdit ? 'cursor-pointer' : ''}`}
                  onClick={canEdit && goal ? () => onToggleGoal(goal.id) : undefined}
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                    isDone
                      ? 'bg-emerald-500/20 border-emerald-500/40'
                      : 'bg-white/5 border-white/10'
                  }`}>
                    {isDone && <Check size={12} className="text-emerald-400" />}
                  </div>
                  <span className={`text-xs ${isDone ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                    {title}
                  </span>
                </label>
              );
            })}
          </div>

          {/* Notes */}
          <div className="pt-2 border-t border-white/5">
            <textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
              placeholder="Notes..."
              rows={2}
              className="w-full text-xs bg-white/5 rounded-lg px-3 py-2 text-slate-300 placeholder:text-slate-600 border border-white/5 focus:outline-none focus:border-emerald-500/30 resize-none"
            />
            <div className="flex items-center gap-3 mt-1.5">
              <button
                onClick={() => { onSaveNotes(notes); setSaved(true); setTimeout(() => setSaved(false), 2000); }}
                className="text-[10px] font-bold text-emerald-400 hover:underline"
              >
                Save
              </button>
              {saved && (
                <span className="text-[10px] text-emerald-400/70 flex items-center gap-1">
                  <Check size={10} /> Saved
                </span>
              )}
              {checkIn && !saved && (
                <span className="text-[10px] text-slate-600">Saved {new Date(checkIn.createdAt).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ManagerDetail({
  managerId,
  state,
  role,
  onBack,
  onMutate,
}: {
  managerId: ManagerId;
  state: RoadmapState;
  role: RoadmapRole;
  onBack: () => void;
  onMutate: (action: import('@/lib/roadmap-types').RoadmapAction) => void;
}) {
  const manager = MANAGERS.find((m) => m.id === managerId)!;
  const roadmap = state.roadmaps.find((r) => r.managerId === managerId && r.status === 'active');
  const isCeo = role === 'ceo';
  const canEdit = isCeo || role === managerId;
  const [showNewRoadmap, setShowNewRoadmap] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStart, setNewStart] = useState(toISO(new Date()));
  const [newDuration, setNewDuration] = useState(90);

  const milestones = roadmap ? state.milestones.filter((m) => m.roadmapId === roadmap.id).sort((a, b) => a.order - b.order) : [];
  const goals = roadmap ? state.goals.filter((g) => g.roadmapId === roadmap.id) : [];
  const checkIns = roadmap ? state.checkIns.filter((c) => c.roadmapId === roadmap.id) : [];
  const weeks = roadmap ? getWeeksBetween(roadmap.startDate, roadmap.endDate) : [];
  const currentWeek = getCurrentWeekStart();

  const createRoadmap = async () => {
    if (!newTitle.trim()) return;
    const id = crypto.randomUUID();
    const startDate = newStart;
    const roadmapStart = getMonday(startDate);

    // Create roadmap first
    await onMutate({
      type: 'upsert_roadmap',
      roadmap: {
        id,
        managerId,
        title: newTitle,
        startDate,
        endDate: addDays(startDate, newDuration),
        status: 'active',
        createdAt: new Date().toISOString(),
      },
    });

    // Auto-create predefined goals for all weeks
    for (let weekIdx = 0; weekIdx < 13; weekIdx++) {
      const weekGoals = WEEKLY_GOALS[weekIdx] ?? WEEKLY_GOALS[9] ?? [];
      const weekStart = addDays(roadmapStart, weekIdx * 7);
      for (const title of weekGoals) {
        await onMutate({
          type: 'upsert_goal',
          goal: {
            id: crypto.randomUUID(),
            roadmapId: id,
            milestoneId: '',
            title,
            weekStart,
            status: 'planned',
          },
        });
      }
    }

    setShowNewRoadmap(false);
    setNewTitle('');
  };

  const toggleGoalDone = (goalId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;
    const next = goal.status === 'completed' ? 'planned' : 'completed';
    onMutate({ type: 'upsert_goal', goal: { ...goal, status: next as GoalStatus } });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
          <ChevronLeft size={16} className="text-slate-400" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-black text-white">{manager.name}</h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{manager.region}</p>
        </div>
        {roadmap && isCeo && (
          <button
            onClick={() => onMutate({ type: 'delete_roadmap', id: roadmap.id })}
            className="text-[10px] text-rose-400/60 hover:text-rose-400 font-bold"
          >
            Delete Roadmap
          </button>
        )}
      </div>

      {!roadmap ? (
        // Create roadmap
        <div className="glass-card rounded-2xl p-6">
          {showNewRoadmap ? (
            <div className="space-y-3">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Roadmap title (e.g. Q1 2026 Pipeline Build)"
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/30"
              />
              <div className="flex gap-3">
                <input
                  type="date"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500/30"
                />
                <select
                  value={newDuration}
                  onChange={(e) => setNewDuration(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500/30"
                >
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={createRoadmap} className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/30 transition-colors">
                  Create
                </button>
                <button onClick={() => setShowNewRoadmap(false)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs font-bold hover:bg-white/10 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => canEdit && setShowNewRoadmap(true)}
              className="w-full py-8 text-center"
              disabled={!canEdit}
            >
              <Plus size={20} className="text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-bold">
                {canEdit ? 'Create Roadmap' : 'No roadmap — CEO must create one'}
              </p>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Roadmap info */}
          <div className="glass-card rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">{roadmap.title}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {formatDate(roadmap.startDate)} – {formatDate(roadmap.endDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Onboarding Timeline */}
          <OnboardingTimeline
            roadmap={roadmap}
            milestones={milestones}
            goals={goals}
            isCeo={isCeo}
            onUpdateTPV={(targets) => onMutate({ type: 'upsert_roadmap', roadmap: { ...roadmap, tpvTargets: targets } })}
          />

          {/* Milestones */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Milestones</h3>
              {isCeo && <MilestoneAdder roadmapId={roadmap.id} nextOrder={milestones.length} onMutate={onMutate} />}
            </div>
            {milestones.length === 0 ? (
              <p className="text-[10px] text-slate-600 py-2">No milestones yet</p>
            ) : (
              <div className="space-y-1">
                {milestones.map((ms) => (
                  <MilestoneRow key={ms.id} milestone={ms} isCeo={isCeo} onMutate={onMutate} />
                ))}
              </div>
            )}
          </div>

          {/* Weekly Goals */}
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Weekly Check-ins</h3>
          {weeks.map((w, i) => (
            <WeekSection
              key={w}
              weekIdx={i}
              weekStart={w}
              goals={goals.filter((g) => g.weekStart === w)}
              checkIn={checkIns.find((c) => c.weekStart === w)}
              isCurrentWeek={w === currentWeek}
              canEdit={canEdit}
              onToggleGoal={toggleGoalDone}
              onSaveNotes={(ceoNotes) => {
                const weekGoals = goals.filter((g) => g.weekStart === w);
                const done = weekGoals.filter((g) => g.status === 'completed').length;
                onMutate({
                  type: 'upsert_checkin',
                  checkIn: {
                    id: checkIns.find((c) => c.weekStart === w)?.id ?? crypto.randomUUID(),
                    roadmapId: roadmap.id,
                    managerId,
                    weekStart: w,
                    completionRate: weekGoals.length > 0 ? Math.round((done / weekGoals.length) * 100) : 0,
                    ceoNotes,
                    blockers: '',
                    createdAt: new Date().toISOString(),
                  },
                });
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}

// --- Milestone Row ---

function MilestoneRow({
  milestone,
  isCeo,
  onMutate,
}: {
  milestone: Milestone;
  isCeo: boolean;
  onMutate: (action: import('@/lib/roadmap-types').RoadmapAction) => void;
}) {
  const isOverdue = milestone.targetDate < toISO(new Date()) && milestone.status !== 'completed';
  const statusStyles: Record<MilestoneStatus, string> = {
    pending: 'text-slate-500',
    in_progress: 'text-blue-400',
    completed: 'text-emerald-400',
    overdue: 'text-rose-400',
  };

  const cycleStatus = () => {
    if (!isCeo) return;
    const order: MilestoneStatus[] = ['pending', 'in_progress', 'completed'];
    const idx = order.indexOf(milestone.status);
    const next = order[(idx + 1) % order.length];
    onMutate({ type: 'upsert_milestone', milestone: { ...milestone, status: next } });
  };

  return (
    <div className="flex items-center gap-3 py-1.5 px-3 rounded-lg bg-white/[0.02] group">
      <button onClick={cycleStatus} className={`shrink-0 ${statusStyles[isOverdue ? 'overdue' : milestone.status]}`}>
        {milestone.status === 'completed' ? <Check size={14} /> : isOverdue ? <AlertCircle size={14} /> : <Target size={14} />}
      </button>
      <span className={`text-xs flex-1 ${milestone.status === 'completed' ? 'text-slate-500 line-through' : 'text-white'}`}>
        {milestone.title}
      </span>
      <span className={`text-[10px] ${isOverdue ? 'text-rose-400' : 'text-slate-500'}`}>
        {formatDate(milestone.targetDate)}
      </span>
      {isCeo && (
        <button
          onClick={() => onMutate({ type: 'delete_milestone', id: milestone.id })}
          className="opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={12} className="text-slate-600 hover:text-rose-400" />
        </button>
      )}
    </div>
  );
}

// --- Milestone Adder (inline) ---

function MilestoneAdder({
  roadmapId,
  nextOrder,
  onMutate,
}: {
  roadmapId: string;
  nextOrder: number;
  onMutate: (action: import('@/lib/roadmap-types').RoadmapAction) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(toISO(new Date()));

  const add = () => {
    if (!title.trim()) return;
    onMutate({
      type: 'upsert_milestone',
      milestone: {
        id: crypto.randomUUID(),
        roadmapId,
        title,
        targetDate: date,
        status: 'pending',
        order: nextOrder,
      },
    });
    setTitle('');
    setOpen(false);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-[10px] text-emerald-400 font-bold hover:underline">
        + Add
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Milestone title"
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && add()}
        className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-[10px] focus:outline-none focus:border-emerald-500/30 w-40"
      />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-[10px] focus:outline-none focus:border-emerald-500/30"
      />
      <button onClick={add} className="text-emerald-400"><Check size={12} /></button>
      <button onClick={() => setOpen(false)} className="text-slate-500"><X size={12} /></button>
    </div>
  );
}

// --- Week Planner Modal (View C) ---

// --- Template Manager (View D) ---

function TemplateManager({
  state,
  onMutate,
  onBack,
}: {
  state: RoadmapState;
  onMutate: (action: import('@/lib/roadmap-types').RoadmapAction) => void;
  onBack: () => void;
}) {
  const [applyTarget, setApplyTarget] = useState<{ templateId: string; managerId: ManagerId; startDate: string; title: string } | null>(null);
  const [createFrom, setCreateFrom] = useState<string | null>(null);
  const [templateTitle, setTemplateTitle] = useState('');

  const createTemplateFromRoadmap = (roadmapId: string) => {
    const roadmap = state.roadmaps.find((r) => r.id === roadmapId);
    if (!roadmap || !templateTitle.trim()) return;

    const ms = state.milestones.filter((m) => m.roadmapId === roadmapId).sort((a, b) => a.order - b.order);
    const gs = state.goals.filter((g) => g.roadmapId === roadmapId);
    const startDate = new Date(roadmap.startDate);
    const durationDays = Math.round((new Date(roadmap.endDate).getTime() - startDate.getTime()) / 86400000);

    onMutate({
      type: 'upsert_template',
      template: {
        id: crypto.randomUUID(),
        title: templateTitle,
        durationDays,
        milestones: ms.map((m) => ({
          title: m.title,
          dayOffset: Math.round((new Date(m.targetDate).getTime() - startDate.getTime()) / 86400000),
          order: m.order,
        })),
        goals: gs.map((g) => {
          const msIdx = ms.findIndex((m) => m.id === g.milestoneId);
          const weekDate = new Date(g.weekStart);
          return {
            title: g.title,
            weekOffset: Math.round((weekDate.getTime() - startDate.getTime()) / 604800000),
            milestoneIndex: msIdx >= 0 ? msIdx : 0,
            ...(g.targetMetric ? { targetMetric: g.targetMetric } : {}),
            ...(g.targetValue !== undefined ? { targetValue: g.targetValue } : {}),
          };
        }),
        createdAt: new Date().toISOString(),
      },
    });
    setCreateFrom(null);
    setTemplateTitle('');
  };

  const applyTemplate = () => {
    if (!applyTarget) return;
    onMutate({
      type: 'apply_template',
      templateId: applyTarget.templateId,
      managerId: applyTarget.managerId,
      startDate: applyTarget.startDate,
      title: applyTarget.title,
    });
    setApplyTarget(null);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
          <ChevronLeft size={16} className="text-slate-400" />
        </button>
        <h2 className="text-lg font-black text-white">Templates</h2>
      </div>

      {/* Create from roadmap */}
      <div className="mb-6">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Create Template from Roadmap</p>
        {state.roadmaps.length === 0 ? (
          <p className="text-[10px] text-slate-600">No roadmaps to create templates from</p>
        ) : (
          <div className="space-y-2">
            {state.roadmaps.map((r) => {
              const mgr = MANAGERS.find((m) => m.id === r.managerId);
              return (
                <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5">
                  <span className="text-xs text-slate-300">
                    {mgr?.name} — {r.title}
                  </span>
                  {createFrom === r.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={templateTitle}
                        onChange={(e) => setTemplateTitle(e.target.value)}
                        placeholder="Template name"
                        autoFocus
                        className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-[10px] focus:outline-none focus:border-emerald-500/30 w-40"
                      />
                      <button onClick={() => createTemplateFromRoadmap(r.id)} className="text-emerald-400"><Check size={12} /></button>
                      <button onClick={() => setCreateFrom(null)} className="text-slate-500"><X size={12} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setCreateFrom(r.id)} className="text-[10px] text-emerald-400 font-bold hover:underline flex items-center gap-1">
                      <Copy size={10} /> Create Template
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Existing templates */}
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Templates</p>
      {state.templates.length === 0 ? (
        <p className="text-[10px] text-slate-600">No templates yet</p>
      ) : (
        <div className="space-y-3">
          {state.templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onApply={() => setApplyTarget({ templateId: t.id, managerId: 'mart', startDate: toISO(new Date()), title: t.title })}
              onDelete={() => onMutate({ type: 'delete_template', id: t.id })}
            />
          ))}
        </div>
      )}

      {/* Apply template modal */}
      {applyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setApplyTarget(null)} />
          <div className="relative glass-card rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-sm font-bold text-white mb-4">Apply Template</h3>
            <div className="space-y-3 mb-4">
              <input
                value={applyTarget.title}
                onChange={(e) => setApplyTarget({ ...applyTarget, title: e.target.value })}
                placeholder="Roadmap title"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500/30"
              />
              <select
                value={applyTarget.managerId}
                onChange={(e) => setApplyTarget({ ...applyTarget, managerId: e.target.value as ManagerId })}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500/30"
              >
                {MANAGERS.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.region})</option>
                ))}
              </select>
              <input
                type="date"
                value={applyTarget.startDate}
                onChange={(e) => setApplyTarget({ ...applyTarget, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500/30"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={applyTemplate} className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/30">
                Apply
              </button>
              <button onClick={() => setApplyTarget(null)} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs font-bold hover:bg-white/10">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  template,
  onApply,
  onDelete,
}: {
  template: RoadmapTemplate;
  onApply: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2">
          {expanded ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-500" />}
          <span className="text-xs font-bold text-white">{template.title}</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">{template.durationDays}d</span>
          <button onClick={onApply} className="text-[10px] text-emerald-400 font-bold hover:underline flex items-center gap-1">
            <Play size={10} /> Apply
          </button>
          <button onClick={onDelete}>
            <Trash2 size={12} className="text-slate-600 hover:text-rose-400" />
          </button>
        </div>
      </div>
      <p className="text-[10px] text-slate-500 ml-5">
        {template.milestones.length} milestones, {template.goals.length} goals
      </p>

      {expanded && (
        <div className="mt-3 ml-5 space-y-2">
          {template.milestones.map((ms, i) => (
            <div key={i}>
              <p className="text-[10px] text-slate-400 font-bold">
                <Target size={10} className="inline mr-1" />
                {ms.title} (day {ms.dayOffset})
              </p>
              <div className="ml-4">
                {template.goals
                  .filter((g) => g.milestoneIndex === i)
                  .map((g, j) => (
                    <p key={j} className="text-[10px] text-slate-500 py-0.5">
                      • {g.title} (week {g.weekOffset})
                    </p>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Main Component ---

type View = { type: 'overview' } | { type: 'manager'; id: ManagerId } | { type: 'templates' };

export default function SalesRoadmap() {
  const { role, setRole } = useRoadmapRole();
  const { state, loading, mutate } = useRoadmap();
  const { data: cascadeData } = useCascade();
  const [view, setView] = useState<View>({ type: 'overview' });

  const cascadeDeals = useMemo(() => {
    if (!cascadeData?.pipeline?.deals) return [];
    return cascadeData.pipeline.deals.map((d) => ({
      company: d.company,
      owner: d.owner,
      daysInStage: d.daysInStage,
      tpv: d.tpv,
    }));
  }, [cascadeData]);

  const handleMutate = useCallback(
    (action: import('@/lib/roadmap-types').RoadmapAction) => {
      mutate(action);
    },
    [mutate],
  );

  if (!role) return <RolePicker onSelect={setRole} />;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Top bar with role & templates */}
      <div className="flex items-center justify-end gap-3 px-6 pt-4">
        <button
          onClick={() => setView(view.type === 'templates' ? { type: 'overview' } : { type: 'templates' })}
          className="text-[10px] text-slate-500 hover:text-slate-300 font-bold flex items-center gap-1"
        >
          <FileText size={10} />
          Templates
        </button>
        <span className="text-[10px] text-slate-600">|</span>
        <span className="text-[10px] text-slate-500 font-bold">
          {role === 'ceo' ? 'CEO' : MANAGERS.find((m) => m.id === role)?.name}
        </span>
      </div>

      {view.type === 'overview' && (
        <TeamOverview
          state={state}
          cascadeDeals={cascadeDeals}
          onSelectManager={(id) => setView({ type: 'manager', id })}
          role={role}
        />
      )}
      {view.type === 'manager' && (
        <ManagerDetail
          managerId={view.id}
          state={state}
          role={role}
          onBack={() => setView({ type: 'overview' })}
          onMutate={handleMutate}
        />
      )}
      {view.type === 'templates' && (
        <TemplateManager
          state={state}
          onMutate={handleMutate}
          onBack={() => setView({ type: 'overview' })}
        />
      )}
    </div>
  );
}
