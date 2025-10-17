/*
Padel Turnos - Web App Prototype — con Teléfono, Pago, Semanas dinámicas, turnos 1h30, opción de Modificar reserva y encabezado fijo + selector de semanas
*/

import React, { useEffect, useMemo, useState } from "react";

const styles = `
:root{--bg:#f7fafc;--card:#ffffff;--muted:#e5e7eb;--green:#16a34a;--blue:#2563eb}
*{box-sizing:border-box}
body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,'Noto Sans',sans-serif;background:var(--bg);margin:0;padding:20px}
.app{max-width:1200px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:12px;position:sticky;top:0;background:var(--bg);z-index:50;padding:8px 0}
.card{background:var(--card);border-radius:12px;padding:14px;box-shadow:0 6px 18px rgba(2,6,23,0.06)}
.grid{display:grid;grid-template-columns:120px 1fr;margin-top:12px;gap:12px}
.timeCol{background:transparent}
.table{overflow:auto;max-height:70vh}
.table table{border-collapse:collapse;width:100%}
.table th{position:sticky;top:0;background:#fff;padding:8px;border-bottom:1px solid #eee;z-index:40}
.table td{padding:6px;border-bottom:1px solid #f3f4f6;min-width:110px}
.cell{height:48px;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer}
.free{background:linear-gradient(180deg,#ffffff,#f8fafc);color:#374151}
.reserved{background:linear-gradient(180deg,#ecfdf5,#dcfce7);color:var(--green);font-weight:600}
.cellSmall{font-size:12px;padding:6px}
.controls{display:flex;gap:8px;flex-wrap:wrap}
.statsGrid{display:flex;gap:12px;margin-top:12px;flex-wrap:wrap}
.stat{flex:1;padding:12px;border-radius:8px;min-width:260px}
.bar{height:12px;border-radius:6px;background:#e6edf9}
.barFill{height:100%;border-radius:6px;background:var(--blue)}
.sideList{max-height:320px;overflow:auto;margin-top:8px}
.modalBackdrop{position:fixed;inset:0;background:rgba(2,6,23,.35);display:flex;align-items:center;justify-content:center}
.modal{width:420px;background:#fff;padding:18px;border-radius:10px}
.input{width:100%;padding:8px;border-radius:6px;border:1px solid #e5e7eb;margin-top:8px}
.small{font-size:13px;color:#6b7280}
.weekSelector{display:flex;align-items:center;gap:8px;font-weight:600;margin-top:8px;flex-wrap:wrap}
`;

const DAYS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

function minutesToTime(m){
  const hh = String(Math.floor(m/60)).padStart(2,"0");
  const mm = String(m%60).padStart(2,"0");
  return `${hh}:${mm}`;
}

function generateSlots(){
  const slots = [];
  for(let m = 7*60; m <= 23*60+30; m+=30){
    slots.push(m);
  }
  return slots;
}
const SLOTS = generateSlots();

function getPriceForSlot(startMinutes){
  const hour = Math.floor(startMinutes/60);
  return hour < 16 ? 22000 : 30000;
}

function storageKey(){ return "padel_turnos_reservas_v5"; }

function startOfWeek(date){
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  d.setDate(diff);
  d.setHours(0,0,0,0);
  return d;
}
function addDays(date, days){
  const d = new Date(date);
  d.setDate(d.getDate()+days);
  return d;
}
function formatDateShort(d){ return d.getDate(); }
function monthName(d){ return d.toLocaleString("es-AR", { month:"long" }).toUpperCase(); }

export default function App(){
  const [reservas, setReservas] = useState(() => {
    try{
      const raw = localStorage.getItem(storageKey());
      return raw ? JSON.parse(raw) : {};
    }catch(e){ return {}; }
  });

  const [weekStart, setWeekStart] = useState(()=> startOfWeek(new Date()));
  const [selected, setSelected] = useState(null);
  const [name, setName] = useState("");
  const [telefono, setTelefono] = useState("");
  const [pago, setPago] = useState("");
  const [comment, setComment] = useState("");

  useEffect(()=>{ localStorage.setItem(storageKey(), JSON.stringify(reservas)); },[reservas]);

  const currentWeekDays = useMemo(()=> DAYS.map((d,i)=> addDays(weekStart,i)),[weekStart]);
  const weekKeyPrefix = weekStart.toISOString().slice(0,10);

  const reserve = ()=>{
    if(!selected) return;
    const { dayIndex, slot } = selected;
    const slotsToReserve = SLOTS.slice(SLOTS.indexOf(slot), SLOTS.indexOf(slot)+4);
    const conflict = slotsToReserve.some(s => reservas[`${weekKeyPrefix}_${dayIndex}_${s}`]);
    if(conflict){ alert("Parte del turno ya está reservado"); return; }
    const data = { name: name || "Anónimo", telefono, pago, comment, price: getPriceForSlot(slot), createdAt: Date.now(), startSlot: slot };
    const nuevas = {...reservas};
    slotsToReserve.forEach(s => nuevas[`${weekKeyPrefix}_${dayIndex}_${s}`] = data);
    setReservas(nuevas);
    setSelected(null);
    setName(""); setTelefono(""); setPago(""); setComment("");
  };

  const modify = ()=>{
    if(!selected) return;
    const { dayIndex, slot } = selected;
    const base = reservas[`${weekKeyPrefix}_${dayIndex}_${slot}`];
    if(!base) return;
    const baseSlot = base.startSlot ?? slot;
    const slotsToUpdate = SLOTS.slice(SLOTS.indexOf(baseSlot), SLOTS.indexOf(baseSlot)+4);
    const nuevas = {...reservas};
    const updated = {...base, name, telefono, pago, comment};
    slotsToUpdate.forEach(s => nuevas[`${weekKeyPrefix}_${dayIndex}_${s}`] = updated);
    setReservas(nuevas);
    setSelected(null);
  };

  const release = ()=>{
    if(!selected) return;
    const { dayIndex, slot } = selected;
    const base = reservas[`${weekKeyPrefix}_${dayIndex}_${slot}`];
    if(!base) return;
    const baseSlot = base.startSlot ?? slot;
    const slotsToFree = SLOTS.slice(SLOTS.indexOf(baseSlot), SLOTS.indexOf(baseSlot)+4);
    const nuevas = {...reservas};
    slotsToFree.forEach(s => delete nuevas[`${weekKeyPrefix}_${dayIndex}_${s}`]);
    setReservas(nuevas);
    setSelected(null);
  };

  const toggleCell = (dayIndex, slot)=>{
    const key = `${weekKeyPrefix}_${dayIndex}_${slot}`;
    const r = reservas[key];
    setSelected({dayIndex, slot});
    if(r){ setName(r.name||""); setTelefono(r.telefono||""); setPago(r.pago||""); setComment(r.comment||""); }
    else { setName(""); setTelefono(""); setPago(""); setComment(""); }
  };

  const stats = useMemo(()=>{
    const unique = {};
    Object.keys(reservas).forEach(k=>{
      if(!k.startsWith(weekKeyPrefix)) return;
      const r = reservas[k];
      if(!r.startSlot) return;
      const id = `${k.split("_")[1]}_${r.startSlot}_${r.name}`;
      if(!unique[id]) unique[id] = true;
    });
    const perDay = Array(7).fill(0);
    let income = 0;
    Object.keys(unique).forEach(id=>{
      const [dayIndex, startSlot] = id.split("_");
      perDay[dayIndex]++;
      income += getPriceForSlot(Number(startSlot));
    });
    const maxPerDay = Math.max(...perDay,1);
    return { perDay, reservedCount: Object.keys(unique).length, income, maxPerDay };
  },[reservas,weekKeyPrefix]);

  const upcoming = useMemo(()=>{
    const items = [];
    const seen = new Set();
    Object.entries(reservas).forEach(([k,r])=>{
      if(!k.startsWith(weekKeyPrefix)) return;
      const parts = k.split("_");
      const dIndex = Number(parts[1]);
      const slot = r.startSlot ?? Number(parts[2]);
      const id = `${dIndex}_${slot}_${r.name}`;
      if(seen.has(id)) return;
      seen.add(id);
      items.push({key:k,day:DAYS[dIndex],time:minutesToTime(slot),...r});
    });
    items.sort((a,b)=>a.key.localeCompare(b.key));
    return items.slice(0,30);
  },[reservas,weekKeyPrefix]);

  const handleWeekChange = (e)=>{
    const value = e.target.value;
    const [year, week] = value.split("-W").map(Number);
    const simple = new Date(year, 0, (week - 1) * 7 + 1);
    setWeekStart(startOfWeek(simple));
  };

  return (
    <div className="app">
      <style>{styles}</style>

      <div className="header">
        <div>
          <h2>Gestor de Turnos — Cancha de Pádel</h2>
          <div className="small">Turnos: Lunes a Domingo · 07:00 — 23:30 · Duración 1h30</div>
          <div className="weekSelector">
            <button className="card" onClick={()=>setWeekStart(addDays(weekStart,-7))}>◀ Semana anterior</button>
            <div>{monthName(weekStart)} {weekStart.getFullYear()}</div>
            <button className="card" onClick={()=>setWeekStart(addDays(weekStart,7))}>Semana siguiente ▶</button>
            <input type="week" onChange={handleWeekChange} style={{padding:"6px",border:"1px solid #ccc",borderRadius:6}}/>
          </div>
        </div>
        <div className="controls">
          <button className="card" onClick={()=>{localStorage.removeItem(storageKey()); setReservas({});}}>Reset local</button>
          <button className="card" onClick={()=>{navigator.clipboard?.writeText(JSON.stringify(reservas)); alert("Reservas copiadas")}}>Copiar JSON</button>
        </div>
      </div>

      <div className="grid">
        <div className="timeCol card">
          <strong>Reservas — Semana actual</strong>
          <div className="sideList">
            {upcoming.length===0 ? <div className="small">No hay reservas</div> :
              upcoming.map(it=>(
                <div key={it.key} style={{padding:"8px 0",borderBottom:"1px solid #f3f4f6"}}>
                  <div style={{fontWeight:700}}>{it.name} <span className="small">· {it.day} {it.time}</span></div>
                  <div className="small">
                    {it.telefono && <>📞 {it.telefono} · </>}
                    {it.pago && <>💰 {it.pago} · </>}
                    {it.comment} · ${it.price.toLocaleString()}
                  </div>
                </div>
              ))
            }
          </div>
          <div style={{marginTop:12}}>
            <strong>Totales</strong>
            <div className="small">Turnos reservados: {stats.reservedCount}</div>
            <div className="small">Ingreso estimado semanal: ${stats.income.toLocaleString()}</div>
          </div>
        </div>

        <div>
          <div className="card table">
            <table>
              <thead>
                <tr>
                  <th>Hora</th>
                  {currentWeekDays.map((d,i)=>(<th key={i}>{DAYS[i]} {formatDateShort(d)}</th>))}
                </tr>
              </thead>
              <tbody>
                {SLOTS.map(slot=>(
                  <tr key={slot}>
                    <td><strong>{minutesToTime(slot)}</strong></td>
                    {currentWeekDays.map((_,di)=>{
                      const key = `${weekKeyPrefix}_${di}_${slot}`;
                      const r = reservas[key];
                      const colorStyle = r?.pago === "Pagó" ? {background:"#d1fae5"} :
                                         r?.pago === "Seña" ? {background:"#fef9c3"} :
                                         r ? {background:"#fee2e2"} : {};
                      return (
                        <td key={key}>
                          <div className={`cell ${r?"reserved":"free"}`} style={colorStyle} onClick={()=>toggleCell(di,slot)}>
                            <div className="cellSmall" style={{textAlign:"center"}}>
                              {r ? (
                                <>
                                  <div style={{fontWeight:700}}>{r.name}</div>
                                  <div className="small">{r.pago || ""} {r.telefono?`· ${r.telefono}`:""}</div>
                                </>
                              ):<div className="small">LIBRE</div>}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="statsGrid">
            <div className="card stat">
              <strong>Ocupación por día</strong>
              <div style={{marginTop:8}}>
                {stats.perDay.map((v,i)=>(
                  <div key={i} style={{marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <div>{DAYS[i]}</div><div className="small">{v} reservas</div>
                    </div>
                    <div className="bar" style={{marginTop:6}}>
                      <div className="barFill" style={{width:`${(v/stats.maxPerDay||0)*100}%`}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card stat">
              <strong>Ingresos</strong>
              <div style={{marginTop:8}}>
                <div className="small">Ingreso semanal estimado</div>
                <div style={{fontSize:18,fontWeight:700,marginTop:8}}>${stats.income.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selected && (
        <div className="modalBackdrop" onClick={()=>setSelected(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h3>{DAYS[selected.dayIndex]} · {minutesToTime(selected.slot)}</h3>
            <div className="small">Precio: ${getPriceForSlot(selected.slot).toLocaleString()}</div>
            <input className="input" placeholder="Nombre del que reserva" value={name} onChange={e=>setName(e.target.value)} />
            <input className="input" placeholder="Teléfono" value={telefono} onChange={e=>setTelefono(e.target.value)} />
            <select className="input" value={pago} onChange={e=>setPago(e.target.value)}>
              <option value="">Pago...</option>
              <option value="Pagó">Pagó</option>
              <option value="Seña">Seña</option>
              <option value="Falta abonar">Falta abonar</option>
            </select>
            <input className="input" placeholder="Comentario (opcional)" value={comment} onChange={e=>setComment(e.target.value)} />
            <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:12}}>
              {reservas[`${weekKeyPrefix}_${selected.dayIndex}_${selected.slot}`] ? (
                <>
                  <button className="card" onClick={modify}>Modificar</button>
                  <button className="card" onClick={release}>Liberar</button>
                </>
              ) : (
                <button className="card" onClick={reserve}>Reservar</button>
              )}
              <button className="card" onClick={()=>setSelected(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
