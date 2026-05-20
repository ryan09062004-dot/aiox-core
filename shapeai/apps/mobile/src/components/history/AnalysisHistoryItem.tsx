import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle } from 'react-native-svg'
import type { AnalysisSummary } from '@shapeai/shared'
import { getScoreColor, calculateOverallScore } from '@shapeai/shared'

interface Props {
  item: AnalysisSummary
  isLatest: boolean
  index: number
  total: number
  prevScore?: number | null
  onPress?: () => void
}

const MUSCLE_PT: Record<string, string> = {
  quadriceps: 'Quadríceps',
  glutes: 'Glúteos',
  calves: 'Panturrilhas',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  chest: 'Peitoral',
  abs: 'Abdômen',
  traps: 'Trapézio',
  lats: 'Dorsais',
  shoulders: 'Ombros',
}

function getStrongestMuscle(scores: Record<string, number>): string | null {
  const muscles = ['quadriceps', 'glutes', 'calves', 'biceps', 'triceps', 'chest', 'abs', 'traps', 'lats', 'shoulders']
  let best = muscles[0]
  for (const m of muscles) {
    if ((scores[m] ?? 0) > (scores[best] ?? 0)) best = m
  }
  return MUSCLE_PT[best] ?? best
}

function scoreMessage(score: number): string {
  if (score >= 70) return 'Seu shape está excelente!'
  if (score >= 50) return 'Seu shape está muito bem!'
  if (score >= 30) return 'Seu shape está evoluindo!'
  return 'Você está construindo sua base!'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

const RADIUS = 48
const STROKE = 8
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function ScoreRing({ score, color }: { score: number; color: string }) {
  const progress = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE
  const size = (RADIUS + STROKE) * 2

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={RADIUS} stroke="#1E1E1E" strokeWidth={STROKE} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={RADIUS}
          stroke={color} strokeWidth={STROKE} fill="none"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={progress}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text style={[styles.ringScore, { color }]}>{score}</Text>
      <Text style={styles.ringLabel}>score</Text>
    </View>
  )
}

export function AnalysisHistoryItem({ item, isLatest, index, total, prevScore, onPress }: Props) {
  const evalNumber = total - index
  const score = item.scores ? calculateOverallScore(item.scores) : null
  const bodyFat = item.scores?.body_fat_estimate_pct ?? null
  const scoreColor = score != null ? getScoreColor(score) : '#555'
  const strongest = item.scores ? getStrongestMuscle(item.scores as unknown as Record<string, number>) : null
  const weakest = item.top_development_areas?.[0]
    ? (MUSCLE_PT[item.top_development_areas[0]] ?? item.top_development_areas[0])
    : null

  // Card destacado — avaliação mais recente
  if (isLatest && score != null) {
    return (
      <TouchableOpacity
        style={styles.featuredCard}
        onPress={onPress}
        activeOpacity={onPress ? 0.8 : 1}
        testID={`history-item-${item.id}`}
      >
        {/* Topo */}
        <View style={styles.featuredTop}>
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Avaliação atual</Text>
          </View>
          <Text style={styles.featuredDate}>{formatDate(item.created_at)}</Text>
        </View>

        {/* Score + mensagem */}
        <View style={styles.featuredHero}>
          <ScoreRing score={score} color={scoreColor} />
          <View style={styles.heroRight}>
            <Text style={[styles.heroMessage, { color: scoreColor }]}>{scoreMessage(score)}</Text>
            <Text style={styles.heroSub}>Análise gerada por IA com base nas suas fotos</Text>
          </View>
        </View>

        {/* Insights */}
        <View style={styles.insightsList}>
          {bodyFat != null && (
            <View style={styles.insightRow}>
              <View style={[styles.insightDot, { backgroundColor: '#64B5F6' }]} />
              <Text style={styles.insightText}>
                <Text style={styles.insightLabel}>Gordura corporal: </Text>
                {bodyFat.toFixed(1)}%
              </Text>
            </View>
          )}
          {strongest && (
            <View style={styles.insightRow}>
              <View style={[styles.insightDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.insightText}>
                <Text style={styles.insightLabel}>Ponto forte: </Text>
                {strongest}
              </Text>
            </View>
          )}
          {weakest && (
            <View style={styles.insightRow}>
              <View style={[styles.insightDot, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.insightText}>
                <Text style={styles.insightLabel}>Área para evoluir: </Text>
                {weakest}
              </Text>
            </View>
          )}
        </View>

        {/* CTA */}
        {onPress && (
          <View style={styles.featuredCTA}>
            <Text style={styles.featuredCTAText}>Ver relatório completo</Text>
            <Ionicons name="arrow-forward" size={14} color="#4CAF50" />
          </View>
        )}
      </TouchableOpacity>
    )
  }

  // Card compacto — histórico
  const trendDiff = prevScore != null && score != null ? score - prevScore : null

  return (
    <TouchableOpacity
      style={styles.compactCard}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      testID={`history-item-${item.id}`}
    >
      <View style={styles.compactLeft}>
        <Text style={styles.compactEval}>#{evalNumber} avaliação</Text>
        <Text style={styles.compactDate}>{formatDateShort(item.created_at)}</Text>
        {item.status === 'processing' && (
          <Text style={styles.processingText}>Processando...</Text>
        )}
      </View>

      <View style={styles.compactRight}>
        {score != null ? (
          <>
            <Text style={[styles.compactScore, { color: scoreColor }]}>{score}</Text>
            {trendDiff != null && (
              <View style={styles.trendRow}>
                <Ionicons
                  name={trendDiff >= 0 ? 'trending-up' : 'trending-down'}
                  size={12}
                  color={trendDiff >= 0 ? '#4CAF50' : '#F44336'}
                />
                <Text style={[styles.trendText, { color: trendDiff >= 0 ? '#4CAF50' : '#F44336' }]}>
                  {trendDiff >= 0 ? '+' : ''}{trendDiff}
                </Text>
              </View>
            )}
          </>
        ) : (
          <Text style={styles.pendingText}>—</Text>
        )}
        {onPress && score != null && (
          <Ionicons name="chevron-forward" size={16} color="#333" style={{ marginLeft: 8 }} />
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  // ── Featured card ─────────────────────────────────────────────
  featuredCard: {
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    gap: 16,
  },
  featuredTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentBadge: {
    backgroundColor: '#1A2E1A',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#2E4A2E',
  },
  currentBadgeText: { fontSize: 11, color: '#4CAF50', fontWeight: '700', letterSpacing: 0.5 },
  featuredDate: { fontSize: 12, color: '#444', fontWeight: '500' },

  featuredHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroRight: { flex: 1, gap: 4 },
  heroMessage: { fontSize: 17, fontWeight: '800', lineHeight: 22 },
  heroSub: { fontSize: 11, color: '#444', lineHeight: 16 },

  ringScore: { fontSize: 26, fontWeight: '800' },
  ringLabel: { fontSize: 10, color: '#444', marginTop: 1 },

  insightsList: { gap: 8 },
  insightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  insightDot: { width: 7, height: 7, borderRadius: 4 },
  insightText: { fontSize: 13, color: '#888' },
  insightLabel: { color: '#555', fontWeight: '600' },

  featuredCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2E4A2E',
    backgroundColor: '#0D1F0D',
  },
  featuredCTAText: { fontSize: 13, fontWeight: '700', color: '#4CAF50' },

  // ── Compact card ──────────────────────────────────────────────
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  compactLeft: { flex: 1, gap: 3 },
  compactEval: { fontSize: 13, fontWeight: '700', color: '#fff' },
  compactDate: { fontSize: 12, color: '#444' },
  processingText: { fontSize: 11, color: '#FF9800', fontStyle: 'italic' },

  compactRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  compactScore: { fontSize: 22, fontWeight: '800' },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  trendText: { fontSize: 11, fontWeight: '700' },
  pendingText: { fontSize: 18, color: '#333' },
})
