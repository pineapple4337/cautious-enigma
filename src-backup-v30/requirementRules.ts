import definitions from './programmeDefinitions.json'
import fassData from './fassRecognisedCourses.json'
import { ECONOMICS, ECONOMICS_SPECIALISATIONS } from './economicsData'
/** Stable requirement identities and course eligibility shared by audit, explorer and optimiser. */
import { CHS_PILLARS, PS_SINGAPORE, EC_MINOR_RECOGNISED, URBAN_CORE, URBAN_ELECTIVES } from './academicData'
import { PS_SUBFIELDS } from './politicalScienceSubfields'

export const PS_RECOGNISED_NON_PS = [...new Set(Object.values(PS_SUBFIELDS).flat().filter(c => !c.startsWith('PS')))].sort()
const urban = [...URBAN_CORE, ...URBAN_ELECTIVES] as string[]
export type RuleId = string

/** Labels are translated once at the data boundary; consumers use stable IDs. */
export function requirementId(programme: string, label: string): RuleId {
  if (programme === 'chs') {
    const pillar = CHS_PILLARS.find(p => p.label === label)
    return pillar ? `chs:${pillar.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : `chs:unknown`
  }
  if (programme === 'ps-major') {
    const ids: Record<string,string> = {
      'PS-coded units (minimum)':'ps:ps-coded',
      'Major total (PS-coded candidate units)':'ps:major-total',
      'Singapore Politics: one approved course':'ps:singapore',
      'Level-3000 PS units':'ps:level-3000',
      'Level-4000+ PS units':'ps:level-4000',
      'Level-5000 PS courses (maximum one)':'ps:level-5000-max'
    }
    if (label.startsWith('Subfield: ')) return `ps:subfield:${label.slice(10)}`
    return ids[label] ?? 'ps:unknown'
  }
  if (programme==='ec-primary'||programme==='ec-second') {
    if(label==='Economics major eligible units')return `${programme}:total`
    if(label==='Level-3000 EC units')return 'ec-primary:level-3000'
    if(label==='Level-3000+ EC units')return 'ec-second:level-3000-plus'
    if(label==='Level-4000+ Economics units')return 'ec-primary:level-4000'
    return `${programme}:unknown`
  }
  if (programme === 'ec-minor') {
    const ids: Record<string,string> = {
      'EC1101E (or approved preclusion exception)':'ec:intro',
      'EC2101 or EC2102':'ec:intermediate',
      'Eligible Economics minor units (maximum 4 recognised)':'ec:units'
    }
    return ids[label] ?? 'ec:unknown'
  }
  if (programme === 'urban-minor') {
    const ids: Record<string,string> = {
      'Core courses (minimum 8 units)':'urban:core',
      'Elective courses (minimum 12 units)':'urban:electives',
      'RE-coded units across both baskets (minimum 8)':'urban:re',
      'GE-coded units across both baskets (minimum 8)':'urban:ge',
      'Allocated Urban Studies units (minimum 20)':'urban:units',
      'Eligible courses not allocated':'urban:unallocated'
    }
    return ids[label] ?? 'urban:unknown'
  }
  return `${programme}:unknown`
}

export function isSpecificRequirement(id: RuleId): boolean {
  return id.startsWith('chs:') || id.startsWith('ps:subfield:') ||
    ['ps:level-4000','ps:level-3000','ps:singapore','ec:intro','ec:intermediate','urban:core','urban:electives','urban:re','urban:ge'].includes(id)
}

export function eligibleForRequirement(id: RuleId, code: string): boolean {
  // Shared JSON-driven eligibility for FASS definitions. UI and audit use the same selector.
  const matchSelector=(selector:{prefix?:string;prefixes?:string[];codes?:string[];namedBasket?:string;exactLevel?:number;minLevel?:number;maxLevel?:number;excludeCodes?:string[]}|undefined):boolean=>{
    if(!selector)return false
    const prefix=!!selector.prefix && code.startsWith(selector.prefix)
    const prefixes=(selector.prefixes??[]).some(x=>code.startsWith(x))
    const codes=(selector.codes??[]).includes(code)
    const basket=selector.namedBasket==='ps-recognised-non-ps'?PS_RECOGNISED_NON_PS:
      selector.namedBasket==='ps-singapore'?PS_SINGAPORE:
      (fassData.lists as Record<string,string[]>)[selector.namedBasket??'']??[]
    if(!(prefix||prefixes||codes||basket.includes(code)))return false
    const level=Number(code.match(/^[A-Z]+(\d)/)?.[1]??0)
    if(selector.exactLevel!==undefined&&level!==selector.exactLevel)return false
    if(selector.minLevel!==undefined&&level<selector.minLevel)return false
    if(selector.maxLevel!==undefined&&level>selector.maxLevel)return false
    return !(selector.excludeCodes??[]).includes(code)
  }
  for(const programme of definitions.programmes){
    const rule=programme.requirements.find(r=>r.id===id)
    if(!rule)continue
    if(rule.type==='capped_total_units')return matchSelector(rule.selector)||
      ((fassData.lists as Record<string,string[]>)[rule.recognisedBasket??'']??[]).includes(code)
    if(rule.type==='basket_groups')return Object.values(PS_SUBFIELDS).some(list=>(list as readonly string[]).includes(code))
    return matchSelector(rule.selector)
  }
  if(id.includes(':core:'))return code===id.split(':core:')[1]

  if (id.startsWith('core:')) return code === id.slice(5)
  if (id.startsWith('chs:')) {
    const pillar = CHS_PILLARS.find(p => requirementId('chs',p.label) === id)
    if (pillar?.label === 'Artificial Intelligence' && ['HS1503','HS1504'].includes(code)) return true
    return !!pillar?.codes.includes(code)
  }
  if (id.startsWith('ec-spec:') && id.endsWith(':units')) {
    const key=id.split(':')[1] as keyof typeof ECONOMICS_SPECIALISATIONS
    return code.startsWith('EC') && !!ECONOMICS_SPECIALISATIONS[key]?.groups.some(g=>(g.codes as readonly string[]).includes(code))
  }
  if (id.startsWith('ec-spec:')) {
    const [,key,groupId]=id.split(':')
    const spec=ECONOMICS_SPECIALISATIONS[key as keyof typeof ECONOMICS_SPECIALISATIONS]
    return !!spec?.groups.find(g=>g.id===groupId)?.codes.some(c=>c===code)
  }
  if (id.startsWith('ec-primary:core:') || id.startsWith('ec-second:core:')) {
    const core=id.split(':').at(-1)!
    const alternatives=ECONOMICS.substitutions[core as keyof typeof ECONOMICS.substitutions] as readonly string[]|undefined
    return code===core || !!alternatives?.includes(code)
  }
  if(id==='ec-primary:recognised-cap'||id==='ec-second:recognised-cap') return (ECONOMICS.majorRecognised as readonly string[]).includes(code)
  if(id==='ec-primary:level-5000-cap') return /^EC5\d/.test(code)
  if(id==='ec-primary:unknown'||id==='ec-second:unknown')return false
  if(id==='ec-primary:total'||id==='ec-second:total')return code.startsWith('EC')||(ECONOMICS.majorRecognised as readonly string[]).includes(code)
  if(id==='ec-primary:level-3000')return /^EC3\d/.test(code)
  if(id==='ec-second:level-3000-plus')return /^EC[3-9]\d/.test(code)
  if(id==='ec-primary:level-4000')return /^EC[4-9]\d/.test(code)||code==='FE5213'||/^PE4\d{3}E/.test(code)
  if (id.startsWith('ps:subfield:')) {
    const field=id.slice('ps:subfield:'.length) as keyof typeof PS_SUBFIELDS
    return field in PS_SUBFIELDS && (PS_SUBFIELDS[field] as readonly string[]).includes(code)
  }
  switch (id) {
    case 'ps:ps-coded': return code.startsWith('PS')
    case 'ps:major-total': return code.startsWith('PS') || (PS_RECOGNISED_NON_PS as string[]).includes(code)
    case 'ps:singapore': return PS_SINGAPORE.includes(code as typeof PS_SINGAPORE[number])
    case 'ps:level-3000': return /^PS3\d/.test(code)
    case 'ps:level-4000': return /^PS[4-9]\d/.test(code)
    case 'ps:level-5000-max': return /^PS5\d/.test(code)
    case 'ec:intro': return ['EC1101E','RE1704','BSP1703'].includes(code)
    case 'ec:intermediate': return ['EC2101','EC2102'].includes(code)
    case 'ec:units': return (code.startsWith('EC') && code !== 'EC1301') || EC_MINOR_RECOGNISED.includes(code as typeof EC_MINOR_RECOGNISED[number])
    case 'urban:core': return URBAN_CORE.includes(code as typeof URBAN_CORE[number])
    case 'urban:electives': return URBAN_ELECTIVES.includes(code as typeof URBAN_ELECTIVES[number])
    case 'urban:re': return code.startsWith('RE') && urban.includes(code)
    case 'urban:ge': return code.startsWith('GE') && urban.includes(code)
    case 'urban:units': case 'urban:unallocated': return urban.includes(code)
    default: return false
  }
}
