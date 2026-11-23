"""
BIZWORK Production Initialization Script
Initializes database schema and securely prompts for initial administrator credentials
without storing hardcoded passwords.
"""
import os
import getpass
from app.core.database import SessionLocal, init_db
from app.core.security import hash_password
from app.models.database import (
    User, UserRoleEnum, UserStatusEnum, ExchangeRate, Team, MediaImage,
    Product, ProductVariant, Customer, Order, OrderItem, OrderStatusEnum,
    Workbook, WorkbookSheet
)

def init_system():
    init_db()
    db = SessionLocal()

    admin_username = os.getenv("ADMIN_INIT_USERNAME", "admin")
    admin_password = os.getenv("ADMIN_INIT_PASSWORD")
    admin_email = os.getenv("ADMIN_INIT_EMAIL", "admin@domain.local")

    existing_admin = db.query(User).filter(User.role == UserRoleEnum.SUPER_ADMIN).first()
    if not existing_admin:
        if not admin_password:
            admin_password = getpass.getpass("Enter master password for Super Admin: ")
            if not admin_password:
                admin_password = os.urandom(12).hex()
                print(f"[SECURITY] Generated random password: {admin_password}")

        admin = User(
            username=admin_username,
            email=admin_email,
            full_name="System Super Administrator",
            hashed_password=hash_password(admin_password),
            role=UserRoleEnum.SUPER_ADMIN,
            status=UserStatusEnum.APPROVED
        )
        db.add(admin)
        db.commit()
        print(f"[OK] Master administrator account initialized: {admin_username}")
    else:
        print("[INFO] Super Administrator already provisioned.")

    # Populate default business workbooks
    workbooks_catalog = [
        ("1. Danh mục sản phẩm áo bóng đá", "Quản lý mã sản phẩm, phân loại, giá bán JPY và link ảnh @mã"),
        ("2. Thư viện ảnh sản phẩm (@mã)", "Bảng tra cứu mã định danh @1, @2, tên file và trạng thái"),
        ("3. Báo cáo Nhập xuất tồn kho", "Theo dõi biến động tồn kho theo size, ngưỡng cảnh báo thiếu hàng"),
        ("4. Quản lý Đơn hàng Nhật Bản", "Đơn hàng theo ngày, thông tin giao hàng Yamato/Sagawa, COD JPY"),
        ("5. Danh sách Khách hàng & Đội bóng", "Hồ sơ khách hàng Nhật, tên Furigana, lịch sử đặt áo team"),
        ("6. Bảng tính Giá vốn & Lợi nhuận", "Tính toán chi phí may, in ấn, vận chuyển và tỷ suất sinh lời"),
        ("7. Theo dõi Nhà cung cấp & Xưởng may", "Đơn vị may gia công, giá nhập phôi áo và tiến độ sản xuất"),
        ("8. Báo cáo Doanh thu & Tỷ giá JPY/VND", "Hạch toán doanh thu ngoại tệ JPY quy đổi VND theo ngày"),
        ("9. Kế hoạch Sản xuất & Đặt áo team", "Lịch sản xuất áo thi đấu, áo di chuyển cho các giải phủi Nhật Bản"),
        ("10. Theo dõi Thiết kế & In ấn Số áo", "Danh sách in tên cầu thủ, số áo, logo tài trợ theo yêu cầu")
    ]

    for title, desc in workbooks_catalog:
        if not db.query(Workbook).filter(Workbook.title == title).first():
            wb = Workbook(title=title, description=desc, category="business")
            db.add(wb)
            db.flush()
            sheet = WorkbookSheet(
                workbook_id=wb.id,
                name="Trang 1",
                sheet_order=0,
                row_count=100,
                col_count=26,
                data={"A1": {"v": "Mục"}, "B1": {"v": "Nội Dung"}}
            )
            db.add(sheet)

    db.commit()
    print("[OK] Default core enterprise spreadsheets ready.")

if __name__ == "__main__":
    init_system()
