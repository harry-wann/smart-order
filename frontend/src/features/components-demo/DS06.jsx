import MenuItemRow from '@/components/order/MenuItemRow'
import DemoPage from './DemoPage'
import SoldOutStamp from '@/assets/ic_sold_out_stamp.svg'

export default function DS06() {
  return (
    <DemoPage
      code="DS-06"
      title="品項列與通知"
      description="放置品項列、數量操作、價格資訊與通知提示。"
    >
      <div className="flex flex-col gap-1.5">
        <MenuItemRow
          img="img_url"
          title="安格斯霜降牛五花"
          desc="厚切 3mm，涮 8 秒最好吃。油花分布均勻，是我們賣最好的一款。"
          price={380}
        />
        <MenuItemRow
          img="img_url"
          title="安格斯霜降牛五花"
          desc="厚切 3mm，涮 8 秒最好吃。油花分布均勻，是我們賣最好的一款。"
          price={380}
          isSoldOut={true}
        />
        <MenuItemRow
          img="img_url"
          title="安格斯霜降牛五花"
          desc="厚切 3mm，涮 8 秒最好吃。油花分布均勻，是我們賣最好的一款。"
          price={380}
          isPopular={true}
        />
      </div>
    </DemoPage>
  )
}
