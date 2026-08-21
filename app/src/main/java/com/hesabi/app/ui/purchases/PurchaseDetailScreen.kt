package com.hesabi.app.ui.purchases

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hesabi.app.HesabiApp
import com.hesabi.app.ui.common.HesabiTopBar
import com.hesabi.app.util.formatDateTime
import com.hesabi.app.util.formatMoney
import com.hesabi.app.util.formatQuantity

/**
 * شاشة تفاصيل فاتورة الشراء — البنود والمورد والمبالغ + زر مرتجع.
 */
@Composable
fun PurchaseDetailScreen(
    purchaseId: Long,
    onReturnClick: () -> Unit,
    onBack: () -> Unit
) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as HesabiApp
    val viewModel: PurchaseDetailViewModel = viewModel(
        factory = PurchaseDetailViewModelFactory(app, purchaseId)
    )
    val state by viewModel.state.collectAsStateWithLifecycle()

    Scaffold(
        topBar = { HesabiTopBar(title = "تفاصيل فاتورة الشراء", onBackClick = onBack) }
    ) { padding ->
        if (state.isLoading) {
            Column(
                modifier = Modifier.fillMaxSize().padding(padding),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                CircularProgressIndicator()
            }
        } else if (state.purchase == null) {
            Column(
                modifier = Modifier.fillMaxSize().padding(padding),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text("الفاتورة غير موجودة", color = MaterialTheme.colorScheme.error)
            }
        } else {
            val purchase = state.purchase!!
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                Spacer(Modifier.height(12.dp))
                // ملخص الفاتورة
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.secondaryContainer
                    )
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("رقم الفاتورة", fontWeight = FontWeight.Medium)
                            Text(purchase.invoiceNumber, fontWeight = FontWeight.Bold)
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("التاريخ", fontWeight = FontWeight.Medium)
                            Text(purchase.date.formatDateTime())
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("المورد", fontWeight = FontWeight.Medium)
                            Text(if (state.supplierName.isBlank()) "— بدون مورد —" else state.supplierName)
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("الإجمالي", fontWeight = FontWeight.Medium)
                            Text(
                                purchase.total.formatMoney(state.currencySymbol),
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                        if (state.refundedAmount > 0L) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("مرتجع سابق", fontWeight = FontWeight.Medium)
                                Text(
                                    state.refundedAmount.formatMoney(state.currencySymbol),
                                    color = MaterialTheme.colorScheme.error
                                )
                            }
                        }
                        if (purchase.note?.isNotBlank() == true) {
                            Spacer(Modifier.height(6.dp))
                            Text(
                                "ملاحظة: ${purchase.note}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
                Text("البنود", style = MaterialTheme.typography.titleSmall)
                Spacer(Modifier.height(8.dp))
                state.items.forEach { item ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(item.productName, fontWeight = FontWeight.Medium)
                                Text(
                                    "${item.quantity.formatQuantity()} ${item.unit} × ${item.unitPrice.formatMoney(state.currencySymbol)}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Text(
                                item.itemTotal.formatMoney(state.currencySymbol),
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    Spacer(Modifier.height(6.dp))
                }
                Spacer(Modifier.height(16.dp))
                Button(
                    onClick = onReturnClick,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("مرتجع شراء")
                }
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}
