import { ECONOMICS_SPECIALISATIONS, type EconomicsSpecialisation } from './economicsData'
import { APP_CONFIG } from './config'
import { getSubject, getSubjectStyle, type SubjectColorMap } from './subjectColors'
import { useEffect, useRef, useState } from 'react'
import {
  DndContext, useDraggable, useDroppable, PointerSensor, TouchSensor,
  KeyboardSensor, useSensor, useSensors, type DragEndEvent
} from '@dnd-kit/core'
import { checkPrerequisites } from './prerequisites'
import type { PrereqTree } from './prerequisites'
import type { AcademicProfile, PlannedCourse, CourseStatus } from './types'
import { DEFAULT_PROFILE } from './types'
import { auditPoliticalScience, auditEconomicsMinor, auditUrbanStudiesMinor, auditEconomicsMajor, auditEconomicsSpecialisation, auditCHS, overlapCandidates, type Audit } from './degreeRequirements'
import { PRIMARY_MAJORS, SECOND_MAJORS, MINORS } from './programmeCatalog'
import { checkTimetable, type TimetableResult } from './timetable'
import { EligibleCourseExplorer } from './EligibleCourseExplorer'
import { PlanBackup } from './PlanBackup'
import { requirementOptions } from './requirementOptions'
import './App.css'

const API = APP_CONFIG.apiBase
const CATALOGUE_YEAR = APP_CONFIG.catalogueYear
const PLAN_KEY = 'nus-degree-plan'
const PROFILE_KEY = 'nus-academic-profile'
const UTCP_KEY = 'nus-utcp-pathway'
type UtcpSlot = 'junior' | 'writing' | 'senior1' | 'senior2'
type UtcpProfile = { enrolled: boolean; college: string; courseCodes: Record<UtcpSlot,string> }
const UTCP_SLOTS: {id:UtcpSlot;label:string}[] = [
  {id:'junior',label:'Junior Seminar'},
  {id:'writing',label:'Ideas & Exposition'},
  {id:'senior1',label:'Senior Seminar 1'},
  {id:'senior2',label:'Senior Seminar 2'}
]
function loadUTCP():UtcpProfile {
  const empty:UtcpProfile={enrolled:false,college:'RC4',courseCodes:{junior:'',writing:'',senior1:'',senior2:''}}
  try {
    const data=JSON.parse(localStorage.getItem(UTCP_KEY)||'null')
    if (!data || typeof data!=='object') return empty
    const codes=data.courseCodes || {}
    return {enrolled:data.enrolled===true,college:typeof data.college==='string'?data.college:'RC4',
      courseCodes:{junior:String(codes.junior||''),writing:String(codes.writing||''),
        senior1:String(codes.senior1||''),senior2:String(codes.senior2||'')}}
  } catch {return empty}
}

type Course = { moduleCode: string; title: string; semesters?: number[] }
type CourseDetails = {
  moduleCode: string; title: string; description?: string; moduleCredit: string
  prerequisite?: string; preclusion?: string; prereqTree?: PrereqTree
  semesterData?: {semester: number; timetable?: unknown[]; examDate?: string}[]
}
type Semester = {id: string; label: string; year: number; sem: number}

function makeSemesters(startYear: number): Semester[] {
  return Array.from({length:8},(_,i)=>{
    const year=startYear+Math.floor(i/2), sem=i%2+1
    return {id:`${year}-${sem}`,label:`AY${year}/${String(year+1).slice(-2)} Semester ${sem}`,year,sem}
  })
}
function loadPlan(): PlannedCourse[] {
  try {
    const parsed:unknown=JSON.parse(localStorage.getItem(PLAN_KEY) || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x):x is PlannedCourse=>x && typeof x.code==='string' &&
      typeof x.title==='string' && typeof x.units==='number' &&
      Number.isFinite(x.units) && typeof x.semester==='string').map(c=>({
      ...c,
      status: c.status === 'completed' ? 'completed' : 'planned',
      suExercised:c.status==='completed' && c.suExercised===true
    }))
  } catch { return [] }
}
function loadProfile(): AcademicProfile {
  try {
    const parsed=JSON.parse(localStorage.getItem(PROFILE_KEY)||'null')
    if (!parsed || typeof parsed!=='object') return { ...DEFAULT_PROFILE, primaryMajor: 'Political Science', minors: ['Economics', 'Urban Studies'] }
    return {...DEFAULT_PROFILE,...parsed,
      matriculationYear:Number.isInteger(parsed.matriculationYear)?parsed.matriculationYear:2025,
      minors:Array.isArray(parsed.minors)?parsed.minors:[]}
  } catch { return DEFAULT_PROFILE }
}
function DraggableCourse({course,plan,semesters,onRemove,onUpdate,subjectColors}:{
  course:PlannedCourse;plan:PlannedCourse[];semesters:Semester[];subjectColors:SubjectColorMap
  onRemove:(code:string)=>void;onUpdate:(code:string,changes:Partial<PlannedCourse>)=>void
}) {
  const {attributes,listeners,setNodeRef,transform,isDragging}=useDraggable({id:course.code})
  const currentIndex=semesters.findIndex(s=>s.id===course.semester)
  const earlier=new Set(plan.filter(c=>c.code!==course.code &&
    (c.status==='completed' || (semesters.findIndex(s=>s.id===c.semester)>=0 &&
    semesters.findIndex(s=>s.id===c.semester)<currentIndex))).map(c=>c.code))
  const result=course.prereqTree ? checkPrerequisites(course.prereqTree,earlier):null
  return <div ref={setNodeRef} className={`planned-course ${isDragging?'dragging':''}`}
    style={{...getSubjectStyle(course.code,subjectColors),...(transform?{transform:`translate3d(${transform.x}px,${transform.y}px,0)`}:{})}}>
    <button className="remove-x" onClick={()=>onRemove(course.code)} aria-label={`Remove ${course.code}`}>×</button>
    <div className="course-drag-area">
      <div className="drag-handle" {...listeners} {...attributes}>
        <strong className="course-code">{course.code}</strong><span className="drag-icon">⠿</span>
      </div>
      <p className="course-title">{course.title}</p>
      <div className="course-controls">
        <select value={course.status} aria-label={`Status of ${course.code}`}
          onChange={e=>{
            const status=e.target.value as CourseStatus
            onUpdate(course.code,{status,suExercised:status==='completed'?course.suExercised:false})
          }}>
          <option value="planned">Planned</option>
          <option value="completed">Completed</option>
        </select>
        {course.status==='completed' && <label className="su-control">
          <input type="checkbox" checked={course.suExercised}
            onChange={e=>onUpdate(course.code,{suExercised:e.target.checked})}/> S/U exercised
        </label>}
      </div>
      {result && <div className={result.satisfied?'prereq-success':'prereq-warning'}>
        {result.satisfied?'✓ Prerequisite tree satisfied':result.missing.some(x=>/unrecognised/i.test(x))?'? Prerequisites require verification':`⚠ Prerequisite alternatives to review: ${result.missing.join(', ')}`}
      </div>}
      {!result && course.prerequisite && <div className="prereq-unknown">Prerequisites require verification</div>}
    </div>
  </div>
}
function SemesterTimetable({codes,semester}:{codes:string[];semester:number}) {
  const [result,setResult]=useState<TimetableResult|null>(null)
  const key=[...codes].sort().join('|')
  useEffect(()=>{
    let active=true
    setResult(null)
    if(codes.length<2){setResult({status:'clear',message:'No inter-course clashes to check.',conflicts:[],groups:{}});return}
    checkTimetable(codes,semester).then(r=>{if(active)setResult(r)})
      .catch(()=>{if(active)setResult({status:'unknown',message:'Timetable check unavailable.',conflicts:[],groups:{}})})
    return ()=>{active=false}
  // key represents the complete set of courses in this semester.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[key,semester])
  return <details className={`timetable-status timetable-${result?.status||'loading'}`}>
    <summary>{!result?'Checking timetable…':result.status==='clear'?'✓ Lectures/exams compatible':result.status==='clash'?'⚠ Lecture/exam clash':'? Timetable not fully verified'}</summary>
    <div className="timetable-body">
      <p>{result?.message||'Fetching lecture and exam times from NUSMods…'}</p>
      {result?.conflicts.map(c=><p key={c}>{c}</p>)}
      {result?.status==='clear'&&Object.entries(result.groups).length>0&&<div>
        <strong>Compatible lecture group:</strong>
        {Object.entries(result.groups).map(([code,groups])=><p key={code}>{code}: {groups.join(', ')}</p>)}
      </div>}
    </div>
  </details>
}
function SemesterCard({semester,plan,semesters,subjectColors,onRemove,onUpdate,onToggle,searchOpen,onOpenSearch,search,searchResults,loading,error,selected,onSearch,onSelect,onAdd,availableSemesters}:{  semester:Semester;plan:PlannedCourse[];semesters:Semester[];subjectColors:SubjectColorMap
  onRemove:(code:string)=>void;onUpdate:(code:string,changes:Partial<PlannedCourse>)=>void
  onToggle:(id:string)=>void;
  searchOpen:boolean;onOpenSearch:(id:string)=>void;search:string
  searchResults:Course[];loading:boolean;error:string;selected:CourseDetails|null;availableSemesters:Record<string,number[]>
  onSearch:(value:string)=>void;onSelect:(code:string)=>void;onAdd:(id:string)=>void
}) {
  const {setNodeRef,isOver}=useDroppable({id:semester.id})
  const items=plan.filter(c=>c.semester===semester.id)
  const units=items.reduce((n,c)=>n+c.units,0)
  return <div ref={setNodeRef} className={`semester-card ${isOver?'drop-target':''}`}>
    <div className="semester-heading"><h3>{semester.label}</h3>
      <div className="semester-actions"><span>{units} units</span>
        <button className="complete-semester-button" disabled={!items.length}
          onClick={()=>onToggle(semester.id)}>
          {items.length > 0 &&
            items.every(course => course.status === 'completed')
            ? '↩ Mark all planned'
            : '✓ Mark all completed'}
        </button>
      </div>
    </div>
    {units>24&&<p className="semester-load-warning">High workload: {units} units</p>}
    <div className="semester-search-wrap">
      <button className="semester-add-button" type="button" onClick={()=>onOpenSearch(semester.id)}
        aria-expanded={searchOpen}> {searchOpen?'× Close search':'+ Add course'} </button>
      {searchOpen && <div className="semester-search-panel">
        <input className="semester-search-input" autoFocus value={search}
          onChange={e=>onSearch(e.target.value)} placeholder="Search course code or title..."
          aria-label={`Search courses for ${semester.label}`}/>
        {loading && <p className="semester-search-note">Loading NUSMods catalogue...</p>}
        {error && <p className="error">{error}</p>}
        {!!search.trim() && !loading && <div className="semester-search-results">
          {!searchResults.length && <p className="semester-search-note">No courses found.</p>}
          {searchResults.map(c=>{
            const offered = c.semesters?.includes(semester.sem) === true
            const existing = plan.find(p=>p.code===c.moduleCode)
            return <button type="button" className={`semester-search-result ${offered && !existing ? '' : 'course-unavailable'}`}
              key={c.moduleCode} disabled={!offered || !!existing}
              title={existing ? `Already added to ${existing.semester}` : offered ? 'Offered this semester' : c.semesters?.length ? `Offered in Semester ${c.semesters.join(', ')}` : 'Offering unknown'}
              onClick={()=>onSelect(c.moduleCode)}>
              <strong>{c.moduleCode}</strong><span>{c.title}</span>
              {existing ? <small>Already added · {existing.semester}</small> : !offered && <small>{c.semesters?.length ? `Sem ${c.semesters.join(', ')} only` : 'Unknown offering'}</small>}
            </button>
          })}
        </div>}
        {selected && <div className="semester-selected-course">
          <strong>{selected.moduleCode} — {selected.title}</strong>
          <p>{selected.moduleCredit} units</p>
          {selected.prerequisite && <p><b>Prerequisites:</b> {selected.prerequisite}</p>}
          {selected.preclusion && <p><b>Preclusions:</b> {selected.preclusion}</p>}
          {!availableSemesters[selected.moduleCode]?.includes(semester.sem) &&
            <p className="warning">Not offered in Semester {semester.sem} (AY{CATALOGUE_YEAR} catalogue).</p>}
          <button type="button" className="primary-button" disabled={!availableSemesters[selected.moduleCode]?.includes(semester.sem)} onClick={()=>onAdd(semester.id)}>Add to {semester.label}</button>
        </div>}
      </div>}
    </div>
    <SemesterTimetable codes={items.map(c=>c.code)} semester={semester.sem}/>
    <div className="semester-content">
      {!items.length && <div className="empty-semester">Drag courses here</div>}
      {items.map(course=><DraggableCourse key={course.code} course={course} plan={plan}
        semesters={semesters} subjectColors={subjectColors} onRemove={onRemove} onUpdate={onUpdate}/>)}
    </div>
  </div>
}
function RequirementCourseOption({option,plan,semesters,onAdd}:{
  option:Course;plan:PlannedCourse[];semesters:Semester[];
  onAdd:(code:string,semesterId:string)=>Promise<string|null>
}) {
  const existing=plan.find(c=>c.code===option.moduleCode)
  const available=semesters.filter(s=>option.semesters?.includes(s.sem))
  const [semesterId,setSemesterId]=useState('')
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const choice=available.some(s=>s.id===semesterId)?semesterId:(available[0]?.id??'')
  async function submit(){
    if(!choice||busy||existing)return
    setBusy(true);setMessage('')
    try { const error=await onAdd(option.moduleCode,choice);setMessage(error??'Added to plan.') }
    catch(e){setMessage(e instanceof Error?e.message:'Unable to add course.')}
    finally{setBusy(false)}
  }
  return <div className="eligible-course-row" key={option.moduleCode}>
    <strong>{option.moduleCode}</strong><span>{option.title}</span>
    {existing?<small>In plan · {existing.semester}</small>:
      available.length?<div className="eligible-add-controls">
        <select aria-label={`Semester for ${option.moduleCode}`} value={choice} onChange={e=>setSemesterId(e.target.value)}>
          {available.map(s=><option key={s.id} value={s.id}>{`Y${s.year-semesters[0].year+1} S${s.sem}`}</option>)}
        </select>
        <button type="button" disabled={busy} onClick={submit}>{busy?'Adding…':'+ Add'}</button>
      </div>:<small>Not offered in Sem 1 or 2</small>}
    {message&&<small className="eligible-add-message" role="status">{message}</small>}
  </div>
}

function AuditPanel({audit,catalogue,plan,semesters,onAdd}:{audit:Audit;catalogue:Course[];plan:PlannedCourse[];semesters:Semester[];onAdd:(code:string,semesterId:string)=>Promise<string|null>}) {
  const done = audit.checks.filter(c => !c.maximum && c.completed >= c.target).length
  const total = audit.checks.filter(c => !c.maximum).length
  return <details className="audit-panel" >
    <summary className="audit-title">
      <span className="audit-name">{audit.programme}</span>
      <span className="audit-count">{done}/{total} checks completed</span>
    </summary>
    <div className="audit-body">
      {audit.core.length > 0 && <details className="audit-subsection">
        <summary>Compulsory courses ({audit.core.filter(c => c.status === 'completed').length}/{audit.core.length})</summary>
        <div className="requirements-list">{audit.core.map(item =>
          <div className="requirement-item" key={item.code}>
            <strong>{item.code}</strong>
            <span className={`requirement-status ${item.status}`}>{item.status}</span>
          </div>
        )}</div>
      </details>}
      <div className="audit-checks">{audit.checks.map(c => {
        const isCap = Boolean(c.maximum)
        const complete = isCap ? c.scheduled <= c.target : c.completed >= c.target
        return <details className="audit-check" key={c.label}>
          <summary className="audit-check-heading">
            <span className={`audit-dot ${complete ? 'is-complete' : ''}`} aria-hidden="true" />
            <strong>{c.label}</strong>
            <span className="audit-values">{c.completed}/{c.target} {c.unit || 'units'} <span className="audit-planned">· {c.scheduled} in plan</span></span>
          </summary>
          <div className="audit-check-body">
            {c.courses.length ? <ul className="audit-course-list">{c.courses.map(course =>
              <li key={course.code}><strong>{course.code}</strong> · {course.status}</li>
            )}</ul> : <p>No matching courses assigned.</p>}
            {(() => {
              const eligible = requirementOptions(audit,c.label,catalogue)
              return eligible.length > 0 ? <details className="eligible-courses-list">
                <summary>Eligible course options ({eligible.length})</summary>
                <div className="eligible-courses-scroll">
                  {eligible.map(option=><RequirementCourseOption key={option.moduleCode} option={option} plan={plan} semesters={semesters} onAdd={onAdd}/>)}
                </div>
              </details> : <p className="eligible-courses-empty">No verified course-code list available for this check.</p>
            })()}
            {c.detail && <p>{c.detail}</p>}
          </div>
        </details>
      })}</div>
      <a className="audit-source" href={audit.source} target="_blank" rel="noreferrer">Official requirements ↗</a>
    </div>
  </details>
}

function App() {
  const [profile,setProfile]=useState<AcademicProfile>(loadProfile)
  const [plan,setPlan]=useState<PlannedCourse[]>(loadPlan)
  const [subjectColors,setSubjectColors]=useState<SubjectColorMap>(()=>{
    try { const value=JSON.parse(localStorage.getItem('nus-subject-colors')||'{}');return value && typeof value==='object' && !Array.isArray(value) ? value : {} }
    catch { return {} }
  })
  useEffect(()=>{
    setSubjectColors(old=>{
      const next={...old};let changed=false
      for(const course of plan){const prefix=getSubject(course.code)
        if(next[prefix]===undefined){next[prefix]=Object.keys(next).length;changed=true}
      }
      return changed?next:old
    })
  },[plan])
  useEffect(()=>{localStorage.setItem('nus-subject-colors',JSON.stringify(subjectColors))},[subjectColors])

  const [utcp,setUtcp]=useState<UtcpProfile>(loadUTCP)
  const [courses,setCourses]=useState<Course[]>([])
  const [search,setSearch]=useState('')
  const [selected,setSelected]=useState<CourseDetails|null>(null)
  const [activeSearchSemester,setActiveSearchSemester]=useState<string|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [explorerSemester,setExplorerSemester]=useState(`${profile.matriculationYear+1}-1`)
  const [lastRemoved,setLastRemoved]=useState<PlannedCourse|null>(null)
  const [requirementMessage,setRequirementMessage]=useState('')
  const planRef=useRef(plan)
  const semesters=makeSemesters(profile.matriculationYear)
  const semesterBoardRef=useRef<HTMLDivElement|null>(null)
  function scrollSemesters(direction:number) {
    const board=semesterBoardRef.current
    if(!board)return
    const first=board.querySelector<HTMLElement>('.semester-card')
    const step=(first?.offsetWidth??304)+12
    board.scrollBy({left:direction*step,behavior:'smooth'})
  }
  function jumpToYear(yearIndex:number) {
    const board=semesterBoardRef.current
    const target=board?.querySelectorAll<HTMLElement>('.semester-card')[yearIndex*2]
    if(board&&target)board.scrollTo({left:target.offsetLeft-board.offsetLeft,behavior:'smooth'})
  }
  useEffect(()=>{planRef.current=plan;localStorage.setItem(PLAN_KEY,JSON.stringify(plan))},[plan])
  useEffect(()=>{localStorage.setItem(PROFILE_KEY,JSON.stringify(profile))},[profile])
  useEffect(()=>{localStorage.setItem(UTCP_KEY,JSON.stringify(utcp))},[utcp])
  useEffect(()=>{
    let cancelled=false
    fetch(`${API}/${CATALOGUE_YEAR}/moduleList.json`).then(r=>{
      if(!r.ok)throw new Error('Catalogue unavailable');return r.json()
    }).then((data:Course[])=>{if(!cancelled){setCourses(data);setLoading(false)}})
      .catch(()=>{if(!cancelled){setError('Unable to load NUSMods catalogue.');setLoading(false)}})
    return ()=>{cancelled=true}
  },[])
  const results=courses.filter(c=>{
    const q=search.trim().toLowerCase()
    return q && (c.moduleCode.toLowerCase().includes(q)||c.title.toLowerCase().includes(q))
  }).slice(0,20)
  async function selectCourse(code:string) {
    setError('');setSelected(null)
    try {
      const response=await fetch(`${API}/${CATALOGUE_YEAR}/modules/${code}.json`)
      if(!response.ok)throw new Error('Course unavailable')
      setSelected(await response.json())
    } catch {setError('Unable to load course details.')}
  }
  function addCourse(semesterId:string) {
    if(!selected)return
    const target = semesters.find(s=>s.id===semesterId)
    if (!target || !courses.find(c=>c.moduleCode===selected.moduleCode)?.semesters?.includes(target.sem)) {
      setError('This course is not offered in the selected semester in the AY2026/27 catalogue.')
      return
    }
    if(plan.some(c=>c.code===selected.moduleCode)){alert('Course already in your plan.');return}
    setPlan(old=>[...old,{code:selected.moduleCode,title:selected.title,
      units:Number(selected.moduleCredit),semester:semesterId,status:'planned',
      suExercised:false,prereqTree:selected.prereqTree,prerequisite:selected.prerequisite}])

    setSearch('');setSelected(null);setActiveSearchSemester(null)
  }
  async function addFromRequirement(code:string,semesterId:string):Promise<string|null> {
    if(planRef.current.some(c=>c.code===code))return 'Already in your plan.'
    const semester=semesters.find(s=>s.id===semesterId)
    const listing=courses.find(c=>c.moduleCode===code)
    if(!semester||!listing?.semesters?.includes(semester.sem))return 'Not offered in the selected semester.'
    const response=await fetch(`${API}/${CATALOGUE_YEAR}/modules/${encodeURIComponent(code)}.json`)
    if(!response.ok)return `Unable to fetch ${code} details from NUSMods.`
    const detail:CourseDetails=await response.json()
    const units=Number(detail.moduleCredit)
    if(!Number.isFinite(units)||units<=0)return 'Invalid course units.'
    if(planRef.current.some(c=>c.code===code))return 'Already in your plan.'
    const newCourse:PlannedCourse={code,title:detail.title,units,semester:semesterId,status:'planned',suExercised:false,prereqTree:detail.prereqTree,prerequisite:detail.prerequisite}
    const total=planRef.current.filter(c=>c.semester===semesterId).reduce((n,c)=>n+c.units,0)+units
    setPlan(old=>old.some(c=>c.code===code)?old:[...old,newCourse])

    setLastRemoved(null)
    setRequirementMessage(`${code} added to ${semester.label}.${total>24?` Workload: ${total} units (over 24).`:''}`)
    return null
  }
  function undoRemoval(){
    if(!lastRemoved)return
    const restored=lastRemoved
    setPlan(old=>old.some(c=>c.code===restored.code)?old:[...old,restored])
    setLastRemoved(null)
  }
  function removeCourse(code:string) {
    const found=plan.find(c=>c.code===code)
    if(found)setLastRemoved(found)
    setPlan(old=>old.filter(c=>c.code!==code))
  }
  function updateCourse(code:string,changes:Partial<PlannedCourse>) {
    setPlan(old=>old.map(c=>c.code===code?{...c,...changes}:c))
  }
  function moveCourse(code:string,semester:string) {
    const target = semesters.find(s=>s.id===semester)
    const offering = courses.find(c=>c.moduleCode===code)?.semesters
    if (target && offering && !offering.includes(target.sem)) {
      window.alert(`${code} is not offered in Semester ${target.sem} in the AY2026/27 catalogue.`)
      return
    }
    const found=plan.find(c=>c.code===code)
    if(!found||found.semester===semester)return

    setPlan(old=>old.map(c=>c.code===code?{...c,semester}:c))
  }
  function toggleSemester(id: string) {
    setPlan(previous => {
      const semesterCourses = previous.filter(
        course => course.semester === id
      )

      const allCompleted =
        semesterCourses.length > 0 &&
        semesterCourses.every(
          course => course.status === 'completed'
        )

      return previous.map(course => {
        if (course.semester !== id) return course

        return {
          ...course,
          status: allCompleted ? 'planned' as const : 'completed' as const,
          suExercised: allCompleted ? false : course.suExercised
        }
      })
    })
  }
  function changeMatriculationYear(year:number) {
    const delta=year-profile.matriculationYear
    setPlan(old=>old.map(c=>{
      const [y,s]=c.semester.split('-').map(Number)
      return {...c,semester:`${y+delta}-${s}`}
    }))
    setProfile(old=>({...old,matriculationYear:year}))
  }
  const sensors=useSensors(
    useSensor(PointerSensor,{activationConstraint:{distance:8}}),
    useSensor(TouchSensor,{activationConstraint:{delay:200,tolerance:8}}),
    useSensor(KeyboardSensor)
  )
  function handleDragEnd(event:DragEndEvent) {
    if(event.over && semesters.some(s=>s.id===String(event.over?.id)))
      moveCourse(String(event.active.id),String(event.over.id))
  }
  const totalUnits=plan.reduce((n,c)=>n+c.units,0)
  const completedUnits=plan.filter(c=>c.status==='completed').reduce((n,c)=>n+c.units,0)
  const cohortSupported=profile.college==='CHS' && profile.matriculationYear===2025
  const primary=profile.primaryMajor.trim().toLowerCase().replace(/[^a-z]+/g, ' ').trim()
  const minors=profile.minors.map(m=>m.trim().toLowerCase().replace(/\s+/g, ' '))
  const audits:Audit[]=[]
  if(cohortSupported){
    audits.push(auditCHS(plan, utcp))
    if(primary==='political science')audits.push(auditPoliticalScience(plan))
    if(primary==='economics') {
      audits.push(auditEconomicsMajor(plan,'primary'))
      for(const key of profile.economicsSpecialisations??[]) if(key in ECONOMICS_SPECIALISATIONS) audits.push(auditEconomicsSpecialisation(plan,key as EconomicsSpecialisation))
    }
    if(profile.secondMajor.trim().toLowerCase()==='economics')audits.push(auditEconomicsMajor(plan,'second'))
    if(minors.includes('economics'))audits.push(auditEconomicsMinor(plan))
    if(minors.includes('urban studies'))audits.push(auditUrbanStudiesMinor(plan))
  }
  const overlaps=overlapCandidates(audits)
  const availableSemesters=Object.fromEntries(courses.map(c=>[c.moduleCode,c.semesters??[]])) as Record<string,number[]>
  return <div className="app">
    <header><h1>🎓 NUS Degree Planner</h1><p>Plan your academic journey across eight semesters.</p></header>
    <main>
      <div className="profile-utcp-grid">
      <section className="profile-section"><h2>Academic Profile</h2><div className="profile-grid">
        <label>Matriculation Year<select value={profile.matriculationYear} onChange={e=>changeMatriculationYear(Number(e.target.value))}>
          {Array.from({length:10},(_,i)=>2022+i).map(y=><option key={y} value={y}>AY{y}/{String(y+1).slice(-2)}</option>)}
        </select></label>
        <label>Faculty / College<select value={profile.college} onChange={e=>setProfile(p=>({...p,college:e.target.value}))}>
          {['CHS','CDE','Computing','Business','Other'].map(c=><option key={c} value={c}>{c}</option>)}
        </select></label>
        <label>Primary Major
          <select value={profile.primaryMajor} onChange={e=>setProfile(p=>({...p,primaryMajor:e.target.value}))}>
            <option value="">Select primary major</option>
            {profile.primaryMajor && !PRIMARY_MAJORS.some(name=>name===profile.primaryMajor) && <option value={profile.primaryMajor}>{profile.primaryMajor} (previous value)</option>}
            {PRIMARY_MAJORS.map(name=><option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label>Second Major
          <select value={profile.secondMajor} onChange={e=>setProfile(p=>({...p,secondMajor:e.target.value}))}>
            <option value="">None</option>
            {profile.secondMajor && !SECOND_MAJORS.some(name=>name===profile.secondMajor) && <option value={profile.secondMajor}>{profile.secondMajor} (previous value)</option>}
            {SECOND_MAJORS.filter(name=>name!==profile.primaryMajor).map(name=><option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        {profile.primaryMajor === 'Economics' && <div className="minor-picker full-width">
          <label>Economics specialisations (optional; maximum two)</label>
          <div className="minor-chips">{(profile.economicsSpecialisations??[]).map(key=><span className="minor-chip" key={key}>
            {ECONOMICS_SPECIALISATIONS[key as EconomicsSpecialisation]?.name??key}
            <button type="button" onClick={()=>setProfile(p=>({...p,economicsSpecialisations:(p.economicsSpecialisations??[]).filter(x=>x!==key)}))}>×</button>
          </span>)}</div>
          <select value="" disabled={(profile.economicsSpecialisations??[]).length>=2} onChange={e=>{
            const key=e.target.value
            if(key)setProfile(p=>({...p,economicsSpecialisations:[...new Set([...(p.economicsSpecialisations??[]),key])].slice(0,2)}))
          }}>
            <option value="">Add specialisation...</option>
            {Object.entries(ECONOMICS_SPECIALISATIONS).filter(([key])=>!(profile.economicsSpecialisations??[]).includes(key)).map(([key,spec])=><option key={key} value={key}>{spec.name}</option>)}
          </select>
        </div>}
        <div className="minor-picker full-width">
          <label htmlFor="minor-select">Minors ({profile.minors.length}/3)</label>
          <div className="minor-chips">{profile.minors.map(name=><span className="minor-chip" key={name}>
            {name}<button type="button" aria-label={`Remove ${name} minor`}
              onClick={()=>setProfile(p=>({...p,minors:p.minors.filter(m=>m!==name)}))}>×</button>
          </span>)}</div>
          <select id="minor-select" value="" disabled={profile.minors.length>=3}
            onChange={e=>{const name=e.target.value;if(name)setProfile(p=>({
              ...p,minors:p.minors.includes(name)||p.minors.length>=3?p.minors:[...p.minors,name]
            }))}}>
            <option value="">{profile.minors.length>=3?'Maximum three minors':'Add a minor...'}</option>
            {MINORS.filter(name=>!profile.minors.includes(name) && name!==profile.primaryMajor).map(name=><option key={name} value={name}>{name}</option>)}
          </select>
        </div>
      </div></section>
      <section className="utcp-section">
        <h2>Residential College / UTCP</h2>
        <label className="utcp-enrolment"><input type="checkbox" checked={utcp.enrolled}
          onChange={e=>setUtcp(old=>({...old,enrolled:e.target.checked}))}/>
          I am taking the University Town College Programme (UTCP)
        </label>
        {utcp.enrolled && <>
          <div className="utcp-slots">
            {UTCP_SLOTS.map(slot=>{
              const code=utcp.courseCodes[slot.id]
              const match=plan.find(c=>c.code===code)
              const duplicates=code && UTCP_SLOTS.some(other=>other.id!==slot.id && utcp.courseCodes[other.id]===code)
              return <label key={slot.id}>{slot.label}
                <select value={code} onChange={e=>setUtcp(old=>({...old,courseCodes:{...old.courseCodes,[slot.id]:e.target.value}}))}>
                  <option value="">Not assigned</option>
                  <optgroup label="UTCP-coded courses">
                    {plan.filter(c=>/^UT[A-Z]\d/i.test(c.code)).map(c=><option key={c.code} value={c.code}>{c.code} — {c.title}</option>)}
                  </optgroup>
                  <optgroup label="Other courses in your plan">
                    {plan.filter(c=>!/^UT[A-Z]\d/i.test(c.code)).map(c=><option key={c.code} value={c.code}>{c.code} — {c.title}</option>)}
                  </optgroup>
                </select>
                <small className={duplicates?'utcp-warning':''}>{duplicates?'Same course assigned to multiple slots — please correct':match?`Status: ${match.status}`:'Choose a course from your plan'}</small>
              </label>
            })}
          </div>

        </>}
      </section>
      </div>
      <section className="requirements-section"><h2>Graduation Requirements</h2>
        {!cohortSupported && <p className="requirements-note">Detailed rules currently supported only for AY2025/26 CHS students.</p>}
        {cohortSupported && !audits.length && <p className="requirements-note">Set Political Science as your primary major and Economics and Urban Studies as minors to see the supported checks.</p>}
        {audits.length > 0 && <div className="degree-overview">
          {audits.map(a => {
            const applicable = a.checks.filter(c => !c.maximum && !c.manual)
            const complete = applicable.filter(c => c.completed >= c.target).length
            const planned = applicable.filter(c => c.scheduled >= c.target).length
            return <div className="degree-overview-card" key={a.id}>
              <strong>{a.programme.split(' — ')[0]}</strong>
              <span>{complete}/{applicable.length} checks completed · {planned}/{applicable.length} covered in plan</span>
              <div className="degree-progress-track"><div style={{width:`${applicable.length ? complete / applicable.length * 100 : 0}%`}} /></div>
            </div>
          })}
        </div>}
        <p className="degree-expand-hint">Select a programme below to view its requirements and the courses counted.</p>
        {requirementMessage&&<p className="requirements-action-message" role="status">{requirementMessage}</p>}
        {audits.map(a=><AuditPanel key={a.programme} audit={a} catalogue={courses} plan={plan} semesters={semesters} onAdd={addFromRequirement}/>)}
        {audits.length>1 && <div className="overlap-panel"><h3>Course overlaps</h3>
          {overlaps.length ? <div className="overlap-list">{overlaps.map(o=><div className="overlap-row" key={o.code}>
            <div><strong>{o.code}</strong> · {o.units} units · {o.status}<br/>
              <small>Appears in: {o.programmes.join(' / ')}</small></div>
            <span className={o.programmes.length>2?'overlap-alert':'overlap-ok'}>
              {o.programmes.length>2?'3+ candidate programmes — review':'2 candidate programmes'}
            </span>
          </div>)}</div> : <p>No cross-programme candidate overlaps detected.</p>}
        </div>}
      </section>
      <section className="eligible-explorer-section">
        <div className="explorer-topline">
          <h2>Browse Eligible Courses</h2>
          <label>From semester
            <select value={semesters.some(s=>s.id===explorerSemester)?explorerSemester:semesters[0].id}
              onChange={e=>setExplorerSemester(e.target.value)}>
              {semesters.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
        </div>
        <EligibleCourseExplorer catalogue={courses} plan={plan}
          startSemester={semesters.some(s=>s.id===explorerSemester)?explorerSemester:semesters[0].id}
          primaryMajor={profile.primaryMajor} minors={profile.minors} />
      </section>
      <PlanBackup />
      {lastRemoved&&<div className="undo-remove-banner" role="status">
        <span>Removed {lastRemoved.code} from {lastRemoved.semester}.</span>
        <button type="button" onClick={undoRemoval}>Undo removal</button>
        <button type="button" onClick={()=>setLastRemoved(null)} aria-label="Dismiss">×</button>
      </div>}
      <section className="planner"><div className="planner-topline"><h2>My Degree Plan</h2><div className="planner-navigation"><button type="button" onClick={()=>scrollSemesters(-1)} aria-label="Previous semester">‹</button><button type="button" onClick={()=>scrollSemesters(1)} aria-label="Next semester">›</button></div></div><div className="summary">
        <div><strong>{plan.length}</strong><span>Courses in plan</span></div>
        <div><strong>{completedUnits}</strong><span>Completed units (self-reported)</span></div>
        <div><strong>{totalUnits}</strong><span>Total planned + completed units</span></div>
      </div><div className="year-jump" aria-label="Jump to academic year">{[0,1,2,3].map(i=><button key={i} type="button" onClick={()=>jumpToYear(i)}>Year {i+1}</button>)}<span>Scroll sideways to see all semesters</span></div>
      <DndContext sensors={sensors} autoScroll onDragEnd={handleDragEnd}><div className="semester-grid" ref={semesterBoardRef}>
        {semesters.map(s=><SemesterCard key={s.id} semester={s} plan={plan} semesters={semesters} subjectColors={subjectColors}
          onRemove={removeCourse} onUpdate={updateCourse} onToggle={toggleSemester}
          searchOpen={activeSearchSemester===s.id} onOpenSearch={id=>{
            setActiveSearchSemester(old=>old===id?null:id);setSearch('');setSelected(null);setError('')
          }} search={search} searchResults={results} loading={loading} error={error} availableSemesters={availableSemesters}
          selected={activeSearchSemester===s.id?selected:null} onSearch={value=>{setSearch(value);setSelected(null)}}
          onSelect={selectCourse} onAdd={addCourse}/>)}
      </div></DndContext></section>
    </main>
  </div>
}
export default App
