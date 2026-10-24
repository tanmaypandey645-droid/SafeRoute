import React, { useState, useEffect } from 'react';
import {
  HazardReport,
  ReportEvidence,
  UserRole,
} from '../types/index.ts';
import { CATEGORY_METADATA, STATUS_LABELS } from '../utils/categories.ts';
import {
  X,
  MapPin,
  Calendar,
  Clock,
  ThumbsUp,
  RotateCcw,
  ShieldCheck,
  MessageSquare,
  AlertTriangle,
  Check,
  Send,
  Building2,
} from 'lucide-react';

interface HazardDetailModalProps {
  report: HazardReport | null;
  isOpen: boolean;
  onClose: () => void;
  userRole: UserRole;
  userName: string;
  userId: string;
  onReportUpdated: (updated: HazardReport) => void;
  onOpenAdminAction?: (report: HazardReport, action: 'verify' | 'assign' | 'resolve') => void;
}

export const HazardDetailModal: React.FC<HazardDetailModalProps> = ({
  report,
  isOpen,
  onClose,
  userRole,
  userName,
  userId,
  onReportUpdated,
  onOpenAdminAction,
}) => {
  const [evidenceList, setEvidenceList] = useState<ReportEvidence[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Fetch evidence chain
  useEffect(() => {
    if (!report) return;
    fetch(`/api/reports/${report.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.evidence) setEvidenceList(data.evidence);
      })
      .catch((err) => console.error('Error fetching evidence:', err));
  }, [report]);

  if (!isOpen || !report) return null;

  const categoryMeta = CATEGORY_METADATA[report.category] || {
    label: report.category,
    description: '',
  };
  const statusMeta = STATUS_LABELS[report.status] || {
    label: report.status,
    textClass: 'text-slate-700',
    bgClass: 'bg-slate-100',
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      const res = await fetch(`/api/reports/${report.id}/confirm`, { method: 'POST' });
      if (res.ok) {
        const updated = await res.json();
        onReportUpdated(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleRequestRecheck = async () => {
    try {
      const res = await fetch(`/api/reports/${report.id}/request-recheck`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: `${userName} requested an updated on-site inspection.`,
          userName,
          userRole,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        onReportUpdated(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmittingEvidence(true);
    try {
      const res = await fetch(`/api/reports/${report.id}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: newComment.trim(),
          userName,
          userRole,
          userId,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        setEvidenceList((prev) => [saved, ...prev]);
        setNewComment('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded border ${statusMeta.bgClass} ${statusMeta.textClass}`}
            >
              {statusMeta.label}
            </span>
            <span className="text-xs text-slate-400 font-mono">ID: {report.id}</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Title & Metadata */}
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>{categoryMeta.label}</span>
              <span aria-hidden="true">·</span>
              <span className="uppercase font-semibold text-rose-700">{report.severity} Severity</span>
              <span aria-hidden="true">·</span>
              <span>Reported by {report.reportedBy}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">{report.title}</h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{report.address}</span>
            </div>
          </div>

          {/* Photo */}
          {report.photoUrl && (
            <div className="rounded-xl overflow-hidden bg-slate-100 border border-slate-200 max-h-64">
              <img
                src={report.photoUrl}
                alt={report.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Description */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="text-xs font-bold text-slate-900 block">Reported Obstacle Context</span>
            <p className="text-xs text-slate-700 leading-relaxed">{report.description}</p>
          </div>

          {/* Verification Notes & Assignment info if present */}
          {(report.verificationNotes || report.assignedDepartment || report.resolutionNotes) && (
            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-2 text-xs">
              <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Municipal Inspection & Action Record</span>
              </div>
              {report.verificationNotes && (
                <div>
                  <span className="text-slate-500 block text-[11px]">Verifier Audit:</span>
                  <span className="text-slate-800 font-medium">{report.verificationNotes}</span>
                </div>
              )}
              {report.assignedDepartment && (
                <div className="pt-1 border-t border-emerald-200/50">
                  <span className="text-slate-500 block text-[11px]">Assigned Department:</span>
                  <span className="text-slate-800 font-medium">{report.assignedDepartment}</span>
                </div>
              )}
              {report.resolutionNotes && (
                <div className="pt-1 border-t border-emerald-200/50">
                  <span className="text-slate-500 block text-[11px]">Resolution Summary:</span>
                  <span className="text-slate-800 font-medium">{report.resolutionNotes}</span>
                </div>
              )}
            </div>
          )}

          {/* Freshness & Timeline Info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
            <div>
              <span className="text-[11px] text-slate-400 block">Reported Date:</span>
              <span className="font-medium">{new Date(report.createdAt).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Last Checked:</span>
              <span className="font-medium">{new Date(report.lastCheckedAt).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Freshness State:</span>
              <span className={`font-semibold ${report.isStale ? 'text-rose-700' : 'text-emerald-700'}`}>
                {report.isStale ? 'Stale (>14d)' : 'Active / Fresh'}
              </span>
            </div>
          </div>

          {/* Community Actions (Confirm, Request Recheck) */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200">
            <button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ThumbsUp className="w-3.5 h-3.5 text-slate-600" />
              <span>Confirm Hazard ({report.confirmationsCount || 1})</span>
            </button>

            <button
              onClick={handleRequestRecheck}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
              <span>Request Recheck</span>
            </button>

            {/* Quick Admin Actions if user is verifier or admin */}
            {['verifier', 'admin'].includes(userRole) && onOpenAdminAction && (
              <div className="ml-auto flex items-center gap-2">
                {report.status !== 'verified' && (
                  <button
                    onClick={() => onOpenAdminAction(report, 'verify')}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Verify
                  </button>
                )}
                {report.status !== 'assigned' && report.status !== 'resolved' && (
                  <button
                    onClick={() => onOpenAdminAction(report, 'assign')}
                    className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Assign
                  </button>
                )}
                {report.status !== 'resolved' && (
                  <button
                    onClick={() => onOpenAdminAction(report, 'resolve')}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Resolve
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Evidence Chain & Additional Comments */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
              <span>Evidence Chain & On-Site Updates ({evidenceList.length})</span>
            </div>

            {/* Add Evidence Form */}
            <form onSubmit={handleAddEvidence} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Provide additional evidence, sidewalk width notes, or status..."
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={isSubmittingEvidence || !newComment.trim()}
                className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 cursor-pointer disabled:opacity-50 flex items-center gap-1"
              >
                <Send className="w-3 h-3" />
                <span>Submit Evidence</span>
              </button>
            </form>

            <div className="space-y-2">
              {evidenceList.map((evi) => (
                <div key={evi.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span className="font-semibold text-slate-800">
                      {evi.userName} ({evi.userRole})
                    </span>
                    <span>{new Date(evi.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-700">{evi.comment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
