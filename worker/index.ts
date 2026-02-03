#!/usr/bin/env bun
/**
 * Mahoraga v1 - Simple Trading Agent (Bun worker)
 *
 * Entry point that wires env, API server, and orchestrator.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { startDashboardAPI } from './agent/api'
import { loadEnv } from './agent/env'
import { SimpleOrchestrator } from './agent/orchestrator'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

loadEnv(__dirname)

const orchestrator = new SimpleOrchestrator()
startDashboardAPI(orchestrator)
orchestrator.run().catch(console.error)
