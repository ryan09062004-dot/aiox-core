import { create } from 'zustand'

export type Sex = 'M' | 'F'
export type Goal = 'hypertrophy' | 'fat_loss' | 'conditioning'

export interface QuizAnswers {
  sex: Sex | null
  goal: Goal | null
  height_cm: number | null
  weight_kg: number | null
}

interface OnboardingState {
  answers: QuizAnswers
  frontPhotoUri: string | null
  backPhotoUri: string | null
  setAnswer: <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) => void
  setPhotos: (front: string, back: string | null) => void
  clear: () => void
  isQuizComplete: () => boolean
  isReadyToAnalyze: () => boolean
}

const EMPTY_ANSWERS: QuizAnswers = {
  sex: null,
  goal: null,
  height_cm: null,
  weight_kg: null,
}

const STORAGE_KEY = 'shapeai.onboarding.answers'

// As respostas do quiz são leves e sobrevivem a um reload. As fotos ficam apenas em
// memória: o signup não confirma e-mail, então a pessoa nunca sai do app durante o
// funil, e persistir imagens estouraria o limite do localStorage.
function loadAnswers(): QuizAnswers {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return EMPTY_ANSWERS
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_ANSWERS
    return { ...EMPTY_ANSWERS, ...JSON.parse(raw) }
  } catch {
    return EMPTY_ANSWERS
  }
}

function saveAnswers(answers: QuizAnswers): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(answers))
  } catch {
    // storage indisponível (modo privado, cota) — o funil segue com estado em memória
  }
}

function clearAnswers(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignorado
  }
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  answers: loadAnswers(),
  frontPhotoUri: null,
  backPhotoUri: null,

  setAnswer: (key, value) =>
    set((state) => {
      const answers = { ...state.answers, [key]: value }
      saveAnswers(answers)
      return { answers }
    }),

  // A foto de costas é opcional: sem ela a análise roda, mas dorsais, trapézio e
  // glúteos ficam estimados em vez de avaliados.
  setPhotos: (front, back) => set({ frontPhotoUri: front, backPhotoUri: back || null }),

  clear: () => {
    clearAnswers()
    set({ answers: EMPTY_ANSWERS, frontPhotoUri: null, backPhotoUri: null })
  },

  isQuizComplete: () => {
    const { sex, goal, height_cm, weight_kg } = get().answers
    return sex !== null && goal !== null && height_cm !== null && weight_kg !== null
  },

  isReadyToAnalyze: () => get().isQuizComplete() && !!get().frontPhotoUri,
}))
