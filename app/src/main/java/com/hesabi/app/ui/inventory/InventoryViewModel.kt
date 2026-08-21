package com.hesabi.app.ui.inventory

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hesabi.app.HesabiApp
import com.hesabi.app.domain.model.Product
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn

/**
 * ViewModel شاشة المخزون.
 */
class InventoryViewModel(app: HesabiApp) : ViewModel() {

    /**
     * حالات المخزون:
     * - متوفر: الكمية > الحد الأدنى
     * - منخفض: الكمية <= الحد الأدنى && الكمية > 0
     * - نافد: الكمية = 0
     */
    val products: StateFlow<List<Product>> = app.productRepository
        .observeAll()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = emptyList()
        )
}
