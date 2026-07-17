import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Pool } from 'pg'
import {
  buildCheckoutUrl,
  extractEmail,
  extractIntentToken,
  extractTransactionId,
  generateIntentToken,
  isPlanId,
  resolveExpiresAt,
  resolvePaymentOwner,
} from '../../src/services/cakto.service'

const TOKEN = 'sa_0123456789abcdef01234567'

function mockPool(...results: Array<{ rows: unknown[] }>): Pool {
  const query = vi.fn()
  results.forEach((r) => query.mockResolvedValueOnce(r))
  query.mockResolvedValue({ rows: [] })
  return { query } as unknown as Pool
}

describe('generateIntentToken', () => {
  it('gera token no formato reconhecido pelo extractor', () => {
    const token = generateIntentToken()
    expect(token).toMatch(/^sa_[a-f0-9]{24}$/)
    expect(extractIntentToken({ data: { src: token } })).toBe(token)
  })

  it('gera tokens distintos a cada chamada', () => {
    expect(generateIntentToken()).not.toBe(generateIntentToken())
  })
})

describe('isPlanId', () => {
  it('aceita apenas o plano mensal', () => {
    expect(isPlanId('monthly')).toBe(true)
    expect(isPlanId('annual')).toBe(false)
    expect(isPlanId(undefined)).toBe(false)
  })
})

describe('buildCheckoutUrl', () => {
  const OLD_ENV = process.env

  afterEach(() => {
    process.env = OLD_ENV
  })

  it('embute o token em src e sck e pré-preenche o e-mail', () => {
    process.env = { ...OLD_ENV, CAKTO_CHECKOUT_URL_MONTHLY: 'https://pay.cakto.com.br/abc123' }
    const url = new URL(buildCheckoutUrl('monthly', TOKEN, 'user@shape.ai')!)
    expect(url.searchParams.get('src')).toBe(TOKEN)
    expect(url.searchParams.get('sck')).toBe(TOKEN)
    expect(url.searchParams.get('email')).toBe('user@shape.ai')
  })

  // Sem env configurada, cai na oferta padrão — o checkout funciona sem config extra.
  it('usa a oferta padrão da Cakto quando não há env', () => {
    process.env = { ...OLD_ENV, CAKTO_CHECKOUT_URL_MONTHLY: undefined }
    const url = new URL(buildCheckoutUrl('monthly', TOKEN, 'user@shape.ai')!)
    expect(url.origin + url.pathname).toBe('https://pay.cakto.com.br/j73s7m2_940797')
    expect(url.searchParams.get('src')).toBe(TOKEN)
  })
})

describe('extractIntentToken', () => {
  it('encontra o token em src', () => {
    expect(extractIntentToken({ data: { src: TOKEN } })).toBe(TOKEN)
  })

  it('encontra o token em sck', () => {
    expect(extractIntentToken({ data: { sck: TOKEN } })).toBe(TOKEN)
  })

  // A Cakto não documenta em que campo os parâmetros de rastreio voltam — a varredura
  // do payload garante que a vinculação funcione mesmo se o campo mudar de nome.
  it('encontra o token em campo desconhecido, via varredura do payload', () => {
    expect(extractIntentToken({ data: { tracking_params: { custom: TOKEN } } })).toBe(TOKEN)
  })

  it('retorna null quando não há token', () => {
    expect(extractIntentToken({ data: { src: 'facebook-ads' } })).toBeNull()
  })
})

describe('extractEmail / extractTransactionId', () => {
  it('lê o e-mail de data.customer.email', () => {
    expect(extractEmail({ data: { customer: { email: 'Buyer@Mail.com' } } })).toBe('buyer@mail.com')
  })

  it('lê o e-mail do formato achatado (checkout_abandonment)', () => {
    expect(extractEmail({ data: { customerEmail: 'x@y.com' } })).toBe('x@y.com')
  })

  it('ignora e-mail malformado', () => {
    expect(extractEmail({ data: { customer: { email: 'sem-arroba' } } })).toBeNull()
  })

  it('lê o id da transação', () => {
    expect(extractTransactionId({ data: { id: 'tx_1' } })).toBe('tx_1')
  })
})

describe('resolveExpiresAt', () => {
  it('usa a data informada pela Cakto quando presente', () => {
    const at = resolveExpiresAt({ data: { next_charge_date: '2026-09-01T00:00:00Z' } }, 'monthly')
    expect(at).toBe('2026-09-01T00:00:00.000Z')
  })

  it('cai para 30 dias quando a Cakto não informa data', () => {
    const at = new Date(resolveExpiresAt({ data: {} }, 'monthly')).getTime()
    const expected = Date.now() + 30 * 24 * 60 * 60 * 1000
    expect(Math.abs(at - expected)).toBeLessThan(5000)
  })
})

describe('resolvePaymentOwner', () => {
  it('vincula pelo token mesmo quando o e-mail da compra é diferente do cadastro', async () => {
    const pool = mockPool({
      rows: [
        {
          user_id: 'user-1',
          plan: 'monthly',
          fbp: 'fb.1.1.abc',
          fbc: 'fb.1.1.click',
          event_id: 'evt-1',
          client_ip: '1.2.3.4',
          user_agent: 'UA',
        },
      ],
    })

    const owner = await resolvePaymentOwner(pool, {
      data: { src: TOKEN, customer: { email: 'outro-email@gmail.com' } },
    })

    expect(owner).toEqual({
      userId: 'user-1',
      plan: 'monthly',
      tracking: {
        fbp: 'fb.1.1.abc',
        fbc: 'fb.1.1.click',
        eventId: 'evt-1',
        clientIp: '1.2.3.4',
        userAgent: 'UA',
      },
    })
    // Resolvido pelo token: não deve nem consultar por e-mail.
    expect(pool.query).toHaveBeenCalledTimes(1)
  })

  it('cai para o e-mail quando não há token no payload', async () => {
    // Sem token, a busca por intent é pulada — só a query por e-mail acontece.
    const pool = mockPool({ rows: [{ id: 'user-2' }] })

    const owner = await resolvePaymentOwner(pool, {
      data: { customer: { email: 'buyer@mail.com' } },
    })

    // Sem intent não há identificadores de tracking do Meta.
    expect(owner).toEqual({ userId: 'user-2', plan: null, tracking: null })
    expect(pool.query).toHaveBeenCalledTimes(1)
  })

  it('retorna null quando token e e-mail não resolvem ninguém', async () => {
    const pool = mockPool({ rows: [] })

    const owner = await resolvePaymentOwner(pool, {
      data: { customer: { email: 'desconhecido@mail.com' } },
    })

    expect(owner).toBeNull()
  })

  it('ignora token de intent já consumido e não reaproveita a vinculação', async () => {
    // O UPDATE ... RETURNING não devolve linha porque o token não existe mais.
    const pool = mockPool({ rows: [] }, { rows: [] })

    const owner = await resolvePaymentOwner(pool, { data: { src: TOKEN } })

    expect(owner).toBeNull()
  })
})
