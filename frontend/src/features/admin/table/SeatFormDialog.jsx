import { useEffect, useState } from 'react'
import SOButton from '@/components/SOButton'

const INPUT_CLASS =
  'h-12 w-full rounded-btn border border-line bg-surface px-4 text-base text-ink-900 outline-none placeholder:text-ink-400 focus:border-transparent focus:ring-[1.5px] focus:ring-brand-600 focus:ring-inset'

/**
 * S-08 新增 / 編輯桌位的對話框
 * - table：要編輯的那張桌；新增時傳 null。編輯時桌號唯讀：桌號印在 QR code 裡，後端也不讓改
 * - onClose()：關閉
 * - onSubmit({ tableNo, seats, area })：按儲存；回傳 Promise，失敗時對話框會顯示錯誤、不關閉
 */
function SeatFormDialog({ table, onClose, onSubmit }) {
  const isEdit = table !== null
  const [tableNo, setTableNo] = useState(table?.tableNo ?? '')
  const [seats, setSeats] = useState(table?.capacity ?? 4)
  const [area, setArea] = useState(table?.area ?? '')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const canSubmit = tableNo.trim() !== '' && area.trim() !== '' && seats >= 1 && !saving

  // 按 Esc 關閉
  useEffect(() => {
    const onKeyDown = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  async function handleSubmit() {
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({ tableNo: tableNo.trim(), seats: Number(seats), area: area.trim() })
    } catch (err) {
      // 例如桌號重複、座位數少於訂位人數（409）：留在對話框，讓店員直接改
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-ink-900/50" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="seat-form-title"
        className="relative w-[440px] max-w-[calc(100%-32px)] rounded-card border border-line bg-surface p-8 shadow-pop"
      >
        <h2 id="seat-form-title" className="type-h1">
          {isEdit ? `編輯 ${table.tableNo}` : '新增桌位'}
        </h2>

        <div className="mt-6 flex flex-col gap-4">
          <label className="block">
            <span className="mb-1 block type-body-sm font-bold">桌號</span>
            <input
              value={tableNo}
              onChange={(e) => setTableNo(e.target.value)}
              readOnly={isEdit}
              aria-describedby={isEdit ? 'seat-form-table-no-hint' : undefined}
              placeholder="例如：A09"
              maxLength={10}
              className={`${INPUT_CLASS} read-only:bg-surface-2 read-only:text-ink-600`}
            />
            {isEdit && (
              <span id="seat-form-table-no-hint" className="mt-1 block type-caption text-ink-600">
                桌號印在 QR code 裡，建立後不能修改
              </span>
            )}
          </label>

          <label className="block">
            <span className="mb-1 block type-body-sm font-bold">座位數</span>
            <input
              type="number"
              min={1}
              max={20}
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              className={`${INPUT_CLASS} tabular-nums`}
            />
          </label>

          <label className="block">
            <span className="mb-1 block type-body-sm font-bold">區域</span>
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="例如：窗邊區"
              maxLength={20}
              className={INPUT_CLASS}
            />
          </label>
        </div>

        {/* 後端的原因原文照登，例如桌號重複、座位數少於訂位人數（409） */}
        {error && (
          <p role="alert" className="mt-4 type-body-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <div className="w-28 flex-none">
            <SOButton variant="ghost" height="h-12" text="取消" onClick={onClose} />
          </div>
          <div className="flex-1">
            <SOButton
              height="h-12"
              text={saving ? '儲存中…' : '儲存'}
              disabled={!canSubmit}
              onClick={handleSubmit}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SeatFormDialog