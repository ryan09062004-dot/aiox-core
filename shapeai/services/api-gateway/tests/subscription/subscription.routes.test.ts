import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/db/client', () => ({
  pool: { query: vi.fn() },
}))

import { pool } from '../../src/db/client'
import { getSubscriptionStatus } from '../../src/services/subscription.service'

const mockPool = pool as unknown as { query: ReturnType<typeof vi.fn> }

describe('getSubscriptionStatus', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna status free com expires_at null', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ subscription_status: 'free', subscription_expires_at: null }],
    })
    const result = await getSubscriptionStatus(mockPool as never, 'user-123')
    expect(result).toEqual({ status: 'free', expires_at: null })
  })

  it('retorna status pro quando a assinatura ainda está vigente', async () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    mockPool.query.mockResolvedValueOnce({
      rows: [{ subscription_status: 'pro', subscription_expires_at: future }],
    })
    const result = await getSubscriptionStatus(mockPool as never, 'user-123')
    expect(result).toEqual({ status: 'pro', expires_at: future })
  })

  // Se o webhook de cancelamento/expiração se perder, a coluna continua 'pro'.
  // A data vencida tem que rebaixar o acesso mesmo assim.
  it('rebaixa para free quando a data de expiração já passou', async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    mockPool.query.mockResolvedValueOnce({
      rows: [{ subscription_status: 'pro', subscription_expires_at: past }],
    })
    const result = await getSubscriptionStatus(mockPool as never, 'user-123')
    expect(result.status).toBe('free')
  })

  it('mantém pro quando não há data de expiração definida', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ subscription_status: 'pro', subscription_expires_at: null }],
    })
    const result = await getSubscriptionStatus(mockPool as never, 'user-123')
    expect(result.status).toBe('pro')
  })

  it('lança erro se usuário não encontrado', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] })
    await expect(getSubscriptionStatus(mockPool as never, 'user-404')).rejects.toThrow('User not found')
  })
})
