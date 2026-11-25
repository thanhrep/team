import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const db = new PrismaClient();

const templates = [
  "Danh mục sản phẩm",
  "Thư viện ảnh sản phẩm",
  "Nhập xuất tồn kho",
  "Quản lý đơn hàng Nhật Bản",
  "Danh sách khách hàng",
  "Giá vốn và lợi nhuận",
  "Theo dõi nhà cung cấp",
  "Báo cáo doanh thu",
  "Kế hoạch sản xuất và đặt hàng",
  "Theo dõi thiết kế áo team",
];

const permissions = [
  ["dashboard", "view"],
  ["workbooks", "view"],
  ["workbooks", "edit"],
  ["products", "view"],
  ["products", "create"],
  ["products", "edit"],
  ["products", "delete"],
  ["media", "view"],
  ["media", "upload"],
  ["media", "edit"],
  ["media", "delete"],
  ["inventory", "view"],
  ["inventory", "edit"],
  ["orders", "view"],
  ["orders", "edit"],
  ["customers", "view"],
  ["customers", "edit"],
  ["finance", "view"],
  ["finance", "edit"],
  ["users", "view"],
  ["users", "approve"],
  ["settings", "edit"],
] as const;

// Danh sách 9 tài khoản nhân viên mặc định (Status: PENDING - Chờ Admin phê duyệt)
const pendingStaffList = [
  { email: "nhanvien01@bizwork.local", name: "Nguyễn Văn An" },
  { email: "nhanvien02@bizwork.local", name: "Trần Thị Bình" },
  { email: "nhanvien03@bizwork.local", name: "Lê Hoàng Cường" },
  { email: "nhanvien04@bizwork.local", name: "Phạm Minh Đức" },
  { email: "nhanvien05@bizwork.local", name: "Hoàng Thu Giang" },
  { email: "nhanvien06@bizwork.local", name: "Vũ Hải Nam" },
  { email: "nhanvien07@bizwork.local", name: "Đỗ Ngọc Linh" },
  { email: "nhanvien08@bizwork.local", name: "Bùi Quốc Tuấn" },
  { email: "nhanvien09@bizwork.local", name: "Đặng Mai Phương" },
];

async function main() {
  const adminEmail = (process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@bizwork.local").toLowerCase();
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const staffPassword = process.env.BOOTSTRAP_STAFF_DEFAULT_PASSWORD || adminPassword;

  if (!adminPassword || adminPassword.length < 16) {
    throw new Error("Set BOOTSTRAP_ADMIN_PASSWORD with a unique 16+ character password in .env.");
  }

  // 1. Khởi tạo tài khoản Super Admin (APPROVED - Đăng nhập toàn quyền)
  let admin = await db.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    admin = await db.user.create({
      data: {
        name: "BIZWORK Administrator",
        email: adminEmail,
        passwordHash: await hash(adminPassword, 12),
        status: "APPROVED",
        role: "SUPER_ADMIN",
        approvedAt: new Date(),
      },
    });
    console.log("Initial Super Admin created:", adminEmail);
  }

  // 2. Khởi tạo 9 tài khoản nhân viên (PENDING - Chờ Admin duyệt phân quyền)
  if (staffPassword) {
    const staffHash = await hash(staffPassword, 12);
    for (const staff of pendingStaffList) {
      const emailLower = staff.email.toLowerCase();
      const exists = await db.user.findUnique({ where: { email: emailLower } });
      if (!exists) {
        await db.user.create({
          data: {
            name: staff.name,
            email: emailLower,
            passwordHash: staffHash,
            status: "PENDING",
            role: "STAFF",
          },
        });
        console.log(`Created PENDING user: ${emailLower} (${staff.name})`);
      }
    }
    console.log("9 PENDING staff accounts initialized.");
  }

  // 3. Khởi tạo danh mục phân quyền (Permissions)
  const permissionIds = new Map<string, string>();
  for (const [module, action] of permissions) {
    const permission = await db.permission.upsert({
      where: { module_action: { module, action } },
      update: {},
      create: { module, action },
    });
    permissionIds.set(module + "." + action, permission.id);
  }

  await db.rolePermission.deleteMany();
  const grants: Record<Role, string[]> = {
    SUPER_ADMIN: permissions.map(([m, a]) => m + "." + a),
    ADMIN: permissions.filter(([m]) => m !== "settings").map(([m, a]) => m + "." + a),
    MANAGER: [
      "dashboard.view",
      "workbooks.view",
      "workbooks.edit",
      "products.view",
      "products.create",
      "products.edit",
      "media.view",
      "media.upload",
      "media.edit",
      "inventory.view",
      "inventory.edit",
      "orders.view",
      "orders.edit",
      "customers.view",
      "customers.edit",
      "finance.view",
    ],
    STAFF: [
      "dashboard.view",
      "workbooks.view",
      "workbooks.edit",
      "products.view",
      "media.view",
      "media.upload",
      "orders.view",
      "orders.edit",
      "customers.view",
    ],
    VIEWER: [
      "dashboard.view",
      "workbooks.view",
      "products.view",
      "media.view",
      "inventory.view",
      "orders.view",
      "customers.view",
      "finance.view",
    ],
  };

  for (const [role, keys] of Object.entries(grants) as [Role, string[]][]) {
    for (const key of keys) {
      const permissionId = permissionIds.get(key);
      if (permissionId) {
        await db.rolePermission.create({ data: { role, permissionId } });
      }
    }
  }

  // 4. Khởi tạo các bảng tính mẫu
  for (const name of templates) {
    const exists = await db.workbook.findFirst({ where: { name, ownerId: admin.id } });
    if (exists) continue;
    const snapshot = {
      id: "bizwork-" + Date.now() + "-" + Math.random().toString(16).slice(2),
      name,
      locale: "enUS",
      styles: {},
      sheetOrder: ["sheet-1"],
      sheets: {
        "sheet-1": {
          id: "sheet-1",
          name: "Sheet1",
          rowCount: 200,
          columnCount: 26,
          cellData: {},
        },
      },
    };
    await db.workbook.create({
      data: {
        name,
        ownerId: admin.id,
        versions: { create: { version: 1, snapshot, createdBy: admin.id } },
        sheets: { create: { name: "Sheet1", position: 0, data: {} } },
      },
    });
  }

  console.log("BIZWORK seed completed successfully.");
}

main().finally(() => db.$disconnect());
