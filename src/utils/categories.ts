import { HazardCategory, ReportStatus, Severity } from '../types/index.ts';

export const CATEGORY_METADATA: Record<
  HazardCategory,
  { label: string; description: string; iconName: string; defaultSeverity: Severity }
> = {
  footpath_obstruction: {
    label: 'Footpath Obstruction',
    description: 'Blocked sidewalk, parked vehicles, scaffolding, or fallen obstacles',
    iconName: 'Barrier',
    defaultSeverity: 'medium',
  },
  broken_streetlight: {
    label: 'Broken / Dark Streetlight',
    description: 'Unlit pedestrian crossing, flickering lamp, or dark street corridor',
    iconName: 'LightbulbOff',
    defaultSeverity: 'medium',
  },
  difficult_crossing: {
    label: 'Difficult / Unmarked Crossing',
    description: 'Fast-moving traffic, missing crosswalk paint, or broken walk signal',
    iconName: 'Signpost',
    defaultSeverity: 'high',
  },
  roadwork: {
    label: 'Active Roadwork',
    description: 'Trenching, utility excavation, or construction lacking pedestrian detour',
    iconName: 'Construction',
    defaultSeverity: 'high',
  },
  waterlogging: {
    label: 'Waterlogging / Flooding',
    description: 'Standing stormwater pool, clogged catchbasin, or submerged curb cut',
    iconName: 'Droplets',
    defaultSeverity: 'medium',
  },
  accessibility_barrier: {
    label: 'Wheelchair / Step Barrier',
    description: 'Missing curb ramp, steep step without ramp, or broken tactile paving',
    iconName: 'Accessibility',
    defaultSeverity: 'high',
  },
  uneven_pavement: {
    label: 'Uneven Pavement / Pothole',
    description: 'Cracked concrete slab, tree root heave, or trip-and-fall hazard',
    iconName: 'AlertTriangle',
    defaultSeverity: 'medium',
  },
  debris_foliage: {
    label: 'Overhanging Foliage / Debris',
    description: 'Low branches, overgrown shrubs, or garbage narrowing the walkway',
    iconName: 'Trees',
    defaultSeverity: 'low',
  },
};

export const STATUS_LABELS: Record<ReportStatus, { label: string; textClass: string; bgClass: string }> = {
  submitted: { label: 'Submitted', textClass: 'text-amber-800', bgClass: 'bg-amber-50 border-amber-200' },
  under_review: { label: 'Under Review', textClass: 'text-blue-800', bgClass: 'bg-blue-50 border-blue-200' },
  verified: { label: 'Verified Hazard', textClass: 'text-emerald-800', bgClass: 'bg-emerald-50 border-emerald-200' },
  assigned: { label: 'Assigned to Dept', textClass: 'text-purple-800', bgClass: 'bg-purple-50 border-purple-200' },
  resolved: { label: 'Resolved', textClass: 'text-slate-600', bgClass: 'bg-slate-100 border-slate-200' },
  needs_rechecking: { label: 'Needs Rechecking', textClass: 'text-rose-800', bgClass: 'bg-rose-50 border-rose-200' },
};

export const SEVERITY_LABELS: Record<Severity, { label: string; color: string; penalty: number }> = {
  low: { label: 'Low', color: '#10B981', penalty: 4 },
  medium: { label: 'Medium', color: '#F59E0B', penalty: 9 },
  high: { label: 'High', color: '#EA580C', penalty: 16 },
  critical: { label: 'Critical', color: '#DC2626', penalty: 25 },
};
