import React from 'react';

// 原路徑 src/components/MenuOptions

export default function AssociatedProducts({ associatedProducts, isLoading }) {
  return (
    <div className="bg-surface p-[var(--spacing-card)] rounded-[var(--radius-card)] border border-line shadow-[var(--shadow-card)]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="type-body-sm font-semibold text-ink-900">關聯品項</h3>
        <span className="type-caption text-ink-400">
          {isLoading || associatedProducts === null
            ? '載入關聯品項中...'
            : `共 ${associatedProducts.length} 個品項`}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {associatedProducts?.map(prod => (
          <span
            key={prod.id}
            className="bg-surface-2 text-ink-600 px-2.5 py-0.5 rounded-[var(--radius-pill)] type-dashboard-top-bar-tag border border-line"
          >
            {prod.name}
          </span>
        ))}
      </div>
    </div>
  );
}