import React from 'react';

// 原路徑 src/components/MenuOptions

export default function AssociatedProducts({ associatedProducts }) {
  return (
    <div className="bg-surface p-[var(--spacing-card)] rounded-[var(--radius-card)] border border-line shadow-[var(--shadow-card)]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="type-h3">關聯品項</h3>
        <span className="type-caption text-ink-400">
          {associatedProducts === null ? '此 API 尚未提供關聯資料' : `共 ${associatedProducts.length} 個品項`}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {associatedProducts?.map((prod, index) => (
          <span
            key={index}
            className="bg-surface-2 text-ink-600 px-2.5 py-0.5 rounded-[var(--radius-pill)] type-dashboard-top-bar-tag border border-line"
          >
            {prod}
          </span>
        ))}
      </div>
    </div>
  );
}