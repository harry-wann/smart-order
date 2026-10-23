import React, { useState, useEffect } from 'react';
import SOButton from '@/components/SOButton';

export interface Category {
  id: string;
  name: string;
  count: number;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  categoryId: string;
  price: number;
  stock: number;
  status: 'active' | 'inactive';
  imageText: string;
  imageUrl?: string | null;
}

interface ProductModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  initialData: Partial<Product>;
  categories: Category[];
  onClose: () => void;
  onSave: (productData: Partial<Product>) => void | Promise<void>;
  onDelete: (productId: number) => void | Promise<void>;
}

export default function ProductModal({
  isOpen,
  mode,
  initialData,
  categories,
  onClose,
  onSave,
  onDelete
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
    void onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 backdrop-blur-sm p-4">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-x-hidden overflow-y-auto rounded-xl border border-line bg-surface shadow-(--shadow-pop) flex flex-col transform transition-all">
        
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-6 py-4">
          <h3 className="text-lg font-bold text-ink-900">
            {mode === 'add' ? '新增商品' : '編輯商品'}
          </h3>
          <SOButton
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="text-ink-400 hover:text-ink-600 text-xl leading-none cursor-pointer transition-all duration-300 active:scale-[0.98]"
            content={<>&times;</>}
          />
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

          <div>
            <label className="block text-xs font-medium text-ink-600 mb-1">商品說明</label>
            <textarea
              value={formData.description || ''}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              maxLength={255}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:border-brand-600 bg-surface transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-600 mb-1">圖片網址</label>
            <input
              type="url"
              value={formData.imageUrl || ''}
              onChange={e => setFormData({ ...formData, imageUrl: e.target.value || null })}
              maxLength={500}
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
            {mode === 'edit' && initialData.id !== undefined && (
              <SOButton
                type="button"
                onClick={() => void onDelete(initialData.id!)}
                className="px-5 py-2 text-sm border border-danger text-danger rounded-lg hover:bg-red-50 transition-all duration-300 active:scale-[0.98] cursor-pointer"
                content="刪除"
              />
            )}
            <SOButton
              type="submit"
              className="px-5 py-2 text-sm bg-brand-600 text-surface rounded-lg font-medium hover:bg-brand-700 transition-all duration-300 active:scale-[0.98] cursor-pointer"
              content="儲存"
            />
          </div>
        </form>

      </div>
    </div>
  );
}
