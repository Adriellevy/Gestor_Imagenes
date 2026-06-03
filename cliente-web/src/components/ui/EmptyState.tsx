import { Activity } from 'lucide-react';

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-slate-300 bg-white/50 px-6 py-16 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
        <Activity size={22} />
      </div>
      <p className="max-w-xs text-sm text-slate-500">{text}</p>
    </div>
  );
}
