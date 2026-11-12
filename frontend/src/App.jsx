import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import OverviewStats from './components/OverviewStats';
import StudentCard from './components/StudentCard';
import LeaderboardSection from './components/LeaderboardSection';
import ConsolidatedTable from './components/ConsolidatedTable';
import AnalyticsSection from './components/AnalyticsSection';
import SettingsModal from './components/SettingsModal';
import HistoryModal from './components/HistoryModal';
import LiveProgressBanner from './components/LiveProgressBanner';
import MobileConnectModal from './components/MobileConnectModal';
import MobileBottomNav from './components/MobileBottomNav';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import { api } from './services/api';
import { RefreshCw, Users, Table, TrendingUp, Layers, LayoutGrid, Trophy, Sparkles } from 'lucide-react';

export default function App() {
  const [overview, setOverview] = useState({
    total_students: 10,
    checked_accounts: 0,
    available_results: 0,
    pending_results: 0,
    attention_required: 0,
    students: []
  });
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetchingAll, setIsFetchingAll] = useState(false);
  const [refreshingStudentId, setRefreshingStudentId] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('vraz_theme') !== 'light'; // Default to Apple obsidian dark mode
  });

  // Active View Tab: 'cards' | 'leaderboard' | 'table' | 'analytics' | 'all'
  const [activeView, setActiveView] = useState('cards');

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileConnectOpen, setIsMobileConnectOpen] = useState(false);
  const [historyStudent, setHistoryStudent] = useState(null);

  // Live progress state
  const [progressMap, setProgressMap] = useState({});
  const [fetchSummary, setFetchSummary] = useState(null);
  const [analyticsRefreshKey, setAnalyticsRefreshKey] = useState(0);

  // Dark mode effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('vraz_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('vraz_theme', 'light');
    }
  }, [isDarkMode]);

  // Load overview & analytics data
  const loadOverview = async () => {
    try {
      const [ovData, anData] = await Promise.all([
        api.getOverview(),
        api.getAnalyticsSummary().catch(() => null)
      ]);
      setOverview(ovData);
      if (anData?.leaderboard) {
        setLeaderboard(anData.leaderboard);
      }
      setAnalyticsRefreshKey((k) => k + 1);
    } catch (err) {
      console.error('Failed to load dashboard overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();

    // Subscribe to SSE progress events
    const unsubscribe = api.subscribeProgress((evt) => {
      if (evt.type === 'progress') {
        setProgressMap((prev) => ({
          ...prev,
          [evt.student_id]: {
            status: evt.status,
            message: evt.message
          }
        }));
      } else if (evt.type === 'summary') {
        setFetchSummary(evt.data);
        setIsFetchingAll(false);
        loadOverview();
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Fetch All handler
  const handleFetchAll = async () => {
    setIsFetchingAll(true);
    setProgressMap({});
    setFetchSummary(null);
    try {
      const summary = await api.fetchAllMarks();
      setFetchSummary(summary);
      await loadOverview();
    } catch (err) {
      console.error('Fetch all error:', err);
    } finally {
      setIsFetchingAll(false);
    }
  };

  // Individual student refresh handler
  const handleRefreshStudent = async (studentId) => {
    setRefreshingStudentId(studentId);
    try {
      await api.refreshStudent(studentId);
      await loadOverview();
    } catch (err) {
      console.error(`Error refreshing student ${studentId}:`, err);
    } finally {
      setRefreshingStudentId(null);
    }
  };

  const students = overview.students || [];

  // Map of student_id -> leaderboard rank info
  const leaderboardMap = useMemo(() => {
    const map = {};
    for (const item of leaderboard) {
      map[item.student_id] = item;
    }
    return map;
  }, [leaderboard]);

  return (
    <div className="relative min-h-screen bg-[#f8fafc] text-slate-900 dark:bg-[#06080d] dark:text-[#f3f4f6] flex flex-col transition-colors duration-200 overflow-x-hidden">
      
      {/* Apple Atmospheric Ambient Light Orbs (Refracted through Frosted Glass) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full bg-blue-500/10 dark:bg-blue-600/15 blur-[130px] opacity-70 animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[30%] -right-32 w-[500px] h-[500px] rounded-full bg-indigo-500/10 dark:bg-indigo-600/12 blur-[140px] opacity-60" />
        <div className="absolute top-[65%] -left-32 w-[450px] h-[450px] rounded-full bg-teal-500/10 dark:bg-teal-500/10 blur-[140px] opacity-50" />
      </div>

      {/* PWA Install Banner */}
      <PwaInstallPrompt />

      {/* Top Apple Glass Header */}
      <Header
        lastSyncTime={overview.last_sync_time}
        isFetchingAll={isFetchingAll}
        onFetchAll={handleFetchAll}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenMobileConnect={() => setIsMobileConnectOpen(true)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-14">
        
        {/* Dynamic Live Progress / Summary HUD */}
        <LiveProgressBanner
          isFetching={isFetchingAll}
          progressMap={progressMap}
          students={students}
          summary={fetchSummary}
          onDismissSummary={() => setFetchSummary(null)}
        />

        {/* Executive Stat Strip */}
        <OverviewStats overview={overview} />

        {/* Apple Segmented View Switcher Capsule */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-7">
          <div className="inline-flex rounded-2xl p-1 liquid-glass self-start overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveView('cards')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                activeView === 'cards'
                  ? 'liquid-pill-active'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setActiveView('leaderboard')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                activeView === 'leaderboard'
                  ? 'liquid-pill-active text-amber-500 dark:text-amber-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
              <span>Leaderboard</span>
            </button>
            <button
              onClick={() => setActiveView('table')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                activeView === 'table'
                  ? 'liquid-pill-active'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Table className="h-3.5 w-3.5" />
              <span>Score Matrix</span>
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                activeView === 'analytics'
                  ? 'liquid-pill-active'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Analytics & H2H</span>
            </button>
            <button
              onClick={() => setActiveView('all')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                activeView === 'all'
                  ? 'liquid-pill-active'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Full View</span>
            </button>
          </div>

          <button
            onClick={loadOverview}
            className="p-1.5 px-3 rounded-2xl liquid-glass text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-all self-end sm:self-auto active:scale-95"
            title="Refresh dashboard state"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reload</span>
          </button>
        </div>

        {/* Section 1: Individual Student Cards */}
        {(activeView === 'cards' || activeView === 'all') && (
          <section id="student-cards" className="mb-11 scroll-mt-24 animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="apple-heading text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Student Overview</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full liquid-glass text-slate-500 dark:text-slate-400">
                    10 Students
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Synchronized portal records with MHTCET PCM scaling and college prediction
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {students.map((student) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  rankInfo={leaderboardMap[student.id]}
                  onRefresh={handleRefreshStudent}
                  onViewHistory={(s) => setHistoryStudent(s)}
                  isRefreshing={refreshingStudentId === student.id || isFetchingAll}
                />
              ))}
            </div>
          </section>
        )}

        {/* Section 2: Class Leaderboard & Percentile Predictor */}
        {(activeView === 'leaderboard' || activeView === 'all') && (
          <section id="leaderboard-section" className="mb-11 scroll-mt-24 animate-in fade-in duration-200">
            <LeaderboardSection
              leaderboard={leaderboard}
              onViewHistory={(s) => setHistoryStudent(s)}
            />
          </section>
        )}

        {/* Section 3: Consolidated Marks Table */}
        {(activeView === 'table' || activeView === 'all') && (
          <div id="consolidated-table" className="scroll-mt-24 mb-11 animate-in fade-in duration-200">
            <ConsolidatedTable
              onOpenHistory={(s) => setHistoryStudent(s)}
            />
          </div>
        )}

        {/* Section 4: Subject Comparison & Analytics Charts */}
        {(activeView === 'analytics' || activeView === 'all') && (
          <div id="analytics-section" className="scroll-mt-24 mb-11 animate-in fade-in duration-200">
            <AnalyticsSection
              students={students}
              refreshKey={analyticsRefreshKey}
            />
          </div>
        )}

      </main>

      {/* Apple Frosted Glass Footer */}
      <footer className="relative z-10 border-t border-slate-200/60 dark:border-white/[0.06] bg-white/40 dark:bg-[#06080d]/40 backdrop-blur-md py-6 transition-colors mb-16 md:mb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">VRaZ Marks Command Center</span>
            <span>•</span>
            <span>10 Student Accounts</span>
            <span>•</span>
            <span>MHTCET PCM Engine</span>
          </div>
          <div>
            <span>End-to-end portal synchronization & local encrypted store</span>
          </div>
        </div>
      </footer>

      {/* Mobile Floating Bottom Navigation Dock */}
      <MobileBottomNav
        activeTab={activeView}
        onSelectTab={setActiveView}
        isFetchingAll={isFetchingAll}
        onFetchAll={handleFetchAll}
        onOpenMobileInfo={() => setIsMobileConnectOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Mobile Connect & QR Code Modal */}
      <MobileConnectModal
        isOpen={isMobileConnectOpen}
        onClose={() => setIsMobileConnectOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={loadOverview}
      />

      {/* Examination History Modal */}
      <HistoryModal
        student={historyStudent}
        isOpen={Boolean(historyStudent)}
        onClose={() => setHistoryStudent(null)}
      />

    </div>
  );
}
