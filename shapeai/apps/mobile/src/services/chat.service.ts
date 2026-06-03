import { supabase } from './supabase.client'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

export interface ChatResponse {
  reply: string
  persona: string
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export interface HistoryEntry {
  role: 'user' | 'assistant'
  content: string
}

export async function sendChatMessage(
  message: string,
  history?: HistoryEntry[]
): Promise<ChatResponse> {
  const headers = await getAuthHeaders()

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 35_000)

  try {
    const res = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ message, history }),
      signal: controller.signal,
    })

    const data = await res.json()

    if (!res.ok) {
      const errCode = (data as { error?: string }).error ?? ''
      if (errCode === 'CLAUDE_OVERLOADED' || errCode === 'CLAUDE_RATE_LIMIT' || errCode === 'CLAUDE_UNAVAILABLE') {
        throw new Error('CLAUDE_UNAVAILABLE')
      }
      throw new Error(errCode || `HTTP ${res.status}`)
    }

    return data as ChatResponse
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw new Error('CLAUDE_UNAVAILABLE')
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}
