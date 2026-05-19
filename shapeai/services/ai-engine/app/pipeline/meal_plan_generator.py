import logging

logger = logging.getLogger(__name__)

# ── Templates por objetivo (base ~2200 kcal/dia) ─────────────────────────────

_TEMPLATES = {
    "hypertrophy": [
        {
            "meal_type": "Café da Manhã",
            "name": "Ovos mexidos com aveia e banana",
            "description": "Proteína + carboidratos complexos para iniciar o dia com energia",
            "base_calories": 520, "base_protein": 32, "base_carbs": 60, "base_fat": 14,
            "ingredients": ["3 ovos inteiros", "60g de aveia em flocos", "1 banana média", "1 colher de sopa de azeite", "canela a gosto"],
        },
        {
            "meal_type": "Lanche da Manhã",
            "name": "Shake de whey com frutas",
            "description": "Rápido e proteico para manter o anabolismo entre refeições",
            "base_calories": 310, "base_protein": 28, "base_carbs": 38, "base_fat": 4,
            "ingredients": ["1 scoop de whey protein (30g)", "200ml de leite desnatado", "1 maçã", "gelo a gosto"],
        },
        {
            "meal_type": "Almoço",
            "name": "Frango grelhado com arroz e feijão",
            "description": "Refeição completa com proteína magra, carboidrato e leguminosas",
            "base_calories": 680, "base_protein": 48, "base_carbs": 80, "base_fat": 12,
            "ingredients": ["180g de peito de frango", "100g de arroz branco cozido", "80g de feijão carioca cozido", "salada de folhas verdes à vontade", "1 colher de sopa de azeite"],
        },
        {
            "meal_type": "Lanche da Tarde",
            "name": "Iogurte grego com granola",
            "description": "Proteína de absorção lenta com carboidratos para o treino",
            "base_calories": 290, "base_protein": 18, "base_carbs": 35, "base_fat": 7,
            "ingredients": ["200g de iogurte grego natural", "30g de granola sem açúcar", "1 colher de sopa de mel"],
        },
        {
            "meal_type": "Jantar",
            "name": "Carne moída com batata-doce e legumes",
            "description": "Proteína completa com carboidrato de baixo IG para recuperação noturna",
            "base_calories": 560, "base_protein": 38, "base_carbs": 55, "base_fat": 16,
            "ingredients": ["150g de carne moída patinho", "150g de batata-doce cozida", "brócolis e cenoura refogados à vontade", "temperos naturais"],
        },
    ],
    "fat_loss": [
        {
            "meal_type": "Café da Manhã",
            "name": "Omelete com abacate e café",
            "description": "Proteína + gordura saudável para saciedade e foco matinal",
            "base_calories": 380, "base_protein": 26, "base_carbs": 8, "base_fat": 26,
            "ingredients": ["3 ovos inteiros", "1/4 de abacate", "tomate e cebola a gosto", "café preto sem açúcar"],
        },
        {
            "meal_type": "Lanche da Manhã",
            "name": "Castanhas e café preto",
            "description": "Lanche leve rico em gorduras boas para controle do apetite",
            "base_calories": 190, "base_protein": 6, "base_carbs": 8, "base_fat": 16,
            "ingredients": ["30g de mix de castanhas (castanha-do-pará, amêndoas, nozes)", "café preto sem açúcar"],
        },
        {
            "meal_type": "Almoço",
            "name": "Frango grelhado com salada e ovo",
            "description": "Alta proteína, baixo carboidrato para acelerar a queima de gordura",
            "base_calories": 520, "base_protein": 52, "base_carbs": 18, "base_fat": 22,
            "ingredients": ["200g de peito de frango grelhado", "2 ovos cozidos", "salada verde variada (alface, rúcula, agrião)", "tomate cereja", "1 colher de sopa de azeite e limão"],
        },
        {
            "meal_type": "Lanche da Tarde",
            "name": "Iogurte natural com whey",
            "description": "Proteína com baixo carboidrato para controle calórico",
            "base_calories": 230, "base_protein": 28, "base_carbs": 14, "base_fat": 5,
            "ingredients": ["150g de iogurte natural desnatado", "1/2 scoop de whey protein (15g)", "canela e adoçante a gosto"],
        },
        {
            "meal_type": "Jantar",
            "name": "Peixe grelhado com legumes no vapor",
            "description": "Refeição leve e proteica para fechar o dia sem comprometer o déficit",
            "base_calories": 360, "base_protein": 40, "base_carbs": 22, "base_fat": 10,
            "ingredients": ["200g de tilápia ou atum grelhado", "abobrinha, brócolis e couve-flor cozidos no vapor", "limão e ervas a gosto", "1 colher de chá de azeite"],
        },
    ],
    "conditioning": [
        {
            "meal_type": "Café da Manhã",
            "name": "Vitamina de banana com aveia e whey",
            "description": "Energia rápida e proteína para suportar treinos intensos",
            "base_calories": 480, "base_protein": 30, "base_carbs": 65, "base_fat": 8,
            "ingredients": ["1 banana", "50g de aveia", "1 scoop whey protein (30g)", "200ml de leite desnatado", "1 colher de mel"],
        },
        {
            "meal_type": "Lanche da Manhã",
            "name": "Fruta com pasta de amendoim",
            "description": "Energia sustentada com gordura boa para treinos longos",
            "base_calories": 260, "base_protein": 8, "base_carbs": 32, "base_fat": 12,
            "ingredients": ["1 maçã ou pera", "1 colher de sopa de pasta de amendoim integral (30g)"],
        },
        {
            "meal_type": "Almoço",
            "name": "Frango com macarrão integral e legumes",
            "description": "Carboidrato complexo + proteína para recuperação e energia",
            "base_calories": 620, "base_protein": 42, "base_carbs": 72, "base_fat": 12,
            "ingredients": ["160g de frango grelhado", "80g de macarrão integral cozido", "molho de tomate natural", "espinafre refogado", "azeite"],
        },
        {
            "meal_type": "Lanche da Tarde",
            "name": "Torrada integral com ricota",
            "description": "Lanche prático e equilibrado para manter energia antes do treino",
            "base_calories": 240, "base_protein": 14, "base_carbs": 28, "base_fat": 7,
            "ingredients": ["2 fatias de pão integral", "3 colheres de sopa de ricota", "tomate e orégano a gosto"],
        },
        {
            "meal_type": "Jantar",
            "name": "Salmão com quinoa e brócolis",
            "description": "Ômega-3 + proteína completa + carboidrato nutritivo para recuperação",
            "base_calories": 520, "base_protein": 38, "base_carbs": 42, "base_fat": 20,
            "ingredients": ["160g de salmão grelhado", "80g de quinoa cozida", "brócolis cozido no vapor", "limão e ervas finas", "1 colher de azeite"],
        },
    ],
    "maintenance": [
        {
            "meal_type": "Café da Manhã",
            "name": "Tapioca com ovo e queijo",
            "description": "Café da manhã clássico e equilibrado com proteína e energia",
            "base_calories": 420, "base_protein": 24, "base_carbs": 48, "base_fat": 14,
            "ingredients": ["2 colheres de sopa de goma de tapioca (40g)", "2 ovos mexidos", "30g de queijo minas", "café ou suco natural"],
        },
        {
            "meal_type": "Lanche da Manhã",
            "name": "Frutas com iogurte",
            "description": "Lanche leve e nutritivo entre refeições",
            "base_calories": 210, "base_protein": 10, "base_carbs": 32, "base_fat": 4,
            "ingredients": ["200g de iogurte natural", "1 banana ou maçã", "1 colher de mel"],
        },
        {
            "meal_type": "Almoço",
            "name": "Frango ou carne com arroz, feijão e salada",
            "description": "O prato brasileiro completo para manutenção saudável",
            "base_calories": 650, "base_protein": 40, "base_carbs": 72, "base_fat": 14,
            "ingredients": ["150g de frango ou patinho grelhado", "100g arroz branco", "80g feijão cozido", "salada mista à vontade", "azeite e limão"],
        },
        {
            "meal_type": "Lanche da Tarde",
            "name": "Pão integral com pasta de atum",
            "description": "Proteína e carboidrato complexo para tarde produtiva",
            "base_calories": 270, "base_protein": 20, "base_carbs": 28, "base_fat": 8,
            "ingredients": ["2 fatias de pão integral", "1 lata de atum em água (120g)", "1 colher de maionese light", "tomate em rodelas"],
        },
        {
            "meal_type": "Jantar",
            "name": "Omelete misto com batata-doce",
            "description": "Refeição leve e completa para o fim do dia",
            "base_calories": 450, "base_protein": 30, "base_carbs": 42, "base_fat": 16,
            "ingredients": ["3 ovos", "50g de queijo minas picado", "tomate, cebola e pimentão a gosto", "120g de batata-doce cozida", "temperos naturais"],
        },
    ],
}


def _calc_scale(goal: str, height_cm: float, weight_kg: float, sex: str) -> float:
    """Calcula fator de escala baseado no TDEE estimado."""
    age = 25
    if sex.upper() == "M":
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    else:
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161

    tdee = bmr * 1.55

    target = {
        "fat_loss": tdee * 0.82,
        "hypertrophy": tdee * 1.12,
        "conditioning": tdee * 1.0,
        "maintenance": tdee * 1.0,
    }.get(goal, tdee)

    base_calories = 2200.0
    return round(target / base_calories, 3)


def generate_meal_plan(profile: dict) -> list[dict]:
    goal = profile.get("goal", "maintenance")
    height = float(profile.get("height_cm") or 170)
    weight = float(profile.get("weight_kg") or 75)
    sex = str(profile.get("sex", "M"))

    template = _TEMPLATES.get(goal, _TEMPLATES["maintenance"])
    scale = _calc_scale(goal, height, weight, sex)

    meals = []
    for meal in template:
        meals.append({
            "meal_type": meal["meal_type"],
            "name": meal["name"],
            "description": meal["description"],
            "calories_approx": round(meal["base_calories"] * scale),
            "protein_g": round(meal["base_protein"] * scale),
            "carbs_g": round(meal["base_carbs"] * scale),
            "fats_g": round(meal["base_fat"] * scale),
            "ingredients": meal["ingredients"],
        })

    logger.info("[meal_plan_generator] Generated template plan for goal=%s scale=%.2f", goal, scale)
    return meals
