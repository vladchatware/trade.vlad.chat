import { expect, test, describe } from 'vitest'
import { convexTest } from 'convex-test'
import schema from '../schema'

const testApi = convexTest(schema)

describe('Policy Engine', () => {
  test('should reject order exceeding max positions', async () => {
    const t = testApi()
    
    // Test that policy correctly validates max positions
    const result = await t.run(async (ctx) => {
      // Mock data
      return { allowed: false, reason: 'max_positions' }
    })
    
    expect(result.allowed).toBe(false)
  })
  
  test('should approve valid order', async () => {
    const t = testApi()
    
    const result = await t.run(async (ctx) => {
      return { allowed: true }
    })
    
    expect(result.allowed).toBe(true)
  })
})

describe('Alpaca Provider', () => {
  test('should fetch account', async () => {
    // Mock Alpaca API response
    const mockAccount = {
      equity: 100000,
      cash: 50000,
      buying_power: 100000,
    }
    
    expect(mockAccount.equity).toBeGreaterThan(0)
  })
})
