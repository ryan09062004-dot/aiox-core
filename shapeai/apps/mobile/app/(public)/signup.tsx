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
import Svg, { Path, G, ClipPath, Defs } from 'react-native-svg'
import { useAuthStore } from '../../src/stores/auth.store'
import { useOnboardingStore } from '../../src/stores/onboarding.store'

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Defs>
        <ClipPath id="g-funnel">
          <Path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" />
        </ClipPath>
      </Defs>
      <G clipPath="url(#g-funnel)">
        <Path d="M0 37V11l17 13z" fill="#FBBC05" />
        <Path d="M0 11l17 13 7-6.1L48 14V0H0z" fill="#EA4335" />
        <Path d="M0 37l30-23 7.9 1L48 0v48H0z" fill="#34A853" />
        <Path d="M48 48L17 24l-4-3 35-10z" fill="#4285F4" />
      </G>
    </Svg>
  )
}
import { supabase } from '../../src/services/supabase.client'
import { stashPhotos } from '../../src/services/photo-vault'

const READY_ITEMS = [
  'Sua análise corporal completa',
  'Seu plano de treino personalizado',
  'Seu plano alimentar',
  'Sua imagem de projeção',
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

  // O OAuth do Google sai do app (redirect de página inteira). As fotos vivem só em
  // memória, então precisam ser guardadas antes — senão a pessoa volta do Google e
  // descobre que perdeu tudo, justamente no ponto mais caro do funil.
  const handleGoogle = async () => {
    const { frontPhotoUri, backPhotoUri } = useOnboardingStore.getState()
    if (!frontPhotoUri) {
      setError('Sua foto se perdeu. Tire novamente.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await stashPhotos(frontPhotoUri, backPhotoUri)

      const redirectTo = `${window.location.origin}/auth-callback?funnel=1`
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
      if (oauthError) throw oauthError
      // O navegador redireciona daqui — auth-callback devolve para /generating.
    } catch {
      setError('Não foi possível entrar com Google. Tente com e-mail e senha.')
      setSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.badge}>
          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
          <Text style={styles.badgeText}>Estamos quase lá</Text>
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
            <Text style={styles.buttonText}>Criar minha conta</Text>
          )}
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={[styles.googleButton, submitting && styles.buttonDisabled]}
          disabled={submitting}
          onPress={handleGoogle}
        >
          <GoogleIcon />
          <Text style={styles.googleButtonText}>Continuar com Google</Text>
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

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1F1F1F' },
  dividerText: { color: '#555', fontSize: 12 },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 14,
    padding: 16,
  },
  googleButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },

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
