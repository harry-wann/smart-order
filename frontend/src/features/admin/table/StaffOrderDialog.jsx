import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SOButton from '@/components/SOButton'
import {
  getStaffOrderCategories,
  getStaffOrderMenuItemDetail,
  getStaffOrderMenuItems,
} from '@/services/api/table/tableApi'

const MAX_NOTE_LENGTH = 50

function countNoteCharacters(value) {
  return Array.from(value).length
}

function limitNoteCharacters(value) {
  return Array.from(value).slice(0, MAX_NOTE_LENGTH).join('')
}

function asNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function formatMoney(value) {
  return asNumber(value).toLocaleString('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function getErrorText(error) {
  const message = error?.message || '送出代客加點失敗，請稍後再試。'
  if (error?.status >= 400 && error.status < 500) {
    return `${message}${error.code ? `（${error.code}）` : ''} 請確認餐點資料後再試。`
  }
  return message
}

export default function StaffOrderDialog({
  attemptId,
  sessionId,
  tableLabel,
  isCurrentAttempt,
  isSubmitting = false,
  onClose,
  onSubmit,
}) {
  const mountedRef = useRef(false)
  const categoryRequestRef = useRef(0)
  const menuRequestRef = useRef(0)
  const detailRequestRef = useRef(0)
  const draftSequenceRef = useRef(0)

  const [categories, setCategories] = useState([])
  const [categoryStatus, setCategoryStatus] = useState('loading')
  const [categoryError, setCategoryError] = useState('')
  const [activeCategoryId, setActiveCategoryId] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [menuStatus, setMenuStatus] = useState('idle')
  const [menuError, setMenuError] = useState('')
  const [selectedMenuItemId, setSelectedMenuItemId] = useState(null)
  const [selectedMenuItemDetail, setSelectedMenuItemDetail] = useState(null)
  const [detailStatus, setDetailStatus] = useState('idle')
  const [detailError, setDetailError] = useState('')
  const [detailReload, setDetailReload] = useState(0)
  const [catalogReload, setCatalogReload] = useState(0)
  const [selections, setSelections] = useState({})
  const [quantity, setQuantity] = useState('1')
  const [note, setNote] = useState('')
  const [draftItems, setDraftItems] = useState([])
  const [submitError, setSubmitError] = useState('')
  const [sending, setSending] = useState(false)

  const isLive = useCallback(
    () => mountedRef.current && isCurrentAttempt(attemptId),
    [attemptId, isCurrentAttempt],
  )

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      categoryRequestRef.current += 1
      menuRequestRef.current += 1
      detailRequestRef.current += 1
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const requestId = ++categoryRequestRef.current
    setCategoryStatus('loading')
    setCategoryError('')

    getStaffOrderCategories(controller.signal)
      .then((data) => {
        if (!isLive() || requestId !== categoryRequestRef.current) return
        const available = Array.isArray(data) ? data : []
        setCategories(available)
        setActiveCategoryId((current) => (
          available.some((category) => String(category.id) === String(current))
            ? current
            : available[0]?.id ?? null
        ))
        setCategoryStatus('success')
      })
      .catch((error) => {
        if (controller.signal.aborted || !isLive() || requestId !== categoryRequestRef.current) return
        setCategories([])
        setCategoryStatus('error')
        setCategoryError(error?.message || '菜單分類載入失敗。')
      })

    return () => controller.abort()
  }, [catalogReload, isLive])

  useEffect(() => {
    if (activeCategoryId == null) {
      setMenuItems([])
      setMenuStatus(categoryStatus === 'success' ? 'empty' : 'idle')
      return undefined
    }

    const controller = new AbortController()
    const requestId = ++menuRequestRef.current
    setMenuStatus('loading')
    setMenuError('')

    getStaffOrderMenuItems(activeCategoryId, controller.signal)
      .then((data) => {
        if (!isLive() || requestId !== menuRequestRef.current) return
        const available = Array.isArray(data) ? data : []
        setMenuItems(available)
        setMenuStatus(available.length ? 'success' : 'empty')
      })
      .catch((error) => {
        if (controller.signal.aborted || !isLive() || requestId !== menuRequestRef.current) return
        setMenuItems([])
        setMenuStatus('error')
        setMenuError(error?.message || '餐點清單載入失敗。')
      })

    return () => controller.abort()
  }, [activeCategoryId, catalogReload, categoryStatus, isLive])

  useEffect(() => {
    if (selectedMenuItemId == null) {
      setSelectedMenuItemDetail(null)
      setDetailStatus('idle')
      setDetailError('')
      setSelections({})
      return undefined
    }

    const controller = new AbortController()
    const requestId = ++detailRequestRef.current
    setSelectedMenuItemDetail(null)
    setDetailStatus('loading')
    setDetailError('')
    setSelections({})

    getStaffOrderMenuItemDetail(selectedMenuItemId, controller.signal)
      .then((data) => {
        if (!isLive() || requestId !== detailRequestRef.current) return
        setSelectedMenuItemDetail(data)
        setDetailStatus('success')
      })
      .catch((error) => {
        if (controller.signal.aborted || !isLive() || requestId !== detailRequestRef.current) return
        setDetailStatus('error')
        setDetailError(error?.message || '餐點選項載入失敗。')
      })

    return () => controller.abort()
  }, [detailReload, isLive, selectedMenuItemId])

  const selectedMenuItem = menuItems.find(
    (item) => String(item.id) === String(selectedMenuItemId),
  )
  const optionGroups = Array.isArray(selectedMenuItemDetail?.optionGroups)
    ? selectedMenuItemDetail.optionGroups
    : []

  const invalidGroup = optionGroups.find((group) => {
    const key = String(group.optionGroupId)
    const selectedCount = (selections[key] ?? []).length
    return selectedCount < Number(group.minSelect ?? 0) || selectedCount > Number(group.maxSelect ?? 1)
  })

  const quantityNumber = Number(quantity)
  const quantityValid = Number.isInteger(quantityNumber) && quantityNumber >= 1 && quantityNumber <= 10

  const selectedOptions = useMemo(() => optionGroups.flatMap((group) => {
    const selectedIds = new Set(selections[String(group.optionGroupId)] ?? [])
    return (group.optionValues ?? [])
      .filter((option) => selectedIds.has(String(option.optionValueId)))
      .map((option) => ({
        id: Number(option.optionValueId),
        name: option.name,
        priceDelta: asNumber(option.priceDelta),
      }))
  }), [optionGroups, selections])

  const currentEstimate = selectedMenuItemDetail
    ? (asNumber(selectedMenuItemDetail.price) + selectedOptions.reduce((sum, option) => sum + option.priceDelta, 0)) * quantityNumber
    : 0
  const draftSubtotal = draftItems.reduce((sum, item) => sum + item.estimatedTotal, 0)
  const canAddToDraft = Boolean(
    selectedMenuItemDetail &&
    detailStatus === 'success' &&
    !selectedMenuItem?.soldOut &&
    !invalidGroup &&
    quantityValid &&
    !isSubmitting &&
    !sending,
  )

  const retryCatalog = () => setCatalogReload((version) => version + 1)

  const handleSelectCategory = (categoryId) => {
    setActiveCategoryId(categoryId)
    setSelectedMenuItemId(null)
    setSubmitError('')
  }

  const handleToggleOption = (group, optionId, checked) => {
    const groupId = String(group.optionGroupId)
    const maxSelect = Math.max(0, Number(group.maxSelect ?? 1))
    setSelections((current) => {
      const selected = current[groupId] ?? []
      if (!checked) {
        return { ...current, [groupId]: selected.filter((id) => id !== optionId) }
      }
      if (selected.includes(optionId)) return current
      const next = maxSelect === 1 ? [optionId] : [...selected, optionId]
      if (next.length > maxSelect) return current
      return { ...current, [groupId]: next }
    })
  }

  const addDraftItem = () => {
    if (!canAddToDraft) return
    const line = {
      localId: ++draftSequenceRef.current,
      menuItemId: Number(selectedMenuItemDetail.id),
      name: selectedMenuItemDetail.name,
      quantity: quantityNumber,
      optionValueIds: selectedOptions.map((option) => option.id),
      options: selectedOptions,
      note: note.trim(),
      estimatedTotal: currentEstimate,
    }
    setDraftItems((current) => [...current, line])
    setSelections({})
    setQuantity('1')
    setNote('')
    setSubmitError('')
  }

  const submitDraft = async () => {
    if (!draftItems.length || sending || isSubmitting) return
    setSending(true)
    setSubmitError('')
    const payload = draftItems.map(({ menuItemId, quantity: itemQuantity, optionValueIds, note: itemNote }) => ({
      menuItemId,
      quantity: itemQuantity,
      optionValueIds,
      note: itemNote,
    }))

    try {
      const result = await onSubmit(payload)
      if (!isLive() || result?.stale) return
      if (result?.ok === false) throw result.error
    } catch (error) {
      if (!isLive()) return
      const soldOut = error?.code === 'ITEM_SOLD_OUT'
      setSubmitError(soldOut
        ? `${getErrorText(error)} 菜單已重新整理；草稿仍保留，請移除售完餐點或確認後再試。`
        : getErrorText(error))
      if (soldOut) {
        setCatalogReload((version) => version + 1)
        if (selectedMenuItemId != null) setDetailReload((version) => version + 1)
      }
    } finally {
      if (isLive()) setSending(false)
    }
  }

  const busy = isSubmitting || sending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-order-dialog-title"
        className="my-auto flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-card bg-surface text-ink-900 shadow-pop"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <p className="type-caption text-ink-600">{tableLabel}</p>
            <h2 id="staff-order-dialog-title" className="type-h2 font-bold">代客加點</h2>
          </div>
          <button
            type="button"
            aria-label="關閉代客加點"
            onClick={onClose}
            disabled={busy}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-btn border border-line text-xl disabled:opacity-40"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <p className="mb-4 rounded-btn border border-warning-line bg-warning-bg px-3 py-3 type-body-sm text-hold-ink">
            這裡加點會直接送廚房，不會更動手機購物車。
          </p>

          {categoryStatus === 'loading' ? (
            <p role="status" className="py-8 text-center type-body-sm text-ink-600">正在載入菜單分類…</p>
          ) : categoryStatus === 'error' ? (
            <div className="rounded-btn border border-danger/30 p-4" role="alert">
              <p className="type-body-sm text-danger">{categoryError}</p>
              <button type="button" onClick={retryCatalog} className="mt-3 min-h-11 text-brand-600 underline">重新載入分類</button>
            </div>
          ) : categories.length === 0 ? (
            <div className="rounded-btn border border-line p-4 text-center">
              <p className="type-body-sm text-ink-600">目前沒有可選的菜單分類。</p>
              <button type="button" onClick={retryCatalog} className="mt-3 min-h-11 text-brand-600 underline">重新載入</button>
            </div>
          ) : (
            <>
              <nav aria-label="餐點分類" className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
                {categories.map((category) => {
                  const active = String(category.id) === String(activeCategoryId)
                  return (
                    <button
                      key={category.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => handleSelectCategory(category.id)}
                      className={`min-h-11 shrink-0 rounded-pill border px-4 type-body-sm font-medium ${active ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-surface text-ink-700'}`}
                    >
                      {category.name}
                    </button>
                  )
                })}
              </nav>

              <div className="grid gap-4 lg:grid-cols-2">
                <section aria-labelledby="staff-menu-items-title" className="min-w-0">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 id="staff-menu-items-title" className="type-h3 font-semibold">選擇餐點</h3>
                    <button type="button" onClick={retryCatalog} className="min-h-11 shrink-0 text-caption text-brand-600 underline">更新菜單</button>
                  </div>
                  {menuStatus === 'loading' ? (
                    <p role="status" className="rounded-btn border border-line p-5 text-center type-body-sm text-ink-600">正在載入餐點…</p>
                  ) : menuStatus === 'error' ? (
                    <div role="alert" className="rounded-btn border border-danger/30 p-4">
                      <p className="type-body-sm text-danger">{menuError}</p>
                      <button type="button" onClick={retryCatalog} className="mt-3 min-h-11 text-brand-600 underline">重新載入餐點</button>
                    </div>
                  ) : menuItems.length === 0 ? (
                    <p className="rounded-btn border border-line p-5 text-center type-body-sm text-ink-600">這個分類目前沒有可選餐點。</p>
                  ) : (
                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                      {menuItems.map((item) => {
                        const soldOut = Boolean(item.soldOut)
                        const selected = String(item.id) === String(selectedMenuItemId)
                        return (
                          <button
                            key={item.id}
                            type="button"
                            disabled={soldOut || busy}
                            aria-pressed={selected}
                            onClick={() => {
                              setSelectedMenuItemId(item.id)
                              setSubmitError('')
                            }}
                            className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-btn border px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-50 ${selected ? 'border-brand-600 bg-brand-50' : 'border-line bg-surface'}`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate type-body-sm font-medium">{item.name}</span>
                              {soldOut && <span className="block type-caption text-danger">已售完</span>}
                            </span>
                            <span className="shrink-0 type-body-sm">NT$ {formatMoney(item.price)}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </section>

                <section aria-labelledby="staff-item-editor-title" className="min-w-0 rounded-card border border-line p-3 sm:p-4">
                  <h3 id="staff-item-editor-title" className="mb-3 type-h3 font-semibold">餐點規格</h3>
                  {detailStatus === 'loading' ? (
                    <p role="status" className="py-5 type-body-sm text-ink-600">正在載入餐點規格…</p>
                  ) : detailStatus === 'error' ? (
                    <div role="alert" className="rounded-btn border border-danger/30 p-3">
                      <p className="type-body-sm text-danger">{detailError}</p>
                      <button type="button" onClick={() => setDetailReload((version) => version + 1)} className="mt-2 min-h-11 text-brand-600 underline">重新載入規格</button>
                    </div>
                  ) : !selectedMenuItemDetail ? (
                    <p className="py-5 type-body-sm text-ink-600">先從左側選擇餐點。</p>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <p className="type-body font-semibold">{selectedMenuItemDetail.name}</p>
                        <p className="mt-1 type-caption text-ink-600">目前單價 NT$ {formatMoney(selectedMenuItemDetail.price)}（送出時由後端再次驗證）</p>
                      </div>

                      {optionGroups.length === 0 ? (
                        <p className="type-caption text-ink-600">此餐點沒有可選規格。</p>
                      ) : optionGroups.map((group) => {
                        const groupId = String(group.optionGroupId)
                        const groupMin = Number(group.minSelect ?? 0)
                        const groupMax = Number(group.maxSelect ?? 1)
                        const selectedIds = selections[groupId] ?? []
                        return (
                          <fieldset key={groupId} className="min-w-0 border-t border-line pt-3">
                            <legend className="type-body-sm font-semibold">{group.name}</legend>
                            <p className="mb-2 type-caption text-ink-600">
                              {groupMin > 0 ? `必選至少 ${groupMin} 項` : '可選'}{groupMax > 1 ? `，最多 ${groupMax} 項` : ''}
                            </p>
                            <div className="space-y-1">
                              {(group.optionValues ?? []).map((option) => {
                                const optionId = String(option.optionValueId)
                                const checked = selectedIds.includes(optionId)
                                const delta = asNumber(option.priceDelta)
                                const disabled = busy || (!checked && selectedIds.length >= groupMax)
                                return (
                                  <label key={optionId} className={`flex min-h-11 items-center gap-3 rounded-btn px-2 ${disabled && !checked ? 'opacity-50' : ''}`}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      disabled={disabled}
                                      onChange={(event) => handleToggleOption(group, optionId, event.target.checked)}
                                      className="size-5 shrink-0 accent-brand-600"
                                    />
                                    <span className="min-w-0 flex-1 type-body-sm">{option.name}</span>
                                    {delta !== 0 && <span className="shrink-0 type-caption text-ink-600">{delta > 0 ? '+' : '−'}NT$ {formatMoney(Math.abs(delta))}</span>}
                                  </label>
                                )
                              })}
                            </div>
                            {selectedIds.length < groupMin && (
                              <p className="mt-1 type-caption text-brand-600">此規格至少選擇 {groupMin} 項。</p>
                            )}
                          </fieldset>
                        )
                      })}

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="block type-body-sm font-medium">
                          數量（1–10）
                          <input
                            type="number"
                            min="1"
                            max="10"
                            step="1"
                            value={quantity}
                            disabled={busy}
                            onChange={(event) => setQuantity(event.target.value)}
                            className="mt-1 min-h-11 w-full rounded-btn border border-line bg-surface px-3"
                          />
                        </label>
                        <label className="block type-body-sm font-medium">
                          備註（最多 50 字）
                          <input
                            type="text"
                            value={note}
                            disabled={busy}
                            onChange={(event) => setNote(limitNoteCharacters(event.target.value))}
                            className="mt-1 min-h-11 w-full rounded-btn border border-line bg-surface px-3"
                          />
                          <span className="mt-1 block text-right type-caption text-ink-600">{countNoteCharacters(note)} / {MAX_NOTE_LENGTH}</span>
                        </label>
                      </div>
                      {!quantityValid && <p role="alert" className="type-caption text-danger">數量必須是 1 到 10 的整數。</p>}
                      {invalidGroup && <p role="alert" className="type-caption text-danger">請確認「{invalidGroup.name}」的必選數量。</p>}
                      <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
                        <p className="type-body-sm">參考小計 <strong>NT$ {formatMoney(currentEstimate)}</strong></p>
                        <div className="w-40 shrink-0">
                          <SOButton
                            height="min-h-11"
                            variant="secondary"
                            text="加入待送清單"
                            disabled={!canAddToDraft}
                            onClick={addDraftItem}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </div>

              <section aria-labelledby="staff-draft-title" className="mt-4 rounded-card border border-line p-3 sm:p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 id="staff-draft-title" className="type-h3 font-semibold">本次代客加點</h3>
                  <span className="shrink-0 type-body-sm font-semibold">參考小計 NT$ {formatMoney(draftSubtotal)}</span>
                </div>
                {draftItems.length === 0 ? (
                  <p className="rounded-btn bg-paper p-4 text-center type-body-sm text-ink-600">尚未加入餐點。</p>
                ) : (
                  <ul className="space-y-2">
                    {draftItems.map((item) => (
                      <li key={item.localId} className="flex min-w-0 items-start justify-between gap-3 rounded-btn bg-paper p-3">
                        <div className="min-w-0">
                          <p className="type-body-sm font-semibold">{item.name} × {item.quantity}</p>
                          {item.options.length > 0 && <p className="mt-1 break-words type-caption text-ink-600">{item.options.map((option) => option.name).join('、')}</p>}
                          {item.note && <p className="mt-1 break-words type-caption text-ink-600">備註：{item.note}</p>}
                          <p className="mt-1 type-caption text-ink-600">參考金額 NT$ {formatMoney(item.estimatedTotal)}</p>
                        </div>
                        <button
                          type="button"
                          aria-label={`移除${item.name}`}
                          disabled={busy}
                          onClick={() => setDraftItems((current) => current.filter((draft) => draft.localId !== item.localId))}
                          className="min-h-11 min-w-11 shrink-0 rounded-btn border border-line text-brand-600 disabled:opacity-40"
                        >
                          移除
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {submitError && <p role="alert" className="mt-3 rounded-btn border border-danger/30 bg-surface p-3 type-body-sm text-danger">{submitError}</p>}
              </section>
            </>
          )}
        </div>

        <footer className="flex shrink-0 flex-col gap-3 border-t border-line bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="type-caption text-ink-600">參考小計 NT$ {formatMoney(draftSubtotal)} · 送出時會依最新菜單與庫存確認金額</p>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <div className="w-full sm:w-32">
              <SOButton
                variant="secondary"
                height="min-h-11"
                text="關閉"
                disabled={busy}
                onClick={onClose}
              />
            </div>
            <div className="w-full sm:w-48">
              <SOButton
                height="min-h-11"
                text={busy ? '正在送出…' : '確認送廚房'}
                disabled={!draftItems.length || busy || categoryStatus !== 'success'}
                onClick={submitDraft}
              />
            </div>
          </div>
        </footer>
      </section>
    </div>
  )
}
