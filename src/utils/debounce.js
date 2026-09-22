/**
 * debounce.js
 * Lightweight debouncing utility for low-bandwidth search and rapid input events.
 * Limits CPU cycles and DOM re-renders on low-spec hardware.
 */

export function debounce(func, waitMs = 300) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, waitMs);
  };
}
