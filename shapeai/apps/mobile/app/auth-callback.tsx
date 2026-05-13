import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { supabase } from '../src/services/supabase.client'

async function resolveAndRedirect(code?: string) {
  if (code) {
    await supabase.auth.exchangeCodeForSession(code).catch(() => {})
  }
  // Mesmo que o exchange falhe (código já usado por login.tsx no iOS), verifica a sessão
  const { data } = await supabase.auth.getSession()
  if (data.session) router.replace('/(app)')
  else router.replace('/(auth)/login')
}

export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string }>()

  useEffect(() => {
    resolveAndRedirect(params.code)
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color="#4CAF50" size="large" />
    </View>
  )
}
