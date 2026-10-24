import React, { useState } from 'react';
import {
  HazardReport,
  HazardCategory,
  ReportStatus,
  Severity,
  UserRole,
} from '../types/index.ts';
import { CATEGORY_METADATA, STATUS_LABELS, SEVERITY_LABELS } from '../utils/categories.ts';
import { Map } from './Map.tsx';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ThumbsUp,
  RotateCcw,
  Camera,
  Layers,
  ChevronRight,
  ExternalLink,
  Shield,
  Copy,
  Map as MapIcon,
  LayoutGrid,
} from 'lucide-react';

interface CommunityReportsProps {
  reports: HazardReport[];
  onSelectReport: (report: HazardReport) => void;
  onRefreshReports: () => void;
  userRole: UserRole;
  userName: string;
}

export const CommunityReports: React.FC<CommunityReportsProps> = ({
  reports,
  onSelectReport,
  onRefreshReports,
  userRole,
  userName,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [onlyStale, setOnlyStale] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  // Filtered reports
  const filteredReports = reports.filter((rep) => {
    if (categoryFilter !== 'all' && rep.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && rep.status !== statusFilter) return false;
    if (severityFilter !== 'all' && rep.severity !== severityFilter) return false;
    if (onlyStale && !rep.isStale && rep.status !== 'needs_rechecking') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = rep.title.toLowerCase().includes(q);
      const matchDesc = rep.description.toLowerCase().includes(q);
      const matchAddress = rep.address.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchAddress) return false;
    }

    return true;
  });

  // Calculate status counts
  const statusCounts = {
    all: reports.length,
    submitted: reports.filter((r) => r.status === 'submitted').length,
    under_review: reports.filter((r) => r.status === 'under_review').length,
    verified: reports.filter((r) => r.status === 'verified').length,
    assigned: reports.filter((r) => r.status === 'assigned').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
    needs_rechecking: reports.filter((r) => r.status === 'needs_rechecking' || r.isStale).length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Community Hazard Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Transparent physical status registry: submitted, field-verified, municipal assignments,
            and stale reports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle: Grid vs Map */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid View</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'map'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map View</span>
            </button>
          </div>

          {/* Quick Stale Filter Toggle */}
          <label className="flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={onlyStale}
              onChange={(e) => setOnlyStale(e.target.checked)}
              className="rounded text-rose-600 focus:ring-rose-500"
            />
            <span>Show Stale ({statusCounts.needs_rechecking})</span>
          </label>
        </div>
      </div>

      {/* Status Segmented Control (Interactive Filter Buttons) */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 p-1 bg-slate-100 rounded-xl scrollbar-none">
        {[
          { id: 'all', label: `All Reports (${statusCounts.all})` },
          { id: 'submitted', label: `Submitted (${statusCounts.submitted})` },
          { id: 'under_review', label: `Under Review (${statusCounts.under_review})` },
          { id: 'verified', label: `Verified (${statusCounts.verified})` },
          { id: 'assigned', label: `Assigned (${statusCounts.assigned})` },
          { id: 'resolved', label: `Resolved (${statusCounts.resolved})` },
          { id: 'needs_rechecking', label: `Needs Rechecking (${statusCounts.needs_rechecking})` },
        ].map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                isActive
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports by title, street, or keyword..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Categories</option>
            {Object.keys(CATEGORY_METADATA).map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_METADATA[cat as HazardCategory].label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Severity Levels</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Map View Mode */}
      {viewMode === 'map' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800">
              Showing {filteredReports.length} hazard reports on OpenStreetMap
            </span>
            <span className="text-slate-500">Click any marker to inspect photos and status</span>
          </div>
          <div className="h-[550px] w-full relative">
            <Map
              hazards={filteredReports}
              onSelectHazard={onSelectReport}
              center={[28.6692, 77.4538]}
              zoom={13}
            />
          </div>
        </div>
      )}

      {/* Grid View Mode */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredReports.map((report) => {
            const categoryMeta = CATEGORY_METADATA[report.category] || {
              label: report.category,
              description: '',
            };
            const statusMeta = STATUS_LABELS[report.status] || {
              label: report.status,
              textClass: 'text-slate-700',
              bgClass: 'bg-slate-100',
            };
            const createdDaysAgo = Math.floor(
              (Date.now() - new Date(report.createdAt).getTime()) / (1000 * 60 * 60 * 24)
            );

            return (
              <div
                key={report.id}
                onClick={() => onSelectReport(report)}
                className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-sm transition-all p-5 flex flex-col justify-between cursor-pointer group"
              >
                <div className="space-y-3">
                  {/* Unboxed Metadata Header */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span>{categoryMeta.label}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`font-semibold uppercase text-[10px] ${
                          report.severity === 'critical'
                            ? 'text-rose-700'
                            : report.severity === 'high'
                            ? 'text-orange-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {report.severity}
                      </span>
                    </div>

                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${statusMeta.bgClass} ${statusMeta.textClass}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2">
                      {report.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {report.description}
                    </p>
                  </div>

                  {/* Evidence Photo Preview if available */}
                  {report.photoUrl && (
                    <div className="relative rounded-lg overflow-hidden h-32 bg-slate-100 border border-slate-100">
                      <img
                        src={report.photoUrl}
                        alt={report.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      />
                    </div>
                  )}

                  {/* Location */}
                  <div className="text-xs text-slate-600 flex items-center gap-1.5">
                    <span className="truncate">{report.address}</span>
                  </div>
                </div>

                {/* Card Footer: Timeline & Confirmations */}
                <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <span>
                      {createdDaysAgo === 0 ? 'Today' : `${createdDaysAgo}d ago`}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1 text-slate-600 font-medium">
                      <ThumbsUp className="w-3 h-3 text-slate-400" />
                      <span>{report.confirmationsCount || 1} confirmed</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1 font-semibold text-slate-700 group-hover:text-slate-900">
                    <span>View Details</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredReports.length === 0 && (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-800">No Matching Reports Found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Try adjusting your search filters or report a new pedestrian obstacle in this area.
          </p>
        </div>
      )}
    </div>
  );
};
