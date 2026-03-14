import uuid
from datetime import datetime
from pydantic import BaseModel, field_validator


class UserRegister(BaseModel):
    username: str
    pin: str
    display_name: str | None = None

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username must be alphanumeric (underscores/dashes allowed)")
        return v.lower()

    @field_validator("pin")
    @classmethod
    def pin_length(cls, v: str) -> str:
        if not v.isdigit() or len(v) < 4 or len(v) > 6:
            raise ValueError("PIN must be 4-6 digits")
        return v


class UserLogin(BaseModel):
    username: str
    pin: str


class UserOut(BaseModel):
    id: uuid.UUID
    username: str
    display_name: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserListItem(BaseModel):
    username: str
    display_name: str | None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    token: str
    user: UserOut
