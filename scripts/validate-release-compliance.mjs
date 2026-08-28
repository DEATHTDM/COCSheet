import { readFile } from "node:fs/promises";

const packageMetadata = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const legalContent = await readFile(new URL("../src/app/legalContent.ts", import.meta.url), "utf8");
const router = await readFile(new URL("../src/app/router/index.ts", import.meta.url), "utf8");

const failures = [];
const semVerPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+(?:[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/u;
const expectedAppVersion = process.env.EXPECTED_APP_VERSION;

if (typeof packageMetadata.version !== "string" || !semVerPattern.test(packageMetadata.version)) {
  failures.push("package.json version must be a valid SemVer version");
}
if (expectedAppVersion !== undefined && packageMetadata.version !== expectedAppVersion) {
  failures.push(`package.json version must exactly match EXPECTED_APP_VERSION=${expectedAppVersion}`);
}
if (packageMetadata.private !== true) failures.push("package.json private must remain true");
if (packageMetadata.license !== "GPL-3.0-only") {
  failures.push("package.json license must remain GPL-3.0-only for the original software code");
}
if (!legalContent.includes("export const fanMaterialNotice")) {
  failures.push("the single required Fan Material notice source is missing");
}
for (const clause of [
  "used under Chaosium Inc’s Fan Material Policy",
  "prohibited from charging you to use or access this content",
  "not published, endorsed, or specifically approved by Chaosium Inc",
]) {
  if (!legalContent.includes(clause)) failures.push(`required Fan Material notice clause is missing: ${clause}`);
}
if (!router.includes('{ path: "/legal", name: "legal", component: LegalPage }')) {
  failures.push("the /legal route is missing");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  const versionExpectation = expectedAppVersion === undefined
    ? "valid SemVer"
    : `exact version ${expectedAppVersion}`;
  console.log(`Release compliance static checks passed: ${versionExpectation}, notice source, and /legal route.`);
}
