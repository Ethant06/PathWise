from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255, examples=["Ada Lovelace"])
    email: EmailStr = Field(examples=["ada@uw.edu"])
    password: str = Field(min_length=8, max_length=128, examples=["correct-horse"])


class LoginRequest(BaseModel):
    email: EmailStr = Field(examples=["ada@uw.edu"])
    password: str = Field(min_length=1, max_length=128)


class GoogleLoginRequest(BaseModel):
    id_token: str = Field(
        min_length=1,
        description=(
            "Google ID token from the Google sign-in screen. "
            "The server checks it with Google. The demo token is not accepted."
        ),
    )


class UserPublic(BaseModel):
    id: int
    name: str
    email: EmailStr
    auth_provider: str = Field(description="password or google")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic
