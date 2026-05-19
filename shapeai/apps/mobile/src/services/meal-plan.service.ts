import { apiGet, apiPost } from './api.client'
import type { MealPlan } from '@shapeai/shared'

export interface MealPlanSummary {
  id: string
  goal: string
  generated_at: string
}

export async function listMealPlans(): Promise<MealPlanSummary[]> {
  return apiGet<MealPlanSummary[]>('/meal-plans')
}

export async function getMealPlanById(id: string): Promise<MealPlan> {
  return apiGet<MealPlan>(`/meal-plans/${id}`)
}

export async function getLatestMealPlan(): Promise<MealPlan> {
  return apiGet<MealPlan>('/meal-plans/latest')
}

export async function generateMealPlan(): Promise<MealPlan> {
  return apiPost<MealPlan>('/meal-plans/generate')
}
