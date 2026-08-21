package com.hesabi.app.ui.suppliers

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.CreationExtras
import com.hesabi.app.HesabiApp

class SupplierFormViewModelFactory(
    private val app: HesabiApp,
    private val supplierId: Long?
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>, extras: CreationExtras): T {
        if (modelClass.isAssignableFrom(SupplierFormViewModel::class.java)) {
            return SupplierFormViewModel(app, supplierId) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class: ${modelClass.name}")
    }
}
