import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { ToolCall } from './types'

export class MCPClient {
  url: string
  client: Client | null
  transport: StreamableHTTPClientTransport | null

  constructor(url: string) {
    this.url = url
    this.client = null
    this.transport = null
  }

  async connect() {
    try {
      this.transport = new StreamableHTTPClientTransport(new URL(this.url))
      this.client = new Client(
        {
          name: 'mahoraga-agent',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      )

      await this.client.connect(this.transport)
      return true
    } catch (err) {
      console.error('MCP connection error:', err)
      return false
    }
  }

  async callTool({ name, arguments: args }: ToolCall) {
    if (!this.client) throw new Error('MCP client not connected')
    return await this.client.callTool({ name, arguments: args })
  }
}
