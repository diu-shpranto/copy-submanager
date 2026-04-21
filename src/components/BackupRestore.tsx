import { useState } from 'react';
import { SingleSubscription, FamilySubscription } from '../types';

interface BackupRestoreProps {
  singles: SingleSubscription[];
  families: FamilySubscription[];
  onRestore: (singles: SingleSubscription[], families: FamilySubscription[]) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

interface Backup {
  id: string;
  name: string;
  date: Date;
  data: { singles: SingleSubscription[]; families: FamilySubscription[] };
}

export default function BackupRestore({ singles, families, onRestore, showToast }: BackupRestoreProps) {
  const [backups, setBackups] = useState<Backup[]>(() => {
    const saved = localStorage.getItem('app_backups');
    return saved ? JSON.parse(saved) : [];
  });
  const [backupName, setBackupName] = useState('');

  const saveBackups = (newBackups: Backup[]) => {
    setBackups(newBackups);
    localStorage.setItem('app_backups', JSON.stringify(newBackups));
  };

  const createBackup = () => {
    const name = backupName.trim() || `Backup ${new Date().toLocaleString()}`;
    const newBackup: Backup = {
      id: crypto.randomUUID(),
      name,
      date: new Date(),
      data: { singles, families }
    };
    saveBackups([newBackup, ...backups]);
    setBackupName('');
    showToast('Backup created successfully!', 'success');
  };

  const restoreBackup = (backup: Backup) => {
    if (confirm(`Restore "${backup.name}"? Current data will be replaced.`)) {
      onRestore(backup.data.singles, backup.data.families);
      showToast('Backup restored successfully!', 'success');
    }
  };

  const deleteBackup = (id: string) => {
    saveBackups(backups.filter(b => b.id !== id));
    showToast('Backup deleted', 'success');
  };

  const exportBackup = (backup: Backup) => {
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${backup.name.replace(/\s/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup exported!', 'success');
  };

  const autoBackup = () => {
    const lastBackup = backups[0];
    if (!lastBackup || new Date().getTime() - new Date(lastBackup.date).getTime() > 24 * 60 * 60 * 1000) {
      createBackup();
    }
  };

  // Auto backup on page unload
  window.addEventListener('beforeunload', () => {
    autoBackup();
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
        <span>💾</span> Backup & Restore
      </h3>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={backupName}
          onChange={(e) => setBackupName(e.target.value)}
          placeholder="Backup name (optional)"
          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={createBackup}
          className="px-3 py-2 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 transition"
        >
          Create Backup
        </button>
      </div>

      {backups.length === 0 ? (
        <p className="text-center text-slate-400 text-sm py-4">No backups yet</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {backups.map(backup => (
            <div key={backup.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{backup.name}</p>
                <p className="text-[10px] text-slate-400">
                  {new Date(backup.date).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => restoreBackup(backup)}
                  className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded transition"
                  title="Restore"
                >
                  ↩️
                </button>
                <button
                  onClick={() => exportBackup(backup)}
                  className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded transition"
                  title="Export"
                >
                  📤
                </button>
                <button
                  onClick={() => deleteBackup(backup.id)}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded transition"
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[9px] text-slate-400 mt-3 text-center">
        Auto-backup created daily on page close
      </p>
    </div>
  );
}