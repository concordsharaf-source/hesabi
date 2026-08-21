import test from "node:test";
import assert from "node:assert/strict";
import { adjustmentDelta, calculateSaleTotals, canSell, invoiceNumber, stockStatus } from "../client/src/js/domain.js";

test("ينشئ تسلسل أرقام فواتير ثابتًا وغير مكرر", () => {
  assert.equal(invoiceNumber(1), "INV-000001");
  assert.equal(invoiceNumber(23), "INV-000023");
});

test("يمنع البيع فوق الكمية المتاحة", () => {
  assert.equal(canSell(18, 2), true);
  assert.equal(canSell(18, 25), false);
  assert.equal(canSell(0, 1), false);
});

test("يحسب خصم المخزون في حركة التعديل", () => {
  assert.equal(adjustmentDelta(20, 18), -2);
  assert.equal(adjustmentDelta(18, 15), -3);
});

test("يحدد حالات المخزون كما في قواعد المرحلة الأولى", () => {
  assert.equal(stockStatus(0, 5), "نافد");
  assert.equal(stockStatus(5, 5), "منخفض");
  assert.equal(stockStatus(6, 5), "متوفر");
});

test("يحسب الإجمالي والخصم دون تجاوز الإجمالي", () => {
  assert.deepEqual(calculateSaleTotals([{ unitPrice: 150, quantity: 2 }], 30), { subtotal: 300, discount: 30, total: 270 });
  assert.deepEqual(calculateSaleTotals([{ unitPrice: 10, quantity: 1 }], 100), { subtotal: 10, discount: 10, total: 0 });
});
