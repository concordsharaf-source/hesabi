import test from "node:test";
import assert from "node:assert/strict";
import { renderThermalInvoiceHtml } from "../client/src/js/invoice-print.js";

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);

test("ينشئ قالب الطباعة الحرارية 80 مم وفيه الفاتورة والبنود والإجمالي وطريقة السداد", () => {
  const html = renderThermalInvoiceHtml({
    storeName: "بقالة الاختبار",
    invoice: { invoiceNumber: "INV-000123", date: "2026-08-23T00:00:00.000Z", subtotal: 120, discount: 20, total: 100, paidAmount: 30, remainingAmount: 70, paymentType: "آجل", items: [{ productName: "ماء <معدني>", quantity: 2, unit: "حبة", unitPrice: 60, total: 120 }] },
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
});
