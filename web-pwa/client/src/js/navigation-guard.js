export const getExitGuardAction = ({ exitAllowed = false, hasOpenOverlay = false } = {}) => {
  if (exitAllowed) return "allow-exit";
  if (hasOpenOverlay) return "close-overlay";
  return "confirm-exit";
};

export const leaveAfterExitConfirmation = (goBack, schedule = setTimeout) => {
  goBack();
  schedule(goBack, 70);
};

export const primeExitGuardHistory = (historyApi, href) => {
  const state = { ...(historyApi.state || {}), hesabiExitGuard: true };
  historyApi.replaceState(state, "", href);
  historyApi.pushState(state, "", href);
};
