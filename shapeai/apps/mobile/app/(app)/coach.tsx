import { useState, useRef, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { TextStyle, StyleProp } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { getUserProfile } from '../../src/services/profile.service'
import { sendChatMessage } from '../../src/services/chat.service'
import type { ChatResponse, HistoryEntry } from '../../src/services/chat.service'
import type { UserProfile } from '@shapeai/shared'

// Renders **bold** segments inside a message bubble
function InlineText({ text, style }: { text: string; style?: StyleProp<TextStyle> }) {
  const parts = text.split(/\*\*/)
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <Text key={i} style={{ fontWeight: 'bold' }}>{part}</Text>
          : part
      )}
    </Text>
  )
}

interface Message {
  id: string
  role: 'user' | 'coach'
  text: string
}

const PERSONA_NAMES: Record<string, string> = {
  rafael: 'Rafael',
  marina: 'Marina',
  bruno: 'Bruno',
}

const PERSONA_IMAGES: Record<string, ReturnType<typeof require>> = {
  Rafael: require('../../assets/coaches/Rafael.png'),
  Marina: require('../../assets/coaches/Marina.png'),
  Bruno: require('../../assets/coaches/Bruno.png'),
}

const QUICK_SUGGESTIONS = [
  'Como progredir minha carga?',
  'Explique meu treino de hoje',
  'Alternativa sem equipamento',
  'Por que meu score de costas é baixo?',
  'Pulei treino, como reorganizo a semana?',
]

export default function CoachScreen() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [limitReached, setLimitReached] = useState(false)
  const [coachName, setCoachName] = useState('Rafael')
  const scrollRef = useRef<ScrollView>(null)

  // Reload profile/usage every time this tab gets focus (persona may have changed)
  useFocusEffect(
    useCallback(() => {
      loadInitialData()
    }, [])
  )

  async function loadInitialData() {
    const profileResult = await getUserProfile().catch(() => null)
    if (profileResult) {
      const profile = profileResult as UserProfile
      const persona = profile.coach_persona ?? 'rafael'
      setCoachName(PERSONA_NAMES[persona] ?? 'Rafael')
    }
  }

  async function handleSend(text?: string) {
    const messageText = (text ?? input).trim()
    if (!messageText || isLoading) return

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text: messageText }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80)

    try {
      // Convert current messages to Claude history format (exclude the one just added)
      const history: HistoryEntry[] = messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }))

      const resp = await sendChatMessage(messageText, history)
      const coachMsg: Message = { id: `c-${Date.now()}`, role: 'coach', text: resp.reply }
      setMessages((prev) => [...prev, coachMsg])
      if (resp.persona) setCoachName(PERSONA_NAMES[resp.persona] ?? coachName)
    } catch (err: unknown) {
      const code = (err as Error)?.message

      // O backend devolve 402 CHAT_LIMIT_REACHED quando o usuário free esgota as
      // mensagens do dia. Mostrar o paywall vale mais que uma mensagem de erro.
      if (code === 'CHAT_LIMIT_REACHED') {
        setLimitReached(true)
        return
      }

      const errMsg: Message = {
        id: `e-${Date.now()}`,
        role: 'coach',
        text:
          code === 'CLAUDE_UNAVAILABLE'
            ? 'O servidor está sobrecarregado agora. Aguarde alguns segundos e tente novamente.'
            : 'Não consegui processar sua mensagem. Verifique sua conexão e tente novamente.',
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setIsLoading(false)
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80)
    }
  }

  const showSuggestions = messages.length === 0

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={PERSONA_IMAGES[coachName] ?? PERSONA_IMAGES['Rafael']}
            style={styles.avatarCircle}
          />
          <View style={styles.headerText}>
            <Text style={styles.headerName}>{coachName}</Text>
            <Text style={styles.headerSub}>Personal trainer virtual</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(app)/profile')} style={styles.settingsBtn}>
            <Ionicons name="settings-outline" size={20} color="#555" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {showSuggestions && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Olá! Sou o Personal {coachName}</Text>
              <Text style={styles.emptyBody}>
                Estou aqui para ajudar com seu treino, explicar exercícios e acompanhar sua evolução.
                Escolha uma sugestão ou escreva sua dúvida.
              </Text>
            </View>
          )}

          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.coachBubble]}
            >
              <InlineText
                text={msg.text}
                style={[styles.bubbleText, msg.role === 'user' ? styles.userText : styles.coachText]}
              />
            </View>
          ))}

          {isLoading && (
            <View style={[styles.bubble, styles.coachBubble, styles.loadingBubble]}>
              <ActivityIndicator size="small" color="#4CAF50" />
            </View>
          )}

        </ScrollView>

        {/* Quick suggestions */}
        {showSuggestions && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.suggestionsRow}
            contentContainerStyle={styles.suggestionsContent}
          >
            {QUICK_SUGGESTIONS.map((s) => (
              <TouchableOpacity key={s} style={styles.chip} onPress={() => handleSend(s)}>
                <Text style={styles.chipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input bar — trocada pelo bloqueio quando o limite gratuito acaba */}
        {limitReached ? (
          <View style={styles.limitBar}>
            <View style={styles.limitIcon}>
              <Ionicons name="lock-closed" size={16} color="#4CAF50" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.limitTitle}>Suas 2 mensagens gratuitas acabaram</Text>
              <Text style={styles.limitText}>
                Converse sem limite com seu personal no plano completo.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.limitBtn}
              onPress={() => router.push('/(app)/paywall')}
            >
              <Text style={styles.limitBtnText}>Desbloquear</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              value={input}
              onChangeText={setInput}
              placeholder="Pergunte ao seu personal..."
              placeholderTextColor="#555"
              multiline
              maxLength={500}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={() => handleSend()}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnDisabled]}
              onPress={() => handleSend()}
              disabled={!input.trim() || isLoading}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  flex: { flex: 1 },

  limitBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: '#1F1F1F',
    padding: 14,
  },
  limitIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(76,175,80,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  limitTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
  limitText: { color: '#888', fontSize: 12, marginTop: 1 },
  limitBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  limitBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
    gap: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  headerText: { flex: 1 },
  headerName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerSub: { color: '#555', fontSize: 12, marginTop: 1 },
  settingsBtn: { padding: 4 },

  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 10 },

  emptyState: { alignItems: 'center', paddingTop: 32, paddingHorizontal: 16, gap: 12 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyBody: { color: '#666', fontSize: 14, textAlign: 'center', lineHeight: 20 },

  bubble: { maxWidth: '80%', borderRadius: 16, padding: 12 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#4CAF50', borderBottomRightRadius: 4 },
  coachBubble: { alignSelf: 'flex-start', backgroundColor: '#1A1A1A', borderBottomLeftRadius: 4 },
  loadingBubble: { paddingHorizontal: 20 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  coachText: { color: '#eee' },

  suggestionsRow: { flexGrow: 0 },
  suggestionsContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { color: '#aaa', fontSize: 13 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#1A2E1A' },
})
