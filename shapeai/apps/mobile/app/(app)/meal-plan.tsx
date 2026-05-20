import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Modal, Image, Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import type { MealPlan, MealItem } from '@shapeai/shared'
import {
  listMealPlans, getMealPlanById, getLatestMealPlan, generateMealPlan,
  type MealPlanSummary,
} from '../../src/services/meal-plan.service'
import { analyzeFoodImage, type FoodAnalysis } from '../../src/services/food.service'
import { getMealImage } from '../../src/constants/meal-images'

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
  const localImg = getMealImage(current.name)
  const imgSource = localImg ?? (current.image_url ? { uri: current.image_url } : null)

  return (
    <>
      <TouchableOpacity style={styles.mealCard} onPress={() => setDetailOpen(true)} activeOpacity={0.85}>
        {imgSource && (
          <Image source={imgSource} style={styles.cardImage} resizeMode="cover" />
        )}
        <View style={styles.mealHeader}>
          <View style={styles.mealTypeRow}>
            <Text style={styles.mealIcon}>{icon}</Text>
            <Text style={styles.mealType}>{current.meal_type}</Text>
          </View>
          <Text style={styles.mealCal}>{current.calories_approx} kcal</Text>
        </View>

        <Text style={styles.mealName}>{current.name}</Text>
        <Text style={styles.mealDescription} numberOfLines={2}>{current.description}</Text>

        <View style={styles.macrosRow}>
          <MacroChip label="Proteína" value={current.protein_g} unit="g" />
          <MacroChip label="Carbs" value={current.carbs_g} unit="g" />
          <MacroChip label="Gordura" value={current.fats_g} unit="g" />
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.cardFooterText}>
            {hasAlts ? `Ver detalhes · ${allOptions.length} opções` : 'Ver detalhes'}
          </Text>
          <Ionicons name="chevron-forward" size={13} color="#4CAF50" />
        </View>
      </TouchableOpacity>

      <Modal
        visible={detailOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {imgSource ? (
              <Image source={imgSource} style={styles.modalImage} resizeMode="cover" />
            ) : (
              <View style={styles.modalImagePlaceholder}>
                <Text style={{ fontSize: 44 }}>{icon}</Text>
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

              {current.preparation_method ? (
                <>
                  <Text style={styles.sectionTitle}>Modo de preparo</Text>
                  <Text style={styles.prepText}>{current.preparation_method}</Text>
                </>
              ) : null}

              <Text style={styles.sectionTitle}>Ingredientes</Text>
              <View style={styles.ingredientsList}>
                {(current.ingredients ?? []).map((ing, i) => (
                  <View key={i} style={styles.ingredientRow}>
                    <Text style={styles.ingredientBullet}>•</Text>
                    <Text style={styles.ingredientText}>{ing}</Text>
                  </View>
                ))}
              </View>

              {hasAlts && (
                <View style={styles.altSection}>
                  <Text style={styles.sectionTitle}>Outras opções</Text>
                  {allOptions.map((opt, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.altRow, i === optIdx && styles.altRowActive]}
                      onPress={() => setOptIdx(i)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.altRadio, i === optIdx && styles.altRadioActive]}>
                        {i === optIdx && <View style={styles.altRadioDot} />}
                      </View>
                      <Text style={[styles.altName, i === optIdx && styles.altNameActive]} numberOfLines={2}>
                        {opt.name}
                      </Text>
                      <Text style={styles.altCal}>{opt.calories_approx} kcal</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  )
}

function formatPlanDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function FoodScanModal({ result, onClose }: { result: FoodAnalysis; onClose: () => void }) {
  const confidenceColor = result.confidence === 'alta' ? '#4CAF50' : result.confidence === 'média' ? '#FFB300' : '#64B5F6'
  const confidenceLabel = result.confidence === 'alta' ? 'Alta precisão' : result.confidence === 'média' ? 'Precisão média' : 'Estimativa aproximada'

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={scanStyles.overlay}>
        <View style={scanStyles.sheet}>
          <View style={scanStyles.handle} />

          <View style={scanStyles.header}>
            <View style={{ flex: 1 }}>
              <Text style={scanStyles.foodName} numberOfLines={2}>{result.food_name}</Text>
              <Text style={scanStyles.portion}>{result.portion_description}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={scanStyles.closeBtn}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={scanStyles.calorieRow}>
            <Text style={scanStyles.calorieValue}>{result.calories}</Text>
            <Text style={scanStyles.calorieUnit}>kcal</Text>
          </View>

          <View style={scanStyles.macrosGrid}>
            <View style={scanStyles.macroTile}>
              <Text style={scanStyles.macroVal}>{result.protein_g}g</Text>
              <Text style={scanStyles.macroLbl}>Proteína</Text>
            </View>
            <View style={scanStyles.macroTile}>
              <Text style={scanStyles.macroVal}>{result.carbs_g}g</Text>
              <Text style={scanStyles.macroLbl}>Carboidratos</Text>
            </View>
            <View style={scanStyles.macroTile}>
              <Text style={scanStyles.macroVal}>{result.fat_g}g</Text>
              <Text style={scanStyles.macroLbl}>Gordura</Text>
            </View>
            <View style={scanStyles.macroTile}>
              <Text style={scanStyles.macroVal}>{result.fiber_g}g</Text>
              <Text style={scanStyles.macroLbl}>Fibra</Text>
            </View>
          </View>

          <View style={[scanStyles.confidencePill, { borderColor: confidenceColor + '55', backgroundColor: confidenceColor + '15' }]}>
            <View style={[scanStyles.confidenceDot, { backgroundColor: confidenceColor }]} />
            <Text style={[scanStyles.confidenceText, { color: confidenceColor }]}>{confidenceLabel}</Text>
          </View>

          <Text style={scanStyles.disclaimer}>Valores estimados por IA. Consulte um nutricionista para informações precisas.</Text>
        </View>
      </View>
    </Modal>
  )
}

export default function MealPlanScreen() {
  const insets = useSafeAreaInsets()
  const [summaries, setSummaries] = useState<MealPlanSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [plan, setPlan] = useState<MealPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [planLoading, setPlanLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<FoodAnalysis | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanModalOpen, setScanModalOpen] = useState(false)

  useEffect(() => {
    async function init() {
      try {
        const [list, latest] = await Promise.allSettled([
          listMealPlans(),
          getLatestMealPlan(),
        ])
        if (list.status === 'fulfilled') setSummaries(list.value)
        if (latest.status === 'fulfilled') {
          setPlan(latest.value)
          setSelectedId(latest.value.id ?? null)
        } else {
          const msg = (latest.reason as Error).message ?? ''
          if (!msg.includes('NOT_FOUND') && !msg.includes('404')) setError(msg)
        }
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const selectPlan = useCallback(async (id: string) => {
    if (id === selectedId) return
    setSelectedId(id)
    setPlanLoading(true)
    try {
      const p = await getMealPlanById(id)
      setPlan(p)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setPlanLoading(false)
    }
  }, [selectedId])

  const handleFoodScan = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Permita o acesso à câmera para escanear alimentos.')
      return
    }
    const picked = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      base64: true,
      allowsEditing: true,
      aspect: [4, 3],
    })
    if (picked.canceled || !picked.assets[0]?.base64) return

    setScanning(true)
    try {
      const analysis = await analyzeFoodImage(picked.assets[0].base64)
      setScanResult(analysis)
      setScanModalOpen(true)
    } catch (e) {
      Alert.alert('Erro', (e as Error).message ?? 'Não foi possível analisar a imagem.')
    } finally {
      setScanning(false)
    }
  }

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    setError(null)
    try {
      const newPlan = await generateMealPlan()
      setPlan(newPlan)
      setSelectedId(newPlan.id ?? null)
      setSummaries((prev) => {
        const entry: MealPlanSummary = { id: newPlan.id, goal: newPlan.goal, generated_at: newPlan.generated_at }
        return [entry, ...prev.filter((s) => s.id !== newPlan.id)]
      })
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
        <TouchableOpacity style={styles.scanButton} onPress={handleFoodScan} disabled={scanning} activeOpacity={0.7}>
          {scanning
            ? <ActivityIndicator size="small" color="#4CAF50" />
            : <>
                <Ionicons name="camera-outline" size={18} color="#ccc" />
                <Text style={styles.scanButtonText}>Escanear</Text>
              </>
          }
        </TouchableOpacity>
      </View>

      {scanModalOpen && scanResult && (
        <FoodScanModal result={scanResult} onClose={() => setScanModalOpen(false)} />
      )}

      {summaries.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.selectorScroll}
          contentContainerStyle={styles.selectorContent}
        >
          {summaries.map((s, i) => {
            const isActive = s.id === selectedId
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.selectorPill, isActive && styles.selectorPillActive]}
                onPress={() => selectPlan(s.id)}
                activeOpacity={0.75}
              >
                <Text style={[styles.selectorPillText, isActive && styles.selectorPillTextActive]}>
                  {i === 0 ? 'Mais recente' : formatPlanDate(s.generated_at)}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : plan ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {planLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#4CAF50" />
            </View>
          ) : (
            <>
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
                  <Text style={styles.emptyText}>Nenhuma refeição encontrada.</Text>
                </View>
              ) : (
                meals.map((meal, i) => (
                  <MealCard key={i} meal={meal} />
                ))
              )}
            </>
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
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2E2E2E',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  scanButtonText: { color: '#ccc', fontSize: 13, fontWeight: '600' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 40 },

  cardImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 12,
  },

  selectorScroll: { backgroundColor: '#0A0A0A', borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  selectorContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  selectorPill: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: '#111',
    borderWidth: 1, borderColor: '#1E1E1E',
  },
  selectorPillActive: { backgroundColor: '#1A2E1A', borderColor: '#4CAF50' },
  selectorPillText: { color: '#555', fontSize: 13, fontWeight: '600' },
  selectorPillTextActive: { color: '#4CAF50' },

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

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  cardFooterText: { flex: 1, color: '#4CAF50', fontSize: 13, fontWeight: '600' },

  macrosRow: { flexDirection: 'row', gap: 8 },
  macroChip: {
    flex: 1, backgroundColor: '#1A1A1A', borderRadius: 10,
    paddingVertical: 8, alignItems: 'center', gap: 2,
  },
  macroValue: { color: '#fff', fontSize: 14, fontWeight: '700' },
  macroLabel: { color: '#555', fontSize: 10, fontWeight: '600' },

  sectionTitle: {
    color: '#444', fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: 8, marginBottom: 6,
  },
  prepText: { color: '#888', fontSize: 13, lineHeight: 20 },

  ingredientsList: { gap: 6 },
  ingredientRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  ingredientBullet: { color: '#4CAF50', fontSize: 14, lineHeight: 20 },
  ingredientText: { flex: 1, color: '#888', fontSize: 13, lineHeight: 20 },

  altSection: { gap: 8 },
  altRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1A1A1A', borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: '#242424',
  },
  altRowActive: { borderColor: '#4CAF50', backgroundColor: '#0E1E0E' },
  altRadio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: '#333',
    alignItems: 'center', justifyContent: 'center',
  },
  altRadioActive: { borderColor: '#4CAF50' },
  altRadioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50' },
  altName: { flex: 1, color: '#888', fontSize: 13, lineHeight: 18 },
  altNameActive: { color: '#fff', fontWeight: '600' },
  altCal: { color: '#555', fontSize: 12, fontWeight: '600' },

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
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#111',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    overflow: 'hidden',
    maxHeight: '92%',
  },
  modalImage: { width: '100%', height: 220 },
  modalImagePlaceholder: {
    width: '100%', height: 160,
    backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center',
  },
  modalClose: {
    position: 'absolute', top: 14, right: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 16, width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  modalContent: { padding: 20, gap: 12, paddingBottom: 44 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '800', lineHeight: 26 },
})

const scanStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#2A2A2A',
    alignSelf: 'center',
    marginBottom: 4,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  foodName: { color: '#fff', fontSize: 20, fontWeight: '800', lineHeight: 26, flex: 1 },
  portion: { color: '#555', fontSize: 13, marginTop: 4 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center',
  },
  calorieRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  calorieValue: { color: '#4CAF50', fontSize: 52, fontWeight: '900', lineHeight: 56 },
  calorieUnit: { color: '#4CAF50', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  macrosGrid: {
    flexDirection: 'row',
    backgroundColor: '#0F0F0F',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    overflow: 'hidden',
  },
  macroTile: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderRightWidth: 1, borderRightColor: '#1A1A1A',
  },
  macroVal: { color: '#fff', fontSize: 16, fontWeight: '800' },
  macroLbl: { color: '#555', fontSize: 10, fontWeight: '600', marginTop: 3 },
  confidencePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  confidenceDot: { width: 6, height: 6, borderRadius: 3 },
  confidenceText: { fontSize: 12, fontWeight: '600' },
  disclaimer: { color: '#333', fontSize: 11, lineHeight: 16 },
})
