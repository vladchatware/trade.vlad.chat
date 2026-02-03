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
    status: { get: 'status.get' },
    config: { update: 'config.update', get: 'config.get' },
    agent: { runCycle: 'agent.runCycle' },
    tradingAgent: { runTrading: 'tradingAgent.runTrading' },
    cryptoAgent: { runCryptoTrading: 'cryptoAgent.runCryptoTrading' },
    riskState: { get: 'riskState.get' },
    account: { getAccount: 'account.getAccount' },
    positions: { getAll: 'positions.getAll' },
    marketClock: { get: 'marketClock.get' },
    signalsQueries: { getTop: 'signalsQueries.getTop' },
    technicals: { get: 'technicals.get' },
    scraper: { scrape: 'scraper.scrape' },
    activityLogs: { create: 'activityLogs.create' },
    tradingActions: {
      getAccount: 'tradingActions.getAccount',
      previewOrder: 'tradingActions.previewOrder',
      submitOrder: 'tradingActions.submitOrder',
      closePosition: 'tradingActions.closePosition',
    },
    orderApprovals: { cleanupExpired: 'orderApprovals.cleanupExpired' },
    llmCosts: { track: 'llmCosts.track', getStats: 'llmCosts.getStats' },
    llmActions: { researchSignal: 'llmActions.researchSignal' },
    trades: { create: 'trades.create' },
    rawEvents: { insertIfMissing: 'rawEvents.insertIfMissing' },
    staleness: { compute: 'staleness.compute' },
    secEdgar: {
      poll: 'secEdgar.poll',
      getLatest: 'secEdgar.getLatest',
      ingestCurrentFilings: 'secEdgar.ingestCurrentFilings',
    },
    operations: {
      ingestSecEdgar: 'operations.ingestSecEdgar',
      marketOpenPrep: 'operations.marketOpenPrep',
      marketCloseCleanup: 'operations.marketCloseCleanup',
      midnightReset: 'operations.midnightReset',
      hourlyCacheRefresh: 'operations.hourlyCacheRefresh',
    },
    overnight: {
      computeOvernightActivity: 'overnight.computeOvernightActivity',
      generatePremarketPlan: 'overnight.generatePremarketPlan',
    },
    demoData: { seedDemoData: 'demoData.seedDemoData' },
  },
  components: { agent: 'components.agent' },
  internal: {},
}))
