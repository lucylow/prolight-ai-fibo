import 'vitest';

// Extend Vitest's assertion interface with common @testing-library/jest-dom matchers
/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'vitest' {
  interface Assertion<T = any> {
    toBeInTheDocument(): void;
    toBeDisabled(): void;
    toBeEnabled(): void;
    toHaveTextContent(text: string | RegExp, options?: { normalizeWhitespace?: boolean }): void;
  }

  interface AsymmetricMatchersContaining {
    toBeInTheDocument(): void;
    toBeDisabled(): void;
    toBeEnabled(): void;
    toHaveTextContent(text: string | RegExp, options?: { normalizeWhitespace?: boolean }): void;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */


