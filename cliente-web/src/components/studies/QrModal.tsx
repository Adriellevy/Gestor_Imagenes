import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Printer } from 'lucide-react';
import { typeMeta, fmtHora } from '../../utils/helpers';
import { useStore } from '../../store/useStore';
import type { Pedido } from '../../types';

const fmtFecha = (ts: number) => new Date(ts).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

const qrPayload = (study: Pedido, instrucciones: string): string => {
  const p = study._paciente || { nombreCompleto: "—", hc: "—" };
  const mLabel = typeMeta(study.modalidad)?.label || study.modalidad;
  const lineas = [
    "PEDIDO DE ESTUDIO — IMÁGENES",
    `Paciente: ${p.nombreCompleto} (HC ${p.hc})`,
    `Estudio: ${mLabel} — ${study.descripcion || ""}`,
    ...(study.conContraste ? ["Requiere contraste"] : []),
    `Solicitado: ${fmtFecha(study.fechaSolicitud)} ${fmtHora(study.fechaSolicitud)} hs`,
    "PASOS A SEGUIR:",
    ...instrucciones.split("\n").filter(Boolean),
  ];
  let texto = lineas.join("\n");
  const enc = new TextEncoder();
  while (enc.encode(texto).length > 420) texto = texto.slice(0, -1);
  return texto;
};

const qrMatrix = (text: string): boolean[][] | null => {
  const ECC_L = [0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26];
  const NBLK_L = [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4];
  const rawModules = (v: number) => {
    let r = (16 * v + 128) * v + 64;
    if (v >= 2) {
      const na = Math.floor(v / 7) + 2;
      r -= (25 * na - 10) * na - 55;
      if (v >= 7) r -= 36;
    }
    return r;
  };
  const dataCw = (v: number) => Math.floor(rawModules(v) / 8) - ECC_L[v] * NBLK_L[v];
  const bytes = Array.from(new TextEncoder().encode(text));
  let ver = 0;
  for (let v = 1; v <= 13; v++) {
    const cap = dataCw(v) * 8 - 4 - (v <= 9 ? 8 : 16);
    if (bytes.length * 8 <= cap) { ver = v; break; }
  }
  if (!ver) return null;

  const bits: number[] = [];
  const put = (val: number, n: number) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(4, 4);
  put(bytes.length, ver <= 9 ? 8 : 16);
  bytes.forEach((b) => put(b, 8));
  const capBits = dataCw(ver) * 8;
  put(0, Math.min(4, capBits - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  for (let pad = 0xec; data.length < dataCw(ver); pad ^= 0xec ^ 0x11) data.push(pad);

  const gfMul = (x: number, y: number) => {
    let z = 0;
    for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; }
    return z;
  };
  const rsDivisor = (deg: number) => {
    const res = new Array(deg - 1).fill(0); res.push(1);
    let root = 1;
    for (let i = 0; i < deg; i++) {
      for (let j = 0; j < res.length; j++) {
        res[j] = gfMul(res[j], root);
        if (j + 1 < res.length) res[j] ^= res[j + 1];
      }
      root = gfMul(root, 2);
    }
    return res;
  };
  const rsRemainder = (dat: number[], div: number[]) => {
    const res = div.map(() => 0);
    for (const b of dat) {
      const factor = (b ^ res.shift()!) || 0;
      res.push(0);
      div.forEach((coef, i) => { res[i] ^= gfMul(coef, factor); });
    }
    return res;
  };

  const nBlk = NBLK_L[ver], ecLen = ECC_L[ver];
  const raw = Math.floor(rawModules(ver) / 8);
  const nShort = nBlk - (raw % nBlk);
  const shortLen = Math.floor(raw / nBlk);
  const div = rsDivisor(ecLen);
  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < nBlk; i++) {
    const dat = data.slice(k, k + shortLen - ecLen + (i < nShort ? 0 : 1));
    k += dat.length;
    const ecc = rsRemainder(dat, div);
    if (i < nShort) dat.push(0);
    blocks.push(dat.concat(ecc));
  }
  const all: number[] = [];
  for (let i = 0; i < blocks[nBlk - 1].length; i++)
    blocks.forEach((blk, j) => { if (i !== shortLen - ecLen || j >= nShort) all.push(blk[i]); });

  const size = ver * 4 + 17;
  const mod: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const setFn = (x: number, y: number, dark: boolean) => { mod[y][x] = dark; fn[y][x] = true; };
  for (let i = 0; i < size; i++) { setFn(6, i, i % 2 === 0); setFn(i, 6, i % 2 === 0); }
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x >= 0 && x < size && y >= 0 && y < size) {
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        setFn(x, y, d !== 2 && d !== 4);
      }
    }
  };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  if (ver >= 2) {
    const na = Math.floor(ver / 7) + 2;
    const step = Math.ceil((ver * 4 + 4) / (na * 2 - 2)) * 2;
    const pos = [6];
    for (let p = size - 7; pos.length < na; p -= step) pos.splice(1, 0, p);
    for (let i = 0; i < na; i++) for (let j = 0; j < na; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++)
        setFn(pos[i] + dx, pos[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
  const getBit = (x: number, i: number) => ((x >>> i) & 1) !== 0;
  let fRem = (1 << 3) | 0;
  for (let i = 0; i < 10; i++) fRem = (fRem << 1) ^ ((fRem >>> 9) * 0x537);
  const fBits = ((((1 << 3) | 0) << 10) | fRem) ^ 0x5412;
  for (let i = 0; i <= 5; i++) setFn(8, i, getBit(fBits, i));
  setFn(8, 7, getBit(fBits, 6)); setFn(8, 8, getBit(fBits, 7)); setFn(7, 8, getBit(fBits, 8));
  for (let i = 9; i < 15; i++) setFn(14 - i, 8, getBit(fBits, i));
  for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, getBit(fBits, i));
  for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, getBit(fBits, i));
  setFn(8, size - 8, true);
  if (ver >= 7) {
    let vRem = ver;
    for (let i = 0; i < 12; i++) vRem = (vRem << 1) ^ ((vRem >>> 11) * 0x1f25);
    const vBits = (ver << 12) | vRem;
    for (let i = 0; i < 18; i++) {
      const b = getBit(vBits, i), a = size - 11 + (i % 3), c = Math.floor(i / 3);
      setFn(a, c, b); setFn(c, a, b);
    }
  }
  let bi = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!fn[y][x] && bi < all.length * 8) {
          mod[y][x] = getBit(all[bi >>> 3], 7 - (bi & 7));
          bi++;
        }
      }
    }
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++)
    if (!fn[y][x] && (x + y) % 2 === 0) mod[y][x] = !mod[y][x];
  return mod;
};

function QRSvg({ matrix, size = 250 }: { matrix: boolean[][]; size?: number }) {
  const n = matrix.length;
  let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++)
    if (matrix[y][x]) d += `M${x} ${y}h1v1h-1z`;
  return (
    <svg viewBox={`-4 -4 ${n + 8} ${n + 8}`} width={size} height={size} role="img" aria-label="Código QR con el instructivo del estudio">
      <rect x={-4} y={-4} width={n + 8} height={n + 8} fill="#ffffff" />
      <path d={d} fill="#0f172a" />
    </svg>
  );
}

interface QrModalProps {
  study: Pedido;
  onClose: () => void;
}

export function QrModal({ study, onClose }: QrModalProps) {
  const svgRef = useRef<HTMLDivElement>(null);
  const { instruccionesAmbulatorio } = useStore();
  const instructionForStudy = instruccionesAmbulatorio[study.modalidad] || instruccionesAmbulatorio["default"] || "";
  const payload = qrPayload(study, instructionForStudy);
  const matrix = qrMatrix(payload);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const descargarTxt = () => {
    const p = study._paciente || { hc: "sin-hc" };
    const blob = new Blob(["\ufeff" + payload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `instructivo-${p.hc}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const descargarQR = () => {
    if (!svgRef.current) return;
    const svgEl = svgRef.current.querySelector('svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const a = document.createElement("a");
    const p = study._paciente || { hc: "sin-hc" };
    a.href = url;
    a.download = `qr-paciente-${p.hc}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const imprimir = () => {
    window.print();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[95vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Instructivo para el paciente</h3>
            <p className="text-xs text-slate-500">Mostrale la pantalla para que lo lea, o imprimilo.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="mb-2 text-sm font-bold text-slate-700">Pasos a seguir:</h4>
          <ol className="list-inside list-decimal space-y-1 text-sm text-slate-600">
            {instructionForStudy.split('\n').filter(l => l.trim()).map((line, idx) => {
              const cleaned = line.replace(/^\d+[\)\.-]\s*/, '');
              return <li key={idx} className="leading-snug">{cleaned}</li>;
            })}
          </ol>
        </div>

        {matrix ? (
          <div className="mb-4">
             <p className="mb-2 text-xs font-medium text-slate-500 text-center">QR para escanear con el teléfono</p>
             <div ref={svgRef} className="mx-auto flex w-max justify-center rounded-xl border border-slate-200 bg-white p-3">
               <QRSvg matrix={matrix} />
             </div>
          </div>
        ) : (
          <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">No se pudo generar el QR (contenido demasiado largo).</p>
        )}
        
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button onClick={descargarQR} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"><Download size={13} /> QR (.svg)</button>
          <button onClick={descargarTxt} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"><Download size={13} /> Texto (.txt)</button>
          <button onClick={imprimir} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"><Printer size={13} /> Imprimir</button>
          <button onClick={onClose} className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800">Listo</button>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
