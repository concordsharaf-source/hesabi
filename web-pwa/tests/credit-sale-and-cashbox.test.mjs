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

test("تعرض لوحة التحكم الداخل النقدي اليومي بدل رصيد الصندوق التراكمي", async () => {
  await db.resetAllData();
  const product = await db.createProduct({ name: "منتج نقدي", unit: "حبة", purchasePrice: 25, salePrice: 90, quantity: 2, minimumStock: 0 });
  await db.completeSale({ items: [{ productId: product.id, quantity: 1 }], discount: 0, paidAmount: 90, paymentMethod: "نقدي" });
  const dashboard = await db.getDashboard();
  assert.equal(dashboard.todayCashIn, 90);
  assert.equal(dashboard.cashBalance, 90);
  await db.resetAllData();
});

test("دفعة المورد تختار المورد المستحق وتسوّي فاتورته الآجلة وتنعكس مرة واحدة في الصندوق أو التحويل", async () => {
  await db.resetAllData();
  const product = await db.createProduct({ name: "منتج توريد", unit: "حبة", purchasePrice: 80, salePrice: 130, quantity: 0, minimumStock: 0 });
  const supplier = await db.createSupplier({ name: "مورد آجل" });
  const purchase = await db.createPurchase({ supplierId: supplier.id, paymentType: "آجل", paidAmount: "", paymentMethod: "نقدي", items: [{ productId: product.id, packageQuantity: 1, unitsPerPackage: 1, packageCost: 120, packageUnit: "حبة", salePrice: 150 }] });
  const cashPayment = await db.registerSupplierPayment({ supplierId: supplier.id, amount: 50, paymentMethod: "نقدي", notes: "تسديد من الصندوق" });
  const firstAccount = await db.getSupplierAccount(supplier.id);
  const firstPurchase = await db.getPurchase(purchase.id);
  const firstCashbox = await db.getCashbox();
  assert.equal(cashPayment.supplierId, supplier.id);
  assert.equal(cashPayment.allocations[0].purchaseId, purchase.id);
  assert.equal(firstAccount.balance, 70);
  assert.equal(firstPurchase.remainingAmount, 70);
  assert.equal(firstCashbox.supplierPayments, 50);
  assert.equal(firstCashbox.closingBalance, -50);

  const transferPayment = await db.registerSupplierPayment({ supplierId: supplier.id, amount: 20, paymentMethod: "تحويل" });
  const secondAccount = await db.getSupplierAccount(supplier.id);
  const secondCashbox = await db.getCashbox();
  assert.equal(transferPayment.paymentMethod, "تحويل");
  assert.equal(secondAccount.balance, 50);
  assert.equal(secondCashbox.supplierPayments, 50);
  assert.equal(secondCashbox.transferOutgoing, 20);
  await db.resetAllData();
});
