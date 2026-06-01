interface LiquidationScreenProps {
  balance: number
  highScore: number
  onRestart: () => void
}

export function LiquidationScreen({ balance, highScore, onRestart }: LiquidationScreenProps) {
  return (
    <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
      <div className="text-red-500 text-6xl font-bold mb-4">💀</div>
      <h1 className="text-red-400 text-2xl font-bold mb-2">LIQUIDATED</h1>
      <p className="text-white/40 text-sm mb-1">Final balance: <span className="text-white font-mono">${balance.toFixed(2)}</span></p>
      <p className="text-white/40 text-sm mb-6">Best: <span className="text-green-400 font-mono">${highScore.toFixed(2)}</span></p>
      <button
        onClick={onRestart}
        className="px-8 py-3 bg-white/10 hover:bg-white/15 rounded-xl text-white font-medium transition-colors active:scale-95"
      >
        Tap to restart
      </button>
    </div>
  )
}
