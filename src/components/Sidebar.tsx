"use client";

import { Users2, BarChart3, PieChart, Mic, Activity, Map, ChevronLeft, ChevronRight } from 'lucide-react';

export type ToolId = 'prospect' | 'calculator' | 'unit-economics' | 'training' | 'cascade' | 'roadmap';

interface SidebarProps {
  currentTool: ToolId;
  onSelectTool: (tool: ToolId) => void;
  expanded: boolean;
  onToggle: () => void;
}

const TOOLS: { id: ToolId; label: string; icon: typeof Users2 }[] = [
  { id: 'prospect', label: 'Prospect Qualifier', icon: Users2 },
  { id: 'unit-economics', label: 'Unit Economics', icon: PieChart },
  { id: 'calculator', label: 'Sales Calculator', icon: BarChart3 },
  { id: 'training', label: 'Training Simulator', icon: Mic },
  { id: 'cascade', label: 'Performance', icon: Activity },
  { id: 'roadmap', label: 'Sales Roadmap', icon: Map },
];

export default function Sidebar({ currentTool, onSelectTool, expanded, onToggle }: SidebarProps) {
  return (
    <aside
      className={`${
        expanded ? 'w-64' : 'w-16'
      } shrink-0 h-screen sticky top-0 flex flex-col justify-between transition-all duration-300 border-r border-white/5 bg-white/[0.02] backdrop-blur-xl`}
    >
      {/* Logo area */}
      <div className={`p-4 border-b border-white/5 ${expanded ? '' : 'flex justify-center'}`}>
        <div className={`flex items-center gap-3 ${expanded ? '' : 'justify-center'}`}>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <span className="text-emerald-400 font-black text-sm">CP</span>
          </div>
          {expanded && (
            <span className="text-sm font-bold text-white truncate">CasaPay Sales</span>
          )}
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-2 space-y-1 mt-2">
        {TOOLS.map((tool) => {
          const isActive = currentTool === tool.id;
          const Icon = tool.icon;

          return (
            <button
              key={tool.id}
              onClick={() => onSelectTool(tool.id)}
              className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 ${
                expanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'
              } ${
                isActive
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'border border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              <Icon size={18} className="shrink-0" />
              {expanded && (
                <span className="text-xs font-bold truncate">{tool.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Toggle button */}
      <div className="p-2 border-t border-white/5">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
        >
          {expanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          {expanded && <span className="text-[10px] font-bold uppercase tracking-widest">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
