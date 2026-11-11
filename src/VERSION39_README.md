# Version 39 — Alternative requirement pathways

## Changes
- Added `any_of_groups` structured requirement support in `degreeEngine.ts`.
- The AY2025/26 Data Science and Analytics primary major now treats the two advanced-elective groups OR an 8-unit Honours project as alternative pathways, rather than three separate requirements.
- The same rule drives eligible-course exploration, and distinguishes planned from completed fulfilment.
- Added `tests/alternatives.test.cjs` with eight focused cases and updated the existing DSA test.

## Limits
- This update does not yet encode every UPIP/NOC alternative, programme specialisation, or cross-disciplinary pathway.
- It does not change saved plan formats or browser storage keys.

## Install
Copy all source files into your existing `src` directory, replacing matching files. Keep the existing project root files (`package.json`, `vite.config.ts`, etc.).
Run `npm run build` and `node --test src/tests/*.test.cjs` before pushing.
