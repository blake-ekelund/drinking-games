'use client';

import { useMemo, useState } from 'react';
import type { LeaderboardRow } from './types';
import { loadLastGame } from './useArenaEngine'; // <-- import the helper you added

const suffix = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? 'st'
  : n % 10 === 2 && n % 100 !== 12 ? 'nd'
  : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');

export function LeaderboardOverlay({
  winner,
  leaderboard,
  onNewGame
}:{
  winner: string | null;
  leaderboard: LeaderboardRow[];
  onNewGame: () => void;
}) {
  const log = loadLastGame();
  const [selectedId, setSelectedId] = useState<string>(() => log?.fighters?.[0]?.id ?? '');

  // derive selected series
  const fighters = log?.fighters ?? [];
  const selected = fighters.find(f => f.id === selectedId) ?? fighters[0];
  const series = selected && log ? (log.series[selected.id] ?? []) : [];

  // chart dims & scales
  const W = 640, H = 220, PAD_L = 44, PAD_R = 14, PAD_T = 16, PAD_B = 28;
  const xs = series.map(p => p.t);
  const tMin = 0;
  const tMax = Math.max(1000, Math.max(0, ...xs));
  const yMin = 0;
  const yMax = Math.max(
    1,
    ...(fighters.length ? fighters.map(f => log?.series[f.id]?.[0]?.hp ?? 0) : [1])
  );

  const xScale = (t: number) =>
    PAD_L + ((t - tMin) / (tMax - tMin)) * (W - PAD_L - PAD_R);
  const yScale = (hp: number) =>
    H - PAD_B - ((hp - yMin) / (yMax - yMin)) * (H - PAD_T - PAD_B);

  const pathD = useMemo(() => {
    if (!series.length) return '';
    return series.map((p, i) => `${i ? 'L' : 'M'} ${xScale(p.t)} ${yScale(p.hp)}`).join(' ');
  }, [series]);

  return (
    <div className="absolute inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center">
      <div className="w-full max-w-2xl bg-slate-900 border border-white/15 rounded-2xl p-5 shadow-2xl">
        {/* Title */}
        <h2 className="text-xl font-extrabold text-center">
          {winner === 'Draw' ? 'Draw' : 'Winner: '} {winner !== 'Draw' && <span className="text-amber-300">{winner}</span>}
        </h2>

        {/* Leaderboard */}
        <div className="mt-6 divide-y divide-white/10">
          {leaderboard.map((row) => (
            <div key={row.place} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-8 text-right font-bold">
                  {row.place}<span className="text-white/60 text-xs align-super">{suffix(row.place)}</span>
                </div>
                <div className="font-semibold">{row.label}</div>
              </div>
              <div className="text-white/70 text-sm">HP {row.hp} • ATK {row.atk}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            onClick={onNewGame}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 border border-white/20 font-semibold"
          >
            Create New Game
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-white/50">
          Add players and drinks, then start a fresh match.
        </p>
      </div>
    </div>
  );
}
