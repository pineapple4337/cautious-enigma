import { ECONOMICS_SPECIALISATIONS, type EconomicsSpecialisation } from './economicsData'
import type { PlannedCourse } from './types'
import type { Audit } from './degreeRequirements'
import { auditCHS, auditPoliticalScience, auditEconomicsMinor, auditUrbanStudiesMinor, auditEconomicsMajor, auditEconomicsSpecialisation, type UtcpPathway } from './degreeRequirements'

export type ProgrammeProfile = { primaryMajor: string; secondMajor?: string; minors: string[]; college?: string; matriculationYear?: number; economicsSpecialisations?: string[] }
export type ProgrammeKind = 'common' | 'primary' | 'second' | 'minor'
export type ProgrammeEntry = { id: string; name: string; kind: ProgrammeKind; supported: boolean; audit?: Audit; note?: string }
const norm = (s: string) => s.trim().toLowerCase()

/** Ordered registry. Unsupported programmes remain visible but are never treated as fulfilled. */
export function getProgrammeRegistry(plan: PlannedCourse[], profile: ProgrammeProfile, utcp: UtcpPathway): ProgrammeEntry[] {
  const entries: ProgrammeEntry[] = []
  const isCHS = !profile.college || profile.college === 'CHS'
  if (isCHS) entries.push({ id:'chs', name:'CHS Common Curriculum', kind:'common', supported:true, audit:auditCHS(plan,utcp) })
  if (profile.primaryMajor) entries.push(norm(profile.primaryMajor)==='economics'
    ? {id:'ec-primary',name:'Economics',kind:'primary',supported:true,audit:auditEconomicsMajor(plan,'primary')}
    : norm(profile.primaryMajor)==='political science'
    ? { id:'ps-major', name:'Political Science', kind:'primary', supported:true, audit:auditPoliticalScience(plan) }
    : { id:`primary:${norm(profile.primaryMajor)}`, name:profile.primaryMajor, kind:'primary', supported:false, note:'Primary-major rules have not been encoded.' })
  if (profile.secondMajor) entries.push(norm(profile.secondMajor)==='economics'
    ? {id:'ec-second',name:'Economics',kind:'second',supported:true,audit:auditEconomicsMajor(plan,'second')}
    : { id:`second:${norm(profile.secondMajor)}`, name:profile.secondMajor, kind:'second', supported:false, note:'Second-major rules have not been encoded.' })
  if(norm(profile.primaryMajor)==='economics') for(const key of profile.economicsSpecialisations??[]) {
    if(key in ECONOMICS_SPECIALISATIONS) entries.push({id:`ec-spec:${key}`,name:ECONOMICS_SPECIALISATIONS[key as EconomicsSpecialisation].name,kind:'primary',supported:true,audit:auditEconomicsSpecialisation(plan,key as EconomicsSpecialisation)})
  }
  for (const name of [...profile.minors].sort((a,b)=>a.localeCompare(b))) {
    if (norm(name)==='economics') entries.push({ id:'economics-minor', name, kind:'minor', supported:true, audit:auditEconomicsMinor(plan) })
    else if (norm(name)==='urban studies') entries.push({ id:'urban-minor', name, kind:'minor', supported:true, audit:auditUrbanStudiesMinor(plan) })
    else entries.push({ id:`minor:${norm(name)}`, name, kind:'minor', supported:false, note:'Minor rules have not been encoded.' })
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
