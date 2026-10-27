import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const manifestPath = path.join(rootDir, ".release-please-manifest.json");

if (!fs.existsSync(manifestPath)) {
  console.error("❌ Error: .release-please-manifest.json not found at " + manifestPath);
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
} catch (e) {
  console.error("❌ Error parsing .release-please-manifest.json:", e.message);
  process.exit(1);
}

const packages = [
  { key: ".", file: path.join(rootDir, "package.json"), name: "root" },
  { key: "desktop-app", file: path.join(rootDir, "desktop-app", "package.json"), name: "desktop-app" },
  { key: "web-app", file: path.join(rootDir, "web-app", "package.json"), name: "web-app" },
];

let hasMismatch = false;

for (const pkg of packages) {
  if (!fs.existsSync(pkg.file)) {
    console.error(`❌ Error: ${pkg.name} package.json not found at ${pkg.file}`);
    hasMismatch = true;
    continue;
  }

  let pkgJson;
  try {
    pkgJson = JSON.parse(fs.readFileSync(pkg.file, "utf8"));
  } catch (e) {
    console.error(`❌ Error parsing ${pkg.name} package.json:`, e.message);
    hasMismatch = true;
    continue;
  }

  const manifestVersion = manifest[pkg.key];
  const pkgVersion = pkgJson.version;

  if (!manifestVersion) {
    console.error(`❌ Error: Component "${pkg.key}" is missing from .release-please-manifest.json`);
    hasMismatch = true;
  } else if (manifestVersion !== pkgVersion) {
    console.error(
      `❌ Version mismatch for "${pkg.name}": manifest has "${manifestVersion}", but package.json has "${pkgVersion}"`
    );
    hasMismatch = true;
  } else {
    console.log(`✅ ${pkg.name}: ${pkgVersion} (matches manifest)`);
  }
}

if (hasMismatch) {
  console.error("\n❌ Release version verification failed! Ensure .release-please-manifest.json and package.json versions match.");
  process.exit(1);
}

console.log("\n✨ All package versions and release-please manifest entries are perfectly aligned!");
process.exit(0);
