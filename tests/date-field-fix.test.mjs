// اختبار إصلاح حقول التاريخ: ترتيب غير معكوس + أيقونة التقويم في المكان الفارغ
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../client/src/style.css", import.meta.url), "utf8");
const app = readFileSync(new URL("../client/src/js/app.js", import.meta.url), "utf8");

test("حقول التاريخ: لا bidi معكوس ولا أيقونة متصفح فوق النص", () => {
  // القاعدة القديمة المعكوسة اختفت
  assert.equal(css.includes('input[type="date"] { direction:ltr; text-align:left; unicode-bidi:plaintext; }'), false);
  // أيقونة المتصفح الأصلية مخفية بالكامل
  assert.match(css, /input\[type="date"\]::-webkit-calendar-picker-indicator \{ display:none; \}/);
  // النص يبدأ من اليمين والمنطقة اليسرى محجوزة للأيقونة الثابتة
  assert.match(css, /input\[type="date"\] \{ direction:ltr; text-align:right; padding-left:38px; padding-right:12px; \}/);
});

test("أيقونة تقويم ثابتة في الجانب الفارغ عبر الغلاف", () => {
  const block = css.slice(css.indexOf(".date-field-wrap::before"), css.indexOf("[data-theme=\"dark\"] .date-field-wrap::before"));
  assert.ok(block.includes("inset-inline-end: 11px"), "الأيقونة في الطرف الفارغ");
  assert.ok(block.includes("pointer-events: none"), "الأيقونة لا تعيق النقر");
  assert.ok(block.includes("data:image/svg+xml"), "الأيقونة SVG مضمّنة");
});

test("طبقة العرض: تلميح يوم/شهر/سنة بترتيب صحيح عند الفراغ", () => {
  assert.match(css, /\.date-field-display\.is-placeholder \{ color: var\(--muted, #66707a\); font-weight: 500; \}/);
  // لم يبقَ direction:ltr داخل طبقة العرض حتى تبدأ من اليمين
  const span = css.slice(css.indexOf(".date-field-display {"), css.indexOf(".date-field-display.is-placeholder"));
  assert.equal(span.includes("direction: ltr;"), false);
  assert.ok(app.includes('node.textContent = "يوم/شهر/سنة"'), "التلميح بترتيب عربي صحيح");
  assert.ok(app.includes("wrap.classList.add(\"is-overlaid\")"), "النص الأصلي مخفي دائمًا خارج التركيز");
});

test("فتح منتقي التاريخ بالنقر في الديسكتوب بعد إخفاء أيقونة المتصفح", () => {
  assert.ok(app.includes("input.showPicker?.()"), "showPicker عند النقر");
  assert.ok(app.includes('(pointer: fine)'), "يقتصر على أجهزة المؤشر الدقيق");
});
