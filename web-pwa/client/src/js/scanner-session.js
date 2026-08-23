export const BARCODE_RELEASE_DELAY_MS = 650;

export const isNewContinuousBarcode = (lastCode, rawCode) => {
  const code = String(rawCode || "").trim();
  return Boolean(code) && code !== String(lastCode || "").trim();
};

export const shouldReleaseContinuousBarcode = (lastCode, absentSince, now = Date.now()) => Boolean(lastCode) && Number(absentSince) > 0 && now - Number(absentSince) >= BARCODE_RELEASE_DELAY_MS;
