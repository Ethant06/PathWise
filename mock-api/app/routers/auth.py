import hashlib

import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.auth import GoogleLoginRequest, LoginRequest, RegisterRequest, TokenResponse, UserPublic
from app.schemas.common import ErrorBody
from app.security import create_access_token, decode_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])
bearer = HTTPBearer()


def _public(user: User) -> UserPublic:
    provider = "google" if user.google_sub and not user.password_hash else "password"
    return UserPublic(id=user.id, name=user.name, email=user.email, auth_provider=provider)


def _token(user: User) -> TokenResponse:
    return TokenResponse(access_token=create_access_token(user.id), user=_public(user))


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    try:
        user_id = decode_access_token(credentials.credentials)
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token.") from exc
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User no longer exists.")
    return user


@router.post("/register", response_model=TokenResponse, responses={400: {"model": ErrorBody}})
def register(body: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    existing = db.scalar(select(User).where(User.email == body.email.lower()))
    if existing is not None:
        raise HTTPException(status_code=400, detail="An account with that email already exists.")
    user = User(
        email=body.email.lower(),
        name=body.name.strip(),
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _token(user)


@router.post("/login", response_model=TokenResponse, responses={401: {"model": ErrorBody}})
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if user is None or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    return _token(user)


@router.post("/google", response_model=TokenResponse, responses={400: {"model": ErrorBody}})
def google_login(body: GoogleLoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Accepts a Google ID token. Verification against Google is not connected yet."""
    if body.id_token == "mock-google-token":
        google_sub, name, email = ("google-demo-sub", "UW Student", "student@uw.edu")
    else:
        google_sub = body.id_token[:128]
        name = "Google user"
        digest = hashlib.sha256(google_sub.encode()).hexdigest()[:12]
        email = f"g-{digest}@gmail.com"

    user = db.scalar(select(User).where(User.google_sub == google_sub))
    if user is None:
        user = db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(email=email, name=name, google_sub=google_sub, password_hash=None)
        db.add(user)
        db.commit()
        db.refresh(user)
    elif user.google_sub is None:
        user.google_sub = google_sub
        db.commit()
        db.refresh(user)
    return _token(user)


@router.get("/me", response_model=UserPublic, responses={401: {"model": ErrorBody}})
def me(user: User = Depends(get_current_user)) -> UserPublic:
    return _public(user)
