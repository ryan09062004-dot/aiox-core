import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import type { MealPlan, MealItem } from '@shapeai/shared'
import { getLatestMealPlan, generateMealPlan } from '../../src/services/meal-plan.service'
import { PHOTO_TIP_STORAGE_KEY } from './photo-tip'

const MEAL_ICONS: Record<string, string> = {
  'Café da Manhã': '☀️',
  'Lanche da Manhã': '🥗',
  'Almoço': '🍽️',
  'Lanche da Tarde': '🥤',
  'Jantar': '🌙',
}

function MacroChip({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <View style={styles.macroChip}>
      <Text style={styles.macroValue}>{value}{unit}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  )
}

function MealCard({ meal }: { meal: MealItem }) {
  const [expanded, setExpanded] = useState(false)
  const icon = MEAL_ICONS[meal.meal_type] ?? '🍴'

  return (
    <View style={styles.mealCard}>
      <View style={styles.mealHeader}>
        <View style={styles.mealTypeRow}>
          <Text style={styles.mealIcon}>{icon}</Text>
          <Text style={styles.mealType}>{meal.meal_type}</Text>
        </View>
        <Text style={styles.mealCal}>{meal.calories_approx} kcal</Text>
      </View>

      <Text style={styles.mealName}>{meal.name}</Text>
      <Text style={styles.mealDescription}>{meal.description}</Text>

      <View style={styles.macrosRow}>
        <MacroChip label="Proteína" value={meal.protein_g} unit="g" />
        <MacroChip label="Carbs" value={meal.carbs_g} unit="g" />
        <MacroChip label="Gordura" value={meal.fats_g} unit="g" />
      </View>

      <TouchableOpacity
        style={styles.ingredientsToggle}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <Text style={styles.ingredientsToggleText}>
          {expanded ? '▲ Ocultar ingredientes' : '▼ Ver ingredientes'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.ingredientsList}>
          {meal.ingredients.map((ing, i) => (
            <View key={i} style={styles.ingredientRow}>
              <Text style={styles.ingredientBullet}>•</Text>
              <Text style={styles.ingredientText}>{ing}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

export default function MealPlanScreen() {
  const insets = useSafeAreaInsets()
  const [plan, setPlan] = useState<MealPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getLatestMealPlan()
      .then(setPlan)
      .catch((err: Error) => {
        if (!err.message.includes('NOT_FOUND') && !err.message.includes('404')) {
          setError(err.message)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    setError(null)
    try {
      const newPlan = await generateMealPlan()
      setPlan(newPlan)
    } catch (err: unknown) {
      const e = err as Error
      if (e.message === 'SUBSCRIPTION_REQUIRED' || e.message.includes('402')) {
        router.push('/(app)/paywall')
        return
      }
      setError(e.message ?? 'Erro ao gerar plano alimentar.')
    } finally {
      setGenerating(false)
    }
  }, [])

  const totalCal = plan?.meals.reduce((s, m) => s + m.calories_approx, 0) ?? 0
  const totalProt = plan?.meals.reduce((s, m) => s + m.protein_g, 0) ?? 0
  const totalCarbs = plan?.meals.reduce((s, m) => s + m.carbs_g, 0) ?? 0
  const totalFat = plan?.meals.reduce((s, m) => s + m.fats_g, 0) ?? 0

  async function goToAnalysis() {
    const skip = await AsyncStorage.getItem(PHOTO_TIP_STORAGE_KEY)
    router.push((skip === 'true' ? '/(app)/camera' : '/(app)/photo-tip') as never)
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Nutrição</Text>
        {plan && (
          <TouchableOpacity onPress={handleGenerate} disabled={generating || loading}>
            <View style={styles.regenRow}>
              <Ionicons name="refresh-outline" size={14} color={generating || loading ? '#333' : '#4CAF50'} />
              <Text style={[styles.regenBtn, (generating || loading) && styles.regenBtnDisabled]}>
                {generating ? 'Gerando...' : 'Atualizar'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : plan ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Total do Dia</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{totalCal}</Text>
                <Text style={styles.summaryLabel}>kcal</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{totalProt}g</Text>
                <Text style={styles.summaryLabel}>Proteína</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{totalCarbs}g</Text>
                <Text style={styles.summaryLabel}>Carbs</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{totalFat}g</Text>
                <Text style={styles.summaryLabel}>Gordura</Text>
              </View>
            </View>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {plan.meals.map((meal, i) => (
            <MealCard key={i} meal={meal} />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.center}>
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <>
              <Ionicons name="restaurant-outline" size={56} color="#2a2a2a" />
              <Text style={styles.emptyTitle}>Sem plano alimentar</Text>
              <Text style={styles.emptyText}>
                Gere um plano com 5 refeições diárias personalizadas por IA para o seu objetivo.
              </Text>
              <TouchableOpacity
                style={styles.generateBtn}
                onPress={handleGenerate}
                disabled={generating}
                activeOpacity={0.85}
              >
                {generating ? (
                  <ActivityIndicator size="small" color="#0A0A0A" />
                ) : (
                  <Text style={styles.generateBtnText}>Gerar plano alimentar</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.analysisBtn}
                onPress={goToAnalysis}
                activeOpacity={0.8}
              >
                <Ionicons name="scan-outline" size={16} color="#4CAF50" />
                <Text style={styles.analysisBtnText}>Fazer uma avaliação primeiro</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
    backgroundColor: '#111',
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  regenRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  regenBtn: { color: '#4CAF50', fontSize: 14, fontWeight: '600' },
  regenBtnDisabled: { color: '#333' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 40 },

  summaryCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    gap: 12,
  },
  summaryTitle: { color: '#444', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 3 },
  summaryDivider: { width: 1, height: 36, backgroundColor: '#1E1E1E' },
  summaryValue: { color: '#fff', fontSize: 18, fontWeight: '800' },
  summaryLabel: { color: '#555', fontSize: 11, fontWeight: '600' },

  mealCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    gap: 10,
  },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mealIcon: { fontSize: 16 },
  mealType: { color: '#4CAF50', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  mealCal: { color: '#555', fontSize: 12, fontWeight: '600' },
  mealName: { color: '#fff', fontSize: 17, fontWeight: '700', lineHeight: 22 },
  mealDescription: { color: '#666', fontSize: 13, lineHeight: 18 },

  macrosRow: { flexDirection: 'row', gap: 8 },
  macroChip: {
    flex: 1, backgroundColor: '#1A1A1A', borderRadius: 10,
    paddingVertical: 8, alignItems: 'center', gap: 2,
  },
  macroValue: { color: '#fff', fontSize: 14, fontWeight: '700' },
  macroLabel: { color: '#555', fontSize: 10, fontWeight: '600' },

  ingredientsToggle: { paddingTop: 2 },
  ingredientsToggleText: { color: '#4CAF50', fontSize: 13, fontWeight: '600' },

  ingredientsList: { gap: 5, paddingTop: 4 },
  ingredientRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  ingredientBullet: { color: '#4CAF50', fontSize: 14, lineHeight: 20 },
  ingredientText: { flex: 1, color: '#888', fontSize: 13, lineHeight: 20 },

  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  emptyText: { color: '#666', fontSize: 14, textAlign: 'center', lineHeight: 22, maxWidth: 280 },
  generateBtn: {
    backgroundColor: '#4CAF50', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 28,
    alignItems: 'center', justifyContent: 'center',
    minWidth: 220,
  },
  generateBtnText: { color: '#0A0A0A', fontSize: 15, fontWeight: '700' },
  analysisBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    minWidth: 220,
    justifyContent: 'center',
  },
  analysisBtnText: { color: '#4CAF50', fontSize: 14, fontWeight: '600' },
  errorText: { color: '#EF5350', fontSize: 14, textAlign: 'center' },
})
