package com.hesabi.app.ui.purchases

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hesabi.app.HesabiApp
import com.hesabi.app.domain.PurchaseReturnItemInput
import com.hesabi.app.domain.PurchaseReturnResult
import com.hesabi.app.domain.model.Purchase
import com.hesabi.app.domain.model.PurchaseItem
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ReturnItemState(
    val item: PurchaseItem,
    val returnableQuantity: Double = 0.0,
    val isSelected: Boolean = false,
    val quantity: Double = 0.0
)

data class PurchaseReturnUiState(
    val purchase: Purchase? = null,
    val items: List<ReturnItemState> = emptyList(),
    val note: String = "",
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val errorMessage: String? = null,
    val isSaved: Boolean = false,
    val currencySymbol: String = ""
)

class PurchaseReturnViewModel(app: HesabiApp, private val purchaseId: Long) : ViewModel() {

    val purchaseReturnUseCase = app.purchaseReturnUseCase
    val purchaseRepository = app.purchaseRepository
    private val settingsUseCase = app.settingsUseCase

    private val _state = MutableStateFlow(PurchaseReturnUiState())
    val state: StateFlow<PurchaseReturnUiState> = _state.asStateFlow()

    val refundedTotal: Long
        get() = state.value.items.filter { it.isSelected && it.quantity > 0 }
            .sumOf { (it.item.unitPrice * it.quantity).toLong() }

    init {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            val purchase = purchaseRepository.getPurchase(purchaseId)
            val items = purchaseRepository.getPurchaseItems(purchaseId)
            val currency = settingsUseCase.getStore()?.currencySymbol ?: ""
            if (purchase == null) {
                _state.update { it.copy(isLoading = false, errorMessage = "فاتورة الشراء غير موجودة") }
                return@launch
            }
            val itemStates = items.map { item ->
                ReturnItemState(
                    item = item,
                    returnableQuantity = purchaseReturnUseCase.returnableQuantity(item.id)
                )
            }
            _state.update { it.copy(purchase = purchase, items = itemStates, isLoading = false, currencySymbol = currency) }
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

    fun save() {
        val current = _state.value
        val purchase = current.purchase ?: return
        val selected = current.items.filter { it.isSelected && it.quantity > 0 }
        if (selected.isEmpty()) {
            _state.update { it.copy(errorMessage = "اختر بندًا واحدًا على الأقل بكمية") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(isSaving = true, errorMessage = null) }
            val inputs = selected.map {
                PurchaseReturnItemInput(
                    purchaseItemId = it.item.id,
                    productId = it.item.productId,
                    productName = it.item.productName,
                    quantity = it.quantity,
                    unit = it.item.unit,
                    unitPrice = it.item.unitPrice
                )
            }
            when (val result = purchaseReturnUseCase.execute(purchaseId, inputs, current.note.ifBlank { null })) {
                is PurchaseReturnResult.Success -> {
                    _state.update { it.copy(isSaving = false, isSaved = true) }
                }
                is PurchaseReturnResult.Failure -> {
                    _state.update { it.copy(isSaving = false, errorMessage = result.message) }
                }
            }
        }
    }
}

private fun MutableStateFlow<PurchaseReturnUiState>.update(block: (PurchaseReturnUiState) -> PurchaseReturnUiState) {
    value = block(value)
}
