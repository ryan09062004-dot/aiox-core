import { useEffect, useRef, useState } from 'react'
import { View, ActivityIndicator, Text } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as Linking from 'expo-linking'
import { supabase } from '../src/services/supabase.client'

export default function AuthCallback() {
  const [status, setStatus] = useState('...')
  // expo-router passa o ?code= como search param
  const params = useLocalSearchParams<{ code?: string; funnel?: string }>()
  // expo-linking rastreia a URL que abriu/retomou o app
  const url = Linking.useURL()

  // Navega uma vez só. O useEffect re-executa quando a URL é limpa após o OAuth, e sem
  // este guard a segunda execução (já sem ?funnel=1) mandava o usuário do funil para a
  // Home no meio da análise.
  const navigated = useRef(false)

  // "Veio do funil?" é travado no primeiro carregamento, antes de o navegador limpar a
  // query — depois disso o parâmetro some e a decisão seria errada.
  const fromFunnel = useRef(
    params.funnel === '1' || (typeof window !== 'undefined' && window.location.search.includes('funnel=1'))
  )

  useEffect(() => {
    if (params.funnel === '1') fromFunnel.current = true
  }, [params.funnel])

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
          // Código já consumido numa execução anterior do efeito — a navegação certa já
          // aconteceu, então não redireciona para o login por cima dela.
          if (navigated.current) return
          setStatus(`erro: ${JSON.stringify(error)}`)
          setTimeout(() => { if (!navigated.current) router.replace('/(auth)/login') }, 3000)
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
        if (navigated.current) return
        navigated.current = true
        // Quem veio do funil volta para a geração da análise, não para a home —
        // as fotos ficaram guardadas no cofre antes do redirect do Google.
        router.replace(fromFunnel.current ? '/(public)/generating' : '/(app)')
      } else {
        setStatus('sem sessao — verifique Supabase Redirect URLs')
        setTimeout(() => { if (!navigated.current) router.replace('/(auth)/login') }, 4000)
      }
    }

    exchange()
  }, [params.code, params.funnel, url])

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <ActivityIndicator color="#4CAF50" size="large" />
      <Text style={{ color: '#444', fontSize: 10, marginTop: 16, textAlign: 'center' }}>{status}</Text>
    </View>
  )
}
