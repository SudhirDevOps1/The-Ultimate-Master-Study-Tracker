# Changelog

## [7.6.0](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/compare/v7.5.6...v7.6.0) (2026-10-26)


### ✨ Features & Enhancements

* **ci:** build and publish all OS binaries (Windows exe, Linux AppImage/deb, macOS zip) on every release ([4ec8412](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/commit/4ec8412fa8265d4ca26f3d49fb04fd48190ae329))

## [7.5.6](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/compare/v7.5.5...v7.5.6) (2026-10-26)


### 🐛 Bug Fixes & Patches

* **ci:** point release asset uploader to electron-builder output directory dist-electron ([7f20b38](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/commit/7f20b38f3f108131a81b6cd3e64eab259120eef7))


### 📚 Documentation Updates

* overhaul README.md with modern UI, accurate tech stack, and clear quickstart guides ([6458935](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/commit/64589358d4a9768dc14bc7d9e137e7f04c8741af))

## [7.5.5](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/compare/v7.5.4...v7.5.5) (2026-10-26)


### 🐛 Bug Fixes & Patches

* **ci:** sync subpackage versions and guarantee desktop installer asset upload on release ([1429395](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/commit/14293953d8462c5a6ebd9ca87cfa95473e2f32e8))

## [7.5.4](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/compare/v7.5.3...v7.5.4) (2026-10-25)


### ⚡ Performance Improvements

* **desktop:** optimize memory usage, add AGENT.md, and automate release binary builds ([7ad2eb9](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/commit/7ad2eb9fd1e69a643bcedb2e78baf2242ea6f0e6))

## [7.5.3](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/compare/v7.5.2...v7.5.3) (2026-10-01)


### 🐛 Bug Fixes & Patches

* **vercel:** replace deprecated Lucide brand icons with standalone SVG icons to fix Vercel web build ([f16d406](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/commit/f16d4062d0a5e6d67b9d4fd0ae7e4c8cdabeb083))


### 👷 CI/CD & DevOps

* **cache:** add electron binary cache and enforce stable v4 action tooling across workflows ([c7c8144](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/commit/c7c814445609a9d5a2d0d5bf06b1c4ecdaf47acd))
* **codeql:** filter false-positive URL substring sanitization rule in codeql-config.yml ([fd33f30](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/commit/fd33f301af752e40bf7585022fd7834bba6388bd))
* **release:** remove broken release-please workflow and use pure GitHub release engine with native binaries ([492c368](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/commit/492c36858a6d95703ce719fb651716cf9bc9df39))
* **release:** setup automated release-please v4 pipeline with commitlint and husky hooks ([fee04a8](https://github.com/SudhirDevOps1/The-Ultimate-Master-Study-Tracker/commit/fee04a8eb0115f6eea36487511cd487741beef29))
