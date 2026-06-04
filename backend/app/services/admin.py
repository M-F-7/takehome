import hashlib

from fastapi import Header, HTTPException

from app.core.config import ADMIN_EMAIL, ADMIN_PASSWORD, APP_TITLE
from app.schemas import AdminSession


def admin_is_configured() -> bool:
    return bool((ADMIN_EMAIL or "").strip() and (ADMIN_PASSWORD or "").strip())


def build_admin_token() -> str:
    seed = f"{ADMIN_EMAIL or ''}|{ADMIN_PASSWORD or ''}|{APP_TITLE}"
    return hashlib.sha256(seed.encode("utf-8")).hexdigest()


def admin_login(email: str, password: str) -> AdminSession:
    if not admin_is_configured():
        raise HTTPException(status_code=503, detail="Acces admin non configure")

    if email.strip() != (ADMIN_EMAIL or "").strip() or password != (ADMIN_PASSWORD or ""):
        raise HTTPException(status_code=401, detail="Identifiants admin invalides")

    return AdminSession(token=build_admin_token())


def require_admin_token(x_admin_token: str | None = Header(default=None)) -> str:
    if not admin_is_configured():
        raise HTTPException(status_code=503, detail="Acces admin non configure")
    if not x_admin_token or x_admin_token != build_admin_token():
        raise HTTPException(status_code=401, detail="Acces admin refuse")
    return x_admin_token
