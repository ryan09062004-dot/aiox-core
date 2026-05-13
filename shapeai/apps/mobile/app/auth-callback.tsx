import { useEffect, useState } from 'react'
import { View, ActivityIndicator, Text, Linking } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../src/services/supabase.client'

export default function AuthCallback() {
  const [debug, setDebug] = useState('aguardando URL...')

  useEffect(() => {
    let done = false

    const finish = async (url: string | null) => {
      if (done) return
      done = true

      setDebug(`URL: ${url ?? 'null'}`)

      if (url) {
        // PKCE: ?code=xxx
        const codeMatch = url.match(/[?&]code=([^&#]+)/)
        if (codeMatch) {
          const code = decodeURIComponent(codeMatch[1])
          setDebug(`trocando code PKCE...`)
          const { error } = await supabase.auth.exchangeCodeForSession(code)
            .catch((e: unknown) => ({ error: e, data: null }))
          if (error) {
            setDebug(`erro exchange: ${JSON.stringify(error)}`)
            setTimeout(() => router.replace('/(auth)/login'), 4000)
            return
          }
          setDebug('exchange ok, verificando sessão...')
        }

        // Implicit: #access_token=xxx
        const fragment = url.split('#')[1]
        if (!codeMatch && fragment) {
          const match = fragment.match(/access_token=([^&]+).*refresh_token=([^&]+)/)
          if (match) {
            setDebug('setSession implicit...')
            await supabase.auth.setSession({
              access_token: decodeURIComponent(match[1]),
              refresh_token: decodeURIComponent(match[2]),
            }).catch((e: unknown) => setDebug(`setSession erro: ${JSON.stringify(e)}`))
          } else {
            setDebug(`fragmento sem token: ${fragment.slice(0, 80)}`)
          }
        }

        if (!codeMatch && !fragment) {
          setDebug(`URL sem code nem fragment: ${url}`)
        }
      }

      // Verifica sessão (pode já estar set pelo _layout handler)
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        router.replace('/(app)')
        return
      }

      setDebug((prev) => prev + ' | sem sessão, aguardando onAuthStateChange...')
    }

    // Registra listener para URLs recebidas enquanto app está em background
    const sub = Linking.addEventListener('url', (e) => finish(e.url))

    // getInitialURL retorna URL no Android mesmo para app resumido (onNewIntent)
    Linking.getInitialURL().then((url) => {
      if (url && (url.includes('code=') || url.includes('access_token') || url.includes('auth-callback'))) {
        finish(url)
      } else {
        // iOS: login.tsx já trocou o código, apenas confirma sessão
        setTimeout(() => finish(null), 500)
      }
    })

    // onAuthStateChange como backup caso session seja estabelecida pelo _layout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !done) {
        done = true
        router.replace('/(app)')
      }
    })

    const timeout = setTimeout(() => {
      if (!done) {
        done = true
        supabase.auth.getSession().then(({ data }) => {
          if (data.session) router.replace('/(app)')
          else router.replace('/(auth)/login')
        })
      }
    }, 15000)

    return () => {
      sub.remove()
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <ActivityIndicator color="#4CAF50" size="large" />
      <Text style={{ color: '#555', fontSize: 11, marginTop: 16, textAlign: 'center' }}>{debug}</Text>
    </View>
  )
}
