import { Link } from 'react-router'
import { useState } from 'react'
import bellIcon from '../../../assets/ic_tableOverview_bell.svg'
import SOButton from '../../../components/SOButton'



// 把後臺狀態的英文轉成中文顯示、根據桌位狀態決定顏色、根據狀態決定標籤底色
const statusStyles = {
  available: {
    name: '空桌',
    cardClass: 'bg-table-available text-ink-900',
    labelClass: 'bg-white/70',
  },
  occupied: {
    name: '用餐中',
    cardClass: 'bg-table-occupied text-white',
    labelClass: 'bg-white/90',
  },
  cleaning: {
    name: '待清理',
    cardClass: 'bg-table-cleaning text-white',
    labelClass: 'bg-white/90',
  },
  reserved: {
    name: '預約保留',
    cardClass: 'bg-accent-100 text-ink-900 shadow-[inset_0_0_0_1.5px_var(--color-accent-500)]',
    labelClass: 'bg-accent-500',
  },
}


// 桌況總覽的桌位資料
const tables = [
  { id: 'A01', status: 'available' },
  { id: 'A02', status: 'occupied', adults: 2, kids: 0, minutes: 38, amount: 1860 },
  { id: 'A03', status: 'occupied', adults: 2, kids: 1, minutes: 3, amount: 960 },
  { id: 'A04', status: 'available' },
  { id: 'A05', status: 'cleaning', paidAt: '18:21' },
  { id: 'A06', status: 'available' },
  { id: 'A07', status: 'cleaning', paidAt: '18:28' },
  { id: 'A08', status: 'reserved', reservation: '18:30 陳○君 4 位' },
  { id: 'B01', status: 'occupied', adults: 4, kids: 0, minutes: 112, amount: 3240 },
  { id: 'B02', status: 'reserved', reservation: '18:45 林○豪 2 位' },
  { id: 'B03', status: 'occupied', adults: 2, kids: 2, minutes: 21, amount: 980 },
  { id: 'C01', status: 'occupied', adults: 6, kids: 2, minutes: 64, amount: 5120 },
]


// 底部候位中的顯示
const waitinglist = [
  { id: 'A13', name: '李', people: 4, called: true },
  { id: 'A12', name: '王', people: 3, waitMinutes: 18 },
  { id: 'A14', name: '張', people: 6, waitMinutes: 4 },
]


//右側畫面的服務鈴
const initialBellCalls = [
  { id: 1, tableId: 'A03', request: '呼叫服務生', minutesAgo: 1 },
  { id: 2, tableId: 'B03', request: '加湯', minutesAgo: 3 },
  { id: 3, tableId: 'C01', request: '換鍋撈渣', minutesAgo: 4 },
]




//--------------------------

//上方條狀> 桌狀的統整
function StatItem({ count, label, swatchClass, countClass = 'text-ink-900' }) {
  return (
    <div className="flex items-baseline gap-2 whitespace-nowrap">
      <span className={`type-h1 font-black tabular-nums ${countClass}`}>{count}</span>
      <span className="type-caption text-ink-600">
        {swatchClass && (
          <i className={`mr-1 inline-block size-2.5 rounded-[3px] ${swatchClass}`} />
        )}
        {label}</span>
    </div>
  )
}

//正中間 > 12格桌卡
//用餐中(isOvertime)而且時間超過100minutes、加上紅色外框
function TableCard({ table }) {
  const style = statusStyles[table.status]
  const isOvertime = table.status === 'occupied' && table.minutes > 100

  return (
    <div
      className={`flex min-h-26.5 flex-col gap-1 rounded-card px-4 py-3 ${style.cardClass} ${
        isOvertime ? 'shadow-[inset_0_0_0_3px_var(--color-danger)]' : ''
      }`}
    >
    
      <span
        className={`type-caption mb-1 self-start rounded-pill px-2.5 py-0.5 text-ink-900 ${style.labelClass}`}
      >
        {style.name}
      </span>

     
      <h3 className="type-h2 tabular-nums">{table.id}</h3>

     
      {table.status === 'occupied' && (
        <>
          <p className="type-caption tabular-nums">
            {table.adults} 大 {table.kids} 小・{table.minutes} 分
          </p>
          <p className="type-caption font-bold tabular-nums">
            NT$ {table.amount.toLocaleString()}
          </p>
        </>
      )}

     
      {table.status === 'cleaning' && (
        <p className="type-caption tabular-nums">{table.paidAt} 結清</p>
      )}

     
      {table.status === 'reserved' && <p className="type-caption">{table.reservation}</p>}
    </div>
  )
}


// 候位區的單組候位
function WaitingChip({ waiting }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-pill px-3 py-2 ${
        waiting.called ? 'bg-warning-bg' : 'bg-surface-2'
      }`}
    >
      <b className="tabular-nums text-ink-900">{waiting.id}</b>
      <span className="type-body-sm text-ink-900">
        {waiting.name}・{waiting.people} 位
      </span>

      {waiting.called ? (
        <span className="type-caption rounded-pill bg-warning-bg px-2.5 py-0.5 text-hold-ink shadow-[inset_0_0_0_1px_var(--color-warning-line)]">
          已叫號
        </span>
      ) : (
        <span className="type-caption tabular-nums text-ink-600">{waiting.waitMinutes} 分</span>
      )}
    </div>
  )
}


function BellCall({ call, onDone }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="type-body w-11 shrink-0 font-bold tabular-nums text-ink-900">
        {call.tableId}
      </span>

      <div className="flex-1">
        <p className="type-body-sm font-bold text-ink-900">{call.request}</p>
        <p className="type-caption tabular-nums text-ink-600">{call.minutesAgo} 分鐘前</p>
      </div>

      <button onClick={() => onDone(call.id)} className="type-body-sm inline-flex h-9 items-center rounded-btn bg-surface px-3.5 font-medium text-brand-600 
      shadow-[inset_0_0_0_1.5px_var(--color-brand-600)] hover:bg-brand-100">
              已處理
      </button>
    </div>
  )
}



//
function TableOverview() {
  
  const [calls, setCalls] = useState(initialBellCalls)
  const [doneCount, setDoneCount] = useState(14)

  const availableCount = tables.filter((table) => table.status === 'available').length
  const occupiedCount = tables.filter((table) => table.status === 'occupied').length
  const cleaningCount = tables.filter((table) => table.status === 'cleaning').length
  const reservedCount = tables.filter((table) => table.status === 'reserved').length


       
        function handleDone(id) {
        setCalls(calls.filter((call) => call.id !== id))
        setDoneCount(doneCount + 1)
         }

  return (
    <div className="flex flex-col">
      
      <header className="flex h-15 items-center gap-4 border-b border-line bg-surface px-6">
        <h1 className="type-h2 text-ink-900">桌況總覽</h1>
        <span className="type-caption rounded-pill bg-surface-2 px-2.5 py-0.5 text-ink-600">
          今天 9/13（日）
        </span>

        <div className="flex-1" />

        <div className="type-caption flex h-9 items-center gap-2 rounded-btn border border-line bg-success-bg px-3 text-success">
          <span className="size-2 rounded-full bg-success" />
          即時同步中
        </div>

        <button className="relative flex size-11 items-center justify-center rounded-full hover:bg-surface-2">
          <img src={bellIcon} alt="服務鈴" className="size-5.5" />
          <span className="absolute top-1.75 right-1.75 size-2.25 rounded-full bg-brand-600" />
        </button>
      </header>


     
      <div className="flex items-start gap-6 p-6">
        
        <main className="flex min-w-0 flex-1 flex-col gap-4">
         
          <div className="flex items-center gap-6 rounded-card border border-line bg-surface px-5 py-4">
            <StatItem count={availableCount} label="空桌" swatchClass="bg-table-available" />
            <StatItem
              count={occupiedCount}
              label="用餐中"
              swatchClass="bg-table-occupied"
              countClass="text-brand-600"
            />
            <StatItem count={cleaningCount} label="待清理" swatchClass="bg-table-cleaning" />
            <StatItem
              count={reservedCount}
              label="預約保留"
              swatchClass="bg-accent-100 shadow-[inset_0_0_0_1.5px_var(--color-accent-500)]"
              countClass="text-accent-600"
            />

            <div className="w-px self-stretch bg-line" />

            <StatItem count={4} label="待報到預約" countClass="text-accent-600" />

            <div className="w-px self-stretch bg-line" />

            <StatItem count={waitinglist.length} label="組候位中" />
          </div>


         
          <div className="grid grid-cols-4 gap-card-gap">
            {tables.map((table) => (
              <TableCard key={table.id} table={table} />
            ))}
          </div>

         
          <section className="rounded-card border border-line bg-surface p-4">
            <div className="flex items-center gap-2">
              <h2 className="type-h3 text-ink-900">候位中</h2>
              <span className="type-caption rounded-pill bg-surface-2 px-2.5 py-0.5 text-ink-600 shadow-[inset_0_0_0_1px_var(--color-line)]">
                {waitinglist.length} 組
              </span>
              <span className="type-caption text-ink-600">平均等 22 分</span>

              <div className="flex-1" />

              <Link
                to="/admin/waitlist"
                className="type-body-sm inline-flex h-9 items-center rounded-btn bg-surface px-3.5 font-medium text-brand-600 
                shadow-[inset_0_0_0_1.5px_var(--color-brand-600)] hover:bg-brand-100"
              >
                去候位管理
              </Link>
            </div>


            <div className="mt-3 flex flex-wrap gap-3">
              {waitinglist.map((waiting) => (
                <WaitingChip key={waiting.id} waiting={waiting} />
              ))}
            </div>
          </section>
        </main>

        

    
    
    <aside className="w-75 shrink-0">
      <section className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface 
       shadow-pop">
      
      <div className="type-body-sm flex items-center gap-2 bg-surface-2 px-4 py-3 font-bold text-ink-900">
        <img src={bellIcon} alt="" className="size-4.5" />
        服務鈴
        <div className="flex-1" />
        <span className="type-caption rounded-pill bg-danger px-2.5 py-0.5 text-white">
          {calls.length}
        </span>
      </div>

      
      {calls.map((call) => (
        <BellCall key={call.id} call={call} onDone={handleDone} />
      ))}

          <p className="type-caption px-4 py-3 text-center text-ink-600">今天已處理 {doneCount} 則</p>
    </section>
  </aside>

        





      </div>
    </div>
  )
}


export default TableOverview








    
      

      