import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchSeats,
  updateSeatReservable,
  updateSeatActive,
  createSeat,
  updateSeat,
} from '@/services/api/table/seatApi'
import SOButton from '../../../components/SOButton'
import TopBar from '@/components/dashboard/TopBar'
import { SvgIconMap } from '@/assets/SvgIconMap'
import { fetchTableQrCode } from '@/services/api/table/tableApi'
import { openQrPrint } from './qrPrint'
import SeatFormDialog from './SeatFormDialog'
import './seatQrDialog.print.css'


// 徽章樣式（對應設計稿的 .b-plain / .b-sold）

const BADGE_BASE = 'inline-flex items-center whitespace-nowrap rounded-pill px-2.5 py-0.5 text-xs font-medium'
const BADGE_PLAIN = 'bg-surface-2 text-ink-600 ring-1 ring-inset ring-line'
const BADGE_SOLD = 'bg-danger text-white'

const STATUS_STYLE = {
  AVAILABLE: { label: '空桌', className: BADGE_PLAIN },
  OCCUPIED: { label: '用餐中', className: BADGE_SOLD },
  CLEANING: { label: '待清理', className: BADGE_PLAIN },
}
// 停用的桌只會是空桌（後端擋掉用餐中、待清理的），狀態欄直接顯示「已停用」
const INACTIVE_STYLE = { label: '已停用', className: BADGE_PLAIN }

function SeatManagement() {
  const [tables, setTables] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  // 對話框要編輯哪張桌：undefined = 沒打開、null = 新增、桌子物件 = 編輯那張
  const [formTable, setFormTable] = useState(undefined)
  // 停用 / 重新啟用送出中的那張桌；有值時所有停用鈕都先鎖住，避免連點
  const [activeBusyId, setActiveBusyId] = useState(null)
  // 停用失敗的原因（例如還在用餐、還有訂位），顯示在表格上方
  const [actionError, setActionError] = useState(null)
  const [qrTable, setQrTable] = useState(null)
  const closeQrDialog = useCallback(() => setQrTable(null), [])

  // 畫面第一次出現時，去後端拿桌位
  useEffect(() => {
    const controller = new AbortController()

    fetchSeats(controller.signal)
      .then((data) => setTables(data.map(toTableRow)))
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [])

  // 頂部統計：只算啟用中的桌，停用的桌不營業、不該算進桌數和可預約比例。
  // 全部從 tables 算出來，不另外存 state
  const activeTables = tables.filter((t) => t.active)
  const inactiveCount = tables.length - activeTables.length
  const totalTables = activeTables.length
  const totalSeats = activeTables.reduce((sum, t) => sum + t.capacity, 0)
  const reservableCount = activeTables.filter((t) => t.reservable).length
  const reservablePercent = totalTables ? Math.round((reservableCount / totalTables) * 100) : 0
  const areaCount = new Set(activeTables.map((t) => t.area.split('・')[0])).size

  // 切換「可否預約」
  async function toggleReservable(table) {
    try {
      const updated = await updateSeatReservable(table.id, !table.reservable)
      setTables((prev) => prev.map((t) => (t.id === updated.id ? toTableRow(updated) : t)))
    } catch (err) {
      alert(`更新失敗：${err.message}`)
    }
  }

  // 停用 / 重新啟用。停用不成功時後端會說原因（用餐中、還有訂位…），原文顯示給店長看。
  // 成功後只換掉這一列、不重新排序，列不會在店長眼前跳走
  async function toggleActive(table) {
    if (activeBusyId !== null) return
    setActiveBusyId(table.id)
    setActionError(null)
    try {
      const updated = await updateSeatActive(table.id, !table.active)
      setTables((prev) => prev.map((t) => (t.id === updated.id ? toTableRow(updated) : t)))
    } catch (err) {
      const message = err?.message ?? '操作失敗，請重試。'
      const detail = message.includes('預約管理')
        ? '仍有尚未結束的預約，預約結束後才能停用。'
        : message
      setActionError(`${table.tableNo} ${table.active ? '停用' : '重新啟用'}失敗：${detail}`)
    } finally {
      setActiveBusyId(null)
    }
  }

  // 對話框按儲存：新增就加到表格裡，編輯就換掉那一列；失敗時丟回去給對話框顯示錯誤
  async function handleSave(input) {
    const saved = formTable ? await updateSeat(formTable.id, input) : await createSeat(input)
    const row = toTableRow(saved)
    setTables((prev) =>
      formTable
        ? prev.map((t) => (t.id === row.id ? row : t))
        : [...prev, row].sort(byActiveThenTableNo),
    )
    setFormTable(undefined)
  }

  return (
    <div className="flex h-full flex-col bg-paper text-ink-900">
      {/* 頂列：用團隊共用的 TopBar
          標題不用傳，TopBar 會依網址 /admin/seats 自動顯示「座位管理」 */}
      <TopBar
        tag={`${totalTables} 桌啟用中・${areaCount} 個區域`}
        childrenRight={
          <>
            {/* SOButton 預設 w-full，包一層 flex-none 讓它只跟文字一樣寬 */}
            <div className="flex-none">
              <SOButton
                variant="secondary"
                height="h-11"
                // 停用的桌不營業，「全部」指的是啟用中的桌
                onClick={() => openQrPrint(activeTables)}
                content={
                  <span className="flex items-center gap-1.5">
                    <Icon icon={SvgIconMap.DashboardQrcode} />
                    列印全部 QR
                  </span>
                }
              />
            </div>
            <div className="flex-none">
              <SOButton
                height="h-11"
                onClick={() => setFormTable(null)}
                content={
                  <span className="flex items-center gap-1.5">
                    <Icon icon={SvgIconMap.DashboardPlus} />
                    新增桌位
                  </span>
                }
              />
            </div>
          </>
        }
      />




      <div className="flex flex-col gap-4 p-6">
        {/* 統計列 */}
        <section className="flex items-center gap-6 rounded-card border border-line bg-surface px-5 py-4">
          <Stat value={totalTables} label="桌啟用中" />
          <Divider />
          <Stat value={totalSeats} label="個座位" />
          <Divider />
          <Stat value={reservableCount} label={`開放預約（${reservablePercent}%）`} highlight />
          <Divider />
          <Stat value={areaCount} label="區域" />
          <div className="ml-auto min-w-0 type-caption text-ink-600">
            <p>留 30% 給現場與候位客人，尖峰才不會整間都是空著等預約的桌</p>
            <p>
              統計只算啟用中的桌
              {inactiveCount > 0 && `，另有 ${inactiveCount} 桌停用`}
            </p>
          </div>
        </section>

        {actionError && (
          <p
            role="alert"
            className="rounded-card border border-danger bg-danger-bg px-4 py-3 type-body-sm text-danger-ink"
          >
            {actionError}
          </p>
        )}

        {/* 桌位表格 */}
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full min-w-[1120px] table-fixed text-sm">
            <thead className="bg-surface-2 text-left text-[13px] font-bold tracking-wide whitespace-nowrap text-ink-600">
              <tr>
                <th className="w-[90px] border-b border-line px-4 py-3">桌號</th>
                <th className="w-[90px] border-b border-line px-4 py-3">座位數</th>
                <th className="w-[150px] border-b border-line px-4 py-3">區域</th>
                <th className="w-[170px] border-b border-line px-4 py-3">可否預約</th>
                <th className="w-[110px] border-b border-line px-4 py-3">目前狀態</th>
                <th className="w-[190px] border-b border-line px-4 py-3">QR code</th>
                <th className="w-[200px] border-b border-line px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-ink-600">
                    載入中…
                  </td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-danger">
                    載入失敗：{error}
                  </td>
                </tr>
              )}
              {!isLoading && !error && tables.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-ink-600">
                    目前沒有桌位
                  </td>
                </tr>
              )}
              {tables.map((t) => {
                // 停用的桌：整列灰底、開關去色，狀態欄改成「已停用」；字仍用 ink-600，桌號要看得清楚
                const status = t.active ? STATUS_STYLE[t.status] : INACTIVE_STYLE
                const isBusy = activeBusyId === t.id
                return (
                  <tr
                    key={t.tableNo}
                    className={`align-middle border-b border-line last:border-b-0 ${t.active ? '' : 'bg-surface-2 text-ink-600'}`}
                  >
                    <td className="px-4 py-3 text-base font-bold tabular-nums">{t.tableNo}</td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">{t.capacity} 人</td>
                    <td className="px-4 py-3">{t.area}</td>
                    <td className="px-4 py-3">
                      <div className={`flex items-center gap-2 ${t.active ? '' : 'grayscale'}`}>
                        <Switch
                          checked={t.reservable}
                          onChange={() => toggleReservable(t)}
                          label={`${t.tableNo} 可否預約`}
                          disabled={isBusy}
                        />
                        <span className="type-caption whitespace-nowrap text-ink-600">
                          {t.reservable ? '開放預約' : '不開放'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`${BADGE_BASE} ${status.className}`}>{status.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center whitespace-nowrap">
                        <TextButton
                          icon={SvgIconMap.DashboardQrcode}
                          onClick={() => setQrTable(t)}
                          aria-label={`顯示 ${t.tableNo} QR code`}
                          className="!pl-0"
                        >
                          顯示
                        </TextButton>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-nowrap items-center gap-1">
                        <TextButton icon={SvgIconMap.DashboardEdit} onClick={() => setFormTable(t)}>
                          編輯
                        </TextButton>
                        <TextButton
                          onClick={() => toggleActive(t)}
                          disabled={activeBusyId !== null}
                          aria-busy={isBusy}
                          aria-label={`${t.active ? '停用' : '重新啟用'} ${t.tableNo}`}
                        >
                          {isBusy ? '處理中…' : t.active ? '停用' : '重新啟用'}
                        </TextButton>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <p className="type-caption text-ink-600">
          每張桌的 QR code 都固定對應該桌，貼好後不需更換。
        </p>
      </div>

      {formTable !== undefined && (
        <SeatFormDialog
          key={formTable?.id ?? 'new'}
          table={formTable}
          onClose={() => setFormTable(undefined)}
          onSubmit={handleSave}
        />
      )}

      {qrTable && <QrCodeDialog table={qrTable} onClose={closeQrDialog} />}

    </div>
  )
}

function QrCodeDialog({ table, onClose }) {
  const [image, setImage] = useState({ status: 'loading', src: '', error: '' })
  const [retryKey, setRetryKey] = useState(0)
  const dialogRef = useRef(null)

  useEffect(() => {
    document.body.dataset.printingSeatQr = 'true'
    return () => {
      delete document.body.dataset.printingSeatQr
    }
  }, [])

  useEffect(() => {
    let active = true
    let objectUrl = ''
    setImage({ status: 'loading', src: '', error: '' })

    fetchTableQrCode(table.id)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        if (active) {
          setImage({ status: 'ready', src: objectUrl, error: '' })
        } else {
          URL.revokeObjectURL(objectUrl)
          objectUrl = ''
        }
      })
      .catch((error) => {
        if (active) {
          setImage({
            status: 'error',
            src: '',
            error: error?.message ?? 'QR code 載入失敗，請稍後重試。',
          })
        }
      })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [table.id, retryKey])

  useEffect(() => {
    const previouslyFocused = document.activeElement
    const dialog = dialogRef.current
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const getFocusable = () =>
      Array.from(dialog?.querySelectorAll(focusableSelector) ?? []).filter(
        (element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true',
      )

    dialog?.querySelector('button:not([disabled])')?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = getFocusable()
      if (focusable.length === 0) {
        event.preventDefault()
        dialog?.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!dialog?.contains(document.activeElement)) {
        event.preventDefault()
        const target = event.shiftKey ? last : first
        target.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) previouslyFocused.focus()
    }
  }, [onClose])

  return (
    <div
      data-seat-qr-dialog
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="seat-qr-title"
        tabIndex={-1}
        data-seat-qr-dialog-panel
        className="w-full max-w-sm rounded-card border border-line bg-surface p-6 text-center shadow-pop"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="seat-qr-title" className="type-h2 text-ink-900">
            {table.tableNo} QR code
          </h2>
          <button
            type="button"
            aria-label="關閉 QR code"
            data-seat-qr-dialog-close
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-full text-2xl leading-none text-ink-600 hover:bg-surface-2"
          >
            ×
          </button>
        </div>
        {image.status === 'loading' && (
          <p role="status" className="py-16 type-body text-ink-600">
            QR code 載入中…
          </p>
        )}
        {image.status === 'error' && (
          <div role="alert" className="py-8">
            <p className="type-body text-danger-ink">{image.error}</p>
            <button
              type="button"
              onClick={() => setRetryKey((key) => key + 1)}
              className="mt-4 inline-flex h-11 items-center justify-center rounded-btn border border-line px-5 text-base leading-none font-medium text-ink-700 hover:bg-surface-2"
            >
              重試
            </button>
          </div>
        )}
        {image.status === 'ready' && (
          <>
            <img
              src={image.src}
              alt={`${table.tableNo} 桌 QR code`}
              data-seat-qr-dialog-image
              className="mx-auto aspect-square w-full max-w-72 object-contain"
            />
            <p className="mt-3 type-caption text-ink-600">掃描後可開始點餐</p>
            <div data-seat-qr-dialog-actions className="mt-5">
              <SOButton height="h-11" text="列印 QR code" onClick={() => window.print()} />
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function Stat({ value, label, highlight = false }) {
  return (
    <div className="flex flex-none items-baseline gap-2 whitespace-nowrap">
      <span
        className={`font-serif text-[26px] leading-none font-black tabular-nums ${
          highlight ? 'text-accent-600' : 'text-ink-900'
        }`}
      >
        {value}
      </span>
      <span className="type-caption text-ink-600">{label}</span>
    </div>
  )
}

function Divider() {
  return <span className="w-px flex-none self-stretch bg-line" />
}

// 開關（對應設計稿的 .switch）
function Switch({ checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={`relative h-6.5 w-11.5 flex-none rounded-pill transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-success' : 'bg-line'
      }`}
    >
      <span
        className={`absolute top-0.75 left-0.75 size-5 rounded-full bg-white shadow-card transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

// 表格內的小文字按鈕（對應設計稿的 .btn-ghost.btn-sm）
function TextButton({ icon, children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex h-9 flex-none items-center gap-1.5 rounded-btn px-3.5 text-sm font-medium whitespace-nowrap text-ink-600 transition-colors hover:text-brand-600 disabled:cursor-wait disabled:opacity-60 disabled:hover:text-ink-600 ${className}`}
      {...props}
    >
      {icon && <Icon icon={icon} />}
      {children}
    </button>
  )
}

// 圖示：顏色跟著文字色（currentColor）走
function Icon({ icon: IconComponent }) {
  return <IconComponent aria-hidden="true" className="svg-icon size-4 flex-none" />
}

// 後端叫 seats，這個畫面原本叫 capacity，在這裡統一轉換
function toTableRow(seat) {
  return {
    id: seat.id,
    tableNo: seat.tableNo,
    capacity: seat.seats,
    area: seat.area,
    reservable: seat.reservable,
    status: seat.status,
    active: seat.active,
  }
}

// 跟後端列表同一個順序：啟用的在前，再依桌號
function byActiveThenTableNo(a, b) {
  if (a.active !== b.active) return a.active ? -1 : 1
  return a.tableNo.localeCompare(b.tableNo)
}

export default SeatManagement
