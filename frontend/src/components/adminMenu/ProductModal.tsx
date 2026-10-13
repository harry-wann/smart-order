import React, { useState, useEffect } from 'react';

export interface Category {
  id: string;
  name: string;
  count: number;
}

export interface Product {
  id: number;
  name: string;
  categoryId: string;
  price: number;
  stock: number;
  status: 'active' | 'inactive';
  imageText: string;
}

interface ProductModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  initialData: Partial<Product>;
  categories: Category[];
  onClose: () => void;
  onSave: (productData: Partial<Product>) => void;
}

export default function ProductModal({
  isOpen,
  mode,
  initialData,
  categories,
  onClose,
  onSave
}: ProductModalProps) {
  const [formData, setFormData] = useState<Partial<Product>>({});

  // 動態抓取第一個有效的分類作為預設值
  const defaultCategoryId = categories.find(category => category.id !== 'all')?.id || '';

  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...initialData,
        categoryId: initialData.categoryId || defaultCategoryId
      });
    }
  }, [isOpen, initialData, defaultCategoryId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-md rounded-xl shadow-(--shadow-pop) border border-line overflow-hidden flex flex-col transform transition-all">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-surface-200">
          <h3 className="text-lg font-bold text-ink-900">
            {mode === 'add' ? '新增商品' : '編輯商品'}
          </h3>
          <button 
            type="button" 
            onClick={onClose}
            className="text-ink-400 hover:text-ink-600 text-xl leading-none cursor-pointer"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          
          <div>
            <label className="block text-xs font-medium text-ink-600 mb-1">品項名稱 <span className="text-danger">*</span></label>
            <input 
              type="text" 
              value={formData.name || ''}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="例如：安格斯霜降牛五花"
              className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:border-brand-600 bg-surface transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">商品分類 <span className="text-danger">*</span></label>
              <select 
                value={formData.categoryId || defaultCategoryId}
                onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:border-brand-600 bg-surface cursor-pointer"
              >
                {categories.filter(c => c.id !== 'all').map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">縮圖文字 <span className="text-danger">*</span></label>
              <input 
                type="text" 
                value={formData.imageText || ''}
                onChange={e => setFormData({ ...formData, imageText: e.target.value })}
                required
                maxLength={4}
                placeholder="例如：牛五花"
                className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:border-brand-600 bg-surface"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">價格 <span className="text-danger">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm text-ink-400">$</span>
                <input 
                  type="number" 
                  min="0"
                  value={formData.price || 0}
                  onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                  required
                  className="w-full pl-7 pr-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:border-brand-600 bg-surface"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">庫存 <span className="text-danger">*</span></label>
              <input 
                type="number" 
                min="0"
                value={formData.stock ?? 0}
                onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })}
                required
                className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:border-brand-600 bg-surface"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 mt-2 border-t border-line">
            <button 
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm border border-line rounded-lg text-ink-600 hover:bg-surface-200 transition-colors cursor-pointer"
            >
              取消
            </button>
            <button 
              type="submit"
              className="px-5 py-2 text-sm bg-brand-600 text-surface rounded-lg font-medium hover:bg-brand-700 transition-colors cursor-pointer"
            >
              確認儲存
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}