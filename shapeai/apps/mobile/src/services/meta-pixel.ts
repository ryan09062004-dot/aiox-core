import { Platform } from 'react-native'

/**
 * Instrumentação do Meta Pixel no funil de compra. O Pixel só existe na web (o snippet
 * fica no `+html.tsx`); no nativo estas funções são no-op, então podem ser chamadas nas
 * telas sem guarda de plataforma — igual ao wrapper do Clarity em `analytics.ts`.
 *
 * O papel deste módulo é o InitiateCheckout no navegador e, principalmente, produzir os
 * identificadores (event_id, _fbp, _fbc) que precisam viajar com o token de checkout até
 * o webhook, onde o Purchase server-side (CAPI) deduplica pelo MESMO event_id.
 */

type FbqFn = (...args: unknown[]) => void

declare global {
  interface Window {
    fbq?: FbqFn
  }
}

function fbq(...args: unknown[]): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return
  window.fbq?.(...args)
}

/** Lê um cookie por nome (só web). */
function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

/** event_id único para deduplicar Pixel (browser) × CAPI (servidor). */
function newEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `ec_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Resolve o _fbc. Se o cookie ainda não existe mas a URL tem `fbclid` (primeiro acesso
 * vindo do anúncio), monta o valor no formato exigido pelo Meta: `fb.1.<timestamp>.<fbclid>`.
 */
function resolveFbc(): string | null {
  const cookie = readCookie('_fbc')
  if (cookie) return cookie
  if (typeof window === 'undefined') return null
  const fbclid = new URLSearchParams(window.location.search).get('fbclid')
  return fbclid ? `fb.1.${Date.now()}.${fbclid}` : null
}

export interface MetaTracking {
  eventId: string
  fbp: string | null
  fbc: string | null
}

/**
 * Dispara o InitiateCheckout no Pixel e devolve os identificadores que o backend precisa
 * gravar no checkout_intent (para o Purchase server-side deduplicar depois). No nativo
 * o `fbq` é no-op, mas ainda devolvemos um event_id válido — inofensivo.
 */
export function trackInitiateCheckout(valueBRL: number): MetaTracking {
  const eventId = newEventId()
  const fbp = readCookie('_fbp')
  const fbc = resolveFbc()
  fbq('track', 'InitiateCheckout', { value: valueBRL, currency: 'BRL' }, { eventID: eventId })
  return { eventId, fbp, fbc }
}
