import { useEffect } from 'react'
import { View, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { supabase } from '../src/services/supabase.client'

export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string }>()

  useEffect(() => {
    const code = params.code
    Alert.alert('Debug OAuth', `code: ${code ?? 'AUSENTE'}\nparams: ${JSON.stringify(params)}`)
    if (code) {
      supabase.auth.exchangeCodeForSession(code)
        .then(() => router.replace('/(app)'))
        .catch((e) => {
          Alert.alert('Debug Error', e.message)
          router.replace('/(auth)/login')
        })
    } else {
      router.replace('/(auth)/login')
    }
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color="#4CAF50" size="large" />
    </View>
  )
}
