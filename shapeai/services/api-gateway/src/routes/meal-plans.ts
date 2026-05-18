import { FastifyInstance } from 'fastify'
import axios from 'axios'
import { pool } from '../db/client'
import { requireAuth } from '../middleware/auth'

async function checkMealPlanFreemium(userId: string): Promise<void> {
  const { rows } = await pool.query<{ count: string; subscription_status: string }>(
    `SELECT
       (SELECT COUNT(*) FROM meal_plans WHERE user_id = $1) AS count,
       subscription_status
     FROM users WHERE id = $1`,
    [userId]
  )
  if (!rows[0]) throw new Error('User not found')
  const { count, subscription_status } = rows[0]
  if (parseInt(count) >= 1 && subscription_status === 'free') {
    const err = new Error('SUBSCRIPTION_REQUIRED') as Error & { statusCode: number }
    err.statusCode = 402
    throw err
  }
}

export async function mealPlansRoutes(app: FastifyInstance) {
  app.get('/meal-plans/latest', { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.authUser.id
    const { rows } = await pool.query(
      `SELECT * FROM meal_plans WHERE user_id = $1 ORDER BY generated_at DESC LIMIT 1`,
      [userId]
    )
    if (!rows[0]) return reply.status(404).send({ error: 'NOT_FOUND' })
    return reply.send(rows[0])
  })

  app.post('/meal-plans/generate', { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.authUser.id

    try {
      await checkMealPlanFreemium(userId)
    } catch (err: unknown) {
      const e = err as Error & { statusCode?: number }
      if (e.message === 'SUBSCRIPTION_REQUIRED') {
        return reply.status(402).send({ error: 'SUBSCRIPTION_REQUIRED' })
      }
      throw err
    }

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

    const meals = aiResponse.data.meals

    const { rows: inserted } = await pool.query(
      `INSERT INTO meal_plans (user_id, goal, height_cm, weight_kg, sex, meals)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, profile.primary_goal, profile.height_cm, profile.weight_kg, profile.biological_sex, JSON.stringify(meals)]
    )

    return reply.status(201).send(inserted[0])
  })
}
