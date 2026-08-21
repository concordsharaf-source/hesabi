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
    val currencyCode: String = "SAR",
    val currencySymbol: String = "ر.س",
    val errorMessage: String? = null,
    val isCompleted: Boolean = false,
    val isSaving: Boolean = false
)

class OnboardingViewModel(
    private val app: HesabiApp
) : ViewModel() {

    private val _state = MutableStateFlow(OnboardingUiState())
    val state: StateFlow<OnboardingUiState> = _state.asStateFlow()

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
