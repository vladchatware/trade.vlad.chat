import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { saveConfig } from './config'
import type { SimpleOrchestrator } from './orchestrator'
import { getErrorMessage } from './utils'

export function startDashboardAPI(orchestrator: SimpleOrchestrator) {
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
      } else if (url.pathname === '/api/setup/status') {
        const hasAlpaca = !!(process.env.ALPACA_API_KEY && process.env.ALPACA_API_SECRET)
        const hasOpenAI = !!process.env.OPENAI_API_KEY
        const hasGateway = !!(process.env.AI_GATEWAY_API_KEY && process.env.AI_GATEWAY_URL)
        const startingEquity = orchestrator.config.starting_equity || 100000

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            ok: true,
            data: {
              configured: hasAlpaca,
              has_alpaca: hasAlpaca,
              has_openai: hasOpenAI,
              has_ai_gateway: hasGateway,
              starting_equity: startingEquity,
              paper_mode: process.env.ALPACA_PAPER === 'true',
            },
          })
        )
      } else if (url.pathname === '/api/setup/keys' && req.method === 'POST') {
        let body = ''
        req.on('data', (chunk) => {
          body += chunk
        })
        req.on('end', () => {
          try {
            const {
              alpaca_key,
              alpaca_secret,
              openai_key,
              ai_gateway_key,
              ai_gateway_url,
              paper_mode,
              starting_equity,
            } = JSON.parse(body)

            let envContent = ''
            if (alpaca_key) envContent += `ALPACA_API_KEY=${alpaca_key}\n`
            if (alpaca_secret) envContent += `ALPACA_API_SECRET=${alpaca_secret}\n`
            envContent += `ALPACA_PAPER=${paper_mode !== false ? 'true' : 'false'}\n`
            if (openai_key) envContent += `OPENAI_API_KEY=${openai_key}\n`
            if (ai_gateway_key) envContent += `AI_GATEWAY_API_KEY=${ai_gateway_key}\n`
            if (ai_gateway_url) envContent += `AI_GATEWAY_URL=${ai_gateway_url}\n`
            envContent += `KILL_SWITCH_SECRET=mahoraga_kill_${Date.now()}\n`

            const envPath = path.join(process.cwd(), '.dev.vars')
            fs.writeFileSync(envPath, envContent)

            if (starting_equity) {
              orchestrator.config.starting_equity = starting_equity
              saveConfig(orchestrator.config)
            }

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(
              JSON.stringify({
                ok: true,
                message: 'Configuration saved. Please restart the agent.',
              })
            )
          } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: getErrorMessage(e) }))
          }
        })
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
