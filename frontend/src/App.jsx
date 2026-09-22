
//S-02 正中間 桌況總覽
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
  }


]



//底部候位中的顯示
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
  }
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

function getStatusClass(status) {
  switch (status) {
    case 'available':
      return 'bg-[#E6DED2]'
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

    </div>
  )
}

function App() {
  return (

    <div>
      <h1>桌況總覽</h1>

      <div className="border rounded-lg p-4 bg-white"></div>

      <div className="grid grid-cols-4 gap-4">
        {tables.map(table => (
          <TableCard key={table.id} table={table} />
        ))}
      </div>



      {/* 下面那排桌子狀態顯示 */}

      <div className="mt-8">
        <div className="border rounded-lg p-4 bg-white">
          <h2 className="text-x1 font-bold">候位中
            <span className="border rounded text-sm ml-2">3組</span>
            <span className="text-sm font-normal ml-2">平均等候22分</span>

          </h2>

          <div className="flex gap-4">
            {waitinglist.map(waiting => (

              <div className="border p-4 rounded-full px-4 py-2 bg-[#F5EFE5]" key={waiting.id}>

                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-bold">{waiting.id}</h3>

                  <p>{waiting.name}</p>
                  <p className="text-sm">{waiting.people}</p>

                  {waiting.waitingtime === '已叫號' ? (
                    <p className="text-sm border rounded-full px-2 py-1 bg-[#FCF0DC]">
                      {waiting.waitingtime}</p>
                  )
                    :
                    (
                      <p className="text-sm">
                        {waiting.waitingtime}
                      </p>
                    )}

                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
export default App