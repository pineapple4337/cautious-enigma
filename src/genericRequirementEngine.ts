import definitions from './programmeDefinitions.json'
import { PS_SUBFIELDS } from './politicalScienceSubfields'
import { PS_RECOGNISED_NON_PS } from './requirementRules'
import { PS_SINGAPORE } from './academicData'
import type { PlannedCourse } from './types'
import type { Audit, Check } from './degreeRequirements'

type Selector = { prefix?: string; namedBasket?: string; exactLevel?: number; minLevel?: number }
type Rule = { id:string; label:string; type:'minimum_units'|'minimum_courses'|'maximum_units'|'maximum_courses'|'basket_groups'; target?:number; selector?:Selector; namedBasketGroup?:string; targetPerGroup?:number; detail?:string; manual?:boolean }
type Definition = {id:string;name:string;kind:string;subject:string;minCohort:number;source:string;core:string[];requirements:Rule[]}

const baskets: Record<string,readonly string[]> = {
  'ps-recognised-non-ps': PS_RECOGNISED_NON_PS,
  'ps-singapore': PS_SINGAPORE,
}
const groups: Record<string,Record<string,readonly string[]>> = {
  'ps-subfields': PS_SUBFIELDS,
}

function matches(code:string, selector:Selector):boolean {
  const prefixMatch = !!selector.prefix && code.startsWith(selector.prefix)
  const basketMatch = !!selector.namedBasket && (baskets[selector.namedBasket]??[]).includes(code)
  if(!prefixMatch && !basketMatch) return false
  const levelMatch = code.match(/^[A-Z]+(\d)/)
  const level = levelMatch ? Number(levelMatch[1]) : 0
  if(selector.exactLevel !== undefined && level !== selector.exactLevel)return false
  if(selector.minLevel !== undefined && level < selector.minLevel)return false
  return true
}
function makeCheck(rule:Rule, plan:PlannedCourse[], id=rule.id, label=rule.label, selector=rule.selector, target=rule.target):Check {
  const selected = selector ? plan.filter(c=>matches(c.code,selector)) : []
  const isCourses = rule.type.endsWith('courses') || rule.type==='basket_groups'
  const count=(list:PlannedCourse[])=>isCourses?list.length:list.reduce((n,c)=>n+c.units,0)
  return {id,label,target:target??1,unit:isCourses?'courses':'units',courses:selected,
    completed:count(selected.filter(c=>c.status==='completed')),
    scheduled:count(selected),maximum:rule.type.startsWith('maximum'),manual:rule.manual,detail:rule.detail}
}
export function getStructuredDefinition(id:string, cohort:number):Definition|undefined {
  return (definitions.programmes as Definition[]).find(d=>d.id===id && cohort>=d.minCohort)
}
export function auditStructuredProgramme(id:string, plan:PlannedCourse[], cohort=2025):Audit|undefined {
  const definition=getStructuredDefinition(id,cohort)
  if(!definition)return undefined
  const checks:Check[]=[]
  for(const rule of definition.requirements){
    if(rule.type==='basket_groups'){
      for(const [name,codes] of Object.entries(groups[rule.namedBasketGroup??'']??{})){
        const selected=plan.filter(c=>codes.includes(c.code))
        checks.push({id:`${rule.id}:${name}`,label:`Subfield: ${name}`,target:rule.targetPerGroup??1,unit:'courses',courses:selected,
          completed:selected.some(c=>c.status==='completed')?1:0,scheduled:selected.length?1:0})
      }
    }else checks.push(makeCheck(rule,plan))
  }
  return {id:definition.id,programme:definition.name,source:definition.source,checks,
    core:definition.core.map(code=>({code,status:plan.find(c=>c.code===code)?.status??'missing'})),notes:[]}
}
export function structuredProgrammeIds():string[]{return definitions.programmes.map(p=>p.id)}
