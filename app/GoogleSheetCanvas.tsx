"use client";

import { useEffect, useRef, useState } from "react";
import "@univerjs/preset-sheets-core/lib/index.css";

type Row = Record<string, any>;

const layouts: Record<string, string[]> = {
  "Khách hàng": ["name", "phone", "email", "country", "address", "note"],
  "Sản phẩm": [
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
  "Thư viện ảnh": ["name", "type", "category", "url"],
  "Đơn đặt may": [
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
  "Kho hàng": ["sku", "product", "type", "quantity", "warehouse", "note"],
  "Nhân viên": [
    "code",
    "name",
    "department",
    "position",
    "salary_jpy",
    "phone",
    "status",
  ],
  "Chấm công": [
    "employee_id",
    "work_date",
    "status",
    "time_in",
    "time_out",
    "note",
  ],
  "Tính lương": [
    "code",
    "name",
    "department",
    "work_days",
    "salary_jpy",
    "estimated_salary",
    "status",
  ],
  "Thu chi": ["kind", "category", "amount_jpy", "description", "occurred_at"],
  "Tài khoản": ["name", "email", "role", "status", "created_at"],
};
const columnLabels: Record<string, string> = {
  name: "Họ tên",
  phone: "Điện thoại",
  email: "Email",
  country: "Quốc gia",
  address: "Địa chỉ",
  note: "Ghi chú",
  sku: "Mã sản phẩm",
  category: "Danh mục",
  team: "Đội / CLB",
  season: "Mùa giải",
  color: "Màu sắc",
  sale_jpy: "Giá bán (¥)",
  stock: "Tồn kho",
  status: "Trạng thái",
  type: "Loại",
  url: "Đường dẫn ảnh",
  order_no: "Mã đơn hàng",
  customer_name: "Khách hàng",
  product: "Sản phẩm",
  size: "Kích cỡ",
  quantity: "Số lượng",
  total_jpy: "Tổng tiền (¥)",
  tracking: "Mã vận đơn",
  warehouse: "Kho",
  code: "Mã nhân viên",
  department: "Phòng ban",
  position: "Vị trí",
  salary_jpy: "Lương cơ bản (¥)",
  estimated_salary: "Lương dự kiến (¥)",
  work_days: "Ngày công",
  employee_id: "Mã nhân viên",
  work_date: "Ngày làm việc",
  time_in: "Giờ vào",
  time_out: "Giờ ra",
  kind: "Loại thu chi",
  amount_jpy: "Số tiền (¥)",
  description: "Nội dung",
  occurred_at: "Ngày phát sinh",
  role: "Vai trò",
  created_at: "Ngày tạo",
};
const valueLabels: Record<string, string> = {
  STAFF: "Nhân viên",
  MANAGER: "Quản lý",
  SUPER_ADMIN: "Quản trị viên",
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  ACTIVE: "Đang bán",
  INACTIVE: "Ngừng bán",
  THU: "Thu",
  CHI: "Chi",
  "Đang MAY": "Đang may",
};

function makeSnapshot(title: string, rows: Row[]) {
  const headers =
    layouts[title] ||
    (rows.length
      ? Object.keys(rows[0]).filter(
          (key) => !["id", "password_hash", "created_at"].includes(key),
        )
      : ["name"]);
  const values = [
    headers.map((header) => columnLabels[header] || header),
    ...rows.map((row) =>
      headers.map(
        (header) =>
          valueLabels[String(row[header] ?? "")] || (row[header] ?? ""),
      ),
    ),
  ];
  const cellData: Record<
    number,
    Record<number, { v: string | number; s?: string; custom?: Row }>
  > = {};
  const widths = headers.map((header) => {
    if (
      [
        "name",
        "address",
        "note",
        "description",
        "product",
        "customer_name",
      ].includes(header)
    )
      return 190;
    if (
      [
        "status",
        "category",
        "team",
        "color",
        "department",
        "position",
      ].includes(header)
    )
      return 145;
    if (["email", "url", "tracking"].includes(header)) return 220;
    if (
      [
        "total_jpy",
        "sale_jpy",
        "amount_jpy",
        "salary_jpy",
        "estimated_salary",
      ].includes(header)
    )
      return 125;
    return 112;
  });
  values.forEach((line, rowIndex) => {
    cellData[rowIndex] = {};
    line.forEach((value, columnIndex) => {
      cellData[rowIndex][columnIndex] = {
        v: value as string | number,
        s: rowIndex === 0 ? "header" : "body",
        ...(rowIndex
          ? {
              custom: {
                recordId: rows[rowIndex - 1].id,
                field: headers[columnIndex],
              },
            }
          : {}),
      };
    });
  });
  return {
    id: `teamspirit-${Date.now()}`,
    name: title,
    appVersion: "1.0.0",
    locale: "enUS",
    styles: {
      header: {
        bg: { rgb: "#174b3a" },
        cl: { rgb: "#ffffff" },
        bl: 1,
        ht: 2,
        vt: 2,
        tb: 3,
        pd: { t: 6, b: 6, l: 8, r: 8 },
      },
      body: {
        vt: 2,
        tb: 3,
        pd: { t: 4, b: 4, l: 8, r: 8 },
      },
    },
    sheetOrder: ["sheet1"],
    sheets: {
      sheet1: {
        id: "sheet1",
        name: title,
        rowCount: Math.max(values.length + 20, 100),
        columnCount: Math.max(headers.length + 5, 26),
        defaultColumnWidth: 112,
        defaultRowHeight: 24,
        columnHeader: { height: 28 },
        rowHeader: { width: 42 },
        rowData: { 0: { h: 34 } },
        columnData: Object.fromEntries(
          widths.map((width, index) => [index, { w: width }]),
        ),
        freeze: { xSplit: 1, ySplit: 1, startRow: 1, startColumn: 1 },
        showGridlines: 1,
        gridlinesColor: "#d9e2dc",
        cellData,
      },
    },
  };
}

export default function GoogleSheetCanvas({
  title,
  table,
  rows,
  onSync,
}: {
  title: string;
  table: string;
  rows: Row[];
  onSync: (changes: Record<string, Row>) => Promise<void>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Đang khởi tạo trình soạn thảo…");
  const syncRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    let alive = true;
    let instance: { dispose: () => void } | null = null;
    (async () => {
      try {
        const [
          { createUniver, LocaleType, mergeLocales },
          { UniverSheetsCorePreset },
          locale,
          uiLocale,
        ] = await Promise.all([
          import("@univerjs/presets"),
          import("@univerjs/preset-sheets-core"),
          import("@univerjs/preset-sheets-core/locales/en-US"),
          import("@univerjs/ui/locale/vi-VN"),
        ]);
        if (!alive || !host.current) return;
        const child = document.createElement("div");
        child.style.height = "100%";
        host.current.replaceChildren(child);
        const result = createUniver({
          locale: LocaleType.VI_VN,
          locales: {
            [LocaleType.VI_VN]: mergeLocales(locale.default, uiLocale.default),
          },
          presets: [UniverSheetsCorePreset({ container: child })],
        });
        const workbook = (result.univerAPI as any).createWorkbook(
          makeSnapshot(title, rows),
        );
        instance = result.univer;
        const originals = new Map(rows.map((r) => [r.id, { ...r }]));
        const pending = new Map<string, Row>();
        const addedRows = new Map<string, string>();
        let saving = false;
        syncRef.current = async () => {
          if (saving) return;
          saving = true;
          try {
            await workbook.endEditingAsync(true);
            const cells = workbook.save().sheets.sheet1.cellData;
            const keys = layouts[title];
            for (const [n, line] of Object.entries(cells) as [
              string,
              Record<string, any>,
            ][]) {
              if (Number(n) === 0) continue;
              const sourceId = Object.values(line).find(
                (cell) => cell.custom?.recordId,
              )?.custom.recordId;
              const copied = sourceId && rows[Number(n) - 1]?.id !== sourceId;
              if (copied && Number(n) <= rows.length)
                throw Error(
                  "Dòng đã đổi vị trí. Tải lại bảng để tránh sửa nhầm đơn.",
                );
              const id = addedRows.get(n) ?? (copied ? undefined : sourceId);
              const original = originals.get(id);
              if (!original) {
                if (
                  Object.values(line).some(
                    (c) => (c.v != null && c.v !== "") || c.f,
                  )
                ) {
                  if (table !== "orders")
                    throw Error(
                      "Vui lòng thêm dòng trong phân hệ trước khi sửa.",
                    );
                  if (Object.values(line).some((c) => c.f))
                    throw Error("Dòng mới chỉ nhận giá trị.");
                  const data = Object.fromEntries(
                    keys
                      .map((k, c) => [k, line[c]?.v])
                      .filter(([, v]) => v != null && v !== ""),
                  );
                  const response = await fetch("/api/erp", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "add", table, data }),
                  });
                  const saved = await response.json();
                  if (!response.ok)
                    throw Error(
                      "Dòng " +
                        (Number(n) + 1) +
                        ": " +
                        (saved.error || "Lưu thất bại."),
                    );
                  addedRows.set(n, saved.row.id);
                  originals.set(saved.row.id, { ...data, id: saved.row.id });
                  pending.set(saved.row.id, {});
                }
                continue;
              }
              const changes: Row = {},
                expected: Row = {};
              for (const [c, k] of keys.entries()) {
                const cell = line[c];
                if (cell?.f) throw Error("Cột nghiệp vụ chỉ nhận giá trị.");
                const before = original[k] ?? "";
                const displayed = valueLabels[String(before)] ?? before;
                if (String(cell?.v ?? "") === String(displayed)) continue;
                if (table === "payroll" || table === "users")
                  throw Error("Hãy chỉnh nguồn chấm công hoặc mục Phân quyền.");
                const enumKey = ["role", "status", "kind"].includes(k)
                  ? Object.keys(valueLabels).find(
                      (x) => valueLabels[x] === cell?.v,
                    )
                  : undefined;
                changes[k] =
                  enumKey ??
                  (typeof before === "number"
                    ? Number(cell?.v ?? 0)
                    : (cell?.v ?? ""));
                expected[k] = original[k] ?? null;
              }
              if (!Object.keys(changes).length) continue;
              const response = await fetch("/api/erp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "update",
                  table,
                  id,
                  changes,
                  expected,
                }),
              });
              if (!response.ok)
                throw Error((await response.json()).error || "Lưu thất bại.");
              Object.assign(original, changes);
              pending.set(id, { ...expected, ...pending.get(id) });
            }
            if (!pending.size) {
              setStatus("Không có thay đổi cần lưu.");
              return;
            }
            setStatus("Đã lưu ERP. Đang gửi sang Google Sheets…");
            try {
              await onSync(Object.fromEntries(pending));
              pending.clear();
              setStatus("Đã lưu ERP và Google Sheets.");
            } catch {
              setStatus(
                "Đã lưu ERP. Google Sheets chưa đồng bộ. Có thể bấm lại để thử.",
              );
            }
          } finally {
            saving = false;
          }
        };
        setStatus("Đã tải bảng tính");
      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Không thể khởi tạo bảng tính.",
        );
      }
    })();
    return () => {
      alive = false;
      syncRef.current = null;
      if (instance) instance.dispose();
    };
  }, [title, table, rows, onSync]);

  return (
    <section className="google-sheet-card">
      <div className="google-sheet-toolbar">
        <div>
          <b>{title}</b>
          <span>Giao diện bảng tính · dữ liệu từ TEAMSPIRIT ERP</span>
        </div>
        <button
          className="primary-btn"
          onClick={() =>
            syncRef
              .current?.()
              .catch((error) =>
                setStatus(
                  error instanceof Error ? error.message : "Đồng bộ thất bại.",
                ),
              )
          }
        >
          Lưu & đồng bộ Google Sheets
        </button>
      </div>
      <p className="sheet-sync-status">{status}</p>
      <div ref={host} className="google-sheet-canvas" />
    </section>
  );
}
