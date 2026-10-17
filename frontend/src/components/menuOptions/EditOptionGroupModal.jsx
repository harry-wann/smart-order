import React from 'react';
import SOButton from '@/components/SOButton';
import { SvgIconMap } from '@/assets/SvgIconMap';

export default function EditOptionGroupModal({
  group,
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
          <h3 className="type-h3 text-ink-900">編輯群組</h3>
          <SOButton
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="關閉"
            className="flex h-8 w-8 items-center justify-center rounded-(--radius-btn) bg-transparent p-1 text-ink-400 transition-all duration-300 hover:text-ink-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
            content={<SvgIconMap.ModalClose aria-hidden="true" />}
          />
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
          {error && <p role="alert" className="type-caption text-danger sm:col-span-2">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
          <SOButton
            type="button"
            onClick={onDelete}
            disabled={isSaving}
            className="flex h-10 w-auto items-center justify-center rounded-(--radius-btn) border border-danger bg-transparent px-4 py-2 type-body-sm text-danger transition-all duration-300 hover:bg-danger-bg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
            text="刪除"
          />
          <SOButton
            type="submit"
            disabled={isSaving}
            className="flex h-10 w-auto items-center justify-center rounded-(--radius-btn) bg-brand-600 px-4 py-2 type-body-sm text-white transition-all duration-300 hover:bg-brand-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
            text={isSaving ? '儲存中...' : '儲存'}
          />
        </div>
      </form>
    </div>
  );
}
