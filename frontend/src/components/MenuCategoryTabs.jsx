import { useRef, useState } from 'react'

export default function MenuCategoryTabs({ category, onClick }) {
  const buttonRef = useRef([])

  const [activeTab, setActiveTab] = useState(category[0])

  const handleClick = (index, event) => {
    setActiveTab(category[index])
    onClick?.(category[index], index)
  }

  return (
    <>
      <div className="flex w-full">
        {category.map((item, index) => {
          const isActive = activeTab === item

          return (
            <button
              key={index}
              type="button"
              onClick={(e) => handleClick(index, e)}
              ref={(elem) => {
                buttonRef.current[index] = elem
              }}
              className={`flex flex-1 cursor-pointer justify-center text-lg transition-colors ${
                isActive ? 'font-bold text-brand-600' : 'text-gray-500'
              }`}
            >
              <span
                className={`relative pb-3 ${
                  isActive
                    ? 'after:absolute after:bottom-0 after:left-0 after:h-1 after:w-full after:bg-brand-600 after:content-[""]'
                    : ''
                }`}
              >
                {item}
              </span>
            </button>
          )
        })}
      </div>

      <hr />
    </>
  )
}
