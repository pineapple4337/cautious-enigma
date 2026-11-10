NUS Degree Planner Version 28 — data-driven requirements foundation

New:
- programmeDefinitions.json: cohort-aware programme metadata and Political Science rules.
- genericRequirementEngine.ts: evaluates reusable minimum/maximum units,
  minimum/maximum course counts, and grouped course baskets.
- programmeRegistry.ts: one place to route selected programmes to supported audits.
- App.tsx: consumes programme registry and explicitly lists unsupported selections.

Migration status:
- Political Science primary major: migrated to JSON-driven rules.
- CHS, Economics major/second major/minor/specialisations, Urban Studies:
  retained in tested specialised audits because they require conditional
  substitutions, caps, allocations, or UTCP rules not yet expressible in the
  generic engine. Metadata for these is registered in the JSON bank.
- NUSMods still supplies course titles, credits, and semester offerings.
- Existing localStorage keys and plan import/export are unchanged.

Installation: copy all .ts/.tsx/.css/.json files into src (including the two
new files), keeping your existing package.json, tsconfig, and vite.config.ts.
Run `npm run build` locally before pushing to GitHub Pages.
