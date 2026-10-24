import React, { useState, useEffect, useRef } from 'react';
import { Play, Volume2, VolumeX, ArrowRight, Sparkles } from 'lucide-react';

interface IntroVideoScreenProps {
  onComplete: () => void;
  isOpen: boolean;
}

export const IntroVideoScreen: React.FC<IntroVideoScreenProps> = ({
  onComplete,
  isOpen,
}) => {
  const [phase, setPhase] = useState<'icon' | 'title' | 'graph' | 'complete'>('icon');
  const [progress, setProgress] = useState(0);
  const [hasVideoFile, setHasVideoFile] = useState<boolean | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<any>(null);

  // Check if a real intro video file exists at /intro.mp4
  useEffect(() => {
    fetch('/intro.mp4', { method: 'HEAD' })
      .then((res) => {
        if (res.ok && res.headers.get('content-type')?.includes('video')) {
          setHasVideoFile(true);
        } else {
          setHasVideoFile(false);
        }
      })
      .catch(() => setHasVideoFile(false));
  }, []);

  // Animation timeline progression (4.4 seconds total matching video length)
  useEffect(() => {
    if (!isOpen) return;

    setIsFadingOut(false);
    setPhase('icon');
    setProgress(0);

    const startTime = Date.now();
    const duration = 4400; // 4.4 seconds

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (elapsed > 1100 && phase === 'icon') {
        setPhase('title');
      }
      if (elapsed > 2400 && (phase === 'icon' || phase === 'title')) {
        setPhase('graph');
      }
      if (elapsed >= duration) {
        clearInterval(interval);
        handleFinish();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [isOpen]);

  const handleFinish = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      onComplete();
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] bg-[#070709] flex flex-col justify-between items-center text-white overflow-hidden transition-opacity duration-500 select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Ambient Radial Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 40%, rgba(225, 29, 72, 0.22) 0%, rgba(159, 18, 57, 0.08) 45%, transparent 70%)',
        }}
      />

      {/* Top Header Bar */}
      <div className="w-full max-w-4xl px-6 py-5 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span className="text-[10px] tracking-[0.2em] font-mono text-rose-400 font-semibold uppercase">
            SafeRoute Awareness Platform
          </span>
        </div>

        <div className="flex items-center gap-3">
          {hasVideoFile && (
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={handleFinish}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/10 transition-all cursor-pointer hover:border-white/30"
          >
            <span>Skip Intro</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center Cinematic Stage */}
      <div className="flex-1 flex flex-col items-center justify-center z-10 px-4 text-center w-full">
        {hasVideoFile ? (
          /* Actual Video File if available */
          <div className="relative max-w-sm aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl border border-rose-950">
            <video
              ref={videoRef}
              src="/intro.mp4"
              autoPlay
              playsInline
              muted={isMuted}
              onEnded={handleFinish}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          /* Pixel-accurate 60 FPS Cinematic Recreation matching the uploaded video */
          <div className="flex flex-col items-center justify-center space-y-7 max-w-md w-full">
            {/* The 3D Squircle Logo with Radiant Red Corridor & Pedestrian Pin */}
            <div className="relative group cursor-pointer">
              {/* Outer Radiant Glow */}
              <div className="absolute -inset-4 rounded-[44px] bg-gradient-to-r from-rose-600/30 via-red-500/20 to-rose-700/30 blur-xl opacity-75 group-hover:opacity-100 transition duration-700 animate-pulse" />

              {/* The Squircle Container */}
              <div
                className="relative w-44 h-44 sm:w-48 sm:h-48 rounded-[38px] flex items-center justify-center p-4 border border-rose-900/60 shadow-[0_0_50px_rgba(225,29,72,0.35),inset_0_1px_2px_rgba(255,255,255,0.15)] overflow-hidden"
                style={{
                  background:
                    'radial-gradient(circle at 35% 25%, #231117 0%, #15090e 55%, #0a0407 100%)',
                }}
              >
                {/* SVG Composition of the glowing road and pedestrian pin from the video */}
                <svg
                  viewBox="0 0 160 160"
                  className="w-full h-full drop-shadow-[0_4px_12px_rgba(225,29,72,0.5)]"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    {/* Glowing Red Gradient for Road */}
                    <linearGradient id="roadGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#881337" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#e11d48" />
                      <stop offset="100%" stopColor="#f43f5e" />
                    </linearGradient>

                    {/* Gradient for Pin */}
                    <linearGradient id="pinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#f43f5e" />
                      <stop offset="60%" stopColor="#e11d48" />
                      <stop offset="100%" stopColor="#9f1239" />
                    </linearGradient>

                    {/* Soft Filter Glow */}
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Curving 3D Perspective Road sweeping into the distance */}
                  <path
                    d="M 12 138 C 45 132 80 125 78 108 C 76 96 48 94 62 82 C 72 74 88 80 88 80 C 88 80 62 88 56 100 C 50 114 96 114 148 116 L 148 128 C 95 126 52 124 40 134 C 32 140 18 144 12 144 Z"
                    fill="url(#roadGrad)"
                    opacity="0.9"
                    filter="url(#glow)"
                  />

                  {/* Highlighting sheen on the road edge */}
                  <path
                    d="M 14 138 C 50 130 82 120 78 106 C 76 96 52 92 64 80"
                    stroke="#fda4af"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    opacity="0.6"
                  />

                  {/* Red Pedestrian Pin Marker */}
                  <g transform="translate(48, 22)">
                    {/* Outer Pin Body */}
                    <path
                      d="M 32 0 C 14.3 0 0 14.3 0 32 C 0 54 28 78 30.5 80 C 31.5 80.8 32.5 80.8 33.5 80 C 36 78 64 54 64 32 C 64 14.3 49.7 0 32 0 Z"
                      fill="url(#pinGrad)"
                      filter="url(#glow)"
                    />
                    {/* Inner Dark Circular Lens */}
                    <circle cx="32" cy="30" r="19" fill="#0d0407" />

                    {/* Walking Pedestrian Silhouette */}
                    {/* Head */}
                    <circle cx="32" cy="21" r="3.2" fill="#ffffff" />
                    {/* Body & Arms */}
                    <path
                      d="M 32 26 L 31 36 M 27 28 L 32 29 L 36 32"
                      stroke="#ffffff"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Legs Walking */}
                    <path
                      d="M 31 36 L 27 43 M 31 36 L 36 42"
                      stroke="#ffffff"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                </svg>
              </div>
            </div>

            {/* Typography: SafeRoute + Tagline */}
            <div
              className={`space-y-1.5 transition-all duration-700 transform ${
                phase !== 'icon'
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-3'
              }`}
            >
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(255,255,255,0.15)]">
                SafeRoute
              </h1>
              <p className="text-[10px] sm:text-[11px] font-bold tracking-[0.25em] text-slate-400 uppercase">
                Every Step, With Greater Awareness
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom HUD: Animated Grid & Red Telemetry Line Chart (Frame 00:04) */}
      <div className="w-full relative z-10 flex flex-col items-center">
        {/* Subtle coordinate grid container */}
        <div className="w-full max-w-xl h-24 sm:h-28 relative overflow-hidden px-4">
          {/* Background Grid Lines */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(225, 29, 72, 0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(225, 29, 72, 0.4) 1px, transparent 1px)',
              backgroundSize: '36px 24px',
            }}
          />

          {/* Animated Crimson Line Chart & Data Nodes (exact match to video) */}
          <svg
            viewBox="0 0 500 100"
            className={`w-full h-full overflow-visible transition-opacity duration-700 ${
              phase === 'graph' ? 'opacity-100' : 'opacity-0'
            }`}
            preserveAspectRatio="none"
          >
            {/* The Connected Graph Line */}
            <polyline
              points="20,88 100,82 180,68 260,78 340,62 420,54 480,42"
              fill="none"
              stroke="#e11d48"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_8px_rgba(225,29,72,0.8)]"
              style={{
                strokeDasharray: 600,
                strokeDashoffset: phase === 'graph' ? 0 : 600,
                transition: 'stroke-dashoffset 1.8s ease-out',
              }}
            />

            {/* Glowing Data Dots on Vertices */}
            {[
              { cx: 20, cy: 88 },
              { cx: 100, cy: 82 },
              { cx: 180, cy: 68 },
              { cx: 260, cy: 78 },
              { cx: 340, cy: 62 },
              { cx: 420, cy: 54 },
              { cx: 480, cy: 42 },
            ].map((pt, i) => (
              <g key={i}>
                <circle
                  cx={pt.cx}
                  cy={pt.cy}
                  r="3.5"
                  fill="#ffffff"
                  stroke="#e11d48"
                  strokeWidth="2"
                  className="animate-pulse"
                />
              </g>
            ))}
          </svg>
        </div>

        {/* Minimal Progress Bar */}
        <div className="w-full bg-slate-900/60 h-1 relative overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-rose-600 via-red-500 to-rose-400 transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Bottom Status Caption */}
        <div className="w-full max-w-4xl px-6 py-3 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>INITIALIZING CORRIDOR SAFETY ENGINE...</span>
          <span className="tabular-nums">{progress}%</span>
        </div>
      </div>
    </div>
  );
};
