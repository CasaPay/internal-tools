import { NextRequest, NextResponse } from 'next/server';
import { getTrainingSessions, addTrainingSession, clearTrainingSessions } from '@/lib/kv';

export async function GET() {
  try {
    const sessions = await getTrainingSessions();
    return NextResponse.json(sessions);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await request.json();
    if (!session.id || !session.date) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }
    await addTrainingSession(session);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await clearTrainingSessions();
    return NextResponse.json({ ok: true, message: 'All sessions cleared' });
  } catch {
    return NextResponse.json({ error: 'Failed to clear sessions' }, { status: 500 });
  }
}
