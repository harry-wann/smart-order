import DemoPage from './DemoPage'
import MenuItemRow from '@/components/order/MenuItemRow'
import SoldOutStamp from '@/assets/ic_sold_out_stamp.svg'
import { useState } from 'react'
import DropdownNotification from '@/components/DropdownNotification/DropdownNotification'
import DropdownNotificationHost from '@/components/DropdownNotification/DropdownNofificationHost'
import ToastItem, { ToastType } from '@/components/toast/ToastItem.tsx'
import { useToast } from '@/components/toast/ToastManager'

export default function DS06() {
  const { showToast } = useToast()
  const [incoming, setIncoming] = useState(null)

  return (
    <DemoPage
      code="DS-06"
      title="品項列與通知"
      description="放置品項列、數量操作、價格資訊與通知提示。"
    >
      <div className="flex flex-row gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
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
        <div className="flex flex-1 flex-col gap-1.5">
          <ToastItem type={ToastType.INFO} title="已通知櫃檯，服務生馬上過來" />
          <ToastItem
            type={ToastType.ERROR}
            title="網路不穩，這一單沒送出去網路不穩，這一單沒送出去網路不穩，這一單沒送出去網路不穩，這一單沒送出去網路不穩，這一單沒送出去網路不穩，這一單沒送出去網路不穩，這一單沒送出去網路不穩，這一單沒送出去網路不穩，這一單沒送出去"
          />
          <ToastItem type={ToastType.SYSTEM} title="已複製訂單編號" />
          <button
            type="button"
            onClick={() =>
              showToast({
                type: ToastType.INFO,
                title: '已通知櫃檯，服務生馬上過來',
              })
            }
            className="mt-4 rounded-btn bg-brand-600 px-4 py-2 text-surface hover:bg-brand-700"
          >
            顯示底部浮動 Toast
          </button>

          <DropdownNotification
            type="add"
            title="已加入購物車"
            desc="安格斯霜降牛五花 ×1・全份"
            onClick={() => {
              console.log('跳轉到購物車')
              setIncoming({
                id: Date.now(),
                type: 'add',
                title: '已加入購物車',
                desc: '安格斯霜降牛五花 ×1・全份',
                onClick: () => {},
              })
            }}
          />

          <DropdownNotification
            type="send"
            title="已送出訂單"
            desc="共 5 項，NT$ 2,000"
            onClick={() => {
              console.log('跳轉到點餐紀錄')

              setIncoming({
                id: Date.now(),
                type: 'send',
                title: '已送出訂單',
                desc: '共 5 項，NT$ 2,000',
                onClick: () => {},
              })
            }}
          />

          <div className="relative min-h-dvh w-full">
            <DropdownNotificationHost incoming={incoming} />
            {/* <Outlet /> */}
          </div>
        </div>
      </div>
    </DemoPage>
  )
}
