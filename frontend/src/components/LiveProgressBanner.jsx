import React from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Sparkles, X } from 'lucide-react';

export default function LiveProgressBanner({
  isFetching,
  progressMap,
  students,
  summary,
  onDismissSummary
}) {
  if (!isFetching && !summary) return null;

  return (
    <div className="mb-7 space-y-3">
      {/* Active Sync Progress HUD in Liquid Glass Elevated */}
      {isFetching && (
        <div className="p-4 sm:p-5 rounded-3xl liquid-glass-elevated border border-blue-500/30 transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Live Automation • Synchronizing Student Accounts
              </h3>
            </div>
            <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Active Sync
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mt-2">
            {students.map((student) => {
              const prog = progressMap[student.id] || { status: 'QUEUED', message: 'Starting session...' };
              const isDone = prog.status === 'COMPLETED';
              const isErr = prog.status === 'ERROR';

              return (
                <div
                  key={student.id}
                  className={`p-2.5 rounded-2xl border text-xs flex flex-col justify-between transition-colors ${
                    isDone
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : isErr
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                      : 'liquid-glass-sub text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="truncate">{student.display_name.split(' ')[0]}</span>
                    {isDone ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    ) : isErr ? (
                      <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                    ) : (
                      <RefreshCw className="h-3 w-3 text-blue-500 animate-spin shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] mt-1 text-slate-400 truncate" title={prog.message}>
                    {prog.message}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completion Summary Card */}
      {summary && !isFetching && (
        <div className="p-4 sm:p-5 rounded-3xl liquid-glass border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0 shadow-2xs">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Synchronization Complete
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {summary.total_accounts} Accounts
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{summary.successful_retrievals} synced</span>
                {summary.failed_retrievals > 0 && (
                  <span className="text-rose-500 font-semibold"> • {summary.failed_retrievals} failed</span>
                )}
                <span> • {summary.available_scores} scores updated • {summary.pending_scores} pending</span>
              </p>
            </div>
          </div>

          <button
            onClick={onDismissSummary}
            className="self-end sm:self-auto px-3.5 py-1.5 rounded-xl liquid-glass-sub hover:bg-white/60 dark:hover:bg-white/[0.08] text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
