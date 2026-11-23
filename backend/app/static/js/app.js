/**
 * BIZWORK Controller - Full Vietnamese Localization & Hover Bugfix
 */

let currentUser = null;
let currentWorkbook = null;
let imageCatalog = {};

document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
    setupImageHoverWatcher();
});

// Authentication
async function checkAuth() {
    try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
            currentUser = await res.json();
            document.getElementById("auth-modal").classList.add("hidden");
            setupUserUI();
            await loadMediaCatalog();
            loadWorkbooksList();
            loadOverview();
            loadProducts();
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
            await loadMediaCatalog();
            loadWorkbooksList();
            loadOverview();
            loadProducts();
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

async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
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

function setupUserUI() {
    if (!currentUser) return;
    document.getElementById("user-display-name").innerText = currentUser.full_name || currentUser.username;
    document.getElementById("user-role-badge").innerText = currentUser.role;
    document.getElementById("user-avatar").innerText = currentUser.username.substring(0, 2).toUpperCase();

    if (currentUser.role !== "SUPER_ADMIN" && currentUser.role !== "ADMIN") {
        const adminNav = document.getElementById("admin-user-nav");
        if (adminNav) adminNav.classList.add("hidden");
    }
}

function navTo(viewName) {
    // Hide hover tooltip immediately when switching tabs
    const tooltip = document.getElementById("img-hover-tooltip");
    if (tooltip) tooltip.style.display = "none";

    document.querySelectorAll(".view-panel").forEach(p => p.classList.add("hidden"));
    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("bg-blue-600", "text-white"));

    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) targetView.classList.remove("hidden");

    const activeNav = Array.from(document.querySelectorAll(".nav-item")).find(a => a.getAttribute("href") === `#${viewName}`);
    if (activeNav) activeNav.classList.add("bg-blue-600", "text-white");

    const titles = {
        spreadsheets: "Bảng Tính Nội Bộ BIZWORK",
        overview: "Tổng Quan Kinh Doanh",
        products: "Danh Mục Sản Phẩm & Size",
        media: "Thư Viện Ảnh @Mã Định Danh",
        orders: "Quản Lý Đơn Hàng Nhật Bản",
        users: "Duyệt & Phân Quyền Người Dùng"
    };
    document.getElementById("page-title").innerText = titles[viewName] || "BIZWORK";

    if (viewName === "spreadsheets" && window.luckysheet && window.luckysheet.resize) {
        setTimeout(() => window.luckysheet.resize(), 100);
    }
}

// Media Catalog
async function loadMediaCatalog() {
    try {
        const res = await fetch("/api/media/list");
        if (!res.ok) return;
        const images = await res.json();
        images.forEach(img => {
            imageCatalog[img.code] = {
                url: img.url,
                thumbnail_url: img.thumbnail_url || img.url,
                display_name: img.display_name
            };
        });
        renderMediaGallery(images);
    } catch (e) {
        console.error("Error loading media catalog:", e);
    }
}

// ==========================================
// ENTERPRISE LUCKYSHEET WITH VIETNAMESE LOCALIZATION
// ==========================================
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
    initLuckysheetFromWorkbook(currentWorkbook);
}

function initLuckysheetFromWorkbook(wb) {
    const sheetsData = (wb.sheets && wb.sheets.length > 0) ? wb.sheets : [
        { id: 1, name: "Trang tính 1", row_count: 84, col_count: 26, data: {} }
    ];

    const luckysheetData = sheetsData.map((s, idx) => {
        const celldata = [];
        const rawCells = s.data || {};
        
        for (const [cellRef, valObj] of Object.entries(rawCells)) {
            const match = cellRef.match(/^([A-Z]+)([0-9]+)$/);
            if (!match) continue;
            const colLetter = match[1];
            const rowNum = parseInt(match[2], 10) - 1;
            
            let colNum = 0;
            for (let i = 0; i < colLetter.length; i++) {
                colNum = colNum * 26 + (colLetter.charCodeAt(i) - 64);
            }
            colNum -= 1;

            const val = valObj.v !== undefined ? valObj.v : "";
            const formula = valObj.f || "";

            celldata.push({
                r: rowNum,
                c: colNum,
                v: {
                    v: val,
                    m: String(val),
                    f: formula ? formula : undefined,
                    bg: rowNum === 0 ? "#f1f5f9" : undefined,
                    bl: rowNum === 0 ? 1 : undefined,
                    tb: 1 // Text wrap (xuống dòng) enabled
                }
            });
        }

        return {
            name: s.name || `Trang tính ${idx + 1}`,
            index: idx,
            status: idx === 0 ? 1 : 0,
            order: idx,
            row: s.row_count || 80,
            column: s.col_count || 26,
            celldata: celldata
        };
    });

    if (window.luckysheet && window.luckysheet.destroy) {
        window.luckysheet.destroy();
    }

    const options = {
        container: 'luckysheet',
        title: wb.title,
        lang: 'vi',
        showinfobar: false,
        showsheetbar: true,
        showstatisticBar: true,
        sheetFormulaBar: true,
        enableAddRow: true,
        enableAddCol: true,
        toolbarConfig: {
            undo: true,
            redo: true,
            paintFormat: true,
            currency: true,
            percentage: true,
            numberDecrease: true,
            numberIncrease: true,
            moreFormats: true,
            font: true,
            fontSize: true,
            bold: true,
            italic: true,
            strikethrough: true,
            underline: true,
            textColor: true,
            fillColor: true,
            border: true,
            mergeCell: true,
            horizontalAlignMode: true,
            verticalAlignMode: true,
            textWrapMode: true,
            textRotateMode: true,
            image: true,
            link: true,
            chart: true,
            postil: true,
            pivotTable: true,
            function: true,
            frozenMode: true,
            sortAndFilter: true,
            conditionalFormat: true,
            dataVerification: true,
            splitColumn: true,
            screenshot: true,
            findAndReplace: true,
            protection: true,
            print: true
        },
        data: luckysheetData,
        hook: {
            // Auto-save on cell edit
            cellUpdated: function() {
                saveCurrentLuckysheet();
            }
        }
    };

    setTimeout(() => {
        window.luckysheet.create(options);
        setTimeout(() => {
            if (window.luckysheet && window.luckysheet.resize) {
                window.luckysheet.resize();
            }
            applyVietnameseToolbarTitles();
        }, 200);
    }, 50);
}

// Translate dropdowns & buttons to Vietnamese
function applyVietnameseToolbarTitles() {
    const titles = {
        "Automatic": "Tự động",
        "Plain text": "Văn bản thuần túy",
        "Number": "Số",
        "Percent": "Phần trăm",
        "Scientific": "Khoa học",
        "Accounting": "Kế toán",
        "Currency": "Tiền tệ",
        "Date": "Ngày tháng",
        "Time": "Thời gian",
        "Time 24H": "Giờ 24H",
        "Date time": "Ngày & Giờ",
        "Date time 24 H": "Ngày & Giờ 24H",
        "Custom formats": "Định dạng khác"
    };

    document.querySelectorAll(".luckysheet-toolbar-menu-item, .luckysheet-format-list li, span").forEach(el => {
        const txt = el.innerText.trim();
        if (titles[txt]) {
            el.innerText = titles[txt];
        }
    });
}

// Auto-save Luckysheet
let workbookSaveQueue = Promise.resolve();

function saveCurrentLuckysheet() {
    workbookSaveQueue = workbookSaveQueue
        .then(() => persistCurrentLuckysheet())
        .catch(error => {
            console.error("BIZWORK spreadsheet save failed:", error);
            const label = document.getElementById("save-status");
            if (label) label.innerText = "Lỗi lưu dữ liệu - vui lòng thử Lưu Ngay";
        });
    return workbookSaveQueue;
}

async function persistCurrentLuckysheet() {
    if (!currentWorkbook || !window.luckysheet) return;
    const statusLabel = document.getElementById("save-status");
    if (statusLabel) statusLabel.innerText = "Đang lưu tất cả trang tính...";

    const sheets = window.luckysheet.getAllSheets() || [];
    const databaseSheets = currentWorkbook.sheets || [];
    if (sheets.length !== databaseSheets.length) {
        throw new Error("Số trang tính trên giao diện không khớp dữ liệu máy chủ.");
    }

    for (let index = 0; index < sheets.length; index++) {
        const sheet = sheets[index];
        const dbSheet = databaseSheets[index];
        const matrix = sheet.data || [];
        const convertedData = {};

        for (let r = 0; r < matrix.length; r++) {
            const row = matrix[r] || [];
            for (let c = 0; c < row.length; c++) {
                const cell = row[c];
                if (!cell || (cell.v === undefined && cell.f === undefined)) continue;
                let colLetter = "";
                let tempC = c + 1;
                while (tempC > 0) {
                    const rem = (tempC - 1) % 26;
                    colLetter = String.fromCharCode(65 + rem) + colLetter;
                    tempC = Math.floor((tempC - 1) / 26);
                }
                convertedData[colLetter + (r + 1)] = {
                    v: cell.v,
                    f: cell.f || null,
                    s: cell.s || { bg: cell.bg, bl: cell.bl }
                };
            }
        }

        const config = sheet.config || {};
        const response = await fetch("/api/spreadsheets/save-sheet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sheet_id: dbSheet.id,
                data: convertedData,
                column_widths: config.columnlen || {},
                row_heights: config.rowlen || {},
                comment: "Tự động lưu - " + (dbSheet.name || ("Sheet " + (index + 1)))
            })
        });
        if (!response.ok) {
            const detail = await response.text();
            throw new Error("Không lưu được " + dbSheet.name + ": " + detail);
        }
    }

    if (statusLabel) {
        statusLabel.innerText = "Đã lưu tất cả " + sheets.length + " trang tính";
        setTimeout(() => { statusLabel.innerText = "Sẵn sàng"; }, 2500);
    }
}

function exportCurrentWorkbook() {
    if (!currentWorkbook) return;
    window.open(`/api/spreadsheets/export-xlsx/${currentWorkbook.id}`, "_blank");
}

// ==============================================================
// MÃ @ẢNH: FIX HOVER BUG - CHỈ KÍCH HOẠT TRÊN BẢNG TÍNH LUCKYSHEET
// ==============================================================
function setupImageHoverWatcher() {
    const tooltip = document.getElementById("img-hover-tooltip");
    const thumbImg = document.getElementById("hover-thumb-img");
    const thumbCode = document.getElementById("hover-thumb-code");

    document.addEventListener("mouseover", (e) => {
        // BUGFIX: Chỉ hiển thị tooltip khi chuột di chuyển BÊN TRONG khung bảng tính luckysheet
        const luckysheetContainer = document.getElementById("luckysheet");
        if (!luckysheetContainer || !luckysheetContainer.contains(e.target)) {
            tooltip.style.display = "none";
            return;
        }

        const text = e.target.innerText || e.target.textContent || "";
        const match = text.match(/@([0-9]+)/);
        if (match) {
            const code = `@${match[1]}`;
            const imgData = imageCatalog[code] || {
                url: `/static/uploads/Ao_Dau_Nhat_Ban_Home_Flame_Blue.png`,
                thumbnail_url: `/static/uploads/thumbnails/thumb_Ao_Dau_Nhat_Ban_Home_Flame_Blue.png`,
                display_name: "Áo đấu / Logo"
            };

            thumbImg.src = imgData.thumbnail_url;
            thumbCode.innerText = `${code}: ${imgData.display_name}`;
            tooltip.style.left = `${Math.min(window.innerWidth - 180, e.clientX + 15)}px`;
            tooltip.style.top = `${Math.min(window.innerHeight - 200, e.clientY + 15)}px`;
            tooltip.style.display = "block";
        }
    });

    document.addEventListener("mousemove", (e) => {
        if (tooltip.style.display === "block") {
            const luckysheetContainer = document.getElementById("luckysheet");
            if (!luckysheetContainer || !luckysheetContainer.contains(e.target)) {
                tooltip.style.display = "none";
                return;
            }
            const text = e.target.innerText || e.target.textContent || "";
            if (!text.includes("@") && !tooltip.contains(e.target)) {
                tooltip.style.display = "none";
            }
        }
    });
}

function openFullLightbox(src, code) {
    const modal = document.getElementById("image-lightbox-modal");
    const lightImg = document.getElementById("lightbox-image");
    const lightCode = document.getElementById("lightbox-code");
    
    const realImg = imageCatalog[code] ? imageCatalog[code].url : src;
    lightImg.src = realImg;
    lightCode.innerText = code || "@ẢNH";
    modal.classList.remove("hidden");
}

function closeFullLightbox() {
    document.getElementById("image-lightbox-modal").classList.add("hidden");
}

// Upload new image with Custom Name & Auto Save
async function handleUploadCustomImage(e) {
    e.preventDefault();
    const alertBox = document.getElementById("upload-status-alert");
    const submitBtn = document.getElementById("upload-submit-btn");
    const nameInput = document.getElementById("upload-name-input");
    const catSelect = document.getElementById("upload-cat-select");
    const fileInput = document.getElementById("upload-file-input");

    if (!fileInput.files || fileInput.files.length === 0) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Đang tải lên...`;
    alertBox.classList.add("hidden");

    const formData = new FormData();
    Array.from(fileInput.files).forEach(file => formData.append("files", file));
    formData.append("category", catSelect.value);
    formData.append("display_name", nameInput.value.trim());

    try {
        const res = await fetch("/api/media/upload", {
            method: "POST",
            body: formData
        });
        const data = await res.json();
        if (res.ok && data.uploaded && data.uploaded.length > 0) {
            const codes = data.uploaded.map(image => image.code).join(", ");
            alertBox.className = "mt-3 text-xs p-2.5 rounded-lg font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 block";
            alertBox.innerText = "Tải lên thành công " + data.uploaded.length + " ảnh. Mã ảnh: " + codes + ". Tên hiển thị: " + nameInput.value.trim() + ".";
            
            // Reset form
            nameInput.value = "";
            fileInput.value = "";
            await loadMediaCatalog();
        } else {
            alertBox.className = "mt-3 text-xs p-2.5 rounded-lg font-medium bg-rose-50 text-rose-800 border border-rose-200 block";
            alertBox.innerText = data.detail || "Lỗi tải ảnh lên.";
        }
    } catch (err) {
        alertBox.className = "mt-3 text-xs p-2.5 rounded-lg font-medium bg-rose-50 text-rose-800 border border-rose-200 block";
        alertBox.innerText = "Lỗi kết nối máy chủ khi upload ảnh.";
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up mr-1"></i> Tải Lên & Lưu Tự Động`;
    }
}

// Media Gallery View
function renderMediaGallery(images) {
    const grid = document.getElementById("media-gallery-grid");
    if (!grid) return;
    grid.innerHTML = images.map(img => `
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm group hover:shadow-md transition">
            <div class="h-32 bg-slate-100 flex items-center justify-center relative overflow-hidden cursor-pointer" onclick="openFullLightbox('${img.url}', '${img.code}')">
                <img src="${img.url}" alt="${img.display_name}" class="h-full w-full object-cover group-hover:scale-105 transition" onerror="this.src='/static/uploads/thumbnails/thumb_Ao_Dau_Nhat_Ban_Home_Flame_Blue.png'">
                <span class="absolute top-2 left-2 bg-blue-600 text-white font-black text-xs px-2 py-0.5 rounded shadow">${img.code}</span>
            </div>
            <div class="p-3">
                <p class="text-xs font-bold text-slate-800 truncate" title="${img.display_name}">${img.display_name}</p>
                <p class="text-[10px] text-slate-400 mt-0.5">${img.category}</p>
            </div>
        </div>
    `).join("");
}

// Products
async function loadProducts() {
    const res = await fetch("/api/products/list");
    if (!res.ok) return;
    const prods = await res.json();
    const grid = document.getElementById("products-cards-grid");
    if (!grid) return;
    grid.innerHTML = prods.map(p => `
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between p-5">
            <div>
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg">${p.code}</span>
                    <span class="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg cursor-pointer" onclick="openFullLightbox('', '${p.primary_image_code || '@1'}')">${p.primary_image_code || "@1"}</span>
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

// Orders
async function loadOrders() {
    const res = await fetch("/api/orders/list");
    if (!res.ok) return;
    const orders = await res.json();
    const tbody = document.getElementById("orders-full-tbody");
    if (!tbody) return;
    tbody.innerHTML = orders.map(o => `
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
        </tr>
    `).join("");
}

// Users (Admin)
async function loadUsers() {
    const res = await fetch("/api/auth/users");
    if (!res.ok) return;
    const users = await res.json();
    const tbody = document.getElementById("users-table-tbody");
    if (!tbody) return;
    tbody.innerHTML = users.map(u => `
        <tr class="hover:bg-slate-50 transition">
            <td class="py-3 px-4 text-xs font-mono">${u.id}</td>
            <td class="py-3 px-4 font-bold text-slate-900 text-xs">${u.full_name} (@${u.username})</td>
            <td class="py-3 px-4 text-xs text-slate-600">${u.email}</td>
            <td class="py-3 px-4 text-xs font-mono">${u.role}</td>
            <td class="py-3 px-4">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${u.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}">${u.status}</span>
            </td>
        </tr>
    `).join("");
}

async function loadOverview() {
    try {
        const response = await fetch("/api/dashboard/summary");
        if (!response.ok) return;
        const data = await response.json();
        const money = value => "¥ " + Number(value || 0).toLocaleString("ja-JP");
        const setText = (id, value) => {
            const node = document.getElementById(id);
            if (node) node.innerText = value;
        };
        setText("overview-revenue", money(data.revenue_jpy));
        setText("overview-orders", Number(data.orders_count || 0).toLocaleString("vi-VN") + " Đơn");
        setText("overview-pending", Number(data.pending_count || 0).toLocaleString("vi-VN") + " đơn đang xử lý");
        setText("overview-profit", money(data.profit_jpy));
        setText("overview-stock", Number(data.stock_count || 0).toLocaleString("vi-VN") + " Bộ");
    } catch (error) {
        console.error("Không thể tải tổng quan BIZWORK:", error);
    }
}
