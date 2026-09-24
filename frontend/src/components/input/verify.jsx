import { useRef, useState } from 'react'

export default function Verify({ length = 6, defaultValue = '', onChange }) {
  // 將 defaultValue 轉成陣列
  // 例如 "48291" → ['4', '8', '2', '9', '1', '']
  const [code, setCode] = useState(() => {
    const initialCode = defaultValue.split('').slice(0, length)

    while (initialCode.length < length) {
      initialCode.push('')
    }

    return initialCode
  })

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

    // 將陣列組合成字串
    // ['4', '8', '2', '', '', ''] → "482"
    const codeString = newCode.join('')

    // 將結果傳回父元件
    onChange?.(codeString)

    // 有輸入數字，而且不是最後一格
    // 自動跳到下一格
    if (newValue && index < length - 1) {
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
      <div className="p-2">
        <p className="mb-4 text-sm text-[#8c8177]">驗證碼</p>

        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))`,
          }}
        >
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
              onChange={(e) => {
                handleCodeChange(index, e.target.value)
              }}
              onKeyDown={(e) => {
                handleKeyDown(index, e)
              }}
              className={`h-12 w-full rounded-md border text-center text-xl font-semibold outline-none ${
                number ? 'border-[#D74432]' : 'border-[#E6DED2]'
              } focus:border-[#D74432]`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
