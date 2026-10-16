import React from 'react';
import { SvgIconMap } from '@/assets/SvgIconMap'
import SOButton from '@/components/SOButton';

// 原路徑 src/components/MenuOptions

export default function OptionGroupDetail({
  currentGroup,
  isLoading,
  onOpenEditGroupModal,
  onOpenItemModal,
  onOpenAddItemModal,
  onToggleItem,
  togglingItemId,
  toggleItemError,
}) {
  const minSelect = Number(currentGroup.minSelect ?? 0);
  const maxSelect = Number(currentGroup.maxSelect ?? 1);
  const selectionRule = `${minSelect > 0 ? '必選' : '非必選'} ${maxSelect > 1 ? '可複選' : '單選'}`;

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-(--radius-card) border border-line bg-surface p-4 shadow-(--shadow-card)">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="type-h3 text-ink-900">{currentGroup.name}</h2>
            <span className="shrink-0 rounded-pill border border-line bg-surface-2 px-2 py-0.5 type-dashboard-top-bar-tag text-ink-600">
              {selectionRule}
            </span>
          </div>
          <SOButton
            type="button"
            onClick={onOpenEditGroupModal}
            className="flex h-9 w-auto shrink-0 items-center justify-center gap-1 rounded-(--radius-btn) border border-line bg-transparent px-3 py-1.5 type-body-sm text-ink-600 transition-all duration-300 hover:bg-surface-2 hover:text-ink-900 active:scale-[0.98]"
            content={
              <span className="flex items-center gap-1">
                <SvgIconMap.OptionsEdit />
                編輯
              </span>
            }
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-3">
          <div className="grid min-w-60 flex-1 grid-cols-3 gap-4">
            <div>
              <div className="type-caption text-ink-600">至少要選</div>
              <div className="type-body-sm font-semibold text-ink-900">{currentGroup.minSelect ?? '—'} 項</div>
            </div>
            <div>
              <div className="type-caption text-ink-600">最多可選</div>
              <div className="type-body-sm font-semibold text-ink-900">{currentGroup.maxSelect ?? '—'} 項</div>
            </div>
            <div>
              <div className="type-caption text-ink-600">排序</div>
              <div className="type-body-sm font-semibold text-ink-900">{currentGroup.sortOrder ?? '—'}</div>
            </div>
          </div>
          <div className="flex max-w-xs items-start gap-2 rounded-(--radius-btn) border border-info-line bg-info-bg px-3 py-2 type-caption text-info-ink">
            <span aria-hidden="true">ⓘ</span>
            <span>至少選 {currentGroup.minSelect ?? '—'} 項，最多選 {currentGroup.maxSelect ?? '—'} 項</span>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="type-body font-semibold text-ink-900">選項值</h3>
          <SOButton
            type="button"
            onClick={onOpenAddItemModal}
            className="flex h-8 w-auto items-center justify-center gap-1.5 rounded-(--radius-btn) border border-brand-600 bg-surface px-3 type-caption font-medium text-brand-600 transition-all duration-300 hover:bg-brand-100 active:scale-[0.98]"
            content={
              <span className="flex items-center gap-1.5">
                <SvgIconMap.CounterPlus aria-hidden="true" />
                新增選項
              </span>
            }
          />
        </div>
        {toggleItemError && (
          <p role="alert" className="mb-2 type-caption text-danger">{toggleItemError}</p>
        )}
        <div className="overflow-hidden rounded-(--radius-card) border border-line bg-surface">
          <table className="w-full table-fixed border-collapse text-left">
            <colgroup>
              <col className="w-[46%]" />
              <col className="w-[14%]" />
              <col className="w-[11%]" />
              <col className="w-[17%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead>
              <tr className="h-10 bg-surface-2 type-caption font-medium text-ink-600">
                <th className="px-3.5 text-left font-medium">名稱</th>
                <th className="px-2 text-center font-medium">價差</th>
                <th className="px-2 text-center font-medium">排序</th>
                <th className="px-2 text-left font-medium">狀態</th>
                <th className="px-3.5 text-center font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="h-14 px-3.5 text-center type-body-sm text-ink-600">載入選項值中...</td>
                </tr>
              ) : currentGroup.items.length > 0 ? currentGroup.items.map(item => (
                <tr key={item.id} className="h-[54px] transition-colors hover:bg-surface-2/50">
                  <td className="px-3.5 type-body-sm font-semibold text-ink-900">{item.name}</td>
                  <td className="px-2 text-center type-body-sm text-ink-900">+{item.priceDiff}</td>
                  <td className="px-2 text-center type-body-sm text-ink-900">{item.sortOrder}</td>
                  <td className="px-2">
                    <span className="inline-flex items-center gap-2 type-body-sm text-ink-600">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={item.status === 'active'}
                        aria-label={`${item.status === 'active' ? '停用' : '啟用'}${item.name}`}
                        disabled={togglingItemId !== null}
                        onClick={() => onToggleItem(item)}
                        className={`relative h-6 w-10 shrink-0 rounded-pill transition-colors disabled:cursor-wait disabled:opacity-60 ${item.status === 'active' ? 'bg-success' : 'bg-line-strong'}`}
                      >
                        <span aria-hidden="true" className={`absolute top-0.5 h-5 w-5 rounded-full bg-white ${item.status === 'active' ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                      {item.status === 'active' ? '啟用' : '停用'}
                    </span>
                  </td>
                  <td className="px-3.5 text-center">
                    <div className="flex justify-center">
                      <SOButton
                        type="button"
                        aria-label={`編輯${item.name}`}
                        onClick={() => onOpenItemModal(item)}
                        className="flex h-8 w-8 items-center justify-center rounded-(--radius-btn) bg-transparent p-1 text-ink-600 transition-all duration-300 hover:bg-surface-2 hover:text-ink-900 active:scale-[0.98]"
                        content={<SvgIconMap.OptionsEdit />}
                      />
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="h-14 px-3.5 text-center type-body-sm text-ink-600">
                    目前沒有選項值
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
