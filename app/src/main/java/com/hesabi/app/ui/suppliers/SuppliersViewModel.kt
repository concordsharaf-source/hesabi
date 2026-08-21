package com.hesabi.app.ui.suppliers

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hesabi.app.HesabiApp
import com.hesabi.app.domain.model.Supplier
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class SuppliersUiState(
    val suppliers: List<Supplier> = emptyList(),
    val query: String = ""
)

class SuppliersViewModel(app: HesabiApp) : ViewModel() {

    private val queryFlow = MutableStateFlow("")

    val state: StateFlow<SuppliersUiState> = combine(
        app.purchaseRepository.observeSuppliers(),
        queryFlow
    ) { suppliers, query ->
        val filtered = if (query.isBlank()) {
            suppliers
        } else {
            suppliers.filter { it.name.contains(query.trim(), ignoreCase = true) }
        }
        SuppliersUiState(suppliers = filtered, query = query)
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = SuppliersUiState()
    )

    private val repository = app.purchaseRepository

    fun onQueryChange(query: String) {
        queryFlow.value = query
    }

    fun deleteSupplier(id: Long) {
        viewModelScope.launch {
            repository.softDeleteSupplier(id)
        }
    }
}
