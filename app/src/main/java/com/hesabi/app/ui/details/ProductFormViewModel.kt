package com.hesabi.app.ui.details

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hesabi.app.HesabiApp
import com.hesabi.app.domain.AddProductInput
import com.hesabi.app.domain.ProductOperationResult
import com.hesabi.app.domain.model.Product
import com.hesabi.app.domain.model.Units
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ProductFormUiState(
    val isEditMode: Boolean = false,
    val productId: Long = 0,
    val name: String = "",
    val barcode: String = "",
    val internalCode: String = "",
    val purchasePrice: String = "",
    val salePrice: String = "",
    val openingQuantity: String = "0",
    val minQuantity: String = "0",
    val unit: String = Units.ALL.first(),
    val errorMessage: String? = null,
    val isSaved: Boolean = false,
    val isSaving: Boolean = false
)

/**
 * ViewModel نموذج إضافة/تعديل المنتج.
 * يحفظ عند الضغط على "حفظ المنتج" فقط.
 */
class ProductFormViewModel(
    private val app: HesabiApp,
    private val editProductId: Long? = null
) : ViewModel() {

    private val productUseCase = app.productUseCase

    private val _state = MutableStateFlow(ProductFormUiState())
    val state: StateFlow<ProductFormUiState> = _state.asStateFlow()

    init {
        if (editProductId != null) {
            _state.update {
                it.copy(isEditMode = true, productId = editProductId)
            }
            viewModelScope.launch {
                val product = app.productRepository.getById(editProductId)
                if (product != null) {
                    _state.update {
                        it.copy(
                            name = product.name,
                            barcode = product.barcode ?: "",
                            internalCode = product.internalCode ?: "",
                            purchasePrice = com.hesabi.app.common.Money.format(product.purchasePrice),
                            salePrice = com.hesabi.app.common.Money.format(product.salePrice),
                            openingQuantity = product.quantity.toString(),
                            minQuantity = product.minQuantity.toString(),
                            unit = product.unit
                        )
                    }
                }
            }
        }
    }

    fun updateField(field: ProductField, value: String) {
        _state.update {
            when (field) {
                ProductField.NAME -> it.copy(name = value, errorMessage = null)
                ProductField.BARCODE -> it.copy(barcode = value, errorMessage = null)
                ProductField.INTERNAL_CODE -> it.copy(internalCode = value, errorMessage = null)
                ProductField.PURCHASE_PRICE -> it.copy(purchasePrice = value, errorMessage = null)
                ProductField.SALE_PRICE -> it.copy(salePrice = value, errorMessage = null)
                ProductField.OPENING_QTY -> it.copy(openingQuantity = value, errorMessage = null)
                ProductField.MIN_QTY -> it.copy(minQuantity = value, errorMessage = null)
                ProductField.UNIT -> it.copy(unit = value, errorMessage = null)
            }
        }
    }

    /** استقبال نتيجة مسح الباركود */
    fun onBarcodeScanned(barcode: String) {
        _state.update { it.copy(barcode = barcode) }
    }

    fun clearError() {
        _state.update { it.copy(errorMessage = null) }
    }

    fun save() {
        val s = _state.value
        if (s.isSaving) return
        _state.update { it.copy(isSaving = true, errorMessage = null) }

        viewModelScope.launch {
            val purchasePriceMinor = parseMinorUnits(s.purchasePrice)
            val salePriceMinor = parseMinorUnits(s.salePrice)
            val openingQty = s.openingQuantity.toDoubleOrNull() ?: 0.0
            val minQty = s.minQuantity.toDoubleOrNull() ?: 0.0

            if (s.isEditMode) {
                val existing = app.productRepository.getById(s.productId)
                if (existing == null) {
                    _state.update { it.copy(errorMessage = "المنتج غير موجود", isSaving = false) }
                    return@launch
                }
                val result = productUseCase.updateProduct(
                    existing.copy(
                        name = s.name,
                        barcode = s.barcode.takeIf { it.isNotBlank() },
                        internalCode = s.internalCode.takeIf { it.isNotBlank() },
                        purchasePrice = purchasePriceMinor,
                        salePrice = salePriceMinor,
                        minQuantity = minQty,
                        unit = s.unit
                    )
                )
                handleResult(result)
            } else {
                val result = productUseCase.addProduct(
                    AddProductInput(
                        name = s.name,
                        barcode = s.barcode.takeIf { it.isNotBlank() },
                        internalCode = s.internalCode.takeIf { it.isNotBlank() },
                        purchasePriceMinorUnits = purchasePriceMinor,
                        salePriceMinorUnits = salePriceMinor,
                        openingQuantity = openingQty,
                        minQuantity = minQty,
                        unit = s.unit
                    )
                )
                handleResult(result)
            }
        }
    }

    private fun handleResult(result: ProductOperationResult) {
        when (result) {
            is ProductOperationResult.Success ->
                _state.update { it.copy(isSaved = true, isSaving = false) }
            is ProductOperationResult.Failure ->
                _state.update {
                    it.copy(errorMessage = result.message, isSaving = false)
                }
        }
    }

    companion object {
        /** تحويل نص المبلغ إلى وحدة صغرى. مثال: "15.50" -> 1550 */
        fun parseMinorUnits(text: String): Long {
            val cleaned = text.trim().replace(",", ".")
            if (cleaned.isEmpty()) return 0L
            return (cleaned.toDoubleOrNull() ?: 0.0).let { value ->
                (value * com.hesabi.app.common.Money.SCALE).toLong().coerceAtLeast(0L)
            }
        }
    }
}

enum class ProductField {
    NAME, BARCODE, INTERNAL_CODE, PURCHASE_PRICE, SALE_PRICE,
    OPENING_QTY, MIN_QTY, UNIT
}
