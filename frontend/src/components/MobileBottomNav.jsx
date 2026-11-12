import React from 'react';
import { LayoutGrid, Trophy, Table, TrendingUp, RefreshCw, Settings } from 'lucide-react';

export default function MobileBottomNav({
  activeTab,
  onSelectTab,
  isFetchingAll,
  onFetchAll,
  onOpenMobileInfo,
  onOpenSettings
}) {
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav 
      className="md:hidden fixed bottom-4 left-4 right-4 z-40 pb-[env(safe-area-inset-bottom)] pointer-events-none"
      aria-label="Mobile Navigation Dock"
    >
      <div className="flex items-center justify-around px-3 py-2 max-w-sm mx-auto rounded-full liquid-glass-elevated pointer-events-auto shadow-2xl">
        
        {/* Tab 1: Cards */}
        <button
          onClick={() => {
            onSelectTab('cards');
            scrollTo('student-cards');
          }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-150 ${
            activeTab === 'cards'
              ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <LayoutGrid className="h-4 w-4 mb-0.5" />
          <span className="text-[9px] tracking-tight">Cards</span>
        </button>

        {/* Tab 2: Leaderboard */}
        <button
          onClick={() => {
            onSelectTab('leaderboard');
            scrollTo('leaderboard-section');
          }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-150 ${
            activeTab === 'leaderboard'
              ? 'text-amber-500 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <Trophy className="h-4 w-4 mb-0.5" />
          <span className="text-[9px] tracking-tight">Ranks</span>
        </button>

        {/* Action: Fast Sync Trigger in Center */}
        <button
          onClick={onFetchAll}
          disabled={isFetchingAll}
          className={`flex items-center justify-center -my-3 h-11 w-11 rounded-full apple-button-primary shadow-glow transition-transform active:scale-95 ${
            isFetchingAll
              ? 'opacity-70 cursor-not-allowed'
              : ''
          }`}
          title="Fetch marks for all students"
        >
          <RefreshCw className={`h-4.5 w-4.5 ${isFetchingAll ? 'animate-spin' : ''}`} />
        </button>

        {/* Tab 3: Table / Matrix */}
        <button
          onClick={() => {
            onSelectTab('table');
            scrollTo('consolidated-table');
          }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-150 ${
            activeTab === 'table'
              ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <Table className="h-4 w-4 mb-0.5" />
          <span className="text-[9px] tracking-tight">Scores</span>
        </button>

        {/* Tab 4: Analytics */}
        <button
          onClick={() => {
            onSelectTab('analytics');
            scrollTo('analytics-section');
          }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-150 ${
            activeTab === 'analytics'
              ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <TrendingUp className="h-4 w-4 mb-0.5" />
          <span className="text-[9px] tracking-tight">Analytics</span>
        </button>

      </div>
    </nav>
  );
}
