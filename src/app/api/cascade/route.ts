import { NextResponse } from 'next/server';
import { getSnapshot } from '@/lib/kv';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snapshot = await getSnapshot();
    if (!snapshot) {
      return NextResponse.json({ error: 'No data available' }, { status: 404 });
    }

    return NextResponse.json({
      cascade: snapshot.cascade,
      pipeline: snapshot.pipeline,
      monthlyActivation: snapshot.monthlyActivation,
      timestamp: snapshot.timestamp,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to read data' },
      { status: 500 },
    );
  }
}
