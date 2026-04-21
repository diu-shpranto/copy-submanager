import { useState } from 'react';
import { SingleSubscription, FamilySubscription } from '../types';
import { calculateExpiry, formatDateTime } from '../utils/subscriptions';

type AnySubscription = SingleSubscription | FamilySubscription;

function isFamilySubscription(sub: AnySubscription): sub is FamilySubscription {
  return 'familyEmail' in sub;
}

interface RenewModalProps {
  subscription: AnySubscription;
  onRenew: (id: string, duration: number) => void;
  onClose: () => void;
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function RenewModal({ subscription, onRenew, onClose }: RenewModalProps) {
  const [duration, setDuration] = useState(subscription.duration);
  const [error, setError] = useState('');

  const emailDisplay = isFamilySubscription(subscription)
    ? subscription.familyEmail
    : subscription.email;

  const now = new Date();
  const todayDate = todayStr();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const newExpiry = calculateExpiry(todayDate, currentTime, duration);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!duration || duration < 1) {
      setError('Duration must be at least 1 day');
      return;
    }
    if (duration > 3650) {
      setError('Duration cannot exceed 3650 days');
      return;
    }
    onRenew(subscription.id, duration);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="border-b border-slate-100 px-5 sm:px-6 py-4 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-800">Renew Subscription</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            &#10005;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-xs font-medium text-blue-500 uppercase tracking-wide mb-0.5">Renewing</p>
            <p className="text-sm font-semibold text-blue-800">{emailDisplay}</p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600">
            <p className="font-medium text-slate-700 mb-1">Renewal will start from today</p>
            <p className="text-xs">
              New start: <span className="font-semibold text-slate-800">{formatDateTime(now)}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              New Duration (Days) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={duration}
              onChange={e => {
                setDuration(parseInt(e.target.value) || 0);
                setError('');
              }}
              min={1}
              max={3650}
              className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                error ? 'border-red-300 bg-red-50' : 'border-slate-200'
              }`}
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm">
            <p className="font-medium text-emerald-700 mb-0.5">New expiry date</p>
            <p className="text-emerald-800 font-semibold">{formatDateTime(newExpiry)}</p>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition"
            >
              Renew Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
