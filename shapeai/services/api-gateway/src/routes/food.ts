import { FastifyInstance } from 'fastify'
import axios from 'axios'
import { requireAuth } from '../middleware/auth'

export async function foodRoutes(app: FastifyInstance) {
  app.post('/food/scan', { preHandler: requireAuth }, async (request, reply) => {
    const { image_base64, media_type = 'image/jpeg' } = request.body as {
      image_base64?: string
      media_type?: string
    }

    if (!image_base64) {
      return reply.status(400).send({ error: 'image_base64 is required' })
    }

    const aiEngineUrl = process.env.AI_ENGINE_URL ?? 'http://localhost:8000'

    try {
      const response = await axios.post(
        `${aiEngineUrl}/analyze-food`,
        { image_base64, media_type },
        { timeout: 30000 }
      )
      return reply.send(response.data)
    } catch (err: unknown) {
      const e = err as { response?: { status: number; data?: { detail?: string } }; message: string }
      const status = e.response?.status ?? 500
      const message = e.response?.data?.detail ?? e.message
      return reply.status(status).send({ error: message })
    }
  })
}
