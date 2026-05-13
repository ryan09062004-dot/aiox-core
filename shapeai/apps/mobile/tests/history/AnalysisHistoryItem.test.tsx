import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { AnalysisHistoryItem } from '../../src/components/history/AnalysisHistoryItem'
import type { AnalysisSummary } from '@shapeai/shared'

const base: AnalysisSummary = {
  id: 'a1',
  status: 'completed',
  scores: null,
  created_at: '2026-04-15T10:00:00Z',
  completed_at: '2026-04-15T10:05:00Z',
  top_development_areas: ['biceps'],
}

const withScores: AnalysisSummary = {
  ...base,
  scores: {
    quadriceps: 70, glutes: 65, calves: 60, biceps: 80, triceps: 75,
    chest: 70, abs: 65, traps: 60, lats: 70, shoulders: 68,
    overall_score: 70, body_fat_estimate_pct: 18,
  } as unknown as Record<string, number>,
}

describe('AnalysisHistoryItem', () => {
  it('exibe data formatada no card compacto', () => {
    const { getByText } = render(
      <AnalysisHistoryItem item={base} isLatest={false} index={0} total={2} />
    )
    expect(getByText('15 de abril de 2026')).toBeTruthy()
  })

  it('exibe "Aguardando análise..." quando não há scores', () => {
    const { getByText } = render(
      <AnalysisHistoryItem item={base} isLatest={false} index={0} total={2} />
    )
    expect(getByText('Aguardando análise...')).toBeTruthy()
  })

  it('exibe badge "Processando" para status processing', () => {
    const item = { ...base, status: 'processing' as const }
    const { getByText } = render(
      <AnalysisHistoryItem item={item} isLatest={false} index={0} total={2} />
    )
    expect(getByText('Processando')).toBeTruthy()
  })

  it('exibe número da avaliação no card compacto com scores', () => {
    const { getByText } = render(
      <AnalysisHistoryItem item={withScores} isLatest={false} index={0} total={3} />
    )
    expect(getByText('#3')).toBeTruthy()
  })

  it('exibe "Mais recente" no card featured (isLatest + scores)', () => {
    const { getByText } = render(
      <AnalysisHistoryItem item={withScores} isLatest={true} index={0} total={1} />
    )
    expect(getByText('Mais recente')).toBeTruthy()
  })

  it('exibe gordura corporal no card featured', () => {
    const { getByText } = render(
      <AnalysisHistoryItem item={withScores} isLatest={true} index={0} total={1} />
    )
    expect(getByText('18.0%')).toBeTruthy()
  })

  it('chama onPress ao tocar em item', () => {
    const onPress = jest.fn()
    const { getByTestId } = render(
      <AnalysisHistoryItem item={base} isLatest={false} index={0} total={1} onPress={onPress} />
    )
    fireEvent.press(getByTestId('history-item-a1'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
