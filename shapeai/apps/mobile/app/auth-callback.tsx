import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../src/services/supabase.client'

export default function AuthCallback() {
  useEffect(() => {
    // O _layout.tsx já trocou o code pelo token via Linking global handler.
    // Aqui só aguardamos a sessão ser estabelecida via onAuthStateChange.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace('/(app)')
    })

    // Verifica imediatamente caso já exista sessão (ex: iOS onde login.tsx trocou o código)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/(app)')
    })

    // Timeout de segurança: se em 10s nenhuma sessão, volta ao login
    const timeout = setTimeout(() => {
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) router.replace('/(auth)/login')
      })
    }, 10000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color="#4CAF50" size="large" />
    </View>
  )
}
