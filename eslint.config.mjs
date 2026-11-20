import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const cachedContentReaderMessage =
  "Checkout, webhooks, and saves must not import a cached reader from lib/content. Read the row with prisma, or loadSkillTreeForWrite for the skill-tree document a save will replace.";

const openCourseMessage =
  "Checkout, webhooks, and saves must not import openCourse. It reads the cached course. Read the row with prisma.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  { files: ["**/*.cjs"], rules: { "@typescript-eslint/no-require-imports": "off" } },
  {
    files: [
      "app/actions.ts",
      "app/*-actions.ts",
      "lib/catalog.ts",
      "app/api/**/route.ts",
      "lib/billing.ts",
      "app/(academy)/(main)/checkout/**",
      "lib/hubspot.ts",
    ],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: ["@/lib/content", "**/lib/content", "./content"],
            allowImportNames: ["refreshContent", "loadSkillTreeForWrite", "saveSkillTree"],
            message: cachedContentReaderMessage,
          },
          {
            group: ["@/lib/learn", "**/lib/learn", "./learn"],
            importNames: ["openCourse"],
            message: openCourseMessage,
          },
        ],
      }],
    },
  },
]);

export default eslintConfig;
