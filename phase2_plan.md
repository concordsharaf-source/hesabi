# خطة المرحلة الثانية — تطبيق حسابي

## تنبيه مهم
- Bug الباركود (خروج التطبيق عند الضغط على رمز الباركود): مسجّل كـ Bug معروف، لا يتم إصلاحه الآن.
- لا يتم حذف/كسر أي وظيفة من المرحلة الأولى.
- لا يتم إضافة ميزات المرحلة الثالثة (العملاء، الديون، المزامنة...).

## النمط المعماري الموجود (يُحافظ عليه)
- المبالغ بوحدة العملة الصغرى (Long)، Money.scale = 100
- Room + DAOs + Repository + UseCase في domain/ + DI يدوي في HesabiApp (lateinit vars)
- ViewModel factories يدوية (لا Hilt)، شاشة لكل ميزة
- Soft delete للمنتجات، رقم فاتورة تسلسلي INV-000001 عبر maxInvoiceSequence
- Mutex لمنع التداخل في العمليات الحرجة
- Routes object في MainActivity + HesabiNavHost

## الملفات الجديدة

### Data layer
1. `domain/model/Supplier.kt` — جدول suppliers (id, name, phone, address, notes, createdAt, updatedAt, isDeleted)
2. `domain/model/Purchase.kt` — جدول purchases (PUR-000001، supplierId FK SET NULL، date، subtotal، total، note، isDeleted)
3. `domain/model/PurchaseItem.kt` — جدول purchase_items (purchaseId، productId SET NULL، productName snapshot، barcode، unitPrice (سعر الشراء)، quantity، unit، itemTotal)
4. `domain/model/PurchaseReturn.kt` — جدول purchase_returns (PR-000001، purchaseId، date، supplierId، note، totalRefunded)
5. `domain/model/PurchaseReturnItem.kt` — purchase_return_items (purchaseItemId مرجع لبند الشراء، quantity مرتجعة، price، unit)
6. `domain/model/SaleReturn.kt` — sale_returns (SR-000001، saleId، date، note، totalRefunded)
7. `domain/model/SaleReturnItem.kt` — sale_return_items (saleItemId، quantity، price، unit)
8. `domain/model/Expense.kt` — expenses (المبلغ minorUnits، type enum، description، date، notes، isDeleted) + ExpenseType enum (إيجار، كهرباء، ماء، إنترنت، رواتب، نقل، صيانة، مشتريات أخرى، مصروفات عامة)
9. `data/dao/SupplierDao.kt`, `PurchaseDao.kt`, `PurchaseReturnDao.kt`, `SaleReturnDao.kt`, `ExpenseDao.kt`
10. `data/repository/SupplierRepository.kt`, `PurchaseRepository.kt`
11. تحديث `StockMovement.kt`: إضافة PURCHASE, PURCHASE_RETURN, SALE_RETURN إلى MovementType (لا حذف INITIAL/SALE/ADJUSTMENT)
12. تحديث `StockMovement`: إضافة cost (Long), referenceId (Long nullable)
    - Room migration 1→2: إضافة عمودين على stock_movements (ALTER TABLE ADD COLUMN)
13. تحديث `SaleItem`: إضافة costPrice (Long) — تكلفة الوحدة وقت البيع، بدون room migration:
    - حل بديل آمن: إضافة عمود costPrice عبر migration 1→2 نفس المهاجرة.
    - أو حفظ cost في sale_items جديد. الأفضل: migration واحدة تضيف cost إلى stock_movements و costPrice إلى sale_items.
14. تحديث `AppDatabase.kt`: version=2 + مigrations(1→2) + Remove fallbackToDestructiveMigration (استبداله بـ addMigrations مع fallback للتحذير)
15. Converters: إضافة ExpenseType converter

### Domain layer
16. `domain/PurchaseUseCase.kt` — إتمام فاتورة شراء داخل Mutex: تحقق، إنشاء Purchase+Items، زيادة المخزون، StockMovement PURCHASE، تحديث متوسط تكلفة الشراء (متوسط مرجح: (التكلفة القديمة×الكمية القديمة + تكلفة الدفعة الجديدة)/(الكمية الإجمالية))، رقم PUR-000001
17. `domain/PurchaseReturnUseCase.kt` — فتح فاتورة شراء سابقة، عرض بنودها + الكميات المرتجعة سابقًا، التحقق من الكمية المرتجعة ≤ المشتراة−المرتجعة سابقًا، خصم المخزون، SALEReturn حركة PURCHASE_RETURN، إنشاء PurchaseReturn+Items
18. `domain/SaleReturnUseCase.kt` — فتح فاتورة بيع سابقة، عرض بنودها + المرتجع سابقًا، الكمية ≤ المبيعة−المرتجعة، زيادة المخزون، SALE_RETURN، SaleReturn+Items، حساب refund من price×quantity المرتجع
19. `domain/ExpenseUseCase.kt` — إضافة/حذف/قائمة المصروفات
20. `domain/ProfitUseCase.kt` — حساب: إجمالي المبيعات، تكلفة البضاعة المباعة (من sale_items costPrice)، إجمالي المصروفات، الربح الإجمالي، صافي الربح؛ مع فلترة الفترة (اليوم/أمس/الأسبوع/الشهر/مخصص)
21. تحديث `CheckoutUseCase`: حفظ costPrice في SaleItem (تكلفة وقت البيع) — من المنتج.purchasePrice

### UI layer
22. `ui/suppliers/` — SuppliersScreen + ViewModel + Factory
23. `ui/suppliers/SupplierFormScreen.kt` + ViewModel
24. `ui/purchases/` — PurchasesScreen (قائمة فواتير الشراء + زر فاتورة شراء جديدة) + ViewModel + Factory
25. `ui/purchases/PurchaseFormScreen.kt` (اختيار المورد، إضافة منتجات: موجود أو جديد، كميات، سعر شراء، إجمالي، حفظ) + ViewModel + Factory
26. `ui/purchases/PurchaseDetailScreen.kt` (تفاصيل الفاتورة + زر مرتجع) + ViewModel + Factory
27. `ui/returns/` — PurchaseReturnScreen (قائمة فواتير الشراء القابلة للرجوع) + PurchaseReturnFormScreen + SaleReturnScreen + SaleReturnFormScreen + ViewModels + Factories
28. `ui/expenses/` — ExpensesScreen (قائمة + بحث + فلتر تاريخ + إجمالي) + ExpenseFormScreen + ViewModels + Factories
29. `ui/reports/` — ReportsScreen (4 تقارير + اختيار فترة: اليوم/أمس/الأسبوع/الشهر/مخصص) + ViewModels + Factory
30. `ui/summary/ProfitSummaryScreen.kt` — الأرباح (اختياري كجزء من Reports أو Screen مستقل)
31. تحديث `HomeScreen.kt` + `HomeViewModel.kt`: إضافة إجمالي المبيعات/التكلفة/المصروفات/الربح الإجمالي/صافي الربح على Dashboard
32. تحديث `InventoryScreen.kt`: عرض سعر الشراء، سعر البيع، قيمة المخزون (كمية×سعر الشراء)، إجمالي قيمة المخزون أعلى الشاشة
33. تحديث `MainActivity.kt`: إضافة Routes الجديدة + composable entries + HomeScreen navigation callbacks
34. تحديث `StockMovementScreen` إن وجد — عرض أنواع الحركات الست

### تحديثات
- Purchase/Expense: استخدام نفس أسلوب Money
- الاختبارات: Unit tests للمراحل الجديدة + تحقق من السيناريوهات الثمانية

## ملاحظات حرجة
- SaleItem لا يحتوي costPrice حاليًا → إضافة عمود عبر migration (أو قيمة افتراضية 0 للفواتير القديمة: تكلفة قديمة = 0 تعني لا نحسب ربحًا دقيقًا لها — مقبول مع تنبيه)
- المهاجرة 1→2: إضافة stock_movements.cost، stock_movements.referenceId، sale_items.costPrice
- لا نستخدم fallbackToDestructiveMigration نهائيًا الآن (بيانات المستخدم محفوظة) — نضيف migration صريحة
- PurchaseItem يحفظ اسم المنتج snapshot + سعر الشراء وقت الشراء (نفس فلسفة SaleItem)
- مرتجعات: لا نتتبع "المرتجع من المرتجع" — الكمية المرتجعة ≤ المباعة − المرتجعة سابقًا (يُحسب من sale_return_items أو purchase_return_items)
- متوسط تكلفة الشراء على product.purchasePrice (مرجح)
- التقارير: الفترة — حساب حدود الأيام عبر util现有的 startOfDay/endOfDay + أيام الأسبوع/الشهر
