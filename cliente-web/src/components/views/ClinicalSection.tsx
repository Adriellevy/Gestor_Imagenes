import { StudyCard } from '../studies/StudyCard';
import type { Pedido, Usuario } from '../../types';

const FONT_MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace";

interface ClinicalSectionProps {
  usuarios: Usuario[];
  title: string;
  items: Pedido[];
  allStudies?: Pedido[];
  role: string;
  now: number;
  perms: Record<string, boolean>;
  currentUser?: Usuario;
  advance: (id: string) => void;
  revert: (id: string) => void;
  authorize: (id: string) => void;
  onEdit: (study: Pedido) => void;
  onAvisado: (id: string) => void;
  cancel: (id: string) => void;
  solicitarTraslado?: (id: string) => void;
}

export function ClinicalSection({ 
  usuarios, title, items, allStudies = [], role, now, perms, currentUser, 
  advance, revert, authorize, onEdit, onAvisado, cancel, solicitarTraslado 
}: ClinicalSectionProps) {
  if (!items.length) return null;
  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600" style={{ fontFamily: FONT_MONO }}>{items.length}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {items.map((s) => (
          <div key={s.id} style={{ animation: "up .25s ease both" }}>
            <StudyCard 
              study={s} 
              patientStudies={allStudies.filter(x => x.internacionId === s.internacionId)}
              usuarios={usuarios}
              role={role} 
              now={now} 
              perms={perms} 
              currentUser={currentUser} 
              onAdvance={advance} 
              onRevert={revert} 
              onAuthorize={authorize} 
              onEdit={onEdit} 
              onAvisado={onAvisado} 
              onCancel={cancel} 
              onTransfer={solicitarTraslado}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
