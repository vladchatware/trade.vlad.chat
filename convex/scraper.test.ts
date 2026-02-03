import { beforeEach, describe, expect, it, vi } from 'vitest'
import { scrapeUrl } from './scraper'

describe('scraper action', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('scrapes allowed domain and extracts text', async () => {
    const html = `
      <html>
        <head><title>Example Title</title></head>
        <body>
          <h1>Headline</h1>
          <p>Some content with $123 and 5% change.</p>
        </body>
      </html>
    `

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/html' },
      text: async () => html,
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await scrapeUrl('https://finance.yahoo.com/test')

    expect(result.title).toBe('Example Title')
    expect(result.text).toContain('Headline')
    expect(result.domain).toBe('finance.yahoo.com')
    expect(result.truncated).toBe(false)
  })

  it('rejects disallowed domains', async () => {
    await expect(scrapeUrl('https://example.com/nope')).rejects.toThrow('Domain not allowed')
  })
})
