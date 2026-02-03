'use client'

import { useEffect, useState } from 'react'

export function useClock() {
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    // Set initial time on client only (avoid hydration mismatch)
    setTime(new Date())

    const interval = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return time
}
