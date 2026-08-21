package com.hesabi.app.ui.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hesabi.app.HesabiApp
import com.hesabi.app.domain.ProductOperationResult
import com.hesabi.app.domain.StoreSetupInput
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class OnboardingUiState(
    val storeName: String = "",
    val activityType: String = "",
    val currencyCode: String = "YER",
    val currencySymbol: String = "ر.ي",
    val errorMessage: String? = null,
    val isCompleted: Boolean = false,
    val isSaving: Boolean = false
)

class OnboardingViewModel(
    private val app: HesabiApp
) : ViewModel() {

    private val _state = MutableStateFlow(OnboardingUiState())
    val state: StateFlow<OnboardingUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            // قراءة الإعداد المحفوظ دائمًا من Room عند أول فتح الشاشة.
            // إذا وُجد متجر محفوظ فإن setupCompleted = true ولا تُعرض شاشة الإعداد.
            runCatching {
                app.settingsUseCase.getStore()
            }.onSuccess { store ->
                if (store != null) {
                    _state.update {
                        it.copy(
                            isCompleted = true,
                            storeName = store.name,
                            activityType = store.activityType,
                            currencySymbol = store.currencySymbol
                        )
                    }
                }
            }
        }
    }

    fun updateName(name: String) {
        _state.update { it.copy(storeName = name) }
    }

    fun updateActivityType(type: String) {
        _state.update { it.copy(activityType = type) }
    }

    fun updateCurrency(code: String, symbol: String) {
        _state.update { it.copy(currencyCode = code, currencySymbol = symbol) }
    }

    fun clearError() {
        _state.update { it.copy(errorMessage = null) }
    }

    fun save() {
        val current = _state.value
        if (current.isSaving) return
        _state.update { it.copy(isSaving = true, errorMessage = null) }

        if (current.storeName.isBlank()) {
            _state.update {
                it.copy(errorMessage = "يرجى إدخال اسم المتجر", isSaving = false)
            }
            return
        }
        if (current.activityType.isBlank()) {
            _state.update {
                it.copy(errorMessage = "يرجى اختيار نوع النشاط", isSaving = false)
            }
            return
        }

        viewModelScope.launch {
            val input = StoreSetupInput(
                name = current.storeName,
                activityType = current.activityType,
                currencyCode = current.currencyCode,
                currencySymbol = current.currencySymbol
            )
            app.settingsUseCase.saveStoreSetup(input)
                .onSuccess {
                    _state.update { it.copy(isCompleted = true, isSaving = false) }
                }
                .onFailure { error ->
                    _state.update {
                        it.copy(errorMessage = error.message ?: "حدث خطأ غير متوقع", isSaving = false)
                    }
                }
        }
    }
}
