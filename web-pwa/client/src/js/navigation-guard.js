export const isSecondBackPress = (armedUntil, now = Date.now()) => Number(armedUntil) > now;
