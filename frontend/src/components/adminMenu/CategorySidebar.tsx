import React, { useState } from 'react';

export interface Category {
  id: string;
  name: string;
  count: number;
}

interface Props {
  categories: Category[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
  onAddCategory: (name: string) => Promise<Category | null>;
  onDeleteCategory?: (categoryId: string, categoryName: string) => void;
}

export default function CategorySidebar({
  categories,
  activeCategoryId,
  onSelectCategory,
  onAddCategory,
  onDeleteCategory
}: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [newCategory, setNewCategory] = useState('');

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

  return (
    <div className="no-scrollbar h-full w-[180px] shrink-0 overflow-y-auto">
      {/* 標題 */}
      <div className="text-sm text-ink-400 font-medium px-4 mb-4">分類</div>
      
      {/* 分類列表 */}
      <div className="flex flex-col gap-1">
        {categories.map((cat) => {
          const isActive = activeCategoryId === cat.id;
          
          return (
            <div
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`group flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-colors relative
                ${isActive 
                  ? 'bg-brand-50 text-brand-700 font-bold' // 命中狀態（如圖片中的「肉品」樣式）
                  : 'text-ink-600 hover:bg-surface-200'    // 未命中狀態
                }`}
            >
              <span className="truncate">{cat.name}</span>
              
              {/* 預設顯示數量，滑鼠懸停時隱藏 */}
              <span className={`text-sm ${isActive ? 'text-brand-700' : 'text-ink-600'} group-hover:hidden`}>
                {cat.count}
              </span>

              {/* 刪除按鈕，僅在滑鼠懸停時顯示（取代數量顯示的位置） */}
              {cat.id !== 'all' && onDeleteCategory ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation(); // 防止觸發外層的 onClick (切換分類)
                    onDeleteCategory(cat.id, cat.name);
                  }}
                  className="hidden group-hover:block text-xs text-danger hover:text-red-700 transition-colors"
                >
                  刪除
                </button>
              ) : (
                /* 如果是「全部」分類（不可刪除），hover 時依然顯示數量 */
                <span className="hidden group-hover:block text-sm text-ink-600">
                  {cat.count}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 px-4">
        {isAdding ? (
           <div className="flex flex-col gap-2">
             <input 
               autoFocus
               type="text" 
               value={newCategory}
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