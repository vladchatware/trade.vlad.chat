import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getLatestFilings, pollSecEdgar } from './secEdgar'

const atomXml = `
  <feed>
    <entry>
      <id>sec-1</id>
      <title>Apple Inc. (8-K)</title>
      <updated>2025-01-01T10:00:00Z</updated>
    </entry>
    <entry>
      <id>sec-2</id>
      <title>Microsoft Corp (10-Q)</title>
      <updated>2025-01-01T11:00:00Z</updated>
    </entry>
  </feed>
`

describe('secEdgar actions', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('polls SEC atom feed', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => atomXml,
    })
    vi.stubGlobal('fetch', mockFetch)

    const events = await pollSecEdgar(mockFetch)
    expect(events.length).toBe(2)
    expect(events[0].source).toBe('sec_edgar')
  })

  it('fetches latest filings for a symbol', async () => {
    const mockFetch = vi.fn((url: string) => {
      if (url.includes('company_tickers.json')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            '0': { cik_str: 320193, ticker: 'AAPL', title: 'Apple Inc.' },
          }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          cik: '0000320193',
          name: 'Apple Inc.',
          tickers: ['AAPL'],
          filings: {
            recent: {
              accessionNumber: ['0001', '0002'],
              filingDate: ['2025-01-02', '2025-01-01'],
              form: ['8-K', 'S-1'],
              primaryDocument: ['doc1', 'doc2'],
            },
          },
        }),
      })
    })
    vi.stubGlobal('fetch', mockFetch)

    const items = await getLatestFilings('AAPL', 5, mockFetch)

    expect(items.length).toBe(1)
    expect(items[0].headline).toContain('Apple Inc.')
    expect(items[0].source).toBe('sec_edgar')
  })
})
