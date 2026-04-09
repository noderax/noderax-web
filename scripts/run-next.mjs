import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const FILE_ENV_SUFFIX = "_FILE";

const hasValue = (value) => typeof value === "string" && value.trim().length > 0;
const normalizeFileValue = (value) => value.replace(/\r?\n$/, "");

for (const [key, filePath] of Object.entries(process.env)) {
  if (!key.endsWith(FILE_ENV_SUFFIX) || !hasValue(filePath)) {
    continue;
  }

  const targetKey = key.slice(0, -FILE_ENV_SUFFIX.length);
  if (!targetKey || hasValue(process.env[targetKey])) {
    continue;
  }

  process.env[targetKey] = normalizeFileValue(readFileSync(filePath, "utf8"));
}

const nextBinPath = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url),
);

const result = spawnSync(process.execPath, [nextBinPath, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
});

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);
