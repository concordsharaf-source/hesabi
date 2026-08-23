package com.hesabi.app.ui.purchases

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.QrCodeScanner
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.livedata.observeAsState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hesabi.app.HesabiApp
import com.hesabi.app.PreselectedState
import com.hesabi.app.domain.model.Product
import com.hesabi.app.domain.model.Supplier
import com.hesabi.app.domain.model.PurchasePaymentType
import com.hesabi.app.ui.common.HesabiTopBar
import com.hesabi.app.util.formatMoney
import kotlinx.coroutines.launch

/**
 * شاشة إنشاء فاتورة شراء — بنود (منتج + كمية + سعر شراء) + مورد اختياري + ملاحظة.
 */
@Composable
fun PurchaseFormScreen(
    onBarcodeScan: () -> Unit,
    onSaved: () -> Unit,
    onBack: () -> Unit,
    navController: androidx.navigation.NavHostController
) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as HesabiApp
    val viewModel: PurchaseFormViewModel = viewModel(factory = PurchaseFormViewModelFactory(app))
    val state by viewModel.state.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    var products by remember { mutableStateOf<List<Product>>(emptyList()) }
    var suppliers by remember { mutableStateOf<List<Supplier>>(emptyList()) }

    // تحميل المنتجات والموردين عند أول تركيب (بدون تجميد الواجهة)
    LaunchedEffect(Unit) {
        scope.launch {
            products = viewModel.productRepository.getAll()
            suppliers = viewModel.purchaseRepository.getAllSuppliers()
        }
    }

    // المورد الافتراضي القادم من شاشة الموردين
    LaunchedEffect(Unit) {
        val id = PreselectedState.consumeSupplierId()
        if (id != null) {
            val supplier = app.purchaseRepository.getSupplier(id)
            if (supplier != null) viewModel.setSupplier(supplier.id, supplier.name)
        }
    }

    LaunchedEffect(state.errorMessage) {
        state.errorMessage?.let { snackbarHostState.showSnackbar(it) }
    }
    LaunchedEffect(state.isSaved) {
        if (state.isSaved) onSaved()
    }

    // مراقبة نتيجة مسح الباركود
    val barcodeResult = navController.currentBackStackEntry
        ?.savedStateHandle
        ?.getLiveData<String>("barcode")
        ?.observeAsState()

    LaunchedEffect(barcodeResult?.value) {
        val code = barcodeResult?.value
        if (!code.isNullOrBlank()) {
            // البحث عن المنتج وإضافته تلقائياً
            val found = products.find { p -> p.barcode == code }
            if (found != null) {
                viewModel.addItem(
                    DraftPurchaseItem(
                        productId = found.id,
                        productName = found.name,
                        barcode = found.barcode,
                        quantity = 1.0,
                        unit = found.unit,
                        unitPrice = found.purchasePrice
                    )
                )
            }
            navController.currentBackStackEntry?.savedStateHandle?.remove<String>("barcode")
        }
    }

    // إدارة النوافذ المنبثقة بشكل حصري لمنع التكرار
    var activeDialog by remember { mutableStateOf<PurchaseDialog?>(null) }
    
    when (activeDialog) {
        PurchaseDialog.PRODUCT_PICKER -> {
            ProductPickerDialog(
                products = products,
                onSelect = { product ->
                    viewModel.addItem(
                        DraftPurchaseItem(
                            productId = product.id,
                            productName = product.name,
                            barcode = if (product.barcode.isNullOrBlank()) null else product.barcode,
                            quantity = 0.0,
                            unit = product.unit,
                            unitPrice = product.purchasePrice
                        )
                    )
                    activeDialog = null
                },
                onBarcodeScan = {
                    activeDialog = null
                    onBarcodeScan()
                },
                onDismiss = { activeDialog = null }
            )
        }
        PurchaseDialog.SUPPLIER_PICKER -> {
            SupplierPickerDialog(
                suppliers = suppliers,
                onSelect = { viewModel.setSupplier(it.id, it.name); activeDialog = null },
                onDismiss = { activeDialog = null }
            )
        }
        PurchaseDialog.PAYMENT_TYPE_PICKER -> {
            androidx.compose.material3.AlertDialog(
                onDismissRequest = { activeDialog = null },
                title = { Text("مصدر المبلغ", modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center) },
                text = {
                    Column {
                        PurchasePaymentType.entries.forEach { type ->
                            TextButton(
                                onClick = { 
                                    viewModel.updatePaymentType(type)
                                    activeDialog = null 
                                },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                val label = when(type) {
                                    PurchasePaymentType.CASH_BOX -> "من الصندوق"
                                    PurchasePaymentType.CASH_OUTSIDE -> "خارج الصندوق (مال شخصي)"
                                    PurchasePaymentType.DEBT -> "آجل (دين للمورد)"
                                }
                                Text(label, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.End)
                            }
                        }
                    }
                },
                confirmButton = {
                    TextButton(onClick = { activeDialog = null }) { Text("إلغاء") }
                }
            )
        }
        null -> {}
    }

    Scaffold(
        topBar = { HesabiTopBar(title = "فاتورة شراء جديدة", onBackClick = onBack) },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Spacer(Modifier.height(12.dp))
            // اختيار المورد
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = { onBarcodeScan() },
                    modifier = Modifier.weight(0.3f)
                ) {
                    Icon(Icons.Rounded.QrCodeScanner, contentDescription = "مسح باركود")
                }
                OutlinedButton(
                    onClick = { activeDialog = PurchaseDialog.SUPPLIER_PICKER },
                    modifier = Modifier.weight(0.7f)
                ) {
                    Text(
                        if (state.supplierName.isBlank()) "المورد (اختياري)"
                        else "المورد: ${state.supplierName}",
                        modifier = Modifier.fillMaxWidth(),
                        textAlign = TextAlign.Center
                    )
                }
            }
            Spacer(Modifier.height(12.dp))

            // اختيار نوع الدفع
            OutlinedButton(
                onClick = { activeDialog = PurchaseDialog.PAYMENT_TYPE_PICKER },
                modifier = Modifier.fillMaxWidth()
            ) {
                val paymentLabel = when(state.paymentType) {
                    PurchasePaymentType.CASH_BOX -> "من الصندوق"
                    PurchasePaymentType.CASH_OUTSIDE -> "خارج الصندوق"
                    PurchasePaymentType.DEBT -> "آجل (دين)"
                }
                Text(
                    "مصدر المبلغ: $paymentLabel",
                    modifier = Modifier.fillMaxWidth(),
                    textAlign = TextAlign.Center
                )
            }
            Spacer(Modifier.height(12.dp))
            // قائمة البنود
            Text(
                "البنود",
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(8.dp))
            state.items.forEachIndexed { index, item ->
                PurchaseItemRow(
                    item = item,
                    currencySymbol = state.currencySymbol,
                    onUpdate = { viewModel.updateItem(index, it) },
                    onRemove = { viewModel.removeItem(index) }
                )
                Spacer(Modifier.height(8.dp))
            }
            OutlinedButton(
                onClick = { activeDialog = PurchaseDialog.PRODUCT_PICKER },
                modifier = Modifier.fillMaxWidth(),
                enabled = !state.isSaving
            ) {
                Icon(Icons.Rounded.Add, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text("إضافة بند")
            }
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = state.note,
                onValueChange = viewModel::onNoteChange,
                label = { Text("ملاحظة") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            Spacer(Modifier.height(12.dp))
            // الملخص
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "الإجمالي",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        viewModel.total.formatMoney(state.currencySymbol),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
            Spacer(Modifier.height(16.dp))
            Button(
                onClick = { viewModel.save() },
                modifier = Modifier.fillMaxWidth(),
                enabled = !state.isSaving
            ) {
                if (state.isSaving) {
                    CircularProgressIndicator(
                        modifier = Modifier.height(18.dp),
                        color = MaterialTheme.colorScheme.onPrimary,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("حفظ فاتورة الشراء")
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

private enum class PurchaseDialog {
    PRODUCT_PICKER, SUPPLIER_PICKER, PAYMENT_TYPE_PICKER
}

@Composable
private fun PurchaseItemRow(
    item: DraftPurchaseItem,
    currencySymbol: String,
    onUpdate: (DraftPurchaseItem) -> Unit,
    onRemove: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    item.productName.ifBlank { "منتج غير محدد" },
                    modifier = Modifier.weight(1f),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Medium
                )
                IconButton(onClick = onRemove) {
                    Icon(Icons.Rounded.Delete, contentDescription = "حذف البند",
                        tint = MaterialTheme.colorScheme.error)
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = if (item.quantity == 0.0) "" else item.quantity.toString(),
                    onValueChange = {
                        val qty = it.toDoubleOrNull() ?: 0.0
                        onUpdate(item.copy(quantity = qty))
                    },
                    label = { Text("الكمية") },
                    modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true
                )
                OutlinedTextField(
                    value = if (item.unitPrice == 0L) "" else item.unitPrice.toString(),
                    onValueChange = {
                        val price = it.toLongOrNull() ?: 0L
                        onUpdate(item.copy(unitPrice = price))
                    },
                    label = { Text("سعر الشراء ($currencySymbol)") },
                    modifier = Modifier.weight(1.5f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true
                )
            }
            Spacer(Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(
                    "الإجمالي: ${(item.unitPrice * item.quantity).toLong().formatMoney(currencySymbol)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary
                )
                Text(
                    "الوحدة: ${item.unit}",
                    style = MaterialTheme.typography.bodySmall
                )
            }

        }
    }
}

@Composable
private fun ProductPickerDialog(
    products: List<Product>,
    onSelect: (Product) -> Unit,
    onBarcodeScan: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("اختر منتجًا", modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center) },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(320.dp)
            ) {
                OutlinedButton(
                    onClick = onBarcodeScan,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Rounded.QrCodeScanner, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text("مسح باركود")
                }
                Spacer(Modifier.height(8.dp))
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .verticalScroll(rememberScrollState())
                ) {
                    if (products.isEmpty()) {
                        Text(
                            "لا توجد منتجات — أضف منتجات أولًا من شاشة المنتجات",
                            modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center
                        )
                    }
                    products.forEach { product ->
                        TextButton(
                            onClick = { onSelect(product) },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                "${product.name}${if (product.barcode.isNullOrBlank()) "" else " (${product.barcode})"}",
                                style = MaterialTheme.typography.bodyLarge,
                                modifier = Modifier.fillMaxWidth(),
                                textAlign = TextAlign.End
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text("إلغاء") }
        }
    )
}

@Composable
private fun SupplierPickerDialog(
    suppliers: List<Supplier>,
    onSelect: (Supplier) -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("اختر موردًا", modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center) },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(320.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                if (suppliers.isEmpty()) {
                    Text("لا يوجد موردون — أضف موردًا أولًا من شاشة الموردون",
                        modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)
                }
                suppliers.forEach { supplier ->
                    TextButton(
                        onClick = { onSelect(supplier) },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            supplier.name,
                            style = MaterialTheme.typography.bodyLarge,
                            modifier = Modifier.fillMaxWidth(),
                            textAlign = TextAlign.End
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text("إلغاء") }
        }
    )
}
