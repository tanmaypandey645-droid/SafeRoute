import React, { useEffect, useState } from 'react';
import {
  Map as GoogleMap,
  AdvancedMarker,
  InfoWindow,
  Polyline,
  ColorScheme,
  useMap,
  useAdvancedMarkerRef,
  type MapMouseEvent,
} from '@vis.gl/react-google-maps';
import { HazardReport, PedestrianRoute } from '../types/index.ts';

interface MapProps {
  center?: [number, number];
  zoom?: number;
  routes?: PedestrianRoute[];
  selectedRouteId?: string;
  onSelectRoute?: (routeId: string) => void;
  hazards?: HazardReport[];
  selectedHazardId?: string;
  onSelectHazard?: (hazard: HazardReport) => void;
  startCoords?: [number, number] | null;
  destCoords?: [number, number] | null;
  userLocation?: [number, number] | null;
  onMapClick?: (lat: number, lng: number) => void;
  showHazards?: boolean;
  pinLocation?: [number, number] | null;
  className?: string;
  isDarkMode?: boolean;
}

function getHazardSymbol(category: string): string {
  switch (category) {
    case 'roadwork':
      return '🚧';
    case 'broken_streetlight':
      return '💡';
    case 'difficult_crossing':
      return '🚶';
    case 'waterlogging':
      return '💧';
    case 'accessibility_barrier':
      return '♿';
    case 'uneven_pavement':
      return '⚠️';
    case 'debris_foliage':
      return '🌿';
    default:
      return '⚠️';
  }
}

function getHazardBgClass(status: string, severity: string): string {
  if (status === 'resolved') return 'bg-slate-500';
  if (status === 'needs_rechecking') return 'bg-rose-600';
  if (status === 'under_review') return 'bg-blue-500';
  if (severity === 'critical') return 'bg-red-600';
  if (severity === 'high') return 'bg-orange-600';
  if (severity === 'medium') return 'bg-amber-600';
  return 'bg-emerald-600';
}

function getCategoryBadgeLabel(category: string): string {
  switch (category) {
    case 'roadwork':
      return '🚧 Active Construction / Roadwork';
    case 'broken_streetlight':
      return '💡 Broken Streetlight (Dark Pole)';
    case 'uneven_pavement':
      return '⚠️ Broken Pavement / Slab';
    case 'accessibility_barrier':
      return '♿ Broken Ramp / Tactile Barrier';
    case 'difficult_crossing':
      return '🚶 Difficult / Broken Crossing';
    case 'waterlogging':
      return '💧 Waterlogging / Flooding';
    default:
      return '⚠️ Municipal Hazard';
  }
}

interface HazardMarkerItemProps {
  hazard: HazardReport;
  isInfoOpen: boolean;
  onToggleInfo: (hazardId: string | null) => void;
  onSelectHazard?: (hazard: HazardReport) => void;
}

const HazardMarkerItem: React.FC<HazardMarkerItemProps> = ({
  hazard,
  isInfoOpen,
  onToggleInfo,
  onSelectHazard,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const bgClass = getHazardBgClass(hazard.status, hazard.severity);
  const symbol = getHazardSymbol(hazard.category);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: hazard.latitude, lng: hazard.longitude }}
        anchorLeft="-50%"
        anchorTop="-50%"
        zIndex={isInfoOpen ? 52 : 40}
        title={hazard.title}
        onClick={() => {
          onToggleInfo(isInfoOpen ? null : hazard.id);
        }}
      >
        <div
          className={`${bgClass} w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 border-white text-white text-xs font-bold cursor-pointer transition-transform hover:scale-110`}
        >
          <span>{symbol}</span>
        </div>
      </AdvancedMarker>

      {isInfoOpen && marker && (
        <InfoWindow
          anchor={marker}
          maxWidth={260}
          onCloseClick={() => onToggleInfo(null)}
        >
          <div className="p-1 text-slate-900 font-sans">
            <div className="inline-block text-[10px] font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded mb-1">
              {getCategoryBadgeLabel(hazard.category)}
            </div>
            <div className="font-bold text-xs text-slate-900 mb-0.5 leading-snug">
              {hazard.title}
            </div>
            <div className="text-[11px] text-slate-500 mb-2 leading-snug">
              {hazard.address}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] mb-2.5">
              <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium capitalize">
                Status: {hazard.status.replace('_', ' ')}
              </span>
              <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold uppercase">
                {hazard.severity}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onSelectHazard) onSelectHazard(hazard);
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-1.5 px-2.5 text-[11px] font-semibold rounded-md cursor-pointer transition-colors"
            >
              View Hazard Evidence & Details
            </button>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

interface MapViewportUpdaterProps {
  routes: PedestrianRoute[];
  userLocation?: [number, number] | null;
  startCoords?: [number, number] | null;
  destCoords?: [number, number] | null;
}

const MapViewportUpdater: React.FC<MapViewportUpdaterProps> = ({
  routes,
  userLocation,
  startCoords,
  destCoords,
}) => {
  const map = useMap();

  // Fit bounds whenever calculated routes update
  useEffect(() => {
    if (!map || routes.length === 0) return;

    let north = -90;
    let south = 90;
    let east = -180;
    let west = 180;
    let hasPoints = false;

    routes.forEach((route) => {
      route.coordinates.forEach(([lat, lng]) => {
        if (lat > north) north = lat;
        if (lat < south) south = lat;
        if (lng > east) east = lng;
        if (lng < west) west = lng;
        hasPoints = true;
      });
    });

    if (hasPoints) {
      map.fitBounds({ north, south, east, west }, { top: 68, right: 64, bottom: 220, left: 64 });
    }
  }, [map, routes]);

  // Fit start/dest if routes haven't loaded yet
  useEffect(() => {
    if (!map || routes.length > 0) return;

    if (startCoords && destCoords) {
      const north = Math.max(startCoords[0], destCoords[0]);
      const south = Math.min(startCoords[0], destCoords[0]);
      const east = Math.max(startCoords[1], destCoords[1]);
      const west = Math.min(startCoords[1], destCoords[1]);
      map.fitBounds({ north, south, east, west }, { top: 80, right: 80, bottom: 120, left: 80 });
    }
  }, [map, routes.length, startCoords, destCoords]);

  // Pan smoothly when GPS userLocation is acquired
  useEffect(() => {
    if (!map || !userLocation) return;
    map.panTo({ lat: userLocation[0], lng: userLocation[1] });
    map.setZoom(15);
  }, [map, userLocation]);

  return null;
};

export const Map: React.FC<MapProps> = ({
  center = [28.6692, 77.4538], // Ghaziabad, Uttar Pradesh, India
  zoom = 14,
  routes = [],
  selectedRouteId,
  onSelectRoute,
  hazards = [],
  selectedHazardId,
  onSelectHazard,
  startCoords,
  destCoords,
  userLocation,
  onMapClick,
  showHazards = true,
  pinLocation,
  className = 'h-full w-full',
  isDarkMode = false,
}) => {
  const [activeInfoHazardId, setActiveInfoHazardId] = useState<string | null>(
    selectedHazardId || null
  );
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('roadmap');

  useEffect(() => {
    if (selectedHazardId) {
      setActiveInfoHazardId(selectedHazardId);
    }
  }, [selectedHazardId]);

  const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];

  // Sort routes so unselected routes draw underneath and selected/safest draw on top
  const sortedForRender = [...routes].sort((a, b) => {
    if (a.id === selectedRouteId) return 1;
    if (b.id === selectedRouteId) return -1;
    if (a.isSafestRoute) return 1;
    return -1;
  });

  return (
    <div className={`relative ${className}`}>
      <div className="w-full h-full min-h-[400px]">
        <GoogleMap
          mapId="DEMO_MAP_ID"
          defaultCenter={{ lat: center[0], lng: center[1] }}
          defaultZoom={zoom}
          colorScheme={isDarkMode ? ColorScheme.DARK : ColorScheme.LIGHT}
          mapTypeId={mapType}
          gestureHandling="greedy"
          clickableIcons={false}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          zoomControl={true}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          className="w-full h-full min-h-[400px]"
          onClick={(e: MapMouseEvent) => {
            setActiveInfoHazardId(null);
            if (onMapClick && e.detail.latLng) {
              onMapClick(e.detail.latLng.lat, e.detail.latLng.lng);
            }
          }}
        >
          <MapViewportUpdater
            routes={routes}
            userLocation={userLocation}
            startCoords={startCoords}
            destCoords={destCoords}
          />

          {/* Route Polylines */}
          {sortedForRender.map((route) => {
            const isSelected = route.id === selectedRouteId;
            const isSafest = Boolean(route.isSafestRoute);
            const path = route.coordinates.map(([lat, lng]) => ({ lat, lng }));
            const primaryColor = isSafest ? '#059669' : '#6366F1';

            return (
              <React.Fragment key={route.id}>
                {isSelected && (
                  <Polyline
                    path={path}
                    strokeColor={isSafest ? '#10B981' : '#818CF8'}
                    strokeWeight={13}
                    strokeOpacity={0.35}
                    zIndex={28}
                    clickable={false}
                  />
                )}

                {isSafest || isSelected ? (
                  <Polyline
                    path={path}
                    strokeColor={isSelected ? primaryColor : '#059669'}
                    strokeWeight={isSelected ? (isSafest ? 7 : 6) : 5}
                    strokeOpacity={isSelected ? 0.98 : 0.8}
                    zIndex={isSelected ? 30 : 20}
                    onClick={() => {
                      if (onSelectRoute) onSelectRoute(route.id);
                    }}
                  />
                ) : (
                  <Polyline
                    path={path}
                    strokeColor="#64748B"
                    strokeOpacity={0}
                    strokeWeight={4}
                    zIndex={15}
                    icons={[
                      {
                        icon: {
                          path: 'M 0,-1 0,1',
                          strokeOpacity: 0.78,
                          strokeColor: isDarkMode ? '#94A3B8' : '#64748B',
                          scale: 3.5,
                        },
                        offset: '0',
                        repeat: '14px',
                      },
                    ]}
                    onClick={() => {
                      if (onSelectRoute) onSelectRoute(route.id);
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}

          {/* Point A (Start) Marker */}
          {startCoords && (
            <AdvancedMarker
              position={{ lat: startCoords[0], lng: startCoords[1] }}
              title="Point A (Start)"
              zIndex={45}
            >
              <div className="drop-shadow-md">
                <svg
                  width="34"
                  height="42"
                  viewBox="0 0 32 38"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M16 0C7.16 0 0 7.16 0 16C0 26.2 14.2 36.8 14.8 37.3C15.2 37.6 15.6 37.8 16 37.8C16.4 37.8 16.8 37.6 17.2 37.3C17.8 36.8 32 26.2 32 16C32 7.16 24.84 0 16 0Z"
                    fill="#15803D"
                  />
                  <circle cx="16" cy="15" r="7" fill="white" />
                  <text
                    x="16"
                    y="19"
                    fontSize="11"
                    fontWeight="bold"
                    fill="#15803D"
                    textAnchor="middle"
                    fontFamily="sans-serif"
                  >
                    A
                  </text>
                </svg>
              </div>
            </AdvancedMarker>
          )}

          {/* Point B (Destination) Marker */}
          {destCoords && (
            <AdvancedMarker
              position={{ lat: destCoords[0], lng: destCoords[1] }}
              title="Point B (Destination)"
              zIndex={46}
            >
              <div className="drop-shadow-md">
                <svg
                  width="34"
                  height="42"
                  viewBox="0 0 32 38"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M16 0C7.16 0 0 7.16 0 16C0 26.2 14.2 36.8 14.8 37.3C15.2 37.6 15.6 37.8 16 37.8C16.4 37.8 16.8 37.6 17.2 37.3C17.8 36.8 32 26.2 32 16C32 7.16 24.84 0 16 0Z"
                    fill="#0F172A"
                  />
                  <circle cx="16" cy="15" r="7" fill="white" />
                  <text
                    x="16"
                    y="19"
                    fontSize="11"
                    fontWeight="bold"
                    fill="#0F172A"
                    textAnchor="middle"
                    fontFamily="sans-serif"
                  >
                    B
                  </text>
                </svg>
              </div>
            </AdvancedMarker>
          )}

          {/* User GPS Position Marker */}
          {userLocation && (
            <AdvancedMarker
              position={{ lat: userLocation[0], lng: userLocation[1] }}
              anchorLeft="-50%"
              anchorTop="-50%"
              title="Your Current GPS Position"
              zIndex={55}
            >
              <div className="relative w-6 h-6 flex items-center justify-center">
                <span className="absolute w-6 h-6 rounded-full bg-blue-600/35 animate-ping" />
                <span className="relative w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-md" />
              </div>
            </AdvancedMarker>
          )}

          {/* Custom Pin Location Marker */}
          {pinLocation && (
            <AdvancedMarker
              position={{ lat: pinLocation[0], lng: pinLocation[1] }}
              title="Pinned Location"
              zIndex={50}
            >
              <div className="drop-shadow-md">
                <svg
                  width="34"
                  height="42"
                  viewBox="0 0 32 38"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M16 0C7.16 0 0 7.16 0 16C0 26.2 14.2 36.8 14.8 37.3C15.2 37.6 15.6 37.8 16 37.8C16.4 37.8 16.8 37.6 17.2 37.3C17.8 36.8 32 26.2 32 16C32 7.16 24.84 0 16 0Z"
                    fill="#2563EB"
                  />
                  <circle cx="16" cy="15" r="6" fill="white" />
                </svg>
              </div>
            </AdvancedMarker>
          )}

          {/* Hazard Advanced Markers + InfoWindows */}
          {showHazards &&
            hazards.map((hazard) => (
              <HazardMarkerItem
                key={hazard.id}
                hazard={hazard}
                isInfoOpen={activeInfoHazardId === hazard.id}
                onToggleInfo={setActiveInfoHazardId}
                onSelectHazard={onSelectHazard}
              />
            ))}
        </GoogleMap>
      </div>

      {/* Map Layer Switcher (Roadmap / Satellite) */}
      <div className="absolute top-4 right-4 z-20 flex bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 shadow-md text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMapType('roadmap')}
          className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
            mapType === 'roadmap'
              ? 'bg-slate-900 text-white dark:bg-emerald-600'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Map
        </button>
        <button
          type="button"
          onClick={() => setMapType('hybrid')}
          className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
            mapType === 'hybrid'
              ? 'bg-slate-900 text-white dark:bg-emerald-600'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Satellite
        </button>
      </div>

      {/* On-Map Floating Route & Safety Indicators Card (positioned above Google attribution/controls) */}
      {routes.length > 0 && activeRoute && (
        <div className="absolute bottom-7 left-4 right-14 sm:left-auto sm:right-14 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xl max-w-sm space-y-2.5 text-slate-900 dark:text-slate-100">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              {activeRoute.isSafestRoute ? (
                <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs border border-emerald-300 dark:border-emerald-800">
                  🛡️ SAFEST ROUTE
                </span>
              ) : (
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-slate-200 dark:border-slate-700">
                  Alternative Way
                </span>
              )}
              <span className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[150px]">
                {activeRoute.name}
              </span>
            </div>
            <span
              className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                activeRoute.conditionScore >= 80
                  ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}
            >
              {activeRoute.conditionScore}/100
            </span>
          </div>

          {/* Quick 4 Metrics: Working Streetlights, Construction, Broken Elements, Obstacles */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            {/* Streetlights */}
            <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded p-1.5">
              <span className="text-slate-500 dark:text-slate-400 text-[10px] flex items-center gap-1">
                <span className="text-amber-500">💡</span> Streetlights
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-100 font-mono">
                {activeRoute.infrastructureAudit?.workingStreetlights ?? 0} /{' '}
                {activeRoute.infrastructureAudit?.totalStreetlights ?? 0}
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-semibold">
                {activeRoute.infrastructureAudit?.lightingPercentage ?? 100}% Working
              </span>
            </div>

            {/* Construction */}
            <div
              className={`border rounded p-1.5 ${
                activeRoute.infrastructureAudit?.hasActiveConstruction
                  ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                  : 'bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200'
              }`}
            >
              <span className="text-slate-500 dark:text-slate-400 text-[10px] flex items-center gap-1">
                <span>🚧</span> Construction
              </span>
              <span className="font-bold font-mono text-[11px]">
                {activeRoute.infrastructureAudit?.hasActiveConstruction
                  ? `${activeRoute.infrastructureAudit.constructionCount} Active`
                  : 'None'}
              </span>
              <span className="text-[10px] block truncate">
                {activeRoute.infrastructureAudit?.hasActiveConstruction
                  ? 'Roadwork present'
                  : 'Path is clear'}
              </span>
            </div>

            {/* Broken Elements */}
            <div
              className={`border rounded p-1.5 ${
                activeRoute.infrastructureAudit?.hasBrokenInfrastructure
                  ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  : 'bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200'
              }`}
            >
              <span className="text-slate-500 dark:text-slate-400 text-[10px] flex items-center gap-1">
                <span>🔧</span> Broken Items
              </span>
              <span className="font-bold font-mono text-[11px]">
                {activeRoute.infrastructureAudit?.hasBrokenInfrastructure
                  ? `${activeRoute.infrastructureAudit.brokenElementsCount} Broken`
                  : 'None'}
              </span>
              <span className="text-[10px] block truncate">
                {activeRoute.infrastructureAudit?.hasBrokenInfrastructure
                  ? 'Damaged slabs/lamps'
                  : 'Pavements intact'}
              </span>
            </div>

            {/* Obstacles */}
            <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded p-1.5">
              <span className="text-slate-500 dark:text-slate-400 text-[10px] flex items-center gap-1">
                <span className="text-amber-600">⚠️</span> Obstacles
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-100 font-mono">
                {activeRoute.infrastructureAudit?.totalObstacles ??
                  activeRoute.hazardsEncountered.length}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                Corridor hazards
              </span>
            </div>
          </div>

          {/* Quick Multiple Ways Switcher on the Map */}
          {routes.length > 1 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 text-[10px] font-medium">
                Switch Way:
              </span>
              <div className="flex gap-1">
                {routes.map((r, idx) => {
                  const isSel = r.id === activeRoute.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => onSelectRoute && onSelectRoute(r.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                        isSel
                          ? r.isSafestRoute
                            ? 'bg-emerald-600 text-white'
                            : 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {r.isSafestRoute ? '🛡️ Way 1 (Safest)' : `Way ${idx + 1}`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
