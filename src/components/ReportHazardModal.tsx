import React, { useState, useRef, useEffect } from 'react';
import {
  HazardCategory,
  Severity,
  HazardReport,
  UserRole,
} from '../types/index.ts';
import { CATEGORY_METADATA } from '../utils/categories.ts';
import {
  AlertTriangle,
  Camera,
  MapPin,
  Sparkles,
  Upload,
  X,
  Check,
  Compass,
  Info,
  ShieldCheck,
  HelpCircle,
  Copy,
} from 'lucide-react';

interface ReportHazardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportCreated: (newReport: HazardReport) => void;
  initialCoords?: [number, number] | null;
  userRole?: UserRole;
  userName?: string;
  userId?: string;
  existingHazards?: HazardReport[];
}

const SAMPLE_PHOTOS = [
  {
    name: 'Sidewalk Trenching Obstacle',
    url: '/src/assets/images/hazard_sidewalk_work_1792004205031.jpg',
    category: 'roadwork' as HazardCategory,
  },
  {
    name: 'Broken Streetlight at Dusk',
    url: '/src/assets/images/hazard_street_lamp_1792004206155.jpg',
    category: 'broken_streetlight' as HazardCategory,
  },
];

export const ReportHazardModal: React.FC<ReportHazardModalProps> = ({
  isOpen,
  onClose,
  onReportCreated,
  initialCoords,
  userRole = 'citizen',
  userName = 'Community Member',
  userId = 'usr_citizen_1',
  existingHazards = [],
}) => {
  const [category, setCategory] = useState<HazardCategory>('footpath_obstruction');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('RDC, Raj Nagar, Ghaziabad, UP');
  const [lat, setLat] = useState<number>(initialCoords ? initialCoords[0] : 28.6750);
  const [lng, setLng] = useState<number>(initialCoords ? initialCoords[1] : 77.4430);

  const reverseLookupAddress = async (latitude: number, longitude: number) => {
    try {
      const res = await fetch(`/api/reverse-geocode?lat=${latitude}&lng=${longitude}`);
      const data = await res.json().catch(() => ({}));
      if (res.status === 429 || data?.error?.status === 'RESOURCE_EXHAUSTED') {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        setAddress(`Coordinates (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`);
        return;
      }
      if (res.ok && data?.display_name) {
        setAddress(data.display_name);
      } else {
        setAddress(`Coordinates (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`);
      }
    } catch {
      setAddress(`Coordinates (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`);
    }
  };

  useEffect(() => {
    if (isOpen && initialCoords) {
      setLat(initialCoords[0]);
      setLng(initialCoords[1]);
      reverseLookupAddress(initialCoords[0], initialCoords[1]);
    }
  }, [isOpen, initialCoords]);

  // Photo state
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [photoBase64, setPhotoBase64] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Assist State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    suggestedCategory?: HazardCategory;
    suggestedTitle?: string;
    suggestedSeverity?: Severity;
    accessibilityImpact?: string;
    refinedDescription?: string;
    confidenceExplanation?: string;
    aiProvider?: string;
  } | null>(null);

  // GPS state
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Real-time duplicate detection: check within 60 meters
  const nearbyDuplicates = existingHazards.filter((h) => {
    if (h.status === 'resolved') return false;
    const R = 6371e3;
    const φ1 = (lat * Math.PI) / 180;
    const φ2 = (h.latitude * Math.PI) / 180;
    const Δφ = ((h.latitude - lat) * Math.PI) / 180;
    const Δλ = ((h.longitude - lng) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return d <= 60 && h.category === category;
  });

  // Handle local photo upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Photo exceeds maximum 5MB size limit.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPhotoBase64(result);
      setPhotoUrl(result);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  // Run AI Assisted Classification
  const handleRunAiAssist = async () => {
    if (!description && !photoBase64 && !photoUrl) {
      setError('Please enter a brief description or select a photo first so the AI can analyze it.');
      return;
    }

    setIsAiLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/classify-hazard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textDescription: description || title,
          imageBase64: photoBase64 || (photoUrl.startsWith('data:') ? photoUrl : undefined),
        }),
      });

      if (!res.ok) throw new Error('AI classification service was unable to evaluate the report.');
      const data = await res.json();
      setAiSuggestion(data);
    } catch (err: any) {
      setError(err.message || 'AI service error');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Apply AI suggestion to form
  const handleApplyAiSuggestion = () => {
    if (!aiSuggestion) return;
    if (aiSuggestion.suggestedCategory) setCategory(aiSuggestion.suggestedCategory);
    if (aiSuggestion.suggestedSeverity) setSeverity(aiSuggestion.suggestedSeverity);
    if (aiSuggestion.suggestedTitle) setTitle(aiSuggestion.suggestedTitle);
    if (aiSuggestion.refinedDescription) setDescription(aiSuggestion.refinedDescription);
    setAiSuggestion(null);
  };

  // Acquire current GPS with user consent
  const handleAcquireGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocation not supported');
      return;
    }
    setGpsStatus('Acquiring current GPS coordinates...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setGpsStatus('GPS location locked');
        await reverseLookupAddress(pos.coords.latitude, pos.coords.longitude);
        setTimeout(() => setGpsStatus(null), 2500);
      },
      (err) => {
        setGpsStatus(`GPS error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Submit Report
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a hazard title.');
      return;
    }
    if (!description.trim()) {
      setError('Please describe the obstacle conditions.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          severity,
          latitude: lat,
          longitude: lng,
          address,
          photoUrl: photoUrl || undefined,
          reporterName: userName,
          reporterRole: userRole,
          reporterId: userId,
        }),
      });

      if (!res.ok) throw new Error('Failed to submit report to municipal server');
      const data = await res.json();
      onReportCreated(data.report);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error submitting report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">Report Pedestrian Hazard</h2>
              <p className="text-xs text-slate-300">
                Help pedestrians navigate with transparent physical condition context
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI & Verification Notice */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Reports start as unverified. Municipal verifiers audit physical evidence.</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
            Submission timestamp auto-recorded
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
              {error}
            </div>
          )}

          {/* Potential Duplicate Alert Banner */}
          {nearbyDuplicates.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <Copy className="w-4 h-4 text-amber-700" />
                <span>Possible Duplicate Detected Within 60m</span>
              </div>
              <p className="text-slate-700">
                A similar {category.replace('_', ' ')} hazard was already reported at this location (
                {nearbyDuplicates[0].title}). SafeRoute will automatically group your evidence under
                the existing issue to speed up municipal repair.
              </p>
            </div>
          )}

          {/* Category Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-900 block">Hazard Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(CATEGORY_METADATA) as HazardCategory[]).map((cat) => {
                const isSelected = category === cat;
                return (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer text-xs ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold ring-1 ring-emerald-600/30'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="font-medium truncate">{CATEGORY_METADATA[cat].label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title & Severity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-900 block">Report Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Unlit crosswalk or missing ramp"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-900 block">Observed Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as Severity)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="low">Low (Minor inconvenience)</option>
                <option value="medium">Medium (Significant obstacle)</option>
                <option value="high">High (Major detour / barrier)</option>
                <option value="critical">Critical (Severe pedestrian danger)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900">
                Detailed Condition Description
              </label>
              <button
                type="button"
                onClick={handleRunAiAssist}
                disabled={isAiLoading}
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAiLoading ? 'AI Analyzing...' : 'AI Assist Classification'}</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the obstruction, accessibility barrier, or lighting failure. What is the impact on mobility or visibility?"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* AI Suggestion Confirmation Card */}
          {aiSuggestion && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-300 rounded-xl space-y-2.5 text-xs text-emerald-950">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>AI Advisory Suggestion (Review & Confirm)</span>
                </div>
                <span className="text-[10px] text-emerald-700 font-medium bg-emerald-100 px-2 py-0.5 rounded">
                  Requires User Approval
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-lg border border-emerald-200">
                <div>
                  <span className="text-slate-400 block">Proposed Category:</span>
                  <span className="font-semibold text-slate-800">
                    {CATEGORY_METADATA[aiSuggestion.suggestedCategory || category].label}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Proposed Severity:</span>
                  <span className="font-semibold text-slate-800 uppercase">
                    {aiSuggestion.suggestedSeverity}
                  </span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-100">
                  <span className="text-slate-400 block">Accessibility Impact:</span>
                  <span className="text-slate-700">{aiSuggestion.accessibilityImpact}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-[11px] text-slate-500">
                  SafeRoute never auto-verifies AI outputs.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAiSuggestion(null)}
                    className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyAiSuggestion}
                    className="px-3 py-1 bg-emerald-700 text-white rounded font-medium text-xs hover:bg-emerald-800 cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply Suggestions</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Photo Upload & Sample Assets */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 block">
              Photographic Evidence (Optional)
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto px-4 py-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-medium text-slate-700 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4 text-slate-500" />
                <span>Upload Photo (Max 5MB)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="text-xs text-slate-400">or test with realistic sample photos:</div>
              <div className="flex items-center gap-2">
                {SAMPLE_PHOTOS.map((sp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPhotoUrl(sp.url);
                      setCategory(sp.category);
                    }}
                    className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 cursor-pointer truncate max-w-[140px]"
                  >
                    {sp.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo Preview */}
            {photoUrl && (
              <div className="relative mt-2 rounded-xl overflow-hidden border border-slate-200 max-h-48 bg-slate-100">
                <img
                  src={photoUrl}
                  alt="Hazard evidence preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-44 object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoUrl('');
                    setPhotoBase64('');
                  }}
                  className="absolute top-2 right-2 bg-slate-900/80 text-white p-1 rounded-full hover:bg-slate-900 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Location Selection */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900">Physical Location</label>
              <button
                type="button"
                onClick={handleAcquireGps}
                className="text-xs text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer font-medium"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Use GPS Coordinates</span>
              </button>
            </div>

            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street intersection or landmark..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 p-2 bg-slate-50 rounded border border-slate-200 font-mono tabular-nums text-slate-600">
                <span className="text-[10px] text-slate-400 font-sans">Lat:</span>
                <span>{lat.toFixed(5)}</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 bg-slate-50 rounded border border-slate-200 font-mono tabular-nums text-slate-600">
                <span className="text-[10px] text-slate-400 font-sans">Lng:</span>
                <span>{lng.toFixed(5)}</span>
              </div>
            </div>

            {gpsStatus && <div className="text-xs text-emerald-700">{gpsStatus}</div>}
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting to SafeRoute Registry...' : 'Submit Hazard Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
