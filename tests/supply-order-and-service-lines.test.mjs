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

/* كتابة حقول مباشرة في مخزن الحسابات لمحاكاة بيانات قديمة (اختبارات الترحيل فقط). */
function writeRawAccountFields(accountId, fields) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("hesabi-pwa");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction("accounts", "readwrite");
      const store = transaction.objectStore("accounts");
      const get = store.get(accountId);
      get.onsuccess = () => {
        if (!get.result) { reject(new Error("الحساب غير موجود للمحاكاة")); return; }
        store.put({ ...get.result, ...fields });
      };
      get.onerror = () => reject(get.error);
      transaction.oncomplete = () => { database.close(); resolve(true); };
      transaction.onerror = () => { database.close(); reject(transaction.error); };
    };
  });
}

const backupJs = await readFile(new URL("../client/src/js/firebase-backup.js", import.meta.url), "utf8");
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

test("صفحة المشتريات: بلاطة «طلب شراء» الكبيرة بجوار بطاقة فواتير الشراء وبنفس تصميمها", () => {
  // البلاطة داخل صف الملخص نفسه بجوار بطاقة «فواتير الشراء» الحمراء
  assert.match(appJs, /<section class="inventory-summary inventory-summary--purchases"><div><span>إجمالي المشتريات<\/span>[\s\S]{0,400}<button class="po-order-tile" type="button" data-action="new-purchase-order"/, "بلاطة طلب الشراء ليست بجوار بلاطة إضافة فاتورة");
  assert.match(appJs, /<strong>طلب شراء<\/strong><\/button><\/section>/, "نص البلاطة مفقود");
  assert.match(appJs, /if \(action === "new-purchase-order"\) \{ openPurchaseOrderDialog\(\); return; \}/, "إجراء فتح النافذة مفقود");
  // نفس تصميم البطاقة الحمراء: نفس التدرج والحدود والظل ونفس بنية padding/gap/strong
  assert.match(css, /\.po-order-tile \{ display:grid; gap:4px; padding:16px; color:#fff; text-align:right; background:linear-gradient\(145deg,#c42a47,#84132b\); border:1px solid #f28a9c; border-radius:14px; box-shadow:0 10px 22px rgba\(132,19,43,\.25\)/, "تصميم البلاطة لا يطابق بطاقة فواتير الشراء الحمراء");
  assert.match(css, /\.po-order-tile strong \{ font-size:20px; \}/, "حجم عنوان البلاطة لا يطابق البطاقة");
  assert.match(css, /\[data-theme="dark"\] \.po-order-tile \{ background:linear-gradient\(145deg,#c42a47,#84132b\); border-color:#ff9eb0/, "لا مطابقة للوضع الداكن");
  const dialog = appJs.slice(appJs.indexOf("function openPurchaseOrderDialog()"), appJs.indexOf("function currentMonthDateRange()"));
  assert.ok(dialog.length > 800, "تعذر استخراج نافذة طلب الشراء");
  // خانات النافذة: مورد، أصناف بكمية، إرسال واتساب وPDF
  assert.match(dialog, /id="po-supplier"/, "لا خانة اختيار المورد");
  assert.match(dialog, /po-line__name/, "لا خانة اسم الصنف");
  assert.match(dialog, /po-line__qty/, "لا خانة الكمية");
  assert.match(dialog, /id="po-add-line"/, "لا زر إضافة صنف");
  assert.match(dialog, /id="po-send-whatsapp"/, "لا زر إرسال واتساب");
  assert.match(dialog, /id="po-send-pdf"/, "لا زر إرسال PDF");
  // الإرسال بالرقم كما هو مسجل تمامًا وليس عبر الدالة المطبعة
  assert.match(dialog, /sendWhatsAppExact\(order\.supplier\.phone, orderText\(order\)\)/, "الواتساب لا يستخدم الرقم كما هو");
  assert.doesNotMatch(dialog, /whatsAppHref\(|sendWhatsAppMessage\(/, "نافذة طلب الشراء تستخدم الدالة المطبعة للرقم");
  // PDF عبر مسار المشاركة الموجود وجدول بالكمية
  assert.match(dialog, /shareOrDownloadPdf\(\{ html: orderHtml\(order\)/, "لا مسار PDF");
  assert.match(dialog, /<th>الكمية<\/th>/, "جدول PDF بلا عمود الكمية");
  // لا مساس بالمخزون أو القاعدة: النافذة مراسلة فقط
  assert.doesNotMatch(dialog, /db\.(completeSale|createPurchase|adjust|createProduct)/, "نافذة الطلب تكتب في القاعدة");
  // أنماط الأسطر موجودة مع دعم الوضع الداكن
  assert.match(css, /\.po-line \{ display:grid; grid-template-columns:minmax\(0,1fr\) 64px 84px auto/, "أنماط سطر الطلب مفقودة");
  assert.match(css, /\[data-theme="dark"\] \.po-line__name/, "لا دعم للوضع الداكن في النافذة");
});

test("اقتراح الأصناف في طلب الشراء: كل المنتجات المسجلة فور الكتابة دون اشتراط ارتباطها بالمورد", () => {
  const dialog = appJs.slice(appJs.indexOf("function openPurchaseOrderDialog()"), appJs.indexOf("function currentMonthDateRange()"));
  // قائمة مقترحات مخصصة ظاهرة (لا datalist المتصفح غير الموثوق على الجوال)
  assert.doesNotMatch(dialog, /datalist|list="po-products"/, "ما زالت القائمة تعتمد datalist المتصفح");
  assert.match(dialog, /class="po-suggest" hidden/, "صندوق الاقتراحات مفقود من سطر الصنف");
  assert.match(dialog, /const renderSuggest = \(input\) => \{/, "منطق الاقتراح مفقود");
  // المصدر كل المنتجات المسجلة — لا productSuppliers ولا تصفية بالمورد المختار
  assert.match(dialog, /state\.products\.filter\(\(product\) => !query \|\| product\.name\.toLocaleLowerCase\("ar"\)\.includes\(query\)/, "الاقتراح لا يبحث في كل المنتجات بالاسم");
  assert.match(dialog, /String\(product\.barcode \|\| ""\)\.includes\(query\)/, "الاقتراح لا يبحث بالباركود");
  assert.doesNotMatch(dialog, /productSuppliers|selectedSupplier\(\)[\s\S]{0,80}filter/, "الاقتراحات مقيدة بمورد المنتج — المطلوب كل الأصناف");
  // فور الكتابة وفور التركيز، واختيار المقترح يملأ الاسم وينقل التركيز للكمية
  assert.match(dialog, /addEventListener\("input", \(event\) => \{ if \(event\.target\.classList\?\.contains\("po-line__name"\)\) renderSuggest\(event\.target\); \}\)/, "لا اقتراح فور الكتابة");
  assert.match(dialog, /addEventListener\("focusin"/, "لا اقتراح عند التركيز على الخانة");
  assert.match(dialog, /data-po-suggest="\$\{escapeHtml\(product\.name\)\}"/, "عناصر الاقتراح بلا اسم الصنف");
  assert.match(dialog, /querySelector\("\.po-line__qty"\)\.focus\(\)/, "اختيار المقترح لا ينقل التركيز إلى الكمية");
  // الأنماط
  assert.match(css, /\.po-suggest \{ position:absolute/, "أنماط قائمة الاقتراحات مفقودة");
  assert.match(css, /\[data-theme="dark"\] \.po-suggest \{/, "لا دعم للوضع الداكن في الاقتراحات");
});

test("زر طلب توريد بجانب المنتج الناقص/النافد يفتح نافذة موجهة لمورده المرتبط", () => {
  // الزر يظهر فقط عند النقص أو النفاد
  assert.match(appJs, /function supplyRequestButton\(product\) \{\n  if \(toNumber\(product\.quantity\) > toNumber\(product\.minimumStock\)\) return "";/, "الزر لا يقتصر على الناقص والنافد");
  assert.match(appJs, /data-action="product-supply-request" data-id="\$\{product\.id\}"/, "زر الطلب بلا إجراء أو معرف");
  // موجود في صف المخزون وبطاقة المنتج
  assert.match(appJs, /\$\{productSupplierActions\(product\)\}\$\{supplyRequestButton\(product\)\}<button class="button button--secondary" data-action="count-stock"/, "الزر مفقود من صف المخزون");
  assert.match(appJs, /\$\{productSupplierActions\(product\)\}\$\{supplyRequestButton\(product\)\}<\/div><\/article>/, "الزر مفقود من بطاقة المنتج");
  assert.match(appJs, /if \(action === "product-supply-request"\) \{ openProductSupplyRequestDialog\(id\); return; \}/, "إجراء فتح النافذة مفقود");
  const dialog = appJs.slice(appJs.indexOf("function openProductSupplyRequestDialog("), appJs.indexOf("function openReorderDialog()"));
  assert.ok(dialog.length > 500, "تعذر استخراج نافذة توريد المنتج");
  // المورد المرتبط محدد مسبقًا، ومع غيابه تظهر القائمة الكاملة مع تلميح
  assert.match(dialog, /state\.productSuppliers\?\.\[product\.id\]/, "النافذة لا تقرأ المورد المرتبط");
  assert.match(dialog, /\$\{linked\?\.id === supplier\.id \? "selected" : ""\}/, "المورد المرتبط غير محدد مسبقًا في القائمة");
  assert.match(dialog, /غير مرتبط بمورد بعد/, "لا تلميح عند غياب المورد المرتبط");
  // كمية مقترحة وواتساب وSMS بالرقم كما هو
  assert.match(dialog, /id="psr-qty"[^>]*value="\$\{suggested\}"/, "لا كمية مقترحة");
  assert.match(dialog, /sendWhatsAppExact\(order\.supplier\.phone, requestText\(order\)\)/, "واتساب لا يستخدم الرقم كما هو");
  assert.match(dialog, /sendSmsExact\(order\.supplier\.phone, requestText\(order\)\)/, "لا زر رسالة نصية");
  assert.doesNotMatch(dialog, /db\.(completeSale|createPurchase|adjust)/, "النافذة تكتب في القاعدة");
  assert.match(css, /\.icon-button--restock \{/, "أنماط زر التوريد مفقودة");
  assert.match(css, /\[data-theme="dark"\] \.icon-button--restock \{/, "لا دعم للوضع الداكن للزر");
});

test("رسالة SMS بالرقم كما هو مسجل في كل مسارات الطلبات بجانب واتساب", () => {
  // الدالة: أرقام فقط بلا + عبر بروتوكول sms:
  assert.match(appJs, /const smsExactHref = \(phone, text = ""\) => \{/, "دالة SMS مفقودة");
  const fn = appJs.slice(appJs.indexOf("const smsExactHref"), appJs.indexOf("const whatsAppHref"));
  assert.match(fn, /replace\(\/\\D\/g, ""\)/, "رقم SMS لا يُنظف إلى أرقام فقط");
  assert.match(fn, /`sms:\$\{digits\}\$\{text \? `\?body=\$\{encodeURIComponent\(text\)\}` : ""\}`/, "رابط SMS لا يستخدم الأرقام الخام مع نص الرسالة");
  assert.doesNotMatch(fn, /replace\(\/\^00\/, "\+"\)/, "دالة SMS تطبع الرقم — المطلوب كما هو");
  // زر SMS في نافذة النواقص المجمعة ونافذة طلب الشراء
  const reorder = appJs.slice(appJs.indexOf("function openReorderDialog()"), appJs.indexOf("function inventoryMarkup()"));
  assert.match(reorder, /data-reorder-send-sms="\$\{key\}"/, "زر SMS مفقود من نافذة النواقص");
  assert.match(reorder, /sendSmsExact\(group\.supplier\?\.phone, orderText\(group, lines\)\)/, "SMS النواقص لا يرسل نص الطلب");
  const po = appJs.slice(appJs.indexOf("function openPurchaseOrderDialog()"), appJs.indexOf("function currentMonthDateRange()"));
  assert.match(po, /id="po-send-sms"/, "زر SMS مفقود من نافذة طلب الشراء");
  assert.match(po, /sendSmsExact\(order\.supplier\.phone, orderText\(order\)\)/, "SMS طلب الشراء لا يرسل نص الطلب");
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

/* ===== v45: بلاطتا الخزنة الكبيرتان + سحب موجّه بالبند (مصروف يومي/شهري، سلفة موظف، سحب عادي) ===== */

test("الخزنة: بلاطتان كبيرتان إيداع وسحب بتصميم بلاطات المشتريات بدل أزرار الشريط الصغيرة", () => {
  const markup = appJs.slice(appJs.indexOf("function cashboxMarkup"), appJs.indexOf("cash-action-tiles") + 3000);
  assert.match(markup, /class="cash-action-tiles"/, "قسم البلاطتين مفقود");
  assert.match(markup, /cash-action-tile--deposit" type="button" data-action="new-cash-deposit"/, "بلاطة الإيداع مفقودة");
  assert.match(markup, /cash-action-tile--withdraw" type="button" data-action="new-cash-withdrawal"/, "بلاطة السحب مفقودة");
  assert.match(markup, /<strong>إيداع<\/strong>/);
  assert.match(markup, /<strong>سحب<\/strong>/);
  // لا أزرار صغيرة قديمة في شريط الخزنة العلوي
  assert.doesNotMatch(markup, /button--secondary" data-action="new-cash-withdrawal"/, "زر السحب الصغير القديم ما زال موجودًا");
  assert.doesNotMatch(markup, /button--primary" data-action="new-cash-deposit"/, "زر الإيداع الصغير القديم ما زال موجودًا");
  // تصميم البلاطات مطابق لروح بلاطة المشتريات: تدرج، حواف، ظل، خط كبير
  assert.match(css, /\.cash-action-tile \{ display:grid; gap:4px; padding:16px; color:#fff; text-align:right; border-radius:14px; cursor:pointer; \}/);
  assert.match(css, /\.cash-action-tile strong \{ font-size:20px; \}/);
  assert.match(css, /\.cash-action-tile--deposit \{ background:linear-gradient\(145deg,#1f8a5b,#0c5537\); border:1px solid #7fd6ab; box-shadow:0 10px 22px rgba\(12,85,55,\.25\); \}/);
  assert.match(css, /\.cash-action-tile--withdraw \{ background:linear-gradient\(145deg,#c42a47,#84132b\); border:1px solid #f28a9c; box-shadow:0 10px 22px rgba\(132,19,43,\.25\); \}/);
  assert.match(css, /\[data-theme="dark"\] \.cash-action-tile--withdraw \{ border-color:#ff9eb0; \}/);
});

test("نافذة السحب: بنود سحب عادي/مصروف يومي/مصروف شهري/سلفة موظف وتوجيه كل بند لمكانه الصحيح", () => {
  const dialog = appJs.slice(appJs.indexOf("function openCashMovementDialog"), appJs.indexOf("function periodicInventoryDetailsMarkup"));
  ["withdrawal", "daily", "monthly", "advance"].forEach((kind) => assert.match(dialog, new RegExp(`name="withdrawalKind" type="radio" value="${kind}"`), `بند ${kind} مفقود`));
  assert.match(dialog, /مصروف يومي/); assert.match(dialog, /مصروف شهري/); assert.match(dialog, /سلفة موظف/); assert.match(dialog, /سحب عادي/);
  // السلفة تمر عبر createExpense بعلامات خصم الراتب — لا حركة صندوق مزدوجة
  assert.match(dialog, /kind === "advance"[\s\S]*?db\.createExpense\(\{[^}]*salaryAdvance: true, cashierSalaryAdvance: true/, "السلفة لا تمر عبر مسار خصم الراتب");
  // المصروف اليومي/الشهري يمر عبر createExpense مع periodType والفئة المختارة
  assert.match(dialog, /kind === "daily" \|\| kind === "monthly"[\s\S]*?db\.createExpense\(\{[^}]*periodType: kind, category: values\.category/, "المصروف لا يسجل بفئته وبنوع فترته");
  // السحب العادي وحده حركة صندوق
  assert.match(dialog, /db\.createCashMovement\(\{ type: "WITHDRAWAL"/, "السحب العادي لا يسجل حركة خزنة");
  // حقول السلفة: قائمة موظفين + ملاحظة المتبقي من الراتب
  assert.match(dialog, /cw-staff-field/); assert.match(dialog, /cw-advance-note/);
  assert.match(dialog, /MONTHLY_EXPENSE_CATEGORIES : DAILY_EXPENSE_CATEGORIES/, "فئات المصروف لا تتبدل حسب النوع");
  // الإيداع بقي حركة خزنة بسيطة
  assert.match(dialog, /db\.createCashMovement\(\{ type: "DEPOSIT"/);
});

test("محاسبة v45: السلفة تخصم من راتب الموظف، والمصروف والسحب كلٌّ في خانته في الخزنة بلا ازدواج", async () => {
  await db.resetAllData();
  const employee = await db.createAccount({ username: "v45-emp", name: "موظف الخزنة", role: "employee", pin: "9090", monthlySalary: 500 });
  const today = new Date().toISOString().slice(0, 10);
  // 1) سلفة موظف من نافذة السحب
  const advance = await db.createExpense({ amount: 120, date: today, staffId: employee.id, notes: "سلفة من الخزنة", salaryAdvance: true, cashierSalaryAdvance: true, periodType: "daily" });
  assert.equal(advance.category, "سلفة موظف");
  assert.equal(advance.staffId, employee.id);
  const summaries = await db.listCashierSalarySummaries({ month: today.slice(0, 7) });
  const summary = summaries.find((item) => item.accountId === employee.id);
  assert.ok(summary, "لا ملخص راتب للموظف");
  assert.equal(summary.advances, 120, "السلفة لم تُسجل على راتب الموظف");
  assert.equal(summary.remainingSalary, 380, "السلفة لم تُخصم من المتبقي من الراتب");
  // السلفة فوق المتبقي تُرفض
  await assert.rejects(() => db.createExpense({ amount: 400, date: today, staffId: employee.id, salaryAdvance: true, cashierSalaryAdvance: true, periodType: "daily" }), /تتجاوز المتبقي/);
  // 2) مصروف يومي بفئته
  const dailyExpense = await db.createExpense({ amount: 50, date: today, periodType: "daily", category: "وقود", description: "بنزين المولد" });
  assert.equal(dailyExpense.category, "وقود");
  // 3) سحب عادي حركة خزنة
  await db.createCashMovement({ type: "WITHDRAWAL", amount: 30, date: today, notes: "سحب شخصي" });
  const cashbox = await db.getCashbox({ from: today, to: today });
  assert.equal(cashbox.expenses, 170, "المصروفات في الخزنة يجب أن تجمع السلفة والمصروف اليومي فقط");
  assert.equal(cashbox.withdrawals, 30, "السحب العادي يجب أن يظهر في خانة السحوبات وحدها");
  await db.resetAllData();
});

/* ===== v46: بلاطتا إضافة عميل/مورد الحمراوان + رسم SVG لساعات الذروة ===== */

test("العملاء: بلاطة حمراء كبيرة (إضافة عميل) بجانب عدد العملاء بنفس تصميم بلاطة طلب الشراء", () => {
  const markup = appJs.slice(appJs.indexOf("function customersMarkup"), appJs.indexOf("function customerPaymentsMarkup"));
  assert.match(markup, /inventory-summary inventory-summary--purchases/, "قسم الملخص لا يستخدم شبكة البلاطات");
  assert.match(markup, /العملاء النشطون[\s\S]*?<button class="po-order-tile" type="button" data-action="new-customer"/, "بلاطة إضافة عميل ليست بجانب عدد العملاء");
  assert.match(markup, /<strong>إضافة عميل<\/strong>/);
});

test("الموردون: بلاطة حمراء كبيرة (إضافة مورد) بجانب عدد الموردين بنفس تصميم بلاطة طلب الشراء", () => {
  const markup = appJs.slice(appJs.indexOf("function suppliersMarkup"), appJs.indexOf("function supplierPaymentsMarkup"));
  assert.match(markup, /inventory-summary inventory-summary--purchases/, "قسم الملخص لا يستخدم شبكة البلاطات");
  assert.match(markup, /مستحقات الموردين[\s\S]*?<button class="po-order-tile" type="button" data-action="new-supplier"/, "بلاطة إضافة مورد ليست في ملخص الموردين");
  assert.match(markup, /<strong>إضافة مورد<\/strong>/);
});

test("ساعات الذروة: رسم بياني SVG رسومي بأعمدة المبيعات وخط عدد الفواتير وإبراز الذروة", () => {
  const fn = appJs.slice(appJs.indexOf("function smartHourlyPeakMarkup"), appJs.indexOf("function smartDeadStockMarkup"));
  assert.match(fn, /<svg class="hourly-svg-chart" viewBox="0 0 \$\{W\} \$\{H\}" role="img"/, "لا يوجد SVG للرسم البياني");
  assert.match(fn, /hourlyBarGrad/, "تدرج أعمدة المبيعات مفقود");
  assert.match(fn, /hourlyPeakGrad/, "تدرج عمود الذروة مفقود");
  assert.match(fn, /polyline class="hourly-svg-line"/, "خط عدد الفواتير مفقود");
  assert.match(fn, /<title>الساعة \$\{formatHour\(h\.hour\)\}: \$\{amount\(h\.count\)\} فاتورة/, "تلميح تفاصيل الساعة مفقود");
  assert.match(fn, /hourly-legend/, "وسيلة الإيضاح مفقودة");
  assert.match(fn, /hourlyDistribution\.length === 24 \? hourlyDistribution : Array\(24\)/, "لا يضمن 24 ساعة كاملة");
  // لا بقايا من المخطط القديم بأعمدة div
  assert.doesNotMatch(fn, /hourly-bars-chart/, "المخطط القديم div ما زال موجودًا");
  assert.match(css, /\.hourly-svg-chart \{ display:block; width:100%; height:auto/, "CSS الرسم مفقود");
  assert.match(css, /\.hourly-legend__swatch--peak \{ background:linear-gradient\(180deg,#c42a47,#84132b\); \}/, "لون الذروة في وسيلة الإيضاح غير مطابق");
});

test("محاسبة التوزيع الساعي: analytics يوزع المبيعات على 24 ساعة حسب ساعة الفاتورة", async () => {
  await db.resetAllData();
  const product = await db.createProduct({ name: "ماء التوزيع", barcode: "hr-1", unit: "قطعة", quantity: 50, price: 100, cost: 60, minimumStock: 1 });
  const today = new Date().toISOString().slice(0, 10);
  const saleAt = async (hour, qty) => {
    const sale = await db.completeSale({ items: [{ productId: product.id, quantity: qty, unitPrice: 100 }], discount: 0, paidAmount: qty * 100, paymentMethod: "نقدي" });
    await db.updateSaleDate?.(sale.id, `${today}T${String(hour).padStart(2, "0")}:15:00`);
    return sale;
  };
  await saleAt(9, 1); await saleAt(9, 2); await saleAt(17, 5);
  const analytics = await db.getAnalytics({ from: today, to: today });
  assert.equal(analytics.hourlyDistribution.length, 24, "التوزيع لا يغطي 24 ساعة");
  const totalAcrossHours = analytics.hourlyDistribution.reduce((sum, h) => sum + h.total, 0);
  assert.equal(totalAcrossHours, analytics.sales.total, "مجموع التوزيع الساعي لا يساوي إجمالي المبيعات");
  const invoicesAcrossHours = analytics.hourlyDistribution.reduce((sum, h) => sum + h.count, 0);
  assert.equal(invoicesAcrossHours, 3, "عدد الفواتير الموزعة غير صحيح");
  await db.resetAllData();
});

/* ===== v47: وحدة الكمية (حبة/كرتون...) في طلبات الشراء + تاريخ يوم/شهر/سنة + لوحات الداكن تتبع الخلفية المختارة ===== */

test("طلب الشراء: خانة بالحبة أو بنوع الكمية (كرتون كيس صندوق...) لكل سطر وتدخل في نص الطلب وPDF", () => {
  const dialog = appJs.slice(appJs.indexOf("function openPurchaseOrderDialog"), appJs.indexOf("function currentMonthDateRange"));
  assert.match(dialog, /<select class="po-line__unit"[^>]*>\$\{PACKAGE_UNITS\.map/, "قائمة وحدات الكمية مفقودة من سطر الطلب");
  assert.match(dialog, /unit: row\.querySelector\("\.po-line__unit"\)\?\.value \|\| "حبة"/, "collectLines لا يجمع الوحدة");
  assert.match(dialog, /line\.unit === "حبة" \? \(unitOf\(line\.name\) \|\| "حبة"\) : line\.unit/, "نص الطلب لا يستخدم الوحدة المختارة");
  assert.match(css, /\.po-line__unit \{ height:44px/, "CSS خانة الوحدة مفقود");
});

test("طلب توريد المنتج الناقص: خانة بالحبة أو بنوع الكمية وتدخل في نص الرسالة", () => {
  const dialog = appJs.slice(appJs.indexOf("function openProductSupplyRequestDialog"), appJs.indexOf("function openReorderDialog"));
  assert.match(dialog, /<select id="psr-unit">/, "قائمة وحدات الكمية مفقودة");
  assert.match(dialog, /\[product\.unit, \.\.\.PACKAGE_UNITS\.filter/, "وحدة المنتج ليست الخيار الأول");
  assert.match(dialog, /unit: overlay\.querySelector\("#psr-unit"\)\?\.value \|\| product\.unit/, "الوحدة لا تُجمع عند الإرسال");
  assert.match(dialog, /\$\{amount\(quantity\)\} \$\{unit \|\| product\.unit\}/, "نص الطلب لا يستخدم الوحدة المختارة");
});

test("تواريخ نوافذ الطلبات: تُعرض يوم/شهر/سنة مثل بقية التطبيق وليس بصيغة ISO", () => {
  const zone = appJs.slice(appJs.indexOf("function supplyRequestButton"), appJs.indexOf("function purchasesMarkup"));
  assert.doesNotMatch(zone, /التاريخ: \$\{dateKey\(\)\}/, "ما زالت التواريخ بصيغة ISO في نصوص الطلبات");
  assert.match(zone, /التاريخ: \$\{formatDate\(dateKey\(\)\)\}/, "التاريخ لا يمر عبر منسق يوم/شهر/سنة");
  const poZone = appJs.slice(appJs.indexOf("function openPurchaseOrderDialog"), appJs.indexOf("function customersMarkup"));
  assert.doesNotMatch(poZone, /التاريخ: \$\{dateKey\(\)\}/, "نافذة طلب الشراء ما زالت ISO");
});

test("الوضع الداكن: لون اللوحات والحدود يتبع الخلفية المختارة ولا يبقى أخضر دائمًا", () => {
  // كل خيار خلفية داكنة يحمل لون لوحة وحدود مشتقين
  const themes = appJs.slice(appJs.indexOf("const BACKGROUND_DARK_THEMES"), appJs.indexOf("const LEGACY_BACKGROUND_MAP"));
  ["forest", "night-sky", "plum", "amber-night", "charcoal"].forEach((id) => assert.match(themes, new RegExp(`id: "${id}"[^}]*paper: "#[0-9a-f]{6}"[^}]*line: "#[0-9a-f]{6}"`), `خيار ${id} بلا ألوان لوحة`));
  // applyTheme يضبط --paper و--line في الداكن ويزيلهما في الفاتح
  const apply = appJs.slice(appJs.indexOf("function applyTheme"), appJs.indexOf("let systemThemeWatcherBound"));
  assert.match(apply, /setProperty\("--paper", palette\.darkPaper\)/, "لا يضبط لون اللوحات");
  assert.match(apply, /setProperty\("--line", palette\.darkLine\)/, "لا يضبط لون الحدود");
  assert.match(apply, /removeProperty\("--paper"\)/, "لا يعيد الفاتح لأصله");
  assert.match(apply, /\$\{palette\.light\}\|\$\{palette\.dark\}\|\$\{palette\.darkPaper\}\|\$\{palette\.darkLine\}/, "التخزين المحلي لا يحفظ ألوان اللوحة لما قبل أول رسم");
  // CSS: قواعد الداكن لم تعد تستخدم الأخضر الثابت بل المتغيرات
  const darkRules = css.split("\n").filter((line) => line.includes('[data-theme="dark"]') && !line.includes(':root[data-theme="dark"]')).join("\n");
  assert.doesNotMatch(darkRules, /#1a2d26|#557267|#58756a|#16211c|#122019|#3f5c51/, "قواعد الداكن ما زالت بألوان خضراء ثابتة");
});

/* ===== v48: النظام خارج التطبيق + بلاطة إضافة موظف + طباعة ومشاركة صورة لطلب الشراء ===== */

test("الوضع خارج التطبيق يتبع النظام: التفضيل المحفوظ يُطبق فقط بعد تسجيل الدخول", () => {
  const resolved = appJs.slice(appJs.indexOf("function resolvedTheme"), appJs.indexOf("function applyTheme"));
  assert.match(resolved, /if \(!state\.currentUser\) return systemPrefersDark\(\) \? "dark" : "light";/, "شاشات البداية لا تتبع النظام");
  // بعد الدخول/الخروج يعاد تطبيق السمة فورًا
  const login = appJs.slice(appJs.indexOf("async function handleLogin"), appJs.indexOf("async function handleLogin") + 900);
  assert.match(login, /installAutomaticBackups\(\);\s*applyTheme\(\);/, "لا يطبق تفضيل المستخدم بعد الدخول");
  const logout = appJs.slice(appJs.indexOf("async function completeLocalLogout"), appJs.indexOf("async function leaveAfterCashierShift"));
  const applyCount = (logout.match(/applyTheme\(\);/g) || []).length;
  assert.equal(applyCount, 2, "الخروج وتبديل المستخدم لا يعيدان اتباع النظام");
  // مراقب تغير سمة النظام يتفاعل أيضًا خارج الجلسة
  assert.match(appJs, /if \(themePreference\(\) === "system" \|\| !state\.currentUser\) \{ applyTheme\(\); render\(\); \}/, "مراقب النظام لا يعمل خارج الجلسة");
});

test("سكربت الرأس: لا يفرض الوضع المحفوظ قبل أول رسم إلا بوجود جلسة دخول", async () => {
  const html = await readFile(new URL("../client/index.html", import.meta.url), "utf8");
  assert.match(html, /hesabi-active-account-session/, "لا يفحص وجود الجلسة");
  assert.match(html, /var theme = hasSession && \(stored === "dark" \|\| stored === "light"\) \? stored : \(prefersDark \? "dark" : "light"\);/, "يفرض الوضع المحفوظ حتى بلا جلسة");
});

test("الحسابات: بلاطة حمراء كبيرة (إضافة موظف) تفتح نافذة الحساب بنوعه وصلاحياته", () => {
  const markup = appJs.slice(appJs.indexOf("function accountsMarkup"), appJs.indexOf("function activityLogMarkup"));
  assert.match(markup, /inventory-summary inventory-summary--purchases/, "شبكة البلاطات مفقودة");
  assert.match(markup, /<button class="po-order-tile" type="button" data-action="new-account"/, "بلاطة إضافة موظف مفقودة");
  assert.match(markup, /<strong>إضافة موظف<\/strong>/);
  assert.match(markup, /أدمن · كاشير · موظف وصلاحياته/, "وصف النوع والصلاحيات مفقود");
  // نافذة الحساب نفسها تحتوي الدور والصلاحيات والراتب
  const dialogMarkup = appJs.slice(appJs.indexOf("function accountFormMarkup"), appJs.indexOf("function openAccountDialog"));
  assert.match(dialogMarkup, /ACCOUNT_ROLES\.map/, "قائمة الأدوار مفقودة من نافذة الحساب");
  assert.match(dialogMarkup, /cashierPermissionsFieldsMarkup\(account\)/, "قسم الصلاحيات مفقود من نافذة الحساب");
});

test("طلب الشراء: زرا طباعة ومشاركة كصورة قبل الطباعة", () => {
  const dialog = appJs.slice(appJs.indexOf("function openPurchaseOrderDialog"), appJs.indexOf("function currentMonthDateRange"));
  assert.match(dialog, /<button id="po-print" class="button button--secondary" type="button">\$\{icon\("receipt", 17\)\}<span>طباعة<\/span>/, "زر الطباعة مفقود");
  assert.match(dialog, /<button id="po-share-image"[^>]*>\$\{icon\("share", 17\)\}<span>مشاركة صورة<\/span>/, "زر مشاركة الصورة مفقود");
  assert.match(dialog, /printHtmlDocument\(\{ html: orderHtml\(order\), target: "hesabi-purchase-order" \}\)/, "الطباعة لا تستخدم فاتورة الطلب");
  assert.match(dialog, /shareDocumentImage\(\{ html: orderHtml\(order\), filename: `طلب-شراء-\$\{dateKey\(\)\}\.png`/, "مشاركة الصورة لا تستخدم فاتورة الطلب");
  // مُصدر الصورة موجود في وحدة PDF ويُنتج PNG عبر نفس مسرح العرض
  assert.match(appJs, /shareOrDownloadImage, shareOrDownloadInvoicePdf/, "الاستيراد مفقود");
});

test("pdf-export: تصدير صورة PNG من نفس مسرح PDF مع مشاركة أو تنزيل", async () => {
  const pdfExport = await readFile(new URL("../client/src/js/pdf-export.js", import.meta.url), "utf8");
  assert.match(pdfExport, /export async function createImageFileFromHtml\(\{ html, filename, page = "a4", monochrome = true \}\)/, "الدالة مفقودة");
  assert.match(pdfExport, /finalCanvas\.toBlob\(resolve, "image\/png"\)/, "لا يصدر PNG");
  assert.match(pdfExport, /new File\(\[blob\], filename, \{ type: "image\/png" \}\)/, "ملف الصورة غير صحيح");
  assert.match(pdfExport, /export async function shareOrDownloadImage\(\{ html, filename, title, page = "a4", monochrome = true \}\) \{ return fileOrDownload\(await createImageFileFromHtml/, "المشاركة/التنزيل مفقودة");
});

/* ===== v49: قفل الشاشة السريع يقيد الصفحة فعلًا ولا يُفتح إلا بكلمة المرور ===== */

test("قفل الشاشة: طبقة مستقلة لا تُغلق بالنقر خارجها ولا بمفتاح الهروب وتصمد أمام التحديث", () => {
  const lock = appJs.slice(appJs.indexOf("const SCREEN_LOCK_STORAGE_KEY"), appJs.indexOf("function unlockScreen") + 400);
  // ليست نافذة openDialog القابلة للإغلاق — بل عنصر مستقل بمعرفه الخاص
  assert.match(lock, /host\.id = "screen-lock-backdrop"/, "القفل ما زال نافذة عادية");
  assert.doesNotMatch(lock, /const overlay = openDialog\(/, "القفل يستخدم openDialog القابلة للإغلاق");
  // حارس يعترض كل تفاعل خارج طبقة القفل
  assert.match(lock, /\["click", "mousedown", "touchstart", "keydown", "focusin", "contextmenu"\]\.forEach\(\(type\) => document\.addEventListener\(type, guard, true\)\)/, "لا حارس للتفاعلات خارج القفل");
  assert.match(lock, /event\.stopPropagation\(\)/, "الحارس لا يوقف الأحداث");
  // يصمد أمام تحديث الصفحة عبر التخزين المحلي
  assert.match(lock, /localStorage\.setItem\(SCREEN_LOCK_STORAGE_KEY, "1"\)/, "لا يحفظ حالة القفل");
  assert.match(lock, /localStorage\.removeItem\(SCREEN_LOCK_STORAGE_KEY\)/, "لا يمسح حالة القفل عند الفتح");
  assert.match(appJs, /localStorage\.getItem\(SCREEN_LOCK_STORAGE_KEY\) === "1"\) requestAnimationFrame\(openScreenLockDialog\)/, "لا يعيد القفل بعد تحديث الصفحة");
  // زر الحساب الآخر يسجل الخروج كاملًا — لا يفتح نافذة تبديل داخل الجلسة المقفلة
  assert.match(lock, /await db\.clearPersistentSession\(\);/, "تبديل الحساب من القفل لا يسجل الخروج");
  assert.doesNotMatch(lock, /openAccountSessionDialog\(\)/, "القفل يفتح نافذة الجلسة دون مصادقة");
  // الطبقة فوق كل شيء
  assert.match(css, /\.screen-lock-backdrop \{ position:fixed; z-index:3000/, "طبقة القفل ليست فوق كل شيء");
});

test("قفل الشاشة: لا يُفتح إلا برمز صاحب الجلسة نفسه — verifyAccountPin موجودة وتتحقق فعلًا", async () => {
  const dbJs = await readFile(new URL("../client/src/js/database.js", import.meta.url), "utf8");
  assert.match(dbJs, /async verifyAccountPin\(accountId, pin\)/, "الدالة مفقودة من قاعدة البيانات");
  assert.match(dbJs, /const \{ valid, upgradePin \} = await verifyAccountCredentials\(pin, account\);/, "لا تتحقق من الرمز فعلًا");
  assert.match(dbJs, /if \(!valid\) throw new Error\("رمز الدخول غير صحيح\."\);/, "الرفض صريح عند خطأ الرمز");
  // سلوكيًا: الرمز الصحيح يفتح والخاطئ يرفض
  await db.resetAllData();
  const account = await db.createAccount({ username: "lock-user", name: "موظف القفل", role: "cashier", pin: "4321" });
  await db.verifyAccountPin(account.id, "4321");
  await assert.rejects(() => db.verifyAccountPin(account.id, "9999"), /رمز الدخول غير صحيح/);
  await assert.rejects(() => db.verifyAccountPin("no-such-account", "4321"), /رمز الدخول غير صحيح/);
  await db.resetAllData();
});

test("رمز الدخول يُخزَّن بـ PBKDF2 ويُرحَّل الحساب القديم تلقائيًا عند أول دخول ناجح", async () => {
  await db.resetAllData();

  /* الحساب الجديد يُخزَّن مباشرةً بالنهج المقوّى — لا SHA-256 بدورة واحدة. */
  const fresh = await db.createAccount({ username: "pbkdf2-user", name: "حساب جديد", role: "admin", pin: "1234" });
  assert.match(fresh.pinHash, /^pbkdf2\$210000\$[0-9a-f]{64}$/, "التخزين الجديد ليس PBKDF2 بوسم صريح");
  assert.doesNotMatch(fresh.pinHash, /^[0-9a-f]{64}$/, "يجب ألا يبقى هاش SHA-256 خام");
  await db.authenticateAccount({ username: "pbkdf2-user", pin: "1234" });
  await assert.rejects(() => db.authenticateAccount({ username: "pbkdf2-user", pin: "4321" }), /بيانات الدخول غير صحيحة/);

  /* حساب قديم بهايش SHA-256 (كما كان قبل الترقية) — يُحاكى بكتابة مباشرة في IndexedDB،
     لأن saveUpgradedPinHash ترفض كتابة هاش غير مقوّى عن قصد. */
  const legacySalt = "00112233445566778899aabbccddeeff";
  const legacyDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${legacySalt}:5678`));
  const legacyHash = Array.from(new Uint8Array(legacyDigest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const legacy = await db.createAccount({ username: "legacy-user", name: "حساب قديم", role: "cashier", pin: "5678" });
  await writeRawAccountFields(legacy.id, { pinSalt: legacySalt, pinHash: legacyHash });

  const beforeLogin = (await db.listAccounts()).find((item) => item.id === legacy.id);
  assert.match(beforeLogin.pinHash, /^[0-9a-f]{64}$/, "المحاكاة نجحت: الحساب على النهج القديم");

  /* الدخول بالرمز الصحيح ينجح ويرحّل الهاش صامتًا. */
  await db.verifyAccountPin(legacy.id, "5678");
  const afterLogin = (await db.listAccounts()).find((item) => item.id === legacy.id);
  assert.match(afterLogin.pinHash, /^pbkdf2\$210000\$[0-9a-f]{64}$/, "لم يُرحَّل الهاش بعد الدخول الناجح");
  assert.notEqual(afterLogin.pinSalt, legacySalt, "الترحيل يستبدل الملح أيضًا");
  assert.ok(afterLogin.pinUpgradedAt, "يُسجَّل وقت الترحيل");

  /* الرمز نفسه ما زال يعمل بعد الترحيل، والخاطئ ما زال مرفوضًا. */
  await db.authenticateAccount({ username: "legacy-user", pin: "5678" });
  await assert.rejects(() => db.verifyAccountPin(legacy.id, "0000"), /رمز الدخول غير صحيح/);

  await db.resetAllData();
});

/* ===== v50: بند «تسديد مورد» ضمن سحوبات الخزنة ===== */

test("نافذة السحب: بند تسديد مورد مع قائمة الموردين المستحقين ويمر عبر registerSupplierPayment", () => {
  const dialog = appJs.slice(appJs.indexOf("function openCashMovementDialog"), appJs.indexOf("function periodicInventoryDetailsMarkup"));
  assert.match(dialog, /name="withdrawalKind" type="radio" value="supplier"/, "بند تسديد مورد مفقود");
  assert.match(dialog, /تسديد مورد/, "التسمية مفقودة");
  assert.match(dialog, /id="cw-supplier-field"[^>]*hidden>المورد<select name="supplierId">\$\{payableSuppliers\.map/, "قائمة الموردين المستحقين مفقودة");
  assert.match(dialog, /payableSuppliers = state\.suppliers\.filter\(\(supplier\) => toNumber\(supplier\.balance\) > 0\)/, "لا يقتصر على أصحاب المستحقات");
  assert.match(dialog, /kind === "supplier"[\s\S]*?db\.registerSupplierPayment\(\{ supplierId: values\.supplierId, amount: values\.amount, date: values\.date, notes: values\.notes, paymentMethod: "نقدي" \}\)/, "التسديد لا يمر عبر مسار دفعات الموردين");
  assert.match(dialog, /المستحق \$\{money\(supplier\.balance\)\}/, "خيار المورد لا يعرض مستحقه");
  assert.match(dialog, /cw-supplier-note/, "ملاحظة المستحق الحية مفقودة");
  // حارس القائمة الفارغة يعيد للسحب العادي
  assert.match(dialog, /if \(!payableSuppliers\.length\) \{ showToast\("لا يوجد مورد لديه مستحق مفتوح حاليًا\."/, "لا حارس لغياب المستحقين");
});

test("محاسبة تسديد المورد من الخزنة: يسوي الفواتير الآجلة ويحدث رصيد المورد ويظهر في خانة دفعات الموردين لا السحوبات", async () => {
  await db.resetAllData();
  const supplier = await db.createSupplier({ name: "مورد الخزنة", phone: "777000111" });
  const product = await db.createProduct({ name: "سكر الخزنة", barcode: "cwsp-1", unit: "كيس", quantity: 0, price: 120, cost: 100, minimumStock: 1 });
  await db.createPurchase({ supplierId: supplier.id, items: [{ productId: product.id, quantity: 10, unitCost: 100 }], paymentType: "آجل", paidAmount: 0 });
  const before = (await db.listSuppliers()).find((item) => item.id === supplier.id);
  assert.equal(before.balance, 1000, "المستحق بعد الشراء الآجل غير صحيح");
  const today = new Date().toISOString().slice(0, 10);
  // نفس نداء نافذة السحب تمامًا
  await db.registerSupplierPayment({ supplierId: supplier.id, amount: 400, date: today, notes: "تسديد من الخزنة", paymentMethod: "نقدي" });
  const after = (await db.listSuppliers()).find((item) => item.id === supplier.id);
  assert.equal(after.balance, 600, "رصيد المورد لم ينقص بالدفعة");
  const purchases = await db.listPurchases();
  assert.equal(purchases[0].paymentStatus, "مدفوعة جزئيًا", "الفاتورة الآجلة لم تُسوَّ جزئيًا");
  assert.equal(purchases[0].remainingAmount, 600);
  const cashbox = await db.getCashbox({ from: today, to: today });
  assert.equal(cashbox.supplierPayments, 400, "الدفعة لا تظهر في خانة دفعات الموردين بالخزنة");
  assert.equal(cashbox.withdrawals, 0, "الدفعة ازدوجت كسحب عادي");
  // تجاوز المستحق يُرفض
  await assert.rejects(() => db.registerSupplierPayment({ supplierId: supplier.id, amount: 900, date: today, paymentMethod: "نقدي" }), /أكبر من المستحق/);
  await db.resetAllData();
});

/* ===== v51: مشاركة الصورة بنمط الطابعة (أبيض/أسود) في كل أقسام الفواتير والتقارير ===== */

test("صورة المشاركة بنمط الطابعة: تحويل رمادي إجباري افتراضيًا في مُصدر الصور", async () => {
  const pdfExport = await readFile(new URL("../client/src/js/pdf-export.js", import.meta.url), "utf8");
  assert.match(pdfExport, /function toGrayscaleCanvas\(canvas\)/, "دالة التدرج الرمادي مفقودة");
  assert.match(pdfExport, /0\.299 \* pixels\[index\] \+ 0\.587 \* pixels\[index \+ 1\] \+ 0\.114 \* pixels\[index \+ 2\]/, "معادلة الإضاءة غير صحيحة");
  assert.match(pdfExport, /createImageFileFromHtml\(\{ html, filename, page = "a4", monochrome = true \}\)/, "monochrome ليس افتراضيًا");
  assert.match(pdfExport, /const finalCanvas = monochrome \? toGrayscaleCanvas\(canvas\) : canvas;/, "التحويل الرمادي لا يطبق");
  assert.match(pdfExport, /shareOrDownloadImage\(\{ html, filename, title, page = "a4", monochrome = true \}\)/, "التمرير للمشاركة مفقود");
});

test("مشاركة صورة في كل الأقسام: فاتورة البيع والشراء وكشف العميل والتقارير والجرد والنواقص وطلب الشراء", () => {
  // مساعد موحد يمرر عبر المصدر الرمادي
  assert.match(appJs, /async function shareDocumentImage\(\{ html, filename, title, page = "a4", button = null \}\)/, "المساعد الموحد مفقود");
  assert.match(appJs, /await shareOrDownloadImage\(\{ html, filename, title, page \}\)/, "المساعد لا يمرر للمصدر الرمادي");
  // فاتورة البيع (حرارية)
  assert.match(appJs, /id="share-invoice-image"/, "زر صورة فاتورة البيع مفقود");
  assert.match(appJs, /shareDocumentImage\(\{ html: await thermalInvoiceHtml\(invoiceWithCustomer\), filename: `\$\{invoice\.invoiceNumber\}\.png`, title: `فاتورة \$\{invoice\.invoiceNumber\}`, page: "thermal"/, "فاتورة البيع لا تشارك كصورة حرارية");
  // فاتورة الشراء
  assert.match(appJs, /id="share-purchase-image"/, "زر صورة فاتورة الشراء مفقود");
  assert.match(appJs, /shareDocumentImage\(\{ html, filename: `\$\{purchase\.invoiceNumber\}\.png`/, "فاتورة الشراء لا تشارك كصورة");
  // كشف حساب العميل
  assert.match(appJs, /id="share-customer-account-image"/, "زر صورة كشف الحساب مفقود");
  assert.match(appJs, /shareDocumentImage\(\{ html: accountHtml\(\), filename: `كشف-حساب-\$\{account\.customer\.name\}\.png`/, "كشف الحساب لا يشارك كصورة");
  // معاينة التقارير المالية
  assert.match(appJs, /data-preview-share-image/, "زر صورة التقارير مفقود");
  assert.match(appJs, /shareDocumentImage\(\{ html, filename: `hesabi-\$\{type\}-report-\$\{dateKey\(\)\}\.png`, title: reportTitle\(type\)/, "التقرير لا يشارك كصورة");
  // الجرد الدوري
  assert.match(appJs, /id="share-periodic-inventory-image"/, "زر صورة الجرد مفقود");
  assert.match(appJs, /shareDocumentImage\(\{ html: periodicInventoryReportHtml\(audit\), filename: `جرد-\$\{audit\.cycle\}-\$\{audit\.periodTo\}\.png`/, "الجرد لا يشارك كصورة");
  // طلب توريد النواقص
  assert.match(appJs, /data-reorder-send-image="\$\{key\}"/, "زر صورة النواقص مفقود");
  assert.match(appJs, /shareDocumentImage\(\{ html: orderHtml\(group, lines\), filename: `طلب-توريد-\$\{dateKey\(\)\}\.png`/, "طلب النواقص لا يشارك كصورة");
  // طلب الشراء يمر عبر المساعد الموحد أيضًا (رمادي)
  assert.match(appJs, /shareDocumentImage\(\{ html: orderHtml\(order\), filename: `طلب-شراء-\$\{dateKey\(\)\}\.png`/, "طلب الشراء لا يمر عبر المسار الرمادي");
});

/* ===== v52: الشريط السفلي — أيقونات أكبر ونبضة وتمييز الصفحة الحالية ===== */

test("الشريط السفلي: أيقونات أكبر والصفحة الحالية أكبر وأكثر تباينًا مع نبضة عند الضغط", async () => {
  const css = await readFile(new URL("../client/src/style.css", import.meta.url), "utf8");
  assert.match(css, /\.bottom-nav \{ height:80px; \}/, "ارتفاع الشريط لم يكبر");
  assert.match(css, /\.bottom-nav \.nav-item svg \{ width:23px; height:23px; \}/, "الأيقونات لم تكبر");
  assert.match(css, /\.bottom-nav \.nav-item\.is-active \{ color:#fff; background:linear-gradient\(145deg,#21755f,#16473b\)/, "الصفحة الحالية بلا تباين عالٍ");
  assert.match(css, /\.bottom-nav \.nav-item\.is-active svg \{ width:27px; height:27px; \}/, "أيقونة الصفحة الحالية ليست أكبر");
  assert.match(css, /@keyframes bottom-nav-pulse/, "حركة النبضة مفقودة");
  assert.match(css, /\.bottom-nav \.nav-item--pulse \{ animation:bottom-nav-pulse \.38s var\(--ease-out\); \}/, "صنف النبضة مفقود");
  assert.match(css, /\[data-theme="dark"\] \.bottom-nav \.nav-item\.is-active \{ color:#fff; background:linear-gradient\(145deg,#2a9a77,#175a46\)/, "تباين الوضع الداكن مفقود");
  // JS: النبضة تضاف عند تغيّر الصفحة فقط وتُزال بعد انتهاء الحركة
  assert.match(appJs, /let lastPulsedNavigationView = null;/, "متغير تتبع النبضة مفقود");
  assert.match(appJs, /activeItem\.classList\.add\("nav-item--pulse"\);/, "النبضة لا تُضاف");
  assert.match(appJs, /activeItem\.addEventListener\("animationend", \(\) => activeItem\.classList\.remove\("nav-item--pulse"\), \{ once: true \}\);/, "النبضة لا تُزال بعد الحركة");
});

/* ===== v53: شاشة الموردين — زر طلب شراء بدل عداد الموردين النشطين ===== */

test("شاشة الموردين: بلاطة طلب شراء بنفس آلية شاشة المشتريات بدل الموردين النشطين", () => {
  const suppliersSummary = appJs.slice(appJs.indexOf("function suppliersMarkup"), appJs.indexOf("function supplierPaymentsMarkup"));
  assert.ok(!suppliersSummary.includes("الموردون النشطون"), "عداد الموردين النشطين ما زال موجودًا");
  assert.match(suppliersSummary, /data-action="new-purchase-order"[^>]*aria-label="عمل طلب شراء وإرساله للمورد"><span>\$\{icon\("truck", 15\)\} مراسلة المورد<\/span><strong>طلب شراء<\/strong>/, "بلاطة طلب الشراء مفقودة في شاشة الموردين");
  assert.match(suppliersSummary, /data-action="new-supplier"/, "بلاطة إضافة مورد اختفت");
  // نفس الآلية: نفس data-action المستخدم في شاشة المشتريات
  assert.ok(appJs.split('data-action="new-purchase-order"').length >= 3, "الآلية غير مشتركة مع شاشة المشتريات");
});

/* ===== v54: زر إيقاف مؤقت وسط شريط المبيعات + اقتراحات طلب الشراء بالاسم الكامل ===== */

test("شريط المبيعات الثابت: زر إيقاف مؤقت في الوسط يعلّق عملية البيع الحالية", async () => {
  const css = await readFile(new URL("../client/src/style.css", import.meta.url), "utf8");
  // الزر في وسط الشريط بين خانة «الإجمالي» وخانة الرقم، ويستدعي نفس آلية التعليق hold-cart
  assert.match(appJs, /sales-total-bar__label">\$\{icon\("cart", 18\)\} الإجمالي<\/span><\/button><button class="sales-total-bar__hold" type="button" data-action="hold-cart"/, "زر الإيقاف المؤقت ليس في وسط الشريط");
  assert.match(appJs, /data-action="hold-cart" \$\{state\.cart\.length \? "" : "disabled"\} aria-label="إيقاف مؤقت — تعليق عملية البيع الحالية"/, "الزر لا يتعطل مع سلة فارغة");
  assert.match(appJs, /title="تعليق الفاتورة الحالية">\$\{icon\("pause", 22\)\}<\/button>/, "الزر ليس أيقونة فقط بلا نص");
  assert.doesNotMatch(appJs, /\$\{icon\("pause", \d+\)\}<span>إيقاف مؤقت<\/span>/, "نص إيقاف مؤقت ما زال داخل الزر");
  assert.match(css, /\.sales-total-bar__hold \{ display:grid; place-items:center; width:44px; height:44px/, "الزر ليس أيقونة دائرية مدمجة");
  assert.match(css, /\.sales-total-bar__hold:disabled \{ opacity:\.45/, "حالة التعطيل بلا مظهر");
  // hold-cart يقود إلى نافذة تعليق الفاتورة الموجودة
  assert.match(appJs, /if \(action === "hold-cart"\) \{ openHoldInvoiceDialog\(\); return; \}/, "آلية التعليق غير مرتبطة");
});

test("اقتراحات طلب الشراء: الاسم الكامل يظهر دون قصّ على عرض الحقل", async () => {
  const css = await readFile(new URL("../client/src/style.css", import.meta.url), "utf8");
  assert.match(css, /\.po-suggest \{ position:absolute;[^}]*width:max-content;[^}]*max-width:min\(440px, calc\(100vw - 48px\)\)/, "القائمة ما زالت مقيدة بعرض الحقل");
  assert.match(css, /\.po-suggest \{[^}]*z-index:40/, "القائمة قد تُحجب تحت عناصر النافذة");
  assert.match(css, /\.po-suggest__item strong \{[^}]*overflow-wrap:anywhere/, "اسم الصنف ما زال يُقصّ بثلاث نقاط");
  assert.doesNotMatch(/\.po-suggest__item strong \{[^}]*\}/.exec(css)?.[0] || "", /text-overflow:ellipsis|white-space:nowrap/, "قصّ الاسم ما زال مفعلًا");
});

/* ===== v56: أصناف المبيعات بلا باركود تتصدر القائمة ===== */

test("قائمة المبيعات: الأصناف بلا باركود (كود داخلي أو بلا رمز) في الأعلى دائمًا", () => {
  assert.match(appJs, /const productLacksBarcode = \(product\) => !String\(product\?\.barcode \|\| ""\)\.trim\(\);/, "دالة كشف غياب الباركود مفقودة");
  const fn = appJs.slice(appJs.indexOf("function salesRankedProducts"), appJs.indexOf("function salesMarkup"));
  // المعيار الأول قبل الأحدث مبيعًا: من بلا باركود يتقدم
  assert.match(fn, /if \(a\.noBarcode !== b\.noBarcode\) return Number\(b\.noBarcode\) - Number\(a\.noBarcode\);\s*if \(a\.lastSoldAt !== b\.lastSoldAt\)/, "غياب الباركود ليس المعيار الأول قبل الأحدث مبيعًا");
  assert.match(fn, /noBarcode: productLacksBarcode\(product\)/, "الترتيب لا يحسب حالة الباركود");
  // حتى بلا سجل مبيعات: القائمة تتصدرها الأصناف بلا باركود
  assert.match(fn, /return \[\.\.\.products\]\.sort\(\(a, b\) => Number\(productLacksBarcode\(b\)\) - Number\(productLacksBarcode\(a\)\)\);/, "مسار غياب السجل لا يقدم أصناف بلا باركود");
  // فرز مستقر: الكود الداخلي وحده لا يُعد باركودًا — يعتمد على حقل barcode فقط
  assert.doesNotMatch(fn, /internalCode/, "الكود الداخلي يجب ألا يؤثر على التصدر");
});

/* ===== v57: بوابة التثبيت — المتصفح يرى شاشة التثبيت والتطبيق المثبت يعمل مباشرة ===== */

test("بوابة التثبيت: كشف standalone وأغلفة أندرويد/سطح المكتب وiOS سفاري", async () => {
  const gate = await readFile(new URL("../client/src/js/install-gate.js", import.meta.url), "utf8");
  // كشف وضع التثبيت بكل صيغ display-mode + navigator.standalone على iOS
  assert.match(gate, /"\(display-mode: standalone\)", "\(display-mode: fullscreen\)", "\(display-mode: minimal-ui\)"/, "استعلامات display-mode ناقصة");
  assert.match(gate, /window\.navigator\.standalone === true/, "كشف iOS standalone مفقود");
  // الأغلفة الأصلية لا تُحجب أبدًا
  assert.match(gate, /Boolean\(window\.Capacitor \|\| window\.__TAURI__ \|\| window\.__TAURI_INTERNALS__\)/, "أغلفة Capacitor/Tauri ستُحجب بالخطأ");
  assert.match(gate, /if \(isNativeShell\(\)\) return false;/, "الغلاف الأصلي لا يمر");
  // iOS: iPad الحديث يعرف نفسه MacIntel بلمس
  assert.match(gate, /navigator\.platform === "MacIntel" && navigator\.maxTouchPoints > 1/, "iPadOS الحديث لن يُكشف");
  // بيئة التطوير لا تُحجب
  assert.match(gate, /if \(import\.meta\.env\.DEV\) return false;/, "بيئة التطوير ستُحجب");
});

test("بوابة التثبيت: beforeinstallprompt للزر وخطوات iOS والواجهة في index.html", async () => {
  const gate = await readFile(new URL("../client/src/js/install-gate.js", import.meta.url), "utf8");
  const html = await readFile(new URL("../client/index.html", import.meta.url), "utf8");
  const mainJs = await readFile(new URL("../client/src/main.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../client/src/style.css", import.meta.url), "utf8");
  // أندرويد/كروم: التقاط الحدث وتأجيله وربطه بالزر ثم prompt عند الضغط
  assert.match(gate, /window\.addEventListener\("beforeinstallprompt", \(event\) => \{\s*event\.preventDefault\(\);\s*deferredPrompt = event;/, "التقاط beforeinstallprompt مفقود");
  assert.match(gate, /deferredPrompt\.prompt\(\);/, "الزر لا يستدعي prompt");
  assert.match(gate, /window\.addEventListener\("appinstalled"/, "لا استجابة لحدث appinstalled");
  // iOS: إخفاء الزر وإظهار الخطوات
  assert.match(gate, /if \(isIosSafari\(\)\) \{[\s\S]{0,220}installButton\.hidden = true;[\s\S]{0,120}iosSteps\.hidden = false;/, "مسار iOS لا يخفي الزر ويظهر الخطوات");
  // الواجهة: الشاشة والزر والخطوات الثلاث في index.html والتطبيق داخل #app-content
  assert.match(html, /<div id="app-content">[\s\S]{0,80}<div id="app"/, "التطبيق ليس داخل #app-content");
  assert.match(html, /<section id="install-screen" hidden/, "شاشة التثبيت مفقودة");
  assert.match(html, /id="install-app-btn"[^>]*hidden/, "زر التثبيت يجب أن يبدأ مخفيًا حتى يصل الحدث");
  assert.match(html, /id="ios-install-steps"[\s\S]*?المشاركة[\s\S]*?إضافة إلى الشاشة الرئيسية[\s\S]*?«إضافة»/, "خطوات iOS الثلاث ناقصة");
  // main.js: الحجب قبل الإقلاع — المتصفح لا يشغل التطبيق إطلاقًا
  assert.match(mainJs, /if \(shouldBlockBrowserAccess\(\)\) \{\s*mountInstallGate\(\);\s*\} else \{\s*bootApp\(document\.querySelector\("#app"\)\);\s*\}/, "البوابة لا تسبق إقلاع التطبيق");
  // CSS: الشاشة فوق كل شيء
  assert.match(css, /#install-screen \{ position:fixed; inset:0; z-index:4000/, "شاشة التثبيت ليست طبقة عليا مثبتة");
});

/* ===== v58: حذف خانة سعر البيع من نموذج فاتورة الشراء ===== */

test("فاتورة الشراء: لا خانة سعر بيع في السطر والسعر يتعبأ تلقائيًا من بطاقة المنتج", () => {
  const dialog = appJs.slice(appJs.indexOf("async function openPurchaseDialog"), appJs.indexOf("function normalizePurchaseSalePrices"));
  assert.ok(!dialog.includes("data-purchase-sale-price"), "خانة سعر البيع ما زالت في نموذج الشراء");
  assert.ok(!dialog.includes("purchase-sale-price-field"), "غلاف خانة سعر البيع ما زال في القالب");
  // السعر يظل جزءًا من بيانات السطر (يُقرأ من المنتج) حتى تبقى الفواتير القديمة والتقارير سليمة
  assert.match(dialog, /const salePrice = values\.salePrice === undefined \|\| values\.salePrice === "" \? product\.salePrice \?\? product\.defaultSalePrice \?\? product\.price \?\? 0 : values\.salePrice;/, "تعبئة سعر البيع التلقائية من المنتج مفقودة");
  assert.match(dialog, /salePrice: toNumber\(salePrice\)/, "سعر البيع لم يعد يُحفظ في سطر الفاتورة");
});

/* ===== v59: بلاطة «خدمات» الصيدلية أعلى أصناف المبيعات ===== */

test("الصيدلية: بلاطة خدمات ثابتة بلون مميز أعلى الأصناف تفتح نافذة نوع الخدمة والسعر", async () => {
  const css = await readFile(new URL("../client/src/style.css", import.meta.url), "utf8");
  // البلاطة تظهر للصيدلية فقط وفوق بلاطتي الشحن والتحويل
  assert.match(appJs, /\$\{isPharmacy\(\) \? `<button class="sales-service-tile sales-service-tile--pharmacy" type="button" data-action="open-pharmacy-service">\$\{icon\("medical", 20\)\}<span>خدمات<\/span>/, "بلاطة الخدمات ليست مشروطة بالصيدلية أو ليست قبل البلاطتين");
  assert.match(appJs, /مجارحة · ضرب إبر · قياسات وغيرها/, "وصف البلاطة مفقود");
  // النافذة: نوع الخدمة (مجارحة، ضرب إبر...) + خيار مخصص + السعر
  assert.match(appJs, /const PHARMACY_SERVICE_OPTIONS = \["مجارحة", "ضرب إبر", "قياس ضغط", "قياس سكر", "تضميد جرح", "استشارة"\];/, "قائمة أنواع الخدمة ناقصة");
  assert.match(appJs, /<option value="__custom__">خدمة أخرى\.\.\.<\/option>/, "خيار الخدمة المخصصة مفقود");
  assert.match(appJs, /<label>السعر<input name="servicePrice" type="number" lang="en" inputmode="decimal" min="0" step="1" required/, "خانة السعر مفقودة");
  // الإضافة كسطر خدمة في السلة بسعر إلزامي واسم النوع
  assert.match(appJs, /state\.cart\.push\(\{ productId: `svc-pharmacy-\$\{Date\.now\(\)\}`, isService: true, serviceType: "pharmacy-service", name: kind, unitPrice: price, quantity: 1, discount: "" \}\);/, "الخدمة لا تُضاف للسلة");
  assert.match(appJs, /if \(price <= 0\) \{ showToast\("أدخل سعر الخدمة\.", "error"\); return; \}/, "السعر الصفري يمر");
  assert.match(appJs, /if \(action === "open-pharmacy-service"\) \{ openPharmacyServiceDialog\(\); return; \}/, "الزر غير مربوط بالنافذة");
  // لون مميز بعرض كامل فوق البلاطتين + دعم داكن + أيقونة طبية
  assert.match(css, /\.sales-service-tile--pharmacy \{ grid-column:1 \/ -1; background:linear-gradient\(135deg,#6d3ba8,#4a2478\)/, "البلاطة بلا لون مميز بعرض كامل");
  assert.match(css, /\[data-theme="dark"\] \.sales-service-tile--pharmacy/, "لا دعم للوضع الداكن");
  assert.match(appJs, /medical: '<path d="M12 3v18"/, "أيقونة الخدمات الطبية مفقودة");
});

/* ===== v60: إخفاء سعر البيع من شاشة تفاصيل فاتورة الشراء المحفوظة ===== */

test("تفاصيل فاتورة الشراء المحفوظة لا تعرض سعر البيع مع بقائه في البيانات", () => {
  const start = appJs.indexOf("فاتورة شراء محفوظة");
  assert.ok(start > -1, "شاشة تفاصيل فاتورة الشراء غير موجودة");
  const dialog = appJs.slice(start, start + 3200);
  assert.ok(!dialog.includes("سعر البيع"), "سعر البيع ما زال يظهر في تفاصيل فاتورة الشراء");
  assert.ok(dialog.includes("سعر الحبة ${money(item.unitCost)}"), "سعر الحبة اختفى من التفاصيل");
  // البيانات تبقى: التعبئة التلقائية والحفظ في سطر الشراء لم يتغيرا
  assert.match(appJs, /const salePrice = values\.salePrice === undefined \|\| values\.salePrice === "" \? product\.salePrice \?\? product\.defaultSalePrice \?\? product\.price \?\? 0 : values\.salePrice;/, "التعبئة التلقائية لسعر البيع حُذفت");
  assert.match(appJs, /salePrice: toNumber\(salePrice\)/, "سعر البيع لم يعد يُحفظ في بيانات السطر");
});

/* ===== v61: بلاطة «إضافة فاتورة» الحمراء بدل عداد فواتير الشراء ===== */

test("المشتريات: بلاطة إضافة فاتورة حمراء كبيرة مكان عداد فواتير الشراء", () => {
  // البلاطة تفتح فاتورة شراء جديدة وتعرض عدد الفواتير كسطر صغير
  assert.match(appJs, /<button class="po-order-tile" type="button" data-action="new-purchase" aria-label="إضافة فاتورة شراء جديدة"><span>\$\{icon\("plus", 15\)\} \$\{amount\(state\.purchases\.length\)\} فاتورة مسجلة<\/span><strong>إضافة فاتورة<\/strong><\/button><button class="po-order-tile" type="button" data-action="new-purchase-order"/, "بلاطة إضافة فاتورة مفقودة أو ليست قبل بلاطة طلب شراء");
  // عداد «فواتير الشراء» القديم لم يعد في صفحة المشتريات
  const start = appJs.indexOf("إجمالي المشتريات");
  const section = appJs.slice(start, appJs.indexOf("</section>", start));
  assert.ok(!section.includes("<span>فواتير الشراء</span>"), "عداد فواتير الشراء القديم ما زال موجودًا");
});

/* ===== v62: حذف زر + من أعلى صفحات العملاء والموردين والمشتريات ===== */

test("لا زر + في الشريط العلوي لصفحات العملاء والموردين والمشتريات، والبلاطات البديلة موجودة", () => {
  assert.match(appJs, /topbarMarkup\("الموردون", "تابع الأرصدة والشراء الآجل ودفعات الموردين في حساب واحد\."\)/, "زر + ما زال في شريط الموردين");
  assert.match(appJs, /topbarMarkup\("العملاء", "تابع الأرصدة والبيع الآجل والدفعات في حساب واحد\."\)/, "زر + ما زال في شريط العملاء");
  assert.match(appJs, /topbarMarkup\("المشتريات", "أنشئ فاتورة شراء لزيادة المخزون وتثبيت تكلفة المنتجات، مع إمكانية ربط المورد عند توفره\."\)/, "زر + ما زال في شريط المشتريات");
  // الوظائف باقية في البلاطات الحمراء أسفل الصفحة
  assert.match(appJs, /po-order-tile" type="button" data-action="new-supplier"/, "بلاطة إضافة مورد مفقودة");
  assert.match(appJs, /po-order-tile" type="button" data-action="new-customer"/, "بلاطة إضافة عميل مفقودة");
  assert.match(appJs, /po-order-tile" type="button" data-action="new-purchase"/, "بلاطة إضافة فاتورة مفقودة");
});

/* ===== v63: حذف زر «ربط هذا الجهاز» (رمز الاقتران) من الإعدادات > البيانات ===== */

test("لا زر ربط هذا الجهاز ولا نافذة إدخال رمز الاقتران في بطاقة النسخ السحابي", () => {
  assert.ok(!appJs.includes('data-action="pairing-redeem"'), "زر ربط هذا الجهاز ما زال موجودًا");
  assert.ok(!appJs.includes("openPairingRedeemDialog"), "نافذة إدخال رمز الاقتران ما زالت في الكود");
  // زر ربط النسخ السحابية باقٍ، وتدفق «دخول جهاز مساعد» لم يُمس
  assert.match(appJs, /data-action="open-cloud-auth">ربط النسخ السحابية<\/button><\/div><\/section>/, "زر ربط النسخ السحابية اختفى أو بقي بجواره زر الاقتران");
  assert.doesNotMatch(appJs, /redeemPairingInvite/, "بقايا رمز الاقتران عادت إلى app.js");
});

/* ===== v64: شرح مبسط لبطاقة النسخ السحابي قبل الربط ===== */

test("بطاقة النسخ السحابي: شرح واضح بلا ذكر رمز الاقتران أو مصطلحات تقنية", () => {
  assert.ok(!appJs.includes("اربط حساب النسخ أولًا، ثم أنشئ رمز اقتران"), "الشرح القديم ما زال موجودًا");
  assert.ok(!appJs.includes("حتى اكتمال طبقة المزامنة"), "عبارة طبقة المزامنة ما زالت موجودة");
  assert.match(appJs, /<p>اربط حسابك مرة واحدة لتحفظ نسخة من بياناتك في السحابة، وتستعيدها متى احتجت على هذا الجهاز أو أي جهاز آخر\.<\/p>/, "الشرح الجديد مفقود");
  assert.match(appJs, /<strong>بياناتك بأمان<\/strong><span>يعمل التطبيق دون إنترنت وتبقى بياناتك على جهازك، والنسخة السحابية احتياط إضافي ترفعه وتستعيده وقت ما تشاء\.<\/span>/, "ملاحظة بياناتك بأمان مفقودة");
});

/* ===== v65: نافذة ربط النسخ السحابية بتبويبي تسجيل دخول / إنشاء جديد ===== */

test("نافذة الربط السحابي: تبويبان وتأكيد كلمة السر ومعالجة «البريد موجود مسبقًا» بدخول تلقائي", () => {
  const start = appJs.indexOf('function openCloudAuthDialog(initialMode = "signin")');
  assert.ok(start > -1, "الدالة الجديدة مفقودة");
  const dialog = appJs.slice(start, appJs.indexOf("async function uploadCurrentCloudBackup", start));
  // تبويبا تسجيل دخول وإنشاء جديد
  assert.match(dialog, /data-cloud-tab="signin" role="tab">تسجيل دخول<\/button>/, "تبويب تسجيل دخول مفقود");
  assert.match(dialog, /data-cloud-tab="register" role="tab">إنشاء جديد<\/button>/, "تبويب إنشاء جديد مفقود");
  // إنشاء جديد: بريد + كلمة سر + تأكيدها، والتأكيد إلزامي في وضع الإنشاء فقط
  assert.match(dialog, /data-cloud-confirm-field hidden>تأكيد كلمة السر<input name="passwordConfirm" type="password"/, "خانة تأكيد كلمة السر مفقودة");
  assert.match(dialog, /form\.passwordConfirm\.required = isRegister;/, "تأكيد كلمة السر ليس إلزاميًا عند الإنشاء");
  assert.match(dialog, /if \(mode === "register" && values\.password !== values\.passwordConfirm\) \{ showError\("كلمة السر وتأكيدها غير متطابقين\."\);/, "لا تحقق من تطابق كلمتي السر");
  // الحالة التي اشتكى منها المستخدم: بريد موجود مسبقًا -> دخول تلقائي بنفس البيانات
  assert.match(dialog, /error\.code === "auth\/email-already-in-use"/, "لا معالجة خاصة للبريد الموجود مسبقًا");
  assert.match(dialog, /هذا البريد مسجل من قبل، فتم تسجيل دخولك وربط الحساب\./, "لا دخول تلقائي عند وجود البريد");
  assert.match(dialog, /هذا البريد مسجل مسبقًا لكن كلمة السر غير صحيحة/, "لا توجيه لكلمة السر الخاطئة");
  // والعكس: دخول ببريد غير موجود -> تحويل لتبويب الإنشاء
  assert.match(dialog, /mode === "signin" && \(error\.code === "auth\/user-not-found"\)/, "لا تحويل لتبويب الإنشاء عند بريد غير مسجل");
  // زر واحد يتبدل نصه حسب التبويب
  assert.match(dialog, /submitButton\.textContent = isRegister \? "إنشاء وربط" : "دخول وربط";/, "نص زر الإرسال لا يتبدل");
  // الخطأ يظهر داخل النافذة لا Toast فقط
  assert.match(dialog, /data-cloud-auth-error hidden/, "صندوق الخطأ داخل النافذة مفقود");
  // firebase-backup: كود الخطأ يمر مع الرسالة العربية
  assert.match(backupJs, /friendly\.code = error\?\.code \|\| "";/, "كود الخطأ لا يمر إلى الواجهة");
  assert.match(backupJs, /استخدم تبويب «تسجيل دخول» بدلًا من إنشاء حساب جديد/, "رسالة البريد المستخدم لم تُحدث");
  assert.match(css, /\.cloud-auth-tab\.is-active \{ color:#fff; background:var\(--green\)/, "تمييز التبويب النشط مفقود");
});

/* ===== v66: إصلاح Missing or insufficient permissions عند تسجيل بريد جديد ===== */

test("الربط السحابي لبريد جديد لا يسقط في خطأ الصلاحيات: قراءة المتجر متسامحة ومساحة جديدة عند التعارض", async () => {
  const syncJs = await readFile(new URL("../client/src/js/firebase-sync.js", import.meta.url), "utf8");
  // قراءة مستند المتجر قبل العضوية لا تفشل التهيئة
  assert.match(syncJs, /catch \(error\) \{ if \(error\?\.code !== "permission-denied"\) throw error; \}/, "رفض قراءة المتجر ما زال يفشل الربط");
  // دالة موحدة تعيد المحاولة بمساحة متجر جديدة عند تعارض الملكية
  const start = appJs.indexOf("async function linkAdminCloudWorkspaceAfterAuth()");
  assert.ok(start > -1, "الدالة الموحدة مفقودة");
  const fn = appJs.slice(start, appJs.indexOf("async function ensureAdminCloudWorkspace()", start));
  assert.match(fn, /error\?\.code === "permission-denied" \|\| \/insufficient permissions\/i\.test\(error\?\.message \|\| ""\)/, "لا كشف لخطأ الصلاحيات");
  assert.match(fn, /storeId = `store_\$\{randomId\(\)\}`;\s*\n\s*await db\.saveSettings\(\{ cloudStoreId: storeId \}\);/, "لا إنشاء مساحة جديدة عند التعارض");
  // نافذة الربط تستخدم الدالة الموحدة في المسارين (عادي + بريد موجود مسبقًا)
  const dialog = appJs.slice(appJs.indexOf('function openCloudAuthDialog(initialMode = "signin")'), appJs.indexOf("async function uploadCurrentCloudBackup"));
  assert.equal((dialog.match(/await linkAdminCloudWorkspaceAfterAuth\(\);/g) || []).length, 2, "النافذة لا تستخدم الدالة الموحدة في المسارين");
  // رسالة عربية بدل Missing or insufficient permissions
  assert.match(dialog, /تم إنشاء الحساب لكن تعذر تجهيز مساحة المتجر في السحابة/, "لا رسالة عربية لخطأ الصلاحيات");
});

/* ===== v67: تنظيف بقايا رمز الاقتران من بطاقة النسخ السحابي ===== */

test("بطاقة النسخ السحابي بعد الربط: زر رفع النسخة فقط بلا إصلاح المتجر ولا رمز اقتران ولا تحديث", () => {
  assert.ok(!appJs.includes("إنشاء رمز اقتران"), "زر إنشاء رمز اقتران ما زال موجودًا");
  assert.ok(!appJs.includes("إصلاح ربط المتجر"), "زر إصلاح ربط المتجر ما زال موجودًا");
  assert.ok(!appJs.includes("تحديث القائمة"), "زر تحديث القائمة ما زال موجودًا");
  assert.ok(!appJs.includes("موافقة وإصدار الرمز"), "طلبات الأجهزة المساعدة ما زالت تُعرض");
  assert.ok(!appJs.includes('data-action="pairing-invite"'), "معالج رمز الاقتران باقٍ");
  assert.ok(!appJs.includes('data-action="repair-cloud-workspace"'), "معالج إصلاح المتجر باقٍ");
  assert.ok(!appJs.includes('data-action="cloud-refresh-backups"'), "معالج تحديث القائمة باقٍ");
  assert.ok(!appJs.includes("openAssistantEntryDialog"), "نافذة دخول الجهاز المساعد باقية");
  // الوظائف الأساسية بقيت: رفع نسخة، استعادة، حذف، فصل الحساب، والتحديث التلقائي بعد الرفع/الحذف
  assert.match(appJs, /data-action="cloud-upload-backup"/, "زر رفع النسخة اختفى");
  assert.match(appJs, /data-action="cloud-restore-backup"/, "زر الاستعادة اختفى");
  assert.match(appJs, /data-action="cloud-delete-backup"/, "زر الحذف اختفى");
  assert.match(appJs, /data-action="cloud-signout"/, "زر فصل الحساب اختفى");
  assert.match(appJs, /await uploadCloudBackup\(backup, \{ storeName: storeDisplayName\(\) \}\); await refreshCloudBackups\(\{ quiet: true \}\);/, "التحديث التلقائي بعد الرفع اختفى");
});

/* ===== v68: تزامن لحظي لجهاز الكاشير عبر البريد نفسه بلا رمز اقتران ===== */

test("جهاز الكاشير بالبريد نفسه ينضم للمتجر ويتزامن لحظيًا مع بقية الأجهزة", async () => {
  const syncJs = await readFile(new URL("../client/src/js/firebase-sync.js", import.meta.url), "utf8");
  // انضمام الكاشير لعضوية البريد المشترك بلا رمز اقتران
  assert.match(syncJs, /export async function adoptStoreMembership\(\{ storeId, accountId, accountName, role = "cashier" \}\)/, "دالة انضمام الكاشير مفقودة");
  assert.match(syncJs, /deviceId: member\.deviceId/, "الكاشير لا يعيد استخدام deviceId عضوية البريد");
  assert.match(syncJs, /originId: readDeviceId\(\)/, "لا تمييز محلي للجهاز عبر originId");
  // كل جهاز يتجاهل عملياته هو فقط ويستقبل عمليات بقية الأجهزة
  assert.match(syncJs, /const localOrigin = identity\.originId \|\| identity\.deviceId;/, "مرشح المصدر مفقود");
  assert.match(syncJs, /\(data\.origin \|\| data\.deviceId\) !== localOrigin/, "الجهاز قد يتجاهل عمليات جهاز آخر بنفس البريد");
  assert.match(syncJs, /origin: identity\.originId \|\| identity\.deviceId/, "الدفع لا يحمل مصدر الجهاز");
  // الأدمن يعيد استخدام deviceId العضوية القائمة حتى لا تكسر قواعد الأمان دفعاته
  assert.match(syncJs, /existingMemberDeviceId \|\| deviceId/, "جهاز أدمن ثانٍ سيكسر قاعدة deviceId في العمليات");
  // app.js: الربط حسب الدور + تشغيل المزامنة بعد الدخول المحلي والاستعادة والربط من الإعدادات
  assert.match(appJs, /async function linkCloudWorkspaceAfterAuth\(\)/, "دالة الربط الموحدة مفقودة");
  assert.match(appJs, /state\.cloud\.identity = await adoptStoreMembership\(\{ storeId, accountId: state\.currentUser\.id, accountName: state\.currentUser\.name, role: "cashier" \}\);/, "الكاشير لا ينضم للمتجر");
  assert.match(appJs, /if \(state\.cloud\.user && !state\.cloud\.identity\) \{ try \{ await linkCloudWorkspaceAfterAuth\(\); await startCloudSync\(\); \}/, "لا ربط بعد تسجيل الدخول المحلي");
  assert.equal((appJs.match(/await startCloudSync\(\);/g) || []).length, 5, "تشغيل المزامنة ناقص في أحد المسارات");
  // الاستعادة على شاشة البداية تقبل أي حساب نشط لا الأدمن فقط
  const dbJs = await readFile(new URL("../client/src/js/database.js", import.meta.url), "utf8");
  assert.match(dbJs, /if \(!account \|\| !account\.isActive \|\| !validatePin\(pin\)/, "الاستعادة ما زالت حكرًا على الأدمن");
  assert.match(appJs, /أدمن أو كاشير/, "نص نافذة الاستعادة لم يعد يوضح قبول الكاشير");
});
