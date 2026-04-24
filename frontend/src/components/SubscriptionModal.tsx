import { useState, useEffect } from 'react';
import { SingleSubscription, FamilySubscription, TabType, ModalMode } from '../types';
import { generateId } from '../utils/subscriptions';

type ModalData = SingleSubscription | FamilySubscription;

interface SubscriptionModalProps {
  mode: ModalMode;
  type: TabType;
  editingData?: ModalData;
  onSave: (data: ModalData) => void;
  onClose: () => void;
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function defaultTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export default function SubscriptionModal({
  mode,
  type,
  editingData,
  onSave,
  onClose,
}: SubscriptionModalProps) {
  const isSingle = type === 'single';

  const [email, setEmail] = useState('');
  const [familyEmail, setFamilyEmail] = useState('');
  const [members, setMembers] = useState<string[]>(['']);
  const [startDate, setStartDate] = useState(todayStr());
  const [startTime, setStartTime] = useState(defaultTime());
  const [duration, setDuration] = useState(30);
  const [planType, setPlanType] = useState<'regular' | 'renewal'>('regular');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mode === 'edit' && editingData) {
      setStartDate(editingData.startDate);
      setStartTime(editingData.startTime);
      setDuration(editingData.duration);
      setNote(editingData.note ?? '');
      if (isSingle) {
        setEmail((editingData as SingleSubscription).email);
      } else {
        const fd = editingData as FamilySubscription;
        setFamilyEmail(fd.familyEmail);
        setMembers(fd.members.length > 0 ? fd.members : ['']);
        setPlanType(fd.planType ?? 'regular');
      }
    }
  }, [mode, editingData, isSingle]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (isSingle) {
      if (!email.trim()) e.email = 'Email is required';
      else if (!emailRegex.test(email)) e.email = 'Enter a valid email';
    } else {
      if (!familyEmail.trim()) e.familyEmail = 'Family email is required';
      else if (!emailRegex.test(familyEmail)) e.familyEmail = 'Enter a valid email';
      members.forEach((m, i) => {
        if (m.trim() && !emailRegex.test(m)) {
          e[`member_${i}`] = 'Enter a valid email';
        }
      });
    }

    if (!startDate) e.startDate = 'Start date is required';
    if (!startTime) e.startTime = 'Start time is required';
    if (!duration || duration < 1) e.duration = 'Duration must be at least 1 day';
    if (duration > 3650) e.duration = 'Duration cannot exceed 3650 days';

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    if (isSingle) {
      const data: SingleSubscription = {
        id: mode === 'edit' && editingData ? editingData.id : generateId(),
        email: email.trim(),
        startDate,
        startTime,
        duration,
        note: note.trim() || undefined,
      };
      onSave(data);
    } else {
      const cleanMembers = members.map(m => m.trim()).filter(Boolean);
      const data: FamilySubscription = {
        id: mode === 'edit' && editingData ? editingData.id : generateId(),
        familyEmail: familyEmail.trim(),
        members: cleanMembers,
        startDate,
        startTime,
        duration,
        planType,
        note: note.trim() || undefined,
      };
      onSave(data);
    }
  }

  function addMember() {
    if (members.length < 5) setMembers([...members, '']);
  }

  function removeMember(index: number) {
    setMembers(members.filter((_, i) => i !== index));
  }

  function updateMember(index: number, value: string) {
    const updated = [...members];
    updated[index] = value;
    setMembers(updated);
  }

  const title = mode === 'add'
    ? (isSingle ? 'Add Single Subscription' : 'Add Family Plan')
    : (isSingle ? 'Edit Subscription' : 'Edit Family Plan');

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex-shrink-0 bg-white border-b border-slate-100 px-5 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-base sm:text-lg font-bold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-lg leading-none"
          >
            &#10005;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4">
          {isSingle ? (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Email Address <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="user@example.com"
                autoComplete="email"
                className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                  errors.email ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
                }`}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
          ) : (
            <>
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Family Account</p>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Family Email Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={familyEmail}
                    onChange={e => setFamilyEmail(e.target.value)}
                    placeholder="family@gmail.com"
                    autoComplete="email"
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                      errors.familyEmail ? 'border-red-300 bg-red-50' : 'border-white bg-white'
                    }`}
                  />
                  {errors.familyEmail && <p className="text-xs text-red-500 mt-1">{errors.familyEmail}</p>}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Member Accounts <span className="normal-case font-normal text-slate-400">({members.length}/5)</span>
                  </p>
                  {members.length < 5 && (
                    <button
                      type="button"
                      onClick={addMember}
                      className="text-xs text-blue-600 hover:text-blue-700 font-semibold bg-white border border-blue-200 px-2.5 py-1 rounded-lg transition"
                    >
                      + Add Member
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {members.map((m, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <input
                          type="email"
                          value={m}
                          onChange={e => updateMember(i, e.target.value)}
                          placeholder={`member${i + 1}@gmail.com`}
                          className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white ${
                            errors[`member_${i}`] ? 'border-red-300 bg-red-50' : 'border-slate-200'
                          }`}
                        />
                        {errors[`member_${i}`] && (
                          <p className="text-xs text-red-500 mt-1">{errors[`member_${i}`]}</p>
                        )}
                      </div>
                      {members.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMember(i)}
                          className="mt-0.5 w-9 h-9 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-xl transition flex-shrink-0"
                        >
                          &#10005;
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Start Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                  errors.startDate ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
                }`}
              />
              {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Start Time <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                  errors.startTime ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
                }`}
              />
              {errors.startTime && <p className="text-xs text-red-500 mt-1">{errors.startTime}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Duration (Days) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={duration}
              onChange={e => setDuration(parseInt(e.target.value) || 0)}
              min={1}
              max={3650}
              placeholder="30"
              className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                errors.duration ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
              }`}
            />
            {errors.duration && <p className="text-xs text-red-500 mt-1">{errors.duration}</p>}
          </div>

          {!isSingle && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Plan Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPlanType('regular')}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold border-2 transition-all ${
                    planType === 'regular'
                      ? 'border-blue-500 bg-blue-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Regular
                </button>
                <button
                  type="button"
                  onClick={() => setPlanType('renewal')}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold border-2 transition-all ${
                    planType === 'renewal'
                      ? 'border-emerald-500 bg-emerald-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Renewal
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Note <span className="text-slate-400 font-normal text-xs">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add any notes about this subscription..."
              rows={2}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none bg-white"
            />
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
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
            >
              {mode === 'add' ? 'Add' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
