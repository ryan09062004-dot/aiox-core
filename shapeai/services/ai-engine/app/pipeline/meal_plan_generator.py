import json
import logging
import os

import anthropic

logger = logging.getLogger(__name__)
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

_GOAL_LABELS = {
    "hypertrophy": "hipertrofia muscular",
    "fat_loss": "emagrecimento e definição",
    "conditioning": "condicionamento físico",
    "maintenance": "manutenção do peso",
}

SYSTEM_PROMPT = (
    "Você é um nutricionista esportivo especializado em nutrição para atletas.\n"
    "Gere um plano alimentar diário com exatamente 5 refeições personalizadas para o objetivo e perfil do usuário.\n\n"
    "Estrutura JSON obrigatória:\n"
    '{ "meals": [ MealItem, MealItem, MealItem, MealItem, MealItem ] }\n\n'
    "MealItem:\n"
    '{ "meal_type": <"Café da Manhã"|"Lanche da Manhã"|"Almoço"|"Lanche da Tarde"|"Jantar">,\n'
    '  "name": <string — nome do prato>,\n'
    '  "description": <string — descrição curta e apetitosa, max 80 chars>,\n'
    '  "calories_approx": <number>,\n'
    '  "protein_g": <number>,\n'
    '  "carbs_g": <number>,\n'
    '  "fats_g": <number>,\n'
    '  "ingredients": <string[] — lista de ingredientes com quantidades> }\n\n'
    "Regras:\n"
    "- Exatamente 5 refeições na ordem: Café da Manhã, Lanche da Manhã, Almoço, Lanche da Tarde, Jantar\n"
    "- Adaptar calorias e macros ao objetivo (hipertrofia = mais proteína/carbs; emagrecimento = déficit calórico; condicionamento = equilíbrio)\n"
    "- Usar alimentos acessíveis no Brasil\n"
    "- Receitas práticas e saborosas, não apenas frango com batata doce\n"
    "- Variar as fontes de proteína (frango, peixe, ovo, carne, whey)\n"
    "- Ingredientes com quantidades específicas em gramas ou medidas caseiras\n"
    "- Responda SOMENTE com JSON válido, sem markdown."
)


def generate_meal_plan(profile: dict) -> list[dict]:
    """Generate a daily meal plan personalized by goal, height, weight and sex."""
    goal_raw = profile.get("goal", "hypertrophy")
    goal_label = _GOAL_LABELS.get(goal_raw, goal_raw)
    sex_label = "homem" if profile.get("sex", "M").upper() == "M" else "mulher"
    height = profile.get("height_cm", "?")
    weight = profile.get("weight_kg", "?")

    user_prompt = (
        f"Perfil: {sex_label}, {height}cm, {weight}kg\n"
        f"Objetivo: {goal_label}\n\n"
        "Gere o plano alimentar completo do dia com 5 refeições adequadas a este perfil e objetivo."
    )

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            system=[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": user_prompt}],
        )
        raw = response.content[0].text.strip()
        raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        data = json.loads(raw)
        meals = data.get("meals", [])
        if not isinstance(meals, list) or len(meals) != 5:
            raise ValueError(f"Expected 5 meals, got {len(meals) if isinstance(meals, list) else type(meals)}")
        return meals
    except (anthropic.APIError, json.JSONDecodeError, ValueError, Exception) as exc:
        logger.error("[meal_plan_generator] Failed to generate meal plan: %s: %s", type(exc).__name__, exc)
        raise
