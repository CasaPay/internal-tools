'use client';

import { useEffect, useState, useCallback } from 'react';
import type { RoadmapState, RoadmapAction, RoadmapRole } from './roadmap-types';
import { EMPTY_STATE } from './roadmap-types';

const ROLE_KEY = 'cp-roadmap-user';

export function useRoadmapRole() {
  const [role, setRoleState] = useState<RoadmapRole | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(ROLE_KEY);
    if (stored) setRoleState(stored as RoadmapRole);
  }, []);

  const setRole = useCallback((r: RoadmapRole) => {
    localStorage.setItem(ROLE_KEY, r);
    setRoleState(r);
  }, []);

  const clearRole = useCallback(() => {
    localStorage.removeItem(ROLE_KEY);
    setRoleState(null);
  }, []);

  return { role, setRole, clearRole };
}

export function useRoadmap() {
  const [state, setState] = useState<RoadmapState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    fetch('/api/roadmap')
      .then((r) => {
        if (!r.ok) throw new Error('Failed');
        return r.json();
      })
      .then((d: RoadmapState) => {
        setState(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const mutate = useCallback(async (action: RoadmapAction) => {
    const res = await fetch('/api/roadmap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    });
    if (!res.ok) throw new Error('Mutation failed');
    const next: RoadmapState = await res.json();
    setState(next);
    return next;
  }, []);

  return { state, loading, mutate, refresh };
}
