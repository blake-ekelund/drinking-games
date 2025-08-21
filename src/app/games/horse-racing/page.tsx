'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import type { Card, Suit } from './components/types';
import { buildShuffledDeck, drawOne, rankLabel, suitColor } from './components/deck';
import { TrackRow } from './components/TrackRow';
import { CardView } from './components/CardView';

const SUITS: Suit[] = ['♠','♥','♦','♣'];

export default function HorseRacePage() {
  const [deck, setDeck] = useState<Card[]>([]);
  const [discard, setDiscard] = useState<Card[]>([]);
  const [positions, setPositions] = useState<Record<Suit, number>>({ '♠':0, '♥':0, '♦':0, '♣':0 });
  const [trackLen, setTrackLen] = useState(7);
  const [lastFlip, setLastFlip] = useState<Card | null>(null);
  const [winner, setWinner] = useState<Suit | null>(null);

  // NEW: gate state
  const [lastGateRow, setLastGateRow] = useState(0);   // highest row for which a gate has fired
  const [gateCard, setGateCard] = useState<Card | null>(null); // last gate card used
  const [gateHitSuit, setGateHitSuit] = useState<Suit | null>(null);

  const [auto, setAuto] = useState(false);
  const [speedMs, setSpeedMs] = useState(650);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    newRace();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (auto && !winner) {
      timerRef.current = setInterval(() => flip(), Math.max(150, speedMs));
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [auto, speedMs, winner, deck]);

  function newRace() {
    const d = buildShuffledDeck();
    setDeck(d);
    setDiscard([]);
    setPositions({ '♠':0, '♥':0, '♦':0, '♣':0 });
    setLastFlip(null);
    setWinner(null);
    setAuto(false);
    setLastGateRow(0);
    setGateCard(null);
    setGateHitSuit(null);
  }

  function resetPositions() {
    setPositions({ '♠':0, '♥':0, '♦':0, '♣':0 });
    setWinner(null);
    setAuto(false);
    setLastGateRow(0);
    setGateCard(null);
    setGateHitSuit(null);
  }

  function flip() {
    if (winner) return;

    // draw the racing card
    const d1 = drawOne(deck);
    if (!d1.card) {
      const best = SUITS.reduce((acc, s) => positions[s] > positions[acc] ? s : acc, '♠' as Suit);
      setWinner(best);
      setDeck(d1.deck);
      return;
    }

    const raceCard = d1.card;
    const deckAfterRace = d1.deck;

    // compute next positions (advance the suit of raceCard)
    const nextPos: Record<Suit, number> = { ...positions };
    const s = raceCard.suit;
    nextPos[s] = Math.min(trackLen, nextPos[s] + 1);

    // did someone win on this flip?
    const winNow = nextPos[s] >= trackLen;

    // compute new min row achieved by all suits *after* this move
    const minNext = Math.min(nextPos['♠'], nextPos['♥'], nextPos['♦'], nextPos['♣']);

    // possibly trigger a gate (ONLY when all suits have reached a *new* row, and no winner yet)
    let deckAfterGate = deckAfterRace;
    let gateC: Card | null = null;
    let gateSuit: Suit | null = null;

    if (!winNow && minNext > lastGateRow) {
      const g = drawOne(deckAfterRace);
      if (g.card) {
        gateC = g.card;
        gateSuit = g.card.suit;
        deckAfterGate = g.deck;

        // Move that suit back one (min 0)
        nextPos[gateSuit] = Math.max(0, nextPos[gateSuit] - 1);
      }
      // mark that this row's gate has fired (even if the gate card matched a suit already at 0)
      setLastGateRow(minNext);
    }

    // commit state
    setDeck(deckAfterGate);
    setDiscard(d => gateC ? [gateC, raceCard, ...d] : [raceCard, ...d]);
    setLastFlip(raceCard);
    setGateCard(gateC);
    setGateHitSuit(gateSuit);
    setPositions(nextPos);

    if (winNow) {
      setWinner(s);
      setAuto(false);
    }
  }

  const status = useMemo(() => {
    if (winner) return `${winner} wins!`;
    return `Flip to advance — finish at ${trackLen}.`;
  }, [winner, trackLen]);

  return (
    <main className="min-h-[100svh] bg-slate-900 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-5xl">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight">Horse Race (Suit Derby)</h1>
          <div className="text-sm text-white/70">
            Deck: {deck.length} • Discard: {discard.length}
          </div>
        </header>

        <div className="mt-4 bg-slate-950/60 border border-white/10 rounded-2xl p-4 relative overflow-hidden">
          {/* Winner overlay */}
          {winner && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm grid place-items-center z-10">
              <div className="bg-slate-900/90 border border-white/15 rounded-2xl p-6 text-center">
                <div className={`text-5xl font-black ${suitColor(winner)==='red'?'text-red-400':'text-white'}`}>{winner}</div>
                <div className="mt-2 text-xl font-bold">wins the race!</div>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    onClick={newRace}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 border border-white/20 font-semibold"
                  >
                    New Race
                  </button>
                  <button
                    onClick={resetPositions}
                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20"
                  >
                    Rematch (same deck)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Track */}
          <div className="space-y-3">
            {SUITS.map(s => (
              <TrackRow key={s} suit={s} pos={positions[s]} trackLen={trackLen} />
            ))}
          </div>

          {/* Controls */}
          <div className="mt-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="text-sm sm:text-base">{status}</div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={flip}
                disabled={!!winner || deck.length === 0}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 border border-white/20 font-semibold"
              >
                Flip
              </button>

              <button
                onClick={() => setAuto(a => !a)}
                disabled={!!winner || deck.length === 0}
                className={`px-4 py-2 rounded-lg border border-white/20 ${auto ? 'bg-red-600 hover:bg-red-500' : 'bg-white/10 hover:bg-white/15'} disabled:opacity-50`}
              >
                {auto ? 'Stop Auto' : 'Auto-Run'}
              </button>

              <div className="flex items-center gap-2 pl-2">
                <label className="text-xs text-white/70">Speed</label>
                <input
                  type="range"
                  min={200}
                  max={1200}
                  step={50}
                  value={speedMs}
                  onChange={(e) => setSpeedMs(Number(e.target.value))}
                  className="accent-amber-400"
                />
              </div>

              <div className="flex items-center gap-2 pl-2">
                <label className="text-xs text-white/70">Finish @</label>
                <select
                  value={trackLen}
                  onChange={e => setTrackLen(Number(e.target.value))}
                  className="bg-white/10 border border-white/20 rounded-md px-2 py-1 text-sm"
                >
                  {[5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <button
                onClick={newRace}
                className="ml-auto px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20"
              >
                New Race
              </button>
            </div>
          </div>

          {/* Last flip + Gate info */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3">
              <div className="text-xs text-white/60">Last Flip:</div>
              <CardView card={lastFlip} placeholder="None" />
              {lastFlip && (
                <div className="text-xs text-white/70">
                  {rankLabel(lastFlip.rank)}{lastFlip.suit} • {lastFlip.color.toUpperCase()} → advances {lastFlip.suit}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs text-white/60">Gate:</div>
              <CardView card={gateCard} placeholder={lastGateRow > 0 ? `Row ${lastGateRow}` : '—'} />
              {gateCard && gateHitSuit && (
                <div className="text-xs text-white/70">
                  Row {lastGateRow}: {rankLabel(gateCard.rank)}{gateCard.suit} → {gateHitSuit} back 1
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs text-white/50">
          When all suits reach a new row, a gate flips: one random card is drawn and that suit moves back one.
        </p>
      </div>
    </main>
  );
}
