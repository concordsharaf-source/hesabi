package com.hesabi.app.ui.products

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.CreationExtras
import com.hesabi.app.HesabiApp

/**
 * مصانع إنشاء ProductsViewModel — يحافظ على نفس النسخة عبر كل إعادة تركيب،
 * مما يمنع إعادة تهيئة حالة البحث وبيانات القائمة مع كل ضغطة لوحة مفاتيح.
 */
class ProductsViewModelFactory(
    private val app: HesabiApp
) : ViewModelProvider.Factory {

    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>, extras: CreationExtras): T {
        if (modelClass.isAssignableFrom(ProductsViewModel::class.java)) {
            return ProductsViewModel(app) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class: ${modelClass.name}")
    }
}
