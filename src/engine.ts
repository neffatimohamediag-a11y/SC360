import * as XLSX from 'xlsx'
import type { Analysis, CellRisk, ChangeSummary, Constraint, ExpediteRow, PlannerSummary, RiskLevel, SupplierRisk } from './types'
const n=(v:unknown)=>{const x=Number(String(v??'').replace(/,/g,''));return Number.isFinite(x)?x:0}
const s=(v:unknown)=>String(v??'').trim()
const date=(v:unknown)=>{if(typeof v==='number'){const d=XLSX.SSF.parse_date_code(v);return d?`${String(d.d).padStart(2,'0')}/${String(d.m).padStart(2,'0')}/${d.y}`:''}return s(v)}
const level=(score:number):RiskLevel=>score>=85?'critical':score>=68?'high':score>=45?'medium':'monitor'
const riskWords=/(delay|late|capacity|missing|short|shortage|cannot|unable|issue|risk|push|slip|await|waiting|material|quality|hold|customs|transport|allocation)/i
const aliases:Record<string,string[]>= {
 buyer:['Buyer Code','Buyer'], supplier:['Supplier'], partNo:['Part No','Part Number'], description:['Part Description'], cell:['Res.','Production Cell (Res.)'], pastDue:['Past Due'], openPO:['Open PO','Open Purchase Orders'], qtyDue:['Qty Due'], dueDate:['Due Date'], promisedQty:['Promised Qty','Promised Quantity'], promisedDate:['Promised Date'], asns:['ASNs'], asnQty:['ASN Quantity'], asnDate:['ASN Date'], supplierMessage:['Supplier Message'], lastUpdated:['Last Updated Date','Last Updated'], userName:['User Name','User']
}
function parseRows(grid:unknown[][]){
 const headerIndex=grid.findIndex(r=>r.some(c=>['Buyer Code','Buyer'].includes(s(c)))&&r.some(c=>s(c)==='Supplier'))
 if(headerIndex<0) throw new Error('SC360 could not find the Expedite header row. Expected Buyer and Supplier columns.')
 const headers=grid[headerIndex].map(s); const weekIndexes=headers.map((h,i)=>({h,i})).filter(x=>/^(Wk|Week)\s+\d+/i.test(x.h))
 const index=(key:string)=>{for(const name of aliases[key]??[key]){const i=headers.indexOf(name);if(i>=0)return i}return -1}
 const required=['buyer','supplier','partNo','description','cell']; const missing=required.filter(x=>index(x)<0); if(missing.length) throw new Error(`Missing required Expedite columns: ${missing.join(', ')}`)
 const rows:ExpediteRow[]=[]
 for(let r=headerIndex+1;r<grid.length;r++){
  const raw=grid[r]??[]; if(!s(raw[index('supplier')])&&!s(raw[index('partNo')])) continue
  const get=(key:string)=>index(key)>=0?raw[index(key)]:''
  const asnQty=n(get('asnQty')); const asns=s(get('asns'))
  rows.push({id:`R-${r}`,buyer:s(get('buyer'))||'UNASSIGNED',supplier:s(get('supplier'))||'Unknown supplier',partNo:s(get('partNo'))||'Unknown part',description:s(get('description')),cell:s(get('cell'))||'Unassigned',pastDue:n(get('pastDue')),weeks:weekIndexes.map(w=>({label:w.h.replace(/^Week/i,'Wk'),qty:n(raw[w.i])})),openPO:s(get('openPO')),qtyDue:n(get('qtyDue')),dueDate:date(get('dueDate')),promisedQty:n(get('promisedQty')),promisedDate:date(get('promisedDate')),asnQty,asnDate:date(get('asnDate')),asns:asns||String(asnQty||''),supplierMessage:s(get('supplierMessage')),lastUpdated:date(get('lastUpdated')),userName:s(get('userName'))})
 }
 return {rows,weekLabels:weekIndexes.map(w=>w.h.replace(/^Week/i,'Wk'))}
}
export function buildConstraints(rows:ExpediteRow[]):Constraint[]{
 const out:Constraint[]=[]
 rows.forEach((row,i)=>{
  const current=row.weeks[0]?.qty??0; const available=Math.max(row.promisedQty,row.qtyDue,row.asnQty); const gap=Math.max(0,row.pastDue+current-available)
  const add=(type:string,base:number,reason:string,action:string,week=row.weeks[0]?.label??'Current')=>{const score=Math.min(99,base+Math.min(24,Math.round(gap/500)));out.push({id:`C-${i}-${out.length}`,key:`${row.buyer}|${row.supplier}|${row.partNo}|${type}`,type,score,level:level(score),supplier:row.supplier,partNo:row.partNo,description:row.description,cell:row.cell,week,gap,reason,recommendedAction:action,row})}
  if(row.pastDue>0)add('Past due',90,`${row.pastDue.toLocaleString()} units are already past due.`,'Confirm immediate recovery quantity, dispatch status, and transport plan.')
  if(current>0&&gap>0)add('Current-week shortage',82,`${current.toLocaleString()} required this week versus ${available.toLocaleString()} visible commitment or ASN.`,'Request a dated recovery plan and protect the affected production cell.')
  if(current>0&&row.promisedQty<=0&&row.asnQty<=0&&!row.asns)add('Missing commitment',74,'No promised quantity or ASN is visible for current demand.','Obtain supplier commitment quantity and date before the morning escalation cut-off.')
  if(current>0&&row.promisedQty>0&&row.promisedQty<current)add('Insufficient promise',70,`Promised quantity is ${row.promisedQty.toLocaleString()} against ${current.toLocaleString()} current-week demand.`,'Negotiate split delivery, premium freight, or additional capacity.')
  if(riskWords.test(row.supplierMessage))add('Supplier risk signal',68,`Supplier message: ${row.supplierMessage.slice(0,150)}`,'Clarify the blocker, owner, recovery milestone, and next update time.')
 })
 return out.sort((a,b)=>b.score-a.score||b.gap-a.gap)
}
function group<T extends {supplier:string;cell:string;partNo:string;gap:number;score:number;level:RiskLevel}>(items:T[],key:'supplier'|'cell'){const map=new Map<string,T[]>();items.forEach(x=>map.set(x[key],[...(map.get(x[key])??[]),x]));return [...map.entries()].map(([name,x])=>({name,x}))}
export function analyseRows(rows:ExpediteRow[],meta:{fileName:string;compiledOn:string;weekLabels:string[]}):Analysis{
 const cs=buildConstraints(rows)
 const supplierRisks:SupplierRisk[]=group(cs,'supplier').map(({name,x})=>({supplier:name,score:Math.max(...x.map(i=>i.score)),level:level(Math.max(...x.map(i=>i.score))),parts:new Set(x.map(i=>i.partNo)).size,cells:new Set(x.map(i=>i.cell)).size,gap:x.reduce((a,b)=>a+b.gap,0),constraints:x.length})).sort((a,b)=>b.score-a.score||b.gap-a.gap)
 const cellRisks:CellRisk[]=group(cs,'cell').map(({name,x})=>({cell:name,score:Math.max(...x.map(i=>i.score)),level:level(Math.max(...x.map(i=>i.score))),parts:new Set(x.map(i=>i.partNo)).size,suppliers:new Set(x.map(i=>i.supplier)).size,gap:x.reduce((a,b)=>a+b.gap,0),constraints:x.length})).sort((a,b)=>b.score-a.score||b.gap-a.gap)
 const warnings:string[]=[];if(!rows.some(r=>r.pastDue>0))warnings.push('The Past Due column is empty in this report.');if(!rows.some(r=>r.promisedQty>0))warnings.push('Few or no numeric promised quantities were detected.')
 return {fileName:meta.fileName,compiledOn:meta.compiledOn,importedAt:new Date().toISOString(),rowCount:rows.length,rows,constraints:cs,supplierRisks,cellRisks,weekLabels:meta.weekLabels,warnings}
}
export async function analyseBuffer(data:ArrayBuffer,fileName:string):Promise<Analysis>{const wb=XLSX.read(data,{type:'array',cellDates:false});const ws=wb.Sheets[wb.SheetNames[0]];const grid=XLSX.utils.sheet_to_json<unknown[]>(ws,{header:1,raw:true,defval:''});const parsed=parseRows(grid);const title=s(grid[0]?.[0]);const compiled=title.match(/\d{4}-\d{2}-\d{2}/)?.[0]||s(grid[0]?.[7])||fileName.match(/\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4}/)?.[0]||'Not detected';return analyseRows(parsed.rows,{fileName,compiledOn:compiled,weekLabels:parsed.weekLabels})}
export async function analyseFile(file:File):Promise<Analysis>{return analyseBuffer(await file.arrayBuffer(),file.name)}
export function filterAnalysis(a:Analysis,buyer:string):Analysis{if(buyer==='ALL')return a;return analyseRows(a.rows.filter(r=>r.buyer===buyer),{fileName:a.fileName,compiledOn:a.compiledOn,weekLabels:a.weekLabels})}
export function compareAnalyses(current:Analysis,previous?:Analysis):ChangeSummary{if(!previous){current.constraints.forEach(c=>c.changeStatus='new');return {newCount:current.constraints.length,worseningCount:0,improvingCount:0,resolvedCount:0,stableCount:0,resolved:[]}}
 const prev=new Map(previous.constraints.map(c=>[c.key,c])); const cur=new Map(current.constraints.map(c=>[c.key,c]));let newCount=0,worseningCount=0,improvingCount=0,stableCount=0
 current.constraints.forEach(c=>{const p=prev.get(c.key);c.previousGap=p?.gap;if(!p){c.changeStatus='new';newCount++}else if(c.gap>p.gap*1.05||c.score>p.score+5){c.changeStatus='worsening';worseningCount++}else if(c.gap<p.gap*.95||c.score<p.score-5){c.changeStatus='improving';improvingCount++}else{c.changeStatus='stable';stableCount++}})
 const resolved=[...prev.values()].filter(c=>!cur.has(c.key)).map(c=>({...c,changeStatus:'resolved' as const}));return {newCount,worseningCount,improvingCount,resolvedCount:resolved.length,stableCount,resolved}
}
export function plannerSummaries(a:Analysis):PlannerSummary[]{const buyers=[...new Set(a.rows.map(r=>r.buyer))];return buyers.map(buyer=>{const x=filterAnalysis(a,buyer);const critical=x.constraints.filter(c=>c.level==='critical').length;return {buyer,name:x.rows.find(r=>r.userName)?.userName||buyer,suppliers:new Set(x.rows.map(r=>r.supplier)).size,parts:new Set(x.rows.map(r=>r.partNo)).size,constraints:x.constraints.length,critical,gap:x.constraints.reduce((s,c)=>s+c.gap,0),health:Math.max(15,100-Math.round(critical*2.5+x.constraints.length*.18))}}).sort((a,b)=>b.critical-a.critical||b.gap-a.gap)}
