package com.hesabi.app.ui.onboarding

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material.icons.rounded.Storefront
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hesabi.app.HesabiApp
import com.hesabi.app.domain.model.BusinessTypes
import com.hesabi.app.domain.model.Currencies

/**
 * شاشة إعداد المتجر عند أول تشغيل.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OnboardingScreen(
    onSetupComplete: () -> Unit,
    
) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as HesabiApp
    val viewModel = OnboardingViewModel(app)

    val state by viewModel.state.collectAsStateWithLifecycle()

    if (state.isCompleted) {
        onSetupComplete()
        return
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "إعداد المتجر",
                        modifier = Modifier.fillMaxWidth(),
                        textAlign = TextAlign.Center
                    )
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 24.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(Modifier.height(24.dp))

            Icon(
                androidx.compose.material.icons.Icons.Rounded.Storefront,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(8.dp)
            )

            Text(
                "مرحبًا بك في حسابي",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold
            )

            Text(
                "أدخل بيانات متجرك للبدء",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 24.dp)
            )

            OutlinedTextField(
                value = state.storeName,
                onValueChange = {
                    viewModel.updateName(it)
                    viewModel.clearError()
                },
                label = { Text("اسم المتجر") },
                placeholder = { Text("مثال: بقالة الأمانة") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                isError = state.errorMessage != null
            )

            Spacer(Modifier.height(12.dp))

            CurrencyDropdown(
                selectedCode = state.currencyCode,
                selectedSymbol = state.currencySymbol,
                onCurrencySelected = { code, symbol ->
                    viewModel.updateCurrency(code, symbol)
                    viewModel.clearError()
                }
            )

            Spacer(Modifier.height(12.dp))

            ActivityTypeDropdown(
                selected = state.activityType,
                onTypeSelected = {
                    viewModel.updateActivityType(it)
                    viewModel.clearError()
                }
            )

            if (state.errorMessage != null) {
                Spacer(Modifier.height(8.dp))
                Text(
                    state.errorMessage!!,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                    textAlign = TextAlign.Center
                )
            }

            Spacer(Modifier.height(24.dp))

            Button(
                onClick = { viewModel.save() },
                enabled = !state.isSaving &&
                    state.storeName.isNotBlank() &&
                    state.activityType.isNotBlank(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
            ) {
                if (state.isSaving) {
                    androidx.compose.material3.CircularProgressIndicator(
                        modifier = Modifier.height(24.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text("حفظ وبدء الاستخدام", style = MaterialTheme.typography.titleMedium)
                }
            }

            Spacer(Modifier.height(32.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CurrencyDropdown(
    selectedCode: String,
    selectedSymbol: String,
    onCurrencySelected: (String, String) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = !expanded }
    ) {
        OutlinedTextField(
            value = "$selectedSymbol ($selectedCode)",
            onValueChange = {},
            readOnly = true,
            label = { Text("العملة") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier
                .menuAnchor()
                .fillMaxWidth()
        )
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false }
        ) {
            Currencies.ALL.forEach { currency ->
                DropdownMenuItem(
                    text = { Text("${currency.symbol} (${currency.code})") },
                    onClick = {
                        onCurrencySelected(currency.code, currency.symbol)
                        expanded = false
                    },
                    leadingIcon = if (currency.code == selectedCode) {
                        { Icon(androidx.compose.material.icons.Icons.Rounded.Check, contentDescription = null) }
                    } else null
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ActivityTypeDropdown(
    selected: String,
    onTypeSelected: (String) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = !expanded }
    ) {
        OutlinedTextField(
            value = selected,
            onValueChange = {},
            readOnly = true,
            label = { Text("نوع النشاط") },
            placeholder = { Text("اختر نوع النشاط") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier
                .menuAnchor()
                .fillMaxWidth()
        )
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false }
        ) {
            BusinessTypes.ALL.forEach { type ->
                DropdownMenuItem(
                    text = { Text(type) },
                    onClick = {
                        onTypeSelected(type)
                        expanded = false
                    },
                    leadingIcon = if (type == selected) {
                        { Icon(androidx.compose.material.icons.Icons.Rounded.Check, contentDescription = null) }
                    } else null
                )
            }
        }
    }
}
