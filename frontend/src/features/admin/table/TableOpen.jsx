import { Link,useParams } from 'react-router'
import { useState } from 'react'
import bellIcon from '../../../assets/ic_tableOverview_bell.svg'
 import SOButton from '../../../components/SOButton'





function TableOpen() {
  const { tableNo } = useParams()

  const tableInfo = { capacity: 6, area: '走道區' }

  const [activeTab, setActiveTab] = useState('walkin')

  const tabs = [
    { key: 'walkin', label: '現場' },
    { key: 'waitlist', label: '候位', count: 3 },
    { key: 'reservation', label: '預約', count: 2 },
  ]



  return (
  <div className="flex flex-col">
    <header className="flex h-15 items-center gap-4 border-b border-line bg-surface px-6">
      <Link
        to="/admin/tables"
        className="flex size-11 items-center justify-center rounded-full text-ink-900 hover:bg-surface-2"
      >
        ←
      </Link>

      <h1 className="type-h2 text-ink-900">{tableNo} 桌 開桌</h1>

      <span className="type-caption rounded-pill bg-surface-2 px-2.5 py-0.5 text-ink-600">
        {tableInfo.capacity} 人桌・{tableInfo.area}
      </span>

      <div className="flex-1" />

      <span className="type-caption text-ink-600">今天 18:32</span>

      <button className="relative flex size-11 items-center justify-center rounded-full hover:bg-surface-2">
        <img src={bellIcon} alt="服務鈴" className="size-5.5" />
        <span className="absolute top-1.75 right-1.75 size-2.25 rounded-full bg-brand-600" />
      </button>
    </header>


    <main className="mx-auto w-full max-w-205 p-6">
      
      <div className="flex gap-6 rounded-t-card border-b border-line bg-surface px-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`type-body -mb-px border-b-2 py-3 ${
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
           {activeTab === 'walkin' && <SOButton text="開桌" onClick={() => alert('只是測試')} />}
        {activeTab === 'waitlist' && <p>候位內容（S-02c）</p>}
        {activeTab === 'reservation' && <p>預約內容（再等等）</p>}
      </section>
    </main>






  </div>
)
}



export default TableOpen