import { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../src/stores/auth.store'
import { useOnboardingStore } from '../../src/stores/onboarding.store'
import { createUserProfile, updateUserProfile } from '../../src/services/profile.service'
import {
  startAnalysis,
  uploadPhoto,
  triggerProcessing,
  pollAnalysis,
} from '../../src/services/analysis.service'
import { claimPhotos } from '../../src/services/photo-vault'

// Cada etapa é um passo real do pipeline. O tempo é estimado, mas a barra só chega
// ao fim quando o backend confirma — nada aqui é puramente decorativo.
const STAGES = [
  'Enviando sua foto com segurança…',
  'Analisando sua composição corporal…',
  'Calculando seus scores musculares…',
  'Montando seu plano de treino…',
  'Calculando seus macros e sua dieta…',
  'Gerando sua projeção visual…',
]

// 6 etapas × 6s = 36s, calibrado pelo tempo real medido do pipeline. A barra chega ao
// fim junto com a análise ficando pronta, em vez de travar no 100% esperando.
const STAGE_MS = 6000

export default function GeneratingScreen() {
  const session = useAuthStore((s) => s.session)
  const { answers, frontPhotoUri, backPhotoUri, clear } = useOnboardingStore()
  const [stage, setStage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)
  const progress = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: STAGES.length * STAGE_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start()

    const interval = setInterval(() => {
      setStage((s) => (s < STAGES.length - 1 ? s + 1 : s))
    }, STAGE_MS)

    return () => clearInterval(interval)
  }, [progress])

  useEffect(() => {
    // Espera a sessão do signup propagar antes de chamar as rotas autenticadas.
    if (!session || started.current) return
    started.current = true

    const run = async () => {
      const { sex, goal, height_cm, weight_kg } = answers

      // Quem entrou com Google saiu do app durante o OAuth e perdeu as fotos da memória.
      // Elas ficaram no cofre (IndexedDB) — recupera aqui. claimPhotos apaga na leitura.
      let front = frontPhotoUri
      let back = backPhotoUri
      if (!front) {
        const vaulted = await claimPhotos()
        if (vaulted) {
          front = vaulted.front
          back = vaulted.back
        }
      }

      if (!sex || !goal || !height_cm || !weight_kg || !front) {
        setError('Perdemos seus dados. Refaça o questionário — leva menos de um minuto.')
        return
      }

      try {
        // Quem entra com Google pode já ter conta e perfil — nesse caso o POST falha e
        // as respostas do quiz entram como atualização.
        const profileData = {
          biological_sex: sex,
          primary_goal: goal,
          height_cm,
          weight_kg,
        }
        await createUserProfile(profileData).catch(() => updateUserProfile(profileData))

        const { analysis_id, upload_urls } = await startAnalysis()

        const uploads = [uploadPhoto(upload_urls.front, front)]
        if (back) uploads.push(uploadPhoto(upload_urls.back, back))
        await Promise.all(uploads)

        await triggerProcessing(analysis_id, { has_back: !!back })

        // Espera a análise ficar pronta AQUI e vai direto ao relatório. Antes esta tela
        // redirecionava logo após o 202, e quem esperava de fato era a tela analysis/[id]
        // — a pessoa via duas telas de carregamento em sequência.
        const result = await pollAnalysis(analysis_id)
        if (result.status === 'failed') {
          setError('Não conseguimos ler sua foto. Tente de novo com boa luz e o corpo inteiro visível.')
          return
        }

        clear()
        router.replace(`/(app)/analysis/${analysis_id}/report`)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Falha ao gerar sua análise.')
      }
    }

    run()
  }, [session, answers, frontPhotoUri, backPhotoUri, clear])

  if (error) {
    return (
      <View style={styles.container}>
        <Ionicons name="alert-circle-outline" size={48} color="#E57373" />
        <Text style={styles.errorTitle}>Não conseguimos gerar sua análise</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/(public)/quiz')}>
          <Text style={styles.buttonText}>Tentar de novo</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['4%', '96%'] })

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Montando seu plano</Text>
      <Text style={styles.subtitle}>Isso leva menos de um minuto. Não feche o app.</Text>

      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width }]} />
      </View>

      <View style={styles.stages}>
        {STAGES.map((label, i) => (
          <View key={label} style={styles.stageRow}>
            <Ionicons
              name={i < stage ? 'checkmark-circle' : i === stage ? 'ellipse' : 'ellipse-outline'}
              size={16}
              color={i <= stage ? '#4CAF50' : '#333'}
            />
            <Text style={[styles.stageText, i <= stage && styles.stageTextActive]}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  title: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  subtitle: { color: '#888', fontSize: 14, marginBottom: 16 },

  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1F1F1F',
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: '#4CAF50' },

  stages: { gap: 14 },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stageText: { color: '#444', fontSize: 14, flex: 1 },
  stageTextActive: { color: '#ddd' },

  errorTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 8 },
  errorText: { color: '#888', fontSize: 14, lineHeight: 20, marginBottom: 12 },
  button: {
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
