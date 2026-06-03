from fastapi import APIRouter

from app.schemas import PasswordChange, UserCredentials, UserProfile
from app.services.users import authenticate_user, change_password, register_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserProfile)
async def register(body: UserCredentials):
    return register_user(body.email, body.password)


@router.post("/login", response_model=UserProfile)
async def login(body: UserCredentials):
    return authenticate_user(body.email, body.password)


@router.post("/change-password", response_model=UserProfile)
async def update_password(body: PasswordChange):
    return change_password(body.email, body.current_password, body.new_password)
