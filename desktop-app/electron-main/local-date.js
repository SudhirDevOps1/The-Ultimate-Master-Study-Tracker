/**
 * local-date.js
 * CommonJS implementation of local calendar date logic for Electron main process.
 */

function toLocalDateKey(input = new Date()) {
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromLocalDateKey(key) {
  if (!key || typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key.trim())) {
    const fallback = new Date();
    fallback.setHours(0, 0, 0, 0);
    return fallback;
  }
  const [yStr, mStr, dStr] = key.trim().split("-");
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10) - 1;
  const day = parseInt(dStr, 10);
  return new Date(year, month, day, 0, 0, 0, 0);
}

function localHourMinute(input = new Date()) {
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) {
    const now = new Date();
    return { hour: now.getHours(), minute: now.getMinutes() };
  }
  return {
    hour: d.getHours(),
    minute: d.getMinutes(),
  };
}

module.exports = {
  toLocalDateKey,
  fromLocalDateKey,
  localHourMinute,
};
