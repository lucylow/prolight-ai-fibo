import { useEffect } from 'react';

/**
 * Hook for handling keyboard shortcuts
 * @param key - The key to listen for (e.g., 'k', 'Escape')
 * @param callback - Function to call when shortcut is pressed
 * @param options - Additional options (modifiers, enabled, etc.)
 */
export function useKeyboardShortcut(
  key: string,
  callback: (event: KeyboardEvent) => void,
  options: {
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    enabled?: boolean;
  } = {}
) {
  const {
    ctrlKey = false,
    metaKey = false,
    shiftKey = false,
    altKey = false,
    enabled = true,
  } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the pressed key matches
      if (event.key.toLowerCase() !== key.toLowerCase()) return;

      // Check modifiers
      if (ctrlKey && !event.ctrlKey) return;
      if (metaKey && !event.metaKey) return;
      if (shiftKey && !event.shiftKey) return;
      if (altKey && !event.altKey) return;

      // Don't trigger if user is typing in an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      event.preventDefault();
      callback(event);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, callback, ctrlKey, metaKey, shiftKey, altKey, enabled]);
}
