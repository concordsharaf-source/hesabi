package com.hesabi.app

import kotlinx.coroutines.flow.MutableStateFlow

/**
 * حامل مؤقت للمعرّفات التي تُمرَّر بين الشاشات عبر SavedStateHandle
 * عندما لا تكون الوجهة التالية معروفة بنمط route/{id}.
 * تُقرأ القيمة مرة واحدة ثم تُفرَّغ (consume).
 */
object PreselectedState {
    val supplierIdFlow = MutableStateFlow<Long?>(null)

    fun setSupplierId(id: Long) {
        supplierIdFlow.value = id
    }

    fun consumeSupplierId(): Long? {
        val value = supplierIdFlow.value
        supplierIdFlow.value = null
        return value
    }
}
