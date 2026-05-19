import json
import logging
import pathlib
import random

logger = logging.getLogger(__name__)

# ── AI image cache (generated once by generate_meal_images.py) ────────────────
_CACHE_FILE = pathlib.Path(__file__).parent / "meal_images_cache.json"
_AI_MEAL_IMAGES: dict[str, str] = {}

def _load_image_cache() -> None:
    if _CACHE_FILE.exists():
        try:
            with open(_CACHE_FILE) as f:
                _AI_MEAL_IMAGES.update(json.load(f))
            logger.info("[meal_plan_generator] Loaded %d AI meal images from cache", len(_AI_MEAL_IMAGES))
        except Exception as exc:
            logger.warning("[meal_plan_generator] Failed to load image cache: %s", exc)

_load_image_cache()

# ── Unsplash fallback images (used until AI cache is populated) ───────────────
_MEAL_IMAGES: dict[str, str] = {
    "Ovos mexidos com aveia e banana":             "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=700&q=80&fit=crop",
    "Panqueca proteica de banana":                  "https://images.unsplash.com/photo-1565299543923-37dd37887442?w=700&q=80&fit=crop",
    "Vitamina de banana com whey e pasta de amendoim": "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=700&q=80&fit=crop",
    "Omelete com abacate e café":                   "https://images.unsplash.com/photo-1582169505937-b9992bd01696?w=700&q=80&fit=crop",
    "Iogurte natural com frutas vermelhas e linhaça": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=700&q=80&fit=crop",
    "Tapioca de ovo com café preto":                "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=700&q=80&fit=crop",
    "Vitamina de banana com aveia e whey":          "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=700&q=80&fit=crop",
    "Torrada integral com ovo mexido e suco":       "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=700&q=80&fit=crop",
    "Mingau proteico de aveia com frutas":          "https://images.unsplash.com/photo-1517673408408-a45b83c5b1a6?w=700&q=80&fit=crop",
    "Tapioca com ovo e queijo minas":               "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=700&q=80&fit=crop",
    "Pão integral com ovo e abacate":               "https://images.unsplash.com/photo-1541807084-5c52e6a49121?w=700&q=80&fit=crop",
    "Aveia com iogurte, banana e mel":              "https://images.unsplash.com/photo-1517673408408-a45b83c5b1a6?w=700&q=80&fit=crop",
    "Frango grelhado com arroz e feijão":           "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=700&q=80&fit=crop",
    "Carne moída com macarrão integral":            "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=700&q=80&fit=crop",
    "Atum com arroz integral e legumes":            "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=700&q=80&fit=crop",
    "Frango grelhado com salada e ovo":             "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=700&q=80&fit=crop",
    "Atum com salada verde e azeite":               "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=700&q=80&fit=crop",
    "Tilápia assada com legumes coloridos":         "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=700&q=80&fit=crop",
    "Frango com macarrão integral e legumes":       "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=700&q=80&fit=crop",
    "Arroz integral com feijão e frango":           "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=700&q=80&fit=crop",
    "Patinho grelhado com batata-doce e salada":    "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=700&q=80&fit=crop",
    "Frango ou carne com arroz, feijão e salada":   "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=700&q=80&fit=crop",
    "Filé de frango com batata assada e legumes":   "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=700&q=80&fit=crop",
    "Macarrão integral com molho bolonhesa":        "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=700&q=80&fit=crop",
    "Iogurte grego com granola":                    "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=700&q=80&fit=crop",
    "Sanduíche proteico integral":                  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=700&q=80&fit=crop",
    "Shake de whey com aveia e banana":             "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=700&q=80&fit=crop",
    "Iogurte natural com whey e canela":            "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=700&q=80&fit=crop",
    "Pepino com pasta de ricota e ervas":           "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=700&q=80&fit=crop",
    "Frutas vermelhas com castanhas":               "https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=700&q=80&fit=crop",
    "Fruta com pasta de amendoim":                  "https://images.unsplash.com/photo-1571771894842-cbba1e1f5aae?w=700&q=80&fit=crop",
    "Torrada integral com ricota":                  "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=700&q=80&fit=crop",
    "Banana com iogurte grego":                     "https://images.unsplash.com/photo-1571771894842-cbba1e1f5aae?w=700&q=80&fit=crop",
    "Pão integral com pasta de atum":               "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=700&q=80&fit=crop",
    "Frutas com mix de castanhas":                  "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=700&q=80&fit=crop",
    "Iogurte com granola e mel":                    "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=700&q=80&fit=crop",
    "Carne moída com batata-doce e legumes":        "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=700&q=80&fit=crop",
    "Salmão grelhado com quinoa e espinafre":       "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=700&q=80&fit=crop",
    "Frango assado com arroz e brócolis":           "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=700&q=80&fit=crop",
    "Peixe grelhado com legumes no vapor":          "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=700&q=80&fit=crop",
    "Frango com chuchu e cenoura cozidos":          "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=700&q=80&fit=crop",
    "Omelete de claras com espinafre":              "https://images.unsplash.com/photo-1582169505937-b9992bd01696?w=700&q=80&fit=crop",
    "Salmão com quinoa e brócolis":                 "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=700&q=80&fit=crop",
    "Frango assado com batata-doce e salada":       "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=700&q=80&fit=crop",
    "Omelete com batata-doce e legumes":            "https://images.unsplash.com/photo-1582169505937-b9992bd01696?w=700&q=80&fit=crop",
    "Omelete misto com batata-doce":                "https://images.unsplash.com/photo-1582169505937-b9992bd01696?w=700&q=80&fit=crop",
    "Peixe grelhado com arroz e salada":            "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=700&q=80&fit=crop",
    "Frango ensopado com legumes":                  "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=700&q=80&fit=crop",
    "Iogurte grego com castanhas":                  "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=700&q=80&fit=crop",
    "Omelete de queijo minas":                      "https://images.unsplash.com/photo-1582169505937-b9992bd01696?w=700&q=80&fit=crop",
    "Cottage com nozes e mel":                      "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=700&q=80&fit=crop",
    "Iogurte desnatado com canela":                 "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=700&q=80&fit=crop",
    "Chá com banana pequena":                       "https://images.unsplash.com/photo-1571771894842-cbba1e1f5aae?w=700&q=80&fit=crop",
    "Claras de ovo mexidas com temperos":           "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=700&q=80&fit=crop",
    "Banana com manteiga de amendoim":              "https://images.unsplash.com/photo-1571771894842-cbba1e1f5aae?w=700&q=80&fit=crop",
    "Iogurte grego com mel":                        "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=700&q=80&fit=crop",
    "Torrada integral com ovo cozido":              "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=700&q=80&fit=crop",
    "Iogurte com frutas e canela":                  "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=700&q=80&fit=crop",
    "Torrada integral com queijo cottage":          "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=700&q=80&fit=crop",
    "Leite morno com mel e canela":                 "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=700&q=80&fit=crop",
}

_MEAL_IMAGE_FALLBACK: dict[str, str] = {
    "Café da Manhã":   "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=700&q=80&fit=crop",
    "Almoço":          "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=700&q=80&fit=crop",
    "Lanche da Tarde": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=700&q=80&fit=crop",
    "Jantar":          "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=700&q=80&fit=crop",
    "Ceia":            "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=700&q=80&fit=crop",
}

_TEMPLATES = {
    "hypertrophy": [
        {
            "meal_type": "Café da Manhã",
            "options": [
                {
                    "name": "Ovos mexidos com aveia e banana",
                    "description": "Proteína + carboidratos complexos para iniciar o dia com energia",
                    "preparation_method": "Cozinhe a aveia no leite por 3 min. Mexa os ovos no azeite por 2 min em fogo médio. Sirva com a banana fatiada e polvilhe canela.",
                    "base_calories": 520, "base_protein": 32, "base_carbs": 60, "base_fat": 14,
                    "ingredients": ["3 ovos inteiros", "60g de aveia em flocos", "1 banana média", "1 colher de sopa de azeite", "canela a gosto"],
                },
                {
                    "name": "Panqueca proteica de banana",
                    "description": "Lanche matinal rico em proteína e carboidratos naturais",
                    "preparation_method": "Amasse a banana e misture com os ovos, aveia e whey até formar uma massa homogênea. Asse em frigideira antiaderente por 2 min de cada lado em fogo baixo. Finalize com mel.",
                    "base_calories": 490, "base_protein": 30, "base_carbs": 58, "base_fat": 12,
                    "ingredients": ["2 ovos inteiros", "1 banana madura amassada", "50g de aveia", "1 scoop de whey (15g)", "1 colher de mel"],
                },
                {
                    "name": "Vitamina de banana com whey e pasta de amendoim",
                    "description": "Shake completo e rápido para quem não tem muito tempo pela manhã",
                    "preparation_method": "Coloque todos os ingredientes no liquidificador. Bata por 1 min até obter textura cremosa. Sirva gelado ou com cubos de gelo.",
                    "base_calories": 500, "base_protein": 34, "base_carbs": 56, "base_fat": 11,
                    "ingredients": ["1 banana congelada", "1 scoop de whey protein (30g)", "200ml de leite integral", "1 colher de pasta de amendoim integral", "canela a gosto"],
                },
            ],
        },
        {
            "meal_type": "Almoço",
            "options": [
                {
                    "name": "Frango grelhado com arroz e feijão",
                    "description": "Refeição completa com proteína magra, carboidrato e leguminosas",
                    "preparation_method": "Tempere o frango com sal, alho e limão. Grelhe por 5 min de cada lado em fogo médio-alto. Aqueça o arroz e feijão. Sirva com salada temperada com azeite e limão.",
                    "base_calories": 680, "base_protein": 48, "base_carbs": 80, "base_fat": 12,
                    "ingredients": ["180g de peito de frango", "100g de arroz branco cozido", "80g de feijão carioca cozido", "salada de folhas verdes à vontade", "1 colher de sopa de azeite"],
                },
                {
                    "name": "Carne moída com macarrão integral",
                    "description": "Proteína completa com carboidrato complexo para energia prolongada",
                    "preparation_method": "Refogue a carne moída com cebola e alho picados por 5 min. Adicione o molho de tomate e cozinhe mais 5 min em fogo médio. Cozinhe o macarrão al dente e sirva com o molho.",
                    "base_calories": 700, "base_protein": 45, "base_carbs": 82, "base_fat": 16,
                    "ingredients": ["150g de carne moída patinho", "80g de macarrão integral cozido", "molho de tomate natural", "salada verde à vontade", "azeite e temperos"],
                },
                {
                    "name": "Atum com arroz integral e legumes",
                    "description": "Fonte de ômega-3 com carboidrato de baixo IG para recuperação",
                    "preparation_method": "Cozinhe o arroz integral conforme embalagem (~25 min). Refogue os legumes no azeite por 5 min. Escorra o atum e misture aos legumes. Sirva sobre o arroz com limão.",
                    "base_calories": 640, "base_protein": 46, "base_carbs": 74, "base_fat": 10,
                    "ingredients": ["1 lata de atum em água (120g)", "100g de arroz integral cozido", "cenoura, brócolis e abobrinha refogados", "1 colher de azeite", "limão e temperos"],
                },
            ],
        },
        {
            "meal_type": "Lanche da Tarde",
            "options": [
                {
                    "name": "Iogurte grego com granola",
                    "description": "Proteína de absorção lenta com carboidratos para o treino",
                    "preparation_method": "Monte em pote ou tigela: camada de iogurte, granola por cima e finalize com mel. Sirva frio.",
                    "base_calories": 290, "base_protein": 18, "base_carbs": 35, "base_fat": 7,
                    "ingredients": ["200g de iogurte grego natural", "30g de granola sem açúcar", "1 colher de sopa de mel"],
                },
                {
                    "name": "Sanduíche proteico integral",
                    "description": "Lanche prático e equilibrado para suprir a energia antes do treino",
                    "preparation_method": "Aqueça o frango desfiado em frigideira por 2 min. Monte o sanduíche com pão, frango, queijo, alface e tomate. Sirva imediatamente.",
                    "base_calories": 320, "base_protein": 22, "base_carbs": 38, "base_fat": 8,
                    "ingredients": ["2 fatias de pão integral", "100g de frango desfiado temperado", "30g de queijo minas", "alface e tomate"],
                },
                {
                    "name": "Shake de whey com aveia e banana",
                    "description": "Shake pré-treino rápido e rico em proteínas e carboidratos",
                    "preparation_method": "Bata todos os ingredientes no liquidificador por 30 segundos. Sirva imediatamente antes do treino.",
                    "base_calories": 280, "base_protein": 26, "base_carbs": 32, "base_fat": 5,
                    "ingredients": ["1 scoop de whey protein (30g)", "200ml de leite desnatado", "30g de aveia em flocos", "1 banana pequena"],
                },
            ],
        },
        {
            "meal_type": "Jantar",
            "options": [
                {
                    "name": "Carne moída com batata-doce e legumes",
                    "description": "Proteína completa com carboidrato de baixo IG para recuperação noturna",
                    "preparation_method": "Cozinhe a batata-doce em cubos por 15 min. Refogue a carne moída com temperos por 5 min. Salteie os legumes no azeite por 3 min. Monte o prato e sirva.",
                    "base_calories": 560, "base_protein": 38, "base_carbs": 55, "base_fat": 16,
                    "ingredients": ["150g de carne moída patinho", "150g de batata-doce cozida", "brócolis e cenoura refogados à vontade", "temperos naturais"],
                },
                {
                    "name": "Salmão grelhado com quinoa e espinafre",
                    "description": "Ômega-3 e proteína completa para recuperação e redução de inflamação",
                    "preparation_method": "Cozinhe a quinoa em água com sal por 15 min. Grelhe o salmão por 3 min de cada lado. Refogue o espinafre com alho por 2 min. Sirva tudo junto com limão e ervas.",
                    "base_calories": 580, "base_protein": 40, "base_carbs": 50, "base_fat": 18,
                    "ingredients": ["160g de salmão grelhado", "80g de quinoa cozida", "espinafre refogado com alho", "limão e ervas finas", "1 colher de azeite"],
                },
                {
                    "name": "Frango assado com arroz e brócolis",
                    "description": "Clássico pós-treino equilibrado com proteína, carbs e fibras",
                    "preparation_method": "Tempere o frango com ervas, azeite e alho. Asse a 200°C por 30 min. Cozinhe o brócolis no vapor por 5 min. Sirva com arroz e azeite a gosto.",
                    "base_calories": 550, "base_protein": 42, "base_carbs": 52, "base_fat": 12,
                    "ingredients": ["180g de coxa de frango assada", "80g de arroz branco", "brócolis cozido no vapor à vontade", "temperos naturais e azeite"],
                },
            ],
        },
        {
            "meal_type": "Ceia",
            "options": [
                {
                    "name": "Iogurte grego com castanhas",
                    "description": "Proteína de lenta absorção para suportar o jejum noturno",
                    "preparation_method": "Sirva o iogurte em tigela, adicione as castanhas e polvilhe canela. Pronto em 1 min.",
                    "base_calories": 240, "base_protein": 18, "base_carbs": 16, "base_fat": 12,
                    "ingredients": ["200g de iogurte grego integral", "20g de castanhas do Pará ou amêndoas", "canela a gosto"],
                },
                {
                    "name": "Omelete de queijo minas",
                    "description": "Proteína de rápida digestão para finalizar o dia com leveza",
                    "preparation_method": "Bata os ovos com sal e temperos. Aqueça a frigideira com azeite em fogo médio. Despeje os ovos, adicione o queijo fatiado e dobre ao meio quando as bordas firmarem.",
                    "base_calories": 260, "base_protein": 20, "base_carbs": 4, "base_fat": 18,
                    "ingredients": ["3 ovos inteiros", "50g de queijo minas frescal", "temperos naturais a gosto", "1 colher de chá de azeite"],
                },
                {
                    "name": "Cottage com nozes e mel",
                    "description": "Caseína natural de digestão lenta ideal antes de dormir",
                    "preparation_method": "Monte na tigela: cottage, nozes picadas por cima e finalize com mel e canela. Sirva imediatamente.",
                    "base_calories": 220, "base_protein": 20, "base_carbs": 14, "base_fat": 9,
                    "ingredients": ["150g de cottage cheese", "20g de nozes picadas", "1 colher de chá de mel", "canela a gosto"],
                },
            ],
        },
    ],
    "fat_loss": [
        {
            "meal_type": "Café da Manhã",
            "options": [
                {
                    "name": "Omelete com abacate e café",
                    "description": "Proteína + gordura saudável para saciedade e foco matinal",
                    "preparation_method": "Bata os ovos com sal. Refogue o tomate e cebola por 2 min. Despeje os ovos sobre os legumes e dobre em omelete quando firmar. Sirva com abacate fatiado e café preto.",
                    "base_calories": 380, "base_protein": 26, "base_carbs": 8, "base_fat": 26,
                    "ingredients": ["3 ovos inteiros", "1/4 de abacate", "tomate e cebola a gosto", "café preto sem açúcar"],
                },
                {
                    "name": "Iogurte natural com frutas vermelhas e linhaça",
                    "description": "Proteína leve com antioxidantes para início de dia saudável",
                    "preparation_method": "Sirva o iogurte em tigela. Adicione as frutas vermelhas por cima e finalize com a linhaça moída e canela.",
                    "base_calories": 320, "base_protein": 22, "base_carbs": 28, "base_fat": 8,
                    "ingredients": ["200g de iogurte natural desnatado", "100g de morango ou mirtilo", "1 colher de linhaça moída", "canela a gosto"],
                },
                {
                    "name": "Tapioca de ovo com café preto",
                    "description": "Café da manhã leve, proteico e sem glúten",
                    "preparation_method": "Hidrate a goma de tapioca por 2 min. Espalhe em frigideira seca em fogo médio até formar a tapioca (~2 min). Mexa os ovos separadamente e recheie a tapioca com ovos, tomate e manjericão.",
                    "base_calories": 300, "base_protein": 20, "base_carbs": 30, "base_fat": 10,
                    "ingredients": ["40g de goma de tapioca", "2 ovos mexidos", "tomate e manjericão a gosto", "café preto sem açúcar"],
                },
            ],
        },
        {
            "meal_type": "Almoço",
            "options": [
                {
                    "name": "Frango grelhado com salada e ovo",
                    "description": "Alta proteína, baixo carboidrato para acelerar a queima de gordura",
                    "preparation_method": "Grelhe o frango por 5 min cada lado. Cozinhe os ovos por 10 min, descasque e fatie. Monte a salada verde com tomate, frango fatiado e ovo. Tempere com azeite e limão.",
                    "base_calories": 520, "base_protein": 52, "base_carbs": 18, "base_fat": 22,
                    "ingredients": ["200g de peito de frango grelhado", "2 ovos cozidos", "salada verde variada", "tomate cereja", "1 colher de azeite e limão"],
                },
                {
                    "name": "Atum com salada verde e azeite",
                    "description": "Ômega-3 com fibras para saciedade prolongada e queima de gordura",
                    "preparation_method": "Monte a salada com as folhas, tomate cereja e azeitonas. Escorra o atum e adicione sobre a salada com o ovo cozido fatiado. Regue com azeite e vinagre balsâmico.",
                    "base_calories": 480, "base_protein": 48, "base_carbs": 14, "base_fat": 20,
                    "ingredients": ["150g de atum em água", "mix de folhas (rúcula, alface, agrião)", "1 ovo cozido", "azeitonas, tomate cereja", "azeite e vinagre balsâmico"],
                },
                {
                    "name": "Tilápia assada com legumes coloridos",
                    "description": "Proteína magra com fibras para manter o déficit calórico",
                    "preparation_method": "Tempere a tilápia com limão, ervas e sal. Asse a 200°C por 20 min. Corte os legumes em cubos, tempere com azeite e asse por 25 min junto ao peixe. Sirva com salada verde.",
                    "base_calories": 450, "base_protein": 46, "base_carbs": 20, "base_fat": 16,
                    "ingredients": ["200g de filé de tilápia assado", "abobrinha, berinjela e pimentão assados", "salada verde à vontade", "limão e ervas finas"],
                },
            ],
        },
        {
            "meal_type": "Lanche da Tarde",
            "options": [
                {
                    "name": "Iogurte natural com whey e canela",
                    "description": "Proteína com baixo carboidrato para controle calórico",
                    "preparation_method": "Misture o iogurte com o whey protein e adoçante em tigela até ficar homogêneo. Finalize com canela a gosto.",
                    "base_calories": 230, "base_protein": 28, "base_carbs": 14, "base_fat": 5,
                    "ingredients": ["150g de iogurte natural desnatado", "1/2 scoop de whey protein (15g)", "canela e adoçante a gosto"],
                },
                {
                    "name": "Pepino com pasta de ricota e ervas",
                    "description": "Lanche levíssimo e proteico para controlar a fome",
                    "preparation_method": "Fatie o pepino em rodelas. Tempere a ricota com ervas finas, azeite e pimenta do reino. Sirva como patê acompanhado do pepino.",
                    "base_calories": 180, "base_protein": 14, "base_carbs": 10, "base_fat": 8,
                    "ingredients": ["1 pepino fatiado", "100g de ricota amassada", "ervas finas e azeite a gosto", "pimenta do reino"],
                },
                {
                    "name": "Frutas vermelhas com castanhas",
                    "description": "Antioxidantes e gorduras boas para saciedade e metabolismo",
                    "preparation_method": "Lave e seque as frutas vermelhas. Monte em tigela e adicione o mix de castanhas. Acompanhe com chá verde sem açúcar.",
                    "base_calories": 200, "base_protein": 6, "base_carbs": 22, "base_fat": 11,
                    "ingredients": ["100g de frutas vermelhas (morango, mirtilo, framboesa)", "20g de mix de castanhas", "chá verde sem açúcar"],
                },
            ],
        },
        {
            "meal_type": "Jantar",
            "options": [
                {
                    "name": "Peixe grelhado com legumes no vapor",
                    "description": "Refeição leve e proteica para fechar o dia sem comprometer o déficit",
                    "preparation_method": "Tempere o peixe com limão, ervas e sal. Grelhe por 3 min de cada lado em fogo médio. Cozinhe os legumes no vapor por 5 min. Sirva com azeite e limão.",
                    "base_calories": 360, "base_protein": 40, "base_carbs": 22, "base_fat": 10,
                    "ingredients": ["200g de tilápia ou atum grelhado", "abobrinha, brócolis e couve-flor no vapor", "limão e ervas a gosto", "1 colher de chá de azeite"],
                },
                {
                    "name": "Frango com chuchu e cenoura cozidos",
                    "description": "Jantar leve e nutritivo com baixo teor calórico",
                    "preparation_method": "Cozinhe o chuchu e cenoura em cubos por 10 min na água com sal. Desfie o frango cozido e misture aos legumes escorridos. Tempere com azeite e sal.",
                    "base_calories": 340, "base_protein": 38, "base_carbs": 20, "base_fat": 9,
                    "ingredients": ["160g de peito de frango cozido e desfiado", "1 chuchu cozido em cubos", "1 cenoura cozida", "temperos naturais e azeite"],
                },
                {
                    "name": "Omelete de claras com espinafre",
                    "description": "Alta proteína com mínimo de calorias para encerrar o dia",
                    "preparation_method": "Bata as claras com o ovo inteiro e sal. Refogue o espinafre com alho e tomate por 2 min. Despeje as claras sobre os legumes e cozinhe em fogo baixo até firmar.",
                    "base_calories": 280, "base_protein": 34, "base_carbs": 8, "base_fat": 12,
                    "ingredients": ["4 claras + 1 ovo inteiro", "espinafre refogado com alho", "tomate em cubos", "1 colher de chá de azeite", "temperos a gosto"],
                },
            ],
        },
        {
            "meal_type": "Ceia",
            "options": [
                {
                    "name": "Iogurte desnatado com canela",
                    "description": "Proteína leve para reduzir o catabolismo noturno sem adicionar calorias",
                    "preparation_method": "Sirva o iogurte em tigela e polvilhe canela e adoçante a gosto. Pronto em segundos.",
                    "base_calories": 160, "base_protein": 14, "base_carbs": 16, "base_fat": 3,
                    "ingredients": ["200g de iogurte natural desnatado", "canela em pó a gosto", "adoçante a gosto (opcional)"],
                },
                {
                    "name": "Chá com banana pequena",
                    "description": "Ceia levíssima com triptofano para melhorar o sono",
                    "preparation_method": "Prepare o chá deixando a erva em infusão por 5 min em água quente. Sirva sem açúcar acompanhado da banana pequena.",
                    "base_calories": 120, "base_protein": 2, "base_carbs": 28, "base_fat": 1,
                    "ingredients": ["1 banana pequena madura", "chá de camomila ou melissa sem açúcar"],
                },
                {
                    "name": "Claras de ovo mexidas com temperos",
                    "description": "Proteína pura e de baixa caloria para proteger a massa muscular",
                    "preparation_method": "Bata as claras com cúrcuma, alho em pó e pimenta. Aqueça a frigideira com azeite em fogo médio e mexa as claras por 3 min até cozinhar.",
                    "base_calories": 140, "base_protein": 18, "base_carbs": 4, "base_fat": 4,
                    "ingredients": ["3 claras de ovo mexidas", "temperos naturais (alho, cúrcuma, pimenta)", "1 colher de chá de azeite"],
                },
            ],
        },
    ],
    "conditioning": [
        {
            "meal_type": "Café da Manhã",
            "options": [
                {
                    "name": "Vitamina de banana com aveia e whey",
                    "description": "Energia rápida e proteína para suportar treinos intensos",
                    "preparation_method": "Coloque todos os ingredientes no liquidificador e bata por 1 min. Sirva antes do treino para máxima energia.",
                    "base_calories": 480, "base_protein": 30, "base_carbs": 65, "base_fat": 8,
                    "ingredients": ["1 banana", "50g de aveia", "1 scoop whey protein (30g)", "200ml de leite desnatado", "1 colher de mel"],
                },
                {
                    "name": "Torrada integral com ovo mexido e suco",
                    "description": "Carboidrato complexo e proteína para energia e disposição",
                    "preparation_method": "Mexa os ovos no azeite por 3 min com tomate e manjericão. Esprema as laranjas. Sirva os ovos sobre as torradas com o suco natural.",
                    "base_calories": 420, "base_protein": 24, "base_carbs": 54, "base_fat": 10,
                    "ingredients": ["3 torradas integrais", "3 ovos mexidos com azeite", "tomate e manjericão", "suco de laranja natural (150ml)"],
                },
                {
                    "name": "Mingau proteico de aveia com frutas",
                    "description": "Preparo rápido com proteína e energia para manhãs corridas",
                    "preparation_method": "Cozinhe a aveia no leite por 3 min mexendo sempre. Retire do fogo e misture o whey rapidamente. Finalize com mel e banana fatiada.",
                    "base_calories": 450, "base_protein": 28, "base_carbs": 60, "base_fat": 7,
                    "ingredients": ["60g de aveia em flocos", "1 scoop de whey (30g)", "200ml de leite desnatado", "1/2 banana fatiada", "1 colher de mel"],
                },
            ],
        },
        {
            "meal_type": "Almoço",
            "options": [
                {
                    "name": "Frango com macarrão integral e legumes",
                    "description": "Carboidrato complexo + proteína para recuperação e energia",
                    "preparation_method": "Cozinhe o macarrão al dente (~10 min). Grelhe o frango em cubos por 5 min. Refogue o espinafre por 2 min. Misture tudo com molho de tomate e azeite.",
                    "base_calories": 620, "base_protein": 42, "base_carbs": 72, "base_fat": 12,
                    "ingredients": ["160g de frango grelhado", "80g de macarrão integral cozido", "molho de tomate natural", "espinafre refogado", "azeite"],
                },
                {
                    "name": "Arroz integral com feijão e frango",
                    "description": "Prato completo com aminoácidos essenciais e energia de longa duração",
                    "preparation_method": "Cozinhe o arroz integral por 25 min. Grelhe o frango por 5 min cada lado. Sirva com feijão aquecido e salada de tomate e pepino temperada com azeite.",
                    "base_calories": 640, "base_protein": 44, "base_carbs": 74, "base_fat": 11,
                    "ingredients": ["180g de frango grelhado", "100g de arroz integral cozido", "80g de feijão cozido", "salada de tomate e pepino", "azeite"],
                },
                {
                    "name": "Patinho grelhado com batata-doce e salada",
                    "description": "Carboidrato de baixo IG com proteína completa para treinos longos",
                    "preparation_method": "Cozinhe a batata-doce por 15 min. Tempere o patinho com sal e ervas. Grelhe por 4 min de cada lado. Sirva com salada variada e azeite.",
                    "base_calories": 610, "base_protein": 40, "base_carbs": 70, "base_fat": 14,
                    "ingredients": ["150g de patinho grelhado", "150g de batata-doce cozida", "salada variada à vontade", "1 colher de azeite"],
                },
            ],
        },
        {
            "meal_type": "Lanche da Tarde",
            "options": [
                {
                    "name": "Fruta com pasta de amendoim",
                    "description": "Energia sustentada com gordura boa para treinos longos",
                    "preparation_method": "Fatie a fruta em gomos. Sirva com a pasta de amendoim para mergulhar. Lanche pronto em 2 min.",
                    "base_calories": 260, "base_protein": 8, "base_carbs": 32, "base_fat": 12,
                    "ingredients": ["1 maçã ou pera", "1 colher de sopa de pasta de amendoim integral (30g)"],
                },
                {
                    "name": "Torrada integral com ricota",
                    "description": "Lanche prático e equilibrado para manter energia antes do treino",
                    "preparation_method": "Torre o pão se desejar. Espalhe a ricota com garfo. Adicione tomate fatiado e orégano por cima.",
                    "base_calories": 240, "base_protein": 14, "base_carbs": 28, "base_fat": 7,
                    "ingredients": ["2 fatias de pão integral", "3 colheres de sopa de ricota", "tomate e orégano a gosto"],
                },
                {
                    "name": "Banana com iogurte grego",
                    "description": "Potássio e proteína para evitar câimbras e manter o desempenho",
                    "preparation_method": "Fatie a banana e misture ao iogurte grego. Polvilhe canela e sirva. Ideal 30 min antes do treino.",
                    "base_calories": 250, "base_protein": 12, "base_carbs": 36, "base_fat": 5,
                    "ingredients": ["1 banana média", "150g de iogurte grego natural", "canela a gosto"],
                },
            ],
        },
        {
            "meal_type": "Jantar",
            "options": [
                {
                    "name": "Salmão com quinoa e brócolis",
                    "description": "Ômega-3 + proteína completa + carboidrato nutritivo para recuperação",
                    "preparation_method": "Cozinhe a quinoa em água com sal por 15 min. Grelhe o salmão por 3 min de cada lado. Cozinhe o brócolis no vapor por 5 min. Sirva com limão, ervas e azeite.",
                    "base_calories": 520, "base_protein": 38, "base_carbs": 42, "base_fat": 20,
                    "ingredients": ["160g de salmão grelhado", "80g de quinoa cozida", "brócolis cozido no vapor", "limão e ervas finas", "1 colher de azeite"],
                },
                {
                    "name": "Frango assado com batata-doce e salada",
                    "description": "Refeição completa para recuperação pós-treino",
                    "preparation_method": "Tempere o frango com ervas e azeite. Asse a 200°C por 30 min. Asse a batata-doce fatiada por 25 min. Sirva com salada verde e limão.",
                    "base_calories": 500, "base_protein": 38, "base_carbs": 45, "base_fat": 12,
                    "ingredients": ["180g de frango assado temperado", "150g de batata-doce assada", "salada verde à vontade", "azeite e limão"],
                },
                {
                    "name": "Omelete com batata-doce e legumes",
                    "description": "Refeição prática e completa com proteína e energia",
                    "preparation_method": "Cozinhe a batata-doce por 12 min. Refogue o pimentão e cebola por 3 min. Bata os ovos com o queijo e misture aos legumes. Cozinhe em frigideira em fogo médio até firmar.",
                    "base_calories": 480, "base_protein": 34, "base_carbs": 40, "base_fat": 16,
                    "ingredients": ["3 ovos inteiros + 2 claras", "100g de batata-doce cozida", "pimentão e cebola refogados", "30g de queijo minas", "temperos a gosto"],
                },
            ],
        },
        {
            "meal_type": "Ceia",
            "options": [
                {
                    "name": "Banana com manteiga de amendoim",
                    "description": "Carboidrato de absorção moderada para repor glicogênio durante o sono",
                    "preparation_method": "Fatie a banana. Sirva com a manteiga de amendoim e polvilhe canela por cima.",
                    "base_calories": 220, "base_protein": 8, "base_carbs": 30, "base_fat": 10,
                    "ingredients": ["1 banana média", "1 colher de sopa de manteiga de amendoim", "canela a gosto"],
                },
                {
                    "name": "Iogurte grego com mel",
                    "description": "Proteína de lenta absorção para recuperação muscular noturna",
                    "preparation_method": "Sirva o iogurte em tigela e finalize com mel e noz-moscada ou canela a gosto.",
                    "base_calories": 200, "base_protein": 14, "base_carbs": 18, "base_fat": 6,
                    "ingredients": ["150g de iogurte grego natural", "1 colher de chá de mel", "noz-moscada ou canela a gosto"],
                },
                {
                    "name": "Torrada integral com ovo cozido",
                    "description": "Proteína e carboidrato complexo para evitar catabolismo noturno",
                    "preparation_method": "Cozinhe os ovos por 10 min em água fervente. Descasque, fatie e sirva sobre a torrada com pimenta e sal.",
                    "base_calories": 230, "base_protein": 14, "base_carbs": 24, "base_fat": 8,
                    "ingredients": ["1 torrada integral", "2 ovos cozidos", "pimenta do reino e sal a gosto"],
                },
            ],
        },
    ],
    "maintenance": [
        {
            "meal_type": "Café da Manhã",
            "options": [
                {
                    "name": "Tapioca com ovo e queijo minas",
                    "description": "Café da manhã clássico e equilibrado com proteína e energia",
                    "preparation_method": "Hidrate a goma de tapioca por 2 min. Espalhe em frigideira seca e frite por 2 min de cada lado. Mexa os ovos separadamente e recheie a tapioca com ovos e queijo.",
                    "base_calories": 420, "base_protein": 24, "base_carbs": 48, "base_fat": 14,
                    "ingredients": ["2 colheres de sopa de goma de tapioca (40g)", "2 ovos mexidos", "30g de queijo minas", "café ou suco natural"],
                },
                {
                    "name": "Pão integral com ovo e abacate",
                    "description": "Café da manhã nutritivo com gorduras boas e proteína",
                    "preparation_method": "Estrele os ovos no azeite por 2 min. Amasse o abacate com sal e limão. Monte o sanduíche aberto com pão, abacate, ovo estrelado e tomate fatiado.",
                    "base_calories": 400, "base_protein": 18, "base_carbs": 42, "base_fat": 18,
                    "ingredients": ["2 fatias de pão integral", "2 ovos estrelados", "1/4 de abacate amassado", "tomate fatiado", "café preto"],
                },
                {
                    "name": "Aveia com iogurte, banana e mel",
                    "description": "Café da manhã rico em fibras para regular o intestino e saciar",
                    "preparation_method": "Misture a aveia crua com o iogurte e deixe descansar por 5 min (overnight oats). Fatie a banana e adicione com mel e canela antes de servir.",
                    "base_calories": 380, "base_protein": 18, "base_carbs": 52, "base_fat": 10,
                    "ingredients": ["50g de aveia em flocos", "150g de iogurte natural", "1 banana fatiada", "1 colher de mel", "canela a gosto"],
                },
            ],
        },
        {
            "meal_type": "Almoço",
            "options": [
                {
                    "name": "Frango ou carne com arroz, feijão e salada",
                    "description": "O prato brasileiro completo para manutenção saudável",
                    "preparation_method": "Grelhe ou cozinhe a proteína escolhida por 5 min cada lado. Aqueça o arroz e feijão. Monte o prato e sirva com salada temperada com azeite e limão.",
                    "base_calories": 650, "base_protein": 40, "base_carbs": 72, "base_fat": 14,
                    "ingredients": ["150g de frango ou patinho grelhado", "100g arroz branco", "80g feijão cozido", "salada mista à vontade", "azeite e limão"],
                },
                {
                    "name": "Filé de frango com batata assada e legumes",
                    "description": "Refeição equilibrada e saborosa para o dia a dia",
                    "preparation_method": "Tempere o frango com alecrim, alho e azeite. Asse junto com as batatas a 200°C por 35 min, virando na metade. Sirva com salada verde.",
                    "base_calories": 620, "base_protein": 42, "base_carbs": 66, "base_fat": 12,
                    "ingredients": ["180g de filé de frango temperado", "200g de batata assada com casca", "salada verde à vontade", "azeite e alecrim"],
                },
                {
                    "name": "Macarrão integral com molho bolonhesa",
                    "description": "Refeição clássica com carboidrato complexo e proteína saborosa",
                    "preparation_method": "Refogue a carne moída com cebola e alho por 5 min. Adicione o molho de tomate e temperos italianos. Cozinhe por 15 min em fogo baixo. Cozinhe o macarrão al dente e sirva com parmesão.",
                    "base_calories": 670, "base_protein": 38, "base_carbs": 78, "base_fat": 16,
                    "ingredients": ["80g de macarrão integral cozido", "120g de carne moída patinho", "molho de tomate artesanal", "15g de queijo parmesão ralado", "temperos italianos"],
                },
            ],
        },
        {
            "meal_type": "Lanche da Tarde",
            "options": [
                {
                    "name": "Pão integral com pasta de atum",
                    "description": "Proteína e carboidrato complexo para tarde produtiva",
                    "preparation_method": "Escorra o atum e misture com a maionese light. Espalhe sobre o pão integral e adicione tomate fatiado por cima.",
                    "base_calories": 270, "base_protein": 20, "base_carbs": 28, "base_fat": 8,
                    "ingredients": ["2 fatias de pão integral", "1 lata de atum em água (120g)", "1 colher de maionese light", "tomate em rodelas"],
                },
                {
                    "name": "Frutas com mix de castanhas",
                    "description": "Lanche natural e energético com gorduras boas",
                    "preparation_method": "Fatie ou pique a fruta em cubos. Sirva em tigela com o mix de castanhas. Acompanhe com chá ou suco natural sem açúcar.",
                    "base_calories": 240, "base_protein": 6, "base_carbs": 30, "base_fat": 12,
                    "ingredients": ["1 maçã, pera ou banana", "30g de mix de castanhas", "chá ou suco natural sem adição de açúcar"],
                },
                {
                    "name": "Iogurte com granola e mel",
                    "description": "Lanche saboroso e equilibrado para a tarde",
                    "preparation_method": "Sirva o iogurte em tigela. Adicione a granola, as frutas picadas e finalize com mel. Sirva frio.",
                    "base_calories": 260, "base_protein": 12, "base_carbs": 38, "base_fat": 6,
                    "ingredients": ["200g de iogurte natural", "25g de granola", "1 colher de mel", "frutas picadas a gosto"],
                },
            ],
        },
        {
            "meal_type": "Jantar",
            "options": [
                {
                    "name": "Omelete misto com batata-doce",
                    "description": "Refeição leve e completa para o fim do dia",
                    "preparation_method": "Cozinhe a batata-doce por 12 min. Refogue o pimentão, cebola e tomate por 3 min. Bata os ovos, adicione o queijo e os legumes. Cozinhe em frigideira antiaderente até firmar.",
                    "base_calories": 450, "base_protein": 30, "base_carbs": 42, "base_fat": 16,
                    "ingredients": ["3 ovos", "50g de queijo minas picado", "tomate, cebola e pimentão a gosto", "120g de batata-doce cozida", "temperos naturais"],
                },
                {
                    "name": "Peixe grelhado com arroz e salada",
                    "description": "Jantar leve e saboroso com proteína magra",
                    "preparation_method": "Tempere o peixe com limão, ervas e sal. Grelhe por 3 min de cada lado. Sirva com arroz aquecido e salada de pepino e tomate temperada com azeite.",
                    "base_calories": 440, "base_protein": 36, "base_carbs": 44, "base_fat": 11,
                    "ingredients": ["180g de tilápia ou merluza grelhada", "80g de arroz branco", "salada de pepino e tomate", "azeite e limão"],
                },
                {
                    "name": "Frango ensopado com legumes",
                    "description": "Refeição reconfortante e nutritiva para terminar o dia",
                    "preparation_method": "Refogue a cebola e alho por 2 min. Adicione o frango em pedaços e sele por 3 min. Adicione os legumes em cubos e o molho de tomate. Cozinhe em fogo baixo por 25 min.",
                    "base_calories": 460, "base_protein": 38, "base_carbs": 38, "base_fat": 14,
                    "ingredients": ["180g de coxa de frango desossada", "cenoura, batata e chuchu em cubos", "molho de tomate com cebola e alho", "temperos naturais a gosto"],
                },
            ],
        },
        {
            "meal_type": "Ceia",
            "options": [
                {
                    "name": "Iogurte com frutas e canela",
                    "description": "Ceia leve e saborosa para terminar o dia com equilíbrio",
                    "preparation_method": "Pique a fruta em cubos e misture ao iogurte. Finalize com canela a gosto. Sirva frio.",
                    "base_calories": 180, "base_protein": 10, "base_carbs": 24, "base_fat": 5,
                    "ingredients": ["150g de iogurte natural", "1 fruta picada (banana, maçã ou morango)", "canela a gosto"],
                },
                {
                    "name": "Torrada integral com queijo cottage",
                    "description": "Ceia prática e proteica para encerrar o dia",
                    "preparation_method": "Torre o pão se desejar. Espalhe o cottage generosamente com colher. Finalize com mel ou geleia sem açúcar a gosto.",
                    "base_calories": 200, "base_protein": 14, "base_carbs": 22, "base_fat": 6,
                    "ingredients": ["1 fatia de pão integral", "4 colheres de sopa de cottage cheese", "mel ou geleia sem açúcar a gosto"],
                },
                {
                    "name": "Leite morno com mel e canela",
                    "description": "Bebida reconfortante com triptofano para melhorar a qualidade do sono",
                    "preparation_method": "Aqueça o leite em fogo baixo sem deixar ferver. Adicione o mel, canela e noz-moscada. Mexa bem e sirva quente antes de dormir.",
                    "base_calories": 160, "base_protein": 8, "base_carbs": 22, "base_fat": 5,
                    "ingredients": ["200ml de leite integral ou desnatado morno", "1 colher de chá de mel", "canela e noz-moscada a gosto"],
                },
            ],
        },
    ],
}


def _calc_scale(goal: str, height_cm: float, weight_kg: float, sex: str) -> float:
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

    return round(target / 2200.0, 3)


def _build_meal(slot_meal_type: str, opt: dict, scale: float) -> dict:
    name = opt["name"]
    # AI-generated images take priority over Unsplash fallbacks
    image_url = _AI_MEAL_IMAGES.get(name) or _MEAL_IMAGES.get(name) or _MEAL_IMAGE_FALLBACK.get(slot_meal_type, "")
    return {
        "meal_type": slot_meal_type,
        "name": name,
        "description": opt["description"],
        "preparation_method": opt.get("preparation_method", ""),
        "calories_approx": round(opt["base_calories"] * scale),
        "protein_g": round(opt["base_protein"] * scale),
        "carbs_g": round(opt["base_carbs"] * scale),
        "fats_g": round(opt["base_fat"] * scale),
        "ingredients": opt["ingredients"],
        "image_url": image_url,
    }


def generate_meal_plan(profile: dict) -> list[dict]:
    goal = profile.get("goal", "maintenance")
    height = float(profile.get("height_cm") or 170)
    weight = float(profile.get("weight_kg") or 75)
    sex = str(profile.get("sex", "M"))

    template = _TEMPLATES.get(goal, _TEMPLATES["maintenance"])
    scale = _calc_scale(goal, height, weight, sex)

    meals = []
    for slot in template:
        opts = slot["options"]
        main_idx = random.randint(0, len(opts) - 1)
        main = opts[main_idx]
        alts = [o for i, o in enumerate(opts) if i != main_idx]

        meal = _build_meal(slot["meal_type"], main, scale)
        meal["alternatives"] = [_build_meal(slot["meal_type"], a, scale) for a in alts]
        meals.append(meal)

    logger.info("[meal_plan_generator] goal=%s scale=%.2f meals=%d", goal, scale, len(meals))
    return meals
