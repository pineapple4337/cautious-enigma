import { useMemo, useState } from 'react'
import { CHS_PILLARS, URBAN_CORE, URBAN_ELECTIVES } from './academicData'
import type { PlannedCourse } from './types'

type CatalogueCourse = { moduleCode: string; title: string; semesters?: number[] }
type Group = { label: string; codes: string[] }

// This explorer deliberately does NOT use the auto-planner's candidate shortlist,
// search budget, prerequisite rejection cache, or first-180-course cutoff.
export function EligibleCourseExplorer({ catalogue, plan, startSemester, primaryMajor, minors }: {
  catalogue: CatalogueCourse[]
  plan: PlannedCourse[]
  startSemester: string
  primaryMajor: string
  minors: string[]
}) {
  const [selectedGroup, setSelectedGroup] = useState('')
  const [filter, setFilter] = useState('')
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [hidePlanned, setHidePlanned] = useState(false)
  const groups = useMemo<Group[]>(() => {
    const result: Group[] = CHS_PILLARS.filter(p => p.codes.length > 0)
      .map(p => ({label:`CHS: ${p.label}`, codes:p.codes}))
    if (primaryMajor.trim().toLowerCase() === 'political science') {
      result.push({label:'Political Science: level-4000+ courses',
        codes:catalogue.filter(c => /^PS[45]\d{3}[A-Z]*$/.test(c.moduleCode)).map(c => c.moduleCode)})
      result.push({label:'Political Science: level-3000 courses',
        codes:catalogue.filter(c => /^PS3\d{3}[A-Z]*$/.test(c.moduleCode)).map(c => c.moduleCode)})
    }
    if (minors.some(m => m.toLowerCase() === 'urban studies')) {
      result.push({label:'Urban Studies: RE-coded approved courses',
        codes:[...URBAN_CORE,...URBAN_ELECTIVES].filter(c => c.startsWith('RE'))})
      result.push({label:'Urban Studies: core basket',codes:[...URBAN_CORE]})
      result.push({label:'Urban Studies: elective basket',codes:[...URBAN_ELECTIVES]})
    }
    if (minors.some(m => m.toLowerCase() === 'economics')) {
      result.push({label:'Economics minor: EC-coded candidates',
        codes:catalogue.filter(c => /^EC\d{4}[A-Z]*$/.test(c.moduleCode)).map(c => c.moduleCode)})
    }
    return result
  },[catalogue,primaryMajor,minors])
  const group = groups.find(g => g.label === selectedGroup) ?? groups[0]
  const known = useMemo(() => new Map(catalogue.map(c => [c.moduleCode,c])),[catalogue])
  const planned = useMemo(() => new Set(plan.map(c=>c.code)),[plan])
  const start = Number(startSemester.split('-')[1])
  const rows = (group?.codes ?? []).map(code => ({code,course:known.get(code)}))
    .filter(({code,course}) => {
      if (filter && !`${code} ${course?.title ?? ''}`.toLowerCase().includes(filter.toLowerCase())) return false
      if (onlyAvailable && !course?.semesters?.includes(start)) return false
      if (hidePlanned && planned.has(code)) return false
      return true
    })
    .sort((a,b)=>a.code.localeCompare(b.code))
  const total = new Set(group?.codes ?? []).size
  const listed = (group?.codes ?? []).filter(c => known.has(c)).length
  return <details className="eligible-explorer">
    <summary>Browse all requirement-eligible course candidates</summary>
    <div className="eligible-explorer-body">
      <p>This list is independent of the automatic scheduler. It shows all matching courses in the loaded AY2026/27 catalogue, including courses the scheduler never considered or could not place. Being listed does not guarantee eligibility or a feasible timetable.</p>
      <div className="eligible-explorer-controls">
        <label>Requirement
          <select value={group?.label ?? ''} onChange={e=>setSelectedGroup(e.target.value)}>
            {groups.map(g=><option key={g.label} value={g.label}>{g.label}</option>)}
          </select>
        </label>
        <label>Filter by code or name
          <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search this list" />
        </label>
      </div>
      <div className="eligible-explorer-filters">
        <label><input type="checkbox" checked={onlyAvailable} onChange={e=>setOnlyAvailable(e.target.checked)}/> Offered in start semester</label>
        <label><input type="checkbox" checked={hidePlanned} onChange={e=>setHidePlanned(e.target.checked)}/> Hide courses already in plan</label>
      </div>
      <p><strong>{rows.length} shown</strong> · {total} candidate codes · {listed} listed in current catalogue. Filters only affect display.</p>
      <div className="eligible-explorer-list">
        {rows.map(({code,course})=><div key={code} className="eligible-explorer-row">
          <div><strong>{code}</strong> <span>{course?.title ?? 'Not listed in current catalogue'}</span>
            <small>{planned.has(code)?'Already in plan · ':''}{course?.semesters?.length ? `Offered: ${course.semesters.map(s=>s<=2?`Sem ${s}`:`Special ${s-2}`).join(', ')}`:'No offering listed'}</small>
          </div>
          <a href={`https://nusmods.com/courses/${encodeURIComponent(code)}`} target="_blank" rel="noreferrer">NUSMods</a>
        </div>)}
        {!rows.length && <p>No courses match these filters.</p>}
      </div>
    </div>
  </details>
}
