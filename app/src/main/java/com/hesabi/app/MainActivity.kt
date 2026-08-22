package com.hesabi.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.Composable
import kotlinx.coroutines.runBlocking
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.hesabi.app.ui.common.BarcodeScannerScreen
import com.hesabi.app.ui.details.ProductDetailScreen
import com.hesabi.app.ui.details.ProductFormScreen
import com.hesabi.app.ui.home.HomeScreen
import com.hesabi.app.ui.inventory.InventoryScreen
import com.hesabi.app.ui.invoices.InvoicesScreen
import com.hesabi.app.ui.onboarding.OnboardingScreen
import com.hesabi.app.ui.purchases.PurchaseDetailScreen
import com.hesabi.app.ui.purchases.PurchaseFormScreen
import com.hesabi.app.ui.purchases.PurchaseReturnScreen
import com.hesabi.app.ui.purchases.PurchasesScreen
import com.hesabi.app.ui.reports.ReportsScreen
import com.hesabi.app.ui.sales.SaleReturnScreen
import com.hesabi.app.ui.suppliers.SupplierFormScreen
import com.hesabi.app.ui.suppliers.SuppliersScreen
import com.hesabi.app.ui.expenses.ExpensesListScreen
import com.hesabi.app.ui.expenses.ExpensesScreen
import com.hesabi.app.ui.products.ProductsScreen
import com.hesabi.app.ui.sales.SalesScreen
import com.hesabi.app.ui.theme.HesabiTheme

/**
 * نقطة الدخول — تستضيف Navigation Compose فقط.
 * كل الشاشات في ملفاتها الخاصة (Products, Sales, Inventory...).
 */
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        // قراءة حالة الإعداد مرة واحدة قبل بناء الواجهة — runBlocking هنا آمن
        // لأنه يُنفَّذ قبل setContent ولا يجمّد خيط الواجهة.
        val isSetupDone = kotlinx.coroutines.runBlocking {
            (application as HesabiApp).settingsUseCase.isSetupComplete()
        }
        setContent {
            HesabiTheme {
                HesabiNavHost(startRoute = if (isSetupDone) Routes.HOME else Routes.ONBOARDING)
            }
        }
    }
}

/**
 * مسارات التطبيق.
 */
object Routes {
    const val ONBOARDING = "onboarding"
    const val HOME = "home"
    const val SALES = "sales"
    const val PRODUCTS = "products"
    const val PRODUCT_ADD = "product/add"
    const val PRODUCT_EDIT = "product/edit/{productId}"
    const val PRODUCT_DETAIL = "product/{productId}"
    const val INVENTORY = "inventory"
    const val INVOICES = "invoices"
    const val BARCODE = "barcode/{target}"

    // المرحلة الثانية
    const val SUPPLIERS = "suppliers"
    const val SUPPLIER_ADD = "suppliers/add"
    const val SUPPLIER_EDIT = "suppliers/edit/{supplierId}"
    const val PURCHASES = "purchases"
    const val PURCHASE_ADD = "purchases/add"
    const val PURCHASE_DETAIL = "purchases/{purchaseId}"
    const val PURCHASE_RETURN = "purchases/{purchaseId}/return"
    const val SALE_RETURN = "sales/{saleId}/return"
    const val EXPENSES = "expenses"
    const val EXPENSE_ADD = "expenses/add"
    const val REPORTS = "reports"

    const val TARGET_PRODUCTS = "products"
    const val TARGET_SALES = "sales"
    const val TARGET_PRODUCT_ADD = "product_add"
}

@Composable
private fun HesabiNavHost(startRoute: String) {
    val navController = rememberNavController()
    // startRoute يُقرأ مرة واحدة في onCreate() قبل بناء الواجهة (لا runBlocking داخل composable)
    NavHost(
        navController = navController,
        startDestination = startRoute,
        modifier = Modifier
    ) {
        composable(Routes.ONBOARDING) {
            OnboardingScreen(onSetupComplete = {
                navController.navigate(Routes.HOME) {
                    popUpTo(Routes.ONBOARDING) { inclusive = true }
                }
            })
        }

        composable(Routes.HOME) {
            HomeScreen(
                onNavigateToSales = { navController.navigate(Routes.SALES) },
                onNavigateToProducts = { navController.navigate(Routes.PRODUCTS) },
                onNavigateToInventory = { navController.navigate(Routes.INVENTORY) },
                onNavigateToInvoices = { navController.navigate(Routes.INVOICES) },
                onNavigateToSuppliers = { navController.navigate(Routes.SUPPLIERS) },
                onNavigateToPurchases = { navController.navigate(Routes.PURCHASES) },
                onNavigateToExpenses = { navController.navigate(Routes.EXPENSES) },
                onNavigateToReports = { navController.navigate(Routes.REPORTS) }
            )
        }

        composable(Routes.SALES) {
            SalesScreen(
                onBarcodeScan = {
                    navController.navigate("${Routes.BARCODE}/${Routes.TARGET_SALES}")
                },
                onBack = { navController.popBackStack() },
                navController = navController
            )
        }

        composable(Routes.PRODUCTS) {
            ProductsScreen(
                onAddProduct = { navController.navigate(Routes.PRODUCT_ADD) },
                onEditProduct = { id ->
                    navController.navigate("product/edit/$id")
                },
                onProductClick = { id ->
                    navController.navigate("product/$id")
                },
                onBarcodeScan = {
                    navController.navigate("${Routes.BARCODE}/${Routes.TARGET_PRODUCTS}")
                }
            )
        }

        composable(Routes.PRODUCT_ADD) {
            ProductFormScreen(
                editProductId = null,
                onBarcodeScan = {
                    navController.navigate("${Routes.BARCODE}/${Routes.TARGET_PRODUCT_ADD}")
                },
                onSaved = { navController.popBackStack() },
                onBack = { navController.popBackStack() },
                navController = navController
            )
        }

        composable(
            route = Routes.PRODUCT_EDIT,
            arguments = listOf(navArgument("productId") { type = NavType.LongType })
        ) { entry ->
            val productId = entry.arguments?.getLong("productId") ?: 0
            ProductFormScreen(
                editProductId = productId,
                onBarcodeScan = {
                    navController.navigate("${Routes.BARCODE}/${Routes.TARGET_PRODUCT_ADD}")
                },
                onSaved = { navController.popBackStack() },
                onBack = { navController.popBackStack() },
                navController = navController
            )
        }

        composable(
            route = Routes.PRODUCT_DETAIL,
            arguments = listOf(navArgument("productId") { type = NavType.LongType })
        ) { entry ->
            val productId = entry.arguments?.getLong("productId") ?: 0
            ProductDetailScreen(
                productId = productId,
                onEdit = {
                    navController.navigate("product/edit/$productId")
                },
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.INVENTORY) {
            InventoryScreen(
                onProductClick = { id ->
                    navController.navigate("product/$id")
                }
            )
        }

        composable(Routes.INVOICES) {
            InvoicesScreen(
                onBack = { navController.popBackStack() },
                onSaleReturn = { saleId ->
                    navController.navigate("sales/$saleId/return")
                }
            )
        }

        composable(Routes.SUPPLIERS) {
            SuppliersScreen(
                onAddSupplier = { navController.navigate(Routes.SUPPLIER_ADD) },
                onEditSupplier = { id -> navController.navigate("suppliers/edit/$id") },
                onSupplierClick = { id ->
                    PreselectedState.setSupplierId(id)
                    navController.navigate(Routes.PURCHASE_ADD)
                },
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.SUPPLIER_ADD) {
            SupplierFormScreen(
                supplierId = null,
                onSaved = { navController.popBackStack() },
                onBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Routes.SUPPLIER_EDIT,
            arguments = listOf(navArgument("supplierId") { type = NavType.LongType })
        ) { entry ->
            val supplierId = entry.arguments?.getLong("supplierId") ?: 0L
            SupplierFormScreen(
                supplierId = supplierId,
                onSaved = { navController.popBackStack() },
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.PURCHASES) {
            PurchasesScreen(
                onAddPurchase = { navController.navigate(Routes.PURCHASE_ADD) },
                onPurchaseClick = { id -> navController.navigate("purchases/$id") },
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.PURCHASE_ADD) {
            PurchaseFormScreen(
                onBarcodeScan = { navController.navigate(Routes.BARCODE.replace("{target}", Routes.PURCHASE_ADD)) },
                onSaved = { navController.popBackStack() },
                onBack = { navController.popBackStack() },
                navController = navController
            )
        }

        composable(
            route = Routes.PURCHASE_DETAIL,
            arguments = listOf(navArgument("purchaseId") { type = NavType.LongType })
        ) { entry ->
            val purchaseId = entry.arguments?.getLong("purchaseId") ?: 0
            PurchaseDetailScreen(
                purchaseId = purchaseId,
                onReturnClick = { navController.navigate("purchases/$purchaseId/return") },
                onBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Routes.PURCHASE_RETURN,
            arguments = listOf(navArgument("purchaseId") { type = NavType.LongType })
        ) { entry ->
            val purchaseId = entry.arguments?.getLong("purchaseId") ?: 0
            PurchaseReturnScreen(
                purchaseId = purchaseId,
                onSaved = { navController.popBackStack() },
                onBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Routes.SALE_RETURN,
            arguments = listOf(navArgument("saleId") { type = NavType.LongType })
        ) { entry ->
            val saleId = entry.arguments?.getLong("saleId") ?: 0
            SaleReturnScreen(
                saleId = saleId,
                onSaved = { navController.popBackStack() },
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.EXPENSES) {
            ExpensesListScreen(
                onAddExpense = { navController.navigate(Routes.EXPENSE_ADD) },
                onBack = { navController.popBackStack() }
            )
        }
        composable(Routes.EXPENSE_ADD) {
            ExpensesScreen(
                onSaved = { navController.popBackStack() },
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.REPORTS) {
            ReportsScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Routes.BARCODE,
            arguments = listOf(navArgument("target") { type = NavType.StringType })
        ) { entry ->
            BarcodeScannerScreen(
                onBarcodeDetected = { barcode ->
                    when (entry.arguments?.getString("target")) {
                        Routes.TARGET_SALES ->
                            navController.previousBackStackEntry
                                ?.savedStateHandle
                                ?.set("barcode", barcode)
                        Routes.TARGET_PRODUCTS ->
                            navController.previousBackStackEntry
                                ?.savedStateHandle
                                ?.set("barcode", barcode)
                        else ->
                            navController.previousBackStackEntry
                                ?.savedStateHandle
                                ?.set("barcode", barcode)
                    }
                    navController.popBackStack()
                },
                onCancel = { navController.popBackStack() }
            )
        }
    }
}
