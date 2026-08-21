package com.hesabi.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.Composable
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
        setContent {
            HesabiTheme {
                HesabiNavHost()
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

    const val TARGET_PRODUCTS = "products"
    const val TARGET_SALES = "sales"
    const val TARGET_PRODUCT_ADD = "product_add"
}

@Composable
private fun HesabiNavHost() {
    val navController = rememberNavController()
    NavHost(
        navController = navController,
        startDestination = Routes.ONBOARDING,
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
                onNavigateToInventory = { navController.navigate(Routes.INVENTORY) }
            )
        }

        composable(Routes.SALES) {
            SalesScreen(
                onBarcodeScan = {
                    navController.navigate("${Routes.BARCODE}/${Routes.TARGET_SALES}")
                },
                onBack = { navController.popBackStack() }
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
                onBack = { navController.popBackStack() }
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
                onBack = { navController.popBackStack() }
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
