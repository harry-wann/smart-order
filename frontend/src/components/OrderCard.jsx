import { useState } from 'react'
import SOButton from './SOButton'
export default function OrderCard({
  tableName,
  whichorder,
  waitingTime,
  demand,
  onComplete = () => {},
}) {
  const handleCompleteClick = (e) => {
    console.log(e)

    onComplete()?.(tableName, whichorder, waitingTime, demand)
  }
  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-card)] bg-[#33261F] p-5">
      <div className="flex flex-col gap-3">
        <h1 className="type-kds-table text-[#F3EAE0]">{tableName}</h1>

        <div className="flex items-center justify-between text-[#C4B3A6]">
          <p>第{whichorder}單</p>
          <p className="flex items-center gap-1">
            {/* 若未來有時鐘 Icon 可以直接放在這個 p 標籤裡面 */}
            {waitingTime}
          </p>
        </div>
      </div>

      <hr className="text-[#C4B3A6] opacity-30" />

      <div className="mb-2 flex flex-col gap-1">
        <p className="type-h3 text-[#F3EAE0]">{demand}</p>
        <p className="type-body-sm text-[#F3EAE0]"></p>
      </div>

      <SOButton
        // disabled="true"
        onClick={(e) => handleCompleteClick(e)}
        content={[
          <div key="btn-content" className="flex items-center justify-center gap-2">
            <img alt="" />
            <span>整單出完</span>
          </div>,
        ]}
      />
    </div>
  )
}
