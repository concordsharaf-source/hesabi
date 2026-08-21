package com.hesabi.app.ui.purchases

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hesabi.app.HesabiApp
import com.hesabi.app.domain.PurchaseItemInput
import com.hesabi.app.domain.PurchaseResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * بند مؤقت في نموذج فاتورة الشراء قبل الحفظ.
 */
data class DraftPurchaseItem(
    val productId: Long? = null,
    val productName: String = "",
    val barcode: String? = null,
    val quantity: Double = 0.0,
    val unit: String = "حبة",
    val unitPrice: Long = 0L
) {
    val itemTotal: Long
        get() = (unitPrice * quantity).toLong()
}

data class PurchaseFormUiState(
    val items: List<DraftPurchaseItem> = emptyList(),
    val supplierId: Long? = null,
    val supplierName: String = "",
    val note: String = "",
    val isSaving: Boolean = false,
    val errorMessage: String? = null,
    val isSaved: Boolean = false,
    val currencySymbol: String = "",
    val initialSupplierId: Long? = null
)

class PurchaseFormViewModel(app: HesabiApp) : ViewModel() {

    val purchaseUseCase = app.purchaseUseCase
    val purchaseRepository = app.purchaseRepository
    val productRepository = app.productRepository
    private val settingsUseCase = app.settingsUseCase

    private val _state = MutableStateFlow(PurchaseFormUiState())
    val state: StateFlow<PurchaseFormUiState> = _state.asStateFlow()

    val total: Long
        get() = state.value.items.sumOf { it.itemTotal }

    init {
        viewModelScope.launch {
            val store = settingsUseCase.getStore()
            val supplierId = settingsUseCase.getStore()?.let { null }
            _state.update { it.copy(currencySymbol = store?.currencySymbol ?: "") }
        }
    }

    fun setInitialSupplierId(id: Long?) {
        _state.update { it.copy(initialSupplierId = id) }
    }

    fun setSupplier(id: Long, name: String) {
        _state.update { it.copy(supplierId = id, supplierName = name, initialSupplierId = null) }
    }

    fun addItem(item: DraftPurchaseItem) {
        _state.update { it.copy(items = it.items + item) }
    }

    fun removeItem(index: Int) {
        _state.update { it.copy(items = it.items.toMutableList().apply { removeAt(index) }) }
    }

    fun updateItem(index: Int, item: DraftPurchaseItem) {
        _state.update {
            val list = it.items.toMutableList()
            if (index in list.indices) list[index] = item
            it.copy(items = list)
        }
    }

    fun onNoteChange(value: String) {
        _state.update { it.copy(note = value) }
    }

    fun save() {
        val current = _state.value
        val validItems = current.items.filter { it.quantity > 0 && it.unitPrice >= 0L }
        if (validItems.isEmpty()) {
            _state.update { it.copy(errorMessage = "أضف بندًا واحدًا على الأقل بكمية وسعر") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(isSaving = true, errorMessage = null) }
            val inputs = validItems.map {
                PurchaseItemInput(
                    productId = it.productId,
                    productName = it.productName,
                    barcode = it.barcode,
                    quantity = it.quantity,
                    unit = it.unit,
                    unitPrice = it.unitPrice
                )
            }
            when (val result = purchaseUseCase.execute(inputs, current.supplierId, current.note.ifBlank { null })) {
                is PurchaseResult.Success -> {
                    _state.update { it.copy(isSaving = false, isSaved = true) }
                }
                is PurchaseResult.Failure -> {
                    _state.update { it.copy(isSaving = false, errorMessage = result.message) }
                }
            }
        }
    }
}

private fun MutableStateFlow<PurchaseFormUiState>.update(block: (PurchaseFormUiState) -> PurchaseFormUiState) {
    value = block(value)
}
