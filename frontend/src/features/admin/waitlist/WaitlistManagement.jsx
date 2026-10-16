import { useEffect, useState } from 'react'
import SOButton from '@/components/SOButton'
import TopBar from '@/components/dashboard/TopBar'
import { SvgIconMap } from '@/assets/SvgIconMap'
import WaitlistSeatDialog from './WaitlistSeatDialog'
import { fetchWaitlist, registerWaitlist, callWaitlist, abandonWaitlist, seatWaitlist } from '@/services/api/waitlist/waitlistApi'

// 叫號後幾分鐘沒報到會被排程標成過號（規格寫 10 分鐘）
const CALL_EXPIRE_MINUTES = 10



// 狀態 → 徽章文字與樣式（class 寫完整字串，Tailwind 才掃得到）
const BADGE_BASE = 'inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium'
const STATUS_BADGE = {
  WAITING: {
    label: '等待中',
    className: 'bg-info-bg text-info-ink ring-1 ring-inset ring-info-line',
  },
  CALLED: {
    label: '已叫號',
    className: 'bg-warning-bg text-hold-ink ring-1 ring-inset ring-warning-line',
  },
  SEATED: { label: '已入座', className: 'bg-success text-white' },
  EXPIRED: { label: '過號', className: 'bg-surface-2 text-ink-600 ring-1 ring-inset ring-line' },
  ABANDONED: {
    label: '已放棄',
    className: 'bg-surface-2 text-ink-600 ring-1 ring-inset ring-line',
  },
}

// 清單排序：已叫號 → 等待中 → 已結束（新的在上）
const STATUS_ORDER = { CALLED: 0, WAITING: 1, SEATED: 2, EXPIRED: 2, ABANDONED: 2 }

function WaitlistManagement() {
    const [waitlist, setWaitlist] = useState([])

  // 畫面出現時，去後端拿候位清單
  useEffect(() => {
    const controller = new AbortController()
    fetchWaitlist(controller.signal)
      .then((data) => setWaitlist(data.map(toWaitlistRow)))
      .catch((err) => {
        if (!controller.signal.aborted) alert(`候位清單載入失敗：${err.message}`)
      })
    return () => controller.abort()
  }, [])

  const [now, setNow] = useState(new Date())
  
  // 正在選桌的那一組；null 代表對話框沒開
  const [seatingEntry, setSeatingEntry] = useState(null)

  // 現場登記表單
  const [name, setName] = useState('')
  const [phoneLast4, setPhoneLast4] = useState('')
  const [partySize, setPartySize] = useState(2)

  // 每 30 秒更新一次「現在」，等待分鐘數和倒數才會自己跑
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  const minutesSince = (date) => Math.max(0, Math.floor((now - date) / 60000))

  // ---------- 統計 ----------
  const activeCount = waitlist.filter((w) => w.status === 'WAITING' || w.status === 'CALLED').length
  const calledCount = waitlist.filter((w) => w.status === 'CALLED').length
  const expiredCount = waitlist.filter((w) => w.status === 'EXPIRED').length
  const seated = waitlist.filter((w) => w.status === 'SEATED')
  const avgWait = seated.length
    ? Math.round(
        seated.reduce((sum, w) => sum + (w.doneAt - w.createdAt) / 60000, 0) / seated.length,
      )
    : 0

  // 下一個號碼：目前最大號 + 1
  const maxNo = Math.max(0, ...waitlist.map((w) => Number(w.no.slice(1))))
  const nextNo = `A${String(maxNo + 1).padStart(2, '0')}`

  const canSubmit = name.trim() !== '' && phoneLast4.length === 4

  // ---------- 動作 ----------
    async function handleTakeNumber() {
    if (!canSubmit) return
    try {
      const created = await registerWaitlist(name.trim(), phoneLast4, partySize)
      setWaitlist((prev) => [...prev, toWaitlistRow(created)])
      setName('')
      setPhoneLast4('')
      setPartySize(2)
    } catch (err) {
      alert(`取號失敗：${err.message}`)
    }
  }

  function updateEntry(id, changes) {
    setWaitlist((prev) => prev.map((w) => (w.id === id ? { ...w, ...changes } : w)))
  }

  async function handleCall(id) {
    try {
      const updated = await callWaitlist(id)
      updateEntry(id, toWaitlistRow(updated))
    } catch (err) {
      alert(`叫號失敗：${err.message}`)
    }
  }

  async function handleAbandon(id) {
    try {
      await abandonWaitlist(id)
      updateEntry(id, { status: 'ABANDONED', doneAt: new Date() })
    } catch (err) {
      alert(`放棄失敗：${err.message}`)
    }
  }

  // TODO: 再叫一次 → 之後接候位螢幕重新播報
  const handleRecall = (id) => console.log('再叫一次', id)
  // 報到開桌 → 打開 S-10b
  const handleCheckIn = (entry) => setSeatingEntry(entry)

    // S-10b 按下「開 A05」：後端開桌，候位轉已入座
  async function handleSeat(tableId) {
    const entry = seatingEntry
    setSeatingEntry(null)
    try {
      const updated = await seatWaitlist(entry.id, tableId)
      updateEntry(entry.id, { ...toWaitlistRow(updated), doneAt: new Date() })
    } catch (err) {
      // 例如桌子剛好被別人開走（409）：關掉對話框，再按一次「報到開桌」會重抓空桌
      alert(`報到開桌失敗：${err.message}`)
    }
  }

  const sortedList = [...waitlist].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.createdAt - a.createdAt,
  )

  const weekday = '日一二三四五六'[now.getDay()]

  return (
    <div className="flex h-full flex-col bg-paper text-ink-900">
      <TopBar
        tag={`今天 ${now.getMonth() + 1}/${now.getDate()}（${weekday}）`}
        childrenLeft={
          <span className="type-caption text-ink-600 tabular-nums">現在 {formatTime(now)}</span>
        }
        childrenRight={
          <>
            <span className="type-caption text-ink-600">候位螢幕已連線</span>
            <button
              type="button"
              aria-label="通知"
              className="relative flex size-11 flex-none items-center justify-center rounded-full hover:bg-surface-2"
            >
              <SvgIconMap.OrderHeaderBell aria-hidden="true" className="size-5" />
              <span className="absolute top-2 right-2 size-2 rounded-full bg-danger ring-2 ring-surface" />
            </button>
          </>
        }
      />

      <div className="flex items-start gap-6 p-6">
        {/* ===== 左欄：現場登記 ===== */}
        <div className="flex w-80 flex-none flex-col gap-4">
          <section className="rounded-card border border-line bg-surface p-5 shadow-card">
            <h2 className="type-h3">現場登記</h2>
            <p className="mt-1 mb-4 type-caption text-ink-600">留末四碼就好，不留全號碼</p>

            <label className="mb-4 block">
              <span className="mb-2 block text-sm font-bold text-ink-600">怎麼稱呼</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：陳"
                className="h-12 w-full rounded-btn border border-line bg-surface px-4 text-base text-ink-900 outline-none placeholder:text-ink-400 focus:border-transparent focus:ring-[1.5px] focus:ring-brand-600 focus:ring-inset"
              />
            </label>

            <label className="mb-4 block">
              <span className="mb-2 block text-sm font-bold text-ink-600">電話末四碼</span>
              <input
                value={phoneLast4}
                onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                placeholder="0000"
                className="h-12 w-full rounded-btn border border-line bg-surface px-4 text-base text-ink-900 tabular-nums outline-none placeholder:text-ink-400 focus:border-transparent focus:ring-[1.5px] focus:ring-brand-600 focus:ring-inset"
              />
            </label>

            <div className="mb-4">
              <span className="mb-2 block text-sm font-bold text-ink-600">人數</span>
              <div className="flex items-center gap-4">
                <StepButton
                  label="減少人數"
                  onClick={() => setPartySize((n) => Math.max(1, n - 1))}
                  disabled={partySize <= 1}
                >
                  −
                </StepButton>
                <span className="w-18 text-center font-serif text-[40px] leading-none font-black tabular-nums">
                  {partySize}
                </span>
                <StepButton
                  label="增加人數"
                  onClick={() => setPartySize((n) => Math.min(20, n + 1))}
                  disabled={partySize >= 20}
                >
                  ＋
                </StepButton>
              </div>
            </div>

            <SOButton
              height="h-13"
              text={`取號　下一號 ${nextNo}`}
              disabled={!canSubmit}
              onClick={handleTakeNumber}
            />
          </section>

          <div className="flex gap-2 rounded-btn bg-surface-2 px-4 py-3 text-sm leading-relaxed text-ink-600">
            <SvgIconMap.ToastInfo aria-hidden="true" className="mt-0.5 size-4 flex-none" />
            <p>
              叫號後 {CALL_EXPIRE_MINUTES} 分鐘沒報到，排程自動標成過號。
              <br />
              只有「已叫號」會被標，「等待中」不會。
            </p>
          </div>
        </div>

        {/* ===== 右欄：統計＋清單 ===== */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <section className="flex items-center gap-6 rounded-card border border-line bg-surface px-5 py-4">
            <Stat value={activeCount} label="組候位中" valueClass="text-brand-600" />
            <Divider />
            <Stat value={calledCount} label="已叫號待報到" valueClass="text-warning" />
            <Divider />
            <Stat value={avgWait} label="分・平均等待" />
            <Divider />
            <Stat value={expiredCount} label="今日過號" />
          </section>

          <div className="overflow-x-auto rounded-card border border-line bg-surface">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-left text-[13px] font-bold tracking-wide text-ink-600">
                <tr>
                  <th className="w-[72px] border-b border-line px-4 py-3">號碼</th>
                  <th className="border-b border-line px-4 py-3">客人</th>
                  <th className="w-[72px] border-b border-line px-4 py-3">人數</th>
                  <th className="w-[112px] border-b border-line px-4 py-3">等待</th>
                  <th className="w-[104px] border-b border-line px-4 py-3">狀態</th>
                  <th className="w-[200px] border-b border-line px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {sortedList.map((w) => {
                  const isActive = w.status === 'WAITING' || w.status === 'CALLED'
                  const badge = STATUS_BADGE[w.status]
                  const rowClass =
                    w.status === 'CALLED' ? 'bg-warning-bg' : isActive ? '' : 'opacity-55'

                  return (
                    <tr key={w.id} className={`border-b border-line last:border-b-0 ${rowClass}`}>
                      <td className="px-4 py-3 text-[17px] font-bold tabular-nums">{w.no}</td>
                      <td className="px-4 py-3">
                        <b className="text-[15px]">{w.name}</b>
                        <div className="type-caption whitespace-nowrap text-ink-600 tabular-nums">
                          末四碼 {w.phoneLast4}
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{w.partySize} 位</td>
                      <td className="px-4 py-3 tabular-nums">
                        {isActive
                          ? `已等 ${minutesSince(w.createdAt)} 分`
                          : `${formatTime(w.doneAt)} ${DONE_WORD[w.status]}`}
                        <div className="type-caption text-ink-600">
                          {formatTime(w.createdAt)} 登記
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`${BADGE_BASE} ${badge.className}`}>{badge.label}</span>
                        {w.status === 'CALLED' && (
                          <div className="type-caption text-ink-600">
                            剩 {Math.max(0, CALL_EXPIRE_MINUTES - minutesSince(w.calledAt))} 分
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {w.status === 'CALLED' && (
                          <div className="flex items-center gap-2">
                            <SmallButton variant="primary" onClick={() => handleCheckIn(w)}>
                              報到開桌
                            </SmallButton>
                            <SmallButton variant="ghost" onClick={() => handleRecall(w.id)}>
                              再叫一次
                            </SmallButton>
                          </div>
                        )}
                        {w.status === 'WAITING' && (
                          <div className="flex items-center gap-2">
                            <SmallButton variant="secondary" onClick={() => handleCall(w.id)}>
                              叫號
                            </SmallButton>
                            <SmallButton variant="ghost" onClick={() => handleAbandon(w.id)}>
                              放棄
                            </SmallButton>
                          </div>
                        )}
                        {!isActive && <span className="type-caption text-ink-400">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <p className="type-caption text-ink-600">
            按「報到開桌」會跳出選桌對話框（S-10b），只列坐得下的空桌，人數直接帶入，不用再輸入一次。
          </p>
        </div>
      </div>

      {/* S-10b 選桌對話框：key 讓每次打開都重新選第一張 */}
      {seatingEntry && (
        <WaitlistSeatDialog
          key={seatingEntry.id}
          entry={seatingEntry}
          onClose={() => setSeatingEntry(null)}
          onConfirm={handleSeat}
        />
      )}
    </div>
  )
}

// 已結束的列，時間後面接的字
const DONE_WORD = { SEATED: '入座', EXPIRED: '過號', ABANDONED: '放棄' }

// Date → "18:55"
function formatTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function Stat({ value, label, valueClass = 'text-ink-900' }) {
  return (
    <div className="flex flex-none items-baseline gap-2 whitespace-nowrap">
      <span className={`font-serif text-[26px] leading-none font-black tabular-nums ${valueClass}`}>
        {value}
      </span>
      <span className="type-caption text-ink-600">{label}</span>
    </div>
  )
}

function Divider() {
  return <span className="w-px flex-none self-stretch bg-line" />
}

// 人數加減的大圓鈕（對應設計稿的 .bigstep button）
function StepButton({ label, children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-14 flex-none items-center justify-center rounded-full border-[1.5px] border-brand-600 bg-surface text-2xl text-brand-600 transition-colors hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-40"
      {...props}
    >
      {children}
    </button>
  )
}

// 表格內的小按鈕（對應設計稿的 .btn-sm）
const SMALL_BUTTON_VARIANT = {
  primary: 'bg-brand-600 text-white hover:bg-brand-500',
  secondary: 'bg-surface text-brand-600 ring-[1.5px] ring-inset ring-brand-600 hover:bg-brand-100',
  ghost: 'text-ink-600 hover:text-brand-600',
}

function SmallButton({ variant = 'ghost', children, ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex h-9 flex-none items-center rounded-btn px-3.5 text-sm font-medium whitespace-nowrap transition-colors active:scale-[.98] ${SMALL_BUTTON_VARIANT[variant]}`}
      {...props}
    >
      {children}
    </button>
  )
}

// 後端的候位 → 這個畫面用的格式
function toWaitlistRow(w) {
  return {
    id: w.id,
    no: w.ticketNo,
    name: w.contactName,
    phoneLast4: w.contactPhone,
    partySize: w.partySize,
    status: w.status,
    createdAt: new Date(w.createdAt),
    calledAt: w.calledAt ? new Date(w.calledAt) : null,
  }
}

export default WaitlistManagement
