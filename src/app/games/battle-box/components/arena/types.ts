// Add to PlayerConfig
export type PlayerConfig = {
  id: string;
  input?: string;
  drinks: number;

  // add new fields you’re using
  specialDrinks?: number;
  healthDrinks?: number;
};

export type Fighter = {
  id: string;
  label: string;
  img: HTMLImageElement;
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;   // % reduction (0..1)
  mass: number;  // not used for Pong bounce, kept for damage calc
  spd: number;   // per-fighter speed multiplier
  crit: number;
  curSpeed: number; // <-- constant target speed for Pong behavior
  alive: boolean;
  hitTick: number;
  specialPool: number;       // remaining “special drinks”
  lastSpecialMs?: number;    // for optional FX flash
};

export type LeaderboardRow = { place: number; label: string; hp: number; atk: number };
