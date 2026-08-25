import "fake-indexeddb/auto";
import test from "node:test";
import assert from "node:assert/strict";
import { db } from "../client/src/js/database.js";
import { BUSINESS_PROFILES } from "../client/src/js/constants.js";
import { createCloudBackupPackage, decodeCloudBackupPackage } from "../client/src/js/cloud-backup-codec.js";

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

test("يربط المنتج بآخر مورد مورّد له ليظهر اختصار حسابه واتصاله في القوائم", async () => {
  await db.resetAllData();
  const product = await db.createProduct({ name: "منتج مورد مرتبط", unit: "حبة", purchasePrice: 20, salePrice: 40, quantity: 0, minimumStock: 0 });
  const supplier = await db.createSupplier({ name: "مورد المنتج", phone: "777123456" });
  await db.createPurchase({ supplierId: supplier.id, paymentType: "نقدي", paymentMethod: "نقدي", items: [{ productId: product.id, packageQuantity: 1, unitsPerPackage: 1, packageCost: 25, packageUnit: "حبة", salePrice: 45 }] });
  const links = await db.listProductSupplierLinks();
  assert.equal(links[product.id].id, supplier.id);
  assert.equal(links[product.id].name, "مورد المنتج");
  assert.equal(links[product.id].phone, "777123456");
  assert.equal((await db.getProduct(product.id)).lastSupplierId, supplier.id);
  await db.resetAllData();
});

test("استعادة النسخة قبل الإعداد تعيد بيانات المتجر وحساب الدخول السابقين دون إنشاء حساب جديد", async () => {
  await db.resetAllData();
  await db.saveSettings({ storeName: "متجر الاستعادة", businessType: "بقالة", currency: "YER" });
  const admin = await db.createAccount({ username: "restore-admin", name: "مدير الاستعادة", role: "admin", pin: "2468" });
  await db.createProduct({ name: "منتج محفوظ", unit: "حبة", purchasePrice: 25, salePrice: 50, quantity: 3, minimumStock: 1 });
  const backup = await db.exportBackup();
  const backupAccountCount = backup.stores.accounts.length;

  await db.resetAllData();
  assert.equal((await db.getSettings())?.setupCompleted, undefined);
  await db.restoreBackup(backup);

  assert.equal((await db.getSettings()).storeName, "متجر الاستعادة");
  assert.equal((await db.listProducts()).some((product) => product.name === "منتج محفوظ"), true);
  assert.equal((await db.listAccounts()).length, backupAccountCount);
  const restoredUser = await db.authenticateAccount({ username: admin.username, pin: "2468" });
  assert.equal(restoredUser.id, admin.id);
  await db.resetAllData();
});

test("يعيد الأدمن تعيين رمز الكاشير ويسترد رمز الأدمن بمفتاح طوارئ محلي دون كشف الرمز القديم", async () => {
  await db.resetAllData();
  await db.saveSettings({ storeName: "متجر الاسترداد", businessType: "بقالة", currency: "YER" });
  const admin = await db.createAccount({ username: "rescue-admin", name: "مدير الاسترداد", role: "admin", pin: "2468" });
  const cashier = await db.createAccount({ username: "rescue-cashier", name: "كاشير الاسترداد", role: "cashier", pin: "1357" });
  const recoveryKey = "A1B2C3D4E5F6G7H8";

  await db.saveAdminRecoveryKey({ adminId: admin.id, currentPin: "2468", recoveryKey });
  const securedSettings = await db.getSettings();
  assert.equal(securedSettings.adminRecoveryAccountId, admin.id);
  assert.notEqual(securedSettings.adminRecoveryHash, recoveryKey);
  assert.notEqual(securedSettings.adminRecoverySalt, recoveryKey);

  await db.resetAccountPinByAdmin(cashier.id, "9876");
  await assert.rejects(() => db.authenticateAccount({ username: cashier.username, pin: "1357" }), /بيانات الدخول غير صحيحة/);
  assert.equal((await db.authenticateAccount({ username: cashier.username, pin: "9876" })).mustChangePin, true);

  await assert.rejects(() => db.resetAdminPinWithRecovery({ username: admin.username, recoveryKey: "WRONGKEY00000000", pin: "8642" }), /بيانات الاسترداد غير صحيحة/);
  await db.resetAdminPinWithRecovery({ username: admin.username, recoveryKey, pin: "8642" });
  await assert.rejects(() => db.authenticateAccount({ username: admin.username, pin: "2468" }), /بيانات الدخول غير صحيحة/);
  assert.equal((await db.authenticateAccount({ username: admin.username, pin: "8642" })).id, admin.id);
  await db.resetAllData();
});

test("تخصص الأنشطة وحداتها ولا تعرض عبوات البقالة غير المناسبة للملابس أو الجوالات", () => {
  assert.equal(BUSINESS_PROFILES["ملابس"].packageUnits.includes("جرام"), false);
  assert.equal(BUSINESS_PROFILES["ملابس"].units.includes("قطعة"), true);
  assert.equal(BUSINESS_PROFILES["جوالات"].units.includes("جهاز"), true);
  assert.equal(BUSINESS_PROFILES["صيدلية"].packageUnits.includes("شريط"), true);
});

test("شراء الصيدلية يفرض التشغيلة والصلاحية ويحفظهما لتنبيه المنتج", async () => {
  await db.resetAllData();
  await db.saveSettings({ storeName: "صيدلية الاختبار", businessType: "صيدلية", currency: "YER" });
  const product = await db.createProduct({ name: "دواء تجريبي", unit: "حبة", purchasePrice: 0, salePrice: 0, quantity: 0, minimumStock: 1 });
  await assert.rejects(() => db.createPurchase({ items: [{ productId: product.id, packageQuantity: 1, unitsPerPackage: 10, packageCost: 1000, packageUnit: "علبة", salePrice: 150 }] }), /رقم التشغيلة/);
  const purchase = await db.createPurchase({ items: [{ productId: product.id, packageQuantity: 1, unitsPerPackage: 10, packageCost: 1000, packageUnit: "علبة", salePrice: 150, batchNumber: "B-2026", expiryDate: "2026-12-31" }] });
  const storedProduct = await db.getProduct(product.id); const storedPurchase = await db.getPurchase(purchase.id);
  assert.equal(storedProduct.latestBatchNumber, "B-2026");
  assert.equal(storedProduct.nearestExpiryDate, "2026-12-31");
  assert.equal(storedPurchase.items[0].expiryDate, "2026-12-31");
  await db.resetAllData();
});

test("شراء غير الصيدلية يقبل تاريخ انتهاء اختياريًا ويحفظه لتتبع المخزون", async () => {
  await db.resetAllData();
  await db.saveSettings({ storeName: "بقالة الاختبار", businessType: "بقالة", currency: "YER" });
  const product = await db.createProduct({ name: "عصير تجريبي", unit: "حبة", purchasePrice: 0, salePrice: 0, quantity: 0, minimumStock: 1 });
  const purchase = await db.createPurchase({ items: [{ productId: product.id, packageQuantity: 1, unitsPerPackage: 6, packageCost: 600, packageUnit: "علبة", salePrice: 150, expiryDate: "2026-12-31" }] });
  const storedProduct = await db.getProduct(product.id); const storedPurchase = await db.getPurchase(purchase.id); const batches = await db.listProductBatches(product.id);
  assert.equal(storedProduct.nearestExpiryDate, "2026-12-31");
  assert.equal(storedPurchase.items[0].expiryDate, "2026-12-31");
  assert.equal(batches[0].remainingQuantity, 6);
  await db.resetAllData();
});

test("يمكن تعديل تاريخ انتهاء المنتج مباشرة من صفحة المنتجات", async () => {
  await db.resetAllData();
  const product = await db.createProduct({ name: "منتج بتاريخ يدوي", unit: "حبة", purchasePrice: 30, salePrice: 50, quantity: 5, minimumStock: 1, nearestExpiryDate: "2099-12-31" });
  assert.equal(product.nearestExpiryDate, "2099-12-31");
  const updated = await db.updateProduct(product.id, { name: product.name, barcode: "", internalCode: "", category: "عام", purchasePrice: 30, salePrice: 50, minimumStock: 1, unit: "حبة", nearestExpiryDate: "2100-01-31" });
  assert.equal(updated.nearestExpiryDate, "2100-01-31");
  await db.resetAllData();
});

test("بيع الصيدلية يستهلك التشغيلة الأقرب انتهاءً أولًا ويترك الأحدث للمبيعات التالية", async () => {
  await db.resetAllData();
  await db.saveSettings({ storeName: "صيدلية التشغيلة", businessType: "صيدلية", currency: "YER" });
  const product = await db.createProduct({ name: "علاج تشغيلي", unit: "حبة", purchasePrice: 0, salePrice: 20, quantity: 0, minimumStock: 1 });
  const firstPurchase = await db.createPurchase({ items: [{ productId: product.id, packageQuantity: 1, unitsPerPackage: 10, packageCost: 100, packageUnit: "علبة", salePrice: 20, batchNumber: "EARLY", expiryDate: "2026-11-30" }] });
  await db.createPurchase({ items: [{ productId: product.id, packageQuantity: 1, unitsPerPackage: 10, packageCost: 100, packageUnit: "علبة", salePrice: 20, batchNumber: "LATER", expiryDate: "2026-12-31" }] });
  const sale = await db.completeSale({ items: [{ productId: product.id, quantity: 12 }], discount: 0, paidAmount: 240, paymentMethod: "نقدي" });
  const batches = await db.listProductBatches(product.id); const invoice = await db.getInvoice(sale.id);
  assert.deepEqual(batches.map((batch) => [batch.batchNumber, batch.remainingQuantity]), [["EARLY", 0], ["LATER", 8]]);
  assert.deepEqual(invoice.items[0].batchAllocations.map((item) => [item.batchNumber, item.quantity]), [["EARLY", 10], ["LATER", 2]]);
  assert.equal((await db.getProduct(product.id)).nearestExpiryDate, "2026-12-31");
  await db.createSaleReturn({ saleId: sale.id, items: [{ saleItemId: invoice.items[0].id, quantity: 4 }] });
  assert.deepEqual((await db.listProductBatches(product.id)).map((batch) => [batch.batchNumber, batch.remainingQuantity]), [["EARLY", 4], ["LATER", 8]]);
  const purchaseDetails = await db.getPurchase(firstPurchase.id);
  await db.createPurchaseReturn({ purchaseId: firstPurchase.id, items: [{ purchaseItemId: purchaseDetails.items[0].id, quantity: 2 }] });
  assert.deepEqual((await db.listProductBatches(product.id)).map((batch) => [batch.batchNumber, batch.remainingQuantity]), [["EARLY", 2], ["LATER", 8]]);
  const backup = await db.exportBackup(); await db.resetAllData(); await db.restoreBackup(backup);
  assert.deepEqual((await db.listProductBatches(product.id)).map((batch) => [batch.batchNumber, batch.remainingQuantity]), [["EARLY", 2], ["LATER", 8]]);
  await db.resetAllData();
});

test("تسجيل توصيل على حساب المحل يضيف مصروف توصيل ولا يضيفه إلى فاتورة البيع", async () => {
  await db.resetAllData();
  const product = await db.createProduct({ name: "منتج مع توصيل محل", unit: "حبة", purchasePrice: 20, salePrice: 100, quantity: 2, minimumStock: 0 });
  const sale = await db.completeSale({ items: [{ productId: product.id, quantity: 1 }], discount: 0, paidAmount: 100, paymentMethod: "نقدي", deliveryFee: 15, deliveryChargeType: "store" });
  const invoice = await db.getInvoice(sale.id); const expenses = await db.listExpenses(); const cashbox = await db.getCashbox();
  assert.equal(invoice.total, 100); assert.equal(invoice.deliveryFee, 15); assert.equal(invoice.deliveryChargeType, "store");
  assert.equal(expenses.some((item) => item.category === "توصيل" && item.referenceId === sale.id && item.amount === 15), true);
  assert.equal(cashbox.closingBalance, 85);
  await db.resetAllData();
});

test("تسجيل توصيل على العميل يضيفه إلى إجمالي الفاتورة دون عميل مسجل أو مديونية مستقلة", async () => {
  await db.resetAllData();
  const product = await db.createProduct({ name: "منتج مع توصيل عميل", unit: "حبة", purchasePrice: 20, salePrice: 100, quantity: 2, minimumStock: 0 });
  const sale = await db.completeSale({ items: [{ productId: product.id, quantity: 1 }], discount: 0, paidAmount: 115, paymentMethod: "نقدي", deliveryFee: 15, deliveryChargeType: "customer" });
  const invoice = await db.getInvoice(sale.id); const expenses = await db.listExpenses(); const cashbox = await db.getCashbox();
  assert.equal(invoice.customerId, ""); assert.equal(invoice.deliveryChargeType, "customer"); assert.equal(invoice.total, 115); assert.equal(invoice.paidAmount, 115);
  assert.equal(expenses.some((item) => item.referenceId === sale.id && item.category === "توصيل"), false); assert.equal(cashbox.closingBalance, 115);
  await db.resetAllData();
});

test("توصيل العميل ضمن فاتورة آجلة يدخل في إجمالي دين الفاتورة دون حركة توصيل مستقلة", async () => {
  await db.resetAllData();
  const product = await db.createProduct({ name: "منتج تحقق التوصيل", unit: "حبة", purchasePrice: 20, salePrice: 100, quantity: 1, minimumStock: 0 });
  const customer = await db.createCustomer({ name: "عميل آجل مع توصيل" });
  const sale = await db.completeSale({ items: [{ productId: product.id, quantity: 1 }], paymentType: "آجل", paidAmount: 0, paymentMethod: "نقدي", deliveryFee: 10, deliveryChargeType: "customer", customerId: customer.id });
  const account = await db.getCustomerAccount(customer.id);
  assert.equal(sale.total, 110); assert.equal(account.balance, 110);
  assert.equal(account.transactions.filter((item) => item.referenceId === sale.id).length, 1); assert.equal(account.transactions.some((item) => item.type === "DELIVERY_CHARGE"), false);
  await db.resetAllData();
});

test("يحسب خصم البيع العام وخصم الصنف كنسب مئوية ويحفظهما في الفاتورة", async () => {
  await db.resetAllData();
  const product = await db.createProduct({ name: "منتج خصم نسبي", unit: "حبة", purchasePrice: 40, salePrice: 100, quantity: 4, minimumStock: 0 });
  const sale = await db.completeSale({ items: [{ productId: product.id, quantity: 2, discount: "10%" }], discount: "20%", paidAmount: 144, paymentMethod: "نقدي" });
  assert.equal(sale.subtotal, 200);
  assert.equal(sale.lineDiscount, 20);
  assert.equal(sale.generalDiscount, 36);
  assert.equal(sale.discount, 56);
  assert.equal(sale.total, 144);
  const invoice = await db.getInvoice(sale.id);
  assert.equal(invoice.items[0].discount, 20);
  assert.equal(invoice.items[0].total, 180);
  await db.resetAllData();
});

test("ينشئ النسخة السحابية المجزأة ثم يستعيدها فعليًا إلى IndexedDB", async () => {
  await db.resetAllData();
  await db.saveSettings({ storeName: "متجر النسخة السحابية", businessType: "بقالة", currency: "YER" });
  const product = await db.createProduct({ name: "منتج النسخة السحابية", unit: "حبة", purchasePrice: 12, salePrice: 25, quantity: 7, minimumStock: 2 });
  const backup = await db.exportBackup();
  const packed = await createCloudBackupPackage(backup, { chunkCharLimit: 1024, preferCompression: false });
  assert.ok(packed.chunks.length > 1);
  await db.resetAllData();
  assert.equal((await db.getProduct(product.id)), undefined);
  const restoredPayload = await decodeCloudBackupPackage(packed.metadata, packed.chunks);
  await db.restoreBackup(restoredPayload);
  assert.equal((await db.getSettings()).storeName, "متجر النسخة السحابية");
  assert.equal((await db.getProduct(product.id)).quantity, 7);
  await db.resetAllData();
});
