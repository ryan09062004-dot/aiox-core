import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  TextInput,
  Alert,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { claimPayment, createCheckout, type PlanId } from '../../src/services/subscription.service'
import { useSubscription } from '../../src/hooks/useSubscription'

const PLAN: PlanId = 'monthly'

const BENEFITS = [
  'Plano de treino completo, semana a semana',
  'Plano alimentar com macros e cardápio',
  'Análise corporal detalhada por grupo muscular',
  'Novas análises para acompanhar sua evolução',
  'Personal AI para tirar dúvidas quando quiser',
]

export default function PaywallScreen() {
  const { refresh } = useSubscription()
  const [loading, setLoading] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [claimOpen, setClaimOpen] = useState(false)
  const [claimEmail, setClaimEmail] = useState('')

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      const url = await createCheckout(PLAN)
      await Linking.openURL(url)
    } catch (e: unknown) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível abrir o checkout.')
    } finally {
      setLoading(false)
    }
  }

  const handleClaim = async () => {
    if (!claimEmail.includes('@')) {
      Alert.alert('E-mail inválido', 'Informe o e-mail usado na compra.')
      return
    }
    setClaiming(true)
    try {
      await claimPayment(claimEmail.trim())
      await refresh()
      Alert.alert('Pronto!', 'Seu acesso foi liberado.', [
        { text: 'Continuar', onPress: () => router.back() },
      ])
    } catch {
      Alert.alert(
        'Não encontramos sua compra',
        'Confira o e-mail usado no pagamento. Se acabou de pagar, aguarde um minuto e tente de novo.'
      )
    } finally {
      setClaiming(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.close} onPress={() => router.back()}>
        <Ionicons name="close" size={24} color="#888" />
      </TouchableOpacity>

      <Text style={styles.title}>Seu plano está pronto</Text>
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

      <View style={styles.planCard}>
        <Text style={styles.planLabel}>Plano mensal</Text>
        <View style={styles.priceRow}>
          <Text style={styles.priceCurrency}>R$</Text>
          <Text style={styles.priceValue}>29,90</Text>
          <Text style={styles.pricePeriod}>/mês</Text>
        </View>
        <Text style={styles.planCaption}>Cancele quando quiser, sem multa.</Text>
      </View>

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

      <Text style={styles.legal}>
        Pagamento seguro pela Cakto. Cancele quando quiser.
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
    backgroundColor: '#161D17',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
    paddingVertical: 22,
    paddingHorizontal: 16,
    gap: 2,
  },
  planLabel: { color: '#4CAF50', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  priceCurrency: { color: '#fff', fontSize: 18, fontWeight: '600' },
  priceValue: { color: '#fff', fontSize: 42, fontWeight: '800' },
  pricePeriod: { color: '#888', fontSize: 15, fontWeight: '600' },
  planCaption: { color: '#888', fontSize: 12, marginTop: 4 },

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
