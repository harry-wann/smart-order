import CustomerTopBar from '@/components/CustomerTopBar'

export type Prop = {

}

function OrderIndex({}: Prop) {
  return <div className="flex h-full w-full flex-col">
    <CustomerTopBar
      title="A13桌"
      subTitle="2 大 1 小 18:32 入座"
      showBackButton={true}
    >如果有需要這邊可以放元件，會在最右手邊</CustomerTopBar>
    <div>Order Index</div>
  </div>
}

export default OrderIndex
