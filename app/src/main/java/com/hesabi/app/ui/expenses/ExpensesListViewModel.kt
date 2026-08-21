package com.hesabi.app.ui.expenses

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hesabi.app.HesabiApp
import com.hesabi.app.domain.model.Expense
import com.hesabi.app.domain.model.ExpenseType
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ExpensesListUiState(
    val expenses: List<Expense> = emptyList(),
    val currencySymbol: String = ""
)

class ExpensesListViewModel(app: HesabiApp) : ViewModel() {

    private val expenseDao = app.expenseDao
    private val settingsUseCase = app.settingsUseCase

    private val _state = MutableStateFlow(ExpensesListUiState())
    val state: StateFlow<ExpensesListUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            val currency = settingsUseCase.getStore()?.currencySymbol ?: ""
            expenseDao.observeAll().collect { expenses ->
                _state.update { it.copy(expenses = expenses, currencySymbol = currency) }
            }
        }
    }

    fun deleteExpense(id: Long) {
        viewModelScope.launch {
            expenseDao.softDelete(id)
        }
    }
}

private fun MutableStateFlow<ExpensesListUiState>.update(block: (ExpensesListUiState) -> ExpensesListUiState) {
    value = block(value)
}
