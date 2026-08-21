package com.hesabi.app.ui.details

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.CreationExtras
import com.hesabi.app.HesabiApp

/**
 * مصانع إنشاء ProductFormViewModel — يحافظ على نفس النسخة عبر كل إعادة تركيب (recomposition)،
 * مما يضمن ثبات حقول الإدخال وعدم تجمد الكتابة.
 */
class ProductFormViewModelFactory(
    private val app: HesabiApp,
    private val editProductId: Long? = null
) : ViewModelProvider.Factory {

    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>, extras: CreationExtras): T {
        if (modelClass.isAssignableFrom(ProductFormViewModel::class.java)) {
            return ProductFormViewModel(app, editProductId) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class: ${modelClass.name}")
    }
}
