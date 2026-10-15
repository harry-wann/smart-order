import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router'
import {
  useCancelReservationByStaff,
  useOpenOptions,
  useSeatReservation,
} from '@/hooks/reservation/useAdminReservations'
import { fetchSeats } from '@/services/api/seatApi'
import { queryScope } from '@/services/client/queryClient'
import SOButton from '@/components/SOButton'
import { SvgIconMap } from '@/assets/SvgIconMap'
import BellButtonPlaceholder from './BellButtonPlaceholder'
import ReservationTab from './ReservationTab'

// 假資料：已叫號、等著入座的組別（之後換成 API）
const calledWaitlist = [
  { id: 13, queueNo: 'A13', name: '李小姐', people: 4, waitMinutes: 2 },
  { id: 12, queueNo: 'A12', name: '王先生', people: 3, waitMinutes: 18 },
  { id: 14, queueNo: 'A14', name: '張先生', people: 6, waitMinutes: 4 },
]

const TABLE_INFO_BY_NUMBER = {
  A01: { capacity: 2, area: '窗邊區' },
  A02: { capacity: 2, area: '窗邊區' },
  A03: { capacity: 4, area: '窗邊區' },
  A04: { capacity: 4, area: '窗邊區' },
  A05: { capacity: 4, area: '窗邊區' },
  A06: { capacity: 6, area: '窗邊區' },
  A07: { capacity: 6, area: '窗邊區' },
  A08: { capacity: 4, area: '窗邊區' },
  B01: { capacity: 4, area: '座位區' },
  B02: { capacity: 2, area: '座位區' },
  B03: { capacity: 4, area: '座位區' },
  C01: { capacity: 8, area: '包廂區' },
  C02: { capacity: 8, area: '包廂區' },
}

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

  // 網址帶的是桌號，開桌頁的 API 要桌位 id，從座位設定查
  const seatsQuery = useQuery({
    queryKey: [...queryScope.employee, 'seats'],
    queryFn: ({ signal }) => fetchSeats(signal),
  })
  const tableId = seatsQuery.data?.find((seat) => seat.tableNo === tableNo)?.id
  // 預約清單、保留、稍後的訂位都來自後端（工作包 E）；現場與候位開桌仍是假資料（工作包 D）
  const optionsQuery = useOpenOptions(tableId)
  const options = optionsQuery.data
  const seatReservation = useSeatReservation()
  const cancelByStaff = useCancelReservationByStaff()
  const [notice, setNotice] = useState(null)

  // 開桌選項回來前先用內建的對照表頂著，頂列的人數和區域不用等資料才出現
  const tableInfo = options
    ? { capacity: options.seats, area: options.area }
    : (TABLE_INFO_BY_NUMBER[tableNo] ?? { capacity: 4, area: '座位區' })
  // 115 分鐘內的訂位（沒有就是 null）
  const upcoming = options?.upcomingOnThisTable
  const conflict = upcoming
    ? { time: toTime(upcoming.startTime), name: upcoming.name, people: upcoming.partySize }
    : null
  const reservedHoldId = options?.heldFor?.reservationId ?? null

  // 坐不坐得下、用餐時間在現在 −10 ～ +30 分的篩選都在後端做了，這裡不再 filter
  const visibleReservations = (options?.reservations ?? []).map(toReservationRow)
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
  // 資料回來前不知道預設頁籤，沒手動切過就一直跟著資料決定。
  // 不用 effect 等資料回來再 setState，pickedTab 有值（手動切過）就以它為準，沒有就用算出來的
  const [pickedTab, setPickedTab] = useState(null)
  const activeTab = pickedTab ?? defaultTab
  const setActiveTab = setPickedTab
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

  function confirmOpen(payload) {
    if (payload.type === 'reservation') {
      if (seatReservation.isPending) return
      setPendingOpen(null)
      setNotice(null)
      seatReservation.mutate(
        { id: payload.reservationId, tableId },
        {
          onSuccess: () => navigate('/admin/table_overview'),
          // 搶桌、撞到保留、訂位剛被取消或已逾時：留在本頁，清單會重抓
          onError: (error) => setNotice(error.message),
        },
      )
      return
    }
    // 之後接後端：POST /api/admin/tables/{id}/open，成功後回桌況總覽
    alert(`已開桌 ${tableNo}：${JSON.stringify(payload)}`)
    navigate('/admin/table_overview')
  }

  function cancelReservation(id) {
    if (cancelByStaff.isPending) return
    // 不用自己從清單移掉：成功後 hook 會重抓開桌選項，那筆就消失，這張桌的保留也跟著解開
    setNotice(null)
    cancelByStaff.mutate({ id }, { onError: (error) => setNotice(error.message) })
  }

  return (
    <>
      <OpenPageHeader tableNo={tableNo} tableInfo={tableInfo} isHeld={isHeld} />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <main className="mx-auto w-full max-w-205 p-6">
          {notice && <p className="mb-4 type-body-sm text-danger">{notice}</p>}
          {optionsQuery.isError && (
            <p className="mb-4 type-body-sm text-danger">{optionsQuery.error.message}</p>
          )}
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
                busy={seatReservation.isPending || cancelByStaff.isPending}
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

// 開桌頁預約頁籤要的欄位；電話後端已經遮好了
function toReservationRow(item) {
  return {
    id: item.id,
    time: toTime(item.startTime),
    name: item.name,
    phone: item.phoneMasked,
    people: item.partySize,
    preorderCount: item.preorderItemCount,
    assignedTable: item.assignedTableNo ?? '—',
  }
}

// "2026-10-15T18:30:00+08:00" → "18:30"（後端回的就是店家時區）
function toTime(isoTime) {
  return isoTime.slice(11, 16)
}
