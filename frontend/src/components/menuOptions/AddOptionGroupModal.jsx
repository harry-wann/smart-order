import React from 'react';

export default function AddOptionGroupModal({
  isOpen,
  groupName,
  setGroupName,
  minSelect,
  setMinSelect,
  maxSelect,
  setMaxSelect,
  error,
  isSaving,
  onClose,
  onSave,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
        className="w-full max-w-lg rounded-(--radius-card) border border-line bg-surface p-6 shadow-[var(--shadow-pop)]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="type-h3">新增群組</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="關閉"
            className="text-ink-400 hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="option-group-name" className="type-caption mb-2 block text-ink-600">
              名稱
            </label>
            <input
              id="option-group-name"
              type="text"
              maxLength={50}
              required
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              className="w-full rounded-(--radius-btn) border border-line px-3 py-2 type-body focus:border-brand-600 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="option-group-min-select" className="type-caption mb-2 block text-ink-600">
              最少要選幾項（0 = 非必選）
            </label>
            <input
              id="option-group-min-select"
              type="number"
              min="0"
              step="1"
              required
              value={minSelect}
              onChange={(event) => setMinSelect(event.target.value)}
              className="w-full rounded-(--radius-btn) border border-line px-3 py-2 type-body focus:border-brand-600 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="option-group-max-select" className="type-caption mb-2 block text-ink-600">
              最多能選幾項（1 = 單選；大於 1 = 可複選）
            </label>
            <input
              id="option-group-max-select"
              type="number"
              min="1"
              step="1"
              required
              value={maxSelect}
              onChange={(event) => setMaxSelect(event.target.value)}
              className="w-full rounded-(--radius-btn) border border-line px-3 py-2 type-body focus:border-brand-600 focus:outline-none"
            />
          </div>
          {error && <p role="alert" className="type-caption text-danger">{error}</p>}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-(--radius-btn) border border-line px-4 py-2 type-body-sm text-ink-600 hover:bg-surface-2"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-(--radius-btn) bg-brand-600 px-4 py-2 type-body-sm text-white hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? '新增中...' : '新增'}
          </button>
        </div>
      </form>
    </div>
  );
}
