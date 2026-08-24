/* اتجاه التصميم: دفتر التاجر الهادئ — واجهة تشغيل يومية RTL تجعل الإجراء والمعلومة محور كل شاشة. */
/* اتجاه التصميم: دفتر التاجر الهادئ — تفاعلات سريعة، RTL واضح، وماسح منتج لا يقطع سياق النموذج. */
import { ACCOUNT_ROLES, BUSINESS_PROFILES, BUSINESS_TYPES, CURRENCIES, DAILY_EXPENSE_CATEGORIES, DEFAULT_CURRENCY_CODE, EXPENSE_CATEGORIES, MONTHLY_EXPENSE_CATEGORIES, NAV_ITEMS, PACKAGE_UNITS, PAYMENT_METHODS, UNITS } from "./constants.js";
import { db } from "./database.js";
import { calculatePackagePurchase, calculateSaleTotals, calculateTransferCollections, dateKey, roundMoney, stockStatus, toNumber } from "./domain.js";
import { deleteCloudBackup, getCloudBackupUser, listCloudBackups, readCloudBackup, registerCloudBackupUser, signInCloudBackupUser, signOutCloudBackupUser, uploadCloudBackup } from "./firebase-backup.js";
import { renderThermalInvoiceHtml } from "./invoice-print.js";
import { renderCustomerAccountHtml } from "./customer-account-print.js";
import { getExitGuardAction, leaveAfterExitConfirmation, primeExitGuardHistory } from "./navigation-guard.js";
import { createReportPdfFile, printHtmlDocument, shareOrDownloadCustomerAccountPdf, shareOrDownloadInvoicePdf, shareOrDownloadPdf } from "./pdf-export.js";
import { canAccessView, canUseAction, isAdmin } from "./permissions.js";
import { isNewContinuousBarcode, shouldReleaseContinuousBarcode } from "./scanner-session.js";

const icon = (name, size = 20) => {
  const paths = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    package: '<path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
    cart: '<path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L21 8H7"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',
    receipt: '<path d="M5 3h14v18l-2-1.5L15 21l-3-1.5L9 21l-2-1.5L5 21V3Z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.2-4.2"/>',
    scan: '<path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2"/><path d="M8 9v6M11 9v6M14 9v6M17 9v6"/>',
    dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    arrow: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    close: '<path d="m18 6-12 12M6 6l12 12"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5Z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v5M14 11v5"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="m5 12 4.5 4.5L19 7"/>',
    alert: '<path d="M10.3 3.7 2.5 17.1A2 2 0 0 0 4.2 20h15.6a2 2 0 0 0 1.7-2.9L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    trend: '<path d="M3 17 9 11l4 4 8-9"/><path d="M15 6h6v6"/>',
    box: '<path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    truck: '<path d="M10 17h4V5H2v12h3M14 9h4l4 4v4h-3M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>',
    wallet: '<path d="M20 7V6a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v8a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V7"/><path d="M16 14h2"/>',
    transfer: '<path d="M4 7h13"/><path d="m13 3 4 4-4 4"/><path d="M20 17H7"/><path d="m11 13-4 4 4 4"/>',
    chart: '<path d="M4 19V5M4 19h16M8 16v-5M12 16V7M16 16v-8"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"/><path d="M12 7v5l3 2"/>',
    rotate: '<path d="M21 12a9 9 0 0 0-15.5-6.2L3 8M3 3v5h5M3 12a9 9 0 0 0 15.5 6.2L21 16m0 5v-5h-5"/>',
    restore: '<path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"/><path d="M12 8v4l3 2"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.8a2 2 0 0 1-.45 2.11L8.11 9.89a16 16 0 0 0 6 6l1.26-1.26a2 2 0 0 1 2.11-.45c.9.35 1.84.59 2.8.72A2 2 0 0 1 22 16.9Z"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ""}</svg>`;
};

const state = { view: "dashboard", settings: null, accounts: [], currentUser: null, products: [], productSuppliers: {}, sales: [], suppliers: [], supplierPayments: [], customers: [], customerPayments: [], purchases: [], expenses: [], stockMovements: [], cashMovements: [], cashbox: null, dashboard: null, analytics: null, cart: [], productQuery: "", saleQuery: "", invoiceQuery: "", supplierQuery: "", customerQuery: "", paymentQuery: "", paymentFrom: "", paymentTo: "", supplierPaymentQuery: "", supplierPaymentFrom: "", supplierPaymentFrom: "", supplierPaymentTo: "", cashFrom: "", cashTo: "", debtQuery: "", debtSort: "highest", expenseQuery: "", expenseFrom: "", expenseTo: "", reportFrom: "", reportTo: "", scanner: null, cloud: { user: null, backups: [], loading: false, busy: "", error: "" } };
const businessProfile = () => BUSINESS_PROFILES[state.settings?.businessType] || BUSINESS_PROFILES["متجر عام"];
const isPharmacy = () => state.settings?.businessType === "صيدلية";
const profileOptions = (kind, current = "") => [...new Set([...(businessProfile()[kind] || []), current].filter(Boolean))];
let root;
let exitGuardInstalled = false;
let exitAllowed = false;
const roleLabel = (role) => ACCOUNT_ROLES.find((item) => item.id === role)?.label || "كاشير";
const adminOnlyMessage = () => showToast("هذه العملية متاحة لحساب الأدمن فقط.", "error");

const money = (value) => {
  const currency = CURRENCIES.find((item) => item.code === (state.settings?.currency || DEFAULT_CURRENCY_CODE)) || CURRENCIES[0];
  const formatted = new Intl.NumberFormat("ar", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(roundMoney(value));
  return `${formatted} ${currency.symbol}`;
};
const signedMoney = (value) => `<strong class="${toNumber(value) < 0 ? "is-negative" : ""}">${money(value)}</strong>`;
const amount = (value) => new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 }).format(toNumber(value));
const amountLatin = (value) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, useGrouping: false }).format(toNumber(value));
const dateTime = (value) => new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[character]);
const phoneHref = (phone) => {
  const raw = String(phone || "").trim();
  const digits = raw.replace(/\D/g, "");
  return digits ? `tel:${raw.startsWith("+") ? "+" : ""}${digits}` : "";
};
const phoneCallButton = (phone, name) => {
  const href = phoneHref(phone);
  return href ? `<a class="icon-button icon-button--call" href="${href}" aria-label="اتصال بـ ${escapeHtml(name)}" title="اتصال">${icon("phone", 18)}</a>` : "";
};
const canPickContacts = () => typeof navigator !== "undefined" && typeof navigator.contacts?.select === "function";
const phoneFieldMarkup = (inputId, value = "") => `<label>رقم الهاتف<div class="phone-field__control"><input id="${inputId}" name="phone" type="tel" inputmode="tel" dir="ltr" value="${escapeHtml(value)}" />${canPickContacts() ? `<button id="${inputId}-contact-picker" class="button button--secondary phone-field__picker" type="button">${icon("users", 17)}<span>جهات الاتصال</span></button>` : ""}</div><small class="phone-field__hint">${canPickContacts() ? "اختر رقمًا من جهات اتصال الجهاز أو أدخله يدويًا." : "أدخل الرقم يدويًا؛ اختيار جهات الاتصال غير مدعوم في هذا الجهاز."}</small></label>`;
async function pickContactPhone(phoneInput, nameInput) {
  if (!canPickContacts()) { showToast("اختيار جهات الاتصال غير مدعوم في هذا الجهاز. أدخل الرقم يدويًا.", "error"); phoneInput.focus(); return; }
  try {
    const [contact] = await navigator.contacts.select(["name", "tel"], { multiple: false });
    const phone = contact?.tel?.find(Boolean);
    if (!phone) { showToast("جهة الاتصال المختارة لا تحتوي على رقم هاتف.", "error"); return; }
    phoneInput.value = phone;
    phoneInput.dispatchEvent(new Event("input", { bubbles: true }));
    if (!nameInput.value.trim() && contact?.name?.[0]) nameInput.value = contact.name[0];
    showToast("تم إدخال رقم جهة الاتصال.");
  } catch (error) {
    if (error?.name !== "AbortError") showToast("تعذر فتح جهات الاتصال. يمكنك إدخال الرقم يدويًا.", "error");
  }
}
function bindContactPicker(overlay, phoneInputId, nameInputName = "name") {
  const picker = overlay.querySelector(`#${phoneInputId}-contact-picker`);
  if (!picker) return;
  const phoneInput = overlay.querySelector(`#${phoneInputId}`);
  const nameInput = overlay.querySelector(`[name=${nameInputName}]`);
  picker.addEventListener("click", () => void pickContactPhone(phoneInput, nameInput));
}
const paymentChannelLabel = (invoice) => invoice?.paymentType === "آجل" ? "دين" : invoice?.paymentMethod === "تحويل" ? "تحويل" : "كاش";
const assetBaseUrl = "https://hesabipwa-2r9mmdzn.manus.space/manus-storage";
const emptyImage = `${assetBaseUrl}/hesabi-empty-inventory_96623fe2.png`;
const markImage = `${assetBaseUrl}/hesabi-mark_5cb0429a.png`;

function showToast(message, type = "success") {
  const host = document.querySelector("#toast-host") || document.body.appendChild(Object.assign(document.createElement("div"), { id: "toast-host", className: "toast-host" }));
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<span class="toast__icon">${icon(type === "success" ? "check" : "alert", 18)}</span><span>${escapeHtml(message)}</span>`;
  host.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("toast--visible"));
  window.setTimeout(() => { toast.classList.remove("toast--visible"); window.setTimeout(() => toast.remove(), 200); }, 3300);
}

function installExitGuard() {
  if (exitGuardInstalled) return;
  exitGuardInstalled = true;
  const guardState = () => ({ ...(history.state || {}), hesabiExitGuard: true });
  primeExitGuardHistory(history, window.location.href);
  window.addEventListener("popstate", () => {
    const action = getExitGuardAction({ exitAllowed, hasOpenOverlay: Boolean(document.querySelector("#scanner-backdrop") || document.querySelector("#dialog-backdrop")) });
    if (action === "allow-exit") return;
    if (action === "close-overlay") {
      closeDialog();
      history.pushState(guardState(), "", window.location.href);
      showToast("أُغلقت النافذة. اضغط رجوع مرة أخرى لعرض تأكيد الخروج.", "error");
      return;
    }
    history.pushState(guardState(), "", window.location.href);
    openExitConfirmDialog();
  });
}

function openExitConfirmDialog() {
  if (document.querySelector("#exit-confirm-dialog")) return;
  const overlay = openDialog(`<div id="exit-confirm-dialog" class="confirm-dialog"><div class="dialog__head"><div><span class="eyebrow">تأكيد الخروج</span><h2>هل تريد الخروج من حسابي؟</h2><p class="dialog__subtext">ستبقى بيانات المتجر محفوظة على هذا الجهاز.</p></div><button class="icon-button" data-dialog-close aria-label="إلغاء">${icon("close", 20)}</button></div><div class="dialog__actions"><button class="button button--secondary" type="button" data-dialog-close>البقاء في التطبيق</button><button id="confirm-app-exit" class="button button--danger" type="button">نعم، خروج</button></div></div>`);
  overlay.querySelector("#confirm-app-exit").addEventListener("click", () => {
    exitAllowed = true;
    closeDialog();
    leaveAfterExitConfirmation(
      (steps) => history.go(steps),
    );
  });
}

async function completeLocalLogout() {
  await db.clearPersistentSession();
  state.currentUser = null;
  state.cart = [];
  state.view = "sales";
  closeDialog();
  render();
  showToast("تم تسجيل الخروج.");
}

async function switchLocalUser() {
  await db.clearPersistentSession();
  state.currentUser = null;
  state.cart = [];
  state.view = "sales";
  closeDialog();
  render();
  showToast("اختر المستخدم التالي لتسجيل الدخول.");
}

function openLogoutConfirmDialog() {
  const overlay = openDialog(`<div class="confirm-dialog"><div class="dialog__head"><div><span class="eyebrow">تأكيد تسجيل الخروج</span><h2>هل تريد تسجيل الخروج؟</h2><p class="dialog__subtext">لن تُحذف البيانات. ستحتاج فقط إلى إدخال رمز الدخول للمتابعة.</p></div><button class="icon-button" data-dialog-close aria-label="إلغاء">${icon("close", 20)}</button></div><div class="dialog__actions"><button class="button button--secondary" type="button" data-dialog-close>إلغاء</button><button id="confirm-local-logout" class="button button--danger" type="button">نعم، تسجيل الخروج</button></div></div>`);
  overlay.querySelector("#confirm-local-logout").addEventListener("click", () => void completeLocalLogout());
}

function openAccountSessionDialog() {
  const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">الحساب الحالي</span><h2>${escapeHtml(state.currentUser?.name || "حسابي")}</h2><p class="dialog__subtext">يمكنك الانتقال إلى مستخدم آخر أو تسجيل الخروج من هذا الجهاز. تبقى بيانات المتجر محفوظة محليًا.</p></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><div class="dialog__actions"><button id="switch-local-user" class="button button--secondary" type="button">${icon("users", 17)} تبديل المستخدم</button><button id="open-local-logout-confirm" class="button button--danger" type="button">تسجيل الخروج</button></div>`);
  overlay.querySelector("#switch-local-user").addEventListener("click", () => void switchLocalUser());
  overlay.querySelector("#open-local-logout-confirm").addEventListener("click", openLogoutConfirmDialog);
}

function formatStatus(product) {
  const status = stockStatus(product.quantity, product.minimumStock);
  return `<span class="status status--${status === "متوفر" ? "available" : status === "منخفض" ? "low" : "empty"}">${status}</span>`;
}

async function refresh() {
  [state.products, state.productSuppliers, state.sales, state.suppliers, state.supplierPayments, state.customers, state.customerPayments, state.purchases, state.expenses, state.stockMovements, state.cashMovements, state.cashbox, state.dashboard] = await Promise.all([db.listProducts(), db.listProductSupplierLinks(), db.listSales(), db.listSuppliers(), db.listSupplierPayments(), db.listCustomers(), db.listCustomerPayments(), db.listPurchases(), db.listExpenses(), db.listStockMovements(), db.listCashMovements({ from: state.cashFrom, to: state.cashTo }), db.getCashbox({ from: state.cashFrom, to: state.cashTo }), db.getDashboard()]);
  state.analytics = await db.getAnalytics({ from: state.reportFrom, to: state.reportTo });
  state.todayTransfers = calculateTransferCollections({ sales: state.sales.filter((sale) => dateKey(sale.date) === dateKey()), customerPayments: state.customerPayments.filter((payment) => dateKey(payment.date) === dateKey()) });
}

function navMarkup() {
  const items = NAV_ITEMS.filter((item) => canAccessView(state.currentUser, item.id)).map((item) => `<button class="nav-item ${state.view === item.id ? "is-active" : ""}" data-action="navigate" data-view="${item.id}">${icon(item.icon)}<span>${item.label}</span></button>`).join("");
  return `<aside class="sidebar">
    <div class="brand"><img src="${markImage}" alt="" /><div><strong>حسابي</strong><small>${escapeHtml(state.settings?.storeName || "متجرك")}</small></div></div>
    <div class="sidebar__label">تشغيل المتجر</div><nav>${items}</nav>
    <div class="sidebar__account"><span class="account-badge account-badge--${state.currentUser?.role || "cashier"}">${roleLabel(state.currentUser?.role)}</span><strong>${escapeHtml(state.currentUser?.name || "")}</strong><button class="text-button" data-action="account-session">تبديل المستخدمين</button></div>
    <div class="sidebar__footer"><span class="presence-dot"></span><span>البيانات محفوظة محليًا</span></div>
  </aside>
  <nav class="bottom-nav" aria-label="التنقل الرئيسي">${items}</nav>`;
}

function applyTheme() { document.documentElement.dataset.theme = state.settings?.theme === "dark" ? "dark" : "light"; }
function themeToggleMarkup() { const dark = state.settings?.theme === "dark"; return `<button class="icon-button theme-toggle" data-action="toggle-theme" aria-label="${dark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}" title="${dark ? "الوضع الفاتح" : "الوضع الداكن"}">${icon(dark ? "sun" : "moon", 19)}</button>`; }
function salesScannerFabMarkup() { return `<button class="sales-scanner-fab" data-action="open-sales-scanner" data-mode="sale" aria-label="فتح المبيعات ومسح الباركود" title="بيع ومسح باركود">${icon("cart", 22)}<span>بيع</span></button>`; }

function topbarMarkup(title, description, action = "", modifierClass = "") {
  return `<header class="topbar${modifierClass ? ` ${modifierClass}` : ""}"><div><p class="eyebrow">${escapeHtml(state.settings?.businessType || "إدارة المتجر")}</p><h1>${title}</h1>${description ? `<p class="topbar__description">${description}</p>` : ""}</div><div class="topbar__actions"><span class="account-badge account-badge--${state.currentUser?.role || "cashier"}">${roleLabel(state.currentUser?.role)}</span>${action}${themeToggleMarkup()}<button class="icon-button" data-action="account-session" aria-label="تبديل المستخدمين أو تسجيل الخروج" title="تبديل المستخدمين أو تسجيل الخروج">${icon("users", 18)}</button></div></header>`;
}

function dashboardMarkup() {
  const dashboard = state.dashboard;
  const transfers = state.todayTransfers || { total: 0, count: 0 };
  const low = dashboard.lowStock.slice(0, 5);
  const todayAtMidnight = new Date(`${dateKey()}T00:00:00`).getTime();
  const expiring = isPharmacy() ? (state.dashboard?.expiringBatches || []).sort((a, b) => String(a.expiryDate).localeCompare(String(b.expiryDate))).slice(0, 5) : [];
  return `${topbarMarkup("نظرة على يومك", "تابع المبيعات والمخزون من سجل واحد واضح.", `<button class="button button--primary" data-action="navigate" data-view="sales">${icon("cart", 18)}<span>بيع جديد</span></button>`)}
  <section class="daily-ribbon"><div><span class="presence-dot"></span><strong>اليوم التشغيلي</strong><small>كل عملية تحفظ على هذا الجهاز تلقائيًا</small></div><div class="daily-ribbon__date">${new Intl.DateTimeFormat("ar-SA", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</div></section>
  <section class="metric-grid">
    ${metricCard("مبيعات اليوم", money(dashboard.todaySales), "trend", "قيمة الفواتير المكتملة", dashboard.todaySales)}
    ${metricCard("مشتريات اليوم", money(dashboard.todayPurchases), "truck", "توريد محفوظ", dashboard.todayPurchases)}
    ${metricCard("مصروفات اليوم", money(dashboard.todayExpenses), "wallet", "تؤثر على صافي الربح", dashboard.todayExpenses)}
    ${metricCard("أرباح اليوم", money(dashboard.todayProfit), "chart", "صافي بعد التكلفة والمصروفات", dashboard.todayProfit)}
    ${metricCard("المنتجات", amountLatin(dashboard.productCount), "package", "منتجات فعّالة")}
    ${metricCard("قيمة المخزون", money(dashboard.inventoryValue), "layers", "وفق سعر الشراء")}
    ${metricCard("فواتير اليوم", amountLatin(dashboard.todayInvoiceCount), "receipt", "عملية بيع محفوظة")}
    ${metricCard("ديون العملاء", money(dashboard.customerDebt), "users", "رصيد مستحق")}
    ${metricCard("تحويلات اليوم", money(transfers.total), "transfer", transfers.count ? `${amount(transfers.count)} تحصيل بتحويل` : "لا توجد تحويلات اليوم", transfers.total)}
    ${metricCard("دفعات اليوم", money(dashboard.todayCustomerPayments), "wallet", "تسديد ديون سابقة")}
    ${metricCard("مستحقات الموردين", money(dashboard.supplierDebt), "truck", "شراء آجل غير مسدد")}
    ${metricCard("الداخل للصندوق", money(dashboard.todayCashIn), "wallet", "نقد وارد اليوم فقط", dashboard.todayCashIn)}
  </section>
  <section class="dashboard-split">
    ${isPharmacy() ? `<article class="panel panel--low-stock"><div class="panel__head"><div><span class="eyebrow">تنبيه صيدلي</span><h2>صلاحيات تحتاج متابعة</h2></div><button class="text-button" data-action="navigate" data-view="inventory">عرض المخزون ${icon("arrow", 16)}</button></div>${expiring.length ? `<div class="warning-list">${expiring.map((batch) => { const days = Math.ceil((new Date(`${batch.expiryDate}T00:00:00`).getTime() - todayAtMidnight) / 86400000); return `<button class="warning-row" data-action="open-product" data-id="${batch.productId}"><div class="warning-row__icon">${icon("alert", 18)}</div><div><strong>${escapeHtml(batch.product.name)}</strong><small>تشغيلة ${escapeHtml(batch.batchNumber || "—")} · المتبقي ${amount(batch.remainingQuantity)} ${escapeHtml(batch.product.unit)} · تنتهي ${batch.expiryDate}</small></div><strong class="${days <= 30 ? "is-negative" : ""}">${days < 0 ? "منتهٍ" : `بعد ${amount(days)} يوم`}</strong></button>`; }).join("")}</div>` : `<p class="panel__empty">لا توجد تشغيلات تنتهي خلال 90 يومًا.</p>`}</article>` : ""}
    <article class="panel panel--low-stock"><div class="panel__head"><div><span class="eyebrow">تنبيه تشغيلي</span><h2>مخزون يحتاج انتباهك</h2></div><button class="text-button" data-action="navigate" data-view="inventory">عرض المخزون ${icon("arrow", 16)}</button></div>
    ${low.length ? `<div class="warning-list">${low.map((product) => `<button class="warning-row" data-action="open-product" data-id="${product.id}"><div class="warning-row__icon">${icon("package", 18)}</div><div><strong>${escapeHtml(product.name)}</strong><small>${amount(product.quantity)} ${escapeHtml(product.unit)} متبقية</small></div>${formatStatus(product)}</button>`).join("")}</div>` : emptyState("لا توجد تنبيهات مخزون", "كل المنتجات أعلى من الحد الأدنى المحدد.", "inventory")}</article>
    <article class="panel action-panel"><span class="eyebrow">اختصار سريع</span><h2>ابدأ من حيث تكون الحركة</h2><p>أضف منتجًا، عميلًا، توريدًا أو عملية بيع. كل خطوة ترتبط بالسجل المحلي.</p><div class="quick-actions"><button data-action="new-product">${icon("plus", 18)}إضافة منتج</button><button data-action="new-customer">${icon("users", 18)}إضافة عميل</button><button data-action="new-supplier">${icon("truck", 18)}إضافة مورد</button><button data-action="new-purchase">${icon("truck", 18)}فاتورة شراء</button><button data-action="open-reorder-list">${icon("truck", 18)}إعادة الطلب</button><button data-action="navigate" data-view="sales">${icon("cart", 18)}فتح المبيعات</button></div></article>
    <article class="panel debtor-panel"><div class="panel__head"><div><span class="eyebrow">متابعة التحصيل</span><h2>أعلى العملاء مديونية</h2></div><button class="text-button" data-action="navigate" data-view="customers">عرض العملاء ${icon("arrow", 16)}</button></div>${dashboard.debtors?.length ? `<div class="debtor-list">${dashboard.debtors.map((customer) => `<button class="debtor-row" data-action="open-customer" data-id="${customer.id}"><span>${escapeHtml(customer.name)}</span><strong>${money(customer.balance)}</strong></button>`).join("")}</div>` : `<p class="panel__empty">لا توجد ديون عملاء مستحقة.</p>`}</article>
    <article class="panel debtor-panel"><div class="panel__head"><div><span class="eyebrow">التزامات التوريد</span><h2>أعلى مستحقات الموردين</h2></div><button class="text-button" data-action="navigate" data-view="suppliers">عرض الموردين ${icon("arrow", 16)}</button></div>${dashboard.creditors?.length ? `<div class="debtor-list">${dashboard.creditors.map((supplier) => `<button class="debtor-row" data-action="open-supplier-account" data-id="${supplier.id}"><span>${escapeHtml(supplier.name)}</span><strong>${money(supplier.balance)}</strong></button>`).join("")}</div>` : `<p class="panel__empty">لا توجد مستحقات موردين حالية.</p>`}</article>
  </section>`;
}

function metricCard(label, value, iconName, helper, rawValue = 0) {
  return `<article class="metric-card ${toNumber(rawValue) < 0 ? "is-negative" : ""}"><div class="metric-card__icon">${icon(iconName, 19)}</div><div><small>${label}</small><strong>${value}</strong><span>${helper}</span></div></article>`;
}
function packageFieldLabels(packageUnit, stockUnit = "حبة") { const labels = { "حبة": "الحبات", "علبة": "العلب", "كرتون": "الكراتين", "كيس": "الأكياس", "حزمة": "الحزم", "ربطة": "الربطات", "صندوق": "الصناديق", "شريط": "الشرائط", "عبوة": "العبوات", "دزينة": "الدزينات", "قطعة": "القطع", "طقم": "الأطقم", "جهاز": "الأجهزة" }; const label = labels[packageUnit] || "العبوات"; return { quantity: `عدد ${label}`, units: `${stockUnit}/${packageUnit}`, cost: `سعر ${packageUnit}` }; }

function quantityControlMarkup({ value = 1, min = 1, max = "", step = "1", inputAttrs = "" } = {}) {
  return `<div class="quantity-control"><button type="button" class="quantity-control__button" data-quantity-step="-1" aria-label="إنقاص الكمية">${icon("minus", 16)}</button><input type="number" inputmode="decimal" min="${min}" ${max !== "" ? `max="${max}"` : ""} step="${step}" value="${value}" ${inputAttrs} /><button type="button" class="quantity-control__button" data-quantity-step="1" aria-label="زيادة الكمية">${icon("plus", 16)}</button></div>`;
}

function bindQuantityControl(host, { min = 1, max = Infinity, step = 1, onChange } = {}) {
  const input = host.querySelector("input[type=number]");
  const commit = (next) => {
    const bounded = Math.min(max, Math.max(min, toNumber(next)));
    input.value = bounded;
    onChange(bounded);
  };
  host.querySelectorAll("[data-quantity-step]").forEach((button) => button.addEventListener("click", () => commit(toNumber(input.value) + toNumber(button.dataset.quantityStep) * step)));
  input.addEventListener("change", () => commit(input.value));
  input.addEventListener("blur", () => commit(input.value));
}

function emptyState(title, text, destination = "new-product") {
  const action = destination === "new-product" ? `data-action="new-product"` : `data-action="navigate" data-view="${destination}"`;
  const label = destination === "new-product" ? "إضافة منتج" : "ابدأ الآن";
  return `<div class="empty-state"><img src="${emptyImage}" alt="" /><div><h3>${title}</h3><p>${text}</p><button class="button button--secondary" ${action}>${icon("plus", 16)} ${label}</button></div></div>`;
}

function productsMarkup() {
  const query = state.productQuery.trim().toLocaleLowerCase("ar");
  const products = state.products.filter((product) => !query || [product.name, product.barcode, product.internalCode].some((value) => value?.toLocaleLowerCase("ar").includes(query)));
  return `${topbarMarkup("المنتجات", "ابحث بالاسم أو الباركود أو الكود الداخلي.", `<button class="button button--primary" data-action="new-product">${icon("plus", 18)}<span>إضافة منتج</span></button>`)}
  <section class="toolbar"><label class="search-field">${icon("search", 19)}<input id="product-search" dir="rtl" lang="ar" autocomplete="off" placeholder="ابحث عن منتج..." value="${escapeHtml(state.productQuery)}" /></label><button class="button button--secondary button--icon-text" data-action="open-scanner" data-mode="product">${icon("scan", 18)}<span>مسح باركود</span></button></section>
  <section class="panel product-table-panel">${products.length ? `<div class="table-wrap"><table><thead><tr><th>المنتج</th><th>السعر</th><th>المخزون</th><th>الحالة</th><th><span class="sr-only">إجراءات</span></th></tr></thead><tbody>${products.map(productRow).join("")}</tbody></table></div><div class="mobile-product-list">${products.map(productCard).join("")}</div>` : emptyState(query ? "لا توجد نتائج مطابقة" : "لم تضف منتجات بعد", query ? "جرّب اسمًا أو رمزًا آخر." : "أضف أول منتج ليظهر في قائمة التشغيل.")}</section>`;
}

function productRow(product) {
  return `<tr><td><button class="product-name" data-action="open-product" data-id="${product.id}"><strong dir="rtl">${escapeHtml(product.name)}</strong><small dir="auto">${product.barcode ? `باركود: ${escapeHtml(product.barcode)}` : product.internalCode ? `كود: ${escapeHtml(product.internalCode)}` : "دون رمز"}</small></button></td><td>${money(product.salePrice)}</td><td>${amount(product.quantity)} ${escapeHtml(product.unit)}</td><td>${formatStatus(product)}</td><td><div class="product-row-actions">${productSupplierActions(product)}<button class="icon-button" aria-label="خيارات ${escapeHtml(product.name)}" data-action="open-product" data-id="${product.id}">${icon("dots", 20)}</button></div></td></tr>`;
}

function productCard(product) {
  return `<article class="product-card"><button class="product-card__main" data-action="open-product" data-id="${product.id}"><div><strong dir="rtl">${escapeHtml(product.name)}</strong><small dir="auto">${product.internalCode || product.barcode || "دون رمز"}</small></div>${formatStatus(product)}</button><div class="product-card__meta"><span>${money(product.salePrice)}</span><span>${amount(product.quantity)} ${escapeHtml(product.unit)}</span>${productSupplierActions(product)}</div></article>`;
}

function productSupplierActions(product) {
  const supplier = state.productSuppliers?.[product.id];
  if (!supplier) return "";
  return `<div class="product-supplier-actions"><button class="icon-button icon-button--supplier" data-action="open-supplier-account" data-id="${supplier.id}" aria-label="حساب المورد ${escapeHtml(supplier.name)}" title="حساب المورد: ${escapeHtml(supplier.name)}">${icon("truck", 18)}</button>${phoneCallButton(supplier.phone, supplier.name)}</div>`;
}

function openReorderDialog() {
  const lowProducts = state.products.filter((product) => toNumber(product.quantity) <= toNumber(product.minimumStock));
  const groups = lowProducts.reduce((map, product) => {
    const supplier = state.productSuppliers?.[product.id] || null;
    const key = supplier?.id || "unassigned";
    const group = map.get(key) || { supplier, products: [] };
    group.products.push(product); map.set(key, group); return map;
  }, new Map());
  const groupText = (group) => [`قائمة إعادة طلب من ${group.supplier?.name || "مورد غير محدد"}`, ...group.products.map((product) => `- ${product.name}: المتاح ${amount(product.quantity)} ${product.unit}، الحد الأدنى ${amount(product.minimumStock)} ${product.unit}`)].join("\n");
  const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">تنبيه إعادة الطلب</span><h2>المنتجات المنخفضة أو النافدة</h2><p class="dialog__subtext">تُجمع النواقص بحسب آخر مورد ورد المنتج، لتتمكن من المراجعة والاتصال أو المشاركة سريعًا.</p></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div>${groups.size ? `<section class="account-transactions">${[...groups.entries()].map(([key, group]) => `<article class="reorder-group"><div class="reorder-group__head"><div><strong>${escapeHtml(group.supplier?.name || "منتجات بلا مورد مرتبط")}</strong><small>${group.products.length} أصناف تحتاج إعادة طلب</small></div><div class="product-supplier-actions">${group.supplier ? `<button class="icon-button icon-button--supplier" data-reorder-supplier="${group.supplier.id}" aria-label="حساب المورد">${icon("truck", 18)}</button>${phoneCallButton(group.supplier.phone, group.supplier.name)}` : ""}<button class="button button--secondary" data-share-reorder="${key}">مشاركة القائمة</button></div></div><div class="warning-list">${group.products.map((product) => `<button class="warning-row" data-reorder-product="${product.id}"><div class="warning-row__icon">${icon("package", 18)}</div><div><strong>${escapeHtml(product.name)}</strong><small>المتاح ${amount(product.quantity)} ${escapeHtml(product.unit)} · الحد ${amount(product.minimumStock)} ${escapeHtml(product.unit)}</small></div>${formatStatus(product)}</button>`).join("")}</div></article>`).join("")}</section>` : `<div class="inline-empty">لا توجد منتجات منخفضة أو نافدة حاليًا.</div>`}<div class="dialog__actions"><button class="button button--primary" data-dialog-close>إغلاق</button></div>`);
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog));
  overlay.querySelectorAll("[data-reorder-supplier]").forEach((button) => button.addEventListener("click", () => { closeDialog(); openSupplierAccountDialog(button.dataset.reorderSupplier); }));
  overlay.querySelectorAll("[data-reorder-product]").forEach((button) => button.addEventListener("click", () => { closeDialog(); openProductDialog(state.products.find((product) => product.id === button.dataset.reorderProduct)); }));
  overlay.querySelectorAll("[data-share-reorder]").forEach((button) => button.addEventListener("click", async () => { const group = groups.get(button.dataset.shareReorder); const text = groupText(group); try { if (navigator.share) await navigator.share({ title: "قائمة إعادة طلب — حسابي", text }); else { await navigator.clipboard.writeText(text); showToast("تم نسخ قائمة إعادة الطلب للمشاركة"); } } catch (error) { if (error?.name !== "AbortError") showToast("تعذرت مشاركة قائمة إعادة الطلب.", "error"); } }));
}

function inventoryMarkup() {
  const products = [...state.products].sort((a, b) => ({ "نافد": 0, "منخفض": 1, "متوفر": 2 }[stockStatus(a.quantity, a.minimumStock)] - { "نافد": 0, "منخفض": 1, "متوفر": 2 }[stockStatus(b.quantity, b.minimumStock)]));
  return `${topbarMarkup("المخزون", "عدّل الكميات من حركة موثقة، وليس من بطاقة المنتج.")}
  <section class="inventory-summary"><div><span>إجمالي قيمة المخزون</span><strong>${money(state.dashboard.inventoryValue)}</strong></div><div><span>منخفض أو نافد</span><strong>${amount(state.dashboard.lowStock.length)} منتج</strong></div></section>
  <section class="panel inventory-list">${products.length ? products.map((product) => `<article class="inventory-row"><div class="inventory-row__main"><div class="inventory-icon">${icon("package", 20)}</div><div><strong dir="rtl">${escapeHtml(product.name)}</strong><small dir="auto">${escapeHtml(product.barcode || "دون باركود")} · ${escapeHtml(product.category || product.unit)} · شراء: ${money(product.purchasePrice)} · بيع: ${money(product.salePrice)}</small><small>قيمة المخزون: ${money(product.purchasePrice * product.quantity)}</small></div></div><div class="inventory-row__stock"><div>${formatStatus(product)}<strong>${amount(product.quantity)} <small>${escapeHtml(product.unit)}</small></strong></div>${productSupplierActions(product)}<button class="button button--secondary" data-action="count-stock" data-id="${product.id}">جرد</button><button class="button button--secondary" data-action="adjust-stock" data-id="${product.id}">تعديل</button><button class="icon-button" data-action="open-stock-history" data-id="${product.id}" aria-label="سجل الحركة">${icon("history", 18)}</button></div></article>`).join("") : emptyState("المخزون بانتظار أول منتج", "أضف منتجًا مع كمية افتتاحية ليظهر هنا.")}</section><div class="dialog__actions"><button class="button button--secondary button--wide" data-action="open-stock-history">${icon("history", 17)} سجل حركة المخزون</button></div>`;
}

function salesMarkup() {
  const query = state.saleQuery.trim().toLocaleLowerCase("ar");
  const matches = state.products.filter((product) => !query || [product.name, product.barcode, product.internalCode].some((value) => value?.toLocaleLowerCase("ar").includes(query))).slice(0, 7);
  const totals = calculateSaleTotals(state.cart, 0);
  return `${topbarMarkup("بيع جديد", "أضف المنتجات إلى السلة ثم ثبّت الفاتورة في عملية واحدة.")}
  <section class="sales-layout"><div class="sales-catalog"><div class="toolbar toolbar--sales"><label class="search-field">${icon("search", 19)}<input id="sale-search" dir="rtl" lang="ar" autocomplete="off" placeholder="ابحث أو أدخل باركود..." value="${escapeHtml(state.saleQuery)}" /></label><button class="button button--secondary button--scan" data-action="open-scanner" data-mode="sale" aria-label="مسح الباركود">${icon("scan", 19)}</button></div>
  <div class="sale-matches">${state.products.length === 0 ? emptyState("أضف منتجاتك أولًا", "تحتاج المبيعات إلى منتجات محفوظة في المخزون.") : matches.length ? matches.map((product) => `<div class="sale-product-line"><button class="sale-product ${product.quantity <= 0 ? "is-disabled" : ""}" data-action="add-cart" data-id="${product.id}" ${product.quantity <= 0 ? "disabled" : ""}><div><strong class="arabic-product-name" dir="rtl" lang="ar">${escapeHtml(product.name)}</strong><small>${amount(product.quantity)} ${escapeHtml(product.unit)} متاح</small></div><span>${money(product.salePrice)}</span><i>${icon("plus", 18)}</i></button>${productSupplierActions(product)}</div>`).join("") : `<div class="no-match"><strong>لا توجد نتيجة</strong><span>تحقق من الاسم أو الباركود أو أضف منتجًا جديدًا.</span><button class="text-button" data-action="new-product">إنشاء منتج</button></div>`}</div></div>
  <aside class="cart-panel"><div class="cart-panel__head"><div><span class="eyebrow">سلة البيع</span><h2>${state.cart.length ? `${state.cart.length} أصناف` : "فارغة الآن"}</h2></div>${state.cart.length ? `<button class="text-button text-button--danger" data-action="clear-cart">إفراغ</button>` : ""}</div>
  <div class="cart-lines">${state.cart.length ? state.cart.map(cartLine).join("") : `<div class="cart-empty">${icon("cart", 30)}<p>اختر منتجًا من القائمة لتبدأ البيع.</p></div>`}</div>
  <div class="cart-total"><div><span>الإجمالي المبدئي</span><strong>${money(totals.subtotal)}</strong></div><button class="button button--primary button--wide" data-action="checkout" ${state.cart.length ? "" : "disabled"}>إتمام البيع ${icon("arrow", 18)}</button></div></aside></section>`;
}

function cartLine(line) {
  const product = state.products.find((item) => item.id === line.productId);
  return `<article class="cart-line"><div class="cart-line__detail"><strong class="arabic-product-name" dir="rtl" lang="ar">${escapeHtml(line.name)}</strong><small>${money(line.unitPrice)} × ${amount(line.quantity)}</small></div><strong>${money(line.unitPrice * line.quantity)}</strong><div class="quantity-control quantity-control--dark"><button aria-label="إنقاص" data-action="cart-decrement" data-id="${line.productId}">${icon("minus", 15)}</button><input data-cart-quantity="${line.productId}" type="number" inputmode="decimal" min="1" max="${toNumber(product?.quantity)}" step="1" value="${line.quantity}" /><button aria-label="زيادة" data-action="cart-increment" data-id="${line.productId}">${icon("plus", 15)}</button></div><button class="remove-line" aria-label="حذف من السلة" data-action="cart-remove" data-id="${line.productId}">${icon("close", 16)}</button></article>`;
}

function invoicesMarkup() {
  const query = state.invoiceQuery.trim().toLocaleUpperCase("en");
  const invoices = state.sales.filter((sale) => !query || String(sale.invoiceNumber || "").toLocaleUpperCase("en").includes(query));
  return `${topbarMarkup("الفواتير", "كل فاتورة محفوظة مع منتجاتها وحركات خصم المخزون.")}
  <section class="toolbar invoice-search-toolbar"><label class="search-field">${icon("search", 19)}<input id="invoice-search" dir="ltr" inputmode="search" autocomplete="off" placeholder="ابحث برقم الفاتورة مثل INV-000005" value="${escapeHtml(state.invoiceQuery)}" /></label></section>
  <section class="panel invoice-list">${state.sales.length ? invoices.length ? invoices.map((sale) => `<button class="invoice-row" data-action="open-invoice" data-id="${sale.id}"><div class="invoice-row__mark">${icon("receipt", 20)}</div><div class="invoice-row__main"><strong>${sale.invoiceNumber}</strong><small>${dateTime(sale.date)} · ${paymentChannelLabel(sale)} · ${escapeHtml(sale.paymentStatus || "مدفوعة")}${sale.customerName ? ` · ${escapeHtml(sale.customerName)}` : ""}</small></div><strong>${money(sale.total)}</strong>${icon("arrow", 18)}</button>`).join("") : `<div class="inline-empty">لا توجد فاتورة مطابقة للرقم «${escapeHtml(state.invoiceQuery)}».</div>` : emptyState("لا توجد فواتير حتى الآن", "أتم أول عملية بيع لتظهر تفاصيلها هنا.", "sales")}</section>`;
}

function suppliersMarkup() {
  const query = state.supplierQuery.trim().toLocaleLowerCase("ar");
  const suppliers = state.suppliers.filter((supplier) => !query || [supplier.name, supplier.phone, supplier.address].some((value) => value?.toLocaleLowerCase("ar").includes(query)));
  const totalDue = suppliers.reduce((sum, supplier) => sum + toNumber(supplier.balance), 0);
  return `${topbarMarkup("الموردون", "تابع الأرصدة والشراء الآجل ودفعات الموردين في حساب واحد.", `<button class="button button--primary" data-action="new-supplier">${icon("plus", 18)}<span>إضافة مورد</span></button>`)}
  <section class="toolbar"><label class="search-field">${icon("search", 19)}<input id="supplier-search" dir="rtl" lang="ar" autocomplete="off" placeholder="ابحث باسم المورد أو رقم الهاتف..." value="${escapeHtml(state.supplierQuery)}" /></label></section>
  <section class="inventory-summary"><div><span>مستحقات الموردين</span><strong>${money(totalDue)}</strong></div><div><span>الموردون النشطون</span><strong>${amount(suppliers.length)} مورد</strong></div></section>
  <section class="panel entity-list">${suppliers.length ? suppliers.map((supplier) => `<article class="entity-row"><button class="entity-row__icon" data-action="open-supplier-account" data-id="${supplier.id}" aria-label="حساب ${escapeHtml(supplier.name)}">${icon("users", 20)}</button><button class="entity-row__main entity-row__main--button" data-action="open-supplier-account" data-id="${supplier.id}"><strong>${escapeHtml(supplier.name)}</strong><small>${escapeHtml(supplier.phone || supplier.address || "لا توجد بيانات اتصال")}</small></button><strong class="entity-row__amount">${money(supplier.balance)}</strong><div class="entity-row__actions">${phoneCallButton(supplier.phone, supplier.name)}<button class="icon-button" aria-label="تعديل ${escapeHtml(supplier.name)}" data-action="open-supplier" data-id="${supplier.id}">${icon("edit", 18)}</button><button class="icon-button icon-button--danger" aria-label="حذف ${escapeHtml(supplier.name)}" data-action="delete-supplier" data-id="${supplier.id}">${icon("trash", 18)}</button></div></article>`).join("") : emptyState(query ? "لا توجد نتائج مطابقة" : "لم تضف موردين بعد", query ? "جرّب اسمًا أو رقمًا آخر." : "أضف أول مورد لتبدأ تسجيل فواتير الشراء.", "new-supplier")}</section>`;
}

function supplierPaymentsMarkup() {
  const query = state.supplierPaymentQuery.trim().toLocaleLowerCase("ar");
  const payments = state.supplierPayments.filter((payment) => (!query || [payment.supplierName, payment.notes].some((value) => value?.toLocaleLowerCase("ar").includes(query))) && (!state.supplierPaymentFrom || dateKey(payment.date) >= state.supplierPaymentFrom) && (!state.supplierPaymentTo || dateKey(payment.date) <= state.supplierPaymentTo));
  const total = payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
  const payableSuppliers = state.suppliers.filter((supplier) => toNumber(supplier.balance) > 0);
  const outstandingTotal = payableSuppliers.reduce((sum, supplier) => sum + toNumber(supplier.balance), 0);
  const paymentAction = `<button class="button button--primary" data-action="new-supplier-payment" ${payableSuppliers.length ? "" : "disabled"}>${icon("wallet", 17)}<span>تسجيل دفعة</span></button>`;
  const emptyAction = payableSuppliers.length ? "new-supplier-payment" : "suppliers";
  const emptyMessage = payableSuppliers.length ? "اختر المورد ثم سجّل الدفعة، وستُسوّى فواتيره الآجلة ويُحدّث الصندوق أو التحويل تلقائيًا." : "لا يوجد مورد لديه مستحق مفتوح حاليًا.";
  return `${topbarMarkup("دفعات الموردين", "اختر المورد وسجّل تسديد مستحقاته؛ الدفعة لا تُعد شراءً جديدًا.", paymentAction)}
  <section class="toolbar toolbar--filter"><label class="search-field">${icon("search", 19)}<input id="supplier-payment-search" autocomplete="off" placeholder="ابحث عن مورد أو ملاحظة..." value="${escapeHtml(state.supplierPaymentQuery)}" /></label><form id="supplier-payment-filter" class="date-filter"><input name="from" type="date" value="${state.supplierPaymentFrom}" /><input name="to" type="date" value="${state.supplierPaymentTo}" /></form></section>
  <section class="inventory-summary"><div><span>إجمالي الدفعات</span><strong>${money(total)}</strong></div><div><span>مستحقات مفتوحة</span><strong>${money(outstandingTotal)}</strong></div><div><span>الموردون المستحقون</span><strong>${amount(payableSuppliers.length)} مورد</strong></div></section>
  <section class="panel entity-list">${payments.length ? payments.map((payment) => `<article class="entity-row"><div class="entity-row__icon entity-row__icon--expense">${icon("wallet", 20)}</div><button class="entity-row__main entity-row__main--button" data-action="open-supplier-account" data-id="${payment.supplierId}"><strong>${escapeHtml(payment.supplierName)}</strong><small>${payment.date} · ${escapeHtml(payment.notes || "تسديد مستحق")}</small></button><strong class="entity-row__amount">${money(payment.amount)}</strong></article>`).join("") : emptyState("لا توجد دفعات ضمن الفترة", emptyMessage, emptyAction)}</section>`;
}

function customersMarkup() {
  const query = state.customerQuery.trim().toLocaleLowerCase("ar");
  const customers = state.customers.filter((customer) => !query || [customer.name, customer.phone, customer.address].some((value) => value?.toLocaleLowerCase("ar").includes(query)));
  const totalDebt = customers.reduce((sum, customer) => sum + toNumber(customer.balance), 0);
  return `${topbarMarkup("العملاء", "تابع الأرصدة والبيع الآجل والدفعات في حساب واحد.", `<button class="button button--primary" data-action="new-customer">${icon("plus", 18)}<span>إضافة عميل</span></button>`)}
  <section class="toolbar"><label class="search-field">${icon("search", 19)}<input id="customer-search" dir="rtl" lang="ar" autocomplete="off" placeholder="ابحث باسم العميل أو رقم الهاتف..." value="${escapeHtml(state.customerQuery)}" /></label></section>
  <section class="inventory-summary"><div><span>إجمالي الديون</span><strong>${money(totalDebt)}</strong></div><div><span>العملاء النشطون</span><strong>${amount(customers.length)} عميل</strong></div></section>
  <section class="panel entity-list">${customers.length ? customers.map((customer) => `<article class="entity-row"><button class="entity-row__icon" data-action="open-customer" data-id="${customer.id}" aria-label="حساب ${escapeHtml(customer.name)}">${icon("users", 20)}</button><button class="entity-row__main entity-row__main--button" data-action="open-customer" data-id="${customer.id}"><strong>${escapeHtml(customer.name)}</strong><small>${escapeHtml(customer.phone || customer.address || "لا توجد بيانات اتصال")}</small></button><strong class="entity-row__amount">${money(customer.balance)}</strong><div class="entity-row__actions">${phoneCallButton(customer.phone, customer.name)}<button class="icon-button" aria-label="تعديل ${escapeHtml(customer.name)}" data-action="edit-customer" data-id="${customer.id}">${icon("edit", 18)}</button><button class="icon-button icon-button--danger" aria-label="حذف ${escapeHtml(customer.name)}" data-action="delete-customer" data-id="${customer.id}">${icon("trash", 18)}</button></div></article>`).join("") : emptyState(query ? "لا توجد نتائج مطابقة" : "لم تضف عملاء بعد", query ? "جرّب اسمًا أو رقمًا آخر." : "أضف أول عميل لتبدأ البيع الآجل وتسجيل الدفعات.", "new-customer")}</section>`;
}

function customerPaymentsMarkup() {
  const query = state.paymentQuery.trim().toLocaleLowerCase("ar");
  const payments = state.customerPayments.filter((payment) => (!query || [payment.customerName, payment.notes].some((value) => value?.toLocaleLowerCase("ar").includes(query))) && (!state.paymentFrom || dateKey(payment.date) >= state.paymentFrom) && (!state.paymentTo || dateKey(payment.date) <= state.paymentTo));
  const total = payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
  return `${topbarMarkup("دفعات العملاء", "دفعات تسدد دينًا سابقًا ولا تُعد مبيعات جديدة.")}
  <section class="toolbar toolbar--filter"><label class="search-field">${icon("search", 19)}<input id="payment-search" dir="rtl" lang="ar" autocomplete="off" placeholder="ابحث عن عميل أو ملاحظة..." value="${escapeHtml(state.paymentQuery)}" /></label><form id="payment-filter" class="date-filter"><input name="from" type="date" value="${state.paymentFrom}" /><input name="to" type="date" value="${state.paymentTo}" /></form></section>
  <section class="inventory-summary"><div><span>إجمالي الدفعات</span><strong>${money(total)}</strong></div><div><span>العمليات</span><strong>${amount(payments.length)} دفعة</strong></div></section>
  <section class="panel entity-list">${payments.length ? payments.map((payment) => `<article class="entity-row"><div class="entity-row__icon entity-row__icon--expense">${icon("wallet", 20)}</div><button class="entity-row__main entity-row__main--button" data-action="open-customer" data-id="${payment.customerId}"><strong>${escapeHtml(payment.customerName)}</strong><small>${payment.date} · ${escapeHtml(payment.notes || "تسديد رصيد")}</small></button><strong class="entity-row__amount">${money(payment.amount)}</strong></article>`).join("") : emptyState("لا توجد دفعات ضمن الفترة", "تسجل الدفعات من صفحة حساب العميل.", "customers")}</section>`;
}

function purchasesMarkup() {
  return `${topbarMarkup("المشتريات", "أنشئ فاتورة شراء لزيادة المخزون وتثبيت تكلفة المنتجات، مع إمكانية ربط المورد عند توفره.", `<button class="button button--primary" data-action="new-purchase">${icon("plus", 18)}<span>فاتورة شراء</span></button>`)}
  <section class="inventory-summary"><div><span>إجمالي المشتريات</span><strong>${money(state.analytics?.purchases.total || 0)}</strong></div><div><span>فواتير الشراء</span><strong>${amount(state.purchases.length)} فاتورة</strong></div></section>
  <section class="panel invoice-list">${state.purchases.length ? state.purchases.map((purchase) => `<button class="invoice-row" data-action="open-purchase" data-id="${purchase.id}"><div class="invoice-row__mark invoice-row__mark--purchase">${icon("truck", 20)}</div><div class="invoice-row__main"><strong>${purchase.invoiceNumber}</strong><small>${escapeHtml(purchase.supplierName)} · ${dateTime(purchase.date)}</small></div><strong>${money(purchase.total)}</strong>${icon("arrow", 18)}</button>`).join("") : emptyState("لا توجد فواتير شراء", "سجّل أول فاتورة شراء لزيادة المخزون، مع المورد أو بدونه.", "new-purchase")}</section>`;
}

function currentMonthDateRange() { const now = new Date(); const year = now.getFullYear(); const month = now.getMonth(); const pad = (value) => String(value).padStart(2, "0"); return { from: `${year}-${pad(month + 1)}-01`, to: `${year}-${pad(new Date(year, month + 1, 0).getDate())}` }; }

function expensesMarkup() {
  const defaultRange = currentMonthDateRange(); const expenseFrom = state.expenseFrom || defaultRange.from; const expenseTo = state.expenseTo || defaultRange.to;
  const matches = state.expenses.filter((expense) => (!state.expenseQuery || [expense.category, expense.description, expense.notes].some((value) => value?.toLocaleLowerCase("ar").includes(state.expenseQuery.toLocaleLowerCase("ar")))) && expense.date >= expenseFrom && expense.date <= expenseTo);
  const dailyExpenses = matches.filter((expense) => expense.periodType !== "monthly");
  const monthlyExpenses = matches.filter((expense) => expense.periodType === "monthly");
  const total = matches.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const expenseRows = (items, periodType) => items.length ? items.map((expense) => `<article class="entity-row"><div class="entity-row__icon entity-row__icon--expense">${icon(periodType === "monthly" ? "calendar" : "wallet", 20)}</div><div class="entity-row__main"><strong>${escapeHtml(expense.category)}</strong><small>${escapeHtml(expense.description || "بلا وصف")} · ${expense.date}${periodType === "monthly" ? " · يوزع على أيام الشهر" : ""}</small></div><strong class="entity-row__amount">${money(expense.amount)}</strong><div class="entity-row__actions"><button class="icon-button" aria-label="تعديل المصروف" data-action="edit-expense" data-id="${expense.id}">${icon("edit", 18)}</button><button class="icon-button icon-button--danger" aria-label="حذف المصروف" data-action="delete-expense" data-id="${expense.id}">${icon("trash", 18)}</button></div></article>`).join("") : `<div class="inline-empty">لا توجد مصروفات ${periodType === "monthly" ? "شهرية" : "يومية"} ضمن الفترة.</div>`;
  return `${topbarMarkup("المصروفات", "سجّل المصروفات لتظهر في صافي الربح والتقارير.", `<button class="button button--primary" data-action="new-expense">${icon("plus", 18)}<span>إضافة مصروف</span></button>`)}
  <section class="toolbar toolbar--filter"><label class="search-field">${icon("search", 19)}<input id="expense-search" autocomplete="off" placeholder="ابحث في المصروفات..." value="${escapeHtml(state.expenseQuery)}" /></label><form id="expense-filter" class="date-filter"><input name="from" type="date" value="${expenseFrom}" /><input name="to" type="date" value="${expenseTo}" /></form><small class="filter-note">النطاق الافتراضي: الشهر الحالي. يمكنك تحديد أي يوم أو فترة يدويًا.</small></section>
  <section class="inventory-summary"><div><span>قيمة السجلات ضمن الفترة</span><strong>${money(total)}</strong></div><div><span>مصروفات يومية</span><strong>${amount(dailyExpenses.length)} عملية</strong></div><div><span>مصروفات شهرية</span><strong>${amount(monthlyExpenses.length)} عملية</strong></div></section>
  <section class="expense-period-grid"><section class="panel entity-list"><div class="panel__head"><div><span class="eyebrow">تشغيل يومي</span><h2>مصروفات يومية</h2></div><small>مثل الأكل والشرب والمواصلات</small></div>${expenseRows(dailyExpenses, "daily")}</section><section class="panel entity-list"><div class="panel__head"><div><span class="eyebrow">التزام شهري</span><h2>مصروفات شهرية</h2></div><small>مثل الإيجار والكهرباء والماء</small></div>${expenseRows(monthlyExpenses, "monthly")}</section></section>`;
}

function reportsMarkup() {
  const data = state.analytics || { sales: {}, purchases: {}, expenses: {}, profit: {} };
  const categories = Object.entries(data.expenses.byCategory || {});
  const debtQuery = state.debtQuery.trim().toLocaleLowerCase("ar");
  const debtors = state.customers.filter((customer) => toNumber(customer.balance) > 0 && (!debtQuery || [customer.name, customer.phone].some((value) => value?.toLocaleLowerCase("ar").includes(debtQuery)))).sort((a, b) => state.debtSort === "lowest" ? toNumber(a.balance) - toNumber(b.balance) : state.debtSort === "name" ? a.name.localeCompare(b.name, "ar") : toNumber(b.balance) - toNumber(a.balance));
  const debtReport = `<section class="panel debt-report"><div class="panel__head"><div><span class="eyebrow">تقرير ديون العملاء</span><h2>الأرصدة المستحقة</h2></div><strong>${money(debtors.reduce((sum, customer) => sum + toNumber(customer.balance), 0))}</strong></div><div class="toolbar debt-report__toolbar"><label class="search-field">${icon("search", 18)}<input id="debt-search" autocomplete="off" placeholder="ابحث عن عميل..." value="${escapeHtml(state.debtQuery)}" /></label><select id="debt-sort"><option value="highest" ${state.debtSort === "highest" ? "selected" : ""}>الأعلى مديونية</option><option value="lowest" ${state.debtSort === "lowest" ? "selected" : ""}>الأقل مديونية</option><option value="name" ${state.debtSort === "name" ? "selected" : ""}>اسم العميل</option></select></div><div class="debt-report__list">${debtors.length ? debtors.map((customer) => `<button class="debtor-row" data-action="open-customer" data-id="${customer.id}"><span><strong>${escapeHtml(customer.name)}</strong><small>${escapeHtml(customer.phone || "لا يوجد هاتف")}</small></span><strong>${money(customer.balance)}</strong></button>`).join("") : `<div class="inline-empty">لا توجد ديون عملاء ضمن البحث الحالي.</div>`}</div></section>`;
  return `${topbarMarkup("التقارير", "ملخص تشغيلي للمبيعات والمشتريات والمصروفات والأرباح.", `<button class="button button--secondary" data-action="export-report">${icon("receipt", 17)} تصدير التقرير</button>`)}${debtReport}
  <section class="toolbar toolbar--filter"><form id="report-filter" class="date-filter"><label>من<input name="from" type="date" value="${state.reportFrom}" /></label><label>إلى<input name="to" type="date" value="${state.reportTo}" /></label></form></section>
  <section class="metric-grid metric-grid--reports">${metricCard("صافي المبيعات", money(data.profit.netSales || 0), "trend", "بعد مرتجعات البيع", data.profit.netSales)}${metricCard("تكلفة البضاعة", money(data.profit.netCostOfGoods || 0), "package", "تكلفة وقت البيع", data.profit.netCostOfGoods)}${metricCard("إجمالي المصروفات", money(data.expenses.total || 0), "wallet", "ضمن الفترة", data.expenses.total)}${metricCard("صافي الربح", money(data.profit.netProfit || 0), "chart", "ليس المبيعات", data.profit.netProfit)}</section>
  <section class="report-grid"><article class="panel report-card"><span class="eyebrow">تقرير المبيعات</span><h2 class="${toNumber(data.sales.total) < 0 ? "is-negative" : ""}">${money(data.sales.total || 0)}</h2><div><span>الفواتير</span><strong>${amount(data.sales.invoices || 0)}</strong></div><div><span>الخصومات</span>${signedMoney(data.sales.discounts || 0)}</div><div><span>مرتجع البيع</span>${signedMoney(data.sales.returns || 0)}</div></article><article class="panel report-card"><span class="eyebrow">تقرير المشتريات</span><h2 class="${toNumber(data.purchases.net) < 0 ? "is-negative" : ""}">${money(data.purchases.net || 0)}</h2><div><span>الفواتير</span><strong>${amount(data.purchases.invoices || 0)}</strong></div><div><span>المنتجات المشتراة</span><strong>${amount(data.purchases.products || 0)}</strong></div><div><span>مرتجع الشراء</span>${signedMoney(data.purchases.returns || 0)}</div></article><article class="panel report-card"><span class="eyebrow">المصروفات حسب النوع</span>${categories.length ? categories.map(([category, total]) => `<div><span>${escapeHtml(category)}</span>${signedMoney(total)}</div>`).join("") : `<p>لا توجد مصروفات ضمن الفترة.</p>`}</article><article class="panel report-card report-card--profit"><span class="eyebrow">معادلة الربح</span><div><span>المبيعات</span>${signedMoney(data.profit.netSales || 0)}</div><div><span>− تكلفة البضاعة</span>${signedMoney(data.profit.netCostOfGoods || 0)}</div><div><span>= الربح الإجمالي</span>${signedMoney(data.profit.grossProfit || 0)}</div><div><span>− المصروفات</span>${signedMoney(data.expenses.total || 0)}</div><div class="report-card__final"><span>= صافي الربح</span>${signedMoney(data.profit.netProfit || 0)}</div></article></section>`;
}

function cashboxMarkup() {
  const cash = state.cashbox || { openingBalance: 0, inflows: 0, outflows: 0, closingBalance: 0 };
  const movementLabel = { DEPOSIT: "إيداع في الصندوق", WITHDRAWAL: "سحب من الصندوق" };
  return `${topbarMarkup("الصندوق", "رصيد نقدي محسوب من العمليات النقدية الفعلية وحركات الصندوق اليدوية، ولا يشمل الحوالات.", `<div class="topbar__actions"><button class="button button--secondary" data-action="navigate" data-view="transfers">${icon("transfer", 17)}<span>التحويلات</span></button><button class="button button--secondary" data-action="new-cash-withdrawal">سحب</button><button class="button button--primary" data-action="new-cash-deposit">${icon("plus", 18)}<span>إيداع</span></button></div>`, "topbar--cashbox")}
  <section class="toolbar toolbar--filter"><form id="cash-filter" class="date-filter"><label>من<input name="from" type="date" value="${state.cashFrom}" /></label><label>إلى<input name="to" type="date" value="${state.cashTo}" /></label></form></section>
  <section class="metric-grid metric-grid--reports">${metricCard("رصيد الافتتاح", money(cash.openingBalance), "wallet", "قبل بداية الفترة", cash.openingBalance)}${metricCard("إجمالي الداخل", money(cash.inflows), "trend", "نقدي فقط", cash.inflows)}${metricCard("إجمالي الخارج", money(cash.outflows), "wallet", "مصروفات وسداد وسحب", cash.outflows)}${metricCard("الرصيد الحالي", money(cash.closingBalance), "chart", "بعد كل الحركات", cash.closingBalance)}</section>
  <section class="cash-transfer-note"><div>${icon("transfer", 20)}</div><div><strong>الحوالات خلال الفترة</strong><span>للمتابعة فقط ولا تدخل في رصيد الصندوق النقدي.</span></div><div><small>وارد تحويل</small><strong>${money(cash.transferIncoming)}</strong><small>صادر تحويل</small><strong>${money(cash.transferOutgoing)}</strong></div></section>
  <section class="report-grid"><article class="panel report-card"><span class="eyebrow">مصادر الداخل</span><div><span>مبيعات نقدية</span><strong>${money(cash.cashSales)}</strong></div><div><span>دفعات العملاء</span><strong>${money(cash.customerPayments)}</strong></div><div><span>إيداعات يدوية</span><strong>${money(cash.deposits)}</strong></div><div><span>مرتجعات شراء</span><strong>${money(cash.purchaseReturns)}</strong></div></article><article class="panel report-card"><span class="eyebrow">مصادر الخارج</span><div><span>مشتريات نقدية</span><strong>${money(cash.cashPurchases)}</strong></div><div><span>دفعات الموردين</span><strong>${money(cash.supplierPayments)}</strong></div><div><span>مصروفات</span><strong>${money(cash.expenses)}</strong></div><div><span>سحوبات يدوية</span><strong>${money(cash.withdrawals)}</strong></div></article><article class="panel report-card"><span class="eyebrow">حركات الصندوق اليدوية</span>${state.cashMovements.length ? state.cashMovements.map((movement) => `<div><span>${movementLabel[movement.type]}<small>${movement.date}${movement.notes ? ` · ${escapeHtml(movement.notes)}` : ""}</small></span><strong class="${movement.type === "WITHDRAWAL" ? "is-negative" : ""}">${movement.type === "WITHDRAWAL" ? "−" : "+"}${money(movement.amount)}</strong></div>`).join("") : `<p>لا توجد إيداعات أو سحوبات يدوية ضمن الفترة.</p>`}</article></section>`;
}

function transfersMarkup() {
  const inRange = (date) => (!state.cashFrom || dateKey(date) >= state.cashFrom) && (!state.cashTo || dateKey(date) <= state.cashTo);
  const incoming = [...state.sales.filter((sale) => inRange(sale.date) && sale.paymentMethod === "تحويل" && toNumber(sale.initialPaidAmount ?? sale.paidAmount) > 0).map((sale) => ({ date: sale.date, label: `فاتورة بيع ${sale.invoiceNumber}`, detail: sale.customerName || "تحصيل بيع", amount: toNumber(sale.initialPaidAmount ?? sale.paidAmount) })), ...state.customerPayments.filter((payment) => inRange(payment.date) && payment.paymentMethod === "تحويل").map((payment) => ({ date: payment.date, label: `دفعة عميل ${payment.customerName}`, detail: payment.invoiceNumber || payment.notes || "تحصيل دين", amount: toNumber(payment.amount) }))].sort((a, b) => new Date(b.date) - new Date(a.date));
  const outgoing = [...state.purchases.filter((purchase) => inRange(purchase.date) && purchase.paymentMethod === "تحويل" && toNumber(purchase.initialPaidAmount ?? purchase.paidAmount) > 0).map((purchase) => ({ date: purchase.date, label: `فاتورة شراء ${purchase.invoiceNumber}`, detail: purchase.supplierName || "توريد", amount: toNumber(purchase.initialPaidAmount ?? purchase.paidAmount) })), ...state.supplierPayments.filter((payment) => inRange(payment.date) && payment.paymentMethod === "تحويل").map((payment) => ({ date: payment.date, label: `دفعة مورد ${payment.supplierName}`, detail: payment.invoiceNumber || payment.notes || "سداد مستحق", amount: toNumber(payment.amount) }))].sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalIncoming = roundMoney(incoming.reduce((sum, item) => sum + item.amount, 0)); const totalOutgoing = roundMoney(outgoing.reduce((sum, item) => sum + item.amount, 0)); const net = roundMoney(totalIncoming - totalOutgoing);
  const transferList = (items, direction) => items.length ? items.map((item) => `<article class="entity-row"><div class="entity-row__icon ${direction === "out" ? "entity-row__icon--expense" : ""}">${icon("transfer", 20)}</div><div class="entity-row__main"><strong>${escapeHtml(item.label)}</strong><small>${dateTime(item.date)} · ${escapeHtml(item.detail)}</small></div><strong class="entity-row__amount ${direction === "out" ? "is-negative" : ""}">${direction === "out" ? "−" : "+"}${money(item.amount)}</strong></article>`).join("") : `<div class="inline-empty">لا توجد تحويلات ${direction === "out" ? "صادرة" : "واردة"} ضمن الفترة.</div>`;
  return `${topbarMarkup("التحويلات", "تفاصيل الحوالات الواردة والصادرة منفصلة عن الرصيد النقدي للصندوق.", `<button class="button button--secondary" data-action="navigate" data-view="cashbox">${icon("wallet", 17)}<span>الصندوق</span></button>`)}<section class="toolbar toolbar--filter"><form id="cash-filter" class="date-filter"><label>من<input name="from" type="date" value="${state.cashFrom}" /></label><label>إلى<input name="to" type="date" value="${state.cashTo}" /></label></form></section><section class="metric-grid metric-grid--reports">${metricCard("وارد التحويلات", money(totalIncoming), "transfer", "بيع ودفعات عملاء", totalIncoming)}${metricCard("صادر التحويلات", money(totalOutgoing), "transfer", "شراء ودفعات موردين", -totalOutgoing)}${metricCard("صافي التحويلات", money(net), "chart", "لا يدخل الصندوق النقدي", net)}</section><section class="report-grid"><article class="panel entity-list"><div class="panel__head"><div><span class="eyebrow">وارد</span><h2>تحويلات واردة</h2></div><small>${amount(incoming.length)} حركة</small></div>${transferList(incoming, "in")}</article><article class="panel entity-list"><div class="panel__head"><div><span class="eyebrow">صادر</span><h2>تحويلات صادرة</h2></div><small>${amount(outgoing.length)} حركة</small></div>${transferList(outgoing, "out")}</article></section>`;
}

function cloudBytes(value) {
  const bytes = Math.max(0, Number(value) || 0);
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}

function cloudBackupMarkup() {
  const cloud = state.cloud;
  const busy = Boolean(cloud.busy);
  if (!cloud.user) {
    return `<section class="panel report-card cloud-backup-card"><span class="eyebrow">نسخ سحابي مجاني</span><h2>نسخة آمنة بين الأجهزة</h2><p>اربط بريدًا وكلمة مرور خاصين بالنسخ فقط. لا يحل هذا الحساب محل أدمن حسابي، ولا توجد مزامنة لحظية.</p><div class="cloud-backup-card__note"><strong>ما الذي يبقى محليًا؟</strong><span>تستمر المبيعات والعمل دون اتصال على IndexedDB؛ الرفع والاستعادة عمليتان يدويتان.</span></div><div class="dialog__actions"><button class="button button--primary" data-action="open-cloud-auth">ربط النسخ السحابية</button></div></section>`;
  }
  const rows = cloud.backups.map((backup) => `<article class="cloud-backup-row"><div><strong>${escapeHtml(backup.storeName || "حسابي")}</strong><small>${dateTime(backup.createdAtClient)} · ${cloudBytes(backup.encodedBytes)} · ${amount(backup.chunkCount)} جزء</small></div><div class="cloud-backup-row__actions"><button class="button button--secondary" data-action="cloud-restore-backup" data-id="${escapeHtml(backup.id)}" ${busy ? "disabled" : ""}>استعادة</button><button class="icon-button icon-button--danger" data-action="cloud-delete-backup" data-id="${escapeHtml(backup.id)}" aria-label="حذف النسخة" ${busy ? "disabled" : ""}>${icon("trash", 18)}</button></div></article>`).join("");
  return `<section class="panel report-card cloud-backup-card"><div class="panel__head"><div><span class="eyebrow">نسخ سحابي مجاني</span><h2>نسخ ${escapeHtml(cloud.user.email || "السحابية")}</h2></div><button class="text-button" data-action="cloud-signout" ${busy ? "disabled" : ""}>فصل الحساب</button></div><p>يُحتفظ بآخر 3 نسخ مكتملة فقط لهذا البريد. لا تتغير البيانات بين الأجهزة إلا عند اختيار «استعادة» صراحة.</p><div class="dialog__actions"><button class="button button--primary" data-action="cloud-upload-backup" ${busy ? "disabled" : ""}>${busy === "upload" ? "جارٍ رفع النسخة…" : "إنشاء نسخة سحابية الآن"}</button><button class="button button--secondary" data-action="cloud-refresh-backups" ${busy ? "disabled" : ""}>تحديث القائمة</button></div>${cloud.error ? `<p class="cloud-backup-error">${escapeHtml(cloud.error)}</p>` : ""}<div class="cloud-backup-list">${cloud.loading ? `<div class="inline-empty">جارٍ تحميل النسخ السحابية…</div>` : rows || `<div class="inline-empty">لا توجد نسخة سحابية بعد. أنشئ أول نسخة بعد مراجعة بيانات جهازك.</div>`}</div></section>`;
}

function settingsMarkup() {
  return `${topbarMarkup("الإعدادات", "تعمل بيانات المتجر محليًا دون اتصال، والنسخ السحابي اختياري ويدوي.")}
  <section class="report-grid"><form id="settings-form" class="panel form-grid"><div class="panel__head form-full"><div><span class="eyebrow">بيانات المتجر</span><h2>إعدادات عامة</h2></div></div><label>اسم المتجر<input name="storeName" required maxlength="60" dir="rtl" value="${escapeHtml(state.settings?.storeName || "")}" /></label><label>نوع النشاط<select name="businessType">${BUSINESS_TYPES.map((type) => `<option value="${type}" ${state.settings?.businessType === type ? "selected" : ""}>${type}</option>`).join("")}</select></label><label>العملة<select name="currency">${CURRENCIES.map((currency) => `<option value="${currency.code}" ${state.settings?.currency === currency.code ? "selected" : ""}>${currency.label}</option>`).join("")}</select></label><label>رصيد افتتاحي للصندوق<input name="openingCash" type="number" min="0" step="0.01" value="${escapeHtml(state.settings?.openingCash ?? "")}" /></label><div class="dialog__actions form-full"><button class="button button--primary" type="submit">حفظ الإعدادات ${icon("check", 17)}</button></div></form><section class="panel report-card"><span class="eyebrow">نسخة محلية</span><h2>حماية بيانات هذا الجهاز</h2><p>صدّر ملف JSON يحتفظ بكل البيانات المحلية، واستعده فقط من ملف حسابي موثوق.</p><div class="dialog__actions"><button class="button button--secondary" data-action="export-backup">تصدير نسخة</button><label class="button button--primary" for="restore-file">استعادة نسخة</label><input id="restore-file" type="file" accept="application/json" hidden /></div></section>${cloudBackupMarkup()}<section class="panel report-card"><span class="eyebrow">منطقة حساسة</span><h2>مسح البيانات</h2><p>يمسح كل بيانات هذا الجهاز ويعيد التطبيق إلى شاشة الإعداد. صدّر نسخة احتياطية أولًا.</p><button class="button button--danger" data-action="reset-data">مسح جميع البيانات</button></section></section>`;
}

function loginMarkup() {
  const users = state.accounts.filter((account) => account.isActive);
  return `<main class="setup-page login-page"><section class="setup-art"><div class="setup-art__brand"><img src="${markImage}" alt="" /><span class="brand-wordmark">حسابي</span><small>سجلّ المتجر اليومي</small></div><div class="setup-art__status"><span class="presence-dot"></span><span>بيانات المتجر تبقى على هذا الجهاز</span></div><div class="setup-art__copy"><p class="eyebrow">دخول آمن</p><h1>اختر حسابك<br />وابدأ وردية العمل.</h1><p>حساب الأدمن يدير الإدخال والأرباح والإحصائيات، وحساب الكاشير مخصص للمبيعات والفواتير.</p><div class="setup-art__stamps"><span>أدمن</span><span>كاشير</span><span>مبيعات</span></div></div></section><section class="setup-form-wrap"><div class="setup-sheet"><div class="setup-sheet__brand"><img src="${markImage}" alt="" /><div><strong>تسجيل الدخول</strong><span>${escapeHtml(state.settings?.storeName || "حسابي")}</span></div></div><div class="setup-form"><span class="eyebrow">مرحبًا بعودتك</span><h2>الدخول إلى الحساب</h2><p>أدخل اسم المستخدم ورمز الدخول المكوّن من أرقام.</p><form id="login-form"><label>اسم المستخدم<input name="username" autocomplete="username" required minlength="3" maxlength="30" autofocus placeholder="مثال: admin" /></label><label>رمز الدخول<input name="pin" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="current-password" required minlength="4" maxlength="12" placeholder="••••" /></label><button class="button button--primary button--wide" type="submit">دخول إلى حسابي ${icon("arrow", 18)}</button></form><div class="account-hints"><strong>الحسابات المتاحة</strong>${users.map((account) => `<button type="button" class="account-hint" data-action="fill-login" data-username="${escapeHtml(account.username)}"><span>${escapeHtml(account.name)}</span><small>${escapeHtml(account.username)} · ${roleLabel(account.role)}</small></button>`).join("")}</div><small class="offline-note"><span class="presence-dot"></span>يسجل الدخول محليًا ولا يحتاج اتصالًا بالإنترنت</small></div></div></section></main>`;
}

function requiredPinMarkup() {
  return `<main class="setup-page login-page"><section class="setup-art"><div class="setup-art__brand"><img src="${markImage}" alt="" /><span class="brand-wordmark">حسابي</span><small>حماية الحساب</small></div><div class="setup-art__copy"><p class="eyebrow">خطوة أمنية</p><h1>غيّر رمز الدخول<br />قبل متابعة العمل.</h1><p>تم إنشاء الحساب برمز مؤقت. اختر رمزًا خاصًا من 4 إلى 12 رقمًا.</p></div></section><section class="setup-form-wrap"><div class="setup-sheet"><div class="setup-form"><span class="eyebrow">مرحبًا ${escapeHtml(state.currentUser?.name || "")}</span><h2>تعيين رمز دخول جديد</h2><form id="required-pin-form"><label>رمز الدخول الجديد<input name="pin" type="password" inputmode="numeric" pattern="[0-9]*" required minlength="4" maxlength="12" autofocus /></label><label>تأكيد الرمز<input name="pinConfirm" type="password" inputmode="numeric" pattern="[0-9]*" required minlength="4" maxlength="12" /></label><button class="button button--primary button--wide" type="submit">حفظ ومتابعة ${icon("check", 18)}</button></form></div></div></section></main>`;
}

function accountsMarkup() {
  const accounts = state.accounts;
  return `${topbarMarkup("الحسابات والصلاحيات", "أدر حسابات فريقك وحدد من يرى البيانات المالية ومن يقتصر على البيع.", `<button class="button button--primary" data-action="new-account">${icon("plus", 18)}<span>إضافة حساب</span></button>`)}
  <section class="panel account-list"><div class="panel__head"><div><span class="eyebrow">فريق المتجر</span><h2>الحسابات المحلية</h2></div><small>الأدمن: كامل الصلاحيات · الكاشير: المبيعات والفواتير فقط</small></div>${accounts.map((account) => `<article class="account-row"><div class="account-row__icon">${icon("users", 20)}</div><div class="account-row__main"><strong>${escapeHtml(account.name)}</strong><small dir="ltr">${escapeHtml(account.username)}</small></div><span class="account-badge account-badge--${account.role}">${roleLabel(account.role)}</span><span class="status status--${account.isActive ? "available" : "empty"}">${account.isActive ? "نشط" : "موقوف"}</span><div class="entity-row__actions"><button class="icon-button" data-action="change-account-pin" data-id="${account.id}" aria-label="تغيير رمز دخول ${escapeHtml(account.name)}">${icon("edit", 18)}</button><button class="icon-button" data-action="open-account" data-id="${account.id}" aria-label="تعديل ${escapeHtml(account.name)}">${icon("dots", 18)}</button></div></article>`).join("")}</section>`;
}

function render() {
  if (!state.settings?.setupCompleted) { root.innerHTML = setupMarkup(); injectSetupRestoreControl(); bindEvents(); return; }
  if (!state.currentUser) { root.innerHTML = loginMarkup(); bindEvents(); return; }
  if (state.currentUser.mustChangePin) { root.innerHTML = requiredPinMarkup(); bindEvents(); return; }
  if (!canAccessView(state.currentUser, state.view)) state.view = isAdmin(state.currentUser) ? "dashboard" : "sales";
  const body = { dashboard: dashboardMarkup, products: productsMarkup, inventory: inventoryMarkup, sales: salesMarkup, invoices: invoicesMarkup, customers: customersMarkup, "customer-payments": customerPaymentsMarkup, suppliers: suppliersMarkup, "supplier-payments": supplierPaymentsMarkup, purchases: purchasesMarkup, expenses: expensesMarkup, cashbox: cashboxMarkup, transfers: transfersMarkup, reports: reportsMarkup, accounts: accountsMarkup, settings: settingsMarkup }[state.view]?.() || dashboardMarkup();
  root.innerHTML = `<div class="app-shell">${navMarkup()}<main class="workspace">${body}</main>${salesScannerFabMarkup()}</div>`;
  bindEvents();
}

function injectSetupRestoreControl() {
  const setupEyebrow = root.querySelector(".setup-art__copy .eyebrow");
  const setupStamp = root.querySelector(".setup-stamp");
  if (setupEyebrow) setupEyebrow.textContent = "سجل حسابي";
  if (setupStamp) setupStamp.textContent = "حسابي";
  const setupForm = root.querySelector("#setup-form");
  if (!setupForm || root.querySelector("#setup-restore-file")) return;
  const control = document.createElement("div");
  control.className = "setup-restore";
  control.innerHTML = `<span>لديك متجر محفوظ سابقًا؟</span><label class="button button--secondary button--wide" for="setup-restore-file">${icon("restore", 18)} استعادة بيانات سابقة</label><input id="setup-restore-file" type="file" accept="application/json,.json" hidden /><small>اختر ملف نسخة «حسابي» الاحتياطية؛ ستعود بعدها إلى الدخول بحساباتك ورموزك السابقة.</small>`;
  setupForm.insertAdjacentElement("afterend", control);
}

function setupMarkup() {
  return `<main class="setup-page"><section class="setup-art"><div class="setup-art__brand"><img src="${markImage}" alt="" /><span class="brand-wordmark">حسابي</span><small>سجلّ المتجر اليومي</small></div><div class="setup-art__status"><span class="presence-dot"></span><span>نظامك المحلي جاهز للعمل دون اتصال</span></div><div class="setup-art__copy"><p class="eyebrow">سجل تشغيلي · المرحلة الأولى</p><h1>بيانات واضحة<br />لبداية يوم بيع منظّم.</h1><p>ستسجل هنا البيانات التي تظهر على الفواتير وتضبط عرض المخزون والمبيعات اليومية.</p><div class="setup-art__stamps"><span>المنتجات</span><span>المخزون</span><span>الفواتير</span></div></div><div class="setup-art__ledger-card"><span>خط سير اليوم</span><strong>منتج ← مخزون ← فاتورة</strong><i></i><i></i><i></i></div><img class="setup-art__image" src="${assetBaseUrl}/hesabi-setup-ledger_a7b0fae4.png" alt="رسم تعبيري لأدوات تنظيم المتجر" /></section><section class="setup-form-wrap"><div class="setup-sheet"><div class="setup-sheet__brand"><img src="${markImage}" alt="" /><div><strong>حسابي</strong><span>دفتر التاجر الهادئ</span></div><span class="setup-stamp">خطوة 1 من 1</span></div><div class="setup-form"><span class="eyebrow">سجل بداية العمل</span><h2>بيانات تُستخدم كل يوم</h2><p>أدخل اسم المتجر والنشاط والعملة. ستظهر هذه البيانات في الفواتير، وتُنظّم طريقة قراءة المخزون والمبيعات اليومية.</p><form id="setup-form"><label>اسم المتجر<input name="storeName" dir="rtl" required maxlength="60" placeholder="مثال: بقالة الواحة" autofocus /></label><label>نوع النشاط<select name="businessType" required>${BUSINESS_TYPES.map((type) => `<option value="${type}">${type}</option>`).join("")}</select></label><label>العملة<select name="currency" required>${CURRENCIES.map((currency) => `<option value="${currency.code}" ${currency.code === DEFAULT_CURRENCY_CODE ? "selected" : ""}>${currency.label}</option>`).join("")}</select></label><button class="button button--primary button--wide" type="submit">فتح سجل المتجر ${icon("arrow", 18)}</button></form><small class="offline-note"><span class="presence-dot"></span>يحفظ محليًا ويظل متاحًا بعد أول تحميل</small></div></div></section></main>`;
}

function bindSearchInput(selector, stateKey) {
  root.querySelector(selector)?.addEventListener("input", (event) => {
    const value = event.target.value;
    state[stateKey] = value;
    render();
    const restored = root.querySelector(selector);
    restored?.focus();
    restored?.setSelectionRange(value.length, value.length);
  });
}

function bindEvents() {
  root.querySelectorAll("[data-action]").forEach((element) => element.addEventListener("click", handleAction));
  root.querySelector("#setup-form")?.addEventListener("submit", handleSetup);
  root.querySelector("#login-form")?.addEventListener("submit", handleLogin);
  root.querySelector("#required-pin-form")?.addEventListener("submit", changeRequiredPin);
  bindSearchInput("#product-search", "productQuery");
  bindSearchInput("#sale-search", "saleQuery");
  root.querySelector("#sale-search")?.addEventListener("keydown", async (event) => { if (event.key === "Enter" && event.target.value.trim()) await findBarcode(event.target.value.trim(), "sale"); });
  bindSearchInput("#invoice-search", "invoiceQuery");
  bindSearchInput("#supplier-search", "supplierQuery");
  bindSearchInput("#customer-search", "customerQuery");
  bindSearchInput("#payment-search", "paymentQuery");
  root.querySelector("#payment-filter")?.addEventListener("change", (event) => { state.paymentFrom = event.currentTarget.querySelector("[name=from]").value; state.paymentTo = event.currentTarget.querySelector("[name=to]").value; render(); });
  bindSearchInput("#supplier-payment-search", "supplierPaymentQuery");
  root.querySelector("#supplier-payment-filter")?.addEventListener("change", (event) => { state.supplierPaymentFrom = event.currentTarget.querySelector("[name=from]").value; state.supplierPaymentTo = event.currentTarget.querySelector("[name=to]").value; render(); });
  bindSearchInput("#debt-search", "debtQuery");
  root.querySelector("#debt-sort")?.addEventListener("change", (event) => { state.debtSort = event.target.value; render(); });
  bindSearchInput("#expense-search", "expenseQuery");
  root.querySelector("#expense-filter")?.addEventListener("change", (event) => { state.expenseFrom = event.currentTarget.querySelector("[name=from]").value; state.expenseTo = event.currentTarget.querySelector("[name=to]").value; render(); });
  root.querySelector("#report-filter")?.addEventListener("change", async (event) => { state.reportFrom = event.currentTarget.querySelector("[name=from]").value; state.reportTo = event.currentTarget.querySelector("[name=to]").value; state.analytics = await db.getAnalytics({ from: state.reportFrom, to: state.reportTo }); render(); });
  root.querySelector("#cash-filter")?.addEventListener("change", async (event) => { state.cashFrom = event.currentTarget.querySelector("[name=from]").value; state.cashTo = event.currentTarget.querySelector("[name=to]").value; await refresh(); render(); });
  root.querySelector("#settings-form")?.addEventListener("submit", saveSettings);
  root.querySelector("#restore-file")?.addEventListener("change", restoreBackupFromFile);
  root.querySelector("#setup-restore-file")?.addEventListener("change", restoreBackupFromFile);
  root.querySelectorAll("[data-cart-quantity]").forEach((input) => input.addEventListener("change", (event) => {
    setCartQuantity(event.currentTarget.dataset.cartQuantity, event.currentTarget.value, { renderNow: false });
    window.setTimeout(render, 0);
  }));
}

async function handleSetup(event) {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  if (!values.storeName.trim()) { showToast("أدخل اسم المتجر أولًا.", "error"); return; }
  await db.saveSettings(values);
  state.settings = await db.getSettings();
  await refresh();
  render();
  showToast(`أهلًا بك في ${state.settings.storeName}`);
}

async function handleLogin(event) {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  try {
    state.currentUser = await db.authenticateAccount(values);
    await db.savePersistentSession(state.currentUser.id);
    state.view = state.currentUser.role === "admin" ? "dashboard" : "sales";
    render();
    showToast(`مرحبًا ${state.currentUser.name}`);
  } catch (error) { showToast(error.message || "تعذر تسجيل الدخول.", "error"); }
}

async function changeRequiredPin(event) {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  if (values.pin !== values.pinConfirm) { showToast("رمزا الدخول غير متطابقين.", "error"); return; }
  try {
    await db.changeAccountPin(state.currentUser.id, values.pin);
    state.currentUser = { ...state.currentUser, mustChangePin: false };
    state.accounts = await db.listAccounts();
    render();
    showToast("تم تعيين رمز دخول جديد.");
  } catch (error) { showToast(error.message || "تعذر حفظ رمز الدخول.", "error"); }
}

async function handleAction(event) {
  const action = event.currentTarget.dataset.action;
  const id = event.currentTarget.dataset.id;
  if (action === "fill-login") { const input = root.querySelector("#login-form [name=username]"); if (input) { input.value = event.currentTarget.dataset.username; root.querySelector("#login-form [name=pin]")?.focus(); } return; }
  if (action === "logout") { openLogoutConfirmDialog(); return; }
  if (action === "account-session") { openAccountSessionDialog(); return; }
  if (action === "navigate") { const view = event.currentTarget.dataset.view; if (!canAccessView(state.currentUser, view)) { adminOnlyMessage(); return; } state.view = view; render(); if (view === "settings" && isAdmin(state.currentUser)) void refreshCloudBackups({ quiet: true }); return; }
  if (!state.currentUser) { render(); return; }
  if (action === "open-sales-scanner") { if (!canAccessView(state.currentUser, "sales")) { adminOnlyMessage(); return; } state.view = "sales"; render(); requestAnimationFrame(() => openScanner("sale")); return; }
  if (!canUseAction(state.currentUser, action, { mode: event.currentTarget.dataset.mode })) { adminOnlyMessage(); return; }
  if (action === "toggle-theme") { toggleTheme(); return; }
  if (action === "open-reorder-list") { openReorderDialog(); return; }
  if (action === "new-product") { openProductDialog(); return; }
  if (action === "open-product") { openProductDialog(await db.getProduct(id)); return; }
  if (action === "adjust-stock") { openAdjustmentDialog(await db.getProduct(id)); return; }
  if (action === "count-stock") { openStockCountDialog(await db.getProduct(id)); return; }
  if (action === "open-scanner") { openScanner(event.currentTarget.dataset.mode); return; }
  if (action === "add-cart") { addToCart(id); return; }
  if (action === "cart-increment") { changeCart(id, 1); return; }
  if (action === "cart-decrement") { changeCart(id, -1); return; }
  if (action === "cart-remove") { state.cart = state.cart.filter((line) => line.productId !== id); render(); return; }
  if (action === "clear-cart") { state.cart = []; render(); return; }
  if (action === "checkout") { openCheckoutDialog(); return; }
  if (action === "open-invoice") { openInvoiceDialog(id); return; }
  if (action === "new-customer") { openCustomerDialog(); return; }
  if (action === "open-customer") { openCustomerAccountDialog(id); return; }
  if (action === "edit-customer") { openCustomerDialog(state.customers.find((customer) => customer.id === id)); return; }
  if (action === "delete-customer") { deleteCustomer(id); return; }
  if (action === "record-customer-payment") { openCustomerPaymentDialog(id); return; }
  if (action === "new-supplier") { openSupplierDialog(); return; }
  if (action === "open-supplier") { openSupplierDialog(state.suppliers.find((supplier) => supplier.id === id)); return; }
  if (action === "open-supplier-account") { openSupplierAccountDialog(id); return; }
  if (action === "delete-supplier") { deleteSupplier(id); return; }
  if (action === "new-supplier-payment") { openSupplierPaymentDialog(); return; }
  if (action === "record-supplier-payment") { openSupplierPaymentDialog(id); return; }
  if (action === "new-purchase") { openPurchaseDialog(); return; }
  if (action === "open-purchase") { openPurchaseDialog(id); return; }
  if (action === "purchase-return") { openPurchaseReturnDialog(id); return; }
  if (action === "sale-return") { openSaleReturnDialog(id); return; }
  if (action === "new-expense") { openExpenseDialog(); return; }
  if (action === "edit-expense") { openExpenseDialog(state.expenses.find((expense) => expense.id === id)); return; }
  if (action === "delete-expense") { deleteExpense(id); return; }
  if (action === "open-stock-history") { openStockHistoryDialog(id); return; }
  if (action === "new-cash-deposit") { openCashMovementDialog("DEPOSIT"); return; }
  if (action === "new-cash-withdrawal") { openCashMovementDialog("WITHDRAWAL"); return; }
  if (action === "export-backup") { downloadBackup(); return; }
  if (action === "open-cloud-auth") { openCloudAuthDialog(); return; }
  if (action === "cloud-upload-backup") { uploadCurrentCloudBackup(); return; }
  if (action === "cloud-refresh-backups") { refreshCloudBackups(); return; }
  if (action === "cloud-restore-backup") { restoreCloudBackup(id); return; }
  if (action === "cloud-delete-backup") { removeCloudBackup(id); return; }
  if (action === "cloud-signout") { disconnectCloudBackup(); return; }
  if (action === "export-report") { openReportExportDialog(); return; }
  if (action === "reset-data") { resetAllData(); return; }
  if (action === "new-account") { openAccountDialog(); return; }
  if (action === "open-account") { openAccountDialog(state.accounts.find((account) => account.id === id)); return; }
  if (action === "change-account-pin") { openAccountPinDialog(state.accounts.find((account) => account.id === id)); return; }
}

function addToCart(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return false;
  const existing = state.cart.find((item) => item.productId === productId);
  if (existing && existing.quantity >= product.quantity) { showToast("الكمية المتوفرة غير كافية", "error"); return false; }
  if (existing) existing.quantity += 1;
  else state.cart.push({ productId: product.id, name: product.name, unitPrice: product.salePrice, quantity: 1 });
  state.saleQuery = "";
  render();
  return true;
}

function changeCart(productId, delta) {
  const product = state.products.find((item) => item.id === productId);
  const line = state.cart.find((item) => item.productId === productId);
  if (!product || !line) return;
  if (delta > 0 && line.quantity >= product.quantity) { showToast("الكمية المتوفرة غير كافية", "error"); return; }
  line.quantity += delta;
  if (line.quantity <= 0) state.cart = state.cart.filter((item) => item.productId !== productId);
  render();
}

function setCartQuantity(productId, quantity, { renderNow = true } = {}) {
  const product = state.products.find((item) => item.id === productId);
  const line = state.cart.find((item) => item.productId === productId);
  if (!product || !line) return;
  const next = toNumber(quantity);
  if (next <= 0) { state.cart = state.cart.filter((item) => item.productId !== productId); if (renderNow) render(); return; }
  if (next > toNumber(product.quantity)) { showToast("الكمية المتوفرة غير كافية", "error"); if (renderNow) render(); return; }
  line.quantity = next;
  if (renderNow) render();
}

function openDialog(content) {
  closeDialog();
  const overlay = document.createElement("div");
  overlay.className = "dialog-backdrop";
  overlay.id = "dialog-backdrop";
  overlay.innerHTML = `<section class="dialog" role="dialog" aria-modal="true">${content}</section>`;
  overlay.addEventListener("click", (event) => { if (event.target === overlay) closeDialog(); });
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("is-open"));
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog));
  return overlay;
}

function closeDialog() { closeScannerDialog(); document.querySelector("#dialog-backdrop")?.remove(); }

function accountFormMarkup(account = null) {
  const isEdit = Boolean(account);
  return `<div class="dialog__head"><div><span class="eyebrow">${isEdit ? "تعديل الحساب" : "حساب جديد"}</span><h2>${isEdit ? `بيانات ${escapeHtml(account.name)}` : "إضافة حساب"}</h2></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><form id="account-form" class="form-grid"><label>الاسم الظاهر<input name="name" dir="rtl" required maxlength="60" value="${escapeHtml(account?.name || "")}" autofocus /></label><label>اسم المستخدم<input name="username" dir="ltr" autocomplete="off" required minlength="3" maxlength="30" value="${escapeHtml(account?.username || "")}" ${isEdit ? "disabled" : ""} /></label>${isEdit ? "" : `<label>رمز الدخول<input name="pin" type="password" inputmode="numeric" pattern="[0-9]*" required minlength="4" maxlength="12" /></label>`}<label>الدور<select name="role">${ACCOUNT_ROLES.map((role) => `<option value="${role.id}" ${account?.role === role.id || (!account && role.id === "cashier") ? "selected" : ""}>${role.label}</option>`).join("")}</select></label><label class="checkbox-field"><input name="isActive" type="checkbox" ${account?.isActive !== false ? "checked" : ""} /><span>الحساب نشط ويمكنه الدخول</span></label><div class="dialog__actions form-full"><button type="button" class="button button--secondary" data-dialog-close>إلغاء</button><button class="button button--primary" type="submit">${isEdit ? "حفظ التعديلات" : "إنشاء الحساب"} ${icon("check", 17)}</button></div></form>`;
}

function openAccountDialog(account = null) {
  const overlay = openDialog(accountFormMarkup(account));
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog));
  overlay.querySelector("#account-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    values.isActive = form.querySelector("[name=isActive]").checked;
    try {
      const updated = account ? await db.updateAccount(account.id, values) : await db.createAccount(values);
      state.accounts = await db.listAccounts();
      if (account?.id === state.currentUser?.id) {
        state.currentUser = updated.isActive ? { ...state.currentUser, name: updated.name, role: updated.role } : null;
        if (!state.currentUser) { await db.clearPersistentSession(); state.cart = []; }
      }
      closeDialog(); render(); showToast(account ? "تم حفظ بيانات الحساب." : "تم إنشاء الحساب.");
    } catch (error) { showToast(error.message || "تعذر حفظ الحساب.", "error"); }
  });
}

function openAccountPinDialog(account) {
  if (!account) return;
  const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">رمز الدخول</span><h2>تغيير رمز ${escapeHtml(account.name)}</h2></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><form id="account-pin-form" class="form-grid"><label>رمز الدخول الجديد<input name="pin" type="password" inputmode="numeric" pattern="[0-9]*" required minlength="4" maxlength="12" autofocus /></label><label>تأكيد الرمز<input name="pinConfirm" type="password" inputmode="numeric" pattern="[0-9]*" required minlength="4" maxlength="12" /></label><div class="dialog__actions form-full"><button type="button" class="button button--secondary" data-dialog-close>إلغاء</button><button class="button button--primary" type="submit">حفظ الرمز ${icon("check", 17)}</button></div></form>`);
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog));
  overlay.querySelector("#account-pin-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (values.pin !== values.pinConfirm) { showToast("رمزا الدخول غير متطابقين.", "error"); return; }
    try {
      await db.changeAccountPin(account.id, values.pin);
      state.accounts = await db.listAccounts();
      if (account.id === state.currentUser?.id) state.currentUser = { ...state.currentUser, mustChangePin: false };
      closeDialog(); render(); showToast("تم تغيير رمز الدخول.");
    } catch (error) { showToast(error.message || "تعذر تغيير رمز الدخول.", "error"); }
  });
}

function productFormMarkup(product = null, presetBarcode = "") {
  const isEdit = Boolean(product);
  const input = (name, label, type = "text", value = "", attrs = "") => `<label>${label}<input name="${name}" type="${type}" value="${escapeHtml(value)}" ${attrs} /></label>`;
  const barcodeField = `<label class="barcode-field">الباركود<div class="barcode-field__control"><input id="product-barcode" name="barcode" type="text" dir="ltr" inputmode="numeric" autocomplete="off" value="${escapeHtml(product?.barcode || presetBarcode)}" /><button id="scan-product-barcode" class="button button--secondary barcode-field__scan" type="button">${icon("scan", 17)}<span>مسح</span></button></div><small id="barcode-feedback" class="barcode-feedback" aria-live="polite">اكتب الباركود أو امسحه بالكاميرا.</small></label>`;
  return `<div class="dialog__head"><div><span class="eyebrow">${isEdit ? "تحديث الكتالوج" : "منتج جديد"}</span><h2>${isEdit ? `تعديل ${escapeHtml(product.name)}` : "إضافة منتج"}</h2></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><form id="product-form" class="form-grid" data-id="${product?.id || ""}">${input("name", "اسم المنتج", "text", product?.name, "required maxlength=100 autofocus dir=rtl")}${barcodeField}${input("internalCode", "الكود الداخلي", "text", product?.internalCode, "dir=ltr autocomplete=off")}${input("purchasePrice", "سعر الشراء", "number", product?.purchasePrice ?? "", "min=0 step=0.01 required")}${input("salePrice", "سعر البيع", "number", product?.salePrice ?? "", "min=0 step=0.01 required")}${!isEdit ? input("quantity", "الكمية الافتتاحية", "number", "", "min=0 step=0.001") : `<div class="locked-field"><span>الكمية الحالية</span><strong>${amount(product.quantity)} ${escapeHtml(product.unit)}</strong><small>تُعدّل من شاشة المخزون فقط.</small></div>`}${input("minimumStock", "الحد الأدنى للمخزون", "number", product?.minimumStock ?? "", "min=0 step=0.001")}<label>الوحدة<select name="unit">${UNITS.map((unit) => `<option value="${unit}" ${product?.unit === unit ? "selected" : ""}>${unit}</option>`).join("")}</select></label><div class="dialog__actions form-full"><button type="button" class="button button--secondary" data-dialog-close>إلغاء</button><button class="button button--primary" type="submit">${isEdit ? "حفظ التعديلات" : "حفظ المنتج"} ${icon("check", 17)}</button></div></form>${isEdit ? `<div class="dialog__danger"><span>لا يُحذف المنتج نهائيًا؛ يحتفظ التطبيق بسجله إذا ارتبط بفواتير.</span><button class="text-button text-button--danger" id="delete-product">${icon("trash", 16)} حذف من القائمة</button></div>` : ""}`;
}

function openProductDialog(product = null, presetBarcode = "") {
  const overlay = openDialog(productFormMarkup(product, presetBarcode));
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog));
  const form = overlay.querySelector("#product-form");
  const unitSelect = form.elements.unit;
  const selectedUnit = product?.unit || businessProfile().defaultUnit;
  unitSelect.innerHTML = profileOptions("units", selectedUnit).map((unit) => `<option value="${unit}" ${unit === selectedUnit ? "selected" : ""}>${unit}</option>`).join("");
  const barcodeInput = overlay.querySelector("#product-barcode");
  const barcodeFeedback = overlay.querySelector("#barcode-feedback");
  if (product && isPharmacy()) {
    db.listProductBatches(product.id).then((batches) => {
      const rows = batches.length ? batches.map((batch) => `<div class="warning-row"><div class="warning-row__icon">${icon("package", 18)}</div><div><strong>تشغيلة ${escapeHtml(batch.batchNumber || "غير مرقمة")}</strong><small>ينتهي في ${formatDate(batch.expiryDate)} · المتبقي ${amount(batch.remainingQuantity)} ${escapeHtml(product.unit)}</small></div></div>`).join("") : `<div class="inline-empty">لا توجد تشغيلات مسجلة لهذا المنتج بعد.</div>`;
      form.insertAdjacentHTML("afterend", `<section class="account-transactions"><div class="section-heading"><div><span class="eyebrow">سجل الصيدلية</span><h3>كميات التشغيلات</h3></div></div><div class="warning-list">${rows}</div></section>`);
    }).catch(() => {});
  }
  const checkProductBarcode = async () => {
    const duplicate = await db.findProductByBarcode(barcodeInput.value, product?.id);
    if (duplicate) {
      setBarcodeFeedback(barcodeFeedback, `هذا الباركود مستخدم بالفعل للمنتج: ${duplicate.name}`, "error");
      return duplicate;
    }
    setBarcodeFeedback(barcodeFeedback, barcodeInput.value.trim() ? "الباركود متاح للحفظ." : "اكتب الباركود أو امسحه بالكاميرا.", barcodeInput.value.trim() ? "success" : "neutral");
    return null;
  };
  barcodeInput.addEventListener("blur", () => { checkProductBarcode().catch((error) => showToast(error.message, "error")); });
  overlay.querySelector("#scan-product-barcode").addEventListener("click", () => openProductBarcodeScanner({ barcodeInput, barcodeFeedback, product, checkProductBarcode }));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submittedForm = event.currentTarget;
    const values = Object.fromEntries(new FormData(submittedForm));
    try {
      if (await checkProductBarcode()) return;
      if (product) await db.updateProduct(product.id, values); else await db.createProduct(values);
      await refresh(); closeDialog(); render(); showToast(product ? "تم حفظ تعديلات المنتج" : "تم حفظ المنتج وحركته الافتتاحية");
    } catch (error) { showToast(error.message, "error"); }
  });
  overlay.querySelector("#delete-product")?.addEventListener("click", async () => {
    if (!window.confirm("هل تريد إخفاء هذا المنتج من القوائم؟ لا يمكن التراجع عن ذلك من الواجهة.")) return;
    try { const result = await db.softDeleteProduct(product.id); await refresh(); closeDialog(); render(); showToast(result.linkedSales ? "أُخفي المنتج مع الحفاظ على الفواتير المرتبطة." : "أُخفي المنتج من القائمة."); } catch (error) { showToast(error.message, "error"); }
  });
}

function openAdjustmentDialog(product) {
  const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">حركة مخزون</span><h2>تعديل مخزون ${escapeHtml(product.name)}</h2></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><div class="stock-before"><span>الكمية الحالية</span><strong>${amount(product.quantity)} ${escapeHtml(product.unit)}</strong></div><form id="adjustment-form" class="form-grid"><label>الكمية الجديدة${quantityControlMarkup({ value: product.quantity, min: 0, step: "0.001", inputAttrs: "name=\"newQuantity\" autofocus" })}</label><label>سبب التعديل<textarea name="note" required maxlength="180" placeholder="مثال: جرد آخر اليوم"></textarea></label><div class="dialog__actions form-full"><button type="button" class="button button--secondary" data-dialog-close>إلغاء</button><button type="submit" class="button button--primary">تسجيل الحركة ${icon("check", 17)}</button></div></form>`);
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog));
  bindQuantityControl(overlay.querySelector(".quantity-control"), { min: 0, step: 0.001, onChange: () => {} });
  overlay.querySelector("#adjustment-form").addEventListener("submit", async (event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); try { await db.adjustStock(product.id, values.newQuantity, values.note); await refresh(); closeDialog(); render(); showToast("تم تسجيل حركة تعديل المخزون"); } catch (error) { showToast(error.message, "error"); } });
}

function openStockCountDialog(product) {
  const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">جرد المخزون</span><h2>جرد ${escapeHtml(product.name)}</h2></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><div class="stock-before"><span>الكمية المسجلة</span><strong>${amount(product.quantity)} ${escapeHtml(product.unit)}</strong></div><form id="stock-count-form" class="form-grid"><label>الكمية الفعلية${quantityControlMarkup({ value: product.quantity, min: 0, step: "0.001", inputAttrs: "name=\"actualQuantity\" autofocus" })}</label><label>ملاحظة الجرد<textarea name="notes" required maxlength="180" placeholder="مثال: جرد نهاية اليوم"></textarea></label><div class="dialog__actions form-full"><button type="button" class="button button--secondary" data-dialog-close>إلغاء</button><button type="submit" class="button button--primary">تسجيل الجرد ${icon("check", 17)}</button></div></form>`);
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog)); bindQuantityControl(overlay.querySelector(".quantity-control"), { min: 0, step: 0.001, onChange: () => {} }); overlay.querySelector("#stock-count-form").addEventListener("submit", async (event) => { event.preventDefault(); try { const values = Object.fromEntries(new FormData(event.currentTarget)); const count = await db.recordStockCount({ productId: product.id, ...values }); await refresh(); closeDialog(); render(); showToast(`تم تسجيل الجرد بفارق ${amount(count.difference)} ${product.unit}`); } catch (error) { showToast(error.message, "error"); } });
}

function openCashMovementDialog(type) {
  const label = type === "DEPOSIT" ? "إيداع في الصندوق" : "سحب من الصندوق";
  const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">حركة صندوق</span><h2>${label}</h2></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><form id="cash-movement-form" class="form-grid"><label>المبلغ${quantityControlMarkup({ value: "", min: 0.01, step: "0.01", inputAttrs: "name=\"amount\" required autofocus" })}</label><label>التاريخ<input name="date" required type="date" value="${dateKey()}" /></label><label class="form-full">السبب أو الملاحظة<textarea name="notes" required maxlength="180" placeholder="مثال: إيداع بداية اليوم"></textarea></label><div class="dialog__actions form-full"><button class="button button--secondary" type="button" data-dialog-close>إلغاء</button><button class="button button--primary" type="submit">حفظ الحركة ${icon("check", 17)}</button></div></form>`); overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog)); bindQuantityControl(overlay.querySelector(".quantity-control"), { min: 0.01, step: 0.01, onChange: () => {} }); overlay.querySelector("#cash-movement-form").addEventListener("submit", async (event) => { event.preventDefault(); try { const values = Object.fromEntries(new FormData(event.currentTarget)); await db.createCashMovement({ type, ...values }); await refresh(); closeDialog(); render(); showToast(`تم حفظ ${label}`); } catch (error) { showToast(error.message, "error"); } });
}

async function saveSettings(event) { event.preventDefault(); try { const values = Object.fromEntries(new FormData(event.currentTarget)); await db.saveSettings(values); state.settings = await db.getSettings(); await refresh(); render(); showToast("تم حفظ إعدادات المتجر"); } catch (error) { showToast(error.message, "error"); } }

function downloadBackupPayload(backup, suffix = dateKey()) { const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `hesabi-backup-${suffix}.json`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url); }

async function downloadBackup() { try { downloadBackupPayload(await db.exportBackup()); showToast("تم تصدير النسخة الاحتياطية"); } catch (error) { showToast(error.message || "تعذر تصدير النسخة الاحتياطية.", "error"); } }

async function refreshCloudBackups({ quiet = false } = {}) {
  if (!isAdmin(state.currentUser) || !state.cloud.user) return;
  state.cloud.loading = true; state.cloud.error = ""; if (state.view === "settings") render();
  try { state.cloud.backups = await listCloudBackups(); }
  catch (error) { state.cloud.error = error.message || "تعذر تحميل النسخ السحابية."; if (!quiet) showToast(state.cloud.error, "error"); }
  finally { state.cloud.loading = false; if (state.view === "settings") render(); }
}

function openCloudAuthDialog() {
  const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">حساب النسخ السحابية</span><h2>ربط نسخة حسابي</h2></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><p class="dialog__subtext">هذا بريد وكلمة مرور للنسخ السحابي فقط. لا يغيّر حساب الأدمن أو الكاشير المحليين، واستخدم نفس الحساب عند فتح النسخ من جهاز آخر.</p><form id="cloud-auth-form" class="form-grid"><label class="form-full">البريد الإلكتروني<input name="email" type="email" dir="ltr" autocomplete="email" required autofocus /></label><label class="form-full">كلمة مرور النسخ السحابية<input name="password" type="password" dir="ltr" autocomplete="current-password" minlength="6" required /></label><div class="cloud-backup-card__note form-full"><strong>تنبيه</strong><span>لا تحفظ كلمة المرور في حسابي. يحتفظ بها Firebase Authentication وفقًا لجلسة المتصفح فقط.</span></div><div class="dialog__actions form-full"><button type="button" class="button button--secondary" data-dialog-close>إلغاء</button><button class="button button--secondary" type="submit" data-cloud-auth-mode="signin">دخول</button><button class="button button--primary" type="submit" data-cloud-auth-mode="register">إنشاء وربط</button></div></form>`);
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog));
  overlay.querySelector("#cloud-auth-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const submitter = event.submitter;
    const controls = [...event.currentTarget.querySelectorAll("button")]; controls.forEach((button) => { button.disabled = true; });
    try {
      state.cloud.user = submitter?.dataset.cloudAuthMode === "register" ? await registerCloudBackupUser(values.email, values.password) : await signInCloudBackupUser(values.email, values.password);
      state.cloud.backups = []; state.cloud.error = ""; closeDialog(); render(); await refreshCloudBackups({ quiet: true }); showToast("تم ربط حساب النسخ السحابية.");
    } catch (error) { controls.forEach((button) => { button.disabled = false; }); showToast(error.message || "تعذر ربط حساب النسخ السحابية.", "error"); }
  });
}

async function uploadCurrentCloudBackup() {
  if (!window.confirm("سيُرفع وضع بيانات هذا الجهاز الحالي فقط إلى السحابة. لا توجد مزامنة لحظية. هل تريد إنشاء النسخة؟")) return;
  state.cloud.busy = "upload"; state.cloud.error = ""; render();
  try { const backup = await db.exportBackup(); await uploadCloudBackup(backup, { storeName: state.settings?.storeName || "حسابي" }); await refreshCloudBackups({ quiet: true }); showToast("اكتمل رفع النسخة السحابية بنجاح."); }
  catch (error) { state.cloud.error = error.message || "تعذر رفع النسخة السحابية."; showToast(state.cloud.error, "error"); }
  finally { state.cloud.busy = ""; if (state.view === "settings") render(); }
}

async function restoreCloudBackup(backupId) {
  if (!window.confirm("ستتحقق حسابي من النسخة ثم تستبدل بيانات هذا الجهاز. سيُنزل أولًا ملف JSON وقائيًا محليًا، وستعود إلى شاشة الدخول. هل تريد المتابعة؟")) return;
  state.cloud.busy = "restore"; state.cloud.error = ""; render();
  try {
    const safetyBackup = await db.exportBackup();
    downloadBackupPayload(safetyBackup, `before-cloud-restore-${dateKey()}`);
    const { payload } = await readCloudBackup(backupId);
    db.validateBackup(payload);
    await db.restoreBackup(payload);
    await db.clearPersistentSession();
    state.settings = await db.getSettings(); state.accounts = await db.listAccounts(); state.currentUser = null; state.cart = []; state.view = "sales"; await refresh(); render();
    showToast("اكتملت الاستعادة بعد تنزيل نسخة وقائية محلية.");
  } catch (error) { state.cloud.error = error.message || "تعذرت استعادة النسخة السحابية."; if (state.view === "settings") render(); showToast(state.cloud.error, "error"); }
  finally { state.cloud.busy = ""; }
}

async function removeCloudBackup(backupId) {
  if (!window.confirm("هل تريد حذف هذه النسخة السحابية نهائيًا؟ لن تتأثر بيانات هذا الجهاز.")) return;
  state.cloud.busy = "delete"; render();
  try { await deleteCloudBackup(backupId); await refreshCloudBackups({ quiet: true }); showToast("تم حذف النسخة السحابية."); }
  catch (error) { state.cloud.error = error.message || "تعذر حذف النسخة السحابية."; showToast(state.cloud.error, "error"); }
  finally { state.cloud.busy = ""; if (state.view === "settings") render(); }
}

async function disconnectCloudBackup() {
  if (!window.confirm("سيُفصل حساب النسخ من هذا الجهاز فقط، ولن تُحذف النسخ السحابية. هل تريد المتابعة؟")) return;
  try { await signOutCloudBackupUser(); state.cloud = { user: null, backups: [], loading: false, busy: "", error: "" }; render(); showToast("تم فصل حساب النسخ السحابية من هذا الجهاز."); }
  catch (error) { showToast(error.message || "تعذر فصل الحساب السحابي.", "error"); }
}

function reportExportRows() { const data = state.analytics || { sales: {}, purchases: {}, expenses: {}, profit: {} }; return [["البند", "القيمة"], ["من", state.reportFrom || "بداية السجل"], ["إلى", state.reportTo || "اليوم"], ["إجمالي المبيعات", money(data.sales.total || 0)], ["مرتجع البيع", money(data.sales.returns || 0)], ["صافي المبيعات", money(data.profit.netSales || 0)], ["تكلفة البضاعة", money(data.profit.netCostOfGoods || 0)], ["إجمالي المشتريات", money(data.purchases.total || 0)], ["مرتجع الشراء", money(data.purchases.returns || 0)], ["إجمالي المصروفات", money(data.expenses.total || 0)], ["صافي الربح", money(data.profit.netProfit || 0)], ["ديون العملاء الحالية", money(state.customers.reduce((sum, customer) => sum + toNumber(customer.balance), 0))], ["مستحقات الموردين الحالية", money(state.suppliers.reduce((sum, supplier) => sum + toNumber(supplier.balance), 0))]]; }
function reportExportHtml() { const rows = reportExportRows(); return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8" /><style>@page{size:A4;margin:15mm}body{font-family:Arial,"Noto Sans Arabic",sans-serif;color:#16332d;background:#fff}header{border-bottom:2px solid #1c7d69;padding-bottom:12px;margin-bottom:18px}h1{margin:0;font-size:23px}p{color:#45615a}table{width:100%;border-collapse:collapse;font-size:14px}th,td{padding:10px;border:1px solid #cad8d3;text-align:right}th{background:#e8f2ee;color:#145d4d}tr:nth-child(even){background:#f8fbfa}.negative{color:#b42318;font-weight:700}</style></head><body><header><h1>${escapeHtml(state.settings?.storeName || "حسابي")}</h1><p>تقرير تشغيلي · من ${escapeHtml(state.reportFrom || "بداية السجل")} إلى ${escapeHtml(state.reportTo || "اليوم")}</p></header><table><thead><tr><th>${rows[0][0]}</th><th>${rows[0][1]}</th></tr></thead><tbody>${rows.slice(1).map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td class="${String(value).startsWith("−") || String(value).startsWith("-") ? "negative" : ""}">${escapeHtml(value)}</td></tr>`).join("")}</tbody></table></body></html>`; }
function downloadGeneratedFile(file) { const url = URL.createObjectURL(file); const anchor = Object.assign(document.createElement("a"), { href: url, download: file.name }); document.body.appendChild(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 0); }
function downloadReportCsv() { try { const rows = reportExportRows(); const escapeCsv = (value) => `"${String(value).replaceAll('"', '""')}"`; downloadGeneratedFile(new File([`\uFEFF${rows.map((row) => row.map(escapeCsv).join(",")).join("\n")}`], `hesabi-report-${dateKey()}.csv`, { type: "text/csv;charset=utf-8" })); showToast("تم تصدير تقرير CSV"); } catch (error) { showToast(error.message || "تعذر تصدير التقرير.", "error"); } }
async function downloadReportPdf() { try { const file = await createReportPdfFile({ rows: reportExportRows(), storeName: state.settings?.storeName || "حسابي", from: state.reportFrom || "بداية السجل", to: state.reportTo || "اليوم", filename: `hesabi-report-${dateKey()}.pdf` }); downloadGeneratedFile(file); showToast("تم تصدير تقرير PDF"); } catch (error) { showToast(error.message || "تعذر إنشاء تقرير PDF.", "error"); } }
function downloadReportDoc() { try { downloadGeneratedFile(new File([`\uFEFF${reportExportHtml()}`], `hesabi-report-${dateKey()}.doc`, { type: "application/msword" })); showToast("تم تصدير تقرير DOC"); } catch (error) { showToast(error.message || "تعذر إنشاء تقرير DOC.", "error"); } }
function openReportExportDialog() { const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">تصدير التقرير</span><h2>اختر صيغة الملف</h2><p class="dialog__subtext">ينشأ الملف على جهازك من نطاق التقرير الحالي.</p></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><div class="report-export-options"><button class="button button--primary" data-report-export="csv">CSV للجداول</button><button class="button button--secondary" data-report-export="pdf">PDF للطباعة والمشاركة</button><button class="button button--secondary" data-report-export="doc">DOC لبرامج المستندات</button></div>`); overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog)); overlay.querySelectorAll("[data-report-export]").forEach((button) => button.addEventListener("click", async () => { const format = button.dataset.reportExport; if (format === "csv") downloadReportCsv(); else if (format === "pdf") await downloadReportPdf(); else downloadReportDoc(); closeDialog(); })); }

async function restoreBackupFromFile(event) { const file = event.currentTarget.files?.[0]; if (!file) return; try { const parsed = JSON.parse(await file.text()); db.validateBackup(parsed); if (!window.confirm("ستستبدل الاستعادة كل بيانات هذا الجهاز بالنسخة المختارة. ستعود بعد ذلك إلى شاشة الدخول. هل تريد المتابعة؟")) { event.currentTarget.value = ""; return; } await db.restoreBackup(parsed); await db.clearPersistentSession(); state.settings = await db.getSettings(); state.accounts = await db.listAccounts(); state.currentUser = null; state.cart = []; state.view = "sales"; await refresh(); render(); showToast("تمت استعادة النسخة الاحتياطية بنجاح"); } catch (error) { showToast(error.message || "تعذر استعادة ملف النسخة الاحتياطية.", "error"); } finally { event.currentTarget.value = ""; } }

async function resetAllData() { if (!window.confirm("سيُمسح كل السجل المحلي على هذا الجهاز. صدّر نسخة احتياطية أولًا. هل تريد المتابعة؟")) return; if (!window.confirm("تأكيد نهائي: لا يمكن التراجع من داخل التطبيق. هل تمضي في المسح؟")) return; try { await db.resetAllData(); state.settings = null; state.cart = []; state.view = "dashboard"; await refresh(); render(); showToast("مُسحت البيانات المحلية. يمكنك بدء سجل متجر جديد."); } catch (error) { showToast(error.message, "error"); } }

async function toggleTheme() { try { const theme = state.settings?.theme === "dark" ? "light" : "dark"; await db.saveSettings({ ...state.settings, theme }); state.settings = await db.getSettings(); applyTheme(); render(); showToast(theme === "dark" ? "تم تفعيل الوضع الداكن" : "تم تفعيل الوضع الفاتح"); } catch (error) { showToast(error.message, "error"); } }

function openCheckoutDialog() {
  const initial = calculateSaleTotals(state.cart, 0);
  const paymentMethodToggle = `<fieldset class="payment-method-toggle"><legend>طريقة التحصيل</legend><input type="hidden" name="paymentMethod" value="نقدي" /><button class="payment-method-toggle__button is-selected is-cash" type="button" data-sale-payment-method="نقدي">كاش</button><button class="payment-method-toggle__button is-transfer" type="button" data-sale-payment-method="تحويل">تحويل</button></fieldset>`;
  const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">تثبيت الفاتورة</span><h2>مراجعة البيع</h2></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><div class="checkout-lines">${state.cart.map((line) => `<div><span>${escapeHtml(line.name)} × ${amount(line.quantity)}</span><strong>${money(line.unitPrice * line.quantity)}</strong></div>`).join("")}</div><form id="checkout-form" class="form-grid"><label>الخصم<input name="discount" type="number" inputmode="decimal" min="0" step="0.01" /></label>${paymentMethodToggle}<fieldset class="payment-type form-full"><legend>نوع الدفع</legend><label><input name="paymentType" type="radio" value="نقدي" checked /> نقدي</label><label><input name="paymentType" type="radio" value="آجل" /> آجل</label></fieldset><label id="credit-customer-field" class="form-full" hidden>العميل<select name="customerId"><option value="">اختر العميل</option>${state.customers.map((customer) => `<option value="${customer.id}">${escapeHtml(customer.name)}${toNumber(customer.balance) ? ` — رصيد ${money(customer.balance)}` : ""}</option>`).join("")}</select></label><label class="form-full">المبلغ المدفوع<input id="paid-amount" name="paidAmount" type="number" inputmode="decimal" min="0" max="${initial.total}" step="0.01" value="${initial.total}" required /></label><div class="credit-summary form-full" id="credit-summary" hidden><span>المبلغ المتبقي</span><strong id="remaining-amount">${money(0)}</strong><small id="payment-status">مدفوعة</small></div><div class="checkout-total form-full"><span>الإجمالي النهائي</span><strong id="checkout-total">${money(initial.total)}</strong></div><div class="dialog__actions form-full"><button type="button" class="button button--secondary" data-dialog-close>رجوع</button><button type="submit" class="button button--primary">تأكيد البيع ${icon("check", 17)}</button></div></form>`);
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog));
  const form = overlay.querySelector("#checkout-form"); const paidInput = overlay.querySelector("#paid-amount"); const creditField = overlay.querySelector("#credit-customer-field"); const creditSummary = overlay.querySelector("#credit-summary");
  const setPaymentMethod = (method) => { form.paymentMethod.value = method; overlay.querySelectorAll("[data-sale-payment-method]").forEach((button) => button.classList.toggle("is-selected", button.dataset.salePaymentMethod === method)); };
  overlay.querySelectorAll("[data-sale-payment-method]").forEach((button) => button.addEventListener("click", () => setPaymentMethod(button.dataset.salePaymentMethod)));
  const totalsForForm = () => calculateSaleTotals(state.cart, form.discount.value);
  const syncCheckout = () => { const totals = totalsForForm(); const isCredit = form.paymentType.value === "آجل"; paidInput.max = totals.total; paidInput.disabled = isCredit; paidInput.value = isCredit ? 0 : totals.total; const remaining = Math.max(0, totals.total - toNumber(paidInput.value)); overlay.querySelector("#checkout-total").textContent = money(totals.total); overlay.querySelector("#remaining-amount").textContent = money(remaining); overlay.querySelector("#payment-status").textContent = isCredit ? "غير مدفوعة — يُسجل التحصيل لاحقًا من حساب العميل" : "مدفوعة"; creditField.hidden = !isCredit; creditSummary.hidden = !isCredit; };
  form.querySelectorAll("[name=paymentType]").forEach((input) => input.addEventListener("change", syncCheckout)); form.discount.addEventListener("input", syncCheckout);
  syncCheckout();
  form.addEventListener("submit", async (event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); try { const sale = await db.completeSale({ items: state.cart, ...values }); state.cart = []; await refresh(); closeDialog(); state.view = "invoices"; render(); showToast(sale.paymentType === "آجل" ? `حُفظت الفاتورة ${sale.invoiceNumber} وربطت بحساب العميل` : `تم حفظ الفاتورة ${sale.invoiceNumber} وخصم المخزون`); } catch (error) { showToast(error.message, "error"); } });
}

async function openInvoiceDialog(saleId) {
  const invoice = await db.getInvoice(saleId);
  if (!invoice) return;
  const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">فاتورة محفوظة</span><h2>${invoice.invoiceNumber}</h2><p class="dialog__subtext">${dateTime(invoice.date)} · ${escapeHtml(invoice.paymentType || "نقدي")} · ${escapeHtml(invoice.paymentStatus || "مدفوعة")}</p></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><div class="invoice-detail">${invoice.items.map((item) => `<div><span><strong>${escapeHtml(item.productName)}</strong><small>${amount(item.quantity)} ${escapeHtml(item.unit)} × ${money(item.unitPrice)}${toNumber(item.returnedQuantity) ? ` · مرتجع ${amount(item.returnedQuantity)}` : ""}</small></span><strong>${money(item.total)}</strong></div>`).join("")}<div class="invoice-detail__total"><span>الإجمالي قبل الخصم</span><strong>${money(invoice.subtotal)}</strong></div><div><span>الخصم</span><strong>${money(invoice.discount)}</strong></div><div class="invoice-detail__final"><span>الإجمالي النهائي</span><strong>${money(invoice.total)}</strong></div>${invoice.customerName ? `<div><span>العميل</span><strong>${escapeHtml(invoice.customerName)}</strong></div>` : ""}<div><span>المبلغ المدفوع</span><strong>${money(invoice.paidAmount)}</strong></div>${invoice.paymentType === "آجل" ? `<div><span>المبلغ المتبقي</span><strong>${money(invoice.remainingAmount)}</strong></div>` : ""}</div><div class="dialog__actions"><button id="sale-return" class="button button--secondary" type="button">مرتجع بيع ${icon("rotate", 17)}</button>${invoice.customerId ? `<button id="open-invoice-customer" class="button button--secondary" type="button">حساب العميل</button>` : ""}<button class="button button--primary" data-dialog-close>إغلاق الفاتورة</button></div>`);
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog));
  overlay.querySelector("#sale-return").addEventListener("click", () => { closeDialog(); openSaleReturnDialog(saleId); });
  overlay.querySelector("#open-invoice-customer")?.addEventListener("click", () => { closeDialog(); openCustomerAccountDialog(invoice.customerId); });
  const channel = paymentChannelLabel(invoice);
  overlay.querySelector(".dialog__subtext").textContent = `${dateTime(invoice.date)} · ${channel} · ${invoice.paymentStatus || "مدفوعة"}`;
  overlay.querySelector(".invoice-detail").insertAdjacentHTML("beforeend", `<div><span>طريقة السداد</span><strong>${channel}</strong></div>${invoice.paymentType === "آجل" && toNumber(invoice.paidAmount) > 0 ? `<div><span>وسيلة الدفعة الأولى</span><strong>${invoice.paymentMethod === "تحويل" ? "تحويل" : "كاش"}</strong></div>` : ""}`);
  overlay.querySelector(".dialog__actions").insertAdjacentHTML("afterbegin", `<button id="share-invoice" class="button button--secondary" type="button">مشاركة PDF</button><button id="thermal-print-invoice" class="button button--secondary" type="button">طباعة حرارية</button>`);
  overlay.querySelector("#share-invoice").addEventListener("click", () => shareInvoice(invoice));
  overlay.querySelector("#thermal-print-invoice").addEventListener("click", () => printInvoiceThermal(invoice));
}

function invoiceShareText(invoice) {
  const lines = invoice.items.map((item) => `- ${item.productName}: ${amount(item.quantity)} ${item.unit} × ${money(item.unitPrice)} = ${money(item.total)}`).join("\n");
  return `${state.settings?.storeName || "حسابي"}\nفاتورة ${invoice.invoiceNumber}\n${dateTime(invoice.date)}\nطريقة السداد: ${paymentChannelLabel(invoice)}\n${lines}\nالإجمالي: ${money(invoice.total)}\nالمدفوع: ${money(invoice.paidAmount)}${invoice.paymentType === "آجل" ? `\nالمتبقي: ${money(invoice.remainingAmount)}` : ""}`;
}

async function copyTextForSharing(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const area = Object.assign(document.createElement("textarea"), { value: text }); area.style.position = "fixed"; area.style.opacity = "0"; document.body.appendChild(area); area.select(); document.execCommand("copy"); area.remove();
}

async function shareInvoice(invoice) {
  try {
    const customer = invoice.customerId ? state.customers.find((entry) => entry.id === invoice.customerId) || await db.getCustomer(invoice.customerId) : null;
    const invoiceWithCustomer = customer && !invoice.customerName ? { ...invoice, customerName: customer.name } : invoice;
    const result = await shareOrDownloadInvoicePdf({ invoice: invoiceWithCustomer, customer, storeName: state.settings?.storeName || "حسابي", formatMoney: money, formatAmount: amount, formatDateTime: dateTime, paymentLabel: paymentChannelLabel(invoiceWithCustomer), filename: `${invoice.invoiceNumber}.pdf`, title: `فاتورة ${invoice.invoiceNumber}` });
    showToast(result === "shared" ? "تمت مشاركة ملف الفاتورة PDF" : "تم تنزيل ملف الفاتورة PDF للمشاركة");
  } catch (error) { if (error?.name !== "AbortError") showToast("تعذر إنشاء ملف PDF للفواتير الآن.", "error"); }
}

function thermalInvoiceHtml(invoice) {
  const customer = invoice.customerId ? state.customers.find((item) => item.id === invoice.customerId) || null : null;
  return renderThermalInvoiceHtml({ invoice, customer, storeName: state.settings?.storeName || "حسابي", formatMoney: money, formatAmount: amount, formatDateTime: dateTime, escapeHtml, paymentLabel: paymentChannelLabel(invoice) });
}

function printInvoiceThermal(invoice) {
  if (!printHtmlDocument({ html: thermalInvoiceHtml(invoice), target: "hesabi-thermal-invoice", features: "width=420,height=720" })) showToast("السماح بالنوافذ المنبثقة مطلوب للطباعة الحرارية.", "error");
}

function openSupplierDialog(supplier = null) {
  const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">${supplier ? "تحديث مورد" : "مورد جديد"}</span><h2>${supplier ? `تعديل ${escapeHtml(supplier.name)}` : "إضافة مورد"}</h2></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><form id="supplier-form" class="form-grid"><label>اسم المورد<input name="name" required maxlength="100" dir="rtl" value="${escapeHtml(supplier?.name || "")}" autofocus /></label>${phoneFieldMarkup("supplier-phone", supplier?.phone || "")}<label class="form-full">العنوان<input name="address" dir="rtl" value="${escapeHtml(supplier?.address || "")}" /></label><label class="form-full">ملاحظات<textarea name="notes" dir="rtl">${escapeHtml(supplier?.notes || "")}</textarea></label><div class="dialog__actions form-full"><button class="button button--secondary" type="button" data-dialog-close>إلغاء</button><button class="button button--primary" type="submit">حفظ ${icon("check", 17)}</button></div></form>`);
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog));
  bindContactPicker(overlay, "supplier-phone");
  overlay.querySelector("#supplier-form").addEventListener("submit", async (event) => { event.preventDefault(); try { const values = Object.fromEntries(new FormData(event.currentTarget)); if (supplier) await db.updateSupplier(supplier.id, values); else await db.createSupplier(values); await refresh(); closeDialog(); render(); showToast(supplier ? "تم تعديل المورد" : "تم حفظ المورد"); } catch (error) { showToast(error.message, "error"); } });
}

async function deleteSupplier(supplierId) { if (!window.confirm("هل تريد حذف المورد من القائمة؟")) return; try { await db.softDeleteSupplier(supplierId); await refresh(); render(); showToast("تم حذف المورد من القائمة"); } catch (error) { showToast(error.message, "error"); } }

async function openSupplierAccountDialog(supplierId) {
  const account = await db.getSupplierAccount(supplierId); if (!account) return; const typeLabel = { PURCHASE: "شراء", PAYMENT: "دفعة للمورد", PURCHASE_RETURN: "مرتجع شراء" };
  const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">حساب المورد</span><h2>${escapeHtml(account.supplier.name)}</h2><p class="dialog__subtext">${escapeHtml(account.supplier.phone || account.supplier.address || "لا توجد بيانات اتصال")}</p></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><section class="account-summary"><div><span>إجمالي المشتريات</span><strong>${money(account.totalPurchases)}</strong></div><div><span>إجمالي المسدد</span><strong>${money(account.totalPaid)}</strong></div><div class="account-summary__balance"><span>المستحق للمورد</span><strong>${money(account.balance)}</strong></div></section><div class="dialog__actions"><button id="record-supplier-payment" class="button button--primary" data-action="record-supplier-payment" data-id="${account.supplier.id}" ${toNumber(account.balance) <= 0 ? "disabled" : ""}>تسجيل دفعة ${icon("wallet", 17)}</button><button class="button button--secondary" data-dialog-close>إغلاق</button></div><section class="account-transactions"><div class="section-caption"><span class="eyebrow">سجل الحساب</span><strong>العمليات المرتبطة</strong></div>${account.transactions.length ? account.transactions.map((transaction) => `<article><div><strong>${typeLabel[transaction.type] || transaction.type}</strong><small>${dateTime(transaction.date)}${transaction.invoiceNumber ? ` · ${escapeHtml(transaction.invoiceNumber)}` : ""}</small></div><div><strong class="${toNumber(transaction.amount) < 0 ? "is-negative" : ""}">${money(transaction.amount)}</strong><small>الرصيد: ${money(transaction.remainingAmount)}</small></div></article>`).join("") : `<div class="inline-empty">لا توجد عمليات على حساب هذا المورد.</div>`}</section>`);
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog)); overlay.querySelector("#record-supplier-payment")?.addEventListener("click", () => { closeDialog(); openSupplierPaymentDialog(account.supplier.id); });
}

async function openSupplierPaymentDialog(supplierId = "") {
  const payableSuppliers = state.suppliers.filter((supplier) => toNumber(supplier.balance) > 0);
  if (!payableSuppliers.length) { showToast("لا يوجد مورد لديه مبلغ مستحق لتسجيل دفعة.", "error"); return; }
  const selectedId = payableSuppliers.some((supplier) => supplier.id === supplierId) ? supplierId : payableSuppliers[0].id;
  const supplierOptions = payableSuppliers.map((supplier) => `<option value="${supplier.id}" ${supplier.id === selectedId ? "selected" : ""}>${escapeHtml(supplier.name)} — مستحق ${money(supplier.balance)}</option>`).join("");
  const supplierSelect = supplierId ? `<input name="supplierId" type="hidden" value="${selectedId}" />` : `<label class="form-full">المورد<select id="supplier-payment-supplier" name="supplierId" required>${supplierOptions}</select></label>`;
  const selectedSupplier = payableSuppliers.find((supplier) => supplier.id === selectedId);
  const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">تسديد مورد</span><h2>${supplierId ? `دفعة إلى ${escapeHtml(selectedSupplier.name)}` : "تسجيل دفعة مورد"}</h2><p class="dialog__subtext">تسوّي الدفعة فواتير الشراء الآجلة للمورد، وتدخل في الصندوق عند الدفع النقدي أو التحويلات عند الاختيار.</p></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><div id="supplier-payment-balance" class="stock-before"><span>المستحق الحالي</span><strong>${money(selectedSupplier.balance)}</strong></div><form id="supplier-payment-form" class="form-grid">${supplierSelect}<label>المبلغ${quantityControlMarkup({ value: "", min: 0.01, step: "0.01", inputAttrs: `name="amount" required autofocus max="${toNumber(selectedSupplier.balance)}"` })}</label><label>طريقة الدفع<select name="paymentMethod">${PAYMENT_METHODS.map((method) => `<option value="${method}">${method}</option>`).join("")}</select></label><label>التاريخ<input name="date" required type="date" value="${dateKey()}" /></label><label class="form-full">ملاحظات<textarea name="notes" dir="rtl" placeholder="اختياري"></textarea></label><div class="dialog__actions form-full"><button class="button button--secondary" type="button" data-dialog-close>إلغاء</button><button class="button button--primary" type="submit">حفظ الدفعة ${icon("check", 17)}</button></div></form>`);
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog));
  const paymentForm = overlay.querySelector("#supplier-payment-form"); const amountInput = paymentForm.querySelector("[name=amount]"); const balanceBox = overlay.querySelector("#supplier-payment-balance");
  const syncSupplierContext = () => { const currentId = paymentForm.elements.supplierId?.value || selectedId; const supplier = payableSuppliers.find((item) => item.id === currentId); if (!supplier) return; balanceBox.querySelector("strong").textContent = money(supplier.balance); amountInput.max = String(toNumber(supplier.balance)); if (toNumber(amountInput.value) > toNumber(supplier.balance)) amountInput.value = ""; };
  paymentForm.querySelector("#supplier-payment-supplier")?.addEventListener("change", syncSupplierContext);
  bindQuantityControl(overlay.querySelector(".quantity-control"), { min: 0.01, step: 0.01, onChange: () => {} });
  paymentForm.addEventListener("submit", async (event) => { event.preventDefault(); try { const values = Object.fromEntries(new FormData(event.currentTarget)); const payment = await db.registerSupplierPayment({ supplierId: values.supplierId || selectedId, ...values }); await refresh(); closeDialog(); openSupplierPaymentReceipt(payment); } catch (error) { showToast(error.message, "error"); } });
}

function openSupplierPaymentReceipt(payment) {
  const overlay = openDialog(`<div class="dialog__head receipt-head"><div><span class="eyebrow">إيصال دفعة مورد</span><h2>${escapeHtml(state.settings?.storeName || "حسابي")}</h2></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><section id="supplier-payment-receipt" class="payment-receipt"><div><span>المورد</span><strong>${escapeHtml(payment.supplierName)}</strong></div><div><span>التاريخ</span><strong>${payment.date}</strong></div><div><span>المبلغ المدفوع</span><strong>${money(payment.amount)}</strong></div><div><span>الرصيد قبل الدفع</span><strong>${money(payment.balanceBefore)}</strong></div><div><span>الرصيد بعد الدفع</span><strong>${money(payment.balanceAfter)}</strong></div><div><span>طريقة الدفع</span><strong>${escapeHtml(payment.paymentMethod)}</strong></div></section><div class="dialog__actions"><button id="print-supplier-receipt" class="button button--primary">طباعة الإيصال</button></div>`); overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog)); overlay.querySelector("#print-supplier-receipt").addEventListener("click", () => window.print());
}

function openCustomerDialog(customer = null) {
  const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">${customer ? "تحديث عميل" : "عميل جديد"}</span><h2>${customer ? `تعديل ${escapeHtml(customer.name)}` : "إضافة عميل"}</h2></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><form id="customer-form" class="form-grid"><label>اسم العميل<input name="name" required maxlength="100" dir="rtl" value="${escapeHtml(customer?.name || "")}" autofocus /></label>${phoneFieldMarkup("customer-phone", customer?.phone || "")}<label class="form-full">العنوان<input name="address" dir="rtl" value="${escapeHtml(customer?.address || "")}" /></label><label class="form-full">ملاحظات<textarea name="notes" dir="rtl">${escapeHtml(customer?.notes || "")}</textarea></label><div class="dialog__actions form-full"><button class="button button--secondary" type="button" data-dialog-close>إلغاء</button><button class="button button--primary" type="submit">حفظ العميل ${icon("check", 17)}</button></div></form>`);
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog));
  bindContactPicker(overlay, "customer-phone");
  overlay.querySelector("#customer-form").addEventListener("submit", async (event) => { event.preventDefault(); try { const values = Object.fromEntries(new FormData(event.currentTarget)); if (customer) await db.updateCustomer(customer.id, values); else await db.createCustomer(values); await refresh(); closeDialog(); state.view = "customers"; render(); showToast(customer ? "تم تعديل العميل" : "تم حفظ العميل"); } catch (error) { showToast(error.message, "error"); } });
}

async function deleteCustomer(customerId) { if (!window.confirm("هل تريد إخفاء العميل من القائمة؟ سيبقى تاريخه وفواتيره محفوظين.")) return; try { await db.softDeleteCustomer(customerId); await refresh(); render(); showToast("أُخفي العميل مع الحفاظ على سجله التاريخي."); } catch (error) { showToast(error.message, "error"); } }

async function openCustomerAccountDialog(customerId) {
  const account = await db.getCustomerAccount(customerId); if (!account) return; const typeLabel = { CREDIT_SALE: "بيع آجل", PAYMENT: "دفعة عميل", SALE_RETURN: "مرتجع بيع" };
  const printAccount = { ...account, transactions: account.transactions.map((transaction) => ({ ...transaction, typeLabel: typeLabel[transaction.type] || transaction.type })) };
  const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">حساب العميل</span><h2>${escapeHtml(account.customer.name)}</h2><p class="dialog__subtext">${escapeHtml(account.customer.phone || account.customer.address || "لا توجد بيانات اتصال")}</p></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><section class="account-summary"><div><span>إجمالي المبيعات</span><strong>${money(account.totalSales)}</strong></div><div><span>إجمالي المدفوع</span><strong>${money(account.totalPaid)}</strong></div><div class="account-summary__balance"><span>الرصيد المستحق</span><strong>${money(account.balance)}</strong></div></section><div class="dialog__actions"><button id="share-customer-account" class="button button--secondary" type="button">مشاركة PDF</button><button id="print-customer-account" class="button button--secondary" type="button">طباعة الحساب</button><button id="record-customer-payment" class="button button--primary" data-action="record-customer-payment" data-id="${account.customer.id}" ${toNumber(account.balance) <= 0 ? "disabled" : ""}>تسجيل دفعة ${icon("wallet", 17)}</button><button class="button button--secondary" data-dialog-close>إغلاق</button></div><section class="account-transactions"><div class="section-caption"><span class="eyebrow">سجل الحساب</span><strong>العمليات المرتبطة</strong></div>${account.transactions.length ? account.transactions.map((transaction) => `<article><div><strong>${typeLabel[transaction.type] || transaction.type}</strong><small>${dateTime(transaction.date)}${transaction.invoiceNumber ? ` · ${escapeHtml(transaction.invoiceNumber)}` : ""}</small></div><div><strong class="${toNumber(transaction.amount) < 0 ? "is-negative" : ""}">${money(transaction.amount)}</strong><small>الرصيد: ${money(transaction.remainingAmount)}</small></div></article>`).join("") : `<div class="inline-empty">لا توجد عمليات على حساب هذا العميل.</div>`}</section>`);
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog));
  overlay.querySelector("#record-customer-payment")?.addEventListener("click", () => { closeDialog(); openCustomerPaymentDialog(account.customer.id); });
  const accountHtml = () => renderCustomerAccountHtml({ account: printAccount, storeName: state.settings?.storeName || "حسابي", formatMoney: money, formatDateTime: dateTime, escapeHtml });
  overlay.querySelector("#print-customer-account").addEventListener("click", () => { if (!printHtmlDocument({ html: accountHtml(), target: "hesabi-customer-account", features: "width=900,height=760" })) showToast("السماح بالنوافذ المنبثقة مطلوب للطباعة.", "error"); });
  overlay.querySelector("#share-customer-account").addEventListener("click", async () => { try { const result = await shareOrDownloadCustomerAccountPdf({ account: printAccount, storeName: state.settings?.storeName || "حسابي", formatMoney: money, formatDateTime: dateTime, filename: `كشف-حساب-${account.customer.name}.pdf`, title: `كشف حساب ${account.customer.name}` }); showToast(result === "shared" ? "تمت مشاركة كشف الحساب PDF" : "تم تنزيل كشف الحساب PDF للمشاركة"); } catch (error) { if (error?.name !== "AbortError") showToast("تعذر إنشاء PDF لكشف الحساب.", "error"); } });
}

async function openCustomerPaymentDialog(customerId) {
  const account = await db.getCustomerAccount(customerId); if (!account) return; const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">تسديد رصيد</span><h2>دفعة من ${escapeHtml(account.customer.name)}</h2></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><div class="stock-before"><span>الرصيد الحالي</span><strong>${money(account.balance)}</strong></div><form id="customer-payment-form" class="form-grid"><label>المبلغ${quantityControlMarkup({ value: "", min: 0.01, step: "0.01", inputAttrs: "name=\"amount\" required autofocus" })}</label><label>طريقة التحصيل<select name="paymentMethod">${PAYMENT_METHODS.map((method) => `<option value="${method}">${method === "تحويل" ? "تحويل" : "كاش"}</option>`).join("")}</select></label><label>التاريخ<input name="date" required type="date" value="${dateKey()}" /></label><label class="form-full">ملاحظات<textarea name="notes" dir="rtl" placeholder="اختياري"></textarea></label><div class="dialog__actions form-full"><button class="button button--secondary" type="button" data-dialog-close>إلغاء</button><button class="button button--primary" type="submit">حفظ الدفعة ${icon("check", 17)}</button></div></form>`);
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog)); bindQuantityControl(overlay.querySelector(".quantity-control"), { min: 0.01, step: 0.01, onChange: () => {} });
  overlay.querySelector("#customer-payment-form").addEventListener("submit", async (event) => { event.preventDefault(); try { const values = Object.fromEntries(new FormData(event.currentTarget)); const payment = await db.registerCustomerPayment({ customerId, ...values }); await refresh(); closeDialog(); openPaymentReceipt(payment); } catch (error) { showToast(error.message, "error"); } });
}

function openPaymentReceipt(payment) {
  const overlay = openDialog(`<div class="dialog__head receipt-head"><div><span class="eyebrow">إيصال دفعة</span><h2>${escapeHtml(state.settings?.storeName || "حسابي")}</h2></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><section id="payment-receipt" class="payment-receipt"><div><span>العميل</span><strong>${escapeHtml(payment.customerName)}</strong></div><div><span>التاريخ</span><strong>${payment.date}</strong></div><div><span>المبلغ المدفوع</span><strong>${money(payment.amount)}</strong></div><div><span>طريقة التحصيل</span><strong>${payment.paymentMethod === "تحويل" ? "تحويل" : "كاش"}</strong></div><div><span>الرصيد قبل الدفع</span><strong>${money(payment.balanceBefore)}</strong></div><div><span>الرصيد بعد الدفع</span><strong>${money(payment.balanceAfter)}</strong></div><div><span>العملة</span><strong>${escapeHtml(state.settings?.currency || "YER")}</strong></div></section><div class="dialog__actions"><button id="share-receipt" class="button button--secondary">مشاركة الإيصال</button><button id="print-receipt" class="button button--primary">طباعة إيصال</button></div>`);
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog));
  overlay.querySelector("#print-receipt").addEventListener("click", () => window.print());
  overlay.querySelector("#share-receipt").addEventListener("click", async () => { const text = `${state.settings?.storeName || "حسابي"}\nإيصال دفعة\nالعميل: ${payment.customerName}\nالمبلغ: ${money(payment.amount)}\nالرصيد بعد الدفع: ${money(payment.balanceAfter)}`; try { if (navigator.share) await navigator.share({ title: "إيصال دفعة", text }); else { await navigator.clipboard.writeText(text); showToast("تم نسخ الإيصال للمشاركة"); } } catch { showToast("تعذرت مشاركة الإيصال الآن.", "error"); } });
}

function openExpenseDialog(expense = null) {
  const initialPeriod = expense?.periodType === "monthly" ? "monthly" : "daily";
  const initialCategories = initialPeriod === "monthly" ? MONTHLY_EXPENSE_CATEGORIES : DAILY_EXPENSE_CATEGORIES;
  const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">${expense ? "تعديل المصروف" : "مصروف جديد"}</span><h2>${expense ? "تحديث بيانات المصروف" : "إضافة مصروف"}</h2></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><form id="expense-form" class="form-grid"><fieldset class="payment-type form-full"><legend>دورية المصروف</legend><label><input name="periodType" type="radio" value="daily" ${initialPeriod === "daily" ? "checked" : ""} /> يومي — مثل الأكل والشرب والمواصلات</label><label><input name="periodType" type="radio" value="monthly" ${initialPeriod === "monthly" ? "checked" : ""} /> شهري — مثل الإيجار والكهرباء والماء</label></fieldset><label>المبلغ<input name="amount" required type="number" min="0.01" step="0.01" value="${expense?.amount || ""}" autofocus /></label><label>فئة المصروف<select name="category">${initialCategories.map((category) => `<option value="${category}" ${expense?.category === category ? "selected" : ""}>${category}</option>`).join("")}</select></label><label><span id="expense-date-label">${initialPeriod === "monthly" ? "شهر الاستحقاق" : "تاريخ المصروف"}</span><input name="date" required type="date" value="${expense?.date || dateKey()}" /></label><label>الوصف<input name="description" dir="rtl" value="${escapeHtml(expense?.description || "")}" /></label><p id="expense-allocation-note" class="form-full scanner-session-note">${initialPeriod === "monthly" ? "سيُوزع هذا المبلغ تلقائيًا على أيام الشهر ويدخل في الأرباح والتقارير بالحصة اليومية فقط." : "يسجل هذا المبلغ مباشرة ضمن مصروفات اليوم."}</p><label class="form-full">ملاحظات<textarea name="notes" dir="rtl">${escapeHtml(expense?.notes || "")}</textarea></label><div class="dialog__actions form-full"><button class="button button--secondary" type="button" data-dialog-close>إلغاء</button><button class="button button--primary" type="submit">حفظ المصروف ${icon("check", 17)}</button></div></form>`);
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog));
  const form = overlay.querySelector("#expense-form"); const categorySelect = form.category; const dateLabel = overlay.querySelector("#expense-date-label"); const allocationNote = overlay.querySelector("#expense-allocation-note");
  const syncExpensePeriod = () => { const isMonthly = form.periodType.value === "monthly"; const categories = isMonthly ? MONTHLY_EXPENSE_CATEGORIES : DAILY_EXPENSE_CATEGORIES; const current = categorySelect.value; categorySelect.innerHTML = categories.map((category) => `<option value="${category}" ${category === current ? "selected" : ""}>${category}</option>`).join(""); dateLabel.textContent = isMonthly ? "شهر الاستحقاق" : "تاريخ المصروف"; allocationNote.textContent = isMonthly ? "سيُوزع هذا المبلغ تلقائيًا على أيام الشهر ويدخل في الأرباح والتقارير بالحصة اليومية فقط." : "يسجل هذا المبلغ مباشرة ضمن مصروفات اليوم."; };
  form.querySelectorAll("[name=periodType]").forEach((input) => input.addEventListener("change", syncExpensePeriod));
  form.addEventListener("submit", async (event) => { event.preventDefault(); try { const values = Object.fromEntries(new FormData(event.currentTarget)); if (expense) await db.updateExpense(expense.id, values); else await db.createExpense(values); await refresh(); closeDialog(); render(); showToast(expense ? "تم تعديل المصروف" : "تم حفظ المصروف"); } catch (error) { showToast(error.message, "error"); } });
}

async function deleteExpense(expenseId) { if (!window.confirm("هل تريد حذف المصروف؟")) return; try { await db.deleteExpense(expenseId); await refresh(); render(); showToast("تم حذف المصروف"); } catch (error) { showToast(error.message, "error"); } }

async function openPurchaseDialog(purchaseIdOrDraft = null) {
  if (typeof purchaseIdOrDraft === "string") { openPurchaseDetail(await db.getPurchase(purchaseIdOrDraft)); return; }
  const draft = purchaseIdOrDraft || { supplierId: "", notes: "", lines: [], paymentType: "نقدي", paidAmount: "", paymentMethod: "نقدي" };
  const makePurchaseLine = (product, values = {}) => {
    const packageUnit = values.packageUnit || product.purchasePackageUnit || businessProfile().defaultPackageUnit;
    const packageQuantity = values.packageQuantity ?? values.quantity ?? 1;
    const unitsPerPackage = values.unitsPerPackage ?? product.unitsPerPackage ?? 1;
    const packageCost = values.packageCost ?? (values.unitCost === undefined ? (product.lastPackageCost || toNumber(product.purchasePrice) * toNumber(unitsPerPackage)) : toNumber(values.unitCost) * toNumber(unitsPerPackage));
    return { productId: product.id, productName: product.name, unit: product.unit || businessProfile().defaultUnit, packageUnit, salePrice: values.salePrice ?? product.salePrice ?? 0, batchNumber: values.batchNumber || "", expiryDate: values.expiryDate || "", ...values, ...calculatePackagePurchase({ packageQuantity, unitsPerPackage, packageCost }) };
  };
  const lines = (draft.lines || []).map((line) => makePurchaseLine(state.products.find((product) => product.id === line.productId) || line, line)); const isDraftCredit = draft.paymentType === "آجل";
  const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">إدخال شراء</span><h2>فاتورة شراء جديدة</h2></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><form id="purchase-form" class="purchase-form"><label id="purchase-supplier-field">المورد <small id="purchase-supplier-note">اختياري للنقدي</small><select name="supplierId"><option value="">بدون مورد</option>${state.suppliers.map((supplier) => `<option value="${supplier.id}" ${draft.supplierId === supplier.id ? "selected" : ""}>${escapeHtml(supplier.name)}</option>`).join("")}</select></label><fieldset class="payment-type"><legend>نوع الدفع</legend><label><input name="paymentType" type="radio" value="نقدي" ${isDraftCredit ? "" : "checked"} /> نقدي</label><label><input name="paymentType" type="radio" value="آجل" ${isDraftCredit ? "checked" : ""} /> آجل</label></fieldset><label>طريقة الدفع<select name="paymentMethod">${PAYMENT_METHODS.map((method) => `<option value="${method}" ${draft.paymentMethod === method ? "selected" : ""}>${method}</option>`).join("")}</select></label><label>المبلغ المدفوع<input name="paidAmount" type="number" inputmode="decimal" min="0" step="0.01" value="${escapeHtml(draft.paidAmount ?? "")}" /></label><div class="credit-summary" id="purchase-credit-summary" hidden><span>المبلغ المتبقي للمورد</span><strong id="purchase-remaining-amount">${money(0)}</strong><small id="purchase-payment-status">مدفوعة</small></div><div class="purchase-picker"><label>إضافة منتج إلى الفاتورة<div class="purchase-search-control"><input id="purchase-product-search" dir="rtl" autocomplete="off" placeholder="ابحث بالاسم أو الباركود..." /><button id="purchase-scan-product" class="icon-button" type="button" title="مسح باركود للشراء" aria-label="مسح باركود للشراء">${icon("scan", 18)}</button></div></label><div id="purchase-product-results" class="purchase-product-results"></div><button id="purchase-new-product" class="text-button" type="button">${icon("plus", 16)} إضافة منتج جديد</button></div><div id="purchase-lines" class="purchase-lines"></div><label>ملاحظات<textarea name="notes" dir="rtl">${escapeHtml(draft.notes || "")}</textarea></label><div class="checkout-total"><span>إجمالي فاتورة الشراء</span><strong id="purchase-total">${money(0)}</strong></div><div class="dialog__actions"><button class="button button--secondary" type="button" data-dialog-close>إلغاء</button><button class="button button--primary" type="submit">حفظ فاتورة الشراء ${icon("check", 17)}</button></div></form>`);
  const form = overlay.querySelector("#purchase-form"); const search = overlay.querySelector("#purchase-product-search"); const results = overlay.querySelector("#purchase-product-results"); const linesHost = overlay.querySelector("#purchase-lines"); const paidInput = form.paidAmount; const supplierField = overlay.querySelector("#purchase-supplier-field"); const supplierNote = overlay.querySelector("#purchase-supplier-note"); const creditSummary = overlay.querySelector("#purchase-credit-summary");
  const hydrateBusinessPurchaseFields = () => {
    linesHost.querySelectorAll("[data-purchase-package-unit]").forEach((select) => { const index = Number(select.dataset.purchasePackageUnit); const line = lines[index]; if (!line) return; select.innerHTML = profileOptions("packageUnits", line.packageUnit).map((unit) => `<option value="${unit}" ${unit === line.packageUnit ? "selected" : ""}>${unit}</option>`).join(""); const labels = packageFieldLabels(line.packageUnit, line.unit); const quantityInput = linesHost.querySelector(`[data-purchase-package-quantity="${index}"]`); const unitsInput = linesHost.querySelector(`[data-purchase-units-per-package="${index}"]`); const costInput = linesHost.querySelector(`[data-purchase-package-cost="${index}"]`); if (quantityInput?.parentElement?.firstChild) quantityInput.parentElement.firstChild.textContent = labels.quantity; if (unitsInput?.parentElement?.firstChild) unitsInput.parentElement.firstChild.textContent = labels.units; if (costInput?.parentElement?.firstChild) costInput.parentElement.firstChild.textContent = labels.cost; });
    if (!isPharmacy()) return;
    linesHost.querySelectorAll(".purchase-line").forEach((row, index) => { if (row.querySelector("[data-purchase-batch-number]")) return; const line = lines[index]; row.querySelector(".purchase-line__total")?.insertAdjacentHTML("beforebegin", `<label>رقم التشغيلة<input data-purchase-batch-number="${index}" dir="ltr" required value="${escapeHtml(line.batchNumber || "")}" /></label><label>تاريخ الانتهاء<input data-purchase-expiry-date="${index}" type="date" required value="${escapeHtml(line.expiryDate || "")}" /></label>`); });
  };
  const purchaseFieldsObserver = new MutationObserver(hydrateBusinessPurchaseFields); purchaseFieldsObserver.observe(linesHost, { childList: true, subtree: true });
  linesHost.addEventListener("input", (event) => { const index = Number(event.target.dataset.purchaseBatchNumber ?? event.target.dataset.purchaseExpiryDate); if (!Number.isFinite(index)) return; if (event.target.dataset.purchaseBatchNumber !== undefined) lines[index].batchNumber = event.target.value.trim(); if (event.target.dataset.purchaseExpiryDate !== undefined) lines[index].expiryDate = event.target.value; });
  const getDraft = () => ({ supplierId: form.supplierId.value, notes: form.notes.value, paymentType: form.paymentType.value, paidAmount: paidInput.value, paymentMethod: form.paymentMethod.value, lines: lines.map((line) => ({ ...line })) });
  const refreshPackMath = (line) => Object.assign(line, calculatePackagePurchase({ packageQuantity: line.packageQuantity, unitsPerPackage: line.unitsPerPackage, packageCost: line.packageCost }));
  const syncPurchase = ({ resetPaid = false } = {}) => { const total = roundMoney(lines.reduce((sum, line) => sum + toNumber(line.total), 0)); const isCredit = form.paymentType.value === "آجل"; if (!isCredit) paidInput.value = total || ""; else if (resetPaid) paidInput.value = ""; if (toNumber(paidInput.value) > total) paidInput.value = total; const remaining = Math.max(0, total - toNumber(paidInput.value)); creditSummary.hidden = !isCredit; supplierField.classList.toggle("is-required", isCredit); supplierNote.textContent = isCredit ? "مطلوب للشراء الآجل" : "اختياري للنقدي"; overlay.querySelector("#purchase-total").textContent = money(total); overlay.querySelector("#purchase-remaining-amount").textContent = money(remaining); overlay.querySelector("#purchase-payment-status").textContent = remaining === 0 ? "مدفوعة" : toNumber(paidInput.value) > 0 ? "مدفوعة جزئيًا — دين المورد المتبقي" : "غير مدفوعة — دين للمورد"; };
  const packageLabels = (packageUnit) => ({ "حبة": { quantity: "عدد الحبات", units: "حبة/حبة", cost: "سعر الحبة" }, "علبة": { quantity: "عدد العلب", units: "حبة/علبة", cost: "سعر العلبة" }, "كرتون": { quantity: "عدد الكراتين", units: "حبة/كرتون", cost: "سعر الكرتون" }, "كيس": { quantity: "عدد الأكياس", units: "حبة/كيس", cost: "سعر الكيس" }, "حزمة": { quantity: "عدد الحزم", units: "حبة/حزمة", cost: "سعر الحزمة" }, "ربطة": { quantity: "عدد الربطات", units: "حبة/ربطة", cost: "سعر الربطة" }, "صندوق": { quantity: "عدد الصناديق", units: "حبة/صندوق", cost: "سعر الصندوق" } }[packageUnit] || { quantity: "عدد العبوات", units: "حبات/عبوة", cost: "سعر العبوة" });
  const renderLines = () => {
    linesHost.innerHTML = lines.length ? lines.map((line, index) => { const labels = packageLabels(line.packageUnit); return `<article class="purchase-line purchase-line--pack"><div><strong>${escapeHtml(line.productName)}</strong><small>سيضاف ${amount(line.quantity)} ${escapeHtml(line.unit)} إلى المخزون</small></div><label>نوع العبوة<select data-purchase-package-unit="${index}">${PACKAGE_UNITS.map((unit) => `<option value="${unit}" ${line.packageUnit === unit ? "selected" : ""}>${unit}</option>`).join("")}</select></label><label>${labels.quantity}<input data-purchase-package-quantity="${index}" type="number" inputmode="decimal" min="0.001" step="0.001" value="${line.packageQuantity || ""}" /></label><label>${labels.units}<input data-purchase-units-per-package="${index}" type="number" inputmode="numeric" min="1" step="1" value="${line.unitsPerPackage || ""}" /></label><label>${labels.cost}<input data-purchase-package-cost="${index}" type="number" inputmode="decimal" min="0" step="0.01" value="${line.packageCost || ""}" /></label><label>سعر الحبة<output>${money(line.unitCost)}</output></label><label>سعر البيع للحبة<input data-purchase-sale-price="${index}" type="number" inputmode="decimal" min="0" step="0.01" value="${line.salePrice || ""}" /></label><strong class="purchase-line__total">${money(line.total)}</strong><button data-remove-purchase-line="${index}" class="icon-button icon-button--danger" type="button" aria-label="حذف">${icon("close", 17)}</button></article>`; }).join("") : `<div class="inline-empty">أضف منتجًا واحدًا على الأقل.</div>`;
    syncPurchase();
    linesHost.querySelectorAll("[data-purchase-package-unit]").forEach((input) => input.addEventListener("change", (event) => { lines[Number(event.currentTarget.dataset.purchasePackageUnit)].packageUnit = event.currentTarget.value; renderLines(); }));
    [["[data-purchase-package-quantity]", "purchasePackageQuantity", "packageQuantity"], ["[data-purchase-units-per-package]", "purchaseUnitsPerPackage", "unitsPerPackage"], ["[data-purchase-package-cost]", "purchasePackageCost", "packageCost"]].forEach(([selector, datasetKey, key]) => linesHost.querySelectorAll(selector).forEach((input) => input.addEventListener("change", (event) => { const index = Number(event.currentTarget.dataset[datasetKey]); lines[index][key] = Math.max(0, toNumber(event.currentTarget.value)); refreshPackMath(lines[index]); renderLines(); })));
    linesHost.querySelectorAll("[data-purchase-sale-price]").forEach((input) => input.addEventListener("input", (event) => { lines[Number(event.currentTarget.dataset.purchaseSalePrice)].salePrice = Math.max(0, toNumber(event.currentTarget.value)); }));
    linesHost.querySelectorAll("[data-remove-purchase-line]").forEach((button) => button.addEventListener("click", () => { lines.splice(Number(button.dataset.removePurchaseLine), 1); renderLines(); }));
  };
  const addPurchaseProduct = (product) => { if (!product || lines.some((line) => line.productId === product.id)) { showToast("المنتج موجود بالفعل في فاتورة الشراء.", "error"); return false; } lines.push(makePurchaseLine(product)); search.value = ""; renderResults(); renderLines(); return true; };
  const renderResults = (query = "") => { const normalized = query.trim().toLocaleLowerCase("ar"); const matches = state.products.filter((product) => !normalized || [product.name, product.barcode, product.internalCode].some((value) => value?.toLocaleLowerCase("ar").includes(normalized))).slice(0, 6); results.innerHTML = normalized ? (matches.length ? matches.map((product) => `<button type="button" data-add-purchase-product="${product.id}"><span><strong>${escapeHtml(product.name)}</strong><small dir="auto">${escapeHtml(product.barcode || product.internalCode || "دون رمز")}</small></span><span>${money(product.purchasePrice)} للحبة</span>${icon("plus", 16)}</button>`).join("") : `<p>لا يوجد منتج مطابق.</p>`) : ""; results.querySelectorAll("[data-add-purchase-product]").forEach((button) => button.addEventListener("click", () => addPurchaseProduct(state.products.find((item) => item.id === button.dataset.addPurchaseProduct)))); };
  const openPurchaseScanner = () => openScannerOverlay({ title: "مسح باركود للشراء", description: "ضع الباركود داخل الإطار لإضافة المنتج إلى فاتورة الشراء. يمكنك دائمًا البحث بالاسم أو الكود الداخلي.", unsupportedMessage: "استخدم خانة البحث أعلى الفاتورة للبحث بالاسم أو الكود الداخلي، أو أعد المحاولة بعد منح إذن الكاميرا.", manualMode: null, onManualEntry: () => { closeScannerDialog(); search.focus(); }, onDetected: async (code) => { const product = await db.findProductByBarcode(code); if (!product) { closeScannerDialog(); search.value = code; renderResults(code); showToast("لم نجد هذا الباركود. ابحث بالكود الداخلي أو أضف منتجًا جديدًا.", "error"); return true; } const added = addPurchaseProduct(product); if (added) showToast(`أُضيف ${product.name} إلى فاتورة الشراء`); return true; } });
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog)); search.addEventListener("input", (event) => renderResults(event.target.value)); overlay.querySelector("#purchase-scan-product").addEventListener("click", openPurchaseScanner); overlay.querySelector("#purchase-new-product").addEventListener("click", () => openPurchaseProductDialog(getDraft())); form.querySelectorAll("[name=paymentType]").forEach((input) => input.addEventListener("change", () => syncPurchase({ resetPaid: form.paymentType.value === "آجل" }))); paidInput.addEventListener("input", () => syncPurchase()); renderLines();
  form.addEventListener("submit", async (event) => { event.preventDefault(); try { const values = Object.fromEntries(new FormData(form)); await db.createPurchase({ ...values, items: lines }); await refresh(); closeDialog(); state.view = "purchases"; render(); showToast("تم حفظ فاتورة الشراء وزيادة المخزون"); } catch (error) { showToast(error.message, "error"); } });
}

function openPurchaseProductDialog(draft) {
  const initialLabels = packageFieldLabels("كرتون"); const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">ضمن فاتورة شراء</span><h2>إضافة منتج جديد</h2></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><form id="purchase-product-form" class="form-grid"><label>اسم المنتج<input name="name" required dir="rtl" autofocus /></label><label class="barcode-field">الباركود<div class="barcode-field__control"><input id="purchase-product-barcode" name="barcode" dir="ltr" inputmode="numeric" autocomplete="off" /><button id="scan-purchase-product-barcode" class="button button--secondary barcode-field__scan" type="button" aria-label="مسح باركود المنتج">${icon("scan", 17)}<span>مسح</span></button></div><small id="purchase-product-barcode-feedback" class="barcode-feedback" aria-live="polite">اكتب الباركود أو امسحه بالكاميرا.</small></label><label>الباركود الداخلي<input name="internalCode" dir="ltr" autocomplete="off" placeholder="رمز داخلي اختياري" /></label><label>الصنف<input name="category" dir="rtl" placeholder="مثال: مشروبات" /></label><label>وحدة المخزون والبيع<select name="unit">${UNITS.map((unit) => `<option value="${unit}" ${unit === "حبة" ? "selected" : ""}>${unit}</option>`).join("")}</select></label><label>نوع العبوة<select name="packageUnit">${PACKAGE_UNITS.map((unit) => `<option value="${unit}" ${unit === "كرتون" ? "selected" : ""}>${unit}</option>`).join("")}</select></label><label><span id="quick-package-quantity-label">${initialLabels.quantity}</span><input name="packageQuantity" type="number" min="0.001" step="0.001" value="1" required /></label><label><span id="quick-units-per-package-label">${initialLabels.units}</span><input name="unitsPerPackage" type="number" min="1" step="1" value="1" required /></label><label><span id="quick-package-cost-label">${initialLabels.cost}</span><input name="packageCost" type="number" min="0" step="0.01" required /></label><label>سعر البيع للحبة<input name="salePrice" type="number" min="0" step="0.01" required /></label><label>الحد الأدنى بالحبة<input name="minimumStock" type="number" min="0" step="0.001" /></label><p class="form-full scanner-session-note" id="quick-product-piece-price">سعر الحبة سيُحسب من سعر العبوة وعدد الحبات.</p><div class="dialog__actions form-full"><button type="button" class="button button--secondary" data-dialog-close>إلغاء</button><button type="submit" class="button button--primary">إضافة للفاتورة ${icon("check", 17)}</button></div></form>`);
  const quickForm = overlay.querySelector("#purchase-product-form"); const barcodeInput = overlay.querySelector("#purchase-product-barcode"); const barcodeFeedback = overlay.querySelector("#purchase-product-barcode-feedback"); const profile = businessProfile(); quickForm.unit.innerHTML = profileOptions("units", profile.defaultUnit).map((unit) => `<option value="${unit}" ${unit === profile.defaultUnit ? "selected" : ""}>${unit}</option>`).join(""); quickForm.packageUnit.innerHTML = profileOptions("packageUnits", profile.defaultPackageUnit).map((unit) => `<option value="${unit}" ${unit === profile.defaultPackageUnit ? "selected" : ""}>${unit}</option>`).join(""); if (isPharmacy()) quickForm.querySelector("#quick-product-piece-price").insertAdjacentHTML("beforebegin", `<label>رقم التشغيلة<input name="batchNumber" dir="ltr" required autocomplete="off" /></label><label>تاريخ الانتهاء<input name="expiryDate" type="date" required /></label>`); const checkBarcode = async () => { const duplicate = await db.findProductByBarcode(barcodeInput.value); if (duplicate) { setBarcodeFeedback(barcodeFeedback, `هذا الباركود مستخدم بالفعل للمنتج: ${duplicate.name}`, "error"); return duplicate; } setBarcodeFeedback(barcodeFeedback, barcodeInput.value.trim() ? "الباركود متاح للحفظ." : "اكتب الباركود أو امسحه بالكاميرا.", barcodeInput.value.trim() ? "success" : "neutral"); return null; }; const refreshQuickPrice = () => { const math = calculatePackagePurchase(Object.fromEntries(new FormData(quickForm))); overlay.querySelector("#quick-product-piece-price").textContent = `سعر ${quickForm.unit.value}: ${money(math.unitCost)} · الكمية التي ستدخل المخزون: ${amount(math.quantity)} ${quickForm.unit.value}`; }; const syncQuickPackageLabels = () => { const labels = packageFieldLabels(quickForm.packageUnit.value, quickForm.unit.value); overlay.querySelector("#quick-package-quantity-label").textContent = labels.quantity; overlay.querySelector("#quick-units-per-package-label").textContent = labels.units; overlay.querySelector("#quick-package-cost-label").textContent = labels.cost; }; quickForm.packageUnit.addEventListener("change", syncQuickPackageLabels); quickForm.unit.addEventListener("change", () => { syncQuickPackageLabels(); refreshQuickPrice(); }); quickForm.querySelectorAll("[name=packageQuantity],[name=unitsPerPackage],[name=packageCost]").forEach((input) => input.addEventListener("input", refreshQuickPrice)); syncQuickPackageLabels(); refreshQuickPrice();
  barcodeInput.addEventListener("blur", () => { checkBarcode().catch((error) => showToast(error.message, "error")); }); overlay.querySelector("#scan-purchase-product-barcode").addEventListener("click", () => openScannerOverlay({ title: "مسح باركود المنتج", description: "ضع الباركود داخل الإطار ليُضاف إلى المنتج الجديد في فاتورة الشراء.", unsupportedMessage: "أدخل الباركود يدويًا ثم تابع إضافة المنتج.", manualMode: null, onManualEntry: () => { closeScannerDialog(); barcodeInput.focus(); }, onDetected: async (code) => { barcodeInput.value = code; await checkBarcode(); return true; } }));
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog)); quickForm.addEventListener("submit", async (event) => { event.preventDefault(); try { const values = Object.fromEntries(new FormData(event.currentTarget)); if (await checkBarcode()) return; const math = calculatePackagePurchase(values); if (math.packageQuantity <= 0 || math.unitsPerPackage <= 0) throw new Error("أدخل عدد العبوات ووحدات المخزون بصورة صحيحة."); const product = await db.createProduct({ ...values, quantity: 0, purchasePrice: math.unitCost, purchasePackageUnit: values.packageUnit, lastPackageCost: math.packageCost }); await refresh(); closeDialog(); draft.lines.push({ productId: product.id, productName: product.name, unit: product.unit, packageUnit: values.packageUnit, salePrice: values.salePrice, batchNumber: values.batchNumber || "", expiryDate: values.expiryDate || "", ...math }); openPurchaseDialog(draft); } catch (error) { showToast(error.message, "error"); } });
}

function openPurchaseDetail(purchase) {
  if (!purchase) return;
  const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">فاتورة شراء محفوظة</span><h2>${purchase.invoiceNumber}</h2><p class="dialog__subtext">${escapeHtml(purchase.supplierName)} · ${dateTime(purchase.date)}</p></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><div class="invoice-detail">${purchase.items.map((item) => `<div><span><strong>${escapeHtml(item.productName)}</strong><small>${item.packageQuantity ? `${amount(item.packageQuantity)} ${escapeHtml(item.packageUnit || "عبوة")} × ${money(item.packageCost)} · ` : ""}${amount(item.quantity)} ${escapeHtml(item.unit)} · سعر الحبة ${money(item.unitCost)}${item.salePrice !== undefined ? ` · البيع ${money(item.salePrice)}` : ""}${toNumber(item.returnedQuantity) ? ` · مرتجع ${amount(item.returnedQuantity)}` : ""}</small></span><strong>${money(item.total)}</strong></div>`).join("")}<div class="invoice-detail__final"><span>الإجمالي</span><strong>${money(purchase.total)}</strong></div></div><div class="dialog__actions"><button id="purchase-return" class="button button--secondary">مرتجع شراء ${icon("rotate", 17)}</button><button class="button button--primary" data-dialog-close>إغلاق</button></div>`);
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog));
  overlay.querySelector("#purchase-return").addEventListener("click", () => { closeDialog(); openPurchaseReturnDialog(purchase.id); });
}

async function openPurchaseReturnDialog(purchaseId) {
  const purchase = await db.getPurchase(purchaseId); if (!purchase) return;
  const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">مرتجع شراء</span><h2>${purchase.invoiceNumber}</h2></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><form id="purchase-return-form" class="return-form">${purchase.items.map((item) => { const max = Math.max(0, toNumber(item.quantity) - toNumber(item.returnedQuantity)); return `<div class="return-line"><span><strong>${escapeHtml(item.productName)}</strong><small>المتاح للإرجاع: ${amount(max)}</small></span>${quantityControlMarkup({ value: "", min: 0, max, step: "0.001", inputAttrs: `name=\"${item.id}\"` })}</div>`; }).join("")}<label>ملاحظات<textarea name="notes" dir="rtl"></textarea></label><div class="dialog__actions"><button type="button" class="button button--secondary" data-dialog-close>إلغاء</button><button type="submit" class="button button--primary">تسجيل المرتجع ${icon("check", 17)}</button></div></form>`);
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog));
  overlay.querySelectorAll(".quantity-control").forEach((control) => bindQuantityControl(control, { min: 0, max: toNumber(control.querySelector("input").max), step: 0.001, onChange: () => {} }));
  overlay.querySelector("#purchase-return-form").addEventListener("submit", async (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); try { await db.createPurchaseReturn({ purchaseId, notes: data.get("notes"), items: purchase.items.map((item) => ({ purchaseItemId: item.id, quantity: data.get(item.id) })) }); await refresh(); closeDialog(); render(); showToast("تم حفظ مرتجع الشراء وتحديث المخزون"); } catch (error) { showToast(error.message, "error"); } });
}

async function openSaleReturnDialog(saleId) {
  const invoice = await db.getInvoice(saleId); if (!invoice) return;
  const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">مرتجع بيع</span><h2>${invoice.invoiceNumber}</h2></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><form id="sale-return-form" class="return-form">${invoice.items.map((item) => { const max = Math.max(0, toNumber(item.quantity) - toNumber(item.returnedQuantity)); return `<div class="return-line"><span><strong>${escapeHtml(item.productName)}</strong><small>المتاح للإرجاع: ${amount(max)}</small></span>${quantityControlMarkup({ value: "", min: 0, max, step: "0.001", inputAttrs: `name=\"${item.id}\"` })}</div>`; }).join("")}<label>ملاحظات<textarea name="notes" dir="rtl"></textarea></label><div class="dialog__actions"><button type="button" class="button button--secondary" data-dialog-close>إلغاء</button><button type="submit" class="button button--primary">تسجيل المرتجع ${icon("check", 17)}</button></div></form>`);
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog));
  overlay.querySelectorAll(".quantity-control").forEach((control) => bindQuantityControl(control, { min: 0, max: toNumber(control.querySelector("input").max), step: 0.001, onChange: () => {} }));
  overlay.querySelector("#sale-return-form").addEventListener("submit", async (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); try { await db.createSaleReturn({ saleId, notes: data.get("notes"), items: invoice.items.map((item) => ({ saleItemId: item.id, quantity: data.get(item.id) })) }); await refresh(); closeDialog(); render(); showToast("تم حفظ مرتجع البيع وزيادة المخزون"); } catch (error) { showToast(error.message, "error"); } });
}

function openStockHistoryDialog(productId = "") {
  const products = new Map(state.products.map((product) => [product.id, product])); const movements = state.stockMovements.filter((movement) => !productId || movement.productId === productId);
  const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">سجل حركة المخزون</span><h2>${productId ? escapeHtml(products.get(productId)?.name || "المنتج") : "كل الحركات"}</h2></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><div class="movement-list">${movements.length ? movements.map((movement) => `<article><div><strong>${escapeHtml(products.get(movement.productId)?.name || "منتج محذوف")}</strong><small>${dateTime(movement.date)} · ${escapeHtml(movement.type)}</small></div><div><strong class="movement-amount ${toNumber(movement.quantity) >= 0 ? "is-positive" : "is-negative"}">${toNumber(movement.quantity) >= 0 ? "+" : ""}${amount(movement.quantity)}</strong><small>${amount(movement.previousQuantity)} ← ${amount(movement.newQuantity)}</small></div></article>`).join("") : `<div class="inline-empty">لا توجد حركات مسجلة.</div>`}</div><div class="dialog__actions"><button class="button button--primary button--wide" data-dialog-close>إغلاق</button></div>`);
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog));
}

async function openScannedProduct(product, mode) {
  closeScannerDialog(); closeDialog();
  if (mode === "sale") { addToCart(product.id); showToast(`أُضيف ${product.name} إلى السلة`); } else openProductDialog(product);
  return true;
}

async function findInternalCode(code, mode, { keepScannerOpen = false } = {}) {
  const product = await db.findProductByInternalCode(code);
  if (product) return openScannedProduct(product, mode);
  if (!keepScannerOpen) showToast("لم نجد هذا الكود الداخلي. تحقق منه أو أعد المسح.", "error");
  return false;
}

async function findBarcode(code, mode) {
  const product = await db.findProductByBarcode(code);
  if (product) return openScannedProduct(product, mode);
  closeScannerDialog();
  closeDialog();
  const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">نتيجة المسح</span><h2>الباركود غير مسجل</h2></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><p class="dialog__subtext">لم نجد الباركود <strong>${escapeHtml(code)}</strong>. ابحث بالكود الداخلي للمنتج أو أعد المسح.</p><form id="unknown-barcode-form" class="manual-barcode"><input name="internalCode" required dir="ltr" autocomplete="off" placeholder="أدخل الكود الداخلي" aria-label="البحث بالكود الداخلي" /><button class="button button--secondary" type="submit">بحث بالكود الداخلي</button></form><div class="dialog__actions"><button class="button button--secondary" id="retry-unknown-barcode" type="button">${icon("scan", 17)} إعادة المسح</button><button class="button button--secondary" data-dialog-close>إلغاء</button><button class="button button--primary" id="create-from-barcode">إنشاء منتج ${icon("plus", 17)}</button></div>`);
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog));
  overlay.querySelector("#unknown-barcode-form").addEventListener("submit", (event) => { event.preventDefault(); findInternalCode(new FormData(event.currentTarget).get("internalCode"), mode); });
  overlay.querySelector("#retry-unknown-barcode").addEventListener("click", () => { closeDialog(); openScanner(mode); });
  overlay.querySelector("#create-from-barcode").addEventListener("click", () => openProductDialog(null, code));
  return false;
}

function setBarcodeFeedback(element, message, tone = "neutral") {
  if (!element) return;
  element.textContent = message;
  element.dataset.tone = tone;
}

function notifyBarcodeRead() {
  if (navigator.vibrate) navigator.vibrate(45);
}

function hasBarcodeScannerSupport() {
  return "BarcodeDetector" in window && typeof window.BarcodeDetector === "function" && Boolean(navigator.mediaDevices?.getUserMedia);
}

async function getBarcodeFormats() {
  const requested = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"];
  if (typeof window.BarcodeDetector?.getSupportedFormats !== "function") return requested;
  const supported = await window.BarcodeDetector.getSupportedFormats();
  const formats = requested.filter((format) => supported.includes(format));
  return formats.length ? formats : requested;
}

function scannerDialogMarkup(title, description, continuous = false) {
  return `<section class="scanner-dialog" role="dialog" aria-modal="true" aria-labelledby="scanner-title"><div class="dialog__head"><div><span class="eyebrow">ماسح الباركود</span><h2 id="scanner-title">${title}</h2></div><button class="icon-button" id="scanner-close" aria-label="${continuous ? "إنهاء المسح" : "إغلاق"}">${icon("close", 20)}</button></div><p class="dialog__subtext">${description}</p>${continuous ? `<p class="scanner-session-note">المسح المتواصل مفعّل: أبعد الرمز عن الإطار بعد إضافته ثم امسح المنتج التالي.</p>` : ""}<div id="scanner-content"></div><div class="scanner-dialog__actions"><button id="scanner-retry" class="button button--secondary" type="button">${icon("scan", 16)} إعادة المحاولة</button><button id="scanner-close-bottom" class="button button--primary" type="button">${continuous ? "إنهاء المسح" : "إغلاق"}</button></div></section>`;
}

function closeScannerDialog() {
  stopScanner();
  document.querySelector("#scanner-backdrop")?.remove();
}

let scannerSuccessAudioContext;
function getScannerSuccessAudioContext() {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) return null;
  return scannerSuccessAudioContext ||= new AudioContextConstructor();
}
function primeScannerSuccessSound() {
  try { getScannerSuccessAudioContext()?.resume().catch(() => {}); } catch { /* لا تمنع قيود الصوت بدء الماسح. */ }
}
function playScannerSuccessSound() {
  try {
    const context = getScannerSuccessAudioContext();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startAt = context.currentTime;
    context.resume().catch(() => {});
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, startAt);
    oscillator.frequency.exponentialRampToValueAtTime(1175, startAt + 0.09);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.11, startAt + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.16);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + 0.17);
  } catch { /* لا يؤثر غياب الصوت في مسار المسح أو الإدخال اليدوي. */ }
}

function openScannerOverlay({ title, description, onDetected, unsupportedMessage, manualMode, onManualEntry = null, continuous = false }) {
  closeScannerDialog();
  primeScannerSuccessSound();
  const overlay = document.createElement("div");
  overlay.id = "scanner-backdrop";
  overlay.className = "scanner-backdrop";
  overlay.innerHTML = scannerDialogMarkup(title, description, continuous);
  overlay.addEventListener("click", (event) => { if (event.target === overlay) closeScannerDialog(); });
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("is-open"));
  overlay.querySelector("#scanner-close").addEventListener("click", closeScannerDialog);
  overlay.querySelector("#scanner-close-bottom").addEventListener("click", closeScannerDialog);
  overlay.querySelector("#scanner-retry").addEventListener("click", () => startCameraScanner(overlay, onDetected, unsupportedMessage, manualMode, onManualEntry, continuous));
  startCameraScanner(overlay, onDetected, unsupportedMessage, manualMode, onManualEntry, continuous);
}

function renderUnsupportedScanner(overlay, message, manualMode, onManualEntry) {
  stopScanner();
  const content = overlay.querySelector("#scanner-content");
  overlay.querySelector("#scanner-retry").hidden = false;
  content.innerHTML = `<div class="scanner-notice scanner-notice--neutral">${icon("alert", 20)}<div><strong>ماسح الباركود غير مدعوم على هذا المتصفح</strong><span>${message}</span></div></div>${manualMode ? `<form id="manual-barcode-form" class="manual-barcode"><input name="internalCode" required dir="ltr" autocomplete="off" placeholder="أدخل الكود الداخلي" autofocus /><button class="button button--primary" type="submit">بحث بالكود الداخلي</button></form>` : onManualEntry ? `<button id="scanner-manual-entry" class="button button--primary button--wide" type="button">البحث بالكود الداخلي</button>` : ""}`;
  content.querySelector("#manual-barcode-form")?.addEventListener("submit", (event) => { event.preventDefault(); findInternalCode(new FormData(event.currentTarget).get("internalCode"), manualMode, { keepScannerOpen: true }); });
  content.querySelector("#scanner-manual-entry")?.addEventListener("click", onManualEntry);
}

async function startCameraScanner(overlay, onDetected, unsupportedMessage, manualMode, onManualEntry = null, continuous = false) {
  if (!hasBarcodeScannerSupport()) { renderUnsupportedScanner(overlay, unsupportedMessage, manualMode, onManualEntry); return; }
  stopScanner();
  const content = overlay.querySelector("#scanner-content");
  const retry = overlay.querySelector("#scanner-retry");
  retry.hidden = false;
  content.innerHTML = `<div class="scanner-box"><video id="scanner-video" autoplay muted playsinline></video><div class="scanner-box__guide"><span>ضع الباركود داخل الإطار</span></div></div><div id="scanner-status" class="scanner-status">${icon("scan", 16)}<span>وجّه الكاميرا نحو الباركود</span></div>${manualMode ? `<form id="manual-barcode-form" class="manual-barcode"><input name="internalCode" required dir="ltr" autocomplete="off" placeholder="أدخل الكود الداخلي" /><button class="button button--secondary" type="submit">بحث بالكود الداخلي</button></form>` : ""}`;
  content.querySelector("#manual-barcode-form")?.addEventListener("submit", (event) => { event.preventDefault(); findInternalCode(new FormData(event.currentTarget).get("internalCode"), manualMode, { keepScannerOpen: true }); });
  try {
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false }); }
    catch { stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); }
    const video = content.querySelector("#scanner-video");
    video.srcObject = stream;
    await video.play();
    const detector = new window.BarcodeDetector({ formats: await getBarcodeFormats() });
    const session = { stream, frame: null, reading: false, overlay, continuous, lastCode: "", absentSince: 0 };
    state.scanner = session;
    const scanFrame = async () => {
      if (state.scanner !== session || !overlay.isConnected) return;
      if (!session.reading && video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
        try {
          const codes = await detector.detect(video);
          const code = codes[0]?.rawValue?.trim();
          if (code) {
            session.absentSince = 0;
            if (continuous && !isNewContinuousBarcode(session.lastCode, code)) { session.frame = requestAnimationFrame(scanFrame); return; }
            session.reading = true;
            playScannerSuccessSound();
            if (!continuous) stopScanner();
            const closeAfterRead = await onDetected(code, overlay, { continuous });
            if (continuous && closeAfterRead === false && state.scanner === session && overlay.isConnected) {
              session.lastCode = code;
              session.reading = false;
              session.frame = requestAnimationFrame(scanFrame);
              return;
            }
            if (closeAfterRead !== false) closeScannerDialog();
            return;
          } else if (continuous && session.lastCode) {
            session.absentSince ||= Date.now();
            if (shouldReleaseContinuousBarcode(session.lastCode, session.absentSince)) {
              session.lastCode = "";
              session.absentSince = 0;
            }
          }
        } catch (error) { console.warn("تعذر تحليل الباركود", error); }
      }
      if (state.scanner === session) session.frame = requestAnimationFrame(scanFrame);
    };
    session.frame = requestAnimationFrame(scanFrame);
  } catch (error) {
    content.innerHTML = `<div class="scanner-notice scanner-notice--error">${icon("alert", 20)}<div><strong>تعذر فتح الكاميرا</strong><span>تحقق من الإذن، ثم أعد المحاولة، أو ابحث بالكود الداخلي.</span></div></div>${manualMode ? `<form id="manual-barcode-form" class="manual-barcode"><input name="internalCode" required dir="ltr" autocomplete="off" placeholder="أدخل الكود الداخلي" autofocus /><button class="button button--primary" type="submit">بحث بالكود الداخلي</button></form>` : onManualEntry ? `<button id="scanner-manual-entry" class="button button--primary button--wide" type="button">البحث بالكود الداخلي</button>` : ""}`;
    content.querySelector("#manual-barcode-form")?.addEventListener("submit", (event) => { event.preventDefault(); findInternalCode(new FormData(event.currentTarget).get("internalCode"), manualMode, { keepScannerOpen: true }); });
    content.querySelector("#scanner-manual-entry")?.addEventListener("click", onManualEntry);
  }
}

function openProductBarcodeScanner({ barcodeInput, barcodeFeedback, product }) {
  openScannerOverlay({
    title: "مسح باركود المنتج",
    description: "ضع الباركود داخل الإطار. لن تفقد أي بيانات أدخلتها في نموذج المنتج.",
    unsupportedMessage: "يبقى حقل الباركود في نموذج المنتج متاحًا للإدخال اليدوي.",
    manualMode: null,
    onManualEntry: () => { closeScannerDialog(); barcodeInput.focus(); },
    onDetected: async (code, overlay) => {
      const duplicate = await db.findProductByBarcode(code, product?.id);
      if (duplicate) {
        setBarcodeFeedback(barcodeFeedback, `هذا الباركود مستخدم بالفعل للمنتج: ${duplicate.name}`, "error");
        overlay.querySelector("#scanner-status").innerHTML = `${icon("alert", 16)}<span>هذا الباركود مستخدم بالفعل. اختر إعادة المحاولة.</span>`;
        overlay.querySelector("#scanner-status").dataset.tone = "error";
        return false;
      }
      barcodeInput.value = code;
      setBarcodeFeedback(barcodeFeedback, "تم قراءة الباركود وهو متاح للحفظ.", "success");
      notifyBarcodeRead();
      showToast("تم قراءة الباركود");
      return true;
    },
  });
}

function openScanner(mode) {
  const continuous = mode === "sale";
  openScannerOverlay({
    title: continuous ? "مسح منتجات متواصل" : "وجّه الكاميرا نحو الباركود",
    description: continuous ? "أضف عدة منتجات إلى السلة في جلسة واحدة، ثم اختر «إنهاء المسح» عند الانتهاء." : "سنفتح المنتج المسجل مباشرة أو نقترح إنشاء منتج جديد عند عدم العثور عليه.",
    unsupportedMessage: "يمكنك البحث بالكود الداخلي أو الضغط على إعادة المحاولة بعد منح إذن الكاميرا.",
    manualMode: mode,
    onManualEntry: () => {
      const manualForm = document.querySelector("#scanner-backdrop #manual-barcode-form");
      manualForm?.querySelector("input")?.focus();
    },
    continuous,
    onDetected: async (code, overlay, options) => {
      if (!options.continuous) { await findBarcode(code, mode); return true; }
      const product = await db.findProductByBarcode(code);
      if (!product) { await findBarcode(code, mode); return true; }
      const added = addToCart(product.id);
      const status = overlay.querySelector("#scanner-status");
      status.innerHTML = `${icon(added ? "check" : "alert", 16)}<span>${added ? `أُضيف ${escapeHtml(product.name)}. امسح المنتج التالي.` : `تعذر إضافة ${escapeHtml(product.name)} بسبب حد المخزون.`}</span>`;
      status.dataset.tone = added ? "success" : "error";
      if (added) { notifyBarcodeRead(); showToast(`أُضيف ${product.name} إلى السلة`); }
      return false;
    },
  });
}

function stopScanner() {
  if (!state.scanner) return;
  if (state.scanner.frame) cancelAnimationFrame(state.scanner.frame);
  state.scanner.stream?.getTracks().forEach((track) => track.stop());
  state.scanner = null;
}

export async function bootApp(target) {
  root = target;
  try { await db.open(); state.settings = await db.getSettings(); state.accounts = await db.listAccounts(); state.currentUser = state.settings?.setupCompleted ? await db.getPersistentSession() : null; try { state.cloud.user = await getCloudBackupUser(); } catch { state.cloud.user = null; } applyTheme(); if (state.settings?.setupCompleted) await refresh(); render(); installExitGuard(); } catch (error) { root.innerHTML = `<main class="fatal-state"><img src="${markImage}" alt=""/><h1>تعذر فتح التخزين المحلي</h1><p>${escapeHtml(error.message)}</p><button class="button button--primary" onclick="location.reload()">إعادة المحاولة</button></main>`; }
}
