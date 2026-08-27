import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const PDF_ARABIC_FONT_URL = "https://hesabipwa-2r9mmdzn.manus.space/manus-storage/NotoNaskhArabic-Regular_2c8d8205.ttf";
const toNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
let canvasArabicFontPromise;
const waitWithTimeout = (promise, timeout = 3_000) => Promise.race([promise, new Promise((resolve) => window.setTimeout(resolve, timeout))]);

async function loadCanvasArabicFont() {
  if (!canvasArabicFontPromise) {
    const loadFont = new FontFace("HesabiArabicPdf", `url(${PDF_ARABIC_FONT_URL})`, { style: "normal", weight: "100 900", display: "block" }).load().then((font) => {
      document.fonts.add(font);
      return font;
    }).catch(() => null);
    canvasArabicFontPromise = waitWithTimeout(loadFont);
  }
  return canvasArabicFontPromise;
}

function createPdfStage(html, page) {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const stage = document.createElement("article");
  stage.dir = parsed.documentElement.dir || "rtl";
  stage.lang = parsed.documentElement.lang || "ar";
  stage.dataset.pdfStage = "true";
  stage.style.cssText = `position:fixed;top:0;left:0;width:${page === "thermal" ? "80mm" : "210mm"};min-height:20mm;padding:0;background:#fff;color:#111;z-index:2147483647;pointer-events:none;overflow:visible;`;
  stage.innerHTML = `${[...parsed.head.querySelectorAll("style")].map((style) => style.outerHTML).join("")}${parsed.body.innerHTML}`;
  document.body.appendChild(stage);
  return stage;
}

async function waitForPdfStage(stage) {
  if (!stage.textContent.trim()) throw new Error("لا يوجد محتوى صالح لإنشاء ملف PDF.");
  if (document.fonts?.ready) await waitWithTimeout(document.fonts.ready);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  if (stage.getBoundingClientRect().height < 1 || stage.scrollHeight < 1) throw new Error("تعذر تجهيز محتوى الفاتورة للطباعة.");
}

function downloadPdfFile(file) {
  const url = URL.createObjectURL(file);
  const anchor = Object.assign(document.createElement("a"), { href: url, download: file.name });
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function canSharePdfFile(file) {
  if (typeof navigator.share !== "function") return false;
  try { return typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] }); } catch { return false; }
}

async function fileOrDownload(file, title) {
  if (canSharePdfFile(file)) {
    try {
      await navigator.share({ title, files: [file] });
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") throw error;
    }
  }
  downloadPdfFile(file);
  return "downloaded";
}

function drawThermalInvoiceCanvas({ invoice, customer, storeName, formatMoney, formatAmount, formatDateTime, paymentLabel }) {
  const mm = 12;
  const width = 80 * mm;
  const details = invoice.customerName ? 1 + Number(Boolean(customer?.phone)) + Number(Boolean(customer?.address)) : 0;
  const height = Math.max(1420, (114 + details * 11 + Math.max(1, invoice.items?.length || 0) * 20 + (toNumber(invoice.deliveryFee) > 0 ? 9 : 0)) * mm);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#111111";
  context.direction = "rtl";
  context.textBaseline = "middle";
  const right = 76 * mm;
  const left = 4 * mm;
  const center = 40 * mm;
  let y = 9 * mm;
  const text = (value, x, align = "right", size = 28, weight = 400, direction = "rtl") => {
    context.direction = direction;
    context.textAlign = align;
    context.font = `${weight} ${size}px "HesabiArabicPdf", Tahoma, Arial, sans-serif`;
    context.fillText(String(value ?? ""), x, y);
  };
  const divider = () => {
    context.save(); context.strokeStyle = "#444"; context.setLineDash([6, 5]); context.beginPath(); context.moveTo(left, y); context.lineTo(right, y); context.stroke(); context.restore();
  };
  const pair = (label, value, options = {}) => {
    text(label, right, "right", options.labelSize || 27, options.bold ? 700 : 400);
    text(value, left, "left", options.valueSize || 27, options.bold ? 700 : 400, options.ltr ? "ltr" : "rtl");
    y += options.gap || 6.5 * mm;
  };
  text(storeName || "حسابي", center, "center", 44, 700); y += 8 * mm;
  text("فاتورة بيع", right, "right", 30, 700); text(invoice.invoiceNumber, left, "left", 27, 700, "ltr"); y += 6 * mm;
  text(formatDateTime(invoice.date), center, "center", 20); y += 7 * mm;
  if (invoice.customerName) {
    const cardHeight = (8 + details * 8) * mm;
    context.fillStyle = "#f7f7f7"; context.strokeStyle = "#111"; context.lineWidth = 1.5; context.roundRect(left, y - 5 * mm, right - left, cardHeight, 6); context.fill(); context.stroke(); context.fillStyle = "#111";
    text("بيانات العميل", right - 2 * mm, "right", 30, 700); y += 7 * mm;
    pair("الاسم", invoice.customerName, { gap: 6.5 * mm });
    if (customer?.phone) pair("الهاتف", customer.phone, { ltr: true, gap: 6.5 * mm });
    if (customer?.address) pair("العنوان", customer.address, { gap: 6.5 * mm });
    y += 2 * mm;
  }
  divider(); y += 6 * mm;
  for (const item of invoice.items || []) {
    text(item.productName, right, "right", 30, 700); text(formatMoney(item.total), left, "left", 28, 700, "ltr"); y += 6 * mm;
    text(`${formatAmount(item.quantity)} ${item.unit} × ${formatMoney(item.unitPrice)}`, right, "right", 22); y += 8 * mm;
  }
  divider(); y += 7 * mm;
  pair("الإجمالي قبل الخصم", formatMoney(invoice.subtotal));
  pair("الخصم", formatMoney(invoice.discount));
  if (toNumber(invoice.deliveryFee) > 0) pair(`التوصيل · ${invoice.deliveryChargeType === "customer" ? "على العميل ضمن الفاتورة" : "حساب المحل"}`, formatMoney(invoice.deliveryFee));
  context.strokeStyle = "#111"; context.beginPath(); context.moveTo(left, y - 4 * mm); context.lineTo(right, y - 4 * mm); context.stroke();
  pair("الإجمالي", formatMoney(invoice.total), { bold: true, labelSize: 32, valueSize: 32, gap: 7.5 * mm });
  pair("طريقة السداد", paymentLabel);
  pair("المدفوع", formatMoney(invoice.paidAmount));
  if (invoice.paymentType === "آجل") pair("المتبقي", formatMoney(invoice.remainingAmount));
  y += 3 * mm;
  text("شكرًا لتعاملكم معنا", center, "center", 22);
  return canvas;
}

function drawCustomerAccountCanvas({ account, storeName, formatMoney, formatDateTime }) {
  const mm = 12;
  const width = 210 * mm;
  const rows = account.transactions || [];
  const height = Math.max(297 * mm, (140 + Math.max(1, rows.length) * 16) * mm);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#172e27";
  context.direction = "rtl";
  context.textBaseline = "middle";
  const right = 196 * mm;
  const left = 14 * mm;
  const text = (value, x, y, align = "right", size = 28, weight = 400, direction = "rtl", color = "#172e27") => {
    context.direction = direction;
    context.textAlign = align;
    context.font = `${weight} ${size}px "HesabiArabicPdf", Tahoma, Arial, sans-serif`;
    context.fillStyle = color;
    context.fillText(String(value ?? ""), x, y);
  };
  const line = (fromX, fromY, toX, toY, color = "#d9e0d7", widthPx = 2) => { context.strokeStyle = color; context.lineWidth = widthPx; context.beginPath(); context.moveTo(fromX, fromY); context.lineTo(toX, toY); context.stroke(); };
  let y = 19 * mm;
  text(storeName || "حسابي", right, y, "right", 62, 700, "rtl", "#174c3f");
  y += 9 * mm;
  text("كشف حساب مديونية عميل", right, y, "right", 38, 600, "rtl", "#52645b");
  y += 10 * mm;
  text(`تاريخ الإنشاء: ${formatDateTime(new Date().toISOString())}`, right, y, "right", 26, 400, "rtl", "#52645b");
  y += 11 * mm;

  const cardTop = y - 6 * mm;
  const hasPhone = Boolean(account.customer?.phone);
  const hasAddress = Boolean(account.customer?.address);
  const cardHeight = (hasPhone && hasAddress ? 50 : hasPhone || hasAddress ? 39 : 30) * mm;
  context.fillStyle = "#edf6f0";
  context.strokeStyle = "#1f6b59";
  context.lineWidth = 3;
  context.beginPath();
  context.roundRect(left, cardTop, right - left, cardHeight, 12);
  context.fill(); context.stroke();
  text("بيانات العميل", right - 5 * mm, y + 2 * mm, "right", 38, 700, "rtl", "#174c3f");
  y += 12 * mm;
  const detail = (label, value, ltr = false) => { text(label, right - 5 * mm, y, "right", 30, 600, "rtl", "#52645b"); text(value, left + 5 * mm, y, "left", 34, 700, ltr ? "ltr" : "rtl"); y += 10 * mm; };
  detail("الاسم", account.customer?.name || "");
  if (hasPhone) detail("الهاتف", account.customer.phone, true);
  if (hasAddress) detail("العنوان", account.customer.address);
  y = cardTop + cardHeight + 13 * mm;

  const summary = [
    ["إجمالي المبيعات الآجلة", formatMoney(account.totalSales), "#f4f6f1", "#172e27"],
    ["إجمالي المسدد", formatMoney(account.totalPaid), "#f4f6f1", "#172e27"],
    ["الرصيد المستحق", formatMoney(account.balance), "#1f6b59", "#ffffff"],
  ];
  const boxGap = 4 * mm;
  const boxWidth = (right - left - boxGap * 2) / 3;
  summary.forEach(([label, value, background, color], index) => {
    const x = right - (index + 1) * boxWidth - index * boxGap;
    context.fillStyle = background; context.strokeStyle = background === "#1f6b59" ? "#1f6b59" : "#d9e0d7"; context.lineWidth = 2; context.beginPath(); context.roundRect(x, y, boxWidth, 29 * mm, 10); context.fill(); context.stroke();
    text(label, x + boxWidth - 4 * mm, y + 9 * mm, "right", 25, 600, "rtl", color);
    text(value, x + boxWidth - 4 * mm, y + 20 * mm, "right", 34, 700, "rtl", color);
  });
  y += 41 * mm;
  text("تفاصيل العمليات", right, y, "right", 40, 700, "rtl", "#174c3f");
  y += 9 * mm;
  const columns = [right, 151 * mm, 105 * mm, 59 * mm, left];
  context.fillStyle = "#f4f6f1"; context.fillRect(left, y - 6 * mm, right - left, 12 * mm);
  ["العملية", "التاريخ", "المرجع", "القيمة", "الرصيد بعد العملية"].forEach((label, index) => text(label, columns[index] - (index ? 3 * mm : 0), y, index === 4 ? "left" : "right", 23, 700, "rtl", "#52645b"));
  y += 12 * mm;
  if (!rows.length) { text("لا توجد عمليات مسجلة.", right, y, "right", 30, 400, "rtl", "#52645b"); y += 14 * mm; }
  rows.forEach((transaction) => {
    text(transaction.typeLabel || transaction.type || "", columns[0], y, "right", 26, 700);
    text(formatDateTime(transaction.date), columns[1], y, "right", 20, 400, "rtl", "#52645b");
    text(transaction.invoiceNumber || "—", columns[2], y, "right", 22, 600, "ltr", "#52645b");
    text(formatMoney(transaction.amount), columns[3], y, "right", 24, 700, "ltr", Number(transaction.amount) < 0 ? "#a74340" : "#172e27");
    text(formatMoney(transaction.remainingAmount), columns[4], y, "left", 24, 700, "ltr");
    y += 10 * mm;
    line(left, y - 5 * mm, right, y - 5 * mm);
  });
  y += 7 * mm;
  text("هذا الكشف صادر من حسابي للاستخدام التشغيلي.", width / 2, y, "center", 23, 400, "rtl", "#52645b");
  return canvas;
}

function drawReportCanvas({ rows, storeName, from, to }) {
  const mm = 12;
  const width = 210 * mm;
  const dataRows = rows.slice(1);
  const height = Math.max(297 * mm, (88 + Math.max(1, dataRows.length) * 15) * mm);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.direction = "rtl";
  context.textBaseline = "middle";
  const right = 196 * mm;
  const left = 14 * mm;
  const text = (value, x, y, align = "right", size = 28, weight = 400, color = "#172e27", direction = "rtl") => {
    context.direction = direction;
    context.textAlign = align;
    context.font = `${weight} ${size}px "HesabiArabicPdf", Tahoma, Arial, sans-serif`;
    context.fillStyle = color;
    context.fillText(String(value ?? ""), x, y);
  };
  let y = 20 * mm;
  text(storeName || "حسابي", right, y, "right", 62, 700, "#174c3f");
  y += 9 * mm;
  text("تقرير تشغيلي", right, y, "right", 40, 700, "#172e27");
  y += 9 * mm;
  text(`الفترة: ${from || "بداية السجل"} إلى ${to || "اليوم"}`, right, y, "right", 26, 400, "#52645b");
  y += 10 * mm;
  context.strokeStyle = "#1f6b59";
  context.lineWidth = 3;
  context.beginPath(); context.moveTo(left, y); context.lineTo(right, y); context.stroke();
  y += 11 * mm;
  context.fillStyle = "#e8f2ee";
  context.fillRect(left, y - 7 * mm, right - left, 14 * mm);
  text(rows[0]?.[0] || "البند", right - 5 * mm, y, "right", 28, 700, "#145d4d");
  text(rows[0]?.[1] || "القيمة", left + 5 * mm, y, "left", 28, 700, "#145d4d");
  y += 15 * mm;
  dataRows.forEach(([label, value], index) => {
    if (index % 2 === 1) { context.fillStyle = "#f8fbfa"; context.fillRect(left, y - 7 * mm, right - left, 14 * mm); }
    text(label, right - 5 * mm, y, "right", 28, 600);
    text(value, left + 5 * mm, y, "left", 28, 700, /^[-−]/.test(String(value)) ? "#a74340" : "#172e27");
    context.strokeStyle = "#cad8d3"; context.lineWidth = 1.5; context.beginPath(); context.moveTo(left, y + 7 * mm); context.lineTo(right, y + 7 * mm); context.stroke();
    y += 15 * mm;
  });
  y += 7 * mm;
  text("تقرير صادر من حسابي للاستخدام التشغيلي.", width / 2, y, "center", 23, 400, "#52645b");
  return canvas;
}

function createA4PdfFromCanvas(canvas) {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pixelsPerMm = canvas.width / pageWidth;
  const pageHeightPx = Math.max(1, Math.ceil(pageHeight * pixelsPerMm));
  for (let offsetY = 0; offsetY < canvas.height; offsetY += pageHeightPx) {
    if (offsetY) pdf.addPage();
    const sliceHeight = Math.min(pageHeightPx, canvas.height - offsetY);
    const slice = document.createElement("canvas");
    slice.width = canvas.width; slice.height = sliceHeight;
    slice.getContext("2d").drawImage(canvas, 0, offsetY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
    pdf.addImage(slice.toDataURL("image/png"), "PNG", 0, 0, pageWidth, sliceHeight / pixelsPerMm, undefined, "FAST");
  }
  return pdf;
}

export async function createPdfFileFromHtml({ html, filename, page = "a4" }) {
  const stage = createPdfStage(html, page);
  try {
    await waitForPdfStage(stage);
    const canvas = await html2canvas(stage, { scale: Math.max(3, window.devicePixelRatio || 1), useCORS: true, backgroundColor: "#ffffff", logging: false, windowWidth: stage.scrollWidth, windowHeight: stage.scrollHeight });
    if (canvas.width < 2 || canvas.height < 2) throw new Error("تعذر رسم محتوى الفاتورة لملف PDF.");
    const thermalWidth = 80;
    const thermalHeight = Math.max(40, (canvas.height * thermalWidth) / canvas.width);
    const pdf = new jsPDF({ unit: "mm", format: page === "thermal" ? [thermalWidth, thermalHeight] : "a4", orientation: "portrait", compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pixelsPerMm = canvas.width / pageWidth;
    const pageHeightPx = Math.max(1, Math.floor(pageHeight * pixelsPerMm));
    const addSlice = (offsetY, sliceHeight) => { const slice = document.createElement("canvas"); slice.width = canvas.width; slice.height = sliceHeight; slice.getContext("2d").drawImage(canvas, 0, offsetY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight); pdf.addImage(slice.toDataURL("image/png"), "PNG", 0, 0, pageWidth, sliceHeight / pixelsPerMm, undefined, "FAST"); };
    if (page === "thermal") addSlice(0, canvas.height);
    else for (let offsetY = 0; offsetY < canvas.height; offsetY += pageHeightPx) { if (offsetY) pdf.addPage(); addSlice(offsetY, Math.min(pageHeightPx, canvas.height - offsetY)); }
    const blob = pdf.output("blob");
    if (!blob || blob.size < 800) throw new Error("تعذر إنشاء ملف PDF كامل المحتوى.");
    return new File([blob], filename, { type: "application/pdf" });
  } finally {
    stage.remove();
  }
}

export async function createThermalInvoicePdfFile({ invoice, customer, storeName, formatMoney, formatAmount, formatDateTime, paymentLabel, filename }) {
  await loadCanvasArabicFont();
  const canvas = drawThermalInvoiceCanvas({ invoice, customer, storeName, formatMoney, formatAmount, formatDateTime, paymentLabel });
  const thermalWidth = 80;
  const thermalHeight = (canvas.height * thermalWidth) / canvas.width;
  const pdf = new jsPDF({ unit: "mm", format: [thermalWidth, thermalHeight], orientation: "portrait", compress: true });
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, thermalWidth, thermalHeight, undefined, "FAST");
  const blob = pdf.output("blob");
  if (!blob || blob.size < 800) throw new Error("تعذر إنشاء ملف PDF واضح للفواتير.");
  return new File([blob], filename, { type: "application/pdf" });
}

export async function createCustomerAccountPdfFile({ account, storeName, formatMoney, formatDateTime, filename }) {
  await loadCanvasArabicFont();
  const pdf = createA4PdfFromCanvas(drawCustomerAccountCanvas({ account, storeName, formatMoney, formatDateTime }));
  const blob = pdf.output("blob");
  if (!blob || blob.size < 800) throw new Error("تعذر إنشاء ملف PDF واضح لكشف الحساب.");
  return new File([blob], filename, { type: "application/pdf" });
}

export async function createReportPdfFile({ rows, storeName, from, to, filename }) {
  await loadCanvasArabicFont();
  const pdf = createA4PdfFromCanvas(drawReportCanvas({ rows, storeName, from, to }));
  const blob = pdf.output("blob");
  if (!blob || blob.size < 800) throw new Error("تعذر إنشاء تقرير PDF عربي واضح.");
  return new File([blob], filename, { type: "application/pdf" });
}

export async function shareOrDownloadPdf({ html, filename, title, page = "a4" }) { return fileOrDownload(await createPdfFileFromHtml({ html, filename, page }), title); }
export async function shareOrDownloadInvoicePdf(options) { return fileOrDownload(await createThermalInvoicePdfFile(options), options.title); }
export async function shareOrDownloadCustomerAccountPdf(options) { return fileOrDownload(await createCustomerAccountPdfFile(options), options.title); }

export function printHtmlDocument({ html, target, features }) {
  const popup = window.open("", target, features);
  if (!popup) return false;
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  window.setTimeout(() => popup.print(), 180);
  return true;
}
