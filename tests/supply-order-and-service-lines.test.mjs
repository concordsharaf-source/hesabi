/**
 * اختبارات ثلاث ميزات:
 * 1) طلب توريد النواقص من المورد: كميات لكل صنف، إرسال نصي أو PDF على رقم المورد كما هو مسجل (بلا +).
 * 2) خانتا الخدمات الثابتتان أعلى قائمة البيع: شحن فوري + نقد مقابل تحويل مع خانة مبلغ.
 * 3) نقد مقابل تحويل يسجل خروج النقد من الصندوق تلقائيًا (المحاسبة عبر completeSale).
 */
import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { db } from "../client/src/js/database.js";

const appJs = await readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8");
const css = await readFile(new URL("../client/src/style.css", import.meta.url), "utf8");

test("واتساب المورد بالرقم كما هو مسجل تمامًا: أرقام فقط بلا + وبلا 00", () => {
  assert.match(appJs, /const whatsAppExactHref = \(phone, text = ""\) => \{/, "دالة الرقم-كما-هو مفقودة");
  const fn = appJs.slice(appJs.indexOf("const whatsAppExactHref"), appJs.indexOf("function sendWhatsAppExact"));
  assert.match(fn, /replace\(\/\\D\/g, ""\)/, "الرقم لا يُنظف إلى أرقام فقط");
  assert.doesNotMatch(fn, /replace\(\/\^00\/, "\+"\)/, "الدالة تحول 00 إلى + — المطلوب الرقم كما هو");
  assert.doesNotMatch(fn, /encodeURIComponent\(digits\)|\+\$\{normalized\}/, "الرقم يمر بتطبيع قبل الإرسال");
  assert.match(fn, /`https:\/\/wa\.me\/\$\{digits\}/, "الرابط لا يستخدم الأرقام الخام مباشرة");
  // زر الإرسال النصي وPDF يستدعيان الدالة الدقيقة لا whatsAppHref العامة
  const reorder = appJs.slice(appJs.indexOf("function openReorderDialog()"), appJs.indexOf("function inventoryMarkup()"));
  assert.match(reorder, /sendWhatsAppExact\(group\.supplier\?\.phone, orderText\(group, lines\)\)/, "الإرسال النصي لا يستخدم الرقم كما هو");
  assert.match(reorder, /sendWhatsAppExact\(group\.supplier\?\.phone, ""\)/, "بعد PDF لا تُفتح محادثة المورد بالرقم كما هو");
  assert.doesNotMatch(reorder, /whatsAppHref\(/, "نافذة التوريد ما زالت تستخدم الدالة المطبعة");
});

test("نافذة توصيل النواقص: كمية قابلة للتعديل لكل صنف والفاتورة تضم الصنف والعدد المطلوب", () => {
  const reorder = appJs.slice(appJs.indexOf("function openReorderDialog()"), appJs.indexOf("function inventoryMarkup()"));
  assert.match(reorder, /data-reorder-qty="\$\{product\.id\}"/, "لا خانة كمية لكل صنف");
  assert.match(reorder, /suggestedQuantity/, "لا كمية مقترحة تلقائية");
  assert.match(reorder, /\.filter\(\(line\) => line\.quantity > 0\)/, "الأصناف المصفرة لا تُستبعد من الطلب");
  // نص الطلب يضم الصنف والكمية والوحدة
  assert.match(reorder, /الكمية: \$\{amount\(line\.quantity\)\} \$\{line\.product\.unit\}/, "نص الطلب لا يضم العدد المطلوب");
  assert.match(reorder, /طلب توريد من \$\{storeDisplayName\(\)\}/, "نص الطلب بلا هوية المتجر");
  // PDF عبر مسار المشاركة الموجود نفسه
  assert.match(reorder, /shareOrDownloadPdf\(\{ html: orderHtml\(group, lines\)/, "لا مسار PDF لطلب التوريد");
  assert.match(reorder, /<th>الكمية المطلوبة<\/th>/, "جدول PDF بلا عمود الكمية المطلوبة");
  // مجموعة بلا رقم: زر مشاركة عام مع توضيح
  assert.match(reorder, /data-reorder-share="\$\{key\}"/, "لا بديل مشاركة عند غياب رقم المورد");
});

test("خانتا الخدمات الثابتتان أعلى قائمة البيع مع أنماطهما", () => {
  assert.match(appJs, /class="sales-service-tiles"/, "حاوية الخانتين مفقودة من قالب المبيعات");
  assert.match(appJs, /data-action="add-service-line" data-service="instant-topup"/, "خانة الشحن الفوري مفقودة");
  assert.match(appJs, /data-action="add-service-line" data-service="cash-transfer"/, "خانة نقد مقابل تحويل مفقودة");
  // الخانتان قبل قائمة المنتجات مباشرة (ثابتتان في الأعلى)
  const salesMarkup = appJs.slice(appJs.indexOf("function salesMarkup() {"), appJs.indexOf("const SALE_SERVICE_TYPES"));
  assert.ok(salesMarkup.indexOf("sales-service-tiles") < salesMarkup.indexOf('class="sale-matches"'), "الخانتان ليستا أعلى قائمة البيع");
  assert.match(css, /\.sales-service-tiles \{ display:grid; grid-template-columns:1fr 1fr/, "أنماط الحاوية مفقودة");
  assert.match(css, /\.sales-service-tile--topup/, "نمط خانة الشحن مفقود");
  assert.match(css, /\.sales-service-tile--exchange/, "نمط خانة النقد مفقود");
  assert.match(css, /\[data-theme="dark"\] \.sales-service-tile--topup/, "لا دعم للوضع الداكن");
});

test("الضغط على الخانة يضيف سطر خدمة بخانة مبلغ، والدفع يتطلب مبلغًا أكبر من صفر", () => {
  assert.match(appJs, /function addServiceLine\(serviceType\)/, "دالة إضافة سطر الخدمة مفقودة");
  assert.match(appJs, /isService: true, serviceType/, "سطر الخدمة بلا علامة isService");
  assert.match(appJs, /function serviceCartLine\(line\)/, "قالب سطر الخدمة مفقود");
  assert.match(appJs, /data-service-amount="\$\{line\.productId\}"/, "خانة إدخال المبلغ مفقودة");
  assert.match(appJs, /if \(line\.isService\) return serviceCartLine\(line\);/, "cartLine لا يحول أسطر الخدمة لقالبها");
  assert.match(appJs, /function setServiceAmount\(lineId, value\)/, "معالج تغيير المبلغ مفقود");
  // حارس الدفع: لا إتمام بيع وخدمة بلا مبلغ
  assert.match(appJs, /line\.isService && toNumber\(line\.unitPrice\) <= 0/, "حارس المبلغ الفارغ مفقود من الدفع");
  assert.match(appJs, /أدخل مبلغ «\$\{emptyService\.name\}» قبل إتمام البيع/, "لا رسالة توضح الخدمة الناقصة");
});

test("completeSale يقبل بند خدمة بلا مخزون: شحن فوري يدخل الفاتورة بمبلغه دون ربح وهمي", async () => {
  await db.resetAllData();
  const product = await db.createProduct({ name: "ماء صحة", unit: "حبة", purchasePrice: 100, salePrice: 150, quantity: 10, minimumStock: 1 });
  const sale = await db.completeSale({ items: [{ productId: product.id, quantity: 1 }, { productId: "svc-topup-1", isService: true, serviceType: "instant-topup", name: "شحن فوري", unitPrice: 500, quantity: 1 }], discount: 0, paidAmount: 650, paymentMethod: "نقدي" });
  assert.equal(sale.total, 650);
  const items = (await db.listSaleItems()).filter((item) => item.saleId === sale.id);
  assert.equal(items.length, 2);
  const serviceItem = items.find((item) => item.serviceType === "instant-topup");
  assert.ok(serviceItem, "بند الشحن الفوري غير محفوظ في الفاتورة");
  assert.equal(serviceItem.productName, "شحن فوري");
  assert.equal(serviceItem.quantity, 1);
  assert.equal(serviceItem.total, 500);
  assert.equal(serviceItem.costTotal, 500, "تكلفة الخدمة يجب أن تساوي سعرها فلا يُحسب ربح وهمي");
  // المخزون لم يُمس إلا بمنتج الماء
  const stored = await db.getProduct(product.id);
  assert.equal(stored.quantity, 9);
  await db.resetAllData();
});

test("نقد مقابل تحويل: يسجل خروج نقد تلقائيًا من الصندوق بمبلغ الخدمة", async () => {
  await db.resetAllData();
  const sale = await db.completeSale({ items: [{ productId: "svc-exchange-1", isService: true, serviceType: "cash-transfer", name: "نقد مقابل تحويل", unitPrice: 20000, quantity: 1 }], discount: 0, paidAmount: 20000, paymentMethod: "تحويل" });
  assert.equal(sale.total, 20000);
  assert.equal(sale.paymentMethod, "تحويل");
  const movements = await db.listCashMovements();
  const withdrawal = movements.find((movement) => movement.referenceId === sale.id && movement.type === "WITHDRAWAL");
  assert.ok(withdrawal, "لا حركة سحب نقدي مرتبطة بالفاتورة");
  assert.equal(withdrawal.amount, 20000, "مبلغ السحب لا يساوي النقد المسلّم للزبون");
  assert.match(withdrawal.notes, /نقد مقابل تحويل/);
  // الحصيلة: الحوالة داخلة والنقد خارج — رصيد الصندوق النقدي ينقص بالمبلغ
  const cashbox = await db.getCashbox();
  assert.equal(cashbox.transferIncoming, 20000);
  assert.equal(cashbox.closingBalance, -20000);
  await db.resetAllData();
});

test("خدمة بمبلغ صفر تُرفض من completeSale", async () => {
  await db.resetAllData();
  await assert.rejects(
    () => db.completeSale({ items: [{ productId: "svc-topup-x", isService: true, serviceType: "instant-topup", name: "شحن فوري", unitPrice: 0, quantity: 1 }], discount: 0, paidAmount: 0, paymentMethod: "نقدي" }),
    /أدخل مبلغ الخدمة/,
  );
  await db.resetAllData();
});
