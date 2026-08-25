import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderThermalInvoiceHtml } from "../client/src/js/invoice-print.js";
import { renderCustomerAccountHtml } from "../client/src/js/customer-account-print.js";
import { randomId, shortRandomId } from "../client/src/js/ids.js";

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);

test("ينشئ قالب الطباعة الحرارية 80 مم وفيه الفاتورة والبنود والإجمالي وطريقة السداد", () => {
  const html = renderThermalInvoiceHtml({
    storeName: "بقالة الاختبار",
    invoice: { invoiceNumber: "INV-000123", date: "2026-08-23T00:00:00.000Z", subtotal: 120, discount: 20, total: 100, paidAmount: 30, remainingAmount: 70, paymentType: "آجل", customerName: "أحمد العميل", items: [{ productName: "ماء <معدني>", quantity: 2, unit: "حبة", unitPrice: 60, total: 120 }] },
    customer: { phone: "777123456", address: "صنعاء" },
    formatMoney: (value) => `${value} ر.ي`, formatAmount: (value) => String(value), formatDateTime: () => "23 أغسطس 2026", escapeHtml, paymentLabel: "دين",
  });
  assert.match(html, /@page\{size:80mm auto;margin:4mm\}/);
  assert.match(html, /INV-000123/);
  assert.match(html, /ماء &lt;معدني&gt;/);
  assert.match(html, /الإجمالي/);
  assert.match(html, /100 ر\.ي/);
  assert.match(html, /طريقة السداد/);
  assert.match(html, /دين/);
  assert.match(html, /المتبقي/);
  assert.match(html, /70 ر\.ي/);
  assert.match(html, /بيانات العميل/);
  assert.match(html, /أحمد العميل/);
  assert.match(html, /777123456/);
  assert.match(html, /صنعاء/);
});

test("يخصص PDF الفاتورة لرسم عربي مباشر عالي الدقة بدل صورة نص قد تتداخل حروفها", async () => {
  const [pdfExport, app] = await Promise.all([
    readFile(new URL("../client/src/js/pdf-export.js", import.meta.url), "utf8"),
    readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8"),
  ]);
  assert.match(pdfExport, /HesabiArabicPdf/);
  assert.match(pdfExport, /weight: "100 900"/);
  assert.match(pdfExport, /drawThermalInvoiceCanvas/);
  assert.match(pdfExport, /drawCustomerAccountCanvas/);
  assert.match(pdfExport, /drawReportCanvas/);
  assert.match(pdfExport, /createReportPdfFile/);
  assert.match(pdfExport, /shareOrDownloadCustomerAccountPdf/);
  assert.match(pdfExport, /context\.direction = "rtl"/);
  assert.match(app, /shareOrDownloadInvoicePdf/);
  assert.match(app, /shareInvoice\(invoice\)/);
  assert.match(app, /await db\.getCustomer\(invoice\.customerId\)/);
  assert.match(app, /shareOrDownloadCustomerAccountPdf\(/);
  assert.match(app, /createReportPdfFile\(/);
});

test("يدعم البحث المباشر برقم الفاتورة ويعرض عددي المنتجات والفواتير بأرقام إنجليزية في الرئيسية", async () => {
  const app = await readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8");
  assert.match(app, /invoiceQuery: ""/);
  assert.match(app, /id="invoice-search"/);
  assert.match(app, /bindSearchInput\("#invoice-search", "invoiceQuery"\)/);
  assert.match(app, /amountLatin\(dashboard\.productCount\)/);
  assert.match(app, /amountLatin\(dashboard\.todayInvoiceCount\)/);
});

test("يعرض رأس التطبيق اسم المتجر بدل نوع النشاط", async () => {
  const app = await readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8");
  assert.match(app, /escapeHtml\(state\.settings\?\.storeName \|\| "إدارة المتجر"\)/);
  assert.doesNotMatch(app, /escapeHtml\(state\.settings\?\.businessType \|\| "إدارة المتجر"\)/);
});

test("يربط خيار البقاء وكل عناصر إغلاق النافذة بدالة الإغلاق الموحدة", async () => {
  const app = await readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8");
  assert.match(app, /data-dialog-close>البقاء في التطبيق/);
  assert.match(app, /querySelectorAll\("\[data-dialog-close\]"\)\.forEach\(\(button\) => button\.addEventListener\("click", closeDialog\)\)/);
});

test("يضيف رابط اتصال آمنًا لعملاء وموردين لديهم هاتف فقط", async () => {
  const app = await readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8");
  assert.match(app, /const phoneHref = \(phone\)/);
  assert.match(app, /tel:\$\{raw\.startsWith\("\+"\)/);
  assert.match(app, /phoneCallButton\(supplier\.phone, supplier\.name\)/);
  assert.match(app, /phoneCallButton\(customer\.phone, customer\.name\)/);
  assert.match(app, /return href \? `<a class="icon-button icon-button--call"/);
});

test("يدعم اختيار رقم من جهات الاتصال لحقلي العميل والمورد مع إبقاء الإدخال اليدوي", async () => {
  const app = await readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8");
  assert.match(app, /navigator\.contacts\?\.select/);
  assert.match(app, /navigator\.contacts\.select\(\["name", "tel"\], \{ multiple: false \}\)/);
  assert.match(app, /phoneFieldMarkup\("customer-phone"/);
  assert.match(app, /phoneFieldMarkup\("supplier-phone"/);
  assert.match(app, /bindContactPicker\(overlay, "customer-phone"\)/);
  assert.match(app, /bindContactPicker\(overlay, "supplier-phone"\)/);
});

test("يعرض المبالغ الصحيحة من دون أصفار عشرية زائدة ويحتفظ بالكسور الفعلية", async () => {
  const app = await readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8");
  assert.match(app, /minimumFractionDigits: 0, maximumFractionDigits: 2/);
  assert.match(app, /format\(roundMoney\(value\)\)/);
});

test("تتيح صفحة دفعات الموردين اختيار المورد المستحق وتسوية رصيده وطريقة الدفع", async () => {
  const [app, permissions] = await Promise.all([
    readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8"),
    readFile(new URL("../client/src/js/permissions.js", import.meta.url), "utf8"),
  ]);
  assert.match(app, /data-action="new-supplier-payment"/);
  assert.match(app, /function openSupplierPaymentDialog\(supplierId = ""\)/);
  assert.match(app, /id="supplier-payment-supplier" name="supplierId" required/);
  assert.match(app, /id="supplier-payment-balance"/);
  assert.match(app, /db\.registerSupplierPayment\(\{ supplierId: values\.supplierId \|\| selectedId/);
  assert.match(permissions, /"new-supplier-payment"/);
});

test("اختيار منتج في فاتورة الشراء يهيئ حقول العبوة مرة واحدة دون مراقب DOM يعيد الرسم بلا نهاية", async () => {
  const app = await readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8");
  assert.doesNotMatch(app, /new MutationObserver\(hydrateBusinessPurchaseFields\)/);
  assert.match(app, /linesHost\.innerHTML = lines\.length[\s\S]*?hydrateBusinessPurchaseFields\(\);[\s\S]*?syncPurchase\(\);/);
  assert.match(app, /const addPurchaseProduct = \(product\)[\s\S]*?renderLines\(\);/);
});

test("يعرض تنبيه المخزون المنخفض أو النافد بلون قرمزي واضح في الملخص والوسم", async () => {
  const styles = await readFile(new URL("../client/src/style.css", import.meta.url), "utf8");
  assert.match(styles, /\.status--low,\.status--empty \{ color:#fff; background:#b51f3a; border:1px solid #7d1028;/);
  assert.match(styles, /\.inventory-summary div\+div \{ color:#fff; background:linear-gradient\(145deg,#c42a47,#84132b\);/);
  assert.match(styles, /\[data-theme="dark"\] \.inventory-summary div\+div \{ background:linear-gradient\(145deg,#c42a47,#84132b\);/);
});

test("تظهر صلاحية الشراء في المخزون بتحذير برتقالي قبل ثلاثة أشهر وأحمر خلال شهر", async () => {
  const [app, database, styles] = await Promise.all([
    readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8"),
    readFile(new URL("../client/src/js/database.js", import.meta.url), "utf8"),
    readFile(new URL("../client/src/style.css", import.meta.url), "utf8"),
  ]);
  assert.match(app, /function expiryStatus\(product, today = dateKey\(\)\)/);
  assert.match(app, /const formatDate = \(value\) => \{/);
  assert.match(app, /days <= 30 \? "danger" : "warning"/);
  assert.match(app, /تنبيه انتهاء الصلاحية/);
  assert.match(app, /data-purchase-expiry-date/);
  assert.match(database, /if \(expiryDate\) batches\.add/);
  assert.match(database, /لا يمكن حفظ منتج منتهٍ أو ينتهي اليوم/);
  assert.match(styles, /\.expiry-status--warning \{ color:#845100; background:#fff3d4; border-color:#e2a443;/);
  assert.match(styles, /\.expiry-status--danger \{ color:#8b1d31; background:#fde6e9; border-color:#cf4f63;/);
});

test("يبدأ شريط الهاتف بترتيب افتراضي قابل للتخصيص من الإعدادات ويبقي القسم النشط قابلًا للوصول", async () => {
  const [app, styles] = await Promise.all([
    readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8"),
    readFile(new URL("../client/src/style.css", import.meta.url), "utf8"),
  ]);
  assert.match(app, /const DEFAULT_MOBILE_NAVIGATION_ORDER = \["dashboard", "sales", "invoices", "purchases"/);
  assert.match(app, /function normalizedMobileNavigationOrder\(order = \[\]\)/);
  assert.match(app, /function mobileNavigationSettingsMarkup\(\)/);
  assert.match(app, /data-action="move-mobile-nav"/);
  assert.match(app, /data-action="reset-mobile-nav"/);
  assert.match(app, /<nav class="bottom-nav" data-bottom-nav aria-label="التنقل الرئيسي">\$\{renderItems\(bottomItems\)\}<\/nav>/);
  assert.match(app, /function syncMobileNavigation\(\)[\s\S]*?activeItem\?\.scrollIntoView/);
  assert.match(app, /if \(action === "navigate"\)[\s\S]*?state\.view = view; render\(\);/);
  assert.match(styles, /\.bottom-nav \{[^}]*overflow-x:auto;[^}]*scroll-snap-type:x proximity;/);
  assert.match(styles, /\.bottom-nav::\-webkit-scrollbar \{ display:none; \}/);
  assert.match(styles, /\[data-theme="dark"\] \.mobile-nav-settings__item strong \{ color:#fff; \}/);
  assert.match(styles, /\[data-theme="dark"\] \.mobile-nav-settings__actions \.icon-button \{ color:#fff4f6; background:linear-gradient\(145deg,#c42a47,#84132b\);/);
  assert.match(app, /input\("nearestExpiryDate", "تاريخ الانتهاء", "date", product\?\.nearestExpiryDate \?\? ""\)/);
});

test("لا يكرر تعريف حالة الواجهة مفاتيح فلترة دفعات الموردين", async () => {
  const app = await readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8");
  const initialState = app.match(/const state = \{[^;]+\};/)?.[0] || "";
  assert.equal((initialState.match(/supplierPaymentFrom:/g) || []).length, 1);
  assert.equal((initialState.match(/supplierPaymentTo:/g) || []).length, 1);
});

test("تستخدم المعرفات بديلًا متوافقًا بدل الاعتماد المباشر على randomUUID", async () => {
  const [app, database, firebaseBackup, ids] = await Promise.all([
    readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8"),
    readFile(new URL("../client/src/js/database.js", import.meta.url), "utf8"),
    readFile(new URL("../client/src/js/firebase-backup.js", import.meta.url), "utf8"),
    readFile(new URL("../client/src/js/ids.js", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(`${app}\n${database}\n${firebaseBackup}`, /crypto\.randomUUID/);
  assert.match(ids, /globalThis\.crypto\?\.randomUUID/);
  assert.match(database, /const secureCrypto = \(\) =>/);
  assert.match(database, /secureCrypto\(\)\.getRandomValues/);
  assert.match(database, /secureCrypto\(\)\.subtle\.digest/);
});

test("ينشئ مساعد المعرفات معرفًا كاملاً وآخر قصيرًا صالحين للاستخدام", () => {
  assert.ok(randomId().length >= 8);
  assert.match(shortRandomId(), /^[A-F0-9]{8}$/);
});

test("يحمي طلب استرداد الهاتف من تعليق الشبكة بمهلة ورسالة إعادة محاولة", async () => {
  const app = await readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8");
  assert.match(app, /const controller = new AbortController\(\);/);
  assert.match(app, /window\.setTimeout\(\(\) => controller\.abort\(\), 15000\)/);
  assert.match(app, /signal: controller\.signal/);
  assert.match(app, /انتهت مهلة الإرسال\. تحقق من الإنترنت ثم حاول مرة أخرى\./);
  assert.match(app, /window\.clearTimeout\(timeout\); submit\.disabled = false/);
});

test("تستخدم أزرار الوضع الداكن زمرديًا عميقًا وياقوتيًا مع نص أبيض واضح", async () => {
  const css = await readFile(new URL("../client/src/style.css", import.meta.url), "utf8");
  assert.match(css, /\[data-theme="dark"\] \.button--primary \{ color:#fff; background:linear-gradient\(145deg,#21755f,#16473b\)/);
  assert.match(css, /\[data-theme="dark"\] \.button--danger \{ color:#fff; background:linear-gradient\(145deg,#c42a47,#84132b\)/);
  assert.match(css, /\[data-theme="dark"\] \.button--secondary,\[data-theme="dark"\] \.theme-toggle \{ color:#f4fff8; background:#21463a/);
  assert.match(css, /payment-method-toggle__button\.is-cash\.is-selected.*background:#1d6a56/);
});

test("توحّد واجهة سطح المكتب حقول النماذج وتبرز القائمة الجانبية في الوضعين", async () => {
  const css = await readFile(new URL("../client/src/style.css", import.meta.url), "utf8");
  assert.match(css, /@media \(min-width:960px\) \{[\s\S]*?\.form-grid>label>input,\.form-grid>label>select \{ height:46px; font-size:15px;/);
  assert.match(css, /\.sidebar \.nav-item\.is-active \{ color:#fff; background:linear-gradient\(145deg,#21755f,#16473b\);/);
  assert.match(css, /\[data-theme="dark"\] \.sidebar \.nav-item \{ color:#d8eee2; background:rgba\(255,255,255,\.025\);/);
  assert.match(css, /\[data-theme="dark"\] \.sidebar \.nav-item\.is-active \{ color:#fff; background:linear-gradient\(145deg,#238465,#14513f\);/);
});

test("ترتب بطاقة بيانات المتجر مستقلة عن بطاقة ترتيب الهاتف على سطح المكتب", async () => {
  const css = await readFile(new URL("../client/src/style.css", import.meta.url), "utf8");
  assert.match(css, /\.settings-page \.report-grid \{ align-items:start; \}/);
  assert.match(css, /\.settings-page #settings-form>\.panel__head \{ padding:19px 22px 15px; margin:0 -22px 2px; border-bottom:1px solid var\(--line\); \}/);
  assert.match(css, /\.settings-page #settings-form>label:first-of-type \{ grid-column:1 \/ -1; \}/);
  assert.match(css, /\.settings-page #settings-form>\.dialog__actions \{ margin:2px 0 0; padding-top:14px; border-top:1px solid var\(--line\); \}/);
});

test("تورث فاتورة الشراء سعر بيع الحبة للمنتج السابق وتستخدم شبكة مكتبية منظمة", async () => {
  const [app, css] = await Promise.all([
    readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8"),
    readFile(new URL("../client/src/style.css", import.meta.url), "utf8"),
  ]);
  assert.match(app, /values\.salePrice === undefined \|\| values\.salePrice === "" \? product\.salePrice \?\? product\.defaultSalePrice \?\? product\.price \?\? 0 : values\.salePrice/);
  assert.match(app, /salePrice: toNumber\(salePrice\)/);
  assert.match(css, /\.purchase-line \{ grid-template-columns:repeat\(4,minmax\(0,1fr\)\); align-items:end; gap:12px; padding:16px; \}/);
  assert.match(css, /\.purchase-line>div:first-child \{ grid-column:1 \/ -1;/);
  assert.match(css, /\.purchase-line \.purchase-line__total \{ display:grid; grid-column:span 2;/);
});

test("يعرض حقل سعر البيع المعبأ قيمته داخل الخانة قبل اللمس ويبقيها قابلة للتعديل", async () => {
  const [app, css] = await Promise.all([
    readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8"),
    readFile(new URL("../client/src/style.css", import.meta.url), "utf8"),
  ]);
  assert.match(app, /class="purchase-sale-price-control"><input data-purchase-sale-price="\$\{index\}"/);
  assert.match(app, /data-purchase-sale-price-visible="\$\{index\}" aria-live="polite">\$\{escapeHtml\(String\(line\.salePrice \?\? ""\)\)\}/);
  assert.match(app, /value="\$\{line\.salePrice \?\? ""\}"/);
  assert.match(css, /\.purchase-sale-price-field__current \{ position:absolute; inset:0 11px; z-index:1; display:flex; align-items:center; pointer-events:none;/);
  assert.match(css, /\.purchase-sale-price-control:focus-within \.purchase-sale-price-field__current \{ opacity:0; \}/);
  assert.match(css, /\[data-theme="dark"\] \.purchase-sale-price-field input \{ color:#f2faf5 !important;/);
});

test("تحتوي نوافذ سطح المكتب حقول الشراء والنماذج داخل إطار النافذة", async () => {
  const css = await readFile(new URL("../client/src/style.css", import.meta.url), "utf8");
  assert.match(css, /\.dialog \{ box-sizing:border-box; overflow-x:hidden; \}/);
  assert.match(css, /\.dialog :is\(form,section,\.form-grid,\.purchase-form,\.purchase-line,\.barcode-field__control,\.manual-barcode\) \{ min-width:0; max-width:100%; \}/);
  assert.match(css, /\.dialog \.form-grid \{ grid-template-columns:repeat\(2,minmax\(0,1fr\)\); \}/);
  assert.match(css, /\.dialog \.purchase-line--pack \{ grid-template-columns:repeat\(2,minmax\(0,1fr\)\); max-width:100%; \}/);
  assert.match(css, /\.dialog \.purchase-line--pack>button \{ grid-column:2; justify-self:end; \}/);
});

test("تعكس أسهم ترتيب شريط الهاتف اتجاه التقديم والتأخير بصريًا دون تغيير الإجراء", async () => {
  const css = await readFile(new URL("../client/src/style.css", import.meta.url), "utf8");
  assert.match(css, /\.mobile-nav-settings__actions \[data-direction="-1"\] svg \{ transform:rotate\(180deg\); \}/);
  assert.match(css, /\.mobile-nav-settings__actions \[data-direction="1"\] svg \{ transform:none; \}/);
  assert.doesNotMatch(css, /\.mobile-nav-settings__down svg \{ transform:rotate\(180deg\); \}/);
});

test("تفصل الإعدادات إدارة البيانات في صفحة مخصصة لتصدير واستيراد النسخ", async () => {
  const [app, styles] = await Promise.all([
    readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8"),
    readFile(new URL("../client/src/style.css", import.meta.url), "utf8"),
  ]);
  assert.match(app, /function dataManagementMarkup\(\)/);
  assert.match(app, /data-view="data-management"/);
  assert.match(app, /تصدير واستيراد البيانات/);
  assert.match(app, /data-action="export-backup"/);
  assert.match(app, /for="restore-file"/);
  assert.match(app, /"data-management": dataManagementMarkup/);
  assert.match(app, /\["settings", "data-management"\]\.includes\(view\)/);
  assert.match(styles, /\.data-management-page \.button--danger \{ color:#fff; background:linear-gradient\(145deg,#c42a47,#84132b\)/);
  assert.match(styles, /\.topbar-sales-action \{ min-height:44px;/);
});

test("يعرض اختصاري حساب المورد والاتصال بجانب المنتج المرتبط به في قوائم المنتج والمخزون والبيع", async () => {
  const [app, styles] = await Promise.all([
    readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8"),
    readFile(new URL("../client/src/style.css", import.meta.url), "utf8"),
  ]);
  assert.match(app, /productSuppliers: \{\}/);
  assert.match(app, /db\.listProductSupplierLinks\(\)/);
  assert.match(app, /function productSupplierActions\(product\)/);
  assert.match(app, /data-action="open-supplier-account"/);
  assert.match(app, /phoneCallButton\(supplier\.phone, supplier\.name\)/);
  assert.match(app, /sale-product-line/);
  assert.match(styles, /\.product-supplier-actions,\.product-row-actions/);
  assert.match(styles, /\.sale-product-line/);
});

test("يجمع قائمة إعادة الطلب حسب المورد ويتيح حسابه واتصاله ومشاركة الطلب", async () => {
  const app = await readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8");
  assert.match(app, /function openReorderDialog\(\)/);
  assert.match(app, /data-action="open-reorder-list"/);
  assert.match(app, /data-reorder-supplier/);
  assert.match(app, /data-share-reorder/);
  assert.match(app, /navigator\.share/);
  assert.match(app, /phoneCallButton\(group\.supplier\.phone, group\.supplier\.name\)/);
});

test("يعرض الماسح أدوات مساعدة للكاميرا الضعيفة ويخفف تكرار تحليل الإطارات", async () => {
  const [app, styles] = await Promise.all([
    readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8"),
    readFile(new URL("../client/src/style.css", import.meta.url), "utf8"),
  ]);
  assert.match(app, /getScannerCameraConstraints/);
  assert.match(app, /getCameraAssistOptions/);
  assert.match(app, /focusMode: "continuous"/);
  assert.match(app, /focusDistance: value/);
  assert.match(app, /data-scanner-adjustment="focus"/);
  assert.match(app, /id="scanner-adjustment" class="scanner-adjustment" hidden/);
  assert.match(app, /torch: nextState/);
  assert.match(app, /CAMERA_SCAN_INTERVAL_MS/);
  assert.match(app, /تحسين القراءة/);
  assert.match(styles, /scanner-assist/);
  assert.match(styles, /scanner-assist__quick/);
  assert.match(styles, /scanner-adjustment\[hidden\]/);
});

test("تتيح شاشة البداية استعادة ملف حسابي قبل إنشاء متجر أو حسابات جديدة", async () => {
  const app = await readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8");
  assert.match(app, /for="setup-restore-file"/);
  assert.match(app, /id="setup-restore-file" type="file" accept="application\/json,\.json" hidden/);
  assert.match(app, /root\.querySelector\("#setup-restore-file"\)\?\.addEventListener\("change", restoreBackupFromFile\)/);
  assert.match(app, /ستعود بعدها إلى الدخول بحساباتك ورموزك السابقة/);
});

test("يفصل عنوان ووصف الصندوق عن أزراره على شاشات الهاتف الصغيرة", async () => {
  const [app, styles] = await Promise.all([
    readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8"),
    readFile(new URL("../client/src/style.css", import.meta.url), "utf8"),
  ]);
  assert.match(app, /"topbar--cashbox"/);
  assert.match(app, /function topbarMarkup\(title, description, action = "", modifierClass = ""\)/);
  assert.match(styles, /\.workspace > \.topbar\.topbar--cashbox \{ display:flex !important; flex-direction:column !important; align-items:stretch !important; gap:12px !important; \}/);
  assert.match(styles, /\.topbar--cashbox \.topbar__description \{ max-width:100%; overflow-wrap:normal; word-break:normal; line-height:1\.7; \}/);
  assert.match(styles, /\.workspace > \.topbar\.topbar--cashbox>div:first-child \{ flex:0 0 auto !important; width:100% !important; min-width:0 !important; \}/);
});

test("يضع كشف حساب العميل بياناته في بطاقة واضحة بخط عربي مناسب للطباعة", () => {
  const html = renderCustomerAccountHtml({
    account: { customer: { name: "أحمد العميل", phone: "777123456", address: "صنعاء" }, totalSales: 80, totalPaid: 40, balance: 40, transactions: [] },
    storeName: "بقالة الاختبار", formatMoney: (value) => `${value} ر.ي`, formatDateTime: () => "23 أغسطس 2026", escapeHtml,
  });
  assert.match(html, /بيانات العميل/);
  assert.match(html, /أحمد العميل/);
  assert.match(html, /777123456/);
  assert.match(html, /صنعاء/);
  assert.match(html, /customer-card/);
  assert.match(html, /family=Cairo/);
});

test("تظهر خدمة التوصيل وخيار تحميلها على العميل أو المحل في مراجعة البيع والفاتورة", async () => {
  const [app, database, pdfExport, thermalPrint] = await Promise.all([readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8"), readFile(new URL("../client/src/js/database.js", import.meta.url), "utf8"), readFile(new URL("../client/src/js/pdf-export.js", import.meta.url), "utf8"), readFile(new URL("../client/src/js/invoice-print.js", import.meta.url), "utf8")]);
  assert.match(app, /name="deliveryFee"/);
  assert.match(app, /name="deliveryChargeType"/);
  assert.match(app, /value="store"/);
  assert.match(app, /value="customer"/);
  assert.match(app, /مدفوعة بما فيها التوصيل/);
  assert.match(app, /على العميل ضمن الفاتورة/);
  assert.doesNotMatch(database, /DELIVERY_CHARGE/);
  assert.match(database, /category: "توصيل"/);
  assert.match(app, /deliveryLine/);
  assert.match(pdfExport, /invoice\.deliveryFee/);
  assert.match(thermalPrint, /invoice\.deliveryFee/);
  assert.match(app, /checkout-submit/);
  assert.match(app, /delivery-compact/);
  assert.match(app, /delivery-choice--store/);
  assert.match(app, /delivery-choice--customer/);
  assert.match(app, /checkout-launch/);
});

test("يعرض الخصم العام فقط في مراجعة البيع ويخفي خصم السطر والسعر المبدئي", async () => {
  const [app, domain, style] = await Promise.all([readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8"), readFile(new URL("../client/src/js/domain.js", import.meta.url), "utf8"), readFile(new URL("../client/src/style.css", import.meta.url), "utf8")]);
  assert.match(domain, /calculateDiscountAmount/);
  assert.match(domain, /raw\.endsWith\("%"\)/);
  assert.match(app, /name="discount"/);
  assert.match(app, /placeholder="0 أو 20%"/);
  assert.doesNotMatch(app, /data-cart-discount/);
  assert.doesNotMatch(app, /data-cart-line-discount/);
  assert.doesNotMatch(app, /الإجمالي المبدئي/);
  assert.match(style, /inventory-summary div,\.account-summary>div/);
  assert.match(style, /\.delivery-compact \{ display:grid; grid-template-columns:repeat\(3,minmax\(0,1fr\)\); align-items:end;/);
  assert.match(style, /\.delivery-choice \{ position:relative;[\s\S]*?align-self:end; min-height:29px; height:29px;/);
  assert.match(app, /<button class="button button--secondary" type="submit">ابحث<\/button>/);
  assert.match(style, /\.nav-item \{[^}]*color:#315a4b;/);
  assert.match(style, /\[data-theme="dark"\] \.bottom-nav \.nav-item \{ color:#d9f4e6; \}/);
  assert.match(style, /\.metric-card \{[^}]*background:#12634f;[^}]*border:2px solid #76d8b2;/);
  assert.doesNotMatch(style, /\.metric-card--sales/);
  assert.doesNotMatch(app, /metric-card--/);
  assert.match(style, /\[data-theme="dark"\] \.metric-card \{[^}]*background:#12634f;/);
  assert.match(style, /\.metric-card\.is-negative \{ background:#a73340; border-color:#ffc3ca;/);
});
