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
    config: { update: 'config.update' },
    demoData: { seedDemoData: 'demoData.seedDemoData' },
    tradingActions: { getAccount: 'tradingActions.getAccount' },
  },
  internal: {},
}))
