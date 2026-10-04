import React, { useState } from 'react'
import CustomerTopBar from '../../../components/CustomerTopBar'
import SOFormInput, { SOFormInputType } from '../../../components/input/SOFormInput'
import SOButton from '../../../components/SOButton'
import InfoBox from '../../../components/InfoBox'
import Card from '../../../components/card/primary/Card'
import Time from '../../../components/opentime/Time'
import Verify from '../../../components/input/Verify'
import Badge from '@/components/Badge'

// 原檔名 register.jsx

export function Register() {
  const timeSlots = [
    { time: '女', full: false },
    { time: '男', full: false },
    { time: '不透露', full: false },
  ]

  const cardData= [
        {
          justify: 'between',
          tags: [
            ['h2', '0912-345-678'],
            ['other', <Badge text="已驗證" col="done" />],
          ],
        },
    ]

  return (
    <div className="flex h-full w-full flex-col">
    <CustomerTopBar
      title="完成註冊"
      showBackButton={true}
    />
      <div className="flex w-full flex-col justify-center p-page">
        <h1 className="pt-card type-h1">差幾個欄位就好</h1>
        <p className="pt-3 type-body-sm">留這些是為了叫得出你的名字。都不是必填。</p>
      </div>

      <div className='p-page pt-section'>
        <p className='type-body-sm text-ink-600 pb-2'>手機號碼</p>
        <Card data={cardData} col='dark'/>
        <p className='type-body-sm text-ink-600 pt-card-gap pb-2'>怎麼稱呼你</p>
        <SOFormInput
          type={SOFormInputType.NORMAL}
          defaultValue=""
          placeholder="請輸入姓名"
          onChange={(e) => console.log(e.target.value)}
        />
        <p className='pt-2'>出現在訂位紀錄和櫃檯畫面上</p>
        <p className='type-body-sm text-ink-600 pt-card-gap pb-2'>性別</p>
        <Time timeSlots={timeSlots} defaultValue="18:00" onChange={(time) => console.log(time)} />
        <p className='type-body-sm text-ink-600 pt-card-gap pb-2'>生日</p>
        <input type="date" className="w-full border border-line bg-surface p-2 type-body rounded-btn pb-2" />
        <p>只用在生日優惠，和櫃檯結帳時確認是你本人</p>
  
        <div className='pt-section'>
          <input type="checkbox" id="agree" className='w-6 h-6 type-body-sm accent-brand-600 rounded-check'/>
          <label for="agree" className='pl-2'>
            我同意店家保存我的訂位與消費紀錄。
          </label>
          <a href="#">
            看條款
          </a>
        </div>
        </div>
  
        <div className="fixed bottom-0 flex w-full flex-col justify-center bg-surface px-3 pt-2 pb-8 type-caption">
          <SOButton
            height="h-12"
            text="完成註冊"
            disabled={false}
            onClick={() => {
              console.log('TEST')
            }}
          />
  
          <a className="flex w-full justify-center py-2 type-body">跳過，只留手機就好</a>
      </div>
    </div>
  )
}
