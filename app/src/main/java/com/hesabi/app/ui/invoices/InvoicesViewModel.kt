package com.hesabi.app.ui.invoices

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hesabi.app.HesabiApp
import com.hesabi.app.domain.model.Sale
import com.hesabi.app.domain.model.SaleItem
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/**
 * ViewModel شاشة فواتير البيع — تعرض قائمة الفواتير وتفاصيل كل فاتورة.
 */
class InvoicesViewModel(app: HesabiApp) : ViewModel() {

    private val saleRepository = app.saleRepository

    val invoices: StateFlow<List<Sale>> = saleRepository.observeAll()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    private val _items = MutableStateFlow<List<SaleItem>>(emptyList())
    val items: StateFlow<List<SaleItem>> = _items.asStateFlow()

    private val _sale = MutableStateFlow<Sale?>(null)
    val sale: StateFlow<Sale?> = _sale.asStateFlow()

    /** تحميل تفاصيل فاتورة */
    fun loadInvoiceDetails(saleId: Long) {
        viewModelScope.launch {
            _sale.value = saleRepository.getById(saleId)
            _items.value = saleRepository.getItemsForSale(saleId)
        }
    }

    fun clearDetails() {
        _sale.value = null
        _items.value = emptyList()
    }
}
