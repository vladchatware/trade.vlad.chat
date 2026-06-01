import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: any) {
    console.error('[ErrorBoundary]', error.message, info?.componentStack)
    ;(window as any).__lastBoundaryError = error.message
    // Send to remote debug
    try {
      fetch(`http://${window.location.hostname}:3001/debug/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'REACT_ERROR',
          message: error.message,
          stack: error.stack,
          data: { componentStack: info?.componentStack },
        }),
      })
    } catch {}
  }

  render() {
    if (this.state.error) {
      const msg = this.state.error.message
      return this.props.fallback || (
        <div className="w-full h-full flex items-center justify-center bg-black">
          <div className="text-center p-8">
            <div className="text-red-500 text-xs font-mono mb-2">⚠ Chart Error</div>
            <div className="text-white/40 text-xs font-mono max-w-md break-all">{msg}</div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
