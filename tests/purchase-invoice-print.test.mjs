import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderPurchaseInvoiceHtml } from "../client/src/js/purchase-invoice-print.js";

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);

test("ينشئ قالب طباعة فاتورة الشراء A4 بخط Cairo المحلي وبطاقة المورد وملخص السداد وتفاصيل الأصناف", () => {
  const html = renderPurchaseInvoiceHtml({
    purchase: {
      invoiceNumber: "PUR-000045",
      date: "2026-09-01T09:30:00.000Z",
      supplierName: "سعيد <الاختبار>",
      subtotal: 320,
      discount: 20,
      total: 300,
      paidAmount: 230,
      remainingAmount: 70,
      paymentType: "آجل",
      paymentMethod: "تحويل بنكي",
      paymentStatus: "مدفوعة جزئيًا",
      returnedTotal: 0,
      notes: "تسليم باب المخزن",
      items: [
        { productName: "ماء <معدني>", quantity: 24, unit: "حبة", unitCost: 8, salePrice: 12, total: 192, packageQuantity: 2, packageUnit: "كرتونة", packageCost: 96, batchNumber: "B-12", expiryDate: "2027-01-15" },
        { productName: "أرز بسمتي", quantity: 10, unit: "كيس", unitCost: 10, salePrice: 13.5, total: 100 },
      ],
    },
    supplier: { phone: "777654321", address: "صنعاء" },
    storeName: "بقالة الاختبار",
    formatMoney: (value) => `${value} ر.ي`,
    formatAmount: (value) => String(value),
    formatDateTime: () => "1 سبتمبر 2026",
    escapeHtml,
  });
  assert.match(html, /@page\{size:A4;margin:14mm\}/);
  assert.match(html, /@font-face\{font-family:"Cairo";src:url\("\/fonts\/cairo-arabic\.woff2"\)/);
  assert.match(html, /PUR-000045/);
  assert.match(html, /بيانات المورد/);
  assert.match(html, /سعيد &lt;الاختبار&gt;/);
  assert.match(html, /777654321/);
  assert.match(html, /صنعاء/);
  assert.match(html, /إجمالي فاتورة الشراء/);
  assert.match(html, /المبلغ المدفوع/);
  assert.match(html, /المتبقي للمورد/);
  assert.match(html, /70 ر\.ي/);
  assert.match(html, /سعر البيع/);
  assert.match(html, /ماء &lt;معدني&gt;/);
  assert.match(html, /2 كرتونة × 96 ر\.ي/);
  assert.match(html, /التشغيلة: B-12/);
  assert.match(html, /الانتهاء: 2027-01-15/);
  assert.match(html, /طريقة الدفع/);
  assert.match(html, /تحويل بنكي/);
  assert.match(html, /ملاحظات/);
  assert.match(html, /تسليم باب المخزن/);
  assert.match(html, /هذه الفاتورة صادرة من حسبي/);
});

test("يوحّد طباعة وPDF فاتورة الشراء على قالب HTML واحد مثل بقية مستندات حسبي", async () => {
  const [app, pdfExport] = await Promise.all([
    readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8"),
    readFile(new URL("../client/src/js/pdf-export.js", import.meta.url), "utf8"),
  ]);
  assert.match(app, /import \{ renderPurchaseInvoiceHtml \} from "\.\/purchase-invoice-print\.js"/);
  assert.match(app, /function printPurchaseInvoice\(purchase\)/);
  assert.match(app, /printHtmlDocument\(\{ html, target: "hesabi-purchase-invoice", features: "width=900,height=760" \}\)/);
  assert.match(app, /<button id="print-purchase-invoice" class="button button--primary" type="button">طباعة<\/button>/);
  assert.match(app, /overlay\.querySelector\("#print-purchase-invoice"\)\.addEventListener\("click"/);
  assert.match(app, /shareOrDownloadPurchaseInvoicePdf\(\{ purchase: purchaseForPdf, supplier, html,/);
  assert.match(pdfExport, /if \(html\) return createPdfFileFromHtml\(\{ html, filename, page: "a4" \}\);/);
  assert.match(pdfExport, /drawPurchaseInvoiceCanvas/);
});
