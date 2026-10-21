# Contributing

Use Node.js 22 or newer.

```sh
npm ci
npm run build
npm run check
npm test
npx playwright install chromium
npm run test:browser
```

Edit `src/weather-station-card.js`, then rebuild. `dist/weather-station-card.js` is a dependency-free copy of the source; commit both. Runtime history requires the optional Mini Graph Card resource, not a build-time dependency.

Browser tests use synthetic sensor states and mock history helpers. They check optional instruments, entity units, sensor history events, missing data, empty configuration, vane/cup motion, and responsive panel bounds. Actual recorder integration has also been checked on the maintainer's HA instance; CI does not run a full HA server.

## Releases

1. Set the same semantic version in `package.json`, the source header/version constant, and changelog.
2. Build and run all checks. Review examples and documentation links.
3. Ensure the repository remains public, has a description and topics, and issues are enabled.
4. Push the reviewed commit and wait for CI and HACS validation to pass.
5. Tag the commit `vX.Y.Z` and create a published, non-prerelease GitHub release.
6. Attach `weather-station-card.js` from `dist/` and `SHA256SUMS`. Do not attach a zipped plugin as the only download.
7. Confirm the latest release points to the tested commit and the asset hash matches the bundle.

The HACS manifest uses `filename: weather-station-card.js`. The `dist/` bundle and release asset have the same name as the repository, following [HACS dashboard requirements](https://www.hacs.xyz/docs/publish/plugin/). HACS validation uses category `plugin`. Default catalogue inclusion requires a separate submission to HACS and is not implied by a passing validation run.
