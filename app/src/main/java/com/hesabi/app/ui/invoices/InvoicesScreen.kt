package com.hesabi.app.ui.invoices

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hesabi.app.HesabiApp
import com.hesabi.app.domain.model.PaymentMethod
import com.hesabi.app.domain.model.Sale
import com.hesabi.app.domain.model.SaleItem
import com.hesabi.app.ui.common.HesabiTopBar
import com.hesabi.app.util.formatDateTime
import com.hesabi.app.util.formatMoney
import com.hesabi.app.util.formatQuantity
import com.hesabi.app.ui.invoices.InvoicesViewModelFactory

/**
 * شاشة فواتير البيع — قائمة الفواتير مع عرض تفاصيل كل فاتورة.
 */
@Composable
fun InvoicesScreen(
    onBack: () -> Unit,
    
) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as HesabiApp
    val viewModel: InvoicesViewModel = viewModel(factory = InvoicesViewModelFactory(app))

    val invoices by viewModel.invoices.collectAsStateWithLifecycle()
    val sale by viewModel.sale.collectAsStateWithLifecycle()
    val items by viewModel.items.collectAsStateWithLifecycle()

    Scaffold(
        topBar = { HesabiTopBar(title = "فواتير البيع", onBackClick = onBack) }
    ) { padding ->
        if (invoices.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    "لا توجد فواتير بعد",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(invoices, key = { it.id }) { saleItem ->
                    InvoiceCard(
                        sale = saleItem,
                        onClick = { viewModel.loadInvoiceDetails(saleItem.id) }
                    )
                }
                item { Spacer(Modifier.height(24.dp)) }
            }
        }
    }

    // تفاصيل الفاتورة
    if (sale != null) {
        InvoiceDetailDialog(
            sale = sale!!,
            items = items,
            onDismiss = {
                viewModel.clearDetails()
            }
        )
    }
}

@Composable
private fun InvoiceCard(sale: Sale, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    sale.invoiceNumber,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    sale.date.formatDateTime(),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    sale.paymentMethod.label,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Text(
                sale.total.formatMoney(),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
        }
    }
}

@Composable
private fun InvoiceDetailDialog(
    sale: Sale,
    items: List<SaleItem>,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(sale.invoiceNumber) },
        text = {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("التاريخ:", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(sale.date.formatDateTime())
                }
                Spacer(Modifier.height(8.dp))
                HorizontalDivider()
                Spacer(Modifier.height(8.dp))

                if (items.isEmpty()) {
                    Text("لا توجد عناصر", style = MaterialTheme.typography.bodySmall)
                } else {
                    items.forEach { item ->
                        ItemDetailRow(item)
                        Spacer(Modifier.height(4.dp))
                    }
                }

                HorizontalDivider()
                Spacer(Modifier.height(8.dp))

                detailRow("الإجمالي قبل الخصم", sale.subtotal.formatMoney())
                detailRow("الخصم", sale.discount.formatMoney())
                detailRow(
                    "الإجمالي النهائي",
                    sale.total.formatMoney(),
                    bold = true
                )
                detailRow("المبلغ المدفوع", sale.paidAmount.formatMoney())
                detailRow("المتبقي", sale.remaining.formatMoney())
                detailRow("طريقة الدفع", sale.paymentMethod.label)
            }
        },
        confirmButton = {
            androidx.compose.material3.TextButton(onClick = onDismiss) {
                Text("إغلاق")
            }
        }
    )
}

@Composable
private fun ItemDetailRow(item: SaleItem) {

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(item.productName, style = MaterialTheme.typography.bodyMedium)
        Text(
            "${item.quantity.formatQuantity()} ${item.unit} × ${item.unitPrice.formatMoney()} = ${item.itemTotal.formatMoney()}",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun detailRow(label: String, value: String, bold: Boolean = false) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal)
    }
}
