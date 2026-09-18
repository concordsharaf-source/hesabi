/* مانع رجوع: تجزئة PIN (PBKDF2) يجب أن تُحسب خارج معاملات IndexedDB كتابةً،
   لأن انتظار وعد غير IDB داخل معاملة يُنهيتها فيفشل put («The transaction has finished»). */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const src = readFileSync(path.resolve(import.meta.dirname, "../client/src/js/database.js"), "utf8");

const bodyOf = (name) => {
  const start = src.indexOf(`async ${name}(`);
  assert.ok(start >= 0, `الدالة ${name} موجودة`);
  const end = src.indexOf("\n  async ", start + 10);
  return src.slice(start, end > 0 ? end : start + 3000);
};

test("configureInitialAdmin: التجزئة قبل فتح المعاملة لا داخلها", () => {
  const body = bodyOf("configureInitialAdmin");
  const hashAt = body.indexOf("await hashPin(");
  const txAt = body.indexOf('database.transaction("accounts", "readwrite")');
  assert.ok(hashAt > -1 && txAt > -1, "كلا الموضعين موجود");
  assert.ok(hashAt < txAt, "hashPin داخل المعاملة — سينهيها PBKDF2 ويفشل put");
});

test("دوال تغيير/إعادة تعيين الرصيد تبقى آمنة (التجزئة قبل المعاملة)", () => {
  for (const name of ["saveUpgradedPinHash"]) {
    const body = bodyOf(name);
    const hashAt = body.indexOf("await hashPin(");
    const txAt = body.indexOf('database.transaction("accounts", "readwrite")');
    if (hashAt > -1 && txAt > -1) assert.ok(hashAt < txAt, `${name}: التجزئة داخل المعاملة`);
  }
});
