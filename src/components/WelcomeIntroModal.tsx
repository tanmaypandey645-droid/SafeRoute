import React, { useState } from 'react';
import {
  ShieldCheck,
  Lightbulb,
  Construction,
  Wrench,
  Split,
  Sparkles,
  X,
  ArrowRight,
  Footprints,
  CheckCircle2,
  Moon,
  Info,
  Play,
} from 'lucide-react';

interface WelcomeIntroModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchDemoRoute: () => void;
  onWatchIntroVideo?: () => void;
}

export const WelcomeIntroModal: React.FC<WelcomeIntroModalProps> = ({
  isOpen,
  onClose,
  onLaunchDemoRoute,
  onWatchIntroVideo,
}) => {
  const [alwaysShowOnOpen, setAlwaysShowOnOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('saferoute_show_intro');
    return saved !== null ? saved === 'true' : true;
  });

  if (!isOpen) return null;

  const handleToggleAlwaysShow = (checked: boolean) => {
    setAlwaysShowOnOpen(checked);
    localStorage.setItem('saferoute_show_intro', String(checked));
  };

  const handleLaunchDemo = () => {
    onClose();
    onLaunchDemoRoute();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white p-6 sm:p-8 relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            title="Close Intro"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> SafeRoute Platform Intro
            </span>
            <span className="text-xs text-white/60">· Pedestrian First</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Welcome to SafeRoute
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 mt-2 leading-relaxed max-w-xl">
            A pedestrian route awareness platform that helps you compare walking paths using verified
            data on <strong className="text-white">working streetlights</strong>,{' '}
            <strong className="text-white">active construction</strong>, and{' '}
            <strong className="text-white">broken infrastructure</strong>.
          </p>
        </div>

        {/* Core Pillars Grid */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-100">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
            Key Features You Get With Every Route
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Safest Route & Multi-Way */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-xs">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Multiple Ways & Safest Route
                </h2>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                SafeRoute computes 2–3 alternative journey options, automatically badges the{' '}
                <strong className="text-emerald-700 dark:text-emerald-400">🛡️ Safest Route</strong>, and ranks them by
                verified condition scores.
              </p>
            </div>

            {/* 2. Working Streetlights */}
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500 text-white shadow-xs">
                  <Lightbulb className="w-4 h-4" />
                </span>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Working Streetlights Audit
                </h2>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Inspect the exact count of operational lamps versus dark/broken poles (e.g. 28/30 working, 93% illuminated)
                for peace of mind during evening and night walks.
              </p>
            </div>

            {/* 3. Construction & Broken Slabs */}
            <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-rose-600 text-white shadow-xs">
                  <Construction className="w-4 h-4" />
                </span>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Construction & Broken Slabs
                </h2>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Alerts you to utility trenches, roadwork barricades, damaged paving slabs, and unlit segments with detour
                recommendations before you encounter them.
              </p>
            </div>

            {/* 4. Differences Comparator & Dark Mode */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
                  <Split className="w-4 h-4" />
                </span>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Route Differences Matrix
                </h2>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Compare any two routes side-by-side to inspect exact differences in score, lighting, roadwork, and walking
                time. Includes high-contrast Night / Dark Mode.
              </p>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Default corridor centered in <strong>Ghaziabad, Uttar Pradesh</strong>. You can search any street, use GPS,
              or select preset corridors anytime.
            </span>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Always show checkbox */}
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={alwaysShowOnOpen}
              onChange={(e) => handleToggleAlwaysShow(e.target.checked)}
              className="rounded accent-emerald-600 cursor-pointer"
            />
            <span>Show this intro whenever the app opens</span>
          </label>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {onWatchIntroVideo && (
              <button
                onClick={() => {
                  onClose();
                  onWatchIntroVideo();
                }}
                className="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-700/60"
                title="Play SafeRoute Intro Animation Video"
              >
                <Play className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                <span>Play Intro Video</span>
              </button>
            )}
            <button
              onClick={handleLaunchDemo}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Explore Safest Route Demo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Start Exploring
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
