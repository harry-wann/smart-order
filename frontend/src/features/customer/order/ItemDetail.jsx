import React, { useState, useMemo, useRef, useEffect } from 'react'
import SOButton from '../../../components/SOButton'
import OptionRadioGroup from '../../../components/optionRadio/OptionRadioGroup'
import OptionCheckboxGroup from '../../../components/optionCheckbox/OptionCheckboxGroup'
import { useLocation } from 'react-router'
import axios from 'axios'

// 原檔名 ItemDetails.jsx
// 原路徑 src/components
// 原 component 名 InteractiveItemDetails

const mockItemData = {
  id: 8,
  name: '台灣松阪豬',
  description: '一頭豬只有兩片的部位，脆度來自筋膜，涮 15 秒剛好。',
  price: 300.00,
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
  optionGroups: [
    {
      optionGroupId: 1,
      name: '份量',
      minSelect: 1,
      maxSelect: 1,
      optionValues: [
        { optionValueId: 1, name: '半份 約 120g', priceDelta: 0 },
        { optionValueId: 2, name: '全份 約 220g', priceDelta: 80 },
        { optionValueId: 3, name: '加大 約 320g', priceDelta: 160 },
      ],
    },
    {
      optionGroupId: 3,
      name: '加點配料',
      minSelect: 0,
      maxSelect: 5,
      optionValues: [
        { optionValueId: 4, name: '加蔥花', priceDelta: 10 },
        { optionValueId: 5, name: '加蒜泥', priceDelta: 10 },
        { optionValueId: 6, name: '加辣椒', priceDelta: 10 },
      ],
    },
  ],
}

export default function ItemDetail() {
  const { images, optionGroups } = mockItemData
  const location = useLocation();
  const productId = location.state?.productId;
  const [selections, setSelections] = useState({})
  const [item, setItem] = useState([]);
  const displayOptionGroups = useMemo(
    () =>
      optionGroups.map((group) => ({
        id: String(group.optionGroupId),
        name: group.name,
        isRequired: group.minSelect > 0,
        selectionType: group.maxSelect === 1 ? 'radio' : 'checkbox',
        maxSelect: group.maxSelect,
        options: group.optionValues.map((option) => ({
          id: String(option.optionValueId),
          name: option.name,
          priceDelta: option.priceDelta,
        })),
      })),
    [optionGroups],
  )

  // 輪播
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
  // ----------------

  useEffect(() => {
    if (productId == null) return; 
    async function loadItems(productId) {
      try {
        const response = await axios.get(`http://localhost:8080/api/order/items/${productId}`); 
        setItem(response.data)
      } catch (error) {
        console.error(error)
      }
    }
    loadItems(productId)
  },[productId])

  const totalAmount = useMemo(() => {
    let extraPrice = 0
    displayOptionGroups.forEach((group) => {
      const selectedIds = selections[group.id] || []
      group.options.forEach((option) => {
        if (selectedIds.includes(option.id)) {
          extraPrice += option.priceDelta
        }
      })
    })
    return item.price + extraPrice
  }, [selections, displayOptionGroups, item.price])

  // 尋找第一個尚未選擇的必選項群組
  const missingRequiredGroup = useMemo(() => {
    return displayOptionGroups.find(
      (group) => group.isRequired && (!selections[group.id] || selections[group.id].length === 0),
    )
  }, [displayOptionGroups, selections])

  return (
      <div className="relative min-h-screen w-full self-start bg-paper pb-24 font-sans text-ink-900">
        {productId == null ? <span>查無資料</span>:<div>
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
            <h1 className="text-2xl font-bold tracking-wide">{item.name}</h1>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-brand-600">NT$ {item.price}</span>
            <span className="text-sm font-medium text-ink-600">起</span>
          </div>
          <p className="mt-4 leading-relaxed text-ink-600">{item.description}</p>
          <div className="mt-6 border-b border-line"></div>
        </div>

        {displayOptionGroups.map((group) => {
          const selectedIds = selections[group.id] || []

          let badgeText = ''
          if (group.isRequired) {
            badgeText = '必選'
          } else if (group.maxSelect > 1) {
            badgeText = `可選 最多 ${group.maxSelect} 項`
          } else {
            badgeText = '可選'
          }

          let hintText = ''
          if (group.selectionType === 'radio') {
            hintText = '單選'
          } else if (group.selectionType === 'checkbox') {
            hintText = `已選 ${selectedIds.length}・還可選 ${group.maxSelect - selectedIds.length} 種`
          }

          const mappedOptions = group.options.map((opt) => ({
            value: opt.id,
            title: opt.name,
            desc: opt.priceDelta > 0 ? `+NT$ ${opt.priceDelta}` : '',
            disabled: false,
          }))

          return (
            <div key={group.id} className="px-5 pb-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">{group.name}</h3>
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
                    if (selectedValues.length > group.maxSelect) {
                      alert(`此項目最多只能選擇 ${group.maxSelect} 項`)
                      return
                    }
                    setSelections((prev) => ({ ...prev, [group.id]: selectedValues }))
                  }}
                />
              )}
            </div>
          )
        })}

        <div className="fixed right-0 bottom-0 left-0 flex h-22.25 border-t border-line bg-paper p-4 pb-6">
          <SOButton
            height="h-[52px]"
            type="button"
            text={
              missingRequiredGroup
                ? `請選擇`
                : ['加入購物車', `NT$ ${totalAmount}`]
            }
            disabled={!!missingRequiredGroup}
          />
        </div>
      </div>
    }
    </div>
  )
}