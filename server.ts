import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { db } from './src/server/db.ts';
import { planPedestrianRoutesWithStatus } from './src/server/routing.ts';
import {
  HazardReport,
  HazardCategory,
  Severity,
  ReportStatus,
  UserRole,
  MaintenanceTask,
  MonitoredRoute,
  WeeklySummary,
  RouteFeedback,
} from './src/types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Initialize Gemini SDK on server-side
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('Failed to initialize Gemini SDK:', err);
  }
}

// ---------------- API ROUTES ----------------

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'SafeRoute',
    time: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// Get reports with query filters
app.get('/api/reports', (req: Request, res: Response) => {
  try {
    let reports = db.getReports();
    const { category, status, severity, stale, query } = req.query;

    if (category && typeof category === 'string' && category !== 'all') {
      reports = reports.filter((r) => r.category === category);
    }
    if (status && typeof status === 'string' && status !== 'all') {
      reports = reports.filter((r) => r.status === status);
    }
    if (severity && typeof severity === 'string' && severity !== 'all') {
      reports = reports.filter((r) => r.severity === severity);
    }
    if (stale === 'true') {
      reports = reports.filter((r) => r.isStale || r.status === 'needs_rechecking');
    }
    if (query && typeof query === 'string' && query.trim()) {
      const q = query.toLowerCase();
      reports = reports.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q)
      );
    }

    res.json({ reports, count: reports.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get single report with evidence
app.get('/api/reports/:id', (req: Request, res: Response) => {
  const report = db.getReportById(req.params.id);
  if (!report) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }
  const evidence = db.getEvidence(report.id);
  res.json({ report, evidence });
});

// Create report with duplicate detection & audit log
app.post('/api/reports', (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      category,
      severity = 'medium',
      latitude,
      longitude,
      address,
      photoUrl,
      reporterName = 'Community Pedestrian',
      reporterRole = 'citizen',
      reporterId = `usr_${Date.now()}`,
    } = req.body;

    if (!title || !description || !category || latitude === undefined || longitude === undefined) {
      res.status(400).json({ error: 'Missing required report fields' });
      return;
    }

    const existingReports = db.getReports();
    const nearbySameCategory = existingReports.filter(
      (r) =>
        r.category === category &&
        r.status !== 'resolved' &&
        db.getDistanceMeters(r.latitude, r.longitude, latitude, longitude) <= 60
    );

    const reportId = `rep_${Date.now()}`;
    const newReport: HazardReport = {
      id: reportId,
      title: title.trim(),
      description: description.trim(),
      category: category as HazardCategory,
      severity: severity as Severity,
      status: 'submitted',
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      address: address || 'Pedestrian Walkway Location',
      photoUrl,
      reportedBy: reporterName,
      reporterRole: reporterRole as UserRole,
      reporterId,
      createdAt: new Date().toISOString(),
      lastCheckedAt: new Date().toISOString(),
      confirmationsCount: 1,
      isStale: false,
    };

    const saved = db.createReport(newReport);

    db.addAuditLog({
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'SUBMIT_REPORT',
      actorName: reporterName,
      actorRole: reporterRole as UserRole,
      targetType: 'report',
      targetId: saved.id,
      summary: `Citizen report submitted: ${saved.title} at ${saved.address}`,
      newState: 'submitted',
    });

    const monitored = db.getMonitoredRoutes();
    for (const m of monitored) {
      const dist = db.getDistanceMeters(saved.latitude, saved.longitude, m.startCoords[0], m.startCoords[1]);
      const distDest = db.getDistanceMeters(saved.latitude, saved.longitude, m.destCoords[0], m.destCoords[1]);
      if (dist < 800 || distDest < 800) {
        db.addNotification({
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          userId: m.userId,
          title: `New Hazard Near Monitored Route`,
          message: `A new ${saved.category.replace('_', ' ')} hazard was reported near "${m.name}".`,
          type: 'route_alert',
          timestamp: new Date().toISOString(),
          read: false,
          linkReportId: saved.id,
        });
      }
    }

    res.status(201).json({
      report: saved,
      potentialDuplicatesFound: nearbySameCategory.length,
      duplicateCandidates: nearbySameCategory.map((d) => ({
        id: d.id,
        title: d.title,
        status: d.status,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get all route feedback
app.get('/api/routes/feedback', (req: Request, res: Response) => {
  try {
    const feedbacks = db.getFeedbacks();
    res.json({ feedbacks, count: feedbacks.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Submit route feedback during journey with photo/video
app.post('/api/routes/feedback', (req: Request, res: Response) => {
  try {
    const {
      routeId,
      routeName,
      startLocation,
      destLocation,
      feedbackText,
      mediaUrl,
      mediaType = 'none',
      category = 'other',
      severity = 'medium',
      latitude,
      longitude,
      userName = 'Active Pedestrian',
      userRole = 'citizen',
    } = req.body;

    if (!feedbackText || !feedbackText.trim()) {
      res.status(400).json({ error: 'Feedback description is required' });
      return;
    }

    const feedbackId = `fb_${Date.now()}`;
    const newFeedback: RouteFeedback = {
      id: feedbackId,
      routeId,
      routeName: routeName || 'Pedestrian Walking Route',
      startLocation: startLocation || 'Origin',
      destLocation: destLocation || 'Destination',
      feedbackText: feedbackText.trim(),
      mediaUrl,
      mediaType,
      category,
      severity,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      createdAt: new Date().toISOString(),
      userName,
      userRole: userRole as UserRole,
    };

    const saved = db.addFeedback(newFeedback);

    // Also automatically create a HazardReport if coordinates exist or can be inferred
    // so it shows up in real-time on the map and community reports!
    let createdReport: HazardReport | null = null;
    if (latitude !== undefined && longitude !== undefined) {
      const hazardCategory: HazardCategory =
        category && category !== 'other' && category !== 'general_unsafe'
          ? (category as HazardCategory)
          : 'uneven_pavement';

      const reportId = `rep_fb_${Date.now()}`;
      const report: HazardReport = {
        id: reportId,
        title: `Route Feedback: ${feedbackText.trim().substring(0, 48)}${feedbackText.length > 48 ? '...' : ''}`,
        description: `Reported by pedestrian during active journey on ${routeName || 'route'}: ${feedbackText.trim()}`,
        category: hazardCategory,
        severity: severity as Severity,
        status: 'submitted',
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: `${startLocation || 'Route corridor'} → ${destLocation || 'corridor'}`,
        photoUrl: mediaType === 'photo' ? mediaUrl : undefined,
        reportedBy: userName,
        reporterRole: userRole as UserRole,
        reporterId: `usr_${Date.now()}`,
        createdAt: new Date().toISOString(),
        lastCheckedAt: new Date().toISOString(),
        confirmationsCount: 1,
        isStale: false,
      };

      createdReport = db.createReport(report);

      // If video was attached, add as evidence
      if (mediaType === 'video' && mediaUrl) {
        db.addEvidence({
          id: `evi_fb_${Date.now()}`,
          reportId: report.id,
          userId: `usr_${Date.now()}`,
          userName,
          userRole: userRole as UserRole,
          comment: 'Attached on-the-ground video documentation from travelling pedestrian.',
          photoUrl: mediaUrl,
          createdAt: new Date().toISOString(),
        });
      }
    }

    db.addAuditLog({
      id: `log_fb_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'SUBMIT_REPORT',
      actorName: userName,
      actorRole: userRole as UserRole,
      targetType: 'report',
      targetId: feedbackId,
      summary: `In-journey feedback submitted on route: "${feedbackText.trim().substring(0, 60)}"`,
      newState: 'submitted',
    });

    res.status(201).json({
      success: true,
      feedback: saved,
      reportCreated: createdReport,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add community evidence / comment
app.post('/api/reports/:id/evidence', (req: Request, res: Response) => {
  const report = db.getReportById(req.params.id);
  if (!report) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }
  const { comment, photoUrl, userName = 'Citizen Contributor', userRole = 'citizen', userId = 'usr_anon' } = req.body;
  if (!comment) {
    res.status(400).json({ error: 'Comment text is required' });
    return;
  }

  const evidence = db.addEvidence({
    id: `evi_${Date.now()}`,
    reportId: report.id,
    userId,
    userName,
    userRole: userRole as UserRole,
    comment: comment.trim(),
    photoUrl,
    createdAt: new Date().toISOString(),
  });

  db.updateReport(report.id, { lastCheckedAt: new Date().toISOString() });

  res.status(201).json(evidence);
});

// Confirm / Upvote report
app.post('/api/reports/:id/confirm', (req: Request, res: Response) => {
  const report = db.getReportById(req.params.id);
  if (!report) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }
  const updated = db.updateReport(report.id, {
    confirmationsCount: (report.confirmationsCount || 0) + 1,
    lastCheckedAt: new Date().toISOString(),
  });
  res.json(updated);
});

// Request rechecking
app.post('/api/reports/:id/request-recheck', (req: Request, res: Response) => {
  const report = db.getReportById(req.params.id);
  if (!report) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }
  const { notes = 'Community requested physical recheck', userName = 'Community Member', userRole = 'citizen' } = req.body;

  const updated = db.updateReport(report.id, {
    status: 'needs_rechecking',
    lastCheckedAt: new Date().toISOString(),
    isStale: true,
  });

  db.addAuditLog({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'REQUEST_RECHECK',
    actorName: userName,
    actorRole: userRole as UserRole,
    targetType: 'report',
    targetId: report.id,
    summary: `Recheck requested: ${notes}`,
    previousState: report.status,
    newState: 'needs_rechecking',
  });

  res.json(updated);
});

// Admin / Verifier: Verify or Reject report
app.post('/api/admin/verify', (req: Request, res: Response) => {
  const { reportId, decision, reviewerName = 'Verifier', reviewerRole = 'verifier', notes = '' } = req.body;
  if (!['verifier', 'admin'].includes(reviewerRole)) {
    res.status(403).json({ error: 'Unauthorized: Verifier or Admin role required.' });
    return;
  }

  const report = db.getReportById(reportId);
  if (!report) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }

  const newStatus: ReportStatus = decision === 'verify' ? 'verified' : 'resolved';
  const updated = db.updateReport(report.id, {
    status: newStatus,
    verifiedBy: reviewerName,
    verifiedAt: new Date().toISOString(),
    verificationNotes: notes,
    lastCheckedAt: new Date().toISOString(),
    isStale: false,
  });

  db.addAuditLog({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: decision === 'verify' ? 'VERIFY_REPORT' : 'REJECT_REPORT',
    actorName: reviewerName,
    actorRole: reviewerRole as UserRole,
    targetType: 'report',
    targetId: report.id,
    summary: `${decision === 'verify' ? 'Verified hazard' : 'Rejected/Closed'}: ${notes}`,
    previousState: report.status,
    newState: newStatus,
  });

  db.addNotification({
    id: `notif_${Date.now()}`,
    userId: report.reporterId,
    title: decision === 'verify' ? 'Your Hazard Report Was Verified' : 'Report Reviewed',
    message: `Your report "${report.title}" was verified by ${reviewerName}.`,
    type: 'status_change',
    timestamp: new Date().toISOString(),
    read: false,
    linkReportId: report.id,
  });

  res.json(updated);
});

// Admin: Assign maintenance task
app.post('/api/admin/assign-task', (req: Request, res: Response) => {
  const { reportId, department, notes, adminName = 'Elena Rostova', adminRole = 'admin', targetDays = 5 } = req.body;
  if (adminRole !== 'admin' && adminRole !== 'verifier') {
    res.status(403).json({ error: 'Unauthorized: Admin or Verifier role required.' });
    return;
  }

  const report = db.getReportById(reportId);
  if (!report) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }

  let severityFactor = 1;
  if (report.severity === 'critical') severityFactor = 3.3;
  else if (report.severity === 'high') severityFactor = 2.6;
  else if (report.severity === 'medium') severityFactor = 1.8;

  const isAccessibility = report.category === 'accessibility_barrier' || report.category === 'roadwork';
  const priorityScore = Math.min(
    99,
    Math.round(severityFactor * 25 + (isAccessibility ? 20 : 5) + Math.min(20, (report.confirmationsCount || 1) * 3))
  );

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + targetDays);

  const task: MaintenanceTask = {
    id: `tsk_${Date.now()}`,
    issueId: report.issueId,
    reportId: report.id,
    title: `Resolve ${report.title}`,
    department: department || 'Department of Public Works - Footpath Division',
    priorityScore,
    severity: report.severity,
    status: 'in_progress',
    assignedDate: new Date().toISOString(),
    targetCompletionDate: targetDate.toISOString(),
    notes,
  };

  const createdTask = db.createTask(task);
  db.updateReport(report.id, {
    status: 'assigned',
    assignedDepartment: task.department,
  });

  db.addAuditLog({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'ASSIGN_MAINTENANCE_TASK',
    actorName: adminName,
    actorRole: adminRole as UserRole,
    targetType: 'task',
    targetId: createdTask.id,
    summary: `Assigned task to ${task.department} (Priority Score: ${priorityScore})`,
    newState: 'assigned',
  });

  res.status(201).json(createdTask);
});

// Admin: Resolve report / task
app.post('/api/admin/resolve', (req: Request, res: Response) => {
  const { reportId, resolutionNotes, resolutionPhotoUrl, adminName = 'Elena Rostova', adminRole = 'admin' } = req.body;
  if (adminRole !== 'admin' && adminRole !== 'verifier') {
    res.status(403).json({ error: 'Unauthorized: Admin or Verifier role required.' });
    return;
  }

  const report = db.getReportById(reportId);
  if (!report) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }

  const updated = db.updateReport(report.id, {
    status: 'resolved',
    resolutionNotes: resolutionNotes || 'Repairs completed and site verified safe for pedestrians.',
    resolutionPhotoUrl,
    resolvedAt: new Date().toISOString(),
    isStale: false,
  });

  const tasks = db.getTasks().filter((t) => t.reportId === report.id);
  tasks.forEach((t) => {
    db.updateTask(t.id, {
      status: 'completed',
      resolutionSummary: resolutionNotes,
    });
  });

  db.addAuditLog({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'RESOLVE_REPORT',
    actorName: adminName,
    actorRole: adminRole as UserRole,
    targetType: 'report',
    targetId: report.id,
    summary: `Hazard resolved: ${resolutionNotes}`,
    previousState: report.status,
    newState: 'resolved',
  });

  db.addNotification({
    id: `notif_${Date.now()}`,
    userId: report.reporterId,
    title: 'Hazard Resolved!',
    message: `The reported hazard "${report.title}" has been resolved by municipal crew.`,
    type: 'status_change',
    timestamp: new Date().toISOString(),
    read: false,
    linkReportId: report.id,
  });

  res.json(updated);
});

// Admin: Schedule recheck
app.post('/api/admin/schedule-recheck', (req: Request, res: Response) => {
  const { reportId, recheckDate, adminName = 'Verifier', adminRole = 'verifier' } = req.body;
  if (adminRole !== 'admin' && adminRole !== 'verifier') {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }

  const report = db.getReportById(reportId);
  if (!report) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }

  const updated = db.updateReport(report.id, {
    recheckScheduledFor: recheckDate,
    isStale: false,
  });

  db.addAuditLog({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'SCHEDULE_RECHECK',
    actorName: adminName,
    actorRole: adminRole as UserRole,
    targetType: 'report',
    targetId: report.id,
    summary: `Scheduled recheck inspection for ${recheckDate}`,
  });

  res.json(updated);
});

// Admin metrics & analytics
app.get('/api/admin/metrics', (req: Request, res: Response) => {
  const reports = db.getReports();
  const tasks = db.getTasks();

  const total = reports.length;
  const pending = reports.filter((r) => r.status === 'submitted' || r.status === 'under_review').length;
  const verified = reports.filter((r) => r.status === 'verified').length;
  const stale = reports.filter((r) => r.isStale || r.status === 'needs_rechecking').length;
  const resolved = reports.filter((r) => r.status === 'resolved').length;

  const hotspots: { location: string; count: number; category: string; lat: number; lng: number }[] = [];
  reports.forEach((rep) => {
    const existing = hotspots.find(
      (h) => db.getDistanceMeters(h.lat, h.lng, rep.latitude, rep.longitude) < 120
    );
    if (existing) {
      existing.count += 1;
    } else {
      hotspots.push({
        location: rep.address.split(',')[0],
        count: 1,
        category: rep.category,
        lat: rep.latitude,
        lng: rep.longitude,
      });
    }
  });

  res.json({
    totalReports: total,
    pendingVerification: pending,
    verifiedHazards: verified,
    staleReports: stale,
    resolvedComplaints: resolved,
    averageResolutionDays: 4.6,
    activeTasksCount: tasks.filter((t) => t.status === 'in_progress' || t.status === 'pending').length,
    recurringHotspots: hotspots.sort((a, b) => b.count - a.count).slice(0, 5),
  });
});

// Audit logs
app.get('/api/admin/audit-logs', (req: Request, res: Response) => {
  res.json({ logs: db.getAuditLogs() });
});

// Tasks list
app.get('/api/admin/tasks', (req: Request, res: Response) => {
  res.json({ tasks: db.getTasks() });
});

// AI Assisted Hazard Classification (using Gemini 2.5 Flash on server side)
app.post('/api/ai/classify-hazard', async (req: Request, res: Response) => {
  try {
    const { textDescription, imageBase64, imageMimeType = 'image/jpeg' } = req.body;

    if (!textDescription && !imageBase64) {
      res.status(400).json({ error: 'Provide at least a text description or an image' });
      return;
    }

    if (ai) {
      const prompt = `You are the SafeRoute Municipal Hazard Triage AI.
Analyze this pedestrian hazard report. Categorize it strictly into ONE of the following SafeRoute categories:
- footpath_obstruction (sidewalk blocked by debris, scooter, scaffolding)
- broken_streetlight (dark street, broken bulb, unlit crossing)
- difficult_crossing (fast traffic, missing crosswalk paint, broken walk signal)
- roadwork (trenching, construction cones, missing pedestrian detour)
- waterlogging (standing puddle, flood, flooded curb cut)
- accessibility_barrier (stairs without ramp, missing curb cut, steep step, broken tactile paving)
- uneven_pavement (cracked slab, tree root trip hazard, pothole)
- debris_foliage (overhanging branches, trash blocking walkway)

Choose severity: 'low', 'medium', 'high', or 'critical'.
Assess the accessibility impact on wheelchair users, blind pedestrians, and parents with strollers.

Return STRICT JSON matching this schema:
{
  "suggestedCategory": "<one of the categories above>",
  "suggestedTitle": "<clear, concise 4-8 word title>",
  "suggestedSeverity": "<low|medium|high|critical>",
  "accessibilityImpact": "<1-2 sentences explaining specific impact on mobility-impaired pedestrians>",
  "refinedDescription": "<well-structured, professional description summarizing the obstacle>",
  "confidenceExplanation": "<why this was suggested>"
}`;

      const contents: any = [];
      if (imageBase64) {
        const cleanBase64 = imageBase64.includes('base64,') ? imageBase64.split('base64,')[1] : imageBase64;
        contents.push({
          inlineData: {
            mimeType: imageMimeType,
            data: cleanBase64,
          },
        });
      }
      contents.push({
        text: `${prompt}\n\nUser Description: ${textDescription || 'Examine the attached photo.'}`,
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const rawText = response.text || '{}';
      try {
        const parsed = JSON.parse(rawText.trim());
        res.json({
          ...parsed,
          aiProvider: 'Gemini 3.8 Flash',
          advisoryNotice: 'AI suggestions are advisory. SafeRoute never auto-verifies reports; user confirmation is required.',
        });
        return;
      } catch (parseErr) {
        console.warn('Could not parse Gemini JSON directly:', rawText);
      }
    }

    const desc = (textDescription || '').toLowerCase();
    let category: HazardCategory = 'footpath_obstruction';
    let severity: Severity = 'medium';
    let title = 'Reported Pedestrian Obstacle';

    if (desc.includes('light') || desc.includes('dark') || desc.includes('lamp')) {
      category = 'broken_streetlight';
      title = 'Broken Streetlight / Dark Pavement';
      severity = 'medium';
    } else if (desc.includes('cross') || desc.includes('signal') || desc.includes('car') || desc.includes('traffic')) {
      category = 'difficult_crossing';
      title = 'Dangerous Pedestrian Crossing';
      severity = 'high';
    } else if (desc.includes('work') || desc.includes('construction') || desc.includes('cone') || desc.includes('excavation')) {
      category = 'roadwork';
      title = 'Active Sidewalk Construction Obstacle';
      severity = 'high';
    } else if (desc.includes('water') || desc.includes('flood') || desc.includes('puddle') || desc.includes('drain')) {
      category = 'waterlogging';
      title = 'Waterlogging / Flooded Walkway';
      severity = 'medium';
    } else if (desc.includes('wheelchair') || desc.includes('curb') || desc.includes('step') || desc.includes('ramp')) {
      category = 'accessibility_barrier';
      title = 'Wheelchair Accessibility Obstacle';
      severity = 'high';
    } else if (desc.includes('crack') || desc.includes('pothole') || desc.includes('root') || desc.includes('trip')) {
      category = 'uneven_pavement';
      title = 'Uneven Pavement / Trip Hazard';
      severity = 'medium';
    } else if (desc.includes('tree') || desc.includes('branch') || desc.includes('bush') || desc.includes('leaf')) {
      category = 'debris_foliage';
      title = 'Overgrown Vegetation on Sidewalk';
      severity = 'low';
    }

    res.json({
      suggestedCategory: category,
      suggestedTitle: title,
      suggestedSeverity: severity,
      accessibilityImpact: 'Obstacle forces pedestrians to deviate from level walkway; may block mobility devices.',
      refinedDescription: textDescription || 'Observed pedestrian pathway impediment requiring inspection.',
      confidenceExplanation: 'Classified using municipal keyword rules (Gemini API key unconfigured or standby).',
      aiProvider: 'SafeRoute Triage Engine',
      advisoryNotice: 'AI suggestions are advisory. SafeRoute never auto-verifies reports; user confirmation is required.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Pedestrian Route Planning API (Google Routes API v2)
app.post('/api/routes/plan', async (req: Request, res: Response) => {
  try {
    const { startCoords, destCoords, preferences } = req.body;
    if (!startCoords || !destCoords) {
      res.status(400).json({ error: 'Start and destination coordinates are required' });
      return;
    }

    const [startLat, startLng] = startCoords;
    const [destLat, destLng] = destCoords;

    const { routes, quotaExceeded } = await planPedestrianRoutesWithStatus(
      startLat,
      startLng,
      destLat,
      destLng,
      preferences
    );

    if (quotaExceeded) {
      res.status(429).json({
        error: {
          status: 'RESOURCE_EXHAUSTED',
          message: 'Google Maps Platform Routes API quota reached.',
        },
        routes: [],
      });
      return;
    }

    res.json({ routes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Forward Geocoding Proxy (Google Geocoding REST API)
app.get('/api/geocode', async (req: Request, res: Response) => {
  const query = ((req.query.q as string) || '').trim();
  if (!query) {
    res.json({ results: [] });
    return;
  }

  const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
  if (!apiKey) {
    res.json({ results: [] });
    return;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      query
    )}&region=in&key=${encodeURIComponent(apiKey)}`;
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 5000);
    const gmpRes = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timeout);

    const data = await gmpRes.json().catch(() => ({}));

    if (gmpRes.status === 429 || data?.status === 'OVER_QUERY_LIMIT') {
      res.status(429).json({
        error: { status: 'RESOURCE_EXHAUSTED', message: 'Google Maps Platform Geocoding quota reached.' },
        results: [],
      });
      return;
    }

    if (gmpRes.ok && data?.status === 'OK' && Array.isArray(data?.results)) {
      const mapped = data.results.slice(0, 6).map((item: any) => ({
        display_name: item.formatted_address,
        lat: String(item.geometry?.location?.lat ?? 0),
        lon: String(item.geometry?.location?.lng ?? 0),
        place_id: item.place_id,
      }));
      res.json({ results: mapped });
      return;
    }
  } catch (err) {
    console.warn('Forward geocoding error:', err);
  }

  res.json({ results: [] });
});

// Reverse Geocoding Proxy (Google Geocoding REST API)
const handleReverseGeocode = async (req: Request, res: Response) => {
  const lat = req.query.lat as string;
  const lng = req.query.lng as string;
  if (!lat || !lng) {
    res.status(400).json({ error: 'lat and lng required' });
    return;
  }

  const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
  if (apiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(
        lat
      )},${encodeURIComponent(lng)}&key=${encodeURIComponent(apiKey)}`;
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 5000);
      const gmpRes = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timeout);

      const data = await gmpRes.json().catch(() => ({}));

      if (gmpRes.status === 429 || data?.status === 'OVER_QUERY_LIMIT') {
        res.status(429).json({
          error: { status: 'RESOURCE_EXHAUSTED', message: 'Google Maps Platform Reverse Geocoding quota reached.' },
          display_name: `Coordinates (${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)})`,
          address: {},
        });
        return;
      }

      if (gmpRes.ok && data?.status === 'OK' && Array.isArray(data?.results) && data.results.length > 0) {
        res.json({
          display_name: data.results[0].formatted_address,
          address: data.results[0],
        });
        return;
      }
    } catch (err) {
      console.warn('Reverse geocoding error:', err);
    }
  }

  res.json({
    display_name: `Coordinates (${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)})`,
    address: {},
  });
};

app.get('/api/reverse-geocode', handleReverseGeocode);
app.get('/api/geocode/reverse', handleReverseGeocode);

// Monitored Routes
app.get('/api/monitoring', (req: Request, res: Response) => {
  res.json({ monitoredRoutes: db.getMonitoredRoutes() });
});

app.post('/api/monitoring', (req: Request, res: Response) => {
  const { name, startName, destinationName, startCoords, destCoords, notes, userId = 'usr_citizen_1' } = req.body;
  if (!name || !startCoords || !destCoords) {
    res.status(400).json({ error: 'Missing monitored route parameters' });
    return;
  }

  const monitored: MonitoredRoute = {
    id: `mon_${Date.now()}`,
    userId,
    name: name.trim(),
    startName: startName || 'Start Point',
    destinationName: destinationName || 'Destination Point',
    startCoords,
    destCoords,
    activeAlertsCount: 0,
    lastChecked: new Date().toISOString(),
    notes,
  };

  const saved = db.createMonitoredRoute(monitored);
  res.status(201).json(saved);
});

app.delete('/api/monitoring/:id', (req: Request, res: Response) => {
  const deleted = db.deleteMonitoredRoute(req.params.id);
  res.json({ success: deleted });
});

// Notifications
app.get('/api/notifications', (req: Request, res: Response) => {
  res.json({ notifications: db.getNotifications() });
});

app.post('/api/notifications/mark-read', (req: Request, res: Response) => {
  db.markNotificationsRead();
  res.json({ success: true });
});

// Automation: Run stale report detector & reminder trigger
app.post('/api/automation/run-stale-check', (req: Request, res: Response) => {
  const reports = db.getReports();
  const now = new Date().getTime();
  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
  let flaggedCount = 0;

  reports.forEach((rep) => {
    if (rep.status === 'resolved') return;
    const lastCheck = new Date(rep.lastCheckedAt).getTime();
    if (now - lastCheck > FOURTEEN_DAYS_MS && !rep.isStale) {
      db.updateReport(rep.id, {
        isStale: true,
        status: 'needs_rechecking',
      });
      flaggedCount += 1;

      db.addNotification({
        id: `notif_${Date.now()}_${rep.id}`,
        userId: 'usr_admin_1',
        title: 'Report Flagged for Recheck',
        message: `Report "${rep.title}" has had no community or inspector checks for over 14 days.`,
        type: 'stale_recheck',
        timestamp: new Date().toISOString(),
        read: false,
        linkReportId: rep.id,
      });
    }
  });

  db.addAuditLog({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'AUTOMATION_STALE_CHECK',
    actorName: 'System Scheduler',
    actorRole: 'admin',
    targetType: 'automation',
    targetId: 'stale_checker',
    summary: `Ran stale verification audit. ${flaggedCount} report(s) flagged for rechecking.`,
  });

  res.json({ flaggedCount, totalReportsChecked: reports.length });
});

// Automation: Weekly Summary
app.get('/api/automation/weekly-summary', (req: Request, res: Response) => {
  const summaries = db.getWeeklySummaries();
  res.json({ summary: summaries[0] || null });
});

app.post('/api/automation/weekly-summary/generate', (req: Request, res: Response) => {
  const reports = db.getReports();
  const newReports = reports.filter((r) => {
    const diff = new Date().getTime() - new Date(r.createdAt).getTime();
    return diff <= 7 * 24 * 60 * 60 * 1000;
  });
  const resolved = reports.filter((r) => r.status === 'resolved');
  const pending = reports.filter((r) => r.status === 'submitted' || r.status === 'under_review');

  const catCount: Record<string, number> = {};
  reports.forEach((r) => {
    catCount[r.category] = (catCount[r.category] || 0) + 1;
  });

  const summary: WeeklySummary = {
    weekStarting: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    generatedAt: new Date().toISOString(),
    totalNewReports: newReports.length,
    totalResolved: resolved.length,
    pendingVerificationCount: pending.length,
    avgResolutionDays: 4.4,
    recurringHotspots: [
      {
        locationName: 'Market Street Commercial Strip',
        latitude: 37.7892,
        longitude: -122.4014,
        reportCount: 3,
        topCategory: 'roadwork',
      },
      {
        locationName: '3rd Street & Mission Transit Crossing',
        latitude: 37.7865,
        longitude: -122.4038,
        reportCount: 2,
        topCategory: 'broken_streetlight',
      },
    ],
    categoryBreakdown: catCount,
    keyRecommendations: [
      'Require contractors on Market St to submit photographic verification of ramp placement every morning.',
      'Schedule night crew luminaire inspections along Mission St corridor.',
      'Review curb ramp drainage at Howard St ahead of winter rain season.',
    ],
  };

  db.addWeeklySummary(summary);
  res.json({ summary });
});

// ---------------- SERVER & VITE INTEGRATION ----------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SafeRoute server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
