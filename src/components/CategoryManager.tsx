import { useState, useEffect } from 'react';
import { SingleSubscription, FamilySubscription } from '../types';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface CategoryManagerProps {
  subscriptions: (SingleSubscription | FamilySubscription)[];
  onUpdateCategory: (id: string, categoryId: string | null) => void;
}

const PRESET_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
];

const PRESET_ICONS = ['📱', '💻', '🎬', '🎵', '📚', '🏋️', '🍔', '✈️', '🏠', '💼'];

export default function CategoryManager({ subscriptions, onUpdateCategory }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('app_categories');
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', name: 'Entertainment', color: '#8b5cf6', icon: '🎬' },
      { id: '2', name: 'Productivity', color: '#3b82f6', icon: '💼' },
      { id: '3', name: 'Cloud Storage', color: '#10b981', icon: '☁️' },
    ];
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(PRESET_ICONS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('app_categories', JSON.stringify(categories));
  }, [categories]);

  const addCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCategory: Category = {
      id: editingId || crypto.randomUUID(),
      name: newCategoryName.trim(),
      color: selectedColor,
      icon: selectedIcon,
    };
    if (editingId) {
      setCategories(prev => prev.map(c => c.id === editingId ? newCategory : c));
    } else {
      setCategories(prev => [...prev, newCategory]);
    }
    resetModal();
  };

  const deleteCategory = (id: string) => {
    if (confirm('Delete this category? Subscriptions will be uncategorized.')) {
      setCategories(prev => prev.filter(c => c.id !== id));
      // Update subscriptions to remove this category
      subscriptions.forEach(sub => {
        if ('categoryId' in sub && sub.categoryId === id) {
          onUpdateCategory(sub.id, null);
        }
      });
    }
  };

  const editCategory = (category: Category) => {
    setEditingId(category.id);
    setNewCategoryName(category.name);
    setSelectedColor(category.color);
    setSelectedIcon(category.icon);
    setShowAddModal(true);
  };

  const resetModal = () => {
    setShowAddModal(false);
    setNewCategoryName('');
    setSelectedColor(PRESET_COLORS[0]);
    setSelectedIcon(PRESET_ICONS[0]);
    setEditingId(null);
  };

  const getCategoryStats = () => {
    const stats: Record<string, number> = {};
    categories.forEach(cat => { stats[cat.id] = 0; });
    stats['uncategorized'] = 0;
    
    subscriptions.forEach(sub => {
      const catId = (sub as any).categoryId;
      if (catId && stats[catId] !== undefined) {
        stats[catId]++;
      } else {
        stats['uncategorized']++;
      }
    });
    return stats;
  };

  const stats = getCategoryStats();

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <span>🏷️</span> Categories
        </h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="text-xs text-indigo-500 hover:text-indigo-600"
        >
          + Add
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm">📁</span>
            <span className="text-sm text-slate-600">Uncategorized</span>
          </div>
          <span className="text-xs font-medium text-slate-500">{stats['uncategorized']}</span>
        </div>
        
        {categories.map(cat => (
          <div key={cat.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition group">
            <div className="flex items-center gap-2">
              <span className="text-sm">{cat.icon}</span>
              <span className="text-sm text-slate-600">{cat.name}</span>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">{stats[cat.id] || 0}</span>
              <button
                onClick={() => editCategory(cat)}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-500 transition"
              >
                ✏️
              </button>
              <button
                onClick={() => deleteCategory(cat.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={resetModal} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-white rounded-xl shadow-xl z-50 p-4">
            <h3 className="font-semibold text-slate-700 mb-3">
              {editingId ? 'Edit Category' : 'New Category'}
            </h3>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <div className="mb-3">
              <p className="text-xs text-slate-500 mb-2">Color</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-6 h-6 rounded-full transition ${selectedColor === color ? 'ring-2 ring-offset-1 ring-indigo-500' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="mb-4">
              <p className="text-xs text-slate-500 mb-2">Icon</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_ICONS.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setSelectedIcon(icon)}
                    className={`w-8 h-8 text-lg rounded-lg transition ${selectedIcon === icon ? 'bg-indigo-100 ring-2 ring-indigo-500' : 'bg-slate-50'}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={addCategory}
                className="flex-1 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
              >
                Save
              </button>
              <button
                onClick={resetModal}
                className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}