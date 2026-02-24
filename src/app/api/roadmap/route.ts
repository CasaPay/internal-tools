import { NextResponse } from 'next/server';
import { getRoadmapState, setRoadmapState } from '@/lib/kv';
import {
  EMPTY_STATE,
  type RoadmapState,
  type RoadmapAction,
  type Roadmap,
  type Milestone,
  type WeeklyGoal,
  type ManagerId,
} from '@/lib/roadmap-types';

function upsert<T extends { id: string }>(arr: T[], item: T): T[] {
  const idx = arr.findIndex((x) => x.id === item.id);
  if (idx >= 0) {
    const next = [...arr];
    next[idx] = item;
    return next;
  }
  return [...arr, item];
}

function remove<T extends { id: string }>(arr: T[], id: string): T[] {
  return arr.filter((x) => x.id !== id);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function getMonday(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function applyAction(state: RoadmapState, action: RoadmapAction): RoadmapState {
  switch (action.type) {
    case 'upsert_roadmap':
      return { ...state, roadmaps: upsert(state.roadmaps, action.roadmap) };

    case 'delete_roadmap': {
      const id = action.id;
      return {
        ...state,
        roadmaps: remove(state.roadmaps, id),
        milestones: state.milestones.filter((m) => m.roadmapId !== id),
        goals: state.goals.filter((g) => g.roadmapId !== id),
        checkIns: state.checkIns.filter((c) => c.roadmapId !== id),
      };
    }

    case 'upsert_milestone':
      return { ...state, milestones: upsert(state.milestones, action.milestone) };

    case 'delete_milestone': {
      const id = action.id;
      return {
        ...state,
        milestones: remove(state.milestones, id),
        goals: state.goals.filter((g) => g.milestoneId !== id),
      };
    }

    case 'upsert_goal':
      return { ...state, goals: upsert(state.goals, action.goal) };

    case 'delete_goal':
      return { ...state, goals: remove(state.goals, action.id) };

    case 'batch_update_goals':
      return {
        ...state,
        goals: state.goals.map((g) => {
          const upd = action.updates.find((u) => u.id === g.id);
          if (!upd) return g;
          return { ...g, status: upd.status, ...(upd.actualValue !== undefined ? { actualValue: upd.actualValue } : {}) };
        }),
      };

    case 'upsert_checkin':
      return { ...state, checkIns: upsert(state.checkIns, action.checkIn) };

    case 'upsert_template':
      return {
        ...state,
        templates: state.templates.some((t) => t.id === action.template.id)
          ? state.templates.map((t) => (t.id === action.template.id ? action.template : t))
          : [...state.templates, action.template],
      };

    case 'delete_template':
      return { ...state, templates: state.templates.filter((t) => t.id !== action.id) };

    case 'apply_template': {
      const template = state.templates.find((t) => t.id === action.templateId);
      if (!template) return state;

      const roadmapId = crypto.randomUUID();
      const endDate = addDays(action.startDate, template.durationDays);

      const roadmap: Roadmap = {
        id: roadmapId,
        managerId: action.managerId as ManagerId,
        title: action.title,
        startDate: action.startDate,
        endDate,
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      const milestones: Milestone[] = template.milestones.map((tm) => ({
        id: crypto.randomUUID(),
        roadmapId,
        title: tm.title,
        targetDate: addDays(action.startDate, tm.dayOffset),
        status: 'pending' as const,
        order: tm.order,
      }));

      const goals: WeeklyGoal[] = template.goals.map((tg) => {
        const milestone = milestones[tg.milestoneIndex] || milestones[0];
        return {
          id: crypto.randomUUID(),
          roadmapId,
          milestoneId: milestone.id,
          title: tg.title,
          weekStart: getMonday(addDays(action.startDate, tg.weekOffset * 7)),
          status: 'planned' as const,
          ...(tg.targetMetric ? { targetMetric: tg.targetMetric } : {}),
          ...(tg.targetValue !== undefined ? { targetValue: tg.targetValue } : {}),
        };
      });

      return {
        ...state,
        roadmaps: [...state.roadmaps, roadmap],
        milestones: [...state.milestones, ...milestones],
        goals: [...state.goals, ...goals],
      };
    }

    default:
      return state;
  }
}

// In-memory fallback when Redis is unavailable (local dev)
let memoryState: RoadmapState | null = null;

async function loadState(): Promise<RoadmapState> {
  const fromRedis = await getRoadmapState();
  if (fromRedis) return fromRedis;
  return memoryState ?? EMPTY_STATE;
}

async function saveState(state: RoadmapState): Promise<void> {
  memoryState = state;
  try {
    await setRoadmapState(state);
  } catch {
    // Redis unavailable — data persists in memory only
  }
}

export async function GET() {
  const state = await loadState();
  return NextResponse.json(state);
}

export async function POST(req: Request) {
  const action: RoadmapAction = await req.json();
  const current = await loadState();
  const next = applyAction(current, action);
  await saveState(next);
  return NextResponse.json(next);
}
