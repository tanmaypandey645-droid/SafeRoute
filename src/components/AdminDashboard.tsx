import React, { useState, useEffect } from 'react';
import {
  HazardReport,
  MaintenanceTask,
  AuditLog,
  UserRole,
} from '../types/index.ts';
import { CATEGORY_METADATA, STATUS_LABELS } from '../utils/categories.ts';
import { Map } from './Map.tsx';
import {
  Shield,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Building2,
  Calendar,
  History,
  Check,
  X,
  Send,
  AlertCircle,
  Layers,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

interface AdminDashboardProps {
  userRole: UserRole;
  userName: string;
  reports: HazardReport[];
  onRefreshData: () => void;
  onOpenReportDetail: (report: HazardReport) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  userRole,
  userName,
  reports,
  onRefreshData,
  onOpenReportDetail,
}) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'queue' | 'tasks' | 'hotspots' | 'audit'>('queue');

  // Action Modals State
  const [selectedReportForAction, setSelectedReportForAction] = useState<HazardReport | null>(null);
  const [actionType, setActionType] = useState<'verify' | 'reject' | 'assign' | 'resolve' | 'schedule' | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [selectedDept, setSelectedDept] = useState('Department of Public Works - Footpath Division');
  const [recheckDate, setRecheckDate] = useState('2026-10-24');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Fetch admin metrics, tasks, and audit logs
  const loadAdminData = async () => {
    try {
      const [metricsRes, tasksRes, logsRes] = await Promise.all([
        fetch('/api/admin/metrics'),
        fetch('/api/admin/tasks'),
        fetch('/api/admin/audit-logs'),
      ]);
      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.tasks || []);
      }
      if (logsRes.ok) {
        const data = await logsRes.json();
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [reports]);

  // Authorization Guard (Permission Denied State)
  if (userRole === 'citizen') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Municipal Verification Portal Access Restricted</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          The SafeRoute Administration Console is protected. Only authorized field verifiers and
          municipal public works administrators can verify hazard reports, assign repair tasks, or
          schedule formal rechecks.
        </p>
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl max-w-sm mx-auto text-xs text-emerald-900 text-left">
          <span className="font-semibold block mb-1">Testing Mode Note:</span>
          Use the <span className="font-semibold text-emerald-800">"Role" selector</span> in the
          top right navigation bar to switch your active session to{' '}
          <span className="font-semibold">Field Verifier</span> or{' '}
          <span className="font-semibold">Municipal Admin</span> to test all privileged actions.
        </div>
      </div>
    );
  }

  // Handle Verify / Reject
  const handleVerifyOrReject = async (decision: 'verify' | 'reject') => {
    if (!selectedReportForAction) return;
    setIsSubmittingAction(true);
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: selectedReportForAction.id,
          decision,
          reviewerName: userName,
          reviewerRole: userRole,
          notes: actionNotes || `Reviewed and ${decision}ed during audit.`,
        }),
      });
      if (res.ok) {
        setActionSuccessMessage(`Report ${decision === 'verify' ? 'verified' : 'rejected'} successfully.`);
        setTimeout(() => setActionSuccessMessage(null), 3500);
        setSelectedReportForAction(null);
        setActionType(null);
        setActionNotes('');
        onRefreshData();
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Handle Assign Task
  const handleAssignTask = async () => {
    if (!selectedReportForAction) return;
    setIsSubmittingAction(true);
    try {
      const res = await fetch('/api/admin/assign-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: selectedReportForAction.id,
          department: selectedDept,
          notes: actionNotes,
          adminName: userName,
          adminRole: userRole,
          targetDays: 5,
        }),
      });
      if (res.ok) {
        setActionSuccessMessage(`Maintenance task assigned to ${selectedDept}.`);
        setTimeout(() => setActionSuccessMessage(null), 3500);
        setSelectedReportForAction(null);
        setActionType(null);
        setActionNotes('');
        onRefreshData();
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Handle Resolve Issue
  const handleResolveIssue = async () => {
    if (!selectedReportForAction) return;
    setIsSubmittingAction(true);
    try {
      const res = await fetch('/api/admin/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: selectedReportForAction.id,
          resolutionNotes: actionNotes || 'Physical repairs verified completed on site.',
          adminName: userName,
          adminRole: userRole,
        }),
      });
      if (res.ok) {
        setActionSuccessMessage('Hazard marked as resolved. Reporter notified.');
        setTimeout(() => setActionSuccessMessage(null), 3500);
        setSelectedReportForAction(null);
        setActionType(null);
        setActionNotes('');
        onRefreshData();
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Handle Schedule Recheck
  const handleScheduleRecheck = async () => {
    if (!selectedReportForAction) return;
    setIsSubmittingAction(true);
    try {
      const res = await fetch('/api/admin/schedule-recheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: selectedReportForAction.id,
          recheckDate,
          adminName: userName,
          adminRole: userRole,
        }),
      });
      if (res.ok) {
        setActionSuccessMessage(`Recheck inspection scheduled for ${recheckDate}.`);
        setTimeout(() => setActionSuccessMessage(null), 3500);
        setSelectedReportForAction(null);
        setActionType(null);
        onRefreshData();
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded uppercase">
              Authorized Session: {userRole}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Municipal Verification & Administration Console
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review community submissions, authorize verification statuses, assign municipal work
            crews, and maintain audit logs.
          </p>
        </div>

        {actionSuccessMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}
      </div>

      {/* KPI Metrics Strip (Tabular Numerals) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 block">Total Reports</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
            {metrics?.totalReports ?? reports.length}
          </span>
          <span className="text-[11px] text-slate-400">All submissions</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 block">Pending Verification</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-amber-600 mt-1 block">
            {metrics?.pendingVerification ?? reports.filter((r) => r.status === 'submitted').length}
          </span>
          <span className="text-[11px] text-amber-700">Awaiting audit</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 block">Verified Hazards</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1 block">
            {metrics?.verifiedHazards ?? reports.filter((r) => r.status === 'verified').length}
          </span>
          <span className="text-[11px] text-emerald-700">Active obstacles</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 block">Stale Reports (&gt;14d)</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-rose-600 mt-1 block">
            {metrics?.staleReports ?? reports.filter((r) => r.isStale).length}
          </span>
          <span className="text-[11px] text-rose-700">Need recheck</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 block">Resolved Issues</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-slate-700 mt-1 block">
            {metrics?.resolvedComplaints ?? reports.filter((r) => r.status === 'resolved').length}
          </span>
          <span className="text-[11px] text-slate-500">Repaired</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 block">Avg Resolution Time</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
            {metrics?.averageResolutionDays ?? 4.6}d
          </span>
          <span className="text-[11px] text-slate-400">Target: &lt;5 days</span>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'queue' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Review & Triage Queue
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'tasks' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Municipal Maintenance Tasks ({tasks.length})
        </button>
        <button
          onClick={() => setActiveTab('hotspots')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'hotspots' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Recurring Hotspot Clusters
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'audit' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Audit History Logs ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Review & Triage Queue */}
      {activeTab === 'queue' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Submissions Requiring Action or Recheck ({reports.length})
            </h3>
            <span className="text-xs text-slate-500">
              Only verified reports impact pedestrian route scores
            </span>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            {reports.map((report) => {
              const statusMeta = STATUS_LABELS[report.status];
              const categoryMeta = CATEGORY_METADATA[report.category];

              return (
                <div
                  key={report.id}
                  className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-800">{categoryMeta?.label}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-slate-400">ID: {report.id}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded border text-[11px] ${statusMeta.bgClass} ${statusMeta.textClass}`}
                      >
                        {statusMeta.label}
                      </span>
                      {report.isStale && (
                        <span className="text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded font-bold text-[10px]">
                          STALE &gt;14d
                        </span>
                      )}
                    </div>

                    <h4
                      onClick={() => onOpenReportDetail(report)}
                      className="font-bold text-sm text-slate-900 hover:text-emerald-700 cursor-pointer"
                    >
                      {report.title}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-1">{report.description}</p>
                    <div className="text-[11px] text-slate-400">
                      Location: {report.address} · Reported by {report.reportedBy} ({new Date(report.createdAt).toLocaleDateString()})
                    </div>
                  </div>

                  {/* Actions Button Group */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => onOpenReportDetail(report)}
                      className="px-2.5 py-1 text-xs border border-slate-200 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
                    >
                      Inspect Evidence
                    </button>

                    {report.status !== 'verified' && (
                      <button
                        onClick={() => {
                          setSelectedReportForAction(report);
                          setActionType('verify');
                          setActionNotes('');
                        }}
                        className="px-3 py-1 text-xs bg-emerald-700 hover:bg-emerald-800 text-white rounded font-medium cursor-pointer"
                      >
                        Verify
                      </button>
                    )}

                    {report.status !== 'assigned' && report.status !== 'resolved' && (
                      <button
                        onClick={() => {
                          setSelectedReportForAction(report);
                          setActionType('assign');
                          setActionNotes('');
                        }}
                        className="px-3 py-1 text-xs bg-purple-700 hover:bg-purple-800 text-white rounded font-medium cursor-pointer"
                      >
                        Assign Task
                      </button>
                    )}

                    {report.status !== 'resolved' && (
                      <button
                        onClick={() => {
                          setSelectedReportForAction(report);
                          setActionType('resolve');
                          setActionNotes('');
                        }}
                        className="px-3 py-1 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded font-medium cursor-pointer"
                      >
                        Resolve
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedReportForAction(report);
                        setActionType('schedule');
                      }}
                      className="px-2.5 py-1 text-xs border border-slate-200 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
                    >
                      Schedule Recheck
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Maintenance Tasks */}
      {activeTab === 'tasks' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Active Municipal Tasks</h3>
              <p className="text-xs text-slate-500">
                Priority Score = (Severity × 25) + (Accessibility Impact × 20) + Confirmations
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {tasks.map((task) => (
              <div key={task.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      {task.department}
                    </span>
                    <span className="font-mono text-slate-400">Task: {task.id}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Priority Score: {task.priorityScore}/100
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">{task.title}</h4>
                  <div className="text-xs text-slate-500">
                    Target Completion: {new Date(task.targetCompletionDate).toLocaleDateString()} · Status: {task.status.replace('_', ' ').toUpperCase()}
                  </div>
                  {task.notes && <div className="text-xs text-slate-600 italic">{task.notes}</div>}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-1 rounded font-semibold ${
                      task.status === 'completed'
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Hotspots */}
      {activeTab === 'hotspots' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Persistent Problem Hotspots</h3>
            <p className="text-xs text-slate-500">
              Corridors with multiple recurring infrastructure reports across 90 days. Click any marker on the map to inspect evidence.
            </p>
          </div>

          {/* Interactive Leaflet Municipal Hazard Map */}
          <div className="h-80 w-full rounded-xl overflow-hidden border border-slate-200 shadow-xs relative">
            <Map
              hazards={reports}
              onSelectHazard={onOpenReportDetail}
              center={[28.6692, 77.4538]}
              zoom={13}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(metrics?.recurringHotspots || []).map((hot: any, i: number) => (
              <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">{hot.location || hot.locationName}</span>
                  <span className="font-mono tabular-nums font-bold text-xs bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
                    {hot.count || hot.reportCount} Reports
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  Primary Category:{' '}
                  <span className="font-semibold">{hot.category || hot.topCategory}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Coordinates: {hot.lat.toFixed(4)}, {hot.lng.toFixed(4)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-900">Immutable Audit Trail</h3>
            <p className="text-xs text-slate-500">Chronological history of all verifications and task assignments</p>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3.5 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{log.action}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600 font-medium">
                      by {log.actorName} ({log.actorRole})
                    </span>
                  </div>
                  <p className="text-slate-600">{log.summary}</p>
                </div>
                <div className="text-right text-[11px] text-slate-400 font-mono tabular-nums whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Dialog Modal */}
      {actionType && selectedReportForAction && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 capitalize">
                {actionType === 'verify' && 'Verify Hazard Report'}
                {actionType === 'reject' && 'Reject / Close Report'}
                {actionType === 'assign' && 'Assign Maintenance Task'}
                {actionType === 'resolve' && 'Record Resolution Evidence'}
                {actionType === 'schedule' && 'Schedule On-Site Recheck'}
              </h3>
              <button
                onClick={() => setActionType(null)}
                className="text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
              <span className="font-bold text-slate-800">{selectedReportForAction.title}</span>
              <div className="text-slate-500">{selectedReportForAction.address}</div>
            </div>

            {actionType === 'assign' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">Department Assignment</label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                >
                  <option value="Department of Public Works - Footpath Division">
                    Department of Public Works - Footpath Division
                  </option>
                  <option value="Bureau of Street Lighting & Signals">
                    Bureau of Street Lighting & Signals
                  </option>
                  <option value="Accessible Transportation Committee">
                    Accessible Transportation Committee
                  </option>
                  <option value="Code Enforcement & Urban Forestry">
                    Code Enforcement & Urban Forestry
                  </option>
                  <option value="Traffic Safety & Signal Engineering">
                    Traffic Safety & Signal Engineering
                  </option>
                </select>
              </div>
            )}

            {actionType === 'schedule' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">Recheck Inspection Date</label>
                <input
                  type="date"
                  value={recheckDate}
                  onChange={(e) => setRecheckDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                {actionType === 'resolve' ? 'Resolution Evidence Notes' : 'Auditor & Verification Notes'}
              </label>
              <textarea
                rows={3}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Enter physical inspection findings, permit verification details, or work completed notes..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActionType(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 cursor-pointer"
              >
                Cancel
              </button>

              {actionType === 'verify' && (
                <button
                  type="button"
                  onClick={() => handleVerifyOrReject('verify')}
                  disabled={isSubmittingAction}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Confirm Verification
                </button>
              )}

              {actionType === 'assign' && (
                <button
                  type="button"
                  onClick={handleAssignTask}
                  disabled={isSubmittingAction}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Create & Assign Task
                </button>
              )}

              {actionType === 'resolve' && (
                <button
                  type="button"
                  onClick={handleResolveIssue}
                  disabled={isSubmittingAction}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Mark as Resolved
                </button>
              )}

              {actionType === 'schedule' && (
                <button
                  type="button"
                  onClick={handleScheduleRecheck}
                  disabled={isSubmittingAction}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Save Recheck Schedule
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
