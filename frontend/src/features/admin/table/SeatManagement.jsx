import { useState } from 'react'
import SOButton from '../../../components/SOButton'
import TopBar from '@/components/dashboard/TopBar'
import { SvgIconMap } from '@/assets/SvgIconMap'

// 假資料：後端 API 好了之後換成 fetch 回來的資料
const INITIAL_TABLES = [
  { tableNo: 'A01', capacity: 2, area: 'A 區・窗邊', reservable: true, status: 'AVAILABLE' },
  { tableNo: 'A02', capacity: 2, area: 'A 區・窗邊', reservable: true, status: 'OCCUPIED' },
  { tableNo: 'A03', capacity: 4, area: 'A 區・窗邊', reservable: true, status: 'OCCUPIED' },
  { tableNo: 'A04', capacity: 4, area: 'A 區・窗邊', reservable: true, status: 'AVAILABLE' },
  { tableNo: 'A05', capacity: 4, area: 'A 區・走道', reservable: true, status: 'CLEANING' },
  { tableNo: 'A06', capacity: 6, area: 'A 區・走道', reservable: true, status: 'AVAILABLE' },
  { tableNo: 'B01', capacity: 4, area: 'B 區', reservable: true, status: 'OCCUPIED' },
  { tableNo: 'C01', capacity: 8, area: 'C 包廂', reservable: false, status: 'OCCUPIED' },
]

// 徽章樣式（對應設計稿的 .b-plain / .b-sold）

const BADGE_BASE = 'inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium'
const BADGE_PLAIN = 'bg-surface-2 text-ink-600 ring-1 ring-inset ring-line'
const BADGE_SOLD = 'bg-danger text-white'

const STATUS_STYLE = {
  AVAILABLE: { label: '空桌', className: BADGE_PLAIN },
  OCCUPIED: { label: '用餐中', className: BADGE_SOLD },
  CLEANING: { label: '待清理', className: BADGE_PLAIN },
}

function SeatManagement() {
  const [tables, setTables] = useState(INITIAL_TABLES)

  // 頂部統計：全部從 tables 算出來，不另外存 state
  const totalTables = tables.length
  const totalSeats = tables.reduce((sum, t) => sum + t.capacity, 0)
  const reservableCount = tables.filter((t) => t.reservable).length
  const reservablePercent = totalTables ? Math.round((reservableCount / totalTables) * 100) : 0
  const areaCount = new Set(tables.map((t) => t.area.split('・')[0])).size

  // 切換「可否預約」
  function toggleReservable(tableNo) {
    setTables((prev) =>
      prev.map((t) => (t.tableNo === tableNo ? { ...t, reservable: !t.reservable } : t)),
    )
  }

  return (
    <div className="flex h-full flex-col bg-paper text-ink-900">
      {/* 頂列：用團隊共用的 TopBar
          標題不用傳，TopBar 會依網址 /admin/seats 自動顯示「座位管理」 */}
      <TopBar
        tag={`${totalTables} 桌・${areaCount} 個區域`}
        childrenRight={
          <>
            {/* SOButton 預設 w-full，包一層 flex-none 讓它只跟文字一樣寬 */}
            <div className="flex-none">
              <SOButton
                variant="secondary"
                height="h-11"
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
          <Stat value={totalTables} label="桌" />
          <Divider />
          <Stat value={totalSeats} label="個座位" />
          <Divider />
          <Stat value={reservableCount} label={`開放預約（${reservablePercent}%）`} highlight />
          <Divider />
          <Stat value={areaCount} label="區域" />
          <p className="ml-auto type-caption text-ink-600">
            留 30% 給現場與候位客人，尖峰才不會整間都是空著等預約的桌
          </p>
        </section>

        {/* 桌位表格 */}
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-[13px] font-bold tracking-wide text-ink-600">
              <tr>
                <th className="w-[90px] border-b border-line px-4 py-3">桌號</th>
                <th className="w-[90px] border-b border-line px-4 py-3">座位數</th>
                <th className="w-[150px] border-b border-line px-4 py-3">區域</th>
                <th className="w-[170px] border-b border-line px-4 py-3">可否預約</th>
                <th className="w-[110px] border-b border-line px-4 py-3">目前狀態</th>
                <th className="w-[190px] border-b border-line px-4 py-3">QR code</th>
                <th className="w-[90px] border-b border-line px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {tables.map((t) => {
                const status = STATUS_STYLE[t.status]
                return (
                  <tr key={t.tableNo} className="border-b border-line last:border-b-0">
                    <td className="px-4 py-3 text-base font-bold tabular-nums">{t.tableNo}</td>
                    <td className="px-4 py-3 tabular-nums">{t.capacity} 人</td>
                    <td className="px-4 py-3">{t.area}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={t.reservable}
                          onChange={() => toggleReservable(t.tableNo)}
                          label={`${t.tableNo} 可否預約`}
                        />
                        <span className="type-caption text-ink-600">
                          {t.reservable ? '開放預約' : '不開放'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`${BADGE_BASE} ${status.className}`}>{status.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="type-caption text-ink-600 tabular-nums">
                          /t/{t.tableNo}
                        </span>
                        <TextButton icon={SvgIconMap.DashboardQrcode}>印 QR</TextButton>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <TextButton icon={SvgIconMap.DashboardEdit}>編輯</TextButton>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <p className="type-caption text-ink-600">
          桌上的 QR code 內容固定是 <span className="tabular-nums">/t/{'{桌號}'}</span>
          ，印一次貼著就好，永遠不用換。
        </p>
      </div>
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
function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-6.5 w-11.5 flex-none rounded-pill transition-colors ${
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
      className="inline-flex h-9 flex-none items-center gap-1.5 rounded-btn px-3.5 text-sm font-medium text-ink-600 transition-colors hover:text-brand-600"
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

export default SeatManagement
