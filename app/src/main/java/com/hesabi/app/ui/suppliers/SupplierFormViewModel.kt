package com.hesabi.app.ui.suppliers

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hesabi.app.HesabiApp
import com.hesabi.app.domain.model.Supplier
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class SupplierFormUiState(
    val name: String = "",
    val phone: String = "",
    val address: String = "",
    val notes: String = "",
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val isSaved: Boolean = false
)

class SupplierFormViewModel(
    app: HesabiApp,
    private val supplierId: Long?
) : ViewModel() {

    private val repository = app.purchaseRepository

    private val _state = MutableStateFlow(SupplierFormUiState())
    val state: StateFlow<SupplierFormUiState> = _state.asStateFlow()

    init {
        if (supplierId != null) {
            viewModelScope.launch {
                _state.update { it.copy(isLoading = true) }
                val supplier = repository.getSupplier(supplierId)
                if (supplier != null) {
                    _state.value = SupplierFormUiState(
                        name = supplier.name,
                        phone = supplier.phone ?: "",
                        address = supplier.address ?: "",
                        notes = supplier.notes ?: ""
                    )
                }
                _state.update { it.copy(isLoading = false) }
            }
        }
    }

    fun onNameChange(value: String) = _state.update { it.copy(name = value) }
    fun onPhoneChange(value: String) = _state.update { it.copy(phone = value) }
    fun onAddressChange(value: String) = _state.update { it.copy(address = value) }
    fun onNotesChange(value: String) = _state.update { it.copy(notes = value) }

    fun save() {
        val current = _state.value
        val name = current.name.trim()
        if (name.isEmpty()) {
            _state.update { it.copy(errorMessage = "أدخل اسم المورد") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, errorMessage = null) }
            if (supplierId != null) {
                repository.updateSupplier(
                    supplierId, name, current.phone.ifBlank { null },
                    current.address.ifBlank { null }, current.notes.ifBlank { null }
                )
            } else {
                repository.insertSupplier(
                    Supplier(
                        name = name,
                        phone = current.phone.ifBlank { null },
                        address = current.address.ifBlank { null },
                        notes = current.notes.ifBlank { null }
                    )
                )
            }
            _state.update { it.copy(isLoading = false, isSaved = true) }
        }
    }
}

private fun MutableStateFlow<SupplierFormUiState>.update(block: (SupplierFormUiState) -> SupplierFormUiState) {
    value = block(value)
}
