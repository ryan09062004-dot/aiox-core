import { useEffect } from 'react'
import { Linking } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAuthStore } from '../src/stores/auth.store'
import { configurePurchases } from '../src/services/purchases.service'
import { registerPushToken } from '../src/services/notification.service'
import { supabase } from '../src/services/supabase.client'

configurePurchases()

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize)
  const session = useAuthStore((s) => s.session)

  useEffect(() => {
    initialize()
  }, [initialize])

  // Handler global de deep links OAuth — registrado antes de qualquer rota renderizar
  useEffect(() => {
    const handleUrl = async (url: string) => {
      const match = url.match(/[?&]code=([^&#]+)/)
      if (match) {
        const code = decodeURIComponent(match[1])
        await supabase.auth.exchangeCodeForSession(code).catch(() => {})
      }
    }
    const sub = Linking.addEventListener('url', (e) => handleUrl(e.url))
    Linking.getInitialURL().then((url) => { if (url) handleUrl(url) })
    return () => sub.remove()
  }, [])

  useEffect(() => {
    if (session) registerPushToken().catch(() => {})
  }, [session])

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.push('/(app)/camera')
    })
    return () => sub.remove()
  }, [])

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  )
}
