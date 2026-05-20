import { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { listAnalyses } from '../../src/services/analysis.service'
import { AnalysisHistoryItem } from '../../src/components/history/AnalysisHistoryItem'
import type { AnalysisSummary } from '@shapeai/shared'
import { calculateOverallScore } from '@shapeai/shared'
import { useFocusEffect } from 'expo-router'

export default function HistoryScreen() {
  const insets = useSafeAreaInsets()
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)

  const load = useCallback(async (resetPage = false) => {
    const targetPage = resetPage ? 1 : page
    try {
      const data = await listAnalyses(targetPage)
      if (resetPage) {
        setAnalyses(data.analyses)
        setPage(1)
      } else {
        setAnalyses((prev) => [...prev, ...data.analyses])
      }
      setHasMore(data.has_more)
    } catch {
      // mantém estado anterior
    }
  }, [page])

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true)
      load(true).finally(() => setIsLoading(false))
    }, [])
  )

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await load(true)
    setIsRefreshing(false)
  }

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return
    setIsLoadingMore(true)
    const nextPage = page + 1
    setPage(nextPage)
    try {
      const data = await listAnalyses(nextPage)
      setAnalyses((prev) => [...prev, ...data.analyses])
      setHasMore(data.has_more)
    } catch {
      setPage(page)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const visibleAnalyses = analyses
    .filter((a) => a.status !== 'failed')
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const latestCompletedId = visibleAnalyses.find((a) => a.status === 'completed')?.id
  const completedCount = visibleAnalyses.filter((a) => a.status === 'completed').length

  // Pré-calcular scores para mostrar tendência nos itens compactos
  const scoreByIndex = visibleAnalyses.map((a) =>
    a.scores ? calculateOverallScore(a.scores) : null
  )

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#4CAF50" size="large" />
      </View>
    )
  }

  if (analyses.length === 0) {
    return (
      <View style={styles.centered}>
        <View style={styles.emptyIconWrapper}>
          <Ionicons name="body-outline" size={40} color="#2A2A2A" />
        </View>
        <Text style={styles.emptyTitle}>Nenhuma avaliação ainda</Text>
        <Text style={styles.emptySubtitle}>Capture suas fotos e receba uma análise completa do seu shape com dados e insights personalizados.</Text>
        <TouchableOpacity style={styles.startButton} onPress={() => router.push('/(app)/camera')} testID="btn-comecar-agora">
          <Text style={styles.startButtonText}>Fazer minha primeira avaliação</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const ListHeader = (
    <View style={styles.identityBlock}>
      <Text style={styles.identityTitle}>Avaliação Corporal</Text>
      <Text style={styles.identitySub}>Análise gerada por IA com base nas suas fotos — dados e insights estratégicos sobre seu físico.</Text>
      <View style={styles.identityMeta}>
        <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
        <Text style={styles.identityMetaText}>{completedCount} {completedCount === 1 ? 'avaliação realizada' : 'avaliações realizadas'}</Text>
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Avaliações</Text>
        <TouchableOpacity style={styles.newButton} onPress={() => router.push('/(app)/camera')}>
          <Ionicons name="add" size={16} color="#4CAF50" />
          <Text style={styles.newButtonText}>Nova avaliação</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={visibleAnalyses}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        renderItem={({ item, index }) => {
          const isLatest = item.id === latestCompletedId
          const total = visibleAnalyses.length
          const isFirstHistory = !isLatest && index > 0 && visibleAnalyses[0].id === latestCompletedId
          const prevScore = index < visibleAnalyses.length - 1 ? scoreByIndex[index + 1] : null

          return (
            <>
              {isFirstHistory && visibleAnalyses.length > 1 && (
                <Text style={styles.sectionLabel}>Histórico</Text>
              )}
              <AnalysisHistoryItem
                item={item}
                isLatest={isLatest}
                index={index}
                total={total}
                prevScore={prevScore}
                onPress={
                  item.status === 'completed'
                    ? () => router.push(`/(app)/analysis/${item.id}/report` as never)
                    : undefined
                }
              />
            </>
          )
        }}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#4CAF50" />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadingMore} testID="loading-more-indicator">
              <ActivityIndicator color="#4CAF50" size="small" />
            </View>
          ) : null
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  centered: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center', padding: 32 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2E4A2E',
    backgroundColor: '#0D1F0D',
  },
  newButtonText: { color: '#4CAF50', fontSize: 12, fontWeight: '700' },

  identityBlock: {
    paddingHorizontal: 4,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 6,
  },
  identityTitle: { fontSize: 13, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 1.2 },
  identitySub: { fontSize: 13, color: '#555', lineHeight: 19 },
  identityMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  identityMetaText: { fontSize: 12, color: '#4CAF50', fontWeight: '600' },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#333',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 4,
    paddingHorizontal: 4,
  },

  list: { paddingHorizontal: 16, paddingBottom: 40 },
  loadingMore: { alignItems: 'center', paddingVertical: 20 },

  emptyIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 20, marginBottom: 32 },
  startButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  startButtonText: { color: '#0A0A0A', fontSize: 15, fontWeight: '800' },
})
