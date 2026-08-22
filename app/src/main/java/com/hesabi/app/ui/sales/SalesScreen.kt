package com.hesabi.app.ui.sales

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.QrCodeScanner
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.RemoveCircle
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.material3.TextButton
import kotlinx.coroutines.launch
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hesabi.app.HesabiApp
import com.hesabi.app.domain.CartItem
import com.hesabi.app.domain.model.PaymentMethod
import com.hesabi.app.domain.model.Product
import com.hesabi.app.domain.model.SalePaymentType
import com.hesabi.app.domain.model.Customer
import com.hesabi.app.ui.common.HesabiTopBar
import com.hesabi.app.util.formatMoney
import com.hesabi.app.util.formatQuantity
import com.hesabi.app.ui.sales.SalesViewModelFactory

/**
 * شاشة المبيعات — نقطة بيع سريعة للكاشير:
 * بحث + مسح باركود + سلة + خصم + إتمام البيع.
 */
@Composable
fun SalesScreen(
    onBarcodeScan: () -> Unit,
    onBack: () -> Unit,
    navController: androidx.navigation.NavHostController
) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as HesabiApp
    val viewModel: SalesViewModel = viewModel(factory = SalesViewModelFactory(app))

    val state by viewModel.state.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    var showCustomerPicker by remember { mutableStateOf(false) }
    var customers by remember { mutableStateOf<List<com.hesabi.app.domain.model.Customer>>(emptyList()) }

    // تحميل العملاء عند أول تركيب
    LaunchedEffect(Unit) {
        scope.launch {
            try {
                customers = app.customerDao.getAll()
            } catch (e: Exception) {
                // Handle error
            }
        }
    }

    // مراقبة نتيجة مسح الباركود من savedStateHandle
    val barcodeResult = navController.currentBackStackEntry
        ?.savedStateHandle
        ?.get<String>("barcode")
    LaunchedEffect(barcodeResult) {
        barcodeResult?.let {
            viewModel.onBarcodeScanned(it)
            navController.currentBackStackEntry?.savedStateHandle?.remove<String>("barcode")
        }
    }

    // تنبيه إتمام البيع
    LaunchedEffect(state.checkoutSuccess) {
        if (state.checkoutSuccess) {
            snackbarHostState.showSnackbar("تم البيع بنجاح — الفاتورة ${state.lastInvoice ?: ""}")
            viewModel.clearCheckoutResult()
        }
    }

    if (showCustomerPicker) {
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { showCustomerPicker = false },
            title = { Text("اختر عميلًا", modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center) },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(320.dp)
                        .verticalScroll(rememberScrollState())
                ) {
                    if (customers.isEmpty()) {
                        Text("لا يوجد عملاء — أضف عميلًا أولًا من شاشة العملاء",
                            modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)
                    }
                    customers.forEach { customer ->
                        TextButton(
                            onClick = { 
                                viewModel.setCustomer(customer.id, customer.name)
                                showCustomerPicker = false 
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                customer.name,
                                style = MaterialTheme.typography.bodyLarge,
                                modifier = Modifier.fillMaxWidth(),
                                textAlign = TextAlign.End
                            )
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showCustomerPicker = false }) { Text("إلغاء") }
            }
        )
    }

    Scaffold(
        topBar = {
            HesabiTopBar(title = "المبيعات", onBackClick = onBack)
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
        ) {
            // البحث + الباركود
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = state.searchQuery,
                    onValueChange = viewModel::search,
                    placeholder = { Text("ابحث عن منتج...") },
                    leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null) },
                    trailingIcon = {
                        if (state.searchQuery.isNotBlank()) {
                            IconButton(onClick = viewModel::clearSearch) {
                                Icon(Icons.Rounded.Delete, contentDescription = "مسح")
                            }
                        }
                    },
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp)
                )
                Spacer(Modifier.width(8.dp))
                IconButton(
                    onClick = onBarcodeScan,
                    modifier = Modifier.size(56.dp)
                ) {
                    Icon(
                        Icons.Rounded.QrCodeScanner,
                        contentDescription = "مسح باركود",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(32.dp)
                    )
                }
            }

            // نتائج البحث
            if (state.searchQuery.length >= 2 && state.searchResults.isNotEmpty()) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
                ) {
                    Column {
                        state.searchResults.take(8).forEach { product ->
                            ProductSearchRow(
                                product = product,
                                onClick = { viewModel.selectProduct(product) }
                            )
                        }
                    }
                }
                Spacer(Modifier.height(8.dp))
            }

            // قسم التحكم في الكمية (مستقر)
            state.selectedProduct?.let { product ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.secondaryContainer
                    )
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                product.name,
                                modifier = Modifier.weight(1f),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            IconButton(onClick = { viewModel.selectProduct(null) }) {
                                Icon(Icons.Rounded.Delete, contentDescription = "إلغاء", 
                                    tint = MaterialTheme.colorScheme.error)
                            }
                        }
                        Spacer(Modifier.height(8.dp))
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            OutlinedTextField(
                                value = state.selectedQuantity.toString(),
                                onValueChange = { 
                                    val qty = it.toDoubleOrNull() ?: 1.0
                                    viewModel.updateSelectedQuantity(qty)
                                },
                                label = { Text("الكمية") },
                                modifier = Modifier.weight(1f),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                            )
                            Button(
                                onClick = { viewModel.addSelectedToCart() },
                                modifier = Modifier.height(56.dp)
                            ) {
                                Text("إضافة للسلة")
                            }
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
            }

            // السلة
            Text(
                "السلة (${state.cart.size})",
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(Modifier.height(8.dp))

            if (state.cart.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(100.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "السلة فارغة — ابحث عن منتج أو امسح الباركود",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                }
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    state.cart.forEach { item ->
                        CartItemRow(
                            item = item,
                            currencySymbol = state.currencySymbol,
                            onIncrease = { viewModel.increaseQuantity(item.product.id) },
                            onDecrease = { viewModel.decreaseQuantity(item.product.id) },
                            onRemove = { viewModel.removeFromCart(item.product.id) }
                        )
                    }
                }
            }

            Spacer(Modifier.height(8.dp))

            // رسالة الخطأ
            if (state.errorMessage != null) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer
                    )
                ) {
                    Text(
                        state.errorMessage!!,
                        modifier = Modifier.padding(12.dp),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onErrorContainer
                    )
                }
                Spacer(Modifier.height(8.dp))
            }

            // الخصم
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("الخصم:", style = MaterialTheme.typography.bodyMedium)
                OutlinedTextField(
                    value = state.discountInput,
                    onValueChange = viewModel::updateDiscount,
                    placeholder = { Text("0.00") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    modifier = Modifier.width(130.dp)
                )
                Text(
                    "الإجمالي: ${state.finalTotal.formatMoney(state.currencySymbol)}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(Modifier.height(8.dp))

            // نوع البيع (نقدي / آجل)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = { viewModel.updatePaymentType(SalePaymentType.CASH) },
                    modifier = Modifier.weight(1f),
                    colors = if (state.paymentType == SalePaymentType.CASH)
                        androidx.compose.material3.ButtonDefaults.outlinedButtonColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                    else androidx.compose.material3.ButtonDefaults.outlinedButtonColors()
                ) {
                    Text("نقدي")
                }
                OutlinedButton(
                    onClick = { viewModel.updatePaymentType(SalePaymentType.CREDIT) },
                    modifier = Modifier.weight(1f),
                    colors = if (state.paymentType == SalePaymentType.CREDIT)
                        androidx.compose.material3.ButtonDefaults.outlinedButtonColors(containerColor = MaterialTheme.colorScheme.errorContainer)
                    else androidx.compose.material3.ButtonDefaults.outlinedButtonColors()
                ) {
                    Text("آجل (دين)")
                }
            }

            if (state.paymentType == SalePaymentType.CREDIT) {
                Spacer(Modifier.height(8.dp))
                OutlinedButton(
                    onClick = { showCustomerPicker = true },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        if (state.customerName == null) "اختر العميل *" else "العميل: ${state.customerName}",
                        modifier = Modifier.fillMaxWidth(),
                        textAlign = TextAlign.Center
                    )
                }
                
                if (state.remainingAmount > 0) {
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "دين: ${state.remainingAmount.formatMoney(state.currencySymbol)}",
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.fillMaxWidth(),
                        textAlign = TextAlign.Center
                    )
                }
            }

            Spacer(Modifier.height(8.dp))

            // زر إتمام البيع
            Button(
                onClick = { viewModel.completeSale() },
                enabled = state.cart.isNotEmpty() && !state.isCheckingOut,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
            ) {
                if (state.isCheckingOut) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text("إتمام البيع (${state.finalTotal.formatMoney(state.currencySymbol)})", style = MaterialTheme.typography.titleMedium)
                }
            }

            Spacer(Modifier.height(12.dp))
        }
    }

}

@Composable
private fun ProductSearchRow(product: Product, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(product.name, style = MaterialTheme.typography.bodyMedium)
            Text(
                "${product.salePrice.formatMoney()} — المخزون: ${product.quantity.formatQuantity()} ${product.unit}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Icon(Icons.Rounded.Add, contentDescription = "إضافة", tint = MaterialTheme.colorScheme.primary)
    }
}

@Composable
private fun CartItemRow(
    item: CartItem,
    currencySymbol: String,
    onIncrease: () -> Unit,
    onDecrease: () -> Unit,
    onRemove: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(item.product.name, style = MaterialTheme.typography.bodyMedium, maxLines = 1)
                    Text(
                        "${item.unitPrice.formatMoney(currencySymbol)} × ${item.quantity.formatQuantity()} = ${item.itemTotal().formatMoney(currencySymbol)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onDecrease, modifier = Modifier.size(36.dp)) {
                    Icon(Icons.Rounded.RemoveCircle, contentDescription = "إنقاص", modifier = Modifier.size(20.dp))
                }
                Text(
                    item.quantity.formatQuantity(),
                    style = MaterialTheme.typography.titleSmall,
                    modifier = Modifier.padding(horizontal = 6.dp)
                )
                IconButton(onClick = onIncrease, modifier = Modifier.size(36.dp)) {
                    Icon(Icons.Rounded.Add, contentDescription = "زيادة", modifier = Modifier.size(20.dp))
                }
                IconButton(onClick = onRemove, modifier = Modifier.size(36.dp)) {
                    Icon(
                        Icons.Rounded.Delete,
                        contentDescription = "حذف",
                        tint = MaterialTheme.colorScheme.error,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun PaymentChip(label: String, selected: Boolean, onClick: () -> Unit) {
    if (selected) {
        Button(onClick = onClick, modifier = Modifier.fillMaxWidth()) {
            Text(label)
        }
    } else {
        OutlinedButton(onClick = onClick, modifier = Modifier.fillMaxWidth()) {
            Text(label)
        }
    }
}
