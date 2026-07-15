import { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image, ScrollView, TextInput, Share, Animated, Easing,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as ImagePicker from 'expo-image-picker'
import Svg, { Circle, Rect, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuthStore } from '../../src/stores/auth.store'
import { PHOTO_TIP_STORAGE_KEY } from './photo-tip'
import { WorkoutShareCard } from '../../src/components/workout/WorkoutShareCard'
import { getUserProfile } from '../../src/services/profile.service'
import { BlurView } from 'expo-blur'
import MaskedView from '@react-native-masked-view/masked-view'
import { listAnalyses, getAnalysisResult } from '../../src/services/analysis.service'
import { useSubscription } from '../../src/hooks/useSubscription'
import { GOAL_LABEL, getScoreColor } from '@shapeai/shared'
import type { AnalysisSummary, WorkoutSession, PrimaryGoal } from '@shapeai/shared'

// ─── Frases motivacionais ─────────────────────────────────────────────────────

const QUOTES: string[] = [
  'Consistência bate motivação todo dia.',
  'Seu único concorrente é quem você era ontem.',
  'Progresso, não perfeição.',
  'Todo grande shape começou com o primeiro treino.',
  'Dor de hoje, resultado de amanhã.',
  'Disciplina é a ponte entre metas e conquistas.',
  'O corpo alcança o que a mente acredita.',
  'Cada repetição te aproxima da melhor versão de você.',
  'Não pare quando estiver cansado. Pare quando terminar.',
  'Força não vem do que você consegue fazer. Vem de superar o que achava impossível.',
  'Comece devagar. Só não pare.',
  'O shape dos seus sonhos exige o esforço que outros evitam.',
  'Treinar é um presente que você dá ao seu futuro.',
  'Resultados não mentem. Desculpas não treinam.',
  'Cada dia é uma nova chance de ser melhor.',
  'Seu shape é construído fora da zona de conforto.',
  'Quem treina hoje, descansa com orgulho amanhã.',
  'Foco, fé e ferro.',
  'Um treino ruim ainda é melhor que nenhum.',
  'Você já chegou até aqui. Não para agora.',
]

const QUOTE_GRADIENTS: [string, string][] = [
  ['#0D1B0D', '#1B3A1B'],
  ['#0D1520', '#0A2540'],
  ['#1A0D00', '#3A1A00'],
  ['#0D0D1A', '#1A1A3A'],
  ['#1A0010', '#3A0020'],
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function getDailyQuote() {
  const now = new Date()
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000)
  const text = QUOTES[dayOfYear % QUOTES.length]
  const gradient = QUOTE_GRADIENTS[dayOfYear % QUOTE_GRADIENTS.length]
  return { text, gradient }
}

function DailyQuoteCard() {
  const { text, gradient } = getDailyQuote()

  function handleShare() {
    Share.share({ message: `"${text}" — ShapeAI` })
  }

  return (
    <LinearGradient
      colors={[gradient[0], gradient[1], '#0A0A0A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={qStyles.card}
    >
      <Text style={qStyles.label}>Motivação do dia</Text>
      <Text style={qStyles.quoteText}>"{text}"</Text>
      <View style={qStyles.footer}>
        <TouchableOpacity style={qStyles.shareBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={13} color="#aaa" />
          <Text style={qStyles.shareBtnText}>Compartilhar</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const JS_DAY_TO_NAME: Record<number, string> = {
  1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta',
}
const DAY_NAMES: Record<string, string> = {
  '1': 'Segunda', '2': 'Terça', '3': 'Quarta', '4': 'Quinta', '5': 'Sexta',
}
function normalizeDay(d: string) { return DAY_NAMES[d] ?? d }
function storageKey(id: string) { return `workout_progress_${id}` }
function sessionKey(w: number, d: string) { return `${w}_${d}` }
function elapsedWeek(completedAt: string, total: number) {
  const days = Math.floor((Date.now() - new Date(completedAt).getTime()) / 86_400_000)
  return Math.min(Math.max(Math.floor(days / 7), 0), total - 1)
}
function estimateDuration(exercises: WorkoutSession['exercises']): number {
  const secs = exercises.reduce((acc, ex) => acc + ex.sets * (45 + ex.rest_seconds), 0)
  return Math.round(secs / 60)
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
function todayFullDate() {
  const s = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

type TodayWorkout =
  | { kind: 'rest' | 'none' }
  | { kind: 'session'; session: WorkoutSession; weekNumber: number; analysisId: string; isCompleted: boolean }

// ─── Circular progress ───────────────────────────────────────────────────────

function Ring({ pct, size = 56 }: { pct: number; size?: number }) {
  const R = size / 2 - 5
  const C = 2 * Math.PI * R
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={R} stroke="#1E1E1E" strokeWidth={5} fill="none" />
      <Circle
        cx={size / 2} cy={size / 2} r={R}
        stroke="#4CAF50" strokeWidth={5} fill="none"
        strokeDasharray={`${(pct / 100) * C} ${C}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  )
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const { isPro } = useSubscription()
  const { session, isGuest } = useAuthStore()
  const [goal, setGoal] = useState<PrimaryGoal | null>(null)
  const [weight, setWeight] = useState<number | null>(null)
  const [lastAnalysis, setLastAnalysis] = useState<AnalysisSummary | null | undefined>(undefined)
  const [futureSelfUrl, setFutureSelfUrl] = useState<string | null>(null)
  const [todayWorkout, setTodayWorkout] = useState<TodayWorkout | null>(null)
  const [planPct, setPlanPct] = useState(0)
  const [avatarUri, setAvatarUri] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [shareVisible, setShareVisible] = useState(false)
  const [planTotalWeeks, setPlanTotalWeeks] = useState(4)
  const [weekProgress, setWeekProgress] = useState<{ day: string; done: boolean; isToday: boolean }[]>([])
  const sweepAnim = useRef(new Animated.Value(-160)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(4000),
        Animated.timing(sweepAnim, { toValue: 400, duration: 1800, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(sweepAnim, { toValue: -160, duration: 0, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  useEffect(() => {
    async function loadAvatar() {
      const [stored, storedName] = await Promise.all([
        AsyncStorage.getItem('user_avatar_uri'),
        AsyncStorage.getItem('user_display_name'),
      ])
      if (stored) setAvatarUri(stored)
      else {
        const oauthAvatar = session?.user?.user_metadata?.avatar_url as string | undefined
        if (oauthAvatar) setAvatarUri(oauthAvatar)
      }
      if (storedName) setDisplayName(storedName)
    }
    loadAvatar()
  }, [session])

  async function saveName() {
    const trimmed = nameInput.trim()
    if (trimmed) {
      await AsyncStorage.setItem('user_display_name', trimmed)
      setDisplayName(trimmed)
    }
    setEditingName(false)
  }

  function startEditingName(currentName: string) {
    setNameInput(currentName)
    setEditingName(true)
  }

  async function pickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') return
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri
      await AsyncStorage.setItem('user_avatar_uri', uri)
      setAvatarUri(uri)
    }
  }

  useFocusEffect(useCallback(() => {
    async function load() {
      // Profile + análises em paralelo
      const [profileRes, analysesRes] = await Promise.allSettled([
        getUserProfile(),
        listAnalyses(1),
      ])

      if (profileRes.status === 'fulfilled') {
        setGoal(profileRes.value.primary_goal)
        setWeight(profileRes.value.weight_kg ?? null)
      } else {
        const msg = (profileRes.reason as Error).message ?? ''
        if ((msg.includes('404') || msg.includes('not found')) && !isGuest) {
          router.replace('/(app)/onboarding')
          return
        }
      }

      if (analysesRes.status === 'rejected') { setLastAnalysis(null); return }
      const last = analysesRes.value.analyses.find(a => a.status === 'completed') ?? null
      setLastAnalysis(last)
      if (!last) return

      const result = await getAnalysisResult(last.id)
      setFutureSelfUrl(result.future_self_url ?? null)
      const weeks = result.workout_plan.weeks as any[]
      setPlanTotalWeeks(weeks.length)
      const raw = await AsyncStorage.getItem(storageKey(last.id))
      const completedArr: string[] = raw ? JSON.parse(raw) : []
      const completedSet = new Set(completedArr)

      const total = weeks.reduce((s: number, w: any) => s + w.sessions.length, 0)
      setPlanPct(total > 0 ? Math.round((completedArr.length / total) * 100) : 0)

      const jsDay = new Date().getDay()
      const todayName = JS_DAY_TO_NAME[jsDay]

      // Progresso da semana: cada dia de treino do plano-semana atual vira um círculo,
      // com check nos concluídos e destaque no dia de hoje.
      const week = weeks[elapsedWeek(last.completed_at!, weeks.length)]
      setWeekProgress(
        (week?.sessions ?? []).map((sess: WorkoutSession) => {
          const dayName = normalizeDay(sess.day)
          return {
            day: dayName,
            done: completedSet.has(sessionKey(week.week_number, sess.day)),
            isToday: dayName === todayName,
          }
        })
      )

      if (!todayName) { setTodayWorkout({ kind: 'rest' }); return }

      const s = week?.sessions.find((s: WorkoutSession) => normalizeDay(s.day) === todayName) as WorkoutSession | undefined
      if (!s) { setTodayWorkout({ kind: 'rest' }); return }

      setTodayWorkout({
        kind: 'session',
        session: s,
        weekNumber: week.week_number,
        analysisId: last.id,
        isCompleted: completedSet.has(sessionKey(week.week_number, s.day)),
      })
    }

    load().catch(() => setLastAnalysis(null))
  }, []))

  async function toggleTodaySession() {
    if (todayWorkout?.kind !== 'session') return
    const { analysisId, weekNumber, session: s, isCompleted } = todayWorkout
    const key = sessionKey(weekNumber, s.day)
    const raw = await AsyncStorage.getItem(storageKey(analysisId))
    const set = new Set<string>(raw ? JSON.parse(raw) : [])
    isCompleted ? set.delete(key) : set.add(key)
    await AsyncStorage.setItem(storageKey(analysisId), JSON.stringify([...set]))
    const result = await getAnalysisResult(analysisId)
    const weeks = result.workout_plan.weeks as any[]
    const total = weeks.reduce((acc: number, w: any) => acc + w.sessions.length, 0)
    setPlanPct(total > 0 ? Math.round((set.size / total) * 100) : 0)
    setTodayWorkout({ ...todayWorkout, isCompleted: !isCompleted })
    setWeekProgress((prev) => prev.map((d) => (d.isToday ? { ...d, done: !isCompleted } : d)))
  }

  const name = displayName ?? session?.user?.email?.split('@')[0] ?? 'atleta'
  const initial = name.charAt(0).toUpperCase()
  const score = lastAnalysis?.scores?.overall_score ?? null
  const fat = lastAnalysis?.scores?.body_fat_estimate_pct ?? null
  const hasAnalysis = lastAnalysis != null && lastAnalysis !== undefined

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 28 }]}
        showsVerticalScrollIndicator={false}
      >

      {/* Cabeçalho inline: saudação + data à esquerda, ajustes à direita */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <View style={styles.topGreetingRow}>
            <Text style={styles.topGreeting}>Olá, {name}!</Text>
            <View style={styles.topPro}>
              <Text style={styles.topProText}>PRO</Text>
            </View>
          </View>
          <Text style={styles.topDate}>{todayFullDate()}</Text>
        </View>
        <TouchableOpacity style={styles.gearCircle} onPress={() => router.push('/(app)/profile')} activeOpacity={0.8}>
          <Ionicons name="settings-outline" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      {hasAnalysis ? (
        // ── HOME DE USO DIÁRIO — estilo painel de progresso ──
        (() => {
          const doneWeek = weekProgress.filter((d) => d.done).length
          const totalWeek = weekProgress.length || 5
          return (
        <>
          {/* 1 — Progresso da semana */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Progresso da semana</Text>
              <Text style={styles.cardCounter}>{doneWeek} de {totalWeek} treinos</Text>
            </View>
            <View style={styles.weekDays}>
              {weekProgress.map((d, i) => (
                <View key={i} style={styles.weekDay}>
                  <View
                    style={[
                      styles.weekCircle,
                      d.done && styles.weekCircleDone,
                      d.isToday && !d.done && styles.weekCircleToday,
                    ]}
                  >
                    {d.done && <Ionicons name="checkmark" size={16} color="#0A0A0A" />}
                  </View>
                  <Text style={[styles.weekDayLabel, d.isToday && styles.weekDayLabelToday]}>
                    {d.day.slice(0, 3)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* 2 — Métricas em cards horizontais (estilo streak) */}
          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Ionicons name="flame" size={18} color="#4CAF50" />
              <Text style={[styles.statValue, { color: score ? getScoreColor(score) : '#fff' }]}>{score ?? '—'}</Text>
              <Text style={styles.statLabel}>Score atual</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="body" size={18} color="#4CAF50" />
              <Text style={styles.statValue}>{fat != null ? `${fat.toFixed(1)}%` : '—'}</Text>
              <Text style={styles.statLabel}>Gordura</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="barbell" size={18} color="#4CAF50" />
              <Text style={styles.statValue}>{weight != null ? `${weight}kg` : '—'}</Text>
              <Text style={styles.statLabel}>Peso</Text>
            </View>
          </View>

          {/* 3 — Objetivo do dia / desafio da semana */}
          <View style={styles.card}>
            <View style={styles.challengeHeader}>
              <View style={styles.challengeBadge}>
                <Ionicons name="trophy" size={12} color="#4CAF50" />
                <Text style={styles.challengeBadgeText}>DESAFIO DA SEMANA</Text>
              </View>
            </View>
            <Text style={styles.challengeTitle}>
              {doneWeek >= totalWeek ? 'Semana completa! 🔥' : `Conclua seus ${totalWeek} treinos`}
            </Text>
            <View style={styles.challengeTrack}>
              <View style={[styles.challengeFill, { width: `${Math.round((doneWeek / totalWeek) * 100)}%` }]} />
            </View>
            <Text style={styles.challengeSub}>
              {doneWeek >= totalWeek
                ? 'Você fechou a semana. Descanse com orgulho.'
                : `Faltam ${totalWeek - doneWeek} para desbloquear a semana`}
            </Text>
          </View>

          {/* 4 — Treino de hoje (ação principal) */}
          {todayWorkout?.kind === 'session' ? (
            <View style={styles.card}>
              <View style={styles.todayTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.todayEyebrow}>TREINO DE HOJE</Text>
                  <Text style={styles.todayFocus}>{todayWorkout.session.focus}</Text>
                  <Text style={styles.todayMeta}>
                    {todayWorkout.session.exercises.length} exercícios · ~{estimateDuration(todayWorkout.session.exercises)} min
                  </Text>
                </View>
                <View style={styles.planRing}>
                  <Ring pct={planPct} size={56} />
                  <Text style={styles.planPct}>{planPct}%</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.todayCta, todayWorkout.isCompleted && styles.todayCtaDone]}
                onPress={todayWorkout.isCompleted ? () => router.push('/(app)/treino') : toggleTodaySession}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={todayWorkout.isCompleted ? 'checkmark-circle' : 'barbell'}
                  size={18}
                  color={todayWorkout.isCompleted ? '#4CAF50' : '#0A0A0A'}
                />
                <Text style={[styles.todayCtaText, todayWorkout.isCompleted && styles.todayCtaTextDone]}>
                  {todayWorkout.isCompleted ? 'Treino concluído ✓' : 'Marcar como concluído'}
                </Text>
              </TouchableOpacity>
              <View style={styles.todayFooterRow}>
                <TouchableOpacity onPress={() => router.push('/(app)/treino')}>
                  <Text style={styles.todayLink}>Ver plano completo →</Text>
                </TouchableOpacity>
                {todayWorkout.isCompleted && (
                  <TouchableOpacity style={styles.shareWorkoutBtn} onPress={() => setShareVisible(true)}>
                    <Ionicons name="share-outline" size={14} color="#888" />
                    <Text style={styles.shareWorkoutText}>Compartilhar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.restCard}>
              <Text style={styles.restEmoji}>🛌</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.restTitle}>Dia de descanso</Text>
                <Text style={styles.restSub}>Recupere hoje e volte amanhã mais forte.</Text>
              </View>
            </View>
          )}

          {/* 5 — Acesso rápido: dieta, nova avaliação, perfil */}
          <View style={styles.shortcutRow}>
            <TouchableOpacity style={styles.shortcut} onPress={() => router.push('/(app)/meal-plan' as never)} activeOpacity={0.85}>
              <Ionicons name="restaurant-outline" size={20} color="#4CAF50" />
              <Text style={styles.shortcutText}>Dieta</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shortcut}
              onPress={async () => {
                const skip = await AsyncStorage.getItem(PHOTO_TIP_STORAGE_KEY)
                router.push((skip === 'true' ? '/(app)/camera' : '/(app)/photo-tip') as never)
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="scan-outline" size={20} color="#4CAF50" />
              <Text style={styles.shortcutText}>Avaliar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shortcut} onPress={() => router.push('/(app)/profile')} activeOpacity={0.85}>
              <Ionicons name="person-outline" size={20} color="#4CAF50" />
              <Text style={styles.shortcutText}>Perfil</Text>
            </TouchableOpacity>
          </View>

          {todayWorkout?.kind === 'session' && (
            <WorkoutShareCard
              visible={shareVisible}
              onClose={() => setShareVisible(false)}
              session={todayWorkout.session}
              weekNumber={todayWorkout.weekNumber}
              totalWeeks={planTotalWeeks}
              duration={estimateDuration(todayWorkout.session.exercises)}
            />
          )}
        </>
          )
        })()
      ) : (
        // ── HOME DE PRIMEIRA VEZ: um objetivo só — fazer a avaliação ──
        <>
          <View style={styles.heroWrapper}>
            <Text style={styles.heroTitle}>
              Veja sua <Text style={styles.heroHighlight}>evolução</Text>{'\n'}antes de começar.
            </Text>
            <Text style={styles.heroSub}>
              Tire uma foto, receba sua análise corporal completa e um plano feito para o seu corpo.
            </Text>
          </View>

          <View style={styles.firstStepCard}>
            {[
              'Análise corporal com seu score',
              'Projeção do seu resultado (foto)',
              'Plano de treino e dieta sob medida',
            ].map((item) => (
              <View key={item} style={styles.firstStepItem}>
                <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                <Text style={styles.firstStepText}>{item}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            onPress={async () => {
              const skip = await AsyncStorage.getItem(PHOTO_TIP_STORAGE_KEY)
              router.push((skip === 'true' ? '/(app)/camera' : '/(app)/photo-tip') as never)
            }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#4CAF50', '#4CAF50', '#2E7D32']}
              locations={[0, 0.45, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.evalBtn}
            >
              <View style={[StyleSheet.absoluteFill, styles.sweepClip]}>
                <Animated.View style={[styles.sweepOverlay, { transform: [{ translateX: sweepAnim }] }]}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.14)', 'rgba(255,255,255,0.14)', 'rgba(255,255,255,0)']}
                    locations={[0, 0.15, 0.85, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ width: 260, height: '100%' }}
                  />
                </Animated.View>
              </View>
              <Ionicons name="scan" size={18} color="#FFFFFF" />
              <Text style={[styles.evalBtnText, { color: '#FFFFFF' }]}>Fazer minha avaliação</Text>
            </LinearGradient>
          </TouchableOpacity>
        </>
      )}

      <DailyQuoteCard />
    </ScrollView>

      {/* ── Botão flutuante do Personal (chat) ── */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => router.push('/(app)/coach')}
        activeOpacity={0.85}
      >
        <Ionicons name="chatbubble-ellipses" size={24} color="#0A0A0A" />
      </TouchableOpacity>

    </View>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  scroll: { flex: 1 },
  container: { paddingHorizontal: 20, paddingBottom: 48, gap: 20 },

  // Glass Header
  glassHeader: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingHorizontal: 20,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarRing: {
    borderRadius: 27.5,
    padding: 1.5,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#1B3A1B',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImage: { width: 52, height: 52, borderRadius: 26 },
  avatarText: { color: '#4CAF50', fontSize: 20, fontWeight: '800' },
  greeting: { color: '#fff', fontSize: 17, fontWeight: '700' },
  nameInput: {
    color: '#fff', fontSize: 17, fontWeight: '700',
    borderBottomWidth: 1, borderBottomColor: '#4CAF50',
    paddingVertical: 0, minWidth: 80,
  },
  tagline: { color: '#666', fontSize: 12, marginTop: 3 },
  badgeProGradient: {
    borderRadius: 12,
    padding: 1,
  },
  badgePro: {
    paddingHorizontal: 11, paddingVertical: 5, borderRadius: 11,
    backgroundColor: '#0A0A0A',
  },
  badgeProText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 1 },

  // Hero
  heroWrapper: {
    paddingTop: 28,
    paddingBottom: 24,
  },
  heroImageWrapper: {
    width: '120%',
    height: 380,
    overflow: 'hidden',
    marginHorizontal: -20,
    marginBottom: 4,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroFadeBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '65%',
  },
  heroTextBlock: {
    position: 'absolute',
    bottom: 20, left: 20, right: 20,
  },
  heroTitle: { color: '#fff', fontSize: 32, fontWeight: '800', lineHeight: 40, marginBottom: 10 },
  heroHighlight: { color: '#4CAF50' },
  heroSub: { color: '#888', fontSize: 15, lineHeight: 22, maxWidth: 320 },

  // Eval card
  evalCard: {
    backgroundColor: '#111', borderRadius: 18,
    padding: 16, gap: 14,
    borderWidth: 1, borderColor: '#1E1E1E',
  },
  evalBody: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  evalText: { flex: 1 },
  evalTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  evalSub: { color: '#555', fontSize: 12, marginTop: 2 },
  evalBtn: {
    backgroundColor: '#4CAF50', borderRadius: 12,
    paddingVertical: 13, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  evalBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sweepClip: { borderRadius: 12, overflow: 'hidden' },
  sweepOverlay: { position: 'absolute', top: 0, bottom: 0, width: 260 },

  // First step card (no analysis yet)
  firstStepCard: {
    backgroundColor: '#111', borderRadius: 18,
    borderWidth: 1, borderColor: '#1E1E1E',
    padding: 18, gap: 10,
  },
  firstStepHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2,
  },
  firstStepTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  firstStepItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  firstStepBullet: { color: '#4CAF50', fontSize: 11, fontWeight: '800' },
  firstStepText: { color: '#888', fontSize: 13 },

  // Cabeçalho inline
  topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  topGreetingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topGreeting: { color: '#fff', fontSize: 24, fontWeight: '800' },
  topPro: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8,
  },
  topProText: { color: '#0A0A0A', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  topDate: { color: '#666', fontSize: 13, marginTop: 2 },
  gearCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#161616',
    borderWidth: 1, borderColor: '#242424',
    alignItems: 'center', justifyContent: 'center',
  },

  // Home diária — cartões
  card: {
    backgroundColor: '#111',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    padding: 18,
    gap: 14,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cardCounter: { color: '#666', fontSize: 12, fontWeight: '600' },

  // Progresso da semana
  weekDays: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', gap: 6 },
  weekCircle: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 2, borderColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  weekCircleDone: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  weekCircleToday: { borderColor: '#4CAF50' },
  weekDayLabel: { color: '#555', fontSize: 11, fontWeight: '600' },
  weekDayLabelToday: { color: '#4CAF50' },

  // Cards de estatística horizontais
  statRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
  },
  statValue: { color: '#fff', fontSize: 20, fontWeight: '800' },
  statLabel: { color: '#555', fontSize: 11, fontWeight: '600' },

  // Desafio da semana
  challengeHeader: { flexDirection: 'row' },
  challengeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(76,175,80,0.12)',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
  },
  challengeBadgeText: { color: '#4CAF50', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  challengeTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  challengeTrack: { height: 8, borderRadius: 4, backgroundColor: '#1F1F1F', overflow: 'hidden' },
  challengeFill: { height: '100%', borderRadius: 4, backgroundColor: '#4CAF50' },
  challengeSub: { color: '#666', fontSize: 12 },

  // FAB do chat
  fab: {
    position: 'absolute',
    right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#4CAF50',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  todayTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  todayEyebrow: { color: '#4CAF50', fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 4 },
  todayFocus: { color: '#fff', fontSize: 22, fontWeight: '800' },
  todayMeta: { color: '#666', fontSize: 12, marginTop: 4 },
  todayCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
  },
  todayCtaDone: { backgroundColor: '#161616', borderWidth: 1, borderColor: '#2E4E2E' },
  todayCtaText: { color: '#0A0A0A', fontSize: 15, fontWeight: '700' },
  todayCtaTextDone: { color: '#4CAF50' },
  todayFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  todayLink: { color: '#888', fontSize: 13, fontWeight: '600' },

  restCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#111',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    padding: 20,
  },
  restEmoji: { fontSize: 30 },
  restTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  restSub: { color: '#888', fontSize: 13, marginTop: 2 },

  shortcutRow: { flexDirection: 'row', gap: 12 },
  shortcut: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    paddingVertical: 16,
  },
  shortcutText: { color: '#ccc', fontSize: 14, fontWeight: '600' },

  // Metrics
  metricsRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  metricBlock: { flex: 1, alignItems: 'center', gap: 4 },
  metricDivider: { width: 1, backgroundColor: '#1E1E1E' },
  metricValue: { color: '#fff', fontSize: 20, fontWeight: '800' },
  metricLabel: { color: '#444', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },

  // Plan card
  planCard: {
    backgroundColor: '#111', borderRadius: 18,
    padding: 18, gap: 14,
    borderWidth: 1, borderColor: '#1E1E1E',
  },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planLabel: { color: '#444', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  planLink: { color: '#4CAF50', fontSize: 13, fontWeight: '600' },
  planBody: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  planInfo: { flex: 1, gap: 6 },
  planFocus: { color: '#fff', fontSize: 20, fontWeight: '800' },
  planMeta: { color: '#555', fontSize: 12 },
  planDoneBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1B3A1B', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#4CAF50',
  },
  planDoneText: { color: '#4CAF50', fontSize: 12, fontWeight: '700' },
  planRing: { alignItems: 'center', justifyContent: 'center' },
  planPct: {
    position: 'absolute',
    color: '#fff', fontSize: 12, fontWeight: '800',
  },

  exercisePreview: {
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    paddingTop: 12,
    gap: 8,
  },
  exerciseRow: { flexDirection: 'row', alignItems: 'center' },
  exerciseName: { flex: 1, color: '#666', fontSize: 13 },
  exerciseSets: { color: '#444', fontSize: 12 },
  exerciseMore: { color: '#333', fontSize: 12, marginTop: 2 },

  completedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#1A1A1A',
  },
  completedBtnDone: {
    borderColor: '#2A2A2A',
    backgroundColor: '#1A1A1A',
  },
  completedBtnText: { color: '#888', fontSize: 14, fontWeight: '600' },
  completedBtnTextDone: { color: '#4CAF50' },

  planFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    paddingTop: 12,
  },

  shareWorkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  shareWorkoutText: { color: '#aaa', fontSize: 13, fontWeight: '600' },

  restText: { color: '#555', fontSize: 14, lineHeight: 22 },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gearBtn: { padding: 4 },

  nutritionShortcut: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#111', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#1E1E1E',
  },
  nutritionIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#0E1E0E', borderWidth: 1, borderColor: '#254025',
    alignItems: 'center', justifyContent: 'center',
  },
  nutritionText: { flex: 1 },
  nutritionTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  nutritionSub: { color: '#555', fontSize: 12, marginTop: 2 },
})

const qStyles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    padding: 24,
    gap: 10,
    minHeight: 160,
    justifyContent: 'flex-end',
  },
  quoteChar: {
    color: 'rgba(255,255,255,0.18)',
    fontSize: 64,
    fontWeight: '900',
    lineHeight: 48,
    marginBottom: -20,
  },
  quoteText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 17,
    lineHeight: 26,
    fontStyle: 'normal',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  label: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  shareBtnText: {
    color: '#aaa',
    fontSize: 11,
    fontWeight: '600',
  },
})
