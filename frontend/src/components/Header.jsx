import React from 'react';
import { RefreshCw, Settings, Moon, Sun, Smartphone, Zap } from 'lucide-react';

export default function Header({
  lastSyncTime,
  isFetchingAll,
  onFetchAll,
  onOpenSettings,
  onOpenMobileConnect,
  isDarkMode,
  onToggleDarkMode
}) {
  const formatTime = (ts) => {
    if (!ts) return 'Never synchronized';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' • ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return ts;
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200/60 dark:border-white/[0.08] bg-white/75 dark:bg-[#06080d]/75 backdrop-blur-2xl transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand & System Status */}
        <div className="flex items-center space-x-3.5">
          <div className="relative flex items-center justify-center h-9 w-9 rounded-2xl bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-apple-sm ring-1 ring-white/30">
            <Zap className="h-4.5 w-4.5 fill-white/20 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="apple-heading font-extrabold tracking-tight text-base sm:text-lg text-slate-900 dark:text-white">
                VRaZ
              </span>
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                Marks Center
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium liquid-glass text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>10 Students</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <span>Last sync:</span>
              <span className="font-medium text-slate-600 dark:text-slate-300">{formatTime(lastSyncTime)}</span>
            </p>
          </div>
        </div>

        {/* Pro Toolbar Actions */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          
          {/* Apple Primary Action Button */}
          <button
            onClick={onFetchAll}
            disabled={isFetchingAll}
            className={`apple-button-primary group relative inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold text-white ${
              isFetchingAll ? 'opacity-60 cursor-not-allowed' : ''
            }`}
            title="Launch parallel sessions to refresh student marks"
          >
            <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform ${isFetchingAll ? 'animate-spin' : 'group-hover:rotate-45'}`} />
            <span className="tracking-tight">
              {isFetchingAll ? 'Syncing...' : 'Fetch All Marks'}
            </span>
          </button>

          {/* Mobile QR & PWA Pill */}
          <button
            onClick={onOpenMobileConnect}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-300 liquid-glass hover:text-slate-900 dark:hover:text-white transition-all active:scale-95"
            title="Open on phone (QR Code & LAN)"
          >
            <Smartphone className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
            <span>Mobile</span>
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-2xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white liquid-glass transition-all active:scale-95"
            title="Settings & accounts"
          >
            <Settings className="h-4 w-4" />
          </button>

          {/* Theme Switcher */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-2xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white liquid-glass transition-all active:scale-95"
            title="Toggle theme (Light / Dark)"
          >
            {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
          </button>

        </div>

      </div>
    </header>
  );
}
