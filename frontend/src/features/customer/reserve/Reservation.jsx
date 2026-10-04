import React, { useState } from 'react'
import CustomerTopBar from '@/components/CustomerTopBar'
import SOFormInput, { SOFormInputType } from '../../../components/input/SOFormInput'
import SOButton from '../../../components/SOButton'
import InfoBox from '../../../components/InfoBox'
import Card from '../../../components/card/primary/Card'
import CardLink from '../../../components/card/CardLink'
import Verify from '../../../components/input/Verify'
import Badge from '../../../components/Badge'

import { SvgIconMap } from '@/assets/SvgIconMap'

// 原檔名 reservation.jsx

export function Reservation() {
  const cardData = [
    {
      justify: 'between',
      tags: [
        [
          'other',
          <div className="flex">
            <SvgIconMap.OrderMember />
            <h2 className="type-h2">用會員訂</h2>
          </div>,
        ],
        ['other', <Badge text="建議" col="rec" />],
      ],
    },
    {
      justify: 'start',
      tags: [
        [
          'other',
          <div className="flex">
            <SvgIconMap.InfoboxCheck aria-hidden="true" className="svg-icon h-5 w-5 shrink-0 text-brand-600" />
            <h2 className="type-body-sm">姓名電話自動帶入，不用每次重填</h2>
          </div>,
        ],
      ],
    },
    {
      justify: 'start',
      tags: [
        [
          'other',
          <div className="flex">
            <SvgIconMap.InfoboxCheck aria-hidden="true" className="svg-icon h-5 w-5 shrink-0 text-brand-600" />
            <h2 className="type-body-sm">換手機也找得到，隨時查看或取消</h2>
          </div>,
        ],
      ],
    },
    {
      justify: 'start',
      tags: [
        [
          'other',
          <div className="flex">
            <SvgIconMap.InfoboxCheck aria-hidden="true" className="svg-icon h-5 w-5 shrink-0 text-brand-600" />
            <h2 className="type-body-sm">所有訂位在「我的預約」一次看完</h2>
          </div>,
        ],
      ],
    },
    {
  justify: 'center',
  tags: [
    [
      'other',
      <div className="w-[301px]">
        <SOButton
          height="h-12"
          text="登入／註冊會員"
          disabled={false}
        />
      </div>
    ],
  ],
},
  ]
  const cardData2 = [
    {
      justify: 'start',
      tags: [
        [
          'other',
          <div className="flex">
            <SvgIconMap.CartTime />
            <h2 className="type-h2">用會員訂</h2>
          </div>,
        ],
      ],
    },
    {
      justify: 'start',
      tags: [
        [
          'other',
          <p>留姓名與手機就好。<span className='font-semibold'>這支手機會記住你的訂位</span>，一樣可以回來查看或取消； 換手機或清除瀏覽資料後要查詢，再打電話給店家。</p>
        ],
      ],
    },{
  justify: 'center',
  tags: [
    [
      'other',
      <div className="w-[301px]">
        <SOButton
          height="h-12"
          variant = 'secondary'
          text="登入／註冊會員"
          disabled={false}
        />
      </div>
    ],
  ],
}
    
  ]
  return (
    <div className="flex h-full w-full flex-col">
    <CustomerTopBar
      title="會員"
      showBackButton={true}
    />

      <div className='grid grid-cols-1 gap-card-gap p-page'>
        <h1 className='type-h2'>要用會員身分訂嗎？</h1>
        <p className='type-body-sm '>兩種都能訂到位子，差別在之後方不方便。</p>
  
        <div className="grid grid-cols-1 w-full gap-section p-page">
          <Card data={cardData} />
          <Card data={cardData2} />
  
          <InfoBox
            icon="circle"
            col="quiet"
            text="F"
            custimtext={<p>登入完會回到這裡繼續訂位，已經填的不會不見。</p>}
          />
        </div>
      </div>
    </div>
  )
}
