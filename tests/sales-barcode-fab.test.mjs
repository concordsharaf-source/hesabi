/* الزر العائم في صفحة المبيعات: كلمة «باركود» ورمز الباركود، وظهوره مقصور على صفحة المبيعات. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const app = readFileSync(path.join(root, "client/src/js/app.js"), "utf8");
const css = readFileSync(path.join(root, "client/src/style.css"), "utf8");

test("الزر العائم يحمل كلمة باركود ورمز الباركود scan", () => {
  const fab = app.match(/function salesScannerFabMarkup\(\)[^\n]*/)?.[0] || "";
  assert.ok(fab.includes("<span>باركود</span>"), "الكلمة الظاهرة على الزر");
  assert.ok(fab.includes('icon("scan"'), "رمز الباركود على الزر");
  assert.ok(!fab.includes("<span>بيع</span>"), "لا تبقى كلمة بيع القديمة");
});

test("زر البيع المباشر عاد كما كان: في كل الصفحات عدا المبيعات", () => {
  const fab = app.match(/function directSaleFabMarkup\(\)[^\n]*/)?.[0] || "";
  assert.ok(fab.includes("<span>بيع</span>"), "كلمة بيع على الزر المباشر");
  assert.ok(fab.includes('icon("cart"'), "أيقونة السلة على الزر المباشر");
  assert.ok(fab.includes("direct-sale-fab"), "صنف مستقل للزر المباشر");
  assert.match(css, /html\.is-sales-page \.direct-sale-fab \{ display: none; \}/, "يُخفى داخل المبيعات حيث يحل زر الباركود");
  assert.ok(!/html:not\(\.is-sales-page\) \.direct-sale-fab \{ display: none; \}/.test(css), "لا يُخفى خارج المبيعات");
  assert.match(app, /\$\{salesScannerFabMarkup\(\)\}\$\{directSaleFabMarkup\(\)\}/, "الزران يُركبان معًا في الغلاف");
});

test("الزر العائم يظهر في صفحة المبيعات فقط ولا يختفي منها", () => {
  assert.match(css, /html:not\(\.is-sales-page\) \.sales-scanner-fab \{ display: none; \}/, "مخفي خارج صفحة المبيعات");
  assert.ok(!/html\.is-sales-page \.sales-scanner-fab \{ display: none; \}/.test(css), "لا يُخفى داخل صفحة المبيعات");
  assert.match(css, /html\.is-sales-page \.sales-scanner-fab \{ bottom: calc\(146px/, "مرفوع فوق شريط الإجمالي في الهاتف");
});
