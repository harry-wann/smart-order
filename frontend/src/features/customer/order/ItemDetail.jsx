import React, { useEffect, useMemo, useState } from 'react'
import SOButton from '../../../components/SOButton'
import OptionRadioGroup from '../../../components/optionRadio/OptionRadioGroup'
import OptionCheckboxGroup from '../../../components/optionCheckbox/OptionCheckboxGroup'
import Counter from '../../../components/steper/Counter'
import { useLocation, useNavigate } from 'react-router'
import { getCurrentDining } from '@/services/api/dining/diningApi'
import { addCartItem } from '@/services/api/cart/cartApi'
import { customerClient } from '@/services/client/customerClient'

const MAX_NOTE_LENGTH = 50

export default function ItemDetail() {
  const location = useLocation()
  const productId = location.state?.productId
  const navigate = useNavigate()
  const [selections, setSelections] = useState({})
  const [item, setItem] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (productId == null) return
    let cancelled = false

    async function loadItem() {
      setItem(null)
      setLoadError('')
      try {
        const response = await customerClient.get(`/order/items/${productId}`)
        if (!cancelled) setItem(response.data)
      } catch (err) {
        if (!cancelled) setLoadError(err.message || '商品資料載入失敗，請稍後再試')
      }
    }

    loadItem()
    return () => { cancelled = true }
  }, [productId])

  const displayOptionGroups = useMemo(
    () => (Array.isArray(item?.optionGroups) ? item.optionGroups : []).map((group) => ({
      id: String(group.optionGroupId),
      name: group.name,
      minSelect: Number(group.minSelect) || 0,
      maxSelect: Number(group.maxSelect) || 1,
      isRequired: Number(group.minSelect) > 0,
      selectionType: Number(group.maxSelect) === 1 ? 'radio' : 'checkbox',
      options: (Array.isArray(group.optionValues) ? group.optionValues : []).map((option) => ({
        id: String(option.optionValueId),
        name: option.name,
        priceDelta: Number(option.priceDelta) || 0,
      })),
    })),
    [item],
  )

  const invalidGroup = displayOptionGroups.find((group) => {
    const count = (selections[group.id] || []).length
    return count < group.minSelect || count > group.maxSelect
  })

  const totalAmount = useMemo(() => {
    const extraPrice = displayOptionGroups.reduce((sum, group) => {
      const selectedIds = selections[group.id] || []
      return sum + group.options.reduce(
        (groupSum, option) => groupSum + (selectedIds.includes(option.id) ? option.priceDelta : 0),
        0,
      )
    }, 0)
    return ((Number(item?.price) || 0) + extraPrice) * quantity
  }, [displayOptionGroups, item, quantity, selections])

  async function handleAdd() {
    if (busy || invalidGroup) return
    setBusy(true)
    setError('')
    try {
      const dining = await getCurrentDining()
      await addCartItem(String(dining.sessionId), {
        menuItemId: Number(productId),
        quantity,
        optionValueIds: Object.values(selections).flat().map(Number),
        note: note.trim() || undefined,
      })
      navigate('/order/menu')
    } catch (err) {
      setError(err.message || '加入購物車失敗，請稍後再試')
    } finally {
      setBusy(false)
    }
  }

  if (productId == null) {
    return <div className="min-h-screen bg-paper p-4 text-ink-900">查無商品資料</div>
  }
  if (loadError) {
    return (
      <div className="min-h-screen bg-paper p-4 text-ink-900" role="alert">
        <p>{loadError}</p>
        <button className="mt-3 text-brand-600 underline" onClick={() => window.location.reload()}>重新載入</button>
      </div>
    )
  }
  if (!item) return <div className="min-h-screen bg-paper p-4 text-ink-900">商品資料載入中...</div>

  return (
    <div className="relative min-h-screen w-full bg-paper pb-28 font-sans text-ink-900">
      <div className="relative flex h-[186px] w-full items-center justify-center overflow-hidden bg-surface-2">
        {item.imageUrl ? (
          <img src={item.imageUrl} className="h-full w-full object-cover" alt={item.name} />
        ) : (
          <span className="text-ink-400">暫無圖片</span>
        )}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent" />
      </div>

      <div className="px-4 pb-6 pt-4">
        <h1 className="font-serif text-[28px] font-bold leading-tight tracking-wide">{item.name}</h1>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-[22px] font-bold text-brand-600">NT$ {item.price}</span>
          <span className="text-sm font-bold text-ink-600">起</span>
        </div>
        {item.description && <p className="mt-2 leading-relaxed text-ink-600">{item.description}</p>}
        <div className="mt-1 border-b border-line" />
      </div>

      {displayOptionGroups.map((group) => {
        const selectedIds = selections[group.id] || []
        const badgeText = group.isRequired
          ? '必選'
          : group.maxSelect > 1 ? `可選 最多 ${group.maxSelect} 項` : '可選'
        const hintText = group.selectionType === 'radio'
          ? '單選'
          : `已選 ${selectedIds.length}・還有 ${Math.max(0, group.maxSelect - selectedIds.length)} 種`
        const mappedOptions = group.options.map((option) => ({
          value: option.id,
          title: option.name,
          desc: option.priceDelta > 0 ? `+NT$ ${option.priceDelta}` : '',
          disabled: !selectedIds.includes(option.id) && selectedIds.length >= group.maxSelect,
        }))

        return (
          <section key={group.id} className="px-4 pb-6">
            <div className="mb-3 flex min-h-7 items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{group.name}</h2>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${group.isRequired ? 'bg-brand-100 text-brand-600' : 'bg-surface-2 text-ink-600'}`}>
                  {badgeText}
                </span>
              </div>
              <span className="shrink-0 text-xs text-ink-600">{hintText}</span>
            </div>
            {group.selectionType === 'radio' ? (
              <OptionRadioGroup
                name={group.id}
                options={mappedOptions}
                value={selectedIds[0] || ''}
                onChange={(value) => setSelections((prev) => ({ ...prev, [group.id]: [value] }))}
              />
            ) : (
              <OptionCheckboxGroup
                name={group.id}
                options={mappedOptions}
                value={selectedIds}
                onChange={(values) => setSelections((prev) => ({ ...prev, [group.id]: values }))}
              />
            )}
            {selectedIds.length < group.minSelect && (
              <p className="mt-2 text-sm text-brand-600">此規格至少選擇 {group.minSelect} 項</p>
            )}
          </section>
        )
      })}

      <section className="mx-4 flex items-center justify-between border-t border-line py-4">
        <h2 className="text-lg font-bold">數量</h2>
        <Counter
          size="small"
          initialCount={1}
          showTrash={false}
          minCount={1}
          onChange={setQuantity}
        />
      </section>

      <section className="px-4 pb-6 pt-1">
        <div className="mb-3 flex items-center justify-between">
          <label htmlFor="item-note" className="text-lg font-bold">備註</label>
          <span className="text-sm text-ink-600">{note.length} / {MAX_NOTE_LENGTH}</span>
        </div>
        <textarea
          id="item-note"
          name="note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          maxLength={MAX_NOTE_LENGTH}
          disabled={busy}
          placeholder="例如：不要太生"
          className="w-full resize-none rounded-lg border border-line bg-surface p-4 text-base text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <p className="mt-2 text-sm text-ink-600">廚房看得到，但無法保證每一項都能配合</p>
      </section>

      {error && <p role="alert" className="px-4 pb-4 text-brand-600">{error}</p>}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-line bg-surface px-4 pb-6 pt-3">
        <SOButton
          height="h-[52px]"
          type="button"
          text={invalidGroup ? `請選擇${invalidGroup.name}` : ['加入購物車', `NT$ ${totalAmount}`]}
          disabled={!!invalidGroup || busy}
          onClick={handleAdd}
        />
      </div>
    </div>
  )
}
