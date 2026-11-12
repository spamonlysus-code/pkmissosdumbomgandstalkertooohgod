import React from 'react';
import { Users, CheckCircle2, FileCheck2, Clock3, AlertCircle } from 'lucide-react';

export default function OverviewStats({ overview }) {
  const total = overview.total_students || 10;
  const checked = overview.checked_accounts || 0;
  const available = overview.available_results || 0;
  const pending = overview.pending_results || 0;
  const attention = overview.attention_required || 0;

  const stats = [
    {
      label: 'Roster Count',
      value: total,
      sub: 'Active Students',
      icon: Users,
      accent: 'text-blue-500 dark:text-blue-400',
      badge: '10 Accounts'
    },
    {
      label: 'Portal Sync',
      value: `${checked}/${total}`,
      sub: checked === total ? 'All Synchronized' : `${total - checked} Remaining`,
      icon: CheckCircle2,
      accent: checked === total ? 'text-emerald-500 dark:text-emerald-400' : 'text-blue-500 dark:text-blue-400',
      statusDot: checked === total ? 'bg-emerald-500' : 'bg-blue-500'
    },
    {
      label: 'Published Scores',
      value: available,
      sub: 'Exam Results Extracted',
      icon: FileCheck2,
      accent: 'text-emerald-500 dark:text-emerald-400',
      badge: available > 0 ? 'Live Scores' : 'Awaiting'
    },
    {
      label: 'Pending Results',
      value: pending,
      sub: pending > 0 ? 'Evaluating in Portal' : 'None Outstanding',
      icon: Clock3,
      accent: pending > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400',
      statusDot: pending > 0 ? 'bg-amber-500' : null
    },
    {
      label: 'System Status',
      value: attention,
      sub: attention > 0 ? 'Action Needed' : 'All Systems Healthy',
      icon: AlertCircle,
      accent: attention > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400',
      badge: attention === 0 ? 'Operational' : 'Review'
    }
  ];

  return (
    <div className="mb-7 rounded-3xl liquid-glass overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/50 dark:divide-white/[0.06]">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className={`p-4 sm:p-5 flex flex-col justify-between transition-colors hover:bg-white/40 dark:hover:bg-white/[0.02] ${
                idx === 4 ? 'col-span-2 sm:col-span-1' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {stat.label}
                </span>
                <div className="flex items-center gap-1.5">
                  {stat.statusDot && (
                    <span className={`h-1.5 w-1.5 rounded-full ${stat.statusDot}`}></span>
                  )}
                  <Icon className={`h-4 w-4 ${stat.accent}`} />
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums tracking-tight">
                    {stat.value}
                  </span>
                  {stat.badge && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full liquid-glass-sub text-slate-500 dark:text-slate-400">
                      {stat.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                  {stat.sub}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
