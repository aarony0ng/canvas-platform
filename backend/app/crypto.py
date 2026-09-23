"""
Canvas token encryption using Fernet (AES-128-CBC + HMAC-SHA256).
The key is stored outside the database — in an environment variable
loaded from a secrets manager in production.
"""
from cryptography.fernet import Fernet
from app.config import get_settings


def _fernet() -> Fernet:
    return Fernet(get_settings().token_encryption_key.encode())


def encrypt_token(plaintext: str) -> bytes:
    return _fernet().encrypt(plaintext.encode())


def decrypt_token(ciphertext: bytes) -> str:
    return _fernet().decrypt(ciphertext).decode()
