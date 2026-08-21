package com.hesabi.app.ui.products

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hesabi.app.HesabiApp
import com.hesabi.app.domain.model.Product
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ProductsUiState(
    val products: List<Product> = emptyList(),
    val filtered: List<Product> = emptyList(),
    val searchQuery: String = "",
    val deleteConfirmation: Long? = null,
    val errorMessage: String? = null,
    val deleteSuccess: Boolean = false,
    val hasLinkedSales: Boolean = false
)

/**
 * ViewModel شاشة المنتجات.
 */
class ProductsViewModel(app: HesabiApp) : ViewModel() {

    private val productRepository = app.productRepository
    private val productUseCase = app.productUseCase

    private val _state = MutableStateFlow(ProductsUiState())
    val state: StateFlow<ProductsUiState> = _state.asStateFlow()

    private val searchFlow = MutableStateFlow("")

    val productsList: StateFlow<List<Product>> = combine(
        productRepository.observeAll(),
        searchFlow
    ) { products, query ->
        if (query.isBlank()) products
        else {
            val q = query.trim()
            products.filter { p ->
                p.name.contains(q, ignoreCase = true) ||
                    (p.barcode?.contains(q) == true) ||
                    (p.internalCode?.contains(q) == true)
            }
        }
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = emptyList()
    )

    fun updateSearch(query: String) {
        _state.update { it.copy(searchQuery = query) }
        searchFlow.value = query
    }

    fun clearSearch() {
        _state.update { it.copy(searchQuery = "", deleteConfirmation = null) }
        searchFlow.value = ""
    }

    /** طلب حذف — عرض تأكيد */
    fun requestDelete(productId: Long) {
        _state.update { it.copy(deleteConfirmation = productId, errorMessage = null) }
        viewModelScope.launch {
            val linked = productUseCase.hasLinkedSales(productId)
            _state.update { it.copy(hasLinkedSales = linked) }
        }
    }

    fun cancelDelete() {
        _state.update { it.copy(deleteConfirmation = null, hasLinkedSales = false) }
    }

    /** Soft delete — لا يؤثر على الفواتير */
    fun confirmDelete() {
        val id = _state.value.deleteConfirmation ?: return
        viewModelScope.launch {
            runCatching {
                productUseCase.deleteProduct(id)
            }.onFailure { error ->
                _state.update { it.copy(errorMessage = error.message) }
            }
            _state.update {
                it.copy(
                    deleteConfirmation = null,
                    deleteSuccess = true,
                    errorMessage = null
                )
            }
        }
    }
}
