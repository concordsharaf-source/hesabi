// اختبار كثافة الديسكتوب ولون الإجمالي الأحمر وظهوره دون تمرير
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../client/src/style.css", import.meta.url), "utf8");

test("لا overflow على #app حتى يعمل الالتصاق sticky وتظهر السلة كاملة", () => {
  assert.equal(css.includes("html, body, #app { width:100%; max-width:100%; overflow-x:hidden; }"), false);
  assert.ok(css.includes("#app { width:100%; max-width:100%; }"));
});

test("الإجمالي أحمر على الخلفية الفاتحة وأحمر فاتح على الداكنة", () => {
  assert.ok(css.includes("color: var(--cart-total-color, #fff4bd);"), "اللون عبر متغير مشترك");
  assert.ok(css.includes("--cart-total-color: #c62828;"), "أحمر قوي على الورق الأبيض");
  assert.ok(css.includes("--cart-total-color: #ff8a80;"), "أحمر فاتح على الثيم الداكن");
  assert.ok(css.includes("text-shadow: var(--cart-total-glow, 0 0 9px rgba(243, 207, 112, .3));"));
});

test("كثافة الديسكتوب: أيقونات وأزرار أصغر ونصوص أكبر", () => {
  assert.ok(css.includes("--desk-fs: 14px;"), "نص أساسي أكبر");
  assert.ok(css.includes(".button svg { width: 14px; height: 14px; }"));
  assert.ok(css.includes(".icon-button { width: 24px; height: 24px;"));
  assert.ok(css.includes(".icon-button svg { width: 13px; height: 13px; }"));
  assert.ok(css.includes(".nav-item svg { width: 16px; height: 16px; flex: 0 0 auto; }"));
  assert.ok(css.includes("tbody td { border: 1px solid var(--desk-line); padding: 4px 9px; font-size: 13.5px; }"));
  assert.ok(css.includes(".button { min-height: 27px; padding: 2px 10px;"));
  assert.ok(css.includes(".sidebar .nav-item { min-height: 27px; padding: 3px 9px;"));
});

test("السلة تعرض صنفين فقط والإجمالي ظاهر دون تمرير صفحة", () => {
  assert.ok(css.includes(".cart-lines { max-height: 360px; overflow-y: auto;"), "حد صفين في الهاتف");
  assert.ok(css.includes(".cart-panel .cart-lines { flex:1 1 auto; min-height:0; max-height:250px;"), "حد صفين في الواسع");
  assert.ok(css.includes(".cart-panel { max-height: calc(100vh - 24px);"), "لوحة السلة لا تتجاوز النافذة");
});

test("الأرقام بأرقام إنجليزية في حقول الأرقام عبر lang=en", () => {
  const app = readFileSync(new URL("../client/src/js/app.js", import.meta.url), "utf8");
  assert.ok(app.includes('type="number" lang="en"'), "حقول الأرقام تحمل lang=en");
  assert.ok(app.includes('${type === "number" ? \'lang="en" \' : ""}'), "دالة input تضيف lang=en للأرقام");
  assert.equal(/type="number"(?! lang="en")/.test(app), false, "لا حقل رقم بدون lang=en");
});

test("السلة على الديسكتوب: نص داكن وتحكم كمية مضغوط", () => {
  assert.ok(css.includes(".cart-panel { color: var(--desk-ink); --cart-total-color: #c62828;"));
  assert.ok(css.includes(".quantity-control { height: 30px; min-width: 112px;"));
  assert.ok(css.includes(".cart-total strong, [data-cart-subtotal] { font-size: 30px; }"));
});
