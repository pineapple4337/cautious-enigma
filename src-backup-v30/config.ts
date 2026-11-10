/** Central configuration for the AY catalogue and planner defaults. */
export const APP_CONFIG = {
  apiBase: 'https://api.nusmods.com/v2',
  catalogueYear: '2026-2027',
  defaultMatriculationYear: 2025,
  defaultMaxUnits: 24,
  degreeUnits: 160,
  candidateLimit: 180,
  searchEvaluations: 180,
} as const
export const NUSMODS_MODULES_URL = `${APP_CONFIG.apiBase}/${APP_CONFIG.catalogueYear}/modules/`
