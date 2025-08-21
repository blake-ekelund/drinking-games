export const BASE_HP = 500;
export const BASE_ATK = 1;

const clamp = (n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));

/**
 * Drinks: HP −2 / drink, ATK +1 / drink.
 * Fairness: DEF decreases slightly with drinks; mass/spd derived from HP.
 */
export function deriveStats(drinks: number) {
  const d = Math.max(0, Math.floor(drinks || 0));

  const maxHp = Math.max(1, BASE_HP - 2 * d);
  const atk   = Math.max(1, BASE_ATK + d);

  // Small defensive penalty per drink (bounded).
  const def   = clamp(0.18 - 0.01 * d, 0.06, 0.25); // 6–25% reduction

  // Heavier with more HP; slightly slower too.
  const mass  = 1 + maxHp / 40;                     // ~1.0–1.6
  const spd   = clamp(1.0 - maxHp / 120, 0.75, 1.05);

  // Light crits to add variance.
  const crit  = 0.07;

  return { maxHp, atk, def, mass, spd, crit };
}
