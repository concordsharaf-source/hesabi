export const BARCODE_RELEASE_DELAY_MS = 650;
export const CAMERA_SCAN_INTERVAL_MS = 120;

const finiteNumber = (value) => Number.isFinite(Number(value));

export const getScannerCameraConstraints = () => ({
  audio: false,
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
    frameRate: { ideal: 24, max: 30 },
  },
});

export const getCameraAssistOptions = (capabilities = {}, settings = {}) => {
  const zoom = capabilities?.zoom || {};
  const zoomMin = Number(zoom.min);
  const zoomMax = Number(zoom.max);
  const canZoom = finiteNumber(zoomMin) && finiteNumber(zoomMax) && zoomMax > zoomMin;
  const focusModes = Array.isArray(capabilities?.focusMode) ? capabilities.focusMode : [capabilities?.focusMode].filter(Boolean);
  const currentZoom = Number(settings?.zoom);
  return {
    canZoom,
    zoomMin: canZoom ? zoomMin : null,
    zoomMax: canZoom ? zoomMax : null,
    zoomStep: canZoom && finiteNumber(zoom.step) && Number(zoom.step) > 0 ? Number(zoom.step) : 0.1,
    zoomValue: canZoom ? Math.min(zoomMax, Math.max(zoomMin, finiteNumber(currentZoom) ? currentZoom : zoomMin)) : null,
    canUseTorch: capabilities?.torch === true,
    canUseContinuousFocus: focusModes.includes("continuous"),
  };
};

export const isNewContinuousBarcode = (lastCode, rawCode) => {
  const code = String(rawCode || "").trim();
  return Boolean(code) && code !== String(lastCode || "").trim();
};

export const shouldReleaseContinuousBarcode = (lastCode, absentSince, now = Date.now()) => Boolean(lastCode) && Number(absentSince) > 0 && now - Number(absentSince) >= BARCODE_RELEASE_DELAY_MS;
