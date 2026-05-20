import { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Modal, Pressable } from 'react-native'
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
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [showSortMenu, setShowSortMenu] = useState(false)

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
    .sort((a, b) => {
      const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return sortOrder === 'desc' ? diff : -diff
    })
  const latestCompletedId = visibleAnalyses.find((a) => a.status === 'completed')?.id
  const completedCount = visibleAnalyses.filter((a) => a.status === 'completed').length

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
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyTitle}>Nenhuma avaliação ainda</Text>
        <Text style={styles.emptySubtitle}>Capture suas fotos para começar a acompanhar sua evolução.</Text>
        <TouchableOpacity style={styles.startButton} onPress={() => router.push('/(app)/camera')} testID="btn-comecar-agora">
          <Text style={styles.startButtonText}>Fazer primeira avaliação</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Avaliações</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.newButton} onPress={() => router.push('/(app)/camera')}>
            <Ionicons name="add" size={16} color="#555" />
            <Text style={styles.newButtonText}>Criar nova</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sortButton} onPress={() => setShowSortMenu(true)}>
            <Ionicons name="filter" size={18} color="#888" />
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showSortMenu} transparent animationType="fade" onRequestClose={() => setShowSortMenu(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowSortMenu(false)}>
          <View style={styles.sortMenu}>
            <Text style={styles.sortMenuTitle}>Ordenar por</Text>
            {(['desc', 'asc'] as const).map((order) => (
              <TouchableOpacity
                key={order}
                style={styles.sortOption}
                onPress={() => { setSortOrder(order); setShowSortMenu(false) }}
              >
                <Text style={[styles.sortOptionText, sortOrder === order && styles.sortOptionTextActive]}>
                  {order === 'desc' ? 'Mais recente primeiro' : 'Mais antiga primeiro'}
                </Text>
                {sortOrder === order && <Ionicons name="checkmark" size={16} color="#4CAF50" />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      <FlatList
        data={visibleAnalyses}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const isLatest = item.id === latestCompletedId
          const total = visibleAnalyses.length
          const isFirstHistory = !isLatest && visibleAnalyses.findIndex((a) => a.id === latestCompletedId) !== -1 && index === (visibleAnalyses.findIndex((a) => a.id === latestCompletedId) + 1)
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
                onWorkout={
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  countBadge: { backgroundColor: '#1A1A1A', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#2A2A2A' },
  countText: { color: '#888', fontSize: 13, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#fff', textAlign: 'center', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 32 },
  startButton: { backgroundColor: '#4CAF50', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32 },
  startButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loadingMore: { alignItems: 'center', paddingVertical: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 4,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#111',
  },
  newButtonText: { color: '#555', fontSize: 12, fontWeight: '600' },
  sortButton: { padding: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sortMenu: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  sortMenuTitle: { fontSize: 13, color: '#555', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  sortOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  sortOptionText: { fontSize: 16, color: '#888' },
  sortOptionTextActive: { color: '#fff', fontWeight: '600' },
})
