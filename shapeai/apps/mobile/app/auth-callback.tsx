import { useEffect, useState } from 'react'
import { View, ActivityIndicator, Text } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as Linking from 'expo-linking'
import { supabase } from '../src/services/supabase.client'

export default function AuthCallback() {
  const [status, setStatus] = useState('...')
  // expo-router passa o ?code= como search param
  const params = useLocalSearchParams<{ code?: string }>()
  // expo-linking rastreia a URL que abriu/retomou o app
  const url = Linking.useURL()

  useEffect(() => {
    const code = params.code
      ?? (url ? (url.match(/[?&]code=([^&#]+)/)?.[1] ?? null) : null)

    setStatus(`code: ${code ?? 'null'} | url: ${url ?? 'null'}`)

    if (!code && !url) return // ainda aguardando

    const exchange = async () => {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(decodeURIComponent(code))
          .catch((e: unknown) => ({ error: e, data: null }))
        if (error) {
          setStatus(`erro: ${JSON.stringify(error)}`)
          setTimeout(() => router.replace('/(auth)/login'), 3000)
          return
        }
      }

      // implicit flow: #access_token=xxx no fragment
      if (!code && url) {
        const fragment = url.split('#')[1] ?? ''
        const atMatch = fragment.match(/access_token=([^&]+)/)
        const rtMatch = fragment.match(/refresh_token=([^&]+)/)
        if (atMatch && rtMatch) {
          await supabase.auth.setSession({
            access_token: decodeURIComponent(atMatch[1]),
            refresh_token: decodeURIComponent(rtMatch[1]),
          }).catch(() => {})
        }
      }

      const { data } = await supabase.auth.getSession()
      if (data.session) {
        router.replace('/(app)')
      } else {
        setStatus('sem sessao — verifique Supabase Redirect URLs')
        setTimeout(() => router.replace('/(auth)/login'), 4000)
      }
    }

    exchange()
  }, [params.code, url])

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <ActivityIndicator color="#4CAF50" size="large" />
      <Text style={{ color: '#444', fontSize: 10, marginTop: 16, textAlign: 'center' }}>{status}</Text>
    </View>
  )
}
