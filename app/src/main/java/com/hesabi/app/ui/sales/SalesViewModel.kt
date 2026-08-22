package com.hesabi.app.ui.sales

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hesabi.app.HesabiApp
import com.hesabi.app.domain.CartItem
import com.hesabi.app.domain.CheckoutInput
import com.hesabi.app.domain.CheckoutResult
import com.hesabi.app.domain.SaleCalculator
import com.hesabi.app.domain.model.PaymentMethod
import com.hesabi.app.domain.model.Product
import com.hesabi.app.domain.model.SalePaymentType
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class SalesUiState(
    val cart: List<CartItem> = emptyList(),
    val searchQuery: String = "",
    val searchResults: List<Product> = emptyList(),
    val selectedProduct: Product? = null,
    val selectedQuantity: Double = 1.0,
    val subtotal: Long = 0L,
    val discount: Long = 0L,
    val discountInput: String = "",
    val finalTotal: Long = 0L,
    val paidInput: String = "",
    val paymentMethod: PaymentMethod = PaymentMethod.CASH,
    val customerId: Long? = null,
    val customerName: String? = null,
    val paymentType: SalePaymentType = SalePaymentType.CASH,
    val remainingAmount: Long = 0L,
    val errorMessage: String? = null,
    val isCheckingOut: Boolean = false,
    val lastInvoice: String? = null,
    val checkoutSuccess: Boolean = false,
    val currencySymbol: String = ""
)

/**
 * ViewModel شاشة المبيعات (نقطة البيع للكاشير).
 *
 * ملاحظات أمان السلة:
 * - السلة محفوظة في ViewModel وليس في MutableState مؤقّت —
 *   لا تضيع عند إعادة التركيب أو تغيير الشاشة المقصود.
 * - قبل مغادرة الشاشة، تُترك السلة في ViewModel (تبقى متاحة
 *   للرجوع إليها داخل نفس الجلسة). عند إتمام البيع تُفرَّغ تلقائيًا.
 */
class SalesViewModel(app: HesabiApp) : ViewModel() {

    private val productRepository = app.productRepository
    private val checkoutUseCase = app.checkoutUseCase

    private val _state = MutableStateFlow(SalesUiState())
    val state: StateFlow<SalesUiState> = _state.asStateFlow()

    private var searchJob: kotlinx.coroutines.Job? = null

    init {
        viewModelScope.launch {
            val store = app.settingsUseCase.getStore()
            _state.update { it.copy(currencySymbol = store?.currencySymbol ?: "") }
        }
    }

    /** البحث الفوري عن المنتجات (بالاسم أو الباركود أو الكود) */
    fun search(query: String) {
        _state.update { it.copy(searchQuery = query, errorMessage = null) }
        searchJob?.cancel()
        if (query.trim().length < 2) {
            _state.update { it.copy(searchResults = emptyList()) }
            return
        }
        searchJob = viewModelScope.launch {
            val results = productRepository.search(query.trim())
            _state.update { it.copy(searchResults = results) }
        }
    }

    fun clearSearch() {
        _state.update { it.copy(searchQuery = "", searchResults = emptyList()) }
    }

    fun selectProduct(product: Product?) {
        _state.update { 
            it.copy(
                selectedProduct = product, 
                selectedQuantity = 1.0, 
                searchQuery = "", 
                searchResults = emptyList()
            ) 
        }
    }

    fun updateSelectedQuantity(quantity: Double) {
        _state.update { it.copy(selectedQuantity = quantity) }
    }

    fun addSelectedToCart() {
        val product = _state.value.selectedProduct ?: return
        val quantity = _state.value.selectedQuantity
        addToCart(product, quantity)
        selectProduct(null)
    }

    /** استقبال نتيجة مسح الباركود في شاشة البيع */
    fun onBarcodeScanned(barcode: String) {
        viewModelScope.launch {
            val product = productRepository.getByBarcode(barcode)
            if (product != null) {
                selectProduct(product)
            } else {
                _state.update {
                    it.copy(errorMessage = "هذا الباركود غير موجود")
                }
            }
        }
    }

    /** إضافة منتج للسلة مع التحقق من المخزون */
    fun addToCart(product: Product, quantity: Double = 1.0) {
        if (quantity <= 0) return

        val current = _state.value
        val existing = current.cart.find { it.product.id == product.id }

        if (existing != null) {
            val newQty = existing.quantity + quantity
            val check = SaleCalculator.checkStock(product.quantity, newQty, product.name)
            when (check) {
                is com.hesabi.app.domain.StockCheckResult.Ok -> {
                    _state.update { state ->
                        state.copy(
                            cart = state.cart.map { 
                                if (it.product.id == product.id) it.copy(quantity = newQty) else it 
                            }
                        )
                    }
                    recalculate()
                }
                is com.hesabi.app.domain.StockCheckResult.Insufficient ->
                    _state.update { it.copy(errorMessage = "الكمية المتوفرة غير كافية") }
            }
        } else {
            val check = SaleCalculator.checkStock(product.quantity, quantity, product.name)
            when (check) {
                is com.hesabi.app.domain.StockCheckResult.Ok -> {
                    _state.update {
                        it.copy(
                            cart = it.cart + CartItem(product, quantity, product.salePrice),
                            errorMessage = null
                        )
                    }
                    recalculate()
                }
                is com.hesabi.app.domain.StockCheckResult.Insufficient ->
                    _state.update { it.copy(errorMessage = "الكمية المتوفرة غير كافية") }
            }
        }
    }

    fun increaseQuantity(productId: Long) {
        val item = _state.value.cart.find { it.product.id == productId } ?: return
        val newQty = item.quantity + 1
        val check = SaleCalculator.checkStock(item.product.quantity, newQty, item.product.name)
        when (check) {
            is com.hesabi.app.domain.StockCheckResult.Ok -> {
                _state.update { state ->
                    state.copy(
                        cart = state.cart.map { 
                            if (it.product.id == productId) it.copy(quantity = newQty) else it 
                        }
                    )
                }
                recalculate()
            }
            is com.hesabi.app.domain.StockCheckResult.Insufficient ->
                _state.update { it.copy(errorMessage = "الكمية المتوفرة غير كافية") }
        }
    }

    fun decreaseQuantity(productId: Long) {
        val item = _state.value.cart.find { it.product.id == productId } ?: return
        val newQty = item.quantity - 1
        if (newQty <= 0) {
            removeFromCart(productId)
        } else {
            _state.update { state ->
                state.copy(
                    cart = state.cart.map { 
                        if (it.product.id == productId) it.copy(quantity = newQty) else it 
                    }
                )
            }
            recalculate()
        }
    }

    fun removeFromCart(productId: Long) {
        _state.update { state -> state.copy(cart = state.cart.filter { it.product.id != productId }) }
        recalculate()
    }

    fun clearCart() {
        _state.update {
            it.copy(
                cart = emptyList(),
                discount = 0L,
                discountInput = "",
                paidInput = "",
                subtotal = 0L,
                finalTotal = 0L,
                errorMessage = null
            )
        }
    }

    fun updateDiscount(input: String) {
        _state.update { it.copy(discountInput = input, errorMessage = null) }
        recalculate()
    }

    fun updatePaid(input: String) {
        _state.update { it.copy(paidInput = input) }
    }

    fun updatePaymentMethod(method: PaymentMethod) {
        _state.update { it.copy(paymentMethod = method) }
    }

    fun updatePaymentType(type: SalePaymentType) {
        _state.update { 
            it.copy(
                paymentType = type,
                customerId = if (type == SalePaymentType.CASH) null else it.customerId,
                customerName = if (type == SalePaymentType.CASH) null else it.customerName
            ) 
        }
        recalculate()
    }

    fun setCustomer(id: Long?, name: String?) {
        _state.update { it.copy(customerId = id, customerName = name) }
    }

    private fun recalculate() {
        val current = _state.value
        val subtotal = current.cart.sumOf { it.itemTotal() }
        val discount = parseMinorUnits(current.discountInput)
            .coerceAtLeast(0L)
            .coerceAtMost(subtotal)
        val totals = SaleCalculator.calculateFinal(subtotal, discount)
        
        val paid = parseMinorUnits(current.paidInput)
        val remaining = if (current.paymentType == SalePaymentType.CREDIT) totals.final - paid else 0L

        _state.update {
            it.copy(
                subtotal = totals.subtotal,
                discount = totals.discount,
                finalTotal = totals.final,
                remainingAmount = remaining.coerceAtLeast(0L)
            )
        }
    }

    /**
     * إتمام البيع — Transaction واحدة:
     * تحقق → Sale → SaleItems → خصم المخزون → StockMovements → حفظ.
     */
    fun completeSale() {
        val current = _state.value
        if (current.cart.isEmpty() || current.isCheckingOut) return

        if (current.paymentType == SalePaymentType.CREDIT && current.customerId == null) {
            _state.update { it.copy(errorMessage = "يجب اختيار عميل للبيع الآجل") }
            return
        }

        _state.update { it.copy(isCheckingOut = true, errorMessage = null) }

        viewModelScope.launch {
            val paid = parseMinorUnits(current.paidInput)
            val input = CheckoutInput(
                items = current.cart.toList(),
                discountMinorUnits = current.discount,
                paidMinorUnits = paid,
                paymentMethod = current.paymentMethod
            )

            when (val result = checkoutUseCase.execute(
                input = input,
                customerId = current.customerId,
                paymentType = current.paymentType
            )) {
                is CheckoutResult.Success ->
                    _state.update {
                        it.copy(
                            isCheckingOut = false,
                            cart = emptyList(),
                            discount = 0L,
                            discountInput = "",
                            paidInput = "",
                            subtotal = 0L,
                            finalTotal = 0L,
                            remainingAmount = 0L,
                            customerId = null,
                            customerName = null,
                            paymentType = SalePaymentType.CASH,
                            lastInvoice = result.invoiceNumber,
                            checkoutSuccess = true
                        )
                    }
                is CheckoutResult.Failure ->
                    _state.update {
                        it.copy(isCheckingOut = false, errorMessage = result.message)
                    }
            }
        }
    }

    fun clearCheckoutResult() {
        _state.update { it.copy(checkoutSuccess = false, lastInvoice = null) }
    }

    fun clearError() {
        _state.update { it.copy(errorMessage = null) }
    }

    companion object {
        fun parseMinorUnits(text: String): Long {
            val cleaned = text.trim().replace(",", ".")
            if (cleaned.isEmpty()) return 0L
            return (cleaned.toDoubleOrNull() ?: 0.0).let { value ->
                (value * com.hesabi.app.common.Money.SCALE).toLong().coerceAtLeast(0L)
            }
        }
    }
}
