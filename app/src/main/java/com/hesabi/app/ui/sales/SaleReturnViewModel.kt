package com.hesabi.app.ui.sales

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hesabi.app.HesabiApp
import com.hesabi.app.data.dao.SaleDao
import com.hesabi.app.domain.SaleReturnItemInput
import com.hesabi.app.domain.SaleReturnResult
import com.hesabi.app.domain.model.Sale
import com.hesabi.app.domain.model.SaleItem
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class SaleReturnItemState(
    val item: SaleItem,
    val returnableQuantity: Double = 0.0,
    val isSelected: Boolean = false,
    val quantity: Double = 0.0
)

data class SaleReturnUiState(
    val sale: Sale? = null,
    val items: List<SaleReturnItemState> = emptyList(),
    val note: String = "",
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val errorMessage: String? = null,
    val isSaved: Boolean = false,
    val currencySymbol: String = "",
    val refundFromCashbox: Boolean = true
)

class SaleReturnViewModel(private val app: HesabiApp, private val saleId: Long) : ViewModel() {

    val saleReturnUseCase = app.saleReturnUseCase
    private val saleDao: SaleDao = app.saleDao
    private val settingsUseCase = app.settingsUseCase

    private val _state = MutableStateFlow(SaleReturnUiState())
    val state: StateFlow<SaleReturnUiState> = _state.asStateFlow()

    val refundedTotal: Long
        get() = state.value.items.filter { it.isSelected && it.quantity > 0 }
            .sumOf { (it.item.unitPrice * it.quantity).toLong() }

    init {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            val sale = saleDao.getById(saleId)
            val items = saleDao.getItemsForSale(saleId)
            val currency = settingsUseCase.getStore()?.currencySymbol ?: ""
            if (sale == null) {
                _state.update { it.copy(isLoading = false, errorMessage = "فاتورة البيع غير موجودة") }
                return@launch
            }
            val itemStates = items.map { item ->
                SaleReturnItemState(
                    item = item,
                    returnableQuantity = saleReturnUseCase.returnableQuantity(item.id)
                )
            }
            _state.update { it.copy(sale = sale, items = itemStates, isLoading = false, currencySymbol = currency) }
        }
    }

    fun toggleItem(index: Int, checked: Boolean) {
        _state.update {
            val list = it.items.toMutableList()
            if (index in list.indices) list[index] = list[index].copy(isSelected = checked)
            it.copy(items = list)
        }
    }

    fun setItemQuantity(index: Int, quantity: Double) {
        _state.update {
            val list = it.items.toMutableList()
            if (index in list.indices) {
                val current = list[index]
                val clamped = quantity.coerceIn(0.0, current.returnableQuantity)
                list[index] = current.copy(quantity = clamped, isSelected = clamped > 0)
            }
            it.copy(items = list)
        }
    }

    fun onNoteChange(value: String) {
        _state.update { it.copy(note = value) }
    }

    fun onRefundFromCashboxChange(value: Boolean) {
        _state.update { it.copy(refundFromCashbox = value) }
    }

    fun save() {
        val current = _state.value
        val sale = current.sale ?: return
        val selected = current.items.filter { it.isSelected && it.quantity > 0 }
        if (selected.isEmpty()) {
            _state.update { it.copy(errorMessage = "اختر بندًا واحدًا على الأقل بكمية") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(isSaving = true, errorMessage = null) }
            val inputs = selected.map { it.item.id to it.quantity }
            try {
                (app.returnUseCase).processSaleReturn(
                    saleId = saleId,
                    itemsToReturn = inputs,
                    refundFromCashbox = current.refundFromCashbox,
                    note = current.note.ifBlank { null }
                )
                _state.update { it.copy(isSaving = false, isSaved = true) }
            } catch (e: Exception) {
                _state.update { it.copy(isSaving = false, errorMessage = e.message ?: "فشل المرتجع") }
            }
        }
    }
}

private fun MutableStateFlow<SaleReturnUiState>.update(block: (SaleReturnUiState) -> SaleReturnUiState) {
    value = block(value)
}
