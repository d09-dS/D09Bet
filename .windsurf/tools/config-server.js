const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3847;
const CONFIG_PATH = path.join(__dirname, "..", "project-init-config.json");
const PROJECT_ROOT = path.join(__dirname, "..", "..");
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const ALLOWED_ORIGINS = ["null", "file://"];

// ---------------------------------------------------------------------------
// Shared Detection Maps -- loaded from detection-maps.json (single source of truth)
// ---------------------------------------------------------------------------
let ALL_MAPS;
try {
  ALL_MAPS = JSON.parse(
    fs.readFileSync(path.join(__dirname, "detection-maps.json"), "utf-8"),
  );
} catch (err) {
  console.error(
    `[FATAL] Failed to load detection-maps.json: ${err.message}\n` +
      `        Ensure the file exists at: ${path.join(__dirname, "detection-maps.json")}\n` +
      `        and contains valid JSON.`,
  );
  process.exit(1);
}
const DETECTION_MAP = ALL_MAPS.npm;
const PYTHON_MAP = ALL_MAPS.python;
const ARCHITECTURE_MAP = ALL_MAPS.architecture;
const JAVA_MAP = ALL_MAPS.java;
const DOTNET_MAP = ALL_MAPS.dotnet;
const GO_MAP = ALL_MAPS.go;
const RUST_MAP = ALL_MAPS.rust;
const PHP_MAP = ALL_MAPS.php;
const RUBY_MAP = ALL_MAPS.ruby;
const DART_MAP = ALL_MAPS.dart;
const ELIXIR_MAP = ALL_MAPS.elixir;
const SCALA_MAP = ALL_MAPS.scala;

// ---------------------------------------------------------------------------
// Well-known directory names and monorepo parent conventions (single source)
// ---------------------------------------------------------------------------
const WELL_KNOWN_DIRS = [
  // Fullstack splits
  "frontend",
  "backend",
  "client",
  "server",
  "web",
  "api",
  "app",
  "src",
  "site",
  "dashboard",
  "admin",
  "gateway",
  "proxy",
  // Shared / common
  "shared",
  "common",
  "core",
  // Mobile / Desktop
  "mobile",
  "desktop",
  // Workers
  "worker",
  "workers",
  // Test dirs (can contain own configs)
  "e2e",
  "test",
  "tests",
  // Docs / tools
  "docs",
  "tools",
  // Infrastructure
  "infra",
];

const MONOREPO_PARENTS = [
  // JS/TS ecosystem
  "apps",
  "packages",
  "libs",
  "modules",
  "services",
  "workspaces",
  "tooling",
  "features",
  "domains",
  "plugins",
  "extensions",
  "components",
  "stacks",
  // Angular
  "projects",
  // Go
  "cmd",
  "internal",
  "pkg",
  // Rust
  "crates",
  // Microservices
  "microservices",
];

// ---------------------------------------------------------------------------
// Nuxt Module Map (shared between root and layer detection)
// ---------------------------------------------------------------------------
const NUXT_MODULE_MAP = {
  "@nuxtjs/tailwindcss": { field: "frontend.styling", value: "tailwind" },
  "@tailwindcss/nuxt": { field: "frontend.styling", value: "tailwind" },
  "@unocss/nuxt": { field: "frontend.styling", value: "unocss" },
  "@nuxtjs/i18n": { arch: "i18n", value: true },
  "@sidebase/nuxt-auth": { arch: "auth", value: "session" },
  "@nuxt/image": null,
  "@pinia/nuxt": { field: "frontend.stateManagement", value: "pinia" },
  "@nuxtjs/apollo": { arch: "apiStyle", value: "graphql" },
  "nuxt-graphql-client": { arch: "apiStyle", value: "graphql" },
  "trpc-nuxt": { arch: "apiStyle", value: "trpc" },
  "@vueuse/nuxt": null,
  "@nuxt/test-utils": null,
  "@nuxtjs/storybook": { devops: "storybook", value: true },
};

// ---------------------------------------------------------------------------
// Nuxt Config Module Detection
// ---------------------------------------------------------------------------
function detectNuxtModules(root) {
  const configFiles = ["nuxt.config.ts", "nuxt.config.js"];
  for (const file of configFiles) {
    const content = readTextSafe(path.join(root, file));
    if (!content) continue;
    const modules = [];
    const modulesMatch = content.match(/modules\s*:\s*\[([\s\S]*?)\]/m);
    if (modulesMatch) {
      const strings = modulesMatch[1].match(/['"]([^'"]+)['"]/g);
      if (strings) {
        for (const s of strings) {
          modules.push(s.replace(/['"]/g, ""));
        }
      }
    }
    return modules;
  }
  return [];
}

// ---------------------------------------------------------------------------
// Config Validation
// ---------------------------------------------------------------------------
function migrateConfigV1toV2(config) {
  if (config.version === 1) {
    config.version = 2;
    const frontendDefaults = {
      uiLibrary: "none",
      bundler: "none",
      formLibrary: "none",
      dataFetching: "none",
    };
    const backendDefaults = {
      validation: "none",
      caching: "none",
      messageQueue: "none",
      realtime: "none",
    };
    const archDefaults = { typescript: false };
    const devopsDefaults = { packageManager: "unknown" };

    config.frontend = { ...frontendDefaults, ...config.frontend };
    config.backend = { ...backendDefaults, ...config.backend };
    config.architecture = { ...archDefaults, ...config.architecture };
    config.devops = { ...devopsDefaults, ...config.devops };
    console.log("[MIGRATE] Config migrated from v1 to v2");
  }
  return config;
}

function validateConfig(config) {
  migrateConfigV1toV2(config);

  const errors = [];
  if (typeof config.version !== "number") {
    errors.push("Missing or invalid 'version' field (must be a number)");
  }
  if (!config.frontend || typeof config.frontend.framework !== "string") {
    errors.push("Missing 'frontend.framework'");
  }
  if (!config.backend || typeof config.backend.framework !== "string") {
    errors.push("Missing 'backend.framework'");
  }
  if (
    config.frontend?.framework === "none" &&
    config.backend?.framework === "none"
  ) {
    errors.push("At least one frontend or backend framework must be selected");
  }
  if (config.architecture?.i18n === true) {
    if (
      !Array.isArray(config.architecture.languages) ||
      config.architecture.languages.length === 0
    ) {
      errors.push("Languages are required when i18n is enabled");
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Project Analysis
// ---------------------------------------------------------------------------
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function dirExists(dirPath) {
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function globMatch(dir, pattern) {
  try {
    const entries = fs.readdirSync(dir);
    const regex = new RegExp(
      "^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$",
    );
    return entries.some((e) => regex.test(e));
  } catch {
    return false;
  }
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function readTextSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function getAllDeps(pkg) {
  return {
    ...((pkg && pkg.dependencies) || {}),
    ...((pkg && pkg.devDependencies) || {}),
  };
}

function detectFromDeps(allDeps, mapEntries) {
  let best = null;
  for (const entry of mapEntries) {
    if (allDeps[entry.dep]) {
      if (!best || entry.priority > best.priority) {
        best = entry;
      }
    }
  }
  return best ? { value: best.value, confidence: "high" } : null;
}

function detectTestingCombo(allDeps, root) {
  const unitFromDeps =
    allDeps["vitest"] || allDeps["@vitest/coverage-v8"] || allDeps["@vitest/ui"]
      ? "vitest"
      : allDeps["jest"] ||
          allDeps["@jest/core"] ||
          allDeps["ts-jest"] ||
          allDeps["babel-jest"]
        ? "jest"
        : allDeps["mocha"]
          ? "mocha"
          : allDeps["ava"]
            ? "ava"
            : allDeps["jasmine"] || allDeps["jasmine-core"]
              ? "jasmine"
              : allDeps["uvu"]
                ? "uvu"
                : allDeps["karma"]
                  ? "karma"
                  : allDeps["tap"]
                    ? "tap"
                    : null;

  const e2eFromDeps =
    allDeps["@playwright/test"] || allDeps["playwright"]
      ? "playwright"
      : allDeps["cypress"]
        ? "cypress"
        : allDeps["nightwatch"]
          ? "nightwatch"
          : allDeps["webdriverio"] || allDeps["@wdio/cli"]
            ? "webdriverio"
            : allDeps["testcafe"]
              ? "testcafe"
              : allDeps["puppeteer"]
                ? "puppeteer"
                : null;

  const unitConfigMap = [
    {
      patterns: [
        "vitest.config.ts",
        "vitest.config.js",
        "vitest.config.mts",
        "vitest.config.mjs",
      ],
      value: "vitest",
    },
    {
      patterns: [
        "jest.config.ts",
        "jest.config.js",
        "jest.config.mjs",
        "jest.config.cjs",
        "jest.config.json",
      ],
      value: "jest",
    },
    {
      patterns: [
        ".mocharc.yml",
        ".mocharc.yaml",
        ".mocharc.json",
        ".mocharc.js",
        ".mocharc.cjs",
      ],
      value: "mocha",
    },
    { patterns: ["karma.conf.js", "karma.conf.ts"], value: "karma" },
  ];
  const e2eConfigMap = [
    {
      patterns: ["playwright.config.ts", "playwright.config.js"],
      value: "playwright",
    },
    {
      patterns: [
        "cypress.config.ts",
        "cypress.config.js",
        "cypress.config.mjs",
        "cypress.config.cjs",
      ],
      value: "cypress",
    },
    {
      patterns: ["nightwatch.conf.js", "nightwatch.json"],
      value: "nightwatch",
    },
    { patterns: ["wdio.conf.ts", "wdio.conf.js"], value: "webdriverio" },
    { patterns: [".testcaferc.json"], value: "testcafe" },
  ];

  let unitFromConfig = null;
  let e2eFromConfig = null;
  const scanDirs = Array.isArray(root) ? root : root ? [root] : [];
  for (const dir of scanDirs) {
    if (unitFromConfig && e2eFromConfig) break;
    if (!unitFromConfig) {
      for (const entry of unitConfigMap) {
        if (unitFromConfig) break;
        for (const p of entry.patterns) {
          if (fileExists(path.join(dir, p))) {
            unitFromConfig = entry.value;
            break;
          }
        }
      }
    }
    if (!e2eFromConfig) {
      for (const entry of e2eConfigMap) {
        if (e2eFromConfig) break;
        for (const p of entry.patterns) {
          if (fileExists(path.join(dir, p))) {
            e2eFromConfig = entry.value;
            break;
          }
        }
      }
    }
  }

  const unit = unitFromDeps || unitFromConfig;
  const e2e = e2eFromDeps || e2eFromConfig;

  if (unit && e2e) return { value: unit + "_" + e2e, confidence: "high" };
  if (unit)
    return { value: unit, confidence: unitFromDeps ? "high" : "medium" };
  if (e2e) return { value: e2e, confidence: e2eFromDeps ? "high" : "medium" };
  return null;
}

function detectQualityCombo(allDeps) {
  const hasEslint = !!allDeps["eslint"];
  const hasPrettier = !!allDeps["prettier"];
  const hasHusky = !!allDeps["husky"];
  const hasLintStaged = !!allDeps["lint-staged"];
  const hasBiome = !!allDeps["@biomejs/biome"];
  const hasOxlint = !!allDeps["oxlint"];
  const hasDprint = !!allDeps["dprint"];

  if (hasEslint && hasPrettier && hasHusky)
    return { value: "eslint_prettier_husky", confidence: "high" };
  if (hasEslint && hasPrettier && hasLintStaged)
    return { value: "eslint_prettier_lintstaged", confidence: "high" };
  if (hasEslint && hasPrettier)
    return { value: "eslint_prettier", confidence: "high" };
  if (hasBiome) return { value: "biome", confidence: "high" };
  if (hasOxlint) return { value: "oxlint", confidence: "high" };
  if (hasDprint) return { value: "dprint", confidence: "high" };
  if (hasEslint) return { value: "eslint", confidence: "high" };
  if (hasPrettier) return { value: "prettier", confidence: "high" };
  return null;
}

function parsePythonDeps(content) {
  const deps = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-"))
      continue;
    const match = trimmed.match(/^([a-zA-Z0-9_-]+)/);
    if (match) deps.push(match[1].toLowerCase());
  }
  return deps;
}

function parsePyprojectDeps(content) {
  const deps = [];
  let inDeps = false;
  const depSectionPattern =
    /^\[(?:project\.dependencies|project\.optional-dependencies(?:\.[^\]]+)?|tool\.poetry\.dependencies|tool\.poetry\.group\.[^\]]+\.dependencies)\]$/;
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (depSectionPattern.test(trimmed)) {
      inDeps = true;
      continue;
    }
    if (trimmed.startsWith("[") && inDeps) {
      inDeps = depSectionPattern.test(trimmed);
      continue;
    }
    if (inDeps) {
      const match = trimmed.match(/^"?([a-zA-Z0-9_-]+)/);
      if (match) deps.push(match[1].toLowerCase());
    }
  }
  return deps;
}

// ---------------------------------------------------------------------------
// Maven pom.xml Parser -- extracts artifactId from <dependency> and <plugin> blocks
// ---------------------------------------------------------------------------
function parseMavenDeps(content) {
  const deps = [];
  const depRegex = /<dependency>\s*[\s\S]*?<\/dependency>/gi;
  const matches = content.match(depRegex);
  if (matches) {
    for (const block of matches) {
      const artifactMatch = block.match(
        /<artifactId>\s*([^<]+)\s*<\/artifactId>/i,
      );
      if (artifactMatch) deps.push(artifactMatch[1].trim());
    }
  }
  const pluginRegex = /<plugin>\s*[\s\S]*?<\/plugin>/gi;
  const pluginMatches = content.match(pluginRegex);
  if (pluginMatches) {
    for (const block of pluginMatches) {
      const artifactMatch = block.match(
        /<artifactId>\s*([^<]+)\s*<\/artifactId>/i,
      );
      if (artifactMatch) deps.push(artifactMatch[1].trim());
    }
  }
  return deps;
}

// ---------------------------------------------------------------------------
// Gradle build.gradle / build.gradle.kts Parser
// ---------------------------------------------------------------------------
function parseGradleDeps(content) {
  const deps = [];
  const patterns = [
    /(?:implementation|api|compileOnly|runtimeOnly|testImplementation|testRuntimeOnly|kapt|annotationProcessor)\s*\(?['"]([^'"]+)['"]\)?/gi,
    /(?:implementation|api|compileOnly|runtimeOnly|testImplementation|testRuntimeOnly|kapt|annotationProcessor)\s*\(\s*['"]([^'"]+)['"]\s*\)/gi,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const parts = match[1].split(":");
      if (parts.length >= 2) deps.push(parts[1]);
    }
  }
  const pluginPattern = /id\s*\(?['"]([^'"]+)['"]\)?/gi;
  let pluginMatch;
  while ((pluginMatch = pluginPattern.exec(content)) !== null) {
    const pluginId = pluginMatch[1];
    if (pluginId.includes("spotless")) deps.push("spotless-plugin-gradle");
    if (pluginId.includes("ktlint")) deps.push("ktlint");
    if (pluginId.includes("detekt")) deps.push("detekt-cli");
    if (pluginId.includes("jacoco")) deps.push("jacoco-maven-plugin");
  }
  return [...new Set(deps)];
}

// ---------------------------------------------------------------------------
// .csproj NuGet Parser -- extracts PackageReference Include values
// ---------------------------------------------------------------------------
function parseCsprojDeps(content) {
  const deps = [];
  const pattern = /<PackageReference\s+Include="([^"]+)"/gi;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    deps.push(match[1]);
  }
  const sdkMatch = content.match(/<Project\s+Sdk="([^"]+)"/i);
  if (sdkMatch) deps.push(sdkMatch[1]);
  return deps;
}

// ---------------------------------------------------------------------------
// go.mod Parser -- extracts module paths from require blocks
// ---------------------------------------------------------------------------
function parseGoModDeps(content) {
  const deps = [];
  const singleReq = /^require\s+(\S+)\s+/gm;
  let match;
  while ((match = singleReq.exec(content)) !== null) {
    deps.push(match[1]);
  }
  const blockMatch = content.match(/require\s*\(([\s\S]*?)\)/g);
  if (blockMatch) {
    for (const block of blockMatch) {
      for (const line of block.split("\n")) {
        const trimmed = line.trim();
        if (
          trimmed.startsWith("//") ||
          trimmed === "require (" ||
          trimmed === ")"
        )
          continue;
        const modMatch = trimmed.match(/^(\S+)\s+/);
        if (modMatch) deps.push(modMatch[1]);
      }
    }
  }
  return deps;
}

// ---------------------------------------------------------------------------
// Cargo.toml Parser -- extracts crate names from [dependencies] etc.
// ---------------------------------------------------------------------------
function parseCargoDeps(content) {
  const deps = [];
  const sections = [
    "[dependencies]",
    "[dev-dependencies]",
    "[build-dependencies]",
  ];
  const lines = content.split("\n");
  let inDeps = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (sections.some((s) => trimmed.toLowerCase() === s.toLowerCase())) {
      inDeps = true;
      continue;
    }
    if (trimmed.startsWith("[") && inDeps) {
      inDeps = false;
      continue;
    }
    if (inDeps && trimmed && !trimmed.startsWith("#")) {
      const crateMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\s*=/);
      if (crateMatch) deps.push(crateMatch[1]);
    }
  }
  return deps;
}

// ---------------------------------------------------------------------------
// composer.json Parser -- extracts package names from require/require-dev
// ---------------------------------------------------------------------------
function parseComposerDeps(content) {
  const deps = [];
  try {
    const composer = JSON.parse(content);
    const allDeps = {
      ...(composer.require || {}),
      ...(composer["require-dev"] || {}),
    };
    for (const pkg of Object.keys(allDeps)) deps.push(pkg);
  } catch {
    /* ignore parse errors */
  }
  return deps;
}

// ---------------------------------------------------------------------------
// Gemfile Parser -- extracts gem names
// ---------------------------------------------------------------------------
function parseGemfileDeps(content) {
  const deps = [];
  const gemPattern = /^\s*gem\s+['"]([^'"]+)['"]/gm;
  let match;
  while ((match = gemPattern.exec(content)) !== null) {
    deps.push(match[1]);
  }
  return deps;
}

// ---------------------------------------------------------------------------
// pubspec.yaml Parser (Dart/Flutter)
// ---------------------------------------------------------------------------
function parsePubspecDeps(content) {
  const deps = [];
  let inDeps = false;
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "dependencies:" || trimmed === "dev_dependencies:") {
      inDeps = true;
      continue;
    }
    if (inDeps && line.match(/^\S/) && !trimmed.startsWith("#")) {
      inDeps = false;
      continue;
    }
    if (inDeps && trimmed && !trimmed.startsWith("#")) {
      const match = trimmed.match(/^([a-zA-Z0-9_]+)\s*:/);
      if (match) deps.push(match[1]);
    }
  }
  return deps;
}

// ---------------------------------------------------------------------------
// mix.exs Parser (Elixir/Phoenix)
// ---------------------------------------------------------------------------
function parseMixExsDeps(content) {
  const deps = [];
  const depsBlock = content.match(/defp?\s+deps\b[\s\S]*?\[\s*([\s\S]*?)\]/);
  if (depsBlock) {
    const atomPattern = /\{:([a-zA-Z0-9_]+)/g;
    let match;
    while ((match = atomPattern.exec(depsBlock[1])) !== null) {
      deps.push(match[1]);
    }
  }
  return deps;
}

// ---------------------------------------------------------------------------
// build.sbt Parser (Scala)
// ---------------------------------------------------------------------------
function parseSbtDeps(content) {
  const deps = [];
  const depPatterns = [/%%?\s*"([^"]+)"\s*%/g, /"([^"]+)"\s*%%?\s*"([^"]+)"/g];
  for (const pattern of depPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (match[2]) {
        deps.push(match[2]);
      } else {
        deps.push(match[1]);
      }
    }
  }
  return [...new Set(deps)];
}

// ---------------------------------------------------------------------------
// deno.json / deno.jsonc Parser
// ---------------------------------------------------------------------------
function parseDenoImports(content) {
  const deps = [];
  try {
    const cleaned = content
      .replace(/\/\/.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    const json = JSON.parse(cleaned);
    const imports = json.imports || {};
    for (const [key, value] of Object.entries(imports)) {
      const cleanKey = key.replace(/\/$/, "").replace(/^\$/, "");
      deps.push(cleanKey);
      if (typeof value === "string") {
        const jsr = value.match(/jsr:@?([^@/]+\/[^@/]+)/);
        if (jsr) deps.push(jsr[1]);
        const npm = value.match(/npm:([^@/]+)/);
        if (npm) deps.push(npm[1]);
        if (value.includes("fresh")) deps.push("fresh");
        if (value.includes("oak")) deps.push("oak");
        if (value.includes("hono")) deps.push("hono");
      }
    }
  } catch {
    /* ignore parse errors */
  }
  return deps;
}

// ---------------------------------------------------------------------------
// Generic helper: apply a detection map against a flat list of dep strings
// ---------------------------------------------------------------------------
const GENERIC_FRAMEWORK_PLACEHOLDERS = new Set([
  "go",
  "rust",
  "spring",
  "laravel",
  "rails",
  "phoenix",
  "play",
  "dotnet",
]);

function applyMapToDeps(deps, map, detected, confidence, isExactMatch) {
  for (const [field, entries] of Object.entries(map)) {
    for (const entry of entries) {
      const found = isExactMatch
        ? deps.includes(entry.dep)
        : deps.some(
            (d) =>
              d === entry.dep ||
              d.startsWith(entry.dep + "/") ||
              d.endsWith("/" + entry.dep),
          );
      if (found) {
        const [section, key] = field.split(".");
        const current = detected[section] && detected[section][key];
        if (
          detected[section] &&
          (current === "none" ||
            current === undefined ||
            GENERIC_FRAMEWORK_PLACEHOLDERS.has(current))
        ) {
          detected[section][key] = entry.value;
          confidence[field] = "high";
        }
        break;
      }
    }
  }
}

function detectPrismaProvider(root) {
  const schemaPath = path.join(root, "prisma", "schema.prisma");
  const content = readTextSafe(schemaPath);
  if (!content) return null;
  const match = content.match(/provider\s*=\s*"([^"]+)"/);
  if (!match) return null;
  const providerMap = {
    postgresql: "postgres",
    mysql: "mysql",
    sqlite: "sqlite",
    mongodb: "mongo",
  };
  return providerMap[match[1]] || null;
}

// ---------------------------------------------------------------------------
// Deep File Scanners
// ---------------------------------------------------------------------------
function detectPackageManager(root) {
  if (
    fileExists(path.join(root, "bun.lockb")) ||
    fileExists(path.join(root, "bun.lock"))
  )
    return "bun";
  if (fileExists(path.join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (fileExists(path.join(root, "yarn.lock"))) return "yarn";
  if (fileExists(path.join(root, "package-lock.json"))) return "npm";
  return "unknown";
}

function detectTypeScript(root) {
  if (fileExists(path.join(root, "tsconfig.json"))) return true;
  if (fileExists(path.join(root, "tsconfig.app.json"))) return true;
  if (fileExists(path.join(root, "tsconfig.base.json"))) return true;
  return false;
}

function detectShadcn(root) {
  if (fileExists(path.join(root, "components.json"))) {
    const config = readJsonSafe(path.join(root, "components.json"));
    if (config && (config.$schema || config.style || config.tailwind)) {
      return true;
    }
  }
  return false;
}

function detectDrizzleProvider(root) {
  const configFiles = [
    "drizzle.config.ts",
    "drizzle.config.js",
    "drizzle.config.mjs",
  ];
  for (const file of configFiles) {
    const content = readTextSafe(path.join(root, file));
    if (!content) continue;
    if (content.includes("pg") || content.includes("postgres"))
      return "postgres";
    if (content.includes("mysql")) return "mysql";
    if (content.includes("sqlite") || content.includes("better-sqlite"))
      return "sqlite";
    if (content.includes("turso") || content.includes("libsql")) return "turso";
  }
  return null;
}

function detectI18nLanguages(root) {
  const languages = new Set();
  const i18nDirs = [
    "i18n",
    "locales",
    "lang",
    "languages",
    "translations",
    "messages",
  ];

  for (const dir of i18nDirs) {
    const dirPath = path.join(root, dir);
    if (!dirExists(dirPath)) continue;
    try {
      const entries = fs.readdirSync(dirPath);
      for (const entry of entries) {
        const match = entry.match(
          /^([a-z]{2}(?:-[A-Z]{2})?)(?:\.json|\.ya?ml|\.ts|\.js)?$/i,
        );
        if (match) languages.add(match[1].toUpperCase());
        if (fs.statSync(path.join(dirPath, entry)).isDirectory()) {
          const code = entry.match(/^([a-z]{2}(?:-[A-Z]{2})?)$/i);
          if (code) languages.add(code[1].toUpperCase());
        }
      }
    } catch {
      /* ignore */
    }
  }

  const srcI18n = path.join(root, "src", "i18n");
  if (dirExists(srcI18n)) {
    try {
      const entries = fs.readdirSync(srcI18n);
      for (const entry of entries) {
        const match = entry.match(
          /^([a-z]{2}(?:-[A-Z]{2})?)(?:\.json|\.ya?ml|\.ts|\.js)?$/i,
        );
        if (match) languages.add(match[1].toUpperCase());
      }
    } catch {
      /* ignore */
    }
  }

  return Array.from(languages).sort();
}

function detectProjectStructure(root) {
  const patterns = [];
  const srcDir = path.join(root, "src");
  const appDir = path.join(root, "app");
  const pagesDir = path.join(root, "pages");

  const structureDirs = [
    { dir: "src/components", pattern: "components" },
    { dir: "src/hooks", pattern: "hooks" },
    { dir: "src/composables", pattern: "composables" },
    { dir: "src/utils", pattern: "utils" },
    { dir: "src/lib", pattern: "lib" },
    { dir: "src/services", pattern: "services" },
    { dir: "src/api", pattern: "api" },
    { dir: "src/store", pattern: "store" },
    { dir: "src/stores", pattern: "stores" },
    { dir: "src/models", pattern: "models" },
    { dir: "src/types", pattern: "types" },
    { dir: "src/interfaces", pattern: "interfaces" },
    { dir: "src/guards", pattern: "guards" },
    { dir: "src/pipes", pattern: "pipes" },
    { dir: "src/interceptors", pattern: "interceptors" },
    { dir: "src/middleware", pattern: "middleware" },
    { dir: "src/modules", pattern: "modules" },
    { dir: "src/features", pattern: "features" },
    { dir: "src/domain", pattern: "domain" },
    { dir: "src/infrastructure", pattern: "infrastructure" },
    { dir: "src/application", pattern: "application" },
    { dir: "src/presentation", pattern: "presentation" },
    { dir: "src/shared", pattern: "shared" },
    { dir: "src/core", pattern: "core" },
    { dir: "src/common", pattern: "common" },
    { dir: "src/config", pattern: "config" },
    { dir: "src/constants", pattern: "constants" },
    { dir: "src/dto", pattern: "dto" },
    { dir: "src/entities", pattern: "entities" },
    { dir: "src/repositories", pattern: "repositories" },
    { dir: "src/controllers", pattern: "controllers" },
    { dir: "src/resolvers", pattern: "resolvers" },
    { dir: "src/schemas", pattern: "schemas" },
    { dir: "src/layouts", pattern: "layouts" },
    { dir: "src/views", pattern: "views" },
    { dir: "src/pages", pattern: "pages" },
    { dir: "src/assets", pattern: "assets" },
    { dir: "src/styles", pattern: "styles" },
    { dir: "src/plugins", pattern: "plugins" },
    { dir: "src/directives", pattern: "directives" },
    { dir: "src/tests", pattern: "tests" },
    { dir: "src/__tests__", pattern: "tests" },
    { dir: "tests", pattern: "tests" },
    { dir: "test", pattern: "tests" },
    { dir: "e2e", pattern: "e2e" },
    { dir: "cypress", pattern: "e2e" },
    { dir: "app", pattern: "app-router" },
    { dir: "pages", pattern: "pages-router" },
    { dir: "server", pattern: "server" },
    { dir: "prisma", pattern: "prisma" },
    { dir: "drizzle", pattern: "drizzle" },
    { dir: "migrations", pattern: "migrations" },
    { dir: "db", pattern: "db" },
    { dir: "scripts", pattern: "scripts" },
    { dir: "docs", pattern: "docs" },
    { dir: "public", pattern: "public" },
    { dir: "static", pattern: "static" },
  ];

  for (const { dir, pattern } of structureDirs) {
    if (dirExists(path.join(root, dir))) {
      if (!patterns.includes(pattern)) patterns.push(pattern);
    }
  }

  return patterns;
}

function detectArchitecturePattern(patterns) {
  if (
    patterns.includes("domain") &&
    patterns.includes("infrastructure") &&
    patterns.includes("application")
  )
    return "clean-architecture";
  if (patterns.includes("domain") && patterns.includes("infrastructure"))
    return "hexagonal";
  if (patterns.includes("features") || patterns.includes("modules"))
    return "feature-based";
  if (
    patterns.includes("controllers") &&
    patterns.includes("services") &&
    patterns.includes("models")
  )
    return "mvc";
  if (patterns.includes("controllers") && patterns.includes("services"))
    return "layered";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Programming Language Detection (file-extension scanning)
// ---------------------------------------------------------------------------
function detectProgrammingLanguages(root, workspacePaths) {
  const EXT_TO_LANG = {
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".mts": "TypeScript",
    ".cts": "TypeScript",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".mjs": "JavaScript",
    ".cjs": "JavaScript",
    ".py": "Python",
    ".pyw": "Python",
    ".java": "Java",
    ".kt": "Kotlin",
    ".kts": "Kotlin",
    ".cs": "C#",
    ".go": "Go",
    ".rs": "Rust",
    ".php": "PHP",
    ".rb": "Ruby",
    ".ex": "Elixir",
    ".exs": "Elixir",
    ".scala": "Scala",
    ".sc": "Scala",
    ".dart": "Dart",
    ".swift": "Swift",
    ".c": "C",
    ".h": "C",
    ".cpp": "C++",
    ".cc": "C++",
    ".cxx": "C++",
    ".hpp": "C++",
    ".r": "R",
    ".lua": "Lua",
    ".zig": "Zig",
    ".nim": "Nim",
    ".clj": "Clojure",
    ".cljs": "Clojure",
    ".erl": "Erlang",
    ".hrl": "Erlang",
    ".hs": "Haskell",
    ".ml": "OCaml",
    ".mli": "OCaml",
    ".fs": "F#",
    ".fsx": "F#",
    ".groovy": "Groovy",
    ".gvy": "Groovy",
    ".pl": "Perl",
    ".pm": "Perl",
    ".vue": "Vue SFC",
    ".svelte": "Svelte SFC",
  };

  const SKIP_DIRS = new Set([
    "node_modules",
    ".git",
    ".svn",
    ".hg",
    "vendor",
    "dist",
    "build",
    ".next",
    ".nuxt",
    ".output",
    ".cache",
    "__pycache__",
    ".tox",
    "target",
    "bin",
    "obj",
    ".gradle",
    ".idea",
    ".vscode",
    ".windsurf",
    "coverage",
    ".nyc_output",
    "tmp",
    "temp",
  ]);

  const languages = new Set();

  function scanDir(dir, depth) {
    if (depth > 3) return;
    try {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        if (entry.startsWith(".") && depth > 0) continue;
        const fullPath = path.join(dir, entry);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            if (!SKIP_DIRS.has(entry)) {
              scanDir(fullPath, depth + 1);
            }
          } else if (stat.isFile()) {
            const ext = path.extname(entry).toLowerCase();
            const lang = EXT_TO_LANG[ext];
            if (lang) languages.add(lang);
          }
        } catch {
          /* skip inaccessible entries */
        }
      }
    } catch {
      /* skip inaccessible dirs */
    }
  }

  // Scan project root
  scanDir(root, 0);

  // Also scan workspace paths that may be outside root scan depth
  if (workspacePaths && workspacePaths.length > 0) {
    for (const ws of workspacePaths) {
      const wsPath = typeof ws === "string" ? ws : ws.path;
      const wsDir = path.join(root, wsPath);
      if (dirExists(wsDir)) scanDir(wsDir, 1);
    }
  }

  // Infer from known config files as fallback
  if (
    fileExists(path.join(root, "go.mod")) ||
    fileExists(path.join(root, "go.work"))
  )
    languages.add("Go");
  if (fileExists(path.join(root, "Cargo.toml"))) languages.add("Rust");
  if (
    fileExists(path.join(root, "pom.xml")) ||
    fileExists(path.join(root, "build.gradle")) ||
    fileExists(path.join(root, "build.gradle.kts"))
  )
    languages.add("Java");
  if (fileExists(path.join(root, "mix.exs"))) languages.add("Elixir");
  if (fileExists(path.join(root, "build.sbt"))) languages.add("Scala");
  if (fileExists(path.join(root, "pubspec.yaml"))) languages.add("Dart");
  if (fileExists(path.join(root, "composer.json"))) languages.add("PHP");
  if (fileExists(path.join(root, "Gemfile"))) languages.add("Ruby");
  if (
    fileExists(path.join(root, "deno.json")) ||
    fileExists(path.join(root, "deno.jsonc"))
  )
    languages.add("TypeScript");
  if (fileExists(path.join(root, "tsconfig.json"))) languages.add("TypeScript");

  return Array.from(languages).sort();
}

function detectMonorepoWorkspaces(root) {
  const pkg = readJsonSafe(path.join(root, "package.json"));
  const patterns = [];

  // npm/yarn/bun workspaces from package.json
  if (pkg) {
    const workspaces = pkg.workspaces;
    if (workspaces) {
      const wsPatterns = Array.isArray(workspaces)
        ? workspaces
        : workspaces.packages || [];
      patterns.push(...wsPatterns);
    }
  }

  // pnpm-workspace.yaml
  const pnpmWs = readTextSafe(path.join(root, "pnpm-workspace.yaml"));
  if (pnpmWs) {
    let inPackages = false;
    for (const line of pnpmWs.split("\n")) {
      const trimmed = line.trim();
      if (trimmed === "packages:" || trimmed === "packages :") {
        inPackages = true;
        continue;
      }
      if (inPackages && trimmed.startsWith("-")) {
        const pkg = trimmed.replace(/^-\s*/, "").replace(/['"]/g, "").trim();
        if (pkg && !patterns.includes(pkg)) patterns.push(pkg);
      } else if (inPackages && trimmed && !trimmed.startsWith("#")) {
        inPackages = false;
      }
    }
  }

  // Heuristic: check common monorepo directories even without formal config
  for (const hDir of MONOREPO_PARENTS) {
    const absH = path.join(root, hDir);
    if (dirExists(absH) && !patterns.some((p) => p.startsWith(hDir))) {
      try {
        const entries = fs.readdirSync(absH);
        const hasPkgJson = entries.some((e) =>
          fileExists(path.join(absH, e, "package.json")),
        );
        if (hasPkgJson) patterns.push(hDir + "/*");
      } catch {
        /* ignore */
      }
    }
  }

  if (patterns.length === 0) return [];

  const found = [];
  for (const pattern of patterns) {
    const baseDir = pattern
      .replace(/\/\*\*$/, "")
      .replace(/\/\*$/, "")
      .replace(/\*$/, "");
    const absDir = path.join(root, baseDir);
    if (!dirExists(absDir)) continue;
    try {
      const entries = fs.readdirSync(absDir);
      for (const entry of entries) {
        const entryPath = path.join(absDir, entry);
        if (!fs.statSync(entryPath).isDirectory()) continue;
        const pkgPath = path.join(entryPath, "package.json");
        if (fileExists(pkgPath)) {
          const wpkg = readJsonSafe(pkgPath);
          if (wpkg) {
            found.push({
              name: wpkg.name || entry,
              path: baseDir + "/" + entry,
            });
          }
        }
      }
    } catch {
      /* ignore */
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// Collect all deps from workspace packages (merges all package.json deps)
// ---------------------------------------------------------------------------
function collectWorkspaceDeps(root, workspaces) {
  const allDeps = {};
  for (const ws of workspaces) {
    const wsPath = path.join(root, ws.path, "package.json");
    const wpkg = readJsonSafe(wsPath);
    if (wpkg) {
      Object.assign(
        allDeps,
        wpkg.dependencies || {},
        wpkg.devDependencies || {},
      );
    }
  }
  return allDeps;
}

// ---------------------------------------------------------------------------
// Collect all directories to scan (root + workspaces + well-known subdirs + monorepo children)
// ---------------------------------------------------------------------------
function collectAllScanDirs(root, workspaces, nuxtLayerDirs) {
  const dirs = new Set();
  dirs.add(root);

  for (const dir of WELL_KNOWN_DIRS) {
    const absDir = path.join(root, dir);
    if (dirExists(absDir)) dirs.add(absDir);
  }

  for (const parent of MONOREPO_PARENTS) {
    const parentDir = path.join(root, parent);
    if (!dirExists(parentDir)) continue;
    try {
      const entries = fs.readdirSync(parentDir);
      for (const entry of entries) {
        const entryDir = path.join(parentDir, entry);
        try {
          if (!fs.statSync(entryDir).isDirectory()) continue;
        } catch {
          continue;
        }
        if (
          fileExists(path.join(entryDir, "package.json")) ||
          fileExists(path.join(entryDir, "tsconfig.json")) ||
          fileExists(path.join(entryDir, "go.mod")) ||
          fileExists(path.join(entryDir, "Cargo.toml")) ||
          fileExists(path.join(entryDir, "pyproject.toml")) ||
          fileExists(path.join(entryDir, "requirements.txt")) ||
          fileExists(path.join(entryDir, "composer.json")) ||
          fileExists(path.join(entryDir, "Gemfile")) ||
          fileExists(path.join(entryDir, "pom.xml")) ||
          fileExists(path.join(entryDir, "mix.exs")) ||
          fileExists(path.join(entryDir, "build.sbt")) ||
          fileExists(path.join(entryDir, "pubspec.yaml")) ||
          fileExists(path.join(entryDir, "deno.json")) ||
          fileExists(path.join(entryDir, "deno.jsonc")) ||
          fileExists(path.join(entryDir, "angular.json")) ||
          fileExists(path.join(entryDir, "wrangler.toml")) ||
          fileExists(path.join(entryDir, "Makefile")) ||
          fileExists(path.join(entryDir, "Dockerfile")) ||
          globMatch(entryDir, "build.gradle*") ||
          globMatch(entryDir, "*.csproj") ||
          globMatch(entryDir, "nuxt.config.*") ||
          globMatch(entryDir, "next.config.*") ||
          globMatch(entryDir, "svelte.config.*")
        ) {
          dirs.add(entryDir);
        }
      }
    } catch {
      /* ignore */
    }
  }

  // Scan ALL direct children of root for dependency indicator files
  // Catches project-specific directories not in WELL_KNOWN_DIRS or MONOREPO_PARENTS
  try {
    const rootEntries = fs.readdirSync(root);
    for (const entry of rootEntries) {
      if (entry.startsWith(".")) continue;
      const entryDir = path.join(root, entry);
      if (dirs.has(entryDir)) continue;
      try {
        if (!fs.statSync(entryDir).isDirectory()) continue;
      } catch {
        continue;
      }
      if (
        fileExists(path.join(entryDir, "package.json")) ||
        fileExists(path.join(entryDir, "tsconfig.json")) ||
        fileExists(path.join(entryDir, "go.mod")) ||
        fileExists(path.join(entryDir, "Cargo.toml")) ||
        fileExists(path.join(entryDir, "pyproject.toml")) ||
        fileExists(path.join(entryDir, "requirements.txt")) ||
        fileExists(path.join(entryDir, "composer.json")) ||
        fileExists(path.join(entryDir, "Gemfile")) ||
        fileExists(path.join(entryDir, "pom.xml")) ||
        fileExists(path.join(entryDir, "mix.exs")) ||
        fileExists(path.join(entryDir, "build.sbt")) ||
        fileExists(path.join(entryDir, "pubspec.yaml")) ||
        fileExists(path.join(entryDir, "deno.json")) ||
        fileExists(path.join(entryDir, "deno.jsonc")) ||
        fileExists(path.join(entryDir, "angular.json")) ||
        fileExists(path.join(entryDir, "wrangler.toml")) ||
        fileExists(path.join(entryDir, "Makefile")) ||
        fileExists(path.join(entryDir, "Dockerfile")) ||
        globMatch(entryDir, "build.gradle*") ||
        globMatch(entryDir, "*.csproj") ||
        globMatch(entryDir, "nuxt.config.*") ||
        globMatch(entryDir, "next.config.*") ||
        globMatch(entryDir, "svelte.config.*")
      ) {
        dirs.add(entryDir);
      }
    }
  } catch {
    /* ignore */
  }

  if (workspaces && workspaces.length > 0) {
    for (const ws of workspaces) {
      const wsDir = path.join(root, ws.path);
      if (dirExists(wsDir)) dirs.add(wsDir);
    }
  }

  if (nuxtLayerDirs && nuxtLayerDirs.length > 0) {
    for (const ld of nuxtLayerDirs) {
      if (dirExists(ld)) dirs.add(ld);
    }
  }

  return Array.from(dirs);
}

// ---------------------------------------------------------------------------
// Scan workspace paths and well-known subdirs for config files
// ---------------------------------------------------------------------------
function scanForConfigFiles(root, workspaces) {
  const configHits = [];
  const dirsToScan = [];

  // Add workspace paths
  for (const ws of workspaces) {
    dirsToScan.push(path.join(root, ws.path));
  }

  // Add well-known fullstack subdirectories
  for (const dir of WELL_KNOWN_DIRS) {
    const absDir = path.join(root, dir);
    if (dirExists(absDir)) dirsToScan.push(absDir);
  }

  const configPatterns = [
    {
      pattern: "tailwind.config.*",
      field: "frontend.styling",
      value: "tailwind",
    },
    { pattern: "nuxt.config.*", field: "frontend.framework", value: "nuxt" },
    { pattern: "next.config.*", field: "frontend.framework", value: "nextjs" },
    { pattern: "angular.json", field: "frontend.framework", value: "angular" },
    {
      pattern: "svelte.config.*",
      field: "frontend.framework",
      value: "svelte",
    },
    { pattern: "vite.config.*", field: "frontend.bundler", value: "vite" },
    { pattern: "components.json", field: "_shadcn", value: true },
    { pattern: "uno.config.*", field: "frontend.styling", value: "unocss" },
    { pattern: "panda.config.*", field: "frontend.styling", value: "panda" },
    { pattern: "vitest.config.*", field: "devops.testing", value: "vitest" },
    { pattern: "jest.config.*", field: "devops.testing", value: "jest" },
    { pattern: "cypress.config.*", field: "devops.testing", value: "cypress" },
    {
      pattern: "playwright.config.*",
      field: "devops.testing",
      value: "playwright",
    },
    { pattern: "biome.json", field: "devops.quality", value: "biome" },
    { pattern: ".oxlintrc.json", field: "devops.quality", value: "oxlint" },
  ];

  for (const dir of dirsToScan) {
    for (const check of configPatterns) {
      if (check.pattern.includes("*")) {
        if (globMatch(dir, check.pattern)) {
          configHits.push({ ...check, dir });
        }
      } else if (fileExists(path.join(dir, check.pattern))) {
        configHits.push({ ...check, dir });
      }
    }
  }

  return configHits;
}

// ---------------------------------------------------------------------------
// Scan Nuxt layers for config files and dependencies
// ---------------------------------------------------------------------------
function scanNuxtLayers(root) {
  const layerDeps = {};
  const layerModules = [];
  const layerDirs = [];

  // Check common Nuxt layer directories
  const layerParents = ["layers", "packages", "modules"];
  for (const parent of layerParents) {
    const parentDir = path.join(root, parent);
    if (!dirExists(parentDir)) continue;
    try {
      const entries = fs.readdirSync(parentDir);
      for (const entry of entries) {
        const entryDir = path.join(parentDir, entry);
        if (!fs.statSync(entryDir).isDirectory()) continue;
        // Check for nuxt.config in layer
        const hasNuxtConfig =
          fileExists(path.join(entryDir, "nuxt.config.ts")) ||
          fileExists(path.join(entryDir, "nuxt.config.js"));
        const hasPkgJson = fileExists(path.join(entryDir, "package.json"));
        if (hasNuxtConfig || hasPkgJson) {
          layerDirs.push(entryDir);
          // Collect deps from layer package.json
          if (hasPkgJson) {
            const lpkg = readJsonSafe(path.join(entryDir, "package.json"));
            if (lpkg) {
              Object.assign(
                layerDeps,
                lpkg.dependencies || {},
                lpkg.devDependencies || {},
              );
            }
          }
          // Collect modules from layer nuxt.config
          const layerMods = detectNuxtModules(entryDir);
          layerModules.push(...layerMods);
        }
      }
    } catch {
      /* ignore */
    }
  }

  return { layerDeps, layerModules, layerDirs };
}

// ---------------------------------------------------------------------------
// Collect deps from well-known fullstack subdirectories
// ---------------------------------------------------------------------------
function collectFullstackSubdirDeps(root) {
  const allDeps = {};
  const filesFound = [];

  for (const dir of WELL_KNOWN_DIRS) {
    const absDir = path.join(root, dir);
    if (!dirExists(absDir)) continue;

    // package.json
    const pkgPath = path.join(absDir, "package.json");
    if (fileExists(pkgPath)) {
      const pkg = readJsonSafe(pkgPath);
      if (pkg) {
        Object.assign(
          allDeps,
          pkg.dependencies || {},
          pkg.devDependencies || {},
        );
        filesFound.push(dir + "/package.json");
      }
    }

    // requirements.txt
    const reqPath = path.join(absDir, "requirements.txt");
    if (fileExists(reqPath)) {
      filesFound.push(dir + "/requirements.txt");
    }

    // pyproject.toml
    const pyprojectPath = path.join(absDir, "pyproject.toml");
    if (fileExists(pyprojectPath)) {
      filesFound.push(dir + "/pyproject.toml");
    }

    // pom.xml
    if (fileExists(path.join(absDir, "pom.xml"))) {
      filesFound.push(dir + "/pom.xml");
    }

    // build.gradle / build.gradle.kts
    if (
      fileExists(path.join(absDir, "build.gradle")) ||
      fileExists(path.join(absDir, "build.gradle.kts"))
    ) {
      filesFound.push(dir + "/build.gradle");
    }

    // go.mod
    if (fileExists(path.join(absDir, "go.mod"))) {
      filesFound.push(dir + "/go.mod");
    }

    // Cargo.toml
    if (fileExists(path.join(absDir, "Cargo.toml"))) {
      filesFound.push(dir + "/Cargo.toml");
    }

    // composer.json
    if (fileExists(path.join(absDir, "composer.json"))) {
      filesFound.push(dir + "/composer.json");
    }

    // Gemfile
    if (fileExists(path.join(absDir, "Gemfile"))) {
      filesFound.push(dir + "/Gemfile");
    }
  }

  return { deps: allDeps, files: filesFound };
}

// ---------------------------------------------------------------------------
// Parse settings.gradle(.kts) for Gradle multi-module subprojects
// ---------------------------------------------------------------------------
function parseGradleSettings(root) {
  const settingsFiles = ["settings.gradle", "settings.gradle.kts"];
  for (const sf of settingsFiles) {
    const content = readTextSafe(path.join(root, sf));
    if (!content) continue;
    const modules = [];
    const includePattern = /include\s*\(?['":]([^'")]+)['")\s,]*/g;
    let match;
    while ((match = includePattern.exec(content)) !== null) {
      let mod = match[1].replace(/^:/, "").replace(/:/g, "/");
      modules.push(mod);
    }
    // Also match: include("module1", "module2")
    const multiInclude = /include\s*\(\s*((?:['"][^'"]+['"],?\s*)+)\)/g;
    let multiMatch;
    while ((multiMatch = multiInclude.exec(content)) !== null) {
      const inner = multiMatch[1];
      const names = inner.match(/['"]([^'"]+)['"]/g);
      if (names) {
        for (const n of names) {
          const mod = n
            .replace(/['"]/g, "")
            .replace(/^:/, "")
            .replace(/:/g, "/");
          if (!modules.includes(mod)) modules.push(mod);
        }
      }
    }
    return modules;
  }
  return [];
}

// ---------------------------------------------------------------------------
// Parse <modules> from Maven parent pom.xml
// ---------------------------------------------------------------------------
function parseMavenModules(content) {
  const modules = [];
  const modulesBlock = content.match(/<modules>([\s\S]*?)<\/modules>/i);
  if (modulesBlock) {
    const modulePattern = /<module>\s*([^<]+)\s*<\/module>/gi;
    let match;
    while ((match = modulePattern.exec(modulesBlock[1])) !== null) {
      modules.push(match[1].trim());
    }
  }
  return modules;
}

// ---------------------------------------------------------------------------
// Recursively find files matching a pattern up to maxDepth
// ---------------------------------------------------------------------------
function findFilesRecursive(dir, extension, maxDepth, currentDepth) {
  if (currentDepth === undefined) currentDepth = 0;
  if (currentDepth >= maxDepth) return [];
  const results = [];
  try {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      if (
        entry.startsWith(".") ||
        entry === "node_modules" ||
        entry === "bin" ||
        entry === "obj"
      )
        continue;
      const fullPath = path.join(dir, entry);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isFile() && entry.endsWith(extension)) {
          results.push(fullPath);
        } else if (stat.isDirectory()) {
          results.push(
            ...findFilesRecursive(
              fullPath,
              extension,
              maxDepth,
              currentDepth + 1,
            ),
          );
        }
      } catch {
        /* ignore permission errors */
      }
    }
  } catch {
    /* ignore */
  }
  return results;
}

// ---------------------------------------------------------------------------
// Parse go.work for Go multi-module workspaces
// ---------------------------------------------------------------------------
function parseGoWork(root) {
  const content = readTextSafe(path.join(root, "go.work"));
  if (!content) return [];
  const modules = [];
  const useBlock = content.match(/use\s*\(([\s\S]*?)\)/g);
  if (useBlock) {
    for (const block of useBlock) {
      for (const line of block.split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed === "use (" || trimmed === ")")
          continue;
        if (
          trimmed.startsWith("./") ||
          trimmed.startsWith("../") ||
          /^[a-zA-Z]/.test(trimmed)
        ) {
          modules.push(trimmed.replace(/^\.\//, ""));
        }
      }
    }
  }
  // Single-line use directives
  const singleUse = /^use\s+(\S+)/gm;
  let match;
  while ((match = singleUse.exec(content)) !== null) {
    const mod = match[1].replace(/^\.\//, "");
    if (!modules.includes(mod)) modules.push(mod);
  }
  return modules;
}

// ---------------------------------------------------------------------------
// Parse [workspace] members from Cargo.toml
// ---------------------------------------------------------------------------
function parseCargoWorkspace(root) {
  const content = readTextSafe(path.join(root, "Cargo.toml"));
  if (!content) return [];
  const members = [];
  const wsMatch = content.match(
    /\[workspace\]([\s\S]*?)(?=\n\[(?!workspace)|\n*$)/,
  );
  if (!wsMatch) return [];
  const membersMatch = wsMatch[1].match(/members\s*=\s*\[([\s\S]*?)\]/);
  if (membersMatch) {
    const items = membersMatch[1].match(/['"]([^'"]+)['"]/g);
    if (items) {
      for (const item of items) {
        const member = item.replace(/['"]/g, "").trim();
        members.push(member);
      }
    }
  }
  // Expand glob patterns like "crates/*"
  const expanded = [];
  for (const member of members) {
    if (member.includes("*")) {
      const baseDir = member.replace(/\/\*$/, "").replace(/\*$/, "");
      const absDir = path.join(root, baseDir);
      if (dirExists(absDir)) {
        try {
          const entries = fs.readdirSync(absDir);
          for (const entry of entries) {
            if (fileExists(path.join(absDir, entry, "Cargo.toml"))) {
              expanded.push(baseDir + "/" + entry);
            }
          }
        } catch {
          /* ignore */
        }
      }
    } else {
      expanded.push(member);
    }
  }
  return expanded;
}

// ---------------------------------------------------------------------------
// Scan common subdirectories for Python dependency files
// ---------------------------------------------------------------------------
function scanPythonSubdirs(root) {
  const found = [];
  const subdirs = [
    "packages",
    "libs",
    "services",
    "apps",
    "modules",
    "backend",
    "api",
    "server",
    "worker",
    "src",
  ];
  for (const dir of subdirs) {
    const absDir = path.join(root, dir);
    if (!dirExists(absDir)) continue;
    try {
      const entries = fs.readdirSync(absDir);
      for (const entry of entries) {
        const entryDir = path.join(absDir, entry);
        if (!fs.statSync(entryDir).isDirectory()) continue;
        const reqFile = path.join(entryDir, "requirements.txt");
        const pyprojectFile = path.join(entryDir, "pyproject.toml");
        if (fileExists(reqFile)) {
          found.push({
            path: reqFile,
            parser: parsePythonDeps,
            name: dir + "/" + entry + "/requirements.txt",
          });
        }
        if (fileExists(pyprojectFile)) {
          found.push({
            path: pyprojectFile,
            parser: parsePyprojectDeps,
            name: dir + "/" + entry + "/pyproject.toml",
          });
        }
      }
    } catch {
      /* ignore */
    }
  }
  // Also check direct subdirectory dep files (e.g., backend/requirements.txt)
  for (const dir of subdirs) {
    const reqFile = path.join(root, dir, "requirements.txt");
    const pyprojectFile = path.join(root, dir, "pyproject.toml");
    if (fileExists(reqFile)) {
      found.push({
        path: reqFile,
        parser: parsePythonDeps,
        name: dir + "/requirements.txt",
      });
    }
    if (fileExists(pyprojectFile)) {
      found.push({
        path: pyprojectFile,
        parser: parsePyprojectDeps,
        name: dir + "/pyproject.toml",
      });
    }
  }
  return found;
}

function detectEnvHints(root) {
  const hints = {};
  const envFiles = [
    ".env",
    ".env.local",
    ".env.development",
    ".env.example",
    ".env.sample",
  ];
  for (const envFile of envFiles) {
    const content = readTextSafe(path.join(root, envFile));
    if (!content) continue;
    if (content.match(/DATABASE_URL.*postgres/i)) hints.database = "postgres";
    else if (content.match(/DATABASE_URL.*mysql/i)) hints.database = "mysql";
    else if (content.match(/DATABASE_URL.*mongo/i)) hints.database = "mongo";
    else if (content.match(/DATABASE_URL.*sqlite/i)) hints.database = "sqlite";
    if (content.match(/REDIS_URL|REDIS_HOST/i)) hints.caching = "redis";
    if (content.match(/SUPABASE_URL/i)) hints.database = "supabase";
    if (content.match(/NEXT_PUBLIC_SUPABASE/i)) hints.database = "supabase";
    if (content.match(/FIREBASE/i)) hints.database = "firebase";
    if (content.match(/SENTRY_DSN/i)) hints.monitoring = "sentry";
    if (content.match(/STRIPE_/i)) hints.payments = "stripe";
    if (content.match(/CLOUDINARY/i)) hints.media = "cloudinary";
    if (content.match(/AWS_/i)) hints.cloud = "aws";
    if (content.match(/AZURE_/i)) hints.cloud = "azure";
    if (content.match(/GCP_|GOOGLE_CLOUD/i)) hints.cloud = "gcp";
  }
  return hints;
}

function detectDockerServices(root) {
  const composeFiles = [
    "docker-compose.yml",
    "docker-compose.yaml",
    "compose.yml",
    "compose.yaml",
  ];
  for (const file of composeFiles) {
    const content = readTextSafe(path.join(root, file));
    if (!content) continue;
    const services = [];
    const serviceMatches = content.match(/^\s{2,4}(\w[\w-]*):\s*$/gm);
    if (serviceMatches) {
      for (const match of serviceMatches) {
        const name = match.trim().replace(/:$/, "");
        services.push(name);
      }
    }
    if (content.includes("postgres")) services.push("_hint:postgres");
    if (content.includes("mysql")) services.push("_hint:mysql");
    if (content.includes("mongo")) services.push("_hint:mongo");
    if (content.includes("redis")) services.push("_hint:redis");
    if (content.includes("rabbitmq")) services.push("_hint:rabbitmq");
    if (content.includes("kafka")) services.push("_hint:kafka");
    if (content.includes("elasticsearch")) services.push("_hint:elasticsearch");
    if (content.includes("meilisearch")) services.push("_hint:meilisearch");
    if (content.includes("minio")) services.push("_hint:minio");
    if (content.includes("mailhog") || content.includes("mailpit"))
      services.push("_hint:mail");
    return [...new Set(services)];
  }
  return [];
}

function analyzeProject() {
  const detected = {
    frontend: {
      framework: "none",
      styling: "none",
      stateManagement: "none",
      uiLibrary: "none",
      bundler: "none",
      formLibrary: "none",
      dataFetching: "none",
    },
    backend: {
      framework: "none",
      database: "none",
      orm: "none",
      validation: "none",
      caching: "none",
      messageQueue: "none",
      realtime: "none",
    },
    architecture: {
      i18n: false,
      languages: [],
      auth: "none",
      apiStyle: "none",
      multiTenancy: "none",
      monorepo: "none",
      typescript: false,
      pattern: "unknown",
      projectStructure: [],
    },
    devops: {
      deployment: "unknown",
      cicd: "none",
      testing: "none",
      quality: "none",
      packageManager: "unknown",
      storybook: false,
      docker: false,
    },
    meta: {
      programmingLanguages: [],
      monorepoWorkspaces: [],
      dockerServices: [],
      envHints: {},
    },
  };
  const confidence = {};
  const filesScanned = [];

  // --- Package Manager ---
  const pkgManager = detectPackageManager(PROJECT_ROOT);
  if (pkgManager !== "unknown") {
    detected.devops.packageManager = pkgManager;
    confidence["devops.packageManager"] = "high";
    filesScanned.push(
      pkgManager === "bun" ? "bun.lockb" : pkgManager + " lockfile",
    );
  }

  // --- TypeScript ---
  if (detectTypeScript(PROJECT_ROOT)) {
    detected.architecture.typescript = true;
    confidence["architecture.typescript"] = "high";
    filesScanned.push("tsconfig.json");
  }

  // --- package.json (main + all detection maps) ---
  const pkgPath = path.join(PROJECT_ROOT, "package.json");
  const pkg = readJsonSafe(pkgPath);
  if (pkg) {
    filesScanned.push("package.json");
    const allDeps = getAllDeps(pkg);

    for (const [field, entries] of Object.entries(DETECTION_MAP)) {
      const result = detectFromDeps(allDeps, entries);
      if (result) {
        const [section, key] = field.split(".");
        if (detected[section]) {
          detected[section][key] = result.value;
          confidence[field] = result.confidence;
        }
      }
    }

    const testResult = detectTestingCombo(allDeps, PROJECT_ROOT);
    if (testResult) {
      detected.devops.testing = testResult.value;
      confidence["devops.testing"] = testResult.confidence;
    }

    const qualityResult = detectQualityCombo(allDeps);
    if (qualityResult) {
      detected.devops.quality = qualityResult.value;
      confidence["devops.quality"] = qualityResult.confidence;
    }

    // Architecture detection from deps
    for (const [archKey, entries] of Object.entries(ARCHITECTURE_MAP)) {
      for (const entry of entries) {
        if (allDeps[entry.dep]) {
          if (archKey === "i18n") {
            detected.architecture.i18n = true;
            confidence["architecture.i18n"] = "high";
          } else {
            detected.architecture[archKey] = entry.value;
            confidence["architecture." + archKey] = "high";
          }
          break;
        }
      }
    }

    // Storybook detection
    if (
      allDeps["@storybook/react"] ||
      allDeps["@storybook/vue3"] ||
      allDeps["@storybook/angular"] ||
      allDeps["@storybook/svelte"] ||
      allDeps["storybook"]
    ) {
      detected.devops.storybook = true;
      confidence["devops.storybook"] = "high";
    }
    if (dirExists(path.join(PROJECT_ROOT, ".storybook"))) {
      detected.devops.storybook = true;
      confidence["devops.storybook"] = "high";
      filesScanned.push(".storybook/");
    }
  }

  // --- shadcn/ui detection via components.json ---
  if (detectShadcn(PROJECT_ROOT)) {
    detected.frontend.uiLibrary = "shadcn";
    confidence["frontend.uiLibrary"] = "high";
    filesScanned.push("components.json");
  }

  // --- Nuxt config module detection ---
  const nuxtModules = detectNuxtModules(PROJECT_ROOT);
  if (nuxtModules.length > 0) {
    filesScanned.push("nuxt.config.*");
    for (const mod of nuxtModules) {
      const mapping = NUXT_MODULE_MAP[mod];
      if (!mapping) continue;
      if (mapping.field) {
        const [section, key] = mapping.field.split(".");
        detected[section][key] = mapping.value;
        confidence[mapping.field] = "high";
      } else if (mapping.arch) {
        if (mapping.arch === "i18n") {
          detected.architecture.i18n = true;
          confidence["architecture.i18n"] = "high";
        } else {
          detected.architecture[mapping.arch] = mapping.value;
          confidence["architecture." + mapping.arch] = "high";
        }
      } else if (mapping.devops) {
        detected.devops[mapping.devops] = mapping.value;
        confidence["devops." + mapping.devops] = "high";
      }
    }
  }

  // --- Nuxt layer scanning (layers/*, packages/*, modules/*) ---
  let nuxtLayerDirs = [];
  if (detected.frontend.framework === "nuxt") {
    const nuxtLayerResult = scanNuxtLayers(PROJECT_ROOT);
    nuxtLayerDirs = nuxtLayerResult.layerDirs;
    if (nuxtLayerResult.layerDirs.length > 0) {
      filesScanned.push(
        "nuxt layers (" + nuxtLayerResult.layerDirs.length + " layers)",
      );
      // Merge layer deps into detection
      const lDeps = nuxtLayerResult.layerDeps;
      if (Object.keys(lDeps).length > 0) {
        for (const [field, entries] of Object.entries(DETECTION_MAP)) {
          const [section, key] = field.split(".");
          if (detected[section] && detected[section][key] === "none") {
            const result = detectFromDeps(lDeps, entries);
            if (result) {
              detected[section][key] = result.value;
              confidence[field] = result.confidence;
            }
          }
        }
      }
      // Process layer Nuxt modules
      for (const mod of nuxtLayerResult.layerModules) {
        const mapping = NUXT_MODULE_MAP[mod];
        if (!mapping) continue;
        if (mapping.field) {
          const [section, key] = mapping.field.split(".");
          if (detected[section][key] === "none") {
            detected[section][key] = mapping.value;
            confidence[mapping.field] = "high";
          }
        } else if (mapping.arch) {
          if (mapping.arch === "i18n") {
            detected.architecture.i18n = true;
            confidence["architecture.i18n"] = "high";
          } else if (detected.architecture[mapping.arch] === "none") {
            detected.architecture[mapping.arch] = mapping.value;
            confidence["architecture." + mapping.arch] = "high";
          }
        }
      }
      // Check for tailwind.config in layers
      for (const layerDir of nuxtLayerResult.layerDirs) {
        if (
          detected.frontend.styling === "none" &&
          globMatch(layerDir, "tailwind.config.*")
        ) {
          detected.frontend.styling = "tailwind";
          confidence["frontend.styling"] = "high";
          filesScanned.push(
            "tailwind.config.* (in " + path.basename(layerDir) + ")",
          );
        }
      }
    }
  }

  // --- Config file overrides (higher confidence) ---
  const fileChecks = [
    { pattern: "angular.json", field: "frontend.framework", value: "angular" },
    { pattern: "next.config.*", field: "frontend.framework", value: "nextjs" },
    { pattern: "nuxt.config.*", field: "frontend.framework", value: "nuxt" },
    {
      pattern: "svelte.config.*",
      field: "frontend.framework",
      value: "svelte",
    },
    {
      pattern: "tailwind.config.*",
      field: "frontend.styling",
      value: "tailwind",
    },
    { pattern: "postcss.config.*", field: "_hint_postcss", value: true },
    { pattern: "vite.config.*", field: "frontend.bundler", value: "vite" },
    {
      pattern: "webpack.config.*",
      field: "frontend.bundler",
      value: "webpack",
    },
    {
      pattern: "esbuild.config.*",
      field: "frontend.bundler",
      value: "esbuild",
    },
    { pattern: "rollup.config.*", field: "frontend.bundler", value: "rollup" },
    { pattern: "uno.config.*", field: "frontend.styling", value: "unocss" },
    { pattern: "windi.config.*", field: "frontend.styling", value: "windicss" },
    { pattern: "panda.config.*", field: "frontend.styling", value: "panda" },
    {
      pattern: "styled-system.config.*",
      field: "frontend.styling",
      value: "panda",
    },
  ];

  for (const check of fileChecks) {
    if (check.field.startsWith("_hint")) continue;
    if (check.pattern.includes("*")) {
      if (globMatch(PROJECT_ROOT, check.pattern)) {
        const [section, key] = check.field.split(".");
        if (detected[section]) {
          detected[section][key] = check.value;
          confidence[check.field] = "high";
          filesScanned.push(check.pattern);
        }
      }
    } else if (fileExists(path.join(PROJECT_ROOT, check.pattern))) {
      const [section, key] = check.field.split(".");
      if (detected[section]) {
        detected[section][key] = check.value;
        confidence[check.field] = "high";
        filesScanned.push(check.pattern);
      }
    }
  }

  // --- Non-JS backends (with deep dependency scanning) ---

  // Java/Maven (root + multi-module)
  const pomContent = readTextSafe(path.join(PROJECT_ROOT, "pom.xml"));
  if (pomContent) {
    detected.backend.framework = "spring";
    confidence["backend.framework"] = "high";
    filesScanned.push("pom.xml");
    const javaDeps = parseMavenDeps(pomContent);
    applyMapToDeps(javaDeps, JAVA_MAP, detected, confidence, true);
    // Scan Maven sub-modules
    const mavenModules = parseMavenModules(pomContent);
    for (const mod of mavenModules) {
      const modPom = readTextSafe(path.join(PROJECT_ROOT, mod, "pom.xml"));
      if (modPom) {
        filesScanned.push(mod + "/pom.xml");
        const modDeps = parseMavenDeps(modPom);
        applyMapToDeps(modDeps, JAVA_MAP, detected, confidence, true);
      }
    }
  }

  // Java/Gradle (root + multi-module via settings.gradle)
  const gradleFiles = ["build.gradle", "build.gradle.kts"];
  for (const gf of gradleFiles) {
    const gradleContent = readTextSafe(path.join(PROJECT_ROOT, gf));
    if (gradleContent) {
      if (detected.backend.framework === "none") {
        detected.backend.framework = "spring";
        confidence["backend.framework"] = "high";
      }
      filesScanned.push(gf);
      const javaDeps = parseGradleDeps(gradleContent);
      applyMapToDeps(javaDeps, JAVA_MAP, detected, confidence, true);
      // Scan Gradle sub-modules from settings.gradle
      const gradleModules = parseGradleSettings(PROJECT_ROOT);
      for (const mod of gradleModules) {
        const modFiles = ["build.gradle", "build.gradle.kts"];
        for (const mf of modFiles) {
          const modContent = readTextSafe(path.join(PROJECT_ROOT, mod, mf));
          if (modContent) {
            filesScanned.push(mod + "/" + mf);
            const modDeps = parseGradleDeps(modContent);
            applyMapToDeps(modDeps, JAVA_MAP, detected, confidence, true);
            break;
          }
        }
      }
      break;
    }
  }

  // .NET/C# (recursive search up to 3 levels for *.csproj)
  if (globMatch(PROJECT_ROOT, "*.csproj") || globMatch(PROJECT_ROOT, "*.sln")) {
    detected.backend.framework = "dotnet";
    confidence["backend.framework"] = "high";
    filesScanned.push("*.csproj");
    const csprojFiles = findFilesRecursive(PROJECT_ROOT, ".csproj", 4);
    for (const csf of csprojFiles) {
      const csContent = readTextSafe(csf);
      if (csContent) {
        const dotnetDeps = parseCsprojDeps(csContent);
        applyMapToDeps(dotnetDeps, DOTNET_MAP, detected, confidence, true);
      }
    }
    if (csprojFiles.length > 1) {
      filesScanned.push(
        "*.csproj (" + csprojFiles.length + " projects found recursively)",
      );
    }
  }

  // Go (root + go.work multi-module)
  const goModContent = readTextSafe(path.join(PROJECT_ROOT, "go.mod"));
  if (goModContent) {
    detected.backend.framework = "go";
    confidence["backend.framework"] = "high";
    filesScanned.push("go.mod");
    const goDeps = parseGoModDeps(goModContent);
    applyMapToDeps(goDeps, GO_MAP, detected, confidence, false);
  }
  // Go workspace (go.work)
  const goWorkModules = parseGoWork(PROJECT_ROOT);
  if (goWorkModules.length > 0) {
    filesScanned.push("go.work");
    if (detected.backend.framework === "none") {
      detected.backend.framework = "go";
      confidence["backend.framework"] = "high";
    }
    for (const mod of goWorkModules) {
      const modGoMod = readTextSafe(path.join(PROJECT_ROOT, mod, "go.mod"));
      if (modGoMod) {
        filesScanned.push(mod + "/go.mod");
        const modDeps = parseGoModDeps(modGoMod);
        applyMapToDeps(modDeps, GO_MAP, detected, confidence, false);
      }
    }
  }

  // Rust (root + workspace members)
  const cargoContent = readTextSafe(path.join(PROJECT_ROOT, "Cargo.toml"));
  if (cargoContent) {
    detected.backend.framework = "rust";
    confidence["backend.framework"] = "high";
    filesScanned.push("Cargo.toml");
    const rustDeps = parseCargoDeps(cargoContent);
    applyMapToDeps(rustDeps, RUST_MAP, detected, confidence, true);
    // Scan Cargo workspace members
    const cargoMembers = parseCargoWorkspace(PROJECT_ROOT);
    for (const member of cargoMembers) {
      const memberContent = readTextSafe(
        path.join(PROJECT_ROOT, member, "Cargo.toml"),
      );
      if (memberContent) {
        filesScanned.push(member + "/Cargo.toml");
        const memberDeps = parseCargoDeps(memberContent);
        applyMapToDeps(memberDeps, RUST_MAP, detected, confidence, true);
      }
    }
  }

  // Elixir/Phoenix (with dep parsing)
  const mixContent = readTextSafe(path.join(PROJECT_ROOT, "mix.exs"));
  if (mixContent) {
    if (detected.backend.framework === "none") {
      detected.backend.framework = "phoenix";
      confidence["backend.framework"] = "medium";
    }
    filesScanned.push("mix.exs");
    const elixirDeps = parseMixExsDeps(mixContent);
    if (elixirDeps.includes("phoenix")) {
      detected.backend.framework = "phoenix";
      confidence["backend.framework"] = "high";
    }
    applyMapToDeps(elixirDeps, ELIXIR_MAP, detected, confidence, true);
  }

  // Scala/SBT
  const sbtContent = readTextSafe(path.join(PROJECT_ROOT, "build.sbt"));
  if (sbtContent) {
    if (detected.backend.framework === "none") {
      detected.backend.framework = "play";
      confidence["backend.framework"] = "medium";
    }
    filesScanned.push("build.sbt");
    const scalaDeps = parseSbtDeps(sbtContent);
    applyMapToDeps(scalaDeps, SCALA_MAP, detected, confidence, true);
  }

  // Dart/Flutter
  const pubspecContent = readTextSafe(path.join(PROJECT_ROOT, "pubspec.yaml"));
  if (pubspecContent) {
    filesScanned.push("pubspec.yaml");
    const dartDeps = parsePubspecDeps(pubspecContent);
    if (dartDeps.includes("flutter")) {
      detected.frontend.framework = "flutter";
      confidence["frontend.framework"] = "high";
    }
    applyMapToDeps(dartDeps, DART_MAP, detected, confidence, true);
  }

  // Deno (deno.json / deno.jsonc)
  const denoFiles = ["deno.json", "deno.jsonc"];
  for (const df of denoFiles) {
    const denoContent = readTextSafe(path.join(PROJECT_ROOT, df));
    if (denoContent) {
      filesScanned.push(df);
      const denoDeps = parseDenoImports(denoContent);
      if (denoDeps.includes("fresh")) {
        detected.frontend.framework = "fresh";
        confidence["frontend.framework"] = "high";
      }
      if (denoDeps.includes("oak") && detected.backend.framework === "none") {
        detected.backend.framework = "oak";
        confidence["backend.framework"] = "high";
      }
      if (denoDeps.includes("hono") && detected.backend.framework === "none") {
        detected.backend.framework = "hono";
        confidence["backend.framework"] = "high";
      }
      detected.architecture.typescript = true;
      confidence["architecture.typescript"] = "high";
      break;
    }
  }

  // Ruby/Rails
  const gemfileContent = readTextSafe(path.join(PROJECT_ROOT, "Gemfile"));
  if (gemfileContent) {
    detected.backend.framework = "rails";
    confidence["backend.framework"] = "medium";
    filesScanned.push("Gemfile");
    if (gemfileContent.includes("rails")) {
      confidence["backend.framework"] = "high";
    }
    const rubyDeps = parseGemfileDeps(gemfileContent);
    applyMapToDeps(rubyDeps, RUBY_MAP, detected, confidence, true);
  }

  // PHP/Composer
  const composerContent = readTextSafe(
    path.join(PROJECT_ROOT, "composer.json"),
  );
  if (composerContent) {
    detected.backend.framework = "laravel";
    confidence["backend.framework"] = "medium";
    filesScanned.push("composer.json");
    if (composerContent.includes("laravel")) {
      confidence["backend.framework"] = "high";
    } else if (composerContent.includes("symfony")) {
      detected.backend.framework = "symfony";
      confidence["backend.framework"] = "high";
    }
    const phpDeps = parseComposerDeps(composerContent);
    applyMapToDeps(phpDeps, PHP_MAP, detected, confidence, true);
  }

  // --- Python deps ---
  const pythonFiles = [
    { name: "requirements.txt", parser: parsePythonDeps },
    { name: "pyproject.toml", parser: parsePyprojectDeps },
    { name: "requirements-dev.txt", parser: parsePythonDeps },
    { name: "requirements/base.txt", parser: parsePythonDeps },
    { name: "requirements/production.txt", parser: parsePythonDeps },
  ];
  for (const pf of pythonFiles) {
    const content = readTextSafe(path.join(PROJECT_ROOT, pf.name));
    if (content) {
      filesScanned.push(pf.name);
      const deps = pf.parser(content);
      for (const [field, entries] of Object.entries(PYTHON_MAP)) {
        for (const entry of entries) {
          if (deps.includes(entry.dep)) {
            const [section, key] = field.split(".");
            if (detected[section]) {
              detected[section][key] = entry.value;
              confidence[field] = "high";
            }
          }
        }
      }
    }
  }

  // Python subdirectory scanning (packages/*, services/*, backend/*, etc.)
  const pythonSubdirFiles = scanPythonSubdirs(PROJECT_ROOT);
  for (const pf of pythonSubdirFiles) {
    const content = readTextSafe(pf.path);
    if (content) {
      filesScanned.push(pf.name);
      const deps = pf.parser(content);
      for (const [field, entries] of Object.entries(PYTHON_MAP)) {
        for (const entry of entries) {
          if (deps.includes(entry.dep)) {
            const [section, key] = field.split(".");
            if (
              detected[section] &&
              (detected[section][key] === "none" ||
                detected[section][key] === undefined)
            ) {
              detected[section][key] = entry.value;
              confidence[field] = "high";
            }
          }
        }
      }
    }
  }

  // Django manage.py detection
  if (fileExists(path.join(PROJECT_ROOT, "manage.py"))) {
    const manageContent = readTextSafe(path.join(PROJECT_ROOT, "manage.py"));
    if (manageContent.includes("django")) {
      detected.backend.framework = "django";
      confidence["backend.framework"] = "high";
      filesScanned.push("manage.py");
    }
  }

  // --- Prisma schema ---
  const prismaDb = detectPrismaProvider(PROJECT_ROOT);
  if (prismaDb) {
    detected.backend.database = prismaDb;
    confidence["backend.database"] = "high";
    filesScanned.push("prisma/schema.prisma");
  }

  // --- Drizzle config ---
  const drizzleDb = detectDrizzleProvider(PROJECT_ROOT);
  if (drizzleDb) {
    if (detected.backend.database === "none") {
      detected.backend.database = drizzleDb;
      confidence["backend.database"] = "high";
    }
    filesScanned.push("drizzle.config.*");
  }

  // --- Biome ---
  if (
    fileExists(path.join(PROJECT_ROOT, "biome.json")) ||
    fileExists(path.join(PROJECT_ROOT, "biome.jsonc"))
  ) {
    detected.devops.quality = "biome";
    confidence["devops.quality"] = "high";
    filesScanned.push("biome.json");
  }

  // --- Oxlint ---
  if (fileExists(path.join(PROJECT_ROOT, ".oxlintrc.json"))) {
    detected.devops.quality = "oxlint";
    confidence["devops.quality"] = "high";
    filesScanned.push(".oxlintrc.json");
  }

  // --- CI/CD ---
  if (dirExists(path.join(PROJECT_ROOT, ".github", "workflows"))) {
    detected.devops.cicd = "github_actions";
    confidence["devops.cicd"] = "high";
    filesScanned.push(".github/workflows/");
  } else if (fileExists(path.join(PROJECT_ROOT, ".gitlab-ci.yml"))) {
    detected.devops.cicd = "gitlab_ci";
    confidence["devops.cicd"] = "high";
    filesScanned.push(".gitlab-ci.yml");
  } else if (fileExists(path.join(PROJECT_ROOT, "azure-pipelines.yml"))) {
    detected.devops.cicd = "azure_devops";
    confidence["devops.cicd"] = "high";
    filesScanned.push("azure-pipelines.yml");
  } else if (fileExists(path.join(PROJECT_ROOT, "Jenkinsfile"))) {
    detected.devops.cicd = "jenkins";
    confidence["devops.cicd"] = "high";
    filesScanned.push("Jenkinsfile");
  } else if (fileExists(path.join(PROJECT_ROOT, "bitbucket-pipelines.yml"))) {
    detected.devops.cicd = "bitbucket";
    confidence["devops.cicd"] = "high";
    filesScanned.push("bitbucket-pipelines.yml");
  } else if (fileExists(path.join(PROJECT_ROOT, ".circleci", "config.yml"))) {
    detected.devops.cicd = "circleci";
    confidence["devops.cicd"] = "high";
    filesScanned.push(".circleci/config.yml");
  }

  // --- Deployment ---
  if (
    fileExists(path.join(PROJECT_ROOT, "Dockerfile")) ||
    globMatch(PROJECT_ROOT, "docker-compose*") ||
    globMatch(PROJECT_ROOT, "compose.*")
  ) {
    detected.devops.docker = true;
    detected.devops.deployment = "docker";
    confidence["devops.deployment"] = "high";
    confidence["devops.docker"] = "high";
    if (fileExists(path.join(PROJECT_ROOT, "Dockerfile")))
      filesScanned.push("Dockerfile");
  }

  if (fileExists(path.join(PROJECT_ROOT, "vercel.json"))) {
    detected.devops.deployment = "vercel";
    confidence["devops.deployment"] = "high";
    filesScanned.push("vercel.json");
  } else if (fileExists(path.join(PROJECT_ROOT, "netlify.toml"))) {
    detected.devops.deployment = "netlify";
    confidence["devops.deployment"] = "high";
    filesScanned.push("netlify.toml");
  } else if (fileExists(path.join(PROJECT_ROOT, "fly.toml"))) {
    detected.devops.deployment = "fly";
    confidence["devops.deployment"] = "high";
    filesScanned.push("fly.toml");
  } else if (fileExists(path.join(PROJECT_ROOT, "render.yaml"))) {
    detected.devops.deployment = "render";
    confidence["devops.deployment"] = "high";
    filesScanned.push("render.yaml");
  } else if (
    fileExists(path.join(PROJECT_ROOT, "serverless.yml")) ||
    fileExists(path.join(PROJECT_ROOT, "serverless.yaml"))
  ) {
    detected.devops.deployment = "serverless";
    confidence["devops.deployment"] = "high";
    filesScanned.push("serverless.yml");
  } else if (
    fileExists(path.join(PROJECT_ROOT, "railway.json")) ||
    fileExists(path.join(PROJECT_ROOT, "railway.toml"))
  ) {
    detected.devops.deployment = "railway";
    confidence["devops.deployment"] = "high";
    filesScanned.push("railway.*");
  } else if (fileExists(path.join(PROJECT_ROOT, "wrangler.toml"))) {
    detected.devops.deployment = "cloudflare";
    confidence["devops.deployment"] = "high";
    filesScanned.push("wrangler.toml");
  } else if (fileExists(path.join(PROJECT_ROOT, "Procfile"))) {
    detected.devops.deployment = "heroku";
    confidence["devops.deployment"] = "high";
    filesScanned.push("Procfile");
  } else if (fileExists(path.join(PROJECT_ROOT, "app.yaml"))) {
    detected.devops.deployment = "gcp-appengine";
    confidence["devops.deployment"] = "high";
    filesScanned.push("app.yaml");
  } else if (
    fileExists(path.join(PROJECT_ROOT, "amplify.yml")) ||
    fileExists(path.join(PROJECT_ROOT, "amplify.yaml"))
  ) {
    detected.devops.deployment = "aws-amplify";
    confidence["devops.deployment"] = "high";
    filesScanned.push("amplify.yml");
  } else if (
    fileExists(path.join(PROJECT_ROOT, "sam-template.yaml")) ||
    fileExists(path.join(PROJECT_ROOT, "template.yaml"))
  ) {
    const samContent =
      readTextSafe(path.join(PROJECT_ROOT, "template.yaml")) ||
      readTextSafe(path.join(PROJECT_ROOT, "sam-template.yaml"));
    if (samContent && samContent.includes("AWS::Serverless")) {
      detected.devops.deployment = "aws-sam";
      confidence["devops.deployment"] = "high";
      filesScanned.push("template.yaml (SAM)");
    }
  } else if (fileExists(path.join(PROJECT_ROOT, "cdk.json"))) {
    detected.devops.deployment = "aws-cdk";
    confidence["devops.deployment"] = "high";
    filesScanned.push("cdk.json");
  } else if (fileExists(path.join(PROJECT_ROOT, "pulumi.yaml"))) {
    detected.devops.deployment = "pulumi";
    confidence["devops.deployment"] = "high";
    filesScanned.push("pulumi.yaml");
  } else if (globMatch(PROJECT_ROOT, "sst.config.*")) {
    detected.devops.deployment = "sst";
    confidence["devops.deployment"] = "high";
    filesScanned.push("sst.config.*");
  }

  // Kubernetes detection
  if (
    dirExists(path.join(PROJECT_ROOT, "k8s")) ||
    dirExists(path.join(PROJECT_ROOT, "kubernetes")) ||
    dirExists(path.join(PROJECT_ROOT, "charts"))
  ) {
    detected.devops.deployment = "kubernetes";
    confidence["devops.deployment"] = "high";
    filesScanned.push("k8s/ or kubernetes/");
  }
  if (
    dirExists(path.join(PROJECT_ROOT, "terraform")) ||
    globMatch(PROJECT_ROOT, "*.tf")
  ) {
    if (detected.devops.deployment === "unknown") {
      detected.devops.deployment = "terraform";
      confidence["devops.deployment"] = "high";
    }
    filesScanned.push("terraform/");
  }
  if (
    fileExists(path.join(PROJECT_ROOT, "config", "deploy.yml")) ||
    fileExists(path.join(PROJECT_ROOT, ".kamal"))
  ) {
    if (detected.devops.deployment === "unknown") {
      detected.devops.deployment = "kamal";
      confidence["devops.deployment"] = "high";
    }
    filesScanned.push("kamal deploy config");
  }

  // --- i18n ---
  if (
    dirExists(path.join(PROJECT_ROOT, "i18n")) ||
    dirExists(path.join(PROJECT_ROOT, "locales")) ||
    dirExists(path.join(PROJECT_ROOT, "lang")) ||
    dirExists(path.join(PROJECT_ROOT, "translations")) ||
    dirExists(path.join(PROJECT_ROOT, "messages")) ||
    dirExists(path.join(PROJECT_ROOT, "src", "i18n")) ||
    dirExists(path.join(PROJECT_ROOT, "src", "locales"))
  ) {
    detected.architecture.i18n = true;
    if (!confidence["architecture.i18n"]) {
      confidence["architecture.i18n"] = "medium";
    }
    filesScanned.push("i18n/locales/lang/ directories");
  }

  // Detect actual language codes from i18n files
  if (detected.architecture.i18n) {
    const detectedLangs = detectI18nLanguages(PROJECT_ROOT);
    if (detectedLangs.length > 0) {
      detected.architecture.languages = detectedLangs;
      confidence["architecture.languages"] = "high";
    }
  }

  // --- Monorepo ---
  if (fileExists(path.join(PROJECT_ROOT, "nx.json"))) {
    detected.architecture.monorepo = "nx";
    confidence["architecture.monorepo"] = "high";
    filesScanned.push("nx.json");
  } else if (fileExists(path.join(PROJECT_ROOT, "turbo.json"))) {
    detected.architecture.monorepo = "turborepo";
    confidence["architecture.monorepo"] = "high";
    filesScanned.push("turbo.json");
  } else if (fileExists(path.join(PROJECT_ROOT, "lerna.json"))) {
    detected.architecture.monorepo = "lerna";
    confidence["architecture.monorepo"] = "high";
    filesScanned.push("lerna.json");
  } else if (fileExists(path.join(PROJECT_ROOT, "pnpm-workspace.yaml"))) {
    detected.architecture.monorepo = "pnpm-workspaces";
    confidence["architecture.monorepo"] = "high";
    filesScanned.push("pnpm-workspace.yaml");
  }

  // Monorepo workspace scanning
  const workspaces = detectMonorepoWorkspaces(PROJECT_ROOT);
  if (workspaces.length > 0) {
    detected.meta.monorepoWorkspaces = workspaces;
    if (detected.architecture.monorepo === "none") {
      detected.architecture.monorepo = "npm-workspaces";
      confidence["architecture.monorepo"] = "medium";
    }

    // Merge workspace package.json deps and re-run detection maps
    const wsDeps = collectWorkspaceDeps(PROJECT_ROOT, workspaces);
    if (Object.keys(wsDeps).length > 0) {
      filesScanned.push(
        "workspace package.json files (" + workspaces.length + ")",
      );
      for (const [field, entries] of Object.entries(DETECTION_MAP)) {
        const [section, key] = field.split(".");
        if (detected[section] && detected[section][key] === "none") {
          const result = detectFromDeps(wsDeps, entries);
          if (result) {
            detected[section][key] = result.value;
            confidence[field] = result.confidence;
          }
        }
      }
      for (const [archKey, entries] of Object.entries(ARCHITECTURE_MAP)) {
        if (archKey === "i18n" && detected.architecture.i18n) continue;
        if (archKey !== "i18n" && detected.architecture[archKey] !== "none")
          continue;
        for (const entry of entries) {
          if (wsDeps[entry.dep]) {
            if (archKey === "i18n") {
              detected.architecture.i18n = true;
              confidence["architecture.i18n"] = "high";
            } else {
              detected.architecture[archKey] = entry.value;
              confidence["architecture." + archKey] = "high";
            }
            break;
          }
        }
      }
      // Re-check testing and quality combos with workspace deps
      if (detected.devops.testing === "none") {
        const wsTestResult = detectTestingCombo(wsDeps, PROJECT_ROOT);
        if (wsTestResult) {
          detected.devops.testing = wsTestResult.value;
          confidence["devops.testing"] = wsTestResult.confidence;
        }
      }
      if (detected.devops.quality === "none") {
        const wsQualityResult = detectQualityCombo(wsDeps);
        if (wsQualityResult) {
          detected.devops.quality = wsQualityResult.value;
          confidence["devops.quality"] = wsQualityResult.confidence;
        }
      }
    }

    // Scan workspace paths for config files (tailwind, nuxt, etc.)
    const configHits = scanForConfigFiles(PROJECT_ROOT, workspaces);
    for (const hit of configHits) {
      if (hit.field === "_shadcn") {
        if (detected.frontend.uiLibrary === "none") {
          detected.frontend.uiLibrary = "shadcn";
          confidence["frontend.uiLibrary"] = "high";
        }
        continue;
      }
      const [section, key] = hit.field.split(".");
      if (detected[section] && detected[section][key] === "none") {
        detected[section][key] = hit.value;
        confidence[hit.field] = "high";
        filesScanned.push(hit.pattern + " (in " + path.basename(hit.dir) + ")");
      }
    }
  }

  // --- Fullstack subdirectory scanning (frontend/, backend/, client/, server/, etc.) ---
  const fullstackResult = collectFullstackSubdirDeps(PROJECT_ROOT);
  if (Object.keys(fullstackResult.deps).length > 0) {
    for (const f of fullstackResult.files) filesScanned.push(f);
    const fsDeps = fullstackResult.deps;
    for (const [field, entries] of Object.entries(DETECTION_MAP)) {
      const [section, key] = field.split(".");
      if (detected[section] && detected[section][key] === "none") {
        const result = detectFromDeps(fsDeps, entries);
        if (result) {
          detected[section][key] = result.value;
          confidence[field] = result.confidence;
        }
      }
    }
    for (const [archKey, entries] of Object.entries(ARCHITECTURE_MAP)) {
      if (archKey === "i18n" && detected.architecture.i18n) continue;
      if (archKey !== "i18n" && detected.architecture[archKey] !== "none")
        continue;
      for (const entry of entries) {
        if (fsDeps[entry.dep]) {
          if (archKey === "i18n") {
            detected.architecture.i18n = true;
            confidence["architecture.i18n"] = "high";
          } else {
            detected.architecture[archKey] = entry.value;
            confidence["architecture." + archKey] = "high";
          }
          break;
        }
      }
    }
  }

  // --- Project Structure Analysis ---
  const projectPatterns = detectProjectStructure(PROJECT_ROOT);
  if (projectPatterns.length > 0) {
    detected.architecture.projectStructure = projectPatterns;
    detected.architecture.pattern = detectArchitecturePattern(projectPatterns);
    if (detected.architecture.pattern !== "unknown") {
      confidence["architecture.pattern"] = "medium";
    }
    filesScanned.push(
      "project structure (" + projectPatterns.length + " patterns)",
    );
  }

  // --- .env hints ---
  const envHints = detectEnvHints(PROJECT_ROOT);
  if (Object.keys(envHints).length > 0) {
    detected.meta.envHints = envHints;
    filesScanned.push(".env files");
    // Use env hints as fallback for undetected fields
    if (envHints.database && detected.backend.database === "none") {
      detected.backend.database = envHints.database;
      confidence["backend.database"] = "low";
    }
    if (envHints.caching && detected.backend.caching === "none") {
      detected.backend.caching = envHints.caching;
      confidence["backend.caching"] = "low";
    }
  }

  // --- Docker Compose services ---
  const dockerServices = detectDockerServices(PROJECT_ROOT);
  if (dockerServices.length > 0) {
    detected.meta.dockerServices = dockerServices;
    filesScanned.push("docker-compose.yml");
    // Use docker hints as fallback
    for (const svc of dockerServices) {
      if (svc === "_hint:postgres" && detected.backend.database === "none") {
        detected.backend.database = "postgres";
        confidence["backend.database"] = "medium";
      }
      if (svc === "_hint:mysql" && detected.backend.database === "none") {
        detected.backend.database = "mysql";
        confidence["backend.database"] = "medium";
      }
      if (svc === "_hint:mongo" && detected.backend.database === "none") {
        detected.backend.database = "mongo";
        confidence["backend.database"] = "medium";
      }
      if (svc === "_hint:redis" && detected.backend.caching === "none") {
        detected.backend.caching = "redis";
        confidence["backend.caching"] = "medium";
      }
      if (
        svc === "_hint:rabbitmq" &&
        detected.backend.messageQueue === "none"
      ) {
        detected.backend.messageQueue = "rabbitmq";
        confidence["backend.messageQueue"] = "medium";
      }
      if (svc === "_hint:kafka" && detected.backend.messageQueue === "none") {
        detected.backend.messageQueue = "kafka";
        confidence["backend.messageQueue"] = "medium";
      }
    }
  }

  // --- Deep Scan Pass (all scan dirs) ---
  const scanDirs = collectAllScanDirs(
    PROJECT_ROOT,
    detected.meta.monorepoWorkspaces,
    nuxtLayerDirs,
  );
  if (scanDirs.length > 1) {
    filesScanned.push("deep scan (" + scanDirs.length + " directories)");

    // Merge all deps from scan dirs for combo detection
    const allMergedDeps = {};
    for (const dir of scanDirs) {
      const dpkg = readJsonSafe(path.join(dir, "package.json"));
      if (dpkg) Object.assign(allMergedDeps, getAllDeps(dpkg));
    }

    // Run DETECTION_MAP and ARCHITECTURE_MAP on merged deps from all scan dirs
    if (Object.keys(allMergedDeps).length > 0) {
      for (const [field, entries] of Object.entries(DETECTION_MAP)) {
        const [section, key] = field.split(".");
        if (detected[section] && detected[section][key] === "none") {
          const result = detectFromDeps(allMergedDeps, entries);
          if (result) {
            detected[section][key] = result.value;
            confidence[field] = result.confidence;
          }
        }
      }
      for (const [archKey, entries] of Object.entries(ARCHITECTURE_MAP)) {
        if (archKey === "i18n" && detected.architecture.i18n) continue;
        if (archKey !== "i18n" && detected.architecture[archKey] !== "none")
          continue;
        for (const entry of entries) {
          if (allMergedDeps[entry.dep]) {
            if (archKey === "i18n") {
              detected.architecture.i18n = true;
              confidence["architecture.i18n"] = "high";
            } else {
              detected.architecture[archKey] = entry.value;
              confidence["architecture." + archKey] = "high";
            }
            break;
          }
        }
      }
    }

    // Deep config file overrides (fill "none" fields from subdirs)
    const deepFileChecks = [
      {
        pattern: "angular.json",
        field: "frontend.framework",
        value: "angular",
      },
      {
        pattern: "next.config.*",
        field: "frontend.framework",
        value: "nextjs",
      },
      { pattern: "nuxt.config.*", field: "frontend.framework", value: "nuxt" },
      {
        pattern: "svelte.config.*",
        field: "frontend.framework",
        value: "svelte",
      },
      {
        pattern: "tailwind.config.*",
        field: "frontend.styling",
        value: "tailwind",
      },
      { pattern: "vite.config.*", field: "frontend.bundler", value: "vite" },
      {
        pattern: "webpack.config.*",
        field: "frontend.bundler",
        value: "webpack",
      },
      { pattern: "uno.config.*", field: "frontend.styling", value: "unocss" },
      { pattern: "panda.config.*", field: "frontend.styling", value: "panda" },
      { pattern: "vitest.config.*", field: "devops.testing", value: "vitest" },
      { pattern: "jest.config.*", field: "devops.testing", value: "jest" },
      {
        pattern: "cypress.config.*",
        field: "devops.testing",
        value: "cypress",
      },
      {
        pattern: "playwright.config.*",
        field: "devops.testing",
        value: "playwright",
      },
      { pattern: ".mocharc.*", field: "devops.testing", value: "mocha" },
      { pattern: "karma.conf.*", field: "devops.testing", value: "karma" },
      { pattern: "wdio.conf.*", field: "devops.testing", value: "webdriverio" },
      {
        pattern: "nightwatch.conf.*",
        field: "devops.testing",
        value: "nightwatch",
      },
      { pattern: "biome.json", field: "devops.quality", value: "biome" },
      { pattern: "biome.jsonc", field: "devops.quality", value: "biome" },
      { pattern: ".oxlintrc.json", field: "devops.quality", value: "oxlint" },
    ];

    for (const dir of scanDirs) {
      if (dir === PROJECT_ROOT) continue;
      for (const check of deepFileChecks) {
        const [section, key] = check.field.split(".");
        if (!detected[section] || detected[section][key] !== "none") continue;
        const found = check.pattern.includes("*")
          ? globMatch(dir, check.pattern)
          : fileExists(path.join(dir, check.pattern));
        if (found) {
          detected[section][key] = check.value;
          confidence[check.field] = "high";
          filesScanned.push(check.pattern + " (in " + path.basename(dir) + ")");
        }
      }
    }

    // Deep TypeScript detection
    if (!detected.architecture.typescript) {
      for (const dir of scanDirs) {
        if (dir === PROJECT_ROOT) continue;
        if (detectTypeScript(dir)) {
          detected.architecture.typescript = true;
          confidence["architecture.typescript"] = "high";
          filesScanned.push("tsconfig.json (in " + path.basename(dir) + ")");
          break;
        }
      }
    }

    // Deep Prisma detection
    if (detected.backend.database === "none") {
      for (const dir of scanDirs) {
        if (dir === PROJECT_ROOT) continue;
        const prismaDb = detectPrismaProvider(dir);
        if (prismaDb) {
          detected.backend.database = prismaDb;
          confidence["backend.database"] = "high";
          filesScanned.push(
            "prisma/schema.prisma (in " + path.basename(dir) + ")",
          );
          break;
        }
      }
    }

    // Deep Drizzle detection
    if (detected.backend.database === "none") {
      for (const dir of scanDirs) {
        if (dir === PROJECT_ROOT) continue;
        const drizzleDb = detectDrizzleProvider(dir);
        if (drizzleDb) {
          detected.backend.database = drizzleDb;
          confidence["backend.database"] = "high";
          filesScanned.push("drizzle.config.* (in " + path.basename(dir) + ")");
          break;
        }
      }
    }

    // Deep shadcn/ui detection
    if (detected.frontend.uiLibrary === "none") {
      for (const dir of scanDirs) {
        if (dir === PROJECT_ROOT) continue;
        if (detectShadcn(dir)) {
          detected.frontend.uiLibrary = "shadcn";
          confidence["frontend.uiLibrary"] = "high";
          filesScanned.push("components.json (in " + path.basename(dir) + ")");
          break;
        }
      }
    }

    // Deep Storybook detection
    if (!detected.devops.storybook) {
      for (const dir of scanDirs) {
        if (dir === PROJECT_ROOT) continue;
        if (dirExists(path.join(dir, ".storybook"))) {
          detected.devops.storybook = true;
          confidence["devops.storybook"] = "high";
          filesScanned.push(".storybook/ (in " + path.basename(dir) + ")");
          break;
        }
      }
    }

    // Deep i18n detection
    if (!detected.architecture.i18n) {
      const i18nIndicators = [
        "i18n",
        "locales",
        "lang",
        "translations",
        "messages",
      ];
      for (const dir of scanDirs) {
        if (dir === PROJECT_ROOT) continue;
        for (const ind of i18nIndicators) {
          if (
            dirExists(path.join(dir, ind)) ||
            dirExists(path.join(dir, "src", ind))
          ) {
            detected.architecture.i18n = true;
            confidence["architecture.i18n"] = "medium";
            filesScanned.push(ind + "/ (in " + path.basename(dir) + ")");
            break;
          }
        }
        if (detected.architecture.i18n) break;
      }
    }
    if (
      detected.architecture.i18n &&
      detected.architecture.languages.length === 0
    ) {
      for (const dir of scanDirs) {
        const langs = detectI18nLanguages(dir);
        if (langs.length > 0) {
          const merged = new Set([
            ...detected.architecture.languages,
            ...langs,
          ]);
          detected.architecture.languages = Array.from(merged).sort();
          confidence["architecture.languages"] = "high";
        }
      }
    }

    // Deep .env hints
    for (const dir of scanDirs) {
      if (dir === PROJECT_ROOT) continue;
      const subEnvHints = detectEnvHints(dir);
      for (const [key, value] of Object.entries(subEnvHints)) {
        if (!detected.meta.envHints[key]) {
          detected.meta.envHints[key] = value;
        }
      }
      if (subEnvHints.database && detected.backend.database === "none") {
        detected.backend.database = subEnvHints.database;
        confidence["backend.database"] = "low";
      }
      if (subEnvHints.caching && detected.backend.caching === "none") {
        detected.backend.caching = subEnvHints.caching;
        confidence["backend.caching"] = "low";
      }
    }

    // Deep non-JS backend scanning in subdirectories
    for (const dir of scanDirs) {
      if (dir === PROJECT_ROOT) continue;

      // Java/Maven
      const subPomContent = readTextSafe(path.join(dir, "pom.xml"));
      if (subPomContent) {
        filesScanned.push("pom.xml (in " + path.basename(dir) + ")");
        if (
          detected.backend.framework === "none" ||
          GENERIC_FRAMEWORK_PLACEHOLDERS.has(detected.backend.framework)
        ) {
          detected.backend.framework = "spring";
          confidence["backend.framework"] = "high";
        }
        const subJavaDeps = parseMavenDeps(subPomContent);
        applyMapToDeps(subJavaDeps, JAVA_MAP, detected, confidence, true);
        const subMavenModules = parseMavenModules(subPomContent);
        for (const mod of subMavenModules) {
          const modPom = readTextSafe(path.join(dir, mod, "pom.xml"));
          if (modPom) {
            filesScanned.push(mod + "/pom.xml (in " + path.basename(dir) + ")");
            const modDeps = parseMavenDeps(modPom);
            applyMapToDeps(modDeps, JAVA_MAP, detected, confidence, true);
          }
        }
      }

      // Java/Gradle
      for (const gf of ["build.gradle", "build.gradle.kts"]) {
        const subGradleContent = readTextSafe(path.join(dir, gf));
        if (subGradleContent) {
          filesScanned.push(gf + " (in " + path.basename(dir) + ")");
          if (
            detected.backend.framework === "none" ||
            GENERIC_FRAMEWORK_PLACEHOLDERS.has(detected.backend.framework)
          ) {
            detected.backend.framework = "spring";
            confidence["backend.framework"] = "high";
          }
          const subGradleDeps = parseGradleDeps(subGradleContent);
          applyMapToDeps(subGradleDeps, JAVA_MAP, detected, confidence, true);
          break;
        }
      }

      // .NET/C#
      if (globMatch(dir, "*.csproj")) {
        const subCsprojFiles = findFilesRecursive(dir, ".csproj", 3);
        for (const csf of subCsprojFiles) {
          const csContent = readTextSafe(csf);
          if (csContent) {
            if (
              detected.backend.framework === "none" ||
              GENERIC_FRAMEWORK_PLACEHOLDERS.has(detected.backend.framework)
            ) {
              detected.backend.framework = "dotnet";
              confidence["backend.framework"] = "high";
            }
            const subDotnetDeps = parseCsprojDeps(csContent);
            applyMapToDeps(
              subDotnetDeps,
              DOTNET_MAP,
              detected,
              confidence,
              true,
            );
          }
        }
        filesScanned.push("*.csproj (in " + path.basename(dir) + ")");
      }

      // Go
      const subGoModContent = readTextSafe(path.join(dir, "go.mod"));
      if (subGoModContent) {
        filesScanned.push("go.mod (in " + path.basename(dir) + ")");
        if (
          detected.backend.framework === "none" ||
          GENERIC_FRAMEWORK_PLACEHOLDERS.has(detected.backend.framework)
        ) {
          detected.backend.framework = "go";
          confidence["backend.framework"] = "high";
        }
        const subGoDeps = parseGoModDeps(subGoModContent);
        applyMapToDeps(subGoDeps, GO_MAP, detected, confidence, false);
      }

      // Rust
      const subCargoContent = readTextSafe(path.join(dir, "Cargo.toml"));
      if (subCargoContent) {
        filesScanned.push("Cargo.toml (in " + path.basename(dir) + ")");
        if (
          detected.backend.framework === "none" ||
          GENERIC_FRAMEWORK_PLACEHOLDERS.has(detected.backend.framework)
        ) {
          detected.backend.framework = "rust";
          confidence["backend.framework"] = "high";
        }
        const subRustDeps = parseCargoDeps(subCargoContent);
        applyMapToDeps(subRustDeps, RUST_MAP, detected, confidence, true);
      }

      // PHP/Composer
      const subComposerContent = readTextSafe(path.join(dir, "composer.json"));
      if (subComposerContent) {
        filesScanned.push("composer.json (in " + path.basename(dir) + ")");
        if (
          detected.backend.framework === "none" ||
          GENERIC_FRAMEWORK_PLACEHOLDERS.has(detected.backend.framework)
        ) {
          if (subComposerContent.includes("laravel")) {
            detected.backend.framework = "laravel";
            confidence["backend.framework"] = "high";
          } else if (subComposerContent.includes("symfony")) {
            detected.backend.framework = "symfony";
            confidence["backend.framework"] = "high";
          } else {
            detected.backend.framework = "laravel";
            confidence["backend.framework"] = "medium";
          }
        }
        const subPhpDeps = parseComposerDeps(subComposerContent);
        applyMapToDeps(subPhpDeps, PHP_MAP, detected, confidence, true);
      }

      // Ruby/Gemfile
      const subGemfileContent = readTextSafe(path.join(dir, "Gemfile"));
      if (subGemfileContent) {
        filesScanned.push("Gemfile (in " + path.basename(dir) + ")");
        if (
          detected.backend.framework === "none" ||
          GENERIC_FRAMEWORK_PLACEHOLDERS.has(detected.backend.framework)
        ) {
          detected.backend.framework = "rails";
          confidence["backend.framework"] = subGemfileContent.includes("rails")
            ? "high"
            : "medium";
        }
        const subRubyDeps = parseGemfileDeps(subGemfileContent);
        applyMapToDeps(subRubyDeps, RUBY_MAP, detected, confidence, true);
      }

      // Elixir/Phoenix
      const subMixContent = readTextSafe(path.join(dir, "mix.exs"));
      if (subMixContent) {
        filesScanned.push("mix.exs (in " + path.basename(dir) + ")");
        if (
          detected.backend.framework === "none" ||
          GENERIC_FRAMEWORK_PLACEHOLDERS.has(detected.backend.framework)
        ) {
          detected.backend.framework = "phoenix";
          confidence["backend.framework"] = subMixContent.includes("phoenix")
            ? "high"
            : "medium";
        }
        const subElixirDeps = parseMixExsDeps(subMixContent);
        applyMapToDeps(subElixirDeps, ELIXIR_MAP, detected, confidence, true);
      }

      // Scala/SBT
      const subSbtContent = readTextSafe(path.join(dir, "build.sbt"));
      if (subSbtContent) {
        filesScanned.push("build.sbt (in " + path.basename(dir) + ")");
        if (
          detected.backend.framework === "none" ||
          GENERIC_FRAMEWORK_PLACEHOLDERS.has(detected.backend.framework)
        ) {
          detected.backend.framework = "play";
          confidence["backend.framework"] = "medium";
        }
        const subScalaDeps = parseSbtDeps(subSbtContent);
        applyMapToDeps(subScalaDeps, SCALA_MAP, detected, confidence, true);
      }

      // Dart/Flutter
      const subPubspecContent = readTextSafe(path.join(dir, "pubspec.yaml"));
      if (subPubspecContent) {
        filesScanned.push("pubspec.yaml (in " + path.basename(dir) + ")");
        const subDartDeps = parsePubspecDeps(subPubspecContent);
        if (
          subDartDeps.includes("flutter") &&
          detected.frontend.framework === "none"
        ) {
          detected.frontend.framework = "flutter";
          confidence["frontend.framework"] = "high";
        }
        applyMapToDeps(subDartDeps, DART_MAP, detected, confidence, true);
      }

      // Python
      for (const pyFile of [
        { name: "requirements.txt", parser: parsePythonDeps },
        { name: "pyproject.toml", parser: parsePyprojectDeps },
      ]) {
        const subPyContent = readTextSafe(path.join(dir, pyFile.name));
        if (subPyContent) {
          filesScanned.push(pyFile.name + " (in " + path.basename(dir) + ")");
          const subPyDeps = pyFile.parser(subPyContent);
          for (const [field, entries] of Object.entries(PYTHON_MAP)) {
            for (const entry of entries) {
              if (subPyDeps.includes(entry.dep)) {
                const [section, key] = field.split(".");
                if (
                  detected[section] &&
                  (detected[section][key] === "none" ||
                    detected[section][key] === undefined)
                ) {
                  detected[section][key] = entry.value;
                  confidence[field] = "high";
                }
              }
            }
          }
        }
      }

      // Deno
      for (const df of ["deno.json", "deno.jsonc"]) {
        const subDenoContent = readTextSafe(path.join(dir, df));
        if (subDenoContent) {
          filesScanned.push(df + " (in " + path.basename(dir) + ")");
          const subDenoDeps = parseDenoImports(subDenoContent);
          if (
            subDenoDeps.includes("fresh") &&
            detected.frontend.framework === "none"
          ) {
            detected.frontend.framework = "fresh";
            confidence["frontend.framework"] = "high";
          }
          if (
            subDenoDeps.includes("oak") &&
            detected.backend.framework === "none"
          ) {
            detected.backend.framework = "oak";
            confidence["backend.framework"] = "high";
          }
          if (
            subDenoDeps.includes("hono") &&
            detected.backend.framework === "none"
          ) {
            detected.backend.framework = "hono";
            confidence["backend.framework"] = "high";
          }
          break;
        }
      }
    }

    // Deep project structure (merge patterns from all scan dirs)
    for (const dir of scanDirs) {
      if (dir === PROJECT_ROOT) continue;
      const subPatterns = detectProjectStructure(dir);
      for (const p of subPatterns) {
        if (!detected.architecture.projectStructure.includes(p)) {
          detected.architecture.projectStructure.push(p);
        }
      }
    }
    if (detected.architecture.projectStructure.length > 0) {
      const newPattern = detectArchitecturePattern(
        detected.architecture.projectStructure,
      );
      if (
        newPattern !== "unknown" &&
        detected.architecture.pattern === "unknown"
      ) {
        detected.architecture.pattern = newPattern;
        confidence["architecture.pattern"] = "medium";
      }
    }

    // Deep testing combo (merged deps + all dirs)
    if (detected.devops.testing === "none") {
      const deepTestResult = detectTestingCombo(allMergedDeps, scanDirs);
      if (deepTestResult) {
        detected.devops.testing = deepTestResult.value;
        confidence["devops.testing"] = deepTestResult.confidence;
      }
    }

    // Deep quality combo
    if (detected.devops.quality === "none") {
      const deepQualityResult = detectQualityCombo(allMergedDeps);
      if (deepQualityResult) {
        detected.devops.quality = deepQualityResult.value;
        confidence["devops.quality"] = deepQualityResult.confidence;
      }
    }

    // Testing directory heuristics (lowest priority fallback)
    if (detected.devops.testing === "none") {
      for (const dir of scanDirs) {
        if (dirExists(path.join(dir, "cypress"))) {
          detected.devops.testing = "cypress";
          confidence["devops.testing"] = "medium";
          filesScanned.push("cypress/ (in " + path.basename(dir) + ")");
          break;
        }
        if (dirExists(path.join(dir, ".playwright"))) {
          detected.devops.testing = "playwright";
          confidence["devops.testing"] = "medium";
          filesScanned.push(".playwright/ (in " + path.basename(dir) + ")");
          break;
        }
        if (dirExists(path.join(dir, "__tests__"))) {
          detected.devops.testing = "jest";
          confidence["devops.testing"] = "low";
          break;
        }
      }
    }
  }

  // --- Programming Language Detection ---
  const progLangs = detectProgrammingLanguages(
    PROJECT_ROOT,
    detected.meta.monorepoWorkspaces,
  );
  if (progLangs.length > 0) {
    detected.meta.programmingLanguages = progLangs;
    confidence["meta.programmingLanguages"] = "high";
    filesScanned.push("file extensions (" + progLangs.length + " languages)");
  }

  return { detected, confidence, filesScanned };
}

// ---------------------------------------------------------------------------
// BOM Generation -- Version Extraction, License Detection, Categorization
// ---------------------------------------------------------------------------

const KNOWN_LICENSES = {
  // npm / JS ecosystem
  react: "MIT",
  "react-dom": "MIT",
  next: "MIT",
  vue: "MIT",
  nuxt: "MIT",
  svelte: "MIT",
  angular: "MIT",
  "@angular/core": "MIT",
  "@angular/cli": "MIT",
  express: "MIT",
  fastify: "MIT",
  hono: "MIT",
  koa: "MIT",
  nestjs: "MIT",
  "@nestjs/core": "MIT",
  "@nestjs/common": "MIT",
  typescript: "Apache-2.0",
  tailwindcss: "MIT",
  postcss: "MIT",
  autoprefixer: "MIT",
  vite: "MIT",
  webpack: "MIT",
  esbuild: "MIT",
  rollup: "MIT",
  eslint: "MIT",
  prettier: "MIT",
  "@biomejs/biome": "MIT",
  jest: "MIT",
  vitest: "MIT",
  "@playwright/test": "Apache-2.0",
  cypress: "MIT",
  prisma: "Apache-2.0",
  "@prisma/client": "Apache-2.0",
  drizzle: "Apache-2.0",
  "drizzle-orm": "Apache-2.0",
  zod: "MIT",
  axios: "MIT",
  lodash: "MIT",
  dayjs: "MIT",
  date_fns: "MIT",
  zustand: "MIT",
  "@reduxjs/toolkit": "MIT",
  pinia: "MIT",
  mobx: "MIT",
  jotai: "MIT",
  "@tanstack/react-query": "MIT",
  swr: "MIT",
  "react-hook-form": "MIT",
  storybook: "MIT",
  "@storybook/react": "MIT",
  husky: "MIT",
  "lint-staged": "MIT",
  // Python
  django: "BSD-3-Clause",
  flask: "BSD-3-Clause",
  fastapi: "MIT",
  uvicorn: "BSD-3-Clause",
  gunicorn: "MIT",
  celery: "BSD-3-Clause",
  sqlalchemy: "MIT",
  alembic: "MIT",
  pydantic: "MIT",
  pytest: "MIT",
  black: "MIT",
  ruff: "MIT",
  mypy: "MIT",
  requests: "Apache-2.0",
  httpx: "BSD-3-Clause",
  numpy: "BSD-3-Clause",
  pandas: "BSD-3-Clause",
  scipy: "BSD-3-Clause",
  // Java / Spring
  "spring-boot": "Apache-2.0",
  "spring-boot-starter-web": "Apache-2.0",
  "spring-boot-starter-data-jpa": "Apache-2.0",
  "spring-security": "Apache-2.0",
  "spring-boot-starter-test": "Apache-2.0",
  lombok: "MIT",
  "jackson-databind": "Apache-2.0",
  "hibernate-core": "LGPL-2.1",
  junit: "EPL-2.0",
  "junit-jupiter": "EPL-2.0",
  mockito: "MIT",
  "mockito-core": "MIT",
  mapstruct: "Apache-2.0",
  // .NET
  "Microsoft.AspNetCore": "MIT",
  "Microsoft.EntityFrameworkCore": "MIT",
  "Swashbuckle.AspNetCore": "MIT",
  AutoMapper: "MIT",
  FluentValidation: "Apache-2.0",
  Serilog: "Apache-2.0",
  MediatR: "Apache-2.0",
  xunit: "Apache-2.0",
  NUnit: "MIT",
  Moq: "BSD-3-Clause",
  Polly: "BSD-3-Clause",
  // Go
  "github.com/gin-gonic/gin": "MIT",
  "github.com/gorilla/mux": "BSD-3-Clause",
  "github.com/labstack/echo": "MIT",
  "github.com/gofiber/fiber": "MIT",
  "gorm.io/gorm": "MIT",
  "github.com/stretchr/testify": "MIT",
  "go.uber.org/zap": "MIT",
  "github.com/spf13/viper": "MIT",
  // Rust
  actix_web: "MIT/Apache-2.0",
  axum: "MIT",
  tokio: "MIT",
  serde: "MIT/Apache-2.0",
  diesel: "MIT/Apache-2.0",
  sqlx: "MIT/Apache-2.0",
  // PHP
  "laravel/framework": "MIT",
  "symfony/framework-bundle": "MIT",
  "phpunit/phpunit": "BSD-3-Clause",
  "guzzlehttp/guzzle": "MIT",
  // Ruby
  rails: "MIT",
  rspec: "MIT",
  puma: "BSD-3-Clause",
  sidekiq: "LGPL-3.0",
  devise: "MIT",
  rubocop: "MIT",
};

function extractNpmVersions(root, scanDirs) {
  const deps = [];
  const lockPath = path.join(root, "package-lock.json");
  const lockData = readJsonSafe(lockPath);

  for (const dir of scanDirs) {
    const pkg = readJsonSafe(path.join(dir, "package.json"));
    if (!pkg) continue;
    const source =
      dir === root
        ? "package.json"
        : path.relative(root, path.join(dir, "package.json"));
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };
    const isDev = new Set(Object.keys(pkg.devDependencies || {}));
    for (const [name, range] of Object.entries(allDeps)) {
      let version = range;
      if (lockData && lockData.packages) {
        const lockEntry = lockData.packages["node_modules/" + name];
        if (lockEntry && lockEntry.version) version = lockEntry.version;
      }
      deps.push({
        name,
        version: version.replace(/^[\^~>=<]+/, ""),
        source,
        dev: isDev.has(name),
      });
    }
  }
  return deps;
}

function extractPythonVersions(root, scanDirs) {
  const deps = [];
  const files = [
    "requirements.txt",
    "requirements-dev.txt",
    "requirements/base.txt",
    "requirements/production.txt",
  ];
  for (const dir of scanDirs) {
    for (const file of files) {
      const content = readTextSafe(path.join(dir, file));
      if (!content) continue;
      const source =
        dir === root ? file : path.relative(root, path.join(dir, file));
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-"))
          continue;
        const match = trimmed.match(
          /^([a-zA-Z0-9_-]+)\s*(?:[=<>!~]+\s*(.+))?$/,
        );
        if (match)
          deps.push({
            name: match[1],
            version: match[2] || "*",
            source,
            dev: false,
          });
      }
    }
    const pyproject = readTextSafe(path.join(dir, "pyproject.toml"));
    if (pyproject) {
      const source =
        dir === root
          ? "pyproject.toml"
          : path.relative(root, path.join(dir, "pyproject.toml"));
      let inDeps = false;
      const depSectionPattern =
        /^\[(?:project\.dependencies|tool\.poetry\.dependencies|tool\.poetry\.group\.[^\]]+\.dependencies)\]$/;
      for (const line of pyproject.split("\n")) {
        const trimmed = line.trim();
        if (depSectionPattern.test(trimmed)) {
          inDeps = true;
          continue;
        }
        if (trimmed.startsWith("[") && inDeps) {
          inDeps = depSectionPattern.test(trimmed);
          continue;
        }
        if (inDeps) {
          const match = trimmed.match(
            /^"?([a-zA-Z0-9_-]+)(?:\s*[=<>!~]+\s*"?([^"]+)"?)?/,
          );
          if (match && match[1] !== "python")
            deps.push({
              name: match[1],
              version: match[2] || "*",
              source,
              dev: false,
            });
        }
      }
    }
  }
  return deps;
}

function extractMavenVersions(root, scanDirs) {
  const deps = [];
  for (const dir of scanDirs) {
    const content = readTextSafe(path.join(dir, "pom.xml"));
    if (!content) continue;
    const source =
      dir === root ? "pom.xml" : path.relative(root, path.join(dir, "pom.xml"));
    const depRegex = /<dependency>\s*([\s\S]*?)<\/dependency>/gi;
    let match;
    while ((match = depRegex.exec(content)) !== null) {
      const block = match[1];
      const artifactMatch = block.match(
        /<artifactId>\s*([^<]+)\s*<\/artifactId>/i,
      );
      const versionMatch = block.match(/<version>\s*([^<]+)\s*<\/version>/i);
      const scopeMatch = block.match(/<scope>\s*([^<]+)\s*<\/scope>/i);
      if (artifactMatch) {
        deps.push({
          name: artifactMatch[1].trim(),
          version: versionMatch ? versionMatch[1].trim() : "*",
          source,
          dev: scopeMatch ? scopeMatch[1].trim() === "test" : false,
        });
      }
    }
    // License from pom.xml
    const licBlock = content.match(/<licenses>\s*([\s\S]*?)<\/licenses>/i);
    if (licBlock) {
      const licName = licBlock[1].match(/<name>\s*([^<]+)\s*<\/name>/i);
      if (licName) deps._pomLicense = licName[1].trim();
    }
  }
  return deps;
}

function extractGradleVersions(root, scanDirs) {
  const deps = [];
  for (const dir of scanDirs) {
    for (const gf of ["build.gradle", "build.gradle.kts"]) {
      const content = readTextSafe(path.join(dir, gf));
      if (!content) continue;
      const source =
        dir === root ? gf : path.relative(root, path.join(dir, gf));
      const patterns = [
        /(?:implementation|api|compileOnly|runtimeOnly|testImplementation|testRuntimeOnly|kapt|annotationProcessor)\s*\(?['"]([^'"]+)['"]\)?/gi,
      ];
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const parts = match[1].split(":");
          if (parts.length >= 2) {
            deps.push({
              name: parts[1],
              version: parts[2] || "*",
              source,
              dev: match[0].includes("test") || match[0].includes("Test"),
            });
          }
        }
      }
      break;
    }
  }
  return deps;
}

function extractCsprojVersions(root, scanDirs) {
  const deps = [];
  for (const dir of scanDirs) {
    const csprojFiles = findFilesRecursive(dir, ".csproj", 3);
    for (const csf of csprojFiles) {
      const content = readTextSafe(csf);
      if (!content) continue;
      const source = path.relative(root, csf);
      const pattern =
        /<PackageReference\s+Include="([^"]+)"(?:\s+Version="([^"]+)")?/gi;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        deps.push({
          name: match[1],
          version: match[2] || "*",
          source,
          dev: false,
        });
      }
    }
  }
  return deps;
}

function extractGoModVersions(root, scanDirs) {
  const deps = [];
  for (const dir of scanDirs) {
    const content = readTextSafe(path.join(dir, "go.mod"));
    if (!content) continue;
    const source =
      dir === root ? "go.mod" : path.relative(root, path.join(dir, "go.mod"));
    const singleReq = /^require\s+(\S+)\s+(\S+)/gm;
    let match;
    while ((match = singleReq.exec(content)) !== null) {
      deps.push({ name: match[1], version: match[2], source, dev: false });
    }
    const blockMatch = content.match(/require\s*\(([\s\S]*?)\)/g);
    if (blockMatch) {
      for (const block of blockMatch) {
        for (const line of block.split("\n")) {
          const trimmed = line.trim();
          if (
            trimmed.startsWith("//") ||
            trimmed === "require (" ||
            trimmed === ")"
          )
            continue;
          const modMatch = trimmed.match(/^(\S+)\s+(\S+)/);
          if (modMatch)
            deps.push({
              name: modMatch[1],
              version: modMatch[2],
              source,
              dev: false,
            });
        }
      }
    }
  }
  return deps;
}

function extractCargoVersions(root, scanDirs) {
  const deps = [];
  for (const dir of scanDirs) {
    const content = readTextSafe(path.join(dir, "Cargo.toml"));
    if (!content) continue;
    const source =
      dir === root
        ? "Cargo.toml"
        : path.relative(root, path.join(dir, "Cargo.toml"));
    const sections = {
      "[dependencies]": false,
      "[dev-dependencies]": true,
      "[build-dependencies]": false,
    };
    const lines = content.split("\n");
    let inDeps = false;
    let isDev = false;
    for (const line of lines) {
      const trimmed = line.trim();
      const sectionKey = Object.keys(sections).find(
        (s) => trimmed.toLowerCase() === s.toLowerCase(),
      );
      if (sectionKey) {
        inDeps = true;
        isDev = sections[sectionKey];
        continue;
      }
      if (trimmed.startsWith("[") && inDeps) {
        inDeps = false;
        continue;
      }
      if (inDeps && trimmed && !trimmed.startsWith("#")) {
        const crateMatch = trimmed.match(
          /^([a-zA-Z0-9_-]+)\s*=\s*(?:"([^"]+)"|{[^}]*version\s*=\s*"([^"]+)")?/,
        );
        if (crateMatch) {
          deps.push({
            name: crateMatch[1],
            version: crateMatch[2] || crateMatch[3] || "*",
            source,
            dev: isDev,
          });
        }
      }
    }
  }
  return deps;
}

function extractComposerVersions(root, scanDirs) {
  const deps = [];
  for (const dir of scanDirs) {
    const lockContent = readJsonSafe(path.join(dir, "composer.lock"));
    const composerContent = readJsonSafe(path.join(dir, "composer.json"));
    const source =
      dir === root
        ? "composer.json"
        : path.relative(root, path.join(dir, "composer.json"));
    if (lockContent) {
      for (const pkg of lockContent.packages || []) {
        deps.push({
          name: pkg.name,
          version: (pkg.version || "").replace(/^v/, ""),
          source,
          dev: false,
        });
      }
      for (const pkg of lockContent["packages-dev"] || []) {
        deps.push({
          name: pkg.name,
          version: (pkg.version || "").replace(/^v/, ""),
          source,
          dev: true,
        });
      }
    } else if (composerContent) {
      const allReq = {
        ...(composerContent.require || {}),
        ...(composerContent["require-dev"] || {}),
      };
      const devSet = new Set(Object.keys(composerContent["require-dev"] || {}));
      for (const [name, version] of Object.entries(allReq)) {
        if (name === "php") continue;
        deps.push({
          name,
          version: version.replace(/^[\^~>=<]+/, ""),
          source,
          dev: devSet.has(name),
        });
      }
    }
  }
  return deps;
}

function extractGemfileVersions(root, scanDirs) {
  const deps = [];
  for (const dir of scanDirs) {
    const lockContent = readTextSafe(path.join(dir, "Gemfile.lock"));
    const gemfileContent = readTextSafe(path.join(dir, "Gemfile"));
    const source =
      dir === root ? "Gemfile" : path.relative(root, path.join(dir, "Gemfile"));
    if (lockContent) {
      const specSection = lockContent.match(/specs:\n([\s\S]*?)(?=\n\S|\n\n)/);
      if (specSection) {
        const specPattern = /^\s{4}(\S+)\s+\(([^)]+)\)/gm;
        let match;
        while ((match = specPattern.exec(specSection[1])) !== null) {
          deps.push({
            name: match[1],
            version: match[2],
            source: "Gemfile.lock",
            dev: false,
          });
        }
      }
    } else if (gemfileContent) {
      const gemPattern =
        /^\s*gem\s+['"]([^'"]+)['"](?:,\s*['"]([^'"]+)['"])?/gm;
      let match;
      while ((match = gemPattern.exec(gemfileContent)) !== null) {
        deps.push({
          name: match[1],
          version: match[2] ? match[2].replace(/^[~>=<]+\s*/, "") : "*",
          source,
          dev: false,
        });
      }
    }
  }
  return deps;
}

function extractPubspecVersions(root, scanDirs) {
  const deps = [];
  for (const dir of scanDirs) {
    const content = readTextSafe(path.join(dir, "pubspec.yaml"));
    if (!content) continue;
    const source =
      dir === root
        ? "pubspec.yaml"
        : path.relative(root, path.join(dir, "pubspec.yaml"));
    let inDeps = false;
    let isDev = false;
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed === "dependencies:") {
        inDeps = true;
        isDev = false;
        continue;
      }
      if (trimmed === "dev_dependencies:") {
        inDeps = true;
        isDev = true;
        continue;
      }
      if (inDeps && line.match(/^\S/) && !trimmed.startsWith("#")) {
        inDeps = false;
        continue;
      }
      if (inDeps && trimmed && !trimmed.startsWith("#")) {
        const match = trimmed.match(
          /^([a-zA-Z0-9_]+)\s*:\s*(?:\^?([0-9][^\s#]*)|"?\^?([0-9][^"]*)"?)?/,
        );
        if (match)
          deps.push({
            name: match[1],
            version: match[2] || match[3] || "*",
            source,
            dev: isDev,
          });
      }
    }
  }
  return deps;
}

function extractMixVersions(root, scanDirs) {
  const deps = [];
  for (const dir of scanDirs) {
    const content = readTextSafe(path.join(dir, "mix.exs"));
    if (!content) continue;
    const source =
      dir === root ? "mix.exs" : path.relative(root, path.join(dir, "mix.exs"));
    const depsBlock = content.match(/defp?\s+deps\b[\s\S]*?\[\s*([\s\S]*?)\]/);
    if (depsBlock) {
      const entryPattern = /\{:([a-zA-Z0-9_]+),\s*"([^"]+)"/g;
      let match;
      while ((match = entryPattern.exec(depsBlock[1])) !== null) {
        deps.push({
          name: match[1],
          version: match[2].replace(/^[~>=<]+\s*/, ""),
          source,
          dev: false,
        });
      }
    }
  }
  return deps;
}

function extractSbtVersions(root, scanDirs) {
  const deps = [];
  for (const dir of scanDirs) {
    const content = readTextSafe(path.join(dir, "build.sbt"));
    if (!content) continue;
    const source =
      dir === root
        ? "build.sbt"
        : path.relative(root, path.join(dir, "build.sbt"));
    const depPattern = /"([^"]+)"\s*%%?\s*"([^"]+)"\s*%\s*"([^"]+)"/g;
    let match;
    while ((match = depPattern.exec(content)) !== null) {
      deps.push({ name: match[2], version: match[3], source, dev: false });
    }
  }
  return deps;
}

function lookupNpmLicenses(root, deps) {
  for (const dep of deps) {
    if (dep.license) continue;
    const pkgJson = readJsonSafe(
      path.join(root, "node_modules", dep.name, "package.json"),
    );
    if (pkgJson && pkgJson.license) {
      dep.license =
        typeof pkgJson.license === "string"
          ? pkgJson.license
          : pkgJson.license.type || "n/a";
    }
  }
}

function lookupComposerLicenses(root, deps) {
  for (const dep of deps) {
    if (dep.license) continue;
    const parts = dep.name.split("/");
    if (parts.length === 2) {
      const vendorPkg = readJsonSafe(
        path.join(root, "vendor", parts[0], parts[1], "composer.json"),
      );
      if (vendorPkg && vendorPkg.license) {
        dep.license = Array.isArray(vendorPkg.license)
          ? vendorPkg.license.join("/")
          : vendorPkg.license;
      }
    }
  }
}

function lookupCargoLicenses(root, deps) {
  for (const dep of deps) {
    if (dep.license) continue;
    const content = readTextSafe(path.join(root, "Cargo.toml"));
    if (content) {
      const licMatch = content.match(/^license\s*=\s*"([^"]+)"/m);
      if (licMatch) dep._projectLicense = licMatch[1];
    }
  }
}

function applyKnownLicenses(deps) {
  for (const dep of deps) {
    if (dep.license) continue;
    const key = dep.name.toLowerCase().replace(/-/g, "_");
    dep.license = KNOWN_LICENSES[dep.name] || KNOWN_LICENSES[key] || "n/a";
  }
}

function categorizeDeps(deps) {
  const categories = {
    Frontend: [],
    Backend: [],
    Testing: [],
    "Quality / Linting": [],
    "Build Tools": [],
    DevOps: [],
    Other: [],
  };

  const allMapEntries = {};
  for (const [field, entries] of Object.entries(DETECTION_MAP)) {
    for (const entry of entries)
      allMapEntries[entry.dep] =
        field.split(".")[0] === "frontend" ? "Frontend" : "Backend";
  }
  for (const [field, entries] of Object.entries(PYTHON_MAP || {})) {
    for (const entry of entries)
      allMapEntries[entry.dep] =
        field.split(".")[0] === "frontend" ? "Frontend" : "Backend";
  }
  for (const mapName of [
    JAVA_MAP,
    DOTNET_MAP,
    GO_MAP,
    RUST_MAP,
    PHP_MAP,
    RUBY_MAP,
    DART_MAP,
    ELIXIR_MAP,
    SCALA_MAP,
  ]) {
    if (!mapName) continue;
    for (const [field, entries] of Object.entries(mapName)) {
      for (const entry of entries) {
        const section = field.split(".")[0];
        allMapEntries[entry.dep] =
          section === "frontend" ? "Frontend" : "Backend";
      }
    }
  }

  const testingPatterns =
    /jest|vitest|mocha|ava|jasmine|karma|tap|uvu|playwright|cypress|nightwatch|webdriverio|testcafe|puppeteer|pytest|unittest|rspec|phpunit|xunit|nunit|junit|testify|specs|test/i;
  const qualityPatterns =
    /eslint|prettier|biome|oxlint|dprint|stylelint|husky|lint-staged|rubocop|phpstan|pylint|flake8|black|ruff|mypy|clippy|golangci|checkstyle|spotless|detekt|sonar/i;
  const buildPatterns =
    /vite|webpack|esbuild|rollup|parcel|turbopack|swc|babel|postcss|autoprefixer|tsup|unbuild|nx|turborepo|lerna/i;
  const devopsPatterns =
    /docker|kubernetes|helm|terraform|pulumi|serverless|aws-cdk|storybook|vercel|netlify/i;

  for (const dep of deps) {
    if (testingPatterns.test(dep.name)) {
      categories["Testing"].push(dep);
      continue;
    }
    if (qualityPatterns.test(dep.name)) {
      categories["Quality / Linting"].push(dep);
      continue;
    }
    if (buildPatterns.test(dep.name)) {
      categories["Build Tools"].push(dep);
      continue;
    }
    if (devopsPatterns.test(dep.name)) {
      categories["DevOps"].push(dep);
      continue;
    }
    const mapped = allMapEntries[dep.name];
    if (mapped) {
      categories[mapped].push(dep);
      continue;
    }
    categories["Other"].push(dep);
  }

  return categories;
}

function buildMermaidDiagram(analysisResult) {
  const d = analysisResult.detected;
  const lines = ["```mermaid", "graph TB"];

  const frontendNodes = [];
  const backendNodes = [];
  const dataNodes = [];
  const devopsNodes = [];

  if (d.frontend.framework !== "none")
    frontendNodes.push(`FW["${d.frontend.framework}"]`);
  if (d.frontend.styling !== "none")
    frontendNodes.push(`ST["${d.frontend.styling}"]`);
  if (d.frontend.stateManagement !== "none")
    frontendNodes.push(`SM["${d.frontend.stateManagement}"]`);
  if (d.frontend.uiLibrary !== "none")
    frontendNodes.push(`UI["${d.frontend.uiLibrary}"]`);
  if (d.frontend.bundler !== "none")
    frontendNodes.push(`BU["${d.frontend.bundler}"]`);

  if (d.backend.framework !== "none")
    backendNodes.push(`BE["${d.backend.framework}"]`);
  if (d.backend.orm !== "none") backendNodes.push(`ORM["${d.backend.orm}"]`);
  if (d.backend.validation !== "none")
    backendNodes.push(`VAL["${d.backend.validation}"]`);
  if (d.backend.caching !== "none")
    backendNodes.push(`CACHE["${d.backend.caching}"]`);
  if (d.backend.messageQueue !== "none")
    backendNodes.push(`MQ["${d.backend.messageQueue}"]`);

  if (d.backend.database !== "none")
    dataNodes.push(`DB[("${d.backend.database}")]`);

  if (d.devops.testing !== "none")
    devopsNodes.push(`TEST["${d.devops.testing}"]`);
  if (d.devops.quality !== "none")
    devopsNodes.push(`LINT["${d.devops.quality}"]`);
  if (d.devops.cicd !== "none") devopsNodes.push(`CI["${d.devops.cicd}"]`);
  if (d.devops.deployment !== "unknown")
    devopsNodes.push(`DEPLOY["${d.devops.deployment}"]`);

  if (frontendNodes.length > 0) {
    lines.push('    subgraph Frontend["Frontend Layer"]');
    for (const n of frontendNodes) lines.push("        " + n);
    lines.push("    end");
  }
  if (backendNodes.length > 0) {
    lines.push('    subgraph Backend["Backend Layer"]');
    for (const n of backendNodes) lines.push("        " + n);
    lines.push("    end");
  }
  if (dataNodes.length > 0) {
    lines.push('    subgraph Data["Data Layer"]');
    for (const n of dataNodes) lines.push("        " + n);
    lines.push("    end");
  }
  if (devopsNodes.length > 0) {
    lines.push('    subgraph DevOps["DevOps / Tooling"]');
    for (const n of devopsNodes) lines.push("        " + n);
    lines.push("    end");
  }

  if (frontendNodes.length > 0 && backendNodes.length > 0)
    lines.push("    Frontend --> Backend");
  if (backendNodes.length > 0 && dataNodes.length > 0)
    lines.push("    Backend --> Data");
  if (devopsNodes.length > 0 && frontendNodes.length > 0)
    lines.push("    DevOps -.-> Frontend");
  if (devopsNodes.length > 0 && backendNodes.length > 0)
    lines.push("    DevOps -.-> Backend");

  lines.push("");
  lines.push("    classDef frontend fill:#4FC3F7,stroke:#0288D1,color:#000");
  lines.push("    classDef backend fill:#81C784,stroke:#388E3C,color:#000");
  lines.push("    classDef data fill:#FFB74D,stroke:#F57C00,color:#000");
  lines.push("    classDef devops fill:#CE93D8,stroke:#7B1FA2,color:#000");

  if (frontendNodes.length > 0)
    lines.push(
      "    class " +
        frontendNodes.map((n) => n.split("[")[0]).join(",") +
        " frontend",
    );
  if (backendNodes.length > 0)
    lines.push(
      "    class " +
        backendNodes.map((n) => n.split("[")[0]).join(",") +
        " backend",
    );
  if (dataNodes.length > 0)
    lines.push(
      "    class " + dataNodes.map((n) => n.split("[")[0]).join(",") + " data",
    );
  if (devopsNodes.length > 0)
    lines.push(
      "    class " +
        devopsNodes.map((n) => n.split("[")[0]).join(",") +
        " devops",
    );

  lines.push("```");
  return lines.join("\n");
}

function generateBOM() {
  const analysisResult = analyzeProject();
  const d = analysisResult.detected;
  const scanDirs = collectAllScanDirs(
    PROJECT_ROOT,
    d.meta.monorepoWorkspaces,
    [],
  );

  // Collect all dependencies with versions
  let allDeps = [];
  const npmDeps = extractNpmVersions(PROJECT_ROOT, scanDirs);
  const pyDeps = extractPythonVersions(PROJECT_ROOT, scanDirs);
  const mavenDeps = extractMavenVersions(PROJECT_ROOT, scanDirs);
  const gradleDeps = extractGradleVersions(PROJECT_ROOT, scanDirs);
  const csprojDeps = extractCsprojVersions(PROJECT_ROOT, scanDirs);
  const goDeps = extractGoModVersions(PROJECT_ROOT, scanDirs);
  const cargoDeps = extractCargoVersions(PROJECT_ROOT, scanDirs);
  const composerDeps = extractComposerVersions(PROJECT_ROOT, scanDirs);
  const gemDeps = extractGemfileVersions(PROJECT_ROOT, scanDirs);
  const pubspecDeps = extractPubspecVersions(PROJECT_ROOT, scanDirs);
  const mixDeps = extractMixVersions(PROJECT_ROOT, scanDirs);
  const sbtDeps = extractSbtVersions(PROJECT_ROOT, scanDirs);

  // License detection (tier 1: local metadata)
  lookupNpmLicenses(PROJECT_ROOT, npmDeps);
  lookupComposerLicenses(PROJECT_ROOT, composerDeps);
  lookupCargoLicenses(PROJECT_ROOT, cargoDeps);

  allDeps = [
    ...npmDeps,
    ...pyDeps,
    ...mavenDeps,
    ...gradleDeps,
    ...csprojDeps,
    ...goDeps,
    ...cargoDeps,
    ...composerDeps,
    ...gemDeps,
    ...pubspecDeps,
    ...mixDeps,
    ...sbtDeps,
  ];

  // Deduplicate by name (keep first occurrence, prefer version with actual value)
  const seen = new Map();
  for (const dep of allDeps) {
    const existing = seen.get(dep.name);
    if (!existing || (existing.version === "*" && dep.version !== "*")) {
      seen.set(dep.name, dep);
    }
  }
  allDeps = Array.from(seen.values());

  // License detection (tier 3: known licenses fallback)
  applyKnownLicenses(allDeps);

  // Categorize
  const categories = categorizeDeps(allDeps);

  // Detect ecosystems
  const ecosystems = new Set();
  if (npmDeps.length > 0) ecosystems.add("npm");
  if (pyDeps.length > 0) ecosystems.add("Python");
  if (mavenDeps.length > 0) ecosystems.add("Maven");
  if (gradleDeps.length > 0) ecosystems.add("Gradle");
  if (csprojDeps.length > 0) ecosystems.add(".NET");
  if (goDeps.length > 0) ecosystems.add("Go");
  if (cargoDeps.length > 0) ecosystems.add("Rust");
  if (composerDeps.length > 0) ecosystems.add("PHP");
  if (gemDeps.length > 0) ecosystems.add("Ruby");
  if (pubspecDeps.length > 0) ecosystems.add("Dart");
  if (mixDeps.length > 0) ecosystems.add("Elixir");
  if (sbtDeps.length > 0) ecosystems.add("Scala");

  // License summary
  const licenseCounts = {};
  for (const dep of allDeps) {
    const lic = dep.license || "n/a";
    licenseCounts[lic] = (licenseCounts[lic] || 0) + 1;
  }
  const sortedLicenses = Object.entries(licenseCounts).sort(
    (a, b) => b[1] - a[1],
  );

  // Build Mermaid diagram
  const mermaid = buildMermaidDiagram(analysisResult);

  // Build markdown
  const now = new Date().toISOString().split("T")[0];
  const lines = [];
  lines.push("# Bill of Materials");
  lines.push("");
  lines.push(
    `> Generated: ${now} | Dependencies: ${allDeps.length} | Ecosystems: ${Array.from(ecosystems).join(", ") || "none detected"}`,
  );
  lines.push("");

  // Tech Stack Overview
  lines.push("## Tech Stack Overview");
  lines.push("");
  lines.push(mermaid);
  lines.push("");

  // License Summary
  lines.push("## License Summary");
  lines.push("");
  lines.push("| License | Count | Percentage |");
  lines.push("| ------- | ----- | ---------- |");
  for (const [lic, count] of sortedLicenses) {
    const pct =
      allDeps.length > 0 ? ((count / allDeps.length) * 100).toFixed(0) : 0;
    lines.push(`| ${lic} | ${count} | ${pct}% |`);
  }
  lines.push("");

  // Dependencies by Category
  lines.push("## Dependencies by Category");
  lines.push("");
  for (const [category, deps] of Object.entries(categories)) {
    if (deps.length === 0) continue;
    const sorted = deps.sort((a, b) => a.name.localeCompare(b.name));
    lines.push(`### ${category} (${deps.length} packages)`);
    lines.push("");
    lines.push("| Package | Version | License | Source |");
    lines.push("| ------- | ------- | ------- | ------ |");
    for (const dep of sorted) {
      lines.push(
        `| ${dep.name} | ${dep.version} | ${dep.license || "n/a"} | ${dep.source} |`,
      );
    }
    lines.push("");
  }

  // Write file
  const docsDir = path.join(PROJECT_ROOT, ".windsurf", "docs");
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  const bomPath = path.join(docsDir, "BOM.md");
  fs.writeFileSync(bomPath, lines.join("\n"), "utf8");

  return {
    success: true,
    path: bomPath,
    totalDeps: allDeps.length,
    ecosystems: Array.from(ecosystems),
    categories: Object.fromEntries(
      Object.entries(categories)
        .map(([k, v]) => [k, v.length])
        .filter(([, v]) => v > 0),
    ),
    licenses: Object.fromEntries(sortedLicenses),
  };
}

// ---------------------------------------------------------------------------
// Dashboard -- SBOM, Security Scan, License Policy, Aggregation
// ---------------------------------------------------------------------------

const DASHBOARD_DIR = path.join(PROJECT_ROOT, ".windsurf", "dashboard");
const DASHBOARD_DATA_PATH = path.join(
  PROJECT_ROOT,
  ".windsurf",
  "dashboard-data.json",
);
const LICENSE_POLICY_PATH = path.join(DASHBOARD_DIR, "license-policy.json");
const LICENSE_POLICY_DEFAULT = path.join(
  __dirname,
  "license-policy-default.json",
);

const LICENSE_RISK_MAP = {
  MIT: "permissive",
  "Apache-2.0": "permissive",
  "BSD-2-Clause": "permissive",
  "BSD-3-Clause": "permissive",
  ISC: "permissive",
  Unlicense: "permissive",
  "0BSD": "permissive",
  Zlib: "permissive",
  "CC0-1.0": "permissive",
  "CC-BY-3.0": "permissive",
  "CC-BY-4.0": "permissive",
  "BlueOak-1.0.0": "permissive",
  "MIT/Apache-2.0": "permissive",
  "LGPL-2.0": "weak-copyleft",
  "LGPL-2.1": "weak-copyleft",
  "LGPL-3.0": "weak-copyleft",
  "MPL-2.0": "weak-copyleft",
  "CDDL-1.0": "weak-copyleft",
  "EPL-1.0": "weak-copyleft",
  "EPL-2.0": "weak-copyleft",
  "Artistic-2.0": "weak-copyleft",
  "GPL-2.0": "strong-copyleft",
  "GPL-3.0": "strong-copyleft",
  "AGPL-3.0": "strong-copyleft",
  "EUPL-1.2": "strong-copyleft",
  "SSPL-1.0": "strong-copyleft",
};

function ensureDashboardDirs() {
  const dirs = [
    DASHBOARD_DIR,
    path.join(DASHBOARD_DIR, "sbom"),
    path.join(DASHBOARD_DIR, "security"),
    path.join(DASHBOARD_DIR, "licenses"),
    path.join(DASHBOARD_DIR, "code-quality"),
    path.join(DASHBOARD_DIR, "a11y"),
    path.join(DASHBOARD_DIR, "performance"),
    path.join(DASHBOARD_DIR, "seo"),
    path.join(DASHBOARD_DIR, "runs"),
  ];
  for (const d of dirs) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }
}

function readDashboardData() {
  if (fs.existsSync(DASHBOARD_DATA_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(DASHBOARD_DATA_PATH, "utf8"));
    } catch {
      // corrupted file, start fresh
    }
  }
  return { projects: [], runs: [], globalStats: {} };
}

function writeDashboardData(data) {
  const dir = path.dirname(DASHBOARD_DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DASHBOARD_DATA_PATH, JSON.stringify(data, null, 2), "utf8");
}

function loadLicensePolicy() {
  if (fs.existsSync(LICENSE_POLICY_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(LICENSE_POLICY_PATH, "utf8"));
    } catch {
      // fall through to default
    }
  }
  try {
    return JSON.parse(fs.readFileSync(LICENSE_POLICY_DEFAULT, "utf8"));
  } catch {
    return {
      allowed: ["MIT", "Apache-2.0", "BSD-3-Clause", "ISC"],
      review: [],
      forbidden: [],
    };
  }
}

function classifyLicenseRisk(license) {
  if (!license || license === "n/a") return "unknown";
  return LICENSE_RISK_MAP[license] || "unknown";
}

function deduplicateDeps(deps) {
  const seen = new Map();
  for (const dep of deps) {
    const existing = seen.get(dep.name);
    if (!existing || (existing.version === "*" && dep.version !== "*")) {
      seen.set(dep.name, dep);
    }
  }
  return Array.from(seen.values());
}

function generateSBOM() {
  ensureDashboardDirs();
  const analysisResult = analyzeProject();
  const d = analysisResult.detected;
  const scanDirs = collectAllScanDirs(
    PROJECT_ROOT,
    d.meta.monorepoWorkspaces,
    [],
  );

  const npmDeps = extractNpmVersions(PROJECT_ROOT, scanDirs);
  const pyDeps = extractPythonVersions(PROJECT_ROOT, scanDirs);
  const mavenDeps = extractMavenVersions(PROJECT_ROOT, scanDirs);
  const gradleDeps = extractGradleVersions(PROJECT_ROOT, scanDirs);
  const csprojDeps = extractCsprojVersions(PROJECT_ROOT, scanDirs);
  const goDeps = extractGoModVersions(PROJECT_ROOT, scanDirs);
  const cargoDeps = extractCargoVersions(PROJECT_ROOT, scanDirs);
  const composerDeps = extractComposerVersions(PROJECT_ROOT, scanDirs);
  const gemDeps = extractGemfileVersions(PROJECT_ROOT, scanDirs);
  const pubspecDeps = extractPubspecVersions(PROJECT_ROOT, scanDirs);
  const mixDeps = extractMixVersions(PROJECT_ROOT, scanDirs);
  const sbtDeps = extractSbtVersions(PROJECT_ROOT, scanDirs);

  lookupNpmLicenses(PROJECT_ROOT, npmDeps);
  lookupComposerLicenses(PROJECT_ROOT, composerDeps);
  lookupCargoLicenses(PROJECT_ROOT, cargoDeps);

  let allDeps = [
    ...npmDeps,
    ...pyDeps,
    ...mavenDeps,
    ...gradleDeps,
    ...csprojDeps,
    ...goDeps,
    ...cargoDeps,
    ...composerDeps,
    ...gemDeps,
    ...pubspecDeps,
    ...mixDeps,
    ...sbtDeps,
  ];

  const seen = new Map();
  for (const dep of allDeps) {
    const existing = seen.get(dep.name);
    if (!existing || (existing.version === "*" && dep.version !== "*")) {
      seen.set(dep.name, dep);
    }
  }
  allDeps = Array.from(seen.values());
  applyKnownLicenses(allDeps);

  const categories = categorizeDeps(allDeps);

  const ecosystemMap = {
    npm: deduplicateDeps(npmDeps),
    Python: deduplicateDeps(pyDeps),
    Maven: deduplicateDeps(mavenDeps),
    Gradle: deduplicateDeps(gradleDeps),
    ".NET": deduplicateDeps(csprojDeps),
    Go: deduplicateDeps(goDeps),
    Rust: deduplicateDeps(cargoDeps),
    PHP: deduplicateDeps(composerDeps),
    Ruby: deduplicateDeps(gemDeps),
    Dart: deduplicateDeps(pubspecDeps),
    Elixir: deduplicateDeps(mixDeps),
    Scala: deduplicateDeps(sbtDeps),
  };

  const ecosystems = [];
  for (const [ecoName, ecoDeps] of Object.entries(ecosystemMap)) {
    if (ecoDeps.length === 0) continue;
    const normalizedDeps = ecoDeps.map((dep) => {
      const fullDep = seen.get(dep.name) || dep;
      const categoryName = Object.entries(categories).find(([, deps]) =>
        deps.some((d) => d.name === dep.name),
      );
      return {
        name: dep.name,
        version: dep.version,
        direct: !dep.dev,
        dev: dep.dev || false,
        category: categoryName
          ? categoryName[0]
              .toLowerCase()
              .replace(/ \/ /g, "-")
              .replace(/ /g, "-")
          : "other",
        license: fullDep.license || "n/a",
        spdxId:
          fullDep.license && fullDep.license !== "n/a" ? fullDep.license : null,
        licenseRisk: classifyLicenseRisk(fullDep.license),
        securityStatus: "ok",
        vulnerabilities: [],
        source: dep.source,
      };
    });
    ecosystems.push({ type: ecoName, dependencies: normalizedDeps });
  }

  const projectName = getProjectName();
  const sbom = {
    project: projectName,
    generatedAt: new Date().toISOString(),
    totalDependencies: allDeps.length,
    directDependencies: allDeps.filter((d) => !d.dev).length,
    devDependencies: allDeps.filter((d) => d.dev).length,
    ecosystems,
    techStack: {
      languages: (d.meta.programmingLanguages || []).filter(
        (l) => l !== "none",
      ),
      frameworks: [d.frontend.framework, d.backend.framework].filter(
        (f) => f && f !== "none",
      ),
      packageManager: d.meta.packageManager || "unknown",
    },
  };

  const sbomPath = path.join(DASHBOARD_DIR, "sbom", `${projectName}.json`);
  fs.writeFileSync(sbomPath, JSON.stringify(sbom, null, 2), "utf8");

  return { success: true, path: sbomPath, sbom };
}

function getProjectName() {
  const pkg = readJsonSafe(path.join(PROJECT_ROOT, "package.json"));
  if (pkg && pkg.name) return pkg.name.replace(/[^a-zA-Z0-9_-]/g, "-");
  return path.basename(PROJECT_ROOT).replace(/[^a-zA-Z0-9_-]/g, "-");
}

function runSecurityScan() {
  ensureDashboardDirs();
  const projectName = getProjectName();
  const result = {
    project: projectName,
    scannedAt: new Date().toISOString(),
    tools: [],
    summary: { critical: 0, high: 0, medium: 0, low: 0 },
    findings: [],
  };

  // npm audit
  if (fs.existsSync(path.join(PROJECT_ROOT, "package.json"))) {
    try {
      const { execSync } = require("child_process");
      const auditOutput = execSync("npm audit --json 2>&1", {
        cwd: PROJECT_ROOT,
        encoding: "utf8",
        timeout: 60000,
        stdio: ["pipe", "pipe", "pipe"],
      });
      const auditData = JSON.parse(auditOutput);
      result.tools.push("npm-audit");

      if (auditData.vulnerabilities) {
        for (const [pkgName, vuln] of Object.entries(
          auditData.vulnerabilities,
        )) {
          const severity = (vuln.severity || "low").toLowerCase();
          if (result.summary[severity] !== undefined)
            result.summary[severity]++;

          const finding = {
            package: pkgName,
            installedVersion: vuln.range || "*",
            fixedIn: vuln.fixAvailable
              ? typeof vuln.fixAvailable === "object"
                ? vuln.fixAvailable.version || "available"
                : "available"
              : null,
            severity,
            dependencyType: vuln.isDirect ? "direct" : "transitive",
            ecosystem: "npm",
            cveIds: (vuln.via || [])
              .filter((v) => typeof v === "object" && v.url)
              .map((v) => v.url.split("/").pop())
              .filter((id) => id.startsWith("CVE-") || id.startsWith("GHSA-")),
            description: Array.isArray(vuln.via)
              ? vuln.via.filter((v) => typeof v === "string").join(", ") ||
                vuln.via
                  .filter((v) => typeof v === "object")
                  .map((v) => v.title || "")
                  .filter(Boolean)
                  .join(", ")
              : String(vuln.via || ""),
          };
          result.findings.push(finding);
        }
      } else if (auditData.advisories) {
        // npm v6 format
        for (const [, advisory] of Object.entries(auditData.advisories)) {
          const severity = (advisory.severity || "low").toLowerCase();
          if (result.summary[severity] !== undefined)
            result.summary[severity]++;
          result.findings.push({
            package: advisory.module_name,
            installedVersion: advisory.findings
              ? advisory.findings.map((f) => f.version).join(", ")
              : "*",
            fixedIn: advisory.patched_versions || null,
            severity,
            dependencyType: "unknown",
            ecosystem: "npm",
            cveIds: advisory.cves || [],
            description: advisory.title || advisory.overview || "",
          });
        }
      }
    } catch (err) {
      // npm audit exits with non-zero when vulns found, try to parse stdout
      if (err.stdout) {
        try {
          const auditData = JSON.parse(err.stdout);
          result.tools.push("npm-audit");
          if (auditData.vulnerabilities) {
            for (const [pkgName, vuln] of Object.entries(
              auditData.vulnerabilities,
            )) {
              const severity = (vuln.severity || "low").toLowerCase();
              if (result.summary[severity] !== undefined)
                result.summary[severity]++;
              result.findings.push({
                package: pkgName,
                installedVersion: vuln.range || "*",
                fixedIn: vuln.fixAvailable
                  ? typeof vuln.fixAvailable === "object"
                    ? vuln.fixAvailable.version || "available"
                    : "available"
                  : null,
                severity,
                dependencyType: vuln.isDirect ? "direct" : "transitive",
                ecosystem: "npm",
                cveIds: (vuln.via || [])
                  .filter((v) => typeof v === "object" && v.url)
                  .map((v) => v.url.split("/").pop())
                  .filter(
                    (id) => id.startsWith("CVE-") || id.startsWith("GHSA-"),
                  ),
                description: Array.isArray(vuln.via)
                  ? vuln.via.filter((v) => typeof v === "string").join(", ") ||
                    vuln.via
                      .filter((v) => typeof v === "object")
                      .map((v) => v.title || "")
                      .filter(Boolean)
                      .join(", ")
                  : String(vuln.via || ""),
              });
            }
          }
        } catch {
          result.tools.push("npm-audit (parse-error)");
        }
      } else {
        result.tools.push("npm-audit (unavailable)");
      }
    }
  }

  result.summary.total =
    result.summary.critical +
    result.summary.high +
    result.summary.medium +
    result.summary.low;
  result.fixable = result.findings.filter((f) => f.fixedIn).length;

  const secPath = path.join(DASHBOARD_DIR, "security", `${projectName}.json`);
  fs.writeFileSync(secPath, JSON.stringify(result, null, 2), "utf8");

  return { success: true, path: secPath, result };
}

function evaluateLicensePolicy() {
  ensureDashboardDirs();
  const projectName = getProjectName();
  const policy = loadLicensePolicy();

  const sbomPath = path.join(DASHBOARD_DIR, "sbom", `${projectName}.json`);
  if (!fs.existsSync(sbomPath)) {
    return {
      success: false,
      error: "SBOM not found. Run /generate-sbom first.",
    };
  }

  const sbom = JSON.parse(fs.readFileSync(sbomPath, "utf8"));
  const allowedSet = new Set(
    (policy.allowed || []).map((l) => l.toLowerCase()),
  );
  const reviewSet = new Set((policy.review || []).map((l) => l.toLowerCase()));
  const forbiddenSet = new Set(
    (policy.forbidden || []).map((l) => l.toLowerCase()),
  );

  const violations = [];
  const unknownLicenses = [];
  const reviewNeeded = [];
  let overallStatus = "ok";

  for (const eco of sbom.ecosystems || []) {
    for (const dep of eco.dependencies || []) {
      const license = (dep.license || "n/a").toLowerCase();
      if (license === "n/a" || license === "unknown") {
        unknownLicenses.push({
          package: dep.name,
          version: dep.version,
          license: dep.license,
          ecosystem: eco.type,
        });
        if (overallStatus === "ok") overallStatus = "warning";
      } else if (forbiddenSet.has(license)) {
        violations.push({
          package: dep.name,
          version: dep.version,
          license: dep.license,
          policy: "forbidden",
          ecosystem: eco.type,
        });
        overallStatus = "violation";
      } else if (reviewSet.has(license)) {
        reviewNeeded.push({
          package: dep.name,
          version: dep.version,
          license: dep.license,
          policy: "needs-review",
          ecosystem: eco.type,
        });
        if (overallStatus === "ok") overallStatus = "warning";
      }
      // allowed -> no action
    }
  }

  const evaluation = {
    project: projectName,
    evaluatedAt: new Date().toISOString(),
    policyStatus: overallStatus,
    violations,
    reviewNeeded,
    unknownLicenses,
    stats: {
      totalChecked: (sbom.ecosystems || []).reduce(
        (sum, eco) => sum + (eco.dependencies || []).length,
        0,
      ),
      forbidden: violations.length,
      needsReview: reviewNeeded.length,
      unknown: unknownLicenses.length,
    },
  };

  const licPath = path.join(DASHBOARD_DIR, "licenses", `${projectName}.json`);
  fs.writeFileSync(licPath, JSON.stringify(evaluation, null, 2), "utf8");

  return { success: true, path: licPath, evaluation };
}

// ---------------------------------------------------------------------------
// Static Analysis Scanners (Code Quality, A11y, Performance, SEO)
// ---------------------------------------------------------------------------

const SOURCE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".py", ".cs", ".java", ".kt",
  ".go", ".rs", ".php", ".rb", ".ex", ".scala", ".dart",
]);
const UI_EXTENSIONS = new Set([".tsx", ".jsx", ".html", ".vue", ".svelte"]);
const SKIP_DIRS = new Set([
  "node_modules", ".git", ".windsurf", "dist", "build", ".next",
  "__pycache__", ".venv", "venv", "vendor", "target", "bin", "obj",
  ".nuxt", ".output", "coverage", ".turbo", ".cache",
]);

function collectSourceFiles(dir, extensions, maxDepth, depth) {
  if (depth === undefined) depth = 0;
  if (maxDepth === undefined) maxDepth = 8;
  const results = [];
  if (depth > maxDepth) return results;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return results; }
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      results.push(...collectSourceFiles(fullPath, extensions, maxDepth, depth + 1));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (extensions.has(ext)) {
        results.push({ path: fullPath, name: entry.name, ext });
      }
    }
  }
  return results;
}

function relPath(filePath) {
  return path.relative(PROJECT_ROOT, filePath).replace(/\\/g, "/");
}

// ---- Code Quality Scanner ----
function runCodeQualityScan() {
  ensureDashboardDirs();
  const files = collectSourceFiles(PROJECT_ROOT, SOURCE_EXTENSIONS);
  const findings = [];
  let totalLines = 0;
  let totalFiles = files.length;
  let anyCount = 0;
  let todoCount = 0;
  let emptyCatchCount = 0;
  let consoleLogCount = 0;
  let maxFuncLen = 0;
  const funcLengths = [];

  for (const file of files) {
    let content;
    try { content = fs.readFileSync(file.path, "utf8"); } catch { continue; }
    const lines = content.split("\n");
    totalLines += lines.length;
    const rel = relPath(file.path);
    const isTest = /\.(test|spec)\.[jt]sx?$/.test(file.name) || /^test_/.test(file.name) || /_test\.(go|rs|py)$/.test(file.name);

    // File length check
    if (lines.length > 500) {
      findings.push({ severity: "high", category: "file-length", file: rel, line: 1, description: `File has ${lines.length} lines (threshold: 500)` });
    } else if (lines.length > 300) {
      findings.push({ severity: "medium", category: "file-length", file: rel, line: 1, description: `File has ${lines.length} lines (threshold: 300)` });
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // any type usage (TS/JS only)
      if ((file.ext === ".ts" || file.ext === ".tsx") && /:\s*any[\s,;)>]/.test(line) && !/\/\//.test(line.split(":")[0])) {
        anyCount++;
        findings.push({ severity: "medium", category: "any-type", file: rel, line: lineNum, description: "Usage of 'any' type disables type safety" });
      }

      // TODO/FIXME/HACK
      if (/\/\/\s*(TODO|FIXME|HACK|XXX)\b/i.test(line) || /#\s*(TODO|FIXME|HACK)\b/i.test(line)) {
        todoCount++;
        findings.push({ severity: "low", category: "todo", file: rel, line: lineNum, description: line.trim().substring(0, 120) });
      }

      // console.log in non-test files
      if (!isTest && /console\.(log|debug|info)\s*\(/.test(line) && !/\/\//.test(line.split("console")[0])) {
        consoleLogCount++;
        findings.push({ severity: "low", category: "console-log", file: rel, line: lineNum, description: "console.log in production code" });
      }

      // Empty catch blocks
      if (/catch\s*(\([^)]*\))?\s*\{\s*\}/.test(line) || (line.trim() === "catch {" && i + 1 < lines.length && lines[i + 1].trim() === "}")) {
        emptyCatchCount++;
        findings.push({ severity: "high", category: "empty-catch", file: rel, line: lineNum, description: "Empty catch block swallows errors silently" });
      }

      // Magic numbers (in assignments, not in imports/const declarations of 0/1/-1)
      if (/=\s*[2-9]\d{2,}[^a-zA-Z]/.test(line) && !/const |let |var |import|require|\.length|\.size|index|offset|port|status|timeout/i.test(line)) {
        findings.push({ severity: "low", category: "magic-number", file: rel, line: lineNum, description: "Magic number detected; consider using a named constant" });
      }
    }

    // Simple function length detection (TS/JS/Java/C#)
    if ([".ts", ".tsx", ".js", ".jsx", ".java", ".cs"].includes(file.ext)) {
      const funcRegex = /^[ \t]*(export\s+)?(async\s+)?function\s+\w+|^[ \t]*(public|private|protected|static|async)?\s*(async\s+)?\w+\s*\([^)]*\)\s*(\{|=>)/gm;
      let match;
      while ((match = funcRegex.exec(content)) !== null) {
        const startLine = content.substring(0, match.index).split("\n").length;
        let braces = 0;
        let started = false;
        let endLine = startLine;
        for (let j = startLine - 1; j < lines.length; j++) {
          const l = lines[j];
          for (const ch of l) {
            if (ch === "{") { braces++; started = true; }
            if (ch === "}") braces--;
          }
          if (started && braces <= 0) { endLine = j + 1; break; }
        }
        const funcLen = endLine - startLine + 1;
        funcLengths.push(funcLen);
        if (funcLen > maxFuncLen) maxFuncLen = funcLen;
        if (funcLen > 50) {
          findings.push({ severity: "high", category: "function-length", file: rel, line: startLine, description: `Function is ${funcLen} lines (threshold: 50)` });
        } else if (funcLen > 20) {
          findings.push({ severity: "medium", category: "function-length", file: rel, line: startLine, description: `Function is ${funcLen} lines (threshold: 20)` });
        }
      }
    }
  }

  const avgFuncLen = funcLengths.length > 0 ? Math.round(funcLengths.reduce((a, b) => a + b, 0) / funcLengths.length) : 0;
  const summary = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) summary[f.severity] = (summary[f.severity] || 0) + 1;
  const total = summary.critical + summary.high + summary.medium + summary.low;
  const score = Math.max(0, Math.min(100, 100 - summary.critical * 15 - summary.high * 5 - summary.medium * 2 - Math.min(summary.low, 20)));

  const result = {
    project: getProjectName(),
    scannedAt: new Date().toISOString(),
    score,
    summary,
    findings: findings.sort((a, b) => {
      const sev = { critical: 0, high: 1, medium: 2, low: 3 };
      return (sev[a.severity] || 4) - (sev[b.severity] || 4);
    }),
    metrics: {
      totalFiles,
      totalLines,
      avgFunctionLength: avgFuncLen,
      maxFunctionLength: maxFuncLen,
      anyUsageCount: anyCount,
      todoCount,
      emptyCatchCount,
      consoleLogCount,
    },
  };

  const outPath = path.join(DASHBOARD_DIR, "code-quality", `${result.project}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");
  return { success: true, path: outPath, result };
}

// ---- Accessibility Scanner ----
function runA11yScan() {
  ensureDashboardDirs();
  const files = collectSourceFiles(PROJECT_ROOT, UI_EXTENSIONS);
  const findings = [];
  const catSummary = {
    semanticHtml: { pass: 0, fail: 0 },
    keyboard: { pass: 0, fail: 0 },
    aria: { pass: 0, fail: 0 },
    images: { pass: 0, fail: 0 },
    forms: { pass: 0, fail: 0 },
    headings: { pass: 0, fail: 0 },
  };

  for (const file of files) {
    let content;
    try { content = fs.readFileSync(file.path, "utf8"); } catch { continue; }
    const lines = content.split("\n");
    const rel = relPath(file.path);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // img without alt
      if (/<img\b[^>]*>/i.test(line) && !/<img\b[^>]*\balt\s*=/i.test(line)) {
        findings.push({ severity: "critical", category: "images", rule: "missing-alt-text", wcag: "1.1.1", file: rel, line: lineNum, description: "Image missing alt attribute" });
        catSummary.images.fail++;
      } else if (/<img\b[^>]*\balt\s*=/i.test(line)) {
        catSummary.images.pass++;
      }

      // div/span with onClick but no role/button
      if (/<(div|span)\b[^>]*\bonClick\b/i.test(line) && !/<(div|span)\b[^>]*\brole\s*=\s*["']button["']/i.test(line) && !/<button\b/i.test(line)) {
        findings.push({ severity: "high", category: "keyboard", rule: "click-on-non-interactive", wcag: "2.1.1", file: rel, line: lineNum, description: "onClick on non-interactive element without role='button' and tabIndex" });
        catSummary.keyboard.fail++;
      }

      // input/select/textarea without label
      if (/<(input|select|textarea)\b/i.test(line) && !/<label\b/i.test(lines.slice(Math.max(0, i - 3), i + 1).join("\n")) && !/aria-label/i.test(line) && !/type\s*=\s*["']hidden["']/i.test(line)) {
        findings.push({ severity: "high", category: "forms", rule: "missing-label", wcag: "1.3.1", file: rel, line: lineNum, description: "Form element without associated label or aria-label" });
        catSummary.forms.fail++;
      } else if (/<(input|select|textarea)\b/i.test(line)) {
        catSummary.forms.pass++;
      }

      // tabIndex > 0
      if (/tabIndex\s*=\s*["'{\s]*([2-9]|\d{2,})/i.test(line) || /tabindex\s*=\s*["']([2-9]|\d{2,})["']/i.test(line)) {
        findings.push({ severity: "medium", category: "keyboard", rule: "positive-tabindex", wcag: "2.4.3", file: rel, line: lineNum, description: "Positive tabIndex disrupts natural tab order" });
        catSummary.keyboard.fail++;
      }

      // Icon button without aria-label
      if (/<button\b[^>]*>/i.test(line) && !/aria-label/i.test(line)) {
        const nextContent = lines.slice(i, Math.min(i + 3, lines.length)).join("");
        if (/<(svg|Icon|img)\b/i.test(nextContent) && !/>[\w\s]+<\/button>/i.test(nextContent)) {
          findings.push({ severity: "medium", category: "aria", rule: "icon-button-no-label", wcag: "4.1.2", file: rel, line: lineNum, description: "Icon-only button without aria-label" });
          catSummary.aria.fail++;
        }
      }
    }

    // Check for html lang attribute
    if (file.ext === ".html" && /<html\b/i.test(content) && !/<html\b[^>]*\blang\s*=/i.test(content)) {
      findings.push({ severity: "high", category: "semanticHtml", rule: "missing-html-lang", wcag: "3.1.1", file: rel, line: 1, description: "Missing lang attribute on <html> element" });
      catSummary.semanticHtml.fail++;
    }

    // Heading hierarchy check
    const headingMatches = [...content.matchAll(/<h([1-6])\b/gi)];
    if (headingMatches.length > 0) {
      const levels = headingMatches.map(m => parseInt(m[1]));
      const h1Count = levels.filter(l => l === 1).length;
      if (h1Count > 1) {
        findings.push({ severity: "medium", category: "headings", rule: "multiple-h1", wcag: "1.3.1", file: rel, line: 1, description: `Multiple H1 tags found (${h1Count})` });
        catSummary.headings.fail++;
      }
      for (let j = 1; j < levels.length; j++) {
        if (levels[j] > levels[j - 1] + 1) {
          findings.push({ severity: "medium", category: "headings", rule: "heading-skip", wcag: "1.3.1", file: rel, line: 1, description: `Heading level skipped: H${levels[j - 1]} to H${levels[j]}` });
          catSummary.headings.fail++;
          break;
        }
      }
      if (h1Count <= 1) catSummary.headings.pass++;
    }
  }

  const summary = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) summary[f.severity] = (summary[f.severity] || 0) + 1;
  const score = Math.max(0, Math.min(100, 100 - summary.critical * 15 - summary.high * 5 - summary.medium * 2 - summary.low));

  const result = {
    project: getProjectName(),
    scannedAt: new Date().toISOString(),
    score,
    summary,
    findings: findings.sort((a, b) => {
      const sev = { critical: 0, high: 1, medium: 2, low: 3 };
      return (sev[a.severity] || 4) - (sev[b.severity] || 4);
    }),
    categorySummary: catSummary,
  };

  const outPath = path.join(DASHBOARD_DIR, "a11y", `${result.project}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");
  return { success: true, path: outPath, result };
}

// ---- Performance Scanner ----
function runPerformanceScan() {
  ensureDashboardDirs();
  const allFiles = collectSourceFiles(PROJECT_ROOT, SOURCE_EXTENSIONS);
  const uiFiles = collectSourceFiles(PROJECT_ROOT, UI_EXTENSIONS);
  const findings = [];
  let nPlusOne = 0, fullImports = 0, missingLazy = 0, useClientOveruse = 0;

  for (const file of allFiles) {
    let content;
    try { content = fs.readFileSync(file.path, "utf8"); } catch { continue; }
    const lines = content.split("\n");
    const rel = relPath(file.path);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // N+1: DB query patterns inside loops
      if (/for\s*\(|\.forEach\(|\.map\(|while\s*\(/.test(line)) {
        const loopBlock = lines.slice(i, Math.min(i + 15, lines.length)).join("\n");
        if (/\.(find|findOne|findById|findUnique|query|execute|fetch|get)\s*\(/.test(loopBlock) && /await\s/.test(loopBlock)) {
          findings.push({ severity: "critical", category: "n-plus-1", file: rel, line: lineNum, description: "Potential N+1: async DB/API call inside loop" });
          nPlusOne++;
        }
      }

      // Full library imports
      if (/import\s+\w+\s+from\s+["'](lodash|moment|date-fns|rxjs)["']/.test(line)) {
        findings.push({ severity: "high", category: "bundle-size", file: rel, line: lineNum, description: "Importing entire library; use subpath import for tree-shaking" });
        fullImports++;
      }
    }
  }

  // UI-specific checks
  for (const file of uiFiles) {
    let content;
    try { content = fs.readFileSync(file.path, "utf8"); } catch { continue; }
    const lines = content.split("\n");
    const rel = relPath(file.path);

    // use client overuse in Next.js
    if ((file.ext === ".tsx" || file.ext === ".jsx") && /["']use client["']/.test(lines[0] || "")) {
      const hasInteractivity = /useState|useEffect|useRef|onClick|onChange|onSubmit|addEventListener/.test(content);
      if (!hasInteractivity) {
        findings.push({ severity: "medium", category: "use-client", file: rel, line: 1, description: "'use client' without apparent interactivity; consider Server Component" });
        useClientOveruse++;
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Images without lazy loading
      if (/<img\b/i.test(line) && !/loading\s*=\s*["'](lazy|eager)["']/i.test(line) && !/priority/i.test(line) && !/<Image\b/.test(line)) {
        findings.push({ severity: "medium", category: "image-loading", file: rel, line: lineNum, description: "Image without explicit loading strategy (lazy/eager)" });
        missingLazy++;
      }

      // Images without dimensions (CLS risk)
      if (/<img\b[^>]*>/i.test(line) && !/width\s*=/i.test(line) && !/<Image\b/.test(line)) {
        findings.push({ severity: "medium", category: "cls", file: rel, line: lineNum, description: "Image without width/height attributes (CLS risk)" });
      }
    }
  }

  const summary = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) summary[f.severity] = (summary[f.severity] || 0) + 1;
  const score = Math.max(0, Math.min(100, 100 - summary.critical * 15 - summary.high * 5 - summary.medium * 2 - summary.low));

  const result = {
    project: getProjectName(),
    scannedAt: new Date().toISOString(),
    score,
    summary,
    findings: findings.sort((a, b) => {
      const sev = { critical: 0, high: 1, medium: 2, low: 3 };
      return (sev[a.severity] || 4) - (sev[b.severity] || 4);
    }),
    codePatterns: {
      summary: { nPlusOne, fullImports, missingLazy, useClientOveruse },
    },
  };

  const outPath = path.join(DASHBOARD_DIR, "performance", `${result.project}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");
  return { success: true, path: outPath, result };
}

// ---- SEO Scanner ----
function runSEOScan() {
  ensureDashboardDirs();
  const findings = [];
  const checks = {
    metaTags: { title: false, description: false, viewport: false, charset: false },
    openGraph: { ogTitle: false, ogDescription: false, ogImage: false },
    structuredData: { hasJsonLd: false, schemas: [] },
    technical: { hasSitemap: false, hasRobotsTxt: false, hasCanonical: false, hasFavicon: false },
    headingHierarchy: { valid: true, issues: [] },
    imageAlt: { total: 0, missing: 0, decorativeMarked: 0 },
    links: { totalInternal: 0 },
  };

  // Technical file checks
  if (fileExists(path.join(PROJECT_ROOT, "public", "robots.txt")) || fileExists(path.join(PROJECT_ROOT, "robots.txt"))) {
    checks.technical.hasRobotsTxt = true;
  } else {
    findings.push({ severity: "high", category: "technical", check: "robots.txt", file: "-", description: "Missing robots.txt file" });
  }

  if (fileExists(path.join(PROJECT_ROOT, "public", "sitemap.xml")) || fileExists(path.join(PROJECT_ROOT, "sitemap.xml"))) {
    checks.technical.hasSitemap = true;
  } else {
    findings.push({ severity: "high", category: "technical", check: "sitemap.xml", file: "-", description: "Missing sitemap.xml file" });
  }

  const faviconPaths = ["public/favicon.ico", "public/favicon.png", "public/favicon.svg", "app/favicon.ico", "src/app/favicon.ico"];
  checks.technical.hasFavicon = faviconPaths.some(f => fileExists(path.join(PROJECT_ROOT, f)));
  if (!checks.technical.hasFavicon) {
    findings.push({ severity: "medium", category: "technical", check: "favicon", file: "-", description: "No favicon found in common locations" });
  }

  // Scan HTML/layout files for meta tags and structure
  const htmlFiles = collectSourceFiles(PROJECT_ROOT, new Set([".html", ".tsx", ".jsx", ".vue", ".svelte"]));
  const layoutFiles = htmlFiles.filter(f =>
    /layout\.(tsx|jsx|html|vue)$/.test(f.name) ||
    /index\.html$/.test(f.name) ||
    /_app\.(tsx|jsx)$/.test(f.name) ||
    /app\.vue$/.test(f.name) ||
    /head\.(tsx|jsx)$/.test(f.name)
  );

  // If no layout files found, scan all HTML files
  const filesToScan = layoutFiles.length > 0 ? layoutFiles : htmlFiles.slice(0, 20);

  for (const file of filesToScan) {
    let content;
    try { content = fs.readFileSync(file.path, "utf8"); } catch { continue; }
    const rel = relPath(file.path);

    // Meta tags
    if (/<title[\s>]/i.test(content) || /title\s*[:=]/.test(content)) checks.metaTags.title = true;
    if (/meta.*name\s*=\s*["']description["']/i.test(content) || /description\s*[:=]/.test(content)) checks.metaTags.description = true;
    if (/meta.*name\s*=\s*["']viewport["']/i.test(content)) checks.metaTags.viewport = true;
    if (/charset\s*=\s*["']?utf-8/i.test(content) || /<meta\s+charset/i.test(content)) checks.metaTags.charset = true;

    // Open Graph
    if (/og:title/i.test(content) || /openGraph.*title/i.test(content)) checks.openGraph.ogTitle = true;
    if (/og:description/i.test(content) || /openGraph.*description/i.test(content)) checks.openGraph.ogDescription = true;
    if (/og:image/i.test(content) || /openGraph.*images/i.test(content)) checks.openGraph.ogImage = true;

    // Structured Data
    if (/application\/ld\+json/i.test(content) || /JsonLd|jsonLd|json-ld/i.test(content)) {
      checks.structuredData.hasJsonLd = true;
    }

    // Canonical
    if (/rel\s*=\s*["']canonical["']/i.test(content) || /canonical/i.test(content)) {
      checks.technical.hasCanonical = true;
    }
  }

  // Generate findings from meta tag checks
  if (!checks.metaTags.title) {
    findings.push({ severity: "critical", category: "meta-tags", check: "title", file: "-", description: "Missing <title> tag" });
  }
  if (!checks.metaTags.description) {
    findings.push({ severity: "critical", category: "meta-tags", check: "meta-description", file: "-", description: "Missing meta description" });
  }
  if (!checks.openGraph.ogTitle) {
    findings.push({ severity: "medium", category: "open-graph", check: "og:title", file: "-", description: "Missing Open Graph title" });
  }
  if (!checks.openGraph.ogDescription) {
    findings.push({ severity: "medium", category: "open-graph", check: "og:description", file: "-", description: "Missing Open Graph description" });
  }
  if (!checks.openGraph.ogImage) {
    findings.push({ severity: "medium", category: "open-graph", check: "og:image", file: "-", description: "Missing Open Graph image" });
  }
  if (!checks.structuredData.hasJsonLd) {
    findings.push({ severity: "medium", category: "structured-data", check: "json-ld", file: "-", description: "No JSON-LD structured data found" });
  }
  if (!checks.technical.hasCanonical) {
    findings.push({ severity: "low", category: "technical", check: "canonical", file: "-", description: "No canonical URL found" });
  }

  // Image alt scan across all UI files
  for (const file of htmlFiles.slice(0, 50)) {
    let content;
    try { content = fs.readFileSync(file.path, "utf8"); } catch { continue; }
    const imgMatches = content.match(/<img\b[^>]*>/gi) || [];
    for (const img of imgMatches) {
      checks.imageAlt.total++;
      if (!/alt\s*=/i.test(img)) {
        checks.imageAlt.missing++;
      } else if (/alt\s*=\s*["']\s*["']/i.test(img)) {
        checks.imageAlt.decorativeMarked++;
      }
    }
  }

  // Heading hierarchy check across scanned files
  for (const file of htmlFiles.slice(0, 30)) {
    let content;
    try { content = fs.readFileSync(file.path, "utf8"); } catch { continue; }
    const rel = relPath(file.path);
    const headings = [...content.matchAll(/<h([1-6])\b/gi)].map(m => parseInt(m[1]));
    const h1s = headings.filter(h => h === 1).length;
    if (h1s > 1) {
      checks.headingHierarchy.valid = false;
      checks.headingHierarchy.issues.push(`Multiple H1 tags in ${rel}`);
      findings.push({ severity: "medium", category: "headings", check: "multiple-h1", file: rel, description: `Multiple H1 tags found (${h1s})` });
    }
    for (let j = 1; j < headings.length; j++) {
      if (headings[j] > headings[j - 1] + 1) {
        checks.headingHierarchy.valid = false;
        checks.headingHierarchy.issues.push(`H${headings[j - 1]} to H${headings[j]} skip in ${rel}`);
        findings.push({ severity: "low", category: "headings", check: "heading-skip", file: rel, description: `Heading level skip: H${headings[j - 1]} to H${headings[j]}` });
        break;
      }
    }
  }

  const summary = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) summary[f.severity] = (summary[f.severity] || 0) + 1;
  const score = Math.max(0, Math.min(100, 100 - summary.critical * 15 - summary.high * 8 - summary.medium * 3 - summary.low));

  const result = {
    project: getProjectName(),
    scannedAt: new Date().toISOString(),
    score,
    summary,
    findings: findings.sort((a, b) => {
      const sev = { critical: 0, high: 1, medium: 2, low: 3 };
      return (sev[a.severity] || 4) - (sev[b.severity] || 4);
    }),
    checks,
  };

  const outPath = path.join(DASHBOARD_DIR, "seo", `${result.project}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");
  return { success: true, path: outPath, result };
}

function aggregateDashboard() {
  ensureDashboardDirs();
  const data = readDashboardData();
  const projectName = getProjectName();

  // Read SBOM
  const sbomPath = path.join(DASHBOARD_DIR, "sbom", `${projectName}.json`);
  const sbom = fs.existsSync(sbomPath)
    ? JSON.parse(fs.readFileSync(sbomPath, "utf8"))
    : null;

  // Read Security
  const secPath = path.join(DASHBOARD_DIR, "security", `${projectName}.json`);
  const security = fs.existsSync(secPath)
    ? JSON.parse(fs.readFileSync(secPath, "utf8"))
    : null;

  // Read License evaluation
  const licPath = path.join(DASHBOARD_DIR, "licenses", `${projectName}.json`);
  const licenseEval = fs.existsSync(licPath)
    ? JSON.parse(fs.readFileSync(licPath, "utf8"))
    : null;

  // Read new analysis data
  const cqPath = path.join(DASHBOARD_DIR, "code-quality", `${projectName}.json`);
  const cqData = fs.existsSync(cqPath) ? JSON.parse(fs.readFileSync(cqPath, "utf8")) : null;
  const a11yPath = path.join(DASHBOARD_DIR, "a11y", `${projectName}.json`);
  const a11yDataAgg = fs.existsSync(a11yPath) ? JSON.parse(fs.readFileSync(a11yPath, "utf8")) : null;
  const perfPath = path.join(DASHBOARD_DIR, "performance", `${projectName}.json`);
  const perfData = fs.existsSync(perfPath) ? JSON.parse(fs.readFileSync(perfPath, "utf8")) : null;
  const seoPath = path.join(DASHBOARD_DIR, "seo", `${projectName}.json`);
  const seoDataAgg = fs.existsSync(seoPath) ? JSON.parse(fs.readFileSync(seoPath, "utf8")) : null;

  // Calculate risk score: weighted across all domains
  let riskScore = 100;
  if (security) {
    riskScore -=
      15 *
      (security.result
        ? security.result.summary.critical
        : security.summary.critical);
    riskScore -=
      8 *
      (security.result ? security.result.summary.high : security.summary.high);
    riskScore -=
      3 *
      (security.result
        ? security.result.summary.medium
        : security.summary.medium);
    riskScore -=
      1 *
      (security.result ? security.result.summary.low : security.summary.low);
  }
  if (licenseEval) {
    const evalData = licenseEval.evaluation || licenseEval;
    riskScore -= 10 * (evalData.stats ? evalData.stats.forbidden : 0);
    riskScore -= 3 * (evalData.stats ? evalData.stats.unknown : 0);
  }
  // New domains contribute to risk score (weighted)
  if (cqData && cqData.score != null) riskScore -= Math.round((100 - cqData.score) * 0.10);
  if (a11yDataAgg && a11yDataAgg.score != null) riskScore -= Math.round((100 - a11yDataAgg.score) * 0.15);
  if (perfData && perfData.score != null) riskScore -= Math.round((100 - perfData.score) * 0.15);
  if (seoDataAgg && seoDataAgg.score != null) riskScore -= Math.round((100 - seoDataAgg.score) * 0.10);
  riskScore = Math.max(0, Math.min(100, riskScore));

  const secSummary = security
    ? security.result
      ? security.result.summary
      : security.summary
    : { critical: 0, high: 0, medium: 0, low: 0 };

  const licSummary = licenseEval
    ? {
        forbidden:
          (licenseEval.evaluation || licenseEval).stats?.forbidden || 0,
        unknown: (licenseEval.evaluation || licenseEval).stats?.unknown || 0,
        needsReview:
          (licenseEval.evaluation || licenseEval).stats?.needsReview || 0,
        policyStatus:
          (licenseEval.evaluation || licenseEval).policyStatus || "unknown",
      }
    : { forbidden: 0, unknown: 0, needsReview: 0, policyStatus: "unknown" };

  const projectEntry = {
    project: projectName,
    techStack: sbom
      ? sbom.techStack
      : { languages: [], frameworks: [], packageManager: "unknown" },
    sbomSummary: sbom
      ? {
          directDependencies: sbom.directDependencies || 0,
          devDependencies: sbom.devDependencies || 0,
          totalDependencies: sbom.totalDependencies || 0,
          ecosystems: (sbom.ecosystems || []).map((e) => e.type),
          lastGenerated: sbom.generatedAt,
        }
      : null,
    securitySummary: {
      ...secSummary,
      fixable: security
        ? security.result
          ? security.result.fixable
          : security.fixable || 0
        : 0,
      lastScan: security
        ? security.result
          ? security.result.scannedAt
          : security.scannedAt
        : null,
    },
    licenseSummary: licSummary,
    codeQualitySummary: cqData ? { score: cqData.score, ...cqData.summary, totalFiles: cqData.metrics?.totalFiles || 0 } : null,
    a11ySummary: a11yDataAgg ? { score: a11yDataAgg.score, ...a11yDataAgg.summary, wcagLevel: (a11yDataAgg.summary?.critical || 0) === 0 && (a11yDataAgg.summary?.high || 0) === 0 ? "AA" : "Below AA" } : null,
    performanceSummary: perfData ? { score: perfData.score, ...perfData.summary, bundleSizeKb: perfData.bundleAnalysis?.totalSizeKb || null } : null,
    seoSummary: seoDataAgg ? { score: seoDataAgg.score, ...seoDataAgg.summary, hasStructuredData: seoDataAgg.checks?.structuredData?.hasJsonLd || false } : null,
    riskScore,
    lastScan: new Date().toISOString(),
  };

  // Upsert project
  const existingIdx = data.projects.findIndex((p) => p.project === projectName);
  if (existingIdx >= 0) {
    data.projects[existingIdx] = projectEntry;
  } else {
    data.projects.push(projectEntry);
  }

  // Update global stats
  const globalVulns = { critical: 0, high: 0, medium: 0, low: 0 };
  let totalDeps = 0;
  const now = new Date();
  let scannedRecently = 0;
  for (const proj of data.projects) {
    if (proj.securitySummary) {
      globalVulns.critical += proj.securitySummary.critical || 0;
      globalVulns.high += proj.securitySummary.high || 0;
      globalVulns.medium += proj.securitySummary.medium || 0;
      globalVulns.low += proj.securitySummary.low || 0;
    }
    if (proj.sbomSummary) totalDeps += proj.sbomSummary.totalDependencies || 0;
    if (proj.lastScan) {
      const scanDate = new Date(proj.lastScan);
      if (now - scanDate < 7 * 24 * 60 * 60 * 1000) scannedRecently++;
    }
  }

  data.globalStats = {
    totalProjects: data.projects.length,
    totalVulnerabilities: globalVulns,
    totalDependencies: totalDeps,
    scanCoverage:
      data.projects.length > 0
        ? Math.round((scannedRecently / data.projects.length) * 100)
        : 0,
    lastUpdated: new Date().toISOString(),
  };

  // Rebuild runs[] from filesystem (scan dashboard/runs/ directories)
  const runsDir = path.join(DASHBOARD_DIR, "runs");
  const existingRunIds = new Set((data.runs || []).map((r) => r.id));
  if (fs.existsSync(runsDir)) {
    const workflows = fs.readdirSync(runsDir).filter((f) => {
      try {
        return fs.statSync(path.join(runsDir, f)).isDirectory();
      } catch {
        return false;
      }
    });
    for (const workflow of workflows) {
      const wfDir = path.join(runsDir, workflow);
      const dateDirs = fs.readdirSync(wfDir).filter((f) => {
        try {
          return fs.statSync(path.join(wfDir, f)).isDirectory();
        } catch {
          return false;
        }
      });
      for (const dateOrTs of dateDirs) {
        const dateOrTsDir = path.join(wfDir, dateOrTs);
        // New structure: [workflow]/[YYYY-MM-DD]/[timestamp]/findings.json
        // Legacy structure: [workflow]/[timestamp]/findings.json
        const isDateDir = /^\d{4}-\d{2}-\d{2}$/.test(dateOrTs);
        if (isDateDir) {
          const tsDirs = fs.readdirSync(dateOrTsDir).filter((f) => {
            try {
              return fs.statSync(path.join(dateOrTsDir, f)).isDirectory();
            } catch {
              return false;
            }
          });
          for (const ts of tsDirs) {
            const findingsPath = path.join(dateOrTsDir, ts, "findings.json");
            if (fs.existsSync(findingsPath)) {
              try {
                const entry = JSON.parse(fs.readFileSync(findingsPath, "utf8"));
                if (entry.id && !existingRunIds.has(entry.id)) {
                  data.runs.push(entry);
                  existingRunIds.add(entry.id);
                }
              } catch {
                /* skip corrupt files */
              }
            }
          }
        } else {
          // Legacy: direct timestamp dir under workflow
          const findingsPath = path.join(dateOrTsDir, "findings.json");
          if (fs.existsSync(findingsPath)) {
            try {
              const entry = JSON.parse(fs.readFileSync(findingsPath, "utf8"));
              if (entry.id && !existingRunIds.has(entry.id)) {
                data.runs.push(entry);
                existingRunIds.add(entry.id);
              }
            } catch {
              /* skip corrupt files */
            }
          }
        }
      }
    }
  }

  writeDashboardData(data);
  return { success: true, path: DASHBOARD_DATA_PATH, data };
}

function appendDashboardRun(runEntry) {
  ensureDashboardDirs();
  const data = readDashboardData();

  if (!runEntry.id) {
    runEntry.id =
      Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }
  if (!runEntry.timestamp) runEntry.timestamp = new Date().toISOString();
  if (!runEntry.project) runEntry.project = getProjectName();

  // Normalize reportPath to new structure: [workflow]/[YYYY-MM-DD]/[timestamp]/
  if (runEntry.reportPath && runEntry.workflow) {
    const ts = runEntry.timestamp.replace(/:/g, "-").replace(/\.\d+Z$/, "");
    const dateStr = runEntry.timestamp.slice(0, 10);
    runEntry.reportPath = `.windsurf/dashboard/runs/${runEntry.workflow}/${dateStr}/${ts}/`;
  }

  data.runs.push(runEntry);

  // Write run report files
  if (runEntry.reportPath) {
    const runDir = path.join(PROJECT_ROOT, runEntry.reportPath);
    if (!fs.existsSync(runDir)) fs.mkdirSync(runDir, { recursive: true });

    // findings.json
    fs.writeFileSync(
      path.join(runDir, "findings.json"),
      JSON.stringify(runEntry, null, 2),
      "utf8",
    );

    // report.md
    const reportLines = [
      `# ${runEntry.workflow} Report`,
      "",
      `> **Date:** ${runEntry.timestamp} | **Score:** ${runEntry.score}/${runEntry.maxScore || 100} | **Verdict:** ${runEntry.verdict || "n/a"}`,
      "",
      "## Summary",
      "",
      runEntry.summary || "No summary provided.",
      "",
      "## Findings",
      "",
      `- **Critical:** ${runEntry.findings?.critical || 0}`,
      `- **High:** ${runEntry.findings?.high || 0}`,
      `- **Medium:** ${runEntry.findings?.medium || 0}`,
      `- **Low:** ${runEntry.findings?.low || 0}`,
      "",
    ];
    if (runEntry.issues && runEntry.issues.length > 0) {
      reportLines.push("## Issues", "");
      for (const issue of runEntry.issues) reportLines.push(`- ${issue}`);
      reportLines.push("");
    }
    if (runEntry.highlights && runEntry.highlights.length > 0) {
      reportLines.push("## Highlights", "");
      for (const h of runEntry.highlights) reportLines.push(`- ${h}`);
      reportLines.push("");
    }
    fs.writeFileSync(
      path.join(runDir, "report.md"),
      reportLines.join("\n"),
      "utf8",
    );
  }

  writeDashboardData(data);
  return { success: true, run: runEntry };
}

// ---------------------------------------------------------------------------
// AGENTS.md Merge Logic
// ---------------------------------------------------------------------------

/**
 * Extract ASP-marked sections from AGENTS.md content.
 * Returns a Map of sectionName -> full section content (including markers).
 */
function extractAspSections(content) {
  const sections = new Map();
  const regex = /<!-- ASP:([^:]+):BEGIN -->\r?\n([\s\S]*?)<!-- ASP:\1:END -->/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    sections.set(match[1], match[0]);
  }
  return sections;
}

/**
 * Extract non-ASP content from AGENTS.md (project-specific content).
 * Returns content with ASP sections removed, trimmed of excessive whitespace.
 */
function extractProjectContent(content) {
  // Remove all ASP-marked sections
  let cleaned = content.replace(/<!-- ASP:[^:]+:BEGIN -->\r?\n[\s\S]*?<!-- ASP:[^:]+:END -->\r?\n?/g, "");
  // Remove the ASP header/version block if present
  cleaned = cleaned.replace(/^# Agent Context\r?\n\r?\n\*\*Version:\*\*\s*[\d.]+\r?\n\r?\n.*?base agent skill package.*?\r?\n\r?\n?/s, "");
  // Collapse multiple blank lines (handle both LF and CRLF)
  cleaned = cleaned.replace(/(\r?\n){3,}/g, "\n\n").trim();
  return cleaned;
}

/**
 * Read the ASP template AGENTS.md from the package templates directory.
 * Stored separately from the target AGENTS.md so the merge can work correctly
 * even when the package is copied into a project that already has an AGENTS.md.
 */
function readAspTemplate() {
  const templatePath = path.join(__dirname, "..", "templates", "AGENTS.md.template");
  if (!fs.existsSync(templatePath)) {
    throw new Error("ASP template not found at: " + templatePath);
  }
  return fs.readFileSync(templatePath, "utf8");
}

/**
 * Merge ASP sections into an existing AGENTS.md.
 *
 * Strategy:
 * 1. If no AGENTS.md exists -> write full template
 * 2. If AGENTS.md exists with ASP markers -> update only ASP sections in-place
 * 3. If AGENTS.md exists without ASP markers -> backup, prepend project content, append ASP sections
 *
 * @param {string} projectRoot - Path to the target project root
 * @param {object} options - { mode: "merge"|"overwrite"|"skip" }
 * @returns {object} - { action, backupPath?, sectionsUpdated, sectionsPreserved }
 */
function mergeAgentsMd(projectRoot, options = {}) {
  const targetPath = path.join(projectRoot, "AGENTS.md");
  const template = readAspTemplate();
  const templateSections = extractAspSections(template);
  const mode = options.mode || "merge";

  // Case 1: No existing AGENTS.md -- write full template
  if (!fs.existsSync(targetPath)) {
    fs.writeFileSync(targetPath, template, "utf8");
    console.log("[OK] AGENTS.md created (no existing file found)");
    return {
      action: "created",
      backupPath: null,
      sectionsUpdated: Array.from(templateSections.keys()),
      sectionsPreserved: []
    };
  }

  const existing = fs.readFileSync(targetPath, "utf8");

  // Mode: skip -- do nothing
  if (mode === "skip") {
    console.log("[OK] AGENTS.md merge skipped (mode: skip)");
    return {
      action: "skipped",
      backupPath: null,
      sectionsUpdated: [],
      sectionsPreserved: []
    };
  }

  // Mode: overwrite -- backup and replace entirely
  if (mode === "overwrite") {
    const backupPath = createAgentsMdBackup(targetPath, existing);
    fs.writeFileSync(targetPath, template, "utf8");
    console.log("[OK] AGENTS.md overwritten (backup: " + backupPath + ")");
    return {
      action: "overwritten",
      backupPath,
      sectionsUpdated: Array.from(templateSections.keys()),
      sectionsPreserved: []
    };
  }

  // Mode: merge (default)
  const existingHasMarkers = existing.includes("<!-- ASP:") && existing.includes(":BEGIN -->");

  // Case 2: Existing file already has ASP markers -- update in-place
  if (existingHasMarkers) {
    let merged = existing;
    const updated = [];

    for (const [name, sectionContent] of templateSections) {
      const sectionRegex = new RegExp(
        `<!-- ASP:${name}:BEGIN -->\\r?\\n[\\s\\S]*?<!-- ASP:${name}:END -->`,
        "g"
      );
      if (sectionRegex.test(merged)) {
        // Reset lastIndex after test() since we use the same regex for replace
        sectionRegex.lastIndex = 0;
        merged = merged.replace(sectionRegex, sectionContent);
        updated.push(name);
      } else {
        // New section not yet in target -- append before the last section or at end
        merged = merged.trimEnd() + "\n\n" + sectionContent + "\n";
        updated.push(name);
      }
    }

    // Create backup before writing
    const backupPath = createAgentsMdBackup(targetPath, existing);
    fs.writeFileSync(targetPath, merged, "utf8");
    console.log("[OK] AGENTS.md updated in-place (" + updated.length + " ASP sections)");

    // Detect project sections (non-ASP headings)
    const projectContent = extractProjectContent(merged);
    const projectHeadings = (projectContent.match(/^##?\s+.+$/gm) || []).map(h => h.replace(/^#+\s+/, ""));

    return {
      action: "updated",
      backupPath,
      sectionsUpdated: updated,
      sectionsPreserved: projectHeadings
    };
  }

  // Case 3: Existing file without ASP markers -- full merge
  const backupPath = createAgentsMdBackup(targetPath, existing);
  const projectContent = existing.trim();

  // Build merged file: ASP header + project content + ASP sections
  const aspHeader = "# Agent Context\n\n**Version:** 3.0.0\n\nThis repository uses the **agent skill package (ASP)** for AI coding agent configuration.\n";
  const aspSectionsStr = Array.from(templateSections.values()).join("\n\n");

  const merged = [
    aspHeader,
    "---\n",
    "## Project-Specific Documentation\n",
    projectContent,
    "\n\n---\n",
    aspSectionsStr,
    ""
  ].join("\n");

  fs.writeFileSync(targetPath, merged, "utf8");

  // Extract project headings from original content
  const projectHeadings = (projectContent.match(/^##?\s+.+$/gm) || []).map(h => h.replace(/^#+\s+/, ""));

  console.log("[OK] AGENTS.md merged (backup: " + backupPath + ", " + templateSections.size + " ASP sections + " + projectHeadings.length + " project sections)");

  return {
    action: "merged",
    backupPath,
    sectionsUpdated: Array.from(templateSections.keys()),
    sectionsPreserved: projectHeadings
  };
}

/**
 * Create a timestamped backup of AGENTS.md.
 * Stored in .windsurf/backups/ to keep the project root clean.
 *
 * @param {string} filePath - Path to the AGENTS.md being backed up
 * @param {string} content - Current content of the file
 * @returns {string} - Path to the backup file
 */
function createAgentsMdBackup(filePath, content) {
  const backupDir = path.join(path.dirname(filePath), ".windsurf", "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `AGENTS.md.${timestamp}.backup`);
  fs.writeFileSync(backupPath, content, "utf8");
  console.log("[OK] Backup created: " + backupPath);
  return backupPath;
}

/**
 * Update the "Active Rules" ASP section in AGENTS.md based on actual rule files.
 * Called after rule generation (Phase 2, Section 2.7).
 *
 * @param {string} projectRoot - Path to the target project root
 * @returns {object} - { updated, rulesCount, rules }
 */
function updateAgentsMdRules(projectRoot) {
  const agentsMdPath = path.join(projectRoot, "AGENTS.md");
  if (!fs.existsSync(agentsMdPath)) {
    return { updated: false, error: "AGENTS.md not found" };
  }

  const rulesDir = path.join(projectRoot, ".windsurf", "rules");
  if (!fs.existsSync(rulesDir)) {
    return { updated: false, error: ".windsurf/rules/ not found" };
  }

  const ruleFiles = fs.readdirSync(rulesDir).filter(f => f.endsWith(".md")).sort();
  const rules = ruleFiles.map(f => {
    const content = fs.readFileSync(path.join(rulesDir, f), "utf8");
    const triggerMatch = content.match(/trigger:\s*(\w+)/);
    const globsMatch = content.match(/globs:\s*(.+)/);
    const descMatch = content.match(/description:\s*(.+)/);
    return {
      file: f,
      trigger: triggerMatch ? triggerMatch[1].trim() : "always",
      globs: globsMatch ? globsMatch[1].trim() : "",
      description: descMatch ? descMatch[1].trim() : f.replace(".md", "")
    };
  });

  const rulesList = rules.map(r => {
    const globInfo = r.globs ? ` (${r.globs})` : "";
    return `- \`${r.file}\` -- ${r.trigger}${globInfo}`;
  }).join("\n");

  const newSection = `<!-- ASP:active-rules:BEGIN -->\n## Active Rules\n\nAll files in \`.windsurf/rules/\` are auto-applied based on their \`trigger\` mode:\n\n${rulesList}\n<!-- ASP:active-rules:END -->`;

  let content = fs.readFileSync(agentsMdPath, "utf8");
  const sectionRegex = /<!-- ASP:active-rules:BEGIN -->\r?\n[\s\S]*?<!-- ASP:active-rules:END -->/;

  if (sectionRegex.test(content)) {
    content = content.replace(sectionRegex, newSection);
  } else {
    // No active-rules section yet -- append after purpose section or at end
    const purposeEnd = content.indexOf("<!-- ASP:purpose:END -->");
    if (purposeEnd !== -1) {
      const insertPos = content.indexOf("\n", purposeEnd) + 1;
      content = content.slice(0, insertPos) + "\n" + newSection + "\n" + content.slice(insertPos);
    } else {
      content = content.trimEnd() + "\n\n" + newSection + "\n";
    }
  }

  fs.writeFileSync(agentsMdPath, content, "utf8");
  console.log("[OK] AGENTS.md active rules updated (" + rules.length + " rules)");

  return { updated: true, rulesCount: rules.length, rules };
}

// ---------------------------------------------------------------------------
// HTTP Server
// ---------------------------------------------------------------------------
const server = http.createServer((req, res) => {
  const origin = req.headers.origin || "null";
  const isAllowed =
    ALLOWED_ORIGINS.some((o) => origin === o || origin.startsWith(o)) ||
    origin.startsWith("http://localhost");
  res.setHeader("Access-Control-Allow-Origin", isAllowed ? origin : "null");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // GET /health
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", version: "2.0.0" }));
    return;
  }

  // GET /analyze
  if (req.method === "GET" && req.url === "/analyze") {
    try {
      const result = analyzeProject();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      console.log(
        `[OK] Project analyzed: ${result.filesScanned.length} files scanned`,
      );
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
      console.error("[ERROR] Analysis failed:", err.message);
    }
    return;
  }

  // GET /generate-bom
  if (req.method === "GET" && req.url === "/generate-bom") {
    try {
      const result = generateBOM();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      console.log(
        `[OK] BOM generated: ${result.totalDeps} dependencies, ${result.ecosystems.length} ecosystems -> ${result.path}`,
      );
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: err.message }));
      console.error("[ERROR] BOM generation failed:", err.message);
    }
    return;
  }

  // GET /detection-map
  if (req.method === "GET" && req.url === "/detection-map") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        npm: DETECTION_MAP,
        python: PYTHON_MAP,
        architecture: ARCHITECTURE_MAP,
        java: JAVA_MAP,
        dotnet: DOTNET_MAP,
        go: GO_MAP,
        rust: RUST_MAP,
        php: PHP_MAP,
        ruby: RUBY_MAP,
        dart: DART_MAP,
        elixir: ELIXIR_MAP,
        scala: SCALA_MAP,
      }),
    );
    return;
  }

  // POST /save-config
  if (req.method === "POST" && req.url === "/save-config") {
    const MAX_BODY_SIZE = 100 * 1024;
    let body = "";
    let bodyTooLarge = false;
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY_SIZE) {
        bodyTooLarge = true;
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ success: false, error: "Request body too large" }),
        );
        req.destroy();
      }
    });
    req.on("end", () => {
      if (bodyTooLarge) return;
      try {
        const config = JSON.parse(body);

        const validationErrors = validateConfig(config);
        if (validationErrors.length > 0) {
          res.writeHead(422, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: false,
              errors: validationErrors,
            }),
          );
          console.error("Validation errors:", validationErrors.join(", "));
          return;
        }

        const dir = path.dirname(CONFIG_PATH);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");

        // Auto-merge AGENTS.md after saving config
        let mergeResult = null;
        try {
          mergeResult = mergeAgentsMd(PROJECT_ROOT);
          console.log(`[OK] AGENTS.md ${mergeResult.action} (${mergeResult.sectionsUpdated.length} ASP sections)`);
          if (mergeResult.sectionsPreserved.length > 0) {
            console.log(`     Preserved project sections: ${mergeResult.sectionsPreserved.join(", ")}`);
          }
          if (mergeResult.backupPath) {
            console.log(`     Backup: ${mergeResult.backupPath}`);
          }
        } catch (mergeErr) {
          console.error(`[WARN] AGENTS.md merge failed: ${mergeErr.message}`);
          console.error(`       You can run the merge manually: curl http://localhost:${PORT}/merge-agents-md`);
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, path: CONFIG_PATH, agentsMdMerge: mergeResult }));

        console.log(`[OK] Config saved to: ${CONFIG_PATH}`);
        clearTimeout(idleTimer);
        console.log(`\n[STOP] Shutting down server...`);

        setTimeout(() => {
          server.close(() => {
            console.log(
              `[OK] Server closed. You can now run /project-init again.`,
            );
            process.exit(0);
          });
        }, 500);
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: err.message }));
        console.error("[ERROR]", err.message);
      }
    });
    return;
  }

  // GET /dashboard -- serve dashboard HTML
  if (req.method === "GET" && req.url === "/dashboard") {
    const dashboardPath = path.join(__dirname, "dashboard.html");
    if (fs.existsSync(dashboardPath)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(fs.readFileSync(dashboardPath, "utf8"));
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "dashboard.html not found" }));
    }
    return;
  }

  // GET /dashboard-data -- read dashboard state
  if (req.method === "GET" && req.url === "/dashboard-data") {
    try {
      const data = readDashboardData();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /dashboard-data -- append workflow run
  if (req.method === "POST" && req.url === "/dashboard-data") {
    const MAX_BODY_SIZE = 512 * 1024;
    let body = "";
    let bodyTooLarge = false;
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY_SIZE) {
        bodyTooLarge = true;
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ success: false, error: "Request body too large" }),
        );
        req.destroy();
      }
    });
    req.on("end", () => {
      if (bodyTooLarge) return;
      try {
        const runEntry = JSON.parse(body);
        const result = appendDashboardRun(runEntry);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
        console.log(`[OK] Dashboard run appended: ${runEntry.workflow}`);
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: err.message }));
        console.error("[ERROR] Dashboard run append failed:", err.message);
      }
    });
    return;
  }

  // GET /generate-sbom -- generate SBOM JSON
  if (req.method === "GET" && req.url === "/generate-sbom") {
    try {
      const result = generateSBOM();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      console.log(
        `[OK] SBOM generated: ${result.sbom.totalDependencies} deps -> ${result.path}`,
      );
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: err.message }));
      console.error("[ERROR] SBOM generation failed:", err.message);
    }
    return;
  }

  // GET /security-scan -- run npm audit and generate security JSON
  if (req.method === "GET" && req.url === "/security-scan") {
    try {
      const result = runSecurityScan();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      console.log(
        `[OK] Security scan: ${result.result.summary.total || 0} vulnerabilities found`,
      );
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: err.message }));
      console.error("[ERROR] Security scan failed:", err.message);
    }
    return;
  }

  // GET /license-check -- evaluate SBOM against license policy
  if (req.method === "GET" && req.url === "/license-check") {
    try {
      const result = evaluateLicensePolicy();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      if (result.success) {
        console.log(
          `[OK] License check: ${result.evaluation.policyStatus} (${result.evaluation.stats.forbidden} forbidden, ${result.evaluation.stats.unknown} unknown)`,
        );
      } else {
        console.log(`[WARN] License check: ${result.error}`);
      }
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: err.message }));
      console.error("[ERROR] License check failed:", err.message);
    }
    return;
  }

  // GET /dashboard-aggregate -- aggregate all data into dashboard-data.json
  if (req.method === "GET" && req.url === "/dashboard-aggregate") {
    try {
      const result = aggregateDashboard();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      console.log(
        `[OK] Dashboard aggregated: ${result.data.projects.length} projects`,
      );
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: err.message }));
      console.error("[ERROR] Dashboard aggregation failed:", err.message);
    }
    return;
  }

  // GET /architecture-data -- read architecture diagrams and last review run
  if (req.method === "GET" && req.url === "/architecture-data") {
    try {
      const docsDir = path.join(PROJECT_ROOT, ".windsurf", "docs");
      const diagramsDir = path.join(docsDir, "diagrams");
      const diagrams = [];

      // 1. Read .mmd files from .windsurf/docs/diagrams/
      if (fs.existsSync(diagramsDir)) {
        const files = fs
          .readdirSync(diagramsDir)
          .filter((f) => f.endsWith(".mmd"));
        for (const file of files) {
          const content = fs
            .readFileSync(path.join(diagramsDir, file), "utf8")
            .trim();
          if (content) {
            diagrams.push({
              name: file.replace(".mmd", "").replace(/-/g, " "),
              mermaidCode: content,
            });
          }
        }
      }

      // 2. Fallback: extract mermaid blocks from ARCHITECTURE.md
      if (diagrams.length === 0) {
        const archMd = path.join(docsDir, "ARCHITECTURE.md");
        if (fs.existsSync(archMd)) {
          const content = fs.readFileSync(archMd, "utf8");
          const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
          let match;
          let idx = 1;
          while ((match = mermaidRegex.exec(content)) !== null) {
            diagrams.push({
              name: "Diagram " + idx,
              mermaidCode: match[1].trim(),
            });
            idx++;
          }
        }
      }

      // 3. Fallback: extract from latest architecture-review report.md
      if (diagrams.length === 0) {
        const runsDir = path.join(DASHBOARD_DIR, "runs", "architecture-review");
        if (fs.existsSync(runsDir)) {
          let latestReport = null;
          let latestTime = 0;
          const dateDirs = fs.readdirSync(runsDir).filter((f) => {
            try {
              return fs.statSync(path.join(runsDir, f)).isDirectory();
            } catch {
              return false;
            }
          });
          for (const dateDir of dateDirs) {
            const tsDirs = fs
              .readdirSync(path.join(runsDir, dateDir))
              .filter((f) => {
                try {
                  return fs
                    .statSync(path.join(runsDir, dateDir, f))
                    .isDirectory();
                } catch {
                  return false;
                }
              });
            for (const ts of tsDirs) {
              const reportPath = path.join(runsDir, dateDir, ts, "report.md");
              if (fs.existsSync(reportPath)) {
                const stat = fs.statSync(reportPath);
                if (stat.mtimeMs > latestTime) {
                  latestTime = stat.mtimeMs;
                  latestReport = reportPath;
                }
              }
            }
          }
          if (latestReport) {
            const content = fs.readFileSync(latestReport, "utf8");
            const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
            let match;
            let idx = 1;
            while ((match = mermaidRegex.exec(content)) !== null) {
              diagrams.push({
                name: "Diagram " + idx,
                mermaidCode: match[1].trim(),
              });
              idx++;
            }
          }
        }
      }

      // 4. Find latest architecture-review run entry
      const data = readDashboardData();
      const archRuns = (data.runs || [])
        .filter((r) => r.workflow === "architecture-review")
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const lastRun = archRuns.length > 0 ? archRuns[0] : null;

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, diagrams, lastRun }));
      console.log(`[OK] Architecture data: ${diagrams.length} diagrams`);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: false,
          error: err.message,
          diagrams: [],
          lastRun: null,
        }),
      );
      console.error("[ERROR] Architecture data failed:", err.message);
    }
    return;
  }

  // GET /dashboard-full-scan -- run SBOM + Security + License + Analysis + Aggregate in sequence
  if (req.method === "GET" && req.url === "/dashboard-full-scan") {
    try {
      const sbomResult = generateSBOM();
      const secResult = runSecurityScan();
      const licResult = evaluateLicensePolicy();
      const cqResult = runCodeQualityScan();
      const a11yResult = runA11yScan();
      const perfResult = runPerformanceScan();
      const seoResult = runSEOScan();
      const aggResult = aggregateDashboard();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          sbom: {
            path: sbomResult.path,
            deps: sbomResult.sbom.totalDependencies,
          },
          security: {
            path: secResult.path,
            total: secResult.result.summary.total,
          },
          licenses: {
            path: licResult.success ? licResult.path : null,
            status: licResult.success
              ? licResult.evaluation.policyStatus
              : licResult.error,
          },
          codeQuality: { path: cqResult.path, score: cqResult.result.score },
          a11y: { path: a11yResult.path, score: a11yResult.result.score },
          performance: { path: perfResult.path, score: perfResult.result.score },
          seo: { path: seoResult.path, score: seoResult.result.score },
          dashboard: {
            path: aggResult.path,
            projects: aggResult.data.projects.length,
          },
        }),
      );
      console.log(`[OK] Full dashboard scan complete`);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: err.message }));
      console.error("[ERROR] Full scan failed:", err.message);
    }
    return;
  }

  // GET /sbom-data -- read SBOM JSON for current project
  if (req.method === "GET" && req.url === "/sbom-data") {
    try {
      const projectName = getProjectName();
      const sbomPath = path.join(DASHBOARD_DIR, "sbom", `${projectName}.json`);
      if (fs.existsSync(sbomPath)) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(fs.readFileSync(sbomPath, "utf8"));
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "SBOM not found. Run /generate-sbom first.",
          }),
        );
      }
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /security-data -- read security scan JSON for current project
  if (req.method === "GET" && req.url === "/security-data") {
    try {
      const projectName = getProjectName();
      const secPath = path.join(
        DASHBOARD_DIR,
        "security",
        `${projectName}.json`,
      );
      if (fs.existsSync(secPath)) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(fs.readFileSync(secPath, "utf8"));
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "Security data not found. Run /security-scan first.",
          }),
        );
      }
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /license-data -- read license evaluation JSON for current project
  if (req.method === "GET" && req.url === "/license-data") {
    try {
      const projectName = getProjectName();
      const licPath = path.join(
        DASHBOARD_DIR,
        "licenses",
        `${projectName}.json`,
      );
      if (fs.existsSync(licPath)) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(fs.readFileSync(licPath, "utf8"));
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "License data not found. Run /license-check first.",
          }),
        );
      }
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /code-quality-scan
  if (req.method === "GET" && req.url === "/code-quality-scan") {
    try {
      const result = runCodeQualityScan();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      console.log(`[OK] Code quality scan: score ${result.result.score}, ${result.result.findings.length} findings`);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: err.message }));
      console.error("[ERROR] Code quality scan failed:", err.message);
    }
    return;
  }

  // GET /a11y-scan
  if (req.method === "GET" && req.url === "/a11y-scan") {
    try {
      const result = runA11yScan();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      console.log(`[OK] A11y scan: score ${result.result.score}, ${result.result.findings.length} findings`);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: err.message }));
      console.error("[ERROR] A11y scan failed:", err.message);
    }
    return;
  }

  // GET /performance-scan
  if (req.method === "GET" && req.url === "/performance-scan") {
    try {
      const result = runPerformanceScan();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      console.log(`[OK] Performance scan: score ${result.result.score}, ${result.result.findings.length} findings`);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: err.message }));
      console.error("[ERROR] Performance scan failed:", err.message);
    }
    return;
  }

  // GET /seo-scan
  if (req.method === "GET" && req.url === "/seo-scan") {
    try {
      const result = runSEOScan();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      console.log(`[OK] SEO scan: score ${result.result.score}, ${result.result.findings.length} findings`);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: err.message }));
      console.error("[ERROR] SEO scan failed:", err.message);
    }
    return;
  }

  // GET /code-quality-data
  if (req.method === "GET" && req.url === "/code-quality-data") {
    try {
      const projectName = getProjectName();
      const filePath = path.join(DASHBOARD_DIR, "code-quality", `${projectName}.json`);
      if (fs.existsSync(filePath)) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(fs.readFileSync(filePath, "utf8"));
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No code quality data. Run /code-quality-scan first." }));
      }
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /a11y-data
  if (req.method === "GET" && req.url === "/a11y-data") {
    try {
      const projectName = getProjectName();
      const filePath = path.join(DASHBOARD_DIR, "a11y", `${projectName}.json`);
      if (fs.existsSync(filePath)) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(fs.readFileSync(filePath, "utf8"));
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No a11y data. Run /a11y-scan first." }));
      }
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /performance-data
  if (req.method === "GET" && req.url === "/performance-data") {
    try {
      const projectName = getProjectName();
      const filePath = path.join(DASHBOARD_DIR, "performance", `${projectName}.json`);
      if (fs.existsSync(filePath)) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(fs.readFileSync(filePath, "utf8"));
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No performance data. Run /performance-scan first." }));
      }
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /seo-data
  if (req.method === "GET" && req.url === "/seo-data") {
    try {
      const projectName = getProjectName();
      const filePath = path.join(DASHBOARD_DIR, "seo", `${projectName}.json`);
      if (fs.existsSync(filePath)) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(fs.readFileSync(filePath, "utf8"));
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No SEO data. Run /seo-scan first." }));
      }
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /workflows -- list all available workflows
  if (req.method === "GET" && req.url === "/workflows") {
    try {
      const workflowsDir = path.join(__dirname, "..", "workflows");
      const files = fs.readdirSync(workflowsDir).filter(f =>
        f.endsWith(".md") &&
        !f.startsWith("project-init-generate") &&
        !f.startsWith("project-init-enhance") &&
        !f.startsWith("project-init-quality")
      );
      const workflows = files.map(f => {
        const content = fs.readFileSync(path.join(workflowsDir, f), "utf8");
        const name = f.replace(".md", "");
        const descMatch = content.match(/^description:\s*(.+)$/m);
        return {
          name,
          description: descMatch ? descMatch[1].trim() : name,
          file: f,
          hasDevinSkill: fs.existsSync(path.join(PROJECT_ROOT, ".devin", "skills", name, "SKILL.md"))
        };
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ workflows, count: workflows.length }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /workflow/<name> -- get workflow details and instructions
  if (req.method === "GET" && req.url.startsWith("/workflow/")) {
    try {
      const name = req.url.replace("/workflow/", "").split("?")[0];
      const workflowPath = path.join(__dirname, "..", "workflows", `${name}.md`);
      if (!fs.existsSync(workflowPath)) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: `Workflow '${name}' not found` }));
        return;
      }
      const content = fs.readFileSync(workflowPath, "utf8");
      const descMatch = content.match(/^description:\s*(.+)$/m);
      const skillPath = path.join(PROJECT_ROOT, ".devin", "skills", name, "SKILL.md");
      const hasSkill = fs.existsSync(skillPath);
      const result = {
        name,
        description: descMatch ? descMatch[1].trim() : name,
        content,
        skill: hasSkill ? fs.readFileSync(skillPath, "utf8") : null,
        hasDevinSkill: hasSkill
      };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ---------------------------------------------------------------------------
  // GET /merge-agents-md -- merge ASP sections into existing AGENTS.md
  // POST /merge-agents-md -- merge with options in body { mode: "merge"|"overwrite"|"skip" }
  // ---------------------------------------------------------------------------
  if ((req.method === "GET" || req.method === "POST") && req.url === "/merge-agents-md") {
    const handleMerge = (options) => {
      try {
        const result = mergeAgentsMd(PROJECT_ROOT, options);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    };

    if (req.method === "GET") {
      handleMerge({});
      return;
    }

    // POST -- read body for options
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        const options = body ? JSON.parse(body) : {};
        handleMerge(options);
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON body: " + err.message }));
      }
    });
    return;
  }

  // GET /agents-md-status -- check if AGENTS.md exists and its merge state
  if (req.method === "GET" && req.url === "/agents-md-status") {
    try {
      const targetAgentsMd = path.join(PROJECT_ROOT, "AGENTS.md");
      const sourceAgentsMd = path.join(__dirname, "..", "..", "AGENTS.md");
      const exists = fs.existsSync(targetAgentsMd);
      let hasAspMarkers = false;
      let projectSections = [];
      let aspSections = [];

      if (exists) {
        const content = fs.readFileSync(targetAgentsMd, "utf8");
        hasAspMarkers = content.includes("<!-- ASP:") && content.includes(":BEGIN -->");
        const aspMatches = content.matchAll(/<!-- ASP:([^:]+):BEGIN -->/g);
        for (const m of aspMatches) aspSections.push(m[1]);
        // Identify non-ASP headings as project sections
        const lines = content.split("\n");
        let insideAsp = false;
        for (const line of lines) {
          if (line.includes(":BEGIN -->")) insideAsp = true;
          if (line.includes(":END -->")) { insideAsp = false; continue; }
          if (!insideAsp && /^##?\s+/.test(line)) {
            projectSections.push(line.replace(/^#+\s+/, "").trim());
          }
        }
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        exists,
        hasAspMarkers,
        aspSections,
        projectSections,
        backupWouldBeCreated: exists && !hasAspMarkers
      }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /update-agents-md-rules -- sync Active Rules section with actual rule files
  if (req.method === "GET" && req.url === "/update-agents-md-rules") {
    try {
      const result = updateAgentsMdRules(PROJECT_ROOT);
      const status = result.updated ? 200 : 404;
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`\n[START] Config Server running on http://localhost:${PORT}`);
  console.log(`        Waiting for config from UI...`);
  console.log(
    `        Server will auto-shutdown after ${IDLE_TIMEOUT_MS / 60000} minutes of inactivity.\n`,
  );
});

// Auto-shutdown after idle timeout to prevent orphaned processes
const idleTimer = setTimeout(() => {
  console.log(
    `\n[TIMEOUT] No config saved within ${IDLE_TIMEOUT_MS / 60000} minutes. Shutting down.`,
  );
  server.close(() => {
    console.log("[OK] Server closed due to inactivity.");
    process.exit(0);
  });
}, IDLE_TIMEOUT_MS);
