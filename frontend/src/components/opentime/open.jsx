import { useState } from 'react'

export default function Open({ defaultValue = true, onChange }) {
  // true = 開
  // false = 關
  const [isOn, setIsOn] = useState(defaultValue)

  // 修改開關狀態
  const handleChange = (value) => {
    setIsOn(value)

    // 將新的狀態傳回 DS03
    onChange?.(value)
  }

  return (
    <div className="max-w-140 p-2">
      <p className="text-text-secondary mb-4 text-sm">開關</p>

      <div className="flex gap-4">
        {/* 關 */}
        <div>
          <button
            type="button"
            onClick={() => handleChange(false)}
            className={`h-7 w-12 rounded-full ${!isOn ? 'bg-success' : 'bg-line'}`}
          />

          <p className="mt-2 text-xs text-gray-500">關</p>
        </div>

        {/* 開 */}
        <div>
          <button
            type="button"
            onClick={() => handleChange(true)}
            className={`h-7 w-12 rounded-full ${isOn ? 'bg-success' : 'bg-line'}`}
          />

          <p className="mt-2 text-xs text-gray-500">開 </p>
        </div>
      </div>
    </div>
  )
}
