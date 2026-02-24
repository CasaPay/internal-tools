"use client";

import * as React from 'react';
import { useState, useMemo } from 'react';
import {
  ChevronRight, ChevronLeft, ChevronDown, BarChart3, ShieldCheck,
  AlertCircle, TrendingDown, Wallet, Users2,
  CreditCard, Zap, LayoutGrid, Info,
  Home, Clock, Building2, Layers, Banknote,
  ArrowRight
} from 'lucide-react';

const QuestionTooltip = ({ why, impact, position = 'top' }: { why: string; impact: string; position?: 'top' | 'bottom' }) => {
  return (
    <div className="group relative inline-block">
      <Info size={14} className="text-slate-500 hover:text-slate-300 transition-colors cursor-help" />
      <div className={`absolute z-[9999] ${position === 'bottom' ? 'top-full mt-2 -translate-y-2' : 'bottom-full mb-2 translate-y-2'} right-0 w-64 p-4 bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 group-hover:translate-y-0 pointer-events-none`}>
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">The "Why"</p>
            <p className="text-[11px] text-slate-200 leading-relaxed font-medium">{why}</p>
          </div>
          <div className="h-px bg-white/5 w-full" />
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Business Impact</p>
            <p className="text-[11px] text-slate-200 leading-relaxed font-medium">{impact}</p>
          </div>
        </div>
        <div className={`absolute ${position === 'bottom' ? '-top-1 border-l border-t' : '-bottom-1 border-r border-b'} right-2 w-2 h-2 bg-slate-900 border-white/10 rotate-45`} />
      </div>
    </div>
  );
};

const STEPS = [
  { id: 'problem', title: 'Problem Validation' },
  { id: 'impact', title: 'Financial Impact' },
  { id: 'solution', title: 'Solution Value' },
];

type SectionId = 'portfolio' | 'occupancy' | 'payments' | 'cashflow';

interface QuestionDef {
  key: string;
  title: string;
  icon: React.ElementType;
  section: SectionId;
  why: string;
  impact: string;
  options: { id: string; label: string }[];
}

const SECTIONS: { id: SectionId; label: string; color: string; accent: string; activeClass: string; dotClass: string }[] = [
  { id: 'portfolio', label: 'Portfolio', color: 'text-slate-400', accent: 'border-slate-500/20', activeClass: 'bg-slate-500/10 border-slate-400/50 text-slate-50', dotClass: 'border-slate-400 bg-slate-400 shadow-[0_0_12px_rgba(148,163,184,0.6)]' },
  { id: 'occupancy', label: 'Occupancy', color: 'text-amber-400', accent: 'border-amber-500/20', activeClass: 'bg-amber-500/10 border-amber-500/50 text-amber-50', dotClass: 'border-amber-400 bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]' },
  { id: 'payments', label: 'Payments', color: 'text-blue-400', accent: 'border-blue-500/20', activeClass: 'bg-blue-500/10 border-blue-500/50 text-blue-50', dotClass: 'border-blue-400 bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)]' },
  { id: 'cashflow', label: 'Cash Flow', color: 'text-rose-400', accent: 'border-rose-500/20', activeClass: 'bg-rose-500/10 border-rose-500/50 text-rose-50', dotClass: 'border-rose-400 bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]' },
];

const QUESTIONS: QuestionDef[] = [
  // Section A: Portfolio Context
  {
    key: 'portfolioSize',
    title: 'Portfolio Size',
    icon: LayoutGrid,
    section: 'portfolio',
    why: 'Determines total revenue opportunity and operational scale.',
    impact: 'Larger portfolios benefit more from automated collection and batch processing.',
    options: [
      { id: '<100', label: '< 100 units' },
      { id: '100-500', label: '100 – 500 units' },
      { id: '500-2000', label: '500 – 2,000 units' },
      { id: '2000+', label: '2,000+ units' },
    ]
  },
  {
    key: 'ownershipModel',
    title: 'Ownership Model',
    icon: Building2,
    section: 'portfolio',
    why: 'Ownership structure determines which pain points hit hardest.',
    impact: 'Operators who lease from investors face structurally higher cash flow risk — they must pay owners regardless of tenant timing.',
    options: [
      { id: 'own', label: 'Own buildings' },
      { id: 'lease', label: 'Lease from investors' },
      { id: 'manage', label: 'Manage for investors' },
      { id: 'hybrid', label: 'Hybrid' },
    ]
  },
  {
    key: 'tenantMix',
    title: 'Tenant Demographics',
    icon: Users2,
    section: 'portfolio',
    why: 'International/student tenants face deposit and guarantor barriers.',
    impact: 'Higher proportion of international tenants = more friction in onboarding and higher vacancy risk.',
    options: [
      { id: 'local', label: 'Mostly local professionals' },
      { id: 'mixed', label: 'Mixed' },
      { id: 'international', label: 'Mostly international / students' },
    ]
  },
  // Section B: Occupancy Health
  {
    key: 'occupancyRate',
    title: 'Current Occupancy',
    icon: Home,
    section: 'occupancy',
    why: 'Measures inventory efficiency and revenue realization.',
    impact: 'Every empty unit is lost revenue — often linked to friction in the deposit/onboarding flow.',
    options: [
      { id: '<80', label: '< 80%' },
      { id: '80-90', label: '80 – 90%' },
      { id: '90+', label: '90%+' },
    ]
  },
  {
    key: 'voidDuration',
    title: 'Average Void Period',
    icon: Clock,
    section: 'occupancy',
    why: 'Measures how long units sit empty between tenancies.',
    impact: 'Longer voids compound vacancy costs — reducing void periods has immediate revenue impact.',
    options: [
      { id: '<7', label: '< 7 days' },
      { id: '7-21', label: '7 – 21 days' },
      { id: '21+', label: '21+ days' },
    ]
  },
  // Section C: Payment Operations
  {
    key: 'collectionMethod',
    title: 'Rent Collection Method',
    icon: CreditCard,
    section: 'payments',
    why: 'Reveals current automation level of payment operations.',
    impact: 'Manual collection is labor-intensive and error-prone — each step not automated costs admin hours.',
    options: [
      { id: 'manual', label: 'Manual (standing orders / bank transfers)' },
      { id: 'semi', label: 'Semi-automated (GoCardless / DD)' },
      { id: 'digital', label: 'Fully digital (Stripe / payment portal)' },
    ]
  },
  {
    key: 'vendorStack',
    title: 'Current Vendor Stack',
    icon: Layers,
    section: 'payments',
    why: 'Multiple vendors = multiple contracts, logins, reconciliation points.',
    impact: 'Consolidating payment + screening + deposits + guarantees into one platform reduces complexity and cost.',
    options: [
      { id: '1', label: '1 vendor' },
      { id: '2-3', label: '2 – 3 vendors' },
      { id: '4+', label: '4+ vendors' },
    ]
  },
  {
    key: 'depositHandling',
    title: 'Deposit Handling',
    icon: Wallet,
    section: 'payments',
    why: 'Deposit method affects tenant conversion and capital efficiency.',
    impact: 'Government schemes lock up capital; large upfront deposits deter international tenants.',
    options: [
      { id: 'dps', label: 'Government scheme (DPS)' },
      { id: 'third-party', label: 'Third-party (Flatfair / Housing Hand)' },
      { id: 'none', label: 'No deposits' },
      { id: 'large', label: 'Large upfront (3+ months)' },
    ]
  },
  // Section D: Cash Flow Health
  {
    key: 'latePaymentRate',
    title: 'Late Payment Rate',
    icon: TrendingDown,
    section: 'cashflow',
    why: 'Late payments create cash flow drag and admin overhead.',
    impact: 'Every late payment is interest-free credit given to the tenant — and a collection cost for you.',
    options: [
      { id: '<5', label: '< 5%' },
      { id: '5-15', label: '5 – 15%' },
      { id: '15+', label: '15%+' },
    ]
  },
  {
    key: 'cashFlowPressure',
    title: 'Cash Flow Pressure',
    icon: Banknote,
    section: 'cashflow',
    why: 'Cash flow pressure indicates how urgently guaranteed payouts are needed.',
    impact: 'Operators with investor obligations face structural cash flow risk that payment timing can\'t solve.',
    options: [
      { id: 'comfortable', label: 'Comfortable' },
      { id: 'some', label: 'Some pressure (seasonal gaps)' },
      { id: 'significant', label: 'Significant (must pay owners regardless)' },
    ]
  },
];

type PillarId = 'occupancy' | 'paymentOps' | 'cashFlow';

interface PillarScores {
  occupancy: number;
  paymentOps: number;
  cashFlow: number;
  primary: PillarId;
  fitScore: number;
}

function computePillarScores(answers: Record<string, string>): PillarScores {
  // Occupancy score
  let occupancy = 0;
  if (answers.occupancyRate === '<80') occupancy += 50;
  else if (answers.occupancyRate === '80-90') occupancy += 25;
  if (answers.voidDuration === '21+') occupancy += 30;
  else if (answers.voidDuration === '7-21') occupancy += 15;
  if (answers.tenantMix === 'international') occupancy += 20;
  else if (answers.tenantMix === 'mixed') occupancy += 10;
  if (answers.ownershipModel === 'own') occupancy += 10;

  // Payment Ops score
  let paymentOps = 0;
  if (answers.collectionMethod === 'manual') paymentOps += 40;
  else if (answers.collectionMethod === 'semi') paymentOps += 20;
  if (answers.vendorStack === '4+') paymentOps += 30;
  else if (answers.vendorStack === '2-3') paymentOps += 15;
  if (answers.depositHandling === 'dps') paymentOps += 20;
  else if (answers.depositHandling === 'large') paymentOps += 15;
  else if (answers.depositHandling === 'third-party') paymentOps += 10;
  if (answers.ownershipModel === 'manage') paymentOps += 10;
  // Portfolio scale amplifies ops pain
  if (answers.portfolioSize === '2000+') paymentOps += 15;
  else if (answers.portfolioSize === '500-2000') paymentOps += 10;
  else if (answers.portfolioSize === '100-500') paymentOps += 5;

  // Cash Flow score
  let cashFlow = 0;
  if (answers.latePaymentRate === '15+') cashFlow += 40;
  else if (answers.latePaymentRate === '5-15') cashFlow += 20;
  if (answers.cashFlowPressure === 'significant') cashFlow += 40;
  else if (answers.cashFlowPressure === 'some') cashFlow += 20;
  if (answers.ownershipModel === 'lease') cashFlow += 20;
  else if (answers.ownershipModel === 'hybrid') cashFlow += 10;
  // Larger portfolio = more capital at risk
  if (answers.portfolioSize === '2000+') cashFlow += 10;
  else if (answers.portfolioSize === '500-2000') cashFlow += 5;

  // Primary pain — tie-break: cashFlow > paymentOps > occupancy
  let primary: PillarId = 'cashFlow';
  if (occupancy > paymentOps && occupancy > cashFlow) primary = 'occupancy';
  else if (paymentOps > occupancy && paymentOps > cashFlow) primary = 'paymentOps';
  else if (cashFlow >= paymentOps && cashFlow >= occupancy) primary = 'cashFlow';
  else if (paymentOps >= occupancy) primary = 'paymentOps';

  // Sort pillars by score descending
  const sorted = [
    { id: 'occupancy' as PillarId, score: occupancy },
    { id: 'paymentOps' as PillarId, score: paymentOps },
    { id: 'cashFlow' as PillarId, score: cashFlow },
  ].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tie-break order
    const order: PillarId[] = ['cashFlow', 'paymentOps', 'occupancy'];
    return order.indexOf(a.id) - order.indexOf(b.id);
  });

  // Weighted average: primary 50%, secondary 30%, tertiary 20%
  const fitScore = Math.min(100, Math.round(
    sorted[0].score * 0.5 + sorted[1].score * 0.3 + sorted[2].score * 0.2
  ));

  return { occupancy, paymentOps, cashFlow, primary, fitScore };
}

const PILLAR_LABELS: Record<PillarId, string> = {
  occupancy: 'Occupancy Challenge',
  paymentOps: 'Payment Ops Challenge',
  cashFlow: 'Cash Flow Challenge',
};

const PILLAR_COLORS: Record<PillarId, { text: string; bg: string; border: string; bar: string }> = {
  occupancy: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/40', bar: 'bg-amber-500' },
  paymentOps: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/40', bar: 'bg-blue-500' },
  cashFlow: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/40', bar: 'bg-rose-500' },
};

const OWNERSHIP_LABELS: Record<string, string> = {
  own: 'Developer/Owner',
  lease: 'Operator (leases)',
  manage: 'Property Manager',
  hybrid: 'Hybrid',
};

const OWNERSHIP_INSIGHTS: Record<string, string> = {
  own: 'Owns buildings → occupancy risk elevated (must fill to justify capex)',
  lease: 'Leases from investors → cash flow risk elevated (must pay owners regardless)',
  manage: 'Manages for investors → payment ops efficiency is critical',
  hybrid: 'Hybrid model → both occupancy and cash flow pressures',
};

const TIER_INFO: Record<PillarId, { name: string; rate: string; tagline: string; features: string[]; }> = {
  occupancy: {
    name: 'COVER',
    rate: '1.5%',
    tagline: 'Guarantee + deposit elimination opens new tenant demographics',
    features: [
      'Everything in PAYMENTS',
      'Rent guarantee — covered if tenant defaults',
      'Deposit elimination — remove barriers for international tenants',
      'Credit building — tenants build credit history through rent',
    ],
  },
  paymentOps: {
    name: 'PAYMENTS',
    rate: '1.0%',
    tagline: 'Collection + screening + automation in one platform',
    features: [
      'AI invoicing gateway — zero manual work',
      'Automated rent collection & reminders',
      'Tenant screening integrated',
      'Email alias integration (@casapay.me)',
    ],
  },
  cashFlow: {
    name: 'ON-TIME',
    rate: '2.5%',
    tagline: 'Guaranteed payout on due date, regardless of tenant timing',
    features: [
      'Everything in COVER',
      'Guaranteed payout on the 1st — no matter when tenants pay',
      'Cash flow protection — eliminate receivables risk',
      'Predictable revenue for investor reporting',
    ],
  },
};

export default function ProspectQualifier() {
  const [currentStep, setCurrentStep] = useState(0);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [talkTrackOpen, setTalkTrackOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({
    portfolioSize: '',
    ownershipModel: '',
    tenantMix: '',
    occupancyRate: '',
    voidDuration: '',
    collectionMethod: '',
    vendorStack: '',
    depositHandling: '',
    latePaymentRate: '',
    cashFlowPressure: '',
  });

  const handleAnswer = (key: string, value: string, index: number) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
    if (index === activeQuestionIndex) {
      setActiveQuestionIndex(prev => Math.min(prev + 1, QUESTIONS.length - 1));
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const pillarScores = useMemo(() => computePillarScores(answers), [answers]);

  const scale = answers.portfolioSize === '2000+' ? 30 : answers.portfolioSize === '500-2000' ? 10 : answers.portfolioSize === '100-500' ? 3 : 1;
  const avgRent = 850; // EUR/month assumed average

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Left sidebar */}
            <div className="lg:w-80 shrink-0 flex flex-col items-center justify-center glass-card p-6 rounded-3xl border border-white/10 bg-white/5">
              {/* Fit Score gauge */}
              <div className="relative w-48 h-48 flex items-center justify-center mb-6">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
                  <circle
                    cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent"
                    strokeDasharray={2 * Math.PI * 88}
                    strokeDashoffset={2 * Math.PI * 88 * (1 - pillarScores.fitScore / 100)}
                    className={`${pillarScores.fitScore > 75 ? 'text-emerald-500' : pillarScores.fitScore > 50 ? 'text-blue-500' : 'text-amber-500'} transition-all duration-1000 ease-out`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-black text-white">{pillarScores.fitScore}</span>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Fit Score</span>
                </div>
                <div className={`absolute -inset-2 rounded-full blur-2xl opacity-20 ${pillarScores.fitScore > 75 ? 'bg-emerald-500' : pillarScores.fitScore > 50 ? 'bg-blue-500' : 'bg-amber-500'}`} />
              </div>

              {/* Pillar bars */}
              <div className="w-full space-y-3 mb-5">
                {([
                  { id: 'occupancy' as PillarId, label: 'Occupancy Pain', score: pillarScores.occupancy },
                  { id: 'paymentOps' as PillarId, label: 'Payment Ops Pain', score: pillarScores.paymentOps },
                  { id: 'cashFlow' as PillarId, label: 'Cash Flow Pain', score: pillarScores.cashFlow },
                ]).map(p => (
                  <div key={p.id} className="space-y-1">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                      <span className={PILLAR_COLORS[p.id].text}>{p.label}</span>
                      <span className="text-slate-400">{p.score}/100</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div
                        className={`h-full ${PILLAR_COLORS[p.id].bar} transition-all duration-700 ease-out rounded-full`}
                        style={{ width: `${p.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Primary pain badge */}
              <div className={`w-full px-3 py-2 rounded-xl ${PILLAR_COLORS[pillarScores.primary].bg} ${PILLAR_COLORS[pillarScores.primary].border} border text-center mb-3`}>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Primary Pain</p>
                <p className={`text-xs font-black ${PILLAR_COLORS[pillarScores.primary].text}`}>
                  {PILLAR_LABELS[pillarScores.primary]}
                </p>
              </div>

              {/* Ownership model indicator */}
              {answers.ownershipModel && (
                <div className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-center">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Ownership</p>
                  <p className="text-[10px] text-slate-300 font-medium leading-tight">
                    {OWNERSHIP_INSIGHTS[answers.ownershipModel]}
                  </p>
                </div>
              )}
            </div>

            {/* Question grid */}
            <div className="flex-1 space-y-4">
              {SECTIONS.map(section => {
                const sectionQuestions = QUESTIONS.map((q, globalIdx) => ({ ...q, globalIdx })).filter(q => q.section === section.id);
                if (sectionQuestions.length === 0) return null;

                return (
                  <div key={section.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${section.id === 'portfolio' ? 'bg-slate-400' : section.id === 'occupancy' ? 'bg-amber-400' : section.id === 'payments' ? 'bg-blue-400' : 'bg-rose-400'}`} />
                      <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${section.color}`}>{section.label}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                      {sectionQuestions.map(q => {
                        const i = q.globalIdx;
                        const isVisible = i <= activeQuestionIndex;
                        const Icon = q.icon;
                        const isAnswered = !!answers[q.key];

                        // Determine if this question contributes to its pillar's pain
                        const pillarActive = section.id === 'occupancy' ? pillarScores.occupancy > 20
                          : section.id === 'payments' ? pillarScores.paymentOps > 20
                          : section.id === 'cashflow' ? pillarScores.cashFlow > 20
                          : false;

                        const sectionStyle = section.id === 'portfolio'
                          ? { activeClass: section.activeClass, dotClass: section.dotClass, borderHover: 'hover:border-slate-400/30 hover:bg-slate-500/5' }
                          : { activeClass: section.activeClass, dotClass: section.dotClass, borderHover: section.id === 'occupancy' ? 'hover:border-amber-500/30 hover:bg-amber-500/5' : section.id === 'payments' ? 'hover:border-blue-500/30 hover:bg-blue-500/5' : 'hover:border-rose-500/30 hover:bg-rose-500/5' };

                        if (!isVisible) {
                          return (
                            <div key={q.key} className="glass-card p-2 rounded-xl border border-white/5 bg-white/[0.01] h-[163px] flex items-center justify-center transition-all duration-500">
                              <div className="w-16 h-16 rounded-full border border-white/20 flex flex-col items-center justify-center bg-white/5">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Step</span>
                                <span className="text-xl font-black text-slate-400">{String(i + 1).padStart(2, '0')}</span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={q.key}
                            className={`glass-card p-2 rounded-xl border bg-white/5 relative z-0 hover:z-10 transition-[border-color] animate-in zoom-in duration-500 ${
                              isAnswered && pillarActive && section.id !== 'portfolio' ? section.accent : 'border-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg ${section.id === 'portfolio' ? 'bg-slate-500/20 text-slate-400' : section.id === 'occupancy' ? 'bg-amber-500/20 text-amber-400' : section.id === 'payments' ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                  <Icon size={16} />
                                </div>
                                <h3 className="text-xs font-black text-slate-200 uppercase tracking-tight">{q.title}</h3>
                              </div>
                              <QuestionTooltip why={q.why} impact={q.impact} position={i < 5 ? 'bottom' : 'top'} />
                            </div>
                            <div className="space-y-1.5">
                              {q.options.map(opt => (
                                <label
                                  key={opt.id}
                                  className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                                    answers[q.key] === opt.id
                                      ? sectionStyle.activeClass
                                      : `bg-white/5 border-transparent text-slate-400 ${sectionStyle.borderHover}`
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold leading-tight">{opt.label}</span>
                                  </div>
                                  <input
                                    type="radio"
                                    name={q.key}
                                    className="hidden"
                                    checked={answers[q.key] === opt.id}
                                    onChange={() => handleAnswer(q.key, opt.id, i)}
                                  />
                                  <div className={`w-3 h-3 rounded-full border-2 ${
                                    answers[q.key] === opt.id ? sectionStyle.dotClass : 'border-slate-600'
                                  }`} />
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 1: {
        const primary = pillarScores.primary;
        const unitCount = answers.portfolioSize === '2000+' ? 3000 : answers.portfolioSize === '500-2000' ? 1000 : answers.portfolioSize === '100-500' ? 300 : 80;

        // Revenue impact calculations
        const voidDays = answers.voidDuration === '21+' ? 28 : answers.voidDuration === '7-21' ? 14 : 5;
        const occupancyPct = answers.occupancyRate === '<80' ? 0.75 : answers.occupancyRate === '80-90' ? 0.85 : 0.94;
        const vacancyLoss = Math.round(unitCount * (1 - occupancyPct) * avgRent * 12);
        const voidLoss = Math.round(unitCount * 0.3 * (voidDays / 30) * avgRent); // 30% turnover annually

        const lateRate = answers.latePaymentRate === '15+' ? 0.20 : answers.latePaymentRate === '5-15' ? 0.10 : 0.03;
        const cashFlowDrag = Math.round(unitCount * avgRent * lateRate * 12 * 0.15); // 15% cost of late = interest + admin

        const adminHoursBase = answers.portfolioSize === '2000+' ? 400 : answers.portfolioSize === '500-2000' ? 160 : answers.portfolioSize === '100-500' ? 60 : 20;
        const manualMultiplier = answers.collectionMethod === 'manual' ? 1.5 : answers.collectionMethod === 'semi' ? 1.2 : 1;
        const vendorMultiplier = answers.vendorStack === '4+' ? 1.3 : answers.vendorStack === '2-3' ? 1.1 : 1;
        const adminHours = Math.round(adminHoursBase * manualMultiplier * vendorMultiplier);

        const vendorCostMonthly = answers.vendorStack === '4+' ? unitCount * 8 : answers.vendorStack === '2-3' ? unitCount * 5 : unitCount * 2;

        // Pain-specific narratives (internal — briefing the rep)
        const narratives: Record<PillarId, string> = {
          occupancy: `They're losing ~€${vacancyLoss.toLocaleString()}/year to vacant units. ${answers.voidDuration === '21+' ? '21+' : answers.voidDuration === '7-21' ? '7–21' : '<7'} day average voids, ${answers.occupancyRate === '<80' ? 'sub-80%' : answers.occupancyRate === '80-90' ? '80–90%' : '90%+'} occupancy — every empty day costs €${Math.round(avgRent / 30)}/unit. ${answers.tenantMix === 'international' ? 'Heavy international tenant mix means deposit/guarantor barriers are blocking conversions.' : ''}`,
          paymentOps: `Running ${answers.vendorStack === '4+' ? '4+' : answers.vendorStack === '2-3' ? '2–3' : '1'} separate systems for what should be one workflow. ~${adminHours}h/month burned on reconciliation and chasing. ${answers.depositHandling === 'dps' ? 'DPS deposit compliance is also tying up their capital.' : ''}`,
          cashFlow: `${answers.latePaymentRate === '15+' ? '15%+' : answers.latePaymentRate === '5-15' ? '5–15%' : '<5%'} late payments, ${answers.cashFlowPressure === 'significant' ? 'significant cash flow pressure' : answers.cashFlowPressure === 'some' ? 'seasonal cash flow gaps' : 'manageable cash flow'}. They're effectively giving tenants interest-free credit — ~€${cashFlowDrag.toLocaleString()}/year in cash flow drag.`,
        };

        const impactCards: Record<PillarId, { label: string; val: string; desc: string }[]> = {
          occupancy: [
            { label: 'Vacancy Cost', val: `€${vacancyLoss.toLocaleString()}/yr`, desc: 'Revenue lost to empty units' },
            { label: 'Void Days', val: `${voidDays} avg`, desc: `€${Math.round(avgRent / 30)}/unit/day lost` },
            { label: 'Conversion Risk', val: answers.tenantMix === 'international' ? 'High' : 'Moderate', desc: 'Deposit barriers blocking applicants' },
          ],
          paymentOps: [
            { label: 'Admin Hours/Mo', val: `${adminHours}h`, desc: 'Reconciliation & vendor management' },
            { label: 'Vendor Costs', val: `€${vendorCostMonthly.toLocaleString()}/mo`, desc: `${answers.vendorStack === '4+' ? '4+' : answers.vendorStack === '2-3' ? '2–3' : '1'} platform(s) × per-unit fees` },
            { label: 'Error Risk', val: answers.collectionMethod === 'manual' ? 'High' : 'Moderate', desc: 'Manual process = reconciliation gaps' },
          ],
          cashFlow: [
            { label: 'Cash Flow Drag', val: `€${cashFlowDrag.toLocaleString()}/yr`, desc: 'Late payment cost (interest + admin)' },
            { label: 'Late Rate', val: `${Math.round(lateRate * 100)}%`, desc: 'Tenants paying after due date' },
            { label: 'Obligation Risk', val: answers.ownershipModel === 'lease' ? 'Critical' : answers.cashFlowPressure === 'significant' ? 'High' : 'Moderate', desc: 'Gap between inflows and fixed outflows' },
          ],
        };

        return (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* Hero: pain diagnosis */}
            <div className="glass-card p-8 rounded-3xl border border-white/10 bg-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <BarChart3 size={140} />
              </div>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${PILLAR_COLORS[primary].bg} ${PILLAR_COLORS[primary].border} border mb-4`}>
                <AlertCircle size={12} className={PILLAR_COLORS[primary].text} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${PILLAR_COLORS[primary].text}`}>{PILLAR_LABELS[primary]}</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-3">
                Their #1 pain: {PILLAR_LABELS[primary]}
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed max-w-3xl font-medium">
                {narratives[primary]}
              </p>
            </div>

            {/* Ownership callout for lease operators */}
            {answers.ownershipModel === 'lease' && (
              <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex items-start gap-4">
                <Building2 className="text-rose-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-sm font-bold text-rose-300">Structural Cash Flow Risk</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    This operator leases from investors — cash flow risk is structurally higher. They must pay owners on the 1st regardless of when tenants pay. Guaranteed payouts are critical, not optional.
                  </p>
                </div>
              </div>
            )}

            {/* Impact cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {impactCards[primary].map((card, i) => (
                <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{card.label}</p>
                  <p className="text-2xl font-black text-white">{card.val}</p>
                  <p className="text-[10px] text-slate-400 mt-2">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 2: {
        const primary = pillarScores.primary;
        const tier = TIER_INFO[primary];
        const unitCount = answers.portfolioSize === '2000+' ? 3000 : answers.portfolioSize === '500-2000' ? 1000 : answers.portfolioSize === '100-500' ? 300 : 80;

        const casapayRate = primary === 'cashFlow' ? 0.025 : primary === 'occupancy' ? 0.015 : 0.01;
        const casapayCost = Math.round(unitCount * avgRent * casapayRate);
        const depositCapital = primary !== 'paymentOps' ? Math.round(unitCount * avgRent * 1.5) : 0;

        // Talk track calculations
        const occupancyPct = answers.occupancyRate === '<80' ? 75 : answers.occupancyRate === '80-90' ? 85 : 94;
        const voidDays = answers.voidDuration === '21+' ? 28 : answers.voidDuration === '7-21' ? 14 : 5;
        const vacancyLoss = Math.round(unitCount * ((100 - occupancyPct) / 100) * avgRent * 12);
        const vendorCount = answers.vendorStack === '4+' ? '4+' : answers.vendorStack === '2-3' ? '2–3' : '1';
        const adminHoursBase = answers.portfolioSize === '2000+' ? 400 : answers.portfolioSize === '500-2000' ? 160 : answers.portfolioSize === '100-500' ? 60 : 20;
        const manualMult = answers.collectionMethod === 'manual' ? 1.5 : answers.collectionMethod === 'semi' ? 1.2 : 1;
        const vendorMult = answers.vendorStack === '4+' ? 1.3 : answers.vendorStack === '2-3' ? 1.1 : 1;
        const adminHours = Math.round(adminHoursBase * manualMult * vendorMult);
        const lateRatePct = answers.latePaymentRate === '15+' ? 20 : answers.latePaymentRate === '5-15' ? 10 : 3;
        const cashFlowDrag = Math.round(unitCount * avgRent * (lateRatePct / 100) * 12 * 0.15);
        const monthlyRent = unitCount * avgRent;

        // "Today" column mappings
        const todayCollection = answers.collectionMethod === 'manual' ? 'Manual bank transfers' : answers.collectionMethod === 'semi' ? 'GoCardless / DD' : 'Stripe / portal';
        const todayVendors = answers.vendorStack === '4+' ? '4+ separate platforms' : answers.vendorStack === '2-3' ? '2–3 vendors' : 'Single vendor';
        const todayDeposits = answers.depositHandling === 'dps' ? 'DPS (capital locked)' : answers.depositHandling === 'large' ? '3+ months upfront' : answers.depositHandling === 'third-party' ? 'Flatfair / Housing Hand' : 'No deposits';
        const todayLate = answers.latePaymentRate === '<5' ? '<5% — minimal' : answers.latePaymentRate === '5-15' ? '5–15% — regular chasing' : '15%+ — constant collections';

        // "With CasaPay" column mappings (tier-dependent)
        const withDeposit = primary === 'paymentOps' ? 'Managed digitally' : 'Eliminated';
        const withGuarantee = primary === 'paymentOps' ? 'Not included' : primary === 'occupancy' ? 'Covered if default' : 'Paid on the 1st regardless';
        const withLate = primary === 'paymentOps' ? 'Automated reminders' : primary === 'occupancy' ? 'Automated + covered' : 'Irrelevant — you\'re paid on time';

        // Value props per tier
        const operatorProps: Record<PillarId, string[]> = {
          paymentOps: ['Eliminate admin overhead', `One platform replaces ${vendorCount} vendors`, 'Automated reconciliation', 'Screening built in'],
          occupancy: ['Fill units faster (zero deposit)', 'Access international/student market', 'Covered if tenant defaults', 'One platform for everything'],
          cashFlow: ['Guaranteed cash flow on the 1st', 'Pay investors on time every time', 'Eliminate receivables risk', 'Predictable revenue'],
        };

        const tenantProps: Record<PillarId, string[]> = {
          paymentOps: ['Pay rent digitally', 'Clear payment history', 'Multi-currency'],
          occupancy: ['No deposit required', 'Build credit through rent', 'Faster move-in'],
          cashFlow: ['No deposit', 'Build credit', 'Flexible payment timing', 'Better relationship with landlord'],
        };

        // Talk track content
        const openingLines: Record<PillarId, string> = {
          occupancy: `You told us occupancy is at ${occupancyPct}% with ${voidDays}-day voids — that's roughly €${vacancyLoss.toLocaleString()}/year in lost revenue.`,
          paymentOps: `You're running ${vendorCount} platforms to do what should be one workflow — that's ~${adminHours}h/month in admin alone.`,
          cashFlow: `With ${lateRatePct}% late payments${answers.ownershipModel === 'lease' ? ' and investor obligations' : ''}, you're giving tenants interest-free credit worth ~€${cashFlowDrag.toLocaleString()}/year.`,
        };

        const pitchLines: Record<PillarId, string> = {
          occupancy: 'COVER eliminates deposits entirely — that\'s the #1 barrier for international tenants. Same guarantee coverage, zero friction for the tenant.',
          paymentOps: `At 1%, we replace your entire stack. One login, automated collection, screening included.`,
          cashFlow: 'ON-TIME means you get paid on the 1st, full stop. Doesn\'t matter if the tenant pays late — we cover the gap. For an operator leasing from investors, that\'s not a nice-to-have.',
        };

        const objections: Record<PillarId, string[]> = {
          paymentOps: [
            'If they say "we already have GoCardless" → "GoCardless handles collection, but you still need separate screening, deposits, and guarantee. We\'re all-in at 1%."',
            'If they say "switching costs are high" → "We migrate in weeks, not months. White-label means tenants see your brand, not ours."',
          ],
          occupancy: [
            'If they say "deposits protect us" → "DPS locks your capital and deters international tenants. Our guarantee covers more and costs nothing upfront."',
            'If they say "our occupancy is fine" → "Fine isn\'t full. Every day a unit sits empty at €' + Math.round(avgRent / 30) + '/day, that\'s money left on the table."',
          ],
          cashFlow: [
            `If they say "2.5% is expensive" → "Run the numbers: ${lateRatePct}% late payments on €${monthlyRent.toLocaleString()}/mo = €${cashFlowDrag.toLocaleString()}/year in cash flow drag. ON-TIME costs €${casapayCost.toLocaleString()}/mo but guarantees €${monthlyRent.toLocaleString()}/mo lands on time."`,
            'If they say "we can chase tenants ourselves" → "You can, at ' + adminHours + 'h/month in admin. ON-TIME means zero chasing — we guarantee the payout."',
          ],
        };

        const closingLine = `Based on your ${unitCount} units at ~€${avgRent}/mo, that's €${casapayCost.toLocaleString()}/mo all-in. Want me to set up a pilot?`;

        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
            {/* 1. Tier Recommendation Banner */}
            <div className={`p-5 rounded-2xl border ${PILLAR_COLORS[primary].border} ${PILLAR_COLORS[primary].bg}`}>
              <div className="flex items-center gap-3">
                <ShieldCheck size={20} className={PILLAR_COLORS[primary].text} />
                <div>
                  <p className="text-lg font-black text-white">
                    Recommended: {tier.name} <span className="text-slate-400 font-bold">({tier.rate})</span>
                    <span className="text-sm font-medium text-slate-400 ml-2">— {tier.tagline}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Based on <span className={PILLAR_COLORS[primary].text}>{PILLAR_LABELS[primary].toLowerCase()}</span>
                    {answers.ownershipModel && <> + <span className="text-slate-300">{OWNERSHIP_LABELS[answers.ownershipModel]?.toLowerCase()}</span> model</>}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Before / After Comparison Table */}
            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/5">
                    <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest p-3 w-1/4">Dimension</th>
                    <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest p-3 w-[37.5%]">Today</th>
                    <th className={`text-left text-[10px] font-black uppercase tracking-widest p-3 w-[37.5%] ${PILLAR_COLORS[primary].text}`}>With CasaPay {tier.name}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr>
                    <td className="p-3 text-xs font-bold text-slate-400">Rent Collection</td>
                    <td className="p-3 text-xs text-slate-300">{todayCollection}</td>
                    <td className={`p-3 text-xs font-medium ${PILLAR_COLORS[primary].text}`}>Automated AI gateway</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-xs font-bold text-slate-400">Vendor Stack</td>
                    <td className="p-3 text-xs text-slate-300">{todayVendors}</td>
                    <td className={`p-3 text-xs font-medium ${PILLAR_COLORS[primary].text}`}>Single platform</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-xs font-bold text-slate-400">Deposits</td>
                    <td className="p-3 text-xs text-slate-300">{todayDeposits}</td>
                    <td className={`p-3 text-xs font-medium ${PILLAR_COLORS[primary].text}`}>{withDeposit}</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-xs font-bold text-slate-400">Guarantee</td>
                    <td className="p-3 text-xs text-slate-300">None</td>
                    <td className={`p-3 text-xs font-medium ${PILLAR_COLORS[primary].text}`}>{withGuarantee}</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-xs font-bold text-slate-400">Late Payments</td>
                    <td className="p-3 text-xs text-slate-300">{todayLate}</td>
                    <td className={`p-3 text-xs font-medium ${PILLAR_COLORS[primary].text}`}>{withLate}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 3. Value Props — Operator + Tenant Side-by-Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">For the Operator</p>
                <ul className="space-y-2">
                  {operatorProps[primary].map((prop, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className={`mt-1 shrink-0 w-1.5 h-1.5 rounded-full ${PILLAR_COLORS[primary].bar}`} />
                      <span className="text-sm text-slate-200 font-medium">{prop}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">For the Tenant</p>
                <ul className="space-y-2">
                  {tenantProps[primary].map((prop, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-sm text-slate-200 font-medium">{prop}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 4. Talk Track Bullets (collapsible) */}
            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <button
                onClick={() => setTalkTrackOpen(!talkTrackOpen)}
                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/[0.07] transition-colors"
              >
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Talk Track</span>
                <ChevronDown size={16} className={`text-slate-500 transition-transform ${talkTrackOpen ? 'rotate-180' : ''}`} />
              </button>
              {talkTrackOpen && (
                <div className="p-5 space-y-5 border-t border-white/5">
                  {/* Opening */}
                  <div>
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Opening Line</p>
                    <p className="text-sm text-slate-200 leading-relaxed italic">&ldquo;{openingLines[primary]}&rdquo;</p>
                  </div>

                  {/* The Pitch */}
                  <div>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">The Pitch</p>
                    <p className="text-sm text-slate-200 leading-relaxed italic">&ldquo;{pitchLines[primary]}&rdquo;</p>
                  </div>

                  {/* Objection Pre-empts */}
                  <div>
                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2">Objection Pre-empts</p>
                    <ul className="space-y-2">
                      {objections[primary].map((obj, i) => (
                        <li key={i} className="text-xs text-slate-300 leading-relaxed pl-3 border-l-2 border-white/10">{obj}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Closing */}
                  <div>
                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">Closing Line</p>
                    <p className="text-sm text-slate-200 leading-relaxed italic">&ldquo;{closingLine}&rdquo;</p>
                  </div>
                </div>
              )}
            </div>

            {/* 5. Financial Context (compact) */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-xs text-slate-300">
                <span className="font-bold text-white">CasaPay {tier.name} fee:</span> €{casapayCost.toLocaleString()}/mo
                <span className="text-slate-500"> ({tier.rate} × {unitCount} units × €{avgRent} avg rent)</span>
              </p>
              {depositCapital > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  <span className="font-bold text-slate-300">Deposit capital released:</span> €{depositCapital.toLocaleString()}
                  <span className="text-slate-500"> (currently locked in {todayDeposits.toLowerCase()})</span>
                </p>
              )}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="text-slate-200 font-sans antialiased overflow-hidden selection:bg-blue-500/30 flex flex-col p-4 md:p-6">
      <main className="flex-1 flex flex-col max-w-6xl mx-auto w-full overflow-y-auto custom-scrollbar space-y-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Prospect Qualifier</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Qualify operators through problem validation, financial impact &amp; solution fit</p>
        </div>
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500 ease-out shadow-[0_0_15px_rgba(16,185,129,0.6)]"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="flex-1">
          {renderStep()}
        </div>

        <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/5">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-xs transition-all ${
              currentStep === 0 ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ChevronLeft size={16} />
            PREVIOUS STEP
          </button>

          <div className="flex gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${currentStep === i ? 'bg-slate-400 w-4' : 'bg-white/10'}`}
              />
            ))}
          </div>

          <button
            onClick={nextStep}
            disabled={currentStep === STEPS.length - 1}
            className={`flex items-center gap-2 px-8 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${
              currentStep === STEPS.length - 1
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-slate-200 text-slate-950 hover:bg-white shadow-lg shadow-white/10'
            }`}
          >
            {currentStep === STEPS.length - 1 ? 'End of Deck' : 'NEXT STEP'}
            <ChevronRight size={16} />
          </button>
        </div>
      </main>
    </div>
  );
}
