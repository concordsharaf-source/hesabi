from pathlib import Path

app = Path('/home/ubuntu/hesabi-repo/client/src/js/app.js')
text = app.read_text()
needle = '<button class="button button--secondary" data-financial-report="inventory">تقرير المخزون</button>'
extra = '''<button class="button button--secondary" data-financial-report="itemBalance">أرصدة المخزون</button><button class="button button--secondary" data-financial-report="itemMovement">حركة الأصناف</button><button class="button button--secondary" data-financial-report="revenueItem">المبيعات حسب الصنف</button><button class="button button--secondary" data-financial-report="revenueCustomer">المبيعات حسب العميل</button><button class="button button--secondary" data-financial-report="dailyDocuments">الوثائق اليومية</button><button class="button button--secondary" data-financial-report="dailyTransactions">العمليات اليومية</button><button class="button button--secondary" data-financial-report="moneyBalance">حركة الصندوق التفصيلية</button><button class="button button--secondary" data-financial-report="accountsTotal">إجمالي الحسابات</button><button class="button button--secondary" data-financial-report="accountBalance">أرصدة الحسابات</button><button class="button button--secondary" data-financial-report="currency">حركة العملات والتحويلات</button>'''
if needle not in text:
    raise SystemExit('report dialog anchor not found')
text = text.replace(needle, needle + extra, 1)
app.write_text(text)

pdf = Path('/home/ubuntu/hesabi-repo/client/src/js/pdf-export.js')
p = pdf.read_text()
p = p.replace('import html2canvas from "html2canvas";\n', '', 1)
start = p.index('function createPdfStage(')
end = p.index('async function loadStoreLogoImage(', start)
p = p[:start] + p[end:]
start = p.index('export async function createPdfFileFromHtml(')
end = p.index('const escapePdfValue =', start)
p = p[:start] + p[end:]
p = p.replace('export async function shareOrDownloadPdf({ html, filename, title, page = "a4" }) { return fileOrDownload(await createPdfFileFromHtml({ html, filename, page }), title); }\n', '', 1)
pdf.write_text(p)
