/** Persistent, first-seen subject colour assignment. */
import type { CSSProperties } from 'react'
export type SubjectColorMap = Record<string,number>
export const SUBJECT_COLORS = [
  ['#e6eeff','#9cb7ef','#264b88'], ['#e3f4e9','#9bcfae','#276548'],
  ['#fff0dc','#ebc48e','#875319'], ['#f0e7ff','#c6adea','#684391'],
  ['#ffe8ee','#e9a9bf','#8b3855'], ['#dff4f4','#8acccc','#24666a'],
  ['#f9efd9','#d7bd79','#755b1e'], ['#e7eaf0','#b2bdce','#43516a'],
  ['#e6f4dc','#a7d087','#456f29'], ['#fce8df','#e9ad94','#8e4b2c'],
  ['#e7e8ff','#a6a9e5','#464c94'], ['#f6e7f3','#d9a6cf','#7e3e74']
] as const
export function getSubject(code:string):string {return code.toUpperCase().match(/^[A-Z]+/)?.[0]??'OTHER'}
export function getSubjectStyle(code:string,map:SubjectColorMap):CSSProperties {
  const index=map[getSubject(code)]??0
  const [background,border,foreground]=SUBJECT_COLORS[index%SUBJECT_COLORS.length]
  return {'--subject-bg':background,'--subject-border':border,'--subject-fg':foreground} as CSSProperties
}
