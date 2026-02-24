"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { Conversation } from '@11labs/client';
import { Phone, PhoneOff, Play, ChevronRight, RotateCcw, User, MessageSquare, History, Loader2, MicOff, Mic, BookOpen, Trophy } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

type PersonaId = 'pbsa' | 'hmo' | 'btr' | 'coliving';
type RoleId = 'operational' | 'strategic';
type StageId = 'cold-intro' | 'discovery' | 'demo-pitch' | 'objection-handling' | 'offer-close';
type CallMode = 'training' | 'exam';
type View = 'setup' | 'call' | 'scorecard' | 'history';

interface Role {
  id: RoleId;
  label: string;
  title: string;
  description: string;
  concerns: string[];
}

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
  role: RoleId;
  stage: StageId;
  mode: CallMode;
  date: string;
  duration: number;
  scores: ScoreEntry[];
  overallScore: number;
  transcript: TranscriptLine[];
  userName?: string;
}

const USERS = ['Mart', 'Alisha', 'Gui', 'Manav', 'Risto', 'Illimar', 'Angela'] as const;
type UserName = typeof USERS[number];

// ── Data ───────────────────────────────────────────────────────────────────

const PERSONAS: Persona[] = [
  {
    id: 'pbsa',
    name: 'PBSA Operator',
    characterName: 'James',
    segment: 'PBSA',
    description: '500+ beds, September intake pressure, 45% international students, StarRez PMS.',
    color: 'emerald',
    agentId: 'agent_6301khqyrhrkehmbj665e1sd69vb',
  },
  {
    id: 'hmo',
    name: 'HMO Operator',
    characterName: 'Dave',
    segment: 'HMO',
    description: '80 rooms across 12 properties, chasing rent via standing orders, 16-day average voids.',
    color: 'blue',
    agentId: 'agent_5001khqys3gve87tpsarnt8d8vp3',
  },
  {
    id: 'btr',
    name: 'BTR Operator',
    characterName: 'Sarah',
    segment: 'BTR',
    description: '300+ units, Yardi PMS, institutional investors, GDPR/SOC 2 requirements.',
    color: 'violet',
    agentId: 'agent_5101khqysdd2erk9tarap9d5jzfy',
  },
  {
    id: 'coliving',
    name: 'Co-Living Operator',
    characterName: 'Emma',
    segment: 'Co-Living',
    description: '200 beds, community-first brand, all-inclusive pricing, 50% international residents.',
    color: 'amber',
    agentId: 'agent_6101khqysrptfwmtp272ne3g9zf0',
  },
];

// ── Roles ─────────────────────────────────────────────────────────────────

const ROLES: Record<PersonaId, Record<RoleId, Role>> = {
  pbsa: {
    operational: {
      id: 'operational',
      label: 'Operational',
      title: 'Residence Manager',
      description: 'Runs the building day-to-day, manages student intake, deals with complaints. Worried about adding another system during September chaos.',
      concerns: ['Staff time', 'Workflow disruption', 'Team adoption', 'Peak season timing'],
    },
    strategic: {
      id: 'strategic',
      label: 'Strategic',
      title: 'Head of Operations',
      description: 'Oversees 5+ PBSA properties (2,500+ beds). Reports to institutional investors. Needs portfolio-wide ROI numbers.',
      concerns: ['Portfolio ROI', 'Vendor maturity', 'Student adoption', 'Investor approval'],
    },
  },
  hmo: {
    operational: {
      id: 'operational',
      label: 'Operational',
      title: 'Property Manager',
      description: 'Manages 12+ properties for the owner. Chases rent, handles maintenance, does viewings. Barely has time for admin, resistant to change.',
      concerns: ['Time savings', 'Tenant adoption', 'Learning curve', 'Current workflow'],
    },
    strategic: {
      id: 'strategic',
      label: 'Strategic',
      title: 'Owner-Director',
      description: 'Owns the Ltd company, makes financial decisions. Cares about yield, void costs, deposit capital tied up.',
      concerns: ['Yield impact', 'Void costs', 'Deposit capital', 'Switching cost'],
    },
  },
  btr: {
    operational: {
      id: 'operational',
      label: 'Operational',
      title: 'Building Manager',
      description: 'Runs a single 300-unit building. Manages on-site team of 8. Uses Yardi for everything. Worried about disrupting the current workflow.',
      concerns: ['Yardi integration', 'Team retraining', 'Resident satisfaction', 'System disruption'],
    },
    strategic: {
      id: 'strategic',
      label: 'Strategic',
      title: 'Portfolio Director',
      description: 'Oversees 1,200+ units across 4 cities. Reports to fund investors quarterly. Needs fund-level, asset-level, and unit-level financial reporting.',
      concerns: ['Scale proof', 'GDPR/SOC 2', 'Fund reporting', 'Vendor risk'],
    },
  },
  coliving: {
    operational: {
      id: 'operational',
      label: 'Operational',
      title: 'Community Manager',
      description: 'Runs the day-to-day experience. Organises events, handles resident issues. Hates being a rent collector, wants to focus on community.',
      concerns: ['Community vibe', 'Move-in friction', 'Digital experience', 'Turnover speed'],
    },
    strategic: {
      id: 'strategic',
      label: 'Strategic',
      title: 'Founder/CEO',
      description: 'Built the brand, makes all vendor decisions. Price-sensitive, compares everything to DIY Stripe setup.',
      concerns: ['Cost vs DIY Stripe', 'Unit economics', 'Brand alignment', 'Pro-rata complexity'],
    },
  },
};

// ── Persona Descriptions (role-aware) ─────────────────────────────────────

const PERSONA_DESCRIPTIONS: Record<PersonaId, Record<RoleId, string>> = {
  pbsa: {
    operational: 'Residence Manager at a 500-bed PBSA in Manchester. Manages September intake personally — 400+ students onboarded in 3 weeks. Currently uses StarRez for PMS and manually chases late payments. 45% international students with no UK guarantors. Worried about adding complexity during peak season. Pushes back with "we\'re already drowning in September", "my team won\'t learn another system", "StarRez handles everything we need".',
    strategic: 'Head of Operations overseeing 5 PBSA properties (2,500+ beds). Reports to institutional investors. Currently paying GoCardless + Housing Hand + DPS registration across all sites. £1.2M locked in deposits. Needs portfolio-level reporting. Pushes back with "you\'re early-stage for our scale", "will students adopt it?", "our investors need to approve new vendors", "what happens if CasaPay goes under?".',
  },
  hmo: {
    operational: 'Property manager handling 80 rooms across 12 HMO properties. Spends 3+ hours/week chasing rent via standing orders, doing viewings to fill voids, dealing with deposit disputes. No proper tenant screening — takes whoever applies first. 16-day average void per room. Pushes back with "standing orders work fine", "I don\'t have time to learn a new system", "will tenants actually use an app?".',
    strategic: 'Owner-Director of an HMO portfolio. Owns 80 rooms across 12 properties via Ltd company. Focused on yield — each void costs £1,085. Has £40K locked in deposits across DPS. Considering expansion but cash flow is tight. Pushes back with "I only have 80 rooms — is it worth it?", "1.5% eats into my yield", "I can\'t afford the switching cost right now".',
  },
  btr: {
    operational: 'Building Manager at a 300-unit BTR in Birmingham. Manages on-site team of 8. Uses Yardi for everything — payments, maintenance, reporting. Prides themselves on resident satisfaction scores. Worried about disrupting the Yardi workflow. Pushes back with "Yardi handles our payments already", "my team just got trained on the current system", "residents are happy with the current payment portal".',
    strategic: 'Portfolio Director overseeing 1,200 units across 4 cities. Reports to fund investors quarterly. Uses Yardi + Flatfair for deposits. £1.5M locked in deposit schemes, 250 deposit cycles/year. Needs fund-level, asset-level, and unit-level financial reporting. Pushes back with "we already use Flatfair", "can you handle 2,000 units?", "our fund requires ISO 27001 / SOC 2 vendors", "what\'s your GDPR position?".',
  },
  coliving: {
    operational: 'Community Manager at a 200-bed co-living scheme in London. Organises events, manages move-ins/outs, handles resident issues. Hates chasing rent — it damages the community vibe. 50% international residents, constant turnover (4-8 month stays). Uses Res:Harmonics. Pushes back with "we\'re not traditional landlords", "will this add friction to the move-in experience?", "our residents expect seamless digital everything".',
    strategic: 'Founder of a co-living brand with 200 beds in London, expanding to 500. Built the brand on community, but unit economics are tight. Currently using Stripe + manual screening + no guarantee. All-inclusive pricing makes pro-rata complex. Pushes back with "too expensive vs our DIY Stripe setup", "we already have Stripe", "GoCardless is cheaper", "1.5% on £2M rent roll is £30K — justify that".',
  },
};

// First message the AI says when "picking up the phone" — varies by stage and role
function getFirstMessage(persona: Persona, role: Role, stage: StageId, mode: CallMode): string {
  const name = persona.characterName;
  const title = role.title;
  let inCharacterMsg: string;
  switch (stage) {
    case 'cold-intro':
      inCharacterMsg = `Hello, ${name} speaking.`;
      break;
    case 'discovery':
      inCharacterMsg = role.id === 'operational'
        ? `Hi, ${name} here. Thanks for calling — I've got about ten minutes before I need to get back to it, so let's be quick.`
        : `Hi, ${name} here. Thanks for calling — I've got fifteen minutes. What's this about?`;
      break;
    case 'demo-pitch':
      inCharacterMsg = role.id === 'operational'
        ? `Hi there, ${name} speaking. I believe we had this call booked in for a product walkthrough? Go ahead, but keep it practical — I need to understand how this actually works day-to-day.`
        : `Hi there, ${name} speaking. I believe we had this call booked in for a product walkthrough? Before we get into features — give me the commercial overview first.`;
      break;
    case 'objection-handling':
      inCharacterMsg = role.id === 'operational'
        ? `Hi, ${name} here. So look, I've been thinking about what we discussed last time, and I've got some practical concerns before we go any further.`
        : `Hi, ${name} here. So I've reviewed what you sent. I've got some questions about the numbers and the risk profile before we go any further.`;
      break;
    case 'offer-close':
      inCharacterMsg = role.id === 'operational'
        ? `Hi, ${name} speaking. Right, so before we talk numbers — I need to understand exactly what changes for my team if we go ahead.`
        : `Hi, ${name} speaking. Right, so I understand you're sending over a proposal. Before we go through numbers, tell me what you're thinking in terms of total cost and savings.`;
      break;
  }

  if (mode === 'training') {
    return `Alright, training mode. I'll be ${name}, your ${title}. I'll stay in character, but if you slip up I'll pause and coach you through it. Here we go. ... ${inCharacterMsg}`;
  }
  return inCharacterMsg;
}

const STAGES: Stage[] = [
  { id: 'cold-intro', name: 'Cold Intro', duration: '~2 min', description: 'Hook referencing segment pain + Renters Rights Act. Get 30 seconds, then a meeting.' },
  { id: 'discovery', name: 'Discovery', duration: '~5 min', description: 'Identify primary pain (occupancy/payments/cash flow) + ownership model. Qualify before pitching.' },
  { id: 'demo-pitch', name: 'Demo Pitch', duration: '~8 min', description: 'Confirm pain points, match to correct tier, explain product. Chrome extension + AI gateway.' },
  { id: 'objection-handling', name: 'Objection Handling', duration: '~5 min', description: 'Segment-specific objections + pricing vs current stack comparison.' },
  { id: 'offer-close', name: 'Offer & Close', duration: '~3 min', description: 'Specific savings for THEIR portfolio. Pilot terms, September timeline, commitment ask.' },
];

const STAGE_CONTEXT: Record<StageId, string> = {
  'cold-intro': 'The sales rep is making a cold introduction call. They should reference a segment-specific pain point and the Renters Rights Act changes. Be dismissive initially but give them 30 seconds if their hook is specific to your situation. If the hook is generic, shut it down quickly.',
  'discovery': 'The sales rep is running a discovery call. They MUST ask about your primary pain point (occupancy, payment ops, or cash flow) and your ownership model (do you own, lease, or manage for investors). If they skip qualification and jump to pitching, push back: "You haven\'t even asked about our situation yet." Only volunteer information when asked directly.',
  'demo-pitch': 'The sales rep is giving a verbal product demo. They should confirm the pain points from discovery FIRST, then match you to the right product tier. If they pitch the wrong tier (e.g., payment guarantee when your issue is occupancy), challenge them. Ask clarifying questions and test their product knowledge.',
  'objection-handling': 'Raise your objections early and firmly. Push back on pricing by comparing to your current vendor stack cost. If they give a weak response, push back harder. If they give a strong, specific response with numbers, acknowledge it but raise another objection.',
  'offer-close': 'The sales rep is discussing pricing and trying to close. Demand specific savings numbers for YOUR portfolio size. Push back on commitment — ask about pilot terms, implementation timeline, and what happens if it doesn\'t work. Only agree to next steps if they make a compelling case with your specific numbers.',
};

const ROLE_CONTEXT: Record<RoleId, string> = {
  operational: 'You are a hands-on operational manager, not the decision maker. You care about: daily workflow impact, team adoption, integration with your current systems, timing (don\'t disrupt peak season). You do NOT have budget authority — if convinced, you\'d say "I\'d need to run this by my director/owner." If the rep doesn\'t acknowledge your operational concerns and jumps to ROI numbers, push back: "That\'s great for the spreadsheet, but tell me how this actually works for my team on Monday morning." Be more informal and time-pressured. Ask practical questions about day-to-day workflow.',
  strategic: 'You are the decision maker with budget authority. You care about: ROI, total cost vs current multi-vendor stack, risk (vendor maturity, data security), scale, reporting for investors/board. You are NOT interested in operational details — if the rep dives into features without showing the business case first, redirect: "Before we get into the features — tell me about the commercial model and what this saves us." Be more formal and time-conscious. Ask business questions about numbers and risk. If they can make a strong financial case with specific numbers, you\'ll consider a pilot.',
};

// ── Script Data (Training Mode) ──────────────────────────────────────────────

// Script cards now support optional `roleFilter` — if set, only shown for that role
interface ScriptCard {
  title: string;
  tips: string[];
  roleFilter?: RoleId;
}

const STAGE_SCRIPTS: Record<StageId, ScriptCard[]> = {
  'cold-intro': [
    { title: 'Opening Hook', tips: [
      'Introduce yourself: name + CasaPay',
      'Reference their segment pain + Renters Rights Act: "As a [PBSA/HMO/...] operator, with the Renters Rights Act changes..."',
      'Value prop in 1 sentence: "We provide guaranteed rent on time — you send an invoice, we pay on the due date, even if the tenant is late."',
      'Ask for 30 seconds: "Would you have 30 seconds for me to explain how?"',
    ]},
    { title: 'Hook for Operational Roles', roleFilter: 'operational', tips: [
      'Lead with time savings: "Save your team X hours/week on payment chasing"',
      'Emphasise workflow simplicity: "Works on top of your current PMS — zero integration"',
      'Reference their daily pain: "No more manual chasing, no more deposit admin"',
    ]},
    { title: 'Hook for Strategic Roles', roleFilter: 'strategic', tips: [
      'Lead with cost: "Save £X/month vs your current 3-5 vendor stack"',
      'Emphasise ROI: "Release £X locked in deposits back into operations"',
      'Reference business impact: "Portfolio-wide reporting, one vendor replacing five"',
    ]},
    { title: 'If They Engage', tips: [
      'Qualify quickly: "How many beds/units do you manage?"',
      'Bridge to meeting: "I think this is worth 15 minutes — can I send a calendar link?"',
      'Use booking link, don\'t propose times manually',
    ]},
    { title: 'If They Push Back', tips: [
      'Acknowledge: "I understand, you\'re busy"',
      'Leave a hook: "Just so you know — operators like yours typically save £1,000/month by consolidating 3-5 vendors into one"',
      'Offer email: "Can I send a one-pager instead?"',
    ]},
  ],
  'discovery': [
    { title: '3 Pain Points (identify #1 first)', tips: [
      '🔴 OCCUPANCY — Low fill rates, struggling to attract tenants, competition. → Lead with tenant membership card, verified tenant pool',
      '🟡 PAYMENT OPS — Manual chasing, multiple vendors, international payment friction. → Lead with AI gateway, email alias, zero integration',
      '🟢 CASH FLOW — High occupancy but late payments kill liquidity, must pay owners on time. → Lead with ON-TIME guarantee, predictable payouts',
      'Ask: "What\'s your biggest challenge right now — filling units, collecting payments, or cash flow timing?"',
    ]},
    { title: 'Ownership Model (CRITICAL)', tips: [
      'Ask: "Do you own your buildings, or do you lease/manage them for investors?"',
      '🏠 OPERATOR (leases) → Cash flow is ALWAYS a top-2 pain. Must pay owners regardless of tenant timing → ON-TIME tier',
      '🏗️ DEVELOPER/OWNER → Occupancy pain likely. Need to fill units → COVER tier',
      '🔄 HYBRID → Both pains. Own some (occupancy), lease others (cash flow) → COVER → ON-TIME',
      '📋 PROPERTY MANAGER → Payment ops pain. Efficient systems for investor reporting → PAYMENTS tier',
    ]},
    { title: 'Adjust for Operational Role', roleFilter: 'operational', tips: [
      'Focus on: workflow questions, team size, current daily process, peak season timing',
      'They won\'t know ROI numbers or budget — don\'t ask',
      'Ask: "How many people on your team handle rent collection day-to-day?"',
      'Ask: "What does your process look like when a tenant is late?"',
    ]},
    { title: 'Adjust for Strategic Role', roleFilter: 'strategic', tips: [
      'Focus on: cost structure, portfolio size, vendor contracts, board reporting needs, decision timeline',
      'They won\'t know daily workflow details — don\'t dwell',
      'Ask: "What does your current vendor stack cost you annually across all properties?"',
      'Ask: "Who else would need to sign off on a decision like this?"',
    ]},
    { title: 'Key Rule', tips: [
      'Listen more than you talk (40-60% ratio)',
      'Don\'t pitch yet — understand their situation first',
      'Confirm: "So if I\'m hearing you right, your #1 issue is [X]?"',
      'Document pain + ownership model before moving to demo',
    ]},
  ],
  'demo-pitch': [
    { title: 'Operational Framing', roleFilter: 'operational', tips: [
      'Lead with Chrome extension demo — "Your team keeps using [current PMS], we sit on top"',
      'Show email alias simplicity — "Change one email address, that\'s it"',
      'Focus on what DOESN\'T change for their team',
      'Address peak season: "Can go live in 2 weeks, well before September intake"',
    ]},
    { title: 'Strategic Framing', roleFilter: 'strategic', tips: [
      'Lead with savings calculator — specific numbers for their portfolio size',
      'Show tier recommendation matched to their pain from discovery',
      'Portfolio-wide impact: "Across your 2,500 beds, that\'s £X/year in savings + £X released from deposits"',
      'Competitor comparison: "You\'re currently paying GoCardless + Housing Hand + DPS = £X. We replace all three for £Y."',
    ]},
    { title: 'Demo Flow', tips: [
      '1. Confirm pain points from discovery (don\'t skip this)',
      '2. Match to the right tier based on pain + ownership model',
      '3. AI gateway: operator sends invoice to @alias → AI parses → tenant pays → operator gets payout',
      '4. Chrome extension: works with ANY PMS, no IT integration',
      '5. Savings calculator with THEIR numbers',
      '6. Q&A → Next steps',
    ]},
    { title: 'Product Tiers (match to pain)', tips: [
      'PAYMENTS (1.0%) — collection + screening. For: payment ops pain, property managers',
      'COVER (1.5%) — + guarantee + deposit elimination. For: occupancy pain, developers/owners',
      'ON-TIME (2.5%) — guaranteed payout on due date. For: cash flow pain, operators who lease',
      'ENTERPRISE (custom) — 500+ units, dedicated AM. For: portfolio directors, institutional',
    ]},
    { title: 'Proof Points', tips: [
      '36 live operators across EU + UK',
      '220+ tenants actively using',
      'Fastest deal close: 16 days (Aria Apartments)',
      'Chrome plugin = works with any PMS, no IT needed',
      'Renters Rights Act ready — deposit replacement compliant',
    ]},
  ],
  'objection-handling': [
    { title: '"You\'re early-stage"', tips: [
      '"36 live operators, 220+ tenants, EU + UK. Battle-tested across PBSA, HMO, BTR, co-living."',
      'Specific proof: "Aria Apartments closed in 16 days, live within a month."',
      'If strategic: offer to share case study from similar portfolio size',
    ]},
    { title: '"Need full PMS integration"', tips: [
      '"CasaPay Link Chrome plugin works with ANY PMS — StarRez, Yardi, Res:Harmonics. No migration."',
      '"Our email alias method means zero integration — just change the email address on your invoice."',
      '"Your team keeps their current system. We sit on top, not underneath."',
    ]},
    { title: '"Too expensive / we have GoCardless / Stripe"', tips: [
      '"CasaPay replaces 3-5 vendors: payment processing + screening + deposits + guarantees. One platform, one fee."',
      '"Run the savings calc: GoCardless (0.5%) + Housing Hand (£200/tenant) + DPS admin (£X/year) vs CasaPay all-in at 1.5%"',
      '"Stripe handles payments only. You still need screening + guarantee + deposit separately = 4 contracts vs 1."',
    ]},
    { title: 'Operational Objections', roleFilter: 'operational', tips: [
      '"My team won\'t use another system" → "They keep their current PMS. CasaPay is invisible to them — it\'s just a Chrome extension."',
      '"Bad timing (peak season)" → "We can go live in 2 weeks. Most ops teams are onboarded in a single afternoon session."',
      '"Current system works fine" → "How much time per week does your team spend chasing late payments? That time has a cost."',
    ]},
    { title: 'Strategic Objections', roleFilter: 'strategic', tips: [
      '"You\'re early-stage for our scale" → "We handle portfolios up to 2,500 beds. Happy to start with a pilot on one property."',
      '"Need board/investor approval" → "Understood. Can I send a one-pager with ROI numbers your board can review?"',
      '"Already have contracts with Flatfair/Housing Hand" → "When do those renew? Most operators run CasaPay alongside first, then consolidate."',
      '"What if you go under?" → "Funds are held in segregated accounts. Your money is protected regardless of what happens to CasaPay."',
    ]},
    { title: '"Will students/tenants adopt it?"', tips: [
      '"International students especially value: no deposit required, FX handling, UK credit history building."',
      '"Tenant onboarding is self-serve via QR code or link. Average activation: 48 hours."',
    ]},
  ],
  'offer-close': [
    { title: 'Operational Close', roleFilter: 'operational', tips: [
      'Close = champion introduction: "Would you be open to introducing us to your [Director/Owner]?"',
      'Or pilot close: "Can we do a pilot on your building? We handle the setup, your team just keeps doing what they do."',
      'Timeline: "To be live for September, we\'d need to start onboarding by July."',
      'Reassure: "Nothing changes for your team except less manual chasing."',
    ]},
    { title: 'Strategic Close', roleFilter: 'strategic', tips: [
      'Direct proposal: "Based on your 1,200 units, here\'s what the numbers look like..."',
      'Pilot terms: "Start with 20-50 units on one property. Prove the ROI before rolling out."',
      'Timeline: "To capture September intake, we need contracts signed by end of June."',
      'Commitment: "Shall I send the proposal today? I can walk you through the terms this week."',
    ]},
    { title: 'Framing the Offer', tips: [
      'Tie back to THEIR pain points from discovery + ownership model',
      'Show specific savings using their portfolio size and current vendor costs',
      'Recommend a tier based on pain: occupancy → COVER, payment ops → PAYMENTS, cash flow → ON-TIME',
      '"Based on your [X] units, the [TIER] at [X%] saves you approximately £[X]/month vs your current setup"',
    ]},
    { title: 'If They Hesitate', tips: [
      '"Is there a specific concern I can address?"',
      '"Happy to share a case study from a similar [PBSA/HMO/BTR/co-living] operator"',
      '"Would a pilot on one property help you prove the business case internally?"',
      'Never pressure — propose a clear next step instead',
    ]},
  ],
};

// ── Ring Tone (inline data URI — no external file needed) ────────────────────

// Generate a UK-style ring tone as a WAV data URI at module load time.
// Two bursts of 400+450Hz, ~0.4s each, with 0.2s gap, then silence.
function generateRingToneDataUri(): string {
  const sampleRate = 16000;
  const duration = 3; // 3 seconds: ring-ring then silence
  const numSamples = sampleRate * duration;
  const buffer = new Int16Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Burst 1: 0.0–0.4s, Burst 2: 0.6–1.0s, silence rest
    const inBurst = (t >= 0 && t < 0.4) || (t >= 0.6 && t < 1.0);
    if (inBurst) {
      const sample = Math.sin(2 * Math.PI * 400 * t) + Math.sin(2 * Math.PI * 450 * t);
      buffer[i] = Math.round(sample * 0.15 * 32767);
    } else {
      buffer[i] = 0;
    }
  }

  // Minimal WAV header
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const dataSize = buffer.length * 2;
  const fileSize = 36 + dataSize;
  // RIFF header
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, fileSize, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // fmt chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  // data chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);

  const wav = new Uint8Array(44 + dataSize);
  wav.set(new Uint8Array(header), 0);
  wav.set(new Uint8Array(buffer.buffer), 44);

  const binary = Array.from(wav).map((b) => String.fromCharCode(b)).join('');
  return 'data:audio/wav;base64,' + btoa(binary);
}

let _ringDataUri: string | null = null;
function getRingDataUri() {
  if (!_ringDataUri) _ringDataUri = generateRingToneDataUri();
  return _ringDataUri;
}

function createRingTone(): { start: () => void; stop: () => void } {
  let audio: HTMLAudioElement | null = null;

  return {
    start() {
      audio = new Audio(getRingDataUri());
      audio.loop = true;
      audio.volume = 0.4;
      audio.play().catch(() => {});
    },
    stop() {
      if (audio) {
        audio.pause();
        audio.src = '';
        audio = null;
      }
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

function ScriptPanel({ stageId, roleId }: { stageId: StageId; roleId: RoleId }) {
  const allCards = STAGE_SCRIPTS[stageId];
  const cards = allCards.filter((c) => !c.roleFilter || c.roleFilter === roleId);
  const [activeStep, setActiveStep] = useState(0);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const activeRef = useRef<HTMLDivElement>(null);

  const toggleCheck = (key: string) => setChecked((prev) => ({ ...prev, [key]: !prev[key] }));

  const stepCheckedCount = (i: number) => cards[i].tips.filter((_, j) => checked[`${i}-${j}`]).length;
  const stepComplete = (i: number) => stepCheckedCount(i) === cards[i].tips.length;

  const goNext = () => {
    if (activeStep < cards.length - 1) {
      setActiveStep(activeStep + 1);
      setTimeout(() => activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-5 space-y-3">
      {/* Header with progress */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-emerald-400" />
          <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Script</span>
        </div>
        <span className="text-[10px] text-slate-600 font-bold">
          Step {activeStep + 1}/{cards.length}
        </span>
      </div>

      {/* Step progress bar */}
      <div className="flex gap-1">
        {cards.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              stepComplete(i) ? 'bg-emerald-500' : i === activeStep ? 'bg-emerald-500/40' : 'bg-white/5'
            }`}
          />
        ))}
      </div>

      {/* Steps */}
      {cards.map((card, i) => {
        const isActive = i === activeStep;
        const isDone = stepComplete(i);
        const isPast = i < activeStep;

        return (
          <div
            key={i}
            ref={isActive ? activeRef : undefined}
            className={`rounded-xl border overflow-hidden transition-all duration-300 ${
              isActive
                ? 'border-emerald-500/30 bg-emerald-500/[0.03] ring-1 ring-emerald-500/10'
                : isDone || isPast
                  ? 'border-white/5 bg-white/[0.01] opacity-50'
                  : 'border-white/5 bg-white/[0.01] opacity-30'
            }`}
          >
            {/* Step header — always clickable */}
            <button
              onClick={() => {
                setActiveStep(i);
                setTimeout(() => activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
              }}
              className="w-full text-left px-4 py-3 flex items-center gap-3"
            >
              {/* Step number / check */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black ${
                isDone
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 text-slate-600 border border-white/10'
              }`}>
                {isDone ? '\u2713' : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>
                  {card.title}
                </span>
                {!isActive && (
                  <span className="text-[10px] text-slate-600 ml-2">
                    {stepCheckedCount(i)}/{card.tips.length}
                  </span>
                )}
              </div>
            </button>

            {/* Tips — only shown for active step */}
            {isActive && (
              <div className="px-4 pb-4 space-y-2">
                {card.tips.map((tip, j) => {
                  const key = `${i}-${j}`;
                  const isChecked = checked[key];
                  const isAsk = tip.startsWith('Ask:');
                  return (
                    <button
                      key={j}
                      onClick={() => toggleCheck(key)}
                      className={`w-full text-left flex gap-3 p-2.5 rounded-lg transition-all ${
                        isChecked
                          ? 'bg-emerald-500/5 opacity-50'
                          : isAsk
                            ? 'bg-blue-500/[0.06] border border-blue-500/20 hover:bg-blue-500/[0.1]'
                            : 'bg-white/[0.02] hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border mt-0.5 shrink-0 flex items-center justify-center transition-all ${
                        isChecked
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                          : isAsk
                            ? 'border-blue-500/40 text-transparent'
                            : 'border-white/20 text-transparent'
                      }`}>
                        <span className="text-[10px]">{isChecked ? '\u2713' : ''}</span>
                      </div>
                      {isAsk && !isChecked ? (
                        <div className="flex-1">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-blue-400 block mb-0.5">Say this</span>
                          <span className={`text-sm leading-relaxed ${isChecked ? 'text-slate-500 line-through' : 'text-blue-200'}`}>
                            {tip.replace(/^Ask:\s*/, '')}
                          </span>
                        </div>
                      ) : (
                        <span className={`text-sm leading-relaxed ${isChecked ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                          {isAsk ? tip.replace(/^Ask:\s*/, '') : tip}
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Next step button */}
                {i < cards.length - 1 && (
                  <button
                    onClick={goNext}
                    className="w-full mt-2 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    Next: {cards[i + 1].title}
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function TrainingSimulator() {
  const [view, setView] = useState<View>('setup');
  const [selectedPersona, setSelectedPersona] = useState<PersonaId | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleId>('operational');
  const [selectedStage, setSelectedStage] = useState<StageId | null>(null);
  const [callMode, setCallMode] = useState<CallMode>('training');
  const [callActive, setCallActive] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'speaking' | 'listening'>('listening');
  const [muted, setMuted] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<TranscriptLine[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<UserName | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserName | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('cp-training-user');
    return USERS.includes(stored as UserName) ? stored as UserName : null;
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const conversationRef = useRef<Conversation | null>(null);
  const conversationIdRef = useRef<string>('');
  const transcriptRef = useRef<TranscriptLine[]>([]);
  const callSecondsRef = useRef(0);
  const selectedPersonaRef = useRef<PersonaId | null>(null);
  const selectedRoleRef = useRef<RoleId>('operational');
  const selectedStageRef = useRef<StageId | null>(null);
  const finishingRef = useRef(false);
  const ringToneRef = useRef<{ start: () => void; stop: () => void } | null>(null);
  const callModeRef = useRef<CallMode>('training');
  const selectedUserRef = useRef<UserName | null>(null);

  // Keep refs in sync with state
  useEffect(() => { selectedPersonaRef.current = selectedPersona; }, [selectedPersona]);
  useEffect(() => { selectedRoleRef.current = selectedRole; }, [selectedRole]);
  useEffect(() => { selectedStageRef.current = selectedStage; }, [selectedStage]);
  useEffect(() => { callModeRef.current = callMode; }, [callMode]);
  useEffect(() => {
    selectedUserRef.current = selectedUser;
    if (selectedUser) localStorage.setItem('cp-training-user', selectedUser);
  }, [selectedUser]);

  // Load sessions from server on mount — server is source of truth
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/training/sessions');
        if (res.ok) {
          const serverSessions: Session[] = await res.json();
          setSessions(serverSessions);
          localStorage.setItem('cp-training-sessions', JSON.stringify(serverSessions));
        }
      } catch {
        // Offline fallback: load from localStorage
        try {
          const stored = localStorage.getItem('cp-training-sessions');
          if (stored) setSessions(JSON.parse(stored));
        } catch { /* ignore */ }
      }
      setSessionsLoaded(true);
    })();
  }, []);

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
      role: selectedRoleRef.current,
      stage: selectedStageRef.current!,
      mode: callModeRef.current,
      date: new Date().toISOString(),
      duration: callSecondsRef.current,
      scores,
      overallScore: overall,
      transcript,
      userName: selectedUserRef.current || undefined,
    };

    setSessions((prev) => {
      const updated = [session, ...prev];
      localStorage.setItem('cp-training-sessions', JSON.stringify(updated));
      return updated;
    });
    // Persist to server so all reps can see it
    fetch('/api/training/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    }).catch(() => {});
    setView('scorecard');
    finishingRef.current = false;
  }, []);

  const startCall = useCallback(async () => {
    if (!selectedPersona || !selectedStage) return;

    const persona = PERSONAS.find((p) => p.id === selectedPersona)!;
    const role = ROLES[selectedPersona][selectedRole];
    const personaDesc = PERSONA_DESCRIPTIONS[selectedPersona][selectedRole];
    setView('call');
    setConnecting(true);
    setError(null);
    setCallSeconds(0);
    callSecondsRef.current = 0;
    setLiveTranscript([]);
    transcriptRef.current = [];
    finishingRef.current = false;

    // Build context override: base prospect role + stage context + role overlay + persona description
    const basePrompt = callMode === 'exam'
      ? `You are playing the role of a property industry prospect receiving a sales call from a CasaPay sales rep. You are NOT the salesperson — you are the prospect being pitched to. Stay in character as ${persona.characterName}, a ${role.title} in the ${persona.segment} sector. Respond naturally as this person would on a real phone call. Never break character. Never help the rep or coach them. Make them earn every step.`
      : `You are playing the role of a property industry prospect in a TRAINING session with a CasaPay sales rep. You are ${persona.characterName}, a ${role.title} in the ${persona.segment} sector.

TRAINING MODE — COACHING RULES:
1. Start each exchange IN CHARACTER as the prospect. React naturally as this person would on a real call.
2. If the rep makes a clear mistake — weak/generic hook, skips qualification, pitches the wrong tier, gives a vague objection response, fails to use specific numbers, or misses a key step for this stage — PAUSE the roleplay.
3. When pausing: briefly step out of character (say "Quick coaching note:"), explain specifically what went wrong, give them an example of what they SHOULD have said (use a concrete phrase they can repeat), then say "Let's try that again" and repeat your last line in character so they can retry.
4. If they retry and do better, acknowledge it briefly ("Much better") and continue advancing the conversation in character.
5. If the rep does something well, stay in character but you can weave in subtle acknowledgment (e.g., "That's a fair point" or show genuine interest).
6. Be encouraging but direct — don't let bad technique slide. The goal is to build their skill through practice and immediate correction.
7. When in character, still behave realistically — don't make it artificially easy. Challenge them as the real prospect would, but coach when they fail to meet the challenge.
8. Maximum 2 coaching pauses in a row — if they struggle repeatedly on the same point, give them the answer and move on to avoid frustration.`;

    const contextOverride = [
      basePrompt,
      STAGE_CONTEXT[selectedStage],
      ROLE_CONTEXT[selectedRole],
      `Your persona: ${personaDesc}`,
    ].join('\n\n');

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

      // Play ringing tone via <audio> element (doesn't interfere with ElevenLabs AudioContext)
      const ringTone = createRingTone();
      ringToneRef.current = ringTone;
      ringTone.start();

      // Start ElevenLabs conversation (ring plays concurrently)
      const firstMsg = getFirstMessage(persona, role, selectedStage, callMode);
      console.log('[TrainingSim] Starting session with signedUrl:', signedUrl.slice(0, 60) + '...');
      console.log('[TrainingSim] firstMessage:', firstMsg);
      console.log('[TrainingSim] role:', selectedRole, '| context length:', contextOverride.length);
      const conversation = await Conversation.startSession({
        signedUrl: signedUrl,
        overrides: {
          agent: {
            firstMessage: firstMsg,
            prompt: { prompt: contextOverride },
          },
        },
        onConnect: ({ conversationId }) => {
          console.log('[TrainingSim] onConnect, conversationId:', conversationId);
          // Stop ringing — AI is "picking up"
          ringToneRef.current?.stop();
          ringToneRef.current = null;
          conversationIdRef.current = conversationId;
          setConnecting(false);
          setCallActive(true);
        },
        onMessage: ({ message, source }) => {
          console.log('[TrainingSim] onMessage:', source, message.slice(0, 80));
          const line: TranscriptLine = { role: source, message };
          transcriptRef.current = [...transcriptRef.current, line];
          setLiveTranscript([...transcriptRef.current]);
        },
        onModeChange: ({ mode: m }) => {
          console.log('[TrainingSim] onModeChange:', m);
          setMode(m);
        },
        onStatusChange: ({ status }) => {
          console.log('[TrainingSim] onStatusChange:', status);
        },
        onError: (message, context) => {
          console.error('[TrainingSim] onError:', message, context);
          setError(typeof message === 'string' ? message : JSON.stringify(message));
        },
        onDisconnect: (details) => {
          console.log('[TrainingSim] onDisconnect:', JSON.stringify(details));
          if (conversationRef.current) {
            finishCall();
          }
        },
      });

      console.log('[TrainingSim] startSession resolved, conversation:', conversation?.getId?.());
      conversationRef.current = conversation;
    } catch (err: any) {
      console.error('startCall error:', err);
      ringToneRef.current?.stop();
      ringToneRef.current = null;
      setConnecting(false);
      setError(err.message || 'Failed to connect');
      setView('setup');
    }
  }, [selectedPersona, selectedRole, selectedStage, finishCall]);

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

        {/* User filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setHistoryFilter(null)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
              historyFilter === null
                ? 'bg-white/10 text-white border border-white/20'
                : 'bg-white/[0.02] text-slate-500 border border-white/5 hover:text-slate-300'
            }`}
          >
            All
          </button>
          {USERS.map((name) => (
            <button
              key={name}
              onClick={() => setHistoryFilter(historyFilter === name ? null : name)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                historyFilter === name
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/[0.02] text-slate-500 border border-white/5 hover:text-slate-300'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {(() => {
          const filtered = historyFilter
            ? sessions.filter((s) => s.userName === historyFilter)
            : sessions;
          return filtered.length === 0 ? (
          <div className="text-center py-20">
            <History size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-600">No sessions yet. Start practicing!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => {
              const persona = PERSONAS.find((p) => p.id === s.persona)!;
              const stage = STAGES.find((st) => st.id === s.stage)!;
              const roleLabel = s.role ? (ROLES[s.persona]?.[s.role]?.title || s.role) : '';
              const scoreColor = s.overallScore >= 80 ? 'text-emerald-400' : s.overallScore >= 60 ? 'text-amber-400' : 'text-red-400';

              return (
                <div key={s.id} className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-${persona.color}-500/10 border border-${persona.color}-500/30 flex items-center justify-center`}>
                        <User size={16} className={`text-${persona.color}-400`} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          {s.userName && <span className="text-emerald-400">{s.userName}</span>}
                          {s.userName && ' — '}
                          {persona.name}{roleLabel ? ` — ${roleLabel}` : ''}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            s.mode === 'training'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {s.mode === 'training' ? <BookOpen size={8} /> : <Trophy size={8} />}
                            {s.mode || 'exam'}
                          </span>
                          {s.role && (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              s.role === 'operational'
                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            }`}>
                              {s.role}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500">
                            {stage.name} &middot; {formatTime(s.duration)} &middot; {new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
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
        );
        })()}
      </div>
    );
  }

  // ── Render: Scorecard ─────────────────────────────────────────────────────

  if (view === 'scorecard') {
    const lastSession = sessions[0];
    if (!lastSession) { setView('setup'); return null; }

    const persona = PERSONAS.find((p) => p.id === lastSession.persona)!;
    const stage = STAGES.find((s) => s.id === lastSession.stage)!;
    const sessionRoleTitle = lastSession.role ? (ROLES[lastSession.persona]?.[lastSession.role]?.title || '') : '';
    const overallColor = lastSession.overallScore >= 80 ? 'text-emerald-400' : lastSession.overallScore >= 60 ? 'text-amber-400' : 'text-red-400';

    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-${persona.color}-500/10 border border-${persona.color}-500/30`}>
            <User size={12} className={`text-${persona.color}-400`} />
            <span className={`text-[10px] font-bold uppercase tracking-widest text-${persona.color}-400`}>
              {persona.segment}{sessionRoleTitle ? ` — ${sessionRoleTitle}` : ''} &middot; {stage.name}
            </span>
          </div>
          <h1 className="text-lg font-black text-white">Session Scorecard</h1>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              lastSession.mode === 'training'
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {lastSession.mode === 'training' ? <BookOpen size={10} /> : <Trophy size={10} />}
              {lastSession.mode || 'exam'} mode
            </span>
            {lastSession.role && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                lastSession.role === 'operational'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
              }`}>
                {lastSession.role}
              </span>
            )}
            <span className="text-xs text-slate-500">{formatTime(lastSession.duration)} call duration</span>
          </div>
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
    const role = ROLES[selectedPersona!][selectedRole];
    const stage = STAGES.find((s) => s.id === selectedStage)!;
    const showScript = callMode === 'training';

    const callContent = (
      <div className={`flex flex-col items-center ${showScript ? 'justify-start pt-12' : 'justify-center min-h-screen -mt-16'} p-6`}>
        {/* Persona badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-${persona.color}-500/10 border border-${persona.color}-500/30 mb-6`}>
          <User size={12} className={`text-${persona.color}-400`} />
          <span className={`text-[10px] font-bold uppercase tracking-widest text-${persona.color}-400`}>
            {persona.segment} &middot; {role.title}
          </span>
        </div>

        {/* Timer */}
        {(() => {
          const MAX_SECONDS = 600; // 10 minutes
          const remaining = Math.max(0, MAX_SECONDS - callSeconds);
          const timerColor = remaining <= 60 ? 'text-red-400' : remaining <= 120 ? 'text-amber-400' : 'text-white';
          const remainingColor = remaining <= 60 ? 'text-red-400/80' : remaining <= 120 ? 'text-amber-400/80' : 'text-slate-500';
          return (
            <>
              <div className={`text-4xl font-black font-mono mb-1 ${timerColor}`}>
                {formatTime(callSeconds)}
              </div>
              {callActive && (
                <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${remainingColor}`}>
                  {formatTime(remaining)} remaining
                </div>
              )}
            </>
          );
        })()}
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

    if (!showScript) return callContent;

    return (
      <div className="flex flex-col lg:flex-row min-h-screen">
        <div className="flex-1 lg:w-[60%]">
          {callContent}
        </div>
        <div className="lg:w-[40%] border-t lg:border-t-0 lg:border-l border-white/10 bg-white/[0.01] overflow-hidden">
          <ScriptPanel stageId={selectedStage!} roleId={selectedRole} />
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
          <p className="text-xs text-slate-500 mt-1">Practice sales calls with AI operator personas &middot; <span className="text-slate-600">10 min per session</span></p>
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

      {/* Step 1: Who's practicing */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <span className="text-[10px] font-black text-emerald-400">1</span>
          </div>
          <span className="text-xs font-bold text-white">Who&apos;s Practicing?</span>
        </div>
        <div className="flex gap-2">
          {USERS.map((name) => (
            <button
              key={name}
              onClick={() => setSelectedUser(name)}
              className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all duration-200 ${
                selectedUser === name
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 ring-1 ring-emerald-500/20'
                  : 'border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/[0.04] hover:border-white/20 hover:text-white'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Segment */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <span className="text-[10px] font-black text-emerald-400">2</span>
          </div>
          <span className="text-xs font-bold text-white">Choose Segment</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PERSONAS.map((p) => (
            <PersonaCard key={p.id} persona={p} selected={selectedPersona === p.id} onSelect={() => setSelectedPersona(p.id)} />
          ))}
        </div>
      </div>

      {/* Step 3: Role (only shown after segment selected) */}
      {selectedPersona && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <span className="text-[10px] font-black text-emerald-400">3</span>
            </div>
            <span className="text-xs font-bold text-white">Choose Role</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(['operational', 'strategic'] as RoleId[]).map((roleId) => {
              const role = ROLES[selectedPersona][roleId];
              const isSelected = selectedRole === roleId;
              const colors = roleId === 'operational'
                ? { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', ring: 'ring-cyan-500/20' }
                : { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', ring: 'ring-purple-500/20' };

              return (
                <button
                  key={roleId}
                  onClick={() => setSelectedRole(roleId)}
                  className={`text-left p-4 rounded-xl border transition-all duration-200 ${
                    isSelected
                      ? `${colors.bg} ${colors.border} ring-1 ${colors.ring}`
                      : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-bold ${isSelected ? colors.text : 'text-white'}`}>{role.label}</span>
                    <span className={`text-[10px] ${isSelected ? colors.text : 'text-slate-500'}`}>&middot; {role.title}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed mb-2">{role.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {role.concerns.map((c) => (
                      <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-600">{c}</span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
          {/* Persona description preview */}
          <div className="p-3 rounded-xl border border-white/5 bg-white/[0.02]">
            <p className="text-[11px] text-slate-400 leading-relaxed italic">
              &ldquo;{PERSONA_DESCRIPTIONS[selectedPersona][selectedRole]}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* Step 4: Mode */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <span className="text-[10px] font-black text-emerald-400">4</span>
          </div>
          <span className="text-xs font-bold text-white">Select Mode</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setCallMode('training')}
            className={`text-left p-4 rounded-xl border transition-all duration-200 ${
              callMode === 'training'
                ? 'bg-blue-500/10 border-blue-500/30 ring-1 ring-blue-500/20'
                : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${callMode === 'training' ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-white/5 border border-white/10'}`}>
                <BookOpen size={14} className={callMode === 'training' ? 'text-blue-400' : 'text-slate-500'} />
              </div>
              <span className={`text-xs font-bold ${callMode === 'training' ? 'text-blue-400' : 'text-white'}`}>Training</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">Guided script with role-aware talk tracks and tips during the call</p>
          </button>
          <button
            onClick={() => setCallMode('exam')}
            className={`text-left p-4 rounded-xl border transition-all duration-200 ${
              callMode === 'exam'
                ? 'bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/20'
                : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${callMode === 'exam' ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-white/5 border border-white/10'}`}>
                <Trophy size={14} className={callMode === 'exam' ? 'text-amber-400' : 'text-slate-500'} />
              </div>
              <span className={`text-xs font-bold ${callMode === 'exam' ? 'text-amber-400' : 'text-white'}`}>Exam</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">No assistance. Test your skills under real conditions</p>
          </button>
        </div>
      </div>

      {/* Step 5: Stage */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <span className="text-[10px] font-black text-emerald-400">5</span>
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
          disabled={!selectedUser || !selectedPersona || !selectedStage}
          className={`w-full py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-3 ${
            selectedUser && selectedPersona && selectedStage
              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 cursor-pointer'
              : 'bg-white/5 border border-white/10 text-slate-600 cursor-not-allowed'
          }`}
        >
          <Phone size={18} />
          Start Practice Call
        </button>
        {(!selectedUser || !selectedPersona || !selectedStage) && (
          <p className="text-[10px] text-slate-600 text-center mt-2">Select your name, a segment, role, and stage to begin</p>
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
  const discoveryKeywords = ['how many', 'beds', 'units', 'portfolio', 'current', 'pain', 'challenge', 'system', 'pms', 'timeline', 'budget', 'decision', 'own', 'lease', 'investor', 'occupancy', 'cash flow', 'payment ops', 'ownership', 'guarantor', 'team', 'workflow', 'roi', 'cost'];
  const discoveryScore = Math.min(100, 40 + discoveryKeywords.filter((k) => allText.includes(k)).length * 5);

  const objectionKeywords = ['case stud', 'operator', 'live', 'tenant', 'chrome', 'extension', 'plugin', 'any pms', 'saving', 'replace', 'vendor', 'all-in', 'one platform', 'cheaper', 'stack', 'consolidat', 'homelet', 'housing hand', 'flatfair', 'gocard', 'champion', 'director', 'board'];
  const objectionScore = Math.min(100, 30 + objectionKeywords.filter((k) => allText.includes(k)).length * 6);

  const productKeywords = ['gateway', 'invoic', 'chrome', 'guarantee', 'deposit', 'credit build', 'fx', 'currency', 'tier', 'pricing', 'screen', 'cover', 'on-time', 'payment', 'email alias', 'zero integration', 'renters rights'];
  const productScore = Math.min(100, 25 + productKeywords.filter((k) => allText.includes(k)).length * 7);

  const closeKeywords = ['next step', 'schedule', 'follow up', 'send', 'proposal', 'offer', 'pilot', 'trial', 'start', 'onboard', 'commitment', 'september', 'intake', 'case study', 'similar operator', 'roi', 'savings', 'introduce', 'proposal'];
  const closeScore = Math.min(100, 20 + closeKeywords.filter((k) => allText.includes(k)).length * 8);

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
