import html2pdf from "html2pdf.js";

function createPdfStage(html, page) {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const stage = document.createElement("article");
  stage.dir = parsed.documentElement.dir || "rtl";
  stage.lang = parsed.documentElement.lang || "ar";
  stage.style.cssText = `position:fixed;inset:0 auto auto -10000px;width:${page === "thermal" ? "80mm" : "210mm"};padding:0;background:#fff;z-index:-1;`;
  stage.innerHTML = `${[...parsed.head.querySelectorAll("style")].map((style) => style.outerHTML).join("")}${parsed.body.innerHTML}`;
  document.body.appendChild(stage);
  return stage;
}

export async function createPdfFileFromHtml({ html, filename, page = "a4" }) {
  const stage = createPdfStage(html, page);
  try {
    const options = {
      margin: 0,
      filename,
      html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false },
      jsPDF: { unit: "mm", format: page === "thermal" ? [80, 297] : "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    };
    const blob = await html2pdf().set(options).from(stage).toPdf().output("blob");
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
