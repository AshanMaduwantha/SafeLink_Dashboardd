from app.core.security import create_access_token, decode_token, hash_password, verify_password


def test_password_hashing():
    password = "StrongPass123!"
    pw_hash = hash_password(password)
    assert verify_password(password, pw_hash)
    assert not verify_password("wrong", pw_hash)


def test_jwt_token_roundtrip():
    token = create_access_token("admin@example.com", "ADMIN")
    payload = decode_token(token)
    assert payload["sub"] == "admin@example.com"
    assert payload["role"] == "ADMIN"
