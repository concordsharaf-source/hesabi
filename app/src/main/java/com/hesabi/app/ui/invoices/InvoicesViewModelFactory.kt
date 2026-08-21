package com.hesabi.app.ui.invoices

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.CreationExtras
import com.hesabi.app.HesabiApp

/**
 * مصانع إنشاء InvoicesViewModel — يحافظ على نفس النسخة عبر كل إعادة تركيب.
 */
class InvoicesViewModelFactory(
    private val app: HesabiApp
) : ViewModelProvider.Factory {

    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>, extras: CreationExtras): T {
        if (modelClass.isAssignableFrom(InvoicesViewModel::class.java)) {
            return InvoicesViewModel(app) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class: ${modelClass.name}")
    }
}
