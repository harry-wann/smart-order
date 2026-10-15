import React from 'react';
import SOButton from '@/components/SOButton'
import { SvgIconMap } from '@/assets/SvgIconMap'

// 原路徑 src/components/MenuOptions

export default function OptionGroupDetail({ currentGroup, onOpenGroupNameModal, onOpenItemModal }) {
  return (
    <div className="bg-surface p-[var(--spacing-card)] rounded-[var(--radius-card)] border border-line shadow-[var(--shadow-card)]">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h2 className="type-h1">{currentGroup.name}</h2>
        </div>
        <button 
          onClick={onOpenGroupNameModal}
          className="flex items-center gap-1 type-body-sm text-ink-600 hover:text-ink-900 border border-line px-3.5 py-1.5 rounded-[var(--radius-btn)] transition-colors hover:bg-surface-2"
        >
          <SvgIconMap.OptionsEdit />
          改名
        </button>
      </div>


      {/* 數值設定區 */}
      <div className="grid grid-cols-3 gap-4 mb-8 bg-surface-2 p-4 rounded-[var(--radius-btn)] border border-line">
        <div>
          <div className="type-caption text-ink-400 mb-1">至少要選</div>
          <div className="type-price">{currentGroup.minSelect ?? '—'}</div>
        </div>
        <div>
          <div className="type-caption text-ink-400 mb-1">最多可選</div>
          <div className="type-price">{currentGroup.maxSelect ?? '—'}</div>
        </div>
        <div>
          <div className="type-caption text-ink-400 mb-1">排序</div>
          <div className="type-price">{currentGroup.sortOrder ?? '—'}</div>
        </div>
      </div>

      {/* 選項值表格 */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="type-h2">選項值</h3>
          <div className="flex">
            <SOButton 
            height='h-[36px]'
              variant="secondary" 
              content={[
                <div key="add-btn" className="flex items-center gap-1.5">
                  <SvgIconMap.CounterPlus role="img" aria-label="新增選項" />           
                  <span>新增選項</span>
                </div>
              ]}
            />
          </div>
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
            {currentGroup.items.length > 0 ? currentGroup.items.map(item => (
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
                    <SvgIconMap.OptionsEdit />
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="py-4 text-center text-ink-400">
                  此 API 尚未提供選項值資料
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}