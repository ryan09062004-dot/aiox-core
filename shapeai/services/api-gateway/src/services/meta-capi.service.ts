import { createHash } from 'crypto'

// Versão da Graph API usada na Conversions API. Fixada para não mudar de comportamento
// silenciosamente quando o Meta lança uma versão nova.
const GRAPH_VERSION = 'v19.0'

export interface PurchaseEventInput {
  /** MESMO event_id do InitiateCheckout disparado no navegador — é o que deduplica. */
  eventId: string | null
  /** E-mail da compra (será hasheado em SHA-256 antes de sair daqui). */
  email: string | null
  fbp: string | null
  fbc: string | null
  clientIp: string | null
  userAgent: string | null
  valueCents: number
  currency?: string
}

/** O Meta exige os dados de correspondência normalizados (trim + lowercase) e em SHA-256. */
function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

/**
 * Dispara o evento Purchase server-side na Conversions API do Meta. É o par server-side
 * do InitiateCheckout que o Pixel enviou no navegador: como o checkout acontece em
 * pay.cakto.com.br (outro domínio, cookie do Pixel não atravessa), o browser nunca
 * registra a compra — então o webhook da Cakto a registra por aqui.
 *
 * A deduplicação com o Pixel depende de reutilizar o MESMO event_id do InitiateCheckout.
 * IMPORTANTE: com esta CAPI ligada, o Purchase nativo da Cakto DEVE ficar DESLIGADO,
 * senão o Meta conta a compra duas vezes (event_id diferente = sem dedupe).
 *
 * Degradação graciosa: sem META_PIXEL_ID/META_CAPI_ACCESS_TOKEN, apenas retorna — nunca
 * derruba o webhook. Conceder o acesso pago ao usuário é mais importante que o tracking.
 */
export async function sendPurchaseEvent(input: PurchaseEventInput): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN
  if (!pixelId || !accessToken) return

  const userData: Record<string, unknown> = {}
  if (input.email) userData.em = [sha256(input.email)]
  if (input.fbp) userData.fbp = input.fbp
  if (input.fbc) userData.fbc = input.fbc
  if (input.clientIp) userData.client_ip_address = input.clientIp
  if (input.userAgent) userData.client_user_agent = input.userAgent

  const event: Record<string, unknown> = {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    user_data: userData,
    custom_data: {
      currency: input.currency ?? 'BRL',
      value: input.valueCents / 100,
    },
  }
  if (input.eventId) event.event_id = input.eventId

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: [event] }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Meta CAPI ${res.status}: ${text}`)
  }
}
