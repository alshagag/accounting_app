import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // تجاوز التجاهلات الافتراضية لـ eslint-config-next | Override default ignores of eslint-config-next.
  globalIgnores([
    // تجاهلات eslint-config-next الافتراضية | Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
