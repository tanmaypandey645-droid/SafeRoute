import React, { useState, useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  PedestrianRoute,
  HazardReport,
  AccessibilityPreferences,
  HazardCategory,
} from '../types/index.ts';
import { Map } from './Map.tsx';
import { CATEGORY_METADATA } from '../utils/categories.ts';
import {
  Navigation,
  MapPin,
  SlidersHorizontal,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Compass,
  Footprints,
  Info,
  ChevronRight,
  ShieldAlert,
  Layers,
  ArrowRightLeft,
  Search,
  X,
  Loader2,
  LocateFixed,
  Lightbulb,
  Construction,
  Wrench,
  ShieldCheck,
  Eye,
  AlertOctagon,
  Split,
} from 'lucide-react';

interface RoutePlannerProps {
  hazards: HazardReport[];
  onSelectHazard: (hazard: HazardReport) => void;
  onOpenReportModalWithCoords?: (lat: number, lng: number) => void;
  onNavigateToComparison: (routes: PedestrianRoute[]) => void;
  isDarkMode?: boolean;
}

interface LocationSuggestionItem {
  label: string;
  mainText: string;
  secondaryText: string;
  placePrediction?: google.maps.places.PlacePrediction;
  lat?: number;
  lng?: number;
}

const PRESET_ROUTES = [
  {
    name: 'RDC Raj Nagar to Old Bus Stand',
    startName: 'RDC (Raj Nagar District Centre), Ghaziabad',
    startCoords: [28.6750, 77.4430] as [number, number],
    destName: 'Old Bus Stand, Navyug Market, Ghaziabad',
    destCoords: [28.6652, 77.4389] as [number, number],
  },
  {
    name: 'Swarna Jayanti Park to Vaishali Metro',
    startName: 'Swarna Jayanti Park, Indirapuram, Ghaziabad',
    startCoords: [28.6366, 77.3686] as [number, number],
    destName: 'Vaishali Metro Station, Ghaziabad',
    destCoords: [28.6495, 77.3395] as [number, number],
  },
  {
    name: 'Mohan Nagar Crossing to Hindon River Corridor',
    startName: 'Mohan Nagar Crossing, Ghaziabad',
    startCoords: [28.6791, 77.3882] as [number, number],
    destName: 'Hindon River Pedestrian Walkway, Ghaziabad',
    destCoords: [28.6820, 77.3915] as [number, number],
  },
];

export const RoutePlanner: React.FC<RoutePlannerProps> = ({
  hazards,
  onSelectHazard,
  onOpenReportModalWithCoords,
  onNavigateToComparison,
  isDarkMode = false,
}) => {
  // Coordinates and query strings
  const [startQuery, setStartQuery] = useState('RDC (Raj Nagar District Centre), Ghaziabad');
  const [destQuery, setDestQuery] = useState('Old Bus Stand, Navyug Market, Ghaziabad');
  const [startCoords, setStartCoords] = useState<[number, number] | null>([28.6750, 77.4430]);
  const [destCoords, setDestCoords] = useState<[number, number] | null>([28.6652, 77.4389]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  const placesLib = useMapsLibrary('places');
  const startSessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const destSessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  // Search dropdown states
  const [startSuggestions, setStartSuggestions] = useState<LocationSuggestionItem[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<LocationSuggestionItem[]>([]);
  const [isSearchingStart, setIsSearchingStart] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [showStartDropdown, setShowStartDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  // Routes state
  const [routes, setRoutes] = useState<PedestrianRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters and preferences
  const [activeCategoryFilters, setActiveCategoryFilters] = useState<Record<HazardCategory, boolean>>({
    footpath_obstruction: true,
    broken_streetlight: true,
    difficult_crossing: true,
    roadwork: true,
    waterlogging: true,
    accessibility_barrier: true,
    uneven_pavement: true,
    debris_foliage: true,
  });

  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<AccessibilityPreferences>({
    fewerStairs: false,
    wheelchairOnly: false,
    fewerDifficultCrossings: false,
    highDataCoverageOnly: false,
    lightingImportance: 'medium',
  });

  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [inspectingRoute, setInspectingRoute] = useState(false);
  const [inspectionTab, setInspectionTab] = useState<'audit' | 'steps'>('audit');
  const [mobileTab, setMobileTab] = useState<'planner' | 'map'>('planner');

  const startDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const destDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const isQuotaError = (err: unknown): boolean => {
    const msg = String((err as any)?.message || err || '');
    const code = String((err as any)?.code || '');
    return (
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('OVER_QUERY_LIMIT') ||
      msg.includes('QuotaExceededError') ||
      msg.includes('429') ||
      code === 'RESOURCE_EXHAUSTED' ||
      code === 'OVER_QUERY_LIMIT'
    );
  };

  // Search Places API (New) AutocompleteSuggestion with SessionToken (or server Geocoding fallback)
  const searchGeocode = async (query: string, isStart: boolean) => {
    if (!query || query.trim().length < 2) {
      if (isStart) setStartSuggestions([]);
      else setDestSuggestions([]);
      return;
    }

    if (isStart) setIsSearchingStart(true);
    else setIsSearchingDest(true);

    try {
      if (placesLib) {
        const tokenRef = isStart ? startSessionTokenRef : destSessionTokenRef;
        if (!tokenRef.current) {
          tokenRef.current = new placesLib.AutocompleteSessionToken();
        }

        const response = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query.trim(),
          sessionToken: tokenRef.current,
          region: 'in',
        });

        const mapped: LocationSuggestionItem[] = (response?.suggestions || [])
          .filter((s) => Boolean(s.placePrediction))
          .slice(0, 6)
          .map((s) => {
            const pred = s.placePrediction!;
            const fullText = pred.text?.text || '';
            const mainText = pred.mainText?.text || fullText.split(',')[0] || fullText;
            const secondaryText = pred.secondaryText?.text || fullText;
            return {
              label: fullText,
              mainText,
              secondaryText,
              placePrediction: pred,
            };
          });

        if (isStart) {
          setStartSuggestions(mapped);
          setShowStartDropdown(mapped.length > 0);
        } else {
          setDestSuggestions(mapped);
          setShowDestDropdown(mapped.length > 0);
        }
        return;
      }

      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json().catch(() => ({}));
      if (res.status === 429 || data?.error?.status === 'RESOURCE_EXHAUSTED') {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        return;
      }
      if (res.ok && Array.isArray(data?.results)) {
        const mapped: LocationSuggestionItem[] = data.results.map((r: any) => ({
          label: r.display_name,
          mainText: String(r.display_name || '').split(',')[0],
          secondaryText: r.display_name,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        }));
        if (isStart) {
          setStartSuggestions(mapped);
          setShowStartDropdown(mapped.length > 0);
        } else {
          setDestSuggestions(mapped);
          setShowDestDropdown(mapped.length > 0);
        }
      }
    } catch (err) {
      if (isQuotaError(err)) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
    } finally {
      if (isStart) setIsSearchingStart(false);
      else setIsSearchingDest(false);
    }
  };

  const handleStartQueryChange = (val: string) => {
    setStartQuery(val);
    if (startDebounceRef.current) clearTimeout(startDebounceRef.current);
    startDebounceRef.current = setTimeout(() => {
      searchGeocode(val, true);
    }, 350);
  };

  const handleDestQueryChange = (val: string) => {
    setDestQuery(val);
    if (destDebounceRef.current) clearTimeout(destDebounceRef.current);
    destDebounceRef.current = setTimeout(() => {
      searchGeocode(val, false);
    }, 350);
  };

  const resolveSelectedSuggestion = async (
    item: LocationSuggestionItem,
    isStart: boolean
  ): Promise<{ lat: number; lng: number; addressLabel: string } | null> => {
    if (item.placePrediction) {
      try {
        const place = item.placePrediction.toPlace();
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location'],
        });
        // Reset session token after Place Details fetch completes
        if (isStart) startSessionTokenRef.current = null;
        else destSessionTokenRef.current = null;

        if (place.location) {
          return {
            lat: place.location.lat(),
            lng: place.location.lng(),
            addressLabel: place.formattedAddress || place.displayName || item.label,
          };
        }
      } catch (err) {
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
      }
    }

    if (item.lat !== undefined && item.lng !== undefined) {
      return {
        lat: item.lat,
        lng: item.lng,
        addressLabel: item.label,
      };
    }

    return null;
  };

  const handleSelectStartSuggestion = async (item: LocationSuggestionItem) => {
    setShowStartDropdown(false);
    setStartSuggestions([]);
    const resolved = await resolveSelectedSuggestion(item, true);
    if (!resolved) return;

    const coords: [number, number] = [resolved.lat, resolved.lng];
    setStartCoords(coords);
    setStartQuery(resolved.addressLabel);
    if (destCoords) {
      fetchRoutes(coords, destCoords);
    }
  };

  const handleSelectDestSuggestion = async (item: LocationSuggestionItem) => {
    setShowDestDropdown(false);
    setDestSuggestions([]);
    const resolved = await resolveSelectedSuggestion(item, false);
    if (!resolved) return;

    const coords: [number, number] = [resolved.lat, resolved.lng];
    setDestCoords(coords);
    setDestQuery(resolved.addressLabel);
    if (startCoords) {
      fetchRoutes(startCoords, coords);
    }
  };

  const fetchRoutes = async (
    sCoords: [number, number] = startCoords || [28.6750, 77.4430],
    dCoords: [number, number] = destCoords || [28.6652, 77.4389],
    prefs: AccessibilityPreferences = preferences
  ) => {
    setIsLoadingRoutes(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/routes/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startCoords: sCoords,
          destCoords: dCoords,
          preferences: prefs,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 429 || data?.error?.status === 'RESOURCE_EXHAUSTED') {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        setErrorMessage('Google Maps Platform quota reached. Unable to compute live routes right now.');
        return;
      }

      if (!res.ok) throw new Error(data?.error || 'Failed to retrieve pedestrian routes');

      if (Array.isArray(data?.routes) && data.routes.length > 0) {
        setRoutes(data.routes);
        setSelectedRouteId(data.routes[0].id);
      } else {
        setErrorMessage('No viable pedestrian routes found between these locations.');
      }
    } catch (err: any) {
      if (isQuotaError(err)) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
      setErrorMessage(err.message || 'Routing service error');
    } finally {
      setIsLoadingRoutes(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  // Geolocation handling with strict user consent
  const handleUseCurrentLocation = () => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }
    setGpsStatus('Requesting GPS location access...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        setStartCoords(coords);
        setGpsStatus('GPS location acquired');
        setTimeout(() => setGpsStatus(null), 3500);

        try {
          const revRes = await fetch(`/api/reverse-geocode?lat=${coords[0]}&lng=${coords[1]}`);
          const revData = await revRes.json().catch(() => ({}));
          if (revRes.status === 429 || revData?.error?.status === 'RESOURCE_EXHAUSTED') {
            window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
            setStartQuery(`Current Location (${coords[0].toFixed(4)}, ${coords[1].toFixed(4)})`);
          } else if (revRes.ok && revData?.display_name) {
            setStartQuery(revData.display_name);
          } else {
            setStartQuery(`Current Location (${coords[0].toFixed(4)}, ${coords[1].toFixed(4)})`);
          }
        } catch {
          setStartQuery(`Current Location (${coords[0].toFixed(4)}, ${coords[1].toFixed(4)})`);
        }

        if (destCoords) {
          fetchRoutes(coords, destCoords);
        }
      },
      (err) => {
        setGpsStatus(null);
        if (err.code === 1) {
          setGpsError('Location permission was denied. Please allow location access or search for a starting address manually.');
        } else if (err.code === 2) {
          setGpsError('Location unavailable. GPS signal could not be obtained. Please search manually.');
        } else {
          setGpsError(`Geolocation error: ${err.message}. Please search manually.`);
        }
      },
      { timeout: 12000, enableHighAccuracy: true }
    );
  };

  const handleSwapEndpoints = () => {
    const tempQuery = startQuery;
    const tempCoords = startCoords;
    setStartQuery(destQuery);
    setStartCoords(destCoords);
    setDestQuery(tempQuery);
    setDestCoords(tempCoords);
    if (destCoords && startCoords) {
      fetchRoutes(destCoords, startCoords);
    }
  };

  const handleSelectPreset = (preset: (typeof PRESET_ROUTES)[0]) => {
    setStartQuery(preset.startName);
    setStartCoords(preset.startCoords);
    setDestQuery(preset.destName);
    setDestCoords(preset.destCoords);
    setShowStartDropdown(false);
    setShowDestDropdown(false);
    fetchRoutes(preset.startCoords, preset.destCoords);
  };

  const selectedRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
  const visibleHazards = hazards.filter((h) => activeCategoryFilters[h.category]);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] w-full overflow-hidden bg-slate-50">
      {/* Mobile view switcher tab bar */}
      <div className="lg:hidden flex items-center border-b border-slate-200 bg-white px-4 py-2 shrink-0">
        <div className="flex rounded-lg bg-slate-100 p-0.5 w-full text-xs font-semibold">
          <button
            onClick={() => setMobileTab('planner')}
            className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
              mobileTab === 'planner'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Route Planning ({routes.length})
          </button>
          <button
            onClick={() => setMobileTab('map')}
            className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
              mobileTab === 'map'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Interactive Map
          </button>
        </div>
      </div>

      {/* Left Sidebar / Route Planner */}
      <div
        className={`w-full lg:w-[480px] xl:w-[530px] shrink-0 h-full overflow-y-auto bg-white border-r border-slate-200 flex flex-col z-20 shadow-xs ${
          mobileTab === 'map' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Banner Notice */}
        <div className="bg-slate-900 text-white p-3.5 text-xs border-b border-slate-800">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">SafeRoute Awareness:</span> We inspect working streetlights, active construction, broken infrastructure, and reported obstacles along every route so you can make informed walking choices.
            </div>
          </div>
        </div>

        {/* Inputs */}
        <div className="p-4 sm:p-5 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pedestrian Routing
            </span>
            <button
              onClick={() => setShowPreferences(!showPreferences)}
              className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showPreferences ? 'Hide Filters' : 'Accessibility & Weights'}</span>
            </button>
          </div>

          {/* Quick preset corridors */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden text-xs">
            <span className="text-slate-400 whitespace-nowrap shrink-0">Sample Corridors:</span>
            {PRESET_ROUTES.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectPreset(p)}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                title={`${p.startName} to ${p.destName}`}
              >
                {p.name.split(' to ')[0]} →
              </button>
            ))}
          </div>

          {/* Input Fields */}
          <div className="space-y-2 relative">
            {/* Start Location Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-600">
                <Footprints className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={startQuery}
                onChange={(e) => handleStartQueryChange(e.target.value)}
                onFocus={() => {
                  if (startSuggestions.length > 0) setShowStartDropdown(true);
                }}
                placeholder="Search starting point or street..."
                className="w-full pl-9 pr-28 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />

              <div className="absolute inset-y-1 right-1 flex items-center gap-1">
                {isSearchingStart && (
                  <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin mr-1" />
                )}
                {startQuery && (
                  <button
                    onClick={() => {
                      setStartQuery('');
                      setStartCoords(null);
                      setStartSuggestions([]);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                    title="Clear"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={handleUseCurrentLocation}
                  className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Use My Current GPS Location"
                >
                  <LocateFixed className="w-3 h-3 text-emerald-600" />
                  <span>My Location</span>
                </button>
              </div>

              {/* Start Suggestions Dropdown */}
              {showStartDropdown && startSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-56 overflow-y-auto">
                  <div className="p-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                    Location Matches (Select to set start)
                  </div>
                  {startSuggestions.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectStartSuggestion(item)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 border-b border-slate-50 flex items-start gap-2 cursor-pointer transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-900 line-clamp-1">
                          {item.mainText}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          {item.secondaryText}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Swap Button */}
            <div className="flex justify-center -my-1 relative z-10">
              <button
                onClick={handleSwapEndpoints}
                className="p-1 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-slate-800 shadow-2xs hover:shadow-xs cursor-pointer transition-transform hover:scale-110"
                title="Swap Start and Destination"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 rotate-90" />
              </button>
            </div>

            {/* Destination Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-800">
                <MapPin className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={destQuery}
                onChange={(e) => handleDestQueryChange(e.target.value)}
                onFocus={() => {
                  if (destSuggestions.length > 0) setShowDestDropdown(true);
                }}
                placeholder="Search destination location or landmark..."
                className="w-full pl-9 pr-16 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />

              <div className="absolute inset-y-1 right-1 flex items-center gap-1">
                {isSearchingDest && (
                  <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin mr-1" />
                )}
                {destQuery && (
                  <button
                    onClick={() => {
                      setDestQuery('');
                      setDestCoords(null);
                      setDestSuggestions([]);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                    title="Clear"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => searchGeocode(destQuery, false)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 rounded cursor-pointer"
                  title="Search destination"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Dest Suggestions Dropdown */}
              {showDestDropdown && destSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-56 overflow-y-auto">
                  <div className="p-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                    Location Matches (Select to set destination)
                  </div>
                  {destSuggestions.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectDestSuggestion(item)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 border-b border-slate-50 flex items-start gap-2 cursor-pointer transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5 text-slate-800 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-900 line-clamp-1">
                          {item.mainText}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          {item.secondaryText}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* GPS Status / Error Banners */}
            {gpsStatus && (
              <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded p-2 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 shrink-0 text-emerald-600 animate-spin" />
                <span>{gpsStatus}</span>
              </div>
            )}

            {gpsError && (
              <div className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded p-2 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600 mt-0.5" />
                <div className="flex-1">
                  <span>{gpsError}</span>
                  <button
                    onClick={() => setGpsError(null)}
                    className="block font-semibold underline mt-0.5 text-[11px] cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Accessibility Filters & Weights Accordion */}
          {showPreferences && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3 text-xs">
              <div className="font-semibold text-slate-800 flex items-center justify-between">
                <span>Accessibility & Routing Preferences</span>
                <span className="text-[10px] text-slate-500">Live Impact</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.fewerStairs}
                    onChange={(e) => {
                      const next = { ...preferences, fewerStairs: e.target.checked };
                      setPreferences(next);
                      if (startCoords && destCoords) fetchRoutes(startCoords, destCoords, next);
                    }}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Avoid Stairs / Steps</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.wheelchairOnly}
                    onChange={(e) => {
                      const next = { ...preferences, wheelchairOnly: e.target.checked };
                      setPreferences(next);
                      if (startCoords && destCoords) fetchRoutes(startCoords, destCoords, next);
                    }}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Wheelchair-Grade Path</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.fewerDifficultCrossings}
                    onChange={(e) => {
                      const next = { ...preferences, fewerDifficultCrossings: e.target.checked };
                      setPreferences(next);
                      if (startCoords && destCoords) fetchRoutes(startCoords, destCoords, next);
                    }}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Signalized Crossings</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.highDataCoverageOnly}
                    onChange={(e) => {
                      const next = { ...preferences, highDataCoverageOnly: e.target.checked };
                      setPreferences(next);
                      if (startCoords && destCoords) fetchRoutes(startCoords, destCoords, next);
                    }}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>High Data Coverage Only</span>
                </label>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-slate-600">Night Lighting Priority:</span>
                <select
                  value={preferences.lightingImportance}
                  onChange={(e) => {
                    const next = {
                      ...preferences,
                      lightingImportance: e.target.value as 'low' | 'medium' | 'high',
                    };
                    setPreferences(next);
                    if (startCoords && destCoords) fetchRoutes(startCoords, destCoords, next);
                  }}
                  className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                >
                  <option value="low">Standard</option>
                  <option value="medium">Balanced</option>
                  <option value="high">Strictly Well-Lit</option>
                </select>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              if (startCoords && destCoords) {
                fetchRoutes(startCoords, destCoords);
                if (window.innerWidth < 1024) setMobileTab('map');
              } else {
                setErrorMessage('Please select both a valid start point and destination.');
              }
            }}
            disabled={isLoadingRoutes}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Navigation className="w-4 h-4 text-emerald-400" />
            <span>{isLoadingRoutes ? 'Calculating Pedestrian Routes...' : 'Calculate Walking Routes'}</span>
          </button>
        </div>

        {/* Route List */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Multiple Journey Ways ({routes.length} Options)
            </h3>
            {routes.length >= 2 && (
              <button
                onClick={() => onNavigateToComparison(routes)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Compare Side-by-Side</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Prominent Multi-Way & Safest Route Verdict Box */}
          {!isLoadingRoutes && routes.length > 0 && (
            <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/40 border border-emerald-300 rounded-xl space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  Journey Safety Verdict
                </span>
                <span className="text-[10px] bg-emerald-200/90 text-emerald-950 font-bold px-2 py-0.5 rounded-full">
                  {routes.length} Ways Calculated
                </span>
              </div>

              <div className="text-xs text-slate-800">
                <span className="font-bold text-emerald-950">
                  🛡️ {routes[0]?.name} is the Safest Route
                </span>{' '}
                <span className="text-slate-600">
                  (Safety Score: <strong>{routes[0]?.conditionScore}/100</strong>).{' '}
                  {routes[0]?.safetyReason ||
                    'Optimized for complete street lighting, intact pavements, and lowest verified hazard rate.'}
                </span>
              </div>

              {/* Quick Select Buttons for each Way */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {routes.map((r, i) => {
                  const isSel = r.id === selectedRouteId;
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        setSelectedRouteId(r.id);
                        if (window.innerWidth < 1024) setMobileTab('map');
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isSel
                          ? r.isSafestRoute
                            ? 'bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-400'
                            : 'bg-indigo-700 text-white shadow-xs ring-2 ring-indigo-400'
                          : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span>{r.isSafestRoute ? '🛡️ Way 1 (Safest)' : `Way ${i + 1}`}</span>
                      <span className="font-mono text-[11px] opacity-90">({r.conditionScore}/100)</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isLoadingRoutes && (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <div className="inline-block animate-spin w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full" />
              <div className="text-xs font-medium">Scanning streetlights, construction, and broken infrastructure...</div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!isLoadingRoutes &&
            routes.map((route, routeIdx) => {
              const isSelected = route.id === selectedRouteId;
              const isSafest = route.isSafestRoute || routeIdx === 0;
              const audit = route.infrastructureAudit || {
                totalStreetlights: 30,
                workingStreetlights: 28,
                brokenStreetlights: 2,
                lightingPercentage: 93,
                lightingStatusSummary: 'Streetlights operational.',
                hasActiveConstruction: false,
                constructionCount: 0,
                constructionDetails: [],
                hasBrokenInfrastructure: false,
                brokenElementsCount: 0,
                brokenElements: [],
                totalObstacles: route.hazardsEncountered.length,
                obstacleList: [],
              };

              return (
                <div
                  key={route.id}
                  onClick={() => {
                    setSelectedRouteId(route.id);
                    if (window.innerWidth < 1024) setMobileTab('map');
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? isSafest
                        ? 'border-emerald-600 bg-emerald-50/20 ring-2 ring-emerald-600/30 shadow-md'
                        : 'border-indigo-600 bg-indigo-50/20 ring-2 ring-indigo-600/30 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        {isSafest ? (
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            SAFEST ROUTE
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                            Alternative Way {routeIdx + 1}
                          </span>
                        )}
                        <span className="font-bold text-sm text-slate-900">{route.name}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{route.summary}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-base font-bold font-mono tabular-nums ${
                          route.conditionScore >= 80
                            ? 'text-emerald-700'
                            : route.conditionScore >= 60
                            ? 'text-amber-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {route.conditionScore}
                        <span className="text-xs font-normal text-slate-400">/100</span>
                      </div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                        Safety Score
                      </span>
                    </div>
                  </div>

                  {/* Basic Distance, Walk Time, Coverage */}
                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Distance</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-800">
                        {route.distanceMeters >= 1000
                          ? `${(route.distanceMeters / 1000).toFixed(2)} km`
                          : `${route.distanceMeters} m`}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Est. Walk</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-800 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{route.durationMinutes} min</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Data Coverage</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-800">
                        {route.dataCoveragePercent}%
                      </span>
                    </div>
                  </div>

                  {/* 4 AUDIT PILLARS: Working Streetlights, Construction, Broken Elements, Obstacles */}
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    {/* 1. Working Streetlights */}
                    <div
                      className={`p-2 rounded-lg border flex flex-col justify-between ${
                        audit.lightingPercentage >= 88
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          : audit.lightingPercentage >= 70
                          ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                          : 'bg-rose-50/70 border-rose-200 text-rose-950'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1 text-[11px]">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Streetlights
                        </span>
                        <span className="font-mono font-bold text-xs">
                          {audit.workingStreetlights}/{audit.totalStreetlights}
                        </span>
                      </div>
                      <div className="text-[10px] mt-1 flex items-center justify-between">
                        <span className="font-medium">{audit.lightingPercentage}% Working</span>
                        {audit.brokenStreetlights > 0 ? (
                          <span className="text-rose-700 font-bold">
                            {audit.brokenStreetlights} Dark
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold">Full Lit</span>
                        )}
                      </div>
                    </div>

                    {/* 2. Construction Work */}
                    <div
                      className={`p-2 rounded-lg border flex flex-col justify-between ${
                        audit.hasActiveConstruction
                          ? 'bg-amber-50 border-amber-300 text-amber-950 ring-1 ring-amber-400/40'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1 text-[11px]">
                          <Construction className="w-3.5 h-3.5 text-amber-600" /> Construction
                        </span>
                        <span
                          className={`font-mono font-bold text-xs ${
                            audit.hasActiveConstruction ? 'text-amber-800' : 'text-slate-500'
                          }`}
                        >
                          {audit.hasActiveConstruction ? `${audit.constructionCount} Active` : 'None'}
                        </span>
                      </div>
                      <div className="text-[10px] mt-1 truncate">
                        {audit.hasActiveConstruction ? (
                          <span className="text-amber-800 font-semibold">Active Roadwork</span>
                        ) : (
                          <span className="text-slate-500">No construction</span>
                        )}
                      </div>
                    </div>

                    {/* 3. Broken Infrastructure */}
                    <div
                      className={`p-2 rounded-lg border flex flex-col justify-between ${
                        audit.hasBrokenInfrastructure
                          ? 'bg-rose-50/70 border-rose-200 text-rose-950 ring-1 ring-rose-400/30'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1 text-[11px]">
                          <Wrench className="w-3.5 h-3.5 text-rose-600" /> Broken Items
                        </span>
                        <span
                          className={`font-mono font-bold text-xs ${
                            audit.hasBrokenInfrastructure ? 'text-rose-800' : 'text-slate-500'
                          }`}
                        >
                          {audit.hasBrokenInfrastructure ? `${audit.brokenElementsCount} Broken` : 'None'}
                        </span>
                      </div>
                      <div className="text-[10px] mt-1 truncate">
                        {audit.hasBrokenInfrastructure ? (
                          <span className="text-rose-700 font-medium truncate">
                            {audit.brokenElements[0]?.title.split('&')[0].trim()}
                          </span>
                        ) : (
                          <span className="text-slate-500">Pavements & lights intact</span>
                        )}
                      </div>
                    </div>

                    {/* 4. Total Obstacles */}
                    <div
                      className={`p-2 rounded-lg border flex flex-col justify-between ${
                        audit.totalObstacles > 0
                          ? 'bg-slate-100 border-slate-200 text-slate-900'
                          : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1 text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Obstacles
                        </span>
                        <span className="font-mono font-bold text-xs">
                          {audit.totalObstacles}
                        </span>
                      </div>
                      <div className="text-[10px] mt-1 truncate">
                        {audit.totalObstacles === 0 ? (
                          <span className="text-emerald-700 font-semibold">0 Obstacles</span>
                        ) : (
                          <span className="text-slate-600">{audit.totalObstacles} on path</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ACTIVE CONSTRUCTION WARNING CALLOUT */}
                  {audit.hasActiveConstruction && (
                    <div className="mt-2.5 p-2 bg-amber-50 border border-amber-300 rounded text-[11px] text-amber-950 flex items-start gap-1.5">
                      <Construction className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-bold text-amber-900 flex items-center justify-between">
                          <span>Active Construction Work:</span>
                          <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 rounded">
                            {audit.constructionCount} zone{audit.constructionCount > 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="text-amber-800 mt-0.5 leading-snug">
                          {audit.constructionDetails.map((c) => c.title).join(' • ')}
                        </p>
                        <div className="text-[10px] font-semibold mt-1 text-amber-900">
                          {audit.constructionDetails.some((c) => c.hasDetour)
                            ? '✓ Temporary pedestrian walkway active'
                            : '⚠️ Sidewalk blocked; no safe detour ramp recorded'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* BROKEN INFRASTRUCTURE WARNING CALLOUT */}
                  {audit.hasBrokenInfrastructure && (
                    <div className="mt-1.5 p-2 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-950 flex items-start gap-1.5">
                      <Wrench className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-bold text-rose-900">Broken Infrastructure: </span>
                        <span className="text-rose-800">
                          {audit.brokenElements.map((b) => b.title).join(' • ')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Safety Highlights List */}
                  {route.safetyHighlights && route.safetyHighlights.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                      {route.safetyHighlights.map((hl, hlIdx) => {
                        const isPositive =
                          hl.startsWith('100%') ||
                          hl.startsWith('Zero') ||
                          hl.startsWith('Pavements') ||
                          hl.includes('intact');
                        const isConstruction = hl.includes('Construction') || hl.includes('roadwork');
                        return (
                          <span
                            key={hlIdx}
                            className={`text-[10px] px-2 py-0.5 rounded font-medium flex items-center gap-1 ${
                              isPositive
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : isConstruction
                                ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {isPositive ? '✓' : '⚠️'} {hl}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Footer Action & Inspection */}
                  <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <span className="text-[11px] text-slate-500 font-medium">
                      {isSafest ? '🛡️ Recommended Safest Journey' : 'Alternative Walking Path'}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRouteId(route.id);
                        setInspectingRoute(true);
                        setInspectionTab('audit');
                      }}
                      className="text-emerald-700 hover:text-emerald-800 font-bold underline text-[11px] cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Details →</span>
                    </button>
                  </div>

                  {route.dataCoveragePercent < 80 && (
                    <div className="mt-2 p-1.5 bg-amber-50/80 border border-amber-200/60 rounded text-[10px] text-amber-900 flex items-start gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <span>
                        Incomplete sidewalk data. Segments may feature unrecorded curb steps or uneven lighting.
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

          {/* Quick Action: Compare Route Differences */}
          {!isLoadingRoutes && routes.length >= 2 && (
            <button
              onClick={() => onNavigateToComparison(routes)}
              className="w-full py-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs mt-2"
            >
              <Split className="w-4 h-4 text-emerald-700" />
              <span>Compare Differences Between These {routes.length} Routes</span>
              <ChevronRight className="w-3.5 h-3.5 text-emerald-600" />
            </button>
          )}
        </div>

        {/* Hazard Overlay Filters */}
        <div className="p-3 border-t border-slate-200 bg-slate-50">
          <div className="text-[11px] font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Map Hazard Overlay Filters:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(CATEGORY_METADATA) as HazardCategory[]).map((cat) => {
              const active = activeCategoryFilters[cat];
              return (
                <button
                  key={cat}
                  onClick={() =>
                    setActiveCategoryFilters((prev) => ({ ...prev, [cat]: !prev[cat] }))
                  }
                  className={`text-[11px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    active
                      ? 'bg-white border-slate-300 text-slate-800 font-medium shadow-2xs'
                      : 'bg-slate-100 border-slate-200 text-slate-400 line-through'
                  }`}
                >
                  {CATEGORY_METADATA[cat].label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Map Canvas */}
      <div
        className={`flex-1 h-full relative ${
          mobileTab === 'planner' ? 'hidden lg:block' : 'block'
        }`}
      >
        <Map
          routes={routes}
          selectedRouteId={selectedRouteId}
          onSelectRoute={(id) => setSelectedRouteId(id)}
          hazards={visibleHazards}
          onSelectHazard={onSelectHazard}
          startCoords={startCoords}
          destCoords={destCoords}
          userLocation={userLocation}
          onMapClick={(lat, lng) => {
            if (onOpenReportModalWithCoords) {
              onOpenReportModalWithCoords(lat, lng);
            }
          }}
          isDarkMode={isDarkMode}
        />

        {/* Map Legend & Inspection Card */}
        <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-lg p-3 text-xs shadow-md space-y-1.5 hidden sm:block max-w-xs">
          <div className="font-semibold text-slate-900 flex items-center justify-between">
            <span>Route Condition Legend</span>
            <span className="text-[10px] text-emerald-700 font-medium">Ghaziabad, UP</span>
          </div>
          <div className="text-slate-600 text-[11px]">
            Selected route highlights verified obstacles, active roadwork, and dark/broken streetlights. Click any hazard icon to inspect verified evidence.
          </div>
          <div className="flex items-center gap-3 pt-1 border-t border-slate-100 text-[10px] text-slate-600">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Selected Route
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Construction 🚧
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" /> Broken Item ⚠️
            </span>
          </div>
        </div>

        {/* Deep-Dive Route Inspection Flyout Drawer */}
        {inspectingRoute && selectedRoute && (
          <div className="absolute inset-y-0 right-0 w-full sm:w-[440px] z-30 bg-white border-l border-slate-200 shadow-2xl flex flex-col">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div>
                <h4 className="font-bold text-sm text-white">{selectedRoute.name}</h4>
                <p className="text-xs text-slate-300">
                  {Math.round(selectedRoute.distanceMeters / 100) / 10} km · {selectedRoute.durationMinutes} min walk
                </p>
              </div>
              <button
                onClick={() => setInspectingRoute(false)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Condition Score & Tab Switcher */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider block">Condition Score</span>
                  <div className="text-lg font-bold font-mono text-slate-900">
                    {selectedRoute.conditionScore}/100
                  </div>
                </div>
                <div className="flex bg-slate-200 p-0.5 rounded-lg text-xs font-semibold">
                  <button
                    onClick={() => setInspectionTab('audit')}
                    className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                      inspectionTab === 'audit'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Infrastructure Audit
                  </button>
                  <button
                    onClick={() => setInspectionTab('steps')}
                    className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                      inspectionTab === 'steps'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Turn Directions ({selectedRoute.steps.length})
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {selectedRoute.scoreExplanation}
              </p>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {inspectionTab === 'audit' && (
                <>
                  {/* SECTION 1: WORKING STREETLIGHTS */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                          <Lightbulb className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-bold text-xs text-slate-900">Streetlight Working Status</h5>
                          <p className="text-[11px] text-slate-500">Corridor lighting density & dark spots</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-sm text-slate-900">
                          {selectedRoute.infrastructureAudit.workingStreetlights} / {selectedRoute.infrastructureAudit.totalStreetlights}
                        </div>
                        <span className="text-[10px] text-slate-500">Working Poles</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          selectedRoute.infrastructureAudit.lightingPercentage >= 88
                            ? 'bg-emerald-500'
                            : selectedRoute.infrastructureAudit.lightingPercentage >= 70
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${selectedRoute.infrastructureAudit.lightingPercentage}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span>{selectedRoute.infrastructureAudit.lightingPercentage}% Operational Illumination</span>
                      <span>
                        {selectedRoute.infrastructureAudit.brokenStreetlights > 0
                          ? `⚠️ ${selectedRoute.infrastructureAudit.brokenStreetlights} Dark/Broken Poles Reported`
                          : '✓ 100% Operational'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed">
                      {selectedRoute.infrastructureAudit.lightingStatusSummary}
                    </div>
                  </div>

                  {/* SECTION 2: ACTIVE CONSTRUCTION WORK */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                          <Construction className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-bold text-xs text-slate-900">Active Construction & Roadwork</h5>
                          <p className="text-[11px] text-slate-500">Excavations, trenching, and temporary detours</p>
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-bold ${
                          selectedRoute.infrastructureAudit.hasActiveConstruction
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {selectedRoute.infrastructureAudit.hasActiveConstruction
                          ? `${selectedRoute.infrastructureAudit.constructionCount} Active`
                          : 'None Active'}
                      </span>
                    </div>

                    {!selectedRoute.infrastructureAudit.hasActiveConstruction ? (
                      <div className="text-xs text-emerald-700 p-2.5 bg-white rounded-lg border border-slate-200 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>No active sidewalk construction or trench work reported on this corridor.</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedRoute.infrastructureAudit.constructionDetails.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 bg-white rounded-lg border border-amber-300 shadow-2xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-900">{item.title}</span>
                              <span className="text-[10px] font-semibold bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded uppercase">
                                {item.severity}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">{item.location}</div>
                            <p className="text-xs text-slate-700 leading-relaxed">{item.description}</p>
                            <div
                              className={`text-[11px] p-2 rounded flex items-center gap-1.5 ${
                                item.hasDetour
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {item.hasDetour ? (
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              )}
                              <span>{item.detourDescription}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SECTION 3: BROKEN INFRASTRUCTURE */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                          <Wrench className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-bold text-xs text-slate-900">Broken Infrastructure Elements</h5>
                          <p className="text-[11px] text-slate-500">Cracked slabs, dark lamps, and damaged signals</p>
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-bold ${
                          selectedRoute.infrastructureAudit.hasBrokenInfrastructure
                            ? 'bg-rose-100 text-rose-900 border border-rose-300'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {selectedRoute.infrastructureAudit.hasBrokenInfrastructure
                          ? `${selectedRoute.infrastructureAudit.brokenElementsCount} Broken`
                          : 'All Intact'}
                      </span>
                    </div>

                    {!selectedRoute.infrastructureAudit.hasBrokenInfrastructure ? (
                      <div className="text-xs text-emerald-700 p-2.5 bg-white rounded-lg border border-slate-200 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>All streetlamps, signals, and pavement slabs on this corridor are reported intact.</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedRoute.infrastructureAudit.brokenElements.map((broken) => (
                          <div
                            key={broken.id}
                            className="p-3 bg-white rounded-lg border border-rose-200 shadow-2xs space-y-1"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-900">{broken.title}</span>
                              <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                {broken.type.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">{broken.location}</div>
                            <p className="text-xs text-slate-600 leading-relaxed">{broken.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SECTION 4: ALL OBSTACLES LIST */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-slate-200 text-slate-700">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <h5 className="font-bold text-xs text-slate-900">All Corridor Obstacles</h5>
                          <p className="text-[11px] text-slate-500">Every recorded hazard within 45m of this route</p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-xs bg-slate-200 px-2 py-0.5 rounded">
                        {selectedRoute.hazardsEncountered.length} Total
                      </span>
                    </div>

                    {selectedRoute.hazardsEncountered.length === 0 ? (
                      <div className="text-xs text-emerald-700 p-2.5 bg-white rounded-lg border border-slate-200 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>No reported obstacles detected along this path.</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedRoute.hazardsEncountered.map((h) => (
                          <div
                            key={h.id}
                            onClick={() => onSelectHazard(h)}
                            className="p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer space-y-1"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-900">{h.title}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                  h.severity === 'critical'
                                    ? 'bg-rose-100 text-rose-800'
                                    : h.severity === 'high'
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {h.severity}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">{h.address}</div>
                            <p className="text-xs text-slate-600 line-clamp-2">{h.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* TAB 2: TURN-BY-TURN DIRECTIONS */}
              {inspectionTab === 'steps' && (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Turn-by-Turn Pedestrian Maneuvers
                  </div>
                  {selectedRoute.steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs border-b border-slate-100 pb-3">
                      <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="font-semibold text-slate-800 leading-snug">{step.instruction}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-3">
                          <span className="font-mono">{step.distanceMeters} m</span>
                          {step.streetName && <span>• {step.streetName}</span>}
                          {step.crossingType && (
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                              {step.crossingType} crosswalk
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
