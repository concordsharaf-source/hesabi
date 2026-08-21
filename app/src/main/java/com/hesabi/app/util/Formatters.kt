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
