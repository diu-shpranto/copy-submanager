import { SubscriptionStatus } from '../types';

const CONFIG: Record<SubscriptionStatus, { label: string; dot: string; badge: string }> = {
  active:   { label: 'Active',   dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  warning:  { label: 'Warning',  dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  critical: { label: 'Critical', dot: 'bg-red-500 animate-pulse', badge: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  expired:  { label: 'Expired',  dot: 'bg-slate-400',   badge: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200' },
};

interface StatusBadgeProps {
  status: SubscriptionStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const c = CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${c.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {c.label}
    </span>
  );
}
