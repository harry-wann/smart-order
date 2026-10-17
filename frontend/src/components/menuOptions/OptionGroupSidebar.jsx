import { useState } from 'react';

// 原路徑 src/components/MenuOptions

export default function OptionGroupSidebar({
  groups,
  selectedGroupId,
  onSelectGroup,
  onReorderGroups,
  isReordering,
  reorderError,
}) {
  const [draggedGroupId, setDraggedGroupId] = useState(null);
  const [dropGroupId, setDropGroupId] = useState(null);

  return (
    <div className="flex min-h-0 w-72 shrink-0 flex-col gap-2">
      {reorderError && (
        <div role="alert" className="rounded-(--radius-card) border border-danger-line bg-surface p-3 type-caption text-danger">
          群組排序失敗：{reorderError}
        </div>
      )}
      {groups.map(group => {
        const isSelected = group.id === selectedGroupId;
        const minSelect = Number(group.minSelect ?? 0);
        const maxSelect = Number(group.maxSelect ?? 1);
        const selectionRule = `${minSelect > 0 ? '必選' : '非必選'} ${maxSelect > 1 ? '可複選' : '單選'}`;
        const isDragging = group.id === draggedGroupId;
        const isDropTarget = group.id === dropGroupId && group.id !== draggedGroupId;

        return (
          <div
            key={group.id}
            draggable={!isReordering}
            title="拖曳以調整群組排序"
            onDragStart={event => {
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', group.id);
              setDraggedGroupId(group.id);
            }}
            onDragOver={event => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              setDropGroupId(group.id);
            }}
            onDrop={event => {
              event.preventDefault();
              const sourceGroupId = event.dataTransfer.getData('text/plain') || draggedGroupId;
              const bounds = event.currentTarget.getBoundingClientRect();
              const insertAfterTarget = event.clientY > bounds.top + bounds.height / 2;
              if (sourceGroupId) {
                onReorderGroups(sourceGroupId, group.id, insertAfterTarget);
              }
              setDraggedGroupId(null);
              setDropGroupId(null);
            }}
            onDragEnd={() => {
              setDraggedGroupId(null);
              setDropGroupId(null);
            }}
            className={`group flex min-h-16 items-center rounded-(--radius-card) border p-3 transition-all ${
              isSelected 
                ? 'border-brand-600/30 bg-brand-100 shadow-(--shadow-card)'
                : 'border-line bg-surface hover:border-line-strong'
            } ${isDragging ? 'opacity-40' : ''} ${isDropTarget ? 'border-brand-600 ring-2 ring-brand-600/20' : ''} ${
              isReordering ? 'cursor-wait' : 'cursor-grab active:cursor-grabbing'
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
            <span aria-hidden="true" className="ml-2 inline-flex h-8 w-5 shrink-0 items-center justify-center text-ink-400">
              ›
            </span>
          </div>
        );
      })}
    </div>
  );
}