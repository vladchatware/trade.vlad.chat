'use client'

import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { type ReactNode, useState } from 'react'

// Lazy initialization of Convex client to avoid build-time errors
function useConvexClient() {
  const [client] = useState(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!url) {
      console.warn('NEXT_PUBLIC_CONVEX_URL not set')
      return null
    }
    return new ConvexReactClient(url)
  })
  return client
}

export function Providers({ children }: { children: ReactNode }) {
  const convex = useConvexClient()

  if (!convex) {
    // Render children without Convex provider if URL is not set
    return <>{children}</>
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>
}
