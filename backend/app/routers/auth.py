from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt
import bcrypt
from app.database import get_db
from app.config import settings
from app.models.user import User
from app.models.bank import Bank
from app.schemas.user import UserRegister, UserLogin, UserOut, UserListItem, TokenResponse
from app.constants import DEFAULT_BANKS
from app.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


def hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode(), bcrypt.gensalt()).decode()


def verify_pin(pin: str, hashed: str) -> bool:
    return bcrypt.checkpw(pin.encode(), hashed.encode())


def create_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": user_id, "exp": expire},
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )


@router.get("/users", response_model=list[UserListItem])
async def list_users(db: AsyncSession = Depends(get_db)):
    """Public endpoint — returns usernames for login dropdown."""
    result = await db.execute(select(User).order_by(User.username))
    return result.scalars().all()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: UserRegister, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.username == body.username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        username=body.username,
        pin_hash=hash_pin(body.pin),
        display_name=body.display_name,
    )
    db.add(user)
    await db.flush()

    # Seed default banks for new user
    for bank_data in DEFAULT_BANKS:
        db.add(Bank(user_id=user.id, name=bank_data["name"], short_code=bank_data["short_code"]))

    await db.commit()
    await db.refresh(user)

    token = create_token(str(user.id))
    return TokenResponse(token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == body.username.lower()))
    user = result.scalar_one_or_none()
    if not user or not verify_pin(body.pin, user.pin_hash):
        raise HTTPException(status_code=401, detail="Invalid username or PIN")

    token = create_token(str(user.id))
    return TokenResponse(token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
