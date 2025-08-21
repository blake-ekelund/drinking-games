'use client';

import { useEffect, useRef, useState } from 'react';
import type { Card, SlotIndex } from './components/types';
import { buildShuffledDeck, drawOne } from './components/deck';
import { CardView } from './components/CardView';
import { DrinkOverlay } from './components/DrinkOverlay';
import { ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';

type GuessHL = 'higher' | 'lower';
type GuessColor = 'red' | 'black';

export default function FuckTheDealerPage() {
  // ----- state (unchanged game model) -----
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

  // --- Rule: flip replaces the current slot; previous card moves to discard (kept) ---
  function guessHigherLower(guess: GuessHL) {
    if (!canPlay()) return;
    const base = slots[pos]; // must exist for HL turns
    if (!base) return;

    const draw = drawOne(deck);
    if (!draw.card) { setGameOver(true); setMessage('Out of cards. New game?'); return; }

    const flipped = draw.card;
    setDeck(draw.deck);
    setLastFlip(flipped);

    const cmp = flipped.rank - base.rank; // >0 higher, <0 lower, 0 tie = wrong
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
      const prevCard = next[pos]; // pos === 2 here
      next[pos] = flipped;
      if (prevCard) setDiscard(d => [prevCard, ...d]);
      return next;
    });

    advanceOrReset(correct);
  }

  const isColorTurn = pos === 2;
  const prompt = message || (isColorTurn ? 'Red or Black?' : 'Higher or Lower?');

  // ----- Mobile: gestures on the dealer area -----
  const dealerRef = useRef<HTMLDivElement>(null);
  useSwipe(dealerRef, {
    onSwipeUp:   () => !isColorTurn && guessHLWithHaptics('higher'),
    onSwipeDown: () => !isColorTurn && guessHLWithHaptics('lower'),
    onSwipeLeft: () =>  isColorTurn && guessColorWithHaptics('red'),
    onSwipeRight:() =>  isColorTurn && guessColorWithHaptics('black'),
    minDistance: 28,
  });

  // Keyboard fallback (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isColorTurn) {
        if (e.key === 'ArrowLeft') guessColorWithHaptics('red');
        if (e.key === 'ArrowRight') guessColorWithHaptics('black');
      } else {
        if (e.key === 'ArrowUp') guessHLWithHaptics('higher');
        if (e.key === 'ArrowDown') guessHLWithHaptics('lower');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isColorTurn]);

  // Haptics
  const vibrate = (ms=24) => { try { navigator?.vibrate?.(ms); } catch {} };
  function guessHLWithHaptics(dir: GuessHL){ vibrate(); guessHigherLower(dir); }
  function guessColorWithHaptics(c: GuessColor){ vibrate(); guessColor(c); }

  // --- UI ---
  return (
    <main className="min-h-[100svh] bg-slate-900 text-white flex flex-col pt-[env(safe-area-inset-top)]">
      {/* Header (compact) */}
      <header className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur border-b border-white/10">
        <div className="mx-auto max-w-md px-4 py-2 flex items-center justify-between">
          <h1 className="text-lg font-extrabold">Fuck the Dealer</h1>
          <div className="text-xs text-white/70">Deck: {deck.length} • Discard: {discard.length}</div>
        </div>
      </header>

      {/* Content */}
      <section className="mx-auto w-full max-w-md px-4 py-3 pb-36 flex-1">
        {/* Last Flip */}
        <div>
          <div className="text-[11px] uppercase tracking-wide text-white/50">Last Flip</div>
          <div className="mt-1 h-28 rounded-xl border border-white/10 bg-white/5 grid place-items-center">
            <CardView card={lastFlip} placeholder="—" />
          </div>
        </div>

        {/* Dealer (gesture target) */}
        <div className="mt-3">
          <div className="text-[11px] uppercase tracking-wide text-white/50">Dealer</div>
          <div
            ref={dealerRef}
            aria-label="Dealer interaction area"
            className={`mt-1 h-56 rounded-2xl border border-white/15 bg-white/5 relative overflow-hidden select-none touch-pan-y ${drinkAnim ? 'drink-shake' : ''}`}
          >
            <DrinkOverlay show={drinkAnim} seed={drinkSeed} />
            {/* Place face-down / flipped card art here if desired */}
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-white/50 text-xs">
                {isColorTurn ? 'Swipe ◀ red / ▶ black' : 'Swipe ▲ higher / ▼ lower'}
              </div>
            </div>
          </div>
        </div>

        {/* Slots — horizontal, thumb-scrollable on mobile */}
        <div className="mt-4">
          <div className="text-[11px] uppercase tracking-wide text-white/50">Board</div>
          <div className="mt-2 overflow-x-auto">
            <div className="flex gap-3 w-max">
              {[0,1,2,3,4].map(i => (
                <div key={i} className={`rounded-xl p-1 ${pos===i ? 'ring-2 ring-amber-300' : ''}`}>
                  <CardView card={slots[i]} placeholder={i===2 ? 'Slot 3 (Color)' : `Slot ${i+1}`} />
                  <div className="mt-1 text-center text-[11px] text-white/60">{i===2 ? '3 (Color)' : i+1}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Prompt */}
        <div className="mt-3 text-sm">{prompt}</div>

        {gameOver && (
          <div className="mt-3 p-3 rounded-lg bg-red-600/20 border border-red-600/40 text-sm">
            Out of cards. Tap <b>New Game</b> to reshuffle.
          </div>
        )}

        <p className="mt-3 text-[11px] text-white/50">
          Aces high; ties lose. Each guess draws into the current slot; the prior slot card goes to discard.
          Clear slot 5 to deal a new row.
        </p>
      </section>

      {/* Sticky mobile action bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-slate-950/90 backdrop-blur border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-md px-4 py-3">
          <div className="grid grid-cols-3 gap-2">
            {/* Left: Higher/Red */}
            <button
              onClick={() => isColorTurn ? guessColorWithHaptics('red') : guessHLWithHaptics('higher')}
              disabled={!canPlay()}
              className="h-12 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-black disabled:opacity-50"
            >
              {isColorTurn ? 'Red' : (<span className="inline-flex items-center gap-1"><ChevronUp className="w-4 h-4" /> Higher</span>)}
            </button>

            {/* New game */}
            <button
              onClick={newGame}
              className="h-12 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/15 border border-white/20"
              aria-label="New game"
              title="New game"
            >
              <span className="inline-flex items-center gap-1">
                <RefreshCw className="w-4 h-4" /> New
              </span>
            </button>

            {/* Right: Lower/Black */}
            <button
              onClick={() => isColorTurn ? guessColorWithHaptics('black') : guessHLWithHaptics('lower')}
              disabled={!canPlay()}
              className="h-12 rounded-xl text-sm font-semibold bg-blue-500 hover:bg-blue-400 text-black disabled:opacity-50"
            >
              {isColorTurn ? 'Black' : (<span className="inline-flex items-center gap-1"><ChevronDown className="w-4 h-4" /> Lower</span>)}
            </button>
          </div>
        </div>
      </nav>
    </main>
  );
}

/* -----------------------------
   Minimal swipe detector (no deps)
   ----------------------------- */
type SwipeCfg = {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  minDistance?: number; // px
};
function useSwipe(ref: React.RefObject<HTMLElement>, cfg: SwipeCfg) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const min = cfg.minDistance ?? 24;
    let sx = 0, sy = 0, dx = 0, dy = 0, active = false;

    const start = (e: TouchEvent) => {
      const t = e.touches[0]; sx = t.clientX; sy = t.clientY; dx = 0; dy = 0; active = true;
    };
    const move = (e: TouchEvent) => {
      if (!active) return;
      const t = e.touches[0]; dx = t.clientX - sx; dy = t.clientY - sy;
    };
    const end = () => {
      if (!active) return; active = false;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > min) cfg.onSwipeRight?.();
        else if (dx < -min) cfg.onSwipeLeft?.();
      } else {
        if (dy > min) cfg.onSwipeDown?.();
        else if (dy < -min) cfg.onSwipeUp?.();
      }
    };

    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: true });
    el.addEventListener('touchend', end, { passive: true });

    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
    };
  }, [ref, cfg.onSwipeUp, cfg.onSwipeDown, cfg.onSwipeLeft, cfg.onSwipeRight, cfg.minDistance]);
}
