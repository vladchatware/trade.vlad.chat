interface StartPauseButtonProps {
  isRunning: boolean
  onToggle: () => void
}

export function StartPauseButton({ isRunning, onToggle }: StartPauseButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={[
        'px-4 py-2 text-sm font-semibold rounded-full transition-colors border uppercase tracking-widest',
        isRunning
          ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
          : 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20',
      ].join(' ')}
    >
      {isRunning ? '⏸ Pause' : '▶ Start'}
    </button>
  )
}
