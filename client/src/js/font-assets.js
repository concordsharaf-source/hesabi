/**
 * روابط الأصول الخطية المُوطَّنة — حسابي
 *
 * كل الخطوط تُخدَم من الأصل نفسه بدل نطاقات خارجية. السبب عملي لا جمالي:
 * التطبيق يُستخدم من اليمن، وخطوط جوجل قد تكون بطيئة أو غير قابلة للوصول هناك،
 * وكان فشل التحليل يُسقط الواجهة والطباعة إلى Tahoma/Arial. التوطين يجعل الخط
 * يعمل دون اتصال ويُخزَّن مع عامل الخدمة.
 *
 * لماذا روابط مطلقة (document.baseURI) لا نسبية:
 * قوالب الطباعة تُحقن في مستند منفصل — نافذة منبثقة عبر document.write (about:blank)
 * أو iframe عبر srcdoc في غلاف Tauri — والمسار النسبي هناك لا يُحلّ ضد التطبيق.
 * الرابط المطلق يضمن وصول المستند المنفصل إلى الخط.
 */

/* `document.baseURI` غير متاح في Node، واختبارات القوالب تستورد هذه الوحدات مباشرةً
   لتفحص HTML المُنتَج. لذلك يُحلّ الرابط مطلقًا في المتصفح، ويُكتفى بمسار من الجذر
   خارج المتصفح — وكلا الشكلين صحيح في سياقه، والحارس يمنع سقوط الاستيراد. */
const assetUrl = (path) => {
  if (typeof document !== "undefined" && document.baseURI) {
    try {
      return new URL(path, document.baseURI).href;
    } catch {
      /* baseURI غير صالح للحل (about:blank مثلًا) — نكمل إلى المسار من الجذر. */
    }
  }
  return `/${path}`;
};

/* خط الواجهة والفواتير. متغيّر (variable font): ملفان يغطيان كل الأوزان 100–900،
   واحد للمجموعة العربية وواحد للاتينية، ويفصل بينهما unicode-range في cairo.css. */
export const CAIRO_FONT_CSS_URL = assetUrl("fonts/cairo.css");

/* خط مراحل توليد PDF — يُحمَّل عبر FontFace ويُحقن في مستند التصوير. */
export const NOTO_NASKH_ARABIC_FONT_URL = assetUrl("assets/NotoNaskhArabic-Regular_2c8d8205.ttf");
