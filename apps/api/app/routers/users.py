from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import require_roles
from app.core.security import hash_password
from app.db.models import User, UserRole
from app.db.session import get_db
from app.schemas import RegisterRequest, UserOut

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_roles([UserRole.ADMIN]))):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [UserOut.model_validate(user) for user in users]


@router.post("", response_model=UserOut)
def create_user(payload: RegisterRequest, db: Session = Depends(get_db), _: User = Depends(require_roles([UserRole.ADMIN]))):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
    try:
        role = UserRole(payload.role)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
    user = User(email=payload.email, password_hash=hash_password(payload.password), role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)
