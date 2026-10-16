import React from 'react';

export default function EditOptionGroupModal({
  group,
  groupName,
  setGroupName,
  minSelect,
  setMinSelect,
  maxSelect,
  setMaxSelect,
  sortOrder,
  setSortOrder,
  error,
  isSaving,
  onClose,
  onSave,
  onDelete,
}) {
  if (!group) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4">
      <form
        onSubmit={event => {
          event.preventDefault();
          onSave();
        }}
        className="w-full max-w-lg rounded-(--radius-card) border border-line bg-surface p-6 shadow-(--shadow-pop)"
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="type-h3 text-ink-900">編輯</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="關閉"
            className="text-ink-400 transition-colors hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="edit-option-group-name" className="type-caption mb-2 block text-ink-600">
              群組名稱
            </label>
            <input
              id="edit-option-group-name"
              type="text"
              maxLength={50}
              required
              autoFocus
              value={groupName}
              onChange={event => setGroupName(event.target.value)}
              className="w-full rounded-(--radius-btn) border border-line px-3 py-2 type-body text-ink-900 focus:border-brand-600 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="edit-option-group-min" className="type-caption mb-2 block text-ink-600">
              至少要選
            </label>
            <input
              id="edit-option-group-min"
              type="number"
              min="0"
              step="1"
              required
              value={minSelect}
              onChange={event => setMinSelect(event.target.value)}
              className="w-full rounded-(--radius-btn) border border-line px-3 py-2 type-body text-ink-900 focus:border-brand-600 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="edit-option-group-max" className="type-caption mb-2 block text-ink-600">
              最多可選
            </label>
            <input
              id="edit-option-group-max"
              type="number"
              min="1"
              step="1"
              required
              value={maxSelect}
              onChange={event => setMaxSelect(event.target.value)}
              className="w-full rounded-(--radius-btn) border border-line px-3 py-2 type-body text-ink-900 focus:border-brand-600 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="edit-option-group-sort" className="type-caption mb-2 block text-ink-600">
              排序
            </label>
            <input
              id="edit-option-group-sort"
              type="number"
              min="0"
              step="1"
              required
              value={sortOrder}
              onChange={event => setSortOrder(event.target.value)}
              className="w-full rounded-(--radius-btn) border border-line px-3 py-2 type-body text-ink-900 focus:border-brand-600 focus:outline-none"
            />
          </div>
          {error && <p role="alert" className="type-caption text-danger sm:col-span-2">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={onDelete}
            disabled={isSaving}
            className="rounded-(--radius-btn) border border-danger px-4 py-2 type-body-sm text-danger transition-colors hover:bg-danger-bg disabled:cursor-not-allowed disabled:opacity-50"
          >
            刪除群組
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-(--radius-btn) border border-line px-4 py-2 type-body-sm text-ink-600 transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-(--radius-btn) bg-brand-600 px-4 py-2 type-body-sm text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? '儲存中...' : '儲存'}
          </button>
        </div>
      </form>
    </div>
  );
}
