import { useState } from 'react';
import { SingleSubscription, SubscriptionStatus } from '../types';
import {
  calculateExpiry,
  formatDateTime,
  getTimeRemaining,
  getStatus,
  formatCountdown,
} from '../utils/subscriptions';
import StatusBadge from './StatusBadge';

interface SingleTableProps {
  subscriptions: SingleSubscription[];
  now: Date;
  onEdit: (sub: SingleSubscription) => void;
  onRenew: (sub: SingleSubscription) => void;
  onDelete: (id: string) => void;
}

type SortKey = 'email' | 'started' | 'expires' | 'duration' | 'status';
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

// Helper to format date on two lines: date on top, time below
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

// Updated Countdown component - days/hours/minutes on top, seconds on bottom
function Countdown({ status, countdown, expired, daysRemaining }: { 
  status: SubscriptionStatus; 
  countdown: string; 
  expired: boolean;
  daysRemaining: number;
}) {
  if (expired) {
    return <span className="text-slate-400 text-xs font-medium italic">Expired</span>;
  }
  
  const isAlert = daysRemaining <= 7 && daysRemaining > 0;
  
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
    <div className="flex flex-col items-start gap-1">
      <div className={`inline-flex flex-col items-center font-mono font-semibold text-xs px-2 py-1 rounded-md ${cls}`}>
        {topLine && <span>{topLine}</span>}
        <span className={topLine ? 'text-[10px] opacity-80' : ''}>{bottomLine}</span>
      </div>
      {isAlert && (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {daysRemaining} days left
        </span>
      )}
    </div>
  );
}

function ActionButtons({ onEdit, onRenew, onDelete }: { onEdit: () => void; onRenew: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={onEdit} className="h-7 px-2.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors">Edit</button>
      <button onClick={onRenew} className="h-7 px-2.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors">Renew</button>
      <button onClick={onDelete} className="h-7 px-2.5 text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">Delete</button>
    </div>
  );
}

export default function SingleTable({ subscriptions, now, onEdit, onRenew, onDelete }: SingleTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('expires');
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
      case 'email':
        cmp = a.email.localeCompare(b.email);
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
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const cols: { key: SortKey | null; label: string }[] = [
    { key: null,       label: '#' },
    { key: 'email',    label: 'Email Address' },
    { key: 'started',  label: 'Started' },
    { key: 'expires',  label: 'Expires' },
    { key: null,       label: 'Countdown' },
    { key: 'status',   label: 'Status' },
    { key: null,       label: 'Note' },
    { key: null,       label: 'Actions' },
  ];

  if (subscriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7 text-slate-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-slate-700 mb-1">No subscriptions yet</p>
        <p className="text-xs text-slate-400">Click &quot;Add Subscription&quot; to get started</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Mobile cards ── */}
      <div className="md:hidden divide-y divide-slate-100">
        {/* Mobile sort bar */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap flex-shrink-0">Sort:</span>
          {(['email', 'started', 'expires', 'duration', 'status'] as SortKey[]).map(key => (
            <button
              key={key}
              onClick={() => toggleSort(key)}
              className={`flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap ${
                sortKey === key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
            >
              {key === 'email' ? 'Email' : key === 'started' ? 'Started' : key === 'expires' ? 'Expires' : key === 'duration' ? 'Days' : 'Status'}
              {sortKey === key && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
            </button>
          ))}
        </div>

        {sorted.map((sub) => {
          const expiry = calculateExpiry(sub.startDate, sub.startTime, sub.duration);
          const start  = calculateExpiry(sub.startDate, sub.startTime, 0);
          const remaining = getTimeRemaining(expiry, now);
          const status = getStatus(expiry, now);
          const countdown = formatCountdown(remaining);
          const daysRemaining = Math.ceil(remaining.total / (1000 * 60 * 60 * 24));
          const { dateLine: startDate, timeLine: startTimeLine } = formatDateTwoLines(start);
          const { dateLine: expiryDate, timeLine: expiryTimeLine } = formatDateTwoLines(expiry);

          return (
            <div key={sub.id} className={`p-4 border-l-4 ${ROW_ACCENT[status]} space-y-3`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 text-sm break-all leading-snug">{sub.email}</p>
                  {sub.note && <p className="text-xs text-slate-400 mt-0.5 italic">{sub.note}</p>}
                </div>
                <div className="flex-shrink-0">
                  <StatusBadge status={status} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Started</p>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-700">{startDate}</span>
                    <span className="text-[11px] text-slate-400">{startTimeLine}</span>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Expires</p>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-700">{expiryDate}</span>
                    <span className="text-[11px] text-slate-400">{expiryTimeLine}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{sub.duration}</span> days
                </span>
                <Countdown status={status} countdown={countdown} expired={remaining.total <= 0} daysRemaining={daysRemaining} />
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

      {/* ── Desktop table ── */}
      <div className="hidden md:block overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr>
              {cols.map(({ key, label }) => (
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
              const start  = calculateExpiry(sub.startDate, sub.startTime, 0);
              const remaining = getTimeRemaining(expiry, now);
              const status = getStatus(expiry, now);
              const countdown = formatCountdown(remaining);
              const daysRemaining = Math.ceil(remaining.total / (1000 * 60 * 60 * 24));
              const isLast = idx === sorted.length - 1;
              const { dateLine: startDateLine, timeLine: startTimeLine } = formatDateTwoLines(start);
              const { dateLine: expiryDateLine, timeLine: expiryTimeLine } = formatDateTwoLines(expiry);
              
              // Row background for alert (7 days or less remaining)
              const rowBgClass = daysRemaining <= 7 && daysRemaining > 0 && status !== 'expired'
                ? 'bg-amber-50/40'
                : status === 'critical'
                ? 'bg-red-50/30'
                : '';

              return (
                <tr
                  key={sub.id}
                  className={`group border-l-4 ${ROW_ACCENT[status]} hover:bg-slate-50/80 transition-colors ${!isLast ? 'border-b border-slate-100' : ''} ${rowBgClass}`}
                >
                  <td className="px-4 py-3.5 text-xs text-slate-400 font-medium tabular-nums">{idx + 1}</td>
                  <td className="px-4 py-3.5">
                    <span className="font-semibold text-slate-800 text-[13px] break-all">{sub.email}</span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-slate-700">{startDateLine}</span>
                      <span className="text-[11px] text-slate-400">{startTimeLine}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-slate-700">{expiryDateLine}</span>
                      <span className="text-[11px] text-slate-400">{expiryTimeLine}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <Countdown status={status} countdown={countdown} expired={remaining.total <= 0} daysRemaining={daysRemaining} />
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={status} />
                  </td>
                  <td className="px-4 py-3.5 max-w-[140px]">
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