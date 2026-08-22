"""M8 smoke test: a user's own API key actually gets picked up over the
platform default, and the Settings CRUD round-trips for real against
Postgres — encrypt, store, decrypt, delete."""

from sqlmodel import Session, delete

from app.agents.llm import get_chat_model
from app.db import engine
from app.models.project import Project
from app.models.user import User
from app.models.user_api_key import UserApiKey
from app.services.user_api_keys import get_user_api_key
from app.utils.crypto import encrypt_token


def test_user_key_resolves_before_platform_default(monkeypatch):
    monkeypatch.setattr("app.agents.llm.settings.GEMINI_API_KEY", "platform-key")
    get_chat_model.cache_clear()

    with Session(engine) as session:
        user = User(username="m8-test-user", email="m8-test@example.com")
        session.add(user)
        session.commit()
        session.refresh(user)
        assert user.id is not None

        try:
            # No user key yet -> falls back to the platform key.
            model = get_chat_model("gemini-3.6-flash", user_id=user.id)
            assert model.google_api_key.get_secret_value() == "platform-key"  # type: ignore[union-attr]

            # Add a user key -> now that's what gets used instead.
            session.add(
                UserApiKey(
                    user_id=user.id,
                    provider="gemini",
                    encrypted_key=encrypt_token("users-own-key"),
                )
            )
            session.commit()
            get_chat_model.cache_clear()  # different user_id-keyed cache entry anyway, but be explicit

            model = get_chat_model("gemini-3.6-flash", user_id=user.id)
            assert model.google_api_key.get_secret_value() == "users-own-key"  # type: ignore[union-attr]
        finally:
            session.exec(delete(UserApiKey).where(UserApiKey.user_id == user.id))
            session.exec(delete(Project).where(Project.user_id == user.id))
            session.delete(user)
            session.commit()
            get_chat_model.cache_clear()


def test_settings_crud_roundtrip_encrypts_and_decrypts_for_real():
    with Session(engine) as session:
        user = User(username="m8-crud-user", email="m8-crud@example.com")
        session.add(user)
        session.commit()
        session.refresh(user)
        assert user.id is not None

        try:
            session.add(
                UserApiKey(
                    user_id=user.id,
                    provider="claude",
                    encrypted_key=encrypt_token("sk-ant-real-looking-key-1234"),
                )
            )
            session.commit()

            resolved = get_user_api_key(user.id, "claude")
            assert resolved == "sk-ant-real-looking-key-1234"
            assert get_user_api_key(user.id, "gpt") is None  # never set
        finally:
            session.exec(delete(UserApiKey).where(UserApiKey.user_id == user.id))
            session.delete(user)
            session.commit()
