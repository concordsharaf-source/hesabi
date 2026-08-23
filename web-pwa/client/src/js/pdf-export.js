import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

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

export async function createPdfFileFromHtml({ html, filename, page = "a4" }) {
  const stage = createPdfStage(html, page);
  try {
    await waitForPdfStage(stage);
    const canvas = await html2canvas(stage, { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false, windowWidth: stage.scrollWidth, windowHeight: stage.scrollHeight });
    if (canvas.width < 2 || canvas.height < 2) throw new Error("تعذر رسم محتوى الفاتورة لملف PDF.");
    const thermalWidth = 80;
    const thermalHeight = Math.max(40, (canvas.height * thermalWidth) / canvas.width);
    const pdf = new jsPDF({ unit: "mm", format: page === "thermal" ? [thermalWidth, thermalHeight] : "a4", orientation: "portrait", compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pixelsPerMm = canvas.width / pageWidth;
    const pageHeightPx = Math.max(1, Math.floor(pageHeight * pixelsPerMm));
    const addSlice = (offsetY, sliceHeight) => {
      const slice = document.createElement("canvas");
      slice.width = canvas.width; slice.height = sliceHeight;
      slice.getContext("2d").drawImage(canvas, 0, offsetY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
      pdf.addImage(slice.toDataURL("image/png"), "PNG", 0, 0, pageWidth, sliceHeight / pixelsPerMm, undefined, "FAST");
    };
    if (page === "thermal") addSlice(0, canvas.height);
    else for (let offsetY = 0; offsetY < canvas.height; offsetY += pageHeightPx) { if (offsetY) pdf.addPage(); addSlice(offsetY, Math.min(pageHeightPx, canvas.height - offsetY)); }
    const blob = pdf.output("blob");
    if (!blob || blob.size < 800) throw new Error("تعذر إنشاء ملف PDF كامل المحتوى.");
    return new File([blob], filename, { type: "application/pdf" });
  } finally {
    stage.remove();
  }
}

export async function shareOrDownloadPdf({ html, filename, title, page = "a4" }) {
  const file = await createPdfFileFromHtml({ html, filename, page });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title, files: [file] });
    return "shared";
  }
  const url = URL.createObjectURL(file);
  const anchor = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return "downloaded";
}

export function printHtmlDocument({ html, target, features }) {
  const popup = window.open("", target, features);
  if (!popup) return false;
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  window.setTimeout(() => popup.print(), 180);
  return true;
}
