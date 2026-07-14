import { useCallback, useEffect, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { getSubscriptionStatus, type SubscriptionStatus } from '../services/subscription.service'
import { useAuthStore } from '../stores/auth.store'

interface UseSubscription {
  isPro: boolean
  isLoading: boolean
  expiresAt: string | null
  refresh: () => Promise<void>
}

/**
 * Status de assinatura da conta logada. Revalida sempre que a tela ganha foco — é assim
 * que o acesso é liberado quando a pessoa volta do checkout da Cakto em outra aba.
 */
export function useSubscription(): UseSubscription {
  const session = useAuthStore((s) => s.session)
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!session) {
      setStatus(null)
      setIsLoading(false)
      return
    }
    try {
      setStatus(await getSubscriptionStatus())
    } catch {
      // Falha de rede não deve liberar conteúdo pago — mantém o último status conhecido.
    } finally {
      setIsLoading(false)
    }
  }, [session])

  useEffect(() => {
    refresh()
  }, [refresh])

  useFocusEffect(
    useCallback(() => {
      refresh()
    }, [refresh])
  )

  return {
    isPro: status?.status === 'pro',
    isLoading,
    expiresAt: status?.expires_at ?? null,
    refresh,
  }
}
