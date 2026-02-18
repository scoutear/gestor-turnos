/*
Padel Turnos - Web App REAL
Backend: Google Apps Script + Google Sheets
*/

import React, { useEffect, useState } from "react";

const API_URL =
  "https://script.google.com/macros/s/AKfycbx_E3njVwxtTJRjW-sm9tTkOsI7VAobp6GgTPb_HowWRm4ag0LkrmQ24PGRFjUN6VzO/exec";

/* ===================== ESTILOS ===================== */
const styles = `
:root{--bg:#f7fafc;--card:#ffffff}
*{box-sizing:border-box}
body{font-family:Inter,system-ui;background:var(--bg);margin:0;padding:20px}
.app{max-width:1200px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.card{background:var(--card);border-radius:12px;padding:14px;box-shadow:0 6px 18px rgba(2,6,23,0.06);cursor:pointer}
.table{overflow:auto;max-height:70vh}
table{border-collapse:collapse;width:100%}
th,td{padding:6px;border-bottom:1px solid #eee}
.cell{height:44px;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer}
.free{background:#f8fafc}
.reserved{background:#dcfce7;font-weight:600}
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
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (d, n) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

const getPriceForSlot = (m) => (Math.floor(m / 60) < 16 ? 22000 : 30000);

/* ===================== APP ===================== */
export default function App() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [reservas, setReservas] = useState({});
  const [selected, setSelected] = useState(null);

  const [name, setName] = useState("");
  const [telefono, setTelefono] = useState("");
  const [medioPago, setMedioPago] = useState("");
  const [estado, setEstado] = useState("Reserva");
  const [obs, setObs] = useState("");

  const weekKey = weekStart.toISOString().slice(0, 10);

  /* ======= CARGAR RESERVAS ======= */
  const cargarReservas = () => {
    fetch(`${API_URL}?action=reservas`)
      .then((r) => r.json())
      .then((rows) => {
        const map = {};
        rows.forEach((r) => {
          const date = new Date(r.fecha);
          const ws = startOfWeek(date).toISOString().slice(0, 10);
          const dayIndex = (date.getDay() + 6) % 7;
          const [h, m] = r.hora.split(":").map(Number);
          const startSlot = h * 60 + m;

          SLOTS.slice(
            SLOTS.indexOf(startSlot),
            SLOTS.indexOf(startSlot) + 4
          ).forEach((s) => {
            map[`${ws}_${dayIndex}_${s}`] = r;
          });
        });
        setReservas(map);
      });
  };

  useEffect(cargarReservas, []);

  /* ======= RESERVAR ======= */
  const reserve = async () => {
    if (!name) return alert("Falta el nombre");

    const { dayIndex, slot } = selected;
    const fecha = addDays(weekStart, dayIndex).toISOString().slice(0, 10);

    const payload = {
      action: "reservar",
      fecha,
      hora: minutesToTime(slot),
      cliente: name,
      telefono,
      estado,
      medio_pago: medioPago,
      monto: getPriceForSlot(slot),
      observaciones: obs
    };

    try {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      setSelected(null);
      setName("");
      setTelefono("");
      setMedioPago("");
      setEstado("Reserva");
      setObs("");

      cargarReservas();
    } catch {
      alert("No se pudo guardar la reserva");
    }
  };

  const toggleCell = (dayIndex, slot) => {
    setSelected({ dayIndex, slot });
    setName("");
    setTelefono("");
    setMedioPago("");
    setEstado("Reserva");
    setObs("");
  };

  const days = DAYS.map((_, i) => addDays(weekStart, i));

  return (
    <div className="app">
      <style>{styles}</style>

      <div className="header">
        <h2>Gestor de Turnos — Pádel</h2>
        <div>
          <button className="card" onClick={() => setWeekStart(addDays(weekStart, -7))}>◀</button>
          <button className="card" onClick={() => setWeekStart(addDays(weekStart, 7))}>▶</button>
        </div>
      </div>

      <div className="card table">
        <table>
          <thead>
            <tr>
              <th>Hora</th>
              {days.map((d, i) => (
                <th key={i}>{DAYS[i]} {d.getDate()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map((slot) => (
              <tr key={slot}>
                <td>{minutesToTime(slot)}</td>
                {days.map((_, di) => {
                  const r = reservas[`${weekKey}_${di}_${slot}`];
                  return (
                    <td key={di}>
                      <div
                        className={`cell ${r ? "reserved" : "free"}`}
                        onClick={() => toggleCell(di, slot)}
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
        <div className="modalBackdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{DAYS[selected.dayIndex]} {minutesToTime(selected.slot)}</h3>

            <input className="input" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="input" placeholder="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />

            <select className="input" value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="Reserva">Reserva / Seña</option>
              <option value="Pagado">Pagado</option>
            </select>

            <select className="input" value={medioPago} onChange={(e) => setMedioPago(e.target.value)}>
              <option value="">Medio de pago…</option>
              <option value="Efectivo">Efectivo</option>
              <option value="MercadoPago">MercadoPago</option>
              <option value="Transferencia">Transferencia</option>
            </select>

            <textarea
              className="input"
              placeholder="Observaciones (ej: seña $10.000)"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
            />

            <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="card" onClick={reserve}>Aceptar</button>
              <button className="card" onClick={() => setSelected(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
