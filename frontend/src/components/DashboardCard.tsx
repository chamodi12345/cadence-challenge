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

const ACCENT_STYLES: Record<DashboardCardProps['accent'], { bg: string; text: string; ring: string }> = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', ring: 'group-hover:ring-indigo-200' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-600', ring: 'group-hover:ring-teal-200' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'group-hover:ring-amber-200' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'group-hover:ring-emerald-200' },
};

export function DashboardCard({ title, description, to, icon: Icon, accent }: DashboardCardProps) {
  const style = ACCENT_STYLES[accent];

  return (
    <Link
      to={to}
      className="group flex items-start gap-4 rounded-xl border border-blue-800 bg-white p-6
                  transition-all duration-150 hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${style.bg} ${style.text}
                    ring-1 ring-transparent transition ${style.ring}`}
      >
        <Icon size={20} strokeWidth={2} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium text-slate-900 whitespace-nowrap">{title}</h3>
          <ChevronRight
            size={18}
            className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500"
          />
        </div>
        <p className="text-sm text-slate-500 mt-1">{description}</p>
      </div>
    </Link>
  );
}