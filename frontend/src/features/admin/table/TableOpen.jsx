import { Link,useParams } from 'react-router'
import bellIcon from '../../../assets/ic_tableOverview_bell.svg'

function TableOpen() {
  const { tableNo } = useParams()

  const tableInfo = { capacity: 6, area: '走道區' }



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
  </div>
)
}



export default TableOpen