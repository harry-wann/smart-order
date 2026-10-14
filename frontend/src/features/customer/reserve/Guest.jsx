import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import CustomerTopBar from '../../../components/CustomerTopBar'
import SOFormInput, { SOFormInputType } from '../../../components/input/SOFormInput'
import SOButton from '../../../components/SOButton'
import InfoBox from '../../../components/InfoBox'
import Card from '../../../components/card/primary/Card'
import Time from '../../../components/opentime/Time'

import Verify from '../../../components/input/Verify'
import Badge from '../../../components/Badge'

// 原檔名 guest.jsx

const PHONE_PATTERN = /^09\d{8}$/
// 跟後端 @Email 一樣寬鬆：有 @、兩邊都有字就好
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/

export function Guest() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  // 聯絡資料帶到下一頁（C-16c），在那裡跟時段一起送出
  function handleNext() {
    const contact = { name: name.trim(), phone: phone.replace(/\D/g, ''), email: email.trim() }
    if (!contact.name) return setError('請填寫姓名')
    if (!PHONE_PATTERN.test(contact.phone)) return setError('手機號碼格式為 09 開頭共 10 碼')
    if (contact.email && !EMAIL_PATTERN.test(contact.email)) return setError('電子信箱格式不正確')
    navigate('/reserve/datetime', { state: { contact, reservationType: 'GUEST' } })
  }

  return (
    <div className="flex h-full w-full flex-col">
    <CustomerTopBar
      title="直接訂位"
      subTitle="不註冊"
      showBackButton={true}
    />

      <div className="grid grid-cols-1 gap-card p-page">
        <h1 className="type-h1">留個聯絡方式</h1>
        <p className="type-body-sm text-ink-600">位子滿了或時段有變動，店家會用這支電話通知你。</p>
        <div className="grid grid-cols-1 gap-card-gap">
          <div className="flex items-center gap-1">
            <span className="type-caption text-ink-600">姓名</span>
            <Badge text="必填" col="hot" />
          </div>
          <div className="bg-surface rounded-btn">
            <SOFormInput
              type={SOFormInputType.NORMAL}
              // icon={SearchIcon} // 不需要icon的時候這列直接註解掉
              defaultValue=""
              placeholder="請輸入姓名"
              onChange={setName}
            />
          </div >
          <p className='text-ink-600'>到店時服務生會叫這個名字</p>
        </div>
        <div className="grid grid-cols-1 gap-card-gap">
          <div className="flex items-center gap-1">
            <span className="type-caption text-ink-600">手機號碼</span>
            <Badge text="必填" col="hot" />
          </div>
          <div className="bg-surface rounded-btn">
            <SOFormInput
              type={SOFormInputType.PHONE}
              defaultValue=""
              placeholder="請輸入手機號碼"
              onChange={setPhone}
            />
          </div >
          <p className='text-ink-600'>到店報這支號碼查訂位</p>
        </div>
        <div className="grid grid-cols-1 gap-card-gap">
          <div className="flex gap-2">
            <span className="type-caption text-ink-600">電子信箱</span>
            <span className="type-caption text-ink-600">選填</span>
          </div>
          <div className="bg-surface rounded-btn">
            <SOFormInput
              type={SOFormInputType.NORMAL}
              // icon={SearchIcon} // 不需要icon的時候這列直接註解掉
              defaultValue=""
              placeholder="請輸入電子信箱"
              onChange={setEmail}
            />
          </div >
        </div>

        <InfoBox
          icon="circle"
          col="quiet"
          text="F"
          custimtext={
            <p>
              訂位完成後，這支手機就記住了。 可以隨時回來查看或取消，不用帳號。
              換手機或清除瀏覽資料後要查詢，請來電 02- 2591-xxxx。
            </p>
          }
        />
      </div>

      <div className="fixed bottom-0 flex w-full flex-col justify-center bg-surface px-3 pt-2 pb-8 type-caption">
        {error && <p className="pb-2 text-center type-body-sm text-danger">{error}</p>}
        <SOButton
        height="h-12"
          text="下一步，選時間"
          disabled={false}
          onClick={handleNext}
        />
        <button type="button" onClick={() => navigate('/reserve')} className="flex w-full justify-center py-2 type-body">
          改用會員身分訂
        </button>
      </div>
    </div>
  )
}
