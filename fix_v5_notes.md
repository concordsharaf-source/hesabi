# تشخيص v5 — لماذا لا يقبل إدخال اسم المنتج (وغيره)

## الفحص الشامل
- لا يوجد runBlocking متبقٍ داخل أي composable أو ViewModel (إلا onCreate الآمن في MainActivity).
- كل الـ ViewModels تستخدم ViewModelScope وStateFlow بشكل سليم.
- ProductFormViewModel.updateField يعمل بشكل صحيح (StateFlow.update مباشر).

## السبب الحقيقي: إنشاء ViewModel مباشرة داخل composable بدون viewModel()
الأسطر المشكلة:
- ProductFormScreen سطر 61: `val viewModel = ProductFormViewModel(app, editProductId)`
- ProductsScreen سطر 65: `val viewModel = ProductsViewModel(app)`
- SalesScreen: `val viewModel = SalesViewModel(app)`
- HomeScreen: `val viewModel = HomeViewModel(app)`
- InventoryScreen: `InventoryViewModel(app)`
- InvoicesScreen: `InvoicesViewModel(app)`
- ProductDetailScreen: `ProductDetailViewModel(app, productId)`

**لماذا يسبب هذا تجميد الإدخال؟**
- عند كل recomposition (يحدث عند كل ضغطة لوحة المفاتيح وكتابة حرف!) يتم إنشاء ViewModel
  جديد بالكامل → إعادة init كامل → في ProductFormViewModel init مع editProductId:
  استعلام Room getById (suspend في viewModelScope).
- الأهم: recomposition المتكرر مع إنشاء كائنات Room/queries على كل حرف = شاشة بطيئة/مجمدة
  خاصة عند الكتابة السريعة، والحقل يفقد التركيز باستمرار.
- هذا النمط يخالف قاعدة Compose: يجب استخدام viewModel(factory) الذي يحتفظ بالنسخة
  عبر recomposition عبر LifecycleOwner.

## الحل: استخدام viewModel(factory) في كل الشاشات
1. ProductFormViewModelFactory(app, editProductId) — تمرير editProductId للـ factory.
2. استبدال كل الإنشاءات المباشرة بـ:
   `val viewModel: XViewModel = viewModel(factory = XViewModelFactory(...))`
   مع import androidx.lifecycle.viewmodel.compose.viewModel
3. إضافة factory لكل: ProductForm, Products, Sales, Home, Inventory, Invoices, ProductDetail, Onboarding (موجود).

## تحسين إضافي (مخاطرة منخفضة):
- ProductForm: ExposedDropdownMenuBox ما زال موجودًا (UnitDropdown) — استبدله بـ AlertDialog مثل v3.
- OnboardingScreen يعمل بالفعل.
