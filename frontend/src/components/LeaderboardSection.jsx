import React, { useState } from 'react';
import { Trophy, Medal, Award, TrendingUp, Sparkles, ChevronRight, School, Target, Filter } from 'lucide-react';

export default function LeaderboardSection({ leaderboard = [], onViewHistory }) {
  const [tierFilter, setTierFilter] = useState('ALL');

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className="rounded-3xl liquid-glass p-8 text-center text-slate-400 text-xs">
        Synchronizing student examination scores for class leaderboard...
      </div>
    );
  }

  const top3 = leaderboard.slice(0, 3);
  const remaining = leaderboard.slice(3);

  const filteredLeaderboard = leaderboard.filter((item) => {
    if (tierFilter === 'ALL') return true;
    if (tierFilter === 'TOP5') return item.rank <= 5;
    if (tierFilter === 'TIER1') return item.estimated_percentile >= 95.0;
    return true;
  });

  const getInitials = (name) => {
    if (!name) return 'S';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getDiagnosisBadge = (style) => {
    switch (style) {
      case 'emerald':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'blue':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'indigo':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 'teal':
        return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20';
      default:
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    }
  };

  return (
    <div className="space-y-6 mb-12">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-apple-sm">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="apple-heading text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Class Leaderboard & Percentile Predictor</span>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full liquid-glass text-amber-500">
                  MHTCET PCM
                </span>
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Official 200-mark PCM ranking calibrated to Maharashtra CET percentiles and college cutoffs
              </p>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="inline-flex rounded-2xl p-1 liquid-glass self-start sm:self-auto">
          {[
            { id: 'ALL', label: 'All 10 Students' },
            { id: 'TOP5', label: 'Top 5' },
            { id: 'TIER1', label: '≥ 95 %ile Target' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTierFilter(tab.id)}
              className={`px-3.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                tierFilter === tab.id
                  ? 'liquid-pill-active'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 Podium Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Silver: Rank 2 */}
        {top3[1] && (
          <div className="order-2 md:order-1 relative p-5 rounded-3xl liquid-glass flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 right-0 w-28 h-28 bg-slate-400/5 rounded-bl-full pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">🥈</span>
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full liquid-glass-sub text-slate-500">
                  Rank #2
                </span>
              </div>
              <h3 className="apple-heading font-bold text-base text-slate-900 dark:text-white truncate">
                {top3[1].student_name}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Maths: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{top3[1].maths_score || 0}</span> • Phy+Chem: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{top3[1].phy_chem_score || 0}</span>
              </p>

              <div className="my-3.5 p-3.5 rounded-2xl liquid-glass-sub">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                      {top3[1].total_score}
                    </span>
                    <span className="text-xs text-slate-400 font-mono"> / 200</span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {top3[1].estimated_percentile}%ile
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/40 dark:border-white/[0.05]">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                Predicted Target
              </span>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate" title={top3[1].predicted_colleges.colleges.join(', ')}>
                {top3[1].predicted_colleges.colleges[0]}
              </p>
            </div>
          </div>
        )}

        {/* Gold: Rank 1 (Champion) */}
        {top3[0] && (
          <div className="order-1 md:order-2 relative p-6 rounded-3xl liquid-glass-elevated border-2 border-amber-400/40 shadow-glow-sm flex flex-col justify-between overflow-hidden md:-translate-y-2">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-bl-full pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-4xl">🥇</span>
                <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-apple-sm">
                  Class Leader
                </span>
              </div>
              <h3 className="apple-heading font-extrabold text-lg text-slate-900 dark:text-white truncate">
                {top3[0].student_name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Maths: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{top3[0].maths_score || 0}</span> • Phy+Chem: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{top3[0].phy_chem_score || 0}</span>
              </p>

              <div className="my-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums tracking-tight">
                      {top3[0].total_score}
                    </span>
                    <span className="text-xs text-slate-400 font-mono"> / 200</span>
                  </div>
                  <span className="text-sm font-mono font-extrabold px-3 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-apple-sm">
                    {top3[0].estimated_percentile}%ile
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-amber-500/20">
              <span className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold block mb-1">
                Premier Eligibility
              </span>
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={top3[0].predicted_colleges.colleges.join(', ')}>
                {top3[0].predicted_colleges.colleges[0]}
              </p>
            </div>
          </div>
        )}

        {/* Bronze: Rank 3 */}
        {top3[2] && (
          <div className="order-3 relative p-5 rounded-3xl liquid-glass flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 right-0 w-28 h-28 bg-amber-700/5 rounded-bl-full pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">🥉</span>
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full liquid-glass-sub text-slate-500">
                  Rank #3
                </span>
              </div>
              <h3 className="apple-heading font-bold text-base text-slate-900 dark:text-white truncate">
                {top3[2].student_name}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Maths: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{top3[2].maths_score || 0}</span> • Phy+Chem: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{top3[2].phy_chem_score || 0}</span>
              </p>

              <div className="my-3.5 p-3.5 rounded-2xl liquid-glass-sub">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                      {top3[2].total_score}
                    </span>
                    <span className="text-xs text-slate-400 font-mono"> / 200</span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400">
                    {top3[2].estimated_percentile}%ile
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/40 dark:border-white/[0.05]">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                Predicted Target
              </span>
              <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 truncate" title={top3[2].predicted_colleges.colleges.join(', ')}>
                {top3[2].predicted_colleges.colleges[0]}
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Complete Class Leaderboard Table */}
      <div className="rounded-3xl liquid-glass overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/50 dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Award className="h-4 w-4 text-amber-500" />
            <h3 className="apple-heading font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              Official PCM Rank Standings
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            {filteredLeaderboard.length} of {leaderboard.length} Students Listed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/50 dark:bg-white/[0.02] text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-200/50 dark:border-white/[0.06]">
              <tr>
                <th className="py-3.5 px-4 w-14">Rank</th>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Maths (100)</th>
                <th className="py-3.5 px-4">Phy+Chem (100)</th>
                <th className="py-3.5 px-4">Total PCM (200)</th>
                <th className="py-3.5 px-4">MHTCET %ile</th>
                <th className="py-3.5 px-4">Predicted College Tier</th>
                <th className="py-3.5 px-4">Diagnosis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/40 dark:divide-white/[0.04]">
              {filteredLeaderboard.map((student) => (
                <tr
                  key={student.student_id}
                  className="hover:bg-white/40 dark:hover:bg-white/[0.02] transition-colors group"
                >
                  {/* Rank Badge */}
                  <td className="py-3.5 px-4 font-mono font-bold text-sm">
                    {student.rank === 1 ? (
                      <span className="text-xl">🥇</span>
                    ) : student.rank === 2 ? (
                      <span className="text-xl">🥈</span>
                    ) : student.rank === 3 ? (
                      <span className="text-xl">🥉</span>
                    ) : (
                      <span className="text-xs text-slate-400">#{String(student.rank).padStart(2, '0')}</span>
                    )}
                  </td>

                  {/* Student Name */}
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                    <div className="flex items-center space-x-2.5">
                      <div className="h-7 w-7 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px] font-mono font-bold shadow-apple-sm">
                        {getInitials(student.student_name)}
                      </div>
                      <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {student.student_name}
                      </span>
                    </div>
                  </td>

                  {/* Mathematics */}
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {student.maths_score != null ? (
                      <div className="flex items-baseline space-x-1">
                        <span>{student.maths_score}</span>
                        <span className="text-[10px] text-slate-400 font-normal">/100</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs italic">-</span>
                    )}
                  </td>

                  {/* Physics + Chemistry */}
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {student.phy_chem_score != null ? (
                      <div className="flex items-baseline space-x-1">
                        <span>{student.phy_chem_score}</span>
                        <span className="text-[10px] text-slate-400 font-normal">/100</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs italic">-</span>
                    )}
                  </td>

                  {/* Total PCM */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-baseline space-x-1.5">
                      <span className="font-extrabold font-mono text-slate-900 dark:text-white tabular-nums text-base">
                        {student.total_score}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">({student.total_percentage}%)</span>
                    </div>
                  </td>

                  {/* Estimated Percentile */}
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      {student.estimated_percentile}%ile
                    </span>
                  </td>

                  {/* Predicted Colleges */}
                  <td className="py-3.5 px-4">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        {student.predicted_colleges.tier_label}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate max-w-[200px] block" title={student.predicted_colleges.colleges.join(', ')}>
                        {student.predicted_colleges.colleges[0]}
                      </span>
                    </div>
                  </td>

                  {/* Diagnosis Tag */}
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${getDiagnosisBadge(student.diagnosis.badge_style)}`} title={`${student.diagnosis.strengths} • ${student.diagnosis.focus_area}`}>
                      {student.diagnosis.tag}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
