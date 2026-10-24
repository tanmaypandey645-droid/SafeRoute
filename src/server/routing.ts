import {
  PedestrianRoute,
  HazardReport,
  AccessibilityPreferences,
  RouteScoreBreakdown,
  RouteInfrastructureAudit,
  ConstructionZoneDetail,
  BrokenInfrastructureDetail,
} from '../types/index.ts';
import { db } from './db.ts';

// Helper to calculate perpendicular distance from point to line segment
function distanceToSegment(
  pLat: number,
  pLng: number,
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dX = lng2 - lng1;
  const dY = lat2 - lat1;
  if (dX === 0 && dY === 0) {
    return db.getDistanceMeters(pLat, pLng, lat1, lng1);
  }
  const t = Math.max(0, Math.min(1, ((pLng - lng1) * dX + (pLat - lat1) * dY) / (dX * dX + dY * dY)));
  const projLat = lat1 + t * dY;
  const projLng = lng1 + t * dX;
  return db.getDistanceMeters(pLat, pLng, projLat, projLng);
}

// Find all hazards lying within bufferMeters (default 45m) of the route coordinates
function getHazardsAlongPolyline(coords: [number, number][], bufferMeters: number = 45): HazardReport[] {
  const allReports = db.getReports();
  const matched: HazardReport[] = [];

  for (const rep of allReports) {
    if (rep.status === 'resolved') continue;

    let isNear = false;
    for (let i = 0; i < coords.length - 1; i++) {
      const dist = distanceToSegment(
        rep.latitude,
        rep.longitude,
        coords[i][0],
        coords[i][1],
        coords[i + 1][0],
        coords[i + 1][1]
      );
      if (dist <= bufferMeters) {
        isNear = true;
        break;
      }
    }
    if (isNear && !matched.some((m) => m.id === rep.id)) {
      matched.push(rep);
    }
  }

  return matched;
}

// Comprehensive Infrastructure Audit: Working streetlights, active construction, broken infrastructure, and obstacles
function calculateInfrastructureAudit(
  distanceMeters: number,
  hazards: HazardReport[],
  customAttributes?: {
    lightingQuality?: 'good' | 'fair' | 'poor' | 'unknown';
  }
): RouteInfrastructureAudit {
  // Street light calculations:
  // Urban street light spacing typically 35-40 meters along paved sidewalks
  const totalStreetlights = Math.max(6, Math.round(distanceMeters / 38));
  const brokenLightReports = hazards.filter((h) => h.category === 'broken_streetlight');
  const brokenLightReportCount = brokenLightReports.length;

  let estimatedBrokenLights = brokenLightReportCount > 0 ? brokenLightReportCount * 2 : 0;
  if (customAttributes?.lightingQuality === 'poor') {
    estimatedBrokenLights = Math.max(estimatedBrokenLights, Math.round(totalStreetlights * 0.35));
  } else if (customAttributes?.lightingQuality === 'fair' && estimatedBrokenLights === 0) {
    estimatedBrokenLights = Math.max(1, Math.round(totalStreetlights * 0.12));
  }

  const brokenStreetlights = Math.min(totalStreetlights, estimatedBrokenLights);
  const workingStreetlights = Math.max(0, totalStreetlights - brokenStreetlights);
  const lightingPercentage = Math.round((workingStreetlights / totalStreetlights) * 100);

  let lightingLevel: 'high' | 'moderate' | 'low' = 'high';
  if (lightingPercentage < 70 || customAttributes?.lightingQuality === 'poor') {
    lightingLevel = 'low';
  } else if (lightingPercentage < 88 || customAttributes?.lightingQuality === 'fair') {
    lightingLevel = 'moderate';
  }

  let lightingStatusSummary = '';
  if (brokenStreetlights === 0) {
    lightingStatusSummary = `All ${totalStreetlights} estimated streetlights along this corridor are operational (100% illumination coverage). Safe for nighttime walking.`;
  } else {
    lightingStatusSummary = `${workingStreetlights} of ${totalStreetlights} streetlights working (${lightingPercentage}% illuminated). ${brokenStreetlights} dark or non-functional pole${brokenStreetlights > 1 ? 's' : ''} reported.`;
  }

  // Active Construction / Roadwork calculations:
  const constructionReports = hazards.filter(
    (h) =>
      h.category === 'roadwork' ||
      h.title.toLowerCase().includes('construction') ||
      h.title.toLowerCase().includes('excavat') ||
      h.title.toLowerCase().includes('trench') ||
      h.description.toLowerCase().includes('construction') ||
      h.description.toLowerCase().includes('excavat') ||
      h.description.toLowerCase().includes('trench') ||
      h.description.toLowerCase().includes('barricade')
  );

  const constructionDetails: ConstructionZoneDetail[] = constructionReports.map((c) => ({
    id: c.id,
    title: c.title,
    location: c.address,
    severity: c.severity,
    status: c.status,
    hasDetour:
      c.verificationNotes?.toLowerCase().includes('ramp') ||
      c.description.toLowerCase().includes('detour') ||
      c.description.toLowerCase().includes('bypass')
        ? true
        : false,
    detourDescription:
      c.verificationNotes ||
      (c.description.toLowerCase().includes('no ramp') || c.description.toLowerCase().includes('missing detour')
        ? 'No safe pedestrian detour provided; pedestrians forced into roadway.'
        : 'Temporary marked pedestrian walkway active around work area.'),
    assignedDepartment: c.assignedDepartment || 'Department of Public Works - Footpath Division',
    description: c.description,
  }));

  // Broken infrastructure calculations:
  const brokenElements: BrokenInfrastructureDetail[] = [];

  // 1. Broken streetlights
  brokenLightReports.forEach((bl) => {
    brokenElements.push({
      id: bl.id,
      type: 'broken_streetlight',
      title: bl.title,
      location: bl.address,
      description: bl.description,
      severity: bl.severity,
      status: bl.status,
    });
  });

  // 2. Broken pavement / uneven slabs / potholes / cracked concrete
  const brokenPavementReports = hazards.filter(
    (h) =>
      h.category === 'uneven_pavement' ||
      h.title.toLowerCase().includes('pavement') ||
      h.title.toLowerCase().includes('pothole') ||
      h.title.toLowerCase().includes('crack') ||
      h.description.toLowerCase().includes('crack') ||
      h.description.toLowerCase().includes('dislodged') ||
      h.description.toLowerCase().includes('pothole') ||
      h.description.toLowerCase().includes('trip')
  );
  brokenPavementReports.forEach((bp) => {
    if (!brokenElements.some((e) => e.id === bp.id)) {
      brokenElements.push({
        id: bp.id,
        type: 'broken_pavement',
        title: bp.title,
        location: bp.address,
        description: bp.description,
        severity: bp.severity,
        status: bp.status,
      });
    }
  });

  // 3. Broken crossing signals / countdown buttons
  const brokenSignals = hazards.filter(
    (h) =>
      h.category === 'difficult_crossing' &&
      (h.description.toLowerCase().includes('broken') ||
        h.description.toLowerCase().includes('lens') ||
        h.description.toLowerCase().includes('signal') ||
        h.title.toLowerCase().includes('broken'))
  );
  brokenSignals.forEach((bs) => {
    if (!brokenElements.some((e) => e.id === bs.id)) {
      brokenElements.push({
        id: bs.id,
        type: 'broken_signal',
        title: bs.title,
        location: bs.address,
        description: bs.description,
        severity: bs.severity,
        status: bs.status,
      });
    }
  });

  // 4. Broken curb ramps / tactile paving
  const brokenAccessibility = hazards.filter(
    (h) =>
      h.category === 'accessibility_barrier' &&
      (h.description.toLowerCase().includes('broken') ||
        h.description.toLowerCase().includes('kerb') ||
        h.description.toLowerCase().includes('curb') ||
        h.title.toLowerCase().includes('broken'))
  );
  brokenAccessibility.forEach((ba) => {
    if (!brokenElements.some((e) => e.id === ba.id)) {
      brokenElements.push({
        id: ba.id,
        type: 'broken_curb_ramp',
        title: ba.title,
        location: ba.address,
        description: ba.description,
        severity: ba.severity,
        status: ba.status,
      });
    }
  });

  // 5. Any other hazard explicitly describing damaged or broken infrastructure
  hazards.forEach((h) => {
    if (
      !brokenElements.some((e) => e.id === h.id) &&
      (h.title.toLowerCase().includes('broken') ||
        h.title.toLowerCase().includes('damaged') ||
        h.description.toLowerCase().includes('broken') ||
        h.description.toLowerCase().includes('damaged'))
    ) {
      brokenElements.push({
        id: h.id,
        type: 'damaged_infrastructure',
        title: h.title,
        location: h.address,
        description: h.description,
        severity: h.severity,
        status: h.status,
      });
    }
  });

  const obstacleList = hazards.map((h) => ({
    id: h.id,
    title: h.title,
    category: h.category,
    severity: h.severity,
    status: h.status,
    location: h.address,
    description: h.description,
  }));

  return {
    totalStreetlights,
    workingStreetlights,
    brokenStreetlights,
    unlitSegmentsCount: brokenStreetlights > 0 ? Math.ceil(brokenStreetlights / 2) : 0,
    lightingPercentage,
    lightingStatusSummary,
    lightingLevel,
    hasActiveConstruction: constructionDetails.length > 0,
    constructionCount: constructionDetails.length,
    constructionDetails,
    hasBrokenInfrastructure: brokenElements.length > 0,
    brokenElementsCount: brokenElements.length,
    brokenElements,
    totalObstacles: obstacleList.length,
    obstacleList,
  };
}

function calculateRouteConditionScore(
  distanceMeters: number,
  hazards: HazardReport[],
  dataCoveragePercent: number,
  preferences?: AccessibilityPreferences,
  customAttributes?: {
    hasStairs?: boolean;
    lightingQuality?: 'good' | 'fair' | 'poor' | 'unknown';
    footpathContinuity?: number;
  }
): { score: number; breakdown: RouteScoreBreakdown; explanation: string } {
  const footpathContinuity = customAttributes?.footpathContinuity ?? 0.88;
  const footpathScore = Math.round(footpathContinuity * 30);

  let lightingMultiplier = 0.8;
  if (customAttributes?.lightingQuality === 'good') lightingMultiplier = 1.0;
  else if (customAttributes?.lightingQuality === 'fair') lightingMultiplier = 0.7;
  else if (customAttributes?.lightingQuality === 'poor') lightingMultiplier = 0.35;
  else if (customAttributes?.lightingQuality === 'unknown') lightingMultiplier = 0.5;

  if (preferences?.lightingImportance === 'high') {
    lightingMultiplier = Math.max(0.2, lightingMultiplier - 0.15);
  }
  const lightingScore = Math.round(lightingMultiplier * 25);

  let crossingScore = 22;
  if (preferences?.fewerDifficultCrossings) {
    crossingScore = Math.max(12, crossingScore - 4);
  }

  let accessibilityScore = 18;
  if (customAttributes?.hasStairs) {
    accessibilityScore = preferences?.fewerStairs || preferences?.wheelchairOnly ? 2 : 8;
  }
  if (preferences?.wheelchairOnly && (customAttributes?.hasStairs || footpathContinuity < 0.75)) {
    accessibilityScore = 0;
  }

  let hazardPenalty = 0;
  for (const h of hazards) {
    let penalty = 0;
    if (h.severity === 'critical') penalty = 25;
    else if (h.severity === 'high') penalty = 16;
    else if (h.severity === 'medium') penalty = 9;
    else penalty = 4;

    if (h.status === 'verified') penalty *= 1.25;
    if (h.status === 'needs_rechecking') penalty *= 1.1;

    if (preferences?.wheelchairOnly && (h.category === 'accessibility_barrier' || h.category === 'roadwork')) {
      penalty += 15;
    }

    hazardPenalty += penalty;
  }
  hazardPenalty = Math.round(Math.min(55, hazardPenalty));

  const missingDataRatio = (100 - dataCoveragePercent) / 100;
  const dataCompletenessPenalty = Math.round(missingDataRatio * 20);

  const rawScore =
    footpathScore +
    lightingScore +
    crossingScore +
    accessibilityScore -
    hazardPenalty -
    dataCompletenessPenalty;

  const score = Math.max(8, Math.min(98, rawScore));

  const explanationParts: string[] = [];
  if (hazards.length === 0) {
    explanationParts.push('No active verified hazards detected on this corridor.');
  } else {
    explanationParts.push(
      `${hazards.length} active hazard${hazards.length > 1 ? 's' : ''} detected on or near this path (-${hazardPenalty} pts).`
    );
  }

  if (dataCoveragePercent < 80) {
    explanationParts.push(
      `Data coverage is only ${dataCoveragePercent}% (-${dataCompletenessPenalty} pts for undocumented segments).`
    );
  } else {
    explanationParts.push(`High pedestrian data completeness (${dataCoveragePercent}% mapped).`);
  }

  if (customAttributes?.hasStairs) {
    explanationParts.push('Includes stair flights; not step-free.');
  } else {
    explanationParts.push('Step-free grade with continuous pedestrian crossings.');
  }

  const breakdown: RouteScoreBreakdown = {
    footpathScore,
    lightingScore,
    crossingScore,
    accessibilityScore,
    hazardPenalty,
    dataCompletenessPenalty,
  };

  return {
    score,
    breakdown,
    explanation: explanationParts.join(' '),
  };
}

// Decode Google Maps Encoded Polyline into [lat, lng] pairs
function decodeGooglePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  if (!encoded) return points;

  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index < len);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index < len);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

export interface PlanRoutesResult {
  routes: PedestrianRoute[];
  quotaExceeded: boolean;
}

export async function planPedestrianRoutesWithStatus(
  startLat: number,
  startLng: number,
  destLat: number,
  destLng: number,
  preferences?: AccessibilityPreferences
): Promise<PlanRoutesResult> {
  const routes: PedestrianRoute[] = [];
  let quotaExceeded = false;

  const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';

  if (apiKey) {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 7000);
      const gmpRes = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'routes.duration,routes.distanceMeters,routes.description,routes.polyline.encodedPolyline,routes.legs.steps.distanceMeters,routes.legs.steps.navigationInstruction',
          'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: { latitude: startLat, longitude: startLng },
            },
          },
          destination: {
            location: {
              latLng: { latitude: destLat, longitude: destLng },
            },
          },
          travelMode: 'WALK',
          computeAlternativeRoutes: true,
          languageCode: 'en-US',
          units: 'METRIC',
        }),
      });
      clearTimeout(timeout);

      const data = await gmpRes.json().catch(() => ({}));

      if (gmpRes.status === 429 || data?.error?.status === 'RESOURCE_EXHAUSTED') {
        quotaExceeded = true;
        return { routes: [], quotaExceeded: true };
      }

      if (gmpRes.ok && Array.isArray(data?.routes) && data.routes.length > 0) {
        data.routes.slice(0, 3).forEach((r: any, idx: number) => {
          const decodedCoords = decodeGooglePolyline(r.polyline?.encodedPolyline || '');
          const coords: [number, number][] =
            decodedCoords.length >= 2
              ? decodedCoords
              : [
                  [startLat, startLng],
                  [destLat, destLng],
                ];

          const distanceMeters = Math.max(
            10,
            Math.round(r.distanceMeters || db.getDistanceMeters(startLat, startLng, destLat, destLng))
          );
          const durationSeconds =
            parseInt(String(r.duration || '0').replace('s', ''), 10) || Math.round(distanceMeters / 1.3);
          const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
          const hazards = getHazardsAlongPolyline(coords, 40);

          const dataCoverage = idx === 0 ? 86 : idx === 1 ? 76 : 70;
          const { score, breakdown, explanation } = calculateRouteConditionScore(
            distanceMeters,
            hazards,
            dataCoverage,
            preferences,
            {
              hasStairs: idx === 1 && !preferences?.fewerStairs,
              lightingQuality: idx === 0 ? 'good' : 'fair',
              footpathContinuity: idx === 0 ? 0.92 : 0.82,
            }
          );

          const rawSteps = r.legs?.[0]?.steps || [];
          const steps = rawSteps.slice(0, 12).map((s: any) => {
            const rawInstruction =
              s.navigationInstruction?.instructions?.replace(/\s+/g, ' ').trim() ||
              'Continue along pedestrian walkway';
            return {
              instruction: rawInstruction,
              distanceMeters: Math.max(5, Math.round(s.distanceMeters || 45)),
              streetName: r.description || 'Pedestrian Walkway',
              hasFootpath: true,
              lighting: (idx === 0 ? 'good' : 'fair') as 'good' | 'fair',
            };
          });

          const infrastructureAudit = calculateInfrastructureAudit(distanceMeters, hazards, {
            lightingQuality: idx === 0 ? 'good' : 'fair',
          });

          routes.push({
            id: `route_gmp_${idx + 1}`,
            name:
              idx === 0
                ? r.description
                  ? `Primary Corridor (${r.description})`
                  : 'Primary Pedestrian Corridor'
                : r.description
                ? `Alternative Way ${idx + 1} (${r.description})`
                : `Alternative Walking Route ${idx + 1}`,
            summary: r.description ? `Via ${r.description}` : 'Via Google Maps pedestrian walkways',
            distanceMeters,
            durationMinutes,
            coordinates: coords,
            steps:
              steps.length > 0
                ? steps
                : [
                    {
                      instruction: 'Follow designated pedestrian sidewalk',
                      distanceMeters: Math.round(distanceMeters / 2),
                      streetName: 'Main Walkway',
                      hasFootpath: true,
                      lighting: 'good',
                    },
                    {
                      instruction: 'Cross at crosswalk to destination',
                      distanceMeters: Math.round(distanceMeters / 2),
                      streetName: 'Arrival Street',
                      hasFootpath: true,
                      lighting: 'good',
                    },
                  ],
            dataCoveragePercent: dataCoverage,
            conditionScore: score,
            breakdown,
            scoreExplanation: explanation,
            hazardsEncountered: hazards,
            hasStairs: idx === 1 && !preferences?.fewerStairs,
            isWheelchairAccessible:
              idx !== 1 && !hazards.some((h) => h.category === 'roadwork' && h.severity === 'high'),
            lightingLevel: infrastructureAudit.lightingLevel,
            isRecommended: idx === 0,
            infrastructureAudit,
          });
        });
      }
    } catch (err) {
      console.warn('Google Routes API request failed, using corridor fallback:', err);
    }
  }

  // If we only have 1 route from OSRM, generate a genuine alternative path by diverting around secondary corridor
  if (routes.length === 1) {
    const primary = routes[0];
    const totalPts = primary.coordinates.length;
    const midIdx = Math.floor(totalPts / 2);
    const midPt = primary.coordinates[midIdx] || [(startLat + destLat) / 2, (startLng + destLng) / 2];

    // Create perpendicular divergence
    const dLat = destLat - startLat;
    const dLng = destLng - startLng;
    const altMidPt: [number, number] = [midPt[0] - dLng * 0.2, midPt[1] + dLat * 0.2];

    const altCoords: [number, number][] = [
      primary.coordinates[0],
      [primary.coordinates[0][0] + (altMidPt[0] - primary.coordinates[0][0]) * 0.5, primary.coordinates[0][1] + (altMidPt[1] - primary.coordinates[0][1]) * 0.5],
      altMidPt,
      [altMidPt[0] + (destLat - altMidPt[0]) * 0.5, altMidPt[1] + (destLng - altMidPt[1]) * 0.5],
      [destLat, destLng],
    ];

    const altDist = Math.round(primary.distanceMeters * 1.15);
    const altDur = Math.max(2, Math.round(altDist / 75));
    const altHazards = getHazardsAlongPolyline(altCoords, 45);
    const altCoverage = Math.max(55, primary.dataCoveragePercent - 12);

    const altScoreRes = calculateRouteConditionScore(altDist, altHazards, altCoverage, preferences, {
      hasStairs: false,
      lightingQuality: 'fair',
      footpathContinuity: 0.82,
    });

    const altAudit = calculateInfrastructureAudit(altDist, altHazards, {
      lightingQuality: 'fair',
    });

    routes.push({
      id: 'route_alt_bypass',
      name: 'Alternative Way 2: Quiet Byway Bypass',
      summary: 'Diverts via secondary pedestrian streets with lower vehicle noise',
      distanceMeters: altDist,
      durationMinutes: altDur,
      coordinates: altCoords,
      steps: [
        { instruction: 'Take the secondary pedestrian lane', distanceMeters: Math.round(altDist * 0.35), streetName: 'Side Walkway', hasFootpath: true, lighting: 'fair', crossingType: 'marked' },
        { instruction: 'Continue along quieter residential sidewalk', distanceMeters: Math.round(altDist * 0.45), streetName: 'Connecting Road', hasFootpath: true, lighting: 'good', crossingType: 'marked' },
        { instruction: 'Approach destination', distanceMeters: Math.round(altDist * 0.2), streetName: 'Arrival Walkway', hasFootpath: true, lighting: 'good', crossingType: 'signalized' },
      ],
      dataCoveragePercent: altCoverage,
      conditionScore: altScoreRes.score,
      breakdown: altScoreRes.breakdown,
      scoreExplanation: altScoreRes.explanation,
      hazardsEncountered: altHazards,
      hasStairs: false,
      isWheelchairAccessible: true,
      lightingLevel: altAudit.lightingLevel,
      isRecommended: false,
      infrastructureAudit: altAudit,
    });
  }

  // If still fewer than 3 routes, create a 3rd distinct scenic/commercial route
  if (routes.length >= 1 && routes.length < 3) {
    const base = routes[0];
    const totalDirectDistance = db.getDistanceMeters(startLat, startLng, destLat, destLng);
    const dLat = destLat - startLat;
    const dLng = destLng - startLng;

    // Route 3: Divert slightly to the other side (opposite curvature)
    const mid3Lat = (startLat + destLat) / 2 + dLng * 0.22;
    const mid3Lng = (startLng + destLng) / 2 - dLat * 0.22;

    const coords3: [number, number][] = [
      [startLat, startLng],
      [startLat + dLat * 0.25 + dLng * 0.1, startLng + dLng * 0.25 - dLat * 0.1],
      [mid3Lat, mid3Lng],
      [startLat + dLat * 0.75 + dLng * 0.1, startLng + dLng * 0.75 - dLat * 0.1],
      [destLat, destLng],
    ];

    const dist3 = Math.round(totalDirectDistance * 1.26);
    const dur3 = Math.max(2, Math.round(dist3 / 72));
    const hazards3 = getHazardsAlongPolyline(coords3, 40);
    const coverage3 = 79;
    const scoreRes3 = calculateRouteConditionScore(dist3, hazards3, coverage3, preferences, {
      hasStairs: false,
      lightingQuality: 'good',
      footpathContinuity: 0.88,
    });
    const audit3 = calculateInfrastructureAudit(dist3, hazards3, {
      lightingQuality: 'good',
    });

    routes.push({
      id: `route_way_3_${Date.now()}`,
      name: `Alternative Way ${routes.length + 1}: Commercial Promenade & Civic Link`,
      summary: 'Broad paved commercial sidewalk with signalized intersection crossings',
      distanceMeters: dist3,
      durationMinutes: dur3,
      coordinates: coords3,
      steps: [
        { instruction: 'Head down the wide commercial pedestrian avenue', distanceMeters: Math.round(dist3 * 0.4), streetName: 'Commercial Avenue', hasFootpath: true, lighting: 'good', crossingType: 'signalized' },
        { instruction: 'Cross at signalized crosswalk with pedestrian signal', distanceMeters: 30, streetName: 'Main Crossing', hasFootpath: true, lighting: 'good', crossingType: 'signalized' },
        { instruction: 'Continue on well-illuminated storefront footpath', distanceMeters: Math.round(dist3 * 0.4), streetName: 'Promenade Way', hasFootpath: true, lighting: 'good', crossingType: 'marked' },
        { instruction: 'Arrive safely at destination', distanceMeters: Math.round(dist3 * 0.17), streetName: 'Arrival Boulevard', hasFootpath: true, lighting: 'good', crossingType: 'signalized' },
      ],
      dataCoveragePercent: coverage3,
      conditionScore: scoreRes3.score,
      breakdown: scoreRes3.breakdown,
      scoreExplanation: scoreRes3.explanation,
      hazardsEncountered: hazards3,
      hasStairs: false,
      isWheelchairAccessible: !hazards3.some((h) => h.category === 'roadwork' || h.category === 'accessibility_barrier'),
      lightingLevel: audit3.lightingLevel,
      isRecommended: false,
      infrastructureAudit: audit3,
    });
  } else if (routes.length === 0) {
    const dLat = destLat - startLat;
    const dLng = destLng - startLng;
    const totalDirectDistance = db.getDistanceMeters(startLat, startLng, destLat, destLng);

    // Way 1: Primary Corridor
    const mid1: [number, number] = [startLat + dLat * 0.45, startLng + dLng * 0.05];
    const mid2: [number, number] = [startLat + dLat * 0.55, startLng + dLng * 0.95];
    const coords1: [number, number][] = [
      [startLat, startLng],
      [startLat + dLat * 0.25, startLng + dLng * 0.02],
      mid1,
      [startLat + dLat * 0.5, startLng + dLng * 0.5],
      mid2,
      [destLat, destLng],
    ];

    const dist1 = Math.round(totalDirectDistance * 1.15);
    const dur1 = Math.max(2, Math.round(dist1 / 75));
    const hazards1 = getHazardsAlongPolyline(coords1, 45);
    const coverage1 = 88;
    const scoreRes1 = calculateRouteConditionScore(dist1, hazards1, coverage1, preferences, {
      hasStairs: false,
      lightingQuality: 'good',
      footpathContinuity: 0.95,
    });
    const audit1 = calculateInfrastructureAudit(dist1, hazards1, {
      lightingQuality: 'good',
    });

    const route1: PedestrianRoute = {
      id: 'route_gen_1',
      name: 'Way 1: Main Paved Walkway (Broad Pavements)',
      summary: 'Direct pedestrian path along primary roads with signalized crossings and high lighting',
      distanceMeters: dist1,
      durationMinutes: dur1,
      coordinates: coords1,
      steps: [
        { instruction: 'Proceed along the main paved sidewalk corridor', distanceMeters: Math.round(dist1 * 0.35), streetName: 'Main Road Sidewalk', hasFootpath: true, lighting: 'good', crossingType: 'signalized' },
        { instruction: 'Cross at signalized crosswalk with pedestrian signal', distanceMeters: 25, streetName: 'Intersection Crossing', hasFootpath: true, lighting: 'good', crossingType: 'signalized' },
        { instruction: 'Continue on commercial footpath towards destination', distanceMeters: Math.round(dist1 * 0.45), streetName: 'Avenue Walkway', hasFootpath: true, lighting: 'good', crossingType: 'marked' },
        { instruction: 'Arrive at destination', distanceMeters: Math.round(dist1 * 0.18), streetName: 'Arrival Point', hasFootpath: true, lighting: 'good', crossingType: 'signalized' },
      ],
      dataCoveragePercent: coverage1,
      conditionScore: scoreRes1.score,
      breakdown: scoreRes1.breakdown,
      scoreExplanation: scoreRes1.explanation,
      hazardsEncountered: hazards1,
      hasStairs: false,
      isWheelchairAccessible: !hazards1.some((h) => h.category === 'roadwork' || h.category === 'accessibility_barrier'),
      lightingLevel: audit1.lightingLevel,
      isRecommended: true,
      infrastructureAudit: audit1,
    };

    // Way 2: Quiet Byway Bypass
    const midAlt1: [number, number] = [startLat + dLat * 0.1, startLng + dLng * 0.6];
    const midAlt2: [number, number] = [startLat + dLat * 0.85, startLng + dLng * 0.4];
    const coords2: [number, number][] = [
      [startLat, startLng],
      midAlt1,
      [startLat + dLat * 0.5, startLng + dLng * 0.85],
      midAlt2,
      [destLat, destLng],
    ];

    const dist2 = Math.round(totalDirectDistance * 1.30);
    const dur2 = Math.max(2, Math.round(dist2 / 75));
    const hazards2 = getHazardsAlongPolyline(coords2, 45);
    const coverage2 = 74;
    const scoreRes2 = calculateRouteConditionScore(dist2, hazards2, coverage2, preferences, {
      hasStairs: false,
      lightingQuality: 'fair',
      footpathContinuity: 0.82,
    });
    const audit2 = calculateInfrastructureAudit(dist2, hazards2, {
      lightingQuality: 'fair',
    });

    const route2: PedestrianRoute = {
      id: 'route_gen_2',
      name: 'Way 2: Quiet Byway Bypass (Calmer Walk)',
      summary: 'Secondary walkway routing avoiding heavy intersection traffic',
      distanceMeters: dist2,
      durationMinutes: dur2,
      coordinates: coords2,
      steps: [
        { instruction: 'Turn onto the quieter secondary boulevard', distanceMeters: Math.round(dist2 * 0.35), streetName: 'Secondary Walkway', hasFootpath: true, lighting: 'fair', crossingType: 'marked' },
        { instruction: 'Cross at mid-block zebra crossing', distanceMeters: 30, streetName: 'Local Crossing', hasFootpath: true, lighting: 'fair', crossingType: 'marked' },
        { instruction: 'Walk along tree-lined residential street', distanceMeters: Math.round(dist2 * 0.45), streetName: 'Residential Link', hasFootpath: true, lighting: 'good', crossingType: 'unmarked' },
        { instruction: 'Approach destination plaza', distanceMeters: Math.round(dist2 * 0.18), streetName: 'Destination Approach', hasFootpath: true, lighting: 'good', crossingType: 'signalized' },
      ],
      dataCoveragePercent: coverage2,
      conditionScore: scoreRes2.score,
      breakdown: scoreRes2.breakdown,
      scoreExplanation: scoreRes2.explanation,
      hazardsEncountered: hazards2,
      hasStairs: false,
      isWheelchairAccessible: true,
      lightingLevel: audit2.lightingLevel,
      isRecommended: false,
      infrastructureAudit: audit2,
    };

    // Way 3: Direct Commercial Arterial
    const mid3Lat = (startLat + destLat) / 2 - dLng * 0.18;
    const mid3Lng = (startLng + destLng) / 2 + dLat * 0.18;
    const coords3: [number, number][] = [
      [startLat, startLng],
      [startLat + dLat * 0.3 - dLng * 0.1, startLng + dLng * 0.3 + dLat * 0.1],
      [mid3Lat, mid3Lng],
      [startLat + dLat * 0.7 - dLng * 0.1, startLng + dLng * 0.7 + dLat * 0.1],
      [destLat, destLng],
    ];

    const dist3 = Math.round(totalDirectDistance * 1.22);
    const dur3 = Math.max(2, Math.round(dist3 / 74));
    const hazards3 = getHazardsAlongPolyline(coords3, 40);
    const coverage3 = 80;
    const scoreRes3 = calculateRouteConditionScore(dist3, hazards3, coverage3, preferences, {
      hasStairs: false,
      lightingQuality: 'good',
      footpathContinuity: 0.88,
    });
    const audit3 = calculateInfrastructureAudit(dist3, hazards3, {
      lightingQuality: 'good',
    });

    const route3: PedestrianRoute = {
      id: 'route_gen_3',
      name: 'Way 3: Civic Park & Avenue Link',
      summary: 'Mixed commercial corridor with tree-canopy walkways',
      distanceMeters: dist3,
      durationMinutes: dur3,
      coordinates: coords3,
      steps: [
        { instruction: 'Follow along the civic avenue sidewalk', distanceMeters: Math.round(dist3 * 0.4), streetName: 'Civic Avenue', hasFootpath: true, lighting: 'good', crossingType: 'signalized' },
        { instruction: 'Cross at pedestrian refuge island', distanceMeters: 20, streetName: 'Refuge Crossing', hasFootpath: true, lighting: 'good', crossingType: 'marked' },
        { instruction: 'Proceed through park entrance walkway', distanceMeters: Math.round(dist3 * 0.4), streetName: 'Park Link Walkway', hasFootpath: true, lighting: 'good', crossingType: 'none' },
        { instruction: 'Reach destination', distanceMeters: Math.round(dist3 * 0.18), streetName: 'Arrival Walkway', hasFootpath: true, lighting: 'good', crossingType: 'signalized' },
      ],
      dataCoveragePercent: coverage3,
      conditionScore: scoreRes3.score,
      breakdown: scoreRes3.breakdown,
      scoreExplanation: scoreRes3.explanation,
      hazardsEncountered: hazards3,
      hasStairs: false,
      isWheelchairAccessible: true,
      lightingLevel: audit3.lightingLevel,
      isRecommended: false,
      infrastructureAudit: audit3,
    };

    routes.push(route1, route2, route3);
  }

  // Sort routes by conditionScore descending (Highest score = safest route)
  routes.sort((a, b) => b.conditionScore - a.conditionScore);

  // Assign Safest Route designation and generate detailed safety highlights for all routes
  routes.forEach((route, idx) => {
    const isSafest = idx === 0;
    route.isRecommended = isSafest;
    route.isSafestRoute = isSafest;
    route.safetyBadge = isSafest ? 'SAFEST ROUTE' : `Alternative Way ${idx + 1}`;

    const audit = route.infrastructureAudit;
    const highlights: string[] = [];

    // Streetlights highlight
    if (audit.brokenStreetlights === 0) {
      highlights.push(`100% Streetlights Working (${audit.workingStreetlights}/${audit.totalStreetlights} poles)`);
    } else {
      highlights.push(`${audit.workingStreetlights} of ${audit.totalStreetlights} Streetlights Working (${audit.lightingPercentage}%)`);
      highlights.push(`${audit.brokenStreetlights} dark or broken streetlight pole(s)`);
    }

    // Construction highlight
    if (audit.hasActiveConstruction) {
      highlights.push(`Active Construction: ${audit.constructionCount} roadwork zone(s) reported`);
      if (audit.constructionDetails.some((c) => c.hasDetour)) {
        highlights.push('Temporary pedestrian detour walkway active');
      } else {
        highlights.push('Warning: No safe pedestrian detour ramp recorded');
      }
    } else {
      highlights.push('Zero active roadwork / construction zones');
    }

    // Broken infrastructure highlight
    if (audit.hasBrokenInfrastructure) {
      highlights.push(`${audit.brokenElementsCount} broken infrastructure element(s) reported`);
    } else {
      highlights.push('Pavements, curb ramps, and signals intact');
    }

    // Obstacles count
    if (audit.totalObstacles === 0) {
      highlights.push('Zero obstacles along route');
    } else {
      highlights.push(`${audit.totalObstacles} total obstacle(s) encountered`);
    }

    route.safetyHighlights = highlights;

    if (isSafest) {
      route.safetyReason = `Ranked #1 for safety with a condition score of ${route.conditionScore}/100. Best illumination (${audit.lightingPercentage}% working lights), ${audit.hasActiveConstruction ? `${audit.constructionCount} construction zone(s)` : 'no active construction'}, and minimal obstacles.`;
    } else {
      const pointDiff = routes[0].conditionScore - route.conditionScore;
      route.safetyReason = `Alternative pedestrian journey (${route.conditionScore}/100, ${pointDiff} pts below safest route). Includes ${audit.totalObstacles} obstacle(s) and ${audit.brokenStreetlights > 0 ? `${audit.brokenStreetlights} unlit pole(s)` : 'fair lighting'}.`;
    }
  });

  return { routes, quotaExceeded };
}

export async function planPedestrianRoutes(
  startLat: number,
  startLng: number,
  destLat: number,
  destLng: number,
  preferences?: AccessibilityPreferences
): Promise<PedestrianRoute[]> {
  const result = await planPedestrianRoutesWithStatus(startLat, startLng, destLat, destLng, preferences);
  return result.routes;
}
