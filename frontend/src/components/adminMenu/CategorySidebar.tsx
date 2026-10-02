import React, { useState } from 'react';
import icPlus from  '../../assets/ic_adminmenu_redplus.svg'

export interface Category {
  id: string;
  name: string;
  count: number;
}

interface CategorySidebarProps {
  categories: Category[];
  activeCategory: string;
  onSelectCategory: (categoryName: string) => void;
  onAddCategory: (newCategoryName: string) => void;
}

export default function CategorySidebar({ 
  categories, 
  activeCategory, 
  onSelectCategory,
  onAddCategory 
}: CategorySidebarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    onAddCategory(categoryName.trim());
    setCategoryName('');
    setIsModalOpen(false);
  };

  return (
    <div className="w-64 space-y-1 relative">
      <h2 className="text-sm font-bold text-ink-600 px-3 mb-4">分類</h2>
      {categories.map(cat => {
        const isActive = activeCategory === cat.name;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.name)}
            className={`w-full flex justify-between items-center px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isActive 
                ? 'bg-brand-100 text-ink-900 font-medium' 
                : 'text-ink-600 hover:bg-surface-300'
            }`}
          >
            <span>{cat.name}</span>
            <span className="text-xs text-ink-400">{cat.count}</span>
          </button>
        );
      })}

      <div className="pt-2 px-3">
        <button 
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="text-brand-600 text-sm font-medium flex items-center gap-1 hover:opacity-80 cursor-pointer"
        >
          <img src={icPlus} alt="新增分類"/>
          <span>新增分類</span>
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-ink-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl p-6 w-full max-w-md shadow-(--shadow-pop) border border-line space-y-4">
            <h3 className="text-lg font-bold text-ink-900">新增分類</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-ink-600 mb-1">分類名稱</label>
                <input 
                  type="text" 
                  value={categoryName}
                  onChange={e => setCategoryName(e.target.value)}
                  placeholder="例如：特選小菜"
                  required
                  className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:border-brand-600 bg-surface"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs border border-line rounded-lg text-ink-600 hover:bg-surface-200 cursor-pointer"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 text-xs bg-brand-600 text-surface rounded-lg font-medium hover:opacity-90 cursor-pointer"
                >
                  新增
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}