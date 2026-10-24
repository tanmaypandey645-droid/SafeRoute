import fs from 'fs';
import path from 'path';
import {
  HazardReport,
  HazardIssue,
  ReportEvidence,
  MaintenanceTask,
  AuditLog,
  MonitoredRoute,
  NotificationItem,
  WeeklySummary,
  UserProfile,
  RouteFeedback,
} from '../types/index.ts';

interface SafeRouteDatabase {
  users: UserProfile[];
  reports: HazardReport[];
  issues: HazardIssue[];
  evidence: ReportEvidence[];
  tasks: MaintenanceTask[];
  auditLogs: AuditLog[];
  monitoredRoutes: MonitoredRoute[];
  notifications: NotificationItem[];
  weeklySummaries: WeeklySummary[];
  feedbacks?: RouteFeedback[];
}

const DB_FILE = path.resolve(process.cwd(), 'data', 'saferoute-db.json');

const INITIAL_DB: SafeRouteDatabase = {
  users: [
    {
      id: 'usr_citizen_1',
      name: 'Maya Lin',
      role: 'citizen',
      email: 'maya.lin@example.com',
    },
    {
      id: 'usr_verifier_1',
      name: 'Officer David Vance',
      role: 'verifier',
      email: 'd.vance@citywalk.gov',
    },
    {
      id: 'usr_admin_1',
      name: 'Elena Rostova',
      role: 'admin',
      email: 'elena.rostova@transport.gov',
    },
  ],
  reports: [
    {
      id: 'rep_gzb_1',
      issueId: 'iss_gzb_1',
      title: 'Excavated Footpath & Missing Detour at RDC Commercial Hub',
      description: 'Underground optical fiber trench work has blocked the north sidewalk along Raj Nagar District Centre (RDC). Orange barricades with no ramp forcing pedestrians onto high-traffic road.',
      category: 'roadwork',
      severity: 'high',
      status: 'verified',
      latitude: 28.6750,
      longitude: 77.4430,
      address: 'RDC, Raj Nagar, Ghaziabad, UP',
      photoUrl: '/src/assets/images/hazard_sidewalk_work_1792004205031.jpg',
      reportedBy: 'Aarav Sharma',
      reporterRole: 'citizen',
      reporterId: 'usr_aarav_1',
      createdAt: '2026-10-14T09:15:00.000Z',
      lastCheckedAt: '2026-10-15T11:00:00.000Z',
      confirmationsCount: 16,
      verifiedBy: 'Officer David Vance',
      verifiedAt: '2026-10-14T14:20:00.000Z',
      verificationNotes: 'Physical inspection completed. Notice served to contractor to install non-slip walking ramp by tomorrow morning.',
      assignedDepartment: 'Department of Public Works - Footpath Division',
      isStale: false,
    },
    {
      id: 'rep_gzb_2',
      issueId: 'iss_gzb_2',
      title: 'Dark Intersection & Non-Functional Streetlights on GT Road',
      description: 'Multiple street poles dark between Old Bus Stand and Navyug Market. Pedestrian zebra crossing is poorly illuminated after 7:00 PM.',
      category: 'broken_streetlight',
      severity: 'medium',
      status: 'assigned',
      latitude: 28.6652,
      longitude: 77.4389,
      address: 'Near Old Bus Stand, Navyug Market, Ghaziabad, UP',
      photoUrl: '/src/assets/images/hazard_street_lamp_1792004206155.jpg',
      reportedBy: 'Pooja Verma',
      reporterRole: 'citizen',
      reporterId: 'usr_pooja_2',
      createdAt: '2026-10-11T19:40:00.000Z',
      lastCheckedAt: '2026-10-14T10:00:00.000Z',
      confirmationsCount: 9,
      verifiedBy: 'Officer David Vance',
      verifiedAt: '2026-10-12T09:30:00.000Z',
      assignedDepartment: 'Bureau of Street Lighting & Signals',
      isStale: false,
    },
    {
      id: 'rep_gzb_3',
      issueId: 'iss_gzb_3',
      title: 'Unmarked Multi-Lane Turning Hazard at Mohan Nagar Crossing',
      description: 'Vehicles turning rapidly from Link Road towards GT Road fail to yield. Pedestrian push-button countdown lens is broken.',
      category: 'difficult_crossing',
      severity: 'critical',
      status: 'under_review',
      latitude: 28.6791,
      longitude: 77.3882,
      address: 'Mohan Nagar Intersection, Ghaziabad, UP',
      reportedBy: 'Rohan Mehra',
      reporterRole: 'citizen',
      reporterId: 'usr_rohan_3',
      createdAt: '2026-10-13T16:00:00.000Z',
      lastCheckedAt: '2026-10-13T16:00:00.000Z',
      confirmationsCount: 7,
      isStale: false,
    },
    {
      id: 'rep_gzb_4',
      issueId: 'iss_gzb_4',
      title: 'Missing Curb Cut & Broken Tactile Paving at Vaishali Metro Gate',
      description: 'High 6-inch kerb without ramp blocks wheelchair passengers exiting Vaishali Metro station pedestrian plaza.',
      category: 'accessibility_barrier',
      severity: 'high',
      status: 'verified',
      latitude: 28.6495,
      longitude: 77.3395,
      address: 'Vaishali Metro Station Entrance, Ghaziabad, UP',
      reportedBy: 'Vikram Joshi',
      reporterRole: 'citizen',
      reporterId: 'usr_vikram_4',
      createdAt: '2026-10-08T11:20:00.000Z',
      lastCheckedAt: '2026-10-13T15:00:00.000Z',
      confirmationsCount: 12,
      verifiedBy: 'Officer David Vance',
      verifiedAt: '2026-10-09T10:00:00.000Z',
      assignedDepartment: 'Accessible Transportation Committee',
      isStale: false,
    },
    {
      id: 'rep_gzb_5',
      issueId: 'iss_gzb_5',
      title: 'Deep Waterlogging on Pedestrian Approach near Indirapuram Park',
      description: 'Poor drainage creates a 3-inch stagnant rainwater puddle blocking the walkway to Swarna Jayanti Park.',
      category: 'waterlogging',
      severity: 'medium',
      status: 'submitted',
      latitude: 28.6366,
      longitude: 77.3686,
      address: 'Near Swarna Jayanti Park, Indirapuram, Ghaziabad, UP',
      reportedBy: 'Simran Kaur',
      reporterRole: 'citizen',
      reporterId: 'usr_simran_5',
      createdAt: '2026-10-15T08:00:00.000Z',
      lastCheckedAt: '2026-10-15T08:00:00.000Z',
      confirmationsCount: 4,
      isStale: false,
    },
    {
      id: 'rep_gzb_6',
      issueId: 'iss_gzb_6',
      title: 'Broken Pavement Slabs & Deep Concrete Fissure on Ashok Marg',
      description: 'Extensive broken concrete slabs and displaced curb stones along the Ashok Marg walking path. Exposed metal rebar poses a severe trip hazard at night.',
      category: 'uneven_pavement',
      severity: 'medium',
      status: 'verified',
      latitude: 28.6715,
      longitude: 77.4410,
      address: 'Ashok Marg Sidewalk near RDC, Ghaziabad, UP',
      reportedBy: 'Nitin Gupta',
      reporterRole: 'citizen',
      reporterId: 'usr_nitin_6',
      createdAt: '2026-10-16T11:00:00.000Z',
      lastCheckedAt: '2026-10-17T09:30:00.000Z',
      confirmationsCount: 11,
      verifiedBy: 'Officer David Vance',
      verifiedAt: '2026-10-16T15:00:00.000Z',
      verificationNotes: 'Tripping hazard verified on eastern pedestrian corridor. Section cordoned with reflective tape.',
      assignedDepartment: 'Department of Public Works - Footpath Division',
      isStale: false,
    },
    {
      id: 'rep_gzb_7',
      issueId: 'iss_gzb_7',
      title: 'Active Storm Drainage Pipeline Construction on Navyug Market Road',
      description: 'Heavy municipal excavation and pipeline replacement. Sidewalk is completely dug up with orange construction cones and no safe temporary crossing ramp.',
      category: 'roadwork',
      severity: 'high',
      status: 'assigned',
      latitude: 28.6672,
      longitude: 77.4425,
      address: 'Navyug Market Approach Road, Ghaziabad, UP',
      photoUrl: '/src/assets/images/hazard_sidewalk_work_1792004205031.jpg',
      reportedBy: 'Anjali Sharma',
      reporterRole: 'citizen',
      reporterId: 'usr_anjali_7',
      createdAt: '2026-10-16T14:20:00.000Z',
      lastCheckedAt: '2026-10-17T16:00:00.000Z',
      confirmationsCount: 15,
      verifiedBy: 'Officer David Vance',
      verifiedAt: '2026-10-17T09:00:00.000Z',
      verificationNotes: 'Active construction trench confirmed. Contractor instructed to install elevated wood ramps for pedestrian detour.',
      assignedDepartment: 'Department of Public Works - Footpath Division',
      isStale: false,
    },
    {
      id: 'rep_101',
      issueId: 'iss_1',
      title: 'Active Sidewalk Excavation with Missing Pedestrian Detour',
      description: 'Major concrete trench work on the north sidewalk of Market St. Orange barricades block the entire walkway without an ADA-compliant ramp or marked pedestrian bypass.',
      category: 'roadwork',
      severity: 'high',
      status: 'verified',
      latitude: 37.7892,
      longitude: -122.4014,
      address: '585 Market St (near 2nd St), Financial District',
      photoUrl: '/src/assets/images/hazard_sidewalk_work_1792004205031.jpg',
      reportedBy: 'Carlos Mendes',
      reporterRole: 'citizen',
      reporterId: 'usr_carlos_9',
      createdAt: '2026-10-09T08:30:00.000Z',
      lastCheckedAt: '2026-10-13T14:20:00.000Z',
      confirmationsCount: 14,
      verifiedBy: 'Officer David Vance',
      verifiedAt: '2026-10-09T11:45:00.000Z',
      verificationNotes: 'Inspected on-site. Contractor permitted through Oct 24, but pedestrian ramp was missing. Citation issued to contractor.',
      assignedDepartment: 'Department of Public Works - Footpath Division',
      isStale: false,
    },
    {
      id: 'rep_102',
      issueId: 'iss_2',
      title: 'Broken Streetlight Cluster Near Transit Crossing',
      description: 'Three consecutive decorative streetlights are out at the intersection of Mission St and 3rd St. Crosswalk is completely pitch-black after 7:30 PM.',
      category: 'broken_streetlight',
      severity: 'medium',
      status: 'assigned',
      latitude: 37.7865,
      longitude: -122.4038,
      address: 'Mission St & 3rd St, SoMa',
      photoUrl: '/src/assets/images/hazard_street_lamp_1792004206155.jpg',
      reportedBy: 'Sarah Jenkins',
      reporterRole: 'citizen',
      reporterId: 'usr_sarah_4',
      createdAt: '2026-10-05T20:15:00.000Z',
      lastCheckedAt: '2026-10-12T09:00:00.000Z',
      confirmationsCount: 8,
      verifiedBy: 'Officer David Vance',
      verifiedAt: '2026-10-06T09:30:00.000Z',
      verificationNotes: 'Underground wiring short verified with Public Utilities Commission.',
      assignedDepartment: 'Bureau of Street Lighting & Signals',
      isStale: false,
    },
    {
      id: 'rep_103',
      issueId: 'iss_3',
      title: 'Unmarked High-Speed Turning Crossing',
      description: 'Vehicles turning right from Fremont St onto Howard St frequently fail to yield. Pedestrian countdown signal has broken yellow lens.',
      category: 'difficult_crossing',
      severity: 'critical',
      status: 'under_review',
      latitude: 37.7885,
      longitude: -122.3962,
      address: 'Fremont St & Howard St, Transbay District',
      reportedBy: 'Devon Patel',
      reporterRole: 'citizen',
      reporterId: 'usr_devon_3',
      createdAt: '2026-10-12T17:10:00.000Z',
      lastCheckedAt: '2026-10-12T17:10:00.000Z',
      confirmationsCount: 5,
      isStale: false,
    },
    {
      id: 'rep_104',
      issueId: 'iss_4',
      title: 'Cracked Slab & 2.5-Inch Pothole Lip on Sidewalk',
      description: 'Severely cracked sidewalk flags with a raised tree root edge causing tripping hazards. Wheelchair users cannot cross without tipping.',
      category: 'uneven_pavement',
      severity: 'medium',
      status: 'needs_rechecking',
      latitude: 37.7915,
      longitude: -122.4048,
      address: 'Post St near Kearny St',
      reportedBy: 'Elena Rostova',
      reporterRole: 'admin',
      reporterId: 'usr_admin_1',
      createdAt: '2026-09-18T10:00:00.000Z',
      lastCheckedAt: '2026-09-22T11:00:00.000Z',
      confirmationsCount: 11,
      isStale: true,
      verificationNotes: 'Previous contractor patch was scheduled for late September. Needs immediate on-site recheck.',
      recheckScheduledFor: '2026-10-18',
    },
    {
      id: 'rep_105',
      issueId: 'iss_5',
      title: 'Steep Curb Ramp Cutout Blocked by Waterlogging Pond',
      description: 'Curb cut at corner collects standing stormwater during rain; water level reaches 4 inches deep preventing wheelchair transit.',
      category: 'waterlogging',
      severity: 'high',
      status: 'submitted',
      latitude: 37.7842,
      longitude: -122.4071,
      address: 'Howard St & 4th St',
      reportedBy: 'Marcus Brody',
      reporterRole: 'citizen',
      reporterId: 'usr_marcus_2',
      createdAt: '2026-10-14T06:40:00.000Z',
      lastCheckedAt: '2026-10-14T06:40:00.000Z',
      confirmationsCount: 2,
      isStale: false,
    },
    {
      id: 'rep_106',
      issueId: 'iss_6',
      title: 'Overgrown Acacia Branches Obstructing Narrow Pavement',
      description: 'Private property hedge has extended across 70% of sidewalk width. Pedestrians forced to step onto active vehicle traffic lane.',
      category: 'debris_foliage',
      severity: 'low',
      status: 'resolved',
      latitude: 37.7828,
      longitude: -122.3995,
      address: 'Folsom St near 1st St',
      reportedBy: 'Liam O’Connor',
      reporterRole: 'citizen',
      reporterId: 'usr_liam_7',
      createdAt: '2026-09-28T14:00:00.000Z',
      lastCheckedAt: '2026-10-04T16:00:00.000Z',
      confirmationsCount: 6,
      verifiedBy: 'Officer David Vance',
      verifiedAt: '2026-09-29T10:00:00.000Z',
      assignedDepartment: 'Code Enforcement & Urban Forestry',
      resolvedAt: '2026-10-04T15:30:00.000Z',
      resolutionNotes: 'Property owner served notice and pruned foliage back to property boundary. Sidewalk width restored to 2.4 meters.',
      isStale: false,
    },
    {
      id: 'rep_107',
      issueId: 'iss_7',
      title: 'Missing Tactile Paving & Broken Audible Pedestrian Signal',
      description: 'Audible chirp speaker is dead; tactile blister surface tiles are peeling and loose, creating a disorientation hazard for visually impaired pedestrians.',
      category: 'accessibility_barrier',
      severity: 'high',
      status: 'assigned',
      latitude: 37.7942,
      longitude: -122.3984,
      address: 'California St & Battery St, Financial District',
      reportedBy: 'Rachel Wong',
      reporterRole: 'citizen',
      reporterId: 'usr_rachel_5',
      createdAt: '2026-10-08T12:00:00.000Z',
      lastCheckedAt: '2026-10-11T10:00:00.000Z',
      confirmationsCount: 9,
      verifiedBy: 'Officer David Vance',
      verifiedAt: '2026-10-09T14:00:00.000Z',
      assignedDepartment: 'Accessible Transportation Committee',
      isStale: false,
    },
  ],
  issues: [
    {
      id: 'iss_1',
      title: 'Sidewalk Excavation at 585 Market St',
      category: 'roadwork',
      severity: 'high',
      status: 'verified',
      latitude: 37.7892,
      longitude: -122.4014,
      address: '585 Market St, Financial District',
      reportIds: ['rep_101'],
      primaryReportId: 'rep_101',
      createdAt: '2026-10-09T08:30:00.000Z',
      updatedAt: '2026-10-13T14:20:00.000Z',
      assignedDepartment: 'Department of Public Works - Footpath Division',
    },
    {
      id: 'iss_2',
      title: 'Dark Intersection at Mission St & 3rd St',
      category: 'broken_streetlight',
      severity: 'medium',
      status: 'assigned',
      latitude: 37.7865,
      longitude: -122.4038,
      address: 'Mission St & 3rd St',
      reportIds: ['rep_102'],
      primaryReportId: 'rep_102',
      createdAt: '2026-10-05T20:15:00.000Z',
      updatedAt: '2026-10-12T09:00:00.000Z',
      assignedDepartment: 'Bureau of Street Lighting & Signals',
    },
  ],
  evidence: [
    {
      id: 'evi_1',
      reportId: 'rep_101',
      userId: 'usr_verifier_1',
      userName: 'Officer David Vance',
      userRole: 'verifier',
      comment: 'Met with lead foreman on site. Demanded temporary non-slip modular ramp installation by end of day tomorrow.',
      createdAt: '2026-10-10T14:00:00.000Z',
    },
  ],
  tasks: [
    {
      id: 'tsk_1',
      issueId: 'iss_1',
      reportId: 'rep_101',
      title: 'Deploy ADA Compliant Temporary Footpath Ramp & Barricade Inspection',
      department: 'Department of Public Works - Footpath Division',
      priorityScore: 88,
      severity: 'high',
      status: 'in_progress',
      assignedDate: '2026-10-10T09:00:00.000Z',
      targetCompletionDate: '2026-10-16T18:00:00.000Z',
      notes: 'High pedestrian volume corridor near Montgomery BART station entrance.',
    },
  ],
  auditLogs: [
    {
      id: 'log_1',
      timestamp: '2026-10-09T11:45:00.000Z',
      action: 'VERIFY_REPORT',
      actorName: 'Officer David Vance',
      actorRole: 'verifier',
      targetType: 'report',
      targetId: 'rep_101',
      summary: 'Verified report rep_101 after physical site inspection at 585 Market St.',
      previousState: 'submitted',
      newState: 'verified',
    },
  ],
  monitoredRoutes: [
    {
      id: 'mon_1',
      userId: 'usr_citizen_1',
      name: 'Daily Commute: Ferry Building to SOMA Office',
      startName: 'San Francisco Ferry Building',
      destinationName: '3rd & Howard St, SOMA',
      startCoords: [37.7955, -122.3937],
      destCoords: [37.7858, -122.4005],
      activeAlertsCount: 2,
      lastChecked: '2026-10-14T10:00:00.000Z',
      notes: 'Morning and evening walking route. Prefers well-lit paths.',
    },
  ],
  notifications: [
    {
      id: 'notif_1',
      userId: 'usr_citizen_1',
      title: 'Hazard Verified on Monitored Route',
      message: 'A high-severity sidewalk excavation hazard at 585 Market St was verified along your Ferry Building commute corridor.',
      type: 'route_alert',
      timestamp: '2026-10-09T11:46:00.000Z',
      read: false,
      linkReportId: 'rep_101',
    },
  ],
  weeklySummaries: [
    {
      weekStarting: '2026-10-07',
      generatedAt: '2026-10-14T08:00:00.000Z',
      totalNewReports: 7,
      totalResolved: 3,
      pendingVerificationCount: 2,
      avgResolutionDays: 4.8,
      recurringHotspots: [
        {
          locationName: 'Market St & 2nd St Corridor',
          latitude: 37.7892,
          longitude: -122.4014,
          reportCount: 3,
          topCategory: 'roadwork',
        },
      ],
      categoryBreakdown: {
        roadwork: 2,
        broken_streetlight: 2,
        difficult_crossing: 1,
        uneven_pavement: 1,
        accessibility_barrier: 1,
      },
      keyRecommendations: [
        'Contractor pedestrian bypass compliance requires weekly spot audits along Market St utility corridor.',
        'Prioritize streetlight cable replacement at 3rd St before daylight saving transitions.',
      ],
    },
  ],
};

class Storage {
  private db: SafeRouteDatabase;

  constructor() {
    this.db = this.loadDatabase();
  }

  private loadDatabase(): SafeRouteDatabase {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Could not read existing database, initializing seed:', err);
    }
    this.saveDatabase(INITIAL_DB);
    return JSON.parse(JSON.stringify(INITIAL_DB));
  }

  private saveDatabase(data: SafeRouteDatabase): void {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save database to disk:', err);
    }
  }

  public getReports(): HazardReport[] {
    return this.db.reports;
  }

  public getReportById(id: string): HazardReport | undefined {
    return this.db.reports.find((r) => r.id === id);
  }

  public createReport(report: HazardReport): HazardReport {
    this.db.reports.unshift(report);

    let issue = this.db.issues.find(
      (iss) =>
        iss.category === report.category &&
        this.getDistanceMeters(iss.latitude, iss.longitude, report.latitude, report.longitude) < 60
    );

    if (issue) {
      issue.reportIds.push(report.id);
      issue.updatedAt = new Date().toISOString();
      report.issueId = issue.id;
      report.duplicateOfIssueId = issue.id;
    } else {
      const newIssue: HazardIssue = {
        id: `iss_${Date.now()}`,
        title: report.title,
        category: report.category,
        severity: report.severity,
        status: report.status,
        latitude: report.latitude,
        longitude: report.longitude,
        address: report.address,
        reportIds: [report.id],
        primaryReportId: report.id,
        createdAt: report.createdAt,
        updatedAt: report.createdAt,
      };
      this.db.issues.unshift(newIssue);
      report.issueId = newIssue.id;
    }

    this.saveDatabase(this.db);
    return report;
  }

  public updateReport(id: string, updates: Partial<HazardReport>): HazardReport | undefined {
    const idx = this.db.reports.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;
    this.db.reports[idx] = { ...this.db.reports[idx], ...updates };

    if (this.db.reports[idx].issueId) {
      const issue = this.db.issues.find((i) => i.id === this.db.reports[idx].issueId);
      if (issue) {
        if (updates.status) issue.status = updates.status;
        if (updates.severity) issue.severity = updates.severity;
        issue.updatedAt = new Date().toISOString();
      }
    }

    this.saveDatabase(this.db);
    return this.db.reports[idx];
  }

  public getIssues(): HazardIssue[] {
    return this.db.issues;
  }

  public getEvidence(reportId: string): ReportEvidence[] {
    return this.db.evidence.filter((e) => e.reportId === reportId);
  }

  public addEvidence(evidence: ReportEvidence): ReportEvidence {
    this.db.evidence.unshift(evidence);
    this.saveDatabase(this.db);
    return evidence;
  }

  public getTasks(): MaintenanceTask[] {
    return this.db.tasks;
  }

  public createTask(task: MaintenanceTask): MaintenanceTask {
    this.db.tasks.unshift(task);
    this.saveDatabase(this.db);
    return task;
  }

  public updateTask(id: string, updates: Partial<MaintenanceTask>): MaintenanceTask | undefined {
    const idx = this.db.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return undefined;
    this.db.tasks[idx] = { ...this.db.tasks[idx], ...updates };
    this.saveDatabase(this.db);
    return this.db.tasks[idx];
  }

  public getAuditLogs(): AuditLog[] {
    return this.db.auditLogs;
  }

  public addAuditLog(log: AuditLog): void {
    this.db.auditLogs.unshift(log);
    this.saveDatabase(this.db);
  }

  public getMonitoredRoutes(): MonitoredRoute[] {
    return this.db.monitoredRoutes;
  }

  public createMonitoredRoute(route: MonitoredRoute): MonitoredRoute {
    this.db.monitoredRoutes.unshift(route);
    this.saveDatabase(this.db);
    return route;
  }

  public deleteMonitoredRoute(id: string): boolean {
    const initialLen = this.db.monitoredRoutes.length;
    this.db.monitoredRoutes = this.db.monitoredRoutes.filter((r) => r.id !== id);
    if (this.db.monitoredRoutes.length !== initialLen) {
      this.saveDatabase(this.db);
      return true;
    }
    return false;
  }

  public getNotifications(): NotificationItem[] {
    return this.db.notifications;
  }

  public addNotification(notification: NotificationItem): void {
    this.db.notifications.unshift(notification);
    this.saveDatabase(this.db);
  }

  public markNotificationsRead(): void {
    this.db.notifications.forEach((n) => (n.read = true));
    this.saveDatabase(this.db);
  }

  public getWeeklySummaries(): WeeklySummary[] {
    return this.db.weeklySummaries;
  }

  public addWeeklySummary(summary: WeeklySummary): void {
    this.db.weeklySummaries.unshift(summary);
    this.saveDatabase(this.db);
  }

  public getFeedbacks(): RouteFeedback[] {
    return this.db.feedbacks || [];
  }

  public addFeedback(feedback: RouteFeedback): RouteFeedback {
    if (!this.db.feedbacks) {
      this.db.feedbacks = [];
    }
    this.db.feedbacks.unshift(feedback);
    this.saveDatabase(this.db);
    return feedback;
  }

  public getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export const db = new Storage();
