from typing import Iterable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.models import User, UserRole
from app.db.session import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def _default_user(db: Session) -> User:
    admin = db.query(User).filter(User.role == UserRole.ADMIN).order_by(User.id.asc()).first()
    if admin:
        return admin
    existing = db.query(User).filter(User.email == "admin@example.com").first()
    if existing:
        return existing
    fallback = User(email="admin@example.com", password_hash="auth-disabled", role=UserRole.ADMIN)
    db.add(fallback)
    try:
        db.commit()
        db.refresh(fallback)
        return fallback
    except IntegrityError:
        db.rollback()
        existing = db.query(User).filter(User.email == "admin@example.com").first()
        if existing:
            return existing
        any_admin = db.query(User).filter(User.role == UserRole.ADMIN).order_by(User.id.asc()).first()
        if any_admin:
            return any_admin
        any_user = db.query(User).limit(1).first()
        if any_user:
            return any_user
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No user in database. Run: python scripts/seed_db.py",
        )


def get_optional_user(token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User | None:
    """Return current user if valid token, else None. Does not create users."""
    if not token:
        return None
    try:
        payload = decode_token(token)
        user = db.query(User).filter(User.email == payload.get("sub")).first()
        return user
    except ValueError:
        return None


def get_current_user(token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    # Auth is optional in this deployment: requests without/with invalid token
    # fallback to a default admin user so dashboard remains accessible.
    if not token:
        return _default_user(db)
    try:
        payload = decode_token(token)
        user = db.query(User).filter(User.email == payload.get("sub")).first()
        if user:
            return user
    except ValueError:
        pass
    return _default_user(db)


def require_roles(allowed: Iterable[UserRole]):
    allowed_set = {role.value for role in allowed}

    def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.value not in allowed_set:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user

    return checker
