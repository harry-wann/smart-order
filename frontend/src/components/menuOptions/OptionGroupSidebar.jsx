import React from 'react';

// 原路徑 src/components/MenuOptions

export default function OptionGroupSidebar({ groups, selectedGroupId, onSelectGroup }) {
  return (
    <div className="w-80 flex flex-col gap-3">
      {groups.map(group => {
        const isSelected = group.id === selectedGroupId;
        return (
          <div
            key={group.id}
            onClick={() => onSelectGroup(group.id)}
            className={`group p-(--spacing-card) rounded-(--radius-card) cursor-pointer transition-all border ${
              isSelected 
                ? 'bg-brand-100 border-[#E8C2BD] shadow-(--shadow-card)' 
                : 'bg-surface border-line hover:border-line-strong'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="type-h3">{group.name}</span>
              <button
                type="button"
                aria-label={`刪除${group.name}群組`}
                onClick={(event) => {
                  event.stopPropagation();
                  window.confirm(`確定要刪除「${group.name}」群組嗎？`);
                }}
                className="text-ink-400 transition-colors group-hover:text-danger group-focus-within:text-danger"
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