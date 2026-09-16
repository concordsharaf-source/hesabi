import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeThermalPrintOptions, renderThermalInvoiceHtml, THERMAL_PAPER_WIDTHS, DEFAULT_THERMAL_FOOTER } from "../client/src/js/invoice-print.js";

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);

const baseInvoice = {
  invoiceNumber: "INV-777",
  date: "2026-09-16T00:00:00.000Z",
  subtotal: 100, discount: 0, total: 100, paidAmount: 100, remainingAmount: 0,
  paymentType: "نقدي",
  items: [{ productName: "شاي", quantity: 1, unit: "حبة", unitPrice: 100, total: 100 }],
};

const renderWith = (settings) => renderThermalInvoiceHtml({
  invoice: baseInvoice,
  storeName: "بقالة الاختبار",
  storeInfo: settings,
  logoDataUrl: "data:image/png;base64,AAA",
  formatMoney: (value) => `${value} ر.ي`,
  formatAmount: (value) => String(value),
  formatDateTime: () => "16 سبتمبر 2026",
  escapeHtml,
  paymentLabel: "كاش",
});

test("تطبيع خيارات الطباعة الحرارية: الافتراضي 80 مم مع الشعار والنص الافتراضي", () => {
  const options = normalizeThermalPrintOptions(null);
  assert.equal(options.paperWidth, "80");
  assert.equal(options.showLogo, true);
  assert.equal(options.footerText, DEFAULT_THERMAL_FOOTER);
  assert.deepEqual(THERMAL_PAPER_WIDTHS, ["80", "58"]);
});

test("يدعم قالب الطباعة الحرارية عرض 58 مم عند اختياره من الإعدادات", () => {
  const html = renderWith({ thermalPaperWidth: "58" });
  assert.match(html, /@page\{size:58mm auto;margin:4mm\}/);
  assert.match(html, /width:50mm;/);
});

test("يبقى 80 مم افتراضيًا عند قيمة غير مدعومة", () => {
  const html = renderWith({ thermalPaperWidth: "999" });
  assert.match(html, /@page\{size:80mm auto;margin:4mm\}/);
  assert.match(html, /width:72mm;/);
});

test("نص التذييل المخصص يظهر في الفاتورة مع تعقيم HTML", () => {
  const html = renderWith({ thermalFooterText: "زورونا <مجددًا>" });
  assert.match(html, /زورونا &lt;مجددًا&gt;/);
  assert.doesNotMatch(html, new RegExp(DEFAULT_THERMAL_FOOTER));
});

test("إخفاء الشعار من الفاتورة الحرارية عند تعطيله", () => {
  const withLogo = renderWith({ thermalShowLogo: true });
  const withoutLogo = renderWith({ thermalShowLogo: false });
  assert.match(withLogo, /<img class="invoice-logo"/);
  assert.doesNotMatch(withoutLogo, /<img class="invoice-logo"/);
});

test("مركز الإعدادات يضم قسم المظهر والباركود والطباعة مع أوضاع النظام والفاتح والداكن", async () => {
  const app = await readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8");
  assert.match(app, /setAppearance/);
  assert.match(app, /appearanceSettingsMarkup/);
  assert.match(app, /saveAppearanceSettings/);
  assert.match(app, /حسب النظام/);
  assert.match(app, /فاتح دائمًا/);
  assert.match(app, /داكن دائمًا/);
  assert.match(app, /\{ value: "system", label: "حسب النظام"/);
  assert.match(app, /\{ value: "light", label: "فاتح دائمًا"/);
  assert.match(app, /\{ value: "dark", label: "داكن دائمًا"/);
  assert.match(app, /type="radio" name="theme"/);
  assert.match(app, /thermalPaperWidth/);
  assert.match(app, /thermalFooterText/);
  assert.match(app, /thermalShowLogo/);
});

test("صوت واهتزاز الماسح يحترمان إعدادات المستخدم ويبقيان مفعّلين افتراضيًا", async () => {
  const app = await readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8");
  assert.match(app, /function scannerSoundAllowed\(\) \{ return state\.settings\?\.scannerSoundEnabled === undefined \? true : Boolean\(state\.settings\.scannerSoundEnabled\); \}/);
  assert.match(app, /function scannerVibrationAllowed\(\) \{ return state\.settings\?\.scannerVibrationEnabled === undefined \? true : Boolean\(state\.settings\.scannerVibrationEnabled\); \}/);
  assert.match(app, /scannerSoundAllowed\(\) \? getScannerSuccessAudioContext\(\) : null/);
  assert.match(app, /scannerVibrationAllowed\(\) && navigator\.vibrate/);
});

test("الوضع الداكن يعالج تباين شارات الحسابات والحالة والنشاط", async () => {
  const css = await readFile(new URL("../client/src/style.css", import.meta.url), "utf8");
  assert.match(css, /\[data-theme="dark"\] \.account-badge--admin/);
  assert.match(css, /\[data-theme="dark"\] \.account-badge--cashier/);
  assert.match(css, /\[data-theme="dark"\] \.account-badge--employee/);
  assert.match(css, /\[data-theme="dark"\] \.status--available/);
  assert.match(css, /\[data-theme="dark"\] \.activity-badge--sale/);
  assert.match(css, /theme-mode-picker/);
  assert.match(css, /theme-mode-option\.is-active/);
});
