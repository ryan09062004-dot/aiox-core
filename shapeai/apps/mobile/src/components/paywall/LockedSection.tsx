import { ReactNode } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

interface LockedSectionProps {
  title: string
  description: string
  cta?: string
  /**
   * Conteúdo real renderizado por baixo do bloqueio, desfocado. Mostrar a forma do que
   * está travado converte melhor do que uma tela vazia — mas o texto nunca é legível.
   */
  children?: ReactNode
}

export function LockedSection({ title, description, cta = 'Desbloquear', children }: LockedSectionProps) {
  return (
    <View style={styles.wrapper}>
      {children && (
        <View style={styles.blurred} pointerEvents="none" accessibilityElementsHidden>
          {children}
        </View>
      )}

      <View style={styles.overlay}>
        <View style={styles.lockCircle}>
          <Ionicons name="lock-closed" size={20} color="#4CAF50" />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/(app)/paywall')}>
          <Text style={styles.buttonText}>{cta}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    minHeight: 180,
    justifyContent: 'center',
  },
  // O conteúdo real fica ao fundo apenas como textura: opacidade baixa torna a forma
  // reconhecível sem entregar a informação. O overlay é quem define a altura da seção.
  blurred: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
  },
  overlay: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 8,
    backgroundColor: 'rgba(10,10,10,0.72)',
  },
  lockCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(76,175,80,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  description: {
    color: '#999',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 300,
  },
  button: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 6,
  },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
})
