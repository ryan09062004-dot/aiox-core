#!/usr/bin/env python3
"""
Script de uso único para gerar imagens AI de todas as refeições com Imagen 3.

Execute uma vez dentro do diretório ai-engine:
    python generate_meal_images.py

Resultado salvo em: app/pipeline/meal_images_cache.json
O meal_plan_generator carrega o cache automaticamente na inicialização.

Requisitos:
  - GEMINI_API_KEY configurada no .env
  - AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET configurados
  - Bucket S3 com política de leitura pública para o prefixo meal-images/

Pode ser interrompido e retomado — imagens já geradas são puladas.
"""
import json
import os
import re
import sys
import time
import pathlib

from dotenv import load_dotenv
load_dotenv()

# ── deps ──────────────────────────────────────────────────────────────────────
try:
    import boto3
    from google import genai
    from google.genai import types as genai_types
except ImportError as exc:
    print(f"❌ Dependência faltando: {exc}")
    print("   Execute: pip install google-genai boto3")
    sys.exit(1)

# Add project to path so we can import the templates
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from app.pipeline.meal_plan_generator import _TEMPLATES

# ── config ────────────────────────────────────────────────────────────────────
BUCKET   = os.getenv("S3_BUCKET", "shapeai-photos")
REGION   = os.getenv("AWS_REGION", "us-east-1")
CACHE_FILE = pathlib.Path(__file__).parent / "app" / "pipeline" / "meal_images_cache.json"


def slugify(name: str) -> str:
    name = name.lower()
    for src, dst in [("ã","a"),("á","a"),("à","a"),("â","a"),("ä","a"),
                     ("é","e"),("ê","e"),("è","e"),("ë","e"),
                     ("í","i"),("î","i"),("ì","i"),("ï","i"),
                     ("õ","o"),("ó","o"),("ô","o"),("ò","o"),("ö","o"),
                     ("ú","u"),("û","u"),("ù","u"),("ü","u"),
                     ("ç","c"),("ñ","n")]:
        name = name.replace(src, dst)
    name = re.sub(r"[^a-z0-9]+", "-", name)
    return name.strip("-")


def get_all_meals() -> list[tuple[str, str]]:
    """Returns deduplicated (meal_type, meal_name) pairs."""
    seen: set[str] = set()
    result: list[tuple[str, str]] = []
    for goal_meals in _TEMPLATES.values():
        for slot in goal_meals:
            for opt in slot["options"]:
                name = opt["name"]
                if name not in seen:
                    seen.add(name)
                    result.append((slot["meal_type"], name))
    return result


def generate_image(client: "genai.Client", meal_name: str) -> bytes:
    prompt = (
        f"Professional food photography of '{meal_name}', a Brazilian healthy meal. "
        "Overhead shot on a clean white plate or bowl, natural soft daylight, "
        "minimalist background, sharp focus, appetizing and colorful presentation. "
        "Style: modern nutrition app photo, high quality, no text, no watermarks."
    )
    response = client.models.generate_images(
        model="imagen-3.0-generate-002",
        prompt=prompt,
        config=genai_types.GenerateImagesConfig(
            number_of_images=1,
            aspect_ratio="16:9",
        ),
    )
    return response.generated_images[0].image.image_bytes


def upload_to_s3(s3_client, key: str, image_bytes: bytes) -> str:
    s3_client.put_object(
        Bucket=BUCKET,
        Key=key,
        Body=image_bytes,
        ContentType="image/jpeg",
        ACL="public-read",
    )
    return f"https://{BUCKET}.s3.{REGION}.amazonaws.com/{key}"


def main() -> None:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌  GEMINI_API_KEY não encontrada no .env")
        sys.exit(1)

    if not os.getenv("AWS_ACCESS_KEY_ID"):
        print("❌  AWS_ACCESS_KEY_ID não encontrada no .env")
        sys.exit(1)

    # Load existing cache (allows resuming interrupted runs)
    cache: dict[str, str] = {}
    if CACHE_FILE.exists():
        with open(CACHE_FILE) as f:
            cache = json.load(f)
        print(f"📂 Cache existente: {len(cache)} imagens já geradas")

    genai_client = genai.Client(api_key=api_key)
    s3_client = boto3.client(
        "s3",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=REGION,
    )

    meals = get_all_meals()
    total = len(meals)
    generated = 0
    skipped = 0
    failed = 0

    print(f"\n🍽️  Total de refeições: {total}")
    print(f"📦 Bucket S3: {BUCKET} ({REGION})")
    print("─" * 60)

    for i, (meal_type, name) in enumerate(meals, 1):
        if name in cache:
            print(f"[{i:2}/{total}] ⏭  {name[:55]}")
            skipped += 1
            continue

        print(f"[{i:2}/{total}] 🎨 {name[:55]}...", end=" ", flush=True)
        try:
            image_bytes = generate_image(genai_client, name)
            key = f"meal-images/{slugify(name)}.jpg"
            url = upload_to_s3(s3_client, key, image_bytes)
            cache[name] = url
            generated += 1
            print(f"✅")

            # Save incrementally so interruptions don't lose progress
            CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(cache, f, ensure_ascii=False, indent=2)

            # Respect API rate limits
            if i < total:
                time.sleep(1.2)

        except Exception as exc:
            failed += 1
            print(f"❌ {exc}")
            time.sleep(3)

    print("─" * 60)
    print(f"\n✅ Concluído!")
    print(f"   Geradas:  {generated}")
    print(f"   Puladas:  {skipped} (já existiam)")
    print(f"   Falhas:   {failed}")
    print(f"\n📁 Cache: {CACHE_FILE}")
    print("\n🚀 Reinicie o ai-engine para carregar as novas imagens.")
    if failed > 0:
        print(f"⚠️  Rode novamente para tentar as {failed} imagem(ns) que falharam.")


if __name__ == "__main__":
    main()
