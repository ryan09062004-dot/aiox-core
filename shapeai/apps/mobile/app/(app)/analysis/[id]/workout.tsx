import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useLocalSearchParams, router } from 'expo-router'
import {
  type WorkoutWeek,
  type WorkoutSession,
  type PrimaryGoal,
  GOAL_LABEL,
} from '@shapeai/shared'
import { getAnalysisResult } from '../../../../src/services/analysis.service'
import { getUserProfile } from '../../../../src/services/profile.service'
import WorkoutDayCard from '../../../../src/components/workout/WorkoutDayCard'
import { STANDARD_HOME_PLAN } from '../../../../src/data/home-workout'

function storageKey(analysisId: string) {
  return `workout_progress_${analysisId}`
}

function modeKey(analysisId: string) {
  return `workout_mode_${analysisId}`
}

function sessionKey(weekNumber: number, day: string) {
  return `${weekNumber}_${day}`
}

function applyWorkoutMode(sessions: WorkoutSession[], mode: 'gym' | 'home'): WorkoutSession[] {
  if (mode === 'gym') return sessions
  return sessions.map(gymSession => {
    const home = STANDARD_HOME_PLAN.find(h => h.day === gymSession.day)
    return home ?? gymSession
  })
}

export default function WorkoutScreen() {
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [weeks, setWeeks] = useState<WorkoutWeek[]>([])
  const [goal, setGoal] = useState<PrimaryGoal | null>(null)
  const [selectedWeek, setSelectedWeek] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [workoutMode, setWorkoutMode] = useState<'gym' | 'home'>('gym')

  useEffect(() => {
    if (!id) return
    AsyncStorage.getItem(modeKey(id)).then((val) => {
      if (val === 'home') setWorkoutMode('home')
    })
  }, [id])

  const changeMode = useCallback(async (mode: 'gym' | 'home') => {
    setWorkoutMode(mode)
    if (id) await AsyncStorage.setItem(modeKey(id), mode)
  }, [id])

  useEffect(() => {
    if (!id) return
    getAnalysisResult(id)
      .then((analysis) => {
        setWeeks(analysis.workout_plan.weeks as unknown as WorkoutWeek[])
        return getUserProfile().then((profile) => setGoal(profile.primary_goal)).catch(() => {})
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id) return
    AsyncStorage.getItem(storageKey(id)).then((raw) => {
      if (raw) setCompleted(new Set(JSON.parse(raw)))
    })
  }, [id])

  const toggleSession = useCallback(async (weekNumber: number, day: string) => {
    if (!id) return
    const key = sessionKey(weekNumber, day)
    setCompleted((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      AsyncStorage.setItem(storageKey(id), JSON.stringify([...next]))
      return next
    })
  }, [id])

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /></View>
  }

  if (error || weeks.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Plano de treino não disponível.'}</Text>
      </View>
    )
  }

  const goalLabel = goal ? GOAL_LABEL[goal] : '—'
  const currentWeek = weeks[selectedWeek]
  const sessionsPerWeek = weeks[0]?.sessions.length ?? 0
  const displaySessions = applyWorkoutMode(currentWeek?.sessions ?? [], workoutMode)

  const totalSessions = weeks.reduce((sum, w) => sum + w.sessions.length, 0)
  const completionPct = totalSessions > 0 ? Math.round((completed.size / totalSessions) * 100) : 0

  const completedThisWeek = currentWeek?.sessions.filter(
    (s) => completed.has(sessionKey(currentWeek.week_number, s.day))
  ).length ?? 0

  const progressRatio = sessionsPerWeek > 0 ? completedThisWeek / sessionsPerWeek : 0
  const progressWidth = `${Math.round(progressRatio * 100)}%` as `${number}%`

  return (
    <View style={styles.container}>
      <View style={[styles.headerCard, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backBtn}>← Voltar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerBody}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerLabel}>Seu objetivo</Text>
            <Text style={styles.goalLabel}>{goalLabel}</Text>
            <Text style={styles.planMeta}>4 semanas · {sessionsPerWeek} treinos/semana</Text>
          </View>
          <View style={styles.scoreBlock}>
            <Text style={styles.scoreValue}>{completionPct}%</Text>
            <Text style={styles.scorePts}>concluído</Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>Progresso da semana</Text>
            <Text style={styles.progressCount}>
              {completedThisWeek} de {sessionsPerWeek} sessões
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
        </View>
      </View>

      <ScrollView style={styles.daysScroll} contentContainerStyle={styles.daysContent}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsContent}
        >
          {weeks.map((week, index) => (
            <TouchableOpacity
              key={week.week_number}
              style={[styles.tab, selectedWeek === index && styles.tabActive]}
              onPress={() => setSelectedWeek(index)}
            >
              <Text style={[styles.tabText, selectedWeek === index && styles.tabTextActive]}>
                Semana {week.week_number}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.modeToggleContainer}>
          <TouchableOpacity
            style={[styles.modeBtn, workoutMode === 'gym' && styles.modeBtnActive]}
            onPress={() => changeMode('gym')}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeBtnText, workoutMode === 'gym' && styles.modeBtnTextActive]}>
              Academia
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, workoutMode === 'home' && styles.modeBtnActive]}
            onPress={() => changeMode('home')}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeBtnText, workoutMode === 'home' && styles.modeBtnTextActive]}>
              Casa
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.daysCards}>
          {displaySessions.map((session, index) => (
            <WorkoutDayCard
              key={index}
              session={session}
              isCompleted={completed.has(sessionKey(currentWeek.week_number, session.day))}
              onToggle={() => toggleSession(currentWeek.week_number, session.day)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  center: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#888', fontSize: 16, textAlign: 'center', padding: 24 },

  headerCard: {
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 14,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerBody: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  headerInfo: { gap: 3 },
  headerLabel: { color: '#444', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  goalLabel: { color: '#fff', fontSize: 22, fontWeight: '800' },
  planMeta: { color: '#444', fontSize: 13 },
  scoreBlock: { flexDirection: 'column', alignItems: 'flex-end', gap: 2, paddingBottom: 2 },
  scoreValue: { fontSize: 36, fontWeight: '800', lineHeight: 40, color: '#4CAF50' },
  scorePts: { color: '#444', fontSize: 11, fontWeight: '600', textAlign: 'right' },

  progressSection: { gap: 8 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: '#444', fontSize: 12 },
  progressCount: { color: '#4CAF50', fontSize: 12, fontWeight: '700' },
  progressTrack: { height: 6, backgroundColor: '#1A1A1A', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: '#4CAF50' },

  backBtn: { color: '#4CAF50', fontSize: 16, fontWeight: '600' },

  tabsScroll: { maxHeight: 56 },
  tabsContent: { paddingHorizontal: 20, paddingVertical: 8, gap: 8, alignItems: 'center' },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  tabActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  tabText: { color: '#888', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 7,
  },
  modeBtnActive: { backgroundColor: '#4CAF50' },
  modeBtnText: { color: '#666', fontWeight: '600', fontSize: 14 },
  modeBtnTextActive: { color: '#fff' },

  daysScroll: { flex: 1 },
  daysContent: { paddingBottom: 40 },
  daysCards: { paddingHorizontal: 20, paddingTop: 4 },
})
