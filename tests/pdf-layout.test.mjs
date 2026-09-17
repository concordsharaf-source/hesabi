/* اختبارات تخطيط صفحات PDF: الهوامش الجانبية وسقف معامل التكبير (مانع الـPDF الفارغ). */
import test from "node:test";
import assert from "node:assert/strict";
import {
  PDF_PAGE_WIDTH_MM,
  PDF_SIDE_MARGIN_MM,
  PDF_RENDER_CHUNK_PX,
  pdfContentWidthMm,
  choosePdfScale,
  MAX_CANVAS_SIDE_PX,
  MAX_CANVAS_AREA_PX,
} from "../client/src/js/pdf-layout.js";

test("كل المقاسات لها هامش جانبي موجب وعرض محتوى أصغر من الصفحة", () => {
  for (const kind of ["portrait", "landscape", "thermal"]) {
    assert.ok(PDF_SIDE_MARGIN_MM[kind] > 0, `هامش جانبي مطلوب للمقاس ${kind}`);
    assert.ok(PDF_PAGE_WIDTH_MM[kind] > 2 * PDF_SIDE_MARGIN_MM[kind], `عرض الصفحة يستوعب الهامشين ${kind}`);
    assert.equal(pdfContentWidthMm(kind === "thermal" ? "thermal" : "a4", kind === "landscape"), PDF_PAGE_WIDTH_MM[kind] - 2 * PDF_SIDE_MARGIN_MM[kind]);
  }
});

test("الفواتير الحرارية لها هامش أصغر من أوراق A4", () => {
  assert.ok(PDF_SIDE_MARGIN_MM.thermal < PDF_SIDE_MARGIN_MM.portrait);
});

test("معامل التكبير يبقى 3 للمحتوى القصير", () => {
  assert.equal(choosePdfScale(794, 1000, 3), 3);
});

test("دفعة الرسم الواحدة تبقى لوحتها داخل حدود المتصفحات بأي تقرير", () => {
  /* التقارير الطويلة تُرسم دفعات بارتفاع PDF_RENDER_CHUNK_PX، فيبقى كل لوح آمنًا */
  const scale = choosePdfScale(794, PDF_RENDER_CHUNK_PX, 3);
  assert.ok(scale * PDF_RENDER_CHUNK_PX <= MAX_CANVAS_SIDE_PX, "ارتفاع لوح الدفعة ضمن الحد");
  assert.ok(scale * 794 * (scale * PDF_RENDER_CHUNK_PX) <= MAX_CANVAS_AREA_PX + 1, "مساحة لوح الدفعة ضمن الحد");
  const wideScale = choosePdfScale(40000, 800, 3);
  assert.ok(wideScale * 40000 <= MAX_CANVAS_SIDE_PX, "عرض اللوح ضمن الحد");
});

test("معامل التكبير له أرضية مقروئية مهما بلغ المحتوى", () => {
  assert.equal(choosePdfScale(794, 500000, 3), 0.25);
});
