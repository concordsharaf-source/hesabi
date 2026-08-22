package com.hesabi.app.ui.expenses

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hesabi.app.HesabiApp
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ExpenseFormUiState(
    val amount: String = "",
    val typeIndex: Int = 0,
    val isFromCashbox: Boolean = true,
    val description: String = "",
    val notes: String = "",
    val isSaving: Boolean = false,
    val errorMessage: String? = null,
    val isSaved: Boolean = false
)

class ExpensesViewModel(app: HesabiApp) : ViewModel() {

    private val expenseUseCase = app.expenseUseCase

    private val _state = MutableStateFlow(ExpenseFormUiState())
    val state: StateFlow<ExpenseFormUiState> = _state.asStateFlow()

    fun onAmountChange(value: String) {
        _state.update { it.copy(amount = value) }
    }

    fun setType(index: Int) {
        _state.update { it.copy(typeIndex = index) }
    }

    fun onSourceChange(isFromCashbox: Boolean) {
        _state.update { it.copy(isFromCashbox = isFromCashbox) }
    }

    fun onDescriptionChange(value: String) {
        _state.update { it.copy(description = value) }
    }

    fun onNotesChange(value: String) {
        _state.update { it.copy(notes = value) }
    }

    fun save() {
        val current = _state.value
        val amountMinor = (current.amount.toDoubleOrNull() ?: 0.0).let { (it * 100).toLong() }
        if (amountMinor <= 0L) {
            _state.update { it.copy(errorMessage = "أدخل مبلغًا صحيحًا") }
            return
        }
        val types = com.hesabi.app.domain.model.ExpenseType.entries
        val type = if (current.typeIndex in types.indices) types[current.typeIndex] else types[0]
        val description = current.description.ifBlank { type.label }
        viewModelScope.launch {
            _state.update { it.copy(isSaving = true, errorMessage = null) }
            when (val result = expenseUseCase.addExpense(
                amount = amountMinor,
                type = type,
                description = description,
                notes = current.notes.ifBlank { null },
                isFromCashbox = current.isFromCashbox
            )) {
                is com.hesabi.app.domain.ExpenseResult.Success -> {
                    _state.update { it.copy(isSaving = false, isSaved = true) }
                }
                is com.hesabi.app.domain.ExpenseResult.Failure -> {
                    _state.update { it.copy(isSaving = false, errorMessage = result.message) }
                }
            }
        }
    }
}

private fun MutableStateFlow<ExpenseFormUiState>.update(block: (ExpenseFormUiState) -> ExpenseFormUiState) {
    value = block(value)
}
