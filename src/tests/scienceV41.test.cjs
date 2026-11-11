const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,resolveJsonModule:true}}).outputText,f);
const {auditStructuredProgramme}=require('../degreeEngine.ts');
const c=(code,units=4,status='planned')=>({code,title:code,units,semester:'2025-1',status,suExercised:false});
const check=(audit,id)=>{const found=audit.checks.find(x=>x.id===id);assert.ok(found,id);return found};
test('Nanophysics 20-unit basket is recognised',()=>{const a=auditStructuredProgramme('science-pc-spec-nano',[c('SP2251'),c('PC3235'),c('PC3242'),c('PC3251'),c('PC4246')],2025);assert.equal(check(a,'spec:pc:nano:units').scheduled,20)});
test('Quantum Technologies recognises eight-unit honours project',()=>{const a=auditStructuredProgramme('science-pc-spec-quantum',[c('PC4288Q',8),c('PC3130'),c('PC4230'),c('PC4246')],2025);assert.equal(check(a,'spec:pc:quantum:units').scheduled,20)});
test('Environmental Studies distinct elective allocation does not reuse courses',()=>{const a=auditStructuredProgramme('science-env-primary',[c('GE2101'),c('GE3231'),c('GE3238'),c('GE4207'),c('LSM2251'),c('LSM3252'),c('LSM3254'),c('LSM4201'),c('ENV3101'),c('ENV3104')],2025);assert.equal(check(a,'env:elective-slots:distinct').scheduled,10);assert.equal(check(a,'env:elective-slots:distinct').target,10)});
test('Environmental Studies distinct allocation flags missing slots',()=>{const a=auditStructuredProgramme('science-env-primary',[c('GE2101'),c('GE3231'),c('GE4207')],2025);assert.equal(check(a,'env:elective-slots:distinct').scheduled,3)});
