import { useState } from 'react';
import { SingleSubscription, FamilySubscription } from '../types';
import { calculateExpiry } from '../utils/subscriptions';

interface CalendarWidgetProps {
  singles: SingleSubscription[];
  families: FamilySubscription[];
  now: Date;
}

export default function CalendarWidget({ singles, families, now }: CalendarWidgetProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const allSubs = [...singles, ...families];
  
  const getExpirationsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return allSubs.filter(sub => {
      const expiry = calculateExpiry(sub.startDate, sub.startTime, sub.duration);
      return expiry.toISOString().split('T')[0] === dateStr;
    });
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-3 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <span>📅</span> Expiry Calendar
        </h3>
        <button
          onClick={goToToday}
          className="text-[10px] text-indigo-500 hover:text-indigo-600"
        >
          Today
        </button>
      </div>
      
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="p-1 hover:bg-slate-100 rounded transition"
          >
            ←
          </button>
          <span className="text-sm font-semibold text-slate-700">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="p-1 hover:bg-slate-100 rounded transition"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-[10px] font-semibold text-slate-400 py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((date, idx) => {
            if (!date) {
              return <div key={idx} className="h-10" />;
            }
            
            const expirations = getExpirationsForDate(date);
            const isToday = date.toDateString() === new Date().toDateString();
            const isSelected = selectedDate?.toDateString() === date.toDateString();
            const hasExpiry = expirations.length > 0;
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(date)}
                className={`
                  relative h-10 rounded-lg transition-all
                  ${isSelected ? 'bg-indigo-500 text-white shadow-md' : ''}
                  ${isToday && !isSelected ? 'ring-2 ring-indigo-300' : ''}
                  ${hasExpiry && !isSelected ? 'bg-red-50' : ''}
                  ${isWeekend && !hasExpiry && !isSelected ? 'text-slate-300' : ''}
                  hover:bg-slate-100
                `}
              >
                <span className={`text-xs font-medium ${isSelected ? 'text-white' : hasExpiry ? 'text-red-600' : 'text-slate-600'}`}>
                  {date.getDate()}
                </span>
                {hasExpiry && (
                  <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-red-500'}`} />
                )}
              </button>
            );
          })}
        </div>

        {selectedDate && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-600 mb-2">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            {getExpirationsForDate(selectedDate).length > 0 ? (
              <div className="space-y-1.5">
                {getExpirationsForDate(selectedDate).map((sub, idx) => (
                  <div key={idx} className="text-[11px] text-slate-600 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                    <span className="truncate">
                      {'email' in sub ? sub.email : sub.familyEmail}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">No expirations on this day</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}