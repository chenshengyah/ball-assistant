import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.turbo/**",
      "apps/miniapp/miniprogram/**/*.js",
      "apps/miniapp/miniprogram/generated/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },
  {
    files: ["apps/miniapp/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.browser,
        App: "readonly",
        Component: "readonly",
        Page: "readonly",
        getApp: "readonly",
        getCurrentPages: "readonly",
        wx: "readonly"
      }
    }
  }
];
