import { useRef, useCallback, useEffect, useState } from 'react';
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
  horizontal?: boolean;
  hasMore?: boolean;
  loading?: boolean;
  onLoadMore?: () => void;
}

export function ClinicalSection({ 
  usuarios, title, items, allStudies = [], role, now, perms, currentUser, 
  advance, revert, authorize, onEdit, onAvisado, cancel, solicitarTraslado,
  horizontal, hasMore, loading, onLoadMore
}: ClinicalSectionProps) {
  const [visibleCount, setVisibleCount] = useState(9);
  const scrollRef = useRef<HTMLDivElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  const visibleItems = items.slice(0, visibleCount);

  const handleLoadMore = useCallback(() => {
    if (visibleCount < items.length) {
      setVisibleCount(prev => prev + 9);
    } else if (hasMore && onLoadMore) {
      onLoadMore();
    }
  }, [visibleCount, items.length, hasMore, onLoadMore]);

  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    if (node) {
      observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      }, {
        root: horizontal ? scrollRef.current : null,
        rootMargin: "100px"
      });
      observer.current.observe(node);
    }
  }, [loading, handleLoadMore, horizontal]);

  // Initial load request if empty (only for horizontal list used for finalizados)
  useEffect(() => {
    if (horizontal && items.length === 0 && onLoadMore && hasMore && !loading) {
      onLoadMore();
    }
  }, [horizontal, items.length, onLoadMore, hasMore, loading]);

  if (!items.length && !loading) return null;
  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600" style={{ fontFamily: FONT_MONO }}>{items.length}</span>
      </div>
      <div ref={scrollRef} className={horizontal ? "flex gap-3 overflow-x-auto pb-4 snap-x" : "grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3"}>
        {visibleItems.map((s, idx) => (
          <div key={s.id} ref={idx === visibleItems.length - 1 ? lastElementRef : null} style={{ animation: "up .25s ease both" }} className={horizontal ? "min-w-[320px] max-w-[400px] snap-start shrink-0" : ""}>
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
        {loading && <div className="grid place-items-center p-4 text-sm text-slate-500 shrink-0 col-span-full">Cargando más...</div>}
      </div>
    </section>
  );
}

