import { FastifyInstance } from 'fastify'
import axios from 'axios'
import { pool } from '../db/client'
import { requireAuth } from '../middleware/auth'

function parseMeals(raw: unknown): unknown[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return [] }
  }
  return []
}

export async function mealPlansRoutes(app: FastifyInstance) {
  app.get('/meal-plans/latest', { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.authUser.id
    const { rows } = await pool.query(
      `SELECT * FROM meal_plans WHERE user_id = $1 ORDER BY generated_at DESC LIMIT 1`,
      [userId]
    )
    if (!rows[0]) return reply.status(404).send({ error: 'NOT_FOUND' })
    return reply.send({ ...rows[0], meals: parseMeals(rows[0].meals) })
  })

  app.post('/meal-plans/generate', { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.authUser.id

    const { rows: profileRows } = await pool.query(
      `SELECT height_cm, weight_kg, biological_sex, primary_goal FROM user_profiles WHERE user_id = $1`,
      [userId]
    )
    if (!profileRows[0]) return reply.status(404).send({ error: 'PROFILE_NOT_FOUND' })

    const profile = profileRows[0]
    const aiEngineUrl = process.env.AI_ENGINE_URL ?? 'http://localhost:8000'

    const aiResponse = await axios.post(`${aiEngineUrl}/meal-plan`, {
      goal: profile.primary_goal,
      height_cm: profile.height_cm,
      weight_kg: profile.weight_kg,
      sex: profile.biological_sex,
    })

    const meals: unknown[] = aiResponse.data.meals

    const { rows: inserted } = await pool.query<{ id: string; generated_at: string }>(
      `INSERT INTO meal_plans (user_id, goal, height_cm, weight_kg, sex, meals)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, goal, height_cm, weight_kg, sex, generated_at`,
      [userId, profile.primary_goal, Math.round(Number(profile.height_cm)), Math.round(Number(profile.weight_kg)), profile.biological_sex, JSON.stringify(meals)]
    )

    return reply.status(201).send({ ...inserted[0], user_id: userId, meals })
  })
}
