# SC360 v0.6.2 — Release Notes

## Reliability release

- Added a no-install Windows launcher using the prebuilt application.
- Added a dependency-free local Node.js server.
- Removed the need to run `npm install` for normal usage.
- Replaced internal package registry references with the public npm registry.
- Added `.npmrc` configured for `https://registry.npmjs.org/`.
- Added a separate development launcher.

## Product capabilities

- Reads daily Expedite `.xls` and `.xlsx` reports locally.
- Detects report structure and weekly demand fields.
- Generates operational constraints and priorities.
- Aggregates risk by supplier and production cell.
- Generates planner missions and a SCOUT briefing.
