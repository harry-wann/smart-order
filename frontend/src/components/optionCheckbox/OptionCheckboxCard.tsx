import { SvgIconMap } from '@/assets/SvgIconMap'

export type OptionCheckboxCardProps = {
  name: string /** 同一組中的 checkbox 共用此 name。 */
  value: string /** 此選項的識別值，勾選狀態改變時會回傳。 */
  title: string
  desc?: string
  selected?: boolean /** 是否顯示為已勾選；搭配 Group 時由 Group 計算。 */
  disabled?: boolean /** 停用後無法勾選，並套用停用樣式。 */
  onChange?: (value: string, checked: boolean) => void
  /** 選項勾選狀態改變時，回報選項值與新的勾選狀態。 */
}

const OptionCheckboxCard = ({
  name,
  value,
  title,
  desc,
  selected = false,
  disabled = false,
  onChange,
}: OptionCheckboxCardProps) => {
  return (
    <label className={`block ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
      {/* label 讓整張卡片都能點選。 */}
      <input
        className="peer sr-only"
        type="checkbox"
        name={name}
        value={value}
        checked={selected}
        disabled={disabled}
        onChange={(event) => onChange?.(value, event.target.checked)}
      />

      <div
        className={`min-h-14 rounded-card border px-4 py-3 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600 ${
          disabled
            ? 'border-line bg-surface opacity-45'
            : selected
              ? 'border-brand-600 bg-brand-100'
              : 'border-line bg-surface'
        } `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                selected ? 'border-brand-600 bg-brand-600 text-surface' : 'border-line bg-surface'
              }`}
            >
              {selected && <SvgIconMap.CheckboxCheck />}
            </span>

            <span className="type-h3">{title}</span>
          </div>

          {desc && <div className="type-caption">{desc}</div>}
        </div>
      </div>
    </label>
  )
}

export default OptionCheckboxCard
