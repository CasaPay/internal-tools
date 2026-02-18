import Redis from 'ioredis';

const SNAPSHOT_KEY = 'prospector:snapshot';
const SNAPSHOT_TTL = 3600; // 1 hour safety net

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  redis = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
  return redis;
}

export interface ProspectorSnapshot {
  timestamp: string;
  cascade: {
    gem: Array<{
      id: 'growth' | 'engagement' | 'monetization';
      name: string;
      priority: number;
      metric: string;
      current: string;
      target: string;
      progressPct: number;
      color: string;
      leading?: { name: string; current: number; target: number; unit: string };
      lagging?: { name: string; current: number; target: number; unit: string };
      team?: Array<{
        name: string;
        role: string;
        leading: number;
        leadingTarget: number;
        lagging: number;
        laggingTarget: number;
      }>;
      goals: Array<{
        id: string;
        title: string;
        metric: string;
        current: number;
        target: number;
        unit: string;
        progressPct: number;
        initiatives: Array<{
          id: string;
          title: string;
          owner: string;
          status: string;
          metric: string;
          currentValue: string;
          taskNumbers: number[];
        }>;
      }>;
    }>;
  } | null;
  pipeline: {
    stages: { name: string; count: number; tpv: number }[];
    deals: Array<{
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
    }>;
  } | null;
  monthlyActivation: Record<string, Array<{
    company: string;
    requests: number;
    amount: number;
    currency: string;
    uniqueTenants: number;
  }>> | null;
}

export async function getSnapshot(): Promise<ProspectorSnapshot | null> {
  const client = getRedis();
  if (!client) return null;
  const data = await client.get(SNAPSHOT_KEY);
  if (!data) return null;
  return JSON.parse(data);
}

export async function setSnapshot(data: string): Promise<void> {
  const client = getRedis();
  if (!client) throw new Error('Redis not configured');
  await client.set(SNAPSHOT_KEY, data, 'EX', SNAPSHOT_TTL);
}
