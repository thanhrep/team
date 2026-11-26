import { NextRequest, NextResponse } from "next/server";
import {
  addRow,
  byId,
  columns,
  deleteRow,
  rows,
  sessionUser,
  updateRow,
} from "../../../lib/store";
import { removeMedia } from "../../../lib/media-server";
import { sameOrigin } from "../../../lib/request-security";

export const runtime = "nodejs";
const cookie = "teamspirit_session";
const tables = [
  "customers",
  "products",
  "media",
  "orders",
  "inventory",
  "employees",
  "attendance",
  "finance",
  "users",
];
const departments: Record<string, string[]> = {
  SUPER_ADMIN: tables,
  MANAGER: tables.filter((t) => t !== "users"),
  SALES: ["customers", "products", "orders", "media"],
  WAREHOUSE: ["products", "inventory", "orders"],
  ACCOUNTING: ["finance", "employees", "attendance"],
  STAFF: ["products", "media"],
};
const readTables = (role: unknown) => departments[String(role)] ?? [];
const validRoles = Object.keys(departments);
const requiredAddFields: Record<string, string[]> = {
  customers: ["name"],
  products: ["sku", "name", "category"],
  media: ["name"],
  orders: ["order_no", "customer_name"],
  inventory: ["sku", "product", "type", "quantity"],
  employees: ["code", "name"],
  attendance: ["employee_id", "work_date"],
  finance: ["kind", "category", "amount_jpy", "occurred_at"],
};
const fieldLabels: Record<string, string> = {
  name: "Họ tên/Tên",
  sku: "Mã sản phẩm",
  category: "Danh mục",
  order_no: "Mã đơn hàng",
  customer_name: "Khách hàng",
  product: "Sản phẩm",
  type: "Loại",
  quantity: "Số lượng",
  code: "Mã nhân viên",
  employee_id: "Mã nhân viên",
  work_date: "Ngày làm việc",
  kind: "Loại thu chi",
  amount_jpy: "Số tiền",
  occurred_at: "Ngày phát sinh",
};
export async function GET(request: NextRequest) {
  const user = await sessionUser(request.cookies.get(cookie)?.value);
  if (!user)
    return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });
  const month =
    request.nextUrl.searchParams.get("month") ||
    new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" })
      .format(new Date())
      .slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    return NextResponse.json(
      { error: "Kỳ lương không hợp lệ." },
      { status: 400 },
    );
  const allowed = readTables(user.role);
  const employees = await rows("employees");
  const attendance = await rows("attendance");
  const payroll = employees.map((employee) => {
    const days = new Set(
      attendance
        .filter(
          (row) =>
            row.employee_id === employee.code &&
            row.status === "Đi làm" &&
            String(row.work_date).startsWith(month + "-"),
        )
        .map((row) => row.work_date),
    ).size;
    const salaryVnd = Number(employee.salary_vnd || employee.salary_jpy || 0);
    const commissionVnd = Number(employee.commission_vnd || 0);
    return {
      ...employee,
      salary_vnd: salaryVnd,
      commission_vnd: commissionVnd,
      work_days: days,
      estimated_salary: Math.round(
        (salaryVnd * days) / 24 + commissionVnd,
      ),
    };
  });
  const pairs = await Promise.all(
    allowed.map(async (table) => {
      const data = await rows(table);
      return [
        table,
        table === "users"
          ? data.map(({ password_hash: _password, ...safe }) => safe)
          : data,
      ] as const;
    }),
  );
  const safeTables = Object.fromEntries(pairs);
  const orders = allowed.includes("orders") ? await rows("orders") : [];
  const finance = allowed.includes("finance") ? await rows("finance") : [];
  const revenue = finance
    .filter((x) => x.kind === "THU")
    .reduce((n, x) => n + Number(x.amount_jpy || 0), 0);
  const expenses = finance
    .filter((x) => x.kind === "CHI")
    .reduce((n, x) => n + Number(x.amount_jpy || 0), 0);
  const summary = {
    customers: (safeTables.customers || []).length,
    products: (safeTables.products || []).length,
    orders: orders.length,
    pendingOrders: orders.filter((x) => x.status !== "ĐÃ GIAO").length,
    employees: employees.length,
    revenue,
    expenses,
    profit: revenue - expenses,
    month: Array.from({ length: 6 }, (_, i) => ({
      label: `T${i + 6}`,
      value: Math.round(revenue * (0.35 + i * 0.12)),
    })),
  };
  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    month,
    summary: allowed.includes("finance")
      ? summary
      : {
          orders: orders.length,
          pendingOrders: summary.pendingOrders,
          month: [],
          revenue: null,
          expenses: null,
          profit: null,
        },
    tables: {
      ...safeTables,
      ...(allowed.includes("employees") ? { payroll } : {}),
    },
  });
}
export async function POST(request: NextRequest) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Nguồn yêu cầu không hợp lệ." },
      { status: 403 },
    );
  const user = await sessionUser(request.cookies.get(cookie)?.value);
  if (!user)
    return NextResponse.json(
      { error: "Phiên đăng nhập đã hết hạn." },
      { status: 401 },
    );
  const body = await request.json();
  if (body.action === "approveUser") {
    if (user.role !== "SUPER_ADMIN")
      return NextResponse.json(
        { error: "Chỉ Admin mới được duyệt tài khoản." },
        { status: 403 },
      );
    if (!validRoles.includes(body.role || "STAFF"))
      return NextResponse.json(
        { error: "Vai trò không hợp lệ." },
        { status: 400 },
      );
    const current = await byId("users", String(body.id));
    if (!current)
      return NextResponse.json(
        { error: "Không tìm thấy tài khoản." },
        { status: 404 },
      );
    if (
      !(await updateRow(
        "users",
        String(body.id),
        { status: current.status, role: current.role },
        { status: "APPROVED", role: body.role || "STAFF" },
      ))
    )
      return NextResponse.json(
        { error: "Tài khoản đã được thay đổi." },
        { status: 409 },
      );
    return NextResponse.json({ ok: true });
  }
  if (body.action === "delete") {
    if (!["SUPER_ADMIN", "MANAGER", "SALES"].includes(String(user.role)))
      return NextResponse.json(
        { error: "Bạn không có quyền xóa dữ liệu." },
        { status: 403 },
      );
    if (!readTables(user.role).includes(body.table) || body.table === "users")
      return NextResponse.json(
        { error: "Không có quyền xóa danh mục này." },
        { status: 403 },
      );
    const current = await byId(body.table, String(body.id));
    if (!current)
      return NextResponse.json(
        { error: "Không tìm thấy dòng dữ liệu." },
        { status: 404 },
      );
    if (body.table === "media") await removeMedia(String(current.url || ""));
    await deleteRow(body.table, String(body.id));
    return NextResponse.json({ ok: true });
  }
  if (
    !readTables(user.role).includes(body.table) ||
    user.role === "STAFF" ||
    (user.role === "WAREHOUSE" && body.table === "orders") ||
    (user.role === "SALES" && body.table === "products")
  )
    return NextResponse.json(
      { error: "Không có quyền ghi danh mục này." },
      { status: 403 },
    );
  const fields = body.action === "update" ? body.changes : body.data;
  const schema = columns[body.table] || [];
  if (
    !fields ||
    !Object.keys(fields).length ||
    Object.keys(fields).some(
      (k) =>
        !schema.includes(k) ||
        ["id", "created_at", "password_hash"].includes(k),
    )
  )
    return NextResponse.json({ error: "Cột không hợp lệ." }, { status: 400 });
  if (
    body.table === "users" &&
    (body.action !== "update" ||
      Object.keys(fields).some((k) => !["status", "role"].includes(k)) ||
      ("role" in fields && !validRoles.includes(fields.role)) ||
      ("status" in fields && !["PENDING", "APPROVED"].includes(fields.status)))
  )
    return NextResponse.json(
      { error: "Thay đổi tài khoản không hợp lệ." },
      { status: 400 },
    );
  if (body.table === "users" && user.role !== "SUPER_ADMIN")
    return NextResponse.json(
      { error: "Bạn không có quyền quản trị tài khoản." },
      { status: 403 },
    );
  if (body.action === "update") {
    if (
      !body.expected ||
      !(await updateRow(body.table, String(body.id), body.expected, fields))
    )
      return NextResponse.json(
        { error: "Dòng đã thay đổi. Tải lại để đối chiếu." },
        { status: 409 },
      );
    return NextResponse.json({ ok: true });
  }
  if (body.action === "add") {
    const data = body.data || {};
    const required = requiredAddFields[body.table] || [];
    const missing = required.filter((key) => {
      const value = data[key];
      return value === null || value === undefined || String(value).trim() === "";
    });
    if (missing.length)
      return NextResponse.json(
        {
          error: `Dòng mới còn thiếu: ${missing
            .map((key) => fieldLabels[key] || key)
            .join(", ")}.`,
        },
        { status: 400 },
      );
    const table = body.table;
    if (table === "orders") {
      if (
        !String(data.order_no ?? "").trim() ||
        !String(data.customer_name ?? "").trim()
      )
        return NextResponse.json(
          { error: "Cần mã đơn và tên khách hàng." },
          { status: 400 },
        );
      data.order_no = String(data.order_no).trim();
      if ((await rows("orders")).some((row) => row.order_no === data.order_no))
        return NextResponse.json(
          { error: "Mã đơn này đã tồn tại." },
          { status: 409 },
        );
      if (
        !Number.isSafeInteger(Number(data.quantity ?? 1)) ||
        Number(data.quantity ?? 1) < 1 ||
        !Number.isFinite(Number(data.total_jpy ?? 0)) ||
        Number(data.total_jpy ?? 0) < 0
      )
        return NextResponse.json(
          { error: "Số lượng hoặc tổng tiền không hợp lệ." },
          { status: 400 },
        );
    }
    const row = {
      ...data,
      id: `${table.slice(0, 3)}_${crypto.randomUUID()}`,
      ...(schema.includes("created_at")
        ? { created_at: new Date().toISOString() }
        : {}),
    };
    try {
      await addRow(table, row);
    } catch (error) {
      if (
        error instanceof Error &&
        /duplicate key|UNIQUE constraint/i.test(error.message)
      )
        return NextResponse.json(
          { error: "Mã hoặc email đã tồn tại." },
          { status: 409 },
        );
      throw error;
    }
    return NextResponse.json({ ok: true, row });
  }
  return NextResponse.json(
    { error: "Thao tác không hợp lệ." },
    { status: 400 },
  );
}
