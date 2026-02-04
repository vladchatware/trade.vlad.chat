import http from 'node:http'
import { saveConfig } from './config'
import type { Orchestrator } from './orchestrator'
import { getErrorMessage } from './utils'

export function startDashboardAPI(orchestrator: Orchestrator) {
  const PORT = Number(process.env.AGENT_PORT || 3001)

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.writeHead(200)
      res.end()
      return
    }

    const url = new URL(req.url || '/', `http://localhost:${PORT}`)

    try {
      if (url.pathname === '/api/status') {
        const { account, positions, clock } = await orchestrator.getAccountState()
        const status = orchestrator.getStatus()

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            ok: true,
            data: {
              account,
              positions,
              clock,
              ...status,
            },
          })
        )
      } else if (url.pathname === '/api/config' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, data: orchestrator.config }))
      } else if (url.pathname === '/api/config' && req.method === 'POST') {
        let body = ''
        req.on('data', (chunk) => {
          body += chunk
        })
        req.on('end', () => {
          try {
            const newConfig = JSON.parse(body)
            orchestrator.config = { ...orchestrator.config, ...newConfig }
            saveConfig(orchestrator.config)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true, data: orchestrator.config }))
          } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: getErrorMessage(e) }))
          }
        })
      } else if (url.pathname === '/api/logs') {
        const limit = Number.parseInt(url.searchParams.get('limit') || '100')
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, data: orchestrator.logger.getRecentLogs(limit) }))
      } else if (url.pathname === '/api/costs') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, data: orchestrator.logger.getCosts() }))
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: 'Not found' }))
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: getErrorMessage(err) }))
    }
  })

  server.listen(PORT, () => {})
}
