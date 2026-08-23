import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const PDF_ARABIC_FONT_URL = "https://hesabipwa-2r9mmdzn.manus.space/manus-storage/NotoNaskhArabic-Regular_2c8d8205.ttf";
let canvasArabicFontPromise;

async function loadCanvasArabicFont() {
  if (!canvasArabicFontPromise) {
    canvasArabicFontPromise = new FontFace("HesabiArabicPdf", `url(${PDF_ARABIC_FONT_URL})`, { style: "normal", weight: "100 900", display: "block" }).load().then((font) => {
      document.fonts.add(font);
      return font;
    });
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
  await document.fonts?.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  if (stage.getBoundingClientRect().height < 1 || stage.scrollHeight < 1) throw new Error("تعذر تجهيز محتوى الفاتورة للطباعة.");
}

function fileOrDownload(file, title) {
  if (navigator.canShare?.({ files: [file] })) return navigator.share({ title, files: [file] }).then(() => "shared");
  const url = URL.createObjectURL(file);
  const anchor = Object.assign(document.createElement("a"), { href: url, download: file.name });
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return Promise.resolve("downloaded");
}

function drawThermalInvoiceCanvas({ invoice, customer, storeName, formatMoney, formatAmount, formatDateTime, paymentLabel }) {
  const mm = 12;
  const width = 80 * mm;
  const details = invoice.customerName ? 1 + Number(Boolean(customer?.phone)) + Number(Boolean(customer?.address)) : 0;
  const height = Math.max(1420, (114 + details * 11 + Math.max(1, invoice.items?.length || 0) * 20) * mm);
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
  context.strokeStyle = "#111"; context.beginPath(); context.moveTo(left, y - 4 * mm); context.lineTo(right, y - 4 * mm); context.stroke();
  pair("الإجمالي", formatMoney(invoice.total), { bold: true, labelSize: 32, valueSize: 32, gap: 7.5 * mm });
  pair("طريقة السداد", paymentLabel);
  pair("المدفوع", formatMoney(invoice.paidAmount));
  if (invoice.paymentType === "آجل") pair("المتبقي", formatMoney(invoice.remainingAmount));
  y += 3 * mm;
  text("شكرًا لتعاملكم معنا", center, "center", 22);
  return canvas;
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

export async function shareOrDownloadPdf({ html, filename, title, page = "a4" }) { return fileOrDownload(await createPdfFileFromHtml({ html, filename, page }), title); }
export async function shareOrDownloadInvoicePdf(options) { return fileOrDownload(await createThermalInvoicePdfFile(options), options.title); }

export function printHtmlDocument({ html, target, features }) {
  const popup = window.open("", target, features);
  if (!popup) return false;
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  window.setTimeout(() => popup.print(), 180);
  return true;
}
