import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.ELEVENLABS_API_KEY ?? '';

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agentId');
  if (!agentId) {
    return NextResponse.json({ error: 'Missing agentId' }, { status: 400 });
  }
  if (!API_KEY) {
    return NextResponse.json({ error: 'ELEVENLABS_API_KEY not set' }, { status: 500 });
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
    { headers: { 'xi-api-key': API_KEY } },
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
