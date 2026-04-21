import { useState } from 'react';
import { SingleSubscription, FamilySubscription } from '../types';
import { calculateExpiry, getStatus, getTimeRemaining } from '../utils/subscriptions';

interface AnalyticsWidgetProps {
  singles: SingleSubscription[];
  families: FamilySubscription[];
  now: Date;
}

type ChartType = 'donut' | 'bar' | 'trend';

export default function AnalyticsWidget({ singles, families, now }: AnalyticsWidgetProps) {
  const [chartType, setChartType] = useState<ChartType>('donut');

  const allSubs = [...singles, ...families];
  
  const statusCounts = {
    active: 0,
    warning: 0,
    critical: 0,
    expired: 0
  };

  let totalDaysRemaining = 0;
  let expiringSoonCount = 0;

  allSubs.forEach(sub => {
    const expiry = calculateExpiry(sub.startDate, sub.startTime, sub.duration);
    const status = getStatus(expiry, now);
    statusCounts[status]++;
    
    const remaining = getTimeRemaining(expiry, now);
    const daysRemaining = Math.ceil(remaining.total / (1000 * 60 * 60 * 24));
    if (daysRemaining > 0 && daysRemaining <= 30) {
      totalDaysRemaining += daysRemaining;
      if (daysRemaining <= 7) expiringSoonCount++;
    }
  });

  const total = allSubs.length;
  const activePercentage = total > 0 ? ((statusCounts.active + statusCounts.warning + statusCounts.critical) / total * 100).toFixed(0) : 0;

  const stats = [
    { label: 'Total Subs', value: total, icon: '📊', color: 'from-indigo-500 to-blue-500' },
    { label: 'Active', value: `${activePercentage}%`, icon: '✅', color: 'from-emerald-500 to-green-500' },
    { label: 'Expiring Soon', value: expiringSoonCount, icon: '⚠️', color: 'from-amber-500 to-orange-500' },
    { label: 'Expired', value: statusCounts.expired, icon: '❌', color: 'from-rose-500 to-red-500' },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <span>📈</span> Analytics Dashboard
        </h3>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setChartType('donut')}
            className={`px-2 py-1 text-[10px] rounded ${chartType === 'donut' ? 'bg-white shadow-sm' : ''}`}
          >
            Donut
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-2 py-1 text-[10px] rounded ${chartType === 'bar' ? 'bg-white shadow-sm' : ''}`}
          >
            Bar
          </button>
          <button
            onClick={() => setChartType('trend')}
            className={`px-2 py-1 text-[10px] rounded ${chartType === 'trend' ? 'bg-white shadow-sm' : ''}`}
          >
            Trend
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {stats.map((stat) => (
          <div key={stat.label} className={`bg-gradient-to-r ${stat.color} rounded-lg p-2 text-white`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium opacity-90">{stat.label}</span>
              <span className="text-sm">{stat.icon}</span>
            </div>
            <p className="text-xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Chart Visualization */}
      <div className="space-y-3">
        {chartType === 'donut' && (
          <div className="relative w-32 h-32 mx-auto">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              {Object.entries({
                active: statusCounts.active + statusCounts.warning + statusCounts.critical,
                expired: statusCounts.expired
              }).map(([status, count], idx) => {
                const percentage = total > 0 ? (count / total) * 100 : 0;
                const circumference = 2 * Math.PI * 40;
                const dasharray = (percentage / 100) * circumference;
                const colors = { active: '#10b981', expired: '#94a3b8' };
                return (
                  <circle
                    key={status}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={colors[status as keyof typeof colors]}
                    strokeWidth="20"
                    strokeDasharray={`${dasharray} ${circumference}`}
                    strokeDashoffset={idx === 0 ? 0 : `-${(statusCounts.active + statusCounts.warning + statusCounts.critical) / total * circumference}`}
                    className="transition-all duration-500"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-slate-700">{activePercentage}%</span>
            </div>
          </div>
        )}

        {chartType === 'bar' && (
          <div className="space-y-2">
            {Object.entries(statusCounts).map(([status, count]) => {
              const percentage = total > 0 ? (count / total) * 100 : 0;
              const colors = {
                active: 'bg-emerald-500',
                warning: 'bg-amber-500',
                critical: 'bg-red-500',
                expired: 'bg-slate-400'
              };
              return (
                <div key={status}>
                  <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                    <span className="capitalize">{status}</span>
                    <span>{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors[status as keyof typeof colors]} rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {chartType === 'trend' && (
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-slate-700">{total}</p>
            <p className="text-[10px] text-slate-500">Total Subscriptions</p>
            <div className="mt-3 flex justify-center gap-4">
              <div>
                <p className="text-lg font-semibold text-emerald-600">{statusCounts.active + statusCounts.warning + statusCounts.critical}</p>
                <p className="text-[9px] text-slate-400">Active</p>
              </div>
              <div className="w-px bg-slate-200" />
              <div>
                <p className="text-lg font-semibold text-amber-600">{expiringSoonCount}</p>
                <p className="text-[9px] text-slate-400">Expiring in 7d</p>
              </div>
              <div className="w-px bg-slate-200" />
              <div>
                <p className="text-lg font-semibold text-rose-600">{statusCounts.expired}</p>
                <p className="text-[9px] text-slate-400">Expired</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}