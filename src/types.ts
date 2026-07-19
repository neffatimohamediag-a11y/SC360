export type RiskLevel = 'critical'|'high'|'medium'|'monitor'
export type ChangeStatus = 'new'|'worsening'|'stable'|'improving'|'resolved'
export interface ExpediteRow {id:string;buyer:string;supplier:string;partNo:string;description:string;cell:string;pastDue:number;weeks:{label:string;qty:number}[];openPO:string;qtyDue:number;dueDate:string;promisedQty:number;promisedDate:string;asnQty:number;asnDate:string;asns:string;supplierMessage:string;lastUpdated:string;userName:string}
export interface Constraint {id:string;key:string;type:string;level:RiskLevel;score:number;supplier:string;partNo:string;description:string;cell:string;week:string;gap:number;reason:string;recommendedAction:string;row:ExpediteRow;changeStatus?:ChangeStatus;previousGap?:number}
export interface SupplierRisk {supplier:string;score:number;level:RiskLevel;parts:number;cells:number;gap:number;constraints:number}
export interface CellRisk {cell:string;score:number;level:RiskLevel;parts:number;suppliers:number;gap:number;constraints:number}
export interface Analysis {fileName:string;compiledOn:string;importedAt:string;rowCount:number;rows:ExpediteRow[];constraints:Constraint[];supplierRisks:SupplierRisk[];cellRisks:CellRisk[];weekLabels:string[];warnings:string[]}
export interface PlannerSummary {buyer:string;name:string;suppliers:number;parts:number;constraints:number;critical:number;gap:number;health:number}
export interface ChangeSummary {newCount:number;worseningCount:number;improvingCount:number;resolvedCount:number;stableCount:number;resolved:Constraint[]}
