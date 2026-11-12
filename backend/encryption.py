import os
from pathlib import Path
from cryptography.fernet import Fernet

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
KEY_FILE = DATA_DIR / "secret.key"

def _get_or_create_key() -> bytes:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if KEY_FILE.exists():
        return KEY_FILE.read_bytes().strip()
    
    key = Fernet.generate_key()
    KEY_FILE.write_bytes(key)
    return key

_fernet = Fernet(_get_or_create_key())

def encrypt_text(plain_text: str) -> str:
    if not plain_text:
        return ""
    return _fernet.encrypt(plain_text.encode("utf-8")).decode("utf-8")

def decrypt_text(cipher_text: str) -> str:
    if not cipher_text:
        return ""
    try:
        return _fernet.decrypt(cipher_text.encode("utf-8")).decode("utf-8")
    except Exception:
        return ""
