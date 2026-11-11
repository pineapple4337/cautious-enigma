const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,resolveJsonModule:true}}).outputText,f);
const {auditStructuredProgramme}=require('../degreeEngine.ts');const {getProgrammeRegistry}=require('../programmeRegistry.ts');
const c=(code,units=4,status='planned')=>({code,title:code,units,semester:'2025-1',status,suExercised:false});
const get=(audit,id)=>{const r=audit?.checks.find(x=>x.id===id);assert.ok(r,`missing ${id}`);return r};
test('DSE is cohort-scoped and requires both alternative groups',()=>{
 assert.equal(auditStructuredProgramme('science-dse-primary',[],2026),undefined);
 const a=auditStructuredProgramme('science-dse-primary',[c('MA2104'),c('ST2131')],2025);
 assert.equal(get(a,'dse:calculus').scheduled,1);assert.equal(get(a,'dse:probability').scheduled,1);
 assert.equal(get(a,'dse:major-units').scheduled,8);
});
test('DSE no-approval elective excludes DSE4201',()=>{
 const a=auditStructuredProgramme('science-dse-primary',[c('DSE4201'),c('DSE4211'),c('DSA4264')],2025);
 assert.equal(get(a,'dse:advanced').scheduled,2);
});
test('BES needs one level-4000 GE and two level-3000 GE electives',()=>{
 const a=auditStructuredProgramme('science-env-primary',[c('GE3231'),c('GE3238'),c('GE4207')],2025);
 assert.equal(get(a,'env:ge3').scheduled,2);assert.equal(get(a,'env:ge4').scheduled,1);
});
test('BES accepts project or two advanced electives',()=>{
 const a=auditStructuredProgramme('science-env-primary',[c('GE4401',8)],2025);
 assert.equal(get(a,'env:capstone').scheduled,1);
 const b=auditStructuredProgramme('science-env-primary',[c('GE4207'),c('LSM4251')],2025);
 assert.equal(get(b,'env:capstone').scheduled,1);
});
test('BES no-approval cohort starts 2024',()=>assert.equal(auditStructuredProgramme('science-env-primary',[],2023),undefined));
test('DSE and BES do not get standard CHS 52-unit audit',()=>{
 for(const primaryMajor of ['Data Science and Economics','Environmental Studies']){
 const entries=getProgrammeRegistry([],{primaryMajor,secondMajor:'',minors:[],college:'CHS',matriculationYear:2025},{enrolled:false,courseCodes:{junior:'',writing:'',senior1:'',senior2:''}});
 assert.ok(!entries.some(x=>x.id==='chs'));
 assert.ok(entries.some(x=>x.audit && x.kind==='primary'));
 }
});
test('Physics specialisation only offered for Physics primary',()=>{
 const base={primaryMajor:'Physics',secondMajor:'',minors:[],college:'CHS',matriculationYear:2025,scienceSpecialisations:['science-pc-spec-astro']};
 const entries=getProgrammeRegistry([],base,{enrolled:false,courseCodes:{junior:'',writing:'',senior1:'',senior2:''}});
 assert.ok(entries.some(x=>x.id==='science-pc-spec-astro'));
 assert.ok(!getProgrammeRegistry([],{...base,primaryMajor:'Mathematics'},{}).some(x=>x.id==='science-pc-spec-astro'));
});
