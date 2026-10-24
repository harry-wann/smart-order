import { useState } from 'react'
import OptionRadioCard from './OptionRadioCard'

export type OptionRadioGroupOption = {
  value: string
  title: string
  desc?: string
  disabled?: boolean
}

/**
 * 單選群組設定。
 * 提供 value 時由父層控制選取值；未提供時以 defaultValue 初始化內部狀態。
 */
export type OptionRadioGroupProps = {
  name: string /** 同一組 radio 共用的 HTML name。 */
  options: OptionRadioGroupOption[]
  value?: string /** 父層應在 onChange 後更新此值。 */
  defaultValue?: string
  /** 使用者選取有效選項時收到新值；allowDeselect 的群組取消選取時收到空字串。 */
  onChange?: (value: string) => void
  /** 再點一次已選的選項可以取消選取（非必選的單選群組用）；預設不可取消。 */
  allowDeselect?: boolean
}

const OptionRadioGroup = ({
  name,
  options,
  value,
  defaultValue = '',
  onChange,
  allowDeselect = false,
}: OptionRadioGroupProps) => {
  // value 存在時讓父層管理狀態；否則用 defaultValue 初始化一次，再由 Group 管理選取狀態。
  const [internalValue, setInternalValue] = useState(defaultValue)
  const selectedValue = value ?? internalValue
  const isControlled = value !== undefined

  const handleChange = (nextValue: string) => {
    const option = options.find((item) => item.value === nextValue)

    // 忽略不存在或已停用的選項，避免它們成為群組選取值。
    if (!option || option.disabled) return

    // 受控模式只通知父層；非受控模式則由 Group 更新自己的選取值。
    if (!isControlled) setInternalValue(nextValue)
    onChange?.(nextValue)
  }

  // 已選的選項又被點一次：非必選的群組可以取消，回報空字串代表「沒有選任何一項」。
  const handleClickSelected = () => {
    if (!allowDeselect) return

    if (!isControlled) setInternalValue('')
    onChange?.('')
  }

  return (
    <fieldset className="flex min-w-0 flex-col gap-3 border-0 p-0" aria-label={name}>
      {options.map((option) => (
        <OptionRadioCard
          key={option.value}
          name={name}
          value={option.value}
          title={option.title}
          desc={option.desc}
          selected={selectedValue === option.value}
          disabled={option.disabled}
          onChange={handleChange}
          onClickSelected={handleClickSelected}
        />
      ))}
    </fieldset>
  )
}

export default OptionRadioGroup
