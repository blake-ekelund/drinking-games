'use client';

import type { Card } from './types';
import { rankLabel } from './deck';

export function CardView({ card, placeholder }: { card: Card | null; placeholder?: string }) {
  if (!card) {
    return (
      <div className="w-20 h-28 rounded-lg border-2 border-dashed border-white/25 grid place-items-center select-none">
        <span className="text-xs text-white/50">{placeholder ?? 'Empty'}</span>
      </div>
    );
  }
  const isRed = card.color === 'red';
  return (
    <div className="w-20 h-28 rounded-lg bg-white grid place-items-center relative select-none shadow">
      <div className={`absolute top-1 left-1 text-sm ${isRed ? 'text-red-600' : 'text-black'}`}>
        {rankLabel(card.rank)}{card.suit}
      </div>
      <div className={`text-3xl ${isRed ? 'text-red-600' : 'text-black'}`}>{card.suit}</div>
      <div className={`absolute bottom-1 right-1 text-sm rotate-180 ${isRed ? 'text-red-600' : 'text-black'}`}>
        {rankLabel(card.rank)}{card.suit}
      </div>
    </div>
  );
}
