import { useState } from 'react'
import OptionCheckboxCard from './OptionCheckboxCard'

export type OptionCheckboxGroupOption = {
  value: string
  title: string
  desc?: string
  disabled?: boolean
}

export type OptionCheckboxGroupProps = {
  name: string /** 同一組 checkbox 共用的 HTML name。 */
  options: OptionCheckboxGroupOption[]
  /** 受控模式的已選值清單；父層應在 onChange 後更新此清單。 */
  value?: string[]
  /** 非受控模式的初始已選值清單。 */
  defaultValue?: string[]
  /** 使用者勾選或取消勾選有效選項時收到新的已選值清單。 */
  onChange?: (values: string[]) => void
}

const OptionCheckboxGroup = ({
  name,
  options,
  value,
  defaultValue = [],
  onChange,
}: OptionCheckboxGroupProps) => {
  // value 存在時由父層管理；否則用 defaultValue 初始化一次，再由 Group 維護陣列。
  const [internalValues, setInternalValues] = useState(defaultValue)
  const selectedValues = value ?? internalValues
  const isControlled = value !== undefined

  const handleChange = (nextValue: string, checked: boolean) => {
    const option = options.find((item) => item.value === nextValue)

    // 忽略不存在或已停用的選項，避免它們改變已選值。
    if (!option || option.disabled) return

    const nextValues = checked
      ? [...selectedValues, nextValue]
      : selectedValues.filter((selectedValue) => selectedValue !== nextValue)

    // 受控模式只通知父層；非受控模式則由 Group 更新內部陣列。
    if (!isControlled) setInternalValues(nextValues)
    onChange?.(nextValues)
  }

  return (
    <fieldset className="flex min-w-0 flex-col gap-3 border-0 p-0">
      {options.map((option) => (
        <OptionCheckboxCard
          key={option.value}
          name={name}
          value={option.value}
          title={option.title}
          desc={option.desc}
          selected={selectedValues.includes(option.value)}
          disabled={option.disabled}
          onChange={handleChange}
        />
      ))}
    </fieldset>
  )
}

export default OptionCheckboxGroup
