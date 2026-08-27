export const BUSINESS_TYPES = [
  "بقالة",
  "سوبرماركت",
  "صيدلية",
  "ملابس",
  "جوالات",
  "قطع غيار",
  "مطعم",
  "كافيه",
  "متجر عام",
];

export const DEFAULT_CURRENCY_CODE = "YER";

export const CURRENCIES = [
  { code: "YER", label: "ريال يمني (ر.ي)", symbol: "ر.ي" },
  { code: "SAR", label: "ريال سعودي (ر.س)", symbol: "ر.س" },
  { code: "AED", label: "درهم إماراتي (د.إ)", symbol: "د.إ" },
  { code: "KWD", label: "دينار كويتي (د.ك)", symbol: "د.ك" },
  { code: "QAR", label: "ريال قطري (ر.ق)", symbol: "ر.ق" },
  { code: "EGP", label: "جنيه مصري (ج.م)", symbol: "ج.م" },
  { code: "USD", label: "دولار أمريكي ($)", symbol: "$" },
];

export const UNITS = ["حبة", "علبة", "كرتون", "كيس", "حزمة", "كيلو", "جرام", "لتر", "متر"];
export const PACKAGE_UNITS = ["حبة", "علبة", "كرتون", "كيس", "حزمة", "ربطة", "صندوق"];

const GENERAL_PROFILE = { units: UNITS, packageUnits: PACKAGE_UNITS, defaultUnit: "حبة", defaultPackageUnit: "كرتون" };
export const BUSINESS_PROFILES = {
  "بقالة": GENERAL_PROFILE,
  "سوبرماركت": GENERAL_PROFILE,
  "صيدلية": { units: ["حبة", "شريط", "علبة", "عبوة", "كرتون"], packageUnits: ["شريط", "علبة", "عبوة", "كرتون"], defaultUnit: "حبة", defaultPackageUnit: "علبة" },
  "ملابس": { units: ["قطعة", "طقم", "دزينة", "كيس", "كرتون"], packageUnits: ["قطعة", "طقم", "دزينة", "كيس", "كرتون"], defaultUnit: "قطعة", defaultPackageUnit: "كيس" },
  "جوالات": { units: ["جهاز", "قطعة", "كرتون", "صندوق"], packageUnits: ["جهاز", "كرتون", "صندوق"], defaultUnit: "جهاز", defaultPackageUnit: "صندوق" },
  "قطع غيار": { units: ["قطعة", "طقم", "علبة", "كرتون", "صندوق"], packageUnits: ["قطعة", "طقم", "علبة", "كرتون", "صندوق"], defaultUnit: "قطعة", defaultPackageUnit: "علبة" },
  "مطعم": { units: ["حبة", "كيلو", "جرام", "لتر", "علبة", "كيس", "كرتون"], packageUnits: ["علبة", "كيس", "كرتون", "صندوق"], defaultUnit: "حبة", defaultPackageUnit: "كرتون" },
  "كافيه": { units: ["حبة", "كيلو", "جرام", "لتر", "علبة", "كيس", "كرتون"], packageUnits: ["علبة", "كيس", "كرتون", "صندوق"], defaultUnit: "حبة", defaultPackageUnit: "كرتون" },
  "متجر عام": GENERAL_PROFILE,
};

export const PAYMENT_METHODS = ["نقدي", "تحويل"];

export const ACCOUNT_ROLES = [
  { id: "admin", label: "أدمن" },
  { id: "cashier", label: "كاشير" },
];

export const DAILY_EXPENSE_CATEGORIES = ["أكل وشرب", "مواصلات", "وقود", "صيانة طارئة", "لوازم تشغيل", "تسويق يومي", "مصروفات يومية أخرى"];
export const MONTHLY_EXPENSE_CATEGORIES = ["إيجار", "كهرباء", "ماء", "إنترنت", "رواتب", "اشتراكات", "مصروفات شهرية أخرى"];
export const EXPENSE_CATEGORIES = [...DAILY_EXPENSE_CATEGORIES, ...MONTHLY_EXPENSE_CATEGORIES];

export const NAV_ITEMS = [
  { id: "dashboard", label: "الرئيسية", icon: "grid" },
  { id: "products", label: "المنتجات", icon: "package" },
  { id: "inventory", label: "المخزون", icon: "layers" },
  { id: "sales", label: "المبيعات", icon: "cart" },
  { id: "invoices", label: "الفواتير", icon: "receipt" },
  { id: "customers", label: "العملاء", icon: "users" },
  { id: "customer-payments", label: "دفعات العملاء", icon: "wallet" },
  { id: "suppliers", label: "الموردون", icon: "users" },
  { id: "supplier-payments", label: "دفعات الموردين", icon: "wallet" },
  { id: "purchases", label: "المشتريات", icon: "truck" },
  { id: "expenses", label: "المصروفات", icon: "wallet" },
  { id: "cashbox", label: "الصندوق", icon: "wallet" },
  { id: "transfers", label: "التحويلات", icon: "transfer" },
  { id: "reports", label: "التقارير", icon: "chart" },
  { id: "periodic-inventory", label: "الجرد الدوري", icon: "layers" },
  { id: "accounts", label: "الحسابات", icon: "users" },
  { id: "settings", label: "الإعدادات", icon: "box" },
];
