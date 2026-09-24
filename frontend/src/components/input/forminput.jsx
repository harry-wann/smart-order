import { useState } from 'react'

function FormInput({ content }) {
  // 一般輸入框資料
  const [name, setName] = useState('陳小美')
  const [phone, setPhone] = useState('0912-345-678')

  const handlePhone = (e) => {
    let number = e.target.value.split('-').join('') // 取得輸入的內容，並把 - 拿掉

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

    setPhone(result)
  }
  const [note, setNote] = useState('備註：不要太生，謝謝')

  return (
    <div className="w-full max-w-140 bg-white">
      {/* ===================== 輸入框 ===================== */}
      <div className="p-2">
        <p className="mt-1 mb-3 text-xs text-[#9C8E84]">空 placeholder 用 ph-text</p>

        {/* 姓名 */}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-12 w-full rounded-lg border border-[#E6DED2] px-3 text-sm outline-none focus:border-[#D74432]"
        />

        <p className="mt-1 mb-3 text-xs text-[#9C8E84]">已填</p>

        {/* 電話 */}
        <input
          type="tel"
          value={phone}
          onChange={handlePhone}
          placeholder="請輸入手機號碼"
          className="h-12 w-full rounded-lg border border-[#E6DED2] px-3 text-sm outline-none focus:border-[#D74432]"
        />

        <p className="mt-1 mb-3 text-xs text-[#9C8E84]">聚焦 .on</p>

        {/* 備註 */}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-12 w-full resize-none rounded-lg border border-[#E6DED2] p-3 text-sm outline-none focus:border-[#D74432]"
        />

        <p className="mt-1 text-xs text-[#9C8E84]">多行 .ta</p>
      </div>
      {/* 分隔線 */}
      <div className="h-3 bg-[#F8F3EB]" />
    </div>
  )
}

export default FormInput
