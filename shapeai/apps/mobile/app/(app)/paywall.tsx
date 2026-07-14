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

interface Plan {
  id: PlanId
  label: string
  price: string
  caption: string
  badge?: string
  savings?: string
}

// A anual é a âncora: é ela que carrega a maior parte da receita nesse tipo de funil.
const PLANS: Plan[] = [
  {
    id: 'annual',
    label: 'Anual',
    price: 'R$ 149,90',
    caption: 'R$ 12,49 por mês, cobrado uma vez por ano',
    badge: 'Melhor valor',
    savings: 'Economize 58%',
  },
  {
    id: 'quarterly',
    label: 'Trimestral',
    price: 'R$ 59,90',
    caption: 'R$ 19,97 por mês, cobrado a cada 3 meses',
    savings: 'Economize 33%',
  },
  {
    id: 'monthly',
    label: 'Mensal',
    price: 'R$ 29,90',
    caption: 'Cobrado todo mês, cancele quando quiser',
  },
]

const BENEFITS = [
  'Plano de treino completo, semana a semana',
  'Plano alimentar com macros e cardápio',
  'Análise corporal detalhada por grupo muscular',
  'Novas análises para acompanhar sua evolução',
  'Personal AI para tirar dúvidas quando quiser',
]

export default function PaywallScreen() {
  const { refresh } = useSubscription()
  const [selected, setSelected] = useState<PlanId>('annual')
  const [loading, setLoading] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [claimOpen, setClaimOpen] = useState(false)
  const [claimEmail, setClaimEmail] = useState('')

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      const url = await createCheckout(selected)
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

      {PLANS.map((plan) => {
        const active = selected === plan.id
        return (
          <TouchableOpacity
            key={plan.id}
            style={[styles.planCard, active && styles.planCardActive]}
            onPress={() => setSelected(plan.id)}
          >
            <View style={styles.radio}>
              {active && <View style={styles.radioDot} />}
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.planHeader}>
                <Text style={styles.planLabel}>{plan.label}</Text>
                {plan.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{plan.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.planCaption}>{plan.caption}</Text>
            </View>
            <View style={styles.planPriceBox}>
              <Text style={styles.planPrice}>{plan.price}</Text>
              {plan.savings && <Text style={styles.planSavings}>{plan.savings}</Text>}
            </View>
          </TouchableOpacity>
        )
      })}

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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#1F1F1F',
    padding: 16,
  },
  planCardActive: { borderColor: '#4CAF50', backgroundColor: '#161D17' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50' },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  planLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  planCaption: { color: '#888', fontSize: 12, marginTop: 2 },
  badge: {
    backgroundColor: '#4CAF50',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  planPriceBox: { alignItems: 'flex-end' },
  planPrice: { color: '#fff', fontSize: 16, fontWeight: '700' },
  planSavings: { color: '#4CAF50', fontSize: 11, fontWeight: '600', marginTop: 2 },

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
