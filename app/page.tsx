"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BarChart3,
  Box,
  CalendarCheck2,
  Check,
  ChevronDown,
  CircleDollarSign,
  Download,
  ExternalLink,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  PackageSearch,
  Pencil,
  ShieldCheck,
  ShoppingBag,
  Table2,
  Trash2,
  Users,
  UserRound,
  X,
} from "lucide-react";
import GoogleSheetCanvas from "./GoogleSheetCanvas";

type Row = Record<string, any>;
type Module =
  | "dashboard"
  | "sheets"
  | "customers"
  | "products"
  | "media"
  | "orders"
  | "inventory"
  | "employees"
  | "attendance"
  | "payroll"
  | "finance"
  | "users";
const modules: { id: Module; label: string; icon: any; group: string }[] = [
  {
    id: "dashboard",
    label: "Tổng quan",
    icon: LayoutDashboard,
    group: "Điều hành",
  },
  { id: "sheets", label: "Trang tính", icon: Table2, group: "Điều hành" },
  { id: "customers", label: "Khách hàng", icon: Users, group: "Kinh doanh" },
  {
    id: "products",
    label: "Sản phẩm",
    icon: PackageSearch,
    group: "Kinh doanh",
  },
  { id: "media", label: "Thư viện ảnh", icon: ImageIcon, group: "Kinh doanh" },
  {
    id: "orders",
    label: "Đơn đặt may",
    icon: ShoppingBag,
    group: "Kinh doanh",
  },
  { id: "inventory", label: "Kho hàng", icon: Box, group: "Vận hành" },
  { id: "employees", label: "Nhân viên", icon: UserRound, group: "Nhân sự" },
  {
    id: "attendance",
    label: "Chấm công",
    icon: CalendarCheck2,
    group: "Nhân sự",
  },
  {
    id: "payroll",
    label: "Tính lương",
    icon: CircleDollarSign,
    group: "Nhân sự",
  },
  { id: "finance", label: "Thu chi", icon: BarChart3, group: "Tài chính" },
  { id: "users", label: "Phân quyền", icon: ShieldCheck, group: "Quản trị" },
];
const labels: Record<string, string> = {
  customers: "Khách hàng",
  products: "Sản phẩm",
  media: "Thư viện ảnh",
  orders: "Đơn đặt may",
  inventory: "Kho hàng",
  employees: "Nhân viên",
  attendance: "Chấm công",
  payroll: "Tính lương",
  finance: "Thu chi",
  users: "Tài khoản",
};
const columns: Record<string, string[]> = {
  customers: ["name", "phone", "email", "country", "address", "note"],
  products: [
    "sku",
    "name",
    "category",
    "team",
    "season",
    "color",
    "sale_jpy",
    "stock",
    "status",
  ],
  media: ["name", "type", "category", "url"],
  orders: [
    "order_no",
    "customer_name",
    "team",
    "product",
    "size",
    "quantity",
    "total_jpy",
    "status",
    "tracking",
  ],
  inventory: ["sku", "product", "type", "quantity", "warehouse", "note"],
  employees: [
    "code",
    "name",
    "department",
    "position",
    "salary_jpy",
    "salary_vnd",
    "commission_vnd",
    "phone",
    "status",
  ],
  attendance: [
    "employee_id",
    "work_date",
    "status",
    "time_in",
    "time_out",
    "note",
  ],
  payroll: [
    "code",
    "name",
    "department",
    "work_days",
    "salary_jpy",
    "estimated_salary",
    "status",
  ],
  finance: ["kind", "category", "amount_jpy", "description", "occurred_at"],
  users: ["name", "email", "role", "status", "created_at"],
};
const headers: Record<string, string> = {
  name: "Họ tên",
  phone: "Điện thoại",
  email: "Email",
  country: "Quốc gia",
  address: "Địa chỉ",
  note: "Ghi chú",
  sku: "Mã SKU",
  category: "Phân loại",
  team: "Đội/CLB",
  season: "Mùa giải",
  color: "Màu",
  sale_jpy: "Giá bán (¥)",
  stock: "Tồn kho",
  status: "Trạng thái",
  type: "Loại",
  url: "Đường dẫn",
  order_no: "Mã đơn",
  customer_name: "Khách hàng",
  product: "Sản phẩm",
  size: "Size",
  quantity: "SL",
  total_jpy: "Tổng (¥)",
  tracking: "Mã vận đơn",
  warehouse: "Kho",
  code: "Mã NV",
  department: "Phòng ban",
  position: "Vị trí",
  salary_jpy: "Lương cơ bản (¥)",
  estimated_salary: "Lương dự kiến (¥)",
  work_days: "Ngày công",
  employee_id: "Mã nhân viên",
  work_date: "Ngày",
  time_in: "Giờ vào",
  time_out: "Giờ ra",
  kind: "Loại thu/chi",
  amount_jpy: "Số tiền (¥)",
  description: "Nội dung",
  occurred_at: "Ngày phát sinh",
  role: "Vai trò",
  created_at: "Ngày tạo",
  salary_vnd: "Lương cơ bản (VND)",
  commission_vnd: "Hoa hồng (VND)",
};
const options: Record<string, string[]> = {
  role: ["STAFF", "SALES", "WAREHOUSE", "ACCOUNTING", "MANAGER", "SUPER_ADMIN"],
  kind: ["THU", "CHI"],
  type: ["NHẬP", "XUẤT", "ĐIỀU CHỈNH"],
};
const statusOptions: Record<string, string[]> = {
  attendance: ["Đi làm", "Nghỉ"],
  orders: ["MỚI", "ĐANG MAY", "ĐANG GIAO", "ĐÃ GIAO"],
  products: ["ACTIVE", "INACTIVE"],
  employees: ["Đang làm", "Tạm nghỉ"],
  users: ["PENDING", "APPROVED"],
};
const moneyKeys = [
  "sale_jpy",
  "total_jpy",
  "salary_jpy",
  "salary_vnd",
  "commission_vnd",
  "estimated_salary",
  "amount_jpy",
];
function yen(value: any) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}
function Status({ text }: { text: string }) {
  return (
    <span
      className={`status status-${String(text).toLowerCase().replaceAll(" ", "-")}`}
    >
      {text}
    </span>
  );
}

export default function Home() {
  const [user, setUser] = useState<Row | null>(null),
    [data, setData] = useState<any>(null),
    [module, setModule] = useState<Module>("dashboard"),
    [mobileOpen, setMobileOpen] = useState(false),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(true),
    [authMode, setAuthMode] = useState<"login" | "register">("login"),
    [notice, setNotice] = useState("");
  const [month, setMonth] = useState(
    new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" })
      .format(new Date())
      .slice(0, 7),
  );
  async function load() {
    setBusy(true);
    const r = await fetch("/api/erp?month=" + month);
    if (r.ok) {
      const j = await r.json();
      setUser(j.user);
      setData(j);
    }
    setBusy(false);
  }
  useEffect(() => {
    load();
  }, [month]);
  async function auth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const endpoint =
      authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    const j = await r.json();
    setNotice(j.message || j.error || "");
    if (r.ok && authMode === "login") load();
  }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setData(null);
  }
  if (busy)
    return (
      <div className="loading-screen">
        <div className="logo-mark">TS</div>
        <p>Đang khởi động TEAMSPIRIT ERP…</p>
      </div>
    );
  if (!user)
    return (
      <AuthScreen
        mode={authMode}
        setMode={setAuthMode}
        submit={auth}
        notice={notice}
      />
    );
  const current = modules.find((x) => x.id === module)!;
  return (
    <div className={`erp-shell`}>
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="logo-mark">TS</div>
          <div>
            <b>TEAMSPIRIT</b>
            <span>ERP • VIỆT NAM</span>
          </div>
          <button
            className="icon-btn mobile-close"
            onClick={() => setMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <nav>
          {[
            "Điều hành",
            "Kinh doanh",
            "Vận hành",
            "Nhân sự",
            "Tài chính",
            "Quản trị",
          ].map((group) => (
            <div className="nav-group" key={group}>
              <small>{group}</small>
              {modules
                .filter(
                  (m) =>
                    m.group === group &&
                    (m.id === "dashboard" ||
                      m.id === "sheets" ||
                      Object.hasOwn(data.tables, m.id)),
                )
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      className={module === item.id ? "active" : ""}
                      onClick={() => {
                        setModule(item.id);
                        setMobileOpen(false);
                      }}
                    >
                      <Icon size={17} />
                      <span>{item.label}</span>
                      {item.id === "orders" && (
                        <em>{data.summary.pendingOrders}</em>
                      )}
                    </button>
                  );
                })}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span>Đăng nhập với</span>
          <strong>{user.name}</strong>
          <button className="logout" onClick={logout}>
            <LogOut size={15} /> Đăng xuất
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <button
            className="icon-btn mobile-menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={22} />
          </button>
          <div>
            <span className="breadcrumb">TEAMSPIRIT ERP / {current.label}</span>
            <h1>{current.label}</h1>
          </div>
          <div className="top-actions">
            <label className="global-search">
              <PackageSearch size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm nhanh dữ liệu…"
              />
            </label>
            <button className="user-chip">
              <span>{user.name.slice(0, 1)}</span>
              {user.name}
              <ChevronDown size={14} />
            </button>
          </div>
        </header>
        <div className="content">
          {(module === "payroll" ||
            module === "sheets" ||
            module === "attendance") && (
            <label>
              Kỳ lương{" "}
              <input
                type="month"
                value={month}
                onChange={(e) => e.target.value && setMonth(e.target.value)}
              />
            </label>
          )}
          {module === "dashboard" ? (
            <Dashboard
              summary={data.summary}
              orders={data.tables.orders || []}
            />
          ) : module === "sheets" ? (
            <SheetWorkspace
              tables={data.tables}
              query={query}
              reload={load}
              user={user}
            />
          ) : module === "attendance" ? (
            <AttendanceSheet
              attendance={data.tables.attendance || []}
              employees={data.tables.employees || []}
              month={month}
              reload={load}
            />
          ) : (
            <ModuleView
              module={module}
              rows={data.tables[module] || []}
              query={query}
              reload={load}
              user={user}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function AuthScreen({
  mode,
  setMode,
  submit,
  notice,
}: {
  mode: "login" | "register";
  setMode: (m: "login" | "register") => void;
  submit: (e: FormEvent<HTMLFormElement>) => void;
  notice: string;
}) {
  return (
    <main className="auth-page">
      <div className="auth-art">
        <div className="logo-mark large">TS</div>
        <p>
          Đơn hàng chuẩn Nhật.
          <br />
          <i>Vận hành chuẩn Việt.</i>
        </p>
        <span>TEAMSPIRIT ERP 2.0</span>
      </div>
      <form className="auth-card" onSubmit={submit}>
        <div className="eyebrow">CỔNG QUẢN TRỊ NỘI BỘ</div>
        <h1>
          {mode === "login" ? "Chào mừng trở lại" : "Tạo tài khoản sử dụng"}
        </h1>
        <p className="muted">
          {mode === "login"
            ? "Đăng nhập để quản lý toàn bộ hoạt động TeamSpirit."
            : "Tài khoản mới sẽ chờ Admin duyệt trước khi truy cập."}
        </p>
        {mode === "register" && (
          <label>
            Họ và tên
            <input name="name" required minLength={2} />
          </label>
        )}
        <label>
          Email
          <input
            type="email"
            name="email"
            required
            placeholder="you@teamspirit.vn"
          />
        </label>
        <label>
          Mật khẩu
          <input type="password" name="password" required minLength={8} />
        </label>
        {notice && <div className="notice">{notice}</div>}
        <button className="primary-btn">
          {mode === "login" ? "Đăng nhập" : "Đăng ký"}
        </button>
        <button
          type="button"
          className="link-btn"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login"
            ? "Chưa có tài khoản? Đăng ký"
            : "Đã có tài khoản? Đăng nhập"}
        </button>
      </form>
    </main>
  );
}
function Dashboard({ summary, orders }: { summary: any; orders: Row[] }) {
  const max = Math.max(...summary.month.map((x: any) => x.value), 1);
  return (
    <div className="dashboard">
      <div className="welcome">
        <div>
          <span className="eyebrow">TỔNG QUAN VẬN HÀNH</span>
          <h2>Chào ngày mới, TeamSpirit.</h2>
          <p>Dưới đây là tình hình vận hành và kinh doanh của bạn.</p>
        </div>
      </div>
      <div className="metric-grid">
        <Metric
          label="Doanh thu"
          value={yen(summary.revenue)}
          delta="Tháng này"
          positive
        />
        <Metric
          label="Chi phí"
          value={yen(summary.expenses)}
          delta="Tháng này"
        />
        <Metric
          label="Lợi nhuận tạm tính"
          value={yen(summary.profit)}
          delta="Sau thu chi"
          positive
        />
        <Metric
          label="Đơn cần xử lý"
          value={summary.pendingOrders}
          delta={`${summary.orders} tổng đơn`}
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">DÒNG TIỀN</span>
              <h3>Thu chi 6 tháng gần nhất</h3>
            </div>
          </div>
          <div className="bar-chart">
            {summary.month.map((item: any) => (
              <div className="bar-col" key={item.label}>
                <span>{item.value}</span>
                <div
                  className="bar"
                  style={{
                    height: `${Math.max(8, (item.value / max) * 155)}px`,
                  }}
                />
                <small>{item.label}</small>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">CẦN XỬ LÝ</span>
              <h3>Đơn đặt may mới</h3>
            </div>
          </div>
          <div className="mini-list">
            {orders.slice(0, 4).map((o) => (
              <div className="mini-row" key={o.id}>
                <span className="avatar">
                  {String(o.customer_name).slice(0, 1)}
                </span>
                <div>
                  <b>{o.order_no}</b>
                  <small>
                    {o.customer_name} · {o.team}
                  </small>
                </div>
                <Status text={o.status} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
function SheetWorkspace({
  tables,
  query,
  reload,
  user,
}: {
  tables: any;
  query: string;
  reload: () => void;
  user: Row;
}) {
  const [sheet, setSheet] = useState<Module>(
    (Object.keys(tables)[0] || "products") as Module,
  );
  const sheetTabs: Module[] = [
    "customers",
    "products",
    "media",
    "orders",
    "inventory",
    "employees",
    "attendance",
    "payroll",
    "finance",
    "users",
  ];
  async function sync(changes: Record<string, Row>) {
    const response = await fetch("/api/integrations/google/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: sheet, changes }),
    });
    const body = await response.json();
    if (!response.ok)
      throw new Error(body.error || "Đồng bộ Google Sheets thất bại.");
  }
  return (
    <div className="sheet-workspace">
      <div className="sheet-heading">
        <div>
          <span className="eyebrow">TRANG TÍNH DỮ LIỆU</span>
          <h2>Quản lý danh mục</h2>
          <p>
            Mỗi tab là một trang tính thực tế trong Google Sheets khi đã cấu
            hình API.
          </p>
        </div>
      </div>
      <div className="sheet-tabs" role="tablist">
        {sheetTabs
          .filter((tab) => Object.hasOwn(tables, tab))
          .map((tab) => (
            <button
              key={tab}
              className={sheet === tab ? "active" : ""}
              onClick={() => setSheet(tab)}
            >
              {labels[tab]}
            </button>
          ))}
      </div>
      <GoogleSheetCanvas
        table={sheet}
        title={labels[sheet]}
        rows={tables[sheet] || []}
        onSync={sync}
      />
    </div>
  );
}
function Metric({
  label,
  value,
  delta,
  positive,
}: {
  label: string;
  value: any;
  delta: string;
  positive?: boolean;
}) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small className={positive ? "positive" : ""}>{delta}</small>
    </div>
  );
}

function EditableCell({
  row,
  keyName,
  onSave,
  readOnly,
}: {
  row: Row;
  keyName: string;
  onSave: (v: string) => void;
  readOnly?: boolean;
}) {
  const value = String(row[keyName] ?? "");
  const rowStatus = row.employee_id
    ? "attendance"
    : row.order_no
      ? "orders"
      : row.email && row.role
        ? "users"
        : row.sku
          ? "products"
          : row.code
            ? "employees"
            : "";
  const choices =
    keyName === "status" ? statusOptions[rowStatus] || [] : options[keyName];
  if (readOnly)
    return (
      <span>{moneyKeys.includes(keyName) ? yen(value) : value || "—"}</span>
    );
  if (choices)
    return (
      <select
        className="cell-input cell-select"
        defaultValue={value}
        onChange={(e) => onSave(e.target.value)}
      >
        {!choices.includes(value) && value && (
          <option value={value}>{value}</option>
        )}
        {choices.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
    );
  return (
    <input
      className="cell-input"
      defaultValue={value}
      type={
        keyName === "work_date"
          ? "date"
          : keyName.includes("jpy") ||
              ["stock", "quantity", "work_days"].includes(keyName)
            ? "number"
            : "text"
      }
      onBlur={(e) => {
        if (e.target.value !== value) onSave(e.target.value);
      }}
    />
  );
}
function AttendanceSheet({
  attendance,
  employees,
  month,
  reload,
}: {
  attendance: Row[];
  employees: Row[];
  month: string;
  reload: () => void;
}) {
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [year, monthNumber] = month.split("-").map(Number);
  const days = Array.from(
    { length: new Date(year, monthNumber, 0).getDate() },
    (_, index) => index + 1,
  );
  const activeEmployees = employees.filter(
    (employee) => employee.status !== "Tạm nghỉ",
  );
  const attendanceFor = (employeeId: string, day: number) =>
    attendance.find(
      (row) =>
        row.employee_id === employeeId &&
        String(row.work_date) === `${month}-${String(day).padStart(2, "0")}`,
    );
  const currency = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value || 0);

  async function setDay(employee: Row, day: number, value: string) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    const current = attendanceFor(String(employee.code), day);
    setSaving(`${employee.code}-${day}`);
    const response = await fetch("/api/erp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        current
          ? {
              action: "update",
              table: "attendance",
              id: current.id,
              expected: { status: current.status },
              changes: { status: value || "Nghỉ" },
            }
          : {
              action: "add",
              table: "attendance",
              data: {
                employee_id: employee.code,
                work_date: date,
                status: value || "Nghỉ",
                time_in: "",
                time_out: "",
                note: "",
              },
            },
      ),
    });
    setSaving(null);
    if (!response.ok)
      setNotice((await response.json()).error || "Không thể lưu chấm công.");
    else reload();
  }

  async function saveEmployeeValue(
    employee: Row,
    key: "salary_vnd" | "commission_vnd",
    value: string,
  ) {
    const numeric = Math.max(0, Number(value) || 0);
    const response = await fetch("/api/erp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        table: "employees",
        id: employee.id,
        expected: { [key]: employee[key] ?? null },
        changes: { [key]: numeric },
      }),
    });
    if (!response.ok)
      setNotice((await response.json()).error || "Không thể lưu tiền lương.");
    else reload();
  }

  function exportCsv() {
    const lines = [
      [
        "Mã NV",
        "Họ tên",
        ...days.map((day) => `${day}/${String(monthNumber).padStart(2, "0")}`),
        "Ngày công",
        "Lương cơ bản VND/24",
        "Hoa hồng VND",
        "Tổng lương VND",
      ],
      ...activeEmployees.map((employee) => {
        const workDays = days.filter(
          (day) =>
            attendanceFor(String(employee.code), day)?.status === "Đi làm",
        ).length;
        const base = Number(employee.salary_vnd || 0);
        const commission = Number(employee.commission_vnd || 0);
        return [
          employee.code,
          employee.name,
          ...days.map((day) =>
            attendanceFor(String(employee.code), day)?.status === "Đi làm"
              ? "✓"
              : "✕",
          ),
          workDays,
          Math.round(base / 24),
          commission,
          Math.round((base / 24) * workDays + commission),
        ];
      }),
    ];
    const csv = lines
      .map((line) =>
        line
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `cham-cong-${month}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="attendance-sheet module-view">
      <div className="module-toolbar">
        <div>
          <span className="eyebrow">BẢNG CHẤM CÔNG THEO THÁNG</span>
          <h2>Chấm công {month}</h2>
          <p>
            Chọn ✓ để ghi Đi làm, ✕ để ghi Nghỉ. Lương tính theo 24 ngày công.
          </p>
        </div>
        <div className="toolbar-actions">
          <button className="secondary-btn" onClick={exportCsv}>
            <Download size={14} /> Xuất bảng
          </button>
        </div>
      </div>
      {notice && (
        <div className="notice inline-notice">
          {notice}
          <button onClick={() => setNotice("")} aria-label="Đóng">
            ×
          </button>
        </div>
      )}
      <div className="table-wrap attendance-table-wrap">
        <table>
          <thead>
            <tr>
              <th className="sticky-employee">Mã NV / Họ tên</th>
              {days.map((day) => (
                <th className="day-head" key={day}>
                  {day}
                  <small>
                    {new Date(year, monthNumber - 1, day)
                      .toLocaleDateString("vi-VN", { weekday: "short" })
                      .replace("Th ", "T")}
                  </small>
                </th>
              ))}
              <th>Ngày công</th>
              <th>
                Lương cơ bản
                <br />
                VND/24
              </th>
              <th>
                Hoa hồng
                <br />
                VND
              </th>
              <th>
                Tổng lương
                <br />
                VND
              </th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {activeEmployees.map((employee) => {
              const workDays = days.filter(
                (day) =>
                  attendanceFor(String(employee.code), day)?.status ===
                  "Đi làm",
              ).length;
              const base = Number(employee.salary_vnd || 0);
              const commission = Number(employee.commission_vnd || 0);
              const total = Math.round((base / 24) * workDays + commission);
              return (
                <tr key={employee.id}>
                  <td className="sticky-employee">
                    <b>{employee.code}</b>
                    <span>{employee.name}</span>
                  </td>
                  {days.map((day) => {
                    const current = attendanceFor(String(employee.code), day);
                    const value =
                      current?.status === "Đi làm"
                        ? "Đi làm"
                        : current
                          ? "Nghỉ"
                          : "";
                    const key = `${employee.code}-${day}`;
                    return (
                      <td className="attendance-mark" key={day}>
                        <select
                          aria-label={`${employee.name} ngày ${day}`}
                          value={value}
                          disabled={saving === key}
                          onChange={(event) =>
                            setDay(employee, day, event.target.value)
                          }
                        >
                          <option value="">—</option>
                          <option value="Đi làm">✓</option>
                          <option value="Nghỉ">✕</option>
                        </select>
                      </td>
                    );
                  })}
                  <td className="work-days">
                    <strong>{workDays}</strong>/24
                  </td>
                  <td>
                    <input
                      className="salary-input"
                      type="number"
                      min="0"
                      step="1000"
                      defaultValue={base || ""}
                      placeholder="Nhập VND"
                      onBlur={(event) =>
                        saveEmployeeValue(
                          employee,
                          "salary_vnd",
                          event.target.value,
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="salary-input"
                      type="number"
                      min="0"
                      step="1000"
                      defaultValue={commission || ""}
                      placeholder="Nhập VND"
                      onBlur={(event) =>
                        saveEmployeeValue(
                          employee,
                          "commission_vnd",
                          event.target.value,
                        )
                      }
                    />
                  </td>
                  <td className="total-salary">{currency(total)}</td>
                  <td className="actions-cell">
                    <button
                      className="dots-button"
                      aria-label={`Thao tác ${employee.name}`}
                      onClick={() =>
                        setOpenMenu(
                          openMenu === employee.id ? null : employee.id,
                        )
                      }
                    >
                      <MoreHorizontal size={17} />
                    </button>
                    {openMenu === employee.id && (
                      <div className="row-menu">
                        <button
                          onClick={() => {
                            setOpenMenu(null);
                            document
                              .querySelector(
                                `[aria-label="${employee.name} ngày 1"]`,
                              )
                              ?.scrollIntoView({
                                behavior: "smooth",
                                block: "center",
                              });
                          }}
                        >
                          <Pencil size={14} /> Sửa chấm công
                        </button>
                        <button
                          onClick={() => {
                            setOpenMenu(null);
                            saveEmployeeValue(
                              employee,
                              "salary_vnd",
                              String(employee.salary_vnd || 0),
                            );
                          }}
                        >
                          <Check size={14} /> Lưu lương
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="table-hint">
        Các ô ngày dùng lựa chọn ✓/✕ · Lương cơ bản và hoa hồng được lưu theo
        từng nhân viên · kéo ngang để xem đủ tháng.
      </p>
    </div>
  );
}

function LegacyModuleView({
  module,
  rows,
  query,
  reload,
  user,
}: {
  module: Module;
  rows: Row[];
  query: string;
  reload: () => void;
  user: Row;
}) {
  const [adding, setAdding] = useState(false);
  const shown = useMemo(
    () =>
      rows.filter(
        (row) =>
          !query ||
          Object.values(row).some((v) =>
            String(v ?? "")
              .toLowerCase()
              .includes(query.toLowerCase()),
          ),
      ),
    [rows, query],
  );
  const cols = columns[module] || [];
  const readOnly = module === "payroll";
  async function save(id: string, key: string, value: string) {
    const numeric =
      key.includes("jpy") || ["stock", "quantity", "work_days"].includes(key);
    await fetch("/api/erp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        table: module,
        id,
        expected: { [key]: rows.find((r) => r.id === id)?.[key] ?? null },
        changes: { [key]: numeric ? Number(value) : value },
      }),
    });
    reload();
  }
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(e.currentTarget));
    const data = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [
        k,
        k.includes("jpy") || ["stock", "quantity"].includes(k) ? Number(v) : v,
      ]),
    );
    await fetch("/api/erp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", table: module, data }),
    });
    setAdding(false);
    reload();
  }
  async function approve(id: string) {
    await fetch("/api/erp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approveUser", id }),
    });
    reload();
  }
  function exportCsv() {
    const csv = [
      cols.map((k) => headers[k] || k),
      ...shown.map((r) => cols.map((k) => String(r[k] ?? ""))),
    ]
      .map((a) => a.map((v) => `"${v.replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `teamspirit-${module}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return (
    <div className="module-view">
      <div className="module-toolbar">
        <div>
          <span className="eyebrow">BẢNG DỮ LIỆU TRỰC TIẾP</span>
          <p>{shown.length} bản ghi · nhấn vào ô để sửa và tự lưu SQLite</p>
        </div>
        <div className="toolbar-actions">
          <button className="secondary-btn" onClick={exportCsv}>
            <Download size={14} /> Xuất CSV
          </button>
          <button className="primary-btn" onClick={() => setAdding(true)}>
            + Thêm {labels[module] || "bản ghi"}
          </button>
        </div>
      </div>
      {adding && (
        <form className="inline-form" onSubmit={add}>
          {cols
            .filter((k) => !["created_at", "status", "role"].includes(k))
            .slice(0, 6)
            .map((k) => (
              <label key={k}>
                {headers[k] || k}
                <input
                  name={k}
                  required={["name", "sku", "order_no", "code"].includes(k)}
                  placeholder={headers[k] || k}
                />
              </label>
            ))}
          <div>
            <button className="primary-btn">Lưu</button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setAdding(false)}
            >
              Hủy
            </button>
          </div>
        </form>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              {cols.map((k) => (
                <th key={k}>{headers[k] || k}</th>
              ))}
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row, index) => (
              <tr key={row.id || index}>
                <td className="row-number">{index + 1}</td>
                {cols.map((k) => (
                  <td key={k}>
                    <EditableCell
                      row={row}
                      keyName={k}
                      readOnly={readOnly}
                      onSave={(value) => save(row.id, k, value)}
                    />
                  </td>
                ))}
                <td>
                  {module === "users" &&
                  row.status === "PENDING" &&
                  user.role === "SUPER_ADMIN" ? (
                    <button
                      className="secondary-btn"
                      onClick={() => approve(row.id)}
                    >
                      Duyệt
                    </button>
                  ) : (
                    <span className="dots">•••</span>
                  )}
                </td>
              </tr>
            ))}
            {!shown.length && (
              <tr>
                <td colSpan={cols.length + 2} className="empty">
                  Chưa có dữ liệu phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="table-hint">
        Nhấn vào ô để chỉnh sửa · Select dùng cho trạng thái, vai trò, Đi
        làm/Nghỉ · Thay đổi được lưu vào SQLite.
      </p>
      {module === "payroll" && <Payroll rows={rows} />}
    </div>
  );
}
function ModuleView({
  module,
  rows,
  query,
  reload,
  user,
}: {
  module: Module;
  rows: Row[];
  query: string;
  reload: () => void;
  user: Row;
}) {
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const shown = useMemo(
    () =>
      rows.filter(
        (row) =>
          !query ||
          Object.values(row).some((v) =>
            String(v ?? "")
              .toLowerCase()
              .includes(query.toLowerCase()),
          ),
      ),
    [rows, query],
  );
  const cols = columns[module] || [];
  const readOnly = module === "payroll";

  async function save(id: string, key: string, value: string) {
    const numeric =
      key.includes("jpy") || ["stock", "quantity", "work_days"].includes(key);
    const response = await fetch("/api/erp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        table: module,
        id,
        expected: { [key]: rows.find((r) => r.id === id)?.[key] ?? null },
        changes: { [key]: numeric ? Number(value) : value },
      }),
    });
    if (!response.ok)
      setNotice((await response.json()).error || "Không thể lưu thay đổi.");
    else reload();
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(event.currentTarget));
    const data = Object.fromEntries(
      Object.entries(raw).map(([key, value]) => [
        key,
        key.includes("jpy") || ["stock", "quantity"].includes(key)
          ? Number(value)
          : value,
      ]),
    );
    const response = await fetch("/api/erp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", table: module, data }),
    });
    if (!response.ok) {
      setNotice((await response.json()).error || "Không thể thêm dữ liệu.");
      return;
    }
    setAdding(false);
    reload();
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    const response = await fetch("/api/media/upload", {
      method: "POST",
      body: new FormData(event.currentTarget),
    });
    const body = await response.json();
    setUploading(false);
    if (!response.ok) {
      setNotice(body.error || "Tải ảnh thất bại.");
      return;
    }
    setNotice("Đã tải ảnh và lưu vào thư viện.");
    reload();
  }

  async function approve(id: string) {
    await fetch("/api/erp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approveUser", id }),
    });
    reload();
  }

  async function remove(id: string) {
    if (!window.confirm("Xóa dòng dữ liệu này?")) return;
    const response = await fetch("/api/erp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", table: module, id }),
    });
    const body = await response.json();
    setNotice(response.ok ? "Đã xóa dữ liệu." : body.error || "Không thể xóa.");
    setOpenMenu(null);
    if (response.ok) reload();
  }

  function exportCsv() {
    const csv = [
      cols.map((key) => headers[key] || key),
      ...shown.map((row) => cols.map((key) => String(row[key] ?? ""))),
    ]
      .map((line) =>
        line.map((value) => `"${value.replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `teamspirit-${module}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="module-view">
      <div className="module-toolbar">
        <div>
          <span className="eyebrow">BẢNG DỮ LIỆU TRỰC TIẾP</span>
          <p>{shown.length} bản ghi · nhấn vào ô để sửa và tự lưu</p>
        </div>
        <div className="toolbar-actions">
          {module === "media" && (
            <button
              className="secondary-btn"
              onClick={() => setUploading(true)}
            >
              <ImageIcon size={14} /> Tải ảnh lên
            </button>
          )}
          <button className="secondary-btn" onClick={exportCsv}>
            <Download size={14} /> Xuất CSV
          </button>
          <button className="primary-btn" onClick={() => setAdding(true)}>
            + Thêm {labels[module] || "bản ghi"}
          </button>
        </div>
      </div>
      {notice && (
        <div className="notice inline-notice">
          {notice}
          <button onClick={() => setNotice("")} aria-label="Đóng">
            ×
          </button>
        </div>
      )}
      {uploading && (
        <form className="inline-form media-upload-form" onSubmit={upload}>
          <label>
            Chọn ảnh
            <input name="file" type="file" accept="image/*" required />
          </label>
          <label>
            Danh mục
            <input name="category" defaultValue="Sản phẩm" required />
          </label>
          <div>
            <button className="primary-btn" disabled={uploading}>
              {uploading ? "Đang tải…" : "Lưu ảnh"}
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setUploading(false)}
            >
              Hủy
            </button>
          </div>
        </form>
      )}
      {adding && (
        <form className="inline-form" onSubmit={add}>
          {cols
            .filter((key) => !["created_at", "status", "role"].includes(key))
            .slice(0, 6)
            .map((key) => (
              <label key={key}>
                {headers[key] || key}
                <input
                  name={key}
                  required={["name", "sku", "order_no", "code"].includes(key)}
                  placeholder={headers[key] || key}
                />
              </label>
            ))}
          <div>
            <button className="primary-btn">Lưu</button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setAdding(false)}
            >
              Hủy
            </button>
          </div>
        </form>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              {cols.map((key) => (
                <th key={key}>{headers[key] || key}</th>
              ))}
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row, index) => (
              <tr key={row.id || index} data-row-id={row.id}>
                <td className="row-number">{index + 1}</td>
                {cols.map((key) => (
                  <td key={key}>
                    {module === "media" && key === "url" ? (
                      <a
                        className="media-link"
                        href={String(row[key] || "")}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          className="media-thumb"
                          src={String(row[key] || "")}
                          alt={String(row.name || "Ảnh sản phẩm")}
                        />
                      </a>
                    ) : (
                      <EditableCell
                        row={row}
                        keyName={key}
                        readOnly={readOnly}
                        onSave={(value) => save(row.id, key, value)}
                      />
                    )}
                  </td>
                ))}
                <td className="actions-cell">
                  {module === "users" &&
                  row.status === "PENDING" &&
                  user.role === "SUPER_ADMIN" ? (
                    <button
                      className="secondary-btn"
                      onClick={() => approve(row.id)}
                    >
                      <Check size={14} /> Duyệt
                    </button>
                  ) : (
                    <>
                      <button
                        className="dots-button"
                        aria-label={`Thao tác ${row.name || row.id}`}
                        onClick={() =>
                          setOpenMenu(openMenu === row.id ? null : row.id)
                        }
                      >
                        <MoreHorizontal size={17} />
                      </button>
                      {openMenu === row.id && (
                        <div className="row-menu">
                          <button
                            onClick={() => {
                              setOpenMenu(null);
                              if (row.url)
                                window.open(
                                  String(row.url),
                                  "_blank",
                                  "noopener,noreferrer",
                                );
                            }}
                          >
                            <ExternalLink size={14} /> Mở ảnh
                          </button>
                          <button
                            onClick={() => {
                              setOpenMenu(null);
                              (
                                document.querySelector(
                                  `[data-row-id="${row.id}"] input`,
                                ) as HTMLInputElement | null
                              )?.focus();
                            }}
                          >
                            <Pencil size={14} /> Sửa dòng
                          </button>
                          <button
                            className="danger-action"
                            onClick={() => remove(row.id)}
                          >
                            <Trash2 size={14} /> Xóa
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!shown.length && (
              <tr>
                <td colSpan={cols.length + 2} className="empty">
                  Chưa có dữ liệu phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="table-hint">
        Nhấn vào ô để chỉnh sửa · mở menu `•••` để xem, sửa hoặc xóa.
      </p>
      {module === "payroll" && <Payroll rows={rows} />}
    </div>
  );
}

function Payroll({ rows }: { rows: Row[] }) {
  const total = rows.reduce((s, r) => s + Number(r.estimated_salary || 0), 0);
  return (
    <section className="panel payroll-panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">BẢNG LƯƠNG TỰ TÍNH</span>
          <h3>Ngày công và lương dự kiến</h3>
        </div>
      </div>
      <div className="payroll-summary">
        <Metric label="Tổng nhân sự" value={rows.length} delta="Đang làm" />
        <Metric
          label="Tổng ngày công"
          value={rows.reduce((s, r) => s + Number(r.work_days || 0), 0)}
          delta="Theo chấm công"
        />
        <Metric
          label="Tổng lương dự kiến"
          value={yen(total)}
          delta="Chưa chốt"
        />
      </div>
    </section>
  );
}
