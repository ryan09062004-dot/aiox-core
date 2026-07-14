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
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useOnboardingStore, type Goal, type Sex } from '../../src/stores/onboarding.store'

const TOTAL_STEPS = 4

const GOAL_OPTIONS: { value: Goal; label: string; description: string }[] = [
  { value: 'hypertrophy', label: 'Hipertrofia', description: 'Ganho de massa muscular' },
  { value: 'fat_loss', label: 'Emagrecimento', description: 'Redução de gordura corporal' },
  { value: 'conditioning', label: 'Condicionamento', description: 'Saúde e performance geral' },
]

const PRIVACY_POINTS = [
  {
    icon: 'lock-closed' as const,
    title: 'Só você vê sua foto',
    text: 'Ela é usada exclusivamente para gerar a sua análise. Nunca é publicada, compartilhada ou mostrada a outra pessoa.',
  },
  {
    icon: 'trash' as const,
    title: 'Apagada após a análise',
    text: 'Assim que seu relatório fica pronto, a foto é removida dos nossos servidores.',
  },
  {
    icon: 'shield-checkmark' as const,
    title: 'Nunca usada para treinar IA',
    text: 'Sua imagem não alimenta nenhum modelo e não é vendida a terceiros.',
  },
]

export default function QuizScreen() {
  const { answers, setAnswer } = useOnboardingStore()
  const [step, setStep] = useState(0)
  const [height, setHeight] = useState(answers.height_cm ? String(answers.height_cm) : '')
  const [weight, setWeight] = useState(answers.weight_kg ? String(answers.weight_kg) : '')
  const [measureError, setMeasureError] = useState<string | null>(null)

  const goBack = () => (step === 0 ? router.replace('/(auth)/login') : setStep(step - 1))

  const handleSex = (value: Sex) => {
    setAnswer('sex', value)
    setStep(1)
  }

  const handleGoal = (value: Goal) => {
    setAnswer('goal', value)
    setStep(2)
  }

  const handleMeasures = () => {
    const h = parseFloat(height)
    const w = parseFloat(weight)
    if (!h || h < 100 || h > 250) {
      setMeasureError('Informe sua altura em cm (entre 100 e 250).')
      return
    }
    if (!w || w < 30 || w > 300) {
      setMeasureError('Informe seu peso em kg (entre 30 e 300).')
      return
    }
    setMeasureError(null)
    setAnswer('height_cm', h)
    setAnswer('weight_kg', w)
    setStep(3)
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack} accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((step + 1) / TOTAL_STEPS) * 100}%` }]} />
        </View>
        <Text style={styles.progressLabel}>
          {step + 1}/{TOTAL_STEPS}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <View style={styles.step}>
            <Text style={styles.title}>Qual é o seu sexo biológico?</Text>
            <Text style={styles.subtitle}>Usamos para calibrar sua análise corporal</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.optionCard, answers.sex === 'M' && styles.optionCardSelected]}
                onPress={() => handleSex('M')}
              >
                <Text style={styles.optionEmoji}>♂️</Text>
                <Text style={styles.optionLabel}>Masculino</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionCard, answers.sex === 'F' && styles.optionCardSelected]}
                onPress={() => handleSex('F')}
              >
                <Text style={styles.optionEmoji}>♀️</Text>
                <Text style={styles.optionLabel}>Feminino</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={styles.step}>
            <Text style={styles.title}>Qual é o seu objetivo?</Text>
            <Text style={styles.subtitle}>Seu treino e sua dieta serão montados para isso</Text>
            {GOAL_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.goalCard, answers.goal === opt.value && styles.goalCardSelected]}
                onPress={() => handleGoal(opt.value)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.goalLabel}>{opt.label}</Text>
                  <Text style={styles.goalDescription}>{opt.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#555" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 2 && (
          <View style={styles.step}>
            <Text style={styles.title}>Suas medidas</Text>
            <Text style={styles.subtitle}>Deixa sua avaliação mais precisa</Text>
            <Text style={styles.label}>Altura (cm)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 175"
              placeholderTextColor="#666"
              value={height}
              onChangeText={setHeight}
              keyboardType="numeric"
              maxLength={3}
            />
            <Text style={styles.label}>Peso (kg)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 70"
              placeholderTextColor="#666"
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              maxLength={5}
            />
            {measureError && <Text style={styles.error}>{measureError}</Text>}
            <TouchableOpacity style={styles.button} onPress={handleMeasures}>
              <Text style={styles.buttonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View style={styles.step}>
            <Text style={styles.title}>Agora a parte que faz a diferença</Text>
            <Text style={styles.subtitle}>
              É a sua foto que transforma isso numa análise de verdade — e não em mais uma
              calculadora genérica.
            </Text>

            <View style={styles.privacyBox}>
              {PRIVACY_POINTS.map((point) => (
                <View key={point.title} style={styles.privacyItem}>
                  <View style={styles.privacyIcon}>
                    <Ionicons name={point.icon} size={16} color="#4CAF50" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.privacyTitle}>{point.title}</Text>
                    <Text style={styles.privacyText}>{point.text}</Text>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.button} onPress={() => router.push('/(public)/capture')}>
              <Ionicons name="camera" size={18} color="#fff" />
              <Text style={styles.buttonText}>Tirar minha foto</Text>
            </TouchableOpacity>
            <Text style={styles.legal}>
              Ao continuar você concorda com nossa Política de Privacidade.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1F1F1F',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: '#4CAF50' },
  progressLabel: { color: '#666', fontSize: 12, fontWeight: '600' },

  body: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 48 },
  step: { gap: 14 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#888', lineHeight: 20, marginBottom: 8 },

  row: { flexDirection: 'row', gap: 12 },
  optionCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: { borderColor: '#4CAF50' },
  optionEmoji: { fontSize: 32 },
  optionLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },

  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  goalCardSelected: { borderColor: '#4CAF50' },
  goalLabel: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 2 },
  goalDescription: { color: '#888', fontSize: 13 },

  label: { color: '#aaa', fontSize: 13 },
  input: {
    backgroundColor: '#1A1A1A',
    color: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  error: { color: '#E57373', fontSize: 13 },

  privacyBox: {
    backgroundColor: '#121212',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    padding: 18,
    gap: 16,
    marginVertical: 4,
  },
  privacyItem: { flexDirection: 'row', gap: 12 },
  privacyIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(76,175,80,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  privacyTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  privacyText: { color: '#888', fontSize: 13, lineHeight: 18 },

  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    padding: 18,
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  legal: { color: '#555', fontSize: 11, textAlign: 'center', marginTop: 4 },
})
