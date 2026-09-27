import { useParams } from 'react-router'


function TableOpen() {
  const { tableNo } = useParams()




  return (
    <div className="p-6">
      <h1 className="type-h2 text-ink-900">{tableNo} 桌 開桌</h1>
    </div>
  )
}



export default TableOpen