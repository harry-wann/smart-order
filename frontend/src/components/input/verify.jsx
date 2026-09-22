import { useRef, useState } from 'react'
import SearchIcon from '../../assets/ic_verify_search.svg'

function Input() {
  // 驗證碼
  const [code, setCode] = useState(['4', '8', '2', '9', '1', ''])

  // 用來控制每一格 input
  const inputRefs = useRef([])

  // 輸入驗證碼
  const handleCodeChange = (index, value) => {
    // 只允許數字
    if (!/^\d*$/.test(value)) {
      return
    }

    // 只取最後一個數字
    const newValue = value.slice(-1)

    // 複製原本的驗證碼
    const newCode = [...code]

    // 修改目前這一格
    newCode[index] = newValue

    // 更新 state
    setCode(newCode)

    // 有輸入數字，而且不是最後一格
    // 自動跳到下一格
    if (newValue && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  // 按鍵盤 Backspace
  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && code[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  return (
    <div className="w-full max-w-140 bg-white">
      {/* ===================== 驗證碼 ===================== */}
      <div className="p-2">
        <p className="mb-4 text-sm text-[#8c8177]">驗證碼</p>

        <div className="grid grid-cols-6 gap-2">
          {code.map((number, index) => (
            <input
              key={index}
              ref={(element) => {
                inputRefs.current[index] = element
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={number}

              onChange={(e) => handleCodeChange(index, e.target.value)}

              onKeyDown={(e) => handleKeyDown(index, e)}

              className={`h-12 w-full rounded-md border text-center text-xl font-semibold outline-none ${
                number ? 'border-[#D74432]' : 'border-[#E6DED2]'
              } focus:border-[#D74432]`}
            />
          ))}
        </div>

        <p className="mt-2 text-xs text-[#9C8E84]">
          填過的格子 on（brand-600 內框），待輸入的格子維持 border
        </p>
      </div>

      {/* 分隔線 */}
      <div className="h-3 bg-[#F8F3EB]" />

      {/* ===================== 搜尋列 ===================== */}
      <div className="p-2">
        <p className="mb-4 text-sm text-[#8c8177]">搜尋列</p>

        <div className="flex h-12 items-center rounded-lg border border-[#E6DED2] px-3 focus-within:border-[#D74432]">
          {/* 搜尋 icon */}
          <span className="mr-2 text-gray-400">
            <img src={SearchIcon} />
          </span>

          <input
            type="text"
            placeholder="搜尋菜色"
            className="w-full bg-transparent text-sm outline-none placeholder:text-[#9C8E84]"
          />
        </div>
      </div>
    </div>
  )
}

export default Input
