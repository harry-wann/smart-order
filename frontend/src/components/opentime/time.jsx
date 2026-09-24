import { useState } from 'react'

export default function TimeSlot({ timeSlots = [], defaultValue = '', onChange }) {
  // 目前選擇的時間
  const [selectedTime, setSelectedTime] = useState(defaultValue)

  // 選擇時間
  const handleSelect = (time) => {
    setSelectedTime(time)

    // 將選擇的時間傳回 DS03
    onChange?.(time)
  }

  return (
    <div className="max-w-140 p-2">
      <p className="mb-4 text-sm text-[#9C8E84]">時段</p>

      <div className="grid grid-cols-3 gap-2">
        {timeSlots.map((slot) => {
          // 判斷目前時段是否被選中
          const isSelected = selectedTime === slot.time

          return (
            <button
              key={slot.time}
              type="button"
              disabled={slot.full}
              onClick={() => handleSelect(slot.time)}
              className={`h-12 rounded-lg border text-base ${
                slot.full
                  ? 'cursor-not-allowed border-dashed border-[#e3dbd0] bg-surface-2 text-[#9C8E84]'
                  : isSelected
                    ? 'border-[#D74432] bg-[#C8442E] font-semibold text-white'
                    : 'border-[#e3dbd0] bg-surface text-ink-900'
              }`}
            >
              {slot.time}
            </button>
          )
        })}
      </div>
    </div>
  )
}
