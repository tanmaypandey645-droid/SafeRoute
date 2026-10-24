import React from 'react';
import { NotificationItem } from '../types/index.ts';
import { X, Bell, AlertTriangle, CheckCircle2, RotateCcw, Clock } from 'lucide-react';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  onSelectReportById?: (reportId: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
  onSelectReportById,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">Pedestrian Route Alerts</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onMarkAllRead}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
            >
              Mark all read
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-800 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 space-y-2.5 divide-y divide-slate-100">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`pt-2.5 first:pt-0 p-2 rounded-lg cursor-pointer transition-colors ${
                n.read ? 'bg-white' : 'bg-emerald-50/40'
              }`}
              onClick={() => {
                if (n.linkReportId && onSelectReportById) {
                  onSelectReportById(n.linkReportId);
                  onClose();
                }
              }}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">{n.title}</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
              {n.linkReportId && (
                <span className="text-[11px] text-emerald-700 font-semibold mt-1 inline-block">
                  View Affected Hazard Details →
                </span>
              )}
            </div>
          ))}

          {notifications.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              No recent notifications or route alerts.
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
