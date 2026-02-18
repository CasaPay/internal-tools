"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { Conversation } from '@11labs/client';
import { Phone, PhoneOff, Play, ChevronRight, RotateCcw, User, MessageSquare, History, Loader2, MicOff, Mic } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

type PersonaId = 'pbsa' | 'hmo' | 'btr' | 'coliving';
type StageId = 'cold-intro' | 'discovery' | 'demo-pitch' | 'objection-handling' | 'offer-close';
type View = 'setup' | 'call' | 'scorecard' | 'history';

interface Persona {
  id: PersonaId;
  name: string;
  characterName: string;
  segment: string;
  description: string;
  color: string;
  agentId: string;
}

interface Stage {
  id: StageId;
  name: string;
  duration: string;
  description: string;
}

interface ScoreEntry {
  label: string;
  score: number;
  maxScore: number;
  detail: string;
}

interface TranscriptLine {
  role: 'user' | 'ai';
  message: string;
}

interface Session {
  id: string;
  conversationId: string;
  persona: PersonaId;
  stage: StageId;
  date: string;
  duration: number;
  scores: ScoreEntry[];
  overallScore: number;
  transcript: TranscriptLine[];
}

// ── Data ───────────────────────────────────────────────────────────────────

const PERSONAS: Persona[] = [
  {
    id: 'pbsa',
    name: 'The Skeptical PBSA Manager',
    characterName: 'James',
    segment: 'PBSA',
    description: '500+ beds, cautious, needs proof. Raises "early-stage product" and "will students adopt it?" objections.',
    color: 'emerald',
    agentId: 'agent_6301khqyrhrkehmbj665e1sd69vb',
  },
  {
    id: 'hmo',
    name: 'The Overwhelmed HMO Operator',
    characterName: 'Dave',
    segment: 'HMO',
    description: 'Drowning in admin, time-poor. Raises "need full PMS integration" and "no time for onboarding" objections.',
    color: 'blue',
    agentId: 'agent_5001khqys3gve87tpsarnt8d8vp3',
  },
  {
    id: 'btr',
    name: 'The Tech-Savvy BTR Director',
    characterName: 'Sarah',
    segment: 'BTR',
    description: 'Technically literate, asks about APIs, data security, GDPR, reporting. Detailed questions.',
    color: 'violet',
    agentId: 'agent_5101khqysdd2erk9tarap9d5jzfy',
  },
  {
    id: 'coliving',
    name: 'The Price-Conscious Co-Living Founder',
    characterName: 'Emma',
    segment: 'Co-Living',
    description: 'Compares everything on price. Raises "too expensive vs PayProp/GoCardless" and "we already have Stripe" objections.',
    color: 'amber',
    agentId: 'agent_6101khqysrptfwmtp272ne3g9zf0',
  },
];

// First message the AI says when "picking up the phone" — varies by stage
function getFirstMessage(persona: Persona, stage: StageId): string {
  const name = persona.characterName;
  switch (stage) {
    case 'cold-intro':
      return `Hello, ${name} speaking.`;
    case 'discovery':
      return `Hi, ${name} here. Thanks for calling — I've got about fifteen minutes, so let's get into it.`;
    case 'demo-pitch':
      return `Hi there, ${name} speaking. I believe we had this call booked in for a product walkthrough? Go ahead.`;
    case 'objection-handling':
      return `Hi, ${name} here. So look, I've had a chance to think about what we discussed last time, and I've got some questions before we go any further.`;
    case 'offer-close':
      return `Hi, ${name} speaking. Right, so I understand you're sending over a proposal. Before we go through numbers, tell me what you're thinking.`;
  }
}

const STAGES: Stage[] = [
  { id: 'cold-intro', name: 'Cold Intro', duration: '~2 min', description: 'Hook + value prop in 30 seconds, get the meeting' },
  { id: 'discovery', name: 'Discovery', duration: '~5 min', description: 'Qualifying questions using 10-question scoring framework' },
  { id: 'demo-pitch', name: 'Demo Pitch', duration: '~8 min', description: 'Explain product verbally — Chrome extension, AI gateway, tiers, guarantee' },
  { id: 'objection-handling', name: 'Objection Handling', duration: '~5 min', description: 'All 5 documented objections + product knowledge questions' },
  { id: 'offer-close', name: 'Offer & Close', duration: '~3 min', description: 'Pricing discussion, savings calculator framing, commitment ask' },
];

const STAGE_CONTEXT: Record<StageId, string> = {
  'cold-intro': 'The sales rep is making a cold introduction call. They should deliver a compelling 30-second hook and value proposition to get a meeting booked. Be initially dismissive but give them a chance if their hook is good.',
  'discovery': 'The sales rep is running a discovery call. They should ask qualifying questions about your portfolio, pain points, current systems, and decision timeline. Only volunteer information when asked directly.',
  'demo-pitch': 'The sales rep is giving a verbal product demo. They should explain the CasaPay product clearly — Chrome extension, AI invoicing gateway, pricing tiers, guarantee product. Ask clarifying questions and test their product knowledge.',
  'objection-handling': 'Raise your objections early and firmly. The sales rep needs to handle them convincingly. If they give a weak response, push back harder. If they give a strong, specific response, acknowledge it but raise another objection.',
  'offer-close': 'The sales rep is discussing pricing and trying to close. Push back on pricing, ask about discounts, compare to alternatives. Only agree to next steps if they make a compelling case with specific numbers.',
};

// ── Ring Tone (Web Audio API) ────────────────────────────────────────────────

function createRingTone(): { start: () => void; stop: () => void } {
  let ctx: AudioContext | null = null;
  let gainNode: GainNode | null = null;
  let osc1: OscillatorNode | null = null;
  let osc2: OscillatorNode | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let stopped = false;

  function ring() {
    if (!ctx || stopped) return;
    // UK-style ring: 400Hz + 450Hz dual tone, 0.4s on, 0.2s off, 0.4s on, 2s off
    gainNode!.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode!.gain.setValueAtTime(0.15, ctx.currentTime + 0.4);
    gainNode!.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.42);
    gainNode!.gain.setValueAtTime(0, ctx.currentTime + 0.6);
    gainNode!.gain.setValueAtTime(0.15, ctx.currentTime + 0.62);
    gainNode!.gain.setValueAtTime(0.15, ctx.currentTime + 1.0);
    gainNode!.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.02);
  }

  return {
    start() {
      stopped = false;
      ctx = new AudioContext();
      gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.connect(ctx.destination);

      osc1 = ctx.createOscillator();
      osc1.frequency.setValueAtTime(400, ctx.currentTime);
      osc1.connect(gainNode);
      osc1.start();

      osc2 = ctx.createOscillator();
      osc2.frequency.setValueAtTime(450, ctx.currentTime);
      osc2.connect(gainNode);
      osc2.start();

      ring();
      intervalId = setInterval(ring, 3000);
    },
    stop() {
      stopped = true;
      if (intervalId) clearInterval(intervalId);
      try { osc1?.stop(); } catch {}
      try { osc2?.stop(); } catch {}
      try { ctx?.close(); } catch {}
      ctx = null;
    },
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTranscript(lines: TranscriptLine[]): string {
  return lines.map((l) => `${l.role === 'user' ? 'Rep' : 'Prospect'}: ${l.message}`).join('\n\n');
}

// ── Sub-Components ──────────────────────────────────────────────────────────

function PersonaCard({ persona, selected, onSelect }: { persona: Persona; selected: boolean; onSelect: () => void }) {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
    violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
  };
  const c = colors[persona.color] || colors.emerald;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
        selected
          ? `${c.bg} ${c.border} ring-1 ring-${persona.color}-500/20`
          : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20'
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center`}>
          <User size={14} className={c.text} />
        </div>
        <div>
          <div className="text-xs font-bold text-white">{persona.name}</div>
          <div className={`text-[10px] font-bold uppercase tracking-widest ${c.text}`}>{persona.segment}</div>
        </div>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed">{persona.description}</p>
    </button>
  );
}

function StageCard({ stage, selected, onSelect }: { stage: Stage; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 ${
        selected
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-white">{stage.name}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{stage.description}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-600">{stage.duration}</span>
          <ChevronRight size={14} className={selected ? 'text-emerald-400' : 'text-slate-600'} />
        </div>
      </div>
    </button>
  );
}

function ScoreBar({ entry }: { entry: ScoreEntry }) {
  const pct = Math.round((entry.score / entry.maxScore) * 100);
  const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300">{entry.label}</span>
        <span className={`text-xs font-black ${textColor}`}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-slate-600">{entry.detail}</p>
    </div>
  );
}

function LiveTranscript({ lines }: { lines: TranscriptLine[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [lines]);

  if (lines.length === 0) return null;
  return (
    <div className="w-full max-w-md mt-6 p-4 rounded-xl border border-white/10 bg-white/[0.02] max-h-48 overflow-y-auto custom-scrollbar">
      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className={`text-[11px] leading-relaxed ${line.role === 'user' ? 'text-emerald-400/80' : 'text-slate-400'}`}>
            <span className="font-bold">{line.role === 'user' ? 'You' : 'Prospect'}:</span>{' '}
            {line.message}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function TrainingSimulator() {
  const [view, setView] = useState<View>('setup');
  const [selectedPersona, setSelectedPersona] = useState<PersonaId | null>(null);
  const [selectedStage, setSelectedStage] = useState<StageId | null>(null);
  const [callActive, setCallActive] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'speaking' | 'listening'>('listening');
  const [muted, setMuted] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<TranscriptLine[]>([]);
  const [sessions, setSessions] = useState<Session[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('cp-training-sessions');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const conversationRef = useRef<Conversation | null>(null);
  const conversationIdRef = useRef<string>('');
  const transcriptRef = useRef<TranscriptLine[]>([]);
  const callSecondsRef = useRef(0);
  const selectedPersonaRef = useRef<PersonaId | null>(null);
  const selectedStageRef = useRef<StageId | null>(null);
  const finishingRef = useRef(false);
  const ringToneRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  // Keep refs in sync with state
  useEffect(() => { selectedPersonaRef.current = selectedPersona; }, [selectedPersona]);
  useEffect(() => { selectedStageRef.current = selectedStage; }, [selectedStage]);

  // Persist sessions
  useEffect(() => {
    localStorage.setItem('cp-training-sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Call timer
  useEffect(() => {
    if (callActive) {
      callSecondsRef.current = 0;
      timerRef.current = setInterval(() => {
        callSecondsRef.current += 1;
        setCallSeconds(callSecondsRef.current);
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callActive]);

  const finishCall = useCallback(async () => {
    // Prevent double-finish
    if (finishingRef.current) return;
    finishingRef.current = true;

    // Ensure ring tone is stopped
    ringToneRef.current?.stop();
    ringToneRef.current = null;

    setCallActive(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const conv = conversationRef.current;
    conversationRef.current = null;

    if (conv) {
      try { await conv.endSession(); } catch { /* already ended */ }
    }

    // Fetch conversation details from ElevenLabs API for analysis
    const convId = conversationIdRef.current;
    let analysisScores: ScoreEntry[] | null = null;

    if (convId) {
      try {
        await new Promise((r) => setTimeout(r, 2000));
        const res = await fetch(`/api/elevenlabs/conversation?id=${convId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.analysis) {
            analysisScores = parseAnalysis(data.analysis);
          }
        }
      } catch { /* analysis fetch failed, use fallback */ }
    }

    // Build scorecard from transcript analysis
    const transcript = transcriptRef.current;
    const scores = analysisScores && analysisScores.length > 0
      ? analysisScores
      : scoreFromTranscript(transcript);
    const overall = scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
      : 0;

    const session: Session = {
      id: crypto.randomUUID(),
      conversationId: convId,
      persona: selectedPersonaRef.current!,
      stage: selectedStageRef.current!,
      date: new Date().toISOString(),
      duration: callSecondsRef.current,
      scores,
      overallScore: overall,
      transcript,
    };

    setSessions((prev) => [session, ...prev]);
    setView('scorecard');
    finishingRef.current = false;
  }, []);

  const startCall = useCallback(async () => {
    if (!selectedPersona || !selectedStage) return;

    const persona = PERSONAS.find((p) => p.id === selectedPersona)!;
    setView('call');
    setConnecting(true);
    setError(null);
    setCallSeconds(0);
    callSecondsRef.current = 0;
    setLiveTranscript([]);
    transcriptRef.current = [];
    finishingRef.current = false;

    try {
      // Request mic permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get signed URL from our API route
      const urlRes = await fetch(`/api/elevenlabs/signed-url?agentId=${persona.agentId}`);
      if (!urlRes.ok) {
        const errText = await urlRes.text();
        throw new Error(`Signed URL failed (${urlRes.status}): ${errText}`);
      }
      const urlData = await urlRes.json();
      const signedUrl = urlData.signed_url;
      if (!signedUrl) throw new Error(`No signed_url in response: ${JSON.stringify(urlData)}`);

      // Play ringing tone while connecting
      const ringTone = createRingTone();
      ringToneRef.current = ringTone;
      ringTone.start();

      // Start ElevenLabs conversation
      const conversation = await Conversation.startSession({
        signedUrl: signedUrl,
        overrides: {
          agent: {
            firstMessage: getFirstMessage(persona, selectedStage),
            prompt: {
              prompt: STAGE_CONTEXT[selectedStage],
            },
          },
        },
        onConnect: ({ conversationId }) => {
          // Stop ringing — AI is "picking up"
          ringToneRef.current?.stop();
          ringToneRef.current = null;
          conversationIdRef.current = conversationId;
          setConnecting(false);
          setCallActive(true);
        },
        onMessage: ({ message, source }) => {
          const line: TranscriptLine = { role: source, message };
          transcriptRef.current = [...transcriptRef.current, line];
          setLiveTranscript([...transcriptRef.current]);
        },
        onModeChange: ({ mode: m }) => {
          setMode(m);
        },
        onError: (message, context) => {
          console.error('ElevenLabs error:', message, context);
          setError(typeof message === 'string' ? message : JSON.stringify(message));
        },
        onDisconnect: (details) => {
          console.log('ElevenLabs disconnect:', details);
          if (conversationRef.current) {
            finishCall();
          }
        },
      });

      conversationRef.current = conversation;
    } catch (err: any) {
      console.error('startCall error:', err);
      ringToneRef.current?.stop();
      ringToneRef.current = null;
      setConnecting(false);
      setError(err.message || 'Failed to connect');
      setView('setup');
    }
  }, [selectedPersona, selectedStage, finishCall]);

  const endCall = useCallback(() => {
    finishCall();
  }, [finishCall]);

  const toggleMute = useCallback(() => {
    if (conversationRef.current) {
      const newMuted = !muted;
      conversationRef.current.setMicMuted(newMuted);
      setMuted(newMuted);
    }
  }, [muted]);

  const resetToSetup = () => {
    setView('setup');
    setCallActive(false);
    setCallSeconds(0);
    setError(null);
    setConnecting(false);
  };

  // ── Render: History ───────────────────────────────────────────────────────

  if (view === 'history') {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-white">Session History</h1>
            <p className="text-xs text-slate-500 mt-1">{sessions.length} practice sessions recorded</p>
          </div>
          <button
            onClick={() => setView('setup')}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-400 hover:text-white hover:border-white/20 transition-all"
          >
            New Session
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-20">
            <History size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-600">No sessions yet. Start practicing!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => {
              const persona = PERSONAS.find((p) => p.id === s.persona)!;
              const stage = STAGES.find((st) => st.id === s.stage)!;
              const scoreColor = s.overallScore >= 80 ? 'text-emerald-400' : s.overallScore >= 60 ? 'text-amber-400' : 'text-red-400';

              return (
                <div key={s.id} className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-${persona.color}-500/10 border border-${persona.color}-500/30 flex items-center justify-center`}>
                        <User size={16} className={`text-${persona.color}-400`} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{persona.name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {stage.name} &middot; {formatTime(s.duration)} &middot; {new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-black ${scoreColor}`}>{s.overallScore}%</div>
                      <div className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">Overall</div>
                    </div>
                  </div>
                  {/* Expandable transcript */}
                  {s.transcript.length > 0 && (
                    <details className="mt-3">
                      <summary className="text-[10px] text-slate-600 cursor-pointer hover:text-slate-400">
                        View transcript ({s.transcript.length} messages)
                      </summary>
                      <div className="mt-2 p-3 rounded-lg bg-white/[0.02] text-[11px] leading-relaxed font-mono max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                        {s.transcript.map((line, i) => (
                          <div key={i} className={line.role === 'user' ? 'text-emerald-400/80' : 'text-slate-500'}>
                            <span className="font-bold">{line.role === 'user' ? 'Rep' : 'Prospect'}:</span> {line.message}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Render: Scorecard ─────────────────────────────────────────────────────

  if (view === 'scorecard') {
    const lastSession = sessions[0];
    if (!lastSession) { setView('setup'); return null; }

    const persona = PERSONAS.find((p) => p.id === lastSession.persona)!;
    const stage = STAGES.find((s) => s.id === lastSession.stage)!;
    const overallColor = lastSession.overallScore >= 80 ? 'text-emerald-400' : lastSession.overallScore >= 60 ? 'text-amber-400' : 'text-red-400';

    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-${persona.color}-500/10 border border-${persona.color}-500/30`}>
            <User size={12} className={`text-${persona.color}-400`} />
            <span className={`text-[10px] font-bold uppercase tracking-widest text-${persona.color}-400`}>{persona.segment} &middot; {stage.name}</span>
          </div>
          <h1 className="text-lg font-black text-white">Session Scorecard</h1>
          <p className="text-xs text-slate-500">{formatTime(lastSession.duration)} call duration</p>
        </div>

        <div className="text-center py-6">
          <div className={`text-5xl font-black ${overallColor}`}>{lastSession.overallScore}%</div>
          <div className="text-[10px] text-slate-600 uppercase tracking-widest font-bold mt-1">Overall Score</div>
        </div>

        <div className="space-y-4 p-5 rounded-xl border border-white/10 bg-white/[0.02]">
          {lastSession.scores.map((entry) => (
            <ScoreBar key={entry.label} entry={entry} />
          ))}
        </div>

        {lastSession.transcript.length > 0 && (
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={14} className="text-slate-500" />
              <span className="text-xs font-bold text-slate-400">Transcript</span>
            </div>
            <div className="text-[11px] leading-relaxed font-mono max-h-64 overflow-y-auto custom-scrollbar space-y-1.5">
              {lastSession.transcript.map((line, i) => (
                <div key={i} className={line.role === 'user' ? 'text-emerald-400/80' : 'text-slate-500'}>
                  <span className="font-bold">{line.role === 'user' ? 'Rep' : 'Prospect'}:</span> {line.message}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={resetToSetup} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-400 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2">
            <RotateCcw size={14} /> New Session
          </button>
          <button onClick={startCall} className="flex-1 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-xs font-bold text-emerald-400 hover:bg-emerald-500/30 transition-all flex items-center justify-center gap-2">
            <Play size={14} /> Retry Same Scenario
          </button>
          <button onClick={() => setView('history')} className="py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-400 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2">
            <History size={14} />
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Call View ─────────────────────────────────────────────────────

  if (view === 'call') {
    const persona = PERSONAS.find((p) => p.id === selectedPersona)!;
    const stage = STAGES.find((s) => s.id === selectedStage)!;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 -mt-16">
        {/* Persona badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-${persona.color}-500/10 border border-${persona.color}-500/30 mb-6`}>
          <User size={12} className={`text-${persona.color}-400`} />
          <span className={`text-[10px] font-bold uppercase tracking-widest text-${persona.color}-400`}>
            {persona.name}
          </span>
        </div>

        {/* Timer */}
        <div className="text-4xl font-black text-white font-mono mb-2">
          {formatTime(callSeconds)}
        </div>
        <p className="text-xs text-slate-500 mb-8">{stage.name}</p>

        {/* Status */}
        <div className="flex items-center gap-2 mb-6">
          {connecting ? (
            <>
              <Phone size={14} className="text-amber-400 animate-bounce" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Ringing...</span>
            </>
          ) : (
            <>
              <div className={`w-2 h-2 rounded-full ${mode === 'speaking' ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {mode === 'speaking' ? 'Prospect speaking...' : 'Listening — your turn'}
              </span>
            </>
          )}
        </div>

        {error && (
          <div className="mb-6 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-[11px] text-red-400">
            {error}
          </div>
        )}

        {/* Live transcript */}
        <LiveTranscript lines={liveTranscript} />

        {/* Controls */}
        <div className="flex items-center gap-4 mt-8">
          <button
            onClick={toggleMute}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              muted
                ? 'bg-amber-500/20 border border-amber-500/40'
                : 'bg-white/5 border border-white/10 hover:bg-white/10'
            }`}
          >
            {muted ? <MicOff size={18} className="text-amber-400" /> : <Mic size={18} className="text-slate-400" />}
          </button>

          <button
            onClick={endCall}
            className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center hover:bg-red-500/30 transition-all"
          >
            <PhoneOff size={24} className="text-red-400" />
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Setup View ────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-white">Training Simulator</h1>
          <p className="text-xs text-slate-500 mt-1">Practice sales calls with AI operator personas</p>
        </div>
        {sessions.length > 0 && (
          <button
            onClick={() => setView('history')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-400 hover:text-white hover:border-white/20 transition-all"
          >
            <History size={14} />
            <span>{sessions.length} sessions</span>
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <span className="text-[10px] font-black text-emerald-400">1</span>
          </div>
          <span className="text-xs font-bold text-white">Choose Operator Persona</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PERSONAS.map((p) => (
            <PersonaCard key={p.id} persona={p} selected={selectedPersona === p.id} onSelect={() => setSelectedPersona(p.id)} />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <span className="text-[10px] font-black text-emerald-400">2</span>
          </div>
          <span className="text-xs font-bold text-white">Select Sales Stage</span>
        </div>
        <div className="space-y-2">
          {STAGES.map((s) => (
            <StageCard key={s.id} stage={s} selected={selectedStage === s.id} onSelect={() => setSelectedStage(s.id)} />
          ))}
        </div>
      </div>

      <div className="pt-2">
        <button
          onClick={startCall}
          disabled={!selectedPersona || !selectedStage}
          className={`w-full py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-3 ${
            selectedPersona && selectedStage
              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 cursor-pointer'
              : 'bg-white/5 border border-white/10 text-slate-600 cursor-not-allowed'
          }`}
        >
          <Phone size={18} />
          Start Practice Call
        </button>
        {(!selectedPersona || !selectedStage) && (
          <p className="text-[10px] text-slate-600 text-center mt-2">Select a persona and stage to begin</p>
        )}
      </div>
    </div>
  );
}

// ── Scoring Helpers ─────────────────────────────────────────────────────────

function parseAnalysis(analysis: any): ScoreEntry[] | null {
  // Parse ElevenLabs conversation analysis if available
  try {
    if (analysis.evaluation_criteria_results) {
      return Object.entries(analysis.evaluation_criteria_results).map(([key, val]: [string, any]) => ({
        label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        score: val.score ?? 50,
        maxScore: 100,
        detail: val.rationale ?? '',
      }));
    }
  } catch { /* fallback */ }
  return null;
}

function scoreFromTranscript(transcript: TranscriptLine[]): ScoreEntry[] {
  const userLines = transcript.filter((l) => l.role === 'user');
  const aiLines = transcript.filter((l) => l.role === 'ai');
  const allText = userLines.map((l) => l.message.toLowerCase()).join(' ');

  // Heuristic scoring from transcript content
  const discoveryKeywords = ['how many', 'beds', 'units', 'portfolio', 'current', 'pain', 'challenge', 'system', 'pms', 'timeline', 'budget', 'decision'];
  const discoveryScore = Math.min(100, 40 + discoveryKeywords.filter((k) => allText.includes(k)).length * 8);

  const objectionKeywords = ['case stud', 'operator', 'live', 'tenant', 'chrome', 'extension', 'plugin', 'any pms', 'saving', 'replace', 'vendor'];
  const objectionScore = Math.min(100, 30 + objectionKeywords.filter((k) => allText.includes(k)).length * 9);

  const productKeywords = ['gateway', 'invoic', 'chrome', 'guarantee', 'deposit', 'credit build', 'fx', 'currency', 'tier', 'pricing', 'screen'];
  const productScore = Math.min(100, 25 + productKeywords.filter((k) => allText.includes(k)).length * 10);

  const closeKeywords = ['next step', 'schedule', 'follow up', 'send', 'proposal', 'offer', 'pilot', 'trial', 'start', 'onboard', 'commitment'];
  const closeScore = Math.min(100, 20 + closeKeywords.filter((k) => allText.includes(k)).length * 12);

  // Talk-to-listen: user words vs AI words
  const userWords = userLines.reduce((sum, l) => sum + l.message.split(' ').length, 0);
  const aiWords = aiLines.reduce((sum, l) => sum + l.message.split(' ').length, 0);
  const totalWords = userWords + aiWords;
  const userRatio = totalWords > 0 ? userWords / totalWords : 0.5;
  // Ideal: 40-60% rep talking. Penalize if too much or too little.
  const ratioScore = Math.round(100 - Math.abs(userRatio - 0.5) * 200);

  return [
    { label: 'Discovery Quality', score: discoveryScore, maxScore: 100, detail: `Used ${discoveryKeywords.filter((k) => allText.includes(k)).length}/${discoveryKeywords.length} qualifying topics` },
    { label: 'Objection Handling', score: objectionScore, maxScore: 100, detail: `Referenced ${objectionKeywords.filter((k) => allText.includes(k)).length} playbook responses` },
    { label: 'Product Knowledge', score: productScore, maxScore: 100, detail: `Covered ${productKeywords.filter((k) => allText.includes(k)).length} product features accurately` },
    { label: 'Close Attempt', score: closeScore, maxScore: 100, detail: `Used ${closeKeywords.filter((k) => allText.includes(k)).length} closing techniques` },
    { label: 'Talk-to-Listen Ratio', score: Math.max(0, ratioScore), maxScore: 100, detail: `You spoke ${Math.round(userRatio * 100)}% of the time (ideal: 40-60%)` },
  ];
}
