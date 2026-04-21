import { useState, useEffect, useRef, useCallback } from 'react';
import { SingleSubscription, FamilySubscription, TabType, ModalMode } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import SingleTable from './components/SingleTable';
import FamilyTable from './components/FamilyTable';
import SubscriptionModal from './components/SubscriptionModal';
import RenewModal from './components/RenewModal';
import Toast from './components/Toast';
import NotificationBell from './components/NotificationBell';
import AnalyticsWidget from './components/AnalyticsWidget';
import CalendarWidget from './components/CalendarWidget';
import BackupRestore from './components/BackupRestore';
import CategoryManager from './components/CategoryManager';

type AnySubscription = SingleSubscription | FamilySubscription;

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

interface RenewTarget {
  sub: AnySubscription;
  type: TabType;
}

export default function App() {
  const [singles, setSingles] = useLocalStorage<SingleSubscription[]>('sub_singles', []);
  const [families, setFamilies] = useLocalStorage<FamilySubscription[]>('sub_families', []);
  const [now, setNow] = useState(new Date());
  const [activeTab, setActiveTab] = useState<TabType>('single');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);

  const [showAddEdit, setShowAddEdit] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [editingItem, setEditingItem] = useState<AnySubscription | undefined>(undefined);

  const [renewTarget, setRenewTarget] = useState<RenewTarget | null>(null);
  
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showWidgets, setShowWidgets] = useState(true);

  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  const q = search.trim().toLowerCase();

  const filteredSingles = q
    ? singles.filter(s => s.email.toLowerCase().includes(q) || (s.note && s.note.toLowerCase().includes(q)))
    : singles;

  const filteredFamilies = q
    ? families.filter(f =>
        f.familyEmail.toLowerCase().includes(q) ||
        f.members.some(m => m.toLowerCase().includes(q)) ||
        (f.note && f.note.toLowerCase().includes(q))
      )
    : families;

  function switchTab(tab: TabType) {
    setActiveTab(tab);
    setSearch('');
  }

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const handleSearchChange = (searchTerm: string) => {
    setSearch(searchTerm);
  };

  function openAddModal() {
    setModalMode('add');
    setEditingItem(undefined);
    setShowAddEdit(true);
  }

  function openEditModal(sub: AnySubscription) {
    setModalMode('edit');
    setEditingItem(sub);
    setShowAddEdit(true);
  }

  function handleSaveSingle(data: AnySubscription) {
    const sub = data as SingleSubscription;
    if (modalMode === 'add') {
      setSingles(prev => [sub, ...prev]);
      showToast('Subscription added successfully!', 'success');
    } else {
      setSingles(prev => prev.map(s => s.id === sub.id ? sub : s));
      showToast('Subscription updated successfully!', 'success');
    }
    setShowAddEdit(false);
  }

  function handleSaveFamily(data: AnySubscription) {
    const sub = data as FamilySubscription;
    if (modalMode === 'add') {
      setFamilies(prev => [sub, ...prev]);
      showToast('Family plan added successfully!', 'success');
    } else {
      setFamilies(prev => prev.map(f => f.id === sub.id ? sub : f));
      showToast('Family plan updated successfully!', 'success');
    }
    setShowAddEdit(false);
  }

  function handleDeleteSingle(id: string) {
    if (!window.confirm('Are you sure you want to delete this subscription?')) return;
    setSingles(prev => prev.filter(s => s.id !== id));
    showToast('Subscription deleted.', 'success');
  }

  function handleDeleteFamily(id: string) {
    if (!window.confirm('Are you sure you want to delete this family plan?')) return;
    setFamilies(prev => prev.filter(f => f.id !== id));
    showToast('Family plan deleted.', 'success');
  }

  function handleRenew(id: string, duration: number) {
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const startTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

    if (renewTarget?.type === 'single') {
      setSingles(prev => prev.map(s => s.id === id ? { ...s, startDate, startTime, duration, planType: 'renewal' } : s));
    } else {
      setFamilies(prev => prev.map(f => f.id === id ? { ...f, startDate, startTime, duration, planType: 'renewal' } : f));
    }
    setRenewTarget(null);
    showToast('Subscription renewed successfully!', 'success');
  }

  const handleUpdateCategory = (id: string, categoryId: string | null) => {
    const singleIndex = singles.findIndex(s => s.id === id);
    if (singleIndex !== -1) {
      const updated = { ...singles[singleIndex], categoryId };
      setSingles(prev => prev.map(s => s.id === id ? updated : s));
      showToast('Category updated', 'success');
      return;
    }
    const familyIndex = families.findIndex(f => f.id === id);
    if (familyIndex !== -1) {
      const updated = { ...families[familyIndex], categoryId };
      setFamilies(prev => prev.map(f => f.id === id ? updated : f));
      showToast('Category updated', 'success');
    }
  };

  const handleRestore = (restoredSingles: SingleSubscription[], restoredFamilies: FamilySubscription[]) => {
    setSingles(restoredSingles);
    setFamilies(restoredFamilies);
    showToast('Backup restored successfully!', 'success');
  };

  function handleExport() {
    const data = { singles, families, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscriptions-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Data exported successfully!', 'success');
  }

  function handleImportClick() {
    importRef.current?.click();
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data.singles)) setSingles(data.singles);
        if (Array.isArray(data.families)) setFamilies(data.families);
        showToast('Data imported successfully!', 'success');
      } catch {
        showToast('Import failed: Invalid JSON file.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Animated Background Decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-500"></div>
      </div>

      <header className="bg-white/90 backdrop-blur-md border-b border-white/20 sticky top-0 z-30 shadow-xl">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg animate-gradient">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5 text-white">
                <path fillRule="evenodd" d="M6 3.75A2.75 2.75 0 0 1 8.75 1h2.5A2.75 2.75 0 0 1 14 3.75v.443c.572.055 1.14.122 1.706.2C17.053 4.582 18 5.75 18 7.07v3.469c0 1.126-.694 2.191-1.83 2.54-1.952.599-4.024.921-6.17.921s-4.219-.322-6.17-.921C2.694 12.73 2 11.665 2 10.539V7.07c0-1.32.947-2.489 2.294-2.676A41.047 41.047 0 0 1 6 4.193V3.75Zm6.5 0v.325a41.622 41.622 0 0 0-5 0V3.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25ZM10 10a1 1 0 0 0-1 1v.01a1 1 0 0 0 1 1h.01a1 1 0 0 0 1-1V11a1 1 0 0 0-1-1H10Z" clipRule="evenodd" />
                <path d="M3 15.055v-.684c.278.1.565.19.858.27 2.079.598 4.344.921 6.642.921 2.297 0 4.562-.323 6.642-.921.293-.08.58-.17.858-.27v.684c0 1.347-.985 2.53-2.363 2.686a41.454 41.454 0 0 1-9.874 0C3.985 17.585 3 16.402 3 15.055Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-tight tracking-tight">SubManager</h1>
              <p className="text-[10px] text-purple-400 hidden sm:block leading-tight font-medium">Subscription Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <NotificationBell 
              singles={singles} 
              families={families} 
              now={now}
              onTabChange={handleTabChange}
              onSearchChange={handleSearchChange}
            />
            
            {/* Backup Button - Feature 6 */}
            <button
              onClick={() => setShowBackupModal(true)}
              className="h-8 sm:h-9 px-3 text-xs font-semibold text-blue-600 bg-white/80 hover:bg-white border border-blue-200 rounded-lg transition-all hover:shadow-md hover:scale-105"
              title="Backup & Restore"
            >
              💾
            </button>
            
            <button
              onClick={() => setShowCategoryModal(true)}
              className="h-8 sm:h-9 px-3 text-xs font-semibold text-green-600 bg-white/80 hover:bg-white border border-green-200 rounded-lg transition-all hover:shadow-md hover:scale-105"
              title="Categories"
            >
              🏷️
            </button>
            
            <button
              onClick={handleImportClick}
              className="h-8 sm:h-9 px-3 text-xs font-semibold text-indigo-600 bg-white/80 hover:bg-white border border-indigo-200 rounded-lg transition-all hover:shadow-md hover:scale-105"
              title="Import JSON"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 inline mr-1">
                <path fillRule="evenodd" d="M8 1a.75.75 0 0 1 .75.75v5.19l1.72-1.72a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 0 1 1.06-1.06l1.72 1.72V1.75A.75.75 0 0 1 8 1ZM1.5 9.25a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 12.75 13.5h-9.5A1.75 1.75 0 0 1 1.5 11.75v-2.5Z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Import</span>
            </button>
            <button
              onClick={handleExport}
              className="h-8 sm:h-9 px-3 text-xs font-semibold text-purple-600 bg-white/80 hover:bg-white border border-purple-200 rounded-lg transition-all hover:shadow-md hover:scale-105"
              title="Export JSON"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 inline mr-1">
                <path fillRule="evenodd" d="M7.25 1a.75.75 0 0 1 1.5 0v5.19l1.72-1.72a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 0 1 1.06-1.06l1.72 1.72V1ZM1.5 9.25a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 12.75 13.5h-9.5A1.75 1.75 0 0 1 1.5 11.75v-2.5Z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Export</span>
            </button>
            <input ref={importRef} type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 relative z-10">
        {/* Dashboard Widgets */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <span>📊</span> Dashboard Overview
            </h2>
            <button
              onClick={() => setShowWidgets(!showWidgets)}
              className="text-xs text-indigo-500 hover:text-indigo-600"
            >
              {showWidgets ? 'Hide' : 'Show'} Widgets
            </button>
          </div>
          
          {showWidgets && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <AnalyticsWidget singles={singles} families={families} now={now} />
              <CalendarWidget singles={singles} families={families} now={now} />
            </div>
          )}
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl overflow-hidden animate-fade-in">
          {/* Tabs */}
          <div className="border-b border-slate-100 px-3 sm:px-6 pt-4 pb-0 flex items-end gap-0.5 sm:gap-1 overflow-x-auto bg-gradient-to-r from-slate-50/50 to-white">
            <button
              onClick={() => switchTab('single')}
              className={`flex-shrink-0 px-3 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg border-b-2 transition-all -mb-px ${
                activeTab === 'single'
                  ? 'border-indigo-500 text-indigo-600 bg-indigo-50/80 shadow-sm'
                  : 'border-transparent text-slate-500 hover:text-indigo-500 hover:bg-indigo-50/30'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="hidden sm:inline">Single Subscriptions</span>
                <span className="sm:hidden">Singles</span>
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  activeTab === 'single' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  {singles.length}
                </span>
              </span>
            </button>
            <button
              onClick={() => switchTab('family')}
              className={`flex-shrink-0 px-3 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg border-b-2 transition-all -mb-px ${
                activeTab === 'family'
                  ? 'border-emerald-500 text-emerald-600 bg-emerald-50/80 shadow-sm'
                  : 'border-transparent text-slate-500 hover:text-emerald-500 hover:bg-emerald-50/30'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Family Plans
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  activeTab === 'family' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  {families.length}
                </span>
              </span>
            </button>
          </div>

          {/* Search + Add toolbar */}
          <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 bg-gradient-to-r from-indigo-50/30 via-purple-50/30 to-pink-50/30">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={
                  activeTab === 'single'
                    ? '🔍 Search by email or note...'
                    : '🔍 Search family or member email...'
                }
                className="w-full pl-9 pr-9 py-2.5 border border-indigo-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              onClick={openAddModal}
              className="flex-shrink-0 h-10 px-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 shadow-lg hover:shadow-xl hover:scale-105"
            >
              <span className="text-lg leading-none font-light">+</span>
              <span className="sm:hidden">{activeTab === 'single' ? 'Add' : 'Add Plan'}</span>
              <span className="hidden sm:inline">{activeTab === 'single' ? 'Add Subscription' : 'Add Family Plan'}</span>
            </button>
          </div>

          {/* Table */}
          <div className="animate-slide-up">
            {activeTab === 'single' ? (
              <SingleTable
                subscriptions={filteredSingles}
                now={now}
                onEdit={openEditModal}
                onRenew={sub => setRenewTarget({ sub, type: 'single' })}
                onDelete={handleDeleteSingle}
              />
            ) : (
              <FamilyTable
                subscriptions={filteredFamilies}
                now={now}
                onEdit={openEditModal}
                onRenew={sub => setRenewTarget({ sub, type: 'family' })}
                onDelete={handleDeleteFamily}
              />
            )}
          </div>

          {/* Search results count */}
          {search && (
            <div className="px-6 py-3 border-t border-slate-100 text-xs text-indigo-500 bg-gradient-to-r from-indigo-50/30 to-purple-50/30">
              ✨ {activeTab === 'single' ? filteredSingles.length : filteredFamilies.length} result(s) for "{search}"
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {showAddEdit && (
        <SubscriptionModal
          mode={modalMode}
          type={activeTab}
          editingData={editingItem}
          onSave={activeTab === 'single' ? handleSaveSingle : handleSaveFamily}
          onClose={() => setShowAddEdit(false)}
        />
      )}

      {renewTarget && (
        <RenewModal
          subscription={renewTarget.sub}
          onRenew={handleRenew}
          onClose={() => setRenewTarget(null)}
        />
      )}

      {/* Backup & Restore Modal - Feature 6 */}
      {showBackupModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <BackupRestore
              singles={singles}
              families={families}
              onRestore={handleRestore}
              showToast={showToast}
            />
            <button
              onClick={() => setShowBackupModal(false)}
              className="mt-3 w-full py-2 bg-white rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <CategoryManager
              subscriptions={[...singles, ...families]}
              onUpdateCategory={handleUpdateCategory}
            />
            <button
              onClick={() => setShowCategoryModal(false)}
              className="mt-3 w-full py-2 bg-white rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}