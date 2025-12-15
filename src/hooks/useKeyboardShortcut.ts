import { useEffect, useRef, useCallback } from 'react';

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

  // Use ref to store the latest callback to avoid dependency issues
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || !key) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      try {
        // Validate event
        if (!event || !event.key) return;

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
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
        ) {
          return;
        }

        event.preventDefault();
        
        // Call callback with error handling
        try {
          callbackRef.current(event);
        } catch (error) {
          console.error('Error in keyboard shortcut callback:', error);
        }
      } catch (error) {
        console.error('Error handling keyboard shortcut:', error);
      }
    };

    try {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        try {
          window.removeEventListener('keydown', handleKeyDown);
        } catch (error) {
          console.error('Error removing keyboard shortcut listener:', error);
        }
      };
    } catch (error) {
      console.error('Error adding keyboard shortcut listener:', error);
      return () => {};
    }
  }, [key, ctrlKey, metaKey, shiftKey, altKey, enabled]);
}

