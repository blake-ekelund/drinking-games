export type Suit = '♠' | '♥' | '♦' | '♣';
export type Color = 'red' | 'black';

export type Card = {
  id: string;      // e.g., "A♠"
  rank: number;    // 2..14 (Ace high = 14)
  suit: Suit;
  color: Color;    // ♥♦ red, ♠♣ black
};

export type SlotIndex = 0 | 1 | 2 | 3 | 4; // 0-based for slots 1..5
