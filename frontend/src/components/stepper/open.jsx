import { useState } from "react";

function Open() {
    // 營業開關
    const [isOn, setIsOn] = useState(true);

    // 目前選擇的時間
    const [selectedTime, setSelectedTime] = useState("18:00");

    // 時段資料
    const timeSlots = [
        {
            time: "17:00",
            full: false,
        },
        {
            time: "18:00",
            full: false,
        },
        {
            time: "18:30",
            full: true,
        },
    ];

    return (
        <div className="w-full max-w-140 p-2">
            <p className="mb-4 text-sm text-[#8c6f65]">
                開關與時段
            </p>

            <div className="flex gap-4">

                {/* ON */}
                <div>
                    <button
                        onClick={() => setIsOn(true)}
                        className={`h-7 w-12 rounded-full ${isOn
                            ? "bg-[#3f7f52]"
                            : "bg-[#e5ddd2]"
                            }`}
                    ></button>

                    <p className="mt-2 text-xs text-gray-500">
                        on
                    </p>
                </div>

                {/* OFF */}
                <div>
                    <button
                        onClick={() => setIsOn(false)}
                        className={`h-7 w-12 rounded-full ${!isOn
                            ? "bg-[#3f7f52]"
                            : "bg-[#e5ddd2]"
                            }`}
                    ></button>

                    <p className="mt-2 text-xs text-gray-500">
                        off
                    </p>
                </div>

            </div>

            {/* 時段 */}
            <div className="grid grid-cols-3 gap-2">
                {timeSlots.map((slot) => {
                    const isSelected = selectedTime === slot.time;

                    return (
                        <button
                            key={slot.time}
                            type="button"
                            disabled={slot.full || !isOn} onClick={() => setSelectedTime(slot.time)}
                            className={`h-12 rounded-lg border text-base transition-colors ${slot.full ? "cursor-not-allowed border-dashed border-[#e3dbd0] bg-surface-2 text-[#9C8E84]"
                                : isSelected ? "border-[#d6422f] bg-[#d6422f] font-semibold text-white"
                                    : "border-[#e3dbd0] bg-white text-ink-900 hover:bg-[#faf7f3]"}`}>
                            {slot.time}
                        </button>
                    );
                })}
            </div>

            {/* 說明 */}
            <p className="mt-4 text-xs text-[#9a9087]">
                slot 正常／已選 .on／額滿 full（虛線框、不可點）
            </p>
        </div>
    );
}

export default Open;