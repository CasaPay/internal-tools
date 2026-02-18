'use client';

import { useEffect, useState, useCallback } from 'react';

const POLL_INTERVAL = 30000; // 30 seconds

// --- Types ---

export interface GemMetric {
  name: string;
  current: number;
  target: number;
  unit: string;
}

export interface GemTeamMember {
  name: string;
  role: string;
  leading: number;
  leadingTarget: number;
  lagging: number;
  laggingTarget: number;
}

export interface CascadeInitiative {
  id: string;
  title: string;
  owner: string;
  status: string;
  metric: string;
  currentValue: string;
  taskNumbers: number[];
}

export interface CascadeGoal {
  id: string;
  title: string;
  metric: string;
  current: number;
  target: number;
  unit: string;
  progressPct: number;
  initiatives: CascadeInitiative[];
}

export interface GemPillar {
  id: 'growth' | 'engagement' | 'monetization';
  name: string;
  priority: number;
  metric: string;
  current: string;
  target: string;
  progressPct: number;
  color: string;
  leading?: GemMetric;
  lagging?: GemMetric;
  team?: GemTeamMember[];
  goals: CascadeGoal[];
}

export interface Deal {
  company: string;
  stage: string;
  tpv: number;
  owner: string;
  daysInStage: number;
  expectedClose: string | null;
  activeTenants?: number;
  totalTenants?: number;
  monthlyTpv?: number;
  takeRate?: number;
}

export interface MonthlyOperatorData {
  company: string;
  requests: number;
  amount: number;
  currency: string;
  uniqueTenants: number;
}

export interface MonthlyActivation {
  [period: string]: MonthlyOperatorData[];
}

export interface CascadeData {
  cascade: { gem: GemPillar[] } | null;
  pipeline: { stages: { name: string; count: number; tpv: number }[]; deals: Deal[] } | null;
  monthlyActivation: MonthlyActivation | null;
  timestamp: string;
}

// --- Hook ---

export function useCascade() {
  const [data, setData] = useState<CascadeData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    fetch('/api/cascade')
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((d) => {
        if (d.timestamp) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [refresh]);

  return { data, loading };
}
