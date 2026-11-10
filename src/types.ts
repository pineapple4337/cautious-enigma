import type { PrereqTree } from './prerequisites'
export type CourseStatus='completed'|'planned'
export type PlannedCourse={code:string;title:string;units:number;semester:string;status:CourseStatus;suExercised:boolean;prereqTree?:PrereqTree;prerequisite?:string}
export type AcademicProfile={matriculationYear:number;college:string;primaryMajor:string;secondMajor:string;minors:string[];economicsSpecialisations?:string[]}
export const DEFAULT_PROFILE:AcademicProfile={matriculationYear:2025,college:'CHS',primaryMajor:'Political Science',secondMajor:'',minors:[]}
