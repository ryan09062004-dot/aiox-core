import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Modal, Image,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import type { MealPlan, MealItem } from '@shapeai/shared'
import { getLatestMealPlan, generateMealPlan } from '../../src/services/meal-plan.service'

const MEAL_ICONS: Record<string, string> = {
  'Café da Manhã': '☀️',
  'Almoço': '🍽️',
  'Lanche da Tarde': '🥤',
  'Jantar': '🍴',
  'Ceia': '🌙',
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
  const allOptions = [meal, ...(meal.alternatives ?? [])]
  const [optIdx, setOptIdx] = useState(0)
  const [detailOpen, setDetailOpen] = useState(false)
  const current = allOptions[optIdx] ?? meal
  const icon = MEAL_ICONS[current.meal_type] ?? '🍴'
  const hasAlts = allOptions.length > 1

  const handleSwap = () => setOptIdx(i => (i + 1) % allOptions.length)

  return (
    <>
      <TouchableOpacity style={styles.mealCard} onPress={() => setDetailOpen(true)} activeOpacity={0.88}>
        <View style={styles.mealHeader}>
          <View style={styles.mealTypeRow}>
            <Text style={styles.mealIcon}>{icon}</Text>
            <Text style={styles.mealType}>{current.meal_type}</Text>
          </View>
          <Text style={styles.mealCal}>{current.calories_approx} kcal</Text>
        </View>

        <Text style={styles.mealName}>{current.name}</Text>
        <Text style={styles.mealDescription}>{current.description}</Text>

        <View style={styles.macrosRow}>
          <MacroChip label="Proteína" value={current.protein_g} unit="g" />
          <MacroChip label="Carbs" value={current.carbs_g} unit="g" />
          <MacroChip label="Gordura" value={current.fats_g} unit="g" />
        </View>

        {hasAlts && (
          <TouchableOpacity onPress={handleSwap} style={styles.swapPill} activeOpacity={0.7}>
            <Ionicons name="shuffle-outline" size={13} color="#4CAF50" />
            <Text style={styles.swapPillText}>Outra opção · {optIdx + 1}/{allOptions.length}</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      <Modal
        visible={detailOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {current.image_url ? (
              <Image source={{ uri: current.image_url }} style={styles.modalImage} resizeMode="cover" />
            ) : (
              <View style={styles.modalImagePlaceholder}>
                <Text style={{ fontSize: 40 }}>{icon}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.modalClose} onPress={() => setDetailOpen(false)} activeOpacity={0.8}>
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.mealHeader}>
                <View style={styles.mealTypeRow}>
                  <Text style={styles.mealIcon}>{icon}</Text>
                  <Text style={styles.mealType}>{current.meal_type}</Text>
                </View>
                <Text style={styles.mealCal}>{current.calories_approx} kcal</Text>
              </View>

              <Text style={styles.modalTitle}>{current.name}</Text>
              <Text style={styles.mealDescription}>{current.description}</Text>

              <View style={styles.macrosRow}>
                <MacroChip label="Proteína" value={current.protein_g} unit="g" />
                <MacroChip label="Carbs" value={current.carbs_g} unit="g" />
                <MacroChip label="Gordura" value={current.fats_g} unit="g" />
              </View>

              <Text style={styles.ingredientsTitle}>Ingredientes</Text>
              <View style={styles.ingredientsList}>
                {(current.ingredients ?? []).map((ing, i) => (
                  <View key={i} style={styles.ingredientRow}>
                    <Text style={styles.ingredientBullet}>•</Text>
                    <Text style={styles.ingredientText}>{ing}</Text>
                  </View>
                ))}
              </View>

              {hasAlts && (
                <TouchableOpacity
                  onPress={handleSwap}
                  style={[styles.swapPill, { alignSelf: 'center', marginTop: 8 }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="shuffle-outline" size={13} color="#4CAF50" />
                  <Text style={styles.swapPillText}>Outra opção · {optIdx + 1}/{allOptions.length}</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
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

  const meals: MealItem[] = Array.isArray(plan?.meals) ? plan.meals : []
  const totalCal = meals.reduce((s, m) => s + (m.calories_approx ?? 0), 0)
  const totalProt = meals.reduce((s, m) => s + (m.protein_g ?? 0), 0)
  const totalCarbs = meals.reduce((s, m) => s + (m.carbs_g ?? 0), 0)
  const totalFat = meals.reduce((s, m) => s + (m.fats_g ?? 0), 0)

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Nutrição</Text>
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

          {meals.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyText}>Nenhuma refeição encontrada. Toque em Atualizar.</Text>
            </View>
          ) : (
            meals.map((meal, i) => (
              <MealCard key={i} meal={meal} />
            ))
          )}
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <Ionicons name="restaurant-outline" size={56} color="#2a2a2a" />
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <>
              <Text style={styles.emptyTitle}>Sem plano alimentar</Text>
              <Text style={styles.emptyText}>Gere seu plano com 5 refeições diárias personalizadas.</Text>
            </>
          )}
          <TouchableOpacity
            style={styles.generateBtn}
            onPress={handleGenerate}
            disabled={generating}
            activeOpacity={0.85}
          >
            {generating
              ? <ActivityIndicator size="small" color="#0A0A0A" />
              : <Text style={styles.generateBtnText}>{error ? 'Tentar novamente' : 'Gerar plano alimentar'}</Text>
            }
          </TouchableOpacity>
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
  swapPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#0E1E0E', borderRadius: 20,
    borderWidth: 1, borderColor: '#254025',
    paddingVertical: 6, paddingHorizontal: 12,
  },
  swapPillText: { color: '#4CAF50', fontSize: 12, fontWeight: '600' },
  mealName: { color: '#fff', fontSize: 17, fontWeight: '700', lineHeight: 22 },
  mealDescription: { color: '#666', fontSize: 13, lineHeight: 18 },

  macrosRow: { flexDirection: 'row', gap: 8 },
  macroChip: {
    flex: 1, backgroundColor: '#1A1A1A', borderRadius: 10,
    paddingVertical: 8, alignItems: 'center', gap: 2,
  },
  macroValue: { color: '#fff', fontSize: 14, fontWeight: '700' },
  macroLabel: { color: '#555', fontSize: 10, fontWeight: '600' },

  ingredientsTitle: { color: '#444', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 6 },

  ingredientsList: { gap: 6 },
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
  errorText: { color: '#EF5350', fontSize: 14, textAlign: 'center' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#111',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  modalImage: {
    width: '100%', height: 220,
  },
  modalImagePlaceholder: {
    width: '100%', height: 160,
    backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center',
  },
  modalClose: {
    position: 'absolute', top: 14, right: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16, width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  modalContent: { padding: 20, gap: 12, paddingBottom: 40 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '800', lineHeight: 26 },
})
