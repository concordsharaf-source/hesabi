package com.hesabi.app.ui.purchases

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hesabi.app.HesabiApp
import com.hesabi.app.domain.model.Purchase
import com.hesabi.app.domain.model.PurchaseItem
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class PurchaseDetailUiState(
    val purchase: Purchase? = null,
    val items: List<PurchaseItem> = emptyList(),
    val supplierName: String = "",
    val refundedAmount: Long = 0L,
    val isLoading: Boolean = true,
    val currencySymbol: String = ""
)

class PurchaseDetailViewModel(app: HesabiApp, private val purchaseId: Long) : ViewModel() {

    private val purchaseRepository = app.purchaseRepository
    private val settingsUseCase = app.settingsUseCase

    private val _state = MutableStateFlow(PurchaseDetailUiState())
    val state: StateFlow<PurchaseDetailUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            val purchase = purchaseRepository.getPurchase(purchaseId)
            val items = purchaseRepository.getPurchaseItems(purchaseId)
            val supplier = purchase?.supplierId?.let { purchaseRepository.getSupplier(it) }
            val refunded = purchaseRepository.sumPurchaseReturnsFor(purchaseId)
            val currency = settingsUseCase.getStore()?.currencySymbol ?: ""
            _state.update {
                PurchaseDetailUiState(
                    purchase = purchase,
                    items = items,
                    supplierName = supplier?.name ?: "",
                    refundedAmount = refunded,
                    isLoading = false,
                    currencySymbol = currency
                )
            }
        }
    }
}

private fun MutableStateFlow<PurchaseDetailUiState>.update(block: (PurchaseDetailUiState) -> PurchaseDetailUiState) {
    value = block(value)
}
