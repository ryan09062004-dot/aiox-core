import { apiGet, apiPost } from './api.client'
import type { MealPlan } from '@shapeai/shared'

export async function getLatestMealPlan(): Promise<MealPlan> {
  return apiGet<MealPlan>('/meal-plans/latest')
}

export async function generateMealPlan(): Promise<MealPlan> {
  return apiPost<MealPlan>('/meal-plans/generate')
}
