import 'vitest';

// Extend Vitest's assertion interface with common @testing-library/jest-dom matchers
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


