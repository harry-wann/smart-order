import React from 'react';
import SOButton from '@/components/SOButton';
import { SvgIconMap } from '@/assets/SvgIconMap';

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
          <SOButton
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="關閉"
            className="flex h-8 w-8 items-center justify-center rounded-(--radius-btn) bg-transparent p-1 text-ink-400 transition-all duration-300 hover:text-ink-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
            content={<SvgIconMap.ModalClose aria-hidden="true" />}
          />
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
          <SOButton
            type="submit"
            disabled={isSaving}
            className="flex h-10 w-auto items-center justify-center rounded-(--radius-btn) bg-brand-600 px-4 py-2 type-body-sm text-white transition-all duration-300 hover:bg-brand-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
            text={isSaving ? '新增中...' : '新增'}
          />
        </div>
      </form>
    </div>
  );
}
