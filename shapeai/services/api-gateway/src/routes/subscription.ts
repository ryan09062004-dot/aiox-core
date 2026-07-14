import { FastifyInstance } from 'fastify'
import { pool } from '../db/client'
import { requireAuth } from '../middleware/auth'
import { getSubscriptionStatus } from '../services/subscription.service'
import {
  buildCheckoutUrl,
  extractEmail,
  extractTransactionId,
  generateIntentToken,
  grantPro,
  isPlanId,
  resolvePaymentOwner,
  resolveExpiresAt,
  revokePro,
} from '../services/cakto.service'

interface RevenueCatEvent {
  type: string
  app_user_id: string
  expiration_at_ms?: number
}

// Eventos da Cakto que concedem ou revogam acesso. Os demais (initiate_checkout,
// checkout_abandonment, purchase_refused, pix_gerado, boleto_gerado) não alteram o
// status da assinatura.
const CAKTO_GRANT_EVENTS = new Set([
  'purchase_approved',
  'subscription_created',
  'subscription_renewed',
])
const CAKTO_REVOKE_EVENTS = new Set([
  'refund',
  'chargeback',
  'subscription_canceled',
  'subscription_renewal_refused',
])

export async function subscriptionRoutes(app: FastifyInstance) {
  app.get('/subscription/status', { preHandler: requireAuth }, async (request, reply) => {
    const status = await getSubscriptionStatus(pool, request.authUser.id)
    return reply.send(status)
  })

  // POST /subscription/checkout — cria a intent e devolve a URL da Cakto com o token.
  // O token é o que garante que o pagamento caia na conta certa mesmo que a pessoa
  // pague com um e-mail diferente do cadastro.
  app.post<{ Body: { plan?: string } }>(
    '/subscription/checkout',
    { preHandler: requireAuth },
    async (request, reply) => {
      const plan = request.body?.plan
      if (!isPlanId(plan)) {
        return reply.status(400).send({ error: 'Invalid plan' })
      }

      const userId = request.authUser.id
      const { rows } = await pool.query<{ email: string }>(
        `SELECT email FROM users WHERE id = $1`,
        [userId]
      )
      if (!rows[0]) return reply.status(404).send({ error: 'User not found' })

      const token = generateIntentToken()
      const url = buildCheckoutUrl(plan, token, rows[0].email)
      if (!url) {
        request.log.error(`[cakto] checkout URL não configurada para o plano ${plan}`)
        return reply.status(503).send({ error: 'Checkout unavailable' })
      }

      await pool.query(
        `INSERT INTO checkout_intents (token, user_id, plan) VALUES ($1, $2, $3)`,
        [token, userId, plan]
      )

      return reply.send({ checkout_url: url })
    }
  )

  // POST /subscription/webhook/cakto — a Cakto valida com um secret no corpo.
  app.post<{ Body: { event?: string; secret?: string } }>(
    '/subscription/webhook/cakto',
    async (request, reply) => {
      const expected = process.env.CAKTO_WEBHOOK_SECRET
      if (expected && request.body?.secret !== expected) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      const event = request.body?.event
      const isGrant = !!event && CAKTO_GRANT_EVENTS.has(event)
      const isRevoke = !!event && CAKTO_REVOKE_EVENTS.has(event)

      if (!isGrant && !isRevoke) {
        return reply.status(200).send({ received: true, ignored: event })
      }

      const owner = await resolvePaymentOwner(pool, request.body)

      if (!owner) {
        // Ninguém reconhecido: registramos o pagamento para a pessoa reivindicar no app
        // e logamos o payload bruto para identificar em que campo a Cakto devolve o token.
        const transactionId = extractTransactionId(request.body)
        request.log.warn(
          { payload: request.body },
          '[cakto] pagamento sem dono resolvido — registrado como unclaimed'
        )

        if (isGrant && transactionId) {
          await pool.query(
            `INSERT INTO unclaimed_payments (transaction_id, email, expires_at, payload)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (transaction_id) DO NOTHING`,
            [
              transactionId,
              extractEmail(request.body),
              resolveExpiresAt(request.body, null),
              JSON.stringify(request.body),
            ]
          )
        }
        return reply.status(200).send({ received: true, unclaimed: true })
      }

      if (isGrant) {
        await grantPro(pool, owner.userId, resolveExpiresAt(request.body, owner.plan))
      } else {
        await revokePro(pool, owner.userId)
      }

      return reply.status(200).send({ received: true })
    }
  )

  // POST /subscription/claim — "Já paguei": vincula um pagamento órfão à conta logada,
  // usando o e-mail da compra (que pode diferir do e-mail de cadastro).
  app.post<{ Body: { email?: string } }>(
    '/subscription/claim',
    { preHandler: requireAuth },
    async (request, reply) => {
      const email = request.body?.email?.trim().toLowerCase()
      if (!email || !email.includes('@')) {
        return reply.status(400).send({ error: 'Invalid email' })
      }

      const { rows } = await pool.query<{ id: string; expires_at: string | null }>(
        `UPDATE unclaimed_payments
         SET claimed_by = $1, claimed_at = NOW()
         WHERE id = (
           SELECT id FROM unclaimed_payments
           WHERE LOWER(email) = $2 AND claimed_by IS NULL
           ORDER BY created_at DESC
           LIMIT 1
         )
         RETURNING id, expires_at`,
        [request.authUser.id, email]
      )

      if (!rows[0]) {
        return reply.status(404).send({ error: 'Nenhum pagamento encontrado para esse e-mail.' })
      }

      await grantPro(
        pool,
        request.authUser.id,
        rows[0].expires_at ?? resolveExpiresAt(null, 'monthly')
      )

      return reply.send({ status: 'pro' })
    }
  )

  app.post('/subscription/webhook', async (request, reply) => {
    const secret = request.headers['x-revenuecat-secret']
    if (!secret || secret !== process.env.REVENUECAT_WEBHOOK_SECRET) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const body = request.body as { event: RevenueCatEvent }
    const { type, app_user_id, expiration_at_ms } = body.event

    if (type === 'INITIAL_PURCHASE' || type === 'RENEWAL') {
      const expiresAt = expiration_at_ms ? new Date(expiration_at_ms).toISOString() : null
      await pool.query(
        `UPDATE users SET subscription_status = 'pro', subscription_expires_at = $1 WHERE id = $2`,
        [expiresAt, app_user_id]
      )
    } else if (type === 'EXPIRATION') {
      await pool.query(
        `UPDATE users SET subscription_status = 'free', subscription_expires_at = NULL WHERE id = $1`,
        [app_user_id]
      )
    }

    return reply.status(200).send({ received: true })
  })
}
