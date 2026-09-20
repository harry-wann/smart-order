import { useState } from 'react'
import DropdownNotificationHost, { type Notice } from "@/components/DropdownNotification/DropdownNofificationHost"
import DropdownNotification, { type NotificationType } from "@/components/DropdownNotification/DropdownNotification"

type Props = {}

export default function Components({}: Props) {

  const [incoming, setIncoming] = useState<Notice | null>(null)
  
  return (
    <div className="w-full h-full p-4 flex flex-col">

      <article className="w-full h-full flex flex-col">
        <h1>DS-02｜按鈕</h1>

      </article>

      <article className="w-full h-full flex flex-col">
        <h1>DS-03｜輸入元件</h1>

      </article>

      <article className="w-full h-full flex flex-col">
        <h1>DS-04｜選擇元件</h1>

      </article>

      <article className="w-full h-full flex flex-col">
        <h1>DS-05｜標籤與容器</h1>

      </article>

      <article className="w-full h-full flex flex-col">
        <h1>DS-06｜品項列與通知</h1>
        <div className="flex gap-3">
          <div className="flex flex-col flex-1 p-2">

          </div>

          <div className="flex flex-col flex-1 p-2">
            <DropdownNotification 
              type='add'
              title="已加入購物車"
              desc="安格斯霜降牛五花 ×1・全份"
              onClick={ () => {
                console.log("跳轉到購物車")
                setIncoming({
                  id: Date.now(),
                  type: "add",
                  title: "已加入購物車",
                  desc: "安格斯霜降牛五花 ×1・全份",
                  onClick: () => {}
                })
              } }
            />

            <DropdownNotification 
              type='send'
              title="已送出訂單"
              desc="共 5 項，NT$ 2,000"
              onClick={ () => {
                console.log("跳轉到點餐紀錄")

                setIncoming({
                  id: Date.now(),
                  type: "send",
                  title: "已送出訂單",
                  desc: "共 5 項，NT$ 2,000",
                  onClick: () => {}
                })
              } }
            />

            <div className="relative w-full min-h-dvh">
              <DropdownNotificationHost incoming={incoming} />
              {/* <Outlet /> */}
            </div>
          </div>
        </div>
      </article>

    </div>
  )
}
