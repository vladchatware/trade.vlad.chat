import type { KillZone } from '../types'

/* ------------------------------------------------------------------ */
/*  Config — matches killzones+pivots.pine session times in ET        */
/* ------------------------------------------------------------------ */

export interface KillZoneConfig {
  label: string
  /** Session start in ET minutes from midnight (0–1440) */
  startMinuteET: number
  /** Session end in ET minutes from midnight (0–1440) */
  endMinuteET: number
  color: string
}

/*
 * Pine script sessions (America/New_York timezone):
 *   Asia   2000-0000   20:00 – 00:00 ET
 *   London 0200-0500   02:00 – 05:00 ET
 *   NY AM  0930-1100   09:30 – 11:00 ET
 *   NY Ln  1200-1300   12:00 – 13:00 ET
 *   NY PM  1330-1600   13:30 – 16:00 ET
 */
const SESSIONS: KillZoneConfig[] = [
  { label: 'Asia',    startMinuteET: 20*60,      endMinuteET: 0,       color: '#118ab2' },
  { label: 'London',  startMinuteET: 2*60,       endMinuteET: 5*60,    color: '#ef476f' },
  { label: 'NY AM',   startMinuteET: 9*60+30,    endMinuteET: 11*60,   color: '#089981' },
  { label: 'NY Ln',   startMinuteET: 12*60,      endMinuteET: 13*60,   color: '#ffd166' },
  { label: 'NY PM',   startMinuteET: 13*60+30,   endMinuteET: 16*60,   color: '#9b59b6' },
]

/* ------------------------------------------------------------------ */
/*  ET → UTC conversion                                               */
/* ------------------------------------------------------------------ */

/**
 * Return the UTC offset for America/New_York in MINUTES for the given UTC date.
 * ET is UTC-5 (EST) or UTC-4 (EDT).
 * DST: 2nd Sunday March → 1st Sunday November.
 */
function etOffsetMinutes(utcYear: number): number {
  // 2nd Sunday of March
  const mar1 = new Date(Date.UTC(utcYear, 2, 1))
  const mar1Dow = mar1.getUTCDay()               // 0=Sun
  const secondSunMar = 1 + ((14 - mar1Dow) % 7) + 7  // 2nd Sunday

  // 1st Sunday of November
  const nov1 = new Date(Date.UTC(utcYear, 10, 1))
  const nov1Dow = nov1.getUTCDay()
  const firstSunNov = 1 + ((7 - nov1Dow) % 7)

  // DST transition moments in UTC
  // DST starts 2AM EST = 7AM UTC on 2nd Sunday March
  const dstStart = Date.UTC(utcYear, 2, secondSunMar, 7)
  // DST ends 2AM EDT = 6AM UTC on 1st Sunday November
  const dstEnd = Date.UTC(utcYear, 10, firstSunNov, 6)

  const now = Date.now()
  return (now >= dstStart && now < dstEnd) ? -240 : -300
}

/** Convert ET minute-of-day → UTC minute-of-day for the given offset. */
function etToUtcMin(etMin: number, offset: number): number {
  return (etMin - offset + 1440) % 1440
}

/* ------------------------------------------------------------------ */
/*  Zone builder                                                       */
/* ------------------------------------------------------------------ */

/**
 * Build KillZone[] covering today + yesterday so the 10h candle
 * window always sees the sessions that overlap it.
 */
export function getActiveKillZones(): KillZone[] {
  const now = Date.now()
  const today = new Date(now)
  const offset = etOffsetMinutes(today.getUTCFullYear())

  const results: KillZone[] = []

  for (let daysBack = 0; daysBack < 4; daysBack++) {
    const d = new Date(Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() - daysBack,
    ))
    const dayMs = d.getTime()

    for (const s of SESSIONS) {
      const startUTC = etToUtcMin(s.startMinuteET, offset)
      let endUTC = etToUtcMin(s.endMinuteET, offset)

      let start = dayMs + startUTC * 60_000
      let end = dayMs + endUTC * 60_000

      // Asia crosses midnight ET → extends into next UTC day
      if (end <= start) end += 86_400_000

      results.push({ label: s.label, start, end, color: s.color })
    }
  }

  return results
}
