import type { KillZone } from '../types'

/* ------------------------------------------------------------------ */
/*  Config                                                            */
/* ------------------------------------------------------------------ */

export interface KillZoneConfig {
  /** Human-readable label, e.g. 'Asian', 'London', 'NY AM' */
  label: string
  /** Session start in UTC minutes from midnight (0–1440) */
  startMinute: number
  /** Session end in UTC minutes from midnight (0–1440) */
  endMinute: number
  /** CSS colour for the chart overlay rectangle */
  color: string
}

/**
 * Default four-session configuration.
 * Times are in UTC.
 */
export const DEFAULT_KILL_ZONES: KillZoneConfig[] = [
  { label: 'Asian',  startMinute: 0,   endMinute: 540,  color: '#ffd166' },  // 00:00 – 09:00 UTC
  { label: 'London', startMinute: 420, endMinute: 960,  color: '#06d6a0' },  // 07:00 – 16:00 UTC
  { label: 'NY AM',  startMinute: 780, endMinute: 960,  color: '#118ab2' },  // 13:00 – 16:00 UTC
  { label: 'NY PM',  startMinute: 960, endMinute: 1200, color: '#ef476f' },  // 16:00 – 20:00 UTC
]

/* ------------------------------------------------------------------ */
/*  Resolver                                                          */
/* ------------------------------------------------------------------ */

/**
 * Convert a UTC-minute config into concrete Unix timestamps (ms)
 * pinned to the given day.
 */
function resolveSession(cfg: KillZoneConfig, day: Date): KillZone {
  const dayMs = Date.UTC(
    day.getUTCFullYear(),
    day.getUTCMonth(),
    day.getUTCDate(),
  )
  let start = dayMs + cfg.startMinute * 60_000
  let end = dayMs + cfg.endMinute * 60_000

  // Session crosses midnight — extend into the next day
  if (end <= start) {
    end += 86_400_000
  }

  return { label: cfg.label, start, end, color: cfg.color }
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Return kill-zone rectangles for the current day.
 *
 * @param configs  Optional array of session definitions. Defaults to
 *                 the four standard zones (Asian, London, NY AM, NY PM).
 * @param now      Optional override (Unix ms) — used for testing.
 */
export function getActiveKillZones(
  configs?: KillZoneConfig[],
  now?: number,
): KillZone[] {
  const zones = configs ?? DEFAULT_KILL_ZONES
  const day = new Date(now ?? Date.now())
  return zones.map(cfg => resolveSession(cfg, day))
}

/**
 * Return only the zones that are currently active (the current time
 * falls between start and end).
 *
 * Useful for status-badge displays; for chart overlays prefer
 * `getActiveKillZones` so upcoming sessions are visible too.
 */
export function getActiveKillZonesNow(
  configs?: KillZoneConfig[],
  now?: number,
): KillZone[] {
  const ts = now ?? Date.now()
  return getActiveKillZones(configs, now).filter(z => z.start <= ts && z.end >= ts)
}
