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
  assert.match(pdfExport, /shareOrDownloadCustomerAccountPdf/);
  assert.match(pdfExport, /context\.direction = "rtl"/);
  assert.match(app, /shareOrDownloadInvoicePdf/);
  assert.match(app, /shareInvoice\(invoice\)/);
  assert.match(app, /await db\.getCustomer\(invoice\.customerId\)/);
  assert.match(app, /shareOrDownloadCustomerAccountPdf\(/);
});

test("يدعم البحث المباشر برقم الفاتورة ويعرض عددي المنتجات والفواتير بأرقام إنجليزية في الرئيسية", async () => {
  const app = await readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8");
  assert.match(app, /invoiceQuery: ""/);
  assert.match(app, /id="invoice-search"/);
  assert.match(app, /bindSearchInput\("#invoice-search", "invoiceQuery"\)/);
  assert.match(app, /amountLatin\(dashboard\.productCount\)/);
  assert.match(app, /amountLatin\(dashboard\.todayInvoiceCount\)/);
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
