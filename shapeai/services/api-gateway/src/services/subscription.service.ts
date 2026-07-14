import { Pool } from 'pg'

export interface SubscriptionStatus {
  status: 'free' | 'pro'
  expires_at: string | null
}

export async function getSubscriptionStatus(pool: Pool, userId: string): Promise<SubscriptionStatus> {
  const { rows } = await pool.query<{ subscription_status: string; subscription_expires_at: string | null }>(
    'SELECT subscription_status, subscription_expires_at FROM users WHERE id = $1',
    [userId]
  )
  if (!rows[0]) throw new Error('User not found')

  const expiresAt = rows[0].subscription_expires_at
  // A coluna só muda quando um webhook chega. Se o de cancelamento/expiração se perder,
  // o acesso ficaria liberado para sempre — por isso a data manda sobre o status.
  const isExpired = !!expiresAt && new Date(expiresAt).getTime() <= Date.now()
  const status = (rows[0].subscription_status === 'pro' && !isExpired ? 'pro' : 'free') as
    | 'free'
    | 'pro'

  return { status, expires_at: expiresAt }
}
