import React from 'react';

// 原路徑 src/components/MenuOptions

export default function EditItemModal({ isOpen, itemName, setItemName, itemPrice, setItemPrice, onClose, onSave }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-ink-900/50 flex items-center justify-center z-50">
      <div className="bg-surface p-6 rounded-[var(--radius-card)] w-96 shadow-[var(--shadow-pop)] border border-line">
        <div className="flex justify-between items-center mb-4">
          <h3 className="type-h3">編輯選項值</h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900">
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
              className="w-full px-3 py-2 border border-line rounded-[var(--radius-btn)] type-body focus:outline-none focus:border-brand-600"
            />
          </div>
          <div>
            <label className="type-caption text-ink-600 block mb-2">價差 (+)</label>
            <input 
              type="number" 
              value={itemPrice} 
              onChange={(e) => setItemPrice(e.target.value)}
              className="w-full px-3 py-2 border border-line rounded-[var(--radius-btn)] type-body focus:outline-none focus:border-brand-600"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-line rounded-[var(--radius-btn)] type-body-sm text-ink-600 hover:bg-surface-2"
          >
            取消
          </button>
          <button 
            onClick={onSave}
            className="px-4 py-2 bg-brand-600 text-white rounded-[var(--radius-btn)] type-body-sm hover:bg-brand-500"
          >
            儲存
          </button>
        </div>
      </div>
    </div>
  );
}