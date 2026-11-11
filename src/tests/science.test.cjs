const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const ts=require('typescript')
require.extensions['.ts']=(module,filename)=>{
 const js=ts.transpileModule(fs.readFileSync(filename,'utf8'),{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,resolveJsonModule:true}}).outputText
 module._compile(js,filename)
}
const {auditStructuredProgramme}=require('../degreeEngine.ts')
const c=(code,status='planned')=>({code,title:code,units:4,semester:'2025-1',status,suExercised:false})
const get=(audit,id)=>{const result=audit.checks.find(x=>x.id===id);assert.ok(result,id);return result}
test('Chemistry second major: one lab is enough, both labs allowed',()=>{
 const base=['CM1102','CM2112','CM2122','CM2133','CM2143','CM3111','CM3121','CM3131','CM3141'].map(c)
 const audit=auditStructuredProgramme('science-cm-second',[...base,c('CM3191')],2025)
 assert.equal(get(audit,'science:cm:second:lab').scheduled,1)
 assert.equal(get(audit,'science:cm:second:total').scheduled,40)
 assert.equal(get(audit,'science-cm-second:core:CM1102').scheduled,1)
})
test('Chemistry minor: five specified compulsory courses',()=>{
 const audit=auditStructuredProgramme('science-cm-minor',['CM1102','CM2112','CM2122','CM2133','CM2143'].map(c),2025)
 assert.equal(get(audit,'science:cm:minor:total').scheduled,20)
 assert.equal(get(audit,'science-cm-minor:core:CM2143').scheduled,1)
})
test('Physics minor requires two distinct foundational choices',()=>{
 const audit=auditStructuredProgramme('science-pc-minor',['PC1101','PC2174A','PC2193','PC2031'].map(c),2025)
 assert.equal(get(audit,'science:pc:minor:choices').scheduled,1)
 assert.equal(get(audit,'science:pc:minor:total').scheduled,16)
})
test('Statistics minor alternatives satisfy their groups',()=>{
 const audit=auditStructuredProgramme('science-st-minor',['ST1131','MA2002','ST2131','ST2137','ST3131'].map(c),2025)
 for(const id of ['calc','prob','methods','advanced','total'])assert.ok(get(audit,'science:st:minor:'+id).scheduled>=1)
 assert.equal(get(audit,'science:st:minor:total').scheduled,20)
})
test('Science second majors and minors remain marked partial',()=>{
 const definitions=require('../programmeDefinitions.json').programmes
 for(const prefix of ['cm','lsm','ma','pc','st'])for(const kind of ['second','minor']){
  const d=definitions.find(x=>x.id===`science-${prefix}-${kind}`)
  assert.equal(d.implementationStatus,'partial')
  assert.ok(d.requirements.length>0)
 }
})
