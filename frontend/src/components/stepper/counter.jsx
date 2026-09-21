import { useState } from "react";
import { Trash2, Plus, Minus } from "lucide-react";

export default function Counter({
  size = "small",
  initialCount = 0,
}) {
  const [count, setCount] = useState(initialCount);

  // 最大數量
  const MAX_COUNT = 10;

  // 增加
  const increment = () => {
    if (count < MAX_COUNT) {
      setCount(count + 1);
    }
  };

  // 減少
  const decrement = () => {
    if (count > 1) {
      setCount(count - 1);
    }
  };

  // 刪除
  const remove = () => {
    setCount(0);
  };

  // =========================
  // 數量 = 0
  // 顯示紅色圓形 +
  // =========================
  if (count === 0) {
    return (
      <button
        onClick={increment}
        className="
          flex h-7 w-7
          items-center justify-center
          rounded-full
          bg-red-btn
          text-white
        "
      >
        <Plus size={22} />
      </button>
    );
  }

  // =========================
  // Large：186 × 58
  // =========================
  if (size === "large") {
    return (
      <div
        className="
          flex h-14.5 w-46.5
          items-center
          rounded-full
          border border-[#eadfd8]
          bg-white
        "
      >
        {/* 左邊 */}
        {count === 1 ? (
          <button
            onClick={remove}
            className="
              flex h-14 w-14
              shrink-0 items-center justify-center
              text-red-btn
            "
          >
            <Trash2 size={24} />
          </button>
        ) : (
          <button
            onClick={decrement}
            className="
              flex h-14 w-14
              shrink-0 items-center justify-center
              text-red-btn
            "
          >
            <Minus size={24} />
          </button>
        )}

        {/* 數量 */}
        <span className="flex-1 text-center text-[28px] font-semibold">
          {count}
        </span>

        {/* 加號 */}
        <button
          onClick={increment}
          disabled={count >= MAX_COUNT}
          className="
            flex h-14 w-14
            shrink-0 items-center justify-center
            text-red-btn
            disabled:cursor-not-allowed
            disabled:text-gray-400
          "
        >
          <Plus size={24} />
        </button>
      </div>
    );
  }

  // =========================
  // Small：102 × 30
  // =========================
  return (
    <div
      className="
        flex h-7.5 w-25.5
        items-center
        rounded-full
        border border-[#eadfd8]
        bg-white
      "
    >
      {/* 左邊 */}
      {count === 1 ? (
        <button
          onClick={remove}
          className="
            flex h-7 w-7
            shrink-0 items-center justify-center
            text-red-btn
          "
        >
          <Trash2 size={18} />
        </button>
      ) : (
        <button
          onClick={decrement}
          className="
            flex h-7 w-7
            shrink-0 items-center justify-center
            text-red-btn
          "
        >
          <Minus size={18} />
        </button>
      )}

      {/* 數量 */}
      <span className="flex-1 text-center text-[16px] font-semibold">
        {count}
      </span>

      {/* 加號 */}
      <button
        onClick={increment}
        disabled={count >= MAX_COUNT}
        className="
          flex h-7 w-7
          shrink-0 items-center justify-center
          text-red-btn
          disabled:cursor-not-allowed
          disabled:text-gray-400
        "
      >
        <Plus size={18} />
      </button>
    </div>
  );
}