/* ===================== APP ===================== */
export default function App() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [reservas, setReservas] = useState({});
  const [selected, setSelected] = useState(null);

  const [name, setName] = useState("");
  const [telefono, setTelefono] = useState("");
  const [pago, setPago] = useState("");
  const [obs, setObs] = useState("");

  /* ======= CARGAR RESERVAS (FIX DEFINITIVO) ======= */
  const cargarReservas = () => {
    fetch(`${API_URL}?action=reservas`)
      .then((r) => r.json())
      .then((rows) => {
        const map = {};

        rows.forEach((r) => {
          if (!r.fecha || !r.hora) return;

          const [h, m] = r.hora.split(":").map(Number);
          const startSlot = h * 60 + m;
          const idx = SLOTS.indexOf(startSlot);

          if (idx === -1) return; // ⛔ protección clave

          // 🔥 90 minutos = 4 celdas
          SLOTS.slice(idx, idx + 4).forEach((s) => {
            map[`${r.fecha}_${s}`] = r;
          });
        });

        setReservas(map);
      })
      .catch(err => console.error("Error cargando reservas", err));
  };

  // ⬅️ SOLO UNA VEZ
  useEffect(cargarReservas, []);

  /* ======= RESERVAR ======= */
  const reserve = async () => {
    if (!name) return alert("Falta el nombre");

    const { dayIndex, slot } = selected;
    const fecha = addDays(weekStart, dayIndex).toISOString().slice(0, 10);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "reservar",
          fecha,
          hora: minutesToTime(slot),
          cliente: name,
          telefono,
          medio_pago: pago || "Reserva",
          monto: getPriceForSlot(slot),
          observaciones: obs,
        }),
      });

      const data = JSON.parse(await res.text());
      if (!data.ok) throw new Error(data.error);

      setSelected(null);
      setName("");
      setTelefono("");
      setPago("");
      setObs("");

      cargarReservas(); // 🔄 refresca grilla

    } catch (e) {
      alert("No se pudo guardar la reserva");
      console.error(e);
    }
  };

  const toggleCell = (dayIndex, slot) => {
    setSelected({ dayIndex, slot });
    setName("");
    setTelefono("");
    setPago("");
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
                <th key={i}>
                  {DAYS[i]} {d.getDate()}/{d.getMonth() + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map((slot) => (
              <tr key={slot}>
                <td>{minutesToTime(slot)}</td>
                {days.map((d, di) => {
                  const fecha = d.toISOString().slice(0, 10);
                  const r = reservas[`${fecha}_${slot}`];
                  const senia = r ? parseSenia(r.observaciones) : 0;
                  const saldo = r ? r.monto - senia : 0;

                  return (
                    <td key={di}>
                      <div
                        className={`cell ${r ? "reserved" : "free"}`}
                        onClick={() => !r && toggleCell(di, slot)}
                      >
                        {r ? (
                          <>
                            <div>{r.cliente}</div>
                            {r.medio_pago === "Reserva" && saldo > 0 && (
                              <div>${saldo} pendiente</div>
                            )}
                          </>
                        ) : (
                          "LIBRE"
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* modal igual al tuyo */}
    </div>
  );
}
