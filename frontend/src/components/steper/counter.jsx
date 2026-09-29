import { useState } from 'react'
import minus from '../../assets/ic_counter_minus.svg'
import plus from '../../assets/ic_counter_plus.svg'
import redplus from '../../assets/ic_counter_redplus.svg'
import redtrash from '../../assets/ic_counter_redtrash.svg'
import noplus from '../../assets/ic_counter_noplus.svg'

export default function Counter({ size = 'small', initialCount = 0, onChange, showTrash = true }) {
  const [count, setCount] = useState(initialCount)

  const MAX_COUNT = 10

  // 增加
  const increment = () => {
    if (count < MAX_COUNT) {
      const newCount = count + 1

      setCount(newCount)
      onChange?.(newCount)
    }
  }

  // 減少
  const decrement = () => {
    // 數量大於 1 → 正常減 1
    if (count > 1) {
      const newCount = count - 1

      setCount(newCount)
      onChange?.(newCount)

      return
    }

    // 數量 = 1，而且不顯示垃圾桶
    // 按減號等於刪除
    if (count === 1 && !showTrash) {
      setCount(0)
      onChange?.(0)
    }
  }

  // 刪除
  const remove = () => {
    setCount(0)
    onChange?.(0)
  }

  // 數量 = 0
  if (count === 0) {
    return (
      <button
        type="button"
        onClick={increment}
        className="flex h-7 w-7 items-center justify-center"
      >
        <img src={redplus} alt="增加" />
      </button>
    )
  }

  // =========================
  // Large
  // =========================
  if (size === 'large') {
    return (
      <div className="flex h-14.5 w-46.5 items-center rounded-full border border-line bg-surface">
        {/* 左邊 */}
        {count === 1 && showTrash ? (
          <button
            type="button"
            onClick={remove}
            className="flex h-14 w-14 shrink-0 items-center justify-center"
          >
            <img src={redtrash} alt="刪除" />
          </button>
        ) : (
          <button
            type="button"
            onClick={decrement}
            className="flex h-14 w-14 shrink-0 items-center justify-center"
          >
            <img src={minus} alt="減少" />
          </button>
        )}

        {/* 數量 */}
        <span className="flex-1 text-center text-[28px] font-semibold">{count}</span>

        {/* 加號 */}
        <button
          type="button"
          onClick={increment}
          disabled={count >= MAX_COUNT}
          className="flex h-14 w-14 shrink-0 items-center justify-center disabled:cursor-not-allowed"
        >
          <img src={count >= MAX_COUNT ? noplus : plus} alt="增加" />
        </button>
      </div>
    )
  }

  // =========================
  // Small
  // =========================
  return (
    <div className="flex h-7.5 w-25.5 items-center rounded-full border border-line bg-surface">
      {/* 左邊 */}
      {count === 1 && showTrash ? (
        <button
          type="button"
          onClick={remove}
          className="flex h-7.5 w-7.5 shrink-0 items-center justify-center"
        >
          <img src={redtrash} alt="刪除" />
        </button>
      ) : (
        <button
          type="button"
          onClick={decrement}
          className="flex h-7.5 w-7.5 shrink-0 items-center justify-center"
        >
          <img src={minus} alt="減少" />
        </button>
      )}

      {/* 數量 */}
      <span className="flex-1 text-center text-[16px] font-semibold">{count}</span>

      {/* 加號 */}
      <button
        type="button"
        onClick={increment}
        disabled={count >= MAX_COUNT}
        className="flex h-7.5 w-7.5 shrink-0 items-center justify-center disabled:cursor-not-allowed"
      >
        <img src={count >= MAX_COUNT ? noplus : plus} alt="增加" />
      </button>
    </div>
  )
}
