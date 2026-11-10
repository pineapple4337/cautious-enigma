import { ECONOMICS, ECONOMICS_SPECIALISATIONS, ECONOMICS_SPECIALISATION_SOURCE, type EconomicsSpecialisation } from './economicsData'
import { requirementId, PS_RECOGNISED_NON_PS } from './requirementRules'
import { PS_SINGAPORE, EC_MINOR_RECOGNISED, URBAN_CORE, URBAN_ELECTIVES, CHS_PILLARS } from './academicData'
export { URBAN_CORE, URBAN_ELECTIVES, CHS_PILLARS } from './academicData'
import { PS_SUBFIELDS, PS_SUBFIELD_NAMES } from './politicalScienceSubfields'
import type { PlannedCourse } from './types'

export type RequirementStatus = 'completed' | 'current' | 'planned' | 'missing'
export type Check = {
  id: string
  label: string
  completed: number
  scheduled: number
  target: number
  courses: PlannedCourse[]
  detail?: string
  manual?: boolean
  maximum?: boolean
  unit?: 'units' | 'courses'
}
export type Audit = {
  id: string
  programme: string
  checks: Check[]
  core: { code: string; status: RequirementStatus }[]
  notes: string[]
  source: string
}


function withIds(audit: Audit): Audit {
  return { ...audit, checks: audit.checks.map(c => ({...c, id: requirementId(audit.id, c.label)})) }
}

export function courseLevel(code: string): number {
  const match = code.match(/^[A-Z]+(\d)/)
  return match ? Number(match[1]) * 1000 : 0
}
function status(code: string, plan: PlannedCourse[]): RequirementStatus {
  return plan.find(c => c.code === code)?.status ?? 'missing'
}
function units(courses: PlannedCourse[], completedOnly = false): number {
  return courses.filter(c => !completedOnly || c.status === 'completed')
    .reduce((sum, c) => sum + c.units, 0)
}
function check(label: string, courses: PlannedCourse[], target: number,
  detail?: string, manual = false, maximum = false): Check {
  return { id: '', label, courses, target, detail, manual, maximum,
    completed: units(courses, true), scheduled: units(courses) }
}
function presence(label: string, codes: readonly string[], plan: PlannedCourse[], detail?: string): Check {
  const found = plan.filter(c => codes.includes(c.code))
  return { id: '', label, courses: found, target: 1, unit: 'courses', detail,
    completed: found.some(c => c.status === 'completed') ? 1 : 0,
    scheduled: found.length ? 1 : 0 }
}

export function auditPoliticalScience(plan: PlannedCourse[]): Audit {
  const ps = plan.filter(c => c.code.startsWith('PS'))
  const level5 = ps.filter(c => courseLevel(c.code) === 5000)
  const recognised = plan.filter(c => (PS_RECOGNISED_NON_PS as string[]).includes(c.code))
  const majorCourses = [...ps, ...recognised]
  return withIds({
    id: 'ps-major', programme: 'Political Science — Primary Major (60 units)',
    source: 'https://fass.nus.edu.sg/pol/graduation-requirements-cohort-2021-onwards/',
    core: ['PS1101E', 'PS3257'].map(code => ({ code, status: status(code, plan) })),
    checks: [
      check('PS-coded units (minimum)', ps, 52),
      check('Major total (PS-coded candidate units)', majorCourses, 60,
        'Working assumption: non-PS courses in the Political Science subfield list count towards the major total; each course is counted once.'),
      presence('Singapore Politics: one approved course', PS_SINGAPORE, plan,
        `Provisional approved-course list: ${PS_SINGAPORE.join(', ')}. Verify for your cohort.`),
      check('Level-3000 PS units', ps.filter(c => courseLevel(c.code) === 3000), 16),
      check('Level-4000+ PS units', ps.filter(c => courseLevel(c.code) >= 4000), 20),
      { id: '', label: 'Level-5000 PS courses (maximum one)', courses: level5,
        completed: level5.filter(c => c.status === 'completed').length,
        scheduled: level5.length, target: 1, unit: 'courses', maximum: true,
        manual: true, detail: 'Departmental approval and applicable restrictions require verification.' },
      ...PS_SUBFIELD_NAMES.map(field => presence(
        `Subfield: ${field}`, PS_SUBFIELDS[field], plan,
        'Recognised undergraduate course codes from the department subfield listing; special topics and cross-listed courses may need confirmation.'
      ))
    ],
    notes: [
      'PS1101E and PS3257 are tracked separately as compulsory courses.',
      'Four subfields must be represented. Listed undergraduate PS courses are checked automatically; unlisted special topics require confirmation.',
      'PS-recognised courses, substitutions, and programme overlaps still require review.'
    ]
  })
}


/** Primary and second major audits use the same AY2021/22+ departmental data. */
export function auditEconomicsMajor(plan: PlannedCourse[], kind: 'primary'|'second'): Audit {
  const rules = ECONOMICS[kind]
  const ec = plan.filter(c => c.code.startsWith('EC'))
  const recognised = plan.filter(c => (ECONOMICS.majorRecognised as readonly string[]).includes(c.code) && !c.code.startsWith('EC'))
  const normalRecognised = recognised.filter(c => !['FE5213','PE4101E','PE4102E'].includes(c.code))
  const ranked = [...normalRecognised].sort((a,b) => Number(b.status==='completed')-Number(a.status==='completed'))
  const allocated: PlannedCourse[] = [...ec]
  let allowance: number = rules.recognisedCap
  for (const c of ranked) if(c.units<=allowance) {allocated.push(c);allowance-=c.units}
  // Department explicitly excludes PE4XXXE and FE5213 from the normal 8-unit cap.
  allocated.push(...recognised.filter(c=>['FE5213','PE4101E','PE4102E'].includes(c.code)))
  const checks: Check[] = [
    {...check('Economics major eligible units', allocated, rules.totalUnits),id:`ec-${kind}:total`},
    {...check(kind==='primary'?'Level-3000 EC units':'Level-3000+ EC units',
      ec.filter(c=>kind==='primary'?courseLevel(c.code)===3000:courseLevel(c.code)>=3000),
      kind==='primary'?ECONOMICS.primary.level3000Units:ECONOMICS.second.level3000PlusUnits),id:kind==='primary'?'ec-primary:level-3000':'ec-second:level-3000-plus'},
  ]
  if(kind==='primary') checks.push({...check('Level-4000+ Economics units',
    [...ec.filter(c=>courseLevel(c.code)>=4000),...recognised.filter(c=>c.code==='FE5213'||/^PE4\d{3}E/.test(c.code))],
    ECONOMICS.primary.level4000Units),id:'ec-primary:level-4000'})
  // Distinguish a preclusion/substitution from units: replacements do not waive the total.
  for(const code of rules.compulsory) {
    const substitutions = ECONOMICS.substitutions[code as keyof typeof ECONOMICS.substitutions] as readonly string[]|undefined
    const found = plan.filter(c=>c.code===code || (substitutions?.includes(c.code)??false))
    checks.push({id:`ec-${kind}:core:${code}`,label:`Required: ${code} (or recognised substitution)`,
      target:1,unit:'courses',courses:found,completed:found.some(c=>c.status==='completed')?1:0,
      scheduled:found.length?1:0,
      detail:substitutions?.length?`Potential preclusion/substitution: ${substitutions.join(', ')}. Some require a replacement EC elective to retain the total units.`:undefined})
  }
  checks.push({id:`ec-${kind}:recognised-cap`,label:'Ordinary recognised non-EC courses (maximum 8 units)',
    target:8,unit:'units',courses:normalRecognised,completed:units(normalRecognised,true),scheduled:units(normalRecognised),maximum:true})
  if(kind==='primary')checks.push({id:'ec-primary:level-5000-cap',label:'EC level-5000 courses (maximum 8 units)',
    target:8,unit:'units',courses:ec.filter(c=>courseLevel(c.code)===5000),
    completed:units(ec.filter(c=>courseLevel(c.code)===5000),true),scheduled:units(ec.filter(c=>courseLevel(c.code)===5000)),maximum:true})
  return {id:kind==='primary'?'ec-primary':'ec-second',programme:`Economics — ${kind==='primary'?'Primary Major (60 units)':'Second Major (40 units)'}`,
    checks,core:[],source:rules.source,notes:[]}
}

/** Specialisations are optional and only applicable to Economics primary majors. */
export function auditEconomicsSpecialisation(plan:PlannedCourse[], key:EconomicsSpecialisation):Audit {
  const spec=ECONOMICS_SPECIALISATIONS[key]
  const checks:Check[]=spec.groups.map(g=>{
    const candidates=plan.filter(c=>(g.codes as readonly string[]).includes(c.code))
    // Non-EC entries in departmental option lists (FE5213) conflict with the
    // generic EC-coded-only statement. Keep them visible but do not auto-certify.
    const verified=candidates.filter(c=>c.code.startsWith('EC'))
    return {id:`ec-spec:${key}:${g.id}`,label:g.label,target:g.choose,unit:'courses' as const,courses:candidates,
      completed:verified.filter(c=>c.status==='completed').length,
      scheduled:verified.length,
      detail:candidates.some(c=>!c.code.startsWith('EC'))?'Non-EC options listed by the department require confirmation before counting.':undefined}
  })
  const eligibleCodes=new Set(spec.groups.flatMap(g=>[...g.codes]))
  const eligibleEC=plan.filter(c=>c.code.startsWith('EC')&&eligibleCodes.has(c.code))
  checks.push({...check('Specialisation eligible EC-coded units',eligibleEC,20,
    'Courses may count towards the Economics major and specialisation together. FE5213 is listed in course baskets but the department also states that only EC-coded courses count; confirm this exception.'),
    id:`ec-spec:${key}:units`})
  return {id:`ec-spec:${key}`,programme:`Economics — ${spec.name} Specialisation`,
    source:ECONOMICS_SPECIALISATION_SOURCE,core:[],checks,notes:[]}
}

export function auditEconomicsMinor(plan: PlannedCourse[]): Audit {
  const ec = plan.filter(c => c.code.startsWith('EC') && c.code !== 'EC1301')
  const recognised = plan.filter(c => EC_MINOR_RECOGNISED.includes(c.code))
  // The department caps EC-recognised non-EC contributions at 4 units.
  // Prefer completed courses, then currently taking, then planned courses.
  const rank = (c: PlannedCourse) => c.status === 'completed' ? 0 : c.status === 'current' ? 1 : 2
  const candidates = [...recognised].sort((a,b) => rank(a) - rank(b))
  const allocated: PlannedCourse[] = [...ec]
  let remaining = 4
  for (const course of candidates) {
    if (course.units <= remaining) { allocated.push(course); remaining -= course.units }
  }
  const introException = plan.some(c => ['RE1704', 'BSP1703'].includes(c.code))
  const intro = plan.filter(c => c.code === 'EC1101E')
  const introCompleted = intro.some(c => c.status === 'completed') ||
    plan.some(c => ['RE1704', 'BSP1703'].includes(c.code) && c.status === 'completed')
  const introScheduled = intro.length > 0 || introException
  const introCheck: Check = {
    id: '', label: 'EC1101E (or approved preclusion exception)',
    target: 1, unit: 'courses', courses: intro.length ? intro : plan.filter(c => ['RE1704', 'BSP1703'].includes(c.code)),
    completed: introCompleted ? 1 : 0, scheduled: introScheduled ? 1 : 0,
    detail: 'RE1704 or BSP1703 may waive EC1101E. BSP1703 contributes no units to this minor; RE1704 may contribute within the 4-unit recognised-course cap.'
  }
  return withIds({
    id: 'ec-minor', programme: 'Economics — Minor (20 units)',
    source: 'https://fass.nus.edu.sg/ecs/students-matriculated-in-academic-year-2021-22-minor-in-econs/',
    core: [],
    checks: [
      introCheck,
      presence('EC2101 or EC2102', ['EC2101', 'EC2102'], plan),
      check('Eligible Economics minor units (maximum 4 recognised)', allocated, 20,
        'EC-coded courses plus up to 4 units of approved non-EC courses, including RE2705. BSE3701 may preclude EC2102 but does not contribute units. EC courses with EXE grades are not eligible.')
    ],
    notes: []
  })
}

type Allocation = { core: PlannedCourse[]; elective: PlannedCourse[] }
type AllocationState = Allocation & { coreUnits: number; electiveUnits: number; reUnits: number; geUnits: number; completedUnits: number }

// Assign each eligible course to AT MOST ONE Urban Studies basket.
// Dynamic programming avoids double counting and favours progress towards
// 8 core, 12 elective, 8 RE and 8 GE units. Caps are only used to compare
// progress: the displayed course list retains actual course units.
function allocateUrban(plan: PlannedCourse[]): Allocation {
  const coreCodes: readonly string[] = URBAN_CORE
  const electiveCodes: readonly string[] = URBAN_ELECTIVES
  const eligible = plan.filter(c => coreCodes.includes(c.code) || electiveCodes.includes(c.code))
  let states = new Map<string, AllocationState>()
  const empty: AllocationState = { core: [], elective: [], coreUnits: 0,
    electiveUnits: 0, reUnits: 0, geUnits: 0, completedUnits: 0 }
  states.set('0|0|0|0', empty)
  const score = (s: AllocationState) =>
    Math.min(8, s.coreUnits) + Math.min(12, s.electiveUnits) +
    Math.min(8, s.reUnits) + Math.min(8, s.geUnits)
  for (const course of eligible) {
    const next = new Map(states)
    const basket = coreCodes.includes(course.code) ? 'core' : 'elective'
    for (const state of states.values()) {
      const candidate: AllocationState = {
        ...state,
        core: basket === 'core' ? [...state.core, course] : state.core,
        elective: basket === 'elective' ? [...state.elective, course] : state.elective,
        coreUnits: state.coreUnits + (basket === 'core' ? course.units : 0),
        electiveUnits: state.electiveUnits + (basket === 'elective' ? course.units : 0),
        reUnits: state.reUnits + (course.code.startsWith('RE') ? course.units : 0),
        geUnits: state.geUnits + (course.code.startsWith('GE') ? course.units : 0),
        completedUnits: state.completedUnits + (course.status === 'completed' ? course.units : 0)
      }
      const key = [Math.min(8, candidate.coreUnits), Math.min(12, candidate.electiveUnits),
        Math.min(8, candidate.reUnits), Math.min(8, candidate.geUnits)].join('|')
      const previous = next.get(key)
      if (!previous || candidate.completedUnits > previous.completedUnits ||
        (candidate.completedUnits === previous.completedUnits &&
          candidate.core.length + candidate.elective.length < previous.core.length + previous.elective.length))
        next.set(key, candidate)
    }
    states = next
  }
  const best = [...states.values()].sort((a, b) =>
    score(b) - score(a) || b.completedUnits - a.completedUnits ||
      (a.core.length + a.elective.length) - (b.core.length + b.elective.length))[0]
  return { core: best.core, elective: best.elective }
}

export function auditUrbanStudiesMinor(plan: PlannedCourse[]): Audit {
  const allocation = allocateUrban(plan)
  const selected = [...allocation.core, ...allocation.elective]
  const re = selected.filter(c => c.code.startsWith('RE'))
  const ge = selected.filter(c => c.code.startsWith('GE'))
  const eligible = plan.filter(c =>
    (URBAN_CORE as readonly string[]).includes(c.code) ||
    (URBAN_ELECTIVES as readonly string[]).includes(c.code))
  const superseded = plan.filter(c => c.code === 'RE3803')
  return withIds({
    id: 'urban-minor', programme: 'Urban Studies — Minor (20 units)',
    source: 'https://fass.nus.edu.sg/geog/discovergeog/',
    core: [],
    checks: [
      check('Core courses (minimum 8 units)', allocation.core, 8,
        `Eligible: ${URBAN_CORE.join(', ')}.`),
      check('Elective courses (minimum 12 units)', allocation.elective, 12,
        `Eligible: ${URBAN_ELECTIVES.join(', ')}. RE3803 was replaced by RE3810 from AY2025/26 and is not counted automatically.`),
      check('RE-coded units across both baskets (minimum 8)', re, 8),
      check('GE-coded units across both baskets (minimum 8)', ge, 8),
      check('Allocated Urban Studies units (minimum 20)', selected, 20,
        'Each course is allocated to one basket only. Extra eligible courses may not be needed for the 20-unit minor.'),
      check('Eligible courses not allocated', eligible.filter(c => !selected.some(s => s.code === c.code)), 0,
        'These courses are eligible candidates but not allocated to this minor in the current plan.', true, true)
    ],
    notes: [
      'Cohort AY2024 onwards: 8 core + 12 elective units; at least 8 RE and 8 GE units from either basket.',
      'RE3803 was replaced by RE3810 starting AY2025/26. If RE3803 is in your plan, verify whether it is valid for the actual semester taken.',
      ...(superseded.length ? ['RE3803 is in your plan: check its historical offering and substitution before relying on it.'] : []),
      'The listed prerequisite waivers applied automatically to Cohort 2024 for specified courses. Later cohorts may apply for waivers if they meet the stated equivalence; approval is not automatic.',
      'Cross-programme double-counting remains subject to NUS and programme-specific restrictions.'
    ]
  })
}

// CHS pillar mapping is intentionally conservative: the complete set of
// approved alternatives and exemptions still needs cohort-specific review.
export type UtcpPathway = {
  enrolled: boolean
  college: string
  courseCodes: Record<'junior'|'writing'|'senior1'|'senior2',string>
}

// CHS exemption is conditional on completion of all four UTCP courses.
// Partial completion may qualify for individual approvals, not automatic credit.
const UTCP_PILLAR_NAMES = new Set([
  'Writing', 'Communities and Engagement',
  'Interdisciplinary Course Choice I', 'Interdisciplinary Course Choice II'
])
export function auditCHS(plan: PlannedCourse[], utcp?: UtcpPathway): Audit {
  const slots = utcp?.courseCodes
  const slotEntries = slots ? Object.entries(slots) : []
  const assignedCodes = slotEntries.map(([, code]) => code).filter(Boolean)
  const distinct = new Set(assignedCodes).size === assignedCodes.length
  const allAssigned = utcp?.enrolled === true && assignedCodes.length === 4 && distinct
  const assignedCourses = slotEntries
    .map(([slot, code]) => ({ slot, course: plan.find(c => c.code === code) }))
    .filter((entry): entry is {slot: string; course: PlannedCourse} => Boolean(entry.course))
  const fullyCompleted = allAssigned && assignedCourses.length === 4 &&
    assignedCourses.every(entry => entry.course.status === 'completed')
  const pillarSlot: Record<string, string> = {
    'Writing': 'writing',
    'Communities and Engagement': 'junior',
    'Interdisciplinary Course Choice I': 'senior1',
    'Interdisciplinary Course Choice II': 'senior2'
  }
  return withIds({
    id: 'chs', programme: 'CHS Common Curriculum — 13 pillars (52 units)',
    source: 'https://fass.nus.edu.sg/current-students/academic-matters/chs-common-curriculum/',
    core: [],
    checks: CHS_PILLARS.map(p => {
      const standard = presence(p.label, p.codes, plan,
        p.label === 'Digital Literacy'
          ? 'FASS majors: approved List A or List B course. Acacia-only UTC2851/UTC2852 excluded for RC4; check any additional CS1010 variant against the official list.'
          : p.label === 'Artificial Intelligence'
            ? 'HS1501, HS1502 and CS2109HS are recognised options. From AY2026/27, FASS students may also take HS1503 or HS1504; historical eligibility depends on the semester taken.'
            : p.manual ? 'Approved course mapping requires review.' : undefined)
      if (p.label === 'Artificial Intelligence') {
        const laterAI = plan.filter(c =>
          ['HS1503', 'HS1504'].includes(c.code) &&
          Number(c.semester.split('-')[0]) >= 2026
        )
        const matched = [...standard.courses, ...laterAI]
        return { ...standard, courses: matched,
          completed: matched.some(c => c.status === 'completed') ? 1 : 0,
          scheduled: matched.length ? 1 : 0 }
      }
      if (!UTCP_PILLAR_NAMES.has(p.label) || !utcp?.enrolled) return standard
      const slot = pillarSlot[p.label]
      const matched = assignedCourses.find(entry => entry.slot === slot)?.course
      const courses = matched ? [matched] : []
      // Show individual progress immediately, but recognise the exemption only
      // after the complete four-course UTCP pathway is finished.
      return {
        id: '', label: p.label,
        courses,
        target: 1,
        unit: 'courses' as const,
        completed: fullyCompleted ? 1 : 0,
        scheduled: matched ? 1 : 0,
        manual: !fullyCompleted,
        detail: fullyCompleted
          ? 'UTCP exemption fulfilled.'
          : matched
            ? 'UTCP course assigned; exemption pending completion of all four UTCP courses.'
            : 'Assign the corresponding UTCP course above.'
      }
    }),
    notes: []
  })
}

export type OverlapCandidate = { code: string; units: number; programmes: string[]; status: RequirementStatus }
export function overlapCandidates(audits: Audit[]): OverlapCandidate[] {
  const found = new Map<string, { programmes: Set<string>; course: PlannedCourse }>()
  for (const audit of audits) {
    for (const requirement of audit.checks) {
      if (requirement.label === 'Eligible courses not allocated') continue
      for (const course of requirement.courses) {
        const existing = found.get(course.code)
        if (existing) existing.programmes.add(audit.programme)
        else found.set(course.code, { programmes: new Set([audit.programme]), course })
      }
    }
  }
  return [...found.entries()]
    .filter(([, entry]) => entry.programmes.size > 1)
    .map(([code, entry]) => ({ code, units: entry.course.units,
      status: entry.course.status, programmes: [...entry.programmes] }))
}
