export default function GamesLandingPage() {
  const games = [
    {
      slug: "/games/horse-racing",
      title: "Horse Racing",
      description: "Bet on your suit and watch the race unfold. Add chaos cards for setbacks.",
      kpis: ["2–8 players", "5–15 min", "High chaos"],
      emoji: "🏇",
    },
    {
      slug: "/games/fuck-the-dealer",
      title: "Fuck the Dealer",
      description: "Guess higher/lower, dealer drinks on misses. Features animated ‘DRINK!’ overlays.",
      kpis: ["3–10 players", "Cards only", "Fast rounds"],
      emoji: "🃏",
    },
    {
      slug: "/games/battle-box",
      title: "Battle Box",
      description: "Pong-style avatar brawler. Specials, health boosts, and live win probs.",
      kpis: ["2–4 teams", "Arcade", "Canvas graphics"],
      emoji: "🥊",
    },
    // Add more here as you build new games
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-black text-white">
      {/* Navbar */}
      <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60 border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-emerald-400 to-blue-500" />
            <span className="font-extrabold tracking-tight">Drinking Games</span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-white/80">
            <a href="#games" className="hover:text-white">Games</a>
            <a href="#how" className="hover:text-white">How it works</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
          </nav>
          <a href="#get-started" className="rounded-lg px-3 py-1.5 text-sm font-semibold bg-white/10 hover:bg-white/15 border border-white/20">Get started</a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(99,102,241,0.25)_0%,rgba(0,0,0,0)_70%)]" />
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <h1 className="text-4xl sm:text-6xl font-black leading-tight">
            Party-ready mini games.
            <span className="block bg-gradient-to-r from-emerald-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent">
              Built for laughs.
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-white/70">
            Quick to learn, fun to play, and easy to project on a TV. Pick a game, add players, and roll.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#games" className="rounded-xl px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold shadow">Play now</a>
            <a href="https://github.com/blake-ekelund/drinking-games" target="_blank" className="rounded-xl px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/20 font-semibold">View repo</a>
          </div>
        </div>
      </section>

      {/* Games grid */}
      <section id="games" className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-xl font-extrabold tracking-tight">Available Games</h2>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((g) => (
            <a
              key={g.slug}
              href={g.slug}
              className="group relative rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition overflow-hidden"
            >
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-white/10 to-white/0 blur-2xl" />
              <div className="p-5">
                <div className="text-3xl">{g.emoji}</div>
                <h3 className="mt-2 text-lg font-bold group-hover:underline underline-offset-4">{g.title}</h3>
                <p className="mt-1 text-sm text-white/70">{g.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {g.kpis.map((k) => (
                    <span key={k} className="rounded-full bg-black/30 px-2 py-1 text-[11px] border border-white/10">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-xl font-extrabold tracking-tight">How it works</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3 text-sm text-white/80">
          <li className="rounded-xl border border-white/10 bg-white/5 p-4">
            <span className="font-bold">1) Pick a game</span>
            <p className="mt-1">Choose from the growing list of party-ready games.</p>
          </li>
          <li className="rounded-xl border border-white/10 bg-white/5 p-4">
            <span className="font-bold">2) Add players</span>
            <p className="mt-1">Type in names/handles, tweak options, and start.</p>
          </li>
          <li className="rounded-xl border border-white/10 bg-white/5 p-4">
            <span className="font-bold">3) Play & project</span>
            <p className="mt-1">Use a TV/projector for maximum chaos (and visibility).</p>
          </li>
        </ol>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-xl font-extrabold tracking-tight">FAQ</h2>
        <div className="mt-4 grid gap-3 text-sm text-white/80">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="font-semibold">Do I need anything to play?</div>
            <p className="mt-1">A browser. Some games use a standard deck of cards. Always drink responsibly.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="font-semibold">Is this free?</div>
            <p className="mt-1">Yes. Contribute or fork the repo to add new games.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-white/60 flex items-center justify-between">
          <span>© {new Date().getFullYear()} Drinking Games</span>
          <a href="https://github.com/blake-ekelund/drinking-games" className="hover:text-white">GitHub</a>
        </div>
      </footer>
    </main>
  );
}
