'use client';

import { useEffect, useState } from 'react';
import type { Card, SlotIndex } from './components/types';
import { buildShuffledDeck, drawOne, rankLabel } from './components/deck';
import { CardView } from './components/CardView';
import { DrinkOverlay } from './components/DrinkOverlay';

type GuessHL = 'higher' | 'lower';
type GuessColor = 'red' | 'black';

export default function FuckTheDealerPage() {
  const [deck, setDeck] = useState<Card[]>([]);
  const [discard, setDiscard] = useState<Card[]>([]);
  const [slots, setSlots] = useState<(Card | null)[]>([null, null, null, null, null]); // 1..5
  const [pos, setPos] = useState<SlotIndex>(0);
  const [lastFlip, setLastFlip] = useState<Card | null>(null);
  const [message, setMessage] = useState<string>('');
  const [gameOver, setGameOver] = useState(false);

  // penalty animation
  const [drinkAnim, setDrinkAnim] = useState(false);
  const [drinkSeed, setDrinkSeed] = useState(1);

  useEffect(() => { newGame(); }, []);

  function newGame() {
    const fresh = buildShuffledDeck();
    setDeck(fresh);
    setDiscard([]);
    setSlots([null, null, null, null, null]);
    setPos(0);
    setLastFlip(null);
    setGameOver(false);
    setDrinkAnim(false);
    dealNewRow(fresh);
  }

  function dealNewRow(currentDeck?: Card[]) {
    const src = currentDeck ?? deck;
    if (src.length < 4) {
      setMessage('Out of cards. New game?');
      setGameOver(true);
      return;
    }
    const s = [null, null, null, null, null] as (Card | null)[];
    let rest = src.slice();
    const take = (slotIndex: number) => {
      const d = drawOne(rest); rest = d.deck;
      s[slotIndex] = d.card!;
    };
    // 1,2,4,5 get cards; 3 stays empty
    take(0); take(1); take(3); take(4);

    setSlots(s);
    setDeck(rest);
    setPos(0);
    setMessage('Slot 1: Higher or Lower?');
  }

  function canPlay(): boolean {
    if (gameOver) return false;
    return deck.length >= 1;
  }

  function fireDrinkAnim() {
    setDrinkSeed(s => s + 1);
    setDrinkAnim(true);
    setTimeout(() => setDrinkAnim(false), 1050);
  }

  function advanceOrReset(correct: boolean) {
    if (correct) {
      if (pos < 4) {
        const nextPos = (pos + 1) as SlotIndex;
        setPos(nextPos);
        if (nextPos === 2) setMessage('Slot 3: Red or Black?');
        else setMessage(`Slot ${nextPos + 1}: Higher or Lower?`);
      } else {
        // Cleared slot 5 — discard ALL current board cards (1..5), then deal new row
        setDiscard(d => [...(slots.filter(Boolean) as Card[]), ...d]);
        setSlots([null, null, null, null, null]);
        setPos(0);
        setMessage('Row cleared! Dealing new row...');
        setTimeout(() => dealNewRow(), 350);
      }
    } else {
      fireDrinkAnim();
      setPos(0);
      setMessage('Wrong. Back to Slot 1: Higher or Lower?');
    }
  }

  // --- Core rule change: put the drawn card into the current slot (always). ---
  function guessHigherLower(guess: GuessHL) {
    if (!canPlay()) return;
    const base = slots[pos]; // must exist for HL turns
    if (!base) return;

    const draw = drawOne(deck);
    if (!draw.card) { setGameOver(true); setMessage('Out of cards. New game?'); return; }

    const flipped = draw.card;
    setDeck(draw.deck);
    setLastFlip(flipped);

    // Evaluate vs the PREVIOUS card
    const cmp = flipped.rank - base.rank; // >0 higher, <0 lower, 0 tie = wrong
    const correct = (cmp > 0 && guess === 'higher') || (cmp < 0 && guess === 'lower');

    // Replace slot with flipped card; move previous slot card to discard
    setSlots(prev => {
      const next = [...prev];
      const prevCard = next[pos];
      next[pos] = flipped;
      if (prevCard) setDiscard(d => [prevCard, ...d]);
      return next;
    });

    advanceOrReset(correct);
  }

  function guessColor(guess: GuessColor) {
    if (!canPlay()) return;

    const draw = drawOne(deck);
    if (!draw.card) { setGameOver(true); setMessage('Out of cards. New game?'); return; }

    const flipped = draw.card;
    setDeck(draw.deck);
    setLastFlip(flipped);

    const correct = flipped.color === guess;

    // Slot 3 was empty initially; place flipped card into slot 3.
    // If slot 3 already had a card, move that one to discard.
    setSlots(prev => {
      const next = [...prev];
      const prevCard = next[pos]; // pos === 2 here
      next[pos] = flipped;
      if (prevCard) setDiscard(d => [prevCard, ...d]);
      return next;
    });

    advanceOrReset(correct);
  }

  const isColorTurn = pos === 2;
  const prompt = message || (isColorTurn ? 'Red or Black?' : 'Higher or Lower?');

  return (
    <main className="min-h-[100svh] bg-slate-900 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <header className="flex items-end justify-between">
          <h1 className="text-2xl sm:text-3xl font-extrabold">Fuck the Dealer</h1>
          <div className="text-sm text-white/70">Dealer: {deck.length} • Discard: {discard.length}</div>
        </header>

        {/* Board (shake on penalty) */}
        <div className={`mt-4 bg-slate-950/60 border border-white/10 rounded-2xl p-4 relative overflow-hidden ${drinkAnim ? 'drink-shake' : ''}`}>
          <DrinkOverlay show={drinkAnim} seed={drinkSeed} />

          <div className="grid grid-cols-5 gap-3 place-items-center">
            <div className={`rounded-xl p-1 ${pos===0 ? 'ring-2 ring-amber-300' : ''}`}>
              <CardView card={slots[0]} placeholder="Slot 1" />
              <div className="mt-1 text-center text-xs text-white/60">1</div>
            </div>
            <div className={`rounded-xl p-1 ${pos===1 ? 'ring-2 ring-amber-300' : ''}`}>
              <CardView card={slots[1]} placeholder="Slot 2" />
              <div className="mt-1 text-center text-xs text-white/60">2</div>
            </div>
            <div className={`rounded-xl p-1 ${pos===2 ? 'ring-2 ring-amber-300' : ''}`}>
              <CardView card={slots[2]} placeholder="Slot 3 (Color)" />
              <div className="mt-1 text-center text-xs text-white/60">3 (Color)</div>
            </div>
            <div className={`rounded-xl p-1 ${pos===3 ? 'ring-2 ring-amber-300' : ''}`}>
              <CardView card={slots[3]} placeholder="Slot 4" />
              <div className="mt-1 text-center text-xs text-white/60">4</div>
            </div>
            <div className={`rounded-xl p-1 ${pos===4 ? 'ring-2 ring-amber-300' : ''}`}>
              <CardView card={slots[4]} placeholder="Slot 5" />
              <div className="mt-1 text-center text-xs text-white/60">5</div>
            </div>
          </div>

          {/* Prompt + controls */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm sm:text-base">{prompt}</div>
            <div className="flex gap-2">
              {isColorTurn ? (
                <>
                  <button onClick={() => guessColor('red')}   disabled={!canPlay()} className="px-3 py-2 rounded-md bg-red-600 hover:bg-red-500 disabled:opacity-50">Red</button>
                  <button onClick={() => guessColor('black')} disabled={!canPlay()} className="px-3 py-2 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-50">Black</button>
                </>
              ) : (
                <>
                  <button onClick={() => guessHigherLower('higher')} disabled={!canPlay()} className="px-3 py-2 rounded-md bg-green-600 hover:bg-green-500 disabled:opacity-50">Higher</button>
                  <button onClick={() => guessHigherLower('lower')}  disabled={!canPlay()} className="px-3 py-2 rounded-md bg-blue-600  hover:bg-blue-500  disabled:opacity-50">Lower</button>
                </>
              )}
              <button onClick={newGame} className="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15">New Game</button>
            </div>
          </div>

          {/* Last flip (kept for clarity; the slot already shows it) */}
          <div className="mt-4 flex items-center gap-3">
            <div className="text-xs text-white/60">Last Flip:</div>
            <CardView card={lastFlip} placeholder="None" />
            {lastFlip && (
              <div className="text-xs text-white/70">
                {rankLabel(lastFlip.rank)}{lastFlip.suit} • {lastFlip.color.toUpperCase()}
              </div>
            )}
          </div>

          {gameOver && (
            <div className="mt-4 p-3 rounded-lg bg-red-600/20 border border-red-600/40 text-sm">
              Out of cards. Click <b>New Game</b> to reshuffle.
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-white/50">
          Rules: Aces high; ties lose. Each guess draws one card onto the board; the previous slot card moves to discard. Clear slot 5 to deal a new row.
        </p>
      </div>
    </main>
  );
}
