import { useState, useCallback, useRef } from "react";

const MONO = "'Consolas','Courier New',monospace";
const NARROW = "'Arial Narrow','Trebuchet MS',Arial,sans-serif";

const C = {
  bg: "#060810",
  surface: "#0d1117",
  sidebar: "#080c14",
  border: "#1a2030",
  text: "#e8e8ec",
  muted: "#6b7280",
  dim: "#3d4452",
  red: "#c0152a",
  cyan: "#00d4ff",
  green: "#00ff88",
  amber: "#f5a623",
  purple: "#a78bfa",
  danger: "#ff3355",
};

function sev(s) {
  return s === "RED" ? C.danger : s === "YELLOW" ? C.amber : C.green;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function appendLog(g, cycle, text, severity) {
  return {
    ...g,
    log: [{ cycle, text, severity, id: Date.now() + Math.random() }, ...g.log].slice(0, 60),
  };
}

const EVENT_POOL = [
  {
    id: "rebel_attack",
    name: "Rebel Strike Force",
    severity: "RED",
    desc: "Rebel insurgents approaching the outer perimeter. Requesting authorization to engage.",
    respondLabel: "DEPLOY FORCES",
    dismissLabel: "STAND DOWN",
  },
  {
    id: "supply_convoy",
    name: "Supply Convoy Docked",
    severity: "GREEN",
    desc: "Imperial freighter has arrived at Bay 7. Awaiting unloading authorization.",
    respondLabel: "AUTHORIZE UNLOAD",
    dismissLabel: "DEFER",
  },
  {
    id: "defection",
    name: "Defection Detected",
    severity: "YELLOW",
    desc: "Intelligence reports a trooper cell may be planning to defect to the Rebellion.",
    respondLabel: "INVESTIGATE",
    dismissLabel: "IGNORE",
  },
  {
    id: "inspection",
    name: "Imperial Inspection",
    severity: "YELLOW",
    desc: "Grand Moff Tarkin has dispatched an inspection team. Base must be in order.",
    respondLabel: "PREPARE BASE",
    dismissLabel: "DISREGARD",
  },
  {
    id: "malfunction",
    name: "Critical Malfunction",
    severity: "YELLOW",
    desc: "Engineering reports a cascade failure in the power grid. Immediate repairs required.",
    respondLabel: "DISPATCH TECHS",
    dismissLabel: "MONITOR",
  },
  {
    id: "sabotage",
    name: "Rebel Sabotage",
    severity: "RED",
    desc: "Rebel operatives have breached the armory sector. Security lockdown initiated.",
    respondLabel: "LOCKDOWN",
    dismissLabel: "DISMISS",
  },
  {
    id: "reinforcements",
    name: "Reinforcements En Route",
    severity: "GREEN",
    desc: "High Command is dispatching additional troops to bolster your garrison.",
    respondLabel: "WELCOME TROOPS",
    dismissLabel: "DECLINE",
  },
  {
    id: "spy_report",
    name: "Spy Network Report",
    severity: "GREEN",
    desc: "Undercover agents report Rebel supply routes nearby. Intercept opportunity.",
    respondLabel: "INTERCEPT",
    dismissLabel: "IGNORE",
  },
];

const INIT_VEHICLES = [
  { id: 1, type: "AT-AT Walker", status: "READY", condition: 92, fuel: 85 },
  { id: 2, type: "TIE Fighter", status: "READY", condition: 78, fuel: 90 },
  { id: 3, type: "TIE Fighter", status: "MAINTENANCE", condition: 44, fuel: 60 },
  { id: 4, type: "AT-ST Walker", status: "READY", condition: 88, fuel: 75 },
  { id: 5, type: "Lambda Shuttle", status: "DEPLOYED", condition: 95, fuel: 40 },
  { id: 6, type: "Imperial Probe Droid", status: "READY", condition: 100, fuel: 95 },
];

const INIT_STATE = {
  cycle: 1,
  baseId: "OUTPOST-KAPPA-7",
  sector: "Outer Rim",
  credits: 15000,
  fuel: 120,
  food: 200,
  personnel: { stormtroopers: 850, officers: 42, technicians: 120, pilots: 35, morale: 78 },
  vehicles: INIT_VEHICLES,
  munitions: { blasterRifles: 1200, heavyWeapons: 85, explosives: 45, ionCannons: 12 },
  baseDefense: 74,
  alertLevel: "GREEN",
  events: [],
  log: [
    { cycle: 0, text: "Base operational. All systems nominal.", severity: "GREEN", id: 1 },
    { cycle: 0, text: "Commander Assigned to Outpost-Kappa-7.", severity: "GREEN", id: 2 },
  ],
};

function recalcAlert(g) {
  const hasRed = g.events.some((e) => e.severity === "RED");
  const hasYellow = g.events.some((e) => e.severity === "YELLOW");
  return { ...g, alertLevel: hasRed ? "RED" : hasYellow ? "YELLOW" : "GREEN" };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatBar({ label, value, max = 100, color }) {
  const pct = clamp((value / max) * 100, 0, 100);
  const warnColor = pct < 25 ? C.danger : pct < 50 ? C.amber : color;
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.dim, fontFamily: MONO, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>
        <span>{label}</span>
        <span style={{ color: warnColor }}>{value}/{max}</span>
      </div>
      <div style={{ height: 3, background: C.border, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: warnColor, borderRadius: 2, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

function ImperialCrest({ size = 32 }) {
  const c = size / 2;
  const r = c - 1;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={c} cy={c} r={r} fill="none" stroke={C.red} strokeWidth="1.5" />
      <circle cx={c} cy={c} r={r * 0.55} fill="none" stroke={C.red} strokeWidth="1" />
      <line x1={1} y1={c} x2={size - 1} y2={c} stroke={C.red} strokeWidth="1" />
      <line x1={c} y1={1} x2={c} y2={size - 1} stroke={C.red} strokeWidth="1" />
      <line x1={c - r * 0.7} y1={c - r * 0.7} x2={c + r * 0.7} y2={c + r * 0.7} stroke={C.red} strokeWidth="0.7" opacity="0.5" />
      <line x1={c + r * 0.7} y1={c - r * 0.7} x2={c - r * 0.7} y2={c + r * 0.7} stroke={C.red} strokeWidth="0.7" opacity="0.5" />
      <circle cx={c} cy={c} r={r * 0.18} fill={C.red} />
    </svg>
  );
}

function Toast({ text, color }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${color}55`, borderLeft: `3px solid ${color}`, padding: "8px 14px", fontSize: 12, color, fontFamily: MONO, borderRadius: 4, boxShadow: `0 4px 20px #00000088`, animation: "toastIn 0.3s ease" }}>
      ▸ {text}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ImperialCommand() {
  const [game, setGame] = useState(INIT_STATE);
  const [tab, setTab] = useState("command");
  const [toasts, setToasts] = useState([]);
  const [advancing, setAdvancing] = useState(false);
  const toastRef = useRef(0);

  const toast = useCallback((text, color = C.cyan) => {
    const id = ++toastRef.current;
    setToasts((t) => [...t, { id, text, color }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  const totalPersonnel = (p) => p.stormtroopers + p.officers + p.technicians + p.pilots;

  const advanceCycle = useCallback(() => {
    if (advancing) return;
    setAdvancing(true);
    setTimeout(() => {
      setGame((prev) => {
        let g = { ...prev, cycle: prev.cycle + 1 };
        const total = totalPersonnel(g.personnel);
        const foodCost = Math.ceil(total * 0.018);
        const fuelCost = g.vehicles.filter((v) => v.status !== "MAINTENANCE").length * 2;
        const income = 500 + g.personnel.officers * 60;

        g.food = clamp(g.food - foodCost, 0, 999);
        g.fuel = clamp(g.fuel - fuelCost, 0, 999);
        g.credits += income;

        let moraleDelta = 0;
        if (g.food < 20) moraleDelta -= 8;
        if (g.fuel < 10) moraleDelta -= 4;
        if (g.baseDefense > 80) moraleDelta += 1;
        g.personnel = { ...g.personnel, morale: clamp(g.personnel.morale + moraleDelta, 0, 100) };

        g.vehicles = g.vehicles.map((v) => ({
          ...v,
          fuel: v.status === "DEPLOYED" ? clamp(v.fuel - 8, 0, 100) : clamp(v.fuel - 1, 0, 100),
          condition: v.status === "DEPLOYED" ? clamp(v.condition - 2, 0, 100) : v.condition,
          status: v.fuel <= 8 && v.status === "DEPLOYED" ? "MAINTENANCE" : v.status,
        }));

        if (Math.random() < 0.55 && g.events.length < 3) {
          const template = EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)];
          const event = { ...template, eid: Date.now() + Math.random(), cycle: g.cycle };
          g.events = [...g.events, event];
          g = appendLog(g, g.cycle, `INCOMING: ${event.name} — ${event.desc}`, event.severity);
        }

        g = appendLog(g, g.cycle, `Cycle ${g.cycle} complete. +${income} credits. −${foodCost} food, −${fuelCost} fuel.`, "GREEN");
        g = recalcAlert(g);
        return g;
      });
      setAdvancing(false);
    }, 600);
  }, [advancing]);

  const resolveEvent = useCallback((eid, action) => {
    setGame((prev) => {
      const event = prev.events.find((e) => e.eid === eid);
      if (!event) return prev;
      let g = { ...prev, events: prev.events.filter((e) => e.eid !== eid) };

      if (action === "respond") {
        if (event.id === "rebel_attack") {
          const lost = Math.floor(Math.random() * 25) + 10;
          g.personnel = { ...g.personnel, stormtroopers: clamp(g.personnel.stormtroopers - lost, 0, 9999) };
          g.munitions = { ...g.munitions, blasterRifles: clamp(g.munitions.blasterRifles - 150, 0, 9999) };
          g = appendLog(g, g.cycle, `Rebel attack repelled. ${lost} troopers KIA. 150 blaster charges expended.`, "YELLOW");
          setTimeout(() => toast(`Attack repelled — ${lost} casualties`, C.amber), 0);
        } else if (event.id === "supply_convoy") {
          g.credits += 1200; g.fuel = clamp(g.fuel + 25, 0, 999); g.food = clamp(g.food + 35, 0, 999);
          g = appendLog(g, g.cycle, "Supply convoy processed. +1200 credits, +25 fuel, +35 food.", "GREEN");
          setTimeout(() => toast("Supply convoy processed!", C.green), 0);
        } else if (event.id === "defection") {
          const lost = Math.floor(event.id === "defection" ? 8 : 0);
          g.personnel = { ...g.personnel, stormtroopers: clamp(g.personnel.stormtroopers - 8, 0, 9999), morale: clamp(g.personnel.morale - 3, 0, 100) };
          g = appendLog(g, g.cycle, "Defection cell contained. 8 detained. Morale slightly affected.", "YELLOW");
          setTimeout(() => toast("Defection contained", C.amber), 0);
        } else if (event.id === "inspection") {
          g.credits += 2500; g.personnel = { ...g.personnel, morale: clamp(g.personnel.morale + 15, 0, 100) };
          g = appendLog(g, g.cycle, "Inspection passed. Imperial commendation received. +2500 credits, +15 morale.", "GREEN");
          setTimeout(() => toast("Inspection passed! +2500 credits", C.green), 0);
        } else if (event.id === "malfunction") {
          g.credits = clamp(g.credits - 400, 0, 9999999);
          const idx = g.vehicles.findIndex((v) => v.status === "MAINTENANCE");
          if (idx >= 0) g.vehicles = g.vehicles.map((v, i) => i === idx ? { ...v, status: "READY", condition: 80 } : v);
          g = appendLog(g, g.cycle, "Techs dispatched. Grid restored. Repair cost: 400 credits.", "GREEN");
          setTimeout(() => toast("Malfunction resolved", C.green), 0);
        } else if (event.id === "sabotage") {
          g.baseDefense = clamp(g.baseDefense - 5, 0, 100);
          g = appendLog(g, g.cycle, "Lockdown effective. Saboteurs neutralised. Minor defense loss.", "YELLOW");
          setTimeout(() => toast("Sabotage neutralised", C.amber), 0);
        } else if (event.id === "reinforcements") {
          g.personnel = { ...g.personnel, stormtroopers: g.personnel.stormtroopers + 120 };
          g = appendLog(g, g.cycle, "Reinforcements integrated. +120 stormtroopers.", "GREEN");
          setTimeout(() => toast("Reinforcements arrived! +120 troops", C.green), 0);
        } else if (event.id === "spy_report") {
          g.credits += 1800;
          g = appendLog(g, g.cycle, "Rebel convoy intercepted. Cargo seized. +1800 credits.", "GREEN");
          setTimeout(() => toast("Convoy intercepted! +1800 credits", C.green), 0);
        }
      } else {
        if (event.id === "rebel_attack") {
          g.baseDefense = clamp(g.baseDefense - 18, 0, 100);
          g = appendLog(g, g.cycle, "WARNING: Rebel attack uncontested. Base defense −18.", "RED");
          setTimeout(() => toast("Base defense compromised!", C.danger), 0);
        } else if (event.id === "defection") {
          g.personnel = { ...g.personnel, stormtroopers: clamp(g.personnel.stormtroopers - 20, 0, 9999), morale: clamp(g.personnel.morale - 10, 0, 100) };
          g = appendLog(g, g.cycle, "Defectors escaped. 20 personnel lost. Morale −10.", "RED");
          setTimeout(() => toast("Defectors escaped!", C.danger), 0);
        } else if (event.id === "malfunction") {
          g.credits = clamp(g.credits - 900, 0, 9999999);
          const rIdx = g.vehicles.findIndex((v) => v.status === "READY");
          if (rIdx >= 0) g.vehicles = g.vehicles.map((v, i) => i === rIdx ? { ...v, status: "MAINTENANCE", condition: clamp(v.condition - 35, 5, 100) } : v);
          g = appendLog(g, g.cycle, "Cascade failure unaddressed. Vehicle disabled. −900 credits.", "RED");
          setTimeout(() => toast("Equipment destroyed!", C.danger), 0);
        } else if (event.id === "sabotage") {
          g.baseDefense = clamp(g.baseDefense - 22, 0, 100);
          g.munitions = { ...g.munitions, explosives: clamp(g.munitions.explosives - 15, 0, 9999) };
          g = appendLog(g, g.cycle, "Sabotage successful. Armory damaged. Defense −22.", "RED");
          setTimeout(() => toast("Base sabotaged!", C.danger), 0);
        } else if (event.id === "supply_convoy") {
          g = appendLog(g, g.cycle, "Supply convoy sent away. Resources forfeited.", "YELLOW");
          setTimeout(() => toast("Convoy turned away", C.amber), 0);
        } else if (event.id === "inspection") {
          g.credits = clamp(g.credits - 1000, 0, 9999999);
          g.personnel = { ...g.personnel, morale: clamp(g.personnel.morale - 8, 0, 100) };
          g = appendLog(g, g.cycle, "Inspection failed. Penalty issued. −1000 credits, −8 morale.", "RED");
          setTimeout(() => toast("Inspection failed!", C.danger), 0);
        } else {
          g = appendLog(g, g.cycle, `${event.name} dismissed.`, "YELLOW");
          setTimeout(() => toast("Event dismissed", C.muted), 0);
        }
      }
      return recalcAlert(g);
    });
  }, [toast]);

  const repairVehicle = useCallback((vid) => {
    setGame((prev) => {
      const v = prev.vehicles.find((x) => x.id === vid);
      if (!v) return prev;
      const cost = Math.ceil((100 - v.condition) * 14);
      if (prev.credits < cost) { setTimeout(() => toast(`Need ${cost} credits to repair`, C.danger), 0); return prev; }
      setTimeout(() => toast(`${v.type} repaired`, C.green), 0);
      let g = appendLog(prev, prev.cycle, `${v.type} #${vid} repaired. Cost: ${cost} credits.`, "GREEN");
      return { ...g, credits: g.credits - cost, vehicles: g.vehicles.map((x) => x.id === vid ? { ...x, status: "READY", condition: 100, fuel: 100 } : x) };
    });
  }, [toast]);

  const procure = useCallback((label, applyFn, cost) => {
    setGame((prev) => {
      if (prev.credits < cost) { setTimeout(() => toast("Insufficient credits", C.danger), 0); return prev; }
      setTimeout(() => toast(`${label} acquired`, C.green), 0);
      const g = applyFn({ ...prev, credits: prev.credits - cost });
      return appendLog(g, g.cycle, `Procurement: ${label}. Cost: ${cost} credits.`, "GREEN");
    });
  }, [toast]);

  // ─── Derived ─────────────────────────────────────────────────────
  const g = game;
  const totalPers = totalPersonnel(g.personnel);
  const alertColor = sev(g.alertLevel);
  const readyVehicles = g.vehicles.filter((v) => v.status === "READY" || v.status === "DEPLOYED").length;

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: NARROW, background: C.bg, minHeight: "100vh", color: C.text, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @keyframes toastIn { from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .btn:hover { opacity: 0.82 !important; }
        .btn:active { transform: scale(0.97) !important; }
        .tab:hover { color: ${C.cyan} !important; background: ${C.border} !important; }
        .procure:hover { border-color: ${C.cyan}44 !important; color: ${C.text} !important; }
        .vcrd:hover { border-color: ${C.cyan}33 !important; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
      `}</style>

      {/* Toast stack */}
      <div style={{ position: "fixed", top: 72, right: 16, zIndex: 999, display: "flex", flexDirection: "column", gap: 6, pointerEvents: "none" }}>
        {toasts.map((t) => <Toast key={t.id} text={t.text} color={t.color} />)}
      </div>

      {/* ── Header ── */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 20px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <ImperialCrest size={36} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 4, color: C.text }}>GALACTIC EMPIRE</div>
            <div style={{ fontSize: 10, color: C.dim, fontFamily: MONO, letterSpacing: 2 }}>{g.baseId} · {g.sector}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {[
            { label: "CREDITS", val: g.credits.toLocaleString(), color: C.amber },
            { label: "FUEL", val: g.fuel, color: C.green },
            { label: "FOOD", val: g.food, color: C.purple },
            { label: "CYCLE", val: g.cycle, color: C.cyan },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center", padding: "0 14px", borderRight: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 9, color: C.dim, fontFamily: MONO, letterSpacing: 2 }}>{s.label}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: s.color, fontFamily: MONO }}>{s.val}</div>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "0 14px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: alertColor, animation: g.alertLevel !== "GREEN" ? "pulse 1.1s infinite" : "none", flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontFamily: MONO, color: alertColor, letterSpacing: 2 }}>ALERT: {g.alertLevel}</span>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display: "grid", gridTemplateColumns: "210px 1fr 250px", flex: 1, overflow: "hidden" }}>

        {/* Left sidebar */}
        <div style={{ background: C.sidebar, borderRight: `1px solid ${C.border}`, padding: 14, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0 }}>
          <div style={{ fontSize: 9, color: C.dim, fontFamily: MONO, letterSpacing: 3, marginBottom: 12 }}>BASE STATUS</div>
          <StatBar label="Base Defense" value={g.baseDefense} color={C.cyan} />
          <StatBar label="Morale" value={g.personnel.morale} color={C.green} />
          <StatBar label="Fuel Reserve" value={g.fuel} max={200} color={C.amber} />
          <StatBar label="Food Supply" value={g.food} max={300} color={C.purple} />

          <div style={{ borderTop: `1px solid ${C.border}`, margin: "14px 0 10px" }} />
          <div style={{ fontSize: 9, color: C.dim, fontFamily: MONO, letterSpacing: 3, marginBottom: 10 }}>PERSONNEL</div>
          {[
            ["Stormtroopers", g.personnel.stormtroopers, C.cyan],
            ["Officers", g.personnel.officers, C.amber],
            ["Technicians", g.personnel.technicians, C.green],
            ["Pilots", g.personnel.pilots, C.purple],
          ].map(([lbl, val, col]) => (
            <div key={lbl} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 7 }}>
              <span style={{ color: C.muted }}>{lbl}</span>
              <span style={{ color: col, fontFamily: MONO, fontWeight: 700 }}>{val}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, paddingTop: 6, borderTop: `1px solid ${C.border}` }}>
            <span style={{ color: C.dim, fontFamily: MONO }}>TOTAL</span>
            <span style={{ color: C.text, fontFamily: MONO, fontWeight: 700 }}>{totalPers}</span>
          </div>

          <div style={{ borderTop: `1px solid ${C.border}`, margin: "14px 0 10px" }} />
          <div style={{ fontSize: 9, color: C.dim, fontFamily: MONO, letterSpacing: 3, marginBottom: 10 }}>MUNITIONS</div>
          {[
            ["Blaster Rifles", g.munitions.blasterRifles],
            ["Heavy Weapons", g.munitions.heavyWeapons],
            ["Explosives", g.munitions.explosives],
            ["Ion Cannons", g.munitions.ionCannons],
          ].map(([lbl, val]) => (
            <div key={lbl} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 7 }}>
              <span style={{ color: C.muted }}>{lbl}</span>
              <span style={{ color: C.text, fontFamily: MONO }}>{val}</span>
            </div>
          ))}

          <div style={{ borderTop: `1px solid ${C.border}`, margin: "14px 0 10px" }} />
          <div style={{ fontSize: 9, color: C.dim, fontFamily: MONO, letterSpacing: 3, marginBottom: 10 }}>PROCUREMENT</div>
          {[
            { label: "Fuel ×50", cost: 800, fn: (g) => ({ ...g, fuel: clamp(g.fuel + 50, 0, 999) }) },
            { label: "Food ×50", cost: 500, fn: (g) => ({ ...g, food: clamp(g.food + 50, 0, 999) }) },
            { label: "Ammo ×200", cost: 1200, fn: (g) => ({ ...g, munitions: { ...g.munitions, blasterRifles: g.munitions.blasterRifles + 200 } }) },
            { label: "Heavy Wpn ×20", cost: 1800, fn: (g) => ({ ...g, munitions: { ...g.munitions, heavyWeapons: g.munitions.heavyWeapons + 20 } }) },
            { label: "Ion Cannon ×5", cost: 2500, fn: (g) => ({ ...g, munitions: { ...g.munitions, ionCannons: g.munitions.ionCannons + 5 } }) },
          ].map((item) => (
            <button key={item.label} className="procure" onClick={() => procure(item.label, item.fn, item.cost)} style={{ display: "block", width: "100%", marginBottom: 5, padding: "6px 10px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, color: C.muted, fontSize: 11, cursor: "pointer", textAlign: "left", fontFamily: MONO, transition: "all 0.12s" }}>
              ▸ {item.label}<span style={{ float: "right", color: C.amber }}>{item.cost}cr</span>
            </button>
          ))}
        </div>

        {/* Center */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Tabs */}
          <div style={{ background: C.sidebar, borderBottom: `1px solid ${C.border}`, display: "flex", gap: 2, padding: "8px 16px", flexShrink: 0 }}>
            {["COMMAND", "FLEET", "ARMORY", "INTEL"].map((t) => (
              <button key={t} className="tab" onClick={() => setTab(t.toLowerCase())} style={{ padding: "7px 18px", background: tab === t.toLowerCase() ? C.border : "transparent", border: "none", borderRadius: 4, color: tab === t.toLowerCase() ? C.cyan : C.muted, fontSize: 12, cursor: "pointer", letterSpacing: 2, fontFamily: MONO, transition: "all 0.12s" }}>
                {t}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>

            {/* ── COMMAND tab ── */}
            {tab === "command" && (
              <div style={{ animation: "fadeIn 0.2s ease" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
                  {[
                    { label: "TOTAL PERSONNEL", val: totalPers, color: C.cyan },
                    { label: "ACTIVE VEHICLES", val: `${readyVehicles}/${g.vehicles.length}`, color: C.amber },
                    { label: "TREASURY", val: `${g.credits.toLocaleString()} cr`, color: C.green },
                  ].map((s) => (
                    <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderTop: `2px solid ${s.color}55`, borderRadius: 6, padding: "12px 14px" }}>
                      <div style={{ fontSize: 9, color: C.dim, letterSpacing: 2, fontFamily: MONO, marginBottom: 8 }}>{s.label}</div>
                      <div style={{ fontSize: 26, fontWeight: 700, color: s.color, fontFamily: MONO }}>{s.val}</div>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: 10, color: C.dim, fontFamily: MONO, letterSpacing: 3, marginBottom: 12 }}>
                  ACTIVE SITUATIONS — {g.events.length} PENDING
                </div>

                {g.events.length === 0 ? (
                  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: 28, textAlign: "center", color: C.dim, fontSize: 13, fontFamily: MONO }}>
                    — ALL SECTORS NOMINAL —
                  </div>
                ) : g.events.map((ev) => (
                  <div key={ev.eid} style={{ background: C.surface, border: `1px solid ${sev(ev.severity)}22`, borderLeft: `3px solid ${sev(ev.severity)}`, borderRadius: 6, padding: "13px 15px", marginBottom: 10, animation: "fadeIn 0.25s ease" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 9, fontFamily: MONO, color: sev(ev.severity), letterSpacing: 2 }}>[{ev.severity}]</span>
                        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>{ev.name}</span>
                      </div>
                      <span style={{ fontSize: 10, color: C.dim, fontFamily: MONO }}>CYC-{ev.cycle}</span>
                    </div>
                    <p style={{ fontSize: 12, color: C.muted, margin: "0 0 12px", lineHeight: 1.55 }}>{ev.desc}</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn" onClick={() => resolveEvent(ev.eid, "respond")} style={{ padding: "7px 16px", background: `${sev(ev.severity)}18`, border: `1px solid ${sev(ev.severity)}55`, borderRadius: 4, color: sev(ev.severity), fontSize: 11, cursor: "pointer", letterSpacing: 2, fontFamily: MONO, transition: "all 0.12s" }}>
                        ▸ {ev.respondLabel}
                      </button>
                      <button className="btn" onClick={() => resolveEvent(ev.eid, "dismiss")} style={{ padding: "7px 16px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 4, color: C.muted, fontSize: 11, cursor: "pointer", letterSpacing: 2, fontFamily: MONO, transition: "all 0.12s" }}>
                        {ev.dismissLabel}
                      </button>
                    </div>
                  </div>
                ))}

                <div style={{ marginTop: 24, display: "flex", justifyContent: "center" }}>
                  <button className="btn" onClick={advanceCycle} disabled={advancing} style={{ padding: "14px 44px", background: advancing ? C.border : `${C.red}22`, border: `2px solid ${advancing ? C.dim : C.red}`, borderRadius: 6, color: advancing ? C.dim : C.red, fontSize: 14, fontWeight: 700, cursor: advancing ? "default" : "pointer", letterSpacing: 4, fontFamily: MONO, transition: "all 0.18s", boxShadow: advancing ? "none" : `0 0 28px ${C.red}28` }}>
                    {advancing
                      ? <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ display: "inline-block", width: 10, height: 10, border: `2px solid ${C.dim}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />PROCESSING</span>
                      : "▸ ADVANCE CYCLE"}
                  </button>
                </div>
              </div>
            )}

            {/* ── FLEET tab ── */}
            {tab === "fleet" && (
              <div style={{ animation: "fadeIn 0.2s ease" }}>
                <div style={{ fontSize: 10, color: C.dim, fontFamily: MONO, letterSpacing: 3, marginBottom: 14 }}>IMPERIAL FLEET — {g.vehicles.length} UNITS</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {g.vehicles.map((v) => {
                    const sc = v.status === "READY" ? C.green : v.status === "DEPLOYED" ? C.cyan : C.danger;
                    const repairCost = Math.ceil((100 - v.condition) * 14);
                    return (
                      <div key={v.id} className="vcrd" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, transition: "border-color 0.2s" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>{v.type}</div>
                            <div style={{ fontSize: 10, color: C.dim, fontFamily: MONO }}>UNIT #{String(v.id).padStart(3, "0")}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 10, color: sc, fontFamily: MONO, letterSpacing: 1 }}>{v.status}</div>
                            <div style={{ width: 7, height: 7, borderRadius: "50%", background: sc, display: "inline-block", marginTop: 4, boxShadow: `0 0 5px ${sc}` }} />
                          </div>
                        </div>
                        <StatBar label="Condition" value={v.condition} color={v.condition > 60 ? C.green : v.condition > 30 ? C.amber : C.danger} />
                        <StatBar label="Fuel" value={v.fuel} color={C.cyan} />
                        {v.status === "MAINTENANCE" && (
                          <button className="btn" onClick={() => repairVehicle(v.id)} style={{ marginTop: 8, width: "100%", padding: "6px 0", background: `${C.cyan}12`, border: `1px solid ${C.cyan}33`, borderRadius: 4, color: C.cyan, fontSize: 10, cursor: "pointer", fontFamily: MONO, transition: "all 0.12s" }}>
                            ▸ REPAIR — {repairCost} credits
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── ARMORY tab ── */}
            {tab === "armory" && (
              <div style={{ animation: "fadeIn 0.2s ease" }}>
                <div style={{ fontSize: 10, color: C.dim, fontFamily: MONO, letterSpacing: 3, marginBottom: 14 }}>ARMORY INVENTORY</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { name: "Blaster Rifles", val: g.munitions.blasterRifles, max: 2000, color: C.cyan, desc: "Standard infantry armament. Effective against lightly armoured targets." },
                    { name: "Heavy Weapons", val: g.munitions.heavyWeapons, max: 200, color: C.amber, desc: "Anti-vehicle platforms. Deployed at fixed emplacements." },
                    { name: "Explosives", val: g.munitions.explosives, max: 100, color: C.danger, desc: "Demolition charges. High collateral — use with caution." },
                    { name: "Ion Cannons", val: g.munitions.ionCannons, max: 30, color: C.purple, desc: "Shield-penetrating ordnance. Effective against Rebel capital ships." },
                  ].map((item) => {
                    const pct = clamp((item.val / item.max) * 100, 0, 100);
                    const barCol = pct > 50 ? item.color : pct > 20 ? C.amber : C.danger;
                    return (
                      <div key={item.name} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 5, letterSpacing: 1 }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: C.dim, marginBottom: 12, lineHeight: 1.4 }}>{item.desc}</div>
                        <div style={{ fontSize: 30, fontWeight: 700, color: item.color, fontFamily: MONO, marginBottom: 10 }}>{item.val.toLocaleString()}</div>
                        <StatBar label="Stock Level" value={item.val} max={item.max} color={barCol} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── INTEL tab ── */}
            {tab === "intel" && (
              <div style={{ animation: "fadeIn 0.2s ease" }}>
                <div style={{ fontSize: 10, color: C.dim, fontFamily: MONO, letterSpacing: 3, marginBottom: 14 }}>
                  INTEL FEED — {g.log.length} ENTRIES
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {g.log.map((entry) => (
                    <div key={entry.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: "8px 12px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 9, color: C.dim, fontFamily: MONO, whiteSpace: "nowrap", marginTop: 2 }}>CYC-{entry.cycle}</span>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: sev(entry.severity), marginTop: 4, flexShrink: 0, boxShadow: `0 0 4px ${sev(entry.severity)}` }} />
                      <span style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{entry.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ background: C.sidebar, borderLeft: `1px solid ${C.border}`, padding: 14, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0 }}>
          <div style={{ fontSize: 9, color: C.dim, fontFamily: MONO, letterSpacing: 3, marginBottom: 12 }}>BASE SCHEMATIC</div>

          {/* SVG base map */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: 10, marginBottom: 16 }}>
            <svg width="100%" viewBox="0 0 200 170" style={{ display: "block" }}>
              {[0, 40, 80, 120, 160, 200].map((x) => <line key={`v${x}`} x1={x} y1={0} x2={x} y2={170} stroke={C.border} strokeWidth="0.5" />)}
              {[0, 40, 80, 120, 160].map((y) => <line key={`h${y}`} x1={0} y1={y} x2={200} y2={y} stroke={C.border} strokeWidth="0.5" />)}

              <rect x="78" y="58" width="44" height="44" fill={`${C.cyan}10`} stroke={`${C.cyan}50`} strokeWidth="1" rx="3" />
              <text x="100" y="78" textAnchor="middle" fill={C.cyan} fontSize="7" fontFamily="monospace">COMMAND</text>
              <text x="100" y="89" textAnchor="middle" fill={`${C.cyan}88`} fontSize="6" fontFamily="monospace">HQ</text>

              <rect x="15" y="15" width="35" height="28" fill={`${C.amber}10`} stroke={`${C.amber}50`} strokeWidth="1" rx="2" />
              <text x="32" y="30" textAnchor="middle" fill={C.amber} fontSize="6" fontFamily="monospace">HANGAR</text>
              <text x="32" y="39" textAnchor="middle" fill={`${C.amber}88`} fontSize="5" fontFamily="monospace">{g.vehicles.filter(v => v.status === "READY").length} READY</text>

              <rect x="150" y="15" width="35" height="28" fill={`${C.danger}10`} stroke={`${C.danger}50`} strokeWidth="1" rx="2" />
              <text x="167" y="30" textAnchor="middle" fill={C.danger} fontSize="6" fontFamily="monospace">ARMORY</text>
              <text x="167" y="39" textAnchor="middle" fill={`${C.danger}88`} fontSize="5" fontFamily="monospace">{g.munitions.blasterRifles} RIFLES</text>

              <rect x="15" y="120" width="35" height="28" fill={`${C.purple}10`} stroke={`${C.purple}50`} strokeWidth="1" rx="2" />
              <text x="32" y="134" textAnchor="middle" fill={C.purple} fontSize="6" fontFamily="monospace">BARRACKS</text>
              <text x="32" y="143" textAnchor="middle" fill={`${C.purple}88`} fontSize="5" fontFamily="monospace">{totalPers} PERS</text>

              <rect x="150" y="120" width="35" height="28" fill={`${C.green}10`} stroke={`${C.green}50`} strokeWidth="1" rx="2" />
              <text x="167" y="134" textAnchor="middle" fill={C.green} fontSize="6" fontFamily="monospace">SUPPLY</text>
              <text x="167" y="143" textAnchor="middle" fill={`${C.green}88`} fontSize="5" fontFamily="monospace">{g.food} FOOD</text>

              <circle cx="100" cy="85" r="72" fill="none" stroke={alertColor} strokeWidth="0.6" strokeDasharray="4,4" opacity="0.35" />
              {g.alertLevel !== "GREEN" && (
                <>
                  <circle cx="100" cy="85" r="72" fill="none" stroke={alertColor} strokeWidth="1" opacity="0.15">
                    <animate attributeName="r" values="68;76;68" dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.2;0;0.2" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                </>
              )}

              {g.events.filter(e => e.severity === "RED").map((_, i) => (
                <g key={i}>
                  <circle cx={30 + i * 60} cy={85} r={5} fill={`${C.danger}44`} stroke={C.danger} strokeWidth="1">
                    <animate attributeName="r" values="4;7;4" dur="1s" repeatCount="indefinite" />
                  </circle>
                  <text x={30 + i * 60} y={89} textAnchor="middle" fill={C.danger} fontSize="5" fontFamily="monospace">!</text>
                </g>
              ))}
            </svg>
          </div>

          {/* Defense gauge */}
          <div style={{ fontSize: 9, color: C.dim, fontFamily: MONO, letterSpacing: 3, marginBottom: 10 }}>DEFENSE GRID</div>
          <StatBar label="Base Defense" value={g.baseDefense} color={C.cyan} />
          <StatBar label="Morale" value={g.personnel.morale} color={C.green} />

          <div style={{ borderTop: `1px solid ${C.border}`, margin: "14px 0 10px" }} />
          <div style={{ fontSize: 9, color: C.dim, fontFamily: MONO, letterSpacing: 3, marginBottom: 10 }}>RECENT LOG</div>

          {g.log.slice(0, 10).map((entry) => (
            <div key={entry.id} style={{ borderLeft: `2px solid ${sev(entry.severity)}44`, paddingLeft: 8, marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: C.dim, fontFamily: MONO }}>CYC-{entry.cycle}</div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>{entry.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
