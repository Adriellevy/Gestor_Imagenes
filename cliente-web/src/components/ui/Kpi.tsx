import type { LucideIcon } from 'lucide-react';

const FONT_MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace";

export function Kpi({ Icon, label, value, accent }: { Icon: LucideIcon, label: string, value: number | string, accent: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: accent + "1a", color: accent }}>
        <Icon size={18} />
      </span>
      <div>
        <div className="text-2xl font-semibold leading-none text-slate-900" style={{ fontFamily: FONT_MONO }}>
          {value}
        </div>
        <div className="mt-1 text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}
