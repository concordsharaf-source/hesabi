package com.hesabi.app.common

/**
 * تمثيل نقدي دقيق يعتمد على Long بوحدة العملة الصغرى (هللة/سنت)
 * لتجنب أخطاء التقريب الناتجة عن Float/Double.
 *
 * Money = amountInMinorUnits / SCALE
 * مثال: 15.50 = 1550 (إذا كانت SCALE = 100)
 */
@JvmInline
value class Money(private val amountInMinorUnits: Long) : Comparable<Money> {

    val amount: Double
        get() = amountInMinorUnits.toDouble() / SCALE

    fun toMinorUnits(): Long = amountInMinorUnits

    operator fun plus(other: Money): Money =
        Money(amountInMinorUnits + other.amountInMinorUnits)

    operator fun minus(other: Money): Money =
        Money(amountInMinorUnits - other.amountInMinorUnits)

    /** ضرب المبلغ في عدد صحيح (مثلاً: السعر × الكمية) */
    operator fun times(quantity: Int): Money =
        Money(amountInMinorUnits * quantity)

    fun isPositive(): Boolean = amountInMinorUnits > 0
    fun isZero(): Boolean = amountInMinorUnits == 0L
    fun isNegative(): Boolean = amountInMinorUnits < 0L

    fun coerceAtLeast(min: Money): Money =
        Money(maxOf(amountInMinorUnits, min.amountInMinorUnits))

    fun coerceAtMost(max: Money): Money =
        Money(minOf(amountInMinorUnits, max.amountInMinorUnits))

    override fun compareTo(other: Money): Int =
        amountInMinorUnits.compareTo(other.amountInMinorUnits)

    override fun toString(): String = format()

    companion object {
        /**
         * عدد الأجزاء الصغرى في الوحدة الأساسية.
         * 100 لعملة من عملة رئيسية + جزأين صغيرين (ريال/هللة، دولار/سنت).
         */
        const val SCALE: Long = 100L

        val ZERO = Money(0L)

        fun fromMinorUnits(minorUnits: Long): Money = Money(minorUnits)

        fun fromDouble(value: Double): Money =
            Money((value * SCALE).toLong())

        /**
         * تنسيق المبلغ كسلسلة نصية.
         * مثال: 1550 -> "15.50"
         */
        fun format(minorUnits: Long): String {
            val whole = minorUnits / SCALE
            val fraction = (minorUnits % SCALE).let { if (it < 0) it + SCALE else it }
            val sign = if (minorUnits < 0) "-" else ""
            val fractionStr = if (fraction < 10) "0$fraction" else fraction.toString()
            return "$sign$whole.$fractionStr"
        }

        /** تنسيق المبلغ مع رمز العملة */
        fun formatWithCurrency(minorUnits: Long, currencySymbol: String): String {
            return "${format(minorUnits)} $currencySymbol"
        }

        /**
         * مجموع قائمة من الكميات × الأسعار مع تجنب أخطاء التقريب:
         * (السعر بوحدة صغرى × الكمية) يجمع أولاً ثم يقسم مرة واحدة.
         */
        fun sumOfMinorUnits(parts: List<Long>): Long = parts.sumOf { it }
    }
}

/** امتدادات تحويل مريحة */
fun Double.toMoney(): Money = Money.fromDouble(this)
fun Long.toMoney(): Money = Money.fromMinorUnits(this)
fun Money.format(currencySymbol: String = ""): String =
    if (currencySymbol.isEmpty()) Money.format(toMinorUnits())
    else Money.formatWithCurrency(toMinorUnits(), currencySymbol)
