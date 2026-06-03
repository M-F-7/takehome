import hashlib
import json
from datetime import datetime, timezone
from threading import Lock

from fastapi import HTTPException

from app.core.config import USERS_PATH
from app.schemas import UserProfile

USERS_LOCK = Lock()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_users_file() -> None:
    if not USERS_PATH.exists():
        USERS_PATH.write_text("[]", encoding="utf-8")


def load_users() -> list[dict]:
    ensure_users_file()
    with USERS_PATH.open("r", encoding="utf-8") as handle:
        try:
            data = json.load(handle)
            return data if isinstance(data, list) else []
        except json.JSONDecodeError:
            return []


def save_users(users: list[dict]) -> None:
    with USERS_PATH.open("w", encoding="utf-8") as handle:
        json.dump(users, handle, ensure_ascii=False, indent=2)


def normalize_email(email: str) -> str:
    return email.strip().lower()


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def sanitize_user(user: dict) -> UserProfile:
    return UserProfile(email=user["email"], created_at=user["created_at"])


def is_valid_email(email: str) -> bool:
    return "@" in email and "." in email.split("@")[-1]


def find_user_by_email(users: list[dict], email: str) -> dict | None:
    for user in users:
        if user.get("email") == email:
            return user
    return None


def register_user(email: str, password: str) -> UserProfile:
    normalized_email = normalize_email(email)
    if not normalized_email or not password.strip():
        raise HTTPException(status_code=400, detail="Email et mot de passe requis")
    if not is_valid_email(normalized_email):
        raise HTTPException(status_code=400, detail="Format d'email invalide")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caracteres")

    with USERS_LOCK:
        users = load_users()
        if find_user_by_email(users, normalized_email):
            raise HTTPException(status_code=409, detail="Compte déjà existant")

        user = {
            "email": normalized_email,
            "password_hash": hash_password(password),
            "created_at": now_iso(),
        }
        users.insert(0, user)
        save_users(users)

    return sanitize_user(user)


def authenticate_user(email: str, password: str) -> UserProfile:
    normalized_email = normalize_email(email)
    if not normalized_email or not password.strip():
        raise HTTPException(status_code=400, detail="Email et mot de passe requis")
    if not is_valid_email(normalized_email):
        raise HTTPException(status_code=400, detail="Format d'email invalide")

    password_hash = hash_password(password)
    with USERS_LOCK:
        users = load_users()
        user = find_user_by_email(users, normalized_email)
        if not user:
            raise HTTPException(status_code=404, detail="Aucun compte trouve pour cet email")
        if user.get("password_hash") != password_hash:
            raise HTTPException(status_code=401, detail="Mot de passe incorrect")
        return sanitize_user(user)


def require_existing_user(email: str | None) -> str:
    normalized_email = normalize_email(email or "")
    if not normalized_email:
        raise HTTPException(status_code=401, detail="Connexion requise pour creer un ticket")

    with USERS_LOCK:
        users = load_users()
        if any(user.get("email") == normalized_email for user in users):
            return normalized_email

    raise HTTPException(status_code=401, detail="Utilisateur inconnu")


def change_password(email: str, current_password: str, new_password: str) -> UserProfile:
    normalized_email = normalize_email(email)
    if not normalized_email or not current_password.strip() or not new_password.strip():
        raise HTTPException(status_code=400, detail="Email, mot de passe actuel et nouveau mot de passe requis")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit contenir au moins 6 caracteres")

    with USERS_LOCK:
        users = load_users()
        user = find_user_by_email(users, normalized_email)
        if not user:
            raise HTTPException(status_code=404, detail="Aucun compte trouve pour cet email")
        if user.get("password_hash") != hash_password(current_password):
            raise HTTPException(status_code=401, detail="Mot de passe actuel incorrect")

        user["password_hash"] = hash_password(new_password)
        save_users(users)
        return sanitize_user(user)
