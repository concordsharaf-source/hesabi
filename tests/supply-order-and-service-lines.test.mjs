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

test("صفحة المشتريات: بلاطة «طلب شراء» الكبيرة بجوار بطاقة فواتير الشراء وبنفس تصميمها", () => {
  // البلاطة داخل صف الملخص نفسه بجوار بطاقة «فواتير الشراء» الحمراء
  assert.match(appJs, /<section class="inventory-summary inventory-summary--purchases"><div><span>إجمالي المشتريات<\/span>[\s\S]{0,200}فاتورة<\/strong><\/div><button class="po-order-tile" type="button" data-action="new-purchase-order"/, "بلاطة طلب الشراء ليست بجوار بطاقة فواتير الشراء");
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
  assert.match(css, /\.po-line \{ display:grid; grid-template-columns:minmax\(0,1fr\) 88px auto/, "أنماط سطر الطلب مفقودة");
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
  assert.match(markup, /الموردون النشطون[\s\S]*?<button class="po-order-tile" type="button" data-action="new-supplier"/, "بلاطة إضافة مورد ليست بجانب عدد الموردين");
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
