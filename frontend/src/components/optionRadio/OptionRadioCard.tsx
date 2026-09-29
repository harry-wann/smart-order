export type Props = {
  name: string /** 同一組中的選項必須使用相同的 name。 */
  value: string /** 此選項的識別值，選取時會透過 onChange 回傳。 */
  title: string
  desc?: string
  selected?: boolean
  disabled?: boolean
  onChange?: (value: string) => void /** 選項改變時回報該選項的 value。 */
}

const OptionRadioCard = ({
  name,
  value,
  title,
  desc,
  selected = false,
  disabled = false,
  onChange,
}: Props) => {
  return (
    <label className={`block ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
      {/* label 讓整張卡片都能點選。 */}
      <input
        className="peer sr-only"
        type="radio"
        name={name}
        value={value}
        checked={selected}
        disabled={disabled}
        onChange={() => onChange?.(value)}
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
            {selected ? <FilledCircle /> : <EmptyCircle />}

            <span className="type-h3">{title}</span>
          </div>

          {desc && <div className="type-caption">{desc}</div>}
        </div>
      </div>
    </label>
  )
}

export default OptionRadioCard

function EmptyCircle() {
  return <div className="h-6 w-6 rounded-pill border border-line"></div>
}

function FilledCircle() {
  return <div className="h-6 w-6 rounded-pill border-[7px] border-brand-600"></div>
}
