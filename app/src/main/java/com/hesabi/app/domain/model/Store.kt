package com.hesabi.app.domain.model

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * إعدادات المتجر — تُملأ عند أول تشغيل.
 */
@Entity(tableName = "store")
data class Store(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    val activityType: String,
    val currencySymbol: String,
    val createdAt: Long = System.currentTimeMillis()
)

/** أنواع النشاط التجاري المتاحة */
object BusinessTypes {
    val ALL: List<String> = listOf(
        "بقالة",
        "سوبرماركت",
        "صيدلية",
        "ملابس",
        "جوالات",
        "قطع غيار",
        "مطعم",
        "كافيه",
        "متجر عام"
    )
}

/** قائمة العملات الشائعة (ليست ثابتة على عملة واحدة) */
object Currencies {
    data class Currency(val code: String, val symbol: String)

    val ALL: List<Currency> = listOf(
        Currency("SAR", "ر.س"),
        Currency("AED", "د.إ"),
        Currency("KWD", "د.ك"),
        Currency("QAR", "ر.ق"),
        Currency("BHD", "د.ب"),
        Currency("OMR", "ر.ع"),
        Currency("JOD", "د.أ"),
        Currency("EGP", "ج.م"),
        Currency("USD", "$"),
        Currency("EUR", "€"),
        Currency("GBP", "£"),
        Currency("TRY", "₺")
    )
}

/** وحدات القياس الأساسية للمنتجات */
object Units {
    val ALL: List<String> = listOf(
        "حبة",
        "علبة",
        "كرتون",
        "كيلو",
        "جرام",
        "لتر",
        "متر"
    )
}
