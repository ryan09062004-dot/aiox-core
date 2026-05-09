import base64
import io
import logging
import os

from PIL import Image

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

_DEFAULT_GOAL = (
    "fit and athletic body — lean, toned muscles, healthy and energetic appearance"
)


def _describe_body_goal(goal: str, fat_pct: float, sex: str) -> str:
    """
    Returns contextual transformation description based on current body composition + goal.
    All transformations reflect the natural body recomposition process:
    fat reduction AND muscle development always happen together, just in different proportions.
    """
    is_male = sex == "male"

    if is_male:
        fat_level = "very_high" if fat_pct >= 35 else "high" if fat_pct >= 25 else "moderate" if fat_pct >= 17 else "low"
    else:
        fat_level = "very_high" if fat_pct >= 42 else "high" if fat_pct >= 33 else "moderate" if fat_pct >= 25 else "low"

    descriptions = {
        # VERY HIGH — obesity level, radical transformation
        ("very_high", "hypertrophy"): (
            "radical full-body transformation: massive fat reduction across the entire body — "
            "stomach goes from very large to completely flat, face and neck become lean and defined, "
            "arms and legs lose all excess fat. Simultaneously, significant muscle mass is built throughout — "
            "developed chest, broad shoulders, bigger arms, strong legs, wide back. "
            "The result is a completely different silhouette: from obese to powerful, lean and muscular."
        ),
        ("very_high", "fat_loss"): (
            "radical fat loss transformation: the body sheds a massive amount of fat — "
            "stomach becomes very flat with visible abs, face and neck are lean and defined, "
            "arms go from heavy to slim and toned, legs become lean with visible muscle shape. "
            "The overall silhouette is completely transformed — from obese to lean, fit and athletic. "
            "Every part of the body looks dramatically smaller, leaner and more defined."
        ),
        ("very_high", "conditioning"): (
            "radical body recomposition: massive fat loss combined with strong muscle development — "
            "the entire silhouette is transformed from obese to athletic. Very flat stomach, "
            "lean and defined arms and legs, developed shoulders and back creating a V-taper. "
            "The body looks completely rebuilt — from heavy and shapeless to lean, muscular and athletic."
        ),
        ("very_high", "maintenance"): (
            "major transformation: significant fat reduction across the entire body — "
            "much flatter stomach, leaner face and neck, slim arms and legs. "
            "Natural muscle tone becomes visible as fat disappears. "
            "Overall silhouette goes from obese to fit and healthy."
        ),

        # HYPERTROPHY — fat reduction reveals and amplifies muscle gains
        ("high", "hypertrophy"): (
            "dramatically transformed physique: body fat drastically reduced (very flat stomach, much leaner torso and limbs) "
            "AND significant muscle mass added everywhere (large powerful chest, very broad shoulders, thick arms, "
            "strong developed back, bigger legs with visible quad and hamstring definition). "
            "Sharp muscle separation throughout — the body looks completely rebuilt: lean, dense and muscular."
        ),
        ("moderate", "hypertrophy"): (
            "seriously muscular and defined: noticeably leaner with substantial muscle mass gained throughout. "
            "Large chest with visible pec definition, broad powerful shoulders, thick arms with clear bicep and tricep separation, "
            "strong legs, wide back. Flat midsection with visible abs. Impressive, dense and athletic physique."
        ),
        ("low", "hypertrophy"): (
            "peak muscular physique: already lean so maximize muscle size and definition. "
            "Very large chest, extremely broad shoulders, thick veiny arms, powerful legs, "
            "wide developed back with clear muscle separation. Sharp abs, striated muscles — elite natural bodybuilder condition."
        ),

        # FAT LOSS — fat reduction reveals natural muscle tone underneath
        ("high", "fat_loss"): (
            "dramatically leaner and defined: major fat reduction revealing a completely transformed silhouette — "
            "very flat stomach with visible abs, lean and defined arms with clear muscle tone, "
            "toned legs with visible muscle shape, sharp jawline. "
            "The muscle definition underneath the fat is now fully exposed — fit, athletic and energetic."
        ),
        ("moderate", "fat_loss"): (
            "lean and sharply defined: significant fat loss revealing strong athletic muscles throughout. "
            "Visible six-pack abs, defined arms with clear muscle separation, lean toned legs, "
            "sharp V-taper. The body looks athletic and competition-ready — the result of serious training and diet."
        ),
        ("low", "fat_loss"): (
            "exceptionally lean and defined: ultra-low body fat with razor-sharp muscle definition everywhere. "
            "Visible abs with clear separation, striated shoulders and arms, lean shredded legs. "
            "Competition-level physique — every muscle visible and defined."
        ),

        # CONDITIONING — balanced recomposition
        ("high", "conditioning"): (
            "completely transformed athletic physique: major fat reduction combined with strong muscle development throughout — "
            "flat defined stomach, powerful shoulders and arms, strong legs, pronounced V-taper silhouette. "
            "Lean and muscular simultaneously — looks like a serious high-performance athlete."
        ),
        ("moderate", "conditioning"): (
            "elite athletic physique: lean with sharp muscle definition everywhere, strong V-taper, "
            "well-developed chest and shoulders, defined arms, powerful legs. "
            "Visible abs, athletic and symmetrical — the body of a top-level athlete in peak condition."
        ),
        ("low", "conditioning"): (
            "world-class athletic physique: extremely lean with exceptional muscle definition and symmetry, "
            "powerful V-taper with very broad shoulders and narrow waist, "
            "striated muscles throughout — elite performance athlete at their absolute peak."
        ),

        # MAINTENANCE — solid improvements
        ("high", "maintenance"): (
            "fit and well-defined: noticeably leaner with good muscle tone revealed throughout. "
            "Flat stomach, defined arms and shoulders, toned legs — healthy, athletic and energetic."
        ),
        ("moderate", "maintenance"): (
            "toned and defined: good muscle definition, flat stomach with ab outline visible, "
            "defined arms and shoulders, toned legs — fit and athletic appearance."
        ),
        ("low", "maintenance"): (
            "well-defined and fit: sharp muscle tone throughout, visible abs, "
            "defined arms and shoulders, toned legs — healthy athletic peak condition."
        ),
    }

    return descriptions.get((fat_level, goal), _DEFAULT_GOAL)


def _build_prompt(scores: dict, profile: dict, period_days: int) -> str:
    goal = profile.get("goal", "conditioning")
    sex = "male" if profile.get("sex", "M") == "M" else "female"
    fat_pct = float(scores.get("body_fat_estimate_pct", 20.0))
    goal_desc = _describe_body_goal(goal, fat_pct, sex)

    return (
        f"Edit this photograph of a {sex} person to show their dream physique.\n\n"
        f"FRAMING — very important:\n"
        f"- Keep the full body visible including the head\n"
        f"- Apply a circular Gaussian blur effect directly over the face — "
        f"a soft blurred circle covering only the face, leaving everything else sharp\n"
        f"- Keep the exact same camera angle and distance as the reference photo\n\n"
        f"WHAT TO KEEP UNCHANGED:\n"
        f"- The background and environment — exact same setting, same room, same location\n"
        f"- The lighting conditions — same light direction and mood as the original photo\n"
        f"- The skeletal frame — same height, same shoulder width, same limb proportions\n"
        f"- The skin tone — exact same complexion\n"
        f"- The pose — same stance and body angle as the reference\n\n"
        f"WHAT TO CHANGE — transform only the body composition:\n"
        f"{goal_desc}\n\n"
        f"STYLE:\n"
        f"- Photorealistic — must look like a real photograph, not an illustration or CGI\n"
        f"- Clothing: keep EXACTLY what the person is wearing in the reference photo — "
        f"if shirtless, stay shirtless; if wearing shorts, keep the exact same style, length and cut; "
        f"do NOT add or change any clothing item that is already visible in the photo\n"
        f"- Only replace clothing that fully covers areas being transformed AND makes it impossible to show the body change\n"
        f"- High detail and sharpness\n\n"
        f"Context: {sex} person currently at approximately {fat_pct:.0f}% body fat. "
        f"Show this same body — same frame, same proportions — with the dream physique achieved."
    )



def _resize(image_bytes: bytes, max_px: int = 1024) -> bytes:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    w, h = img.size
    if max(w, h) > max_px:
        ratio = max_px / max(w, h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def generate_future_self(
    front_bytes: bytes,
    scores: dict,
    profile: dict,
    period_days: int = 90,
) -> bytes | None:
    """Generate future-self image via Gemini. Returns JPEG bytes or None on failure."""
    print(f"[future_self] called — img={len(front_bytes) if front_bytes else 0}B key_set={bool(GEMINI_API_KEY)}", flush=True)
    if not GEMINI_API_KEY:
        logger.warning("[future_self] GEMINI_API_KEY not set — skipping")
        print("[future_self] GEMINI_API_KEY not set — skipping", flush=True)
        return None

    try:
        from google import genai as google_genai
        from google.genai import types as genai_types

        client = google_genai.Client(api_key=GEMINI_API_KEY)

        prompt = _build_prompt(scores, profile, period_days)
        print(f"[future_self] resizing image ({len(front_bytes)}B)...", flush=True)
        resized = _resize(front_bytes)
        print(f"[future_self] resized to {len(resized)}B, calling Gemini...", flush=True)

        response = client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=[
                genai_types.Part.from_bytes(data=resized, mime_type="image/jpeg"),
                genai_types.Part.from_text(text=prompt),
            ],
            config=genai_types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
                temperature=0.7,
                safety_settings=[
                    genai_types.SafetySetting(
                        category="HARM_CATEGORY_HARASSMENT",
                        threshold="BLOCK_ONLY_HIGH",
                    ),
                    genai_types.SafetySetting(
                        category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold="BLOCK_ONLY_HIGH",
                    ),
                ],
            ),
        )

        num_candidates = len(response.candidates) if response.candidates else 0
        print(f"[future_self] Gemini responded — {num_candidates} candidate(s)", flush=True)
        for candidate in response.candidates or []:
            finish = getattr(candidate, "finish_reason", None)
            has_content = candidate.content is not None and candidate.content.parts is not None
            num_parts = len(candidate.content.parts) if has_content else 0
            print(f"[future_self] candidate finish={finish} parts={num_parts}", flush=True)
            if not has_content:
                logger.warning("[future_self] Candidate blocked — finish_reason=%s", finish)
                print(f"[future_self] Candidate blocked by safety filter — finish_reason={finish}", flush=True)
                continue
            for part in candidate.content.parts:
                if part.inline_data and part.inline_data.data:
                    raw = part.inline_data.data
                    image_bytes = raw if isinstance(raw, bytes) else base64.b64decode(raw)
                    logger.info("[future_self] Image generated successfully (%s bytes)", len(image_bytes))
                    print(f"[future_self] Image generated successfully ({len(image_bytes)} bytes)", flush=True)
                    return image_bytes
            logger.warning("[future_self] Candidate had no image — finish_reason=%s", finish)
            print(f"[future_self] Candidate had no image — finish_reason={finish}", flush=True)

        logger.warning("[future_self] Gemini returned no image in response")
        print("[future_self] Gemini returned no image in response", flush=True)
        return None

    except Exception as exc:
        logger.error("[future_self] Generation failed (%s): %s", type(exc).__name__, exc)
        print(f"[future_self] Generation FAILED ({type(exc).__name__}): {exc}", flush=True)
        return None
