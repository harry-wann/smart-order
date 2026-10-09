export default function MenuCategoryTabs({ category, activeCategoryId, onClick }) {

  return (
    <>
      <div className="flex w-full">
        {category.map((item) => {
          const isActive = activeCategoryId === item.id

          return (
            <div key={item.id} className="inline-flex w-1/6 shrink-0 justify-center">
              <button
                type="button"
                onClick={() => onClick?.(item)}
                className={`flex flex-1 cursor-pointer justify-center text-lg transition-colors ${
                  isActive ? 'font-bold text-brand-600' : 'text-ink-600'
                }`}
              >
                <span
                  className={`relative pb-3 ${
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

      <hr />
    </>
  )
}
