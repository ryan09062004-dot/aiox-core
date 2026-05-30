import { FastifyInstance } from 'fastify'
import axios from 'axios'
import { requireAuth } from '../middleware/auth'

const FOOD_PROMPT = `Analise esta imagem de alimento e retorne SOMENTE um objeto JSON válido (sem markdown, sem explicação) com exatamente estes campos:
{
  "food_name": "nome do alimento ou refeição em português",
  "portion_description": "tamanho estimado da porção (ex: '1 prato ~350g')",
  "calories": <número>,
  "protein_g": <número>,
  "carbs_g": <número>,
  "fat_g": <número>,
  "fiber_g": <número>,
  "confidence": "alta" | "média" | "baixa"
}
Use sua melhor estimativa baseada no tamanho visual da porção. Todos os valores numéricos devem ser inteiros. Responda sempre em português.`

export async function foodRoutes(app: FastifyInstance) {
  app.post('/food/scan', { preHandler: requireAuth, bodyLimit: 6 * 1024 * 1024 }, async (request, reply) => {
    const { image_base64, media_type = 'image/jpeg' } = request.body as {
      image_base64?: string
      media_type?: string
    }

    if (!image_base64) {
      return reply.status(400).send({ error: 'image_base64 is required' })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return reply.status(500).send({ error: 'ANTHROPIC_API_KEY not configured' })
    }

    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type, data: image_base64 } },
                { type: 'text', text: FOOD_PROMPT },
              ],
            },
          ],
        },
        {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          timeout: 30000,
        }
      )

      const text: string = response.data?.content?.[0]?.text ?? ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return reply.status(500).send({ error: 'Could not parse food analysis response' })
      }

      const result = JSON.parse(jsonMatch[0])
      return reply.send(result)
    } catch (err: unknown) {
      const e = err as { response?: { status: number; data?: { error?: { message?: string } } }; message: string }
      const status = e.response?.status ?? 500
      const message = e.response?.data?.error?.message ?? e.message
      return reply.status(status).send({ error: message })
    }
  })
}
