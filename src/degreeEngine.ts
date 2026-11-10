/** Central graduation eligibility and structured-audit engine.
 * Official course baskets live in data files; specialised audits remain in degreeRequirements.ts.
 */
import definitions from './programmeDefinitions.json'
import fassData from './fassRecognisedCourses.json'
import { ECONOMICS, ECONOMICS_SPECIALISATIONS } from './economicsData'
import { CHS_PILLARS, PS_SINGAPORE, EC_MINOR_RECOGNISED, URBAN_CORE, URBAN_ELECTIVES } from './academicData'
import { PS_SUBFIELDS } from './politicalScienceSubfields'
import type { PlannedCourse } from './types'
import type { Audit, Check } from './degreeRequirements'

/** Stable requirement identities and course eligibility shared by audit, explorer and optimiser. */

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
      ((fassData.lists as Record<string,string[]>)[('recognisedBasket' in rule && typeof rule.recognisedBasket === 'string' ? rule.recognisedBasket : '')]??[]).includes(code)
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


type Selector = { prefix?: string; prefixes?: string[]; codes?: string[]; namedBasket?: string; exactLevel?: number; minLevel?: number; maxLevel?: number; excludeCodes?: string[] }
type Rule = { id:string; label:string; type:'minimum_units'|'minimum_courses'|'maximum_units'|'maximum_courses'|'exact_units'|'basket_groups'|'capped_total_units'; target?:number; selector?:Selector; namedBasketGroup?:string; targetPerGroup?:number; detail?:string; manual?:boolean; recognisedBasket?:string; recognisedCap?:number; capSelector?:Selector }
type Definition = {id:string;name:string;kind:string;subject?:string;minCohort:number;maxCohort?:number;source:string;core?:string[];requirements:Rule[];notes?:string[]}

const baskets: Record<string,readonly string[]> = {
  'ps-recognised-non-ps': PS_RECOGNISED_NON_PS,
  'ps-singapore': PS_SINGAPORE,
  ...fassData.lists,
}
const groups: Record<string,Record<string,readonly string[]>> = {
  'ps-subfields': PS_SUBFIELDS,
}

function matches(code:string, selector:Selector):boolean {
  const prefixMatch = (!!selector.prefix && code.startsWith(selector.prefix)) || (selector.prefixes??[]).some(prefix=>code.startsWith(prefix))
  const explicitMatch = (selector.codes??[]).includes(code)
  const basketMatch = !!selector.namedBasket && (baskets[selector.namedBasket]??[]).includes(code)
  if(!prefixMatch && !basketMatch && !explicitMatch) return false
  const levelMatch = code.match(/^[A-Z]+(\d)/)
  const level = levelMatch ? Number(levelMatch[1]) : 0
  if(selector.exactLevel !== undefined && level !== selector.exactLevel)return false
  if(selector.minLevel !== undefined && level < selector.minLevel)return false
  if(selector.maxLevel !== undefined && level > selector.maxLevel)return false
  if(selector.excludeCodes?.includes(code))return false
  return true
}
function makeCheck(rule:Rule, plan:PlannedCourse[], id=rule.id, label=rule.label, selector=rule.selector, target=rule.target):Check {
  const selected = selector ? plan.filter(c=>matches(c.code,selector)) : []
  const isCourses = rule.type.endsWith('courses') || rule.type==='basket_groups'
  const count=(list:PlannedCourse[])=>isCourses?list.length:list.reduce((n,c)=>n+c.units,0)
  return {id,label,target:target??1,unit:isCourses?'courses':'units',courses:selected,
    completed:count(selected.filter(c=>c.status==='completed')),
    scheduled:count(selected),maximum:rule.type.startsWith('maximum'),exact:rule.type==='exact_units',manual:rule.manual,detail:rule.detail}
}
export function getStructuredDefinition(id:string, cohort:number):Definition|undefined {
  return (definitions.programmes as Definition[]).find(d=>d.id===id && cohort>=d.minCohort && (d.maxCohort===undefined || cohort<=d.maxCohort))
}
export function auditStructuredProgramme(id:string, plan:PlannedCourse[], cohort=2025):Audit|undefined {
  const definition=getStructuredDefinition(id,cohort)
  if(!definition)return undefined
  const checks:Check[]=[]
  for(const rule of definition.requirements){
    if(rule.type==='capped_total_units'){
      const ordinary=plan.filter(c=>rule.selector && matches(c.code,rule.selector))
      const recognised=plan.filter(c=>!ordinary.some(x=>x.code===c.code) && (baskets[rule.recognisedBasket??'']??[]).includes(c.code))
      const cap=rule.recognisedCap??0
      const allocated=(list:PlannedCourse[])=>{
        let remaining=cap
        const chosen:PlannedCourse[]=[]
        for(const c of list){if(c.units<=remaining){chosen.push(c);remaining-=c.units}}
        return chosen
      }
      const scheduledRecognised=allocated(recognised)
      const completedRecognised=allocated(recognised.filter(c=>c.status==='completed'))
      const unitSum=(list:PlannedCourse[])=>list.reduce((n,c)=>n+c.units,0)
      checks.push({id:rule.id,label:rule.label,target:rule.target??0,unit:'units',
        courses:[...ordinary,...scheduledRecognised],
        scheduled:unitSum(ordinary)+unitSum(scheduledRecognised),
        completed:unitSum(ordinary.filter(c=>c.status==='completed'))+unitSum(completedRecognised),
        detail:rule.detail})
      checks.push({id:`${rule.id}:recognised-cap`,label:'Recognised-course units (maximum)',target:cap,unit:'units',maximum:true,
        courses:recognised,completed:unitSum(recognised.filter(c=>c.status==='completed')),scheduled:unitSum(recognised)})
    }else if(rule.type==='basket_groups'){
      for(const [name,codes] of Object.entries(groups[rule.namedBasketGroup??'']??{})){
        const selected=plan.filter(c=>codes.includes(c.code))
        checks.push({id:`${rule.id}:${name}`,label:`Subfield: ${name}`,target:rule.targetPerGroup??1,unit:'courses',courses:selected,
          completed:selected.some(c=>c.status==='completed')?1:0,scheduled:selected.length?1:0})
      }
    }else checks.push(makeCheck(rule,plan))
  }
  for(const code of definition.core??[]){
    const found=plan.filter(c=>c.code===code)
    checks.push({id:`${definition.id}:core:${code}`,label:`Required: ${code}`,target:1,unit:'courses',courses:found,completed:found.some(c=>c.status==='completed')?1:0,scheduled:found.length?1:0})
  }
  return {id:definition.id,programme:definition.name,source:definition.source,checks,
    core:(definition.core??[]).map(code=>({code,status:plan.find(c=>c.code===code)?.status??'missing'})),notes:definition.notes??[]}
}
export function structuredProgrammeIds():string[]{return definitions.programmes.map(p=>p.id)}


type CatalogueCourse = {moduleCode:string;title:string;semesters?:number[]}
/** The same course eligibility rules drive the audit explorer and optimiser. */
export function requirementOptions(audit: Audit, label: string, catalogue: CatalogueCourse[]): CatalogueCourse[] {
  const id = audit.checks.find(c => c.label === label)?.id ?? requirementId(audit.id,label)
  return catalogue.filter(c => eligibleForRequirement(id,c.moduleCode))
    .sort((a,b) => a.moduleCode.localeCompare(b.moduleCode))
}
