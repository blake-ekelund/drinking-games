import type { Card, Suit, Color } from './types';

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: number[] = [2,3,4,5,6,7,8,9,10,11,12,13,14]; // 11=J,12=Q,13=K,14=A

export function rankLabel(rank: number): string {
  if (rank <= 10) return String(rank);
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return 'A';
}

export function suitColor(s: Suit): Color {
  return s === '♥' || s === '♦' ? 'red' : 'black';
}

export function buildShuffledDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      const c: Card = {
        id: `${rankLabel(r)}${s}`,
        rank: r,
        suit: s,
        color: suitColor(s),
      };
      deck.push(c);
    }
  }
  // Fisher–Yates
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function drawOne(deck: Card[]): { card: Card | null; deck: Card[] } {
  if (deck.length === 0) return { card: null, deck };
  const [head, ...rest] = deck;
  return { card: head, deck: rest };
}
