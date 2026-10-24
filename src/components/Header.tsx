import React from 'react';
import { UserRole } from '../types/index.ts';
import {
  Shield,
  Bell,
  Navigation,
  BarChart3,
  Layers,
  PlusCircle,
  Moon,
  Sun,
  Sparkles,
  Play,
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  userRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenIntro?: () => void;
  onReplayVideo?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  userRole,
  onRoleChange,
  unreadNotificationsCount,
  onOpenNotifications,
  isDarkMode,
  onToggleDarkMode,
  onOpenIntro,
  onReplayVideo,
}) => {
  const navItems = [
    { id: 'planner', label: 'Route Planner', icon: Navigation },
    { id: 'compare', label: 'Route Comparison', icon: BarChart3 },
    { id: 'community', label: 'Community Reports', icon: Layers },
    { id: 'report', label: 'Report Hazard', icon: PlusCircle },
    { id: 'admin', label: 'Admin & Verifier', icon: Shield },
    { id: 'monitoring', label: 'Route Alerts', icon: Bell },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onTabChange('planner')}
            className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs group-hover:bg-emerald-700 transition-colors">
              <Shield className="w-4 h-4" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
              SafeRoute
            </span>
          </button>
        </div>

        {/* Zone 2: Navigation Links (Single-Line, No Scrollbar) */}
        <nav className="hidden md:flex items-center gap-3 lg:gap-6 py-1 no-scrollbar overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-1.5 text-xs lg:text-sm font-medium transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer focus:outline-none border-b-2 ${
                  isActive
                    ? 'text-emerald-700 dark:text-emerald-400 font-semibold border-emerald-600 dark:border-emerald-500'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Intro Guide, Dark Mode Toggle, Notifications & Role Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Intro Guide Button */}
          {onOpenIntro && (
            <button
              onClick={onOpenIntro}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
              title="View SafeRoute Intro & Features Guide"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Intro Guide</span>
            </button>
          )}

          {/* Intro Video Button */}
          {onReplayVideo && (
            <button
              onClick={onReplayVideo}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/70 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/70 transition-colors cursor-pointer"
              title="Watch Intro Video Animation"
            >
              <Play className="w-3.5 h-3.5 fill-rose-600 text-rose-600 dark:fill-rose-400 dark:text-rose-400" />
              <span className="hidden md:inline">Intro Video</span>
            </button>
          )}

          {/* Dark Mode Toggle Button */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400 animate-in fade-in zoom-in duration-200" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600 hover:text-slate-900 animate-in fade-in zoom-in duration-200" />
            )}
          </button>

          {/* Notifications Button */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Route Notifications & Overdue Alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-600 rounded-full" />
            )}
          </button>

          {/* Role selector dropdown to test Citizen / Verifier / Admin privileges */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 pl-1 font-medium hidden sm:inline">Role:</span>
            <select
              value={userRole}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
              className="text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-100 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="citizen">Citizen (Public)</option>
              <option value="verifier">Field Verifier</option>
              <option value="admin">Municipal Admin</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Nav Bar */}
      <div className="md:hidden flex items-center justify-between gap-2 px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex-1">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`text-xs px-2.5 py-1 rounded whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'bg-emerald-600 text-white font-medium'
                    : 'text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Mobile quick dark mode toggle */}
        <button
          onClick={onToggleDarkMode}
          className="p-1.5 ml-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
};
