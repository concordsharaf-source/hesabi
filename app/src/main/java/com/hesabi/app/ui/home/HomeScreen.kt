package com.hesabi.app.ui.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AttachMoney
import androidx.compose.material.icons.rounded.Analytics
import androidx.compose.material.icons.rounded.Inventory2
import androidx.compose.material.icons.rounded.Payments
import androidx.compose.material.icons.rounded.People
import androidx.compose.material.icons.rounded.ShoppingBag
import androidx.compose.material.icons.rounded.TrendingUp
import androidx.compose.material.icons.automirrored.rounded.ReceiptLong
import androidx.compose.material.icons.rounded.ShoppingCart
import androidx.compose.material.icons.rounded.Storefront
import androidx.compose.material.icons.rounded.Warning
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.automirrored.rounded.Logout
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hesabi.app.HesabiApp
import com.hesabi.app.util.formatMoney
import com.hesabi.app.util.formatQuantity
import com.hesabi.app.domain.model.UserRole
import com.hesabi.app.ui.home.HomeViewModelFactory

/**
 * الصفحة الرئيسية — Dashboard.
 */
@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onNavigateToSales: () -> Unit,
    onNavigateToProducts: () -> Unit,
    onNavigateToInventory: () -> Unit,
    onNavigateToInvoices: () -> Unit,
    onNavigateToSuppliers: () -> Unit = {},
    onNavigateToPurchases: () -> Unit = {},
    onNavigateToExpenses: () -> Unit = {},
    onNavigateToReports: () -> Unit = {},
    onNavigateToCustomers: () -> Unit = {},
    onNavigateToUsers: () -> Unit = {},
    onLogout: () -> Unit = {}
) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as HesabiApp
    val viewModel: HomeViewModel = viewModel(factory = HomeViewModelFactory(app))

    val state by viewModel.state.collectAsStateWithLifecycle()
    val storeName = state.store?.name ?: ""

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        storeName.ifEmpty { "حسابي" },
                        modifier = Modifier.fillMaxWidth(),
                        textAlign = TextAlign.Start,
                        style = MaterialTheme.typography.titleMedium
                    )
                },
                actions = {
                    IconButton(onClick = onLogout) {
                        Icon(Icons.AutoMirrored.Rounded.Logout, contentDescription = "تسجيل خروج")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState())
        ) {
            val isAdmin = state.userRole == UserRole.ADMIN

            // بطاقة مبيعات اليوم (تظهر للجميع)
            StatCard(
                icon = Icons.Rounded.AttachMoney,
                title = "مبيعات اليوم",
                value = state.todaySalesTotal.formatMoney(state.currencySymbol),
                tint = MaterialTheme.colorScheme.primary
            )

            Spacer(Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                StatCard(
                    modifier = Modifier.weight(1f),
                    icon = Icons.AutoMirrored.Rounded.ReceiptLong,
                    title = "فواتير اليوم",
                    value = state.todayInvoiceCount.formatQuantity(),
                    tint = MaterialTheme.colorScheme.secondary
                )
                if (isAdmin) {
                    StatCard(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Rounded.Storefront,
                        title = "عدد المنتجات",
                        value = state.productCount.formatQuantity(),
                        tint = MaterialTheme.colorScheme.tertiary
                    )
                }
            }

            if (isAdmin) {
                Spacer(Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    StatCard(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Rounded.Inventory2,
                        title = "قيمة المخزون",
                        value = state.inventoryValue.formatMoney(state.currencySymbol),
                        tint = MaterialTheme.colorScheme.primary
                    )
                    StatCard(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Rounded.Warning,
                        title = "مخزون منخفض",
                        value = "${state.lowStockCount} منتج",
                        tint = MaterialTheme.colorScheme.error,
                        isWarning = state.lowStockCount > 0
                    )
                }

                Spacer(Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    StatCard(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Rounded.ShoppingBag,
                        title = "صافي المشتريات اليوم",
                        value = state.todayNetPurchases.formatMoney(state.currencySymbol),
                        tint = MaterialTheme.colorScheme.secondary
                    )
                    StatCard(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Rounded.Payments,
                        title = "مصروفات اليوم",
                        value = state.todayExpenses.formatMoney(state.currencySymbol),
                        tint = MaterialTheme.colorScheme.tertiary
                    )
                }

                Spacer(Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    StatCard(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Rounded.TrendingUp,
                        title = "صافي الربح اليوم",
                        value = state.todayNetProfit.formatMoney(state.currencySymbol),
                        tint = if (state.todayNetProfit >= 0L)
                            MaterialTheme.colorScheme.primary
                        else
                            MaterialTheme.colorScheme.error,
                        isWarning = state.todayNetProfit < 0L
                    )
                }
            }

            Spacer(Modifier.height(20.dp))

            Text(
                "إجراءات سريعة",
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                QuickAction(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Rounded.ShoppingCart,
                    label = "المبيعات",
                    tint = MaterialTheme.colorScheme.primary,
                    onClick = onNavigateToSales
                )
                if (isAdmin) {
                    QuickAction(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Rounded.Storefront,
                        label = "المنتجات",
                        tint = MaterialTheme.colorScheme.secondary,
                        onClick = onNavigateToProducts
                    )
                    QuickAction(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Rounded.Inventory2,
                        label = "المخزون",
                        tint = MaterialTheme.colorScheme.tertiary,
                        onClick = onNavigateToInventory
                    )
                }
            }
            Spacer(Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                QuickAction(
                    modifier = Modifier.weight(1f),
                    icon = Icons.AutoMirrored.Rounded.ReceiptLong,
                    label = "الفواتير",
                    tint = MaterialTheme.colorScheme.primary,
                    onClick = onNavigateToInvoices
                )
                QuickAction(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Rounded.People,
                    label = "العملاء",
                    tint = MaterialTheme.colorScheme.secondary,
                    onClick = onNavigateToCustomers
                )
            }
            
            if (isAdmin) {
                Spacer(Modifier.height(12.dp))
                Text(
                    "المشتريات والمالية",
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    QuickAction(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Rounded.People,
                        label = "الموردون",
                        tint = MaterialTheme.colorScheme.primary,
                        onClick = onNavigateToSuppliers
                    )
                    QuickAction(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Rounded.ShoppingBag,
                        label = "المشتريات",
                        tint = MaterialTheme.colorScheme.secondary,
                        onClick = onNavigateToPurchases
                    )
                }
                Spacer(Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    QuickAction(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Rounded.Payments,
                        label = "المصروفات",
                        tint = MaterialTheme.colorScheme.tertiary,
                        onClick = onNavigateToExpenses
                    )
                    QuickAction(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Rounded.Analytics,
                        label = "التقارير والأرباح",
                        tint = MaterialTheme.colorScheme.primary,
                        onClick = onNavigateToReports
                    )
                }
                Spacer(Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    QuickAction(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Rounded.Person,
                        label = "إدارة المستخدمين",
                        tint = MaterialTheme.colorScheme.secondary,
                        onClick = onNavigateToUsers
                    )
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun StatCard(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    title: String,
    value: String,
    tint: androidx.compose.ui.graphics.Color,
    isWarning: Boolean = false
) {

    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
            contentColor = MaterialTheme.colorScheme.onSurface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = if (isWarning) MaterialTheme.colorScheme.error else tint,
                modifier = Modifier.padding(bottom = 8.dp)
            )
            Text(
                value,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            Text(
                title,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun QuickAction(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    label: String,
    tint: androidx.compose.ui.graphics.Color,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier,
        onClick = onClick,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.secondaryContainer
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(1.4f),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(icon, contentDescription = null, tint = tint)
            Spacer(Modifier.height(6.dp))
            Text(label, style = MaterialTheme.typography.titleSmall)
        }
    }
}
