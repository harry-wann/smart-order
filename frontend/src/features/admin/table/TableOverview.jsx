import bellIcon from '../../../assets/ic_tableOverview_bell.svg'



// 桌況總覽的桌位資料
const tables = [
  {
    id: 'A01',
    status: 'available',
  },
  {
    id: 'A02',
    status: 'occupied',
    people: '2大0小',
    time: '38分',
    amount: 'NT$1860',
  },
  {
    id: 'A03',
    status: 'occupied',
    people: '2大1小',
    time: '3分',
    amount: 'NT$960',
  },
  {
    id: 'A04',
    status: 'available',
  },
  {
    id: 'A05',
    status: 'cleaning',
    time: '18:21結清',
  },
  {
    id: 'A06',
    status: 'available',
  },
  {
    id: 'A07',
    status: 'cleaning',
    time: '18:28結清',
  },
  {
    id: 'A08',
    status: 'reserved',
    who: '18:30 陳o君 4位',
  },
  {
    id: 'B01',
    status: 'occupied',
    people: '4大0小',
    time: '112分',
    amount: 'NT$3240',
  },
  {
    id: 'B02',
    status: 'reserved',
    who: '18:45 林o毫 2位',
  },
  {
    id: 'B03',
    status: 'occupied',
    people: '2大2小',
    time: '21分',
    amount: 'NT$980',
  },
  {
    id: 'C01',
    status: 'occupied',
    people: '6大2小',
    time: '64分',
    amount: 'NT$5120',
  },
]


// 底部候位中的顯示
const waitinglist = [
  {
    id: 'A13',
    name: '李小姐',
    people: '4位',
    status: '已叫號',
    waitingtime: '已叫號',
  },
  {
    id: 'A12',
    name: '王小姐',
    people: '3位',
    waitingtime: '18分',
  },
  {
    id: 'A14',
    name: '張先生',
    people: '6位',
    waitingtime: '4分',
  },
]

// 把後臺狀態的英文轉成中文顯示
function getStatusText(status) {
  switch (status) {
    case 'available':
      return '空桌'
    case 'occupied':
      return '用餐中'
    case 'cleaning':
      return '待清理'
    case 'reserved':
      return '預約保留'
    default:
      return ''
  }
}

// 根據桌位狀態決定顏色
function getStatusClass(status) {
  switch (status) {
    case 'available':
      return 'color-line'
    case 'occupied':
      return 'bg-[#C8442E] text-white'
    case 'cleaning':
      return 'bg-[#9C8E84] text-white'
    case 'reserved':
      return 'bg-[#FCF0DC] border-[#E8A33D]'
    default:
      return ''
  }
}

// 單一桌位卡片
function TableCard({ table }) {
  return (
    <div className={`border p-4 ${getStatusClass(table.status)}`}>
      <h3 className="text-lg font-bold">{table.id}</h3>

      <p>{getStatusText(table.status)}</p>

      {table.people && (
        <p>{table.people}</p>
      )}

      {table.time && (
        <p>{table.time}</p>
      )}

      {table.amount && (
        <p>{table.amount}</p>
      )}

      {table.who && (
        <p>{table.who}</p>
      )}
    </div>
  )
}

function TableOverview() {
//算一下桌位現在連動下方的統計資料 
    const availableCount= tables.filter(
    table => table.status ==='available'
    ).length
    const occupiedCount= tables.filter(
    table => table.status ==='occupied'
    ).length
    const cleaningCount= tables.filter(
    table => table.status ==='cleaning'
    ).length
    const reservedCount= tables.filter(
    table => table.status ==='reserved'
    ).length
  
return (
    <div className="flex flex-col">
      <header className="flex h-15 items-center gap-4 border-b border-line bg-surface px-6">
            <h1 className='type-h2 text-ink-900'>桌況總覽</h1>
            <span className='type-caption rounded-pill bg-surface-2 px-2.5 py-0.5 text-ink-600'>
              今天 9/13 (日)
            </span>

    <div className='flex-1' />

    <div className='type-caption flex h-9 items-center gap-2 rounded-btn border border-line bg-success-bg 
                    px-3 text-success'>
      <span className='size-2 rounded-full bg-success' />
      即時同步中
      
    </div>
    
    <button className='flex size-11 items-center justify-center rounded-btn'>
      <img src={bellIcon} alt="服務鈴" className='size-5' />
    </button>
</header>


      
      <div className="flex items-start gap-6 p-6">
       
        <main className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="rounded-card border border-line bg-surface p-4">
            統計列
          </div>

          <div className="grid grid-cols-4 gap-card-gap">
            {tables.map((table) => (
              <TableCard key={table.id} table={table} />
            ))}
          </div>

          <div className="rounded-card border border-line bg-surface p-4">
            候位區
          </div>
        </main>

      
        <aside className="w-75 shrink-0">
          <div className="rounded-card border border-line bg-surface p-4">
            服務鈴
          </div>
        </aside>
      </div>
    </div>
  )
}

export default TableOverview








    
      

      