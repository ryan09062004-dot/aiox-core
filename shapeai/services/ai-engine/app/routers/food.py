import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.pipeline.food_analyzer import analyze_food_image

logger = logging.getLogger(__name__)
router = APIRouter()


class FoodAnalyzeRequest(BaseModel):
    image_base64: str
    media_type: str = "image/jpeg"


@router.post("/analyze-food")
async def analyze_food(request: FoodAnalyzeRequest):
    try:
        result = analyze_food_image(request.image_base64, request.media_type)
        if "error" in result:
            raise HTTPException(status_code=422, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Food analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Erro ao analisar imagem")
