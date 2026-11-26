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

const sheetFieldOrder: Record<string, string[]> = {
  customers: ["id", "name", "phone", "email", "country", "address", "note"],
  products: [
    "id", "sku", "name", "category", "team", "season", "color", "sale_jpy", "stock", "status",
  ],
  media: ["id", "name", "type", "category", "url"],
  orders: [
    "id", "order_no", "customer_name", "team", "product", "size", "quantity", "total_jpy", "status", "tracking",
  ],
  inventory: ["id", "sku", "product", "type", "quantity", "warehouse", "note"],
  employees: ["id", "code", "name", "department", "position", "salary_jpy", "phone", "status"],
  attendance: ["id", "employee_id", "work_date", "status", "time_in", "time_out", "note"],
  payroll: ["code", "name", "department", "work_days", "salary_jpy", "estimated_salary", "status"],
  finance: ["id", "kind", "category", "amount_jpy", "description", "occurred_at"],
  users: ["id", "name", "email", "role", "status", "created_at"],
};

const sheetFormatProfiles: Record<string, { widths: number[]; wrap: string[] }> = {
  customers: { widths: [125, 180, 145, 220, 120, 190, 210], wrap: ["name", "address", "note"] },
  products: { widths: [125, 130, 190, 145, 155, 105, 115, 125, 95, 120], wrap: ["name"] },
  media: { widths: [125, 220, 125, 180, 260], wrap: ["name", "url"] },
  orders: { widths: [125, 150, 180, 150, 190, 85, 90, 130, 125, 170], wrap: ["customer_name", "product"] },
  inventory: { widths: [125, 130, 190, 125, 100, 150, 220], wrap: ["product", "note"] },
  employees: { widths: [125, 125, 180, 150, 145, 140, 150, 125], wrap: ["name"] },
  attendance: { widths: [125, 135, 125, 125, 105, 105, 240], wrap: ["note"] },
  payroll: { widths: [125, 180, 150, 105, 140, 155, 125], wrap: ["name"] },
  finance: { widths: [125, 125, 150, 140, 260, 145], wrap: ["description"] },
  users: { widths: [125, 180, 240, 140, 125, 145], wrap: ["name"] },
};

function keyForHeader(header: string) {
  return aliases[String(header).trim()] || String(header).trim();
}

function columnLetter(index: number) {
  let n = index + 1;
  let result = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function formatRequests(
  sheetId: number,
  table: string,
  keys: string[],
): any[] {
  const profile = sheetFormatProfiles[table] || { widths: [], wrap: [] };
  const columnCount = Math.max(keys.length, profile.widths.length);
  const headerRange = {
    sheetId,
    startRowIndex: 0,
    endRowIndex: 1,
    startColumnIndex: 0,
    endColumnIndex: columnCount,
  };
  const bodyRange = {
    sheetId,
    startRowIndex: 1,
    endRowIndex: 1000,
    startColumnIndex: 0,
    endColumnIndex: columnCount,
  };
  const requests: any[] = [
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: {
            frozenRowCount: 1,
            frozenColumnCount: 1,
            hideGridlines: false,
          },
        },
        fields: "gridProperties.frozenRowCount,gridProperties.frozenColumnCount,gridProperties.hideGridlines",
      },
    },
    {
      repeatCell: {
        range: headerRange,
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.09, green: 0.29, blue: 0.23 },
            textFormat: {
              fontFamily: "Arial",
              fontSize: 10,
              bold: true,
              foregroundColor: { red: 1, green: 1, blue: 1 },
            },
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
            wrapStrategy: "WRAP",
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)",
      },
    },
    {
      repeatCell: {
        range: bodyRange,
        cell: {
          userEnteredFormat: {
            textFormat: {
              fontFamily: "Arial",
              fontSize: 10,
              foregroundColor: { red: 0.11, green: 0.16, blue: 0.13 },
            },
            verticalAlignment: "MIDDLE",
            wrapStrategy: "CLIP",
          },
        },
        fields: "userEnteredFormat(textFormat,verticalAlignment,wrapStrategy)",
      },
    },
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: "ROWS", startIndex: 0, endIndex: 1 },
        properties: { pixelSize: 34 },
        fields: "pixelSize",
      },
    },
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: "ROWS", startIndex: 1, endIndex: 1000 },
        properties: { pixelSize: 27 },
        fields: "pixelSize",
      },
    },
    {
      updateBorders: {
        range: headerRange,
        top: { style: "SOLID", color: { red: 0.09, green: 0.29, blue: 0.23 } },
        bottom: { style: "SOLID_MEDIUM", color: { red: 0.09, green: 0.29, blue: 0.23 } },
        left: { style: "SOLID", color: { red: 0.09, green: 0.29, blue: 0.23 } },
        right: { style: "SOLID", color: { red: 0.09, green: 0.29, blue: 0.23 } },
      },
    },
  ];
  profile.widths.slice(0, columnCount).forEach((pixelSize, index) => {
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: "COLUMNS",
          startIndex: index,
          endIndex: index + 1,
        },
        properties: { pixelSize },
        fields: "pixelSize",
      },
    });
  });
  profile.wrap.forEach((key) => {
    const index = keys.indexOf(key);
    if (index < 0) return;
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: 1000,
          startColumnIndex: index,
          endColumnIndex: index + 1,
        },
        cell: { userEnteredFormat: { wrapStrategy: "WRAP" } },
        fields: "userEnteredFormat.wrapStrategy",
      },
    });
  });
  return requests;
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
  if (table === "customers") {
    // A customer name is editable, so it must not be part of the identity.
    // Prefer the stable contact fields and fall back to the name only for
    // legacy rows that have neither email nor phone.
    const identityKey = ["email", "phone", "name"].find(
      (key) => comparable(row[key]) !== "",
    );
    if (!identityKey) return false;
    const col = columns.indexOf(identityKey);
    return (
      col >= 0 &&
      comparable(row[identityKey]) === comparable(gridRow[col])
    );
  }
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

async function getSpreadsheet(auth: any) {
  return google.sheets({ version: "v4", auth });
}

async function readSheetKeys(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  title: string,
  table: string,
) {
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${title.replaceAll("'", "''")}'!A1:AZ1`,
    valueRenderOption: "FORMULA",
  });
  const existing = (result.data.values?.[0] || [])
    .map((header) => keyForHeader(String(header)))
    .filter(Boolean);
  return existing.length ? existing : sheetFieldOrder[table] || [];
}

async function formatGoogleSheet(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  sheet: { properties?: { sheetId?: number | null; title?: string | null } },
  table: string,
) {
  const sheetId = sheet.properties?.sheetId;
  const title = sheet.properties?.title;
  if (sheetId == null || !title) return;
  const keys = await readSheetKeys(sheets, spreadsheetId, title, table);
  const headers = keys.map((key) => labelFor(table, key));
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${title.replaceAll("'", "''")}'!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [headers] },
  });
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: formatRequests(sheetId, table, keys) },
  });
}

/**
 * Creates any missing business tabs and applies one consistent professional
 * layout without changing existing data rows or their order.
 */
export async function formatGoogleSheets() {
  const auth = getAuth();
  if (!auth || !runtimeConfig.googleSheetId)
    throw new Error("Chưa cấu hình Google Sheets API.");
  const sheets = await getSpreadsheet(auth);
  const spreadsheetId = runtimeConfig.googleSheetId;
  let meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });
  const existing = new Map(
    (meta.data.sheets || [])
      .filter((sheet) => sheet.properties?.title)
      .map((sheet) => [String(sheet.properties!.title), sheet]),
  );
  const addRequests = Object.keys(sheetFieldOrder)
    .filter((table) => !existing.has(tabs[table] || ""))
    .map((table) => ({
      addSheet: {
        properties: {
          title: tabs[table],
          gridProperties: { frozenRowCount: 1, frozenColumnCount: 1 },
        },
      },
    }));
  if (addRequests.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: addRequests },
    });
    meta = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties",
    });
  }
  const byTitle = new Map(
    (meta.data.sheets || [])
      .filter((sheet) => sheet.properties?.title)
      .map((sheet) => [String(sheet.properties!.title), sheet]),
  );
  for (const [table, title] of Object.entries(tabs)) {
    if (!sheetFieldOrder[table]) continue;
    const sheet = byTitle.get(title);
    if (sheet) await formatGoogleSheet(sheets, spreadsheetId, sheet, table);
  }
  return {
    ok: true,
    formatted: Object.keys(sheetFieldOrder).map((table) => tabs[table]),
  };
}

export async function syncTablesToGoogleSheets(
  tables: Record<string, Array<Record<string, unknown>>>,
  expected: Record<string, Record<string, unknown>>,
) {
  const auth = getAuth();
  if (!auth || !runtimeConfig.googleSheetId)
    throw new Error("Chưa cấu hình Google Sheets API.");
  const sheets = await getSpreadsheet(auth);
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
      const formattedMeta = await sheets.spreadsheets.get({
        spreadsheetId: runtimeConfig.googleSheetId,
        fields: "sheets.properties",
      });
      const currentSheet = formattedMeta.data.sheets?.find(
        (sheet) => sheet.properties?.title === tabs[table],
      );
      if (currentSheet) {
        await formatGoogleSheet(
          sheets,
          runtimeConfig.googleSheetId,
          currentSheet,
          table,
        );
      }
    }
    counts[table] = rows.length;
  }
  return counts;
}
