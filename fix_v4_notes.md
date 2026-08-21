# تشخيص v4 — سبب تجمد الإدخال في شاشة الإعداد

## الأسباب الجذرية المؤكدة (من قراءة الكود)

### 1. runBlocking داخل @Composable HesabiNavHost (السبب الرئيسي)
- السطر 69 في MainActivity.kt:
  `val startRoute = kotlinx.coroutines.runBlocking { app.settingsUseCase.isSetupComplete() }`
- تُنفَّذ في كل recomposition. Room `select` على الخيط الرئيسي + runBlocking يجمّد UI thread
  أثناء انتظار النتيجة → الشاشة "مجمّدة"، لا يمكن كتابة حرف في TextField.
- الإصلاح: قراءة القيمة مرة واحدة في onCreate() قبل setContent (runBlocking هناك آمن لأنه قبل أي UI)
  ثم تمرير startRoute كمعامل إلى HesabiNavHost.

### 2. side-effect أثناء composition في OnboardingScreen
- السطور 62-65:
  ```
  if (state.isCompleted) { onSetupComplete(); return }
  ```
- استدعاء navController.navigate() أثناء التركيب (قبل اكتمال composition)
  غير آمن وقد يرمي IllegalStateException أو يسبب loop.
- الإصلاح: LaunchedEffect(state.isCompleted) { if (state.isCompleted) onSetupComplete() }

### 3. runBlocking داخل combine في HomeViewModel (سبب تجمد dashboard لاحقًا)
- السطر 49: `val store = kotlinx.coroutines.runBlocking { settingsUseCase.getStore() }`
  يُنفَّذ داخل combinator على كل انبعاث (collectors thread).
- الإصلاح: قراءة store مرة واحدة في init{} بـ viewModelScope.launch، ثم include قيمتها في combine.

## خطة التنفيذ
- MainActivity.kt: قراءة isSetupComplete في onCreate (runBlocking قبل setContent)، تمرير startRoute.
- OnboardingScreen.kt: LaunchedEffect بدل side-effect أثناء التركيب.
- HomeViewModel.kt: store كـ StateFlow منفصل، combine بدونه.
