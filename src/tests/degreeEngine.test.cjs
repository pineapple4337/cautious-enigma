// Run: npm test (Node's built-in test runner; TypeScript is already a dev dependency).
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
// Load the application's actual TypeScript modules without needing a separate test framework.
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  const js = ts.transpileModule(source, { fileName: filename, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    esModuleInterop: true, resolveJsonModule: true
  }}).outputText
  module._compile(js, filename)
}
const {auditStructuredProgramme, getStructuredDefinition, eligibleForRequirement} = require('../degreeEngine.ts')
const {getProgrammeRegistry} = require('../programmeRegistry.ts')
const definitions = require('../programmeDefinitions.json')
const recognised = require('../fassRecognisedCourses.json')
const course = (code, status='planned', units=4) => ({code, title:code, units, semester:'2025-1', status, suExercised:false})
const check = (audit,id) => {
  const found=audit.checks.find(x=>x.id===id)
  assert.ok(found, `Missing check ${id}`)
  return found
}
const cohort=2025
const subjects=['Political Science','Geography','Chinese Studies','History','Sociology']
for(const subject of subjects){
  for(const kind of ['primary','second',...(subject==='Geography'?[]:['minor'])]){
    test(`Registry supports ${subject} ${kind} in 2025`,()=>{
      const profile={primaryMajor:kind==='primary'?subject:'',secondMajor:kind==='second'?subject:'',minors:kind==='minor'?[subject]:[],college:'Other',matriculationYear:cohort}
      const item=getProgrammeRegistry([],profile,{enrolled:false,college:'RC4',courseCodes:{junior:'',writing:'',senior1:'',senior2:''}}).find(x=>x.kind===kind)
      assert.ok(item,`${subject} ${kind} absent`)
      assert.equal(item.supported,true)
      assert.ok(item.audit?.checks.length)
    })
  }
}
test('Every structured definition has a unique ID and valid cohort range',()=>{
  const ids=definitions.programmes.map(x=>x.id)
  assert.equal(new Set(ids).size,ids.length)
  for(const def of definitions.programmes){
    assert.ok(def.minCohort<= (def.maxCohort??9999),def.id)
    assert.ok(def.source?.startsWith('https://'),def.id)
    const ruleIds=def.requirements.map(r=>r.id)
    assert.equal(new Set(ruleIds).size,ruleIds.length,def.id)
  }
})
test('Cohort boundaries are enforced',()=>{
  const def=getStructuredDefinition('ch-primary',2025)
  assert.ok(def)
  assert.equal(getStructuredDefinition('ch-primary',2026),undefined)
})
test('Political Science compulsory course does not pass from unrelated units',()=>{
  const audit=auditStructuredProgramme('ps-major',[course('PS2234'),course('PS4201')],cohort)
  assert.equal(check(audit,'ps-major:core:PS1101E').scheduled,0)
  assert.equal(check(audit,'ps-major:core:PS3257').scheduled,0)
})
test('Political Science counts planned and completed separately',()=>{
  const audit=auditStructuredProgramme('ps-major',[course('PS1101E','completed'),course('PS3257')],cohort)
  assert.equal(check(audit,'ps:ps-coded').scheduled,8)
  assert.equal(check(audit,'ps:ps-coded').completed,4)
})
test('Political Science recognised non-PS subfield courses count to total, not PS-coded minimum',()=>{
  const code=Object.values(require('../politicalScienceSubfields.ts').PS_SUBFIELDS).flat().find(x=>!x.startsWith('PS'))
  assert.ok(code)
  const audit=auditStructuredProgramme('ps-major',[course('PS1101E'),course(code)],cohort)
  assert.equal(check(audit,'ps:major-total').scheduled,8)
  assert.equal(check(audit,'ps:ps-coded').scheduled,4)
})
test('Level 3000 and 4000 PS courses contribute to different thresholds',()=>{
  const audit=auditStructuredProgramme('ps-major',[course('PS3257'),course('PS4201')],cohort)
  assert.equal(check(audit,'ps:level-3000').scheduled,4)
  assert.equal(check(audit,'ps:level-4000').scheduled,4)
})
test('History recognised cap limits the eligible total, and separately exposes over-cap units',()=>{
  const id='hy-primary'; const def=getStructuredDefinition(id,cohort)
  const rule=def.requirements.find(x=>x.type==='capped_total_units')
  assert.ok(rule)
  const basket=recognised.lists[rule.recognisedBasket]
  assert.ok(basket.length>=3)
  const audit=auditStructuredProgramme(id,basket.slice(0,3).map(x=>course(x)),cohort)
  const total=check(audit,rule.id)
  assert.ok(total.scheduled<=rule.recognisedCap,`Allowed ${total.scheduled} > ${rule.recognisedCap}`)
  assert.equal(check(audit,rule.id+':recognised-cap').scheduled,12)
})
test('Sociology recognised cap counts completed units separately',()=>{
  const id='sc-primary';const def=getStructuredDefinition(id,cohort)
  const rule=def.requirements.find(x=>x.type==='capped_total_units')
  assert.ok(rule)
  const basket=recognised.lists[rule.recognisedBasket]
  assert.ok(basket?.length)
  const audit=auditStructuredProgramme(id,[course(basket[0],'completed')],cohort)
  assert.equal(check(audit,rule.id).completed,4)
  assert.equal(check(audit,rule.id).scheduled,4)
})
test('Eligibility explorer recognises named recognised basket entries',()=>{
  const def=getStructuredDefinition('hy-primary',cohort)
  const rule=def.requirements.find(x=>x.type==='capped_total_units')
  const code=recognised.lists[rule.recognisedBasket][0]
  assert.equal(eligibleForRequirement(rule.id,code),true)
})
test('Maximum checks do not demand filling to target',()=>{
  const audit=auditStructuredProgramme('ps-major',[],cohort)
  const max=check(audit,'ps:level-5000-max')
  assert.equal(max.maximum,true)
  assert.equal(max.scheduled,0)
})
test('Geography uses GE-coded courses for its unit requirement',()=>{
  const audit=auditStructuredProgramme('ge-primary',[course('GE2101'),course('PS1101E')],cohort)
  const total=check(audit,'ge:total')
  assert.equal(total.scheduled,4)
})
