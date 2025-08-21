import Link from 'next/link';

export const metadata = {
  title: 'Party Games',
  description: 'Pick a game to play.',
};

type Card = { href: string; title: string; desc: string; emoji: string };

const CARDS: Card[] = [
  { href: '/games/horse-racing',    title: 'Horse Race',      desc: 'Flip cards to advance suits. First to the finish wins.', emoji: '🏇' },
  { href: '/games/fuck-the-dealer', title: 'Fuck the Dealer', desc: '5-slot ladder: higher/lower + color, with penalties.',    emoji: '🍺' },
  { href: '/games/battle-box',      title: 'Battle Box',      desc: 'Profile pics collide to deal damage. Last alive wins.',    emoji: '🥊' },
];

export default function GamesIndex() {
  return (
    <main className="min-h-[100svh] bg-slate-900 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-5xl">
        <header className="text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Party Games</h1>
          <p className="mt-2 text-white/60">Choose your chaos.</p>
        </header>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map(c => (
            <Link key={c.href} href={c.href} className="
              group relative rounded-2xl border border-white/10 bg-slate-950/60 p-4
              hover:border-white/20 hover:bg-slate-900 transition-colors
              ">
              {/* red/white/blue top border accent */}
              <div className="absolute -top-px left-0 right-0 h-[3px] rounded-t-2xl"
                   style={{ background: 'linear-gradient(90deg,#ef4444,#ffffff,#2563eb)' }} />
              <div className="flex items-start gap-3">
                <div className="text-3xl">{c.emoji}</div>
                <div>
                  <h2 className="text-lg font-bold group-hover:text-white">{c.title}</h2>
                  <p className="text-sm text-white/70 mt-1">{c.desc}</p>
                </div>
              </div>
              <div className="mt-4">
                <span className="inline-block text-sm font-semibold px-3 py-1 rounded-md
                                bg-white/10 border border-white/15 group-hover:bg-white/15">
                  Play →
                </span>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-white/50">
          Heads up: These are drinking games. Know your limits.
        </p>
      </div>
    </main>
  );
}
