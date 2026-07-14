import { apiGet, apiPost } from './api.client'

export type PlanId = 'monthly' | 'quarterly' | 'annual'

export interface SubscriptionStatus {
  status: 'free' | 'pro'
  expires_at: string | null
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  return apiGet<SubscriptionStatus>('/subscription/status')
}

/**
 * Cria a intenção de checkout e devolve a URL da Cakto. A URL carrega um token que
 * amarra o pagamento a esta conta — por isso a pessoa pode pagar com qualquer e-mail
 * que o acesso é liberado na conta certa.
 */
export async function createCheckout(plan: PlanId): Promise<string> {
  const { checkout_url } = await apiPost<{ checkout_url: string }>('/subscription/checkout', {
    plan,
  })
  return checkout_url
}

/** "Já paguei": vincula um pagamento feito com outro e-mail à conta logada. */
export async function claimPayment(email: string): Promise<SubscriptionStatus> {
  return apiPost<SubscriptionStatus>('/subscription/claim', { email })
}
