import { apiPost } from './api.client'

export interface FoodAnalysis {
  food_name: string
  portion_description: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  confidence: 'alta' | 'média' | 'baixa'
}

export async function analyzeFoodImage(base64: string, mediaType = 'image/jpeg'): Promise<FoodAnalysis> {
  return apiPost<FoodAnalysis>('/food/scan', { image_base64: base64, media_type: mediaType })
}
