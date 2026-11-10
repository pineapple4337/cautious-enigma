/** Official NUS Economics requirements, matriculation AY2021/22 onwards.
 * Course availability and titles are obtained from NUSMods, not this file.
 * Sources: https://fass.nus.edu.sg/ecs/requirements-for-economics-major/
 * https://fass.nus.edu.sg/ecs/academic-year-2021-22-and-after-2/
 * https://fass.nus.edu.sg/ecs/students-matriculated-in-academic-year-2021-22-minor-in-econs/
 * https://fass.nus.edu.sg/ecs/students-matriculated-in-academic-year-2021-22-and-onwards-specialisations/
 */
export const ECONOMICS = {
  cohortStart: 2021,
  primary: {
    totalUnits: 60, level3000Units: 16, level4000Units: 20,
    recognisedCap: 8, level5000Cap: 8,
    compulsory: ['EC1101E','EC2101','EC2102','EC2104','EC2303','EC3101','EC3102','EC3303'],
    level4000Alternatives: ['FE5213'], // PE4XXXE also allowed by departmental rule
    source: 'https://fass.nus.edu.sg/ecs/requirements-for-economics-major/'
  },
  second: {
    totalUnits: 40, level3000PlusUnits: 16, recognisedCap: 8,
    compulsory: ['EC1101E','EC2101','EC2102','EC2104','EC2303','EC3101','EC3102','EC3303'],
    source: 'https://fass.nus.edu.sg/ecs/academic-year-2021-22-and-after-2/'
  },
  minor: {
    totalUnits: 20, recognisedCap: 4,
    compulsory: ['EC1101E'], intermediate: ['EC2101','EC2102'],
    source: 'https://fass.nus.edu.sg/ecs/students-matriculated-in-academic-year-2021-22-minor-in-econs/'
  },
  // The MA and ST substitutions require a replacement elective to retain the unit total.
  substitutions: {
    EC1101E: ['RE1704','BSP1703'],
    EC2102: ['BSE3701'],
    EC3303: ['ST3131'],
    EC2303: ['ST1131','ST2131','ST3131','MA2216','MA2116','DSC1007','DSC1007X']
  },
  majorRecognised: [
    'ACC1701X','ACC1701XA','ACC1701XB','ACC1701XC','ACC1701XD','ACC1701XE',
    'BSE3701','BSP1703','BSP1703X','BSS4003A','BSN4811','BSN4811A',
    'BT1101','BT1101HS','FE5213','MA1101R','MA2001','MA1102R','MA2002',
    'MA1505','PC2174A','MA1506','MA1507','MA1508','MA1508E','MA1511','MA1512','MA1513',
    'MA1521','MA2108','MA3110','PE4101E','PE4102E','ST1131','ST2131',
    'MA2216','MA2116','ST3131','PP5141','RE1704','RE2705'
  ],
  minorRecognised: ['FIN2004','FIN2004X','FIN2704','FIN2704X','RE1704','RE2705','MA1102R','MA2002','MA1521','ST3131']
} as const

export const ECONOMICS_SPECIALISATIONS = {
  quantitative: {
    name: 'Quantitative Economics',
    groups: [
      {id:'foundation',label:'One level-3000 quantitative course',choose:1,codes:['EC3312','EC3314','EC3304']},
      {id:'micro',label:'Microeconomic Analysis III',choose:1,codes:['EC4301']},
      {id:'macro',label:'Macroeconomic Analysis III',choose:1,codes:['EC4302']},
      {id:'advanced',label:'Two advanced quantitative courses',choose:2,codes:['EC4303','EC4304','EC4308','EC4312','EC4313','EC4501','EC5104','FE5213']}
    ]
  },
  monetary: {
    name: 'Monetary and Financial Economics',
    groups: [
      {id:'money',label:'Money and Banking I',choose:1,codes:['EC3332']},
      {id:'finance',label:'Financial Economics I',choose:1,codes:['EC3333']},
      {id:'international',label:'International Finance I',choose:1,codes:['EC3343']},
      {id:'advanced',label:'Two advanced monetary/financial courses',choose:2,codes:['EC4302','EC4307','EC4331','EC4332','EC4333','EC4334','EC4343','FE5213']}
    ]
  },
  applied: {
    name: 'Applied and Policy Economics',
    groups: [
      {id:'foundation',label:'One applied level-3000 course',choose:1,codes:['EC3322','EC3351','EC3342','EC3361','EC3381','EC3396']},
      {id:'methods',label:'Applied Econometrics or Policy Impact Evaluation',choose:1,codes:['EC4305','EC5326']},
      {id:'advanced',label:'Three advanced applied/policy courses',choose:3,codes:['EC4324','EC4325','EC4351','EC4352','EC4353','EC4354','EC4355','EC4342','EC4361','EC4362','EC4371','EC4372','EC4382','EC4383','EC4387','EC4391','EC4398','EC4399']}
    ]
  }
} as const
export type EconomicsSpecialisation = keyof typeof ECONOMICS_SPECIALISATIONS
export const ECONOMICS_SPECIALISATION_SOURCE = 'https://fass.nus.edu.sg/ecs/students-matriculated-in-academic-year-2021-22-and-onwards-specialisations/'
