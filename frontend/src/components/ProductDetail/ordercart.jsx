import { useState } from 'react'
import Counter from '../steper/counter'
import graytrash from '../../assets/ic_ordercart_graytrash.svg'
import lessthan from '../../assets/ic_ordercart_lessthan.svg'
import person from '../../assets/ic_ordercart_person.svg'
import people from '../../assets/ic_ordercart_people.svg'

export default function OrderCart({ tableNumber }) {
  // 購物車假資料
  const [cartItems, setCartItems] = useState([
    {
      id: 1,
      name: '招牌麻辣鍋底',
      price: 480,
      quantity: 1,
      people: '陳小美 加的',
      options: [],
      note: '',
    },
    {
      id: 2,
      name: '安格斯霜降牛五花',
      price: 460,
      quantity: 1,
      people: '陳小美 加的',
      options: ['全份', '加蔥花'],
      note: '不要太生',
    },
    {
      id: 3,
      name: '伊比利豬梅花',
      price: 320,
      quantity: 1,
      people: '客人 2 加的',
      options: [],
      note: '',
    },
    {
      id: 4,
      name: '高麗菜',
      price: 160,
      quantity: 1,
      people: '客人 2 加的',
      options: [],
      note: '',
    },
  ])

  // 修改商品數量
  const handleQuantityChange = (id, newQuantity) => {
    // 數量變成 0 → 刪除商品
    if (newQuantity === 0) {
      setCartItems((items) => items.filter((item) => item.id !== id))
      return
    }

    // 修改商品數量
    setCartItems((items) =>
      items.map((item) => (item.id === id ? { ...item, quantity: newQuantity } : item)),
    )
  }

  // 刪除商品
  const handleDelete = (id) => {
    setCartItems((items) => items.filter((item) => item.id !== id))
  }

  // 商品總數量
  const totalQuantity = cartItems.reduce((total, item) => total + item.quantity, 0)

  // 商品總金額
  const totalPrice = cartItems.reduce((total, item) => total + item.price * item.quantity, 0)

  return (
    <div className="mx-auto flex h-screen w-full max-w-93.75 flex-col bg-surface-2">
      {/* Header：375 × 56 */}
      <header className="flex h-14 items-center border-b border-line bg-surface px-4">
        <button type="button" className="flex h-10 w-8 items-center justify-start text-ink-900">
          <img src={lessthan} />
        </button>

        <div className="ml-2">
          <h1 className="type-h3 text-ink-900">購物車</h1>

          <p className="notification-time leading-4 text-ink-400">{tableNumber} 桌整桌共用</p>
        </div>
      </header>

      {/* 共用購物車提示：375 × 39 */}
      <div className="flex h-9.75 items-center gap-2 bg-info-bg px-4">
        {/* 人物 icon */}
        <span className="type-caption text-info-ink">
          <img src={people} />
        </span>

        <p className="type-caption text-info-ink">這是整桌共用的購物車，同桌誰都可以改</p>
      </div>

      {/* 商品列表 */}
      <main className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {/* 購物車是空的 */}
        {cartItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <p className="type-body-sm text-ink-400">購物車是空的</p>

            <button
              type="button"
              className="mt-4 rounded-btn bg-brand-600 px-6 py-3 type-body-sm text-surface"
            >
              去看看菜單
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {cartItems.map((item) => (
              <div key={item.id} className="rounded-btn border-line bg-surface p-4">
                {/* 商品名稱 + 價格 */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="type-body font-bold text-ink-900">{item.name}</h2>

                    {/* 加入商品的人 */}
                    <div className="mt-1 flex items-center gap-1">
                      <img src={person} />
                      <p className="type-caption text-ink-400">{item.people}</p>
                    </div>
                  </div>

                  {/* 商品金額 */}
                  <p className="type-price font-bold text-brand-600">
                    NT$ {(item.price * item.quantity).toLocaleString()}
                  </p>
                </div>

                {/* 商品選項 */}
                {item.options.length > 0 && (
                  <p className="mt-1 type-body-sm text-ink-400">{item.options.join(' · ')}</p>
                )}

                {/* 備註 */}
                {item.note && <p className="type-body-sm text-ink-400">備註：{item.note}</p>}

                {/* 垃圾桶 + Counter */}
                <div className="mt-4 flex items-center justify-between">
                  {/* 刪除 */}
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="flex h-8 w-8 items-center justify-center"
                    aria-label={` ${item.name}`}
                  >
                    <img src={graytrash} />
                  </button>

                  {/* 數量 */}
                  <Counter
                    size="small"
                    initialCount={item.quantity}
                    showTrash={false}
                    onChange={(newQuantity) => handleQuantityChange(item.id, newQuantity)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer：375 × 153 */}
      {cartItems.length > 0 && (
        <footer className="h-38.25 border-t border-line bg-surface px-4 py-4">
          {/* 小計 + 金額 */}
          <div className="flex items-center justify-between">
            <p className="type-body-sm text-ink-400">小計 {totalQuantity} 項</p>

            <p className="type-price font-bold text-brand-600">NT$ {totalPrice.toLocaleString()}</p>
          </div>

          {/* 說明 */}
          <p className="mt-1 type-caption text-ink-400">
            送出後整份變成一張單 · 服務費 10% 結帳時才算
          </p>

          {/* 送出按鈕 */}
          <button
            type="button"
            className="mt-3 flex h-10.75 w-full items-center justify-center rounded-btn bg-brand-600 text-base font-bold text-surface"
          >
            送出整桌點餐
          </button>
        </footer>
      )}
    </div>
  )
}
