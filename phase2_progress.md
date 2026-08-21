# تقدم المرحلة الثانية — حسابي (حفظ استعادة السياق)

## حالة المشروع الحالية (محدث)
- المسار: /home/ubuntu/hesabi — الفرع master — المستودع: https://github.com/concordsharaf-source/hesabi
- التسليم: /home/ubuntu/delivery/ (v6 آخر APK)
- Android SDK: /home/ubuntu/android-sdk، Java 21، Gradle 8.5، البناء: `export ANDROID_HOME=/home/ubuntu/android-sdk && export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 && ./gradlew compileDebugKotlin / assembleDebug / testDebugUnitTest`
- Bug معروف مسجل: الباركود يخرج من التطبيق (لا يُصلح الآن).
- مواصفات المستخدم الكاملة في /home/ubuntu/upload/pasted_content.txt (اختبارات إلزامية 1-8، Commit message: "Build phase 2 purchases suppliers returns expenses and reports")

## النمط المعماري (يحافظ عليه)
- Money: Long بالوحدة الصغرى (SCALE=100)، Money.formatWithCurrency(minor, symbol)
- UI pattern: `val app = LocalContext.current.applicationContext as HesabiApp` + `viewModel(factory = XxxFactory(app))` + collectAsStateWithLifecycle
- ViewModelFactory يدوي عبر CreationExtras (أمثلة: InventoryViewModelFactory)
- UseCases في domain/ مع Mutex، Repositories في data/repository/
- Routes object في MainActivity.kt + composable entries في HesabiNavHost
- HomeScreen callbacks: onNavigateToSales/Products/Inventory/Invoices (تُضاف الجديدة هناك)
- AlertDialog هو النمط المستقر للاختيار (ExposedDropdownMenu معطل)
- TopBar: HesabiTopBar(title, onBackClick, actions)
- تنسيق: formatMoney(), formatQuantity(), formatDate(), formatDateTime()
- الفترة: startOfDay(millis)/endOfDay(millis)/todayStart()/todayEnd() في util/Formatters.kt

## الملفات الجيدة (المرحلة الثانية) — تمت ✓
1. domain/model/Supplier.kt
2. domain/model/Purchase.kt (+PurchaseItem)
3. domain/model/PurchaseReturn.kt (+PurchaseReturnItem)
4. domain/model/SaleReturn.kt (+SaleReturnItem)
5. domain/model/Expense.kt (+ExpenseType enum: RENT,ELECTRICITY,WATER,INTERNET,SALARIES,TRANSPORT,MAINTENANCE,OTHER_PURCHASES,GENERAL)
6. domain/model/StockMovement.kt: أُضيف PURCHASE, PURCHASE_RETURN, SALE_RETURN + cost + referenceId
7. domain/model/Sale.kt: أُضيف costPrice إلى SaleItem
8. data/dao/Phase2Daos.kt: SupplierDao, PurchaseDao, PurchaseReturnDao, SaleReturnDao, ExpenseDao
9. data/dao/SaleDao.kt: أُضيف getItemById, getItemsInRange, sumTotalsInRange
10. data/db/Migrations.kt: MIGRATION_1_2 (7 جداول + cost/referenceId/costPrice)
11. data/db/AppDatabase.kt: version=2 + entities + DAOs + ExpenseType converters
12. di/DatabaseProvider.kt: .addMigrations(MIGRATION_1_2) بدل destructive
13. data/repository/PurchaseRepository.kt (كل العمليات الجديدة)
14. domain/PurchaseUseCase.kt (متوسط مرجح للتكلفة + رقم PUR-000001)
15. domain/PurchaseReturnUseCase.kt (returnableQuantity + PURR-000001)
16. domain/SaleReturnUseCase.kt (returnableQuantity + SR-000001)
17. domain/ExpenseUseCase.kt
18. domain/ProfitUseCase.kt (ProfitSummary, PurchasingSummary)
19. CheckoutUseCase.kt: يُسجل costPrice في SaleItem و cost/referenceId في StockMovement SALE ✓

## مكتمل أيضًا
- [x] HesabiApp.kt: DI كامل للمرحلة الثانية (purchaseRepository, purchaseUseCase, purchaseReturnUseCase, saleReturnUseCase, expenseUseCase, profitUseCase)
- [x] MainActivity.kt: Routes + nav entries للمرحلة الثانية (SUPPLIERS, SUPPLIER_ADD/EDIT, PURCHASES, PURCHASE_ADD, PURCHASE_DETAIL, PURCHASE_RETURN, SALE_RETURN, EXPENSES, EXPENSE_ADD, REPORTS) + callbacks جديدة في HomeScreen composable
- [x] HomeScreen.kt: 4 QuickActions جديدة (موردون، مشتريات، مصروفات، تقارير) + 3 StatCards جديدة (صافي المشتريات اليوم، مصروفات اليوم، صافي الربح اليوم)
- [x] HomeViewModel.kt: todayNetPurchases/todayExpenses/todayNetProfit + flows للمشتريات والمرتجعات والمصروفات
- [x] ui/suppliers/: SuppliersViewModel + Factory + Screen (بحث+قائمة+حذف مع تأكيد AlertDialog) — على مسار suppliers (onSupplierClick → purchases؟ NO: navigate("suppliers/purchases/$id"))

## ملاحظات مهمة للبناء القادم
- SuppliersScreen.onSupplierClick → route غير موجود! يجب تصحيح: في MainActivity استخدم onSupplierClick: { id -> navController.navigate(Routes.PURCHASE_ADD) مع حفظ supplierId في savedStateHandle أو تعديل PurchaseFormScreen لاستقبال supplierId اختياري عبر savedStateHandle } — الأبسط: PurchaseFormScreen يأخذ initialSupplierId: Long? = null عبر savedStateHandle
- PurchaseFormScreen: يجب أن يدعم: اختيار منتج من قائمة (AlertDialog)، إضافة عدة بنود، اختيار مورد اختياري (AlertDialog من قائمة الموردين)، ملاحظة، حفظ
- PurchaseDetailScreen: تفاصيل الفاتورة + بنودها + زر مرتجع الشراء → PurchaseReturnScreen(purchaseId)
- PurchaseReturnScreen: بنود الفاتورة مع القابل للرجوع، Checkbox اختيار + حقل كمية + سعر افتراضي = unitPrice الأصلي
- SaleReturnScreen: مثل PurchaseReturnScreen لكن من فواتير البيع — يحتاج InvoicesViewModel أو شاشة فواتير → الأفضل: SaleReturnScreen يعرض بنود الفاتورة (يُجلب عبر SaleDao.getItemsForSale) مع القابل للإرجاع. لكن SaleItem ليس له items في Sale relation — SaleReturnViewModel يحتاج SaleDao + SaleReturnUseCase + productRepository. يمكن تمرير items عبر savedStateHandle من InvoicesScreen؟ الأبسط: SaleReturnViewModel يستعلم بنفسه.
- ExpensesScreen/ExpenseFormScreen: ExpenseType spinner (AlertDialog) — RENT,ELECTRICITY,WATER,INTERNET,SALARIES,TRANSPORT,MAINTENANCE,GENERAL
- ReportsScreen: PeriodSelector (اليوم/الأسبوع/الشهر/مخصص) + 4 تقارير: الأرباح (إيرادات/COGS/ربح إجمالي/مصروفات/صافي)، المشتريات (صافي)، المبيعات (إجمالي/عدد)، المصروفات (إجمالي). استخدم PeriodUiState مع startOfDay/endOfDay/weekStart/endOfWeek/monthStart/endOfMonth — يجب إضافتها في Formatters.kt
- InvoicesScreen callbacks: onSaleClick أو زر مرتجع لكل فاتورة → navigate("sales/$saleId/return")
- ProductsScreen: الباركود في نموذج المنتج لا يتغير
- InventoryScreen: لا تغيير إلزامي (المرحلة 2 تشمل أسعار شراء وقيمة مخزون موجودة أصلًا)
- UI conventions: HesabiTopBar(title, onBackClick), FloatingActionButton أولي، LazyColumn items(key={it.id}), AlertDialog للاختيار، formatMoney(symbol)/formatDate/formatDateTime/formatQuantity، Money fromMinorUnits
- Money: value class Money(private val amountInMinorUnits: Long); Money.fromMinorUnits(Long); Money.ZERO; format() (بدون رمز)
- Sale model لا يحتوي items relation — SaleReturnViewModel يجب أن يجلب البنود عبر SaleDao.getItemsForSale(saleId)
- SaleItem: id, saleId, productId, productName, barcode, unitPrice, quantity, unit, itemTotal, costPrice(0)
- PurchaseItem: id, purchaseId, productId, productName, barcode, unitPrice, quantity, unit, itemTotal
- Supplier: id, name, phone, address, notes, createdAt, updatedAt, isDeleted
- ExpenseType: RENT("إيجار"), ELECTRICITY("كهرباء"), WATER("ماء"), INTERNET("إنترنت"), SALARIES("رواتب"), TRANSPORT("مواصلات"), MAINTENANCE("صيانة"), GENERAL("أخرى") — تحقق من الملف Expense.kt!
- PurchaseUseCase.execute(items: List<PurchaseItemInput>, supplierId: Long?, note: String?) — PurchaseItemInput(productId?, productName, barcode?, quantity, unit, unitPrice: Long)
- PurchaseReturnUseCase.execute(purchaseId, items: List<PurchaseReturnItemInput>, note?) — PurchaseReturnItemInput(purchaseItemId, productId?, productName, quantity, unit, unitPrice)
- SaleReturnUseCase.execute(saleId, items: List<SaleReturnItemInput>, note?)
- ExpenseUseCase.addExpense(amount, type, description, notes?, date)
- ProfitUseCase.calculateProfit(dayStart, dayEnd): ProfitSummary(revenue, salesRefunds, netRevenue, costOfGoodsSold, grossProfit, expenses, netProfit); calculatePurchases(...): PurchasingSummary(purchases, purchaseReturns, netPurchases)
- routes in nav host: supplier click → "suppliers/purchases/$id" route NOT registered — FIX: pass supplierId through savedStateHandle from SuppliersScreen + nav.navigate(Routes.PURCHASE_ADD) then read handle in PurchaseFormScreen
- HomeViewModel: state todayNetPurchases, todayExpenses, todayNetProfit

## المتبقي
- [ ] screens UI: suppliers (List+Form), purchases (List+Form+Detail), purchase returns (Form), sale returns (Form), expenses (List+Form), reports (Period selector + 4 reports), profit (summary screen)
- [ ] HomeScreen/HomeViewModel: إضافة مبيعات اليوم (صافي)، تكلفة، مصروفات، صافي الربح
- [ ] InventoryScreen: عرض أسعار/قيمة مخزون أعلى + سعر الشراء
- [ ] MainActivity: Routes الجديدة + composable entries + callbacks
- [ ] factories للـ ViewModels الجديدة
- [ ] DI في HesabiApp.kt: lateinit var purchaseRepository, purchaseUseCase, purchaseReturnUseCase, saleReturnUseCase, expenseUseCase, profitUseCase (بترتيب صحيح قبل onCreate ينتهي)
- [ ] Unit tests + mandatory test scenarios 1-8
- [ ] Commit: "Build phase 2 purchases suppliers returns expenses and reports" + push
- [ ] APK v7 في /home/ubuntu/delivery/hesabi-debug-v7.apk
- [ ] ملاحظة مهمة: يجب حذف v3/v4 من AppDatabase migration history لا — v6 مبنية على schema 2، لكن أجهزة المستخدم لديها DB v1 → المهاجرة موجودة ✓ (تُطبّق عند أول فتح)

## أسماء مسارات Routes المقترحة
SUPPLIERS, SUPPLIER_ADD, SUPPLIER_EDIT, PURCHASES, PURCHASE_ADD, PURCHASE_DETAIL(purchaseId), PURCHASE_RETURN(purchaseId), SALE_RETURN(saleId), EXPENSES, EXPENSE_ADD, REPORTS, PROFIT

## حالة التنفيذ الحالية (محدثة)
### مكتمل حتى الآن
- [x] Formatters.kt: startOfWeek/endOfWeek/startOfMonth/endOfMonth/startOfDayFromText
- [x] ui/suppliers/: SuppliersViewModel+Factory+Screen, SupplierFormViewModel+Factory+Screen
- [x] ui/purchases/: PurchasesViewModel+Factory+Screen, PurchaseFormViewModel+Factory+Screen (بنود ببطاقات، ProductPickerDialog/SupplierPickerDialog بالـ AlertDialog، تحميل المنتجات/الموردين عبر LaunchedEffect، initialSupplierId من savedStateHandle)
- [x] HomeScreen/HomeViewModel: إحصاءات + QuickActions للمرحلة الثانية
- [x] MainActivity: كل المسارات + nav entries

### PurchaseFormViewModel API
- addItem(DraftPurchaseItem), removeItem, updateItem(index, item), setSupplier(id,name), setInitialSupplierId(id?), save(), total, state (items, supplierId, supplierName, note, isSaving, errorMessage, isSaved, currencySymbol, initialSupplierId)
- DraftPurchaseItem(productId?, productName, barcode?, quantity, unit, unitPrice) + itemTotal = (unitPrice*quantity).toLong()
- DraftPurchaseItem.unitPrice = product.costPrice عند الإضافة من المنتج

### المتبقي للبناء
- [ ] PurchaseDetailScreen + ViewModel (فاتورة + بنودها + زر مرتجع + ملاحظة + مورد)
- [ ] PurchaseReturnViewModel+Factory+Screen (بنود الفاتورة، CheckBox اختيار + كمية، returnableQuantity من useCase)
- [ ] SaleReturnViewModel+Factory+Screen (بنود فواتير البيع من SaleDao.getItemsForSale، returnableQuantity)
- [ ] InvoicesScreen: إضافة زر مرتجع لكل فاتورة → navigate("sales/$saleId/return") — يتطلب تعديل InvoicesViewModelFactory؟ لا: فقط شاشة. لكن InvoicesViewModel موجود. يجب معرفة كيف يُستدعى من nav host (onBack فقط) → يمكن تمرير onSaleReturn = { navController.navigate(...) }
- [ ] ExpensesScreen + ExpenseFormScreen (ExpenseType selector من Expense.kt: RENT,ELECTRICITY,WATER,INTERNET,SALARIES,TRANSPORT,MAINTENANCE,OTHER_PURCHASES,GENERAL)
- [ ] ReportsScreen + ViewModel (PeriodSelector: اليوم/الأسبوع/الشهر/مخصص + 4 تقارير؛ ProfitUseCase.calculateProfit + calculatePurchases)
- [ ] MainActivity: تصحيح onSupplierClick → navigate(Routes.PURCHASE_ADD) + savedStateHandle.set("supplierId", id) — حاليًا "suppliers/purchases/$id" غير مسجل! + ربط InvoicesScreen.onSaleReturn
- [ ] ProductsScreen: ربط الباركود في نموذج المنتج (لا تغيير إلزامي)
- [ ] بناء + اختبار + APK v7 + تقرير

### أمثلة API للبناء
- PurchaseReturnUseCase.execute(purchaseId, items: List<PurchaseReturnItemInput>, note?): PurchaseReturnResult.Success(purchaseReturn, invoiceNumber)/Failure(message)
- PurchaseReturnItemInput(purchaseItemId, productId?, productName, quantity, unit, unitPrice) — تحقق من الحقول
- SaleReturnUseCase.execute(saleId, items: List<SaleReturnItemInput>, note?)
- SaleReturnItemInput(saleItemId, productId?, productName, quantity, unit, unitPrice)
- ExpenseUseCase.addExpense(amount, type: ExpenseType, description, notes?, date)
- PurchaseRepository.getPurchaseReturns(purchaseId), sumPurchaseReturnsFor(purchaseId), getSupplier(id), getAllSuppliers(), observePurchases()
- ExpenseDao: observeAll, search, sumInRange
- ProfitUseCase.calculateProfit(dayStart, dayEnd): ProfitSummary(revenue, salesRefunds, netRevenue, costOfGoodsSold, grossProfit, expenses, netProfit)
- ProfitUseCase.calculatePurchases(dayStart, dayEnd): PurchasingSummary(purchases, purchaseReturns, netPurchases)
- SaleDao.getItemsForSale(saleId), getItemById(id), sumTotalsInRange, getItemsInRange(dayStart, dayEnd)
- Money.formatWithCurrency(minorUnits, symbol), Money.format(minorUnits)

## تحديث: PurchaseReturnViewModel مكتمل
- PurchaseReturnViewModel(app, purchaseId): state (purchase, items: List<ReturnItemState>, note, isLoading, isSaving, errorMessage, isSaved, currencySymbol)، toggleItem/setItemQuantity/onNoteChange/save()، refundedTotal
- ReturnItemState(item: PurchaseItem, returnableQuantity, isSelected, quantity)
- PurchaseItem fields: id, purchaseId, productId, productName, barcode, unitPrice, quantity, unit, itemTotal

## الخطوات المتبقية بالترتيب
1. PurchaseReturnViewModelFactory(app, purchaseId) في ui/purchases/
2. PurchaseReturnScreen.kt: HesabiTopBar("مرتجع الشراء"، onBack)، LazyColumn بنود مع Checkbox + OutlinedTextField كمية (Decimal)، يعرض القابل للرجوع، ملاحظة، زر حفظ، Snackbar للأخطاء، LaunchedEffect(isSaved)→onSaved
3. PurchaseDetailScreen + ViewModel: يعرض الفاتورة (رقم، مورد، تاريخ، ملاحظة، إجمالي) + بنودها + زر "إضافة مرتجع" → navigate("purchases/$purchaseId/return")
4. SaleReturnViewModel + Factory + Screen: يعرض بنود فواتير البيع (SaleDao.getItemsForSale(saleId) عبر app.movementDao؟ لا — يحتاج SaleDao). الحل: SaleReturnViewModel يستلم saleDao عبر app؟ لا يوجد getter. يجب إضافة app.getSaleDao() أو تمرير SaleDao من HesabiApp — الأبسط: إضافة lateinit var saleDao: SaleDao في HesabiApp + DI
5. InvoicesScreen: إضافة زر "مرتجع" لكل فاتورة: تعديل InvoicesScreen يأخذ onSaleReturn: (Long) -> Unit = {} callback جديد، InvoicesViewModel لا يتغير. ثم في MainActivity: onSaleReturn = { id -> navController.navigate("sales/$id/return") }
6. ExpensesScreen + ExpenseFormScreen (ExpenseType من Expense.kt: RENT,ELECTRICITY,WATER,INTERNET,SALARIES,TRANSPORT,MAINTENANCE,OTHER_PURCHASES,GENERAL — labels: إيجار، كهرباء، ماء، إنترنت، رواتب، نقل، صيانة، مشتريات أخرى، مصروفات عامة)
7. ReportsScreen + ViewModel: PeriodSelector (اليوم/الأسبوع/الشهر/مخصص startOfDayFromText) + ProfitSummary + PurchasingSummary + مبيعات اليوم (saleDao sumTotalsInRange) + مصروفات (expenseDao sumInRange)
8. MainActivity: fix onSupplierClick → savedStateHandle supplierId + navigate(PURCHASE_ADD); InvoicesScreen onSaleReturn
9. Build: ./gradlew assembleDebug --no-daemon; copy to /home/ubuntu/delivery/hesabi-debug-v7.apk; git push; deliver
10. ملاحظات UI: AlertDialog للاختيار بنفس نمط ProductPickerDialog (عمود 320dp مع verticalScroll، TextButton لكل عنصر، تأكيد إلغاء)

## تحديث الحالة (متابعة)
مكتمل: PurchaseReturnViewModelFactory+Screen, SaleReturnViewModel+Factory+Screen (ui/sales), ExpensesViewModel+Factory+Screen(إضافة)+ExpensesListViewModel+Factory+Screen(قائمة) (ui/expenses), HesabiApp: saleDao + expenseDao getters مضافان.
Expense fields: id, amount(Long minor), type:ExpenseType, description(String), date, notes, isDeleted — لا يوجد amount.isBlank issue.
ExpensesListScreen: LazyColumn بطاقات (type.label + description — شرط description != type.label)، زر حذف أيقونة delete.

### المتبقي
1. PurchaseDetailScreen + ViewModel (ui/purchases): يعرض الفاتورة وبنودها، زر "مرتجع شراء" → "purchases/$id/return"
2. MainActivity: مسارات المرحلة الثانية (تحقق أن كل routes مسجلة): suppliers, suppliers/add, suppliers/edit/{id}, purchases, purchases/add, purchases/{id}, purchases/{id}/return, sales/{id}/return, expenses (قائمة), expenses/add, reports. + ربط InvoicesScreen.onSaleReturn + onSupplierClick → savedStateHandle "supplierId" ثم navigate purchases/add
3. InvoicesScreen: إضافة callback onSaleReturn: (Long) -> Unit = {} لكل فاتورة زر مرتجع
4. ReportsScreen + ViewModel (ui/reports): PeriodSelector (اليوم/الأسبوع/الشهر/مخصص — startOfDayFromText)، تقارير 4: الأرباح، المشتريات، المبيعات، المصروفات. ProfitUseCase.calculateProfit/calculatePurchases + expenseDao.getInRange + saleDao.sumTotalsInRange
5. ثم: build assembleDebug, copy v7, git push, تسليم + تقرير

### نمط AlertDialog picker (المعتمد)
AlertDialog(title TextAlign.Center, text=Column 320dp verticalScroll + TextButton لكل عنصر fillMaxWidth textAlign End, confirmButton إلغاء)
### نمط ViewModel screen
val app = LocalContext.current.applicationContext as HesabiApp; viewModel(factory=...)؛ LaunchedEffect(errorMessage) showSnackbar؛ LaunchedEffect(isSaved)→onSaved()

## تحديث الحالة 2
مكتمل: PurchaseDetailViewModel+Factory+Screen (ui/purchases)، ReportsViewModel+Factory+Screen (ui/reports). كل Routes موجودة في MainActivity (SUPPLIERS, SUPPLIER_ADD, SUPPLIER_EDIT, PURCHASES, PURCHASE_ADD, PURCHASE_DETAIL, PURCHASE_RETURN, SALE_RETURN, EXPENSES, EXPENSE_ADD, REPORTS + ONBOARDING, HOME, SALES, PRODUCTS, PRODUCT_ADD, PRODUCT_EDIT, PRODUCT_DETAIL, INVENTORY, INVOICES, BARCODE).
Routes object حوالي سطر 62 في MainActivity.kt.

### المتبقي (الخطوة التالية)
1. التحقق: هل composable() entries كلها موجودة في MainActivity؟ (grep composable) + تسجيل screens الجديدة إذا غائبة: SupplierFormScreen, Supplier... (suppliers), PurchaseFormScreen, PurchaseDetailScreen, PurchaseReturnScreen, SaleReturnScreen, ExpensesScreen+ExpensesListScreen (expenses يحتاج تحديد: القائمة أم الإضافة؟), ReportsScreen
2. HomeScreen callbacks: إضافة/تصحيح onSuppliersClick, onPurchasesClick, onExpensesClick, onReportsClick, onSupplierClick(id) → navigate + savedStateHandle.set("supplierId", id) → purchases/add; onSaleReturn(saleId) → sales/$saleId/return
3. InvoicesScreen: callback onSaleReturn لكل فاتورة (زر مرتجع)
4. build assembleDebug → v7 → copy /home/ubuntu/delivery/hesabi-debug-v7.apk → git push → تسليم مع تقرير

## تحديث الحالة 3 — مشاكل المكتشفة في MainActivity nav (سطور 200-310)
1. SupplierFormScreen: لا يملك وسيط supplierId — constructor() بلا معاملات؛ يجب تمرير supplierId = null فقط عند SUPPLIER_ADD وعند SUPPLIER_EDIT استخدام SavedStateHandle savedStateHandle.set("supplierId", id) + read في SupplierFormScreen (على نمط PRODUCT_EDIT). الأفضل: تعديل SupplierFormScreen ليقرأ supplierId من savedStateHandle (نمط PRODUCT_EDIT: navArgument + SavedStateHandle).
2. PurchasesScreen onAddPurchase يجب تمرير savedStateHandle.set("supplierId", id)؟ لا — onSupplierClick يفتح suppliers/purchases/{id} وهو ليس route! يجب: onSupplierClick={id -> navController.navigate("suppliers/$id")} مع route جديدة SUPPLIER_PURCHASES="suppliers/{supplierId}" تعرض PurchasesScreen filtered بسجلت supplierId عبر savedStateHandle. PurchasesScreen تحتاج وسيط supplierId: Long? = null.
3. PurchaseDetailScreen: callback اسمه onReturn لكن Screen يعرف onReturnClick — متطابق؟ Screen كتبته: onReturnClick (يجب التحقق عند البناء).
4. ExpensesScreen vs ExpensesListScreen: EXPENSES مسجل ExpensesScreen() بدون وسيط — لكن Screen الذي كتبته يتوقع onSaved,onBack! يجب EXPENSES = قائمة (ExpensesListScreen) وEXPENSE_ADD = نموذج. لكن لا يوجد route EXPENSE_ADD في nav؟ يوجد. و ExpenseFormScreen غير موجود (كتبت ExpensesScreen للنموذج) — يجب إعادة تسمية: النموذج = ExpenseFormScreen، EXPENSES = قائمة، EXPENSE_ADD = نموذج.
5. onSupplierClick في SuppliersScreen: "suppliers/purchases/$id" → استبدل بنمط savedStateHandle.
6. InvoicesScreen: إضافة onSaleReturn callback وزر مرتجع لكل فاتورة — تحقق من InvoicesScreen.
7. HomeScreen: callbacks onSuppliersClick/onPurchasesClick/onExpensesClick/onReportsClick — تحقق أن موجودة وموصلة.
8. PurchaseReturnScreen callback onSaved — OK. SaleReturnScreen onSaved — OK.
