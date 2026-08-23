package com.hesabi.app.ui.suppliers

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AccountBalanceWallet
import androidx.compose.material.icons.rounded.Payment
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.hesabi.app.HesabiApp
import com.hesabi.app.domain.model.Supplier
import com.hesabi.app.domain.model.SupplierTransaction
import com.hesabi.app.domain.model.SupplierTransactionType
import com.hesabi.app.domain.model.CashMovement
import com.hesabi.app.domain.model.CashMovementType
import com.hesabi.app.ui.common.HesabiTopBar
import com.hesabi.app.util.formatMoney
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SupplierDetailScreen(
    supplierId: Long,
    onBack: () -> Unit
) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as HesabiApp
    val supplierDao = app.purchaseRepository.supplierDao
    val transactionDao = app.supplierTransactionDao
    val cashMovementDao = app.cashMovementDao
    val scope = rememberCoroutineScope()
    
    var supplier by remember { mutableStateOf<Supplier?>(null) }
    val transactions by transactionDao.observeBySupplier(supplierId).collectAsStateWithLifecycle(initialValue = emptyList())
    val totalDebt by transactionDao.observeSupplierDebt(supplierId).collectAsStateWithLifecycle(initialValue = 0L)
    
    var showPaymentDialog by remember { mutableStateOf(false) }
    var currencySymbol by remember { mutableStateOf("") }

    LaunchedEffect(supplierId) {
        supplier = supplierDao.getById(supplierId)
        currencySymbol = app.settingsUseCase.getStore()?.currencySymbol ?: ""
    }

    Scaffold(
        topBar = { HesabiTopBar(title = supplier?.name ?: "تفاصيل المورد", onBackClick = onBack) },
        floatingActionButton = {
            if (totalDebt > 0) {
                ExtendedFloatingActionButton(
                    onClick = { showPaymentDialog = true },
                    icon = { Icon(Icons.Rounded.Payment, contentDescription = null) },
                    text = { Text("تسديد دفعة") }
                )
            }
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            // بطاقة الرصيد
            Card(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (totalDebt > 0) MaterialTheme.colorScheme.errorContainer 
                                    else MaterialTheme.colorScheme.primaryContainer
                )
            ) {
                Column(modifier = Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("إجمالي الدين للمورد", style = MaterialTheme.typography.titleSmall)
                    Text(
                        totalDebt.formatMoney(currencySymbol),
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = if (totalDebt > 0) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary
                    )
                }
            }

            Text(
                "سجل العمليات",
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(bottom = 80.dp)
            ) {
                items(transactions) { tx ->
                    TransactionItemRow(tx = tx, currencySymbol = currencySymbol)
                }
            }
        }
    }

    if (showPaymentDialog) {
        PaymentDialog(
            maxAmount = totalDebt,
            currencySymbol = currencySymbol,
            onDismiss = { showPaymentDialog = false },
            onConfirm = { amount, note ->
                scope.launch {
                    val now = System.currentTimeMillis()
                    // 1. تسجيل حركة دفع في سجل المورد (تنقص الدين)
                    transactionDao.insert(
                        SupplierTransaction(
                            supplierId = supplierId,
                            type = SupplierTransactionType.PAYMENT,
                            amount = amount,
                            paid = amount,
                            remaining = -amount,
                            date = now,
                            notes = note.ifBlank { "تسديد دفعة للمورد" }
                        )
                    )
                    // 2. تسجيل حركة خروج من الصندوق
                    cashMovementDao.insert(
                        CashMovement(
                            amount = -amount,
                            type = CashMovementType.EXPENSE,
                            description = "تسديد مورد: ${supplier?.name}",
                            date = now,
                            note = note
                        )
                    )
                    showPaymentDialog = false
                }
            }
        )
    }
}

@Composable
private fun TransactionItemRow(tx: SupplierTransaction, currencySymbol: String) {
    Card(modifier = Modifier.fillMaxWidth(), elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            val isPayment = tx.type == SupplierTransactionType.PAYMENT
            val icon = if (isPayment) Icons.Rounded.Payment else Icons.Rounded.AccountBalanceWallet
            val color = if (isPayment) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
            
            Box(
                modifier = Modifier.size(40.dp),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = color)
            }
            
            Spacer(Modifier.width(12.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    if (isPayment) "تسديد دفعة" else "فاتورة شراء آجل",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    java.text.SimpleDateFormat("yyyy/MM/dd HH:mm", java.util.Locale.getDefault()).format(tx.date),
                    style = MaterialTheme.typography.bodySmall
                )
                if (!tx.notes.isNullOrBlank()) {
                    Text(tx.notes, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    tx.amount.formatMoney(currencySymbol),
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = color
                )
                if (!isPayment) {
                    Text(
                        "المتبقي: ${tx.remaining.formatMoney(currencySymbol)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }
        }
    }
}

@Composable
private fun PaymentDialog(
    maxAmount: Long,
    currencySymbol: String,
    onDismiss: () -> Unit,
    onConfirm: (Long, String) -> Unit
) {
    var amountStr by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("تسديد دفعة للمورد") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("إجمالي الدين: ${maxAmount.formatMoney(currencySymbol)}", style = MaterialTheme.typography.bodySmall)
                OutlinedTextField(
                    value = amountStr,
                    onValueChange = { amountStr = it },
                    label = { Text("المبلغ المدفوع *") },
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true
                )
                OutlinedTextField(
                    value = note,
                    onValueChange = { note = it },
                    label = { Text("ملاحظة") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { 
                    val amount = amountStr.toLongOrNull() ?: 0L
                    if (amount > 0) onConfirm(amount, note)
                },
                enabled = amountStr.toLongOrNull()?.let { it > 0 } ?: false
            ) {
                Text("تأكيد التسديد")
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("إلغاء") } }
    )
}
