import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock Convex modules
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useAction: vi.fn(),
  ConvexProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/convex/_generated/api', () => ({
  api: {
    system: {
      status: { get: 'system.status.get' },
      config: { update: 'system.config.update', get: 'system.config.get' },
      agent: { runCycle: 'system.agent.runCycle' },
      activityLogs: { create: 'system.activityLogs.create' },
      llmCosts: { track: 'system.llmCosts.track', getStats: 'system.llmCosts.getStats' },
      operations: {
        ingestSecEdgar: 'system.operations.ingestSecEdgar',
        marketOpenPrep: 'system.operations.marketOpenPrep',
        marketCloseCleanup: 'system.operations.marketCloseCleanup',
        midnightReset: 'system.operations.midnightReset',
        hourlyCacheRefresh: 'system.operations.hourlyCacheRefresh',
      },
      riskState: { get: 'system.riskState.get' },
    },
    trading: {
      agent: { runTrading: 'trading.agent.runTrading' },
      cryptoAgent: { runCryptoTrading: 'trading.cryptoAgent.runCryptoTrading' },
      actions: {
        getAccount: 'trading.actions.getAccount',
        previewOrder: 'trading.actions.previewOrder',
        submitOrder: 'trading.actions.submitOrder',
        closePosition: 'trading.actions.closePosition',
      },
      orderApprovals: { cleanupExpired: 'trading.orderApprovals.cleanupExpired' },
      trades: { create: 'trading.trades.create' },
    },
    portfolio: {
      account: { getAccount: 'portfolio.account.getAccount' },
      positions: { getAll: 'portfolio.positions.getAll' },
      marketClock: { get: 'portfolio.marketClock.get' },
      staleness: { compute: 'portfolio.staleness.compute' },
      overnight: {
        computeOvernightActivity: 'portfolio.overnight.computeOvernightActivity',
        generatePremarketPlan: 'portfolio.overnight.generatePremarketPlan',
      },
    },
    signals: {
      queries: { getTop: 'signals.queries.getTop' },
      technicals: { get: 'signals.technicals.get' },
      scraper: { scrape: 'signals.scraper.scrape' },
      research: { researchSignal: 'signals.research.researchSignal' },
      rawEvents: { insertIfMissing: 'signals.rawEvents.insertIfMissing' },
      secEdgar: {
        poll: 'signals.secEdgar.poll',
        getLatest: 'signals.secEdgar.getLatest',
        ingestCurrentFilings: 'signals.secEdgar.ingestCurrentFilings',
      },
    },
  },
  components: { agent: 'components.agent' },
  internal: {},
}))
