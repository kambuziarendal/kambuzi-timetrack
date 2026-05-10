import React, { useEffect, useState } from 'react';
import { Button, DataTable, Text, TextInput } from 'react-native-paper';
import { View } from 'react-native';
import { Layout } from '../components/Layout';
import { api } from '../api/client';

const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const hours = (minutes: number) => (minutes / 60).toFixed(2).replace('.', ',');
function DateInput({ value, onChange }: { value: string; onChange: (v:string)=>void }) {
  return <View style={{gap:4}}><Text variant="titleSmall">Dato</Text>{React.createElement('input', { type:'date', value, onChange:(e:any)=>onChange(e.target.value), style:{ fontSize:18, padding:12, border:'1px solid #999', borderRadius:6 } })}</View>;
}
function TimeInput({ label, value, onChange }: { label: string; value: string; onChange: (v:string)=>void }) {
  return <View style={{gap:4, flexGrow:1}}><Text variant="titleSmall">{label}</Text>{React.createElement('input', { type:'time', value, onChange:(e:any)=>onChange(e.target.value), step:300, style:{ fontSize:18, padding:12, border:'1px solid #999', borderRadius:6 } })}</View>;
}
function buildDateTime(date: string, time: string, addDay = false) {
  const d = new Date(`${date}T${time}:00`);
  if (addDay) d.setDate(d.getDate() + 1);
  return d.toISOString();
}
function previewMinutes(start: string, end: string, breakMinutes: string) {
  const [sh, sm] = start.split(':').map(Number); const [eh, em] = end.split(':').map(Number);
  let startMin = sh*60 + sm; let endMin = eh*60 + em; if (endMin <= startMin) endMin += 24*60;
  return Math.max(0, endMin - startMin - (Number(breakMinutes) || 0));
}

export function EmployeeDashboard({ navigation }: any) { const [entries,setEntries]=useState<any[]>([]); useEffect(()=>{api('/time-entries').then(setEntries).catch(()=>{})},[]); const minutes=entries.reduce((s,e)=>s+e.totalMinutes,0); return <Layout title="Min oversikt"><Text>Denne perioden: {hours(minutes)} timer</Text><Text>Siste registreringer vises under Timeliste.</Text><Button mode="contained" onPress={()=>navigation.navigate('NyTime')}>Registrer tid</Button><Button onPress={()=>navigation.navigate('Timeliste')}>Se timeliste</Button><Button onPress={()=>navigation.navigate('Rapporter')}>Mine rapporter</Button></Layout> }

export function TimeEntryList({ navigation }: any) { const [entries,setEntries]=useState<any[]>([]); const load=()=>api('/time-entries').then(setEntries); useEffect(()=>{load().catch(()=>{})},[]); return <Layout title="Timeliste"><Button mode="contained" onPress={()=>navigation.navigate('NyTime')}>Ny timeføring</Button><DataTable><DataTable.Header><DataTable.Title>Dato</DataTable.Title><DataTable.Title>Timer</DataTable.Title><DataTable.Title>Status</DataTable.Title></DataTable.Header>{entries.map(e=><DataTable.Row key={e.id}><DataTable.Cell>{e.date.slice(0,10)}</DataTable.Cell><DataTable.Cell>{hours(e.totalMinutes)}</DataTable.Cell><DataTable.Cell>{e.status}</DataTable.Cell></DataTable.Row>)}</DataTable></Layout> }

export function TimeEntryForm({ navigation }: any) {
  const today = localDate();
  const [form,setForm]=useState<any>({date:today,startClock:'08:00',endClock:'16:00',breakMinutes:'30',note:''});
  const [msg,setMsg]=useState('');
  const [saving,setSaving]=useState(false);
  const f=(k:string,v:string)=>setForm((x:any)=>({...x,[k]:v}));
  const minutes = previewMinutes(form.startClock, form.endClock, form.breakMinutes);
  const endIsNextDay = form.endClock <= form.startClock;
  const setShift=(startClock:string,endClock:string,breakMinutes='30')=>setForm((x:any)=>({...x,startClock,endClock,breakMinutes}));
  const save=async()=>{setMsg(''); setSaving(true); try{await api('/time-entries',{method:'POST',body:JSON.stringify({date:form.date,startTime:buildDateTime(form.date, form.startClock),endTime:buildDateTime(form.date, form.endClock, endIsNextDay),breakMinutes:Number(form.breakMinutes)||0,note:form.note})}); navigation.goBack();}catch(e:any){setMsg(e.message ?? 'Kunne ikke lagre timeføring.');}finally{setSaving(false);}};
  return <Layout title="Registrer tid">
    <Text>Dato er satt til i dag. Trykk på datoen for å velge en annen dag.</Text>
    <DateInput value={form.date} onChange={v=>f('date',v)}/>
    <View style={{flexDirection:'row', flexWrap:'wrap', gap:8}}><Button onPress={()=>f('date', localDate())}>I dag</Button><Button onPress={()=>{const d=new Date(); d.setDate(d.getDate()-1); f('date', localDate(d));}}>I går</Button></View>
    <Text variant="titleSmall">Arbeidstid</Text>
    <View style={{flexDirection:'row', gap:12, flexWrap:'wrap'}}><TimeInput label="Fra klokken" value={form.startClock} onChange={v=>f('startClock',v)}/><TimeInput label="Til klokken" value={form.endClock} onChange={v=>f('endClock',v)}/></View>
    <View style={{flexDirection:'row', flexWrap:'wrap', gap:8}}><Button onPress={()=>setShift('08:00','16:00')}>08–16</Button><Button onPress={()=>setShift('10:00','16:00','0')}>10–16</Button><Button onPress={()=>setShift('16:00','22:00','0')}>16–22</Button><Button onPress={()=>setShift('17:00','23:00','0')}>17–23</Button></View>
    {endIsNextDay?<Text style={{color:'#92400e'}}>Sluttiden er tidligere enn starttiden, så vakten lagres som over midnatt.</Text>:null}
    <TextInput label="Pause i minutter" value={form.breakMinutes} onChangeText={v=>f('breakMinutes',v)} keyboardType="numeric"/>
    <Text style={{fontWeight:'700'}}>Sum: {hours(minutes)} timer</Text>
    <TextInput label="Notat (valgfritt)" value={form.note} onChangeText={v=>f('note',v)} maxLength={200}/>
    {msg?<Text style={{color:'red'}}>{msg}</Text>:null}
    <Button mode="contained" loading={saving} disabled={saving} onPress={save}>Lagre timeføring</Button>
  </Layout> }
