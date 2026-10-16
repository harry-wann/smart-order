import React from 'react';

// 原路徑 src/components/MenuOptions

export default function EditItemModal({ isOpen, itemName, setItemName, itemPrice, setItemPrice, error, isSaving, isDeleting, onClose, onSave, onDelete }) {
  if (!isOpen) return null;
  const isBusy = isSaving || isDeleting;

  return (
    <div className="fixed inset-0 bg-ink-900/50 flex items-center justify-center z-50">
      <div className="bg-surface p-6 rounded-(--radius-card) w-96 shadow-(--shadow-pop) border border-line">
        <div className="flex justify-between items-center mb-4">
          <h3 className="type-h3">編輯選項</h3>
          <button type="button" onClick={onClose} disabled={isBusy} aria-label="關閉" className="text-ink-400 hover:text-ink-900 disabled:opacity-50">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="space-y-4 mb-6">
          <div>
            <label className="type-caption text-ink-600 block mb-2">選項名稱</label>
            <input 
              type="text" 
              value={itemName} 
              onChange={(e) => setItemName(e.target.value)}
              className="w-full px-3 py-2 border border-line rounded-(--radius-btn) type-body focus:outline-none focus:border-brand-600"
            />
          </div>
          <div>
            <label className="type-caption text-ink-600 block mb-2">價差 (+)</label>
            <input 
              type="number" 
              value={itemPrice} 
              onChange={(e) => setItemPrice(e.target.value)}
              className="w-full px-3 py-2 border border-line rounded-(--radius-btn) type-body focus:outline-none focus:border-brand-600"
            />
          </div>
        </div>
        {error && <p role="alert" className="type-caption text-danger mb-4">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onDelete}
            disabled={isBusy}
            className="flex h-10 w-auto items-center justify-center rounded-(--radius-btn) border border-danger bg-transparent px-4 py-2 type-body-sm text-danger transition-all duration-300 hover:bg-danger-bg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
          >
            {isDeleting ? '刪除中...' : '刪除'}
          </button>
          <button 
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="flex h-10 w-auto items-center justify-center rounded-(--radius-btn) border border-line bg-transparent px-4 py-2 type-body-sm text-ink-600 transition-all duration-300 hover:bg-surface-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
          >
            取消
          </button>
          <button 
            type="button"
            onClick={onSave}
            disabled={isBusy}
            className="flex h-10 w-auto items-center justify-center rounded-(--radius-btn) bg-brand-600 px-4 py-2 type-body-sm text-white transition-all duration-300 hover:bg-brand-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
          >
            {isSaving ? '儲存中...' : '儲存'}
          </button>
        </div>
      </div>
    </div>
  );
}
