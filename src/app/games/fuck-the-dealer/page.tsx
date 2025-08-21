'use client';

import { useEffect, useState } from 'react';
import type { Card, SlotIndex } from './components/types';
import { buildShuffledDeck, drawOne } from './components/deck';
import { CardView } from './components/CardView';
import { DrinkOverlay } from './components/DrinkOverlay';
import { ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';

type GuessHL = 'higher' | 'lower';
type GuessColor = 'red' | 'black';

export default function FuckTheDealerPage() {
  // ----- state -----
  const [deck, setDeck] = useState<Card[]>([]);
  const [discard, setDiscard] = useState<Card[]>([]);
  const [slots, setSlots] = useState<(Card | null)[]>([null, null, null, null, null]);
  const [pos, setPos] = useState<SlotIndex>(0);
  const [lastFlip, setLastFlip] = useState<Card | null>(null);
  const [message, setMessage] = useState<string>('');
  const [gameOver, setGameOver] = useState(false);

  // penalty animation
  const [drinkAnim, setDrinkAnim] = useState(false);
  const [drinkSeed, setDrinkSeed] = useState(1);

  // ----- lifecycle -----
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
    // slots 1,2,4,5 get cards
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
        setDiscard(d => [ ...(slots.filter(Boolean) as Card[]), ...d ]);
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

  function guessHigherLower(guess: GuessHL) {
    if (!canPlay()) return;
    const base = slots[pos];
    if (!base) return;

    const draw = drawOne(deck);
    if (!draw.card) { setGameOver(true); setMessage('Out of cards. New game?'); return; }

    const flipped = draw.card;
    setDeck(draw.deck);
    setLastFlip(flipped);

    const cmp = flipped.rank - base.rank;
    const correct = (cmp > 0 && guess === 'higher') || (cmp < 0 && guess === 'lower');

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

    setSlots(prev => {
      const next = [...prev];
      const prevCard = next[pos];
      next[pos] = flipped;
      if (prevCard) setDiscard(d => [prevCard, ...d]);
      return next;
    });

    advanceOrReset(correct);
  }

  const isColorTurn = pos === 2;
  const prompt = message || (isColorTurn ? 'Red or Black?' : 'Higher or Lower?');

  // --- UI ---
  return (
    <main className="min-h-[100svh] bg-slate-900 text-white flex flex-col pt-[env(safe-area-inset-top)]">
      <header className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur border-b border-white/10">
        <div className="mx-auto max-w-md md:max-w-lg lg:max-w-2xl px-4 py-2 flex items-center justify-between">
          <h1 className="text-lg md:text-xl font-extrabold">Fuck the Dealer</h1>
          <div className="text-xs md:text-sm text-white/70">Deck: {deck.length} • Discard: {discard.length}</div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-2xl px-4 py-3 pb-36 flex-1">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-white/50">Last Flip</div>
          <div className="mt-1 h-28 md:h-32 lg:h-36 rounded-xl border border-white/10 bg-white/5 grid place-items-center">
            <CardView card={lastFlip} placeholder="—" />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-[11px] uppercase tracking-wide text-white/50">Dealer</div>
          <div className={`mt-1 h-56 md:h-64 lg:h-72 rounded-2xl border border-white/15 bg-white/5 relative overflow-hidden select-none ${drinkAnim ? 'drink-shake' : ''}`}>
            <DrinkOverlay show={drinkAnim} seed={drinkSeed} />
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-white/50 text-xs md:text-sm">{prompt}</div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-[11px] uppercase tracking-wide text-white/50">Board</div>
          <div className="mt-2 overflow-x-auto">
            <div className="flex gap-3 w-max">
              {[0,1,2,3,4].map(i => (
                <div key={i} className={`rounded-xl p-1 ${pos===i ? 'ring-2 ring-amber-300' : ''}`}>
                  <CardView card={slots[i]} placeholder={i===2 ? 'Slot 3 (Color)' : `Slot ${i+1}`} />
                  <div className="mt-1 text-center text-[11px] md:text-xs text-white/60">{i===2 ? '3 (Color)' : i+1}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 text-sm md:text-base">{prompt}</div>

        {gameOver && (
          <div className="mt-3 p-3 rounded-lg bg-red-600/20 border border-red-600/40 text-sm">
            Out of cards. Tap <b>New Game</b> to reshuffle.
          </div>
        )}
      </section>

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-slate-950/90 backdrop-blur border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-md md:max-w-lg lg:max-w-2xl px-4 py-3">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => isColorTurn ? guessColor('red') : guessHigherLower('higher')}
              disabled={!canPlay()}
              className="h-12 md:h-14 rounded-xl text-sm md:text-base font-semibold bg-emerald-500 hover:bg-emerald-400 text-black disabled:opacity-50"
            >
              {isColorTurn ? 'Red' : (<span className="inline-flex items-center gap-1"><ChevronUp className="w-4 h-4 md:w-5 md:h-5" /> Higher</span>)}
            </button>

            <button
              onClick={newGame}
              className="h-12 md:h-14 rounded-xl text-sm md:text-base font-semibold bg-white/10 hover:bg-white/15 border border-white/20"
            >
              <span className="inline-flex items-center gap-1"><RefreshCw className="w-4 h-4 md:w-5 md:h-5" /> New</span>
            </button>

            <button
              onClick={() => isColorTurn ? guessColor('black') : guessHigherLower('lower')}
              disabled={!canPlay()}
              className="h-12 md:h-14 rounded-xl text-sm md:text-base font-semibold bg-blue-500 hover:bg-blue-400 text-black disabled:opacity-50"
            >
              {isColorTurn ? 'Black' : (<span className="inline-flex items-center gap-1"><ChevronDown className="w-4 h-4 md:w-5 md:h-5" /> Lower</span>)}
            </button>
          </div>
        </div>
      </nav>
    </main>
  );
}
