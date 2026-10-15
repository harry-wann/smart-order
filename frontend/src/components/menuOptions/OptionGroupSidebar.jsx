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
            className={`p-(--spacing-card) rounded-(--radius-card) cursor-pointer transition-all border ${
              isSelected 
                ? 'bg-brand-100 border-[#E8C2BD] shadow-(--shadow-card)' 
                : 'bg-surface border-line hover:border-line-strong'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="type-h3">{group.name}</span>
              <span className="text-ink-400">›</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}