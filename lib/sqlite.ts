import { mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const dataDir = process.env.TEAMSPIRIT_DATA_DIR || join(process.cwd(), "data");
mkdirSync(dataDir, { recursive: true });
// Next.js evaluates route modules in parallel while collecting page data. Use
// an isolated in-memory database during that build phase so concurrent module
// evaluation cannot lock the production SQLite file. Runtime requests still
// use the persistent database configured by TEAMSPIRIT_DATA_DIR.
const isBuild =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build";
const dbFile =
  isBuild
    ? ":memory:"
    : join(dataDir, "teamspirit.sqlite");
const db = new DatabaseSync(dbFile);
db.exec(
  "PRAGMA busy_timeout = 10000; PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;",
);

export type Row = Record<string, unknown>;

function now() {
  return new Date().toISOString();
}
function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
function passwordMatches(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(hash, "hex"));
}
function id(prefix: string) {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}
function seed(table: string, rows: Row[], columns: string[]) {
  const count = Number(
    (
      db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as
        { count?: number } | undefined
    )?.count ?? 0,
  );
  if (count) return;
  const statement = db.prepare(
    `INSERT INTO ${table} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`,
  );
  for (const row of rows)
    statement.run(
      ...columns.map(
        (column) =>
          (row[column] ?? (column === "created_at" ? now() : null)) as
            string | number | bigint | null,
      ),
    );
}

db.exec(`
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'STAFF', status TEXT NOT NULL DEFAULT 'PENDING', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, email TEXT, country TEXT DEFAULT 'Nhật Bản', address TEXT, note TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, sku TEXT UNIQUE NOT NULL, name TEXT NOT NULL, category TEXT NOT NULL, team TEXT, season TEXT, color TEXT, cost_jpy REAL DEFAULT 0, sale_jpy REAL DEFAULT 0, stock INTEGER DEFAULT 0, status TEXT DEFAULT 'ACTIVE', image_url TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, order_no TEXT UNIQUE NOT NULL, customer_name TEXT NOT NULL, team TEXT, product TEXT, size TEXT, quantity INTEGER DEFAULT 1, total_jpy REAL DEFAULT 0, status TEXT DEFAULT 'MỚI', tracking TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS inventory (id TEXT PRIMARY KEY, sku TEXT NOT NULL, product TEXT NOT NULL, type TEXT NOT NULL, quantity INTEGER NOT NULL, warehouse TEXT DEFAULT 'Kho chính', note TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS employees (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, department TEXT, position TEXT, salary_jpy REAL DEFAULT 0, salary_vnd REAL DEFAULT 0, commission_vnd REAL DEFAULT 0, phone TEXT, status TEXT DEFAULT 'Đang làm');
CREATE TABLE IF NOT EXISTS attendance (id TEXT PRIMARY KEY, employee_id TEXT NOT NULL, work_date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Đi làm', time_in TEXT, time_out TEXT, note TEXT);
CREATE TABLE IF NOT EXISTS finance (id TEXT PRIMARY KEY, kind TEXT NOT NULL, category TEXT NOT NULL, amount_jpy REAL NOT NULL, description TEXT, occurred_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT, url TEXT, category TEXT, created_at TEXT NOT NULL);
`);

// Keep existing installations compatible while moving payroll to VND.
const employeeColumns = db
  .prepare("PRAGMA table_info(employees)")
  .all() as Array<{ name?: string }>;
if (!employeeColumns.some((column) => column.name === "salary_vnd"))
  db.exec("ALTER TABLE employees ADD COLUMN salary_vnd REAL DEFAULT 0");
if (!employeeColumns.some((column) => column.name === "commission_vnd"))
  db.exec("ALTER TABLE employees ADD COLUMN commission_vnd REAL DEFAULT 0");
db.exec(
  "UPDATE employees SET salary_vnd = salary_jpy WHERE COALESCE(salary_vnd, 0) = 0 AND COALESCE(salary_jpy, 0) <> 0",
);

if (!isBuild) {
  const bootstrapPassword = process.env.TEAMSPIRIT_ADMIN_PASSWORD;
  if (
    bootstrapPassword &&
    bootstrapPassword.length >= 16 &&
    !db.prepare("SELECT 1 FROM users LIMIT 1").get()
  ) {
    seed(
      "users",
      [
        {
          id: "usr_admin",
          name: "Quản trị viên",
          email: process.env.TEAMSPIRIT_ADMIN_EMAIL || "admin@teamspirit.local",
          password_hash: passwordHash(bootstrapPassword),
          role: "SUPER_ADMIN",
          status: "APPROVED",
          created_at: now(),
        },
      ],
      ["id", "name", "email", "password_hash", "role", "status", "created_at"],
    );
  }
}
if (
  !isBuild &&
  process.env.TEAMSPIRIT_DEMO_DATA === "true"
) {
  seed(
    "customers",
    [
      {
        id: id("cus"),
        name: "Nakamura Kenji",
        phone: "+81 90 1234 5678",
        email: "kenji@example.jp",
        country: "Nhật Bản",
        address: "Tokyo, Japan",
        note: "Khách VIP",
      },
      {
        id: id("cus"),
        name: "Yuki Tanaka",
        phone: "+81 80 2222 1111",
        email: "yuki@example.jp",
        country: "Nhật Bản",
        address: "Osaka, Japan",
        note: "",
      },
    ],
    [
      "id",
      "name",
      "phone",
      "email",
      "country",
      "address",
      "note",
      "created_at",
    ],
  );
  seed(
    "products",
    [
      {
        id: id("prd"),
        sku: "JP-38-HOME",
        name: "Áo đấu Nhật Bản sân nhà Flame Blue",
        category: "Áo đấu Nhật Bản",
        team: "Đội tuyển Nhật Bản",
        season: "2025/26",
        color: "Xanh Flame",
        cost_jpy: 2800,
        sale_jpy: 6500,
        stock: 28,
        status: "ACTIVE",
        image_url: "/uploads/Ao_Dau_Nhat_Ban_Home_Flame_Blue.png",
      },
      {
        id: id("prd"),
        sku: "URW-01",
        name: "Áo đấu Urawa Reds sân nhà",
        category: "CLB Nhật Bản",
        team: "Urawa Reds",
        season: "2025",
        color: "Đỏ",
        cost_jpy: 3100,
        sale_jpy: 7200,
        stock: 14,
        status: "ACTIVE",
        image_url: "/uploads/CLB_Urawa_Reds_Home_Red.png",
      },
      {
        id: id("prd"),
        sku: "JFA-BADGE",
        name: "Logo huy hiệu JFA Samurai",
        category: "Phụ kiện",
        team: "JFA",
        season: "2025",
        color: "Xanh/Đỏ",
        cost_jpy: 800,
        sale_jpy: 1800,
        stock: 42,
        status: "ACTIVE",
        image_url: "/uploads/Logo_Huy_Hieu_JFA_Samurai.png",
      },
    ],
    [
      "id",
      "sku",
      "name",
      "category",
      "team",
      "season",
      "color",
      "cost_jpy",
      "sale_jpy",
      "stock",
      "status",
      "image_url",
      "created_at",
    ],
  );
  seed(
    "orders",
    [
      {
        id: id("ord"),
        order_no: "JP-251125-001",
        customer_name: "Nakamura Kenji",
        team: "Nhật Bản",
        product: "JP-38-HOME",
        size: "L",
        quantity: 2,
        total_jpy: 13000,
        status: "ĐANG MAY",
        tracking: "",
        created_at: now(),
      },
      {
        id: id("ord"),
        order_no: "JP-251124-002",
        customer_name: "Yuki Tanaka",
        team: "Urawa Reds",
        product: "URW-01",
        size: "M",
        quantity: 1,
        total_jpy: 7200,
        status: "ĐÃ GIAO",
        tracking: "JP123456789",
        created_at: now(),
      },
    ],
    [
      "id",
      "order_no",
      "customer_name",
      "team",
      "product",
      "size",
      "quantity",
      "total_jpy",
      "status",
      "tracking",
      "created_at",
    ],
  );
  seed(
    "employees",
    [
      {
        id: "emp_01",
        code: "NV001",
        name: "Nguyễn Hoàng Thành",
        department: "Kinh doanh",
        position: "Quản lý",
        salary_jpy: 220000,
        phone: "+84 901 234 567",
        status: "Đang làm",
      },
      {
        id: "emp_02",
        code: "NV002",
        name: "Trần Minh Anh",
        department: "Thiết kế",
        position: "Nhân viên",
        salary_jpy: 180000,
        phone: "+84 902 345 678",
        status: "Đang làm",
      },
    ],
    [
      "id",
      "code",
      "name",
      "department",
      "position",
      "salary_jpy",
      "phone",
      "status",
    ],
  );
  seed(
    "attendance",
    [
      {
        id: "att_01",
        employee_id: "NV001",
        work_date: "2026-11-25",
        status: "Đi làm",
        time_in: "08:30",
        time_out: "17:30",
        note: "",
      },
      {
        id: "att_02",
        employee_id: "NV002",
        work_date: "2026-11-25",
        status: "Đi làm",
        time_in: "08:45",
        time_out: "17:30",
        note: "",
      },
      {
        id: "att_03",
        employee_id: "NV001",
        work_date: "2026-11-24",
        status: "Đi làm",
        time_in: "08:30",
        time_out: "17:30",
        note: "",
      },
      {
        id: "att_04",
        employee_id: "NV002",
        work_date: "2026-11-24",
        status: "Nghỉ",
        time_in: "",
        time_out: "",
        note: "Nghỉ phép",
      },
    ],
    ["id", "employee_id", "work_date", "status", "time_in", "time_out", "note"],
  );
  seed(
    "finance",
    [
      {
        id: id("fin"),
        kind: "THU",
        category: "Bán hàng",
        amount_jpy: 13000,
        description: "Đơn JP-251125-001",
        occurred_at: "2026-11-25",
      },
      {
        id: id("fin"),
        kind: "CHI",
        category: "Vận chuyển",
        amount_jpy: 2400,
        description: "Gửi hàng Tokyo",
        occurred_at: "2026-11-24",
      },
    ],
    ["id", "kind", "category", "amount_jpy", "description", "occurred_at"],
  );
  seed(
    "media",
    [
      {
        id: id("med"),
        name: "Ao_Dau_Nhat_Ban_Home_Flame_Blue.png",
        type: "image/png",
        url: "/uploads/Ao_Dau_Nhat_Ban_Home_Flame_Blue.png",
        category: "Áo đấu",
      },
      {
        id: id("med"),
        name: "CLB_Urawa_Reds_Home_Red.png",
        type: "image/png",
        url: "/uploads/CLB_Urawa_Reds_Home_Red.png",
        category: "CLB Nhật Bản",
      },
    ],
    ["id", "name", "type", "url", "category", "created_at"],
  );
}

export function all(table: string) {
  return db
    .prepare(`SELECT * FROM ${table} ORDER BY rowid DESC`)
    .all() as Row[];
}
export function getUserByEmail(email: string) {
  return db
    .prepare("SELECT * FROM users WHERE lower(email)=lower(?)")
    .get(email) as Row | undefined;
}
export function verifyPassword(password: string, stored: string) {
  return passwordMatches(password, stored);
}
export function createSession(userId: string) {
  const raw = randomBytes(32).toString("hex");
  const token = createHash("sha256").update(raw).digest("hex");
  db.prepare("INSERT INTO sessions VALUES (?,?,?)").run(
    token,
    userId,
    new Date(Date.now() + 7 * 86400000).toISOString(),
  );
  return raw;
}
export function userFromToken(raw: string | undefined) {
  if (!raw) return undefined;
  const hash = createHash("sha256").update(raw).digest("hex");
  return db
    .prepare(
      "SELECT users.* FROM users JOIN sessions ON sessions.user_id=users.id WHERE sessions.token_hash=? AND sessions.expires_at>? AND users.status=?",
    )
    .get(hash, now(), "APPROVED") as Row | undefined;
}
export function createUser(name: string, email: string, password: string) {
  const user = {
    id: id("usr"),
    name,
    email,
    password_hash: passwordHash(password),
    role: "STAFF",
    status: "PENDING",
    created_at: now(),
  };
  db.prepare("INSERT INTO users VALUES (?,?,?,?,?,?,?)").run(
    user.id,
    user.name,
    user.email,
    user.password_hash,
    user.role,
    user.status,
    user.created_at,
  );
  return user;
}
export function insert(table: string, row: Row) {
  const keys = Object.keys(row);
  db.prepare(
    `INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => " ?").join(",")})`,
  ).run(
    ...keys.map((k) => (row[k] ?? null) as string | number | bigint | null),
  );
}
export function update(table: string, idValue: string, changes: Row) {
  const keys = Object.keys(changes);
  db.prepare(
    `UPDATE ${table} SET ${keys.map((k) => `${k}=?`).join(", ")} WHERE id=?`,
  ).run(
    ...keys.map((k) => (changes[k] ?? null) as string | number | bigint | null),
    idValue,
  );
}
export function summary() {
  const orders = all("orders");
  const finance = all("finance");
  const revenue = finance
    .filter((x) => x.kind === "THU")
    .reduce((s, x) => s + Number(x.amount_jpy || 0), 0);
  const expenses = finance
    .filter((x) => x.kind === "CHI")
    .reduce((s, x) => s + Number(x.amount_jpy || 0), 0);
  return {
    customers: all("customers").length,
    products: all("products").length,
    orders: orders.length,
    pendingOrders: orders.filter((x) => x.status !== "ĐÃ GIAO").length,
    employees: all("employees").length,
    revenue,
    expenses,
    profit: revenue - expenses,
    month: Array.from({ length: 6 }, (_, i) => ({
      label: `T${i + 6}`,
      value: Math.round(revenue * (0.35 + i * 0.12)),
    })),
  };
}
export { db };
