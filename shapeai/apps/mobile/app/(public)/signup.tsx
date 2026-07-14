import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../src/stores/auth.store'
import { useOnboardingStore } from '../../src/stores/onboarding.store'

const READY_ITEMS = [
  'Sua análise corporal completa',
  'Seu plano de treino personalizado',
  'Seu plano alimentar',
  'Sua projeção de resultado',
]

export default function FunnelSignupScreen() {
  const signUp = useAuthStore((s) => s.signUp)
  const isReadyToAnalyze = useOnboardingStore((s) => s.isReadyToAnalyze)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Recarregar a página descarta as fotos (elas só vivem em memória) — manda refazer.
  if (!isReadyToAnalyze()) {
    return (
      <View style={styles.recoverContainer}>
        <Ionicons name="camera-outline" size={48} color="#4CAF50" />
        <Text style={styles.recoverTitle}>Precisamos da sua foto de novo</Text>
        <Text style={styles.recoverText}>
          Sua foto não é armazenada no navegador por segurança. É rapidinho.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/(public)/capture')}
        >
          <Text style={styles.buttonText}>Tirar foto</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Preencha e-mail e senha.')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    setSubmitting(true)
    setError(null)
    const authError = await signUp(email.trim(), password)
    setSubmitting(false)

    if (authError) {
      setError(authError)
      return
    }
    router.replace('/(public)/generating')
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.badge}>
          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
          <Text style={styles.badgeText}>Análise pronta para gerar</Text>
        </View>

        <Text style={styles.title}>Salve seu resultado</Text>
        <Text style={styles.subtitle}>
          Crie sua conta para não perder o que você acabou de montar.
        </Text>

        <View style={styles.readyBox}>
          {READY_ITEMS.map((item) => (
            <View key={item} style={styles.readyItem}>
              <Ionicons name="lock-open" size={14} color="#4CAF50" />
              <Text style={styles.readyText}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={styles.input}
          placeholder="seu@email.com"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <Text style={styles.label}>Senha</Text>
        <TextInput
          style={styles.input}
          placeholder="Mínimo 6 caracteres"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          disabled={submitting}
          onPress={handleSubmit}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Ver meu resultado</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.linkText}>Já tenho conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  body: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 12 },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(76,175,80,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: { color: '#4CAF50', fontSize: 12, fontWeight: '600' },

  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#888', lineHeight: 20 },

  readyBox: {
    backgroundColor: '#121212',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    padding: 16,
    gap: 10,
    marginVertical: 6,
  },
  readyItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  readyText: { color: '#ccc', fontSize: 14 },

  label: { color: '#aaa', fontSize: 13 },
  input: {
    backgroundColor: '#1A1A1A',
    color: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  error: { color: '#E57373', fontSize: 13 },

  button: {
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  linkRow: { alignItems: 'center', padding: 12 },
  linkText: { color: '#888', fontSize: 14 },

  recoverContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  recoverTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  recoverText: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 12, lineHeight: 20 },
})
