import React from 'react';

// 原路徑 src/components/MenuOptions

export default function OptionGroupSidebar({ groups, selectedGroupId, onSelectGroup }) {
  return (
    <div className="flex w-72 shrink-0 flex-col gap-2 overflow-y-auto">
      {groups.map(group => {
        const isSelected = group.id === selectedGroupId;
        const minSelect = Number(group.minSelect ?? 0);
        const maxSelect = Number(group.maxSelect ?? 1);
        const selectionRule = `${minSelect > 0 ? '必選' : '非必選'} ${maxSelect > 1 ? '可複選' : '單選'}`;

        return (
          <div
            key={group.id}
            className={`group flex min-h-16 items-center rounded-(--radius-card) border p-3 transition-all ${
              isSelected 
                ? 'border-brand-600/30 bg-brand-100 shadow-(--shadow-card)'
                : 'border-line bg-surface hover:border-line-strong'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectGroup(group.id)}
              aria-current={isSelected ? 'true' : undefined}
              className="flex min-w-0 flex-1 flex-col items-start text-left"
            >
              <span className="type-body-sm font-semibold text-ink-900">{group.name}</span>
              <span className="type-caption text-ink-600">{selectionRule}</span>
            </button>
            <div className="flex items-center">
              <button
                type="button"
                aria-label={`刪除${group.name}群組`}
                onClick={(event) => {
                  event.stopPropagation();
                  window.confirm(`確定要刪除「${group.name}」群組嗎？`);
                }}
                className="ml-2 min-w-5 text-ink-400 transition-colors group-hover:text-danger group-focus-within:text-danger"
              >
                <span className="group-hover:hidden group-focus-within:hidden">›</span>
                <span className="hidden group-hover:inline group-focus-within:inline">刪除</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}