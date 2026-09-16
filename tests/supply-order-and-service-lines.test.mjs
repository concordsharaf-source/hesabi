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

/* ===== v47: وحدة الكمية (حبة/عبوة) في طلبات الشراء + تاريخ يوم/شهر/سنة + لوحات الداكن تتبع الخلفية المختارة ===== */

test("طلب الشراء: خانة بالحبة أو بالعبوة (كرتون كيس صندوق...) لكل سطر وتدخل في نص الطلب وPDF", () => {
  const dialog = appJs.slice(appJs.indexOf("function openPurchaseOrderDialog"), appJs.indexOf("function currentMonthDateRange"));
  assert.match(dialog, /<select class="po-line__unit"[^>]*>\$\{PACKAGE_UNITS\.map/, "قائمة العبوات مفقودة من سطر الطلب");
  assert.match(dialog, /unit: row\.querySelector\("\.po-line__unit"\)\?\.value \|\| "حبة"/, "collectLines لا يجمع الوحدة");
  assert.match(dialog, /line\.unit === "حبة" \? \(unitOf\(line\.name\) \|\| "حبة"\) : line\.unit/, "نص الطلب لا يستخدم الوحدة المختارة");
  assert.match(css, /\.po-line__unit \{ height:44px/, "CSS خانة الوحدة مفقود");
});

test("طلب توريد المنتج الناقص: خانة بالحبة أو بالعبوة وتدخل في نص الرسالة", () => {
  const dialog = appJs.slice(appJs.indexOf("function openProductSupplyRequestDialog"), appJs.indexOf("function openReorderDialog"));
  assert.match(dialog, /<select id="psr-unit">/, "قائمة العبوات مفقودة");
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
  assert.match(dbJs, /await hashPin\(pin, account\.pinSalt\) !== account\.pinHash\) throw new Error\("رمز الدخول غير صحيح\."\)/, "لا تتحقق من الرمز فعلًا");
  // سلوكيًا: الرمز الصحيح يفتح والخاطئ يرفض
  await db.resetAllData();
  const account = await db.createAccount({ username: "lock-user", name: "موظف القفل", role: "cashier", pin: "4321" });
  await db.verifyAccountPin(account.id, "4321");
  await assert.rejects(() => db.verifyAccountPin(account.id, "9999"), /رمز الدخول غير صحيح/);
  await assert.rejects(() => db.verifyAccountPin("no-such-account", "4321"), /رمز الدخول غير صحيح/);
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
