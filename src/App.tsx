import { ResinIntelligence } from './ResinIntelligence'
import { useEffect, useMemo, useRef, useState } from 'react'
import { analyseBuffer, analyseFile, compareAnalyses, filterAnalysis, plannerSummaries } from './engine'
import type { Analysis, Constraint, RiskLevel } from './types'

type IconProps={size?:number;className?:string}
const makeIcon=(g:string)=>({size=18,className=''}:IconProps)=><span className={`ui-icon ${className}`} style={{fontSize:Math.max(14,size*.9)}}>{g}</span>
const AlertTriangle=makeIcon('⚠'),ArrowRight=makeIcon('→'),Building2=makeIcon('▦'),CalendarDays=makeIcon('◫'),CheckCircle2=makeIcon('✓'),ChevronRight=makeIcon('›'),CircleGauge=makeIcon('◉'),Factory=makeIcon('⌂'),FileSpreadsheet=makeIcon('▤'),Filter=makeIcon('≡'),PackageSearch=makeIcon('◇'),RefreshCw=makeIcon('↻'),Search=makeIcon('⌕'),ShieldAlert=makeIcon('!'),Sparkles=makeIcon('✦'),UploadCloud=makeIcon('⇧'),UsersRound=makeIcon('◎'),X=makeIcon('×'),Play=makeIcon('▶'),Plus=makeIcon('+'),Save=makeIcon('✓'),Trash=makeIcon('×'),Download=makeIcon('⇩'),DecisionIcon=makeIcon('◆'),Plane=makeIcon('✈'),Clock=makeIcon('◷'),Euro=makeIcon('€')
const fmt=(n:number)=>n.toLocaleString(undefined,{maximumFractionDigits:0})
const tone=(l:RiskLevel)=>`tone ${l}`
const demoDays=[['Monday','2026-07-20'],['Tuesday','2026-07-21'],['Wednesday','2026-07-22'],['Thursday','2026-07-23'],['Friday','2026-07-24']] as const

type MissionStatus='Open'|'In Progress'|'Waiting Supplier'|'Recovered'|'Closed'
type Mission={id:string;constraintKey:string;title:string;objective:string;owner:string;supplier:string;partNo:string;cell:string;priority:RiskLevel;gap:number;dueDate:string;status:MissionStatus;nextAction:string;notes:string;createdAt:string;updatedAt:string}
type View='control'|'decisions'|'planners'|'missions'|'suppliers'|'cells'|'snapshots'|'resin'

function Upload({onLoad,onDemo,loading,error}:{onLoad:(f:File)=>void;onDemo:()=>void;loading:boolean;error:string}){
 const ref=useRef<HTMLInputElement>(null)
 return <main className="welcome"><div className="brand"><div className="logo">SC</div><div><strong>SC360</strong><span>Requirement Intelligence v0.8.0</span></div></div><section className="hero"><div className="hero-copy"><span className="kicker"><Sparkles size={15}/> Planner operating system</span><h1>Run a real report or enter the <em>Demo Factory.</em></h1><p>SC360 supports five planner portfolios, daily snapshots, change intelligence and actionable recovery missions.</p><div className="proof"><span><CheckCircle2/> 5 planner workspaces</span><span><CheckCircle2/> 5-day timeline</span><span><CheckCircle2/> Mission workflow</span></div><button className="demo-launch" onClick={onDemo} disabled={loading}><Play/> {loading?'Loading Demo Factory…':'Launch 5-Planner Demo Factory'}</button></div><button className="drop" onClick={()=>ref.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)onLoad(f)}}><UploadCloud/><strong>{loading?'Analysing…':'Upload live requirement report'}</strong><span>Drop .xls or .xlsx here</span><small>or click to select</small><input ref={ref} type="file" accept=".xls,.xlsx" onChange={e=>e.target.files?.[0]&&onLoad(e.target.files[0])}/></button>{error&&<div className="error"><AlertTriangle/>{error}</div>}</section><footer>Demo and live data use one intelligence engine.</footer></main>
}
function Pill({level}:{level:RiskLevel}){return <span className={tone(level)}>{level}</span>}
function todayPlus(days:number){const d=new Date();d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)}

function MissionModal({constraint,onClose,onSave}:{constraint:Constraint;onClose:()=>void;onSave:(m:Mission)=>void}){
 const [title,setTitle]=useState(`Recover ${constraint.supplier} – ${constraint.partNo}`)
 const [objective,setObjective]=useState(`Protect Cell ${constraint.cell} and recover ${fmt(constraint.gap)} units.`)
 const [owner,setOwner]=useState(constraint.row.userName||constraint.row.buyer)
 const [dueDate,setDueDate]=useState(todayPlus(constraint.level==='critical'?0:1))
 const [status,setStatus]=useState<MissionStatus>('Open')
 const [nextAction,setNextAction]=useState(constraint.recommendedAction)
 const [notes,setNotes]=useState(constraint.row.supplierMessage||'')
 function save(){const now=new Date().toISOString();onSave({id:`M-${Date.now()}`,constraintKey:constraint.key,title:title.trim()||`Recovery mission ${constraint.partNo}`,objective:objective.trim(),owner:owner.trim()||constraint.row.buyer,supplier:constraint.supplier,partNo:constraint.partNo,cell:constraint.cell,priority:constraint.level,gap:constraint.gap,dueDate,status,nextAction:nextAction.trim(),notes:notes.trim(),createdAt:now,updatedAt:now})}
 return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">Create recovery mission</span><h2>{constraint.partNo} · {constraint.supplier}</h2></div><button onClick={onClose}><X/></button></div><div className="form-grid"><label className="wide">Mission title<input value={title} onChange={e=>setTitle(e.target.value)}/></label><label className="wide">Objective<textarea value={objective} onChange={e=>setObjective(e.target.value)} rows={2}/></label><label>Owner<input value={owner} onChange={e=>setOwner(e.target.value)}/></label><label>Due date<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label><label>Status<select value={status} onChange={e=>setStatus(e.target.value as MissionStatus)}>{['Open','In Progress','Waiting Supplier','Recovered','Closed'].map(x=><option key={x}>{x}</option>)}</select></label><label>Priority<div className="field-pill"><Pill level={constraint.level}/></div></label><label className="wide">Next action<textarea value={nextAction} onChange={e=>setNextAction(e.target.value)} rows={3}/></label><label className="wide">Notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}/></label></div><div className="modal-actions"><button onClick={onClose}>Cancel</button><button className="primary compact" onClick={save}><Save/>Create mission</button></div></section></div>
}

function MissionCenter({missions,onUpdate,onDelete,onSelectConstraint}:{missions:Mission[];onUpdate:(id:string,patch:Partial<Mission>)=>void;onDelete:(id:string)=>void;onSelectConstraint:(key:string)=>void}){
 const [filter,setFilter]=useState<'All'|MissionStatus>('All')
 const visible=missions.filter(m=>filter==='All'||m.status===filter)
 const open=missions.filter(m=>!['Recovered','Closed'].includes(m.status)).length
 const overdue=missions.filter(m=>!['Recovered','Closed'].includes(m.status)&&m.dueDate<new Date().toISOString().slice(0,10)).length
 function exportCsv(){const rows=[['Mission ID','Title','Owner','Supplier','Part','Cell','Priority','Gap','Due Date','Status','Next Action','Notes'],...missions.map(m=>[m.id,m.title,m.owner,m.supplier,m.partNo,m.cell,m.priority,String(m.gap),m.dueDate,m.status,m.nextAction,m.notes])];const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='SC360_Recovery_Missions.csv';a.click();URL.revokeObjectURL(a.href)}
 return <section className="mission-center"><div className="section-title"><div><span className="eyebrow">Mission Center</span><h2>Recovery execution workspace</h2><p>Create, assign, progress and close recovery missions.</p></div><button className="secondary" onClick={exportCsv} disabled={!missions.length}><Download/>Export missions</button></div><div className="mission-kpis"><article><span>Total missions</span><strong>{missions.length}</strong></article><article><span>Open workload</span><strong>{open}</strong></article><article><span>Overdue</span><strong>{overdue}</strong></article><article><span>Recovered / closed</span><strong>{missions.length-open}</strong></article></div><div className="mission-toolbar"><div>{(['All','Open','In Progress','Waiting Supplier','Recovered','Closed'] as const).map(x=><button key={x} className={filter===x?'active':''} onClick={()=>setFilter(x)}>{x}</button>)}</div></div>{visible.length?<div className="mission-list">{visible.map(m=><article key={m.id}><div className="mission-card-top"><div><Pill level={m.priority}/><span className={`mission-status status-${m.status.toLowerCase().replace(/ /g,'-')}`}>{m.status}</span></div><button className="icon-button danger" title="Delete mission" onClick={()=>onDelete(m.id)}><Trash/></button></div><button className="mission-title" onClick={()=>onSelectConstraint(m.constraintKey)}>{m.title}</button><p>{m.objective}</p><dl><div><dt>Owner</dt><dd>{m.owner}</dd></div><div><dt>Due</dt><dd>{m.dueDate}</dd></div><div><dt>Supplier</dt><dd>{m.supplier}</dd></div><div><dt>Cell</dt><dd>{m.cell}</dd></div></dl><div className="mission-action"><span>Next action</span><strong>{m.nextAction}</strong></div><div className="mission-progress"><select value={m.status} onChange={e=>onUpdate(m.id,{status:e.target.value as MissionStatus})}>{['Open','In Progress','Waiting Supplier','Recovered','Closed'].map(x=><option key={x}>{x}</option>)}</select><input value={m.notes} placeholder="Add update or supplier response" onChange={e=>onUpdate(m.id,{notes:e.target.value})}/></div></article>)}</div>:<div className="panel empty-state"><ShieldAlert size={34}/><h3>No missions in this view</h3><p>Select a constraint in Control Room and choose “Create recovery mission”.</p></div>}</section>
}



type DecisionStatus='Draft'|'Pending Approval'|'Approved'|'Rejected'|'Executing'|'Completed'
type RecoveryOption={id:string;name:string;category:string;description:string;cost:number;leadHours:number;coverage:number;success:number;approval:string;customerImpact:string;score:number;recommended?:boolean}
type Decision={id:string;constraintKey:string;constraintTitle:string;supplier:string;partNo:string;cell:string;gap:number;productionValue:number;deadline:string;owner:string;status:DecisionStatus;selectedOption:RecoveryOption;alternatives:RecoveryOption[];rationale:string;createdAt:string;updatedAt:string}

function recoveryOptions(c:Constraint):RecoveryOption[]{
 const gap=Math.max(c.gap,1), urgent=c.level==='critical', base=Math.max(250,Math.round(gap*1.7))
 const raw:Omit<RecoveryOption,'score'|'recommended'>[]=[
  {id:'borrow',name:'Borrow inventory from another plant',category:'Inventory',description:'Transfer available stock from a sister plant or warehouse to protect the production cell.',cost:Math.max(150,Math.round(gap*.35)),leadHours:12,coverage:Math.min(100,urgent?75:90),success:92,approval:'Plant / inventory owner',customerImpact:'None'},
  {id:'partial',name:'Supplier partial shipment',category:'Supplier',description:'Ask the supplier to release available quantity immediately and split the remaining balance.',cost:Math.max(300,Math.round(gap*.55)),leadHours:30,coverage:70,success:86,approval:'Planner',customerImpact:'Low'},
  {id:'air-in',name:'Inbound air freight',category:'Logistics',description:'Move recovered supplier quantity by air to reduce inbound transit time.',cost:Math.max(1800,Math.round(base*1.8)),leadHours:36,coverage:100,success:95,approval:'Supply Chain Director',customerImpact:'None'},
  {id:'weekend',name:'Premium supplier weekend production',category:'Supplier Capacity',description:'Fund an additional supplier weekend shift to create missing quantity.',cost:Math.max(1200,Math.round(base*.9)),leadHours:72,coverage:90,success:88,approval:'Purchasing Manager',customerImpact:'Low'},
  {id:'alternative',name:'Alternative material / component',category:'Engineering',description:'Use a qualified substitute or raise a temporary engineering deviation.',cost:Math.max(600,Math.round(base*.55)),leadHours:24,coverage:85,success:76,approval:'Engineering + Quality',customerImpact:'None after approval'},
  {id:'overtime',name:'Internal production overtime',category:'Production',description:'Add overtime or an extra shift to recover output after material arrives.',cost:Math.max(700,Math.round(base*.45)),leadHours:48,coverage:60,success:82,approval:'Operations Manager',customerImpact:'Partial protection'},
  {id:'air-out',name:'Outbound air freight to customer',category:'Customer Recovery',description:'Protect the customer delivery date by expediting finished goods outbound.',cost:Math.max(2400,Math.round(base*2.2)),leadHours:60,coverage:100,success:91,approval:'Commercial Director',customerImpact:'Customer protected'}]
 const scored=raw.map(o=>({...o,score:Math.max(1,Math.min(99,Math.round(o.coverage*.34+o.success*.25+(100-Math.min(100,o.cost/55))*.18+(100-Math.min(100,o.leadHours))*.23)))})).sort((a,b)=>b.score-a.score)
 return scored.map((o,i)=>({...o,recommended:i===0}))
}

function RecoveryModal({constraint,onClose,onEscalate}:{constraint:Constraint;onClose:()=>void;onEscalate:(d:Decision)=>void}){
 const options=useMemo(()=>recoveryOptions(constraint),[constraint])
 const [selectedId,setSelectedId]=useState(options[0]?.id||'')
 const selected=options.find(o=>o.id===selectedId)||options[0]
 const productionValue=Math.max(25000,Math.round(constraint.gap*440))
 const roi=selected?productionValue/Math.max(1,selected.cost):0
 function escalate(){if(!selected)return;const now=new Date().toISOString();onEscalate({id:`D-${Date.now()}`,constraintKey:constraint.key,constraintTitle:`${constraint.type}: ${constraint.partNo}`,supplier:constraint.supplier,partNo:constraint.partNo,cell:constraint.cell,gap:constraint.gap,productionValue,deadline:constraint.level==='critical'?'Decision required today':'Decision required within 24 hours',owner:constraint.row.userName||constraint.row.buyer,status:'Pending Approval',selectedOption:selected,alternatives:options,rationale:`Option ranked highest because it protects ${selected.coverage}% of the requirement with ${selected.success}% estimated success. Recovery cost is ${roi.toFixed(1)}x lower than the production value protected.`,createdAt:now,updatedAt:now})}
 return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal recovery-modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">Recovery Intelligence</span><h2>{constraint.partNo} · Cell {constraint.cell}</h2><p>{constraint.supplier} · {fmt(constraint.gap)} unit gap</p></div><button onClick={onClose}><X/></button></div><div className="impact-banner"><div><span>Without action</span><strong>Production at risk</strong><small>{constraint.reason}</small></div><div><span>Value protected</span><strong>€{fmt(productionValue)}</strong><small>{constraint.level} priority</small></div><div><span>Decision deadline</span><strong>{constraint.level==='critical'?'Today':'24 hours'}</strong><small>Management-ready proposal</small></div></div><div className="recovery-content"><div className="option-list"><div className="option-list-head"><h3>Ranked recovery options</h3><span>Choose one to escalate</span></div>{options.map((o,i)=><button key={o.id} className={selectedId===o.id?'selected':''} onClick={()=>setSelectedId(o.id)}><div className="option-rank">{i+1}</div><div className="option-main"><strong>{o.name}{o.recommended&&<em>SCOUT choice</em>}</strong><small>{o.description}</small><div className="option-tags"><span>{o.category}</span><span>{o.coverage}% protected</span><span>{o.success}% success</span></div></div><div className="option-metrics"><b>{o.score}</b><span>€{fmt(o.cost)}</span><small>{o.leadHours}h</small></div></button>)}</div>{selected&&<aside className="decision-summary"><span className="eyebrow">Decision proposal</span><h3>{selected.name}</h3><p>{selected.description}</p><dl><div><dt>Recovery cost</dt><dd>€{fmt(selected.cost)}</dd></div><div><dt>Production protected</dt><dd>€{fmt(productionValue)}</dd></div><div><dt>Coverage</dt><dd>{selected.coverage}%</dd></div><div><dt>Success probability</dt><dd>{selected.success}%</dd></div><div><dt>Implementation</dt><dd>{selected.leadHours} hours</dd></div><div><dt>Approval owner</dt><dd>{selected.approval}</dd></div></dl><div className="scout-rationale"><Sparkles/><div><span>SCOUT recommendation</span><strong>Estimated value-to-cost ratio: {roi.toFixed(1)}×</strong><p>{selected.customerImpact}. Compare this proposal with the alternatives before approval.</p></div></div><button className="primary" onClick={escalate}><DecisionIcon/>Escalate decision to management</button></aside>}</div></section></div>
}

function DecisionCenter({decisions,onUpdate,onOpenConstraint}:{decisions:Decision[];onUpdate:(id:string,patch:Partial<Decision>)=>void;onOpenConstraint:(key:string)=>void}){
 const pending=decisions.filter(d=>d.status==='Pending Approval').length
 const value=decisions.filter(d=>!['Rejected','Completed'].includes(d.status)).reduce((s,d)=>s+d.productionValue,0)
 const cost=decisions.filter(d=>!['Rejected'].includes(d.status)).reduce((s,d)=>s+d.selectedOption.cost,0)
 return <section><div className="section-title"><div><span className="eyebrow">Decision Center</span><h2>Don't escalate problems. Escalate decisions.</h2><p>Management receives evaluated recovery proposals with cost, impact, alternatives and a clear recommendation.</p></div></div><div className="decision-kpis"><article><span>Pending approval</span><strong>{pending}</strong></article><article><span>Value protected</span><strong>€{fmt(value)}</strong></article><article><span>Recovery spend</span><strong>€{fmt(cost)}</strong></article><article><span>Portfolio ratio</span><strong>{cost?`${(value/cost).toFixed(1)}×`:'—'}</strong></article></div>{decisions.length?<div className="decision-list">{decisions.map(d=><article key={d.id}><div className="decision-card-head"><div><Pill level={d.selectedOption.score>85?'critical':'high'}/><span className={`decision-status ds-${d.status.toLowerCase().replace(/ /g,'-')}`}>{d.status}</span></div><small>{d.deadline}</small></div><button className="decision-title" onClick={()=>onOpenConstraint(d.constraintKey)}>{d.constraintTitle}</button><p>{d.supplier} · Cell {d.cell} · {fmt(d.gap)} unit gap</p><div className="approved-option"><span>Recommended decision</span><strong>{d.selectedOption.name}</strong><small>{d.rationale}</small></div><div className="decision-numbers"><div><span>Cost</span><strong>€{fmt(d.selectedOption.cost)}</strong></div><div><span>Value protected</span><strong>€{fmt(d.productionValue)}</strong></div><div><span>Coverage</span><strong>{d.selectedOption.coverage}%</strong></div><div><span>Success</span><strong>{d.selectedOption.success}%</strong></div></div><div className="alternatives"><span>Alternatives reviewed</span>{d.alternatives.slice(0,4).map(a=><small key={a.id}>{a.name}: €{fmt(a.cost)} · {a.leadHours}h</small>)}</div><div className="decision-actions"><button className="approve" onClick={()=>onUpdate(d.id,{status:'Approved'})}>Approve</button><button onClick={()=>onUpdate(d.id,{status:'Rejected'})}>Reject</button><button onClick={()=>onUpdate(d.id,{status:'Draft'})}>Request another option</button>{d.status==='Approved'&&<button className="execute" onClick={()=>onUpdate(d.id,{status:'Executing'})}>Start execution</button>}</div></article>)}</div>:<div className="panel empty-state"><DecisionIcon size={34}/><h3>No decisions have been escalated</h3><p>Open a constraint, review Recovery Options, and escalate a complete proposal to management.</p></div>}</section>
}

function Dashboard({snapshots,onReset}:{snapshots:Analysis[];onReset:()=>void}){
 const [day,setDay]=useState(snapshots.length-1),[buyer,setBuyer]=useState('ALL'),[query,setQuery]=useState(''),[level,setLevel]=useState<'all'|RiskLevel>('all'),[selected,setSelected]=useState<Constraint|null>(null),[scenario,setScenario]=useState(''),[view,setView]=useState<View>('control'),[missionTarget,setMissionTarget]=useState<Constraint|null>(null),[recoveryTarget,setRecoveryTarget]=useState<Constraint|null>(null)
 const [decisions,setDecisions]=useState<Decision[]>(()=>{try{return JSON.parse(localStorage.getItem('sc360-decisions-v080')||'[]')}catch{return []}})
 const [missions,setMissions]=useState<Mission[]>(()=>{try{return JSON.parse(localStorage.getItem('sc360-missions-v071')||'[]')}catch{return []}})
 useEffect(()=>localStorage.setItem('sc360-decisions-v080',JSON.stringify(decisions)),[decisions])
 useEffect(()=>localStorage.setItem('sc360-missions-v071',JSON.stringify(missions)),[missions])
 const full=snapshots[day],prevFull=day>0?snapshots[day-1]:undefined,a=useMemo(()=>filterAnalysis(full,buyer),[full,buyer]),prev=useMemo(()=>prevFull?filterAnalysis(prevFull,buyer):undefined,[prevFull,buyer]),changes=useMemo(()=>compareAnalyses(a,prev),[a,prev]),planners=useMemo(()=>plannerSummaries(full),[full])
 useEffect(()=>setSelected(a.constraints[0]??null),[a])
 const visible=useMemo(()=>a.constraints.filter(c=>(level==='all'||c.level===level)&&`${c.supplier} ${c.partNo} ${c.description} ${c.cell} ${c.type}`.toLowerCase().includes(query.toLowerCase())),[a,level,query])
 const critical=a.constraints.filter(c=>c.level==='critical').length,currentGap=a.constraints.filter(c=>c.type==='Current-week shortage').reduce((s,c)=>s+c.gap,0),health=Math.max(15,100-Math.round(critical*2.5+a.constraints.length*.18)),topSupplier=a.supplierRisks[0],topCell=a.cellRisks[0],plannerName=buyer==='ALL'?'Factory':(a.rows.find(r=>r.userName)?.userName||buyer)
 function inject(kind:string){setScenario(kind);const c=a.constraints[0];if(c)setSelected({...c,reason:`Scenario Studio preview: ${kind} has been injected for decision testing. ${c.reason}`,recommendedAction:`Validate the ${kind.toLowerCase()} response, contact ${c.supplier}, and update the recovery mission.`})}
 function nav(next:View){setView(next);window.scrollTo({top:0,behavior:'smooth'})}
 function escalateDecision(d:Decision){setDecisions(x=>[d,...x]);setRecoveryTarget(null);setView('decisions')}
 function createMission(m:Mission){setMissions(x=>[m,...x]);setMissionTarget(null);setView('missions')}
 function selectMissionConstraint(key:string){for(const snap of snapshots){const c=snap.constraints.find(x=>x.key===key);if(c){setDay(snapshots.indexOf(snap));setBuyer(c.row.buyer);setSelected(c);setView('control');setTimeout(()=>document.getElementById('queue')?.scrollIntoView({behavior:'smooth'}),50);return}}}
 const navItems:[View,string,JSX.Element][]=[['control','Control Room',['resin', 'Resin Intelligence', <MarketIcon />],<CircleGauge/>],['decisions',`Decision Center${decisions.filter(d=>d.status==='Pending Approval').length?` (${decisions.filter(d=>d.status==='Pending Approval').length})`:''}`,<DecisionIcon/>],['planners','Planner Workspaces',<UsersRound/>],['missions',`Mission Center${missions.length?` (${missions.length})`:''}`,<ShieldAlert/>],['suppliers','Suppliers',<Building2/>],['cells','Production Cells',<Factory/>],['snapshots','Snapshots',<CalendarDays/>]]
 return <div className="app"><aside className="sidebar"><div className="brand light"><div className="logo">SC</div><div><strong>SC360</strong><span>Demo Factory v0.8.0</span></div></div><nav>{navItems.map(([id,label,icon])=><button key={id} className={view===id?'active':''} onClick={()=>nav(id)}>{icon}{label}</button>)}</nav><div className="side-foot"><span>Active source</span><strong><FileSpreadsheet/>{full.fileName}</strong><small>{full.compiledOn} · {full.rowCount} lines</small><button onClick={onReset}><RefreshCw/>Exit control room</button></div></aside><main className="content">
 <header><div><span className="eyebrow">{view==='control'?(buyer==='ALL'?'Factory control room':'Planner workspace'):navItems.find(x=>x[0]===view)?.[1]} · {demoDays[day]?.[0]??full.compiledOn}</span><h1>{view==='control'?`Good morning, ${plannerName}.`:view==='missions'?'Turn constraints into recovery.':'Operational intelligence workspace'}</h1><p>{fmt(a.rowCount)} lines · {new Set(a.rows.map(r=>r.supplier)).size} suppliers · {a.constraints.length} active signals.</p></div><div className="header-actions"><select value={buyer} onChange={e=>setBuyer(e.target.value)}><option value="ALL">All Planners</option>{planners.map(p=><option key={p.buyer} value={p.buyer}>{p.name}</option>)}</select><div className="search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search supplier, part or cell"/></div><button className="avatar">{buyer==='ALL'?'FM':buyer.slice(0,2)}</button></div></header>
 {view === 'resin' && <ResinIntelligence />}

{view === 'decisions' && (
  <DecisionCenter
    decisions={decisions}
    onUpdate={(id, patch) =>
      setDecisions(current =>
        current.map(decision =>
          decision.id === id
            ? {
                ...decision,
                ...patch,
                updatedAt: new Date().toISOString(),
              }
            : decision,
        ),
      )
    }
    onOpenConstraint={selectMissionConstraint}
  />
)}

{view === 'missions' && (
  <MissionCenter
    missions={missions}
    onUpdate={(id, patch) =>
      setMissions(current =>
        current.map(mission =>
          mission.id === id
            ? {
                ...mission,
                ...patch,
                updatedAt: new Date().toISOString(),
              }
            : mission,
        ),
      )
    }
    onDelete={id =>
      setMissions(current =>
        current.filter(mission => mission.id !== id),
      )
    }
    onSelectConstraint={selectMissionConstraint}
  />
)}

{view !== 'resin' &&
  view !== 'decisions' &&
  view !== 'missions' && (
    <>
      <section className="timeline">
        {snapshots.map((s, i) => (
          <button
            key={s.compiledOn}
            className={day === i ? 'active' : ''}
            onClick={() => setDay(i)}
          >
            <span>{demoDays[i]?.[0] ?? `Day ${i + 1}`}</span>
            <strong>{s.compiledOn}</strong>
            <small>{s.constraints.length} signals</small>
          </button>
        ))}
      </section>

      {view === 'planners' && (
        <section className="panel planner-board standalone">
          <div className="panel-head">
            <div>
              <span>Planner portfolio</span>
              <h3>Five workspaces, one factory view</h3>
            </div>
            <UsersRound />
          </div>

          <div className="planner-grid">
            {planners.map(p => (
              <button
                key={p.buyer}
                onClick={() => {
                  setBuyer(p.buyer)
                  setView('control')
                }}
              >
                <div>
                  <strong>{p.name}</strong>
                  <small>
                    {p.suppliers} suppliers · {p.parts} parts
                  </small>
                </div>

                <b>{p.health}%</b>
                <span>{p.critical} critical</span>
                <em>{fmt(p.gap)} gap</em>
              </button>
            ))}
          </div>
        </section>
      )}

      {view === 'suppliers' && (
        <section className="panel standalone">
          <div className="panel-head">
            <div>
              <span>Supplier intelligence</span>
              <h3>Supplier risk ranking</h3>
            </div>
            <Building2 />
          </div>

          <div className="rank-list large">
            {a.supplierRisks.map((x, i) => (
              <div key={x.supplier}>
                <b>{i + 1}</b>

                <div>
                  <strong>{x.supplier}</strong>
                  <small>
                    {x.parts} parts · {x.cells} cells · {x.constraints}{' '}
                    signals
                  </small>
                </div>

                <span>{fmt(x.gap)} gap</span>
                <Pill level={x.level} />
              </div>
            ))}
          </div>
        </section>
      )}

      {view === 'cells' && (
        <section className="panel standalone">
          <div className="panel-head">
            <div>
              <span>Production cell intelligence</span>
              <h3>Cell risk ranking</h3>
            </div>
            <Factory />
          </div>

          <div className="rank-list large">
            {a.cellRisks.map((x, i) => (
              <div key={x.cell}>
                <b>{i + 1}</b>

                <div>
                  <strong>Cell {x.cell}</strong>
                  <small>
                    {x.parts} parts · {x.suppliers} suppliers ·{' '}
                    {x.constraints} signals
                  </small>
                </div>

                <span>{fmt(x.gap)} gap</span>
                <Pill level={x.level} />
              </div>
            ))}
          </div>
        </section>
      )}

      {view === 'snapshots' && (
        <section className="snapshot-grid standalone">
          {snapshots.map((s, i) => (
            <article className="panel" key={s.compiledOn}>
              <span>{demoDays[i]?.[0] ?? `Snapshot ${i + 1}`}</span>
              <h3>{s.compiledOn}</h3>
              <strong>{s.constraints.length} signals</strong>

              <small>
                {s.rowCount} rows · {s.supplierRisks.length} suppliers at
                risk
              </small>

              <button
                onClick={() => {
                  setDay(i)
                  setView('control')
                }}
              >
                Open snapshot <ArrowRight />
              </button>
            </article>
          ))}
        </section>
      )}

      {view === 'control' && (
        <>
          <section className="brief">
            <div>
              <span className="eyebrow">SCOUT morning briefing</span>

              <h2>
                {changes.newCount} new · {changes.worseningCount}{' '}
                worsening · {changes.resolvedCount} resolved.
              </h2>

              <p>
                {topCell && topSupplier
                  ? `Start with Cell ${topCell.cell}. ${topSupplier.supplier} is the highest-risk supplier for this workspace. ${critical} critical signals remain open.`
                  : 'No operational constraint is visible for this workspace.'}
              </p>
            </div>

            <div className="objective">
              <span>First recommended mission</span>

              <strong>
                {selected?.recommendedAction ??
                  'Review the planner portfolio'}
              </strong>

              <button
                onClick={() =>
                  document
                    .getElementById('queue')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                Open mission queue <ArrowRight />
              </button>
            </div>
          </section>

          <section className="change-strip">
            <article>
              <b>+{changes.newCount}</b>
              <span>New</span>
            </article>

            <article>
              <b>{changes.worseningCount}</b>
              <span>Worsening</span>
            </article>

            <article>
              <b>{changes.improvingCount}</b>
              <span>Improving</span>
            </article>

            <article>
              <b>-{changes.resolvedCount}</b>
              <span>Resolved</span>
            </article>

            <article>
              <b>{changes.stableCount}</b>
              <span>Stable</span>
            </article>
          </section>

          <section className="kpis">
            <article>
              <span>Factory health</span>
              <strong>{health}%</strong>
              <small>
                <CircleGauge /> Snapshot-derived
              </small>
            </article>

            <article>
              <span>Critical constraints</span>
              <strong>{critical}</strong>
              <small>
                <AlertTriangle /> {a.constraints.length} total signals
              </small>
            </article>

            <article>
              <span>Current-week gap</span>
              <strong>{fmt(currentGap)}</strong>
              <small>
                <PackageSearch /> units requiring review
              </small>
            </article>

            <article>
              <span>Suppliers at risk</span>
              <strong>{a.supplierRisks.length}</strong>
              <small>
                <Building2 /> {topSupplier?.supplier ?? 'None'}
              </small>
            </article>

            <article>
              <span>Open missions</span>

              <strong>
                {
                  missions.filter(
                    m => !['Recovered', 'Closed'].includes(m.status),
                  ).length
                }
              </strong>

              <small>
                <ShieldAlert /> persisted locally
              </small>
            </article>
          </section>

          {buyer === 'ALL' && (
            <section className="panel planner-board">
              <div className="panel-head">
                <div>
                  <span>Planner portfolio</span>
                  <h3>Five workspaces, one factory view</h3>
                </div>
                <UsersRound />
              </div>

              <div className="planner-grid">
                {planners.map(p => (
                  <button
                    key={p.buyer}
                    onClick={() => setBuyer(p.buyer)}
                  >
                    <div>
                      <strong>{p.name}</strong>
                      <small>
                        {p.suppliers} suppliers · {p.parts} parts
                      </small>
                    </div>

                    <b>{p.health}%</b>
                    <span>{p.critical} critical</span>
                    <em>{fmt(p.gap)} gap</em>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="risk-grid">
            <article className="panel">
              <div className="panel-head">
                <div>
                  <span>Supplier intelligence</span>
                  <h3>Who should be called first?</h3>
                </div>

                <button
                  className="link-icon"
                  onClick={() => setView('suppliers')}
                >
                  <ChevronRight />
                </button>
              </div>

              <div className="rank-list">
                {a.supplierRisks.slice(0, 5).map((x, i) => (
                  <div key={x.supplier}>
                    <b>{i + 1}</b>

                    <div>
                      <strong>{x.supplier}</strong>
                      <small>
                        {x.parts} parts · {x.cells} cells ·{' '}
                        {x.constraints} signals
                      </small>
                    </div>

                    <span>{fmt(x.gap)} gap</span>
                    <Pill level={x.level} />
                  </div>
                ))}
              </div>
            </article>

            <article className="panel">
              <div className="panel-head">
                <div>
                  <span>Production cell intelligence</span>
                  <h3>Where could production feel it?</h3>
                </div>

                <button
                  className="link-icon"
                  onClick={() => setView('cells')}
                >
                  <ChevronRight />
                </button>
              </div>

              <div className="rank-list">
                {a.cellRisks.slice(0, 5).map((x, i) => (
                  <div key={x.cell}>
                    <b>{i + 1}</b>

                    <div>
                      <strong>Cell {x.cell}</strong>
                      <small>
                        {x.parts} parts · {x.suppliers} suppliers ·{' '}
                        {x.constraints} signals
                      </small>
                    </div>

                    <span>{fmt(x.gap)} gap</span>
                    <Pill level={x.level} />
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="scenario panel">
            <div>
              <span className="eyebrow">Scenario Studio</span>
              <h3>Inject a controlled event</h3>

              <p>
                Preview how the selected workspace would respond. The
                original requirement snapshot remains unchanged.
              </p>
            </div>

            <div>
              {[
                'Supplier Delay',
                'Demand Spike',
                'ASN Received',
                'Quality Hold',
                'Transport Delay',
                'Capacity Loss',
              ].map(x => (
                <button
                  className={scenario === x ? 'active' : ''}
                  key={x}
                  onClick={() => inject(x)}
                >
                  {x}
                </button>
              ))}
            </div>
          </section>

          <section className="queue-layout" id="queue">
            <article className="panel queue">
              <div className="panel-head">
                <div>
                  <span>Constraint queue</span>
                  <h3>Work ordered by operational urgency</h3>
                </div>

                <div className="filters">
                  <Filter />

                  <button
                    className={level === 'all' ? 'sel' : ''}
                    onClick={() => setLevel('all')}
                  >
                    All
                  </button>

                  {(['critical', 'high', 'medium'] as RiskLevel[]).map(
                    l => (
                      <button
                        key={l}
                        className={level === l ? 'sel' : ''}
                        onClick={() => setLevel(l)}
                      >
                        {l}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="table-head">
                <span>Priority</span>
                <span>Lifecycle</span>
                <span>Supplier / Part</span>
                <span>Cell</span>
                <span>Gap</span>
                <span>Risk</span>
              </div>

              <div className="rows">
                {visible.slice(0, 80).map(c => (
                  <button
                    key={c.id}
                    className={selected?.id === c.id ? 'selected' : ''}
                    onClick={() => setSelected(c)}
                  >
                    <b>{c.score}</b>

                    <div>
                      <strong className={`status-${c.changeStatus}`}>
                        {c.changeStatus ?? 'stable'}
                      </strong>
                      <small>{c.type}</small>
                    </div>

                    <div>
                      <strong>{c.supplier}</strong>
                      <small>
                        {c.partNo} · {c.description}
                      </small>
                    </div>

                    <span>Cell {c.cell}</span>
                    <span>{fmt(c.gap)}</span>
                    <Pill level={c.level} />
                  </button>
                ))}
              </div>
            </article>

            <aside className="panel detail">
              {selected ? (
                <>
                  <div className="detail-top">
                    <Pill level={selected.level} />

                    <button onClick={() => setSelected(null)}>
                      <X />
                    </button>
                  </div>

                  <span className="eyebrow">
                    SCOUT mission assessment
                  </span>

                  <h3>
                    {selected.type}: {selected.partNo}
                  </h3>

                  <p>{selected.reason}</p>

                  <dl>
                    <div>
                      <dt>Planner</dt>
                      <dd>
                        {selected.row.userName || selected.row.buyer}
                      </dd>
                    </div>

                    <div>
                      <dt>Supplier</dt>
                      <dd>{selected.supplier}</dd>
                    </div>

                    <div>
                      <dt>Production cell</dt>
                      <dd>{selected.cell}</dd>
                    </div>

                    <div>
                      <dt>Lifecycle</dt>
                      <dd>{selected.changeStatus ?? 'stable'}</dd>
                    </div>

                    <div>
                      <dt>Calculated gap</dt>
                      <dd>{fmt(selected.gap)}</dd>
                    </div>

                    <div>
                      <dt>Previous gap</dt>
                      <dd>
                        {selected.previousGap == null
                          ? '—'
                          : fmt(selected.previousGap)}
                      </dd>
                    </div>
                  </dl>

                  <div className="recommend">
                    <span>Recommended next action</span>
                    <strong>{selected.recommendedAction}</strong>
                  </div>

                  {selected.row.supplierMessage && (
                    <blockquote>
                      “{selected.row.supplierMessage}”
                      <small>Supplier message</small>
                    </blockquote>
                  )}

                  <button
                    className="recovery-button"
                    onClick={() => setRecoveryTarget(selected)}
                  >
                    <Sparkles />
                    Review recovery options
                    <ArrowRight />
                  </button>

                  <button
                    className="primary"
                    onClick={() => setMissionTarget(selected)}
                  >
                    <Plus />
                    Create recovery mission
                    <ArrowRight />
                  </button>

                  {missions.some(
                    m => m.constraintKey === selected.key,
                  ) && (
                    <button
                      className="mission-existing"
                      onClick={() => setView('missions')}
                    >
                      <CheckCircle2 />
                      Mission already created — open Mission Center
                    </button>
                  )}
                </>
              ) : (
                <div className="empty">
                  Select a constraint to review SCOUT&apos;s assessment.
                </div>
              )}
            </aside>
          </section>

          <section className="import-note">
            <CheckCircle2 />

            <div>
              <strong>Snapshot validated successfully</strong>

              <span>
                {a.rowCount} rows · {a.weekLabels.length} demand buckets
                · {planners.length} planner portfolios
              </span>
            </div>

            {scenario && (
              <small>Scenario preview active: {scenario}</small>
            )}
          </section>
        </>
      )}
    </>
  )}
</main>

{recoveryTarget && (
  <RecoveryModal
    constraint={recoveryTarget}
    onClose={() => setRecoveryTarget(null)}
    onEscalate={escalateDecision}
  />
)}

{missionTarget && (
  <MissionModal
    constraint={missionTarget}
    onClose={() => setMissionTarget(null)}
    onSave={createMission}
  />
)}
</div>
)
}
