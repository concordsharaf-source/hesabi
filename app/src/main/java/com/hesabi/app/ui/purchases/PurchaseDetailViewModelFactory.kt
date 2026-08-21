package com.hesabi.app.ui.purchases

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.CreationExtras
import com.hesabi.app.HesabiApp

class PurchaseDetailViewModelFactory(
    private val app: HesabiApp,
    private val purchaseId: Long
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>, extras: CreationExtras): T {
        if (modelClass.isAssignableFrom(PurchaseDetailViewModel::class.java)) {
            return PurchaseDetailViewModel(app, purchaseId) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class: ${modelClass.name}")
    }
}
