package com.hesabi.app.ui.details

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hesabi.app.HesabiApp
import com.hesabi.app.domain.model.MovementType
import com.hesabi.app.domain.model.StockMovement
import com.hesabi.app.ui.common.HesabiTopBar
import com.hesabi.app.util.formatDateTime
import com.hesabi.app.util.formatMoney
import com.hesabi.app.util.formatQuantity

/**
 * شاشة تفاصيل المنتج: المعلومات + حركات المخزون + زر تعديل المخزون.
 */
@Composable
fun ProductDetailScreen(
    productId: Long,
    onEdit: () -> Unit,
    onBack: () -> Unit,
    
) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as HesabiApp
    val viewModel = ProductDetailViewModel(app, productId)

    val product by viewModel.product.collectAsStateWithLifecycle()
    val movements by viewModel.movements.collectAsStateWithLifecycle()
    val adjustResult by viewModel.adjustResult.collectAsStateWithLifecycle()

    var showAdjustDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            HesabiTopBar(
                title = product?.name ?: "تفاصيل المنتج",
                onBackClick = onBack,
                actions = {
                    IconButton(onClick = onEdit) {
                        Icon(Icons.Rounded.Edit, contentDescription = "تعديل")
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
            if (product != null) {
                val p = product!!

                // بطاقة المعلومات
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        InfoRow("اسم المنتج", p.name)
                        p.barcode?.takeIf { it.isNotBlank() }?.let { InfoRow("الباركود", it) }
                        p.internalCode?.takeIf { it.isNotBlank() }?.let { InfoRow("الكود الداخلي", it) }
                        InfoRow("سعر الشراء", p.purchasePrice.formatMoney())
                        InfoRow("سعر البيع", p.salePrice.formatMoney(), highlight = true)
                        InfoRow(
                            "الكمية الحالية",
                            "${p.quantity.formatQuantity()} ${p.unit}",
                            highlight = p.quantity <= 0
                        )
                        InfoRow("الحد الأدنى", "${p.minQuantity.formatQuantity()} ${p.unit}")
                        InfoRow(
                            "حالة المخزون",
                            stockStatusText(p),
                            highlight = p.quantity <= p.minQuantity
                        )
                        InfoRow("تاريخ الإنشاء", p.createdAt.formatDateTime())
                        InfoRow("آخر تعديل", p.updatedAt.formatDateTime())
                    }
                }

                Spacer(Modifier.height(16.dp))

                // زر تعديل المخزون
                TextButton(
                    onClick = { showAdjustDialog = true },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("تعديل المخزون")
                }

                if (adjustResult != null) {
                    Text(
                        adjustResult!!,
                        color = if (adjustResult == "تم تعديل المخزون بنجاح")
                            MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall
                    )
                    Spacer(Modifier.height(8.dp))
                }

                Spacer(Modifier.height(8.dp))

                // حركات المخزون
                Text(
                    "حركات المخزون",
                    style = MaterialTheme.typography.titleSmall,
                    modifier = Modifier.padding(vertical = 4.dp)
                )

                if (movements.isEmpty()) {
                    Text(
                        "لا توجد حركات مخزون",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                } else {
                    movements.forEach { movement ->
                        MovementRow(movement)
                    }
                }
            } else {
                Text("المنتج غير موجود")
            }

            Spacer(Modifier.height(24.dp))
        }
    }

    if (showAdjustDialog && product != null) {
        AdjustStockDialog(
            productName = product!!.name,
            currentQuantity = product!!.quantity,
            unit = product!!.unit,
            onConfirm = { actualQty, reason ->
                viewModel.adjustStock(actualQty, reason)
                showAdjustDialog = false
            },
            onDismiss = { showAdjustDialog = false }
        )
    }
}

@Composable
private fun stockStatusText(p: com.hesabi.app.domain.model.Product): String =
    when {
        p.quantity <= 0 -> "نافد"
        p.quantity <= p.minQuantity -> "منخفض"
        else -> "متوفر"
    }

@Composable
private fun InfoRow(label: String, value: String, highlight: Boolean = false) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(
            value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium,
            color = if (highlight) MaterialTheme.colorScheme.error
            else MaterialTheme.colorScheme.onSurface
        )
    }
}

@Composable
private fun MovementRow(movement: StockMovement) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 3.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "${movement.type.label}: ${movement.quantity.formatQuantity()}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (movement.quantity < 0) MaterialTheme.colorScheme.error
                    else MaterialTheme.colorScheme.primary
                )
                Text(
                    "${movement.previousQuantity.formatQuantity()} → ${movement.newQuantity.formatQuantity()}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Text(
                movement.date.formatDateTime(),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun AdjustStockDialog(
    productName: String,
    currentQuantity: Double,
    unit: String,
    onConfirm: (Double, String) -> Unit,
    onDismiss: () -> Unit
) {
    var actualQuantity by remember { mutableStateOf(currentQuantity.toString()) }
    var reason by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("تعديل المخزون") },
        text = {
            Column {
                Text(
                    "المنتج: $productName\nالكمية الحالية: ${currentQuantity.formatQuantity()} $unit",
                    style = MaterialTheme.typography.bodyMedium
                )
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = actualQuantity,
                    onValueChange = { actualQuantity = it },
                    label = { Text("الكمية الفعلية") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = reason,
                    onValueChange = { reason = it },
                    label = { Text("سبب التعديل (اختياري)") },
                    placeholder = { Text("مثال: جرد، تلف، هدية...") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                val actual = actualQuantity.toDoubleOrNull()
                if (actual != null) {
                    val adjustment = actual - currentQuantity
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "الفرق: ${adjustment.formatQuantity()} (سيصبح المخزون: ${actual.formatQuantity()} $unit)",
                        style = MaterialTheme.typography.bodySmall,
                        color = if (adjustment < 0) MaterialTheme.colorScheme.error
                        else MaterialTheme.colorScheme.primary
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val actual = actualQuantity.toDoubleOrNull() ?: currentQuantity
                    onConfirm(actual, reason)
                }
            ) {
                Text("تسجيل")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("إلغاء") }
        }
    )
}
