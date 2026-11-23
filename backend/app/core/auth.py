import os
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_token
from app.models.database import User, UserRoleEnum, UserStatusEnum, AuditLog

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    # Authentication is enabled by default. Only explicitly disable it for isolated local tests.
    if os.getenv("BIZWORK_AUTH_DISABLED", "false").strip().lower() in {"1", "true", "yes", "on"}:
        test_admin = (
            db.query(User)
            .filter(
                User.role == UserRoleEnum.SUPER_ADMIN,
                User.status == UserStatusEnum.APPROVED
            )
            .order_by(User.id.asc())
            .first()
        )
        if not test_admin:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Chế độ dùng thử chưa được khởi tạo. Vui lòng kiểm tra bước seed dữ liệu."
            )
        return test_admin

    # Support cookie or Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    elif not token:
        cookie_token = request.cookies.get("bizwork_token")
        if cookie_token:
            token = cookie_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Chưa đăng nhập hoặc phiên làm việc đã hết hạn."
        )

    payload = decode_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn."
        )

    username = payload["sub"]
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Người dùng không tồn tại.")

    # Strict approval check remains active outside test mode.
    if user.status != UserStatusEnum.APPROVED:
        if user.status == UserStatusEnum.PENDING:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản của bạn đang chờ Quản trị viên duyệt. Vui lòng liên hệ Admin để được cấp quyền truy cập."
            )
        elif user.status == UserStatusEnum.LOCKED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản đã bị tạm khóa do vi phạm bảo mật hoặc vượt quá số lần thử."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản đã bị từ chối hoặc vô hiệu hóa quyền truy cập."
            )

    return user


def require_roles(*allowed_roles: UserRoleEnum):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role == UserRoleEnum.SUPER_ADMIN:
            return current_user
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bạn không có quyền thực hiện thao tác này. Yêu cầu quyền: {[r.value for r in allowed_roles]}"
            )
        return current_user
    return role_checker


def log_audit(
    db: Session,
    user: User,
    action: str,
    entity_name: str,
    entity_id: str = None,
    before_data: dict = None,
    after_data: dict = None,
    request: Request = None
):
    ip = request.client.host if request and request.client else None
    ua = request.headers.get("user-agent") if request else None
    log_entry = AuditLog(
        user_id=user.id if user else None,
        action=action,
        entity_name=entity_name,
        entity_id=str(entity_id) if entity_id else None,
        ip_address=ip,
        user_agent=ua,
        before_data=before_data,
        after_data=after_data
    )
    db.add(log_entry)
    db.commit()
