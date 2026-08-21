package com.hesabi.app.ui.details

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.QrCodeScanner
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hesabi.app.HesabiApp
import com.hesabi.app.domain.model.Units
import com.hesabi.app.ui.common.HesabiTopBar

/**
 * نموذج إضافة / تعديل المنتج.
 * ملاحظة: الكمية الافتتاحية تُستخدم فقط عند الإنشاء —
 * لا يمكن تعديل المخزون من هنا (يتم عبر شاشة تعديل المخزون مع تسجيل حركة).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductFormScreen(
    editProductId: Long? = null,
    onBarcodeScan: () -> Unit,
    onSaved: () -> Unit,
    onBack: () -> Unit,
    
) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as HesabiApp
    // استخدام viewModel(factory) يضمن الاحتفاظ بنفس النسخة عبر كل إعادة تركيب —
    // بدونها يُعاد إنشاء الـ ViewModel مع كل حرف مكتوب فتتجمد الشاشة.
    val viewModel: ProductFormViewModel = viewModel(factory = ProductFormViewModelFactory(app, editProductId))

    val state by viewModel.state.collectAsStateWithLifecycle()
    val title = if (state.isEditMode) "تعديل المنتج" else "إضافة منتج"

    var showUnitPicker by remember { mutableStateOf(false) }

    // عند نجاح الحفظ
    LaunchedEffect(state.isSaved) {
        if (state.isSaved) onSaved()
    }

    Scaffold(
        topBar = { HesabiTopBar(title = title, onBackClick = onBack) }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 20.dp, vertical = 12.dp)
                .verticalScroll(rememberScrollState())
        ) {
            // اسم المنتج
            OutlinedTextField(
                value = state.name,
                onValueChange = { viewModel.updateField(ProductField.NAME, it) },
                label = { Text("اسم المنتج *") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(Modifier.height(12.dp))

            // الباركود + زر المسح
            OutlinedTextField(
                value = state.barcode,
                onValueChange = { viewModel.updateField(ProductField.BARCODE, it) },
                label = { Text("الباركود") },
                placeholder = { Text("امسح الباركود أو أدخله يدويًا") },
                singleLine = true,
                trailingIcon = {
                    IconButton(onClick = onBarcodeScan) {
                        Icon(Icons.Rounded.QrCodeScanner, contentDescription = "مسح باركود")
                    }
                },
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(Modifier.height(12.dp))

            // الكود الداخلي
            OutlinedTextField(
                value = state.internalCode,
                onValueChange = { viewModel.updateField(ProductField.INTERNAL_CODE, it) },
                label = { Text("كود المنتج (اختياري)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(Modifier.height(12.dp))

            // سعر الشراء وسعر البيع
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = state.purchasePrice,
                    onValueChange = { viewModel.updateField(ProductField.PURCHASE_PRICE, it) },
                    label = { Text("سعر الشراء") },
                    placeholder = { Text("0.00") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    modifier = Modifier.weight(1f)
                )
                OutlinedTextField(
                    value = state.salePrice,
                    onValueChange = { viewModel.updateField(ProductField.SALE_PRICE, it) },
                    label = { Text("سعر البيع *") },
                    placeholder = { Text("0.00") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(Modifier.height(12.dp))

            // الكمية الافتتاحية والحد الأدنى
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (!state.isEditMode) {
                    OutlinedTextField(
                        value = state.openingQuantity,
                        onValueChange = { viewModel.updateField(ProductField.OPENING_QTY, it) },
                        label = { Text("الكمية الافتتاحية") },
                        placeholder = { Text("0") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                }
                OutlinedTextField(
                    value = state.minQuantity,
                    onValueChange = { viewModel.updateField(ProductField.MIN_QTY, it) },
                    label = { Text("الحد الأدنى للمخزون") },
                    placeholder = { Text("0") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(Modifier.height(12.dp))

            // الوحدة — اختيار عبر نافذة AlertDialog مستقرة
            SelectionField(
                label = "الوحدة",
                displayValue = state.unit,
                onClick = { showUnitPicker = true }
            )

            // رسالة الخطأ
            if (state.errorMessage != null) {
                Spacer(Modifier.height(8.dp))
                Text(
                    state.errorMessage!!,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            Spacer(Modifier.height(24.dp))

            Button(
                onClick = { viewModel.save() },
                enabled = !state.isSaving && state.name.isNotBlank(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
            ) {
                if (state.isSaving) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text("حفظ المنتج", style = MaterialTheme.typography.titleMedium)
                }
            }

            if (state.isEditMode) {
                Spacer(Modifier.height(8.dp))
                Text(
                    "ملاحظة: لا يمكن تعديل الكمية من هنا. " +
                        "استخدم شاشة تعديل المخزون لتسجيل حركات المخزون.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(Modifier.height(24.dp))
        }
    }

    // نافذة اختيار الوحدة
    if (showUnitPicker) {
        UnitChoiceDialog(
            selected = state.unit,
            onUnitSelected = {
                viewModel.updateField(ProductField.UNIT, it)
                showUnitPicker = false
            },
            onDismiss = { showUnitPicker = false }
        )
    }
}

/**
 * حقل اختيار يعرض القيمة الحالية مع سهم سفلي ويفتح نافذة عند الضغط.
 */
@Composable
private fun SelectionField(
    label: String,
    displayValue: String,
    onClick: () -> Unit
) {
    OutlinedButton(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.small
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    label,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    displayValue,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
            Icon(
                Icons.Rounded.Check,
                contentDescription = null
            )
        }
    }
}

/**
 * نافذة اختيار الوحدة — تعمل على جميع الأجهزة.
 */
@Composable
private fun UnitChoiceDialog(
    selected: String,
    onUnitSelected: (String) -> Unit,
    onDismiss: () -> Unit
) {
    androidx.compose.material3.AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                "اختر الوحدة",
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.Center
            )
        },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                Units.ALL.forEach { unit ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        colors = if (unit == selected) {
                            CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                        } else {
                            CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                        },
                        onClick = { onUnitSelected(unit) }
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(unit, style = MaterialTheme.typography.bodyLarge)
                            if (unit == selected) {
                                Icon(
                                    Icons.Rounded.Check,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary
                                )
                            }
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
