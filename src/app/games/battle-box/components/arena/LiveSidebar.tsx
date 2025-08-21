'use client';

import { useEffect, useMemo, useRef } from 'react';

type Row = { id:string; label:string; hp:number; maxHp:number; atk:number; alive:boolean };

// --- Tunable weights for the heuristic model ---
// score_i = (HP% ^ ALPHA_HP) * (ATK ^ BETA_ATK)
// winProb_i = score_i / sum(scores of all alive)
const ALPHA_HP  = 1.25;   // emphasize current health ( >1 favors healthier players )
const BETA_ATK  = 0.85;   // emphasize attack ( <1 dampens extreme ATK )
const EMA_LAMBDA = 0.25;  // smoothing (0=no smoothing, 1=very slow). 0.25 = 25% new / 75% old

function clamp01(x:number){ return Math.max(0, Math.min(1, x)); }

function computeInstantProbs(rows: Row[]) {
  const alive = rows.filter(r => r.alive && r.maxHp > 0 && r.hp > 0);
  const scores = alive.map(r => {
    const hpPct = clamp01(r.hp / r.maxHp);
    const sc = Math.pow(hpPct, ALPHA_HP) * Math.pow(Math.max(1, r.atk), BETA_ATK);
    return { id: r.id, sc: isFinite(sc) ? sc : 0 };
  });
  const sum = scores.reduce((a,b)=>a+b.sc, 0);

  const map = new Map<string, number>();
  if (sum > 0) {
    for (const s of scores) map.set(s.id, s.sc / sum);
  } else if (alive.length) {
    // Fallback: all equal if scores collapsed
    const p = 1 / alive.length;
    for (const r of alive) map.set(r.id, p);
  }
  // KO / dead are zero
  for (const r of rows) if (!map.has(r.id)) map.set(r.id, 0);
  return map;
}

export function LiveSidebar({
  rows,
  winner,
  countdown
}:{
  rows: Row[];
  winner: string | null;
  countdown: number | null;
}) {
  const total = rows.length;
  const aliveRows = useMemo(
    () => rows.filter(r => r.alive)
              .sort((a, b) => (b.hp / b.maxHp) - (a.hp / a.maxHp) || b.hp - a.hp),
    [rows]
  );
  const deadRows  = useMemo(() => rows.filter(r => !r.alive), [rows]);

  const hpClass = (pct:number) =>
    pct > 0.5 ? 'text-green-400'
    : pct > 0.25 ? 'text-amber-400'
    : 'text-red-400';

  // --- Live probability (smoothed) ---
  const emaRef = useRef<Map<string, number>>(new Map());
  const probsInstant = useMemo(() => computeInstantProbs(rows), [rows]);

  // Update EMA store each render
  useEffect(() => {
    const prev = emaRef.current;
    const next = new Map<string, number>();
    for (const r of rows) {
      const pInst = probsInstant.get(r.id) ?? 0;
      const pPrev = prev.get(r.id) ?? pInst; // seed with current if not present
      const p = (1 - EMA_LAMBDA) * pPrev + EMA_LAMBDA * pInst;
      next.set(r.id, p);
    }
    emaRef.current = next;
  }, [rows, probsInstant]);

  // Helper to read the current smoothed prob
  const pWin = (id:string) => emaRef.current.get(id) ?? 0;

  return (
    <aside className="h-full rounded-xl border border-white/10 bg-slate-950/60 p-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold tracking-wide">Scoreboard</h2>
        <div className="text-[11px] text-white/60">{aliveRows.length}/{total}</div>
      </div>

      {countdown !== null && (
        <div className="mt-1 text-center text-xs text-white/80">
          Starting in <span className="font-bold">{countdown}</span>…
        </div>
      )}

      {winner && (
        <div className="mt-1 text-center text-xs">
          <span className="text-white/70">Winner:</span>{' '}
          <span className="font-extrabold text-amber-300">{winner}</span>
        </div>
      )}

      {/* Compact list; scrolls if overflow */}
      <ul className="mt-2 divide-y divide-white/5 overflow-auto" style={{ maxHeight: 'calc(100% - 56px)' }}>
        {aliveRows.map(r => {
          const hpPct = Math.max(0, Math.min(1, r.hp / r.maxHp));
          const prob  = pWin(r.id); // 0..1
          const probPct = Math.round(prob * 100);

          return (
            <li key={r.id} className="py-1.5">
              <div className="flex items-center justify-between">
                <span className="truncate text-[13px] font-medium">{r.label}</span>
                <div className="ml-2 flex items-baseline gap-2">
                  <span className={`text-[12px] tabular-nums ${hpClass(hpPct)}`}>
                    {r.hp}/{r.maxHp}
                  </span>
                  <span className="text-[11px] text-white/70 tabular-nums w-10 text-right">
                    {probPct}%
                  </span>
                </div>
              </div>
              {/* probability bar */}
              <div className="mt-1 h-1.5 w-full rounded bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-emerald-400/80"
                  style={{ width: `${probPct}%` }}
                />
              </div>
            </li>
          );
        })}

        {deadRows.length > 0 && (
          <>
            <li className="py-1 text-[10px] uppercase tracking-wide text-white/40">KO</li>
            {deadRows.map(r => (
              <li key={r.id} className="py-1">
                <div className="flex items-center justify-between text-white/50">
                  <span className="truncate text-[13px] line-through">{r.label}</span>
                  <div className="ml-2 flex items-baseline gap-2">
                    <span className="text-[12px] tabular-nums">0/{r.maxHp}</span>
                    <span className="text-[11px] text-white/60 tabular-nums w-10 text-right">0%</span>
                  </div>
                </div>
                <div className="mt-1 h-1.5 w-full rounded bg-white/10 overflow-hidden">
                  <div className="h-full bg-emerald-400/80" style={{ width: `0%` }} />
                </div>
              </li>
            ))}
          </>
        )}
      </ul>

      {/* Optional legend/help */}
      {/* <div className="mt-2 text-[10px] text-white/40">
        P(win) is a live estimate from HP% and ATK (smoothed).
      </div> */}
    </aside>
  );
}
