export default function MenuCategoryTabs({ category, activeCategoryId, onClick }) {

  return (
    <div className="flex w-max gap-6">
      {category.map((item) => {
        const isActive = String(activeCategoryId) === String(item.id)

        return (
          <div key={item.id} className="flex h-12 shrink-0">
            <button
              type="button"
              // data-category-id 讓菜單頁在高亮換分類時，找得到這個頁籤並把它捲進可見範圍
              data-category-id={item.id}
              aria-current={isActive ? 'true' : undefined}
              onClick={() => onClick?.(item)}
              className={`flex cursor-pointer items-center justify-center type-body transition-colors ${
                isActive ? 'font-bold text-brand-600' : 'text-ink-600'
              }`}
            >
              <span
                className={`relative flex h-full items-center ${
                  isActive
                    ? 'after:absolute after:bottom-0 after:left-0 after:h-1 after:w-full after:bg-brand-600 after:content-[""]'
                    : 'text-ink-600'
                }`}
              >
                {item.name}
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
