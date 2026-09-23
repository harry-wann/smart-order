import { useState } from "react";

function Open() {

    // true = 開；false = 關；預設為「開」
    const [isOn, setIsOn] = useState(true);

    // 預設選擇 18:00
    const [selectedTime, setSelectedTime] = useState("18:00");

    // 時段資料
    const timeSlots = [
        { time: "17:00", full: false },
        { time: "18:00", full: false },
        { time: "18:30", full: true },
    ];

    return (
        <div className="max-w-140 p-2">

            {/* 標題 */}
            <p className="mb-4 text-sm text-[#9C8E84]">
                開關與時段
            </p>

            {/* =====================
                開 / 關
            ===================== */}
            <div className="mb-4 flex gap-4">

                {/* 關 */}
                <div>
                    <button
                        type="button"
                        onClick={() => setIsOn(false)}
                        className={`h-7 w-12 rounded-full 
                          ${!isOn ? "bg-success" : "bg-[#E6DED2]"
                          }`}
                    />

                    <p className="mt-2 text-xs text-gray-500">
                        關
                    </p>
                </div>

                {/* 開 */}
                <div>
                    <button type="button" onClick={() => setIsOn(true)}
                        className={`h-7 w-12 rounded-full 
                          ${isOn ? "bg-success" : "bg-[#E6DED2]"
                            }`}
                    />

                    <p className="mt-2 text-xs text-gray-500">
                        開 .on
                    </p>
                </div>
            </div>

            {/* =====================
                時段
            ===================== */}
            <div className="grid grid-cols-3 gap-2">

                {timeSlots.map((slot) => {
                    // 判斷這個時間是否被選中
                    const isSelected =
                        selectedTime === slot.time;

                    return (
                        <button
                            key={slot.time}
                            type="button"

                            // full 才不能按
                            disabled={slot.full}

                            // 點擊後選擇這個時間
                            onClick={() =>
                                setSelectedTime(slot.time)
                            }

                            className={`
                                h-12
                                rounded-lg
                                border
                                text-base

                                ${
                                // 額滿
                                slot.full
                                    ? "cursor-not-allowed border-dashed border-[#e3dbd0] bg-surface-2 text-[#9C8E84]"

                                    // 被選到
                                    : isSelected
                                        ? "border-[#D74432] bg-[#D74432] font-semibold text-white"

                                        // 正常
                                        : "border-[#e3dbd0] bg-white text-ink-900"
                                }
                            `}
                        >
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