package com.hesabi.app.domain

import com.hesabi.app.data.repository.StoreRepository
import com.hesabi.app.domain.model.Store

/**
 * إعداد المتجر عند أول تشغيل.
 */
data class StoreSetupInput(
    val name: String,
    val activityType: String,
    val currencyCode: String,
    val currencySymbol: String
)

/**
 * منطق إعداد المتجر الأولي.
 */
class SettingsUseCase(private val storeRepository: StoreRepository) {

    /** هل تمت تهيئة المتجر من قبل؟ */
    suspend fun isSetupComplete(): Boolean = storeRepository.getStore() != null

    /**
     * حفظ إعدادات المتجر محليًا في Room.
     * يتم التحقق من صحة المدخلات قبل الحفظ.
     */
    suspend fun saveStoreSetup(input: StoreSetupInput): Result<Store> {
        if (input.name.isBlank()) {
            return Result.failure(IllegalArgumentException("اسم المتجر مطلوب"))
        }
        if (input.activityType.isBlank()) {
            return Result.failure(IllegalArgumentException("نوع النشاط مطلوب"))
        }
        if (input.currencyCode.isBlank() || input.currencySymbol.isBlank()) {
            return Result.failure(IllegalArgumentException("العملة مطلوبة"))
        }

        val store = Store(
            name = input.name.trim(),
            activityType = input.activityType,
            currencySymbol = input.currencySymbol
        )
        runCatching {
            storeRepository.save(store)
            store
        }.onFailure {
            return Result.failure(it)
        }
        return Result.success(store)
    }

    suspend fun getStore(): Store? = storeRepository.getStore()
}
