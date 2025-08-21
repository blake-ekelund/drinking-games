'use client';

import { suitColor } from './deck';
import type { Suit } from './types';

export function TrackRow({
  suit,
  pos,
  trackLen,
}: {
  suit: Suit;
  pos: number;       // 0..trackLen
  trackLen: number;  // finish at trackLen
}) {
  const isRed = suitColor(suit) === 'red';
  const cells = Array.from({ length: trackLen + 1 }, (_, i) => i);

  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 text-2xl font-bold ${isRed ? 'text-red-500' : 'text-white'}`}>{suit}</div>

      <div className="grid" style={{ gridTemplateColumns: `repeat(${trackLen + 1}, minmax(0,1fr))`, gap: '8px', width: '100%' }}>
        {cells.map(i => (
          <div key={i} className="relative h-10 rounded-md border border-white/10 bg-white/5 overflow-hidden">
            {i === pos && (
              <div className="absolute inset-0 grid place-items-center">
                <div className={`w-8 h-8 rounded-full grid place-items-center text-lg font-black
                                 bg-white ${isRed ? 'text-red-600 ring-red-500' : 'text-slate-900 ring-slate-400'} ring-2 transition-transform duration-200`}>
                  {suit}
                </div>
              </div>
            )}
            {/* start / finish markers */}
            {i === 0 && <div className="absolute left-0 inset-y-0 w-1 bg-white/30" />}
            {i === trackLen && <div className="absolute right-0 inset-y-0 w-1 bg-amber-300" />}
          </div>
        ))}
      </div>

      <div className="w-10 text-xl">🏁</div>
    </div>
  );
}
