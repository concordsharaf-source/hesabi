package com.hesabi.app.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hesabi.app.HesabiApp
import com.hesabi.app.domain.SaleCalculator
import com.hesabi.app.domain.model.Store
import com.hesabi.app.util.endOfDay
import com.hesabi.app.util.startOfDay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn

data class HomeUiState(
    val store: Store? = null,
    val todaySalesTotal: Long = 0L,
    val todayInvoiceCount: Long = 0L,
    val productCount: Long = 0L,
    val inventoryValue: Long = 0L,
    val lowStockCount: Int = 0,
    val currencySymbol: String = ""
)

/**
 * ViewModel الصفحة الرئيسية — Dashboard.
 * تعرض: مبيعات اليوم، عدد فواتير اليوم، عدد المنتجات، قيمة المخزون، المنتجات منخفضة المخزون.
 */
class HomeViewModel(app: HesabiApp) : ViewModel() {

    private val settingsUseCase = app.settingsUseCase
    private val productRepository = app.productRepository
    private val saleRepository = app.saleRepository

    private val trigger = MutableStateFlow(System.currentTimeMillis())

    // قراءة بيانات المتجر مرة واحدة عند إنشاء الـ ViewModel (بدون runBlocking)
    private val storeHolder = MutableStateFlow<Store?>(null)

    init {
        viewModelScope.launch {
            storeHolder.value = runCatching { settingsUseCase.getStore() }.getOrNull()
        }
    }

    val state: StateFlow<HomeUiState> = combine(
        productRepository.observeAll(),
        saleRepository.observeAll(),
        trigger,
        storeHolder
    ) { products, sales, _, store ->
        val now = trigger.value
        val dayStart = startOfDay(now)
        val dayEnd = endOfDay(now)
        val todaySales = sales.filter { it.date in dayStart..dayEnd }
        val todayTotal = todaySales.sumOf { it.total }
        HomeUiState(
            store = store,
            todaySalesTotal = todayTotal,
            todayInvoiceCount = todaySales.size.toLong(),
            productCount = products.size.toLong(),
            inventoryValue = SaleCalculator.calculateInventoryValue(products),
            lowStockCount = products.count { it.quantity <= it.minQuantity && it.quantity > 0 },
            currencySymbol = store?.currencySymbol ?: ""
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = HomeUiState()
    )

    /** إعادة تحميل الإحصائيات */
    fun refresh() {
        trigger.value = System.currentTimeMillis()
    }
}
