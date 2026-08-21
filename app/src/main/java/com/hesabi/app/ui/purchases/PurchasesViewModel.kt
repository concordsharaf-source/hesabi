package com.hesabi.app.ui.purchases

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hesabi.app.HesabiApp
import com.hesabi.app.domain.model.Purchase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class PurchaseListUiState(
    val purchases: List<Purchase> = emptyList(),
    val supplierNames: Map<Long, String> = emptyMap(),
    val query: String = "",
    val currencySymbol: String = ""
)

class PurchasesViewModel(app: HesabiApp) : ViewModel() {

    private val repository = app.purchaseRepository
    private val queryFlow = MutableStateFlow("")

    private val allPurchases = repository.observePurchases()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    private val supplierNames: MutableStateFlow<Map<Long, String>> = MutableStateFlow(emptyMap())
    private val currencyFlow = MutableStateFlow("")

    init {
        viewModelScope.launch {
            supplierNames.value = repository.getAllSuppliers().associate { it.id to it.name }
            val store = app.settingsUseCase.getStore()
            currencyFlow.value = store?.currencySymbol ?: ""
        }
    }

    val state: StateFlow<PurchaseListUiState> = combine(
        allPurchases,
        queryFlow,
        supplierNames,
        currencyFlow
    ) { purchases, query, names, currency ->
        val filtered = if (query.isBlank()) purchases else {
            purchases.filter { it.invoiceNumber.contains(query.trim(), ignoreCase = true) }
        }
        PurchaseListUiState(
            purchases = filtered,
            supplierNames = names,
            query = query,
            currencySymbol = currency
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = PurchaseListUiState()
    )

    fun onQueryChange(query: String) {
        queryFlow.value = query
    }
}
