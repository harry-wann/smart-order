import time from '../assets/ic_cart_time.svg'
import SOButton from './SOButton'
export default function OrderCard({
  tableName,
  whichorder,
  waitingTime,
  demand,
  onToggle,
  onComplete,
}) {
  const handleCompleteClick = (e) => {
    console.log(e)

    onComplete()?.(tableName, whichorder, waitingTime, demand)
  }

  return (
    <div className="flex flex-col gap-4 rounded-(--radius-card) bg-(--ordercard-brown) p-5">
      <div className="flex flex-col gap-3">
        <h1 className="type-kds-table text-(--ordercard-tableName)">{tableName}</h1>

        <div className="flex items-center justify-between text-(--ordercard-whichorderhr)">
          <p>第{whichorder}單</p>
          <p className="flex items-center gap-1">
            <img src={time} />
            <span>{waitingTime} 分</span>
          </p>
        </div>
      </div>

      <hr className="text-(--ordercard-whichorderhr) opacity-30" />

      <div className="mb-2 flex flex-col gap-1">
        {Array.isArray(demand) &&
          demand.map((value) => (
            <label key={value.id} className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={value.isCompleted}
                onChange={() => onToggle(value.id)}
              />
              <div
                className={`type-h3 ${value.isCompleted ? 'text-gray-400 line-through' : 'text-(--ordercard-isCompleted)'}`}
              >
                <p className="type-h3">{value.demand}</p>
                <p className="type-body-sm">{value.customized}</p>
              </div>
            </label>
          ))}
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
