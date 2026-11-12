import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, AreaChart, Area, Legend
} from 'recharts';
import { Award, TrendingUp, BarChart3, Calculator, Atom, Sparkles, Swords, School, Target, CheckCircle2, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

// Custom Apple Liquid Glass Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-2xl liquid-glass-elevated p-3 shadow-xl text-xs min-w-[140px]">
        <p className="font-bold text-slate-900 dark:text-white mb-1.5">{label}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4 py-0.5">
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }}></span>
              <span>{entry.name || 'Score'}:</span>
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsSection({ students = [], refreshKey }) {
  const [summary, setSummary] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(students?.[0]?.id || 1);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Head-to-Head State
  const [studentAId, setStudentAId] = useState(1);
  const [studentBId, setStudentBId] = useState(2);
  const [h2hData, setH2hData] = useState(null);
  const [loadingH2H, setLoadingH2H] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [refreshKey]);

  useEffect(() => {
    if (selectedStudentId) {
      loadStudentTrend(selectedStudentId);
    }
  }, [selectedStudentId, refreshKey]);

  useEffect(() => {
    if (students && students.length > 0) {
      if (!selectedStudentId) setSelectedStudentId(students[0].id);
      if (!studentAId && students.length > 0) setStudentAId(students[0].id);
      if (!studentBId && students.length > 1) setStudentBId(students[1].id);
    }
  }, [students]);

  useEffect(() => {
    if (studentAId && studentBId && studentAId !== studentBId) {
      loadH2H(studentAId, studentBId);
    }
  }, [studentAId, studentBId, refreshKey]);

  const loadAnalytics = async () => {
    try {
      const data = await api.getAnalyticsSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load analytics summary:', err);
    }
  };

  const loadStudentTrend = async (id) => {
    setLoading(true);
    try {
      const data = await api.getStudentTrend(id);
      setTrendData(data);
    } catch (err) {
      console.error('Failed to load student trend:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadH2H = async (idA, idB) => {
    setLoadingH2H(true);
    try {
      const data = await api.compareStudents(idA, idB);
      setH2hData(data);
    } catch (err) {
      console.error('Failed to load head-to-head comparison:', err);
    } finally {
      setLoadingH2H(false);
    }
  };

  const comparisonData = summary?.comparison || [];
  const highestMath = summary?.highest_math || {};
  const highestPhyChem = summary?.highest_phy_chem || {};
  const leaderboard = summary?.leaderboard || [];

  // Head to Head Comparative Graph Data
  const h2hChartData = h2hData ? [
    {
      metric: 'Maths (100)',
      [h2hData.student_a.name.split(' ')[0]]: h2hData.student_a.maths,
      [h2hData.student_b.name.split(' ')[0]]: h2hData.student_b.maths,
    },
    {
      metric: 'Phy+Chem (100)',
      [h2hData.student_a.name.split(' ')[0]]: h2hData.student_a.phy_chem,
      [h2hData.student_b.name.split(' ')[0]]: h2hData.student_b.phy_chem,
    },
    {
      metric: 'Avg Test Score',
      [h2hData.student_a.name.split(' ')[0]]: h2hData.student_a.historical_mean,
      [h2hData.student_b.name.split(' ')[0]]: h2hData.student_b.historical_mean,
    },
    {
      metric: 'Total PCM (200)',
      [h2hData.student_a.name.split(' ')[0]]: h2hData.student_a.total,
      [h2hData.student_b.name.split(' ')[0]]: h2hData.student_b.total,
    }
  ] : [];

  const nameA = h2hData?.student_a?.name?.split(' ')[0] || 'Student A';
  const nameB = h2hData?.student_b?.name?.split(' ')[0] || 'Student B';

  return (
    <div className="space-y-6 mb-12">
      
      {/* Top 4 Insight Metric Tiles in Liquid Glass */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        
        {/* Highest Maths */}
        <div className="p-4 sm:p-5 rounded-3xl liquid-glass flex items-start space-x-3.5">
          <div className="p-2.5 rounded-2xl liquid-glass-sub text-blue-500 shadow-2xs">
            <Calculator className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Top Mathematics
            </span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                {highestMath.score != null ? highestMath.score : '-'}
              </span>
              <span className="text-xs text-slate-400 font-mono">/ {highestMath.max || 100}</span>
            </div>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate mt-0.5">
              {highestMath.student || 'Awaiting sync'}
            </p>
          </div>
        </div>

        {/* Highest Phy+Chem */}
        <div className="p-4 sm:p-5 rounded-3xl liquid-glass flex items-start space-x-3.5">
          <div className="p-2.5 rounded-2xl liquid-glass-sub text-emerald-500 shadow-2xs">
            <Atom className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Top Phy + Chem
            </span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                {highestPhyChem.score != null ? highestPhyChem.score : '-'}
              </span>
              <span className="text-xs text-slate-400 font-mono">/ {highestPhyChem.max || 100}</span>
            </div>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 truncate mt-0.5">
              {highestPhyChem.student || 'Awaiting sync'}
            </p>
          </div>
        </div>

        {/* Average Mathematics */}
        <div className="p-4 sm:p-5 rounded-3xl liquid-glass flex items-start space-x-3.5">
          <div className="p-2.5 rounded-2xl liquid-glass-sub text-indigo-500 shadow-2xs">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Class Maths Avg
            </span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                {summary?.avg_math != null ? summary.avg_math : '-'}
              </span>
              <span className="text-xs text-slate-400 font-mono">/ 100</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Excludes pending scores</p>
          </div>
        </div>

        {/* Average Phy+Chem */}
        <div className="p-4 sm:p-5 rounded-3xl liquid-glass flex items-start space-x-3.5">
          <div className="p-2.5 rounded-2xl liquid-glass-sub text-teal-500 shadow-2xs">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Class Phy+Chem Avg
            </span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                {summary?.avg_phy_chem != null ? summary.avg_phy_chem : '-'}
              </span>
              <span className="text-xs text-slate-400 font-mono">/ 100</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Excludes pending scores</p>
          </div>
        </div>

      </div>

      {/* Head-to-Head Compare Arena (FEATURE 4) */}
      <div className="p-5 sm:p-6 rounded-3xl liquid-glass">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-2xs">
              <Swords className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
                Head-to-Head Peer Comparison Arena
              </h3>
              <p className="text-xs text-slate-400">
                Direct test-by-test matchup comparison between any two students
              </p>
            </div>
          </div>

          {/* Student Selector Dropdowns */}
          <div className="flex items-center space-x-2">
            <select
              value={studentAId}
              onChange={(e) => setStudentAId(Number(e.target.value))}
              className="py-1.5 px-3 text-xs font-semibold rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white/70 dark:bg-black/40 backdrop-blur-md text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id} disabled={s.id === studentBId}>
                  {s.display_name}
                </option>
              ))}
            </select>

            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-500 border border-rose-500/20">
              VS
            </span>

            <select
              value={studentBId}
              onChange={(e) => setStudentBId(Number(e.target.value))}
              className="py-1.5 px-3 text-xs font-semibold rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white/70 dark:bg-black/40 backdrop-blur-md text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id} disabled={s.id === studentAId}>
                  {s.display_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {h2hData ? (
          <div className="space-y-5">
            {/* H2H Scoreboard Header */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Student A Card */}
              <div className="p-4 rounded-2xl bg-blue-500/[0.06] border border-blue-500/20 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-blue-500 uppercase tracking-wider block">
                    Student A
                  </span>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate mt-0.5">
                    {h2hData.student_a.name}
                  </h4>
                  <div className="flex items-baseline space-x-2 mt-2">
                    <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                      {h2hData.student_a.total}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">/ 200</span>
                    <span className="text-xs font-mono font-bold text-blue-500">
                      ({h2hData.student_a.percentile}%ile)
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-blue-500/10 flex items-center justify-between text-xs text-slate-400">
                  <span>Match Wins:</span>
                  <span className="font-bold font-mono text-blue-500 text-sm">{h2hData.head_to_head.student_a_wins}</span>
                </div>
              </div>

              {/* Matchup Summary / Wins Dial */}
              <div className="p-4 rounded-2xl liquid-glass-sub flex flex-col items-center justify-center text-center">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Direct Matches ({h2hData.head_to_head.common_tests_count} Tests)
                </span>
                <div className="flex items-center space-x-3 my-2 font-mono">
                  <span className="text-2xl font-extrabold text-blue-500">{h2hData.head_to_head.student_a_wins}</span>
                  <span className="text-slate-400 font-bold">-</span>
                  <span className="text-2xl font-extrabold text-rose-500">{h2hData.head_to_head.student_b_wins}</span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 max-w-[220px]">
                  {h2hData.head_to_head.verdict}
                </p>
              </div>

              {/* Student B Card */}
              <div className="p-4 rounded-2xl bg-rose-500/[0.06] border border-rose-500/20 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-rose-500 uppercase tracking-wider block">
                    Student B
                  </span>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate mt-0.5">
                    {h2hData.student_b.name}
                  </h4>
                  <div className="flex items-baseline space-x-2 mt-2">
                    <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                      {h2hData.student_b.total}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">/ 200</span>
                    <span className="text-xs font-mono font-bold text-rose-500">
                      ({h2hData.student_b.percentile}%ile)
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-rose-500/10 flex items-center justify-between text-xs text-slate-400">
                  <span>Match Wins:</span>
                  <span className="font-bold font-mono text-rose-500 text-sm">{h2hData.head_to_head.student_b_wins}</span>
                </div>
              </div>
            </div>

            {/* Comparative Bar Chart */}
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={h2hChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.12)" />
                  <XAxis dataKey="metric" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey={nameA} fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey={nameB} fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-400">
            {loadingH2H ? 'Evaluating head-to-head records...' : 'Select two distinct students to view matchup arena'}
          </div>
        )}
      </div>

      {/* Side-by-Side Subject Distribution Bar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Mathematics Distribution */}
        <div className="p-5 sm:p-6 rounded-3xl liquid-glass">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Calculator className="h-4 w-4 text-blue-500" />
                <span>Mathematics Roster Comparison</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Latest Mathematics examination marks per student</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <defs>
                  <linearGradient id="mathGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.12)" />
                <XAxis
                  dataKey="student_name"
                  angle={-30}
                  textAnchor="end"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  interval={0}
                  height={45}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="maths_score"
                  name="Maths Score"
                  fill="url(#mathGradient)"
                  radius={[6, 6, 0, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Physics + Chemistry Distribution */}
        <div className="p-5 sm:p-6 rounded-3xl liquid-glass">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Atom className="h-4 w-4 text-emerald-500" />
                <span>Physics + Chemistry Comparison</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Latest Physics + Chemistry examination marks per student</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <defs>
                  <linearGradient id="phyChemGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#047857" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.12)" />
                <XAxis
                  dataKey="student_name"
                  angle={-30}
                  textAnchor="end"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  interval={0}
                  height={45}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="phy_chem_score"
                  name="Phy+Chem Score"
                  fill="url(#phyChemGradient)"
                  radius={[6, 6, 0, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Student Historical Progression Area Chart */}
      <div className="p-5 sm:p-6 rounded-3xl liquid-glass">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Individual Examination Trajectory</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Chronological score progression over consecutive tests
            </p>
          </div>

          {/* Student Selector Liquid Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full p-1 liquid-pill rounded-2xl">
            {students.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStudentId(s.id)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedStudentId === s.id
                    ? 'liquid-pill-active'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {s.display_name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="h-64 w-full">
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <defs>
                  <linearGradient id="areaMath" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.12)" />
                <XAxis dataKey="exam_date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="marks_obtained"
                  name="Marks"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#areaMath)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              {loading ? 'Compiling timeline trajectory...' : 'No historical timeline points available for this student.'}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
