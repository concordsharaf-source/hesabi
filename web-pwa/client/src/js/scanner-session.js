export const isNewContinuousBarcode = (lastCode, rawCode) => {
  const code = String(rawCode || "").trim();
  return Boolean(code) && code !== String(lastCode || "").trim();
};
