// src/components/DashboardCard.tsx
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  description: string;
  to: string;
  icon: LucideIcon;
  accent: 'indigo' | 'teal' | 'amber' | 'emerald';
}

const ACCENT_STYLES: Record<
  DashboardCardProps['accent'],
  { gradient: string; glow: string }
> = {
  indigo: {
    gradient: 'from-indigo-500 to-blue-600',
    glow: 'group-hover:shadow-indigo-500/25',
  },
  teal: {
    gradient: 'from-teal-500 to-cyan-600',
    glow: 'group-hover:shadow-teal-500/25',
  },
  amber: {
    gradient: 'from-amber-500 to-orange-600',
    glow: 'group-hover:shadow-amber-500/25',
  },
  emerald: {
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'group-hover:shadow-emerald-500/25',
  },
};

export function DashboardCard({ title, description, to, icon: Icon, accent }: DashboardCardProps) {
  const style = ACCENT_STYLES[accent];

  return (
    <Link
      to={to}
      className="card card-hover group flex items-start gap-4 p-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-lg shadow-black/30 transition ${style.gradient} ${style.glow}`}
      >
        <Icon size={20} strokeWidth={2} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="whitespace-nowrap font-medium text-slate-100">{title}</h3>
          <ChevronRight
            size={18}
            className="shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-slate-200"
          />
        </div>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </div>
    </Link>
  );
}