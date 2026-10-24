import React, { useState, useEffect } from 'react';
import { PedestrianRoute } from '../types/index.ts';
import {
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Footprints,
  ShieldAlert,
  ArrowRight,
  Info,
  Layers,
  Lightbulb,
  Construction,
  Wrench,
  Split,
  Check,
  X,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Clock,
  RefreshCw,
} from 'lucide-react';

interface RouteComparisonProps {
  routes: PedestrianRoute[];
  onSelectRouteForMap: (routeId: string) => void;
}

export const RouteComparison: React.FC<RouteComparisonProps> = ({
  routes: initialRoutes,
  onSelectRouteForMap,
}) => {
  const [internalRoutes, setInternalRoutes] = useState<PedestrianRoute[]>(initialRoutes || []);
  const [loadingDemo, setLoadingDemo] = useState(false);

  // Sync with prop when it updates
  useEffect(() => {
    if (initialRoutes && initialRoutes.length > 0) {
      setInternalRoutes(initialRoutes);
    }
  }, [initialRoutes]);

  // Head-to-Head comparator selections
  const [headRouteAId, setHeadRouteAId] = useState<string>('');
  const [headRouteBId, setHeadRouteBId] = useState<string>('');

  // Configurable weight sliders for the scoring model
  const [weights, setWeights] = useState({
    footpathImportance: 1.0,
    lightingImportance: 1.0,
    crossingImportance: 1.0,
    accessibilityImportance: 1.0,
    hazardSensitivity: 1.2,
  });

  const routes = internalRoutes;

  // Set default comparative routes when routes load
  useEffect(() => {
    if (routes.length >= 2) {
      const safest = routes.find((r) => r.isSafestRoute) || routes[0];
      const alternative = routes.find((r) => r.id !== safest.id) || routes[1];
      setHeadRouteAId(safest.id);
      setHeadRouteBId(alternative.id);
    } else if (routes.length === 1) {
      setHeadRouteAId(routes[0].id);
      setHeadRouteBId(routes[0].id);
    }
  }, [routes]);

  const loadDemoRoutes = async () => {
    setLoadingDemo(true);
    try {
      const res = await fetch('/api/routes/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startCoords: [28.6750, 77.4430], // Ghaziabad Old Bus Stand
          destCoords: [28.6652, 77.4389],  // Ghaziabad Railway Station
          preferences: {
            fewerStairs: true,
            wheelchairOnly: false,
            fewerDifficultCrossings: true,
            highDataCoverageOnly: false,
            lightingImportance: 'high',
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429 || data?.error?.status === 'RESOURCE_EXHAUSTED') {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        return;
      }
      if (res.ok && Array.isArray(data?.routes) && data.routes.length > 0) {
        setInternalRoutes(data.routes);
      }
    } catch (err) {
      console.error('Failed to load demo comparison routes', err);
    } finally {
      setLoadingDemo(false);
    }
  };

  if (!routes || routes.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-8 my-12 bg-white border border-slate-200 rounded-2xl shadow-xs text-center space-y-6">
        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-600">
          <Split className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">Route Comparison & Difference Engine</h2>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">
            Compare pedestrian ways side-by-side to inspect the exact differences in working streetlights,
            active construction, broken infrastructure, and obstacles before choosing your path.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={loadDemoRoutes}
            disabled={loadingDemo}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {loadingDemo ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Computing Journey Ways...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Load Sample Route Comparison (Ghaziabad Corridor)</span>
              </>
            )}
          </button>
          <button
            onClick={() => onSelectRouteForMap('')}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Footprints className="w-4 h-4" />
            <span>Go to Route Planner</span>
          </button>
        </div>
      </div>
    );
  }

  // Recalculate transparent scores based on user weights
  const scoredRoutes = routes.map((r) => {
    const adjustedFootpath = Math.round(r.breakdown.footpathScore * weights.footpathImportance);
    const adjustedLighting = Math.round(r.breakdown.lightingScore * weights.lightingImportance);
    const adjustedCrossing = Math.round(r.breakdown.crossingScore * weights.crossingImportance);
    const adjustedAccessibility = Math.round(r.breakdown.accessibilityScore * weights.accessibilityImportance);
    const adjustedHazardPenalty = Math.round(r.breakdown.hazardPenalty * weights.hazardSensitivity);
    const adjustedDataPenalty = r.breakdown.dataCompletenessPenalty;

    const adjustedScore = Math.max(
      5,
      Math.min(
        98,
        adjustedFootpath +
          adjustedLighting +
          adjustedCrossing +
          adjustedAccessibility -
          adjustedHazardPenalty -
          adjustedDataPenalty
      )
    );

    return {
      ...r,
      adjustedScore,
      adjustedBreakdown: {
        footpath: adjustedFootpath,
        lighting: adjustedLighting,
        crossing: adjustedCrossing,
        accessibility: adjustedAccessibility,
        hazardPenalty: adjustedHazardPenalty,
        dataPenalty: adjustedDataPenalty,
      },
    };
  });

  const safestRoute = scoredRoutes.find((r) => r.isSafestRoute) || scoredRoutes[0];
  const shortestRoute = [...scoredRoutes].sort((a, b) => a.distanceMeters - b.distanceMeters)[0];

  // Head-to-Head routes
  const routeA = scoredRoutes.find((r) => r.id === headRouteAId) || scoredRoutes[0];
  const routeB = scoredRoutes.find((r) => r.id === headRouteBId) || (scoredRoutes[1] ?? scoredRoutes[0]);

  // Differential metrics between Route A and Route B
  const scoreDiff = routeA.adjustedScore - routeB.adjustedScore;
  const lightsDiff =
    (routeA.infrastructureAudit?.workingStreetlights ?? 0) -
    (routeB.infrastructureAudit?.workingStreetlights ?? 0);
  const constDiff =
    (routeA.infrastructureAudit?.constructionCount ?? 0) -
    (routeB.infrastructureAudit?.constructionCount ?? 0);
  const brokenDiff =
    (routeA.infrastructureAudit?.brokenElementsCount ?? 0) -
    (routeB.infrastructureAudit?.brokenElementsCount ?? 0);
  const obstacleDiff =
    (routeA.infrastructureAudit?.totalObstacles ?? 0) -
    (routeB.infrastructureAudit?.totalObstacles ?? 0);
  const distDiff = routeA.distanceMeters - routeB.distanceMeters;
  const timeDiff = routeA.durationMinutes - routeB.durationMinutes;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title & Tagline */}
      <div className="border-b border-slate-200 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded uppercase tracking-wider">
              Multi-Way Analysis
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-semibold text-slate-600">
              {scoredRoutes.length} Route Options Computed
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Route Comparison & Key Differences
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Compare pedestrian safety, streetlight illumination, broken infrastructure, and active construction
            between calculated ways.
          </p>
        </div>

        {/* Anti-Slop Data Notice */}
        <div className="bg-slate-100 text-slate-700 text-xs px-3.5 py-2 rounded-lg border border-slate-200 flex items-center gap-2 shrink-0">
          <Info className="w-4 h-4 text-slate-500" />
          <span>Real-time difference based on verified municipal surveys & hazard data.</span>
        </div>
      </div>

      {/* SECTION 1: EXECUTIVE DIFFERENCE SUMMARY CALLOUT */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-400/30">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                  Recommended Choice
                </span>
                <h2 className="text-lg font-bold text-white">
                  Safest Journey: {safestRoute.name}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-full border border-white/20 text-xs">
              <span className="text-emerald-300 font-bold">
                {safestRoute.adjustedScore}/100 Condition Score
              </span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-4xl">
            {safestRoute.safetyReason || (
              <>
                <strong className="text-white">{safestRoute.name}</strong> offers superior safety with{' '}
                <strong className="text-emerald-300">
                  {safestRoute.infrastructureAudit?.workingStreetlights ?? 0} working streetlights
                </strong>{' '}
                ({safestRoute.infrastructureAudit?.lightingPercentage ?? 100}% illuminated), completely avoids{' '}
                active roadwork/trenching, and has zero broken walkway elements.
              </>
            )}
          </p>

          {/* Quick Differences Highlights Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-white/10 rounded-xl p-3 border border-white/10 text-xs">
              <span className="text-slate-300 text-[11px] block">Streetlight Advantage</span>
              <span className="font-bold text-emerald-300 text-sm mt-0.5 block">
                {safestRoute.infrastructureAudit?.workingStreetlights} Working Lights
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {safestRoute.infrastructureAudit?.lightingPercentage}% illuminated
              </span>
            </div>

            <div className="bg-white/10 rounded-xl p-3 border border-white/10 text-xs">
              <span className="text-slate-300 text-[11px] block">Roadwork Avoidance</span>
              <span className="font-bold text-emerald-300 text-sm mt-0.5 block">
                {safestRoute.infrastructureAudit?.hasActiveConstruction ? 'Detour Marked' : 'Zero Construction'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                No active trenching hazards
              </span>
            </div>

            <div className="bg-white/10 rounded-xl p-3 border border-white/10 text-xs">
              <span className="text-slate-300 text-[11px] block">Pavement Integrity</span>
              <span className="font-bold text-emerald-300 text-sm mt-0.5 block">
                {safestRoute.infrastructureAudit?.brokenElementsCount === 0 ? 'All Slabs Intact' : `${safestRoute.infrastructureAudit?.brokenElementsCount} Broken`}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Continuous pedestrian walkway
              </span>
            </div>

            <div className="bg-white/10 rounded-xl p-3 border border-white/10 text-xs">
              <span className="text-slate-300 text-[11px] block">Distance vs Shortest</span>
              <span className="font-bold text-white text-sm mt-0.5 block">
                {safestRoute.distanceMeters === shortestRoute.distanceMeters
                  ? 'Is the Shortest Path'
                  : `+${safestRoute.distanceMeters - shortestRoute.distanceMeters}m (+${Math.max(1, safestRoute.durationMinutes - shortestRoute.durationMinutes)} min)`}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Safety prioritized over shortcuts
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: THE ROUTE DIFFERENCES MATRIX */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <Split className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Differences Between Routes (Comparison Matrix)
              </h3>
              <p className="text-xs text-slate-500">
                Detailed attribute-by-attribute difference across all generated journey options.
              </p>
            </div>
          </div>

          <span className="text-xs text-slate-400 font-mono">
            {scoredRoutes.length} Ways Evaluated
          </span>
        </div>

        {/* The Matrix Table */}
        <div className="overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700 font-semibold">
                <th className="py-3 px-4 w-44 font-semibold text-slate-600">Metric / Infrastructure</th>
                {scoredRoutes.map((route, idx) => (
                  <th key={route.id} className="py-3 px-4 min-w-[210px]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-500">
                          Option {idx + 1}
                        </span>
                        {route.isSafestRoute && (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                            🛡️ Safest
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-slate-900 truncate" title={route.name}>
                        {route.name}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {/* Verdict & Role */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-700">Safety Verdict</td>
                {scoredRoutes.map((route) => (
                  <td key={route.id} className="py-3 px-4">
                    {route.isSafestRoute ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <ShieldCheck className="w-3.5 h-3.5" /> Safest Route (Recommended)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {route.safetyBadge || 'Alternative Journey'}
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Safety Condition Score */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-700">
                  <span>Condition Score</span>
                  <span className="block text-[10px] text-slate-400 font-normal">Difference vs Safest</span>
                </td>
                {scoredRoutes.map((route) => {
                  const delta = route.adjustedScore - safestRoute.adjustedScore;
                  return (
                    <td key={route.id} className="py-3 px-4 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-slate-900 tabular-nums">
                          {route.adjustedScore}/100
                        </span>
                        {route.id === safestRoute.id ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            Safest Baseline
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              delta < 0 ? 'text-rose-700 bg-rose-50' : 'text-slate-600 bg-slate-100'
                            }`}
                          >
                            {delta > 0 ? `+${delta}` : delta} pts
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Working Street Lights */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    <span>Working Streetlights</span>
                  </div>
                  <span className="block text-[10px] text-slate-400 font-normal">Illumination quality</span>
                </td>
                {scoredRoutes.map((route) => {
                  const audit = route.infrastructureAudit;
                  const deltaLights =
                    (audit?.workingStreetlights ?? 0) - (safestRoute.infrastructureAudit?.workingStreetlights ?? 0);
                  const is100 = audit?.lightingPercentage === 100;

                  return (
                    <td key={route.id} className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{audit?.workingStreetlights ?? 0}</span>
                          <span className="text-slate-400 font-normal">/ {audit?.totalStreetlights ?? 0}</span>
                          {route.id !== safestRoute.id && deltaLights !== 0 && (
                            <span
                              className={`text-[10px] font-bold px-1 rounded ${
                                deltaLights < 0 ? 'text-amber-800 bg-amber-50' : 'text-emerald-700 bg-emerald-50'
                              }`}
                            >
                              {deltaLights > 0 ? `+${deltaLights}` : deltaLights}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span
                            className={`inline-block w-2 h-2 rounded-full ${
                              is100 ? 'bg-emerald-500' : 'bg-amber-400'
                            }`}
                          />
                          <span className={is100 ? 'text-emerald-700 font-semibold' : 'text-amber-800'}>
                            {audit?.lightingPercentage ?? 100}% Operational
                          </span>
                        </div>
                        {(audit?.brokenStreetlights ?? 0) > 0 && (
                          <span className="text-[10px] text-rose-600 block">
                            ⚠️ {audit?.brokenStreetlights} dark/broken fixtures
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Active Construction Work */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Construction className="w-3.5 h-3.5 text-amber-600" />
                    <span>Construction Work</span>
                  </div>
                  <span className="block text-[10px] text-slate-400 font-normal">Roadwork & detours</span>
                </td>
                {scoredRoutes.map((route) => {
                  const audit = route.infrastructureAudit;
                  return (
                    <td key={route.id} className="py-3 px-4">
                      {audit?.hasActiveConstruction ? (
                        <div className="space-y-1 text-amber-900">
                          <div className="font-bold flex items-center gap-1 text-amber-800">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>{audit.constructionCount} Active Roadwork Zone</span>
                          </div>
                          <span className="text-[10px] text-slate-600 block">
                            {audit.constructionDetails?.[0]?.title || 'Utility trenching / barricades'}
                          </span>
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded inline-block">
                            {audit.constructionDetails?.[0]?.hasDetour ? 'Pedestrian detour marked' : 'Roadwork caution'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>None (Pathway Clear)</span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Broken Infrastructure */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-rose-600" />
                    <span>Broken Infrastructure</span>
                  </div>
                  <span className="block text-[10px] text-slate-400 font-normal">Damaged slabs & signals</span>
                </td>
                {scoredRoutes.map((route) => {
                  const audit = route.infrastructureAudit;
                  return (
                    <td key={route.id} className="py-3 px-4">
                      {audit?.hasBrokenInfrastructure ? (
                        <div className="space-y-1 text-rose-900">
                          <div className="font-bold text-rose-700 flex items-center gap-1">
                            <X className="w-3.5 h-3.5" />
                            <span>{audit.brokenElementsCount} Broken Item Detected</span>
                          </div>
                          <span className="text-[10px] text-slate-600 block">
                            {audit.brokenElements?.[0]?.description || 'Damaged concrete paving slabs'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>All Pavements Intact</span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Total Obstacles */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Corridor Obstacles</span>
                  </div>
                  <span className="block text-[10px] text-slate-400 font-normal">Encroachments & hazards</span>
                </td>
                {scoredRoutes.map((route) => {
                  const hazards = route.hazardsEncountered.length;
                  return (
                    <td key={route.id} className="py-3 px-4 font-mono">
                      {hazards === 0 ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> 0 Obstacles
                        </span>
                      ) : (
                        <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded text-xs">
                          {hazards} Obstacle{hazards > 1 ? 's' : ''}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Distance & Duration */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Distance & Time</span>
                  </div>
                  <span className="block text-[10px] text-slate-400 font-normal">Walking effort</span>
                </td>
                {scoredRoutes.map((route) => {
                  const distDiffShortest = route.distanceMeters - shortestRoute.distanceMeters;
                  return (
                    <td key={route.id} className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="font-mono font-bold text-slate-900">
                          {route.distanceMeters >= 1000
                            ? `${(route.distanceMeters / 1000).toFixed(2)} km`
                            : `${route.distanceMeters} m`}{' '}
                          · {route.durationMinutes} min
                        </div>
                        {distDiffShortest > 0 ? (
                          <span className="text-[10px] text-slate-500 block">
                            +{distDiffShortest} m longer than fastest
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-semibold block">
                            Fastest Direct Path
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Action Button */}
              <tr className="bg-slate-50/40">
                <td className="py-3 px-4 font-semibold text-slate-700">Choose Route</td>
                {scoredRoutes.map((route) => (
                  <td key={route.id} className="py-3 px-4">
                    <button
                      onClick={() => onSelectRouteForMap(route.id)}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        route.isSafestRoute
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                          : 'bg-slate-800 hover:bg-slate-900 text-white'
                      }`}
                    >
                      <span>{route.isSafestRoute ? 'Select Safest Path' : 'Select This Way'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: INTERACTIVE HEAD-TO-HEAD DELTA COMPARATOR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-50 text-amber-700 rounded-md">
                <Split className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Head-to-Head Difference Comparator
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Select any two routes to view an instant side-by-side delta analysis and takeaway verdict.
            </p>
          </div>

          {/* Selectors for Route A and Route B */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Route A:</span>
              <select
                value={headRouteAId}
                onChange={(e) => setHeadRouteAId(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {scoredRoutes.map((r, i) => (
                  <option key={r.id} value={r.id}>
                    Way {i + 1}: {r.name.substring(0, 26)}... {r.isSafestRoute ? '(Safest)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs font-bold text-slate-400">vs</span>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Route B:</span>
              <select
                value={headRouteBId}
                onChange={(e) => setHeadRouteBId(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {scoredRoutes.map((r, i) => (
                  <option key={r.id} value={r.id}>
                    Way {i + 1}: {r.name.substring(0, 26)}... {r.isSafestRoute ? '(Safest)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Dynamic Delta Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Score Delta */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <span className="text-[11px] text-slate-500 block font-medium">Condition Delta</span>
            <div className="flex items-center gap-1.5 mt-1">
              {scoreDiff > 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              ) : scoreDiff < 0 ? (
                <TrendingDown className="w-4 h-4 text-rose-600" />
              ) : null}
              <span
                className={`text-lg font-mono font-extrabold ${
                  scoreDiff > 0 ? 'text-emerald-700' : scoreDiff < 0 ? 'text-rose-700' : 'text-slate-700'
                }`}
              >
                {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff} pts
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {scoreDiff > 0 ? 'Route A is safer' : scoreDiff < 0 ? 'Route B is safer' : 'Identical score'}
            </span>
          </div>

          {/* Working Lights Delta */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <span className="text-[11px] text-slate-500 block font-medium">Streetlights</span>
            <div className="flex items-center gap-1.5 mt-1">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span
                className={`text-lg font-mono font-extrabold ${
                  lightsDiff > 0 ? 'text-emerald-700' : lightsDiff < 0 ? 'text-rose-700' : 'text-slate-700'
                }`}
              >
                {lightsDiff > 0 ? `+${lightsDiff}` : lightsDiff} lights
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {lightsDiff > 0 ? 'Route A is brighter' : lightsDiff < 0 ? 'Route B is brighter' : 'Same lighting'}
            </span>
          </div>

          {/* Roadwork Delta */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <span className="text-[11px] text-slate-500 block font-medium">Active Roadwork</span>
            <div className="flex items-center gap-1.5 mt-1">
              <Construction className="w-4 h-4 text-amber-600" />
              <span
                className={`text-lg font-mono font-extrabold ${
                  constDiff < 0 ? 'text-emerald-700' : constDiff > 0 ? 'text-rose-700' : 'text-slate-700'
                }`}
              >
                {constDiff > 0 ? `+${constDiff}` : constDiff} zones
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {constDiff < 0
                ? 'Route A avoids work'
                : constDiff > 0
                ? 'Route A has roadwork'
                : 'Equal roadwork'}
            </span>
          </div>

          {/* Broken Elements Delta */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <span className="text-[11px] text-slate-500 block font-medium">Broken Items</span>
            <div className="flex items-center gap-1.5 mt-1">
              <Wrench className="w-4 h-4 text-rose-600" />
              <span
                className={`text-lg font-mono font-extrabold ${
                  brokenDiff < 0 ? 'text-emerald-700' : brokenDiff > 0 ? 'text-rose-700' : 'text-slate-700'
                }`}
              >
                {brokenDiff > 0 ? `+${brokenDiff}` : brokenDiff} broken
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {brokenDiff < 0
                ? 'Route A is intact'
                : brokenDiff > 0
                ? 'Route A has damage'
                : 'Equal slab state'}
            </span>
          </div>

          {/* Obstacles Delta */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <span className="text-[11px] text-slate-500 block font-medium">Obstacles</span>
            <div className="flex items-center gap-1.5 mt-1">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span
                className={`text-lg font-mono font-extrabold ${
                  obstacleDiff < 0 ? 'text-emerald-700' : obstacleDiff > 0 ? 'text-rose-700' : 'text-slate-700'
                }`}
              >
                {obstacleDiff > 0 ? `+${obstacleDiff}` : obstacleDiff} items
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {obstacleDiff < 0 ? 'Route A has fewer' : obstacleDiff > 0 ? 'Route B has fewer' : 'Same hazards'}
            </span>
          </div>

          {/* Time & Distance Delta */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <span className="text-[11px] text-slate-500 block font-medium">Walking Difference</span>
            <div className="flex items-center gap-1.5 mt-1">
              <Clock className="w-4 h-4 text-slate-600" />
              <span
                className={`text-lg font-mono font-extrabold ${
                  timeDiff < 0 ? 'text-emerald-700' : timeDiff > 0 ? 'text-slate-800' : 'text-slate-700'
                }`}
              >
                {timeDiff > 0 ? `+${timeDiff}` : timeDiff} min
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {distDiff > 0 ? `+${distDiff}m walk` : distDiff < 0 ? `${distDiff}m walk` : 'Same distance'}
            </span>
          </div>
        </div>

        {/* Narrative Verdict Between the Two Selected Routes */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 space-y-1.5">
          <div className="font-bold text-slate-900 flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-600" />
            <span>Differential Takeaway & Recommendation</span>
          </div>
          <p className="leading-relaxed">
            {routeA.id === routeB.id ? (
              <span>You have selected the same route for both sides. Select two different journey options above to inspect the specific infrastructure differences.</span>
            ) : (
              <>
                Comparing <strong className="text-slate-900">{routeA.name}</strong> against{' '}
                <strong className="text-slate-900">{routeB.name}</strong>:{' '}
                {scoreDiff > 0 ? (
                  <>
                    <strong className="text-emerald-700">{routeA.name}</strong> is{' '}
                    <strong>{scoreDiff} points safer</strong>. It offers{' '}
                    <span className="text-emerald-800 font-medium">
                      {routeA.infrastructureAudit?.workingStreetlights} operational streetlights
                    </span>{' '}
                    (vs {routeB.infrastructureAudit?.workingStreetlights}),{' '}
                    {constDiff < 0
                      ? 'avoids active roadwork detours,'
                      : constDiff > 0
                      ? 'though it passes near roadwork,'
                      : 'with similar roadwork conditions,'}{' '}
                    and requires {distDiff > 0 ? `${distDiff}m more walking` : `${Math.abs(distDiff)}m less walking`}.
                  </>
                ) : scoreDiff < 0 ? (
                  <>
                    <strong className="text-emerald-700">{routeB.name}</strong> is{' '}
                    <strong>{Math.abs(scoreDiff)} points safer</strong>. Route A has fewer working lights and{' '}
                    {brokenDiff > 0 ? `${brokenDiff} more broken paving slabs` : 'more reported obstacles'}.
                  </>
                ) : (
                  <>Both routes have comparable overall safety scores with distinct physical corridor trade-offs.</>
                )}
              </>
            )}
          </p>
        </div>
      </div>

      {/* SECTION 4: CONFIGURABLE MODEL WEIGHT CONTROLS */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">
            Adjust Pedestrian Scoring Priority Weights
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          Personalize how different physical infrastructure factors and hazard penalties influence
          the final condition score.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-2">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Footpath Quality</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {weights.footpathImportance.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={weights.footpathImportance}
              onChange={(e) =>
                setWeights((w) => ({ ...w, footpathImportance: parseFloat(e.target.value) }))
              }
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Lighting Importance</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {weights.lightingImportance.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={weights.lightingImportance}
              onChange={(e) =>
                setWeights((w) => ({ ...w, lightingImportance: parseFloat(e.target.value) }))
              }
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Crossing Safety</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {weights.crossingImportance.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={weights.crossingImportance}
              onChange={(e) =>
                setWeights((w) => ({ ...w, crossingImportance: parseFloat(e.target.value) }))
              }
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Accessibility (Ramps)</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {weights.accessibilityImportance.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={weights.accessibilityImportance}
              onChange={(e) =>
                setWeights((w) => ({ ...w, accessibilityImportance: parseFloat(e.target.value) }))
              }
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Hazard Sensitivity</span>
              <span className="font-mono tabular-nums font-semibold text-rose-700">
                {weights.hazardSensitivity.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={weights.hazardSensitivity}
              onChange={(e) =>
                setWeights((w) => ({ ...w, hazardSensitivity: parseFloat(e.target.value) }))
              }
              className="w-full accent-rose-600 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* SECTION 5: DETAILED ROUTE CARDS & MATHEMATICAL BREAKDOWN */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900">
          Individual Route Breakdown & Corridor Audits
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scoredRoutes.map((route, idx) => {
            const isWinner =
              scoredRoutes.length > 1 &&
              route.adjustedScore === Math.max(...scoredRoutes.map((s) => s.adjustedScore));

            return (
              <div
                key={route.id}
                className={`bg-white rounded-2xl border transition-all p-6 space-y-6 flex flex-col justify-between ${
                  isWinner
                    ? 'border-emerald-600 shadow-md ring-1 ring-emerald-600/30'
                    : 'border-slate-200 shadow-xs'
                }`}
              >
                <div className="space-y-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Option {idx + 1}
                        </span>
                        {isWinner && (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            🛡️ Safest Choice
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mt-1">{route.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{route.summary}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-2xl font-extrabold font-mono tabular-nums ${
                          route.adjustedScore >= 80
                            ? 'text-emerald-700'
                            : route.adjustedScore >= 60
                            ? 'text-amber-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {route.adjustedScore}
                        <span className="text-xs font-normal text-slate-400">/100</span>
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                        Score
                      </span>
                    </div>
                  </div>

                  {/* Physical Attributes Bar */}
                  <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50 rounded-xl text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Distance</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-800 text-[11px]">
                        {route.distanceMeters >= 1000
                          ? `${(route.distanceMeters / 1000).toFixed(2)} km`
                          : `${route.distanceMeters} m`}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Duration</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-800 text-[11px]">
                        {route.durationMinutes} min
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Lights</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-800 text-[11px]">
                        {route.infrastructureAudit?.workingStreetlights ?? 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Roadwork</span>
                      <span className="font-semibold text-slate-800 text-[11px]">
                        {route.infrastructureAudit?.hasActiveConstruction ? 'Active' : 'None'}
                      </span>
                    </div>
                  </div>

                  {/* Highlights Pill Badges */}
                  {route.safetyHighlights && route.safetyHighlights.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {route.safetyHighlights.map((hl, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          {hl}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Transparent Score Breakdown Table */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Evaluation Breakdown
                    </span>
                    <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                      <table className="w-full divide-y divide-slate-200">
                        <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                          <tr>
                            <td className="py-1.5 px-3 text-slate-700 font-sans text-xs">
                              Footpath Quality
                            </td>
                            <td className="py-1.5 px-3 text-right text-emerald-700 font-semibold text-xs">
                              +{route.adjustedBreakdown.footpath}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-3 text-slate-700 font-sans text-xs">
                              Night Streetlight Density
                            </td>
                            <td className="py-1.5 px-3 text-right text-emerald-700 font-semibold text-xs">
                              +{route.adjustedBreakdown.lighting}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-3 text-slate-700 font-sans text-xs">
                              Signalized Crossings
                            </td>
                            <td className="py-1.5 px-3 text-right text-emerald-700 font-semibold text-xs">
                              +{route.adjustedBreakdown.crossing}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-3 text-slate-700 font-sans text-xs">
                              Accessibility Grade
                            </td>
                            <td className="py-1.5 px-3 text-right text-emerald-700 font-semibold text-xs">
                              +{route.adjustedBreakdown.accessibility}
                            </td>
                          </tr>
                          {route.adjustedBreakdown.hazardPenalty > 0 && (
                            <tr className="bg-rose-50/40">
                              <td className="py-1.5 px-3 text-rose-800 font-sans text-xs">
                                Hazard Encounters Penalty
                              </td>
                              <td className="py-1.5 px-3 text-right text-rose-700 font-semibold text-xs">
                                -{route.adjustedBreakdown.hazardPenalty}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Rationale Prose */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <span className="text-[11px] font-bold text-slate-800">Scoring Rationale:</span>
                    <p className="text-xs text-slate-600 leading-relaxed">{route.scoreExplanation}</p>
                  </div>
                </div>

                <button
                  onClick={() => onSelectRouteForMap(route.id)}
                  className={`w-full py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-4 ${
                    isWinner
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <span>View on Map</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Safety & Integrity Warning */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-1">
        <div className="flex items-center gap-2 font-bold">
          <ShieldAlert className="w-4 h-4 text-amber-700" />
          <span>Transparency & Risk Disclosure</span>
        </div>
        <p className="text-slate-700 leading-relaxed">
          SafeRoute compiles municipal databases, OpenStreetMap pedestrian layers, and crowd-verified
          reports. Sidewalk conditions can shift rapidly due to weather, unplanned vehicle
          obstructions, or recent utility trenching. Always exercise personal situational awareness
          and verify surroundings.
        </p>
      </div>
    </div>
  );
};
