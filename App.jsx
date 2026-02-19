import React, { useEffect, useState } from "react";

const API_URL = "https://script.google.com/macros/s/AKfycbwU1x6NRHcKPjUfKopkDHOl5TJg7hPgfKqGfZ8eclC95mGD1VjIPlgaUXxBEC3x8U4/exec";

/* ===================== ESTILOS ===================== */
const styles = `
body{font-family:Inter,system-ui;background:#f7fafc;margin:0;padding:20px}
.app{max-width:1200px;margin:0 auto}
.header{margin-bottom:14px}
.card{background:#fff;border-radius:12px;padding:14px;box-shadow:0 6px 18px rgba(2,6,23,0.06)}
.table{overflow:auto;max-height:70vh}
table{border-collapse:collapse;width:100%}
th,td{padding:6px;border-bottom:1px solid #eee}

.cell{
  height:44px;
  border-radius:8px;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:12px;
  cursor:pointer;
}

.free{background:#dcfce7}
.reserved{background:#fef3c7;font-weight:600}

.modalBackdrop{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center}
.modal{width:420px;background:#fff;padding:18px;border-radius:10px}
.input{width:100%;padding:8px;border-radius:6px;border:1px solid #ddd;margin-top:8px}
`;

const DAYS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
const SLOTS = Array.from({ length: 34 }, (_, i) => 7 * 60 + i * 30);

const minutesToTime = m =>
  `${String(Math.floor(m / 60)).padStart(2,"0")}:${String(m % 60).padStart(2,"0")}`;

const startOfWeek = d => {
  const r = new Date(d);
  const day = r.getDay() || 7;
  r.setDate(r.getDate() - day + 1);
  r.setHours(0,0,0,0);
  return r;
};

const addDays = (d,n) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

export default function App() {
  const [weekStart] = useState(startOfWeek(new Date()));
  const [reservas, setReservas] = useState({});
  const [selected, setSelected] = useState(null);

  const [name, setName] = useState("");
  const [tel, setTel] = useState("");
  const [pago, setPago] = useState("");
  const [obs, setObs] = useState("");

  const cargarReservas = () => {
    fetch(`${API_URL}?action=reservas`)
      .then(r => r.json())
      .then(rows => {
        const map = {};
        rows.forEach(r => {
          const [h,m] = r.hora.split(":").map(Number);
          const start = h*60 + m;
          const idx = SLOTS.indexOf(start);
          if (idx === -1) return;

          SLOTS.slice(idx, idx+4).forEach(s => {
            map[`${r.fecha}_${s}`] = r;
          });
        });
        setReservas(map);
      });
  };

  useEffect(cargarReservas, []);

  const reservar = async () => {
    const fecha = addDays(weekStart, selected.dayIndex)
      .toISOString().slice(0,10);

    const res = await fetch(API_URL, {
      method:"POST",
      headers:{ "Content-Type":"text/plain;charset=utf-8" },
      body: JSON.stringify({
        action:"reservar",
        fecha,
        hora: minutesToTime(selected.slot),
        cliente:name,
        telefono:tel,
        medio_pago:pago,
        monto:30000,
        observaciones:obs
      })
    });

    const data = await res.json();
    if (!data.ok) return alert(data.error);

    setSelected(null);
    setName(""); setTel(""); setPago(""); setObs("");
    cargarReservas();
  };

  const days = DAYS.map((_,i)=>addDays(weekStart,i));

  return (
    <div className="app">
      <style>{styles}</style>
      <div className="header"><h2>Gestor de Turnos — Pádel</h2></div>

      <div className="card table">
        <table>
          <thead>
            <tr>
              <th>Hora</th>
              {days.map((d,i)=>
                <th key={i}>{DAYS[i]} {d.getDate()}/{d.getMonth()+1}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map(slot=>(
              <tr key={slot}>
                <td>{minutesToTime(slot)}</td>
                {days.map((d,di)=>{
                  const fecha = d.toISOString().slice(0,10);
                  const r = reservas[`${fecha}_${slot}`];
                  return (
                    <td key={di}>
                      <div
                        className={`cell ${r?"reserved":"free"}`}
                        onClick={()=>!r && setSelected({dayIndex:di,slot})}
                      >
                        {r ? r.cliente : "LIBRE"}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modalBackdrop" onClick={()=>setSelected(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h3>{DAYS[selected.dayIndex]} {minutesToTime(selected.slot)}</h3>

            <input className="input" placeholder="Nombre" value={name} onChange={e=>setName(e.target.value)} />
            <input className="input" placeholder="Teléfono" value={tel} onChange={e=>setTel(e.target.value)} />
            <textarea className="input" placeholder="Obs" value={obs} onChange={e=>setObs(e.target.value)} />

            <button className="card" onClick={reservar}>Aceptar</button>
          </div>
        </div>
      )}
    </div>
  );
}
