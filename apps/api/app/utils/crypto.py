# apps/api/app/utils/crypto.py
"""
Symmetric encryption for secrets we must store but never log or expose —
right now just the user's GitHub access token.

Fernet (from the `cryptography` package) is AES-128-CBC + HMAC under one
key, stdlib-simple to use, and the standard choice for "encrypt this blob at
rest" when you don't need per-field key rotation or asymmetric keys. Rolling
our own AES mode/IV handling would be the wrong kind of lazy here — this is
a security boundary, not a place to save a dependency.
"""

from functools import lru_cache

from cryptography.fernet import Fernet

from app.config import settings


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    if not settings.TOKEN_ENCRYPTION_KEY:
        raise ValueError(
            "TOKEN_ENCRYPTION_KEY is not configured. Generate one with: "
            'python -c "from cryptography.fernet import Fernet; '
            'print(Fernet.generate_key().decode())"'
        )
    return Fernet(settings.TOKEN_ENCRYPTION_KEY.encode())


def encrypt_token(plaintext: str) -> str:
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt_token(ciphertext: str) -> str:
    return _fernet().decrypt(ciphertext.encode()).decode()
