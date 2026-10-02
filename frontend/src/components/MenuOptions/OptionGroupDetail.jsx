import React from 'react';

export default function OptionGroupDetail({ currentGroup, onOpenGroupNameModal, onOpenItemModal }) {
  return (
    <div className="bg-surface p-[var(--spacing-card)] rounded-[var(--radius-card)] border border-line shadow-[var(--shadow-card)]">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h2 className="type-h1">{currentGroup.name}</h2>
          <span className="bg-surface-2 text-ink-600 px-2.5 py-0.5 rounded-[var(--radius-pill)] type-dashboard-top-bar-tag">
            必選 單選
          </span>
        </div>
        <button 
          onClick={onOpenGroupNameModal}
          className="flex items-center gap-1 type-body-sm text-ink-600 hover:text-ink-900 border border-line px-3.5 py-1.5 rounded-[var(--radius-btn)] transition-colors hover:bg-surface-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          改名
        </button>
      </div>

      {/* 規則提示卡片 */}
      <div className="bg-info-bg border border-info-line p-4 rounded-[var(--radius-btn)] mb-6 flex items-start gap-3">
        <div className="text-info mt-0.5">ℹ️</div>
        <div className="type-body-sm text-info-ink leading-relaxed">
          <span className="font-semibold">min=1 max=1</span> 就是「必選・單選」。<br />
          兩個數字決定四種行為，不用改程式。
        </div>
      </div>

      {/* 數值設定區 */}
      <div className="grid grid-cols-3 gap-4 mb-8 bg-surface-2 p-4 rounded-[var(--radius-btn)] border border-line">
        <div>
          <div className="type-caption text-ink-400 mb-1">至少要選</div>
          <div className="type-price">{currentGroup.minSelect} 項</div>
        </div>
        <div>
          <div className="type-caption text-ink-400 mb-1">最多可選</div>
          <div className="type-price">{currentGroup.maxSelect} 項</div>
        </div>
        <div>
          <div className="type-caption text-ink-400 mb-1">排序</div>
          <div className="type-price">{currentGroup.sortOrder}</div>
        </div>
      </div>

      {/* 選項值表格 */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="type-h2">選項值</h3>
          <button className="flex items-center gap-1 bg-brand-600 text-white px-5 py-2 rounded-[var(--radius-btn)] type-button hover:bg-brand-500 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            新增選項
          </button>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-line type-caption text-ink-400">
              <th className="pb-3 font-medium">名稱</th>
              <th className="pb-3 font-medium">價差</th>
              <th className="pb-3 font-medium">排序</th>
              <th className="pb-3 font-medium">狀態</th>
              <th className="pb-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-sm">
            {currentGroup.items.map(item => (
              <tr key={item.id} className="hover:bg-surface-2/50">
                <td className="py-4 type-body font-medium">{item.name}</td>
                <td className="py-4 type-body text-ink-600">+{item.priceDiff}</td>
                <td className="py-4 type-body text-ink-600">{item.sortOrder}</td>
                <td className="py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[var(--radius-pill)] type-dashboard-top-bar-tag ${
                    item.status === 'active' 
                      ? 'bg-success-bg text-success-ink' 
                      : 'bg-surface-2 text-ink-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'active' ? 'bg-success' : 'bg-ink-400'}`}></span>
                    {item.status === 'active' ? '啟用' : '停用'}
                  </span>
                </td>
                <td className="py-4 text-right">
                  <button 
                    onClick={() => onOpenItemModal(item)}
                    className="p-1.5 text-ink-400 hover:text-ink-900 rounded-[var(--radius-btn)] hover:bg-surface-2 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}