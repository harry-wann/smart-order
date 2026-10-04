import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import CustomerTopBar from '../../../components/CustomerTopBar'
import SOFormInput, { SOFormInputType } from '../../../components/input/SOFormInput'
import SOButton from '../../../components/SOButton'
import InfoBox from '../../../components/InfoBox'
import Card from '../../../components/card/primary/Card'
import CardLink from '../../../components/card/CardLink'
import Verify from '../../../components/input/Verify'
import Badge from '../../../components/Badge'

import { SvgIconMap } from '@/assets/SvgIconMap'

// 原檔名 MemberCenter.jsx
// 原 component 名 MemberCenter

export function Center() {
  const navigate = useNavigate()

  const datareserve = {
      date:"9/16",
      day:"三",
      time:"18:30",
      people:"2 位",
    }

    const datamember = {
      name: "陳小美",
      phone: "0912-345-678",
      joinDate: "2024 年 9 月加入",
      joinLongTime: "2"
    }

  const cardData= [
      {
        justify: 'between',
        tags: [
          [
            'other',
              <ul>
                <li>
                  <h2 className='type-h2'>{datamember.name}</h2>
                </li>
                <li>{datamember.phone}</li>
              </ul>
          ],
          ['other', <Badge text={`入會 ${datamember.joinLongTime} 年`} col="plain"/>],
        ],
      },
      {
        justify: 'between',
        tags: [
          [
            'p', datamember.joinDate
          ],
        ],
      }
    ]

  const reserve = {
    icon: SvgIconMap.OrderEntrance,
    textH2: "我的預約",
    textP: `${datareserve.date}（${datareserve.day}）${datareserve.time}・${datareserve.people}`,
    onclick:()=>navigate("/member/reservations?view=member")
  }

  const personal = {
    icon: SvgIconMap.OrderMember,
    textH2: "個人資料",
    textP: "暱稱、生日、手機號碼",
    onclick:()=>navigate("/member")
  }
  const consumption = {
    icon: SvgIconMap.MemberLog,
    textH2: "消費紀錄",
    textP: "每一次來吃了什麼、花了多少",
    onclick:()=>navigate("/member")
  }
  const point = {
    icon: SvgIconMap.MemberPoints,
    textH2: "點數與優惠券",
    textP: "1,248 點・1 張券可用",
    onclick:()=>navigate("/member")
  }
  return (
    <div className="flex h-full w-full flex-col">
    <CustomerTopBar
      title="會員中心"
      children={<SvgIconMap.MemberRighticon role="img" aria-label="head icon" /> }
      showBackButton={true}
    />
     

      <div className='grid grid-cols-1 gap-section p-page'>

        <Card data={cardData} />
        <div className='grid grid-cols-1 gap-2'>
            <CardLink data={reserve} />
            <CardLink data={personal} />
            <CardLink data={consumption} />
            <CardLink data={point} />
          </div>
  
          <InfoBox icon="circle" col="quiet" text="F" custimtext={
              <p>
                訂位時自動帶入你的姓名與手機，不用每次重填。
              </p>
            } />
      </div >
      
  
        <div className="fixed bottom-0 flex w-full flex-col justify-center bg-surface px-3 pt-2 pb-8 type-caption">
  
          <a className="flex w-full justify-center py-2 type-body">登出</a>
      </div>
    </div >
  )
}
