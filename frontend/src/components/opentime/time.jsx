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
      <p className="text-text-secondary mb-4 text-sm">時段</p>

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
                  ? 'cursor-not-allowed border-dashed border-line bg-surface-2 text-ink-400'
                  : isSelected
                    ? 'border-brand-600 bg-brand-600 font-semibold text-surface'
                    : 'border-line bg-surface text-ink-900'
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
