package com.hesabi.app.ui.onboarding

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
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.KeyboardArrowDown
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Storefront
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
 * ملاحظة: الحقول والقوائم هنا مكونات بسيطة ومستقرة (TextField + AlertDialog)
 * لضمان عمل الإدخال والاختيار على جميع الأجهزة.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OnboardingScreen(
    onSetupComplete: () -> Unit,
) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as HesabiApp
    val viewModel: OnboardingViewModel = viewModel(factory = OnboardingViewModelFactory(app))

    val state by viewModel.state.collectAsStateWithLifecycle()

    // حالة الإعداد محفوظة دائمًا في Room — التنقل يتم ضمن LaunchedEffect
    // وليس أثناء التركيب (تفادي التجميد واستثناءات التنقل).
    LaunchedEffect(state.isCompleted) {
        if (state.isCompleted) {
            onSetupComplete()
        }
    }

    var showCurrencyPicker by remember { mutableStateOf(false) }
    var showActivityPicker by remember { mutableStateOf(false) }

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
                Icons.Rounded.Storefront,
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

            // اسم المتجر — حقل إدخال حر
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

            // العملة — اختيار عبر نافذة AlertDialog بسيطة ومستقرة
            SelectionField(
                label = "العملة",
                displayValue = state.currencySymbol,
                onClick = { showCurrencyPicker = true }
            )

            Spacer(Modifier.height(12.dp))

            // نوع النشاط — اختيار عبر نافذة AlertDialog بسيطة ومستقرة
            SelectionField(
                label = "نوع النشاط",
                displayValue = state.activityType.ifEmpty { "اختر نوع النشاط" },
                onClick = { showActivityPicker = true }
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
                enabled = !state.isSaving && state.storeName.isNotBlank(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
            ) {
                if (state.isSaving) {
                    CircularProgressIndicator(
                        modifier = Modifier.height(24.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text("دخول", style = MaterialTheme.typography.titleMedium)
                }
            }

            Spacer(Modifier.height(32.dp))
        }
    }

    // نافذة اختيار العملة
    if (showCurrencyPicker) {
        ChoiceDialog(
            title = "اختر العملة",
            options = Currencies.ALL.map { it },
            selected = Currencies.ALL.firstOrNull { it.code == state.currencyCode },
            labelFor = { "${it.symbol} (${it.code})" },
            onConfirm = {
                viewModel.updateCurrency(it.code, it.symbol)
                viewModel.clearError()
                showCurrencyPicker = false
            },
            onDismiss = { showCurrencyPicker = false }
        )
    }

    // نافذة اختيار نوع النشاط
    if (showActivityPicker) {
        ChoiceDialog(
            title = "اختر نوع النشاط",
            options = BusinessTypes.ALL,
            selected = state.activityType.takeIf { it.isNotBlank() },
            labelFor = { it },
            onConfirm = {
                viewModel.updateActivityType(it)
                viewModel.clearError()
                showActivityPicker = false
            },
            onDismiss = { showActivityPicker = false }
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
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = if (displayValue.isBlank()) FontWeight.Normal else FontWeight.Medium
                )
            }
            Icon(
                Icons.Rounded.KeyboardArrowDown,
                contentDescription = null
            )
        }
    }
}

/**
 * نافذة اختيار بسيطة تعمل على جميع الأجهزة.
 */
@Composable
private fun <T> ChoiceDialog(
    title: String,
    options: List<T>,
    selected: T?,
    labelFor: (T) -> String,
    onConfirm: (T) -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                title,
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.Center
            )
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
            ) {
                options.forEach { option ->
                    val isSelected = option == selected
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        colors = if (isSelected) {
                            CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                        } else {
                            CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                        },
                        onClick = { onConfirm(option) }
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                labelFor(option),
                                style = MaterialTheme.typography.bodyLarge
                            )
                            if (isSelected) {
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
            androidx.compose.material3.TextButton(onClick = onDismiss) { Text("إلغاء") }
        }
    )
}
