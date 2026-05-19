export interface MealItem {
  meal_type: string
  name: string
  description: string
  calories_approx: number
  protein_g: number
  carbs_g: number
  fats_g: number
  ingredients: string[]
  preparation_method?: string
  image_url?: string
  alternatives?: Omit<MealItem, 'alternatives'>[]
}

export interface MealPlan {
  id: string
  user_id: string
  goal: string
  height_cm: number
  weight_kg: number
  sex: string
  meals: MealItem[]
  generated_at: string
}
