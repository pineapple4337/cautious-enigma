import definitions from './programmeDefinitions.json'
import fassData from './fassRecognisedCourses.json'
import { PS_SUBFIELDS } from './politicalScienceSubfields'
import { PS_RECOGNISED_NON_PS } from './requirementRules'
import { PS_SINGAPORE } from './academicData'
import type { PlannedCourse } from './types'
import type { Audit, Check } from './degreeRequirements'

type Selector = { prefix?: string; prefixes?: string[]; codes?: string[]; namedBasket?: string; exactLevel?: number; minLevel?: number; maxLevel?: number; excludeCodes?: string[] }
type Rule = { id:string; label:string; type:'minimum_units'|'minimum_courses'|'maximum_units'|'maximum_courses'|'basket_groups'|'capped_total_units'; target?:number; selector?:Selector; namedBasketGroup?:string; targetPerGroup?:number; detail?:string; manual?:boolean; recognisedBasket?:string; recognisedCap?:number; capSelector?:Selector }
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
    scheduled:count(selected),maximum:rule.type.startsWith('maximum'),manual:rule.manual,detail:rule.detail}
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
