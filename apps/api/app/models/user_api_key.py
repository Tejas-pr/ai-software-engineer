# apps/api/app/models/user_api_key.py
from sqlalchemy import UniqueConstraint
from sqlmodel import Field

from app.models.base import TimestampModel


class UserApiKey(TimestampModel, table=True):
    """A user's own LLM provider key (BYOK), encrypted at rest.

    `provider` matches the prefixes `app/agents/llm.py`'s `get_chat_model()`
    already routes on ("gemini", "claude", "gpt") — one row per provider per
    user. `encrypted_key` is never decrypted anywhere except inside
    `get_chat_model()` right before handing it to the provider SDK; the API
    layer (app/api/v1/settings.py) never returns it, only a masked preview.
    """

    __tablename__ = "user_api_keys"
    __table_args__ = (UniqueConstraint("user_id", "provider"),)

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    provider: str = Field(index=True)
    encrypted_key: str
