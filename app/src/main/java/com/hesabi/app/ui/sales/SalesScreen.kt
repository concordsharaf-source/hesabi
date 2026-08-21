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
import androidx.compose.ui.Alignment
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
import com.hesabi.app.ui.common.HesabiTopBar
import com.hesabi.app.util.formatMoney
import com.hesabi.app.util.formatQuantity

/**
 * شاشة المبيعات — نقطة بيع سريعة للكاشير:
 * بحث + مسح باركود + سلة + خصم + إتمام البيع.
 */
@Composable
fun SalesScreen(
    onBarcodeScan: () -> Unit,
    onBack: () -> Unit,
    
) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as HesabiApp
    val viewModel = SalesViewModel(app)

    val state by viewModel.state.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    // تنبيه إتمام البيع
    LaunchedEffect(state.checkoutSuccess) {
        if (state.checkoutSuccess) {
            snackbarHostState.showSnackbar("تم البيع بنجاح — الفاتورة ${state.lastInvoice ?: ""}")
            viewModel.clearCheckoutResult()
        }
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
                                onClick = {
                                    viewModel.addToCart(product)
                                    viewModel.clearSearch()
                                }
                            )
                        }
                    }
                }
                Spacer(Modifier.height(8.dp))
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
                    "الإجمالي: ${state.finalTotal.formatMoney()}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(Modifier.height(8.dp))

            // طرق الدفع
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                PaymentChip(
                    label = "نقدي",
                    selected = state.paymentMethod == PaymentMethod.CASH,
                    onClick = { viewModel.updatePaymentMethod(PaymentMethod.CASH) }
                )
                PaymentChip(
                    label = "تحويل",
                    selected = state.paymentMethod == PaymentMethod.TRANSFER,
                    onClick = { viewModel.updatePaymentMethod(PaymentMethod.TRANSFER) }
                )
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
                    Text("إتمام البيع", style = MaterialTheme.typography.titleMedium)
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
                    "${item.unitPrice.formatMoney()} × ${item.quantity.formatQuantity()} = ${item.itemTotal().formatMoney()}",
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
