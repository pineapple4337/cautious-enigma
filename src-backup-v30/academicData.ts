import { ECONOMICS } from './economicsData'
/** Cohort-sensitive academic reference data. These lists are candidates, not registration approval.
 * Review programme-specific exceptions against the department's published rules.
 */
export const PS_SINGAPORE = ['PS2249', 'PS2244', 'PS3249', 'PS3273']
// Verify the departmental list before treating this as exhaustive.
export const EC_MINOR_RECOGNISED: readonly string[] = ECONOMICS.minorRecognised

// Urban Studies minor, cohort AY2024 onwards, supplied by user.
export const URBAN_CORE = [
  'RE1901', 'RE2702', 'RE3705', 'GE3204', 'GE2207'
] as const
export const URBAN_ELECTIVES = [
  'CDE2501', 'CDE2502', 'ENV3104', 'GE2102', 'GE3219',
  'GE3236', 'GE3241', 'RE2705', 'RE3701',
  'RE3810', 'RE3808', 'SC3206', 'SE2212'
] as const


export const CHS_PILLARS: { label: string; codes: string[]; manual?: boolean }[] = [
  { label: 'Writing', codes: ['FAS1101'] },
  { label: 'Data Literacy', codes: ['GEA1000'] },
  { label: 'Digital Literacy', codes: [
    'GEI1001', 'GEI1002', 'NM2207',
    'CS1010', 'CS1010E', 'CS1010S', 'CS1010X', 'CS1010J',
    'COS1000', 'COS2000', 'CM3267', 'ZB2201', 'LSM2302', 'SP2273'
  ] },
  { label: 'Design Thinking', codes: ['DTK1234'] },
  { label: 'Artificial Intelligence', codes: [
    'HS1501', 'HS1502', 'CS2109HS', 'HS1503', 'HS1504'
  ] },
  { label: 'Communities and Engagement', codes: [], manual: true },
  { label: 'Integrated Asian Studies', codes: ['HSA1000'] },
  { label: 'Integrated Social Sciences', codes: ['HSS1000'] },
  { label: 'Integrated Humanities', codes: ['HSH1000'] },
  { label: 'Scientific Inquiry I', codes: ['HSI1000'] },
  { label: 'Scientific Inquiry II', codes: [
    'HSI2001', 'HSI2002', 'HSI2003', 'HSI2004', 'HSI2005', 'HSI2006',
    'HSI2007', 'HSI2008', 'HSI2009', 'HSI2010', 'HSI2011', 'HSI2012',
    'HSI2013', 'HSI2014', 'HSI2015', 'HSI2016', 'HSI2017', 'HSI2018'
  ] },
  { label: 'Interdisciplinary Course Choice I', codes: [], manual: true },
  { label: 'Interdisciplinary Course Choice II', codes: [], manual: true }
]
