import { useState } from 'react'
import minus from '../../assets/ic_counter_minus.svg'
import plus from '../../assets/ic_counter_plus.svg'
import redplus from '../../assets/ic_counter_redplus.svg'
import redtrash from '../../assets/ic_counter_redtrash.svg'
import noplus from '../../assets/ic_counter_noplus.svg'

export default function Counter({ size = 'small', initialCount = 0 }) {
  const [count, setCount] = useState(initialCount)

  // 最大數量
  const MAX_COUNT = 10

  // 增加
  const increment = () => {
    if (count < MAX_COUNT) {
      setCount(count + 1)
    }
  }

  // 減少
  const decrement = () => {
    if (count > 1) {
      setCount(count - 1)
    }
  }

  // 刪除
  const remove = () => {
    setCount(0)
  }

  // 數量 = 0
  // 顯示紅色圓形 +
  if (count === 0) {
    return (
      <button onClick={increment} className="flex h-7 w-7 items-center justify-center">
        <img src={redplus} />
      </button>
    )
  }

  // Large：186 × 58 (開桌填人數)

  if (size === 'large') {
    return (
      <div className="flex h-14.5 w-46.5 items-center rounded-full border border-[#eadfd8] bg-white">
        {/* 左邊 */}
        {count === 1 ? (
          <button onClick={remove} className="flex h-14 w-14 shrink-0 items-center justify-center">
            <img src={redtrash} />
          </button>
        ) : (
          <button
            onClick={decrement}
            className="flex h-14 w-14 shrink-0 items-center justify-center"
          >
            <img src={minus} />
          </button>
        )}

        {/* 數量 */}
        <span className="flex-1 text-center text-[28px] font-semibold">{count}</span>

        {/* 加號 */}
        <button
          onClick={increment}
          disabled={count >= MAX_COUNT}
          className="flex h-14 w-14 shrink-0 items-center justify-center disabled:cursor-not-allowed"
        >
          <img src={count >= MAX_COUNT ? noplus : plus} />
        </button>
      </div>
    )
  }

  // Small：102 × 30 (一般)
  return (
    <div className="flex h-7.5 w-25.5 items-center rounded-full border border-[#eadfd8] bg-white">
      {/* 左邊 */}
      {count === 1 ? (
        <button onClick={remove} className="flex h-7.5 w-7.5 shrink-0 items-center justify-center">
          <img src={redtrash} />
        </button>
      ) : (
        <button
          onClick={decrement}
          className="flex h-7.5 w-7.5 shrink-0 items-center justify-center"
        >
          <img src={minus} />
        </button>
      )}

      {/* 數量 */}
      <span className="flex-1 text-center text-[16px] font-semibold">{count}</span>

      {/* 加號 */}
      <button
        onClick={increment}
        disabled={count >= MAX_COUNT}
        className="flex h-7.5 w-7.5 shrink-0 items-center justify-center disabled:cursor-not-allowed"
      >
        <img src={count >= MAX_COUNT ? noplus : plus} />
      </button>
    </div>
  )
}
