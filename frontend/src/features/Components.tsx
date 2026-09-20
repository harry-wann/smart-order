import { useState } from 'react'
import MenuItemRow from '@/components/order/MenuItemRow'
type Props = {}

export default function Components({}: Props) {
  
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
          <div className="flex flex-col flex-1 p-2 gap-3">
            <MenuItemRow
              img="123"
              title="安格斯霜降牛五花"
              desc="厚切 3mm，涮 8 秒最好吃。油花分布均勻，是我們賣最好的一款。"
              price={1234}
              isSoldOut={false}
              isPopular={true}
              onClick={ () => console.log("TEST") }
            />

            <MenuItemRow
              img="123"
              title="安格斯霜降牛五花"
              desc="厚切 3mm，涮 8 秒最好吃。油花分布均勻，是我們賣最好的一款。"
              price={1234}
              isSoldOut={false}
              isPopular={false}
              onClick={ () => console.log("TEST") }
            />

            <MenuItemRow
              img="123"
              title="安格斯霜降牛五花"
              desc="厚切 3mm，涮 8 秒最好吃。油花分布均勻，是我們賣最好的一款。"
              price={1234}
              isSoldOut={true}
              isPopular={false}
              onClick={ () => console.log("TEST") }
            />
          </div>

          <div className="flex flex-col flex-1 p-2">

          </div>
        </div>
      </article>

    </div>
  )
}
