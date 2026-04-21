import { useState } from 'react';
import { FamilySubscription, SubscriptionStatus } from '../types';
import {
  calculateExpiry,
  formatDateTime,
  getTimeRemaining,
  getStatus,
  formatCountdown,
} from '../utils/subscriptions';
import StatusBadge from './StatusBadge';

interface FamilyTableProps {
  subscriptions: FamilySubscription[];
  now: Date;
  onEdit: (sub: FamilySubscription) => void;
  onRenew: (sub: FamilySubscription) => void;
  onDelete: (id: string) => void;
}

type SortKey = 'familyEmail' | 'started' | 'expires' | 'duration' | 'status' | 'planType';
type SortDir = 'asc' | 'desc';

const ROW_ACCENT: Record<SubscriptionStatus, string> = {
  active:   'border-l-emerald-400',
  warning:  'border-l-amber-400',
  critical: 'border-l-red-500',
  expired:  'border-l-slate-300',
};

const STATUS_ORDER: Record<SubscriptionStatus, number> = {
  critical: 0, warning: 1, active: 2, expired: 3,
};

function SortIcon({ dir, active }: { dir: SortDir; active: boolean }) {
  return (
    <span className={`inline-flex flex-col gap-px ml-1 ${active ? 'opacity-100' : 'opacity-30'}`}>
      <svg viewBox="0 0 8 5" className={`w-2 h-1.5 ${active && dir === 'asc' ? 'text-blue-600' : 'text-slate-400'}`} fill="currentColor">
        <path d="M4 0L7.46 4.5H.54L4 0z" />
      </svg>
      <svg viewBox="0 0 8 5" className={`w-2 h-1.5 ${active && dir === 'desc' ? 'text-blue-600' : 'text-slate-400'}`} fill="currentColor">
        <path d="M4 5L.54.5H7.46L4 5z" />
      </svg>
    </span>
  );
}

function PlanTypeBadge({ planType }: { planType: 'regular' | 'renewal' }) {
  return planType === 'renewal' ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">
      &#8635; Renewal
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 ring-1 ring-blue-200 px-2 py-0.5 rounded-full whitespace-nowrap">
      Regular
    </span>
  );
}

function Countdown({ status, countdown, expired }: { status: SubscriptionStatus; countdown: string; expired: boolean }) {
  if (expired) return <span className="text-slate-400 text-xs font-medium italic">—</span>;
  
  const parts = countdown.split(' ');
  let topLine = '';
  let bottomLine = '';
  
  if (parts.length === 4) {
    topLine = `${parts[0]} ${parts[1]} ${parts[2]}`;
    bottomLine = parts[3];
  } else if (parts.length === 3) {
    topLine = `${parts[0]} ${parts[1]}`;
    bottomLine = parts[2];
  } else if (parts.length === 2) {
    topLine = parts[0];
    bottomLine = parts[1];
  } else {
    topLine = '';
    bottomLine = countdown;
  }
  
  const cls =
    status === 'critical' ? 'text-red-600 bg-red-50 ring-1 ring-red-200' :
    status === 'warning'  ? 'text-amber-700 bg-amber-50 ring-1 ring-amber-200' :
                            'text-slate-700 bg-slate-50 ring-1 ring-slate-200';
  
  return (
    <div className={`inline-flex flex-col items-center font-mono font-semibold text-xs px-2 py-1 rounded-md ${cls}`}>
      {topLine && <span>{topLine}</span>}
      <span className={topLine ? 'text-[10px] opacity-80' : ''}>{bottomLine}</span>
    </div>
  );
}

function ActionButtons({ onEdit, onRenew, onDelete }: { onEdit: () => void; onRenew: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={onEdit} className="h-7 px-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">Edit</button>
      <button onClick={onRenew} className="h-7 px-2.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">Renew</button>
      <button onClick={onDelete} className="h-7 px-2.5 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors">Delete</button>
    </div>
  );
}

function formatDateTwoLines(date: Date): { dateLine: string; timeLine: string } {
  const formatted = formatDateTime(date);
  const parts = formatted.split(', ');
  if (parts.length >= 2) {
    return {
      dateLine: parts[0],
      timeLine: parts.slice(1).join(', ')
    };
  }
  return { dateLine: formatted, timeLine: '' };
}

// FamilyTreeCell - members are hidden by default (collapsed)
function FamilyTreeCell({ familyEmail, members }: { familyEmail: string; members: string[] }) {
  const [expanded, setExpanded] = useState(false); // Default: collapsed (hide members)
  
  return (
    <div className="tree-cell">
      <div className="flex items-center gap-1.5 mb-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center hover:bg-slate-200 transition-colors"
        >
          <svg 
            className={`w-3 h-3 text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div className="rounded-lg border border-blue-100 bg-blue-50/50 overflow-hidden flex-1">
          <div className="px-2.5 py-1 bg-blue-100/50 border-b border-blue-100">
            <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">Family</span>
          </div>
          <p className="px-2.5 py-1.5 text-xs font-semibold text-blue-900 break-words leading-snug">{familyEmail}</p>
        </div>
      </div>
      
      {expanded && members.length > 0 && (
        <div className="ml-5 pl-3 border-l-2 border-slate-200">
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 overflow-hidden">
            <div className="px-2.5 py-1 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Members</span>
              <span className="text-[9px] font-semibold text-slate-400 tabular-nums">{members.length}/5</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {members.map((m, i) => (
                <li key={i} className="px-2.5 py-1.5 flex items-center gap-2 hover:bg-slate-100/50 transition-colors">
                  <div className="relative">
                    <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                    {i < members.length - 1 && (
                      <div className="absolute top-3 left-1.5 w-px h-5 bg-slate-300"></div>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-700 break-words leading-snug flex-1">{m}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {expanded && members.length === 0 && (
        <div className="ml-5 pl-3 border-l-2 border-slate-200">
          <p className="text-[11px] text-slate-400 italic py-2 px-2">No members added</p>
        </div>
      )}
    </div>
  );
}

export default function FamilyTable({ subscriptions, now, onEdit, onRenew, onDelete }: FamilyTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('started');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sorted = [...subscriptions].sort((a, b) => {
    const expiryA = calculateExpiry(a.startDate, a.startTime, a.duration);
    const expiryB = calculateExpiry(b.startDate, b.startTime, b.duration);
    const startA = calculateExpiry(a.startDate, a.startTime, 0);
    const startB = calculateExpiry(b.startDate, b.startTime, 0);
    const statusA = getStatus(expiryA, now);
    const statusB = getStatus(expiryB, now);

    let cmp = 0;
    switch (sortKey) {
      case 'familyEmail':
        cmp = a.familyEmail.localeCompare(b.familyEmail);
        break;
      case 'started':
        cmp = startA.getTime() - startB.getTime();
        break;
      case 'expires':
        cmp = expiryA.getTime() - expiryB.getTime();
        break;
      case 'duration':
        cmp = a.duration - b.duration;
        break;
      case 'status':
        cmp = STATUS_ORDER[statusA] - STATUS_ORDER[statusB];
        break;
      case 'planType':
        cmp = (a.planType ?? 'regular').localeCompare(b.planType ?? 'regular');
        break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const sortableCols: { key: SortKey | null; label: string }[] = [
    { key: null,           label: '#' },
    { key: 'familyEmail',  label: 'Family Account & Members' },
    { key: 'started',      label: 'Started' },
    { key: 'expires',      label: 'Expires' },
    { key: null,           label: 'Countdown' },
    { key: 'status',       label: 'Status' },
    { key: 'planType',     label: 'Plan Type' },
    { key: null,           label: 'Note' },
    { key: null,           label: 'Actions' },
  ];

  const mobileSortKeys: { key: SortKey; label: string }[] = [
    { key: 'familyEmail', label: 'Family' },
    { key: 'started',     label: 'Started' },
    { key: 'expires',     label: 'Expires' },
    { key: 'duration',    label: 'Days' },
    { key: 'status',      label: 'Status' },
    { key: 'planType',    label: 'Plan' },
  ];

  if (subscriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7 text-slate-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-slate-700 mb-1">No family plans yet</p>
        <p className="text-xs text-slate-400">Click "Add Family Plan" to get started</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden divide-y divide-slate-100">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap flex-shrink-0">Sort:</span>
          {mobileSortKeys.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => toggleSort(key)}
              className={`flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap ${
                sortKey === key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
            >
              {label}
              {sortKey === key && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
            </button>
          ))}
        </div>

        {sorted.map((sub) => {
          const expiry = calculateExpiry(sub.startDate, sub.startTime, sub.duration);
          const start = calculateExpiry(sub.startDate, sub.startTime, 0);
          const remaining = getTimeRemaining(expiry, now);
          const status = getStatus(expiry, now);
          const countdown = formatCountdown(remaining);
          const planType = sub.planType ?? 'regular';

          return (
            <div key={sub.id} className={`p-4 border-l-4 ${ROW_ACCENT[status]} space-y-3`}>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={status} />
                <PlanTypeBadge planType={planType} />
              </div>

              <FamilyTreeCell familyEmail={sub.familyEmail} members={sub.members} />

              {sub.note && <p className="text-xs text-slate-400 italic">{sub.note}</p>}

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Started</p>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-700">{formatDateTwoLines(start).dateLine}</span>
                    <span className="text-[11px] text-slate-400">{formatDateTwoLines(start).timeLine}</span>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Expires</p>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-700">{formatDateTwoLines(expiry).dateLine}</span>
                    <span className="text-[11px] text-slate-400">{formatDateTwoLines(expiry).timeLine}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500"><span className="font-semibold text-slate-700">{sub.duration}</span> days</span>
                <Countdown status={status} countdown={countdown} expired={remaining.total <= 0} />
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                <button onClick={() => onEdit(sub)} className="py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">Edit</button>
                <button onClick={() => onRenew(sub)} className="py-2 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">Renew</button>
                <button onClick={() => onDelete(sub.id)} className="py-2 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">Delete</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr>
              {sortableCols.map(({ key, label }) => (
                <th
                  key={label}
                  onClick={key ? () => toggleSort(key) : undefined}
                  className={`sticky top-0 bg-slate-50 border-y border-slate-200 text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap select-none ${
                    key ? 'cursor-pointer hover:bg-slate-100 hover:text-slate-700 transition-colors' : ''
                  } ${key && sortKey === key ? 'text-blue-600 bg-blue-50/60' : ''}`}
                >
                  <span className="inline-flex items-center">
                    {label}
                    {key && <SortIcon dir={sortDir} active={sortKey === key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((sub, idx) => {
              const expiry = calculateExpiry(sub.startDate, sub.startTime, sub.duration);
              const start = calculateExpiry(sub.startDate, sub.startTime, 0);
              const { dateLine: startDate, timeLine: startTimeLine } = formatDateTwoLines(start);
              const { dateLine: expiryDate, timeLine: expiryTimeLine } = formatDateTwoLines(expiry);
              const remaining = getTimeRemaining(expiry, now);
              const status = getStatus(expiry, now);
              const countdown = formatCountdown(remaining);
              const planType = sub.planType ?? 'regular';
              const isLast = idx === sorted.length - 1;

              return (
                <tr
                  key={sub.id}
                  className={`border-l-4 ${ROW_ACCENT[status]} hover:bg-slate-50/80 transition-colors align-top ${!isLast ? 'border-b border-slate-100' : ''}`}
                >
                  <td className="px-4 py-3.5 text-xs text-slate-400 font-medium tabular-nums">{idx + 1}</td>
                  <td className="px-4 py-3.5 min-w-[300px]">
                    <FamilyTreeCell familyEmail={sub.familyEmail} members={sub.members} />
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-slate-700">{startDate}</span>
                      <span className="text-[11px] text-slate-400">{startTimeLine}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-slate-700">{expiryDate}</span>
                      <span className="text-[11px] text-slate-400">{expiryTimeLine}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <Countdown status={status} countdown={countdown} expired={remaining.total <= 0} />
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={status} />
                  </td>
                  <td className="px-4 py-3.5">
                    <PlanTypeBadge planType={planType} />
                  </td>
                  <td className="px-4 py-3.5 max-w-[130px]">
                    {sub.note
                      ? <span className="text-xs text-slate-400 italic line-clamp-2 break-words" title={sub.note}>{sub.note}</span>
                      : <span className="text-slate-300 text-xs">—</span>
                    }
                  </td>
                  <td className="px-4 py-3.5">
                    <ActionButtons onEdit={() => onEdit(sub)} onRenew={() => onRenew(sub)} onDelete={() => onDelete(sub.id)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}