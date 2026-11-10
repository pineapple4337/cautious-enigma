// NUSMods prerequisite trees are untrusted API data. Never treat malformed
// structures as satisfied prerequisites.
export type PrereqTree =
  | string
  | { and: PrereqTree[] }
  | { or: PrereqTree[] }

export type PrereqResult = { satisfied: boolean; missing: string[] }

export function checkPrerequisites(
  tree: PrereqTree,
  completed: Set<string>
): PrereqResult {
  if (typeof tree === 'string') {
    const code = tree.trim()
    return { satisfied: completed.has(code), missing: completed.has(code) ? [] : [code] }
  }
  if (!tree || typeof tree !== 'object' || Array.isArray(tree)) {
    return { satisfied: false, missing: ['Unrecognised prerequisite structure'] }
  }
  if ('and' in tree) {
    if (!Array.isArray(tree.and) || tree.and.length === 0) {
      return { satisfied: false, missing: ['Unrecognised AND prerequisite'] }
    }
    const results = tree.and.map(child => checkPrerequisites(child, completed))
    return {
      satisfied: results.every(result => result.satisfied),
      missing: [...new Set(results.flatMap(result => result.missing))]
    }
  }
  if ('or' in tree) {
    if (!Array.isArray(tree.or) || tree.or.length === 0) {
      return { satisfied: false, missing: ['Unrecognised OR prerequisite'] }
    }
    const results = tree.or.map(child => checkPrerequisites(child, completed))
    const satisfied = results.some(result => result.satisfied)
    return {
      satisfied,
      missing: satisfied ? [] : [...new Set(results.flatMap(result => result.missing))]
    }
  }
  return { satisfied: false, missing: ['Unrecognised prerequisite structure'] }
}
