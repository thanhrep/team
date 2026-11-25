import { google } from "googleapis";
import { runtimeConfig } from "./runtime-config";

const tabs: Record<string, string> = {
  customers: "Khách hàng",
  products: "Sản phẩm",
  media: "Kho sản phẩm",
  orders: "Đơn đặt may",
  inventory: "Kho hàng",
  employees: "Nhân viên",
  attendance: "Chấm công",
  finance: "Thu chi",
  users: "Phân quyền",
  ai_analysis: "Phân tích AI",
};
const labels: Record<string, string> = {
  id: "Mã hệ thống",
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
const mediaLabels: Record<string, string> = {
  name: "Tên sản phẩm",
  type: "Loại tệp",
  category: "Danh mục sản phẩm",
  url: "Ảnh sản phẩm",
};
const enumLabels: Record<string, string> = {
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
  "ĐANG MAY": "Đang may",
  "ĐÃ GIAO": "Đã giao",
  "ĐANG GIAO": "Đang giao",
  MỚI: "Mới",
};
const aliases: Record<string, string> = Object.fromEntries(
  Object.entries(labels).flatMap(([key, label]) => [
    [key, key],
    [label, key],
  ]),
);
Object.entries(mediaLabels).forEach(([key, label]) => {
  aliases[label] = key;
});
const identityKeys: Record<string, string[]> = {
  customers: ["email", "phone", "name"],
  products: ["sku"],
  media: ["url", "name"],
  orders: ["order_no"],
  inventory: ["sku", "product"],
  employees: ["code"],
  attendance: ["employee_id", "work_date"],
  finance: ["occurred_at", "description", "amount_jpy"],
};

function keyForHeader(header: string) {
  return aliases[String(header).trim()] || String(header).trim();
}
function labelFor(table: string, key: string) {
  return table === "media"
    ? mediaLabels[key] || labels[key] || key
    : labels[key] || key;
}
function comparable(value: unknown) {
  const text = String(value ?? "").trim();
  return enumLabels[text] || text;
}
function rowMatches(
  table: string,
  row: Record<string, unknown>,
  gridRow: string[],
  columns: string[],
) {
  const keys = identityKeys[table] || ["id"];
  return keys.every((key) => {
    const col = columns.indexOf(key);
    return (
      col >= 0 &&
      comparable(row[key]) !== "" &&
      comparable(row[key]) === comparable(gridRow[col])
    );
  });
}

function getAuth() {
  if (!runtimeConfig.googleServiceAccountJson) return null;
  const credentials = JSON.parse(runtimeConfig.googleServiceAccountJson);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });
}

export async function syncTablesToGoogleSheets(
  tables: Record<string, Array<Record<string, unknown>>>,
  expected: Record<string, Record<string, unknown>>,
) {
  const auth = getAuth();
  if (!auth || !runtimeConfig.googleSheetId)
    throw new Error("Chưa cấu hình Google Sheets API.");
  const sheets = google.sheets({ version: "v4", auth });
  const counts: Record<string, number> = {};
  for (const [table, rows] of Object.entries(tables)) {
    if (!rows.length || !tabs[table]) continue;
    const range = "'" + tabs[table] + "'!";
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: runtimeConfig.googleSheetId,
      fields: "sheets.properties.title",
    });
    const exists = meta.data.sheets?.some(
      (s) => s.properties?.title === tabs[table],
    );
    if (!exists)
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: runtimeConfig.googleSheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: tabs[table],
                  gridProperties: { frozenRowCount: 1 },
                },
              },
            },
          ],
        },
      });
    const params = { spreadsheetId: runtimeConfig.googleSheetId };
    const grid =
      (
        await sheets.spreadsheets.values.get({
          ...params,
          range: range + "A:AZ",
          valueRenderOption: "FORMULA",
        })
      ).data.values || [];
    const keys = Object.keys(rows[0]).filter(
      (k) => k !== "password_hash" && k !== "created_at",
    );
    const rawHeaders = grid[0] || keys.map((k) => labelFor(table, k));
    const headers = rawHeaders.map((header) =>
      table === "media" && keyForHeader(header) === "name"
        ? mediaLabels.name
        : header,
    );
    const columns = headers.map(keyForHeader);
    if (new Set(columns).size !== columns.length)
      throw Error("Trùng tiêu đề trên " + tabs[table]);
    if (!grid.length || (table === "media" && rawHeaders[0] !== headers[0]))
      await sheets.spreadsheets.values.update({
        ...params,
        range: range + "A1",
        valueInputOption: "RAW",
        requestBody: { values: [headers] },
      });
    for (const row of rows) {
      const index = grid.length
        ? grid
            .slice(1)
            .findIndex((gridRow) => rowMatches(table, row, gridRow, columns))
        : -1;
      if (index < 0) {
        await sheets.spreadsheets.values.append({
          ...params,
          range: range + "A:AZ",
          insertDataOption: "INSERT_ROWS",
          valueInputOption: "RAW",
          requestBody: { values: [columns.map((k) => row[k] ?? "")] },
        });
        continue;
      }
      const changes = headers.flatMap((k, c) => {
        const key = columns[c];
        if (
          !Object.hasOwn(expected[String(row.id)] || {}, key) ||
          !keys.includes(key) ||
          comparable(row[key]) === comparable(grid[index + 1][c])
        )
          return [];
        if (
          comparable(grid[index + 1][c]) !==
          comparable(expected[String(row.id)][key] ?? "")
        )
          throw Error("Sheet đã được sửa. Cần đối chiếu dòng " + row.id);
        const col =
          c < 26
            ? String.fromCharCode(65 + c)
            : "A" + String.fromCharCode(65 + c - 26);
        if (String(grid[index + 1][c] ?? "").startsWith("="))
          throw Error("Ô có công thức, cần đối chiếu trước.");
        return [
          { range: range + col + (index + 2), values: [[row[key] ?? ""]] },
        ];
      });
      if (changes.length)
        await sheets.spreadsheets.values.batchUpdate({
          ...params,
          requestBody: { valueInputOption: "RAW", data: changes },
        });
    }
    counts[table] = rows.length;
  }
  return counts;
}
