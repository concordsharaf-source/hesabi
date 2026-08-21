package com.hesabi.app.ui.reports

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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import com.hesabi.app.ui.common.HesabiTopBar
import com.hesabi.app.util.formatMoney

/**
 * شاشة التقارير — ملخص الربح والمشتريات والمبيعات والمصروفات لفترة مختارة.
 */
@Composable
fun ReportsScreen(onBack: () -> Unit) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as HesabiApp
    val viewModel: ReportsViewModel = viewModel(factory = ReportsViewModelFactory(app))
    val state by viewModel.state.collectAsStateWithLifecycle()

    Scaffold(
        topBar = { HesabiTopBar(title = "التقارير", onBackClick = onBack) }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Spacer(Modifier.height(12.dp))
            // منتقي الفترة
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                ReportPeriod.entries.forEach { period ->
                    FilterChip(
                        selected = state.period == period,
                        onClick = {
                            viewModel.setPeriod(period)
                            if (period == ReportPeriod.CUSTOM) viewModel.refreshCustomDay()
                        },
                        label = { Text(period.label) }
                    )
                }
            }
            if (state.period == ReportPeriod.CUSTOM) {
                Spacer(Modifier.height(8.dp))
                Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = state.customDayText,
                        onValueChange = viewModel::onCustomDayChange,
                        placeholder = { Text("yyyy/MM/dd") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                    Spacer(Modifier.width(8.dp))
                    TextButton(onClick = { viewModel.refreshCustomDay() }) { Text("عرض") }
                }
                Text(
                    "أدخل التاريخ بالصيغة: 2026/08/21",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Spacer(Modifier.height(12.dp))
            if (state.isLoading) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    CircularProgressIndicator()
                }
            }
            val profit = state.profit
            val purchasing = state.purchasing
            if (profit == null && purchasing == null) {
                Spacer(Modifier.height(48.dp))
                Text(
                    if (state.period == ReportPeriod.CUSTOM) "أدخل تاريخًا صحيحًا لعرض التقرير"
                    else "لا توجد بيانات لهذه الفترة",
                    modifier = Modifier.fillMaxWidth(),
                    textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            } else {
                ReportCard(
                    title = "تقرير الأرباح",
                    rows = listOf(
                        "الإيرادات" to profit?.netRevenue?.formatMoney(state.currencySymbol),
                        "المبيعات" to state.todaySales.formatMoney(state.currencySymbol),
                        "مرتجعات البيع" to profit?.salesRefunds?.formatMoney(state.currencySymbol),
                        "تكلفة البضاعة المباعة" to profit?.costOfGoodsSold?.formatMoney(state.currencySymbol),
                        "إجمالي الربح" to profit?.grossProfit?.formatMoney(state.currencySymbol),
                        "المصروفات" to state.todayExpenses.formatMoney(state.currencySymbol),
                        "صافي الربح" to profit?.netProfit?.formatMoney(state.currencySymbol)
                    ),
                    highlightIndex = 6
                )
                Spacer(Modifier.height(12.dp))
                ReportCard(
                    title = "تقرير المشتريات",
                    rows = listOf(
                        "إجمالي المشتريات" to purchasing?.purchases?.formatMoney(state.currencySymbol),
                        "مرتجعات الشراء" to purchasing?.purchaseReturns?.formatMoney(state.currencySymbol),
                        "صافي المشتريات" to purchasing?.netPurchases?.formatMoney(state.currencySymbol)
                    ),
                    highlightIndex = 2
                )
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun ReportCard(
    title: String,
    rows: List<Pair<String, String?>>,
    highlightIndex: Int? = null
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(
                title,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.Center
            )
            Spacer(Modifier.height(8.dp))
            rows.forEachIndexed { index, (label, value) ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        label,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontWeight = if (index == highlightIndex) FontWeight.Bold else FontWeight.Normal
                    )
                    Text(
                        value ?: "—",
                        fontWeight = if (index == highlightIndex) FontWeight.Bold else FontWeight.Normal,
                        color = if (index == highlightIndex) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.onSurface
                    )
                }
                if (index < rows.size - 1) {
                    Spacer(Modifier.height(4.dp))
                }
            }
        }
    }
}
