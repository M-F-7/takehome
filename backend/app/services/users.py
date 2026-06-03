import hashlib
from datetime import datetime, timezone

from fastapi import HTTPException

from app.schemas import UserProfile
from app.services.db import DB_LOCK, get_connection


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_email(email: str) -> str:
    return email.strip().lower()


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def sanitize_user(user: dict) -> UserProfile:
    return UserProfile(email=user["email"], created_at=user["created_at"])


def is_valid_email(email: str) -> bool:
    return "@" in email and "." in email.split("@")[-1]


def find_user_by_email(email: str) -> dict | None:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT email, password_hash, created_at FROM users WHERE email = ?",
            (email,),
        ).fetchone()
    return dict(row) if row else None


def register_user(email: str, password: str) -> UserProfile:
    normalized_email = normalize_email(email)
    if not normalized_email or not password.strip():
        raise HTTPException(status_code=400, detail="Email et mot de passe requis")
    if not is_valid_email(normalized_email):
        raise HTTPException(status_code=400, detail="Format d'email invalide")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caracteres")

    with DB_LOCK:
        if find_user_by_email(normalized_email):
            raise HTTPException(status_code=409, detail="Compte déjà existant")

        user = {
            "email": normalized_email,
            "password_hash": hash_password(password),
            "created_at": now_iso(),
        }
        with get_connection() as connection:
            connection.execute(
                "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)",
                (user["email"], user["password_hash"], user["created_at"]),
            )
            connection.commit()

    return sanitize_user(user)


def authenticate_user(email: str, password: str) -> UserProfile:
    normalized_email = normalize_email(email)
    if not normalized_email or not password.strip():
        raise HTTPException(status_code=400, detail="Email et mot de passe requis")
    if not is_valid_email(normalized_email):
        raise HTTPException(status_code=400, detail="Format d'email invalide")

    password_hash = hash_password(password)
    with DB_LOCK:
        user = find_user_by_email(normalized_email)
        if not user:
            raise HTTPException(status_code=404, detail="Aucun compte trouve pour cet email")
        if user.get("password_hash") != password_hash:
            raise HTTPException(status_code=401, detail="Mot de passe incorrect")
        return sanitize_user(user)


def require_existing_user(email: str | None) -> str:
    normalized_email = normalize_email(email or "")
    if not normalized_email:
        raise HTTPException(status_code=401, detail="Connexion requise pour creer un ticket")

    with DB_LOCK:
        if find_user_by_email(normalized_email):
            return normalized_email

    raise HTTPException(status_code=401, detail="Utilisateur inconnu")


def change_password(email: str, current_password: str, new_password: str) -> UserProfile:
    normalized_email = normalize_email(email)
    if not normalized_email or not current_password.strip() or not new_password.strip():
        raise HTTPException(status_code=400, detail="Email, mot de passe actuel et nouveau mot de passe requis")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit contenir au moins 6 caracteres")

    with DB_LOCK:
        user = find_user_by_email(normalized_email)
        if not user:
            raise HTTPException(status_code=404, detail="Aucun compte trouve pour cet email")
        if user.get("password_hash") != hash_password(current_password):
            raise HTTPException(status_code=401, detail="Mot de passe actuel incorrect")

        user["password_hash"] = hash_password(new_password)
        with get_connection() as connection:
            connection.execute(
                "UPDATE users SET password_hash = ? WHERE email = ?",
                (user["password_hash"], normalized_email),
            )
            connection.commit()
        return sanitize_user(user)
