import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import SOButton from '@/components/SOButton'
import { SvgIconMap } from '@/assets/SvgIconMap'
import BellButtonPlaceholder from './BellButtonPlaceholder'
import ReservationTab from './ReservationTab'
import { fetchTables, openTable } from '@/services/api/tableApi'

// 假資料：已叫號、等著入座的組別（之後換成 API）
const calledWaitlist = [
  { id: 13, queueNo: 'A13', name: '李小姐', people: 4, waitMinutes: 2 },
  { id: 12, queueNo: 'A12', name: '王先生', people: 3, waitMinutes: 18 },
  { id: 14, queueNo: 'A14', name: '張先生', people: 6, waitMinutes: 4 },
]

// 假資料：現在可以報到的預約（之後換成 API）
const checkinReservations = [
  {
    id: 21,
    time: '18:30',
    name: '陳怡君',
    phone: '0933123210',
    people: 4,
    preorderCount: 4,
    assignedTable: 'A08',
  },
  {
    id: 22,
    time: '18:45',
    name: '林家豪',
    phone: '0935123806',
    people: 2,
    preorderCount: 0,
    assignedTable: 'B02',
  },
]

// 開桌頁自己的頂列。
// 不改共用的 TopBar.tsx；但這頁網址有桌號，TopBar 用網址查不到標題，
// 所以這頁自己做，class 照抄 TopBar，外觀才會跟其他頁一致。
function OpenPageHeader({ tableNo, tableInfo, isHeld }) {
  return (
    <header className="flex h-15 w-full shrink-0 flex-row items-center justify-between border-b border-line bg-surface px-6 py-3">
      <div className="flex flex-row items-center gap-4">
        <Link to="/admin/table_overview" aria-label="回桌況總覽">
          <SvgIconMap.DashboardBack />
        </Link>
        <span className="type-h2 text-ink-900">{tableNo} 桌 開桌</span>
        <div className="flex items-center rounded-pill border border-line bg-surface-2 px-2 py-1">
          <span className="type-dashboard-top-bar-tag text-ink-600">
            {tableInfo.capacity} 人桌・{tableInfo.area}
          </span>
        </div>
        {isHeld && (
          <span className="flex items-center gap-1 rounded-pill bg-warning-bg px-2 py-1 type-dashboard-top-bar-tag text-hold-ink">
            <SvgIconMap.ReservationLock aria-hidden="true" className="svg-icon size-4" />
            預約保留
          </span>
        )}
      </div>

      <div className="flex flex-row items-center gap-2">
        <span className="type-caption text-ink-600">今天 18:32</span>
        <BellButtonPlaceholder />
      </div>
    </header>
  )
}

// 開桌人數的步進器：數字存在外層，這裡只負責顯示和通知
function PeopleStepper({ label, value, min, max, onChange, hint }) {
  const circleClass =
    'flex size-14 items-center justify-center rounded-full text-2xl text-brand-600 shadow-[inset_0_0_0_1.5px_var(--color-brand-600)] enabled:hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div className="flex flex-1 flex-col gap-3">
      <h3 className="type-h3 text-ink-900">{label}</h3>

      <div className="flex items-center gap-6">
        <button
          type="button"
          aria-label={`${label}減一`}
          onClick={() => onChange(value - 1)}
          disabled={value <= min}
          className={circleClass}
        >
          −
        </button>
        <span className="w-10 text-center type-h1 text-ink-900 tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={`${label}加一`}
          onClick={() => onChange(value + 1)}
          disabled={value >= max}
          className={circleClass}
        >
          ＋
        </button>
      </div>

      <p className="type-caption text-ink-600">{hint}</p>
    </div>
  )
}

// S-02b 現場頁籤：輸入大人小孩人數後開桌
function WalkinTab({ tableNo, capacity, openLabel, disabled, onOpen }) {
  const navigate = useNavigate()
  const [adults, setAdults] = useState(1)
  const [kids, setKids] = useState(0)

  const MAX_PEOPLE = 10
  const total = adults + kids
  const seatsEnough = total <= capacity

  function handleOpen() {
    onOpen({ type: 'walkin', adults, kids })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="type-h1 text-ink-900">這桌坐幾位？</h2>
        <p className="mt-2 type-body-sm text-ink-600">
          人數由櫃檯輸入比客人自填準。不參與金額計算，用途是座位安排、分帳參考、兒童友善推薦與客單價統計。
        </p>
      </div>

      <div className="flex gap-8">
        <PeopleStepper
          label="大人"
          value={adults}
          min={1}
          max={MAX_PEOPLE - kids}
          onChange={setAdults}
          hint={`上限 ${MAX_PEOPLE} 位`}
        />
        <div className="w-px self-stretch bg-line" />
        <PeopleStepper
          label="小孩"
          value={kids}
          min={0}
          max={MAX_PEOPLE - adults}
          onChange={setKids}
          hint="會帶出兒童友善推薦"
        />
      </div>

      <div className="flex items-center justify-between rounded-card bg-brand-100 px-6 py-4">
        <span className="type-h2 text-ink-900">共 {total} 位</span>
        <span className="type-body-sm text-ink-600">
          {seatsEnough
            ? `${tableNo} 是 ${capacity} 人桌，座位夠`
            : `超過 ${capacity} 人桌的座位，可能要加椅子`}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <SOButton text={openLabel} height="h-11" onClick={handleOpen} disabled={disabled} />
        </div>
        <div className="w-28">
          <SOButton
            text="取消"
            variant="ghost"
            height="h-11"
            onClick={() => navigate('/admin/table_overview')}
          />
        </div>
      </div>
    </div>
  )
}

// S-02c 候位頁籤：列出已叫號的組別，人數直接帶入
function WaitlistTab({ list, openLabel, disabled, onOpen }) {
  function handleOpen(group) {
    onOpen({ type: 'waitlist', waitlistId: group.id, people: group.people })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="type-h2 text-ink-900">已叫號、等著入座</h2>
        <span className="type-caption text-ink-600">人數用登記時填的，不用重填</span>
      </div>

      {list.length === 0 ? (
        <p className="py-10 text-center type-body-sm text-ink-600">目前沒有已叫號的候位</p>
      ) : (
        list.map((group) => (
          <div
            key={group.id}
            className="flex items-center gap-6 rounded-card border border-line px-5 py-4"
          >
            <span className="w-14 type-h2 text-ink-900 tabular-nums">{group.queueNo}</span>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <b className="type-body text-ink-900">{group.name}</b>
                <span className="rounded-pill bg-warning-bg px-2.5 py-0.5 type-caption text-hold-ink shadow-[inset_0_0_0_1px_var(--color-warning-line)]">
                  已叫號
                </span>
              </div>
              <p className="type-caption text-ink-600 tabular-nums">
                {group.people} 位・已等 {group.waitMinutes} 分鐘
              </p>
            </div>

            <div className="w-32">
              <SOButton
                text={openLabel}
                height="h-9"
                onClick={() => handleOpen(group)}
                disabled={disabled}
              />
            </div>
          </div>
        ))
      )}

      <div className="rounded-card bg-surface-2 px-5 py-4 type-caption text-ink-600">
        ⓘ 確認開桌之後，這一組的候位狀態會轉成 <b>已報到</b>，從這份清單消失。
        <br />
        沒轉狀態的話，同一組會一直出現在下一張桌的清單上。
      </div>
    </div>
  )
}

// 頂部提示條：danger = 紅色訂位衝突，hold = 黃色預約保留
function AlertBar({ tone, title, children }) {
  const toneClass =
    tone === 'danger'
      ? 'bg-brand-100 shadow-[inset_0_0_0_1.5px_var(--color-danger)]'
      : 'bg-warning-bg shadow-[inset_0_0_0_1.5px_var(--color-warning-line)]'

  return (
    <div className={`mb-4 flex gap-3 rounded-card px-5 py-4 ${toneClass}`}>
      <span className={tone === 'danger' ? 'text-danger' : 'text-hold-ink'}>
        {tone === 'danger' ? (
          '⚠'
        ) : (
          <SvgIconMap.ReservationLock aria-hidden="true" className="svg-icon size-5" />
        )}
      </span>
      <div>
        <p className="type-body-sm font-bold text-ink-900">{title}</p>
        <p className="mt-1 type-caption text-ink-600">{children}</p>
      </div>
    </div>
  )
}

// 有訂位衝突時，按「仍要開桌」後的再確認
function ConfirmDialog({ tableNo, onConfirm, onChangeTable }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-96 rounded-card bg-surface p-6 shadow-pop">
        <h2 className="type-h2 text-ink-900">確定要開 {tableNo}？</h2>
        <p className="mt-2 type-body-sm text-ink-600">
          這張桌稍後有訂位，客人可能還沒吃完訂位就到了。
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <SOButton text="確定開桌" height="h-11" onClick={onConfirm} />
          <SOButton text="換一張桌" variant="secondary" height="h-11" onClick={onChangeTable} />
        </div>
      </div>
    </div>
  )
}

function TableOpen() {
  const { tableNo } = useParams()
  const navigate = useNavigate()

// 從後端抓桌況，找出網址上這張桌（例如 A01）
  const [table, setTable] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchTables(controller.signal)
      .then((data) => setTable(data.find((t) => t.tableNo === tableNo) ?? null))
      .catch(() => {})
    return () => controller.abort()
  }, [tableNo])

  const tableInfo = table ? { capacity: table.seats, area: table.area } : { capacity: 0, area: '載入中' }

  // 115 分鐘內的訂位（沒有就是 null）
  const conflict = null // 訂位衝突的判斷等Harry做好再接
  // 現在在預約保留時段的話，填保留這張桌的預約 id（沒有就是 null）
  const reservedHoldId = tableNo === 'A08' ? 21 : null
  // ===== 假資料結束 =====

  const [reservations, setReservations] = useState(checkinReservations)
  const visibleReservations = reservations.filter((item) => item.people <= tableInfo.capacity)
  const reservedHold = visibleReservations.find((item) => item.id === reservedHoldId) ?? null
  const reservationCount = visibleReservations.length
  const openLabel = conflict ? '仍要開桌' : '開桌'
  const isHeld = reservedHold !== null
  const defaultTab =
    isHeld || reservationCount > 0
      ? 'reservation'
      : calledWaitlist.length > 0
        ? 'waitlist'
        : 'walkin'
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [pendingOpen, setPendingOpen] = useState(null)

  const tabs = [
    { key: 'walkin', label: '現場' },
    { key: 'waitlist', label: '候位', count: calledWaitlist.length },
    { key: 'reservation', label: '預約', count: reservationCount },
  ]

  // 有訂位衝突就先跳確認框，沒有就直接開桌
  function requestOpen(payload) {
    const isReservedGuest = payload.type === 'reservation' && payload.reservationId === reservedHoldId
    if (conflict && !isReservedGuest) {
      setPendingOpen(payload)
    } else {
      confirmOpen(payload)
    }
  }

  async function confirmOpen(payload) {
    // 候位、預約開桌還沒做，先只接現場
    if (payload.type !== 'walkin') {
      alert('候位／預約開桌還沒接後端，先用「現場」頁籤')
      setPendingOpen(null)
      return
    }
    try {
      await openTable(table.tableId, payload.adults, payload.kids)
      navigate('/admin/table_overview')
    } catch (err) {
      alert(`開桌失敗：${err.message}`)
      setPendingOpen(null)
    }
  }

  function cancelReservation(id) {
    // 之後接後端：POST /api/admin/reservations/{id}/cancel
    setReservations((list) => list.filter((item) => item.id !== id))
  }

  return (
    <>
      <OpenPageHeader tableNo={tableNo} tableInfo={tableInfo} isHeld={isHeld} />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <main className="mx-auto w-full max-w-205 p-6">
          {isHeld ? (
            <AlertBar
              tone="hold"
              title={`${tableNo} 預約保留中（${reservedHold.time} ${reservedHold.name} ${reservedHold.people} 位）`}
            >
              這張桌保留給 {reservedHold.name} {reservedHold.time}（{reservedHold.people} 位）。客人來電取消的話，直接按下面的「取消訂位」。
              <br />
              {reservedHold.name} 到了，直接在下面按「報到開桌」。
            </AlertBar>
          ) : (
            conflict && (
              <AlertBar
                tone="danger"
                title={`${tableNo} 在 ${conflict.time} 有訂位（${conflict.name} ${conflict.people} 位），現在開桌，客人可能還沒吃完訂位就到了。`}
              >
                只提醒、不擋。按「仍要開桌」會再確認一次；想把桌留給那組，就換一張桌。
              </AlertBar>
            )
          )}

          <div className="flex gap-6 rounded-t-card border-b border-line bg-surface px-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`-mb-px border-b-2 py-3 type-body ${
                  activeTab === tab.key
                    ? 'border-brand-600 font-bold text-brand-600'
                    : 'border-transparent text-ink-600 hover:text-ink-900'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && ` ${tab.count}`}
              </button>
            ))}
          </div>

          <section className="rounded-b-card border border-t-0 border-line bg-surface p-6">
            {activeTab === 'walkin' && (
              <WalkinTab
                tableNo={tableNo}
                capacity={tableInfo.capacity}
                openLabel={openLabel}
                disabled={isHeld}
                onOpen={requestOpen}
              />
            )}
            {activeTab === 'waitlist' && (
              <WaitlistTab
                list={calledWaitlist}
                openLabel={openLabel}
                disabled={isHeld}
                onOpen={requestOpen}
              />
            )}
            {activeTab === 'reservation' && (
              <ReservationTab
                list={visibleReservations}
                tableNo={tableNo}
                seats={tableInfo.capacity}
                holdId={isHeld ? reservedHold.id : null}
                openLabel={openLabel}
                onOpen={requestOpen}
                onCancel={cancelReservation}
              />
            )}
          </section>
        </main>
      </div>

      {pendingOpen && (
        <ConfirmDialog
          tableNo={tableNo}
          onConfirm={() => confirmOpen(pendingOpen)}
          onChangeTable={() => navigate('/admin/table_overview')}
        />
      )}
    </>
  )
}

export default TableOpen
