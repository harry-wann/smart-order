import { useState } from 'react'

export const SOFormInputType = {
  NORMAL: 'normal',
  PHONE: 'phone',
}

export default function SOFormInput({
  type = SOFormInputType.NORMAL,
  icon = null,
  defaultValue = '',
  placeholder,
  onChange,
}) {
  const [content, setContent] = useState(defaultValue)

  const isPhone = type === SOFormInputType.PHONE

  const handleChange = (e) => {
    if (isPhone) {
      const phoneStr = e.target.value.replace(/\D/g, '')

      handlePhone(phoneStr, (phone) => {
        setContent(phone)
        onChange?.(phone)
      })
    } else {
      setContent(e.target.value)
      onChange?.(e.target.value)
    }
  }

  return (
    <div className="flex h-12 w-full items-center rounded-lg border border-line px-3 focus-within:border-[#D74432]">
      {/* 有傳 icon 才顯示 */}
      {icon && <img src={icon} alt="" className="mr-3 h-5 w-5" />}

      <input
        type={isPhone ? 'tel' : 'text'}
        placeholder={placeholder}
        value={content}
        onChange={handleChange}
        className="h-full w-full border-none bg-transparent text-sm outline-none"
      />
    </div>
  )
}

const handlePhone = (e, onPhone) => {
  let number = e.split('-').join('')

  number = number.slice(0, 10)

  const first = number.slice(0, 4)
  const second = number.slice(4, 7)
  const third = number.slice(7, 10)

  let result = first

  if (second) {
    result = result + '-' + second
  }

  if (third) {
    result = result + '-' + third
  }

  onPhone(result)
}
