import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useStore } from "./store/useStore";
import { ShieldAlert, ListChecks, AlertTriangle, Play, CheckCircle2, Search, Filter } from "lucide-react";
import { typeMeta, hidratar, requiereAuth, alertaDemora, beepEmergencia } from "./utils/helpers";
import { IMAGE_TYPES, SECTORES, PRIORITIES, ROLES, TRASLADOS } from "./utils/constants";
import { Kpi } from "./components/ui/Kpi";
import { EmptyState } from "./components/ui/EmptyState";
import { StudyCard } from "./components/studies/StudyCard";
import { AddStudyModal } from "./components/studies/AddStudyModal";
import { BoardView } from "./components/views/BoardView";
import { DashboardView } from "./components/views/DashboardView";
import { ClinicalSection } from "./components/views/ClinicalSection";
import { UsersPanel } from "./components/views/UsersPanel";
import { LoginScreen } from "./components/views/LoginScreen";
import { Header } from "./components/layout/Header";
import type { Pedido } from "./types";

const FONT_SANS = "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif";

export default function App() {
  const {
    usuarios, currentUser, logout, login, cambiarEstadoPedido,
    cambiarEmergenciaVista, updateUbicacionInternacion,
    pedidos, pacientes, internaciones, padron,
    pedidosTerminados, terminadosHasMore, terminadosLoading, fetchNextPageTerminados,
    loading, fetchData, createPedido, updatePedido, createPaciente, createInternacion, resetData
  } = useStore();

  const [sessionWarning, setSessionWarning] = useState(false);

  const [cargado, setCargado] = useState(false);
  const [role, setRole] = useState("clinical");
  const [scope, setScope] = useState<string[] | null>(null);
  const [service, setService] = useState(SECTORES[0]);
  const [pantalla, setPantalla] = useState(false);
  const [now, setNow] = useState(Date.now());

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [serviceFilter, setServiceFilter] = useState("todos");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [showDone, setShowDone] = useState(false);
  const [modal, setModal] = useState(false);
  const [editStudy, setEditStudy] = useState<Pedido | null>(null);

  // Initialize data and clock
  useEffect(() => {
    fetchData().then(() => setCargado(true));
  }, [fetchData]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const warningTimer = setTimeout(() => setSessionWarning(true), 58 * 60 * 1000);
    const logoutTimer = setTimeout(() => {
      setSessionWarning(false);
      logout();
    }, 60 * 60 * 1000);

    return () => {
      clearTimeout(warningTimer);
      clearTimeout(logoutTimer);
    };
  }, [currentUser, logout]);

  useEffect(() => {
    // Current user is now managed by the store globally, so we just use the role logic
    const usr = currentUser;
    if (usr) {
      const vistas = [];
      const has = (p: string) => (ROLES as any)[usr.rol]?.permisos.includes(p);
      if (has("ver_imagenes")) vistas.push("imaging");
      if (has("ver_servicio")) vistas.push("clinical");
      if (has("gestionar_usuarios")) vistas.push("users");
      if (usr.rol === "admin") vistas.push("dashboard");

      if (!vistas.includes(role)) setRole(vistas[0] || "users");
      if (usr.servicio) setService(usr.servicio);
      setScope(usr.rol === 'tecnico' || usr.rol === 'personal_imagenes' ? null : (usr.sectores || null));
    }
  }, [currentUser, role, usuarios]);

  const hasPermission = (perm: string) => Boolean(currentUser && (ROLES as any)[currentUser.rol]?.permisos.includes(perm));
  const perms = currentUser ? Object.fromEntries(((ROLES as any)[currentUser.rol]?.permisos || []).map((k: string) => [k, true])) : {};

  const allPedidos = useMemo(() => [...pedidos, ...pedidosTerminados], [pedidos, pedidosTerminados]);

  const studies: Pedido[] = useMemo(() => {
    return allPedidos.map((p) => hidratar(p, internaciones, pacientes));
  }, [allPedidos, internaciones, pacientes]);

  const emergenciasPend = useMemo(() => {
    return studies.filter((s) => s.prioridad === "urgente" && s.estado !== "realizado" && s.estado !== "cancelado" && !s.emergenciaVista);
  }, [studies]);

  const emergCountRef = useRef(0);
  const emergMountedRef = useRef(false);
  useEffect(() => {
    const n = emergenciasPend.length;
    if (emergMountedRef.current && n > emergCountRef.current) {
      beepEmergencia();
    }
    emergCountRef.current = n;
    emergMountedRef.current = true;
  }, [emergenciasPend.length]);

  useEffect(() => {
    if (emergenciasPend.length === 0) return undefined;
    const timer = setInterval(() => {
      beepEmergencia();
    }, 30000);
    return () => clearInterval(timer);
  }, [emergenciasPend.length > 0]);


  // Actions
  const conEvento = async (id: string, action: string) => {
    const study = studies.find(s => s.id === id);
    if (!study) return;
    const h = study.historial || [];
    let n = study.estado;

    if (action === "advance") {
      if (n === "autorizacion_pendiente") {
        n = "solicitado";
      } else if (n === "solicitado" || n === "traslado_solicitado") {
        n = "en_proceso";
      } else if (n === "en_proceso") {
        n = "realizado";
      } else if (n === "realizado") {
        n = "traslado_retorno";
      } else if (n === "traslado_retorno") {
        n = "completado";
      }
    } else if (action === "revert" && h.length > 1) {
      n = h[h.length - 2].estado;
    } else if (action === "authorize") n = "solicitado";
    else if (action === "transfer") n = "traslado_solicitado";
    else if (action === "cancel") n = "cancelado";

    if (n !== study.estado) {
      if (action === "revert") {
        const newH = [...h];
        newH.pop();
        await updatePedido(id, { estado: n, historial: newH });
      } else if (action === "cancel") {
        await updatePedido(id, {
          estado: n,
          avisoPendiente: study.estado === "traslado_solicitado" ? "cancel" : undefined,
          historial: [...h, { estado: n, ts: Date.now(), por: currentUser?.id }]
        });
      } else {
        await cambiarEstadoPedido(id, n, currentUser?.id || "u2");
      }
    }
  };

  const advance = (id: string) => conEvento(id, "advance");
  const revert = (id: string) => conEvento(id, "revert");
  const authorize = (id: string) => conEvento(id, "authorize");
  const solicitarTraslado = (id: string) => conEvento(id, "transfer");
  const cancel = (id: string) => conEvento(id, "cancel");

  const hacerEnOrigen = (id: string) => {
    const study = studies.find(s => s.id === id);
    if (!study) return;
    const estado = "solicitado";
    const hist = study.historial || [];
    const newHist = estado !== study.estado
      ? [...hist, { estado, ts: Date.now(), por: currentUser?.id || "u2" }]
      : hist;
    updatePedido(id, {
      tipoTraslado: "habitacion",
      estado,
      avisoPendiente: study.estado === "traslado_solicitado" ? "sintraslado" : study.avisoPendiente,
      historial: newHist
    });
  };

  const avisado = (id: string) => updatePedido(id, { avisoPendiente: undefined });

  const handleMarcarVista = (id: string) => cambiarEmergenciaVista(id);
  const handleActualizarCama = (study: Pedido, cama: string, sector?: string) => {
    if (study.internacionId) {
      updateUbicacionInternacion(study.internacionId, cama, sector);
    }
  };

  // Add & Update logic
  const handleAddStudy = async (data: any) => {
    // Basic logic mapping UI object to store action
    // Needs better handling for API IDs, but mimicking previous local state
    const pid = `p_${Math.random().toString(36).slice(2, 9)}`;
    const iid = `i_${Math.random().toString(36).slice(2, 9)}`;

    // Simulate finding patient vs creating new
    const existente = pacientes.find(p => p.hc === data.paciente.hc);
    let finalPid = pid;
    let finalIid = iid;
    if (existente) {
      finalPid = existente.id;
      const inter = internaciones.find(i => i.pacienteId === finalPid && i.estado === "activa");
      if (inter) finalIid = inter.id;
      else await createInternacion({ id: finalIid, pacienteId: finalPid, servicioId: data.paciente.sector, ubicacion: { sector: data.paciente.sector, habitacion: "—", cama: data.paciente.cama }, fechaIngreso: Date.now(), fechaAlta: null, estado: "activa" });
    } else {
      await createPaciente({ id: pid, hc: data.paciente.hc, documento: { tipo: "DNI", numero: data.paciente.dni }, apellido: data.paciente.apellido, nombre: data.paciente.nombre, fechaNacimiento: data.paciente.fechaNacimiento, sexo: data.paciente.sexo });
      await createInternacion({ id: iid, pacienteId: pid, servicioId: data.paciente.sector, ubicacion: { sector: data.paciente.sector, habitacion: "—", cama: data.paciente.cama }, fechaIngreso: Date.now(), fechaAlta: null, estado: "activa" });
    }

    const estadoIni = (requiereAuth(data.modalidad) && data.prioridad !== "urgente") ? "autorizacion_pendiente" : "solicitado";
    const ahora = Date.now();

    await createPedido({
      internacionId: finalIid, servicioSolicitanteId: data.paciente.sector, creadoPor: currentUser?.id,
      modalidad: data.modalidad, descripcion: data.descripcion.trim(), conContraste: data.conContraste, aislamiento: data.aislamiento, ordenMedica: data.ordenMedica, camaGuardia: data.camaGuardia || "", prioridad: data.prioridad,
      motivo: data.motivo.trim(), tipoTraslado: data.tipoTraslado, regionAnatomica: "",
      estado: estadoIni, fechaSolicitud: ahora,
      historial: [{ estado: estadoIni, ts: ahora, por: currentUser?.id }]
    });
    setModal(false);
  };

  const handleUpdateStudy = (id: string, d: any) => {
    const p = pedidos.find(s => s.id === id);
    if (!p) return;
    let estado = p.estado, avisoPendiente = p.avisoPendiente;
    if (estado === "autorizacion_pendiente" || estado === "solicitado") {
      estado = (requiereAuth(d.modalidad) && d.prioridad !== "urgente") ? "autorizacion_pendiente" : "solicitado";
    }

    if (p.estado === "traslado_solicitado" && p.tipoTraslado !== d.tipoTraslado) {
      if (!TRASLADOS[d.tipoTraslado]?.requiereTraslado) { estado = "solicitado"; avisoPendiente = "sintraslado"; }
      else { estado = "traslado_solicitado"; avisoPendiente = "modif"; }
    }
    const hist = estado !== p.estado ? [...(p.historial || []), { estado, ts: Date.now(), por: currentUser?.id }] : p.historial;

    updatePedido(id, {
      ...d,
      descripcion: d.descripcion.trim(),
      motivo: d.motivo.trim(),
      aislamiento: d.aislamiento,
      ordenMedica: d.ordenMedica,
      estado,
      avisoPendiente,
      historial: hist
    }).then(() => {
      setModal(false);
      setEditStudy(null);
    });
  };

  const isClosed = (s: Pedido) => s.estado === "realizado" || s.estado === "completado";
  const sortFn = (a: Pedido, b: Pedido) => {
    const ca = isClosed(a) || a.estado === "cancelado" ? 1 : 0;
    const cb = isClosed(b) || b.estado === "cancelado" ? 1 : 0;
    if (ca !== cb) return ca - cb;
    const ra = PRIORITIES[a.prioridad]?.rank ?? 99;
    const rb = PRIORITIES[b.prioridad]?.rank ?? 99;
    if (ra !== rb) return ra - rb;
    return a.fechaSolicitud - b.fechaSolicitud;
  };

  const matchesQuery = (s: Pedido) => {
    const q = query.trim().toLowerCase();
    return !q || s._paciente?.nombreCompleto.toLowerCase().includes(q) || String(s._paciente?.dni).includes(q) || String(s._paciente?.hc).includes(q);
  };

  const imagingList = useMemo(() => studies
    .filter(matchesQuery)
    .filter((s) => !scope || scope.includes(s.modalidad))
    .filter((s) => typeFilter === "todos" || s.modalidad === typeFilter)
    .filter((s) => serviceFilter === "todos" || s._servicio === serviceFilter)
    .filter((s) => {
      if (statusFilters.length === 0) return true;
      let ok = true;
      if (statusFilters.includes("habitacion") && s.tipoTraslado !== "habitacion") ok = false;
      if (statusFilters.includes("autorizacion_pendiente") && s.estado !== "autorizacion_pendiente") ok = false;
      return ok;
    })
    .filter((s) => (showDone || !isClosed(s)) && s.estado !== "cancelado")
    .sort(sortFn), [studies, typeFilter, serviceFilter, statusFilters, query, showDone, scope]);

  const groups = useMemo(() => {
    let order = typeFilter === "todos" ? IMAGE_TYPES.map((t) => t.id) : [typeFilter];
    if (scope) order = order.filter((id) => scope.includes(id));
    return order.map((id) => ({ type: typeMeta(id), items: imagingList.filter((s) => s.modalidad === id) })).filter((g) => g.items && g.items.length);
  }, [imagingList, typeFilter, scope]);

  const myStudies = useMemo(() => studies.filter((s) => s._servicio === service && matchesQuery(s)).sort(sortFn), [studies, service, query]);
  const myBy = (estados: string[]) => myStudies.filter((s) => estados.includes(s.estado));

  const kpis = useMemo(() => ({
    auth: studies.filter((s) => s.estado === "autorizacion_pendiente").length,
    pend: studies.filter((s) => s.estado === "solicitado").length,
    proc: studies.filter((s) => s.estado === "en_proceso" || s.estado === "traslado_retorno").length,
    urg: studies.filter((s) => !isClosed(s) && s.estado !== "cancelado" && s.prioridad === "urgente").length,
    done: studies.filter((s) => isClosed(s)).length,
  }), [studies]);

  if (!cargado || loading) {
    return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-400" style={{ fontFamily: FONT_SANS }}>Cargando…</div>;
  }

  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <div style={{ fontFamily: FONT_SANS }} className="min-h-screen bg-slate-50 text-slate-900">
      <style>{`@keyframes fade{from{opacity:0}to{opacity:1}}@keyframes pop{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}@keyframes up{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>

      <Header
        role={role} setRole={setRole} currentUser={currentUser}
        onLogout={logout} service={service} setService={setService}
        hasPermission={hasPermission} setPantalla={setPantalla}
      />

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        {emergenciasPend.length > 0 && (
          <div className="mb-5 rounded-xl border-2 border-red-400 bg-red-50 p-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-red-700">
              <AlertTriangle size={16} className="animate-pulse" /> {emergenciasPend.length} código rojo{emergenciasPend.length > 1 ? "s" : ""} sin confirmar recepción
            </div>
            <div className="mt-2 space-y-1.5">
              {emergenciasPend.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-1.5 text-xs">
                  <span className="text-slate-700">
                    <b>{s._paciente?.nombreCompleto}</b> · {s.descripcion} · {s._servicio} · {s._paciente?.cama}
                  </span>
                  {hasPermission("iniciar") ? (
                    <button onClick={() => handleMarcarVista(s.id)} className="shrink-0 rounded-lg bg-red-600 px-2.5 py-1 font-semibold text-white hover:bg-red-700">Marcar visto</button>
                  ) : (
                    <span className="shrink-0 text-slate-400">esperando al equipo</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {role === "imaging" && (
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Kpi Icon={ShieldAlert} label="Autorización pend." value={kpis.auth} accent="#ea580c" />
            <Kpi Icon={ListChecks} label="Pendientes" value={kpis.pend} accent="#475569" />
            <Kpi Icon={AlertTriangle} label="Código rojo activos" value={kpis.urg} accent="#dc2626" />
            <Kpi Icon={Play} label="En proceso" value={kpis.proc} accent="#2563eb" />
            <Kpi Icon={CheckCircle2} label="Realizados" value={kpis.done} accent="#059669" />
          </div>
        )}

        {role !== "users" && role !== "dashboard" && (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <div className="relative grow basis-56">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por paciente, DNI o HC…" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            </div>

            {role === "imaging" ? (
              <>
                <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
                  <button onClick={() => setTypeFilter("todos")} className={`rounded-md px-2.5 py-1 text-xs font-medium ${typeFilter === "todos" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}>Todos</button>
                  {IMAGE_TYPES.map((t) => (
                    <button key={t.id} onClick={() => setTypeFilter(t.id)} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${typeFilter === t.id ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}><t.Icon size={12} /> {t.short}</button>
                  ))}
                </div>
                <div className="relative">
                  <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-600 outline-none focus:border-blue-400">
                    <option value="todos">Todas las áreas</option>
                    {SECTORES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
                  <button onClick={() => setStatusFilters([])} className={`rounded-md px-2.5 py-1 text-xs font-medium ${statusFilters.length === 0 ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}>Todos</button>
                  <button onClick={() => setStatusFilters(p => p.includes("habitacion") ? p.filter(x => x !== "habitacion") : [...p, "habitacion"])} className={`rounded-md px-2.5 py-1 text-xs font-medium ${statusFilters.includes("habitacion") ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}>En habitación</button>
                  <button onClick={() => setStatusFilters(p => p.includes("autorizacion_pendiente") ? p.filter(x => x !== "autorizacion_pendiente") : [...p, "autorizacion_pendiente"])} className={`rounded-md px-2.5 py-1 text-xs font-medium ${statusFilters.includes("autorizacion_pendiente") ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}>Esperando autorización</button>
                </div>
                <button onClick={() => {
                  setShowDone((v) => {
                    const next = !v;
                    if (next && pedidosTerminados.length === 0) fetchNextPageTerminados();
                    return next;
                  });
                }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600"><Filter size={13} /> {showDone ? "Ocultar finalizados" : "Ver finalizados"}</button>
              </>
            ) : role === "clinical" && hasPermission("pedir_estudio") ? (
              <button onClick={() => { setEditStudy(null); setModal(true); }} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                Nuevo estudio
              </button>
            ) : null}
          </div>
        )}

        {role === "dashboard" ? (
          <DashboardView studies={studies} />
        ) : role === "users" ? (
          <UsersPanel usuarios={usuarios} currentUser={currentUser} onReset={resetData} />
        ) : role === "imaging" ? (
          groups.length === 0 ? <EmptyState text="No hay estudios que coincidan con el filtro." /> : (
            <div className="space-y-6">
              {groups.map((g) => (
                <GroupSection key={g.type?.id} g={g} studies={studies} usuarios={usuarios} role={role} now={now} perms={perms as any} currentUser={currentUser} advance={advance} revert={revert} authorize={authorize} solicitarTraslado={solicitarTraslado} onEnOrigen={hacerEnOrigen} setEditStudy={setEditStudy} setModal={setModal} avisado={avisado} cancel={cancel} hasMore={terminadosHasMore} onLoadMore={fetchNextPageTerminados} onMarcarVista={handleMarcarVista} onActualizarCama={handleActualizarCama} />
              ))}
            </div>
          )
        ) : (
          <div className="space-y-6">
            <ClinicalSection title="Autorización pendiente" items={myBy(["autorizacion_pendiente"])} allStudies={studies} usuarios={usuarios} role={role} now={now} perms={perms as any} currentUser={currentUser} advance={advance} revert={revert} authorize={authorize} onEdit={(s) => { setEditStudy(s); setModal(true) }} onAvisado={avisado} cancel={cancel} solicitarTraslado={solicitarTraslado} onEnOrigen={hacerEnOrigen} onMarcarVista={handleMarcarVista} onActualizarCama={handleActualizarCama} />
            <ClinicalSection title="Pendientes" items={myBy(["solicitado", "programado", "traslado_solicitado"])} allStudies={studies} usuarios={usuarios} role={role} now={now} perms={perms as any} currentUser={currentUser} advance={advance} revert={revert} authorize={authorize} onEdit={(s) => { setEditStudy(s); setModal(true) }} onAvisado={avisado} cancel={cancel} solicitarTraslado={solicitarTraslado} onEnOrigen={hacerEnOrigen} onMarcarVista={handleMarcarVista} onActualizarCama={handleActualizarCama} />
            <ClinicalSection title="En proceso" items={myBy(["en_proceso", "traslado_retorno"])} allStudies={studies} usuarios={usuarios} role={role} now={now} perms={perms as any} currentUser={currentUser} advance={advance} revert={revert} authorize={authorize} onEdit={(s) => { setEditStudy(s); setModal(true) }} onAvisado={avisado} cancel={cancel} solicitarTraslado={solicitarTraslado} onEnOrigen={hacerEnOrigen} onMarcarVista={handleMarcarVista} onActualizarCama={handleActualizarCama} />
            <ClinicalSection title="Finalizados" items={myBy(["realizado", "completado", "cancelado"])} allStudies={studies} usuarios={usuarios} role={role} now={now} perms={perms as any} currentUser={currentUser} advance={advance} revert={revert} authorize={authorize} onEdit={(s) => { setEditStudy(s); setModal(true) }} onAvisado={avisado} cancel={cancel} solicitarTraslado={solicitarTraslado} onEnOrigen={hacerEnOrigen} onMarcarVista={handleMarcarVista} onActualizarCama={handleActualizarCama} hasMore={terminadosHasMore} loading={terminadosLoading} onLoadMore={() => {
              if (pedidosTerminados.length === 0) fetchNextPageTerminados();
              else fetchNextPageTerminados();
            }} />
            {myStudies.length === 0 && <EmptyState text={`${service} no tiene estudios cargados. Agregá el primero con "Nuevo estudio".`} />}
          </div>
        )}
      </main>

      <AddStudyModal open={modal} onClose={() => { setModal(false); setEditStudy(null) }} onSubmit={handleAddStudy} onUpdate={handleUpdateStudy} editStudy={editStudy} padron={padron} areaRestringida={currentUser?.rol === "medico" ? service : null} />
      {pantalla && <BoardView studies={studies} now={now} onExit={() => setPantalla(false)} />}

      {sessionWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" style={{ animation: "pop .2s ease-out" }}>
            <h3 className="mb-2 text-lg font-bold text-slate-900">Aviso de sesión</h3>
            <p className="mb-6 text-sm text-slate-600">
              Tu sesión está a punto de expirar por inactividad. ¿Deseas mantenerla activa?
            </p>
            <div className="flex gap-3">
              <button onClick={() => logout()} className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cerrar sesión</button>
              <button onClick={() => {
                setSessionWarning(false);
                login(currentUser.id); // Refresh token
              }} className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Mantener activa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupSection({
  g, studies, usuarios, role, now, perms, currentUser,
  advance, revert, authorize, solicitarTraslado, onEnOrigen, setEditStudy, setModal, avisado, cancel,
  hasMore, onLoadMore, onMarcarVista, onActualizarCama
}: any) {
  const [visibleCount, setVisibleCount] = useState(9);
  const observer = useRef<IntersectionObserver | null>(null);

  const visibleItems = g.items.slice(0, visibleCount);

  const handleLoadMore = useCallback(() => {
    if (visibleCount < g.items.length) {
      setVisibleCount((prev: number) => prev + 9);
    } else if (hasMore && onLoadMore) {
      onLoadMore();
    }
  }, [visibleCount, g.items.length, hasMore, onLoadMore]);

  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (observer.current) observer.current.disconnect();
    if (node) {
      observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      }, {
        rootMargin: "100px"
      });
      observer.current.observe(node);
    }
  }, [handleLoadMore]);

  const rojos = g.items.filter((s: any) => alertaDemora(s, now) === "urgente" && s.estado !== 'realizado').length;
  const prio = g.items.filter((s: any) => alertaDemora(s, now) === "prioritario" && s.estado !== 'realizado').length;

  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2">
        <span className={`grid h-7 w-7 place-items-center rounded-lg border ${g.type?.badge}`}>{g.type?.Icon && <g.type.Icon size={15} />}</span>
        <h3 className="text-sm font-semibold text-slate-700">{g.type?.label}</h3>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">{g.items.length}</span>
      </div>
      {(!rojos && !prio) ? null : (
        <div className={`mb-2.5 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ${rojos ? "border-red-300 bg-red-50 text-red-700" : "border-amber-300 bg-amber-50 text-amber-700"}`}>
          <AlertTriangle size={14} />
          {rojos > 0 && <span>{rojos} código rojo sin atender (+30 min)</span>}
          {rojos > 0 && prio > 0 && <span aria-hidden>·</span>}
          {prio > 0 && <span>{prio} prioridad demorada (+2 h)</span>}
        </div>
      )}
      <div className="max-h-[600px] overflow-y-auto pr-2 rounded-xl scroll-smooth">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((s: any, idx: number) => (
            <div key={s.id} ref={idx === visibleItems.length - 1 ? lastElementRef : null} style={{ animation: "up .25s ease both" }}>
              <StudyCard study={s} patientStudies={studies.filter((x: any) => x.internacionId === s.internacionId)} usuarios={usuarios} role={role} now={now} perms={perms} currentUser={currentUser} onAdvance={advance} onRevert={revert} onAuthorize={authorize} onTransfer={solicitarTraslado} onEnOrigen={onEnOrigen} onEdit={(st: any) => { setEditStudy(st); setModal(true) }} onAvisado={avisado} onCancel={cancel} onMarcarVista={onMarcarVista} onActualizarCama={onActualizarCama} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
