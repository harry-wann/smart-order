import React, { useState, useMemo, useEffect } from 'react'
import SOButton from '../../../components/SOButton'
import OptionRadioGroup from '../../../components/optionRadio/OptionRadioGroup'
import OptionCheckboxGroup from '../../../components/optionCheckbox/OptionCheckboxGroup'
import { useLocation, useNavigate } from 'react-router'
import { getCurrentDining } from '@/services/api/dining/diningApi'
import { addCartItem } from '@/services/api/cart/cartApi'
import { customerClient } from '@/services/client/customerClient'

export default function ItemDetail() {
  const location = useLocation();
  const productId = location.state?.productId;
  const [selections, setSelections] = useState({})
  const [item, setItem] = useState(null);
  const navigate = useNavigate()
  const [quantity, setQuantity] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd() {
    if (busy || missingRequiredGroup) return
    setBusy(true)
    setError('')
    try {
      const dining = await getCurrentDining()
      await addCartItem(String(dining.sessionId), {
        menuItemId: Number(productId), quantity,
        optionValueIds: Object.values(selections).flat().map(Number),
      })
      navigate('/order/menu')
    } catch (err) {
      setError(err.message || '加入購物車失敗，請稍後再試')
    } finally {
      setBusy(false)
    }
  }

  const displayOptionGroups = useMemo(
    () =>
      (item?.optionGroups || []).map((group) => ({
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
    [item],
  )

  useEffect(() => {
    if (productId == null) return; 
    async function loadItems(productId) {
      try {
        const response = await customerClient.get(`/order/items/${productId}`);
        setItem(response.data)
      } catch (error) {
        console.error(error)
      }
    }
    loadItems(productId)
  },[productId])

  const totalAmount = useMemo(() => {
    if (!item) return 0;
    let extraPrice = 0
    displayOptionGroups.forEach((group) => {
      const selectedIds = selections[group.id] || []
      group.options.forEach((option) => {
        if (selectedIds.includes(option.id)) {
          extraPrice += Number(option.priceDelta)
        }
      })
    })
    return (Number(item.price) + extraPrice) * quantity
  }, [selections, displayOptionGroups, item, quantity])

  const missingRequiredGroup = displayOptionGroups.find(
      (group) => group.isRequired && (!selections[group.id] || selections[group.id].length === 0),
    )

  return (
      <div className="relative min-h-screen w-full self-start bg-paper pb-24 font-sans text-ink-900">
        {productId == null ? (
          <span>查無資料</span>
        ) : !item ? (
          <span>資料載入中...</span>
        ) : (
          <div>
            <div className="relative h-64 w-full bg-surface-2 flex items-center justify-center">
              {item.imageUrl ? (
                <img src={item.imageUrl} className="h-full w-full object-cover" alt={item.name} />
              ) : (
                <span className="text-ink-400">暫無圖片</span>
              )}
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent"></div>
            </div>

            <div className="px-5 py-6">
              <div className="flex items-start justify-between">
                <h1 className="text-2xl font-bold tracking-wide">{item.name}</h1>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-brand-600">NT\$ {item.price}</span>
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

            <div className="flex items-center justify-between px-5 pb-6">
              <label htmlFor="item-quantity">份數</label>
              <input id="item-quantity" type="number" min="1" max="10" value={quantity}
                disabled={busy} className="w-20 rounded border border-line p-2"
                onChange={(event) => setQuantity(Math.min(10, Math.max(1, Math.trunc(Number(event.target.value)) || 1)))} />
            </div>
            {error && <p role="alert" className="px-5 pb-4 text-brand-600">{error}</p>}
            <div className="fixed right-0 bottom-0 left-0 flex h-22.25 border-t border-line bg-paper p-4 pb-6">
              <SOButton
                height="h-[52px]"
                type="button"
                text={
                  missingRequiredGroup
                    ? `請選擇${missingRequiredGroup.name}`
                    : ['加入購物車', `NT$ ${totalAmount}`]
                }
                disabled={!!missingRequiredGroup || busy}
                onClick={handleAdd}
              />
            </div>
          </div>
        )}
      </div>
  )
}
