import { flushSync } from 'react-dom';

/**
 * Progressive View Transitions helper aligned with React View Transitions
 * and the native `document.startViewTransition` API.
 * Gracefully falls back on unsupported browsers or `prefers-reduced-motion: reduce`.
 */
export function runViewTransition(updateCallback, types = []) {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (
    typeof document === 'undefined' ||
    typeof document.startViewTransition !== 'function' ||
    prefersReducedMotion
  ) {
    updateCallback();
    return;
  }

  try {
    // Use v2 object form with transition types when supported (Chromium 125+, Safari 18.2+)
    if (types.length > 0) {
      document.startViewTransition({
        update: () => {
          flushSync(() => {
            updateCallback();
          });
        },
        types,
      });
    } else {
      document.startViewTransition(() => {
        flushSync(() => {
          updateCallback();
        });
      });
    }
  } catch {
    // Fallback for browsers that only accept a callback function
    try {
      document.startViewTransition(() => {
        flushSync(() => {
          updateCallback();
        });
      });
    } catch {
      updateCallback();
    }
  }
}
