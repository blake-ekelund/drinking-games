'use client';

export function ControlBar({
  running,
  canInteract,
  onToggleRun,
  onResetHP,
  onNewGame
}:{
  running: boolean;
  canInteract: boolean;
  onToggleRun: () => void;
  onResetHP: () => void;
  onNewGame: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        onClick={onNewGame}
        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 border border-white/20 font-semibold"
      >
        Create New Game
      </button>
      <button
        onClick={onToggleRun}
        disabled={!canInteract}
        className={`px-4 py-2 rounded-lg border border-white/20 ${running ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'} ${!canInteract ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {running ? 'Pause' : 'Resume'}
      </button>
      <button
        onClick={onResetHP}
        className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/15"
      >
        Reset HP
      </button>
    </div>
  );
}
