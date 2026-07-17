import { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  TextInput,
  Platform,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { claimPayment, createCheckout, type PlanId } from '../../src/services/subscription.service'
import { useSubscription } from '../../src/hooks/useSubscription'
import { track } from '../../src/services/analytics'
import { trackInitiateCheckout } from '../../src/services/meta-pixel'

const PLAN: PlanId = 'monthly'
const PLAN_PRICE_BRL = 29.9

const BENEFITS = [
  'Plano de treino completo, semana a semana',
  'Plano alimentar com macros e cardápio',
  'Novas análises para acompanhar sua evolução',
  'Personal AI para tirar dúvidas quando quiser',
]

export default function PaywallScreen() {
  const { refresh } = useSubscription()
  const [loading, setLoading] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [claimOpen, setClaimOpen] = useState(false)
  const [claimEmail, setClaimEmail] = useState('')
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)

  useEffect(() => {
    track('funnel_12_paywall_view')
  }, [])

  // Alert.alert não renderiza botões no React Native Web — no PWA as mensagens ficariam
  // invisíveis. O feedback é exibido na própria tela.
  const handleSubscribe = async () => {
    // Marcado no clique, e não depois do `createCheckout`, por dois motivos: é o clique
    // que representa a intenção de compra, e o Clarity envia em lote — disparar antes da
    // ida ao servidor dá tempo de o evento sair antes de a página navegar para a Cakto.
    track('funnel_13_checkout_click')
    // InitiateCheckout do Meta no mesmo clique. Devolve event_id + _fbp/_fbc, que seguem
    // com o token de checkout até o webhook para o Purchase server-side deduplicar.
    const tracking = trackInitiateCheckout(PLAN_PRICE_BRL)
    setLoading(true)
    setMessage(null)
    try {
      const url = await createCheckout(PLAN, tracking)

      // Na web, Linking.openURL vira window.open — e como aqui já passamos por um await,
      // o navegador não considera mais isso um clique do usuário e bloqueia o popup.
      // Navegar na própria aba não sofre esse bloqueio.
      if (Platform.OS === 'web') {
        window.location.assign(url)
        return
      }
      await Linking.openURL(url)
    } catch (e: unknown) {
      setMessage({
        kind: 'error',
        text: e instanceof Error ? e.message : 'Não foi possível abrir o checkout.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClaim = async () => {
    if (!claimEmail.includes('@')) {
      setMessage({ kind: 'error', text: 'Informe o e-mail usado na compra.' })
      return
    }
    setClaiming(true)
    setMessage(null)
    try {
      await claimPayment(claimEmail.trim())
      await refresh()
      setMessage({ kind: 'success', text: 'Acesso liberado! Aproveite seu plano.' })
      setTimeout(() => router.back(), 1200)
    } catch {
      setMessage({
        kind: 'error',
        text: 'Não encontramos sua compra. Confira o e-mail usado no pagamento — se acabou de pagar, aguarde um minuto e tente de novo.',
      })
    } finally {
      setClaiming(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.close} onPress={() => router.back()}>
        <Ionicons name="close" size={24} color="#888" />
      </TouchableOpacity>

      <Text style={styles.title}>Comece hoje mesmo!</Text>
      <Text style={styles.subtitle}>
        Desbloqueie o treino e a dieta que a gente montou a partir da sua análise.
      </Text>

      <View style={styles.benefits}>
        {BENEFITS.map((b) => (
          <View key={b} style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
            <Text style={styles.benefitText}>{b}</Text>
          </View>
        ))}
      </View>

      <LinearGradient
        colors={['#1B2E1D', '#132116', '#0F1711']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.planCard}
      >
        <View style={styles.priceRow}>
          <Text style={styles.priceCurrency}>R$</Text>
          <Text style={styles.priceValue}>29,90</Text>
        </View>
        <Text style={styles.planCaption}>30 dias de acesso completo.</Text>
      </LinearGradient>

      <TouchableOpacity
        style={[styles.cta, loading && styles.ctaDisabled]}
        disabled={loading}
        onPress={handleSubscribe}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.ctaText}>Desbloquear meu plano</Text>
        )}
      </TouchableOpacity>

      {message && (
        <Text style={message.kind === 'error' ? styles.msgError : styles.msgSuccess}>
          {message.text}
        </Text>
      )}

      <Text style={styles.legal}>
        Pagamento único e seguro pela Cakto. Sem renovação automática.
      </Text>

      {!claimOpen ? (
        <TouchableOpacity style={styles.linkRow} onPress={() => setClaimOpen(true)}>
          <Text style={styles.linkText}>Já paguei e meu acesso não liberou</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.claimBox}>
          <Text style={styles.claimTitle}>Vincular minha compra</Text>
          <Text style={styles.claimText}>
            Informe o e-mail que você usou no pagamento — mesmo que seja diferente do e-mail
            desta conta.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="email-da-compra@exemplo.com"
            placeholderTextColor="#666"
            value={claimEmail}
            onChangeText={setClaimEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TouchableOpacity
            style={[styles.claimButton, claiming && styles.ctaDisabled]}
            disabled={claiming}
            onPress={handleClaim}
          >
            {claiming ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.claimButtonText}>Liberar acesso</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { padding: 24, paddingTop: 56, paddingBottom: 48, gap: 12 },

  close: { alignSelf: 'flex-end', padding: 4 },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: '#888', fontSize: 14, lineHeight: 20, marginBottom: 8 },

  benefits: {
    backgroundColor: '#121212',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    padding: 16,
    gap: 10,
    marginBottom: 8,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  benefitText: { color: '#ccc', fontSize: 13, flex: 1 },

  planCard: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
    paddingVertical: 22,
    paddingHorizontal: 16,
    gap: 2,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  priceCurrency: { color: '#fff', fontSize: 18, fontWeight: '600' },
  priceValue: { color: '#fff', fontSize: 42, fontWeight: '800' },
  planCaption: { color: '#9BB89F', fontSize: 12, marginTop: 4 },

  cta: {
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 12,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  legal: { color: '#555', fontSize: 11, textAlign: 'center' },
  msgError: { color: '#E57373', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  msgSuccess: { color: '#4CAF50', fontSize: 13, textAlign: 'center', fontWeight: '600' },

  linkRow: { alignItems: 'center', padding: 12 },
  linkText: { color: '#888', fontSize: 13, textDecorationLine: 'underline' },

  claimBox: {
    backgroundColor: '#121212',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    padding: 16,
    gap: 10,
    marginTop: 8,
  },
  claimTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  claimText: { color: '#888', fontSize: 12, lineHeight: 18 },
  input: {
    backgroundColor: '#1A1A1A',
    color: '#fff',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
  },
  claimButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  claimButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
})
