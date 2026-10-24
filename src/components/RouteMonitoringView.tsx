import React, { useState, useEffect } from 'react';
import {
  MonitoredRoute,
  AccessibilityPreferences,
  WeeklySummary,
  UserRole,
} from '../types/index.ts';
import {
  Bell,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Play,
  FileText,
  ShieldCheck,
  Compass,
  Accessibility,
  Eye,
  Info,
  RotateCcw,
} from 'lucide-react';

interface RouteMonitoringViewProps {
  userRole: UserRole;
  userName: string;
  userId: string;
  onRefreshAll: () => void;
}

export const RouteMonitoringView: React.FC<RouteMonitoringViewProps> = ({
  userRole,
  userName,
  userId,
  onRefreshAll,
}) => {
  const [monitoredRoutes, setMonitoredRoutes] = useState<MonitoredRoute[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);

  // New monitored route form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRouteName, setNewRouteName] = useState('');
  const [newStart, setNewStart] = useState('RDC Raj Nagar, Ghaziabad');
  const [newDest, setNewDest] = useState('Old Bus Stand, Ghaziabad');

  // Automation trigger state
  const [isRunningStaleCheck, setIsRunningStaleCheck] = useState(false);
  const [staleCheckResult, setStaleCheckResult] = useState<string | null>(null);

  const [isGeneratingWeekly, setIsGeneratingWeekly] = useState(false);

  // Accessibility settings state
  const [accessibilityPrefs, setAccessibilityPrefs] = useState<AccessibilityPreferences>({
    fewerStairs: true,
    wheelchairOnly: false,
    fewerDifficultCrossings: true,
    highDataCoverageOnly: false,
    lightingImportance: 'high',
  });
  const [prefsSavedMessage, setPrefsSavedMessage] = useState(false);

  const loadData = async () => {
    try {
      const [monRes, weeklyRes] = await Promise.all([
        fetch('/api/monitoring'),
        fetch('/api/automation/weekly-summary'),
      ]);
      if (monRes.ok) {
        const data = await monRes.json();
        setMonitoredRoutes(data.monitoredRoutes || []);
      }
      if (weeklyRes.ok) {
        const data = await weeklyRes.json();
        setWeeklySummary(data.summary);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateMonitoredRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRouteName.trim()) return;

    try {
      const res = await fetch('/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRouteName.trim(),
          startName: newStart,
          destinationName: newDest,
          startCoords: [28.6750, 77.4430],
          destCoords: [28.6652, 77.4389],
          userId,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewRouteName('');
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMonitoredRoute = async (id: string) => {
    try {
      const res = await fetch(`/api/monitoring/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMonitoredRoutes((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Run Stale Check Automation manually
  const handleRunStaleCheck = async () => {
    setIsRunningStaleCheck(true);
    setStaleCheckResult(null);
    try {
      const res = await fetch('/api/automation/run-stale-check', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setStaleCheckResult(
          `Freshness audit complete. ${data.flaggedCount} stale report(s) flagged for rechecking.`
        );
        onRefreshAll();
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunningStaleCheck(false);
    }
  };

  // Generate fresh Weekly Summary
  const handleGenerateWeekly = async () => {
    setIsGeneratingWeekly(true);
    try {
      const res = await fetch('/api/automation/weekly-summary/generate', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setWeeklySummary(data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingWeekly(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Route Monitoring & Accessibility Preferences
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Subscribe to hazard updates along regular walking corridors, set physical accessibility
          constraints, and inspect automated weekly maintenance summaries.
        </p>
      </div>

      {/* SECTION 1: Accessibility Preferences */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">Pedestrian Accessibility Profile</h2>
          </div>
          {prefsSavedMessage && (
            <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded">
              Preferences Saved
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
          SafeRoute applies strict accessibility rules to walking route calculations. If verified curb
          ramp or sidewalk width data is absent, the system explicitly warns you rather than assuming
          accessibility.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <label className="p-4 border border-slate-200 rounded-xl flex items-start gap-3 hover:border-slate-300 transition-colors cursor-pointer bg-slate-50/50">
            <input
              type="checkbox"
              checked={accessibilityPrefs.fewerStairs}
              onChange={(e) => {
                setAccessibilityPrefs((p) => ({ ...p, fewerStairs: e.target.checked }));
                setPrefsSavedMessage(true);
                setTimeout(() => setPrefsSavedMessage(false), 2000);
              }}
              className="mt-1 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-900 block">Avoid Stairs & Steeps</span>
              <span className="text-xs text-slate-500">
                Route exclusively via ramps or grade-level sidewalks. Heavy penalty for outdoor stair flights.
              </span>
            </div>
          </label>

          <label className="p-4 border border-slate-200 rounded-xl flex items-start gap-3 hover:border-slate-300 transition-colors cursor-pointer bg-slate-50/50">
            <input
              type="checkbox"
              checked={accessibilityPrefs.wheelchairOnly}
              onChange={(e) => {
                setAccessibilityPrefs((p) => ({ ...p, wheelchairOnly: e.target.checked }));
                setPrefsSavedMessage(true);
                setTimeout(() => setPrefsSavedMessage(false), 2000);
              }}
              className="mt-1 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Strict Wheelchair / Mobility Device Standards
              </span>
              <span className="text-xs text-slate-500">
                Requires confirmed dropped kerbs at every crossing and minimum 1.2m clear width.
              </span>
            </div>
          </label>

          <label className="p-4 border border-slate-200 rounded-xl flex items-start gap-3 hover:border-slate-300 transition-colors cursor-pointer bg-slate-50/50">
            <input
              type="checkbox"
              checked={accessibilityPrefs.fewerDifficultCrossings}
              onChange={(e) => {
                setAccessibilityPrefs((p) => ({ ...p, fewerDifficultCrossings: e.target.checked }));
                setPrefsSavedMessage(true);
                setTimeout(() => setPrefsSavedMessage(false), 2000);
              }}
              className="mt-1 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Signalized Crossings Only
              </span>
              <span className="text-xs text-slate-500">
                Avoids uncontrolled multi-lane road crossings without pedestrian countdown signals.
              </span>
            </div>
          </label>

          <label className="p-4 border border-slate-200 rounded-xl flex items-start gap-3 hover:border-slate-300 transition-colors cursor-pointer bg-slate-50/50">
            <input
              type="checkbox"
              checked={accessibilityPrefs.highDataCoverageOnly}
              onChange={(e) => {
                setAccessibilityPrefs((p) => ({ ...p, highDataCoverageOnly: e.target.checked }));
                setPrefsSavedMessage(true);
                setTimeout(() => setPrefsSavedMessage(false), 2000);
              }}
              className="mt-1 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Require High Data Confidence
              </span>
              <span className="text-xs text-slate-500">
                Disregards routes where municipal sidewalk or lighting documentation is under 75%.
              </span>
            </div>
          </label>
        </div>

        {/* Accessibility Policy Notice */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>
            <strong>SafeRoute Policy:</strong> We never claim a route is 100% wheelchair-accessible
            without confirmed curb ramps. When municipal data is missing, we clearly display an
            "Incomplete Data" tag.
          </span>
        </div>
      </div>

      {/* SECTION 2: Monitored Corridors */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">
              Monitored Corridors & Proactive Route Alerts
            </h2>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Monitor New Route</span>
          </button>
        </div>

        <p className="text-xs text-slate-500">
          When verified hazards or construction detour updates occur within 300 meters of your
          monitored paths, SafeRoute automatically generates a high-priority in-app notification.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {monitoredRoutes.map((m) => (
            <div
              key={m.id}
              className="p-4 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors flex items-start justify-between bg-slate-50/40"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">{m.name}</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                    Active
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {m.startName} → {m.destinationName}
                </div>
                {m.notes && <div className="text-xs text-slate-600 italic">{m.notes}</div>}
                <div className="text-[11px] text-slate-400 font-mono">
                  Last corridor scan: {new Date(m.lastChecked).toLocaleDateString()}
                </div>
              </div>

              <button
                onClick={() => handleDeleteMonitoredRoute(m.id)}
                className="text-slate-400 hover:text-rose-600 p-1.5 rounded cursor-pointer"
                title="Remove Monitored Route"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {monitoredRoutes.length === 0 && (
            <div className="col-span-2 p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
              No monitored routes yet. Add your daily commute or school route to receive automatic
              hazard notifications.
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: Automated Maintenance & Freshness Engine */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Play className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">
              Automated Maintenance & Report Freshness Engine
            </h2>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          SafeRoute runs explainable automated background audits. Reports unverified for over 14 days
          are automatically flagged as "Needs Rechecking" to prevent stale information from misleading
          walkers.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={handleRunStaleCheck}
            disabled={isRunningStaleCheck}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isRunningStaleCheck ? 'Running Freshness Audit...' : 'Run Stale Report Audit'}</span>
          </button>

          <button
            onClick={handleGenerateWeekly}
            disabled={isGeneratingWeekly}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span>{isGeneratingWeekly ? 'Generating Summary...' : 'Generate Fresh Weekly Summary'}</span>
          </button>
        </div>

        {staleCheckResult && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{staleCheckResult}</span>
          </div>
        )}

        {/* Weekly Summary Card */}
        {weeklySummary && (
          <div className="mt-4 p-5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-xs text-slate-900">
                Weekly Infrastructure Health Summary (Week of {weeklySummary.weekStarting})
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Generated {new Date(weeklySummary.generatedAt).toLocaleDateString()}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-white rounded border border-slate-200">
                <span className="text-slate-400 block text-[11px]">New Reports</span>
                <span className="text-lg font-bold font-mono tabular-nums text-slate-900">
                  {weeklySummary.totalNewReports}
                </span>
              </div>
              <div className="p-2.5 bg-white rounded border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Resolved</span>
                <span className="text-lg font-bold font-mono tabular-nums text-emerald-700">
                  {weeklySummary.totalResolved}
                </span>
              </div>
              <div className="p-2.5 bg-white rounded border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Pending Verification</span>
                <span className="text-lg font-bold font-mono tabular-nums text-amber-600">
                  {weeklySummary.pendingVerificationCount}
                </span>
              </div>
              <div className="p-2.5 bg-white rounded border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Avg Resolution Days</span>
                <span className="text-lg font-bold font-mono tabular-nums text-slate-800">
                  {weeklySummary.avgResolutionDays}d
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <span className="text-xs font-bold text-slate-800">Key Municipal Recommendations:</span>
              <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                {weeklySummary.keyRecommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Add Monitored Route Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Monitor Walking Route Corridor</h3>
            <form onSubmit={handleCreateMonitoredRoute} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">Route Label</label>
                <input
                  type="text"
                  value={newRouteName}
                  onChange={(e) => setNewRouteName(e.target.value)}
                  placeholder="e.g. Daily Walk to Transit Station"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">Start Location</label>
                <input
                  type="text"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">Destination</label>
                <input
                  type="text"
                  value={newDest}
                  onChange={(e) => setNewDest(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                >
                  Start Monitoring
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
