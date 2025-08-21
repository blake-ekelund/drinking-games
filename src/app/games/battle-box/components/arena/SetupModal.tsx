'use client';

import type { PlayerConfig } from './types';
import { deriveStats } from './stats';
import { useState } from 'react';

export function SetupModal({
  initial,
  onCancel,
  onStart
}:{
  initial: PlayerConfig[];
  onCancel: () => void;
  onStart: (roster: PlayerConfig[]) => void;
}) {
  const [roster, setRoster] = useState<PlayerConfig[]>(initial);

  const cleaned = roster
    .map(r => ({
      ...r,
      input: (r.input || '').trim(),
      drinks: Math.max(0, Math.floor(Number(r.drinks) || 0)),
      specialDrinks: Math.max(0, Math.floor(Number(r.specialDrinks) || 0)),
      healthDrinks: Math.max(0, Math.floor(Number(r.healthDrinks) || 0)),
    }))
    .filter(r => r.input);

  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
      <div className="w-full max-w-3xl bg-slate-900 border border-white/15 rounded-2xl p-5 shadow-2xl">
        <h2 className="text-xl font-extrabold text-center">Create New Game</h2>

        <div className="mt-4">
          {/* Header Row */}
          <div className="grid grid-cols-12 gap-2 text-sm text-white/70">
            <div className="col-span-5">Player (@tiktok or image URL)</div>
            <div className="col-span-2 text-center">Drinks (ATK)</div>
            <div className="col-span-2 text-center">Special Drinks</div>
            <div className="col-span-1 text-center">Health Drinks</div>
            <div className="col-span-2 text-right pr-2">Preview (HP / ATK)</div>
          </div>

          {roster.map((p, idx) => {
            const base = deriveStats(p.drinks); // your existing rule
            const hpBoost = 50 * Math.max(0, Math.floor(Number(p.healthDrinks) || 0));
            const previewHp = Math.max(1, base.maxHp + hpBoost);
            const previewAtk = base.atk;

            return (
              <div key={p.id} className="grid grid-cols-12 gap-2 mt-2 items-center">
                {/* Player input */}
                <input
                  className="col-span-5 rounded-md bg-white/10 border border-white/20 px-3 py-2 text-sm"
                  value={p.input || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setRoster(r => r.map((row, i) => i === idx ? { ...row, input: v } : row));
                  }}
                  placeholder="@handle or https://image..."
                />

                {/* ATK drinks */}
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="col-span-2 rounded-md bg-white/10 border border-white/20 px-3 py-2 text-sm text-center"
                  value={p.drinks ?? 0}
                  onChange={(e) => {
                    const v = Math.max(0, Math.floor(Number(e.target.value) || 0));
                    setRoster(r => r.map((row, i) => i === idx ? { ...row, drinks: v } : row));
                  }}
                />

                {/* Special drinks */}
                <input
                  type="number"
                  min={0}
                  step={1}
                  title="15% proc chance; deals 10× drinks bonus and consumes them"
                  className="col-span-2 rounded-md bg-white/10 border border-white/20 px-3 py-2 text-sm text-center"
                  value={p.specialDrinks ?? 0}
                  onChange={(e) => {
                    const v = Math.max(0, Math.floor(Number(e.target.value) || 0));
                    setRoster(r => r.map((row, i) => i === idx ? { ...row, specialDrinks: v } : row));
                  }}
                />

                {/* Health drinks */}
                <input
                  type="number"
                  min={0}
                  step={1}
                  title="+2 HP per health drink at start"
                  className="col-span-1 rounded-md bg-white/10 border border-white/20 px-2 py-2 text-sm text-center"
                  value={p.healthDrinks ?? 0}
                  onChange={(e) => {
                    const v = Math.max(0, Math.floor(Number(e.target.value) || 0));
                    setRoster(r => r.map((row, i) => i === idx ? { ...row, healthDrinks: v } : row));
                  }}
                />

                {/* Preview */}
                <div className="col-span-2 text-right text-sm text-white/80 pr-2">
                  {previewHp} / {previewAtk}
                </div>
              </div>
            );
          })}

          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={() => setRoster(r => [
                ...r,
                {
                  id: String(Date.now()),
                  input: `@user${r.length + 1}`,
                  drinks: 0,
                  specialDrinks: 0,
                  healthDrinks: 0,
                }
              ])}
              className="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
            >
              + Add Player
            </button>
            <button
              onClick={() => setRoster(r => r.length > 0 ? r.slice(0, -1) : r)}
              className="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
            >
              − Remove Last
            </button>
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/15">
              Cancel
            </button>
            <button
              onClick={() => onStart(cleaned)}
              disabled={cleaned.length < 2}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 border border-white/20 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Game
            </button>
          </div>

          <p className="mt-3 text-xs text-white/50">
            Rules:
            <br />• Base drinks: HP −2, ATK +1 (HP ≥ 1).
            <br />• <span className="font-semibold">Health drinks</span>: +2 starting HP each.
            <br />• <span className="font-semibold">Special drinks</span>: 15% proc chance on hit, bonus damage = 10× drinks, then consumed.
          </p>
        </div>
      </div>
    </div>
  );
}
