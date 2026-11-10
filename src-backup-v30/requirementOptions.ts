import type { Audit } from './degreeRequirements'
import { requirementId, eligibleForRequirement } from './requirementRules'

type CatalogueCourse = {moduleCode:string;title:string;semesters?:number[]}
/** The same course eligibility rules drive the audit explorer and optimiser. */
export function requirementOptions(audit: Audit, label: string, catalogue: CatalogueCourse[]): CatalogueCourse[] {
  const id = audit.checks.find(c => c.label === label)?.id ?? requirementId(audit.id,label)
  return catalogue.filter(c => eligibleForRequirement(id,c.moduleCode))
    .sort((a,b) => a.moduleCode.localeCompare(b.moduleCode))
}
