export type HazardCategory =
  | 'footpath_obstruction'
  | 'broken_streetlight'
  | 'difficult_crossing'
  | 'roadwork'
  | 'waterlogging'
  | 'accessibility_barrier'
  | 'uneven_pavement'
  | 'debris_foliage';

export type ReportStatus =
  | 'submitted'
  | 'under_review'
  | 'verified'
  | 'assigned'
  | 'resolved'
  | 'needs_rechecking';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type UserRole = 'citizen' | 'verifier' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  avatarUrl?: string;
}

export interface HazardReport {
  id: string;
  issueId?: string;
  title: string;
  description: string;
  category: HazardCategory;
  severity: Severity;
  status: ReportStatus;
  latitude: number;
  longitude: number;
  address: string;
  photoUrl?: string;
  reportedBy: string;
  reporterRole: UserRole;
  reporterId: string;
  createdAt: string;
  lastCheckedAt: string;
  confirmationsCount: number;
  duplicateOfIssueId?: string;
  verificationNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  assignedDepartment?: string;
  resolutionNotes?: string;
  resolutionPhotoUrl?: string;
  resolvedAt?: string;
  recheckScheduledFor?: string;
  isStale?: boolean;
}

export interface HazardIssue {
  id: string;
  title: string;
  category: HazardCategory;
  severity: Severity;
  status: ReportStatus;
  latitude: number;
  longitude: number;
  address: string;
  reportIds: string[];
  primaryReportId: string;
  createdAt: string;
  updatedAt: string;
  assignedDepartment?: string;
}

export interface ReportEvidence {
  id: string;
  reportId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  comment: string;
  photoUrl?: string;
  createdAt: string;
}

export interface MaintenanceTask {
  id: string;
  issueId?: string;
  reportId: string;
  title: string;
  department: string;
  priorityScore: number;
  severity: Severity;
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold';
  assignedDate: string;
  targetCompletionDate: string;
  notes?: string;
  resolutionSummary?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  actorName: string;
  actorRole: UserRole;
  targetType: 'report' | 'issue' | 'task' | 'automation';
  targetId: string;
  summary: string;
  previousState?: string;
  newState?: string;
}

export interface RouteScoreBreakdown {
  footpathScore: number;
  lightingScore: number;
  crossingScore: number;
  accessibilityScore: number;
  hazardPenalty: number;
  dataCompletenessPenalty: number;
}

export interface ConstructionZoneDetail {
  id: string;
  title: string;
  location: string;
  severity: Severity;
  status: ReportStatus;
  hasDetour: boolean;
  detourDescription?: string;
  assignedDepartment?: string;
  description: string;
}

export interface BrokenInfrastructureDetail {
  id: string;
  type: 'broken_streetlight' | 'broken_pavement' | 'broken_signal' | 'broken_curb_ramp' | 'damaged_infrastructure';
  title: string;
  location: string;
  description: string;
  severity: Severity;
  status: ReportStatus;
}

export interface RouteInfrastructureAudit {
  totalStreetlights: number;
  workingStreetlights: number;
  brokenStreetlights: number;
  unlitSegmentsCount: number;
  lightingPercentage: number;
  lightingStatusSummary: string;
  lightingLevel: 'high' | 'moderate' | 'low';

  hasActiveConstruction: boolean;
  constructionCount: number;
  constructionDetails: ConstructionZoneDetail[];

  hasBrokenInfrastructure: boolean;
  brokenElementsCount: number;
  brokenElements: BrokenInfrastructureDetail[];

  totalObstacles: number;
  obstacleList: {
    id: string;
    title: string;
    category: HazardCategory;
    severity: Severity;
    status: ReportStatus;
    location: string;
    description: string;
  }[];
}

export interface PedestrianRoute {
  id: string;
  name: string;
  summary: string;
  distanceMeters: number;
  durationMinutes: number;
  coordinates: [number, number][];
  steps: {
    instruction: string;
    distanceMeters: number;
    streetName: string;
    hasFootpath: boolean;
    lighting: 'good' | 'fair' | 'poor' | 'unknown';
    crossingType?: 'signalized' | 'marked' | 'unmarked' | 'none';
  }[];
  dataCoveragePercent: number;
  conditionScore: number;
  breakdown: RouteScoreBreakdown;
  scoreExplanation: string;
  hazardsEncountered: HazardReport[];
  hasStairs: boolean;
  isWheelchairAccessible: boolean;
  lightingLevel: 'high' | 'moderate' | 'low' | 'unknown';
  isRecommended: boolean;
  isSafestRoute?: boolean;
  safetyBadge?: string;
  safetyReason?: string;
  safetyHighlights?: string[];
  infrastructureAudit: RouteInfrastructureAudit;
}

export interface AccessibilityPreferences {
  fewerStairs: boolean;
  wheelchairOnly: boolean;
  fewerDifficultCrossings: boolean;
  highDataCoverageOnly: boolean;
  lightingImportance: 'low' | 'medium' | 'high';
}

export interface MonitoredRoute {
  id: string;
  userId: string;
  name: string;
  startName: string;
  destinationName: string;
  startCoords: [number, number];
  destCoords: [number, number];
  activeAlertsCount: number;
  lastChecked: string;
  notes?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'hazard_verified' | 'status_change' | 'stale_recheck' | 'maintenance_update' | 'route_alert';
  timestamp: string;
  read: boolean;
  linkReportId?: string;
}

export interface WeeklySummary {
  weekStarting: string;
  generatedAt: string;
  totalNewReports: number;
  totalResolved: number;
  pendingVerificationCount: number;
  avgResolutionDays: number;
  recurringHotspots: {
    locationName: string;
    latitude: number;
    longitude: number;
    reportCount: number;
    topCategory: HazardCategory;
  }[];
  categoryBreakdown: Record<string, number>;
  keyRecommendations: string[];
}

export interface RouteFeedback {
  id: string;
  routeId?: string;
  routeName?: string;
  startLocation: string;
  destLocation: string;
  feedbackText: string;
  mediaUrl?: string;
  mediaType?: 'photo' | 'video' | 'none';
  category?: HazardCategory | 'general_unsafe' | 'other';
  severity?: Severity;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  userRole?: UserRole;
  userName?: string;
}
