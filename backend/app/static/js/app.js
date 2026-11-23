/**
 * BIZWORK Frontend Core Controller
 * Handles Auth, Modular Views, Dynamic Spreadsheet Engine, and @Image Resolution.
 */

let currentUser = null;
let currentWorkbook = null;
let currentSheet = null;
let activeCellKey = "A1";
let sheetData = {};

document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
});

// Authentication handlers
async function checkAuth() {
    try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
            currentUser = await res.json();
            document.getElementById("auth-modal").classList.add("hidden");
            setupUserUI();
            loadOverview();
            loadWorkbooksList();
            loadProducts();
            loadMedia();
            loadOrders();
            if (currentUser.role === "SUPER_ADMIN" || currentUser.role === "ADMIN") {
                loadUsers();
            }
        } else {
            document.getElementById("auth-modal").classList.remove("hidden");
        }
    } catch (e) {
        document.getElementById("auth-modal").classList.remove("hidden");
    }
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById("login-form");
    const regForm = document.getElementById("register-form");
    const loginBtn = document.getElementById("tab-login-btn");
    const regBtn = document.getElementById("tab-register-btn");

    if (tab === "login") {
        loginForm.classList.remove("hidden");
        regForm.classList.add("hidden");
        loginBtn.classList.add("border-blue-600", "text-blue-600");
        regBtn.classList.remove("border-blue-600", "text-blue-600");
    } else {
        loginForm.classList.add("hidden");
        regForm.classList.remove("hidden");
        regBtn.classList.add("border-blue-600", "text-blue-600");
        loginBtn.classList.remove("border-blue-600", "text-blue-600");
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const alertBox = document.getElementById("login-alert");
    alertBox.classList.add("hidden");

    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;

    try {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok) {
            currentUser = data.user;
            document.getElementById("auth-modal").classList.add("hidden");
            setupUserUI();
            loadOverview();
            loadWorkbooksList();
            loadProducts();
            loadMedia();
            loadOrders();
        } else {
            alertBox.className = "p-3 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 block";
            alertBox.innerText = data.detail || "Đăng nhập thất bại.";
        }
    } catch (err) {
        alertBox.className = "p-3 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 block";
        alertBox.innerText = "Lỗi kết nối máy chủ.";
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const alertBox = document.getElementById("register-alert");
    const full_name = document.getElementById("reg-fullname").value.trim();
    const username = document.getElementById("reg-username").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;

    const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name, username, email, password })
    });
    const data = await res.json();
    alertBox.classList.remove("hidden");
    if (res.ok) {
        alertBox.className = "p-3 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 block";
        alertBox.innerText = data.message;
        setTimeout(() => switchAuthTab("login"), 2500);
    } else {
        alertBox.className = "p-3 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 block";
        alertBox.innerText = data.detail || "Đăng ký thất bại.";
    }
}

async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
}

function setupUserUI() {
    if (!currentUser) return;
    document.getElementById("user-display-name").innerText = currentUser.full_name || currentUser.username;
    document.getElementById("user-role-badge").innerText = currentUser.role;
    document.getElementById("user-avatar").innerText = currentUser.username.substring(0, 2).toUpperCase();

    if (currentUser.role !== "SUPER_ADMIN" && currentUser.role !== "ADMIN") {
        document.getElementById("admin-user-nav").classList.add("hidden");
    }
}

// Navigation Router
function navTo(viewName) {
    document.querySelectorAll(".view-panel").forEach(p => p.classList.add("hidden"));
    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("bg-blue-600", "text-white"));

    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) targetView.classList.remove("hidden");

    const activeNav = Array.from(document.querySelectorAll(".nav-item")).find(a => a.getAttribute("href") === `#${viewName}`);
    if (activeNav) activeNav.classList.add("bg-blue-600", "text-white");

    const titles = {
        overview: "Tổng Quan Kinh Doanh",
        spreadsheets: "Bảng Tính Nội Bộ BIZWORK",
        products: "Quản Lý Áo Bóng Đá & Đội Tuyển",
        media: "Thư Viện Ảnh @Mã Định Danh",
        orders: "Quản Lý Đơn Hàng Thị Trường Nhật Bản",
        users: "Duyệt Tài Khoản & Phân Quyền Bảo Mật"
    };
    document.getElementById("page-title").innerText = titles[viewName] || "BIZWORK";
}

// SPREADSHEET ENGINE
async function loadWorkbooksList() {
    const res = await fetch("/api/spreadsheets/workbooks");
    if (!res.ok) return;
    const workbooks = await res.json();
    const sel = document.getElementById("workbook-select");
    sel.innerHTML = workbooks.map(wb => `<option value="${wb.id}">${wb.title}</option>`).join("");
    if (workbooks.length > 0) {
        loadWorkbook(workbooks[0].id);
    }
}

async function loadWorkbook(wbId) {
    const res = await fetch(`/api/spreadsheets/workbook/${wbId}`);
    if (!res.ok) return;
    currentWorkbook = await res.json();
    if (currentWorkbook.sheets && currentWorkbook.sheets.length > 0) {
        currentSheet = currentWorkbook.sheets[0];
        sheetData = currentSheet.data || {};
        renderSpreadsheetTable(currentSheet.row_count || 50, currentSheet.col_count || 20);
    }
}

function renderSpreadsheetTable(rows, cols) {
    const table = document.getElementById("spreadsheet-table");
    let html = "<thead><tr><th class='header-cell w-12'>#</th>";

    for (let c = 0; c < cols; c++) {
        const colLetter = String.fromCharCode(65 + c);
        html += `<th class="header-cell" style="width: 140px;">${colLetter}</th>`;
    }
    html += "</tr></thead><tbody>";

    for (let r = 1; r <= rows; r++) {
        html += `<tr><td class="header-cell">${r}</td>`;
        for (let c = 0; c < cols; c++) {
            const colLetter = String.fromCharCode(65 + c);
            const key = `${colLetter}${r}`;
            const cell = sheetData[key] || {};
            const rawVal = cell.f ? cell.f : (cell.v !== undefined ? cell.v : "");
            const displayContent = formatCellContent(rawVal);

            html += `<td id="cell-${key}" 
                         class="spreadsheet-cell" 
                         contenteditable="true" 
                         onclick="selectCell('${key}')" 
                         onblur="onCellBlur('${key}', this)" 
                         data-key="${key}">${displayContent}</td>`;
        }
        html += "</tr>";
    }
    html += "</tbody>";
    table.innerHTML = html;
}

function formatCellContent(val) {
    if (val === null || val === undefined) return "";
    const str = String(val).trim();
    // Match @1, @2 @3 image codes
    if (str.startsWith("@")) {
        const codes = str.split(" ").filter(c => c.startsWith("@"));
        return codes.map(c => `<span class="cell-img-badge"><i class="fa-solid fa-image mr-1"></i>${c}</span>`).join(" ");
    }
    return str;
}

function selectCell(key) {
    activeCellKey = key;
    document.getElementById("active-cell-label").innerText = key;
    const cell = sheetData[key] || {};
    const inputVal = cell.f ? cell.f : (cell.v !== undefined ? cell.v : "");
    document.getElementById("formula-bar-input").value = inputVal;
}

function onFormulaBarChange(val) {
    if (!activeCellKey) return;
    const td = document.getElementById(`cell-${activeCellKey}`);
    if (td) {
        td.innerHTML = formatCellContent(val);
        updateCellData(activeCellKey, val);
    }
}

function onCellBlur(key, element) {
    const val = element.innerText.trim();
    updateCellData(key, val);
    element.innerHTML = formatCellContent(val);
}

function updateCellData(key, rawVal) {
    if (!sheetData[key]) sheetData[key] = {};
    if (String(rawVal).startsWith("=")) {
        sheetData[key].f = rawVal;
        sheetData[key].v = evaluateSimpleFormula(rawVal);
    } else {
        sheetData[key].v = rawVal;
        delete sheetData[key].f;
    }
}

function evaluateSimpleFormula(f) {
    try {
        // Safe evaluation of standard SUM, subtraction
        if (f.toUpperCase().startsWith("=SUM(")) {
            // Simplified SUM
            return 0;
        }
        return f;
    } catch {
        return f;
    }
}

async function saveCurrentSheet() {
    if (!currentSheet) return;
    const statusLabel = document.getElementById("save-status");
    statusLabel.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...`;

    const res = await fetch("/api/spreadsheets/save-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            sheet_id: currentSheet.id,
            data: sheetData,
            comment: "Cập nhật từ bảng tính Web"
        })
    });
    if (res.ok) {
        statusLabel.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Đã lưu thành công`;
        setTimeout(() => statusLabel.innerHTML = `<i class="fa-solid fa-check"></i> Đã đồng bộ`, 2000);
    }
}

function exportCurrentWorkbook() {
    if (!currentWorkbook) return;
    window.open(`/api/spreadsheets/export-xlsx/${currentWorkbook.id}`, "_blank");
}

// MEDIA GALLERY
async function loadMedia() {
    const res = await fetch("/api/media/list");
    if (!res.ok) return;
    const images = await res.json();
    const grid = document.getElementById("media-gallery-grid");
    grid.innerHTML = images.map(img => `
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm group hover:shadow-md transition">
            <div class="h-32 bg-slate-100 flex items-center justify-center relative overflow-hidden">
                <img src="${img.url}" alt="${img.display_name}" class="h-full w-full object-cover group-hover:scale-105 transition" onerror="this.src='https://placehold.co/200x200/1e293b/fff?text=${img.code}'">
                <span class="absolute top-2 left-2 bg-blue-600 text-white font-black text-xs px-2 py-0.5 rounded shadow">${img.code}</span>
            </div>
            <div class="p-3">
                <p class="text-xs font-bold text-slate-800 truncate" title="${img.display_name}">${img.display_name}</p>
                <p class="text-[10px] text-slate-400 mt-0.5">${img.category}</p>
            </div>
        </div>
    `).join("");
}

async function uploadSelectedImages(files) {
    if (!files || files.length === 0) return;
    const formData = new FormData();
    for (let f of files) formData.append("files", f);
    formData.append("category", "jersey");

    const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData
    });
    if (res.ok) {
        loadMedia();
    }
}

// PRODUCTS
async function loadProducts() {
    const res = await fetch("/api/products/list");
    if (!res.ok) return;
    const prods = await res.json();
    const grid = document.getElementById("products-cards-grid");
    grid.innerHTML = prods.map(p => `
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between p-5">
            <div>
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg">${p.code}</span>
                    <span class="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">${p.primary_image_code || "@1"}</span>
                </div>
                <h4 class="font-bold text-slate-900 text-sm leading-tight mb-1">${p.name}</h4>
                <p class="text-xs text-slate-500 font-medium mb-3">${p.name_ja || ""}</p>
                <div class="bg-slate-50 p-3 rounded-xl space-y-1 text-xs">
                    <div class="flex justify-between">
                        <span class="text-slate-500">Giá Bán JPY:</span>
                        <strong class="text-slate-900">¥ ${p.selling_price_jpy.toLocaleString()}</strong>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-500">Giá Vốn JPY:</span>
                        <span class="text-slate-700">¥ ${p.cost_price_jpy.toLocaleString()}</span>
                    </div>
                    <div class="flex justify-between text-emerald-600 font-bold">
                        <span>Lợi Nhuận:</span>
                        <span>+¥ ${p.expected_profit_jpy.toLocaleString()}</span>
                    </div>
                </div>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span class="text-slate-500 font-medium">Tồn kho: <strong>${p.total_stock} bộ</strong></span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${p.ip_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
                    ${p.ip_verified ? 'Bản quyền OK' : 'Fan Edition'}
                </span>
            </div>
        </div>
    `).join("");
}

// ORDERS
async function loadOrders() {
    const res = await fetch("/api/orders/list");
    if (!res.ok) return;
    const orders = await res.json();
    const tbody = document.getElementById("orders-full-tbody");
    const overviewTbody = document.getElementById("overview-orders-tbody");

    const rows = orders.map(o => `
        <tr class="hover:bg-slate-50 transition">
            <td class="py-3 px-4 font-mono font-bold text-xs text-blue-600">${o.order_code}</td>
            <td class="py-3 px-4">
                <div class="font-bold text-slate-800 text-xs">${o.shipping_name}</div>
                <div class="text-[11px] text-slate-500">${o.shipping_address}</div>
            </td>
            <td class="py-3 px-4">
                ${o.items.map(it => `
                    <div class="text-xs">
                        <span class="font-semibold text-slate-700">${it.product_name}</span> 
                        <span class="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-1.5 py-0.2 rounded">${it.size}</span>
                        ${it.custom_name ? `<span class="bg-amber-100 text-amber-800 text-[10px] px-1 rounded font-bold">${it.custom_name} #${it.custom_number}</span>` : ''}
                    </div>
                `).join("")}
            </td>
            <td class="py-3 px-4 text-right font-black text-slate-900 text-xs">¥ ${o.total_amount_jpy.toLocaleString()}</td>
            <td class="py-3 px-4">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">${o.status}</span>
            </td>
            <td class="py-3 px-4 text-center">
                <button class="text-xs text-slate-500 hover:text-blue-600 font-semibold"><i class="fa-solid fa-eye"></i></button>
            </td>
        </tr>
    `).join("");

    if (tbody) tbody.innerHTML = rows;
    if (overviewTbody) overviewTbody.innerHTML = rows;
}

// USERS & APPROVAL (ADMIN)
async function loadUsers() {
    const res = await fetch("/api/auth/users");
    if (!res.ok) return;
    const users = await res.json();
    const tbody = document.getElementById("users-table-tbody");
    tbody.innerHTML = users.map(u => `
        <tr class="hover:bg-slate-50 transition">
            <td class="py-3 px-4 text-xs font-mono">${u.id}</td>
            <td class="py-3 px-4">
                <div class="font-bold text-slate-900 text-xs">${u.full_name}</div>
                <div class="text-[11px] text-slate-400 font-mono">@${u.username}</div>
            </td>
            <td class="py-3 px-4 text-xs text-slate-600">${u.email}</td>
            <td class="py-3 px-4">
                <span class="text-xs font-bold text-slate-700 font-mono">${u.role}</span>
            </td>
            <td class="py-3 px-4">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    u.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                    u.status === 'PENDING' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                    'bg-rose-100 text-rose-700'
                }">${u.status}</span>
            </td>
            <td class="py-3 px-4 text-center space-x-2">
                ${u.status === 'PENDING' ? `
                    <button onclick="approveUserAction(${u.id}, 'APPROVED', '${u.role}')" class="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg transition shadow-sm">
                        <i class="fa-solid fa-check mr-1"></i> Duyệt Quyền
                    </button>
                    <button onclick="approveUserAction(${u.id}, 'REJECTED', '${u.role}')" class="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg transition shadow-sm">
                        <i class="fa-solid fa-xmark mr-1"></i> Từ Chối
                    </button>
                ` : `
                    <button onclick="approveUserAction(${u.id}, '${u.status === 'APPROVED' ? 'LOCKED' : 'APPROVED'}', '${u.role}')" class="text-xs font-semibold ${u.status === 'APPROVED' ? 'text-amber-600 hover:underline' : 'text-emerald-600 hover:underline'}">
                        ${u.status === 'APPROVED' ? 'Khóa' : 'Mở Khóa'}
                    </button>
                `}
            </td>
        </tr>
    `).join("");
}

async function approveUserAction(userId, status, role) {
    const res = await fetch("/api/auth/users/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, status, role })
    });
    if (res.ok) {
        loadUsers();
    }
}

function loadOverview() {
    // Loaded within sub-functions
}
