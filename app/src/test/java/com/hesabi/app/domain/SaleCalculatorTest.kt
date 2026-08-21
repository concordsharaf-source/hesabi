package com.hesabi.app.domain

import com.hesabi.app.common.Money
import com.hesabi.app.common.format
import com.hesabi.app.domain.model.Product
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * اختبارات منطق الحسابات المالية (SaleCalculator + Money)
 * بدون أي اعتماد على Android — JUnit خالص.
 */
class SaleCalculatorTest {

    private fun product(
        name: String,
        salePriceMinorUnits: Long,
        purchasePriceMinorUnits: Long = 0L,
        quantity: Double = 10.0
    ) = Product(
        id = 0L,
        name = name,
        barcode = null,
        internalCode = null,
        purchasePrice = purchasePriceMinorUnits,
        salePrice = salePriceMinorUnits,
        quantity = quantity,
        minQuantity = 5.0,
        unit = "حبة",
        imagePath = null,
        createdAt = 0L,
        updatedAt = 0L,
        isDeleted = false
    )

    private fun item(product: Product, quantity: Double) =
        CartItem(product = product, quantity = quantity, unitPrice = product.salePrice)

    @Test
    fun `الإجمالي قبل الخصم يجمع أسعار العناصر بدقة`() {
        val p1 = product("منتج أ", salePriceMinorUnits = 1550) // 15.50
        val p2 = product("منتج ب", salePriceMinorUnits = 2000) // 20.00

        val subtotal = SaleCalculator.calculateSubtotal(
            listOf(item(p1, 2.0), item(p2, 3.0))
        )

        // 1550*2 + 2000*3 = 3100 + 6000 = 9100
        assertEquals(9100L, subtotal)
    }

    @Test
    fun `الإجمالي قبل الخصم يساوي صفرًا لسلة فارغة`() {
        assertEquals(0L, SaleCalculator.calculateSubtotal(emptyList()))
    }

    @Test
    fun `الجزء العشري من الكمية يُهمل في الحسابات الصغرى`() {
        // الكمية 2.7 تُحسب كـ 2 (Double.toLong) كما هو مصمم
        val p = product("منتج أ", salePriceMinorUnits = 1000)
        assertEquals(2000L, SaleCalculator.calculateSubtotal(listOf(item(p, 2.7))))
    }

    @Test
    fun `الخصم لا يتجاوز الإجمالي`() {
        val result = SaleCalculator.calculateFinal(subtotalMinorUnits = 500, discountMinorUnits = 9999)
        assertEquals(500L, result.discount)
        assertEquals(0L, result.final)
    }

    @Test
    fun `الخصم السالب يُعامل كصفر`() {
        val result = SaleCalculator.calculateFinal(subtotalMinorUnits = 5000, discountMinorUnits = -100)
        assertEquals(0L, result.discount)
        assertEquals(5000L, result.final)
    }

    @Test
    fun `الإجمالي النهائي = الإجمالي قبل الخصم ناقص الخصم`() {
        val result = SaleCalculator.calculateFinal(subtotalMinorUnits = 5000, discountMinorUnits = 750)
        assertEquals(5000L, result.subtotal)
        assertEquals(750L, result.discount)
        assertEquals(4250L, result.final)
    }

    @Test
    fun `المتبقي لا يمكن أن يكون سالبًا`() {
        assertEquals(0L, SaleCalculator.calculateRemaining(finalTotal = 1000, paid = 2000))
        assertEquals(300L, SaleCalculator.calculateRemaining(finalTotal = 1000, paid = 700))
    }

    @Test
    fun `التحقق من المخزون يمرر الكمية الصالحة`() {
        val result = SaleCalculator.checkStock(available = 10.0, requested = 5.0, productName = "أ")
        assertTrue(result is StockCheckResult.Ok)
    }

    @Test
    fun `التحقق من المخزون يرفض الكمية الزائدة`() {
        val result = SaleCalculator.checkStock(available = 4.0, requested = 5.0, productName = "أ")
        assertTrue(result is StockCheckResult.Insufficient)
        val insufficient = result as StockCheckResult.Insufficient
        assertEquals(4.0, insufficient.available, 0.0)
        assertEquals(5.0, insufficient.requested, 0.0)
    }

    @Test
    fun `التحقق من المخزون يرفض الكمية الصفرية أو السالبة`() {
        assertTrue(SaleCalculator.checkStock(10.0, 0.0, "أ") is StockCheckResult.Insufficient)
        assertTrue(SaleCalculator.checkStock(10.0, -1.0, "أ") is StockCheckResult.Insufficient)
    }

    @Test
    fun `الكمية الجديدة بعد البيع لا تكون سالبة`() {
        assertEquals(5.0, SaleCalculator.newQuantityAfterSale(10.0, 5.0), 0.0)
        assertEquals(0.0, SaleCalculator.newQuantityAfterSale(2.0, 100.0), 0.0)
    }

    @Test(expected = IllegalArgumentException::class)
    fun `كمية البيع السالبة ترمي استثناء`() {
        SaleCalculator.newQuantityAfterSale(10.0, -1.0)
    }

    @Test
    fun `مقدار تعديل المخزون = الفعلي ناقص الحالي`() {
        assertEquals(2.0, SaleCalculator.adjustmentAmount(20.0, 22.0), 0.0)
        assertEquals(-2.0, SaleCalculator.adjustmentAmount(20.0, 18.0), 0.0)
    }

    @Test
    fun `قيمة المخزون الإجمالية تحسب بسعر الشراء`() {
        val products = listOf(
            product("أ", salePriceMinorUnits = 1000, purchasePriceMinorUnits = 500, quantity = 10.0),
            product("ب", salePriceMinorUnits = 2000, purchasePriceMinorUnits = 800, quantity = 5.0)
        )
        // 500*10 + 800*5 = 5000 + 4000 = 9000
        assertEquals(9000L, SaleCalculator.calculateInventoryValue(products))
    }

    @Test
    fun `Money لا تفقد الدقة عند الجمع والطرح`() {
        val a = Money.fromDouble(15.50)
        val b = Money.fromDouble(20.00)
        assertEquals(3550L, (a + b).toMinorUnits())
        assertEquals(-450L, (a - b).toMinorUnits())
        assertEquals(3100L, (a * 2).toMinorUnits())
    }

    @Test
    fun `تنسيق Money بالعربية`() {
        assertEquals("15.50", Money.format(1550))
        assertEquals("0.05", Money.format(5))
        assertEquals("100.00", Money.format(10000))
        assertEquals("15.50 SAR", Money.formatWithCurrency(1550, "SAR"))
    }

    @Test
    fun `Money من صفر`() {
        val z = Money.ZERO
        assertTrue(z.isZero())
        assertEquals("0.00", z.format())
    }
}
