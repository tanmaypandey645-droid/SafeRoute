import React, { useState, useRef } from 'react';
import {
  AlertTriangle,
  Camera,
  Video,
  X,
  Send,
  Minimize2,
  Maximize2,
  CheckCircle2,
  Footprints,
  Lightbulb,
  Construction,
  Wrench,
  Droplets,
  AlertOctagon,
  Flag,
} from 'lucide-react';
import { HazardCategory, PedestrianRoute } from '../types/index.ts';

interface RouteFeedbackPopupProps {
  startLocation: string;
  destLocation: string;
  selectedRoute?: PedestrianRoute;
  currentCoords?: [number, number];
  onClose: () => void;
  onEndJourney: () => void;
  onFeedbackSubmitted: () => void;
}

const QUICK_TAGS: { label: string; category: HazardCategory; icon: React.FC<{ className?: string }> }[] = [
  { label: 'Broken Light', category: 'broken_streetlight', icon: Lightbulb },
  { label: 'Construction', category: 'roadwork', icon: Construction },
  { label: 'Broken Pavement', category: 'uneven_pavement', icon: Wrench },
  { label: 'Waterlogging', category: 'waterlogging', icon: Droplets },
  { label: 'Difficult Crossing', category: 'difficult_crossing', icon: AlertOctagon },
  { label: 'Sidewalk Blocked', category: 'footpath_obstruction', icon: AlertTriangle },
];

export const RouteFeedbackPopup: React.FC<RouteFeedbackPopupProps> = ({
  startLocation,
  destLocation,
  selectedRoute,
  currentCoords,
  onClose,
  onEndJourney,
  onFeedbackSubmitted,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<HazardCategory | ''>('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'photo' | 'video' | 'none'>('none');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setError('File size must be under 25MB');
      return;
    }

    setMediaFile(file);
    setError(null);

    const isVideo = file.type.startsWith('video/');
    setMediaType(isVideo ? 'video' : 'photo');

    const reader = new FileReader();
    reader.onload = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType('none');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) {
      setError('Please write a short description of what you saw.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const lat = currentCoords?.[0] || selectedRoute?.coordinates[0]?.[0];
      const lng = currentCoords?.[1] || selectedRoute?.coordinates[0]?.[1];

      const res = await fetch('/api/routes/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeId: selectedRoute?.id,
          routeName: selectedRoute?.name || 'Active Journey',
          startLocation: startLocation || 'Starting Point',
          destLocation: destLocation || 'Destination',
          feedbackText: feedbackText.trim(),
          mediaUrl: mediaPreview || undefined,
          mediaType,
          category: selectedCategory || 'uneven_pavement',
          latitude: lat,
          longitude: lng,
          userName: 'Travelling Pedestrian',
          userRole: 'citizen',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit route feedback');
      }

      // Success: Call onFeedbackSubmitted which will remove the popup
      onFeedbackSubmitted();
    } catch (err: any) {
      setError(err.message || 'Error submitting feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If minimized, display a small floating badge in the bottom corner that doesn't obstruct anything
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2.5 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-full shadow-xl border border-emerald-500/40 text-xs font-semibold cursor-pointer transition-all hover:scale-105"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>
          <Footprints className="w-4 h-4 text-emerald-200" />
          <span>Travelling • Report Route Issue</span>
          <Maximize2 className="w-3.5 h-3.5 ml-1 text-emerald-200" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 w-[340px] sm:w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-bottom-4">
      {/* Top Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                Journey In Progress
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-100 truncate">
              {startLocation} → {destLocation}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {/* Minimize Button */}
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700/60 transition-colors cursor-pointer"
            title="Minimize popup to pill"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          {/* Close / Dismiss */}
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700/60 transition-colors cursor-pointer"
            title="Dismiss feedback popup"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Feedback Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="font-bold text-slate-800 flex items-center gap-1">
              <Flag className="w-3.5 h-3.5 text-rose-500" />
              <span>Report Unusual or Bad Route Conditions</span>
            </label>
            <span className="text-[10px] text-slate-400 font-medium">On-the-go</span>
          </div>

          {/* Feedback Inbox / Textarea */}
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={3}
            placeholder="Saw something unusual? Describe what's bad on this road (e.g. broken streetlight, open ditch, active construction, broken pavement)..."
            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-none transition-all"
          />
        </div>

        {/* Quick Tag Chips */}
        <div>
          <span className="text-[10px] font-semibold text-slate-500 block mb-1.5 uppercase tracking-wider">
            Quick Issue Tag (Optional):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TAGS.map((tag) => {
              const isSelected = selectedCategory === tag.category;
              const Icon = tag.icon;
              return (
                <button
                  type="button"
                  key={tag.category}
                  onClick={() => setSelectedCategory(isSelected ? '' : tag.category)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer border ${
                    isSelected
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{tag.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Media Upload (Photo or Video) */}
        <div>
          <span className="text-[10px] font-semibold text-slate-500 block mb-1.5 uppercase tracking-wider">
            Upload Photo or Video of the Road:
          </span>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {!mediaPreview ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl text-slate-700 transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-semibold text-[11px]">Upload Photo</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl text-slate-700 transition-colors cursor-pointer"
              >
                <Video className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-semibold text-[11px]">Upload Video</span>
              </button>
            </div>
          ) : (
            <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-900">
              {mediaType === 'photo' ? (
                <div className="relative max-h-36 overflow-hidden flex items-center justify-center">
                  <img
                    src={mediaPreview}
                    alt="Uploaded road condition"
                    className="w-full object-cover max-h-36"
                  />
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-xs flex items-center gap-1 font-semibold">
                    <Camera className="w-3 h-3 text-emerald-400" />
                    <span>Photo Attached</span>
                  </div>
                </div>
              ) : (
                <div className="relative p-1">
                  <video
                    src={mediaPreview}
                    controls
                    className="w-full max-h-36 rounded-lg bg-black"
                  />
                  <div className="absolute top-3 left-3 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-xs flex items-center gap-1 font-semibold">
                    <Video className="w-3 h-3 text-indigo-400" />
                    <span>Video Attached</span>
                  </div>
                </div>
              )}

              {/* Remove media button */}
              <button
                type="button"
                onClick={handleRemoveMedia}
                className="absolute top-2 right-2 p-1 bg-black/70 hover:bg-black/90 text-white rounded-full transition-colors cursor-pointer"
                title="Remove uploaded media"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded-lg flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit Action & End Journey Option */}
        <div className="pt-1 space-y-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-60"
          >
            {isSubmitting ? (
              <span>Submitting Feedback...</span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Submit Route Feedback</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <span>Reached your destination?</span>
            <button
              type="button"
              onClick={onEndJourney}
              className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>End Journey</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
