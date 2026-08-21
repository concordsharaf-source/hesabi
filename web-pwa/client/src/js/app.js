/* اتجاه التصميم: دفتر التاجر الهادئ — واجهة تشغيل يومية RTL تجعل الإجراء والمعلومة محور كل شاشة. */
import { BUSINESS_TYPES, CURRENCIES, NAV_ITEMS, PAYMENT_METHODS, UNITS } from "./constants.js";
import { db } from "./database.js";
import { calculateSaleTotals, roundMoney, stockStatus, toNumber } from "./domain.js";

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
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ""}</svg>`;
};

const state = { view: "dashboard", settings: null, products: [], sales: [], dashboard: null, cart: [], productQuery: "", saleQuery: "", scanner: null };
let root;

const money = (value) => new Intl.NumberFormat("ar-SA", { style: "currency", currency: state.settings?.currency || "SAR", maximumFractionDigits: 2 }).format(roundMoney(value));
const amount = (value) => new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 }).format(toNumber(value));
const dateTime = (value) => new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[character]);
const emptyImage = "/manus-storage/hesabi-empty-inventory_96623fe2.png";
const markImage = "/manus-storage/hesabi-mark_5cb0429a.png";

function showToast(message, type = "success") {
  const host = document.querySelector("#toast-host") || document.body.appendChild(Object.assign(document.createElement("div"), { id: "toast-host", className: "toast-host" }));
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<span class="toast__icon">${icon(type === "success" ? "check" : "alert", 18)}</span><span>${escapeHtml(message)}</span>`;
  host.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("toast--visible"));
  window.setTimeout(() => { toast.classList.remove("toast--visible"); window.setTimeout(() => toast.remove(), 200); }, 3300);
}

function formatStatus(product) {
  const status = stockStatus(product.quantity, product.minimumStock);
  return `<span class="status status--${status === "متوفر" ? "available" : status === "منخفض" ? "low" : "empty"}">${status}</span>`;
}

async function refresh() {
  [state.products, state.sales, state.dashboard] = await Promise.all([db.listProducts(), db.listSales(), db.getDashboard()]);
}

function navMarkup() {
  const items = NAV_ITEMS.map((item) => `<button class="nav-item ${state.view === item.id ? "is-active" : ""}" data-action="navigate" data-view="${item.id}">${icon(item.icon)}<span>${item.label}</span></button>`).join("");
  return `<aside class="sidebar">
    <div class="brand"><img src="${markImage}" alt="" /><div><strong>حسابي</strong><small>${escapeHtml(state.settings?.storeName || "متجرك")}</small></div></div>
    <div class="sidebar__label">تشغيل المتجر</div><nav>${items}</nav>
    <div class="sidebar__footer"><span class="presence-dot"></span><span>البيانات محفوظة محليًا</span></div>
  </aside>
  <nav class="bottom-nav" aria-label="التنقل الرئيسي">${items}</nav>`;
}

function topbarMarkup(title, description, action = "") {
  return `<header class="topbar"><div><p class="eyebrow">${escapeHtml(state.settings?.businessType || "إدارة المتجر")}</p><h1>${title}</h1>${description ? `<p class="topbar__description">${description}</p>` : ""}</div>${action}</header>`;
}

function dashboardMarkup() {
  const dashboard = state.dashboard;
  const low = dashboard.lowStock.slice(0, 5);
  return `${topbarMarkup("نظرة على يومك", "تابع المبيعات والمخزون من سجل واحد واضح.", `<button class="button button--primary" data-action="navigate" data-view="sales">${icon("cart", 18)}<span>بيع جديد</span></button>`)}
  <section class="daily-ribbon"><div><span class="presence-dot"></span><strong>اليوم التشغيلي</strong><small>كل عملية تحفظ على هذا الجهاز تلقائيًا</small></div><div class="daily-ribbon__date">${new Intl.DateTimeFormat("ar-SA", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</div></section>
  <section class="metric-grid">
    ${metricCard("مبيعات اليوم", money(dashboard.todaySales), "trend", "قيمة الفواتير المكتملة")}
    ${metricCard("فواتير اليوم", amount(dashboard.todayInvoiceCount), "receipt", "عملية بيع محفوظة")}
    ${metricCard("المنتجات", amount(dashboard.productCount), "package", "منتجات فعّالة")}
    ${metricCard("قيمة المخزون", money(dashboard.inventoryValue), "layers", "وفق سعر الشراء")}
  </section>
  <section class="dashboard-split">
    <article class="panel panel--low-stock"><div class="panel__head"><div><span class="eyebrow">تنبيه تشغيلي</span><h2>مخزون يحتاج انتباهك</h2></div><button class="text-button" data-action="navigate" data-view="inventory">عرض المخزون ${icon("arrow", 16)}</button></div>
    ${low.length ? `<div class="warning-list">${low.map((product) => `<button class="warning-row" data-action="open-product" data-id="${product.id}"><div class="warning-row__icon">${icon("package", 18)}</div><div><strong>${escapeHtml(product.name)}</strong><small>${amount(product.quantity)} ${escapeHtml(product.unit)} متبقية</small></div>${formatStatus(product)}</button>`).join("")}</div>` : emptyState("لا توجد تنبيهات مخزون", "كل المنتجات أعلى من الحد الأدنى المحدد.", "inventory")}</article>
    <article class="panel action-panel"><span class="eyebrow">اختصار سريع</span><h2>ابدأ من حيث تكون الحركة</h2><p>أضف منتجًا، اضبط المخزون، أو أتم بيعًا جديدًا. كل خطوة ترتبط بالسجل المحلي.</p><div class="quick-actions"><button data-action="new-product">${icon("plus", 18)}إضافة منتج</button><button data-action="navigate" data-view="inventory">${icon("layers", 18)}تعديل مخزون</button><button data-action="navigate" data-view="sales">${icon("cart", 18)}فتح المبيعات</button></div></article>
  </section>`;
}

function metricCard(label, value, iconName, helper) {
  return `<article class="metric-card"><div class="metric-card__icon">${icon(iconName, 19)}</div><div><small>${label}</small><strong>${value}</strong><span>${helper}</span></div></article>`;
}

function emptyState(title, text, destination = "products") {
  return `<div class="empty-state"><img src="${emptyImage}" alt="" /><div><h3>${title}</h3><p>${text}</p><button class="button button--secondary" data-action="navigate" data-view="${destination}">${icon("plus", 16)} ابدأ الآن</button></div></div>`;
}

function productsMarkup() {
  const query = state.productQuery.trim().toLocaleLowerCase("ar");
  const products = state.products.filter((product) => !query || [product.name, product.barcode, product.internalCode].some((value) => value?.toLocaleLowerCase("ar").includes(query)));
  return `${topbarMarkup("المنتجات", "ابحث بالاسم أو الباركود أو الكود الداخلي.", `<button class="button button--primary" data-action="new-product">${icon("plus", 18)}<span>إضافة منتج</span></button>`)}
  <section class="toolbar"><label class="search-field">${icon("search", 19)}<input id="product-search" autocomplete="off" placeholder="ابحث عن منتج..." value="${escapeHtml(state.productQuery)}" /></label><button class="button button--secondary button--icon-text" data-action="open-scanner" data-mode="product">${icon("scan", 18)}<span>مسح باركود</span></button></section>
  <section class="panel product-table-panel">${products.length ? `<div class="table-wrap"><table><thead><tr><th>المنتج</th><th>السعر</th><th>المخزون</th><th>الحالة</th><th><span class="sr-only">إجراءات</span></th></tr></thead><tbody>${products.map(productRow).join("")}</tbody></table></div><div class="mobile-product-list">${products.map(productCard).join("")}</div>` : emptyState(query ? "لا توجد نتائج مطابقة" : "لم تضف منتجات بعد", query ? "جرّب اسمًا أو رمزًا آخر." : "أضف أول منتج ليظهر في قائمة التشغيل.")}</section>`;
}

function productRow(product) {
  return `<tr><td><button class="product-name" data-action="open-product" data-id="${product.id}"><strong>${escapeHtml(product.name)}</strong><small>${product.barcode ? `باركود: ${escapeHtml(product.barcode)}` : product.internalCode ? `كود: ${escapeHtml(product.internalCode)}` : "دون رمز"}</small></button></td><td>${money(product.salePrice)}</td><td>${amount(product.quantity)} ${escapeHtml(product.unit)}</td><td>${formatStatus(product)}</td><td><button class="icon-button" aria-label="خيارات ${escapeHtml(product.name)}" data-action="open-product" data-id="${product.id}">${icon("dots", 20)}</button></td></tr>`;
}

function productCard(product) {
  return `<article class="product-card"><button class="product-card__main" data-action="open-product" data-id="${product.id}"><div><strong>${escapeHtml(product.name)}</strong><small>${product.internalCode || product.barcode || "دون رمز"}</small></div>${formatStatus(product)}</button><div class="product-card__meta"><span>${money(product.salePrice)}</span><span>${amount(product.quantity)} ${escapeHtml(product.unit)}</span></div></article>`;
}

function inventoryMarkup() {
  const products = [...state.products].sort((a, b) => ({ "نافد": 0, "منخفض": 1, "متوفر": 2 }[stockStatus(a.quantity, a.minimumStock)] - { "نافد": 0, "منخفض": 1, "متوفر": 2 }[stockStatus(b.quantity, b.minimumStock)]));
  return `${topbarMarkup("المخزون", "عدّل الكميات من حركة موثقة، وليس من بطاقة المنتج.")}
  <section class="inventory-summary"><div><span>إجمالي قيمة المخزون</span><strong>${money(state.dashboard.inventoryValue)}</strong></div><div><span>منخفض أو نافد</span><strong>${amount(state.dashboard.lowStock.length)} منتج</strong></div></section>
  <section class="panel inventory-list">${products.length ? products.map((product) => `<article class="inventory-row"><div class="inventory-row__main"><div class="inventory-icon">${icon("package", 20)}</div><div><strong>${escapeHtml(product.name)}</strong><small>شراء: ${money(product.purchasePrice)} · قيمة: ${money(product.purchasePrice * product.quantity)}</small></div></div><div class="inventory-row__stock"><div>${formatStatus(product)}<strong>${amount(product.quantity)} <small>${escapeHtml(product.unit)}</small></strong></div><button class="button button--secondary" data-action="adjust-stock" data-id="${product.id}">تعديل</button></div></article>`).join("") : emptyState("المخزون بانتظار أول منتج", "أضف منتجًا مع كمية افتتاحية ليظهر هنا.")}</section>`;
}

function salesMarkup() {
  const query = state.saleQuery.trim().toLocaleLowerCase("ar");
  const matches = state.products.filter((product) => !query || [product.name, product.barcode, product.internalCode].some((value) => value?.toLocaleLowerCase("ar").includes(query))).slice(0, 7);
  const totals = calculateSaleTotals(state.cart, 0);
  return `${topbarMarkup("بيع جديد", "أضف المنتجات إلى السلة ثم ثبّت الفاتورة في عملية واحدة.")}
  <section class="sales-layout"><div class="sales-catalog"><div class="toolbar toolbar--sales"><label class="search-field">${icon("search", 19)}<input id="sale-search" autocomplete="off" placeholder="ابحث أو أدخل باركود..." value="${escapeHtml(state.saleQuery)}" /></label><button class="button button--secondary button--scan" data-action="open-scanner" data-mode="sale" aria-label="مسح الباركود">${icon("scan", 19)}</button></div>
  <div class="sale-matches">${state.products.length === 0 ? emptyState("أضف منتجاتك أولًا", "تحتاج المبيعات إلى منتجات محفوظة في المخزون.") : matches.length ? matches.map((product) => `<button class="sale-product ${product.quantity <= 0 ? "is-disabled" : ""}" data-action="add-cart" data-id="${product.id}" ${product.quantity <= 0 ? "disabled" : ""}><div><strong>${escapeHtml(product.name)}</strong><small>${amount(product.quantity)} ${escapeHtml(product.unit)} متاح</small></div><span>${money(product.salePrice)}</span><i>${icon("plus", 18)}</i></button>`).join("") : `<div class="no-match"><strong>لا توجد نتيجة</strong><span>تحقق من الاسم أو الباركود أو أضف منتجًا جديدًا.</span><button class="text-button" data-action="new-product">إنشاء منتج</button></div>`}</div></div>
  <aside class="cart-panel"><div class="cart-panel__head"><div><span class="eyebrow">سلة البيع</span><h2>${state.cart.length ? `${state.cart.length} أصناف` : "فارغة الآن"}</h2></div>${state.cart.length ? `<button class="text-button text-button--danger" data-action="clear-cart">إفراغ</button>` : ""}</div>
  <div class="cart-lines">${state.cart.length ? state.cart.map(cartLine).join("") : `<div class="cart-empty">${icon("cart", 30)}<p>اختر منتجًا من القائمة لتبدأ البيع.</p></div>`}</div>
  <div class="cart-total"><div><span>الإجمالي المبدئي</span><strong>${money(totals.subtotal)}</strong></div><button class="button button--primary button--wide" data-action="checkout" ${state.cart.length ? "" : "disabled"}>إتمام البيع ${icon("arrow", 18)}</button></div></aside></section>`;
}

function cartLine(line) {
  return `<article class="cart-line"><div class="cart-line__detail"><strong>${escapeHtml(line.name)}</strong><small>${money(line.unitPrice)} × ${amount(line.quantity)}</small></div><strong>${money(line.unitPrice * line.quantity)}</strong><div class="quantity-stepper"><button aria-label="إنقاص" data-action="cart-decrement" data-id="${line.productId}">${icon("minus", 15)}</button><span>${amount(line.quantity)}</span><button aria-label="زيادة" data-action="cart-increment" data-id="${line.productId}">${icon("plus", 15)}</button></div><button class="remove-line" aria-label="حذف من السلة" data-action="cart-remove" data-id="${line.productId}">${icon("close", 16)}</button></article>`;
}

function invoicesMarkup() {
  return `${topbarMarkup("الفواتير", "كل فاتورة محفوظة مع منتجاتها وحركات خصم المخزون.")}
  <section class="panel invoice-list">${state.sales.length ? state.sales.map((sale) => `<button class="invoice-row" data-action="open-invoice" data-id="${sale.id}"><div class="invoice-row__mark">${icon("receipt", 20)}</div><div class="invoice-row__main"><strong>${sale.invoiceNumber}</strong><small>${dateTime(sale.date)} · ${sale.paymentMethod}</small></div><strong>${money(sale.total)}</strong>${icon("arrow", 18)}</button>`).join("") : emptyState("لا توجد فواتير حتى الآن", "أتم أول عملية بيع لتظهر تفاصيلها هنا.", "sales")}</section>`;
}

function render() {
  if (!state.settings?.setupCompleted) { root.innerHTML = setupMarkup(); bindEvents(); return; }
  const body = { dashboard: dashboardMarkup, products: productsMarkup, inventory: inventoryMarkup, sales: salesMarkup, invoices: invoicesMarkup }[state.view]?.() || dashboardMarkup();
  root.innerHTML = `<div class="app-shell">${navMarkup()}<main class="workspace">${body}</main></div>`;
  bindEvents();
}

function setupMarkup() {
  return `<main class="setup-page"><section class="setup-art"><div class="setup-art__brand"><img src="${markImage}" alt="" /><span class="brand-wordmark">حسابي</span><small>سجلّ المتجر اليومي</small></div><div class="setup-art__status"><span class="presence-dot"></span><span>نظامك المحلي جاهز للعمل دون اتصال</span></div><div class="setup-art__copy"><p class="eyebrow">المرحلة الأولى · سجل تشغيلي</p><h1>دفتر تشغيل متجرك،<br />من أول منتج إلى الفاتورة.</h1><p>ابدأ بسجل منظّم يربط المنتجات بالمخزون والمبيعات، ويحفظ كل حركة على جهازك.</p><div class="setup-art__stamps"><span>منتجات</span><span>مخزون</span><span>فواتير</span></div></div><div class="setup-art__ledger-card"><span>سجل اليوم</span><strong>مخزون · مبيعات · فواتير</strong><i></i><i></i><i></i></div><img class="setup-art__image" src="/manus-storage/hesabi-setup-ledger_a7b0fae4.png" alt="رسم تعبيري لأدوات تنظيم المتجر" /></section><section class="setup-form-wrap"><div class="setup-sheet"><div class="setup-sheet__brand"><img src="${markImage}" alt="" /><div><strong>حسابي</strong><span>دفتر التاجر الهادئ</span></div><span class="setup-stamp">إعداد السجل</span></div><div class="setup-form"><span class="eyebrow">بيانات العمل</span><h2>لنضبط مساحة عملك</h2><p>سيظهر اسم المتجر على الفواتير، ويضبط النشاط والعملة طريقة عرض المخزون والمبيعات اليومية.</p><form id="setup-form"><label>اسم المتجر<input name="storeName" required maxlength="60" placeholder="مثال: بقالة الواحة" autofocus /></label><label>نوع النشاط<select name="businessType" required>${BUSINESS_TYPES.map((type) => `<option value="${type}">${type}</option>`).join("")}</select></label><label>العملة<select name="currency" required>${CURRENCIES.map((currency) => `<option value="${currency.code}">${currency.label}</option>`).join("")}</select></label><button class="button button--primary button--wide" type="submit">فتح سجل المتجر ${icon("arrow", 18)}</button></form><small class="offline-note"><span class="presence-dot"></span>يحفظ محليًا ويظل متاحًا بعد أول تحميل</small></div></div></section></main>`;
}

function bindEvents() {
  root.querySelectorAll("[data-action]").forEach((element) => element.addEventListener("click", handleAction));
  root.querySelector("#setup-form")?.addEventListener("submit", handleSetup);
  root.querySelector("#product-search")?.addEventListener("input", (event) => { state.productQuery = event.target.value; render(); root.querySelector("#product-search")?.focus(); });
  root.querySelector("#sale-search")?.addEventListener("input", (event) => { state.saleQuery = event.target.value; render(); root.querySelector("#sale-search")?.focus(); });
  root.querySelector("#sale-search")?.addEventListener("keydown", async (event) => { if (event.key === "Enter" && event.target.value.trim()) await findBarcode(event.target.value.trim(), "sale"); });
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

async function handleAction(event) {
  const action = event.currentTarget.dataset.action;
  const id = event.currentTarget.dataset.id;
  if (action === "navigate") { state.view = event.currentTarget.dataset.view; render(); return; }
  if (action === "new-product") { openProductDialog(); return; }
  if (action === "open-product") { openProductDialog(await db.getProduct(id)); return; }
  if (action === "adjust-stock") { openAdjustmentDialog(await db.getProduct(id)); return; }
  if (action === "open-scanner") { openScanner(event.currentTarget.dataset.mode); return; }
  if (action === "add-cart") { addToCart(id); return; }
  if (action === "cart-increment") { changeCart(id, 1); return; }
  if (action === "cart-decrement") { changeCart(id, -1); return; }
  if (action === "cart-remove") { state.cart = state.cart.filter((line) => line.productId !== id); render(); return; }
  if (action === "clear-cart") { state.cart = []; render(); return; }
  if (action === "checkout") { openCheckoutDialog(); return; }
  if (action === "open-invoice") { openInvoiceDialog(id); }
}

function addToCart(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;
  const existing = state.cart.find((item) => item.productId === productId);
  if (existing && existing.quantity >= product.quantity) { showToast("الكمية المتوفرة غير كافية", "error"); return; }
  if (existing) existing.quantity += 1;
  else state.cart.push({ productId: product.id, name: product.name, unitPrice: product.salePrice, quantity: 1 });
  state.saleQuery = "";
  render();
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

function openDialog(content) {
  closeDialog();
  const overlay = document.createElement("div");
  overlay.className = "dialog-backdrop";
  overlay.id = "dialog-backdrop";
  overlay.innerHTML = `<section class="dialog" role="dialog" aria-modal="true">${content}</section>`;
  overlay.addEventListener("click", (event) => { if (event.target === overlay) closeDialog(); });
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("is-open"));
  overlay.querySelector("[data-dialog-close]")?.addEventListener("click", closeDialog);
  return overlay;
}

function closeDialog() { stopScanner(); document.querySelector("#dialog-backdrop")?.remove(); }

function productFormMarkup(product = null, presetBarcode = "") {
  const isEdit = Boolean(product);
  const input = (name, label, type = "text", value = "", attrs = "") => `<label>${label}<input name="${name}" type="${type}" value="${escapeHtml(value)}" ${attrs} /></label>`;
  return `<div class="dialog__head"><div><span class="eyebrow">${isEdit ? "تحديث الكتالوج" : "منتج جديد"}</span><h2>${isEdit ? `تعديل ${escapeHtml(product.name)}` : "إضافة منتج"}</h2></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><form id="product-form" class="form-grid" data-id="${product?.id || ""}">${input("name", "اسم المنتج", "text", product?.name, "required maxlength=100 autofocus")}${input("barcode", "الباركود", "text", product?.barcode || presetBarcode, "inputmode=numeric")}${input("internalCode", "الكود الداخلي", "text", product?.internalCode)}${input("purchasePrice", "سعر الشراء", "number", product?.purchasePrice ?? "", "min=0 step=0.01 required")}${input("salePrice", "سعر البيع", "number", product?.salePrice ?? "", "min=0 step=0.01 required")}${!isEdit ? input("quantity", "الكمية الافتتاحية", "number", "0", "min=0 step=0.001") : `<div class="locked-field"><span>الكمية الحالية</span><strong>${amount(product.quantity)} ${escapeHtml(product.unit)}</strong><small>تُعدّل من شاشة المخزون فقط.</small></div>`}${input("minimumStock", "الحد الأدنى للمخزون", "number", product?.minimumStock ?? "0", "min=0 step=0.001 required")}<label>الوحدة<select name="unit">${UNITS.map((unit) => `<option value="${unit}" ${product?.unit === unit ? "selected" : ""}>${unit}</option>`).join("")}</select></label><div class="dialog__actions form-full"><button type="button" class="button button--secondary" data-dialog-close>إلغاء</button><button type="submit" class="button button--primary">${isEdit ? "حفظ التعديلات" : "حفظ المنتج"} ${icon("check", 17)}</button></div></form>${isEdit ? `<div class="dialog__danger"><span>لا يُحذف المنتج نهائيًا؛ يحتفظ التطبيق بسجله إذا ارتبط بفواتير.</span><button class="text-button text-button--danger" id="delete-product">${icon("trash", 16)} حذف من القائمة</button></div>` : ""}`;
}

function openProductDialog(product = null, presetBarcode = "") {
  const overlay = openDialog(productFormMarkup(product, presetBarcode));
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog));
  overlay.querySelector("#product-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    try {
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
  const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">حركة مخزون</span><h2>تعديل مخزون ${escapeHtml(product.name)}</h2></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><div class="stock-before"><span>الكمية الحالية</span><strong>${amount(product.quantity)} ${escapeHtml(product.unit)}</strong></div><form id="adjustment-form" class="form-grid"><label>الكمية الجديدة<input required name="newQuantity" type="number" min="0" step="0.001" value="${product.quantity}" autofocus /></label><label>سبب التعديل<textarea name="note" required maxlength="180" placeholder="مثال: جرد آخر اليوم"></textarea></label><div class="dialog__actions form-full"><button type="button" class="button button--secondary" data-dialog-close>إلغاء</button><button type="submit" class="button button--primary">تسجيل الحركة ${icon("check", 17)}</button></div></form>`);
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog));
  overlay.querySelector("#adjustment-form").addEventListener("submit", async (event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); try { await db.adjustStock(product.id, values.newQuantity, values.note); await refresh(); closeDialog(); render(); showToast("تم تسجيل حركة تعديل المخزون"); } catch (error) { showToast(error.message, "error"); } });
}

function openCheckoutDialog() {
  const initial = calculateSaleTotals(state.cart, 0);
  const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">تثبيت الفاتورة</span><h2>مراجعة البيع</h2></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><div class="checkout-lines">${state.cart.map((line) => `<div><span>${escapeHtml(line.name)} × ${amount(line.quantity)}</span><strong>${money(line.unitPrice * line.quantity)}</strong></div>`).join("")}</div><form id="checkout-form" class="form-grid"><label>الخصم<input name="discount" type="number" min="0" step="0.01" value="0" /></label><label>طريقة الدفع<select name="paymentMethod">${PAYMENT_METHODS.map((method) => `<option value="${method}">${method}</option>`).join("")}</select></label><label class="form-full">المبلغ المدفوع<input id="paid-amount" name="paidAmount" type="number" min="0" step="0.01" value="${initial.total}" required /></label><div class="checkout-total form-full"><span>الإجمالي النهائي</span><strong id="checkout-total">${money(initial.total)}</strong></div><div class="dialog__actions form-full"><button type="button" class="button button--secondary" data-dialog-close>رجوع</button><button type="submit" class="button button--primary">تأكيد البيع ${icon("check", 17)}</button></div></form>`);
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog));
  overlay.querySelector("[name=discount]").addEventListener("input", (event) => { const totals = calculateSaleTotals(state.cart, event.target.value); overlay.querySelector("#checkout-total").textContent = money(totals.total); overlay.querySelector("#paid-amount").value = totals.total; });
  overlay.querySelector("#checkout-form").addEventListener("submit", async (event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); try { const sale = await db.completeSale({ items: state.cart, ...values }); state.cart = []; await refresh(); closeDialog(); state.view = "invoices"; render(); showToast(`تم حفظ الفاتورة ${sale.invoiceNumber} وخصم المخزون`); } catch (error) { showToast(error.message, "error"); } });
}

async function openInvoiceDialog(saleId) {
  const invoice = await db.getInvoice(saleId);
  if (!invoice) return;
  openDialog(`<div class="dialog__head"><div><span class="eyebrow">فاتورة محفوظة</span><h2>${invoice.invoiceNumber}</h2><p class="dialog__subtext">${dateTime(invoice.date)} · ${invoice.paymentMethod}</p></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><div class="invoice-detail">${invoice.items.map((item) => `<div><span><strong>${escapeHtml(item.productName)}</strong><small>${amount(item.quantity)} ${escapeHtml(item.unit)} × ${money(item.unitPrice)}</small></span><strong>${money(item.total)}</strong></div>`).join("")}<div class="invoice-detail__total"><span>الإجمالي قبل الخصم</span><strong>${money(invoice.subtotal)}</strong></div><div><span>الخصم</span><strong>${money(invoice.discount)}</strong></div><div class="invoice-detail__final"><span>الإجمالي النهائي</span><strong>${money(invoice.total)}</strong></div><div><span>المبلغ المدفوع</span><strong>${money(invoice.paidAmount)}</strong></div></div><div class="dialog__actions"><button class="button button--primary button--wide" data-dialog-close>إغلاق الفاتورة</button></div>`);
  document.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog));
}

async function findBarcode(code, mode) {
  const product = await db.findProductByBarcode(code);
  if (product) { closeDialog(); if (mode === "sale") { addToCart(product.id); showToast(`أُضيف ${product.name} إلى السلة`); } else openProductDialog(product); return; }
  closeDialog();
  const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">نتيجة المسح</span><h2>المنتج غير موجود</h2></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><p class="dialog__subtext">لم نجد باركود <strong>${escapeHtml(code)}</strong> في المنتجات المحفوظة.</p><div class="dialog__actions"><button class="button button--secondary" data-dialog-close>إلغاء</button><button class="button button--primary" id="create-from-barcode">إنشاء منتج ${icon("plus", 17)}</button></div>`);
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog));
  overlay.querySelector("#create-from-barcode").addEventListener("click", () => openProductDialog(null, code));
}

async function openScanner(mode) {
  if (!("BarcodeDetector" in window) || !navigator.mediaDevices?.getUserMedia) {
    const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">إدخال يدوي</span><h2>اكتب الباركود</h2></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><p class="dialog__subtext">لا يدعم هذا المتصفح ماسح الباركود بالكاميرا. أدخل الرمز يدويًا للبحث دون توقف التطبيق.</p><form id="manual-barcode-form" class="manual-barcode"><input name="barcode" required inputmode="numeric" placeholder="الباركود" autofocus /><button class="button button--primary" type="submit">بحث</button></form>`);
    overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog));
    overlay.querySelector("#manual-barcode-form").addEventListener("submit", (event) => { event.preventDefault(); findBarcode(new FormData(event.currentTarget).get("barcode"), mode); });
    return;
  }
  const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">ماسح الكاميرا</span><h2>وجّه الكاميرا نحو الباركود</h2></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><div class="scanner-box"><video id="scanner-video" autoplay muted playsinline></video><div class="scanner-box__guide"></div></div><p class="dialog__subtext">سنفتح المنتج عند قراءة رمز مسجل، أو نقترح إنشاءه إن لم يكن موجودًا.</p>`);
  overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog));
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    const video = overlay.querySelector("#scanner-video"); video.srcObject = stream;
    const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "code_128", "qr_code", "upc_a", "upc_e"] });
    let reading = false;
    const timer = window.setInterval(async () => { if (reading || video.readyState < 2) return; try { const codes = await detector.detect(video); if (codes[0]?.rawValue) { reading = true; await findBarcode(codes[0].rawValue, mode); } } catch (error) { console.warn("تعذر تحليل الباركود", error); } }, 450);
    state.scanner = { stream, timer };
  } catch (error) { closeDialog(); showToast("تعذر فتح الكاميرا. استخدم إدخال الباركود يدويًا.", "error"); openScannerFallback(mode); }
}

function openScannerFallback(mode) { const overlay = openDialog(`<div class="dialog__head"><div><span class="eyebrow">إدخال يدوي</span><h2>اكتب الباركود</h2></div><button class="icon-button" data-dialog-close aria-label="إغلاق">${icon("close", 20)}</button></div><form id="manual-barcode-form" class="manual-barcode"><input name="barcode" required inputmode="numeric" placeholder="الباركود" autofocus /><button class="button button--primary" type="submit">بحث</button></form>`); overlay.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", closeDialog)); overlay.querySelector("#manual-barcode-form").addEventListener("submit", (event) => { event.preventDefault(); findBarcode(new FormData(event.currentTarget).get("barcode"), mode); }); }

function stopScanner() { if (!state.scanner) return; clearInterval(state.scanner.timer); state.scanner.stream?.getTracks().forEach((track) => track.stop()); state.scanner = null; }

export async function bootApp(target) {
  root = target;
  try { await db.open(); state.settings = await db.getSettings(); if (state.settings?.setupCompleted) await refresh(); render(); } catch (error) { root.innerHTML = `<main class="fatal-state"><img src="${markImage}" alt=""/><h1>تعذر فتح التخزين المحلي</h1><p>${escapeHtml(error.message)}</p><button class="button button--primary" onclick="location.reload()">إعادة المحاولة</button></main>`; }
}
