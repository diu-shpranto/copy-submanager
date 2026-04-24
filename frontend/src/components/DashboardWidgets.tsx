import { useState } from 'react';
import { SingleSubscription, FamilySubscription } from '../types';
import AnalyticsWidget from './AnalyticsWidget';
import CalendarWidget from './CalendarWidget';
import NotificationBell from './NotificationBell';

interface DashboardWidgetsProps {
  singles: SingleSubscription[];
  families: FamilySubscription[];
  now: Date;
}

type Widget = 'analytics' | 'calendar' | 'notifications' | 'categories';

export default function DashboardWidgets({ singles, families, now }: DashboardWidgetsProps) {
  const [activeWidgets, setActiveWidgets] = useState<Widget[]>(['analytics', 'calendar', 'notifications']);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const widgets = [
    { id: 'analytics' as Widget, title: 'Analytics', component: AnalyticsWidget, icon: '📊' },
    { id: 'calendar' as Widget, title: 'Calendar', component: CalendarWidget, icon: '📅' },
    { id: 'notifications' as Widget, title: 'Notifications', component: NotificationBell, icon: '🔔' },
  ];

  const moveWidget = (fromIndex: number, toIndex: number) => {
    const newWidgets = [...activeWidgets];
    const [moved] = newWidgets.splice(fromIndex, 1);
    newWidgets.splice(toIndex, 0, moved);
    setActiveWidgets(newWidgets);
  };

  const toggleWidget = (widgetId: Widget) => {
    if (activeWidgets.includes(widgetId)) {
      setActiveWidgets(prev => prev.filter(w => w !== widgetId));
    } else {
      setActiveWidgets(prev => [...prev, widgetId]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Widget Toggle Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-2 flex flex-wrap gap-2">
        {widgets.map(widget => (
          <button
            key={widget.id}
            onClick={() => toggleWidget(widget.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1 ${
              activeWidgets.includes(widget.id)
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>{widget.icon}</span>
            <span>{widget.title}</span>
          </button>
        ))}
      </div>

      {/* Widget Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {activeWidgets.map((widgetId, idx) => {
          const widget = widgets.find(w => w.id === widgetId);
          if (!widget) return null;
          const WidgetComponent = widget.component;
          
          return (
            <div
              key={widgetId}
              draggable
              onDragStart={() => setIsDragging(true)}
              onDragEnd={() => {
                setIsDragging(false);
                setDragOverIndex(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverIndex(idx);
              }}
              onDrop={() => {
                if (dragOverIndex !== null && dragOverIndex !== idx) {
                  moveWidget(idx, dragOverIndex);
                }
                setIsDragging(false);
                setDragOverIndex(null);
              }}
              className={`transition-all duration-200 ${isDragging ? 'opacity-50' : ''} ${dragOverIndex === idx ? 'ring-2 ring-indigo-500 rounded-xl' : ''}`}
            >
              <div className="relative">
                <div className="absolute top-2 left-2 cursor-move text-slate-300 text-xs">
                  ⋮⋮
                </div>
                {widgetId === 'analytics' && (
                  <AnalyticsWidget singles={singles} families={families} now={now} />
                )}
                {widgetId === 'calendar' && (
                  <CalendarWidget singles={singles} families={families} now={now} />
                )}
                {widgetId === 'notifications' && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">🔔 Notifications</h3>
                    <NotificationBell singles={singles} families={families} now={now} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Layout Instructions */}
      {activeWidgets.length > 1 && (
        <p className="text-[10px] text-slate-400 text-center">
          💡 Drag and drop widgets to rearrange
        </p>
      )}
    </div>
  );
}