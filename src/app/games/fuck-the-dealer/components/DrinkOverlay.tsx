'use client';

import { useMemo } from 'react';

export function DrinkOverlay({
  show,
  seed = 0,
  message = 'DRINK!',
}: {
  show: boolean;
  seed?: number; // change to vary burst layout
  message?: string;
}) {
  // pre-generate burst particles (deterministic by seed)
  const parts = useMemo(() => {
    const rng = mulberry32(seed || Date.now());
    const EMOJI = ['🍺', '🍻', '🥃', '🍷', '🍹', '🍸', '🥂'];
    const count = 18;
    return Array.from({ length: count }).map((_, i) => {
      const e = EMOJI[i % EMOJI.length];
      // spread roughly in a circle
      const ang = rng() * Math.PI * 2;
      const r = 60 + rng() * 220; // px radius
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r * 0.75; // a bit flatter vertically
      const rot = (rng() * 120 - 60).toFixed(1);
      const delay = (i * 0.015 + rng() * 0.06).toFixed(3);
      const dur = (0.6 + rng() * 0.2).toFixed(3);
      const scale = (0.9 + rng() * 0.6).toFixed(2);
      return { e, x, y, rot, delay, dur, scale };
    });
  }, [seed]);

  if (!show) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* flash backdrop */}
      <div className="absolute inset-0 drink-flash" />
      {/* big pop text */}
      <div className="absolute inset-0 grid place-items-center">
        <div className="drink-text-pop">
          <span className="drink-text">{message}</span>
        </div>
      </div>
      {/* emoji burst */}
      <div className="absolute inset-0 grid place-items-center">
        <div className="relative">
          {parts.map((p, i) => (
            <span
              key={i}
              className="absolute drink-pop"
              style={{
                transform: `translate3d(0,0,0) scale(0) rotate(0deg)`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.dur}s`,
                // pass end position via CSS vars
                // @ts-ignore - custom properties for keyframes
                '--x': `${p.x}px`,
                '--y': `${p.y}px`,
                '--r': `${p.rot}deg`,
                '--s': p.scale,
                fontSize: '22px',
                left: 0, top: 0,
              } as React.CSSProperties}
            >
              {p.e}
            </span>
          ))}
        </div>
      </div>

      {/* local styles for the effect */}
      <style jsx global>{`
        @keyframes drink-flash-kf {
          0%   { opacity: 0; }
          10%  { opacity: 0.6; }
          100% { opacity: 0; }
        }
        .drink-flash {
          background: radial-gradient(120% 120% at 50% 50%, rgba(239,68,68,0.45), rgba(239,68,68,0.0) 60%);
          animation: drink-flash-kf 1.5s ease-out both;
        }

        @keyframes drink-text-pop-kf {
          0%   { transform: scale(0.6); opacity: 0; filter: drop-shadow(0 0 0 rgba(0,0,0,0)); }
          18%  { transform: scale(1.12); opacity: 1; filter: drop-shadow(0 6px 18px rgba(0,0,0,0.45)); }
          100% { transform: scale(1.0); opacity: 0; }
        }
        .drink-text-pop {
          animation: drink-text-pop-kf 0.9s cubic-bezier(.2,.8,.2,1) both;
        }
        .drink-text {
          font-weight: 900;
          font-size: clamp(40px, 6vw, 80px);
          letter-spacing: 0.06em;
          color: white;
          -webkit-text-stroke: 2px rgba(0,0,0,0.5);
          text-shadow:
            0 2px 0 rgba(0,0,0,0.25),
            0 10px 24px rgba(0,0,0,0.35);
          background: linear-gradient(90deg, #ef4444, #ffffff, #2563eb);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        @keyframes drink-pop-kf {
          0%   { transform: translate3d(0,0,0) scale(0) rotate(0deg); opacity: 0; }
          15%  { transform: translate3d(calc(var(--x) * 0.25), calc(var(--y) * 0.25), 0) scale(calc(var(--s) * 1.05)) rotate(var(--r)); opacity: 1; }
          100% { transform: translate3d(var(--x), var(--y), 0) scale(var(--s)) rotate(var(--r)); opacity: 0; }
        }
        .drink-pop {
          animation-name: drink-pop-kf;
          animation-timing-function: cubic-bezier(.2,.8,.2,1);
          animation-fill-mode: both;
        }

        @keyframes drink-shake-kf {
          0% { transform: translateX(0); }
          15% { transform: translateX(-10px); }
          30% { transform: translateX(9px); }
          45% { transform: translateX(-8px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-4px); }
          100% { transform: translateX(0); }
        }
        .drink-shake {
          animation: drink-shake-kf 420ms ease-in-out both;
        }
      `}</style>
    </div>
  );
}

// tiny deterministic RNG (for stable burst layouts per seed)
function mulberry32(a: number) {
  return function() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
