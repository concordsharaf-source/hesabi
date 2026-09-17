/* ═══════════════════════════════════════════════════════════════════════════════
   حسابات تخطيط صفحات PDF — حسابي
   - هوامش جانبية موحدة لكل المقاسات (النص لا يبدأ من حافة الصفحة)
   - اختيار معامل تكبير الرسم بما لا يتجاوز حدود اللوحات في المتصفحات
     (تجاوز الحد كان سبب إنتاج ملفات PDF فارغة للتقارير الطويلة)
═══════════════════════════════════════════════════════════════════════════════ */

/* عرض الصفحة الكامل بالمليمتر لكل مقاس دعم */
export const PDF_PAGE_WIDTH_MM = { portrait: 210, landscape: 297, thermal: 80 };

/* هامش جانبي فارغ (يمين ويسار) لكل مقاس — يُطرح من عرض المحتوى ويُسند إليه موضع الصورة */
export const PDF_SIDE_MARGIN_MM = { portrait: 10, landscape: 12, thermal: 4 };

export function pdfPageKind(page, isLandscape = false) {
  if (page === "thermal") return "thermal";
  return isLandscape ? "landscape" : "portrait";
}

export function pdfContentWidthMm(page, isLandscape = false) {
  const kind = pdfPageKind(page, isLandscape);
  return PDF_PAGE_WIDTH_MM[kind] - 2 * PDF_SIDE_MARGIN_MM[kind];
}

/* أقصى ارتفاع محتوى (بكسل CSS) يُرسم في دفعة html2canvas واحدة.
   تقسيم الرسم دفعات يمنع تجاوز حدود اللوحات مهما طال التقرير (سبب الـPDF الفارغ). */
export const PDF_RENDER_CHUNK_PX = 10000;

/* حدود اللوحات الآمنة في المتصفحات الشائعة (كروم/سفاري/أندرويد):
   أقصى ضلع 32768 بكسل وأقصى مساحة تقريبًا 268 مليون بكسل. */
export const MAX_CANVAS_SIDE_PX = 32768;
export const MAX_CANVAS_AREA_PX = 268_000_000;

/* يختار معامل التكبير الأعلى الذي يُبقي لوحة الرسم داخل الحدود الآمنة.
   بدون هذا السقف: تقرير طويل × تكبير 3 = لوحة أعلى من الحد → لوحة فارغة → PDF فارغ. */
export function choosePdfScale(widthPx, heightPx, preferred = 3) {
  const w = Math.max(1, Number(widthPx) || 1);
  const h = Math.max(1, Number(heightPx) || 1);
  let scale = Math.min(preferred, MAX_CANVAS_SIDE_PX / h, MAX_CANVAS_SIDE_PX / w);
  scale = Math.min(scale, Math.sqrt(MAX_CANVAS_AREA_PX / (w * h)));
  /* أرضية 0.25: انخفاض أبعد من ذلك يجعل النص غير مقروء، والدفعات تحمي الارتفاع أصلًا */
  return Math.max(0.25, Math.floor(scale * 100) / 100);
}
