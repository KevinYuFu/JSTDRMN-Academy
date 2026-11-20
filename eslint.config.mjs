import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/** Readers in lib/content.ts that can return a cached row. */
const cachedContentReaders = [
  "loadSkillTree",
  "readCachedSkillTree",
  "listCourses",
  "courseBySlug",
  "lessonsForCourse",
  "listCohorts",
  "listActiveMentors",
  "listEvents",
  "loadPageCopy",
  "loadCourseCatalog",
];

const cachedContentReaderMessage =
  "Checkout and saves must not import a cached reader from lib/content. Read the row with prisma, or loadSkillTreeForWrite for the skill-tree document a save will replace.";

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
    files: ["app/actions.ts", "app/*-actions.ts", "lib/catalog.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [
          {
            name: "@/lib/content",
            importNames: cachedContentReaders,
            message: cachedContentReaderMessage,
          },
          {
            name: "./content",
            importNames: cachedContentReaders,
            message: cachedContentReaderMessage,
          },
          {
            name: "../content",
            importNames: cachedContentReaders,
            message: cachedContentReaderMessage,
          },
        ],
      }],
    },
  },
]);

export default eslintConfig;
