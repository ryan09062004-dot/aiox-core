import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { type WorkoutWeek, type PrimaryGoal, GOAL_LABEL } from '@shapeai/shared'
import { listAnalyses, getAnalysisResult } from '../../src/services/analysis.service'
import { getUserProfile } from '../../src/services/profile.service'
import WorkoutDayCard from '../../src/components/workout/WorkoutDayCard'
import { PHOTO_TIP_STORAGE_KEY } from './photo-tip'

function storageKey(id: string) { return `workout_progress_${id}` }
function sessionKey(w: number, d: string) { return `${w}_${d}` }
function elapsedWeek(completedAt: string, total: number) {
  const days = Math.floor((Date.now() - new Date(completedAt).getTime()) / 86_400_000)
  return Math.min(Math.max(Math.floor(days / 7), 0), total - 1)
}

export default function TreinoTab() {
  const [loading, setLoading] = useState(true)
  const [analysisId, setAnalysisId] = useState<string | null>(null)
  const [completedAt, setCompletedAt] = useState<string | null>(null)
  const [weeks, setWeeks] = useState<WorkoutWeek[]>([])
  const [goal, setGoal] = useState<PrimaryGoal | null>(null)
  const [selectedWeek, setSelectedWeek] = useState(0)
  const [completed, setCompleted] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [analysesRes, profileRes] = await Promise.allSettled([
        listAnalyses(10),
        getUserProfile(),
      ])

      if (profileRes.status === 'fulfilled') setGoal(profileRes.value.primary_goal)

      if (analysesRes.status === 'rejected') return

      const last = analysesRes.value.analyses.find(a => a.status === 'completed') ?? null
      if (!last) return

      setAnalysisId(last.id)
      setCompletedAt(last.completed_at ?? null)

      const result = await getAnalysisResult(last.id)
      const w = result.workout_plan.weeks as unknown as WorkoutWeek[]
      setWeeks(w)

      const raw = await AsyncStorage.getItem(storageKey(last.id))
      if (raw) setCompleted(new Set(JSON.parse(raw)))

      if (last.completed_at) {
        setSelectedWeek(elapsedWeek(last.completed_at, w.length))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const toggleSession = useCallback(async (weekNumber: number, day: string) => {
    if (!analysisId) return
    const key = sessionKey(weekNumber, day)
    setCompleted((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      AsyncStorage.setItem(storageKey(analysisId), JSON.stringify([...next]))
      return next
    })
  }, [analysisId])

  const handleNewAnalysis = async () => {
    const skip = await AsyncStorage.getItem(PHOTO_TIP_STORAGE_KEY)
    router.push((skip === 'true' ? '/(app)/camera' : '/(app)/photo-tip') as never)
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    )
  }

  if (weeks.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="barbell-outline" size={72} color="#1E1E1E" />
        <Text style={styles.emptyTitle}>Nenhum plano de treino</Text>
        <Text style={styles.emptySub}>
          Faça sua avaliação de shape para receber um plano personalizado com base no seu corpo e objetivo.
        </Text>
        <TouchableOpacity style={styles.ctaBtn} onPress={handleNewAnalysis}>
          <Ionicons name="scan" size={18} color="#fff" />
          <Text style={styles.ctaBtnText}>Fazer Avaliação</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const currentWeek = weeks[selectedWeek]
  const goalLabel = goal ? GOAL_LABEL[goal] : '—'
  const sessionsPerWeek = weeks[0]?.sessions.length ?? 0
  const totalSessions = weeks.reduce((s, w) => s + w.sessions.length, 0)
  const completionPct = totalSessions > 0 ? Math.round((completed.size / totalSessions) * 100) : 0
  const completedThisWeek = currentWeek?.sessions.filter(
    s => completed.has(sessionKey(currentWeek.week_number, s.day))
  ).length ?? 0
  const progressWidth = `${sessionsPerWeek > 0 ? Math.round((completedThisWeek / sessionsPerWeek) * 100) : 0}%` as `${number}%`

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.screenTitle}>Treino</Text>
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
            <Text style={styles.progressCount}>{completedThisWeek} de {sessionsPerWeek} sessões</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
        </View>
      </View>

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

      <ScrollView style={styles.daysScroll} contentContainerStyle={styles.daysContent}>
        {currentWeek?.sessions.map((session, i) => (
          <WorkoutDayCard
            key={i}
            session={session}
            isCompleted={completed.has(sessionKey(currentWeek.week_number, session.day))}
            onToggle={() => toggleSession(currentWeek.week_number, session.day)}
          />
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  center: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },

  emptyContainer: {
    flex: 1, backgroundColor: '#0A0A0A',
    justifyContent: 'center', alignItems: 'center', padding: 40, gap: 16,
  },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  emptySub: { color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  ctaBtn: {
    backgroundColor: '#4CAF50', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 24,
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8,
  },
  ctaBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  headerCard: {
    backgroundColor: '#111',
    borderBottomWidth: 1, borderBottomColor: '#1A1A1A',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, gap: 14,
  },
  screenTitle: { color: '#fff', fontSize: 28, fontWeight: '800' },
  headerBody: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  headerInfo: { gap: 3 },
  headerLabel: { color: '#444', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  goalLabel: { color: '#fff', fontSize: 20, fontWeight: '800' },
  planMeta: { color: '#444', fontSize: 13 },
  scoreBlock: { alignItems: 'flex-end', gap: 2, paddingBottom: 2 },
  scoreValue: { fontSize: 34, fontWeight: '800', color: '#4CAF50' },
  scorePts: { color: '#444', fontSize: 11, fontWeight: '600' },

  progressSection: { gap: 8 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: '#444', fontSize: 12 },
  progressCount: { color: '#4CAF50', fontSize: 12, fontWeight: '700' },
  progressTrack: { height: 6, backgroundColor: '#1A1A1A', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: '#4CAF50' },

  tabsScroll: { maxHeight: 56, marginTop: 8 },
  tabsContent: { paddingHorizontal: 20, paddingVertical: 8, gap: 8, alignItems: 'center' },
  tab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#111', borderWidth: 1, borderColor: '#1E1E1E',
  },
  tabActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  tabText: { color: '#888', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  daysScroll: { flex: 1 },
  daysContent: { padding: 20, paddingBottom: 40 },
})
