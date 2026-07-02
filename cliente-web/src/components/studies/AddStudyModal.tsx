import { useState, useEffect } from 'react';
import { X, Search, CheckCircle2, AlertTriangle, ShieldAlert, BedDouble, Stethoscope, FileText, Upload } from 'lucide-react';
import { SECTORES, CASOS_CODIGO_ROJO, IMAGE_TYPES, PRIORITIES, TRASLADOS } from '../../utils/constants';
import { typeMeta, opcionesTraslado, requiereAuth } from '../../utils/helpers';
import type { Pedido } from '../../types';

const FONT_MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace";

interface AddStudyModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  onUpdate: (id: string, data: any) => void;
  editStudy: Pedido | null;
  padron: any[]; // Se pasa PADRON_HOSPITAL u otro
  areaRestringida?: string | null;
}

const today = (y: number, mo: number, d: number) => new Date(y, mo - 1, d).toISOString();

export function AddStudyModal({ open, onClose, onSubmit, onUpdate, editStudy, padron, areaRestringida = null }: AddStudyModalProps) {
  const blank = {
    hc: "", modalidad: "rx", descripcion: "", prioridad: "normal", motivo: "", tipoTraslado: "silla", conContraste: false, aislamiento: false, ordenMedica: null as { nombre: string; tipo?: string; datos: string } | null, casoRojo: "", camaGuardia: "",
    manual: { apellido: "", nombre: "", dni: "", edad: "", servicio: SECTORES[0], cama: "" },
  };
  const [form, setForm] = useState(blank);

  const buscarPadron = (hc: string) => padron.find((p) => p.hc === String(hc).trim());

  useEffect(() => {
    if (!open) return;
    if (editStudy) {
      const idx = editStudy.prioridad === "urgente"
        ? CASOS_CODIGO_ROJO.findIndex((c) => c.modalidad === editStudy.modalidad && c.estudio === editStudy.descripcion)
        : -1;
      setForm({
        hc: editStudy._paciente?.hc || "", 
        modalidad: editStudy.modalidad, 
        descripcion: editStudy.descripcion,
        prioridad: editStudy.prioridad, 
        motivo: editStudy.motivo || "", 
        tipoTraslado: editStudy.tipoTraslado,
        conContraste: !!editStudy.conContraste, 
        aislamiento: !!editStudy.aislamiento,
        ordenMedica: editStudy.ordenMedica || null,
        casoRojo: idx >= 0 ? String(idx) : "",
        camaGuardia: editStudy.camaGuardia || "",
        manual: { apellido: "", nombre: "", dni: "", edad: "", servicio: SECTORES[0], cama: "" },
      });
    } else { setForm(blank); }
  }, [open, editStudy]);

  useEffect(() => {
    if (!open) return;
    const enc = buscarPadron(form.hc);
    const sector = enc ? enc.servicio : form.manual.servicio;
    const ops = opcionesTraslado(form.modalidad, sector);
    if (!ops.includes(form.tipoTraslado)) setForm((f) => ({ ...f, tipoTraslado: ops[0] }));
  }, [open, form.modalidad, form.hc, form.manual.servicio, padron]);

  if (!open) return null;
  const isEdit = !!editStudy;

  const subirOrden = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert("El archivo supera los 4 MB. Subí una versión más liviana.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((f: any) => ({ ...f, ordenMedica: { nombre: file.name, tipo: file.type, datos: reader.result } }));
      }
    };
    reader.readAsDataURL(file);
  };
  const quitarOrden = () => setForm((f: any) => ({ ...f, ordenMedica: null }));

  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const setM = (k: string) => (e: any) => setForm((f: any) => ({ ...f, manual: { ...f.manual, [k]: e.target.value } }));
  const setPrioridad = (e: any) => setForm((f: any) => e.target.value === "urgente" ? { ...f, prioridad: "urgente" } : { ...f, prioridad: e.target.value, casoRojo: "" });
  const elegirCaso = (e: any) => {
    const c = CASOS_CODIGO_ROJO[Number(e.target.value)];
    if (!c) return setForm((f: any) => ({ ...f, casoRojo: "" }));
    setForm((f: any) => ({ ...f, casoRojo: e.target.value, modalidad: c.modalidad, descripcion: c.estudio, motivo: c.dx, conContraste: !!c.conContraste, tipoTraslado: c.tipoTraslado ?? f.tipoTraslado }));
  };

  const hcTyped = form.hc.trim().length > 0;
  const found = hcTyped ? buscarPadron(form.hc) : null;
  const noMatch = hcTyped && !found;

  const resolved = isEdit && editStudy
    ? { hc: editStudy._paciente?.hc, apellido: editStudy._paciente?.nombreCompleto, servicio: editStudy._servicio, sector: editStudy._servicio, cama: editStudy._paciente?.cama }
    : found
    ? { hc: found.hc, apellido: found.apellido, nombre: found.nombre, dni: found.dni, fechaNacimiento: found.fechaNacimiento, sexo: found.sexo, servicio: found.servicio, sector: found.sector, cama: found.servicio === "Guardia" ? (form.camaGuardia.trim() || "—") : found.cama }
    : noMatch
      ? { hc: form.hc.trim(), apellido: form.manual.apellido.trim(), nombre: form.manual.nombre.trim(), dni: form.manual.dni.trim() || "—",
          fechaNacimiento: form.manual.edad ? today(new Date().getFullYear() - Number(form.manual.edad), 1, 1) : today(1990, 1, 1),
          sexo: "X", servicio: form.manual.servicio, sector: form.manual.servicio, cama: form.manual.cama.trim() || "—" }
      : null;

  const edadDe = (fn: string) => { const d = new Date(fn), n = new Date(); let a = n.getFullYear() - d.getFullYear(); if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--; return a; };
  const fueraDeArea = !isEdit && areaRestringida && resolved && resolved.servicio !== areaRestringida;
  const valid = resolved && resolved.apellido && form.descripcion.trim() && !fueraDeArea && !(found && found.servicio === "Guardia" && !form.camaGuardia.trim());

  const field = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
  const lbl = "mb-1 block text-xs font-medium text-slate-500";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4" style={{ animation: "fade .18s ease" }} onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl" style={{ animation: "pop .2s ease" }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{isEdit ? "Editar pedido" : "Nuevo pedido de estudio"}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>

        {isEdit && editStudy && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="font-semibold text-slate-900">{editStudy._paciente?.nombreCompleto}</p>
            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-600" style={{ fontFamily: FONT_MONO }}>
              <span>HC {editStudy._paciente?.hc}</span><span>DNI {editStudy._paciente?.dni}</span>
              <span className="inline-flex items-center gap-1"><BedDouble size={11} /> {editStudy._paciente?.cama}</span>
              <span className="inline-flex items-center gap-1"><Stethoscope size={11} /> {editStudy._servicio}</span>
            </div>
          </div>
        )}

        {!isEdit && (<>
        {/* Paso 1: Historia clínica (clave de autocompletado) */}
        <label className={lbl}>Historia clínica (HC) *</label>
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${field} pl-9`} value={form.hc} onChange={set("hc")} placeholder="Ingresá la HC del paciente" inputMode="numeric" autoFocus />
        </div>

        {/* Resultado del padrón */}
        {found && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700"><CheckCircle2 size={13} /> Paciente encontrado en el padrón</div>
            <p className="mt-1.5 font-semibold text-slate-900">{found.apellido}, {found.nombre}</p>
            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-600" style={{ fontFamily: FONT_MONO }}>
              <span>DNI {found.dni}</span><span>{edadDe(found.fechaNacimiento)} años</span><span>{found.sexo}</span>
              <span className="inline-flex items-center gap-1"><BedDouble size={11} /> {found.cama}</span>
              <span className="inline-flex items-center gap-1"><Stethoscope size={11} /> {found.servicio}</span>
            </div>
          </div>
        )}

        {found && found.servicio === "Guardia" && (
          <div className="mb-4">
            <label className={lbl}>Cama / Ubicación en guardia *</label>
            <input className={field} value={form.camaGuardia} onChange={set("camaGuardia")} placeholder="Box, camilla o ubicación en guardia" />
            <p className="mt-1 text-xs text-slate-400">En guardia la ubicación no llega desde el sistema; cargala a mano.</p>
          </div>
        )}

        {fueraDeArea && (
          <div className="mb-4 flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" /> El paciente está en {resolved?.servicio}, fuera de tu área actual ({areaRestringida}). Cambiá tu área en el encabezado para poder pedirle estudios.
          </div>
        )}

        {noMatch && (
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <AlertTriangle size={13} /> HC no encontrada en el padrón. Cargá los datos manualmente.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Apellido *</label><input className={field} value={form.manual.apellido} onChange={setM("apellido")} placeholder="Apellido" /></div>
              <div><label className={lbl}>Nombre</label><input className={field} value={form.manual.nombre} onChange={setM("nombre")} placeholder="Nombre" /></div>
              <div><label className={lbl}>DNI</label><input className={field} value={form.manual.dni} onChange={setM("dni")} placeholder="00.000.000" /></div>
              <div><label className={lbl}>Edad</label><input className={field} value={form.manual.edad} onChange={setM("edad")} placeholder="años" inputMode="numeric" /></div>
              <div><label className={lbl}>Sector</label><select className={field} value={form.manual.servicio} onChange={setM("servicio")}>{SECTORES.map((x) => <option key={x}>{x}</option>)}</select></div>
              <div><label className={lbl}>Cama / Habitación</label><input className={field} value={form.manual.cama} onChange={setM("cama")} placeholder="Cama 000" /></div>
            </div>
          </div>
        )}
        </>)}

        {/* Paso 2: datos clínicos del pedido (solo con paciente resuelto) */}
        {resolved && (
          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
            <div className="col-span-2"><label className={lbl}>Urgencia / prioridad</label><select className={field} value={form.prioridad} onChange={setPrioridad}>{Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>

            {form.prioridad === "urgente" ? (
              <>
                <div className="col-span-2 flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertTriangle size={13} /> Código rojo: inmediato y sin autorización. Elegí el caso de la lista.
                </div>
                <div className="col-span-2">
                  <label className={lbl}>Caso código rojo *</label>
                  <select className={field} value={form.casoRojo} onChange={elegirCaso}>
                    <option value="">Seleccionar caso…</option>
                    {CASOS_CODIGO_ROJO.map((c, i) => <option key={i} value={i}>{typeMeta(c.modalidad)?.short} · {c.dx} → {c.estudio}</option>)}
                  </select>
                  {form.casoRojo !== "" && (
                    <p className="mt-1 text-xs text-slate-500">{typeMeta(form.modalidad)?.label}{form.conContraste ? " · con contraste" : " · sin contraste"} — {form.descripcion}</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="col-span-2"><label className={lbl}>Tipo de imagen</label><select className={field} value={form.modalidad} onChange={set("modalidad")}>{IMAGE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
                {requiereAuth(form.modalidad) && (
                  <div className="col-span-2 flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
                    <ShieldAlert size={13} /> Este estudio requiere autorización administrativa antes de realizarse.
                  </div>
                )}
                <div className="col-span-2"><label className={lbl}>Estudio solicitado *</label><input className={field} value={form.descripcion} onChange={set("descripcion")} placeholder="Ej.: Rx de tórax (F y P)" /></div>
                <div className="col-span-2"><label className={lbl}>Diagnóstico / pregunta clínica</label><textarea rows={2} className={field} value={form.motivo} onChange={set("motivo")} placeholder="Motivo del estudio" /></div>
                <label className="col-span-2 flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={form.conContraste} onChange={set("conContraste")} className="h-4 w-4 rounded border-slate-300" /> Requiere contraste</label>
                <label className="col-span-2 flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={form.aislamiento} onChange={set("aislamiento")} className="h-4 w-4 rounded border-slate-300" /> Paciente en aislamiento (requiere precauciones)</label>
                {requiereAuth(form.modalidad) && form.prioridad !== "urgente" && (
                  <div className="col-span-2">
                    <label className={lbl}>Orden médica (PDF o Imagen)</label>
                    {form.ordenMedica ? (
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        <FileText size={13} className="text-slate-400" /> <span className="flex-1 truncate">{form.ordenMedica.nombre}</span>
                        <button type="button" onClick={quitarOrden} className="text-slate-400 hover:text-red-600"><X size={13} /></button>
                      </div>
                    ) : (
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 transition-colors hover:border-blue-400">
                        <Upload size={13} /> Adjuntar orden médica (.pdf, imágenes)
                        <input type="file" accept=".pdf,image/*" onChange={subirOrden} className="hidden" />
                      </label>
                    )}
                    <p className="mt-1 text-xs text-slate-400">La descarga el administrativo para gestionar la autorización (opcional al cargar).</p>
                  </div>
                )}
              </>
            )}
            <div className="col-span-2">
              <label className={lbl}>Tipo de traslado</label>
              <select className={field} value={form.tipoTraslado} onChange={set("tipoTraslado")}>
                {opcionesTraslado(form.modalidad, resolved?.servicio || "").map((k) => <option key={k} value={k}>{TRASLADOS[k]?.label}</option>)}
              </select>
              {!TRASLADOS[form.tipoTraslado]?.requiereTraslado && <p className="mt-1 text-xs text-slate-400">Sin traslado por ayudante: el estudio pasa directo a realizarse.</p>}
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button disabled={!valid} onClick={() => isEdit && editStudy
            ? onUpdate(editStudy.id, { modalidad: form.modalidad, descripcion: form.descripcion, prioridad: form.prioridad, motivo: form.motivo, tipoTraslado: form.tipoTraslado, conContraste: form.conContraste, aislamiento: form.aislamiento, ordenMedica: form.ordenMedica, camaGuardia: form.camaGuardia })
            : onSubmit({ paciente: resolved, modalidad: form.modalidad, descripcion: form.descripcion, prioridad: form.prioridad, motivo: form.motivo, tipoTraslado: form.tipoTraslado, conContraste: form.conContraste, aislamiento: form.aislamiento, ordenMedica: form.ordenMedica, camaGuardia: form.camaGuardia })} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">{isEdit ? "Guardar cambios" : "Agregar a la lista"}</button>
        </div>
      </div>
    </div>
  );
}

