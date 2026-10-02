import React, { useState, useMemo, useRef, useEffect } from 'react'
import { ChevronLeft } from 'lucide-react'
import SOButton from './SOButton'
import OptionRadioGroup from './optionRadio/OptionRadioGroup'
import OptionCheckboxGroup from './optionCheckbox/OptionCheckboxGroup'

const mockItemData = {
  images: [
    {
      id: 'img1',
      src: 'https://images.unsplash.com/photo-1602881917760-7379db593981?auto=format&fit=crop&w=800&q=80',
      alt: '安格斯霜降牛五花 特寫',
    },
    {
      id: 'img2',
      src: 'https://images.unsplash.com/photo-1544025162-831451f21eb2?auto=format&fit=crop&w=800&q=80',
      alt: '安格斯霜降牛五花 俯視',
    },
    {
      id: 'img3',
      src: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
      alt: '火鍋湯底與肉片',
    },
  ],
  product: {
    name: '安格斯霜降牛五花',
    badge: '人氣',
    basePrice: 380,
    description: '厚切 3mm，涮 8 秒最好吃。美國 Choice 級前胸，油花分布均勻，是我們賣最好的一款。',
  },
  optionGroups: [
    {
      id: 'portion',
      title: '份量',
      isRequired: true,
      selectionType: 'radio',
      maxLimit: 1,
      options: [
        { id: 'p1', label: '半份 約 120g', price: 0 },
        { id: 'p2', label: '全份 約 220g', price: 80 },
      ],
    },
    {
      id: 'addons',
      title: '加點配料',
      isRequired: false,
      selectionType: 'checkbox',
      maxLimit: 5,
      options: [
        { id: 'a1', label: '加蔥花', price: 10 },
        { id: 'a2', label: '加蒜泥', price: 10 },
        { id: 'a3', label: '加辣椒', price: 10 },
      ],
    },
  ],
}

export default function InteractiveItemDetails() {
  const { images, product, optionGroups } = mockItemData

  const [selections, setSelections] = useState({
    portion: [],
    addons: [],
  })

  const scrollRef = useRef(null)
  const [currentImgIndex, setCurrentImgIndex] = useState(0)

  const handleScroll = () => {
    if (!scrollRef.current) return
    const scrollLeft = scrollRef.current.scrollLeft
    const width = scrollRef.current.clientWidth
    const index = Math.round(scrollLeft / width)
    setCurrentImgIndex(index)
  }

  useEffect(() => {
    const timer = setInterval(() => {
      if (!scrollRef.current) return
      const width = scrollRef.current.clientWidth
      const nextIndex = (currentImgIndex + 1) % images.length
      scrollRef.current.scrollTo({
        left: nextIndex * width,
        behavior: 'smooth',
      })
    }, 3000)
    return () => clearInterval(timer)
  }, [currentImgIndex, images.length])

  const totalAmount = useMemo(() => {
    let extraPrice = 0
    optionGroups.forEach((group) => {
      const selectedIds = selections[group.id] || []
      group.options.forEach((option) => {
        if (selectedIds.includes(option.id)) {
          extraPrice += option.price
        }
      })
    })
    return product.basePrice + extraPrice
  }, [selections, optionGroups, product.basePrice])

  // 尋找第一個尚未選擇的必選項群組
  const missingRequiredGroup = useMemo(() => {
    return optionGroups.find(
      (group) => group.isRequired && (!selections[group.id] || selections[group.id].length === 0),
    )
  }, [optionGroups, selections])

  return (
    <div className="relative mx-auto min-h-screen max-w-md bg-paper pb-24 font-sans text-ink-900">
      <div className="relative h-64 w-full bg-surface-2">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex h-full w-full snap-x snap-mandatory scrollbar-none overflow-x-auto [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((img) => (
            <div key={img.id} className="relative h-full w-full shrink-0 snap-center">
              <img src={img.src} alt={img.alt} className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent"></div>
            </div>
          ))}
        </div>

        <div className="absolute bottom-4 left-0 z-10 flex w-full justify-center gap-2">
          {images.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentImgIndex === idx ? 'w-6 bg-surface' : 'w-1.5 bg-surface/60'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="px-5 py-6">
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold tracking-wide">{product.name}</h1>
          <span className="rounded-full bg-accent-500 px-3 py-1 text-sm font-medium text-surface">
            {product.badge}
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-2xl font-bold text-brand-600">NT$ {product.basePrice}</span>
          <span className="text-sm font-medium text-ink-600">起</span>
        </div>
        <p className="mt-4 leading-relaxed text-ink-600">{product.description}</p>
        <div className="mt-6 border-b border-line"></div>
      </div>

      {optionGroups.map((group) => {
        const selectedIds = selections[group.id] || []

        let badgeText = ''
        if (group.isRequired) {
          badgeText = '必選'
        } else if (group.maxLimit > 1) {
          badgeText = `可選 最多 ${group.maxLimit} 項`
        } else {
          badgeText = '可選'
        }

        let hintText = ''
        if (group.selectionType === 'radio') {
          hintText = '單選'
        } else if (group.selectionType === 'checkbox') {
          hintText = `已選 ${selectedIds.length}・還可選 ${group.maxLimit - selectedIds.length} 種`
        }

        const mappedOptions = group.options.map((opt) => ({
          value: opt.id,
          title: opt.label,
          desc: opt.price > 0 ? `+NT$ ${opt.price}` : '',
          disabled: false,
        }))

        return (
          <div key={group.id} className="px-5 pb-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">{group.title}</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    group.isRequired ? 'bg-brand-100 text-brand-600' : 'bg-surface-2 text-ink-600'
                  }`}
                >
                  {badgeText}
                </span>
              </div>
              <span className="text-sm text-ink-600">{hintText}</span>
            </div>

            {group.selectionType === 'radio' ? (
              <OptionRadioGroup
                name={group.id}
                options={mappedOptions}
                value={selectedIds[0] || ''}
                onChange={(selectedValue) => {
                  setSelections((prev) => ({ ...prev, [group.id]: [selectedValue] }))
                }}
              />
            ) : (
              <OptionCheckboxGroup
                name={group.id}
                options={mappedOptions}
                value={selectedIds}
                onChange={(selectedValues) => {
                  if (selectedValues.length > group.maxLimit) {
                    alert(`此項目最多只能選擇 ${group.maxLimit} 項`)
                    return
                  }
                  setSelections((prev) => ({ ...prev, [group.id]: selectedValues }))
                }}
              />
            )}
          </div>
        )
      })}

      <div className="fixed right-0 bottom-0 left-0 mx-auto flex h-22.25 max-w-md border-t border-line bg-paper p-4 pb-6">
        <SOButton
          height="h-[52px]"
          type="button"
          text={
            missingRequiredGroup
              ? `請選擇${missingRequiredGroup.title}`
              : ['加入購物車', `NT$ ${totalAmount}`]
          }
          disabled={!!missingRequiredGroup}
        />
      </div>
    </div>
  )
}
