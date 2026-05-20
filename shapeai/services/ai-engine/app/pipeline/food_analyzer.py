import json
import logging
import os

import anthropic

logger = logging.getLogger(__name__)
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

FOOD_PROMPT = """\
Você é um nutricionista especialista em alimentação brasileira. Analise esta foto e retorne SOMENTE um JSON válido, sem markdown.

Estrutura obrigatória:
{
  "food_name": <string: nome do alimento ou prato identificado, em português>,
  "portion_description": <string: estimativa da porção, ex: "Prato médio (~350g estimado)">,
  "calories": <int: calorias estimadas>,
  "protein_g": <int: proteínas em gramas>,
  "carbs_g": <int: carboidratos em gramas>,
  "fat_g": <int: gorduras em gramas>,
  "fiber_g": <int: fibras em gramas>,
  "confidence": <"alta"|"média"|"baixa">
}

Regras:
- Se não houver alimento identificável na foto, retorne: {"error": "Não foi possível identificar alimento nesta imagem"}
- Baseie-se em porções visuais típicas brasileiras
- Seja conservador: prefira subestimar a superestimar
- Indique confiança "baixa" quando o prato for misto ou difícil de estimar
"""


def analyze_food_image(image_base64: str, media_type: str = "image/jpeg") -> dict:
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": image_base64,
                    },
                },
                {"type": "text", "text": FOOD_PROMPT},
            ],
        }],
    )

    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    return json.loads(raw)
