import React, { useState, useEffect } from 'react';
import SOButton from '@/components/SOButton';

export interface Category {
  id: string;
  name: string;
  count: number;
  active?: boolean;
}

// 可以掛在品項上的選項群組（來自 /order/admin/optionGroups）
export interface OptionGroupSummary {
  id: number;
  name: string;
}

const SPICY_LABELS = ['不辣', '小辣', '中辣', '大辣'];

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
  // 鍋底、免費續加、是否追蹤庫存、飲食標示（素食、含牛、辣度 0–3）
  soupBase?: boolean;
  refill?: boolean;
  trackInventory?: boolean;
  vegetarian?: boolean;
  containsBeef?: boolean;
  spicyLevel?: number;
  // 掛在這個品項上的選項群組 id，陣列順序就是顧客端顯示順序
  optionGroupIds?: number[];
}

interface ProductModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  initialData: Partial<Product>;
  categories: Category[];
  optionGroups: OptionGroupSummary[];
  onClose: () => void;
  onSave: (productData: Partial<Product>) => void | Promise<void>;
  onDelete: (productId: number) => void | Promise<void>;
}

export default function ProductModal({
  isOpen,
  mode,
  initialData,
  categories,
  optionGroups,
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

  const selectedGroupIds = formData.optionGroupIds ?? [];
  const availableGroups = optionGroups.filter(group => !selectedGroupIds.includes(group.id));
  const isRefill = formData.refill === true;
  const isTracked = formData.trackInventory !== false;

  // 免費續加：價格固定 0、不追蹤庫存（仍會出單）；鍋底和免費續加不會同時成立
  const toggleRefill = (checked: boolean) => {
    setFormData(prev => checked
      ? { ...prev, refill: true, soupBase: false, price: 0, trackInventory: false }
      : { ...prev, refill: false });
  };

  const toggleSoupBase = (checked: boolean) => {
    setFormData(prev => checked
      ? { ...prev, soupBase: true, refill: false }
      : { ...prev, soupBase: false });
  };

  const addOptionGroup = (groupId: number) => {
    if (!Number.isInteger(groupId) || selectedGroupIds.includes(groupId)) return;
    setFormData(prev => ({ ...prev, optionGroupIds: [...(prev.optionGroupIds ?? []), groupId] }));
  };

  const removeOptionGroup = (groupId: number) => {
    setFormData(prev => ({
      ...prev,
      optionGroupIds: (prev.optionGroupIds ?? []).filter(id => id !== groupId),
    }));
  };

  const moveOptionGroup = (index: number, direction: -1 | 1) => {
    setFormData(prev => {
      const ids = [...(prev.optionGroupIds ?? [])];
      const target = index + direction;
      if (target < 0 || target >= ids.length) return prev;
      [ids[index], ids[target]] = [ids[target], ids[index]];
      return { ...prev, optionGroupIds: ids };
    });
  };

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
                  <option key={cat.id} value={cat.id}>{cat.name}{cat.active === false ? '（停用）' : ''}</option>
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
                  disabled={isRefill}
                  className="w-full pl-7 pr-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:border-brand-600 bg-surface disabled:bg-surface-2 disabled:text-ink-400"
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
                disabled={!isTracked}
                className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:border-brand-600 bg-surface disabled:bg-surface-2 disabled:text-ink-400"
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-ink-600 mb-2">品項標示</span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-ink-900">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.soupBase === true}
                  onChange={e => toggleSoupBase(e.target.checked)}
                />
                鍋底（每桌至少一份）
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRefill}
                  onChange={e => toggleRefill(e.target.checked)}
                />
                免費續加（價格 0、不扣庫存）
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTracked}
                  disabled={isRefill}
                  onChange={e => setFormData({ ...formData, trackInventory: e.target.checked })}
                />
                追蹤庫存
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.vegetarian === true}
                  onChange={e => setFormData({ ...formData, vegetarian: e.target.checked })}
                />
                素食
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.containsBeef === true}
                  onChange={e => setFormData({ ...formData, containsBeef: e.target.checked })}
                />
                含牛肉
              </label>
              <label className="flex items-center gap-2">
                辣度
                <select
                  value={formData.spicyLevel ?? 0}
                  onChange={e => setFormData({ ...formData, spicyLevel: Number(e.target.value) })}
                  className="flex-1 px-2 py-1 text-sm border border-line rounded-lg focus:outline-none focus:border-brand-600 bg-surface cursor-pointer"
                >
                  {SPICY_LABELS.map((label, level) => (
                    <option key={level} value={level}>{level}　{label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-ink-600 mb-1">選項群組（份量、辣度、加點…）</span>
            {selectedGroupIds.length === 0 ? (
              <p className="text-xs text-ink-400 mb-2">尚未掛上任何選項群組</p>
            ) : (
              <ul className="flex flex-col gap-1 mb-2">
                {selectedGroupIds.map((groupId, index) => (
                  <li key={groupId} className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm text-ink-900">
                    <span className="w-4 text-xs text-ink-400 tabular-nums">{index + 1}</span>
                    <span className="flex-1 truncate">
                      {optionGroups.find(group => group.id === groupId)?.name ?? `群組 #${groupId}`}
                    </span>
                    <button
                      type="button"
                      aria-label="上移"
                      disabled={index === 0}
                      onClick={() => moveOptionGroup(index, -1)}
                      className="px-1.5 text-ink-600 hover:text-ink-900 disabled:opacity-30 cursor-pointer"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label="下移"
                      disabled={index === selectedGroupIds.length - 1}
                      onClick={() => moveOptionGroup(index, 1)}
                      className="px-1.5 text-ink-600 hover:text-ink-900 disabled:opacity-30 cursor-pointer"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeOptionGroup(groupId)}
                      className="text-xs text-danger hover:text-red-700 cursor-pointer"
                    >
                      移除
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <select
              value=""
              disabled={availableGroups.length === 0}
              onChange={e => addOptionGroup(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:border-brand-600 bg-surface cursor-pointer disabled:opacity-50"
            >
              <option value="">{availableGroups.length === 0 ? '沒有可加入的選項群組' : '加入選項群組…'}</option>
              {availableGroups.map(group => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
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
