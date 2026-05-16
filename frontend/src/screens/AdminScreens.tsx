import React, { useEffect, useMemo, useState } from 'react';
import { Button, DataTable, Text, TextInput, Switch } from 'react-native-paper';
import { View } from 'react-native';
import { Layout } from '../components/Layout';
import { api } from '../api/client';
import { useLanguage } from '../i18n';

const ROLE_COLORS = ['#2563eb','#16a34a','#dc2626','#f59e0b','#7c3aed','#0891b2','#db2777','#374151'];
const roleName = 'arbeidsrolle';
const dateOnly = (value: string | Date) => new Date(value).toISOString().slice(0,10);
const timeOnly = (value: string | Date) => new Date(value).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
const hours = (minutes: number) => (minutes/60).toFixed(2).replace('.', ',');
const initials = (user: any) => `${user?.firstName?.[0] ?? ''}${(user?.lastName ?? '').split(/\s+/).map((p:string)=>p[0]).join('')}`.toUpperCase();
const signedBy = (entry: any) => `${initials(entry.user)} / ${['APPROVED','LOCKED'].includes(entry.status) ? 'AEH' : ''}`;

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v:string)=>void }) {
  return <View style={{gap:4, width:'100%', maxWidth:260}}><Text variant="titleSmall">{label}</Text>{React.createElement('input', { type:'date', value, onChange:(e:any)=>onChange(e.target.value), style:{ fontSize:16, padding:12, border:'1px solid #999', borderRadius:4, width:'100%', boxSizing:'border-box' } })}</View>;
}
function iso(d: Date) { return d.toISOString().slice(0,10); }
function monthRange(offset = 0) { const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth()+offset, 1); const end = new Date(now.getFullYear(), now.getMonth()+offset+1, 0); return [iso(start), iso(end)]; }
function currentHalf(firstHalf: boolean) { const now = new Date(); const y=now.getFullYear(), m=now.getMonth(); return firstHalf ? [iso(new Date(y,m,1)), iso(new Date(y,m,15))] : [iso(new Date(y,m,16)), iso(new Date(y,m+1,0))]; }
function payrollRange(offset = 0) { const now = new Date(); const endMonth = now.getDate() >= 12 ? now.getMonth()+1+offset : now.getMonth()+offset; const end = new Date(now.getFullYear(), endMonth, 11); const start = new Date(end.getFullYear(), end.getMonth()-1, 12); return [iso(start), iso(end)]; }
const currentPayrollRange = () => payrollRange(0);

function ColorPicker({ value, onChange }: { value: string; onChange: (v:string)=>void }) {
  return <View style={{flexDirection:'row', flexWrap:'wrap', gap:8}}>{ROLE_COLORS.map(color =>
    <Button key={color} mode={value===color?'contained':'outlined'} compact onPress={()=>onChange(color)} buttonColor={value===color?color:undefined} textColor={value===color?'white':color}>■</Button>
  )}</View>;
}

export function AdminDashboard({ navigation }: any) { const { tr } = useLanguage(); return <Layout title="Admin"><Text>{tr('Approve hours, follow compliance alerts and export reports.','Godkjenn timer, følg compliance-varsler og hent rapporter.')}</Text><Button mode="contained" onPress={()=>navigation.navigate('Approvals')}>{tr('Approve hours','Godkjenn timer')}</Button><Button onPress={()=>navigation.navigate('Employees')}>{tr('Employees','Ansatte')}</Button><Button onPress={()=>navigation.navigate('Positions')}>{tr('Work roles','Arbeidsroller')}</Button><Button onPress={()=>navigation.navigate('Company')}>{tr('Company','Bedrift')}</Button><Button onPress={()=>navigation.navigate('WorkRules')}>{tr('Work rules','Arbeidsregler')}</Button><Button onPress={()=>navigation.navigate('Alerts')}>{tr('Compliance alerts','Compliance-varsler')}</Button><Button onPress={()=>navigation.navigate('Reports')}>{tr('Reports','Rapporter')}</Button><Button onPress={()=>navigation.navigate('TimeList')}>{tr('Timesheet','Timeliste')}</Button></Layout> }

export function UsersAdmin() {
  const [users,setUsers]=useState<any[]>([]);
  const [positions,setPositions]=useState<any[]>([]);
  const [form,setForm]=useState<any>({firstName:'',lastName:'',email:'',birthDate:'',address:'',phone:'',password:'Passord123!',role:'EMPLOYEE',positionId:'',profileReviewRequired:true});
  const [newRoleName,setNewRoleName]=useState('');
  const [newRoleColor,setNewRoleColor]=useState('#2563eb');
  const [msg,setMsg]=useState('');
  const [saving,setSaving]=useState(false);
  const loadUsers=()=>api('/admin/users').then(setUsers);
  const loadPositions=()=>api('/admin/positions').then(setPositions);
  const load=()=>Promise.all([loadUsers(), loadPositions()]);
  useEffect(()=>{load().catch((e:any)=>setMsg(e.message))},[]);
  const f=(k:string,v:any)=>setForm((x:any)=>({...x,[k]:v}));
  const createRole=async()=>{ if(!newRoleName.trim()){setMsg('Skriv navn på arbeidsrollen først.'); return undefined;} const p=await api('/admin/positions',{method:'POST',body:JSON.stringify({name:newRoleName.trim(), color:newRoleColor})}); await loadPositions(); setNewRoleName(''); return p; };
  const create=async()=>{setMsg(''); setSaving(true); try{let positionId=form.positionId || undefined; if(newRoleName.trim()) positionId=(await createRole()).id; await api('/admin/users',{method:'POST',body:JSON.stringify({ ...form, email: form.email.trim(), positionId })}); setForm({firstName:'',lastName:'',email:'',birthDate:'',address:'',phone:'',password:'Passord123!',role:'EMPLOYEE',positionId:'',profileReviewRequired:true}); await loadUsers(); setMsg('Ansatt opprettet.');}catch(e:any){setMsg(e.message ?? 'Kunne ikke opprette ansatt.');}finally{setSaving(false);}};
  return <Layout title="Ansatte">
    <Text>Legg til ansatte og knytt dem til en arbeidsrolle, for eksempel Kokk, Servitør eller Bartender. Hvis rollen ikke finnes ennå, kan du opprette den direkte her.</Text>
    <TextInput label="Fornavn" value={form.firstName} onChangeText={v=>f('firstName',v)}/>
    <TextInput label="Etternavn" value={form.lastName} onChangeText={v=>f('lastName',v)}/>
    <TextInput label="E-post" value={form.email} onChangeText={v=>f('email',v)} autoCapitalize="none" keyboardType="email-address"/>
    <TextInput label="Fødselsdato (YYYY-MM-DD, valgfritt)" value={form.birthDate} onChangeText={v=>f('birthDate',v)} placeholder="2006-05-10"/>
    <Text style={{color:'#555'}}>Ikke legg inn fullt fødselsnummer her. Fødselsdato brukes bare for arbeidstidsvarsler, særlig under 18.</Text>
    <TextInput label="Adresse (valgfritt)" value={form.address} onChangeText={v=>f('address',v)}/>
    <TextInput label="Telefon (valgfritt)" value={form.phone} onChangeText={v=>f('phone',v)} keyboardType="phone-pad"/>
    <TextInput label="Midlertidig passord" value={form.password} onChangeText={v=>f('password',v)} secureTextEntry/>
    <Text variant="titleSmall">Velg eksisterende arbeidsrolle</Text>
    <View style={{flexDirection:'row', flexWrap:'wrap', gap:8}}>
      <Button mode={!form.positionId?'contained':'outlined'} onPress={()=>f('positionId','')}>Ingen</Button>
      {positions.map(p=><Button key={p.id} mode={form.positionId===p.id?'contained':'outlined'} buttonColor={form.positionId===p.id?p.color:undefined} textColor={form.positionId===p.id?'white':p.color} onPress={()=>{f('positionId',p.id); setNewRoleName('');}}>{p.name}</Button>)}
    </View>
    <Text variant="titleSmall">Eller opprett ny arbeidsrolle for denne ansatte</Text>
    <TextInput label="Ny arbeidsrolle" value={newRoleName} onChangeText={v=>{setNewRoleName(v); if(v.trim()) f('positionId','');}}/>
    {newRoleName.trim()?<ColorPicker value={newRoleColor} onChange={setNewRoleColor}/>:null}
    <Button mode="contained" loading={saving} disabled={saving} onPress={create}>Opprett ansatt</Button>
    {msg?<Text style={{color:msg.includes('opprettet')?'green':'red'}}>{msg}</Text>:null}
    {users.map(u=><Text key={u.id}>{u.firstName} {u.lastName} — {u.email} — {u.birthDate ? dateOnly(u.birthDate) : 'mangler fødselsdato'} — {u.position?.name ?? 'ingen rolle'} — {u.profileReviewRequired?'må sjekke opplysninger':'opplysninger OK'} — {u.isActive?'aktiv':'deaktivert'}</Text>)}
  </Layout> }

export function PositionsAdmin() {
  const [items,setItems]=useState<any[]>([]); const [name,setName]=useState(''); const [color,setColor]=useState('#2563eb'); const [msg,setMsg]=useState('');
  const load=()=>api('/admin/positions').then(setItems); useEffect(()=>{load().catch((e:any)=>setMsg(e.message))},[]);
  const add=async()=>{setMsg(''); try{await api('/admin/positions',{method:'POST',body:JSON.stringify({name:name.trim(),color})}); setName(''); setColor('#2563eb'); await load(); setMsg('Arbeidsrolle lagt til.');}catch(e:any){setMsg(e.message ?? 'Kunne ikke legge til arbeidsrolle.');}};
  return <Layout title="Arbeidsroller">
    <Text>Her legger du til arbeidsroller som ansatte kan knyttes til, for eksempel Kokk, Servitør eller Bartender. Fargen brukes i lister og rapporter så det blir lettere å se hvem som jobber med hva.</Text>
    <TextInput label="Navn på arbeidsrolle" value={name} onChangeText={setName}/>
    <Text variant="titleSmall">Velg farge</Text>
    <ColorPicker value={color} onChange={setColor}/>
    <Button mode="contained" onPress={add}>Legg til arbeidsrolle</Button>
    {msg?<Text style={{color:msg.includes('lagt')?'green':'red'}}>{msg}</Text>:null}
    {items.map(p=><View key={p.id} style={{flexDirection:'row', alignItems:'center', gap:8}}><Text style={{color:p.color, fontSize:22}}>■</Text><Text>{p.name}</Text></View>)}
  </Layout> }

export function CompanySettings() { const [c,setC]=useState<any>({}); useEffect(()=>{api('/admin/company').then(setC).catch(()=>{})},[]); const f=(k:string,v:string)=>setC((x:any)=>({...x,[k]:v})); return <Layout title="Bedriftsinnstillinger"><TextInput label="Navn" value={c.name??''} onChangeText={v=>f('name',v)}/><TextInput label="Org.nr" value={c.orgNumber??''} onChangeText={v=>f('orgNumber',v)}/><TextInput label="Adresse" value={c.address??''} onChangeText={v=>f('address',v)}/><Button mode="contained" onPress={async()=>setC(await api('/admin/company',{method:'PUT',body:JSON.stringify(c)}))}>Lagre</Button><Text>Logo lastes opp via API-endepunkt /admin/company/logo.</Text></Layout> }

export function WorkRules() {
  const [r,setR]=useState<any>({});
  const [msg,setMsg]=useState('');
  const [saving,setSaving]=useState(false);
  useEffect(()=>{api('/admin/work-rules').then(setR).catch((e:any)=>setMsg(e.message))},[]);
  const setNumber=(k:string,v:string)=>setR((x:any)=>({...x,[k]:v===''?'':Number(v)}));
  const fields = [
    { key:'maxDailyHours', label:'Maks arbeidstid per dag', unit:'timer', law:'AML § 10-4 / § 10-5', help:'Brukes til varsel når en vakt blir for lang. Standard er 9 timer.' },
    { key:'maxWeeklyHours', label:'Maks arbeidstid per uke', unit:'timer', law:'AML § 10-4', help:'Brukes til varsel når registrert arbeidstid passerer ukentlig grense. Standard er 40 timer.' },
    { key:'overtimeThresholdDaily', label:'Overtid starter etter per dag', unit:'timer', law:'AML § 10-6', help:'Over dette markeres tiden som mulig overtid.' },
    { key:'overtimeThresholdWeekly', label:'Overtid starter etter per uke', unit:'timer', law:'AML § 10-6', help:'Ofte 37,5 timer hvis arbeidsavtalen bruker 37,5-timers uke. Dette er ikke alltid selve lovgrensen.' },
    { key:'maxOvertimePerWeek', label:'Maks overtid per uke', unit:'timer', law:'AML § 10-6', help:'Brukes til varsel ved mye overtid.' },
    { key:'minRestHoursBetweenShifts', label:'Minste hvile mellom vakter', unit:'timer', law:'AML § 10-8', help:'Varsler hvis ansatte får for kort hvile mellom to vakter. Standard er 11 timer.' },
    { key:'minWeeklyRestHours', label:'Minste sammenhengende ukehvile', unit:'timer', law:'AML § 10-8', help:'Varsler hvis ukehvilen blir for kort. Standard er 35 timer.' },
    { key:'nightShiftStartHour', label:'Nattarbeid starter kl.', unit:'', law:'AML § 10-11', help:'Bruk 21 for kl. 21:00.' },
    { key:'nightShiftEndHour', label:'Nattarbeid slutter kl.', unit:'', law:'AML § 10-11', help:'Bruk 6 for kl. 06:00.' },
    { key:'maxDailyHoursUnder18', label:'Under 18: maks per dag', unit:'timer', law:'AML kap. 11', help:'Ekstra varsel for unge arbeidstakere.' },
    { key:'maxWeeklyHoursUnder18', label:'Under 18: maks per uke', unit:'timer', law:'AML kap. 11', help:'Ekstra varsel for unge arbeidstakere.' }
  ];
  const save=async()=>{setMsg(''); setSaving(true); try{setR(await api('/admin/work-rules',{method:'PUT',body:JSON.stringify(r)})); setMsg('Reglene er lagret. Nye timeføringer vurderes mot disse grensene.');}catch(e:any){setMsg(e.message ?? 'Kunne ikke lagre regler.');}finally{setSaving(false);}};
  return <Layout title="Arbeidsregler og compliance">
    <Text variant="titleMedium">Dette styrer varslene i TimeTrack</Text>
    <Text>Reglene under brukes til å flagge mulige brudd på arbeidstid, overtid, hvile og nattarbeid. De bygger på arbeidsmiljøloven kapittel 10, særlig §§ 10-4, 10-6, 10-8 og 10-11.</Text>
    <Text style={{backgroundColor:'#fff7ed', padding:12, borderRadius:8}}>Viktig: Å endre disse tallene endrer ikke loven. Det endrer bare når TimeTrack varsler deg. Sett aldri grensene mildere for å skjule avvik — da mister appen verdi som compliance-verktøy.</Text>
    <Text style={{backgroundColor:'#eff6ff', padding:12, borderRadius:8}}>Anbefaling: La standardverdiene stå med mindre bedriften har dokumentert grunnlag, avtale, tariff eller særregel. Ved usikkerhet: bruk strengere grense, ikke løsere.</Text>
    {fields.map(f=><React.Fragment key={f.key}>
      <Text variant="titleSmall">{f.label}</Text>
      <TextInput label={`${f.label}${f.unit ? ` (${f.unit})` : ''}`} value={String(r[f.key]??'')} onChangeText={v=>setNumber(f.key,v)} keyboardType="numeric"/>
      <Text style={{color:'#555'}}>{f.help} Referanse: {f.law}.</Text>
    </React.Fragment>)}
    <Button mode="contained" loading={saving} disabled={saving} onPress={save}>Lagre arbeidsregler</Button>
    {msg?<Text style={{color:msg.includes('lagret')?'green':'red'}}>{msg}</Text>:null}
    <Text style={{fontSize:12, color:'#666'}}>Merk: Dette er tekniske kontroller for å oppdage risiko. Det er ikke juridisk rådgivning eller full vurdering av alle unntak i arbeidsmiljøloven.</Text>
  </Layout> }

export function AdminApprovals() { const [entries,setEntries]=useState<any[]>([]); const load=()=>api('/time-entries?status=SUBMITTED').then(setEntries); useEffect(()=>{load().catch(()=>{})},[]); return <Layout title="Godkjenning av timer"><DataTable><DataTable.Header><DataTable.Title>Ansatt</DataTable.Title><DataTable.Title>Dato</DataTable.Title><DataTable.Title>Timer</DataTable.Title><DataTable.Title>Handling</DataTable.Title></DataTable.Header>{entries.map(e=><DataTable.Row key={e.id}><DataTable.Cell>{e.user?.firstName}</DataTable.Cell><DataTable.Cell>{e.date.slice(0,10)}</DataTable.Cell><DataTable.Cell>{(e.totalMinutes/60).toFixed(2)}</DataTable.Cell><DataTable.Cell><Button onPress={async()=>{await api(`/admin/time-entries/${e.id}/approve`,{method:'POST'}); load();}}>Godkjenn</Button></DataTable.Cell></DataTable.Row>)}</DataTable></Layout> }

export function Reports() {
  const { tr } = useLanguage();
  const [initialFrom, initialTo] = currentPayrollRange();
  const [from,setFrom]=useState(initialFrom); const [to,setTo]=useState(initialTo);
  const [users,setUsers]=useState<any[]>([]); const [positions,setPositions]=useState<any[]>([]); const [entries,setEntries]=useState<any[]>([]);
  const [selectedUsers,setSelectedUsers]=useState<string[]>([]); const [selectedPosition,setSelectedPosition]=useState(''); const [msg,setMsg]=useState(''); const [processing,setProcessing]=useState(false);
  useEffect(()=>{Promise.all([api('/admin/users'), api('/admin/positions')]).then(([u,p])=>{setUsers(u); setPositions(p); setSelectedUsers(u.map((x:any)=>x.id));}).catch((e:any)=>setMsg(e.message))},[]);
  const toggleUser=(id:string)=>setSelectedUsers(xs=>xs.includes(id)?xs.filter(x=>x!==id):[...xs,id]);
  const setRange=(a:string,b:string)=>{setFrom(a); setTo(b);};
  const load=async()=>{setMsg(''); try{const params = new URLSearchParams({from,to}); if(selectedUsers.length && selectedUsers.length !== users.length) params.set('userIds', selectedUsers.join(',')); if(selectedPosition) params.set('positionId', selectedPosition); const rows=await api(`/time-entries?${params.toString()}`); setEntries(rows.sort((a:any,b:any)=>`${a.user.firstName} ${a.user.lastName}`.localeCompare(`${b.user.firstName} ${b.user.lastName}`) || a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)));}catch(e:any){setMsg(e.message ?? tr('Could not load report.','Kunne ikke hente rapport.'));}};
  const filtered=entries;
  const unprocessed=filtered.filter(e=>!e.processedAt);
  const grouped=useMemo(()=>{const m:Record<string, any[]>={}; filtered.forEach(e=>{const key=e.userId; (m[key]??=[]).push(e);}); return m;},[filtered]);
  const grandTotal=filtered.reduce((s,e)=>s+e.totalMinutes,0);
  const exportQuery = () => { const q = new URLSearchParams({from,to}); if(selectedUsers.length && selectedUsers.length !== users.length) q.set('userIds', selectedUsers.join(',')); if(selectedPosition) q.set('positionId', selectedPosition); return q.toString(); };
  const base=process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api';
  const openExport=(format:'csv'|'pdf')=>{ const url = `${base}/reports/${format}?${exportQuery()}`; if(typeof window !== 'undefined') window.open(url, '_blank'); };
  const markProcessed=async()=>{ if(!filtered.length){setMsg(tr('No hours in the report to mark.','Ingen timer i rapporten å markere.')); return;} setProcessing(true); setMsg(''); try{await api('/admin/time-entries/mark-processed',{method:'POST',body:JSON.stringify({ids:filtered.map(e=>e.id)})}); await load(); setMsg(tr('Report hours marked as paid/processed.','Timer i rapporten er markert som utbetalt/ferdig behandlet.'));}catch(e:any){setMsg(e.message ?? tr('Could not mark hours.','Kunne ikke markere timer.'));}finally{setProcessing(false);} };
  return <Layout title={tr('Reports','Rapporter')}>
    <Text>{tr('Choose period, employees and optionally work role. The report shows date, time span and hours per day, with totals per employee and overall total.','Velg periode, ansatte og eventuelt arbeidsrolle. Rapporten viser dato, tidsrom og timer per dag, med summer per ansatt og totalt nederst.')}</Text>
    <Text variant="titleSmall">{tr('Period','Periode')}</Text>
    <View style={{flexDirection:'row', flexWrap:'wrap', gap:8}}>
      <Button mode="contained" onPress={()=>{const [a,b]=payrollRange(0); setRange(a,b);}}>{tr('Kambuzi payroll 12th–11th','Kambuzi lønn 12.–11.')}</Button>
      <Button onPress={()=>{const [a,b]=payrollRange(-1); setRange(a,b);}}>{tr('Previous payroll period','Forrige lønnsperiode')}</Button>
      <Button onPress={()=>{const [a,b]=monthRange(0); setRange(a,b);}}>{tr('This month','Denne måneden')}</Button>
      <Button onPress={()=>{const [a,b]=monthRange(-1); setRange(a,b);}}>{tr('Previous month','Forrige måned')}</Button>
    </View>
    <DateField label={tr('From date','Fra dato')} value={from} onChange={setFrom}/><DateField label={tr('To date','Til dato')} value={to} onChange={setTo}/>
    <Text style={{color:'#555'}}>{tr('Kambuzi payroll uses the period from the 12th of one month through the 11th of the next month. Dates can still be changed manually.','Kambuzi-lønn bruker perioden fra og med 12. i én måned til og med 11. i neste. Datoene kan fortsatt overstyres manuelt.')}</Text>
    <Text variant="titleSmall">{tr('Employees','Ansatte')}</Text>
    <View style={{flexDirection:'row', flexWrap:'wrap', gap:8}}><Button mode={selectedUsers.length===users.length?'contained':'outlined'} onPress={()=>setSelectedUsers(users.map(u=>u.id))}>{tr('All','Alle')}</Button><Button mode={selectedUsers.length===0?'contained':'outlined'} onPress={()=>setSelectedUsers([])}>{tr('None','Ingen')}</Button>{users.map(u=><Button key={u.id} mode={selectedUsers.includes(u.id)?'contained':'outlined'} onPress={()=>toggleUser(u.id)}>{u.firstName} {u.lastName}</Button>)}</View>
    <Text variant="titleSmall">{tr('Work role','Arbeidsrolle')}</Text>
    <View style={{flexDirection:'row', flexWrap:'wrap', gap:8}}><Button mode={!selectedPosition?'contained':'outlined'} onPress={()=>setSelectedPosition('')}>{tr('All roles','Alle roller')}</Button>{positions.map(p=><Button key={p.id} mode={selectedPosition===p.id?'contained':'outlined'} buttonColor={selectedPosition===p.id?p.color:undefined} textColor={selectedPosition===p.id?'white':p.color} onPress={()=>setSelectedPosition(p.id)}>{p.name}</Button>)}</View>
    <View style={{flexDirection:'row', flexWrap:'wrap', gap:8}}><Button mode="contained" onPress={load}>{tr('Show report','Vis rapport')}</Button><Button onPress={()=>openExport('csv')}>CSV</Button><Button onPress={()=>openExport('pdf')}>PDF</Button></View>
    {msg?<Text style={{color:msg.includes('marked')||msg.includes('markert')?'green':'red'}}>{msg}</Text>:null}
    {Object.entries(grouped).map(([userId, rows])=>{const user=rows[0].user; const total=rows.reduce((s:any,e:any)=>s+e.totalMinutes,0); return <View key={userId} style={{marginTop:16, gap:6}}><Text variant="titleMedium">{user.firstName} {user.lastName} {user.position?.name ? `— ${user.position.name}` : ''}</Text>{rows.map((e:any)=><View key={e.id} style={{flexDirection:'row', justifyContent:'space-between', gap:8, opacity:e.processedAt?0.55:1}}><Text>{dateOnly(e.date)}</Text><Text>{timeOnly(e.startTime)}–{timeOnly(e.endTime)}</Text><Text>{signedBy(e)}</Text><Text>{hours(e.totalMinutes)} t {e.processedAt?'✓':''}</Text></View>)}<Text style={{fontWeight:'700'}}>{tr('Total','Sum')} {user.firstName}: {hours(total)} t</Text></View>})}
    {filtered.length?<><Text variant="titleMedium" style={{marginTop:16}}>{tr('Total for selected employees','Totalt for valgte ansatte')}: {hours(grandTotal)} t</Text><Text>{unprocessed.length} {tr('of','av')} {filtered.length} {tr('hours are not marked as processed.','timer er ikke markert som ferdig behandlet.')}</Text><Button mode="contained" loading={processing} disabled={processing} onPress={markProcessed}>{tr('Mark report hours as paid / processed','Marker rapporttimer som utbetalt / ferdig behandlet')}</Button><Text style={{fontSize:12, color:'#666'}}>{tr('Use this after the report has been checked and payroll/hours have been processed. Marked hours show ✓ in the report.','Bruk dette etter at rapporten er kontrollert og lønn/timer er ferdig behandlet. Markerte timer vises med ✓ i rapporten.')}</Text></>:null}
  </Layout> }

export function ComplianceAlerts() { const [items,setItems]=useState<any[]>([]); const load=()=>api('/admin/alerts').then(setItems); useEffect(()=>{load().catch(()=>{})},[]); return <Layout title="Compliance-varsler"><Text>Varslene er tekniske hjelperegler og ikke full juridisk AML-rådgivning.</Text>{items.map(a=><Text key={a.id}>{a.severity}: {a.message} {a.acknowledgedAt?'(kvittert)':''}</Text>)}</Layout> }
