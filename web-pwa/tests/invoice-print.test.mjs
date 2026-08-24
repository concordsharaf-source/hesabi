import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderThermalInvoiceHtml } from "../client/src/js/invoice-print.js";
import { renderCustomerAccountHtml } from "../client/src/js/customer-account-print.js";

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
  assert.match(app, /torch: nextState/);
  assert.match(app, /CAMERA_SCAN_INTERVAL_MS/);
  assert.match(app, /ثبّت الجوال ونظّف العدسة/);
  assert.match(styles, /scanner-assist/);
  assert.match(styles, /scanner-assist__zoom/);
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
