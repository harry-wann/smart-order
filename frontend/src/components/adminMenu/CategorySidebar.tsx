import React, { useState } from 'react';

export interface Category {
  id: string;
  name: string;
  count: number;
  // 'all'（全部）這個假分類沒有啟用狀態；真的分類 active=false 代表停用，顧客端看不到
  active?: boolean;
}

interface Props {
  categories: Category[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
  onAddCategory: (name: string) => Promise<Category | null>;
  onDeleteCategory?: (categoryId: string, categoryName: string) => void;
  onDeleteClassification?: (id: string) => Promise<void>;
  // 以下三個回傳 true 代表成功；失敗的錯誤訊息由呼叫端用 alert 顯示
  onRenameCategory?: (id: string, name: string) => Promise<boolean>;
  onToggleCategoryActive?: (id: string, active: boolean) => Promise<boolean>;
  onMoveCategory?: (id: string, direction: -1 | 1) => Promise<boolean>;
}

export default function CategorySidebar({
  categories,
  activeCategoryId,
  onSelectCategory,
  onAddCategory,
  // onDeleteCategory,
  onDeleteClassification,
  onRenameCategory,
  onToggleCategoryActive,
  onMoveCategory
}: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  // 正在改名的分類 id 和輸入框內容
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  // 操作進行中先鎖住按鈕，避免連點送出多次
  const [isBusy, setIsBusy] = useState(false);

  // 排序只在真的分類之間移動，'all' 固定在最上面
  const realCategories = categories.filter(cat => cat.id !== 'all');

  const handleAdd = async () => {
    const categoryName = newCategory.trim();
    if (!categoryName) return;

    try {
      const createdCategory = await onAddCategory(categoryName);
      if (createdCategory) {
        setNewCategory('');
        setIsAdding(false);
      }
    } catch (error) {
      console.error(error);
      alert('新增分類失敗，請稍後再試。');
    }
  };

  const handleDeleteClassification = async (id: string) => {
    try {
      await onDeleteClassification?.(id);
    } catch (error) {
      console.error(error);
      alert('刪除分類失敗，請稍後再試。');
    }
  };

  const startRename = (cat: Category) => {
    setRenamingId(cat.id);
    setRenameValue(cat.name);
  };

  const submitRename = async (cat: Category) => {
    const name = renameValue.trim();
    if (!name) return;
    if (name === cat.name) {
      setRenamingId(null);
      return;
    }
    setIsBusy(true);
    try {
      if (await onRenameCategory?.(cat.id, name)) setRenamingId(null);
    } finally {
      setIsBusy(false);
    }
  };

  const runAction = async (action: () => Promise<boolean> | undefined) => {
    setIsBusy(true);
    try {
      await action();
    } finally {
      setIsBusy(false);
    }
  };

  const actionButtonClass =
    'rounded-md border border-line px-2 py-1 text-xs text-ink-600 transition-colors hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="no-scrollbar h-full w-[184px] shrink-0 overflow-y-auto">
      {/* 標題 */}
      <div className="type-caption text-ink-600 px-3 pb-2">分類</div>

      {/* 分類列表 */}
      <div className="flex flex-col">
        {categories.map((cat) => {
          const isActive = activeCategoryId === cat.id;
          const isReal = cat.id !== 'all';
          const isDisabled = isReal && cat.active === false;
          const realIndex = realCategories.findIndex(item => item.id === cat.id);
          const isRenaming = renamingId === cat.id;

          return (
            <div key={cat.id}>
              <div
                onClick={() => onSelectCategory(cat.id)}
                className={`group flex items-center justify-between h-11 px-3 rounded-lg type-dashboard-menu cursor-pointer transition-colors relative
                  ${isActive
                    ? 'bg-brand-100 text-brand-700 font-bold' // 命中狀態（如圖片中的「肉品」樣式）
                    : 'text-ink-600 hover:bg-surface-3'    // 未命中狀態
                  }
                  ${isDisabled ? 'opacity-60' : ''}`}
              >
                {isRenaming ? (
                  <input
                    autoFocus
                    type="text"
                    value={renameValue}
                    maxLength={50}
                    disabled={isBusy}
                    onClick={e => e.stopPropagation()}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') void submitRename(cat);
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    className="w-full min-w-0 px-2 py-1 text-sm font-normal border border-line rounded-md focus:outline-none focus:border-brand-600 bg-surface text-ink-900"
                  />
                ) : (
                  <span className="truncate">
                    {cat.name}
                    {isDisabled && <span className="ml-1 text-xs font-normal">（停用）</span>}
                  </span>
                )}

                {!isRenaming && (
                  <span className={`text-sm ${isActive ? 'text-brand-700' : 'text-ink-600'}`}>
                    {cat.count}
                  </span>
                )}
              </div>

              {/* 選取中的分類才顯示操作列：改名、排序、停用／啟用、刪除。
                  放在選取後出現而不是滑鼠移上去才出現，平板沒有 hover 也點得到 */}
              {isActive && isReal && (
                <div className="flex flex-wrap items-center gap-1 px-3 pb-2 pt-1">
                  {isRenaming ? (
                    <>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void submitRename(cat)}
                        className={`${actionButtonClass} text-brand-600`}
                      >
                        儲存
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setRenamingId(null)}
                        className={actionButtonClass}
                      >
                        取消
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        aria-label="上移"
                        disabled={isBusy || realIndex <= 0 || !onMoveCategory}
                        onClick={() => void runAction(() => onMoveCategory?.(cat.id, -1))}
                        className={actionButtonClass}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label="下移"
                        disabled={isBusy || realIndex === realCategories.length - 1 || !onMoveCategory}
                        onClick={() => void runAction(() => onMoveCategory?.(cat.id, 1))}
                        className={actionButtonClass}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        disabled={isBusy || !onRenameCategory}
                        onClick={() => startRename(cat)}
                        className={actionButtonClass}
                      >
                        改名
                      </button>
                      <button
                        type="button"
                        disabled={isBusy || !onToggleCategoryActive}
                        onClick={() => void runAction(() => onToggleCategoryActive?.(cat.id, isDisabled))}
                        className={actionButtonClass}
                      >
                        {isDisabled ? '啟用' : '停用'}
                      </button>
                      {onDeleteClassification && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleDeleteClassification(cat.id)}
                          className={`${actionButtonClass} border-danger text-danger`}
                        >
                          刪除
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-0 px-3 py-3">
        {isAdding ? (
           <div className="flex flex-col gap-2">
             <input
               autoFocus
               type="text"
               value={newCategory}
               maxLength={50}
               onChange={e => setNewCategory(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && handleAdd()}
               placeholder="輸入分類名稱"
               className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:border-brand-600 bg-surface text-ink-900"
             />
             <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsAdding(false)}
                  className="text-xs text-ink-400 hover:text-ink-600 cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={handleAdd}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium cursor-pointer"
                >
                  確定
                </button>
             </div>
           </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 text-brand-600 hover:text-brand-700 transition-colors cursor-pointer"
          >
            <span className="text-xl font-light leading-none mb-0.5">+</span>
            <span className="text-sm">新增分類</span>
          </button>
        )}
      </div>
    </div>
  );
}
