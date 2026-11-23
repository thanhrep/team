from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.core.auth import get_current_user, require_roles, log_audit
from app.models.database import User, UserRoleEnum, UserStatusEnum

router = APIRouter(prefix="/auth", tags=["Authentication"])

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

class ApproveUserRequest(BaseModel):
    user_id: int
    status: UserStatusEnum
    role: UserRoleEnum

@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter((User.username == req.username) | (User.email == req.email)).first():
        raise HTTPException(status_code=400, detail="Tên đăng nhập hoặc Email đã tồn tại.")

    # Rule: Check if first user in database -> Make SUPER_ADMIN, else PENDING
    user_count = db.query(User).count()
    if user_count == 0:
        role = UserRoleEnum.SUPER_ADMIN
        status_val = UserStatusEnum.APPROVED
    else:
        role = UserRoleEnum.STAFF
        status_val = UserStatusEnum.PENDING

    new_user = User(
        username=req.username,
        email=req.email,
        full_name=req.full_name,
        hashed_password=hash_password(req.password),
        role=role,
        status=status_val
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_audit(db, new_user, "REGISTER", "User", str(new_user.id), after_data={"username": req.username, "status": status_val.value})

    return {
        "success": True,
        "message": "Đăng ký thành công! " + (
            "Tài khoản đầu tiên đã được thiết lập SUPER_ADMIN." if user_count == 0
            else "Tài khoản đang ở trạng thái PENDING. Vui lòng đợi Quản trị viên duyệt trước khi có thể đăng nhập xem dữ liệu."
        ),
        "status": status_val.value
    }

@router.post("/login")
def login(req: LoginRequest, response: Response, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user:
        raise HTTPException(status_code=400, detail="Tài khoản hoặc mật khẩu không chính xác.")

    if not verify_password(req.password, user.hashed_password):
        user.failed_attempts += 1
        if user.failed_attempts >= 5:
            user.status = UserStatusEnum.LOCKED
        db.commit()
        raise HTTPException(status_code=400, detail=f"Sai mật khẩu. Số lần thử còn lại: {max(0, 5 - user.failed_attempts)}.")

    # Check status
    if user.status != UserStatusEnum.APPROVED:
        if user.status == UserStatusEnum.PENDING:
            raise HTTPException(
                status_code=403,
                detail="Tài khoản của bạn đang chờ Quản trị viên duyệt. Chưa được phép truy cập dữ liệu."
            )
        elif user.status == UserStatusEnum.LOCKED:
            raise HTTPException(status_code=403, detail="Tài khoản đang bị khóa.")
        else:
            raise HTTPException(status_code=403, detail="Tài khoản bị từ chối truy cập.")

    # Reset failed attempts
    user.failed_attempts = 0
    db.commit()

    token = create_access_token({"sub": user.username, "role": user.role.value, "status": user.status.value})

    # Set cookie for browser sessions
    response.set_cookie(
        key="bizwork_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False, # True if behind SSL
        max_age=86400
    )

    log_audit(db, user, "LOGIN", "User", str(user.id), request=request)

    return {
        "success": True,
        "token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role.value,
            "status": user.status.value
        }
    }

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="bizwork_token")
    return {"success": True, "message": "Đã đăng xuất thành công."}

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role.value,
        "status": current_user.status.value
    }

# Admin endpoints for user approval and access control
@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.ADMIN))
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role.value,
            "status": u.status.value,
            "failed_attempts": u.failed_attempts,
            "created_at": u.created_at.isoformat() if u.created_at else None
        }
        for u in users
    ]

@router.post("/users/approve")
def approve_user(
    req: ApproveUserRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.ADMIN))
):
    target = db.query(User).filter(User.id == req.user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    # Guard: only SUPER_ADMIN can alter SUPER_ADMIN role or another ADMIN
    if target.role == UserRoleEnum.SUPER_ADMIN and admin.role != UserRoleEnum.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Chỉ có Super Admin mới có quyền thao tác trên tài khoản Super Admin.")

    before_state = {"status": target.status.value, "role": target.role.value}
    target.status = req.status
    target.role = req.role
    target.failed_attempts = 0
    db.commit()

    log_audit(
        db, admin, f"USER_{req.status.value}", "User", str(target.id),
        before_data=before_state,
        after_data={"status": target.status.value, "role": target.role.value},
        request=request
    )

    return {"success": True, "message": f"Đã cập nhật trạng thái người dùng sang {req.status.value} với vai trò {req.role.value}."}
