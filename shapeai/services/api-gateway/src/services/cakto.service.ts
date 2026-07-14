import { randomBytes } from 'crypto'
import type { Pool } from 'pg'

export type PlanId = 'monthly' | 'quarterly' | 'annual'

export const PLAN_IDS: PlanId[] = ['monthly', 'quarterly', 'annual']

// Cada plano é uma oferta na Cakto. As URLs vêm do ambiente para não acoplar o código
// aos ids de oferta.
const PLAN_ENV: Record<PlanId, string> = {
  monthly: 'CAKTO_CHECKOUT_URL_MONTHLY',
  quarterly: 'CAKTO_CHECKOUT_URL_QUARTERLY',
  annual: 'CAKTO_CHECKOUT_URL_ANNUAL',
}

// Duração concedida quando o webhook não informa uma data de expiração.
const PLAN_DURATION_DAYS: Record<PlanId, number> = {
  monthly: 30,
  quarterly: 90,
  annual: 365,
}

const TOKEN_PREFIX = 'sa_'
const TOKEN_RE = /sa_[a-f0-9]{24}/

export function generateIntentToken(): string {
  return TOKEN_PREFIX + randomBytes(12).toString('hex')
}

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && (PLAN_IDS as string[]).includes(value)
}

/**
 * Monta a URL de checkout carregando o token de vinculação. O token é enviado em `src`
 * e `sck` (os dois parâmetros de rastreio da Cakto) para maximizar a chance de ele voltar
 * no webhook, e o e-mail da conta vai pré-preenchido apenas como conveniência — a
 * vinculação NÃO depende dele, já que a pessoa pode pagar com outro e-mail.
 */
export function buildCheckoutUrl(plan: PlanId, token: string, email: string): string | null {
  const base = process.env[PLAN_ENV[plan]]
  if (!base) return null

  const url = new URL(base)
  url.searchParams.set('src', token)
  url.searchParams.set('sck', token)
  url.searchParams.set('email', email)
  return url.toString()
}

/**
 * Procura o token de intent no payload do webhook. A Cakto não documenta em qual campo
 * os parâmetros de rastreio retornam, então checamos os campos prováveis e, se nada bater,
 * varremos o JSON inteiro — o token tem prefixo e formato próprios, então um match é
 * inequívoco. O payload bruto é logado para fixarmos o campo exato na primeira venda real.
 */
export function extractIntentToken(body: unknown): string | null {
  const data = (body as { data?: Record<string, unknown> })?.data ?? {}
  const candidates = [data.src, data.sck, data.utm_source, data.utm_content, data.tracking]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && TOKEN_RE.test(candidate)) {
      return candidate.match(TOKEN_RE)![0]
    }
  }

  try {
    const match = JSON.stringify(body).match(TOKEN_RE)
    return match ? match[0] : null
  } catch {
    return null
  }
}

export function extractEmail(body: unknown): string | null {
  const data = (body as { data?: Record<string, unknown> })?.data ?? {}
  const customer = (data.customer as Record<string, unknown> | undefined) ?? {}
  const email = customer.email ?? data.customerEmail
  return typeof email === 'string' && email.includes('@') ? email.toLowerCase() : null
}

export function extractTransactionId(body: unknown): string | null {
  const data = (body as { data?: Record<string, unknown> })?.data ?? {}
  const id = data.id ?? data.transaction_id ?? data.order_id
  return id != null ? String(id) : null
}

/** Data de expiração informada pela Cakto; na ausência, calcula a partir do plano. */
export function resolveExpiresAt(body: unknown, plan: PlanId | null): string {
  const data = (body as { data?: Record<string, unknown> })?.data ?? {}
  const raw = data.next_charge_date ?? data.nextChargeDate ?? data.expires_at

  if (typeof raw === 'string') {
    const parsed = new Date(raw)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
  }

  const days = PLAN_DURATION_DAYS[plan ?? 'monthly']
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

export async function grantPro(pool: Pool, userId: string, expiresAt: string): Promise<void> {
  await pool.query(
    `UPDATE users SET subscription_status = 'pro', subscription_expires_at = $1 WHERE id = $2`,
    [expiresAt, userId]
  )
}

export async function revokePro(pool: Pool, userId: string): Promise<void> {
  await pool.query(
    `UPDATE users SET subscription_status = 'free', subscription_expires_at = NULL WHERE id = $1`,
    [userId]
  )
}

/**
 * Resolve o dono do pagamento, em ordem de confiabilidade:
 *   1. token de intent (à prova de e-mail divergente) — o caminho normal;
 *   2. e-mail da compra, se coincidir com o de alguma conta;
 *   3. nenhum — o pagamento vira `unclaimed` e a pessoa reivindica pelo app.
 */
export async function resolvePaymentOwner(
  pool: Pool,
  body: unknown
): Promise<{ userId: string; plan: PlanId | null } | null> {
  const token = extractIntentToken(body)
  if (token) {
    const { rows } = await pool.query<{ user_id: string; plan: string }>(
      `UPDATE checkout_intents SET consumed_at = NOW()
       WHERE token = $1
       RETURNING user_id, plan`,
      [token]
    )
    if (rows[0]) {
      return {
        userId: rows[0].user_id,
        plan: isPlanId(rows[0].plan) ? rows[0].plan : null,
      }
    }
  }

  const email = extractEmail(body)
  if (email) {
    const { rows } = await pool.query<{ id: string }>(
      `SELECT id FROM users WHERE LOWER(email) = $1`,
      [email]
    )
    if (rows[0]) return { userId: rows[0].id, plan: null }
  }

  return null
}
