import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// ── Remote debug: pipe JS errors to relay ──────────────────────────────
const DEBUG_URL = `http://${location.hostname}:3001/debug/log`

function sendError(level: string, message: string, stack?: string, data?: any) {
  try {
    fetch(DEBUG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, message, stack, data }),
    }).catch(() => {}) // best-effort
  } catch {}
}

window.onerror = (msg, source, line, col, error) => {
  sendError(
    'ERROR',
    String(msg),
    error?.stack,
    { source, line, col }
  )
}

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  sendError(
    'PROMISE',
    reason?.message || String(reason),
    reason?.stack,
    null
  )
})

// Also patch console.error so React warnings get sent
const origConsoleError = console.error
console.error = (...args: any[]) => {
  origConsoleError.apply(console, args)
  sendError(
    'CONSOLE',
    args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '),
    undefined,
    null
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
