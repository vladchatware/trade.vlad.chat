#!/usr/bin/env bun
/**
 * trade.vlad.chat v1 - Simple Trading Agent (Bun worker)
 *
 * Entry point that wires API server and orchestrator.
 */

import { startDashboardAPI } from './agent/api'
import { createOrchestrator } from './agent/orchestrator'

const orchestrator = createOrchestrator()
startDashboardAPI(orchestrator)
orchestrator.run().catch(console.error)
