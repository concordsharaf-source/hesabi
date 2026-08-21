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
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
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
    val viewModel = ProductFormViewModel(app, editProductId)

    val state by viewModel.state.collectAsStateWithLifecycle()
    val title = if (state.isEditMode) "تعديل المنتج" else "إضافة منتج"

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

            // الوحدة
            UnitDropdown(
                selected = state.unit,
                onUnitSelected = { viewModel.updateField(ProductField.UNIT, it) }
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
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun UnitDropdown(selected: String, onUnitSelected: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = !expanded }
    ) {
        OutlinedTextField(
            value = selected,
            onValueChange = {},
            readOnly = true,
            label = { Text("الوحدة") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier
                .menuAnchor()
                .fillMaxWidth()
        )
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false }
        ) {
            Units.ALL.forEach { unit ->
                DropdownMenuItem(
                    text = { Text(unit) },
                    onClick = {
                        onUnitSelected(unit)
                        expanded = false
                    },
                    leadingIcon = if (unit == selected) {
                        { Icon(Icons.Rounded.Check, contentDescription = null) }
                    } else null
                )
            }
        }
    }
}
