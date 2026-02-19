import React, { useEffect, useState } from "react";

const API_URL =
  "https://script.google.com/macros/s/AKfycby0yAI9GTxAb2ADZ6TFNJu-xYoHG6P44tlMk8X2lLRJUYMXr1dIQ213Bsp6OL1gv94V/exec";

/* ===================== ESTILOS ===================== */
const styles = `
body{font-family:Inter,system-ui;background:#f7fafc;margin:0;padding:20px}
.app{max-width:1200px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.card{background:#fff;border-radius:12px;padding:10px 14px;box-shadow:0 6px 18px rgba(2,6,23,0.06);cursor:pointer}
.table{overflow:auto;max-height:70vh}
table{border-collapse:collapse;width:100%}
th,td{padding:6px;border-bottom:1px solid #eee;text-align:center}

.cell{
  height:44px;
  border-radius:8px;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  font-size:12px;
}

.free{background:#dcfce7}
.reserved{background:#fef3c7;font-weight:600}

.modalBackdrop{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center}
.modal{width:420px;background:#fff;padding:18px;border-radius:10px}
.input{width:100%;padding:8px;border-radius:6px;border:1px solid #ddd;margin-top:8px}
textarea{resize:none}
`;

/* ===================== HELPERS ===================== */
const DAYS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
const SLOTS = Array.from({ length: 34 }, (_, i) => 7 * 60 + i * 30);

const minutesToTime = (m) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const startOfWeek = (d) => {
  const date = new Date(d);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  date.setHours(0,0,0,0);
  return date;
};

const addDays = (d, n) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

const parseSenia = (obs="") => {
  const m = obs.match(/(\d{3,})/);
  return m ? Number(m[1]) : 0;
};

/* ===================== APP ===================== */
export default function App() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [reservas, setReservas] = useState({});
  const [selected, setSelected] = useState(null);

  const [name, setName] = useState("");
  const [telefono, setTelefono] = useState("");
  const [pago, setPago] = useState("");
  const [obs, setObs] = useState("");

  /* ================= CARGAR RESERVAS ================= */
  const cargarReservas = () => {
    fetch(`${API_URL}?action=reservas`)
      .then(r => r.json())
      .then(rows => {
        if (!Array.isArray(rows)) return;

        const map = {};
        const weekEnd = addDays(weekStart, 7);

        rows.forEach(r => {
          const fecha = new Date(r.fecha + "T12:00:00");
          if (fecha < weekStart || fecha >= weekEnd) return;

          const [h,m] = r.hora.split(":").map(Number);
          const start = h*60 + m;
          const idx = SLOTS.indexOf(start);
          if (idx === -1) return;

          // 90 min = 4 celdas
          SLOTS.slice(idx, idx+4).forEach(slot => {
            map[`${r.fecha}_${slot}`] = r;
          });
        });

        setReservas(map);
      });
  };

  useEffect(cargarReservas, [weekStart]);

  /* ================= RESERVAR ================= */
  const reserve = async () => {
    if (!name) return alert("Falta nombre");

    const fecha = addDays(weekStart, selected.dayIndex)
      .toISOString().slice(0,10);

    const res = await fetch(API_URL,{
      method:"POST",
      headers:{ "Content-Type":"text/plain;charset=utf-8" },
      body:JSON.stringify({
        action:"reservar",
        fecha,
        hora: minutesToTime(selected.slot),
        cliente:name,
        telefono,
        medio_pago:pago||"Reserva",
        monto:30000,
        observaciones:obs
      })
    });

    const data = JSON.parse(await res.text());
    if(!data.ok) return alert("Error al guardar");

    setSelected(null);
    setName(""); setTelefono(""); setPago(""); setObs("");
    cargarReservas();
  };

  const days = DAYS.map((_,i)=>addDays(weekStart,i));

  return (
    <div className="app">
      <style>{styles}</style>

      <div className="header">
        <h2>Gestor de Turnos — Pádel</h2>
        <div style={{display:"flex",gap:8}}>
          <button className="card" onClick={()=>setWeekStart(addDays(weekStart,-7))}>◀</button>
          <button className="card" onClick={()=>setWeekStart(addDays(weekStart,7))}>▶</button>
        </div>
      </div>

      <div className="card table">
        <table>
          <thead>
            <tr>
              <th>Hora</th>
              {days.map((d,i)=>(
                <th key={i}>{DAYS[i]} {d.getDate()}/{d.getMonth()+1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map(slot=>(
              <tr key={slot}>
                <td>{minutesToTime(slot)}</td>
                {days.map((d,di)=>{
                  const fecha = d.toISOString().slice(0,10);
                  const r = reservas[`${fecha}_${slot}`];
                  const saldo = r ? r.monto - parseSenia(r.observaciones) : 0;

                  const tooltip = r
                    ? `${r.cliente}
Tel: ${r.telefono || "-"}
Pago: ${r.medio_pago || "-"}
Obs: ${r.observaciones || "-"}`
                    : "";

                  return (
                    <td key={di}>
                      <div
                        title={tooltip}
                        className={`cell ${r?"reserved":"free"}`}
                        onClick={()=>!r && setSelected({dayIndex:di,slot})}
                      >
                        {r ? (
                          <>
                            <div>{r.cliente}</div>
                            {r.medio_pago==="Reserva" && saldo>0 &&
                              <div>${saldo} pendiente</div>}
                          </>
                        ) : "LIBRE"}
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
            <input className="input" placeholder="Teléfono" value={telefono} onChange={e=>setTelefono(e.target.value)} />

            <select className="input" value={pago} onChange={e=>setPago(e.target.value)}>
              <option value="">Estado del pago</option>
              <option value="Reserva">Reserva / Seña</option>
              <option value="Efectivo">Efectivo</option>
              <option value="MercadoPago">MercadoPago</option>
              <option value="Transferencia">Transferencia</option>
            </select>

            <textarea className="input" placeholder="Observaciones" value={obs} onChange={e=>setObs(e.target.value)} />

            <div style={{marginTop:12,display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button className="card" onClick={reserve}>Aceptar</button>
              <button className="card" onClick={()=>setSelected(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
