"""
BIZWORK Data Seeder
Populates initial sample database: Super Admin, Japanese Football Kits, Default 10 Workbooks, and Exchange Rates.
"""
from datetime import datetime
from app.core.database import SessionLocal, init_db
from app.core.security import hash_password
from app.models.database import (
    User, UserRoleEnum, UserStatusEnum, MediaImage, Team, Product, ProductVariant,
    Customer, Order, OrderItem, OrderStatusEnum, Workbook, WorkbookSheet, ExchangeRate, SystemSetting
)

def seed_all():
    init_db()
    db = SessionLocal()

    # 1. Super Admin Account
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        admin = User(
            username="admin",
            email="admin@team.linkpc.net",
            full_name="Quản Trị Viên Hệ Thống (Super Admin)",
            hashed_password=hash_password("Bizwork@2026!Pro"),
            role=UserRoleEnum.SUPER_ADMIN,
            status=UserStatusEnum.APPROVED
        )
        db.add(admin)
        print("-> Created Super Admin: admin / Bizwork@2026!Pro")

    # 2. Staff Account (Pending approval demo)
    staff = db.query(User).filter(User.username == "staff_tokyo").first()
    if not staff:
        staff = User(
            username="staff_tokyo",
            email="staff.tokyo@team.linkpc.net",
            full_name="Nhân Viên Tokyo (Pending Demo)",
            hashed_password=hash_password("Staff@123456"),
            role=UserRoleEnum.STAFF,
            status=UserStatusEnum.PENDING
        )
        db.add(staff)
        print("-> Created Staff Demo (PENDING): staff_tokyo / Staff@123456")

    # 3. Exchange Rate (JPY -> VND)
    rate = db.query(ExchangeRate).first()
    if not rate:
        rate = ExchangeRate(
            base_currency="JPY",
            target_currency="VND",
            rate=165.5,
            source="Tỷ giá hạch toán nội bộ 2026"
        )
        db.add(rate)

    # 4. Japanese Teams
    teams_data = [
        {"name": "Đội tuyển Quốc gia Nhật Bản (Samurai Blue)", "name_ja": "サッカー日本代表", "name_en": "Japan National Team", "league": "National", "season": "2024/2026"},
        {"name": "Urawa Red Diamonds", "name_ja": "浦和レッズ", "name_en": "Urawa Red Diamonds", "league": "J1 League", "season": "2024/2025"},
        {"name": "Yokohama F. Marinos", "name_ja": "横浜F・マリノス", "name_en": "Yokohama F. Marinos", "league": "J1 League", "season": "2024/2025"},
        {"name": "Vissel Kobe", "name_ja": "ヴィッセル神戸", "name_en": "Vissel Kobe", "league": "J1 League", "season": "2024/2025"},
        {"name": "Kawasaki Frontale", "name_ja": "川崎フロンターレ", "name_en": "Kawasaki Frontale", "league": "J1 League", "season": "2024/2025"}
    ]
    created_teams = {}
    for td in teams_data:
        t = db.query(Team).filter(Team.name == td["name"]).first()
        if not t:
            t = Team(**td, ip_rights_notes="Hàng fan made / tự thiết kế theo đơn đặt hàng, có ghi chú rõ ràng về bản quyền thương mại.")
            db.add(t)
            db.flush()
        created_teams[td["name"]] = t

    # 5. Media Images Mock (@1, @2, @3)
    images_mock = [
        {"code": "@1", "display_name": "japan-home-flame-blue", "original_filename": "japan_home_2024.webp", "file_path": "/static/uploads/japan_home.webp", "thumbnail_path": "/static/uploads/thumbnails/japan_home_thumb.webp", "category": "jersey"},
        {"code": "@2", "display_name": "japan-away-flame-white", "original_filename": "japan_away_2024.webp", "file_path": "/static/uploads/japan_away.webp", "thumbnail_path": "/static/uploads/thumbnails/japan_away_thumb.webp", "category": "jersey"},
        {"code": "@3", "display_name": "urawa-reds-home-2024", "original_filename": "urawa_reds_home.webp", "file_path": "/static/uploads/urawa_home.webp", "thumbnail_path": "/static/uploads/thumbnails/urawa_home_thumb.webp", "category": "jersey"},
        {"code": "@4", "display_name": "samurai-blue-badge-logo", "original_filename": "jfa_logo.webp", "file_path": "/static/uploads/jfa_logo.webp", "thumbnail_path": "/static/uploads/thumbnails/jfa_logo_thumb.webp", "category": "logo"}
    ]
    for im in images_mock:
        if not db.query(MediaImage).filter(MediaImage.code == im["code"]).first():
            db.add(MediaImage(**im, file_size=145000))

    # 6. Sample Football Products
    products_data = [
        {
            "code": "TS-JAP-24H",
            "name": "Áo Đấu Đội Tuyển Nhật Bản Home 2024 Y-3 Yamamoto Flame",
            "name_ja": "サッカー日本代表 2024 ホーム ユニフォーム Y-3 コラボ",
            "name_en": "Japan 2024 Home Jersey Y-3 Edition",
            "category": "jersey",
            "team_id": created_teams["Đội tuyển Quốc gia Nhật Bản (Samurai Blue)"].id,
            "season": "2024/2026",
            "edition": "Home Match Edition",
            "color": "Dark Navy / Blue Flame",
            "cost_price_jpy": 2800.0,
            "selling_price_jpy": 8900.0,
            "selling_price_vnd": 1470000.0,
            "expected_profit_jpy": 6100.0,
            "primary_image_code": "@1",
            "ip_verified": True,
            "ip_rights_notice": "Áo đồng phục fan team sản xuất theo form dáng phong cách Nhật Bản."
        },
        {
            "code": "TS-JAP-24A",
            "name": "Áo Đấu Đội Tuyển Nhật Bản Away 2024 Trắng Lửa Đỏ Y-3",
            "name_ja": "サッカー日本代表 2024 アウェイ ユニフォーム Y-3 コラボ",
            "name_en": "Japan 2024 Away Jersey Y-3 Edition",
            "category": "jersey",
            "team_id": created_teams["Đội tuyển Quốc gia Nhật Bản (Samurai Blue)"].id,
            "season": "2024/2026",
            "edition": "Away Fan Edition",
            "color": "Off White / Red Flame",
            "cost_price_jpy": 2600.0,
            "selling_price_jpy": 8500.0,
            "selling_price_vnd": 1400000.0,
            "expected_profit_jpy": 5900.0,
            "primary_image_code": "@2",
            "ip_verified": True
        },
        {
            "code": "TS-URW-24H",
            "name": "Áo Đấu CLB Urawa Red Diamonds Home 2024 Đỏ Rực",
            "name_ja": "浦和レッズ 2024 ホーム レプリカユニフォーム",
            "name_en": "Urawa Red Diamonds 2024 Home Jersey",
            "category": "jersey",
            "team_id": created_teams["Urawa Red Diamonds"].id,
            "season": "2024/2025",
            "edition": "Home J-League",
            "color": "Red / Black",
            "cost_price_jpy": 2700.0,
            "selling_price_jpy": 8800.0,
            "selling_price_vnd": 1450000.0,
            "expected_profit_jpy": 6100.0,
            "primary_image_code": "@3",
            "ip_verified": True
        }
    ]

    for p in products_data:
        prod_obj = db.query(Product).filter(Product.code == p["code"]).first()
        if not prod_obj:
            prod_obj = Product(**p)
            db.add(prod_obj)
            db.flush()
            # Variants
            for sz in ["S", "M", "L", "XL", "XXL"]:
                db.add(ProductVariant(
                    product_id=prod_obj.id,
                    sku=f"{prod_obj.code}-{sz}",
                    size=sz,
                    stock_quantity=25,
                    low_stock_threshold=5
                ))

    # 7. Customer Demo
    cust = db.query(Customer).first()
    if not cust:
        cust = Customer(
            full_name="Tanaka Kenji (田中 健司)",
            name_kana="タナカ ケンジ",
            email="kenji.tanaka@tokyosport.jp",
            phone="090-1234-5678",
            postal_code="160-0022",
            prefecture="東京都 (Tokyo)",
            city_ward="新宿区 (Shinjuku-ku)",
            address_line="新宿3-14-1",
            building_room="パークタワー 802号室",
            total_spent_jpy=18600.0,
            orders_count=1
        )
        db.add(cust)
        db.flush()

        # Order Demo
        order = Order(
            order_code="ORD-202611-0001",
            customer_id=cust.id,
            shipping_name="Tanaka Kenji",
            shipping_phone="090-1234-5678",
            shipping_postal_code="160-0022",
            shipping_prefecture="東京都",
            shipping_address="東京都 新宿区 新宿3-14-1 パークタワー 802号室",
            subtotal_jpy=17800.0,
            shipping_fee_jpy=800.0,
            discount_jpy=0.0,
            total_amount_jpy=18600.0,
            total_cost_jpy=5400.0,
            profit_jpy=12640.0,
            status=OrderStatusEnum.CONFIRMED,
            carrier="Yamato Transport (ヤマト運輸)",
            tracking_number="4123-5678-9012"
        )
        db.add(order)
        db.flush()

        prod1 = db.query(Product).filter(Product.code == "TS-JAP-24H").first()
        prod2 = db.query(Product).filter(Product.code == "TS-JAP-24A").first()
        if prod1 and prod2:
            db.add(OrderItem(
                order_id=order.id,
                product_id=prod1.id,
                size="L",
                custom_name="MITOMA",
                custom_number="7",
                quantity=1,
                unit_price_jpy=8900.0,
                unit_cost_jpy=2800.0,
                total_price_jpy=8900.0
            ))
            db.add(OrderItem(
                order_id=order.id,
                product_id=prod2.id,
                size="M",
                custom_name="KUBO",
                custom_number="20",
                quantity=1,
                unit_price_jpy=8900.0,
                unit_cost_jpy=2600.0,
                total_price_jpy=8900.0
            ))

    # 8. Pre-create 10 Core Business Workbooks
    workbooks_data = [
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

    for title, desc in workbooks_data:
        wb = db.query(Workbook).filter(Workbook.title == title).first()
        if not wb:
            wb = Workbook(title=title, description=desc, category="business")
            db.add(wb)
            db.flush()
            # Initial sheet with pre-filled headers
            headers_map = {
                "1. Danh mục sản phẩm áo bóng đá": {
                    "A1": {"v": "Mã SP"}, "B1": {"v": "Tên Áo Đấu"}, "C1": {"v": "Ảnh (@mã)"}, "D1": {"v": "Size"}, "E1": {"v": "Giá Vốn (¥)"}, "F1": {"v": "Giá Bán (¥)"}, "G1": {"v": "Lợi Nhuận (¥)"},
                    "A2": {"v": "TS-JAP-24H"}, "B2": {"v": "Áo Đấu ĐT Nhật Home 2024"}, "C2": {"v": "@1"}, "D2": {"v": "L"}, "E2": {"v": 2800}, "F2": {"v": 8900}, "G2": {"v": 6100, "f": "=F2-E2"},
                    "A3": {"v": "TS-JAP-24A"}, "B3": {"v": "Áo Đấu ĐT Nhật Away 2024"}, "C3": {"v": "@2"}, "D3": {"v": "M"}, "E3": {"v": 2600}, "F3": {"v": 8500}, "G3": {"v": 5900, "f": "=F3-E3"}
                },
                "4. Quản lý Đơn hàng Nhật Bản": {
                    "A1": {"v": "Mã Đơn"}, "B1": {"v": "Khách Hàng"}, "C1": {"v": "Tỉnh/Thành"}, "D1": {"v": "Sản Phẩm"}, "E1": {"v": "Ảnh"}, "F1": {"v": "Tổng Tiền (¥)"}, "G1": {"v": "Trạng Thái"},
                    "A2": {"v": "ORD-202611-0001"}, "B2": {"v": "Tanaka Kenji"}, "C2": {"v": "Tokyo (新宿区)"}, "D2": {"v": "Áo ĐT Nhật (In MITOMA 7)"}, "E2": {"v": "@1"}, "F2": {"v": 18600}, "G2": {"v": "CONFIRMED"}
                }
            }
            default_data = headers_map.get(title, {
                "A1": {"v": "Mục"}, "B1": {"v": "Nội Dung"}, "C1": {"v": "Số Lượng"}, "D1": {"v": "Đơn Giá (¥)"}, "E1": {"v": "Thành Tiền (¥)"}
            })
            sheet = WorkbookSheet(
                workbook_id=wb.id,
                name="Trang 1",
                sheet_order=0,
                row_count=100,
                col_count=26,
                data=default_data
            )
            db.add(sheet)

    db.commit()
    print("-> Successfully seeded database with complete sample football dataset.")

if __name__ == "__main__":
    seed_all()
