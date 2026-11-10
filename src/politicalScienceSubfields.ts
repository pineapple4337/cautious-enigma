/** Curated undergraduate course codes from NUS Political Science's official
 * Course Listing by Subfields. Not exhaustive; topic codes may change.
 * https://fass.nus.edu.sg/pol/listing-by-subfields/
 */
export const PS_SUBFIELDS = {
  'Comparative Politics': [
    'PS2234', 'PS2236', 'PS2245', 'PS2247', 'PS2248', 'PS2249', 'PS2254', 'PS2255', 'PS2257', 'PS3225', 'PS3236', 'PS3237', 'PS3263', 'PS3265', 'PS3273', 'PS3274', 'PS3275', 'PS3276', 'PS4202', 'PS4205', 'PS4221', 'PS4224', 'PS4228', 'PS4234', 'PS4312', 'PS4313', 'PS4332', 'PS4881', 'PS4881B', 'PS4881C', 'PS4881D', 'PS4881G', 'PS4881H', 'PS5312R', 'PS5313R', 'PS5319R', 'PS5321R', 'PS6314', 'GE2222', 'GL4886A','GL4887A', 'GL4888A', 'JS2223', 'JS4227', 'JS4233', 'JS4233HM', 'NM5201R', 'SE4227', 'SE5294R', 'SC3205', 'SC4201', 'SC4217', 'SC4218', 'SC4882A', 'SN2213'
  ],
  'International Relations': [
    'PS2237', 'PS2238', 'PS2239', 'PS2250', 'PS2251', 'PS3216', 'PS3238', 'PS3239', 'PS3240', 'PS3242', 'PS3247', 'PS3249', 'PS3251', 'PS3252', 'PS3272', 'PS3311', 'PS3312', 'PS3880D', 'PS3880E', 'PS3880F', 'PS3880H', 'PS4203', 'PS4206', 'PS4208', 'PS4216', 'PS4218', 'PS4226', 'PS4231', 'PS4234', 'PS4235', 'PS4239', 'PS4311', 'PS4882', 'PS4882A', 'PS4882D', 'PS4882E', 'PS4882F', 'PS4882G','PS4882H', 'PS4882I', 'PS5314R', 'PS5408R', 'PS6402', 'EU3228', 'GE2222', 'HY4209', 'HY4225', 'JS3223', 'JS4224', 'PP5181', 'SC4882B', 'SC4883', 'SE5294R', 'SN3223', 'GL4882A', 'GL4882B', 'GL4882C', 'GL4882D', 'GL4883A', 'GL4883B', 'GL4883C', 'GL4884A', 'GL4884B', 'GL4885A', 'GL4888A', 'GL4889A', 'GL4889B'
  ],
  'Governance and Public Policy': [
    'PS2240', 'PS2241', 'PS2244', 'PS3243', 'PS3246', 'PS3262', 'PS3271', 'PS4209', 'PS4230', 'PS4344', 'PS4884', 'PS5316R', 'PS5503R', 'PS5504R', 'PS5506R', 'PS6505', 'CDE2502', 'CDE3505', 'GL4883B', 'GL4883C', 'GL4884B', 'GL4888A', 'SC4203'
  ],
  'Political Theory': [
    'PS2203', 'PS2204', 'PS2231', 'PS2232', 'PS2233', 'PS2256', 'PS2258', 'PS2266', 'PS2300', 'PS3215', 'PS3232', 'PS3256', 'PS3259', 'PS3260', 'PS3267', 'PS3269', 'PS3310', 'PS3880A', 'PS4201', 'PS4211', 'PS4213', 'PS4215', 'PS4217', 'PS4219', 'PS4220', 'PS4229', 'PS4233', 'PS4236', 'PS4237', 'PS4238', 'PS4298', 'PS4299', 'PS4303', 'PS4322', 'PS4883', 'PS4883A', 'PS5201R', 'GL4881A', 'PH2202','PH4202', 'PH4203', 'PH4205', 'PH4210', 'PH4262'
  ]
} as const
export type PSSubfield = keyof typeof PS_SUBFIELDS
export const PS_SUBFIELD_NAMES = Object.keys(PS_SUBFIELDS) as PSSubfield[]
export function psSubfieldsFor(code: string): PSSubfield[] {
  return PS_SUBFIELD_NAMES.filter(field =>
    (PS_SUBFIELDS[field] as readonly string[]).includes(code)
  )
}
