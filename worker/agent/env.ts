import fs from 'node:fs'
import path from 'node:path'
import { config as loadDotEnv } from 'dotenv'

export function loadEnv(baseDir: string) {
  loadDotEnv({ path: path.join(baseDir, '..', '.env.local') })

  const envPath = path.join(baseDir, '..', '.dev.vars')
  if (!fs.existsSync(envPath)) return

  const content = fs.readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      const value = valueParts.join('=').trim()
      if (key && value && !process.env[key]) {
        process.env[key] = value
      }
    }
  }
}
