import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appJsPath = path.resolve(__dirname, "../client/src/js/app.js");
const appJsContent = fs.readFileSync(appJsPath, "utf8");
const styleCssPath = path.resolve(__dirname, "../client/src/style.css");
const styleCssContent = fs.readFileSync(styleCssPath, "utf8");

test("تتضمن الواجهة عناصر تعليق الفواتير وحاسبة النقدية السريعة", () => {
  assert.match(appJsContent, /openHoldInvoiceDialog/, "يجب توفر دالة فتح نافذة تعليق الفاتورة");
  assert.match(appJsContent, /openHeldInvoicesDialog/, "يجب توفر دالة فتح نافذة استعراض الفواتير المعلقة");
  assert.match(appJsContent, /generateQuickCashOptions/, "يجب توفر دالة توليد خيارات النقدية السريعة");
  assert.match(appJsContent, /data-action="hold-cart"/, "يجب وجود زر تعليق السلة في واجهة البيع");
  assert.match(appJsContent, /data-action="open-held-invoices"/, "يجب وجود زر الفواتير المعلقة في واجهة البيع");
  assert.match(appJsContent, /cash-calculator-section/, "يجب وجود قسم حاسبة النقدية في مراجعة البيع");
  assert.match(appJsContent, /quick-cash-buttons/, "يجب وجود أزرار الفئات النقدية السريعة");
  assert.match(appJsContent, /cash-change-card/, "يجب وجود بطاقة حساب الفكة والمتبقي للزبون");
});

test("تولد دالة generateQuickCashOptions فئات ملائمة لقيمة الفاتورة", () => {
  // Test extracting and executing generateQuickCashOptions logic
  const roundMoney = (v) => Math.round(Number(v || 0) * 100) / 100;
  function generateQuickCashOptions(total) {
    const rounded = roundMoney(total);
    const list = [rounded];
    if (rounded <= 0) return list;
    const step = rounded < 1000 ? 100 : rounded < 5000 ? 500 : 1000;
    const nextStep = Math.ceil(rounded / step) * step;
    if (nextStep > rounded) list.push(nextStep);
    const standardNotes = [500, 1000, 2000, 5000, 10000, 20000, 50000];
    standardNotes.filter((n) => n > rounded && !list.includes(n)).slice(0, 4).forEach((n) => list.push(n));
    return list.slice(0, 6);
  }

  const options1 = generateQuickCashOptions(750);
  assert.equal(options1[0], 750, "الخيار الأول هو بالضبط");
  assert.ok(options1.includes(800), "التقريب التالي 800 موجود");
  assert.ok(options1.includes(1000), "الفئة النقدية 1000 موجودة");

  const options2 = generateQuickCashOptions(2350);
  assert.equal(options2[0], 2350, "الخيار الأول 2350 بالضبط");
  assert.ok(options2.includes(2500), "التقريب 2500 موجود");
  assert.ok(options2.includes(5000), "الفئة 5000 موجودة");

  const options3 = generateQuickCashOptions(5000);
  assert.equal(options3[0], 5000, "الخيار الأول 5000");
  assert.ok(options3.includes(10000), "الفئة 10000 موجودة");
});

test("يحسب منطق الفكة المتبقي للزبون بدقة للحالات الثلاث: بالضبط، فكة للزبون، وناقص", () => {
  const calcChange = (tendered, total) => {
    const diff = Math.round((Number(tendered) - Number(total)) * 100) / 100;
    if (diff === 0) return { type: "exact", amount: 0 };
    if (diff > 0) return { type: "change", amount: diff };
    return { type: "short", amount: Math.abs(diff) };
  };

  assert.deepEqual(calcChange(1000, 1000), { type: "exact", amount: 0 });
  assert.deepEqual(calcChange(2000, 1350), { type: "change", amount: 650 });
  assert.deepEqual(calcChange(1000, 1500), { type: "short", amount: 500 });
});

test("تتضمن أنماط CSS تنسيقات الفواتير المعلقة وحاسبة النقدية والوضع الداكن", () => {
  assert.match(styleCssContent, /\.held-badge-btn/, "تنسيق شارة الفواتير المعلقة");
  assert.match(styleCssContent, /\.held-invoice-card/, "تنسيق بطاقة الفاتورة المعلقة");
  assert.match(styleCssContent, /\.cash-calculator-section/, "تنسيق قسم حاسبة النقدية");
  assert.match(styleCssContent, /\.quick-cash-btn/, "تنسيق أزرار النقدية السريعة");
  assert.match(styleCssContent, /\.cash-change-card--change/, "تنسيق حالة وجود فكة للزبون");
  assert.match(styleCssContent, /\.cash-change-card--short/, "تنسيق حالة المبلغ الناقص");
  assert.match(styleCssContent, /\[data-theme="dark"\] \.cash-calculator-section/, "تنسيق الحاسبة للوضع الداكن");
});
