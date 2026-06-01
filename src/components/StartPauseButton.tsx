import type { ThemeColors } from '../lib/theme'

interface StartPauseButtonProps {
  isRunning: boolean
  onToggle: () => void
  theme: ThemeColors
}

export function StartPauseButton({ isRunning, onToggle, theme }: StartPauseButtonProps) {
  const isDark = theme.bg === '#0a0a0a'
  const accent = isRunning ? '#f87171' : '#4ade80'
  return (
    <button
      onClick={onToggle}
      className={[
        'px-6 py-2.5 text-sm font-bold rounded-full border uppercase tracking-widest',
        'backdrop-blur-xl',
        'transition-all duration-200',
        'shadow-lg',
        isRunning
          ? 'hover:shadow-red-500/10'
          : 'hover:shadow-green-500/10',
      ].join(' ')}
      style={{
        color: accent,
        borderColor: accent + '44',
        backgroundColor: accent + '0d',
        textShadow: `0 0 12px ${accent}33`,
        boxShadow: `inset 0 0 20px ${accent}08, 0 4px 16px ${accent}0d`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.backgroundColor = accent + '1a'
        e.currentTarget.style.borderColor = accent + '66'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.backgroundColor = accent + '0d'
        e.currentTarget.style.borderColor = accent + '44'
      }}
    >
      {isRunning ? '⏸ Pause' : '▶ Start'}
    </button>
  )
}
