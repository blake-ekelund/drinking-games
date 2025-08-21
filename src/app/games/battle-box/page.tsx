'use client';

import { useEffect, useRef, useState } from 'react';
import { useArenaEngine } from './components/arena/useArenaEngine';
import type { PlayerConfig } from './components/arena/types';
import { ControlBar } from './components/arena/ControlBar';
import { LeaderboardOverlay } from './components/arena/LeaderboardOverlay';
import { SetupModal } from './components/arena/SetupModal';
import { LiveSidebar } from './components/arena/LiveSidebar';

const DEFAULT_ROSTER: PlayerConfig[] = [
  { id: '1', input: '@leftplayer',  drinks: 0 },
  { id: '2', input: '@rightplayer', drinks: 0 },
  { id: '3', input: '@third',       drinks: 1 },
  { id: '4', input: '@fourth',      drinks: 2 },
];

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

export default function ArenaPage() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 900, h: 520 });
  const [setupOpen, setSetupOpen] = useState(false);
  const [roster, setRoster] = useState<PlayerConfig[]>(DEFAULT_ROSTER);
  const [countdown, setCountdown] = useState<number | null>(null);

  // responsive size from container
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      const h = clamp(w * 0.55, 320, 700);
      setSize({ w, h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { canvasRef, running, setRunning, winner, leaderboard, hud, startNewGame, resetHP, resume } =
    useArenaEngine({ width: size.w, height: size.h });

  const openNewGame = () => setSetupOpen(true);

  const begin = async (players: PlayerConfig[]) => {
    if (players.length < 2) return;
    setRoster(players);

    await startNewGame(players, { autostart: false });
    setSetupOpen(false);

    setCountdown(3);
    const id = setInterval(() => {
      setCountdown(c => {
        if (c === null) return null;
        if (c > 1) return c - 1;
        clearInterval(id);
        setCountdown(null);
        resume();
        return null;
      });
    }, 1000);
  };

  return (
    <main className="min-h-[100svh] bg-slate-900 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-6xl">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight">Battle Box</h1>
          <p className="text-white/60 text-sm">Collide to deal damage. Drinks: HP −2, ATK +1.</p>
        </header>

        {/* FIXED sidebar width (260px) to avoid squeezing the arena */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] gap-3">
          {/* Arena (left) */}
          <div ref={wrapRef} className="bg-slate-950/60 border border-white/10 rounded-2xl p-3 relative">
            <canvas ref={canvasRef} width={size.w} height={size.h} className="w-full rounded-xl bg-slate-950" />

            {/* Countdown overlay */}
            {countdown !== null && !leaderboard && (
              <div className="absolute inset-0 grid place-items-center bg-black/50 backdrop-blur-sm">
                <div className="text-6xl font-extrabold">{countdown}</div>
              </div>
            )}

            {/* End-of-match overlay */}
            {leaderboard && (
              <LeaderboardOverlay
                winner={winner}
                leaderboard={leaderboard}
                onNewGame={openNewGame}
              />
            )}

            {/* Setup modal */}
            {setupOpen && (
              <SetupModal
                initial={roster}
                onCancel={() => setSetupOpen(false)}
                onStart={begin}
              />
            )}
          </div>

          {/* Sidebar (right) */}
          <div>
            <LiveSidebar rows={hud} winner={winner} countdown={countdown} />
          </div>
        </div>

        <ControlBar
          running={running}
          canInteract={!leaderboard && countdown === null}
          onToggleRun={() => setRunning(r => !r)}
          onResetHP={resetHP}
          onNewGame={openNewGame}
        />

        <p className="mt-3 text-xs text-white/50">
          Tip: use TikTok handles (e.g., <code>@someuser</code>) or direct image URLs. Avatars via unavatar/dicebear.
        </p>
      </div>
    </main>
  );
}
