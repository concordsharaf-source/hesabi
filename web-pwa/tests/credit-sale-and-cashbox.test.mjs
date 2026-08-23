import "fake-indexeddb/auto";
import test from "node:test";
import assert from "node:assert/strict";
import { db } from "../client/src/js/database.js";

test("البيع الآجل يفرض صفرًا كدفعة أولى وتبقى الحوالة خارج رصيد الصندوق", async () => {
  await db.resetAllData();
  const product = await db.createProduct({ name: "منتج بيع آجل", unit: "حبة", purchasePrice: 40, salePrice: 100, quantity: 4, minimumStock: 1 });
  const customer = await db.createCustomer({ name: "عميل آجل" });
  const sale = await db.completeSale({ items: [{ productId: product.id, quantity: 1 }], discount: 0, paidAmount: 100, paymentMethod: "تحويل", paymentType: "آجل", customerId: customer.id });

  assert.equal(sale.paidAmount, 0);
  assert.equal(sale.initialPaidAmount, 0);
  assert.equal(sale.remainingAmount, 100);
  assert.equal(sale.paymentStatus, "غير مدفوعة");
  const payment = await db.registerCustomerPayment({ customerId: customer.id, amount: 30, paymentMethod: "تحويل" });
  assert.equal(payment.paymentMethod, "تحويل");

  const cashbox = await db.getCashbox();
  assert.equal(cashbox.transferIncoming, 30);
  assert.equal(cashbox.closingBalance, 0);
  await db.resetAllData();
});
