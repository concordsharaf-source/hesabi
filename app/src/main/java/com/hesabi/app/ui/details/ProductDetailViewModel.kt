package com.hesabi.app.ui.details

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hesabi.app.HesabiApp
import com.hesabi.app.domain.model.Product
import com.hesabi.app.domain.model.StockMovement
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/**
 * ViewModel تفاصيل المنتج — يعرض معلومات المنتج وحركات مخزونه.
 */
class ProductDetailViewModel(private val app: HesabiApp, private val productId: Long) : ViewModel() {

    private val movementDao = app.movementDao
    private val productRepository = app.productRepository

    val product: StateFlow<Product?> = productRepository.observeById(productId)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    val movements: StateFlow<List<StockMovement>> = movementDao
        .observeByProduct(productId)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    private val _adjustResult = MutableStateFlow<String?>(null)
    val adjustResult: StateFlow<String?> = _adjustResult.asStateFlow()

    /**
     * تعديل المخزون:
     * الكمية الحالية 20 → الكمية الفعلية 18
     * Adjustment = -2، والمخزون الجديد 18.
     * تُسجل العملية في StockMovement.
     */
    fun adjustStock(actualQuantity: Double, reason: String) {
        viewModelScope.launch {
            when (val result = app.inventoryUseCase.adjustStock(productId, actualQuantity, reason)) {
                is com.hesabi.app.domain.AdjustmentResult.Success ->
                    _adjustResult.value = "تم تعديل المخزون بنجاح"
                is com.hesabi.app.domain.AdjustmentResult.Failure ->
                    _adjustResult.value = result.message
            }
        }
    }

    fun clearAdjustResult() {
        _adjustResult.value = null
    }
}
