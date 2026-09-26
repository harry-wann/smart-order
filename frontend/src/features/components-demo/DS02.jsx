import DemoPage from './DemoPage'
import OrderCard from '../../components/OrderCard'

export default function DS02() {
  return (
    <DemoPage code="DS-02" title="按鈕" description="放置主要操作、次要操作與不同互動狀態的按鈕。">
      <OrderCard tableName="A03" whichorder="1" waitingTime="2 minute" demand="招牌麻辣鍋底" />
    </DemoPage>
  )
}
