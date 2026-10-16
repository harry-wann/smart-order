import { useEffect, useState } from 'react'
import SOButton from '@/components/SOButton'
import { useAvailableTables } from '@/hooks/reservation/useAdminReservations'


/**
 * S-10b 候位報到・選桌開桌
 * 疊在 S-10 上的對話框，不是獨立路由。
 *
 * props
 * - entry：要入座的那一組候位（no、name、partySize、createdAt）
 * - onConfirm(tableId)：確定開桌，傳選到的桌位 id
 * - onClose()：關閉對話框
 * - onConfirm(tableNo)：確定開桌
 */

function WaitlistSeatDialog({ entry, onClose, onConfirm }) {
  // 空桌清單由後端篩好、排好（坐得下、不含預約保留、稍後有訂位的排最後）
  // 不帶 reservationId：harry的 API 註解寫「從 S-10b 替候位選桌就不帶」
  const tablesQuery = useAvailableTables(entry.partySize, undefined, true)
  const options = (tablesQuery.data ?? []).map(toOption)

  // 店員點過就用點的那張；沒點過預設第一張（資料回來前 options 是空的，所以不能用 useState 存預設值）
  const [pickedNo, setPickedNo] = useState(null)
  const selectedNo = pickedNo ?? options[0]?.tableNo ?? null
  // 選到有訂位的桌時，要多確認一次
  const [confirming, setConfirming] = useState(false)

  const selected = options.find((t) => t.tableNo === selectedNo)
  const hasClash = Boolean(selected?.upcomingReservation)

  // 按 Esc 關閉
  useEffect(() => {
    const onKeyDown = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function handleSelect(tableNo) {
    setPickedNo(tableNo)
    setConfirming(false)
  }

  function handleMainButton() {
    if (!selected) return
    if (hasClash && !confirming) {
      setConfirming(true)
      return
    }
    onConfirm(selected.tableId)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩：點一下也能關 */}
      <div className="absolute inset-0 bg-ink-900/50" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="seat-dialog-title"
        className="relative w-[560px] max-w-[calc(100%-32px)] rounded-card border border-line bg-surface p-8 shadow-pop"
      >
        {/* 標題 */}
        <div className="flex items-start gap-2">
          <h2 id="seat-dialog-title" className="flex-1 type-h1">
            {entry.no} {entry.name}・{entry.partySize} 位
          </h2>
          <button
            type="button"
            aria-label="關閉"
            onClick={onClose}
            className="flex size-11 flex-none items-center justify-center rounded-full text-2xl text-ink-900 hover:bg-surface-2"
          >
            ×
          </button>
        </div>
        <p className="mt-1 text-sm text-ink-600">列出座位數坐得下的空桌</p>
        <p className="mt-2 type-caption text-ink-600 tabular-nums">
          候位 {entry.no}・{formatTime(entry.createdAt)} 登記・已叫號
        </p>

                {tablesQuery.isPending ? (
          <p className="mt-6 type-body-sm text-ink-600">空桌載入中…</p>
        ) : tablesQuery.isError ? (
          <p className="mt-6 type-body-sm text-danger">{tablesQuery.error.message}</p>
        ) : options.length === 0 ? (
          /* 空狀態：沒有坐得下的空桌 */
          <>
            <div className="mt-6 rounded-card bg-surface-2 px-4 py-8 text-center">
              <p className="type-h3">目前沒有坐得下的空桌</p>
              <p className="mt-1 type-caption text-ink-600">
                等有桌子空出來、清理完成後再按一次「報到開桌」。
              </p>
            </div>
            <div className="mt-6">
              <SOButton variant="secondary" height="h-13" text="關閉" onClick={onClose} />
            </div>
          </>
        ) : (
          <>
            {/* 桌位選項（單選） */}
            <div role="radiogroup" aria-label="選擇桌位" className="mt-6 flex flex-col gap-2">
              {options.map((t) => {
                const isOn = t.tableNo === selectedNo
                return (
                  <button
                    key={t.tableNo}
                    type="button"
                    role="radio"
                    aria-checked={isOn}
                    onClick={() => handleSelect(t.tableNo)}
                    className={`flex min-h-14 items-center gap-3 rounded-card px-4 py-3 text-left transition-colors ${
                      isOn
                        ? 'bg-brand-100 ring-[1.5px] ring-brand-600 ring-inset'
                        : 'border border-line bg-surface hover:bg-surface-2'
                    }`}
                  >
                    {/* 圓形單選鈕 */}
                    <span
                      className={`size-6 flex-none rounded-full bg-surface ${
                        isOn ? 'border-[7px] border-brand-600' : 'border-[1.5px] border-line'
                      }`}
                    />
                    <span className="w-14 flex-none type-h3 tabular-nums">{t.tableNo}</span>
                    <span className="flex-1 text-sm text-ink-600">{t.area}</span>
                    {t.upcomingReservation && (
                      <span className="text-[13px] font-bold whitespace-nowrap text-danger">
                        ⚠ {t.upcomingReservation} 有訂位
                      </span>
                    )}
                    <span className="inline-flex flex-none items-center rounded-pill bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-ink-600 ring-1 ring-line ring-inset">
                      {t.capacity} 人桌
                    </span>
                  </button>
                )
              })}
            </div>

            <p className="mt-3 type-caption text-ink-600">
              座位數小的排前面；稍後有訂位的桌排最後，一樣能開，但會再確認一次。預約保留中的桌不會列出來。
            </p>

            {/* 選到有訂位的桌，按第一次主按鈕後出現的再確認 */}
            {confirming && (
              <div className="mt-4 rounded-btn bg-danger-bg px-4 py-3 text-sm text-danger-ink ring-[1.5px] ring-danger ring-inset">
                確定要開 {selected.tableNo}？這張桌 {selected.upcomingReservation} 有別筆訂位。
              </div>
            )}

            {/* 底部按鈕 */}
            <div className="mt-6 flex gap-3">
              <div className="w-28 flex-none">
                {confirming ? (
                  <SOButton
                    variant="ghost"
                    height="h-13"
                    text="換一張桌"
                    onClick={() => setConfirming(false)}
                  />
                ) : (
                  <SOButton variant="ghost" height="h-13" text="取消" onClick={onClose} />
                )}
              </div>
              <div className="flex-1">
                <SOButton
                  height="h-13"
                  text={mainButtonText(selected, hasClash, confirming)}
                  disabled={!selected}
                  onClick={handleMainButton}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function mainButtonText(selected, hasClash, confirming) {
  if (!selected) return '請選一張桌'
  if (confirming) return '確定開桌'
  if (hasClash) return `仍要開 ${selected.tableNo}`
  return `開 ${selected.tableNo}`
}

// Date → "18:55"
function formatTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// 後端 AvailableTable → 對話框原本用的欄位名稱，這樣下面的畫面不用改
function toOption(t) {
  return {
    tableId: t.tableId,
    tableNo: t.tableNo,
    capacity: t.seats,
    area: t.area,
    upcomingReservation: t.upcomingReservationAt,
  }
}

export default WaitlistSeatDialog
