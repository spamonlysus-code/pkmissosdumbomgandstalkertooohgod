import React from 'react';
import { RefreshCw, History, Calculator, Atom, Clock, Calendar, CheckCircle2, AlertCircle, Trophy, Sparkles } from 'lucide-react';

export default function StudentCard({
  student,
  rankInfo,
  onRefresh,
  onViewHistory,
  isRefreshing
}) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Retrieved':
        return {
          pill: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
          label: 'Retrieved'
        };
      case 'Result Pending':
      case 'Partial':
        return {
          pill: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          dot: 'bg-amber-500',
          label: status
        };
      case 'Login Failed':
      case 'Error':
      case 'Missing User ID':
      case 'Missing Password':
        return {
          pill: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
          dot: 'bg-rose-500',
          label: status
        };
      default:
        return {
          pill: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20',
          dot: 'bg-slate-400',
          label: 'Not Checked'
        };
    }
  };

  const badge = getStatusBadge(student.last_login_status);
  const math = student.maths;
  const phyChem = student.phy_chem;

  // Calculate PCM Combined Total & Percentile
  const mMarks = (math && math.marks_obtained != null) ? Number(math.marks_obtained) : null;
  const pMarks = (phyChem && phyChem.marks_obtained != null) ? Number(phyChem.marks_obtained) : null;
  const hasBoth = mMarks !== null && pMarks !== null;
  const totalPCM = hasBoth ? (mMarks + pMarks) : (mMarks ?? pMarks ?? null);

  // Format initials
  const getInitials = (name) => {
    if (!name) return 'S';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatLastSync = (ts) => {
    if (!ts) return 'Never checked';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return ts;
    }
  };

  const formatDateBadge = (sortDate, examDate) => {
    if (sortDate && sortDate.length >= 10) {
      try {
        const parts = sortDate.substring(0, 10).split('-');
        if (parts.length === 3) {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const mIdx = parseInt(parts[1], 10) - 1;
          return `${parts[2]} ${months[mIdx] || parts[1]}`;
        }
      } catch (_) {}
    }
    return examDate || '';
  };

  const rank = rankInfo?.rank;
  const percentile = rankInfo?.estimated_percentile;
  const diagnosis = rankInfo?.diagnosis;

  return (
    <div className="group relative flex flex-col justify-between rounded-3xl liquid-glass transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      
      {/* Top Banner / Identity */}
      <div className="p-4 sm:p-5 border-b border-slate-200/50 dark:border-white/[0.06]">
        <div className="flex items-center justify-between gap-3">
          
          <div className="flex items-center space-x-3 min-w-0">
            {/* Liquid Monogram Orb */}
            <div className="relative flex items-center justify-center h-10 w-10 shrink-0 rounded-2xl bg-gradient-to-br from-white/80 to-white/20 dark:from-white/[0.12] dark:to-white/[0.03] border border-white/60 dark:border-white/[0.1] text-slate-800 dark:text-slate-200 font-mono font-bold text-xs shadow-apple-sm">
              {getInitials(student.display_name)}
              <span className="absolute -bottom-1 -right-1 flex items-center justify-center h-4 w-4 rounded-full bg-slate-900 dark:bg-white text-[9px] font-extrabold text-white dark:text-slate-900 shadow-sm">
                {student.slot_number}
              </span>
            </div>

            {/* Student Name */}
            <div className="min-w-0">
              <h3 className="apple-heading font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {student.display_name}
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Clock className="h-3 w-3 text-slate-400" />
                <span className="truncate">{formatLastSync(student.last_checked_at)}</span>
              </p>
            </div>
          </div>

          {/* Rank & Status Badges */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            {rank && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold shadow-apple-sm ${
                rank === 1
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white'
                  : rank === 2
                  ? 'bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 text-slate-900 dark:text-white'
                  : rank === 3
                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white'
                  : 'liquid-glass-sub text-slate-600 dark:text-slate-300'
              }`}>
                {rank === 1 ? '🥇 Rank 1' : rank === 2 ? '🥈 Rank 2' : rank === 3 ? '🥉 Rank 3' : `#${rank}`}
              </span>
            )}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${badge.pill}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`}></span>
              <span>{badge.label}</span>
            </span>
          </div>

        </div>
      </div>

      {/* Middle Scores Section */}
      <div className="p-4 sm:p-5 grid grid-cols-2 gap-3 bg-white/20 dark:bg-black/10">
        
        {/* Paper 1: Mathematics */}
        <div className="p-3.5 rounded-2xl liquid-glass-sub flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
              <span className="flex items-center gap-1.5">
                <Calculator className="h-3.5 w-3.5 text-blue-500" />
                <span>Maths</span>
              </span>
              {math && math.sort_date && (
                <span className="text-[10px] font-mono text-slate-400">
                  {formatDateBadge(math.sort_date, math.exam_date)}
                </span>
              )}
            </div>

            {math ? (
              math.result_status === 'Pending' ? (
                <div className="py-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Pending
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1 truncate" title={math.test_name}>
                    {math.test_name}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums tracking-tight">
                      {math.marks_obtained}
                    </span>
                    <span className="text-[11px] font-semibold font-mono px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {math.percentage}%
                    </span>
                  </div>

                  {/* Liquid Progress Line */}
                  <div className="w-full bg-slate-200/50 dark:bg-white/[0.08] h-1.5 rounded-full mt-2.5 overflow-hidden">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, math.percentage || 0))}%` }}
                    ></div>
                  </div>
                </div>
              )
            ) : (
              <div className="py-2">
                <span className="text-xs text-slate-400 italic">No score recorded</span>
              </div>
            )}
          </div>
        </div>

        {/* Paper 2: Physics + Chemistry */}
        <div className="p-3.5 rounded-2xl liquid-glass-sub flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
              <span className="flex items-center gap-1.5">
                <Atom className="h-3.5 w-3.5 text-emerald-500" />
                <span>Phy+Chem</span>
              </span>
              {phyChem && phyChem.sort_date && (
                <span className="text-[10px] font-mono text-slate-400">
                  {formatDateBadge(phyChem.sort_date, phyChem.exam_date)}
                </span>
              )}
            </div>

            {phyChem ? (
              phyChem.result_status === 'Pending' ? (
                <div className="py-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Pending
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1 truncate" title={phyChem.test_name}>
                    {phyChem.test_name}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums tracking-tight">
                      {phyChem.marks_obtained}
                    </span>
                    <span className="text-[11px] font-semibold font-mono px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      {phyChem.percentage}%
                    </span>
                  </div>

                  {/* Liquid Progress Line */}
                  <div className="w-full bg-slate-200/50 dark:bg-white/[0.08] h-1.5 rounded-full mt-2.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, phyChem.percentage || 0))}%` }}
                    ></div>
                  </div>
                </div>
              )
            ) : (
              <div className="py-2">
                <span className="text-xs text-slate-400 italic">No score recorded</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MHTCET PCM Combined & Percentile Forecast Strip */}
      {totalPCM !== null && (
        <div className="px-4 py-2.5 bg-slate-100/50 dark:bg-white/[0.02] border-t border-slate-200/40 dark:border-white/[0.04] flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              MHTCET PCM
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {totalPCM}/200
            </span>
          </div>

          <div className="flex items-center gap-2">
            {diagnosis && (
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[110px]" title={diagnosis.strengths}>
                {diagnosis.tag}
              </span>
            )}
            {percentile && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                {percentile}%ile
              </span>
            )}
          </div>
        </div>
      )}

      {/* Card Action Footer */}
      <div className="p-3 bg-white/40 dark:bg-white/[0.01] border-t border-slate-200/40 dark:border-white/[0.05] flex items-center justify-between gap-2">
        <button
          onClick={() => onViewHistory(student)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white liquid-glass transition-all active:scale-95"
          title="Open complete examination history and change logs"
        >
          <History className="h-3.5 w-3.5" />
          <span>History</span>
        </button>

        <button
          onClick={() => onRefresh(student.id)}
          disabled={isRefreshing}
          className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-3.5 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 liquid-glass hover:bg-blue-500/10 transition-all active:scale-95 ${
            isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          title="Scrape and refresh marks for this student only"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Sync</span>
        </button>
      </div>

    </div>
  );
}
