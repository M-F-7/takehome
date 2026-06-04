from fastapi import APIRouter

from app.services.llm import check_openai_status, is_openai_configured

router = APIRouter()


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "Evollis Support Agent",
        "openai_configured": is_openai_configured(),
    }


@router.get("/health/openai")
async def openai_health():
    status = check_openai_status()
    return {
        "status": "ok" if status.get("model_call_ok") else "degraded",
        **status,
    }
