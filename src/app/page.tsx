"use client";

import { useState, useEffect } from 'react';
import Sidebar, { type ToolId } from '@/components/Sidebar';
import ProspectQualifier from '@/components/tools/ProspectQualifier';
import SalesTargetCalculator from '@/components/tools/SalesTargetCalculator';
import UnitEconomics from '@/components/tools/UnitEconomics';
import TrainingSimulator from '@/components/tools/TrainingSimulator';

const PASS = 'CP2143@';
const STORAGE_KEY = 'cp-auth';

function useAuth() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === '1') setAuthed(true);
  }, []);
  const login = (pw: string) => {
    if (pw === PASS) { sessionStorage.setItem(STORAGE_KEY, '1'); setAuthed(true); return true; }
    return false;
  };
  return { authed, login };
}

function LockScreen({ onLogin }: { onLogin: (pw: string) => boolean }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!onLogin(pw)) { setError(true); setPw(''); } };
  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
      <form onSubmit={submit} className="w-72 space-y-4 text-center" autoComplete="on">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto">
          <span className="text-emerald-400 font-black text-lg">CP</span>
        </div>
        <p className="text-sm font-bold text-white">CasaPay Sales Tools</p>
        <input type="text" name="username" autoComplete="username" defaultValue="sales" className="hidden" aria-hidden="true" tabIndex={-1} />
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          value={pw}
          onChange={(e) => { setPw(e.target.value); setError(false); }}
          placeholder="Password"
          autoFocus
          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/40"
        />
        {error && <p className="text-[10px] text-red-400 font-bold">Wrong password</p>}
        <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-widest hover:bg-emerald-500/30 transition-colors">
          Enter
        </button>
      </form>
    </div>
  );
}

export default function Home() {
  const { authed, login } = useAuth();
  const [currentTool, setCurrentTool] = useState<ToolId>('prospect');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  if (!authed) return <LockScreen onLogin={login} />;

  return (
    <div className="min-h-screen bg-[#0F172A] flex">
      <Sidebar
        currentTool={currentTool}
        onSelectTool={setCurrentTool}
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
      />
      <main className="flex-1 overflow-y-auto">
        {currentTool === 'prospect' && <ProspectQualifier />}
        {currentTool === 'calculator' && <SalesTargetCalculator />}
        {currentTool === 'unit-economics' && <UnitEconomics />}
        {currentTool === 'training' && <TrainingSimulator />}
      </main>
    </div>
  );
}
