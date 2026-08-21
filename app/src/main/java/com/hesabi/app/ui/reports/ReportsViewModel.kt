package com.hesabi.app.ui.reports

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hesabi.app.HesabiApp
import com.hesabi.app.domain.ProfitSummary
import com.hesabi.app.domain.PurchasingSummary
import com.hesabi.app.util.endOfMonth
import com.hesabi.app.util.endOfWeek
import com.hesabi.app.util.startOfDayFromText
import com.hesabi.app.util.startOfMonth
import com.hesabi.app.util.startOfWeek
import com.hesabi.app.util.startOfDay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

enum class ReportPeriod(val label: String) {
    TODAY("اليوم"),
    WEEK("الأسبوع"),
    MONTH("الشهر"),
    CUSTOM("مخصص")
}

data class ReportsUiState(
    val period: ReportPeriod = ReportPeriod.TODAY,
    val customDayText: String = "",
    val isLoading: Boolean = false,
    val profit: ProfitSummary? = null,
    val purchasing: PurchasingSummary? = null,
    val todayExpenses: Long = 0L,
    val todaySales: Long = 0L,
    val currencySymbol: String = ""
)

class ReportsViewModel(app: HesabiApp) : ViewModel() {

    private val profitUseCase = app.profitUseCase
    private val expenseDao = app.expenseDao
    private val saleDao = app.saleDao
    private val settingsUseCase = app.settingsUseCase

    private val _state = MutableStateFlow(ReportsUiState())
    val state: StateFlow<ReportsUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            val currency = settingsUseCase.getStore()?.currencySymbol ?: ""
            _state.update { it.copy(currencySymbol = currency) }
            refresh()
        }
    }

    fun setPeriod(period: ReportPeriod) {
        _state.update { it.copy(period = period) }
        viewModelScope.launch { refresh() }
    }

    fun onCustomDayChange(text: String) {
        _state.update { it.copy(customDayText = text) }
    }

    fun refreshCustomDay() {
        viewModelScope.launch { refresh() }
    }

    private suspend fun refresh() {
        val current = _state.value
        val (start, end) = periodRange(current.period, current.customDayText)
        if (start <= 0L) {
            if (current.period == ReportPeriod.CUSTOM) {
                _state.update { it.copy(profit = null, purchasing = null) }
            }
            return
        }
        _state.update { it.copy(isLoading = true) }
        try {
            val profit = profitUseCase.calculateProfit(start, end)
            val purchasing = profitUseCase.calculatePurchases(start, end)
            val todaySales = saleDao.sumTotalsInRange(start, end)
            val todayExpenses = expenseDao.sumInRange(start, end)
            _state.update {
                it.copy(
                    profit = profit,
                    purchasing = purchasing,
                    todaySales = todaySales,
                    todayExpenses = todayExpenses,
                    isLoading = false
                )
            }
        } catch (_: Exception) {
            _state.update { it.copy(isLoading = false) }
        }
    }

    private fun periodRange(period: ReportPeriod, customDayText: String): Pair<Long, Long> {
        return when (period) {
            ReportPeriod.TODAY -> startOfDay(System.currentTimeMillis()) to
                (startOfDay(System.currentTimeMillis()) + 24 * 60 * 60 * 1000L - 1)
            ReportPeriod.WEEK -> startOfWeek() to endOfWeek()
            ReportPeriod.MONTH -> startOfMonth() to endOfMonth()
            ReportPeriod.CUSTOM -> {
                val dayStart = startOfDayFromText(customDayText)
                if (dayStart <= 0L) 0L to 0L
                else dayStart to (dayStart + 24 * 60 * 60 * 1000L - 1)
            }
        }
    }
}

private fun MutableStateFlow<ReportsUiState>.update(block: (ReportsUiState) -> ReportsUiState) {
    value = block(value)
}
