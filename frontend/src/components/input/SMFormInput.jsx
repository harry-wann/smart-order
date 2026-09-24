import { useState } from 'react'

export const SMFormInputType = {
  NORMAL: 'normal',
  PHONE: 'phone',
}

export default function SMFormInput({
  type = SMFormInputType.NORMAL,
  defaultValue,
  placeholder,
  onChange,
}) {
  const [content, setConent] = useState(defaultValue)

  let isPhone = type == SMFormInputType.PHONE

  return (
    <input
      type={isPhone ? 'tel' : 'text'}
      placeholder={placeholder}
      value={content}
      onChange={(e) => {
        if (isPhone) {
          let phoneStr = e.target.value.replace(/\D/g, '')
          handlePhone(phoneStr, (phone) => {
            setConent(phone)
          })
        } else {
          // setConent(e.target.value)
        }
      }}
      className="h-12 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-[#D74432]"
    />
  )
}

const handlePhone = (e, onPhone) => {
  let number = e.split('-').join('') // 取得輸入的內容，並把 - 拿掉

  number = number.slice(0, 10) // 最多 10 碼

  // 分成 4、3、3
  const first = number.slice(0, 4)
  const second = number.slice(4, 7)
  const third = number.slice(7, 10)

  // 組合電話號碼 (4 - 3 - 3)
  let result = first

  if (second) {
    result = result + '-' + second
  }

  if (third) {
    result = result + '-' + third
  }

  onPhone(result)
}
