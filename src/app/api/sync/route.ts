import { NextRequest, NextResponse } from 'next/server';
import { setSnapshot } from '@/lib/kv';

export async function POST(request: NextRequest) {
  const secret = process.env.SP_SYNC_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'Server not configured' },
      { status: 500 },
    );
  }

  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const snapshot = await request.json();

    if (!snapshot.timestamp || !Array.isArray(snapshot.groups)) {
      return NextResponse.json(
        { error: 'Invalid snapshot format' },
        { status: 400 },
      );
    }

    // Store the full snapshot JSON string — the cascade endpoint extracts what it needs
    await setSnapshot(JSON.stringify(snapshot));
    return NextResponse.json({ ok: true, timestamp: snapshot.timestamp });
  } catch {
    return NextResponse.json(
      { error: 'Failed to process snapshot' },
      { status: 500 },
    );
  }
}
