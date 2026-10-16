import React from 'react';

export default function AddOptionValueModal({
  isOpen,
  itemName,
  setItemName,
  itemPrice,
  setItemPrice,
  error,
  isSaving,
  onClose,
  onSave,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4">
      <form
        onSubmit={event => {
          event.preventDefault();
          onSave();
        }}
        className="w-full max-w-md rounded-(--radius-card) border border-line bg-surface p-6 shadow-(--shadow-pop)"
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="type-h3 text-ink-900">新增選項</h3>
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

        <div className="mb-6 space-y-4">
          <div>
            <label htmlFor="option-value-name" className="type-caption mb-2 block text-ink-600">
              選項名稱
            </label>
            <input
              id="option-value-name"
              type="text"
              value={itemName}
              maxLength={50}
              required
              autoFocus
              onChange={event => setItemName(event.target.value)}
              placeholder="請輸入選項名稱"
              className="w-full rounded-(--radius-btn) border border-line px-3 py-2 type-body text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="option-value-price" className="type-caption mb-2 block text-ink-600">
              價差
            </label>
            <div>
              <input
                id="option-value-price"
                type="number"
                min="0"
                max="200"
                value={itemPrice}
                required
                onChange={event => setItemPrice(event.target.value)}
                className="w-full rounded-(--radius-btn) border border-line px-3 py-2 type-body text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:outline-none"
              />
            </div>
          </div>

          {error && <p role="alert" className="type-caption text-danger">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
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
            {isSaving ? '新增中...' : '新增'}
          </button>
        </div>
      </form>
    </div>
  );
}
