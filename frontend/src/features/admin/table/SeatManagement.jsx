import { useEffect, useState } from 'react'
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
import { openQrPrint } from './qrPrint'
import SeatFormDialog from './SeatFormDialog'


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
      setActionError(`${table.tableNo} ${table.active ? '停用' : '重新啟用'}失敗：${err.message}`)
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
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-[13px] font-bold tracking-wide whitespace-nowrap text-ink-600">
              <tr>
                <th className="w-22.5 border-b border-line px-4 py-3">桌號</th>
                <th className="w-22.5 border-b border-line px-4 py-3">座位數</th>
                <th className="w-37.5 border-b border-line px-4 py-3">區域</th>
                <th className="w-42.5 border-b border-line px-4 py-3">可否預約</th>
                <th className="w-27.5 border-b border-line px-4 py-3">目前狀態</th>
                <th className="border-b border-line px-4 py-3 xl:w-47.5">QR code</th>
                <th className="w-50 border-b border-line px-4 py-3">操作</th>
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
                    className={`border-b border-line last:border-b-0 ${t.active ? '' : 'bg-surface-2 text-ink-600'}`}
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
                                            <div className="flex items-center gap-2">
                        {/* 1280px 以下只留「印 QR」，網址格式在表格下方有說明 */}
                        <span className="hidden type-caption text-ink-600 tabular-nums xl:inline">
                          /order/checkin/{t.tableNo}
                        </span>
                        <TextButton
                          icon={SvgIconMap.DashboardQrcode}
                          onClick={() => openQrPrint([t])}
                        >
                          印 QR
                        </TextButton>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {/* 寬度不夠時兩顆按鈕上下排，不把表格撐出橫向捲軸 */}
                      <div className="flex flex-wrap items-center gap-1">
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
                    桌上的 QR code 內容固定是 <span className="tabular-nums">/order/checkin/{'{桌號}'}</span>
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
function TextButton({ icon, children, ...props }) {
  return (
    <button
      type="button"
      className="inline-flex h-9 flex-none items-center gap-1.5 rounded-btn px-3.5 text-sm font-medium whitespace-nowrap text-ink-600 transition-colors hover:text-brand-600 disabled:cursor-wait disabled:opacity-60 disabled:hover:text-ink-600"
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
