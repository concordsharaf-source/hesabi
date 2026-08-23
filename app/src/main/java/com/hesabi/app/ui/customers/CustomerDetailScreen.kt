package com.hesabi.app.ui.customers

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AccountBalanceWallet
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Payment
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.hesabi.app.HesabiApp
import com.hesabi.app.domain.model.Customer
import com.hesabi.app.domain.model.CustomerTransaction
import com.hesabi.app.domain.model.CustomerTransactionType
import com.hesabi.app.domain.model.CashMovement
import com.hesabi.app.domain.model.CashMovementType
import com.hesabi.app.ui.common.HesabiTopBar
import com.hesabi.app.util.formatMoney
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomerDetailScreen(
    customerId: Long,
    onBack: () -> Unit
) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as HesabiApp
    val customerDao = app.customerDao
    val transactionDao = app.customerTransactionDao
    val cashMovementDao = app.cashMovementDao
    val scope = rememberCoroutineScope()
    
    var customer by remember { mutableStateOf<Customer?>(null) }
    val transactions by transactionDao.observeByCustomer(customerId).collectAsStateWithLifecycle(initialValue = emptyList())
    val totalDebt by transactionDao.observeCustomerDebt(customerId).collectAsStateWithLifecycle(initialValue = 0L)
    
    var showPaymentDialog by remember { mutableStateOf(false) }
    var currencySymbol by remember { mutableStateOf("") }

    LaunchedEffect(customerId) {
        customer = customerDao.getById(customerId)
        currencySymbol = app.settingsUseCase.getStore()?.currencySymbol ?: ""
    }

    Scaffold(
        topBar = { HesabiTopBar(title = customer?.name ?: "تفاصيل العميل", onBackClick = onBack) },
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
                    Text("إجمالي الدين المتبقي", style = MaterialTheme.typography.titleSmall)
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
                    app.paymentUseCase.recordCustomerPayment(customerId, amount, note)
                    showPaymentDialog = false
                    customer = customerDao.getById(customerId)
                }
            }
        )
    }
}

@Composable
private fun TransactionItemRow(tx: CustomerTransaction, currencySymbol: String) {
    Card(modifier = Modifier.fillMaxWidth(), elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            val isPayment = tx.type == CustomerTransactionType.PAYMENT
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
                    if (isPayment) "تسديد دفعة" else "فاتورة بيع آجل",
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
        title = { Text("تسديد مبلغ من الدين") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("الدين الحالي: ${maxAmount.formatMoney(currencySymbol)}", style = MaterialTheme.typography.bodySmall)
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
