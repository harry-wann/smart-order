import React from 'react';

export default function GroupNameModal({ isOpen, groupName, setGroupName, onClose, onSave }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-ink-900/50 flex items-center justify-center z-50">
      <div className="bg-surface p-6 rounded-[var(--radius-card)] w-96 shadow-[var(--shadow-pop)] border border-line">
        <div className="flex justify-between items-center mb-4">
          <h3 className="type-h3">修改群組名稱</h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="mb-6">
          <label className="type-caption text-ink-600 block mb-2">群組名稱</label>
          <input 
            type="text" 
            value={groupName} 
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full px-3 py-2 border border-line rounded-[var(--radius-btn)] type-body focus:outline-none focus:border-brand-600"
          />
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