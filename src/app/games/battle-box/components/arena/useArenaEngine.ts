'use client';

import { useEffect, useRef, useState } from 'react';
import type { Fighter, LeaderboardRow, PlayerConfig } from './types';
import { deriveStats } from './stats';
import { avatarURL, loadImage } from './avatars';

const COOLDOWN_MS = 250;

// ----- PONG MOTION -----
const SPEED_MULT = 1.4;
const BASE_SPEED = 250 * SPEED_MULT;
const SPEED_CAP  = 500 * SPEED_MULT;
const SPEEDUP_ON_HIT = 1.00;   // multiplier applied on avatar-avatar hit (1.00 = no change)
const WALL_SPEEDUP    = 1.00;  // truthy means enabled; multiplier applied on wall hit (1.00 = no change)
// ----------------------------------

// ----- Avatar sizing -----
const MIN_R = 8;
const MAX_R = 64;
const PACK_FACTOR = 0.25;
const R_LERP = 0.18;
// -------------------------

// ----- Specials (config) -----
const SPECIAL_PROC_CHANCE = 0.05;   // 15% to trigger on any scored hit
const SPECIAL_DAMAGE_MULT = 15;     // 10x per special drink
const SPECIAL_FLASH_MS    = 140;    // quick ring flash duration
// -----------------------------

const clamp = (n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));

function targetRadius(nAlive: number, width: number, height: number) {
  const n = Math.max(1, nAlive);
  const area = width * height * PACK_FACTOR;
  const r = Math.sqrt(area / (n * Math.PI));
  return clamp(Math.round(r), MIN_R, MAX_R);
}

// Momentum-ish damage, impact speed from normal closing speed
function computeDamage(attacker: Fighter, defender: Fighter, relSpeed: number) {
  const vRef = 200;
  const momScale = 0.6 + 0.6 * Math.min(relSpeed / vRef, 2);
  let dmg = attacker.atk * momScale;
  dmg *= (1 - defender.def);
  if (Math.random() < attacker.crit) dmg *= 1.5;
  return Math.max(1, Math.round(dmg));
}

// Normalize (vx,vy) to a target speed; if nearly zero, pick a random dir
function setSpeed(a: Fighter, speed: number) {
  const s = Math.hypot(a.vx, a.vy);
  if (s < 1e-6) {
    const ang = Math.random() * Math.PI * 2;
    a.vx = Math.cos(ang) * speed;
    a.vy = Math.sin(ang) * speed;
  } else {
    const k = speed / s;
    a.vx *= k; a.vy *= k;
  }
}

// ---------- HP Time-Series Persistence ----------
const LS_LAST_GAME = 'arena:lastGame';

export type HpSeriesSnapshot = {
  gameId: string;
  startedAtMs: number;
  durationMs: number;
  fighters: Array<{ id: string; label: string }>;
  series: Record<string, Array<{ t: number; hp: number }>>; // per-id series (t in ms)
};

function saveLastGame(payload: HpSeriesSnapshot) {
  try { localStorage.setItem(LS_LAST_GAME, JSON.stringify(payload)); } catch {}
}

export function loadLastGame(): HpSeriesSnapshot | null {
  try {
    const raw = localStorage.getItem(LS_LAST_GAME);
    return raw ? (JSON.parse(raw) as HpSeriesSnapshot) : null;
  } catch { return null; }
}
// ------------------------------------------------

export function useArenaEngine({ width, height }:{ width:number; height:number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const fightersRef = useRef<Fighter[]>([]);
  const cooldownRef = useRef<Map<string, number>>(new Map());
  const deathTimeRef = useRef<Map<string, number>>(new Map());

  const [running, setRunning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[] | null>(null);

  // Live HUD for sidebar (~8 fps)
  const [hud, setHud] = useState<Array<{ id:string; label:string; hp:number; maxHp:number; atk:number; alive:boolean }>>([]);

  // ---- HP time-series refs ----
  const seriesRef = useRef<Map<string, Array<{ t: number; hp: number }>>>(new Map());
  const startMsRef = useRef<number>(0);
  const gameIdRef  = useRef<string>('');

  // RAF loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;

      if (running && !leaderboard) {
        stepPhysics(dt, now);
        maybeFinish(now);
      }
      draw(ctx);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, width, height, leaderboard]);

  // HUD publisher (~8 fps)
  useEffect(() => {
    let raf = 0, last = 0;
    const tick = (t:number) => {
      raf = requestAnimationFrame(tick);
      if (t - last > 120) {
        const f = fightersRef.current;
        setHud(f.map(x => ({
          id: x.id, label: x.label, hp: Math.round(x.hp), maxHp: x.maxHp, atk: x.atk, alive: x.alive
        })));
        last = t;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // 1 Hz HP sampler while running
  useEffect(() => {
    if (!running || leaderboard) return;

    let raf = 0;
    let acc = 0;
    let last = performance.now();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = now - last;
      last = now;
      acc += dt;

      while (acc >= 1000) {
        acc -= 1000;
        const t = Math.round(now - startMsRef.current);
        const f = fightersRef.current;
        for (const a of f) {
          const arr = seriesRef.current.get(a.id);
          if (!arr) continue;
          arr.push({ t, hp: Math.round(a.hp) });
        }
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, leaderboard]);

  async function buildGame(players: PlayerConfig[]) {
    const n = players.length;
    if (n < 2) return;

    const r0 = targetRadius(n, width, height);
    const imgs = await Promise.all(
      players.map(p =>
        loadImage(avatarURL(p.input ?? p.id), p.input || p.id)
      )
    );

    const placed: Fighter[] = [];
    const margin = r0 + 8;

    for (let i = 0; i < n; i++) {
      const cfg = players[i];
      const s = deriveStats(cfg.drinks);

      let x = 0, y = 0, tries = 0;
      do {
        x = margin + Math.random() * (width - margin * 2);
        y = margin + Math.random() * (height - margin * 2);
        tries++;
      } while (placed.some(p => ((p.x - x) ** 2 + (p.y - y) ** 2) < (p.r + r0 + 6) ** 2) && tries < 600);

      const ang = Math.random() * Math.PI * 2;
      const startSpeed = clamp(BASE_SPEED * s.spd, 40, SPEED_CAP);
      const specialPool = Math.max(0, Math.floor(cfg.specialDrinks ?? 0));

      placed.push({
        id: cfg.id,
        label: cfg.input || cfg.id,
        img: imgs[i],
        x, y,
        vx: Math.cos(ang) * startSpeed,
        vy: Math.sin(ang) * startSpeed,
        r: r0,
        hp: s.maxHp,
        maxHp: s.maxHp,
        atk: s.atk,
        def: s.def,
        mass: s.mass,
        spd: s.spd,
        crit: s.crit,
        curSpeed: startSpeed,
        alive: true,
        hitTick: 0,

        // Specials
        specialPool,
        lastSpecialMs: 0,
      });
    }

    // reset state
    cooldownRef.current = new Map();
    deathTimeRef.current = new Map();
    fightersRef.current = placed;
    setWinner(null);
    setLeaderboard(null);

    // ---- Init HP logging ----
    seriesRef.current = new Map();
    for (const a of placed) {
      seriesRef.current.set(a.id, [{ t: 0, hp: Math.round(a.hp) }]);
    }
    startMsRef.current = performance.now();
    gameIdRef.current  = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // -------------------------
  }

  const resetHP = () => {
    fightersRef.current = fightersRef.current.map(f => ({ ...f, hp: f.maxHp, alive: true, hitTick: 0 }));
    cooldownRef.current.clear();
    deathTimeRef.current.clear();
    setWinner(null);
    setLeaderboard(null);

    // also reset logging baseline
    seriesRef.current = new Map(seriesRef.current); // keep keys
    const now0 = performance.now();
    startMsRef.current = now0;
    for (const a of fightersRef.current) {
      seriesRef.current.set(a.id, [{ t: 0, hp: Math.round(a.hp) }]);
    }
  };

  const stepPhysics = (dt: number, nowMs: number) => {
    const W = width, H = height;
    const f = fightersRef.current;

    // Dynamic avatar sizing by alive count
    const aliveCount = f.reduce((acc, p) => acc + (p.alive ? 1 : 0), 0) || 1;
    const rTargetAlive = targetRadius(aliveCount, W, H);
    const rTargetDead = Math.max(MIN_R * 0.8, 12);

    for (const a of f) {
      const desired = a.alive ? rTargetAlive : Math.min(a.r, rTargetDead);
      a.r += (desired - a.r) * R_LERP;
      if (a.x - a.r < 0) a.x = a.r;
      if (a.x + a.r > W) a.x = W - a.r;
      if (a.y - a.r < 0) a.y = a.r;
      if (a.y + a.r > H) a.y = H - a.r;
    }

    // Move
    for (const a of f) {
      if (!a.alive) continue;

      a.x += a.vx * dt;
      a.y += a.vy * dt;

      // Wall reflection
      if (a.x - a.r < 0) { a.x = a.r; a.vx = Math.abs(a.vx); if (WALL_SPEEDUP) a.curSpeed = Math.min(a.curSpeed * SPEEDUP_ON_HIT, SPEED_CAP); setSpeed(a, a.curSpeed); }
      if (a.x + a.r > W) { a.x = W - a.r; a.vx = -Math.abs(a.vx); if (WALL_SPEEDUP) a.curSpeed = Math.min(a.curSpeed * SPEEDUP_ON_HIT, SPEED_CAP); setSpeed(a, a.curSpeed); }
      if (a.y - a.r < 0) { a.y = a.r; a.vy = Math.abs(a.vy); if (WALL_SPEEDUP) a.curSpeed = Math.min(a.curSpeed * SPEEDUP_ON_HIT, SPEED_CAP); setSpeed(a, a.curSpeed); }
      if (a.y + a.r > H) { a.y = H - a.r; a.vy = -Math.abs(a.vy); if (WALL_SPEEDUP) a.curSpeed = Math.min(a.curSpeed * SPEEDUP_ON_HIT, SPEED_CAP); setSpeed(a, a.curSpeed); }
    }

    // Circle–circle collisions
    const lastHit = cooldownRef.current;
    for (let i = 0; i < f.length; i++) {
      const p = f[i]; if (!p.alive) continue;
      for (let j = i + 1; j < f.length; j++) {
        const q = f[j]; if (!q.alive) continue;

        const dx = q.x - p.x, dy = q.y - p.y;
        const minD = p.r + q.r;
        const dist2 = dx*dx + dy*dy;
        if (dist2 < minD * minD) {
          const dist = Math.max(1e-6, Math.sqrt(dist2));
          const nx = dx / dist, ny = dy / dist;
          const tx = -ny, ty = nx;

          // Push apart to just touching
          const overlap = minD - dist + 0.25;
          const half = overlap * 0.5;
          p.x -= nx * half; p.y -= ny * half;
          q.x += nx * half; q.y += ny * half;

          // Relative velocity
          const rvx = q.vx - p.vx, rvy = q.vy - p.vy;
          const relN = rvx * nx + rvy * ny; // >0 = closing

          // Elastic bounce only if closing
          if (relN > 0) {
            const p_n = p.vx * nx + p.vy * ny;
            const p_t = p.vx * tx + p.vy * ty;
            const q_n = q.vx * nx + q.vy * ny;
            const q_t = q.vx * tx + q.vy * ty;

            const p_n_after = q_n;
            const q_n_after = p_n;

            p.vx = p_t * tx + p_n_after * nx;
            p.vy = p_t * ty + p_n_after * ny;
            q.vx = q_t * tx + q_n_after * nx;
            q.vy = q_t * ty + q_n_after * ny;

            p.curSpeed = Math.min(p.curSpeed * SPEEDUP_ON_HIT, SPEED_CAP);
            q.curSpeed = Math.min(q.curSpeed * SPEEDUP_ON_HIT, SPEED_CAP);
            setSpeed(p, p.curSpeed);
            setSpeed(q, q.curSpeed);
          }

          // Deal damage on ANY contact (closing or separating), with cooldown
          const key = `${i}-${j}`;
          const lastMs = lastHit.get(key) ?? -1e12;
          if (nowMs - lastMs >= COOLDOWN_MS) {
            const relSpeed = Math.abs(relN); // or Math.hypot(rvx, rvy) for full relative speed
            let dmgToP = computeDamage(q, p, relSpeed);
            let dmgToQ = computeDamage(p, q, relSpeed);

            // ---- SPECIALS: 15% chance per attacker; bonus = 10x remaining drinks; consume pool ----
            if (p.specialPool > 0 && Math.random() < SPECIAL_PROC_CHANCE) {
              const spend = p.specialPool;                      // burst entire remaining pool
              const bonus = SPECIAL_DAMAGE_MULT * spend;
              dmgToQ += bonus;
              p.specialPool = 0;
              p.lastSpecialMs = nowMs;
            }
            if (q.specialPool > 0 && Math.random() < SPECIAL_PROC_CHANCE) {
              const spend = q.specialPool;
              const bonus = SPECIAL_DAMAGE_MULT * spend;
              dmgToP += bonus;
              q.specialPool = 0;
              q.lastSpecialMs = nowMs;
            }
            // ---------------------------------------------------------------------------------------

            p.hp = Math.max(0, p.hp - dmgToP);
            q.hp = Math.max(0, q.hp - dmgToQ);
            p.hitTick++; q.hitTick++;

            if (p.hp === 0 && p.alive) { p.alive = false; deathTimeRef.current.set(p.id, nowMs); }
            if (q.hp === 0 && q.alive) { q.alive = false; deathTimeRef.current.set(q.id, nowMs); }

            lastHit.set(key, nowMs);
          }
        }
      }
    }
  };

  const maybeFinish = (nowMs: number) => {
    const f = fightersRef.current;
    const alive = f.filter(x => x.alive);

    const persistAndEnd = (label: string, lb: LeaderboardRow[]) => {
      setWinner(label);
      setRunning(false);

      // Persist the final time-series snapshot
      const fightersMeta = f.map(x => ({ id: x.id, label: x.label }));
      const seriesObj: Record<string, Array<{ t: number; hp: number }>> = {};
      for (const [id, arr] of seriesRef.current.entries()) {
        seriesObj[id] = arr;
      }
      saveLastGame({
        gameId: gameIdRef.current,
        startedAtMs: startMsRef.current,
        durationMs: Math.max(0, Math.round(nowMs - startMsRef.current)),
        fighters: fightersMeta,
        series: seriesObj,
      });

      setLeaderboard(lb);
    };

    if (alive.length === 1) {
      const deaths = deathTimeRef.current;
      const eliminated = f.filter(x => !x.alive).sort((a, b) => (deaths.get(b.id)! - deaths.get(a.id)!));
      const lb: LeaderboardRow[] = [
        { place: 1, label: alive[0].label, hp: alive[0].hp, atk: alive[0].atk },
        ...eliminated.map((e, idx) => ({ place: idx + 2, label: e.label, hp: e.hp, atk: e.atk }))
      ];
      return persistAndEnd(alive[0].label, lb);
    } else if (alive.length === 0 && f.length > 0) {
      const deaths = deathTimeRef.current;
      const eliminated = f.slice().sort((a, b) => (deaths.get(b.id)! - deaths.get(a.id)!));
      const lb: LeaderboardRow[] = eliminated.map((e, idx) => ({ place: idx + 1, label: e.label, hp: e.hp, atk: e.atk }));
      return persistAndEnd('Draw', lb);
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    const W = width, H = height;
    const f = fightersRef.current;

    if (ctx.canvas.width !== W || ctx.canvas.height !== H) {
      ctx.canvas.width = W;
      ctx.canvas.height = H;
    }

    ctx.clearRect(0, 0, W, H);

    // R/W/B border
    ctx.lineWidth = 6;
    const grd = ctx.createLinearGradient(0, 0, W, 0);
    grd.addColorStop(0, '#ef4444');
    grd.addColorStop(0.5, '#ffffff');
    grd.addColorStop(1, '#2563eb');
    ctx.strokeStyle = grd;
    ctx.strokeRect(3, 3, W - 6, H - 6);

    for (const a of f) {
      const shake = a.hitTick ? (a.hitTick % 2 === 0 ? -2 : 2) : 0;

      ctx.save();
      ctx.beginPath();
      ctx.arc(a.x + shake, a.y, a.r, 0, Math.PI * 2);
      ctx.clip();
      ctx.globalAlpha = a.alive ? 1 : 0.35;
      ctx.drawImage(a.img, a.x - a.r + shake, a.y - a.r, a.r * 2, a.r * 2);
      ctx.restore();

      // SPECIAL flash ring (brief)
      if (a.lastSpecialMs && (performance.now() - a.lastSpecialMs) < SPECIAL_FLASH_MS) {
        ctx.beginPath();
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#f59e0b';
        ctx.arc(a.x + shake, a.y, a.r + 10, 0, Math.PI * 2);
        ctx.stroke();
      }

      const pct = a.hp / a.maxHp;
      ctx.beginPath();
      ctx.lineWidth = 5;
      ctx.strokeStyle = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#f59e0b' : '#ef4444';
      ctx.arc(a.x + shake, a.y, a.r + 6, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
      ctx.stroke();

      ctx.font = 'bold 13px system-ui, -apple-system, Segoe UI, Roboto';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.fillStyle = '#fff';
      ctx.strokeText(`${Math.round(a.hp)}`, a.x + shake, a.y + 5);
      ctx.fillText(`${Math.round(a.hp)}`, a.x + shake, a.y + 5);

      ctx.font = '700 11px system-ui, -apple-system, Segoe UI, Roboto';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillText(`ATK ${a.atk}`, a.x + shake, a.y + a.r + 28);

      ctx.font = 'bold 12px system-ui, -apple-system, Segoe UI, Roboto';
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fillText(a.label, a.x + shake, a.y + a.r + 16);
    }
  };

  return {
    canvasRef,
    running, setRunning,
    winner, leaderboard,
    hud,
    startNewGame: async (players: PlayerConfig[], opts?: { autostart?: boolean }) => {
      await buildGame(players);
      setRunning(!!opts?.autostart);
    },
    resume: () => setRunning(true),
    resetHP
  };
}
