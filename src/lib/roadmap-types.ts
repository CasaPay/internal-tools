// Sales Roadmap — Type Definitions

export type ManagerId = 'mart' | 'gui' | 'manav' | 'alisha';
export type RoadmapRole = 'ceo' | ManagerId;

export interface SalesManager {
  id: ManagerId;
  name: string;
  region: string;
  reportsTo: string;
}

export const MANAGERS: SalesManager[] = [
  { id: 'mart', name: 'Mart', region: 'CEE', reportsTo: 'Risto' },
  { id: 'gui', name: 'Gui', region: 'EU', reportsTo: 'Risto' },
  { id: 'manav', name: 'Manav', region: 'UK', reportsTo: 'Risto' },
  { id: 'alisha', name: 'Alisha', region: 'UK', reportsTo: 'Risto' },
];

export type RoadmapStatus = 'active' | 'completed' | 'archived';
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';
export type GoalStatus = 'planned' | 'in_progress' | 'completed' | 'missed' | 'partial';
export type HealthStatus = 'on_track' | 'at_risk' | 'behind';

export interface TPVTarget {
  month: number; // 1-indexed
  label: string;
  target: number; // in euros
}

export interface Roadmap {
  id: string;
  managerId: ManagerId;
  title: string;
  startDate: string; // ISO date
  endDate: string;   // ISO date
  status: RoadmapStatus;
  tpvTargets?: TPVTarget[];
  createdAt: string;
}

export interface Milestone {
  id: string;
  roadmapId: string;
  title: string;
  targetDate: string; // ISO date
  status: MilestoneStatus;
  order: number;
}

export interface WeeklyGoal {
  id: string;
  roadmapId: string;
  milestoneId: string;
  title: string;
  weekStart: string; // ISO date (Monday)
  status: GoalStatus;
  targetMetric?: string;
  targetValue?: number;
  actualValue?: number;
}

export interface WeeklyCheckIn {
  id: string;
  roadmapId: string;
  managerId: ManagerId;
  weekStart: string; // ISO date (Monday)
  completionRate: number; // 0-100
  ceoNotes: string;
  blockers: string;
  createdAt: string;
}

export interface TemplateWeeklyGoal {
  title: string;
  weekOffset: number; // weeks from start
  milestoneIndex: number; // links to TemplateMilestone by order
  targetMetric?: string;
  targetValue?: number;
}

export interface TemplateMilestone {
  title: string;
  dayOffset: number; // days from start
  order: number;
}

export interface RoadmapTemplate {
  id: string;
  title: string;
  durationDays: number;
  milestones: TemplateMilestone[];
  goals: TemplateWeeklyGoal[];
  createdAt: string;
}

export interface RoadmapState {
  roadmaps: Roadmap[];
  milestones: Milestone[];
  goals: WeeklyGoal[];
  checkIns: WeeklyCheckIn[];
  templates: RoadmapTemplate[];
}

export const EMPTY_STATE: RoadmapState = {
  roadmaps: [],
  milestones: [],
  goals: [],
  checkIns: [],
  templates: [],
};

// --- API Action Types ---

export type RoadmapAction =
  | { type: 'upsert_roadmap'; roadmap: Roadmap }
  | { type: 'delete_roadmap'; id: string }
  | { type: 'upsert_milestone'; milestone: Milestone }
  | { type: 'delete_milestone'; id: string }
  | { type: 'upsert_goal'; goal: WeeklyGoal }
  | { type: 'delete_goal'; id: string }
  | { type: 'batch_update_goals'; updates: { id: string; status: GoalStatus; actualValue?: number }[] }
  | { type: 'upsert_checkin'; checkIn: WeeklyCheckIn }
  | { type: 'upsert_template'; template: RoadmapTemplate }
  | { type: 'delete_template'; id: string }
  | { type: 'apply_template'; templateId: string; managerId: ManagerId; startDate: string; title: string };
