/** Long-range planning check: lectures and final exams only, AY2026/27 reference. */
import { APP_CONFIG } from './config'
export const TIMETABLE_AY = APP_CONFIG.catalogueYear
const API = `https://api.nusmods.com/v2/${TIMETABLE_AY}/modules/`
type Lesson = { classNo:string;lessonType:string;day:string;startTime:string;endTime:string;weeks?:number[] }
type SemesterInfo = {semester:number;timetable?:Lesson[];examDate?:string;examDuration?:number}
type Detail = {semesterData?:SemesterInfo[]}
export type TimetableResult = {status:'clear'|'clash'|'unknown';message:string;conflicts:string[];groups:Record<string,string[]>}
const cache=new Map<string,Promise<Detail|null>>()
function fetchDetail(code:string):Promise<Detail|null>{
  if(!cache.has(code))cache.set(code,fetch(`${API}${encodeURIComponent(code)}.json`).then(r=>r.ok?r.json():null).catch(()=>null))
  return cache.get(code)!
}
const minutes=(t:string)=>/^\d{4}$/.test(t)?Number(t.slice(0,2))*60+Number(t.slice(2)):NaN
function overlap(a:Lesson,b:Lesson):boolean{
  if(a.day!==b.day)return false
  if(Array.isArray(a.weeks)&&Array.isArray(b.weeks)&&!a.weeks.some(w=>b.weeks!.includes(w)))return false
  const x=minutes(a.startTime),y=minutes(a.endTime),p=minutes(b.startTime),q=minutes(b.endTime)
  return Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(p)&&Number.isFinite(q)&&x<q&&p<y
}
function lectureOptions(code:string,lessons:Lesson[]):{code:string;group:string;slots:Lesson[]}[]{
  const groups=new Map<string,Lesson[]>()
  for(const l of lessons.filter(l=>/lecture/i.test(l.lessonType))){
    const key=`${l.lessonType}:${l.classNo}`
    groups.set(key,[...(groups.get(key)||[]),l])
  }
  return [...groups].map(([group,slots])=>({code,group,slots}))
}
export async function checkTimetable(codes:string[],semester:number):Promise<TimetableResult>{
  const unique=[...new Set(codes.map(c=>c.toUpperCase()))]
  if(unique.length<2)return {status:'clear',message:'No inter-course clashes.',conflicts:[],groups:{}}
  const data=await Promise.all(unique.map(fetchDetail))
  const missing:string[]=[]
  const lectures:{code:string;group:string;slots:Lesson[]}[][]=[]
  const exams:{code:string;start:number;end:number}[]=[]
  const conflicts:string[]=[]
  for(let i=0;i<unique.length;i++){
    const code=unique[i]
    const info=data[i]?.semesterData?.find(s=>s.semester===semester)
    if(!info){missing.push(`${code} (semester data)`);continue}
    if(!Array.isArray(info.timetable)){missing.push(`${code} (lecture data)`)}
    else {
      const options=lectureOptions(code,info.timetable)
      if(options.length)lectures.push(options)
      // No lecture slot may legitimately mean no lectures. Do not invent a clash.
    }
    if(info.examDate){
      const start=Date.parse(info.examDate)
      const duration=Number(info.examDuration)
      if(Number.isFinite(start)&&Number.isFinite(duration)&&duration>0)
        exams.push({code,start,end:start+duration*60_000})
      else missing.push(`${code} (exam time/duration)`)
    }
    // An absent examDate can mean no final examination; not an error.
  }
  for(let i=0;i<exams.length;i++)for(let j=i+1;j<exams.length;j++){
    const a=exams[i],b=exams[j]
    if(a.start<b.end&&b.start<a.end)conflicts.push(`${a.code} and ${b.code}: overlapping final examinations`)
  }
  // Choose one lecture group per course. No tutorial or lab selection.
  let selected:{code:string;group:string;slots:Lesson[]}[]=[]
  let explored=0
  function search(index:number,chosen:typeof selected):boolean{
    if(++explored>20000)return false
    if(index===lectures.length){selected=chosen;return true}
    for(const option of lectures[index]){
      if(chosen.every(other=>option.slots.every(a=>other.slots.every(b=>!overlap(a,b)))))
        if(search(index+1,[...chosen,option]))return true
    }
    return false
  }
  const compatible=search(0,[])
  if(!compatible&&explored<=20000)conflicts.push('No clash-free lecture-group combination found')
  if(conflicts.length)return {status:'clash',message:'Lecture or final-exam conflict detected.',conflicts,groups:{}}
  if(missing.length||explored>20000)return {status:'unknown',message:`Incomplete reference data: ${missing.join(', ')||'lecture combinations'}`,conflicts:[],groups:{}}
  return {status:'clear',message:'No known lecture or final-exam clashes.',conflicts:[],groups:Object.fromEntries(selected.map(x=>[x.code,[x.group]]))}
}
