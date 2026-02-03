import { v } from 'convex/values'
import { action } from './_generated/server'

const SEC_BASE_URL = 'https://www.sec.gov'
const RELEVANT_FORMS = ['8-K', '4', '13F-HR', '10-K', '10-Q', 'SC 13D', 'SC 13G']

interface SECCompanyFiling {
  cik: string
  entityType: string
  sic: string
  sicDescription: string
  name: string
  tickers: string[]
  filings: {
    recent: {
      accessionNumber: string[]
      filingDate: string[]
      form: string[]
      primaryDocument: string[]
    }
  }
}

function generateId(): string {
  return `sec_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export async function pollSecEdgar(fetchImpl: typeof fetch = fetch) {
  const events: Array<{
    source: 'sec_edgar'
    source_id: string
    content: string
    timestamp: string
    metadata: { form: string; company: string }
  }> = []

  try {
    const response = await fetchImpl(
      `${SEC_BASE_URL}/cgi-bin/browse-edgar?action=getcurrent&type=8-K&company=&dateb=&owner=include&count=40&output=atom`,
      {
        headers: {
          'User-Agent': 'Mahoraga Trading Bot (contact@example.com)',
          Accept: 'application/atom+xml',
        },
      }
    )

    if (!response.ok) {
      return events
    }

    const text = await response.text()
    const entries = parseAtomFeed(text)

    for (const entry of entries.slice(0, 20)) {
      events.push({
        source: 'sec_edgar',
        source_id: entry.id,
        content: JSON.stringify(entry),
        timestamp: entry.updated,
        metadata: {
          form: entry.form,
          company: entry.company,
        },
      })
    }
  } catch {
    return events
  }

  return events
}

export async function getLatestFilings(
  symbol: string,
  limit: number,
  fetchImpl: typeof fetch = fetch
) {
  const items: Array<{
    id: string
    source: 'sec_edgar'
    headline: string
    summary: string
    url: string
    symbols: string[]
    created_at: string
  }> = []

  const cik = await getCik(symbol, fetchImpl)
  if (!cik) {
    return items
  }

  try {
    const response = await fetchImpl(
      `https://data.sec.gov/submissions/CIK${cik.padStart(10, '0')}.json`,
      {
        headers: {
          'User-Agent': 'Mahoraga Trading Bot (contact@example.com)',
          Accept: 'application/json',
        },
      }
    )

    if (!response.ok) {
      return items
    }

    const data = (await response.json()) as SECCompanyFiling
    const recent = data.filings.recent
    const max = Math.min(limit, recent.form.length)

    for (let i = 0; i < max; i++) {
      const form = recent.form[i]
      if (!form || !RELEVANT_FORMS.includes(form)) continue

      items.push({
        id: generateId(),
        source: 'sec_edgar',
        headline: `${data.name} filed ${form}`,
        summary: `SEC filing: ${form} for ${data.name}`,
        url: `${SEC_BASE_URL}/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=${form}`,
        symbols: data.tickers,
        created_at: recent.filingDate[i] ?? new Date().toISOString(),
      })
    }
  } catch {
    return items
  }

  return items
}

export const poll = action({
  args: {},
  handler: async () => {
    return pollSecEdgar()
  },
})

export const getLatest = action({
  args: {
    symbol: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    if (!args.symbol) {
      return []
    }

    return getLatestFilings(args.symbol, args.limit ?? 20)
  },
})

function parseAtomFeed(xml: string): Array<{
  id: string
  title: string
  updated: string
  form: string
  company: string
}> {
  const entries: Array<{
    id: string
    title: string
    updated: string
    form: string
    company: string
  }> = []

  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
  let match = entryRegex.exec(xml)

  while (match !== null) {
    const entryXml = match[1]
    if (!entryXml) continue

    const id = extractTag(entryXml, 'id') || generateId()
    const title = extractTag(entryXml, 'title') || ''
    const updated = extractTag(entryXml, 'updated') || new Date().toISOString()

    const formMatch = title.match(/\\((\\d+-\\w+|\\w+)\\)/)
    const form = formMatch ? (formMatch[1] ?? '') : ''

    const companyMatch = title.match(/^([^()]+)/)
    const company = companyMatch ? (companyMatch[1]?.trim() ?? '') : ''

    entries.push({ id, title, updated, form, company })

    match = entryRegex.exec(xml)
  }

  return entries
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`)
  const match = xml.match(regex)
  return match ? (match[1] ?? null) : null
}

async function getCik(symbol: string, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  try {
    const response = await fetchImpl('https://www.sec.gov/files/company_tickers.json', {
      headers: {
        'User-Agent': 'Mahoraga Trading Bot (contact@example.com)',
      },
    })

    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as Record<
      string,
      { cik_str: number; ticker: string; title: string }
    >

    for (const entry of Object.values(data)) {
      if (entry.ticker.toUpperCase() === symbol.toUpperCase()) {
        return String(entry.cik_str)
      }
    }

    return null
  } catch {
    return null
  }
}
