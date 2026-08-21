package com.hesabi.app.util

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * أدوات مساعدة لتنسيق الأرقام والتواريخ بالعربية.
 */

/** تنسيق كمية من رقم عشري (Double) */
fun Double.formatQuantity(): String =
    if (this == this.toLong().toDouble()) this.toLong().toString()
    else String.format(Locale.US, "%.1f", this)

/** تنسيق كمية عدد صحيح (Long) */
fun Long.formatQuantity(): String = this.toString()

/** تنسيق مبلغ من وحدة صغرى */
fun Long.formatMoney(): String = com.hesabi.app.common.Money.format(this)

/** تنسيق مبلغ مع رمز العملة */
fun Long.formatMoney(currencySymbol: String): String =
    com.hesabi.app.common.Money.formatWithCurrency(this, currencySymbol)

private val dateFormatter = SimpleDateFormat("yyyy/MM/dd", Locale.getDefault())
private val dateTimeFormatter = SimpleDateFormat("yyyy/MM/dd HH:mm", Locale.getDefault())
private val timeFormatter = SimpleDateFormat("HH:mm", Locale.getDefault())

fun Long.formatDate(): String = dateFormatter.format(Date(this))
fun Long.formatDateTime(): String = dateTimeFormatter.format(Date(this))
fun Long.formatTime(): String = timeFormatter.format(Date(this))

/** بداية اليوم (midnight) بـ millis */
fun startOfDay(millis: Long): Long {
    val cal = java.util.Calendar.getInstance().apply { timeInMillis = millis }
    cal.set(java.util.Calendar.HOUR_OF_DAY, 0)
    cal.set(java.util.Calendar.MINUTE, 0)
    cal.set(java.util.Calendar.SECOND, 0)
    cal.set(java.util.Calendar.MILLISECOND, 0)
    return cal.timeInMillis
}

/** نهاية اليوم (23:59:59.999) بـ millis */
fun endOfDay(millis: Long): Long = startOfDay(millis) + 24 * 60 * 60 * 1000L - 1

/** بداية اليوم الحالي */
fun todayStart(): Long = startOfDay(System.currentTimeMillis())

/** نهاية اليوم الحالي */
fun todayEnd(): Long = endOfDay(System.currentTimeMillis())

/** بداية الأسبوع الحالي (السبت أول يوم) */
fun startOfWeek(millis: Long = System.currentTimeMillis()): Long {
    val cal = java.util.Calendar.getInstance().apply { timeInMillis = millis }
    val dayOfWeek = cal.get(java.util.Calendar.DAY_OF_WEEK)
    val diff = (dayOfWeek - java.util.Calendar.SATURDAY + 7) % 7
    cal.add(java.util.Calendar.DAY_OF_MONTH, -diff)
    cal.set(java.util.Calendar.HOUR_OF_DAY, 0)
    cal.set(java.util.Calendar.MINUTE, 0)
    cal.set(java.util.Calendar.SECOND, 0)
    cal.set(java.util.Calendar.MILLISECOND, 0)
    return cal.timeInMillis
}

fun endOfWeek(millis: Long = System.currentTimeMillis()): Long =
    startOfDay(startOfWeek(millis)) + 7 * 24 * 60 * 60 * 1000L - 1

/** بداية الشهر الحالي */
fun startOfMonth(millis: Long = System.currentTimeMillis()): Long {
    val cal = java.util.Calendar.getInstance().apply { timeInMillis = millis }
    cal.set(java.util.Calendar.DAY_OF_MONTH, 1)
    cal.set(java.util.Calendar.HOUR_OF_DAY, 0)
    cal.set(java.util.Calendar.MINUTE, 0)
    cal.set(java.util.Calendar.SECOND, 0)
    cal.set(java.util.Calendar.MILLISECOND, 0)
    return cal.timeInMillis
}

/** نهاية الشهر الحالي */
fun endOfMonth(millis: Long = System.currentTimeMillis()): Long {
    val cal = java.util.Calendar.getInstance().apply { timeInMillis = millis }
    cal.set(java.util.Calendar.DAY_OF_MONTH, cal.getActualMaximum(java.util.Calendar.DAY_OF_MONTH))
    return endOfDay(cal.timeInMillis)
}

/** بداية اليوم المخصص من نص yyyy/MM/dd (يُرجع 0 إذا فشل) */
fun startOfDayFromText(text: String): Long =
    try {
        val parts = text.split("/")
        val cal = java.util.Calendar.getInstance()
        cal.set(java.util.Calendar.YEAR, parts[0].toInt())
        cal.set(java.util.Calendar.MONTH, parts[1].toInt() - 1)
        cal.set(java.util.Calendar.DAY_OF_MONTH, parts[2].toInt())
        startOfDay(cal.timeInMillis)
    } catch (_: Exception) {
        0L
    }
