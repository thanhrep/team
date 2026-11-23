# BIZWORK - HỆ THỐNG QUẢN TRỊ KINH DOANH ÁO BÓNG ĐÁ NHẬT BẢN

BIZWORK là giải pháp phần mềm độc lập (Modular Monolith) chuyên biệt cho doanh nghiệp kinh doanh áo bóng đá, áo team và đồng phục thi đấu tại thị trường Nhật Bản.

---

## 🌟 TÍNH NĂNG NỔI BẬT

1. **Bảo Mật & Phê Duyệt Tài Khoản Khắt Khe**:
   - Thành viên đăng ký mới mặc định ở trạng thái `PENDING`.
   - Người chưa duyệt tuyệt đối không được truy cập API hay xem dữ liệu bảng tính, ảnh, đơn hàng.
   - Admin duyệt, phân quyền chi tiết (SUPER_ADMIN, ADMIN, MANAGER, STAFF, VIEWER).
   - Nhật ký hoạt động (Audit Log) ghi nhận mọi thao tác.

2. **Thư Viện Ảnh Sản Phẩm & Định Danh Mã @Số**:
   - Tự động sinh mã `@1`, `@2`, `@3`... duy nhất cho từng ảnh sản phẩm.
   - Nhập `@mã` trực tiếp vào ô bảng tính để hiển thị thumbnail ảnh tức thì.
   - Thay đổi tên file gốc hoặc đường dẫn không làm mất liên kết `@mã`.

3. **Bảng Tính Nội Bộ Thay Thế Google Sheets**:
   - Độc lập hoàn toàn, không phụ thuộc Google Sheets.
   - Hỗ trợ công thức tính toán tài chính, lợi nhuận, quy đổi JPY/VND.
   - Tạo sẵn 10 Workbook nghiệp vụ chuẩn cho thị trường áo đấu Nhật Bản.
   - Hỗ trợ xuất file Excel (XLSX), in ấn và PDF.

4. **Nghiệp Vụ Áo Bóng Đá Chuyên Sâu**:
   - Quản lý size S, M, L, XL, XXL và form áo Nhật Bản.
   - Quản lý in tên số cầu thủ, logo tài trợ áo team.
   - Tích hợp thông tin giao hàng Nhật Bản (Mã bưu điện 7 chữ số, Đơn vị vận chuyển Yamato / Sagawa, Tỉnh/thành phố).

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT TRÊN MINI PC / UBUNTU SERVER / DOCKER

### Bước 1: Clone mã nguồn
```bash
git clone https://github.com/thanhrep/team.git
cd team
```

### Bước 2: Thiết lập biến môi trường
```bash
cp .env.example .env
# Chỉnh sửa mật khẩu bí mật trong .env
```

### Bước 3: Khởi chạy với Docker Compose
```bash
docker compose up -d --build
```
Hệ thống sẽ tự động cấp phát SSL tự động qua Caddy cho tên miền `team.linkpc.net`.

### Bước 4: Khởi tạo dữ liệu mẫu & Tài khoản Admin
```bash
docker compose exec app python -m app.seed
```

Tài khoản Admin mặc định:
- **Tên đăng nhập**: `admin`
- **Mật khẩu**: `Bizwork@2026!Pro`

---

## 🖥️ CHẠY TRỰC TIẾP TRÊN WINDOWS (KHÔNG DÙNG DOCKER)
1. Cài đặt Python 3.12+
2. Cài đặt thư viện:
   ```powershell
   pip install -r backend/requirements.txt
   ```
3. Khởi tạo dữ liệu:
   ```powershell
   python -m app.seed
   ```
4. Chạy server:
   ```powershell
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
5. Mở trình duyệt tại: `http://localhost:8000`
