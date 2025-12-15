import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Allow using `any` in this codebase to avoid excessive typing friction
      "@typescript-eslint/no-explicit-any": "off",
      // Allow empty interfaces that extend other types (common in UI libs)
      "@typescript-eslint/no-empty-object-type": "off",
      // Allow `require()` style imports where convenient (e.g. Tailwind config)
      "@typescript-eslint/no-require-imports": "off",
    },
  },
);
