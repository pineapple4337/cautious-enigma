import { auditStructuredProgramme } from './genericRequirementEngine'
import definitions from './programmeDefinitions.json'
import { ECONOMICS_SPECIALISATIONS, type EconomicsSpecialisation } from './economicsData'
import type { PlannedCourse } from './types'
import type { Audit } from './degreeRequirements'
import { auditCHS, auditEconomicsMinor, auditUrbanStudiesMinor, auditEconomicsMajor, auditEconomicsSpecialisation, type UtcpPathway } from './degreeRequirements'

export type ProgrammeProfile = { primaryMajor: string; secondMajor?: string; minors: string[]; college?: string; matriculationYear?: number; economicsSpecialisations?: string[] }
export type ProgrammeKind = 'common' | 'primary' | 'second' | 'minor'
export type ProgrammeEntry = { id: string; name: string; kind: ProgrammeKind; supported: boolean; audit?: Audit; note?: string }
const norm = (s: string) => s.trim().toLowerCase()
type DefinitionRef = {id:string;subject?:string;kind:string;adapter?:string}
const defined = definitions.programmes as DefinitionRef[]
function structuredAudit(subject:string, kind:ProgrammeKind, plan:PlannedCourse[], cohort:number):Audit|undefined {
  const definition=defined.find(d=>d.subject && norm(d.subject)===norm(subject) && d.kind===kind && !d.adapter)
  return definition ? auditStructuredProgramme(definition.id,plan,cohort) : undefined
}
const primaryAuditors: Record<string,(plan:PlannedCourse[], cohort:number)=>Audit|undefined> = {
  'economics': plan=>auditEconomicsMajor(plan,'primary'),
}
const secondAuditors: Record<string,(plan:PlannedCourse[])=>Audit> = {
  'economics': plan=>auditEconomicsMajor(plan,'second'),
}
const minorAuditors: Record<string,(plan:PlannedCourse[])=>Audit> = {
  'economics': auditEconomicsMinor,
  'urban studies': auditUrbanStudiesMinor,
}
/** Ordered registry. Unsupported programmes remain visible but are never treated as fulfilled. */
export function getProgrammeRegistry(plan: PlannedCourse[], profile: ProgrammeProfile, utcp: UtcpPathway): ProgrammeEntry[] {
  const entries: ProgrammeEntry[] = []
  const isCHS = !profile.college || profile.college === 'CHS'
  if (isCHS && profile.matriculationYear===2025) entries.push({ id:'chs', name:'CHS Common Curriculum', kind:'common', supported:true, audit:auditCHS(plan,utcp) })
  if (profile.primaryMajor) {
    const audit=primaryAuditors[norm(profile.primaryMajor)]?.(plan,profile.matriculationYear??2025) ?? structuredAudit(profile.primaryMajor,'primary',plan,profile.matriculationYear??2025)
    entries.push({id:audit?.id??`primary:${norm(profile.primaryMajor)}`,name:profile.primaryMajor,
      kind:'primary',supported:!!audit,audit,note:audit?undefined:'Primary-major rules have not been encoded for this cohort.'})
  }
  if (profile.secondMajor) {
    const audit=secondAuditors[norm(profile.secondMajor)]?.(plan) ?? structuredAudit(profile.secondMajor,'second',plan,profile.matriculationYear??2025)
    entries.push({id:audit?.id??`second:${norm(profile.secondMajor)}`,name:profile.secondMajor,
      kind:'second',supported:!!audit,audit,note:audit?undefined:'Second-major rules have not been encoded.'})
  }
  if(norm(profile.primaryMajor)==='economics') for(const key of profile.economicsSpecialisations??[]) {
    if(key in ECONOMICS_SPECIALISATIONS) entries.push({id:`ec-spec:${key}`,name:ECONOMICS_SPECIALISATIONS[key as EconomicsSpecialisation].name,kind:'primary',supported:true,audit:auditEconomicsSpecialisation(plan,key as EconomicsSpecialisation)})
  }
  for (const name of [...profile.minors].sort((a,b)=>a.localeCompare(b))) {
    const audit=minorAuditors[norm(name)]?.(plan) ?? structuredAudit(name,'minor',plan,profile.matriculationYear??2025)
    entries.push({id:audit?.id??`minor:${norm(name)}`,name,kind:'minor',supported:!!audit,audit,
      note:audit?undefined:'Minor rules have not been encoded.'})
  }
  return entries
}
export function unmetRequirements(entries: ProgrammeEntry[]): string[] {
  return entries.flatMap(e=>{
    if(!e.supported || !e.audit) return [`${e.name} (${e.kind}): ${e.note || 'Unsupported programme'}`]
    const a=e.audit
    const missing=a.core.filter(c=>c.status==='missing').map(c=>`${e.name}: compulsory ${c.code}`)
    const checks=a.checks.filter(c=>!c.maximum && c.scheduled<c.target).map(c=>`${e.name}: ${c.label} (${c.scheduled}/${c.target})${c.manual?' — manual verification':''}`)
    return [...missing,...checks]
  })
}
export function coverageVector(entries: ProgrammeEntry[]): number[] {
  return entries.map(e=> !e.supported||!e.audit ? 0 :
    e.audit.core.reduce((n,c)=>n+(c.status==='missing'?0:1),0) +
    e.audit.checks.filter(c=>!c.maximum&&!c.manual&&c.target>0).reduce((n,c)=>n+Math.min(1,c.scheduled/c.target),0))
}
