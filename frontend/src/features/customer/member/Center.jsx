import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import CustomerTopBar from '../../../components/CustomerTopBar'
import InfoBox from '../../../components/InfoBox'
import Card from '../../../components/card/primary/Card'
import CardLink from '../../../components/card/CardLink'
import Badge from '../../../components/Badge'
import { SvgIconMap } from '@/assets/SvgIconMap'
import { customerClient } from '@/services/client/customerClient'
import { signOutMember } from '@/services/client/auth'

// 原檔名 MemberCenter.jsx
// 原 component 名 MemberCenter

function formatPhone(phone) {
  return phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1-$2-$3')
}

export function Center() {
  const navigate = useNavigate()
  const [member, setMember] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    customerClient
      .get('/member/me', { customerAuth: ['member'] })   
      .then(({ data }) => setMember(data))
      .catch((e) => {
        if (e.status === 401) {
          navigate('/member/login', { replace: true })
          return
        }
        setError(e.message)
      })
  }, [])

  function handleLogout() {
    signOutMember()
    navigate('/member/login', { replace: true })
  }

  if (error) return <p className="p-page">{error}</p>
  if (!member) return <p className="p-page">載入中…</p>

  // 入會時間
  const joined = new Date(member.createdAt)
  const joinYears = Math.max(1, new Date().getFullYear() - joined.getFullYear())

  const datamember = {
    name: member.nickname || '會員',   
    phone: formatPhone(member.phone),
    joinDate: `${joined.getFullYear()} 年 ${joined.getMonth() + 1} 月加入`,
    joinLongTime: joinYears,
  }

  const datareserve = {
    date: '9/16',
    day: '三',
    time: '18:30',
    people: '2 位',
  }

  const cardData = [
    {
      justify: 'between',
      tags: [
        [
          'other',
          <ul>
            <li>
              <h2 className="type-h2">{datamember.name}</h2>
            </li>
            <li>{datamember.phone}</li>
          </ul>,
        ],
        ['other', <Badge text={`入會 ${datamember.joinLongTime} 年`} col="plain" />],
      ],
    },
    {
      justify: 'between',
      tags: [['p', datamember.joinDate]],
    },
  ]

  const reserve = {
    icon: SvgIconMap.OrderEntrance,
    textH2: '我的預約',
    textP: `${datareserve.date}（${datareserve.day}）${datareserve.time}・${datareserve.people}`,
    onclick: () => navigate('/member/reservations?view=member'),
  }
  const personal = {
    icon: SvgIconMap.OrderMember,
    textH2: '個人資料',
    textP: '暱稱、生日、手機號碼',
    onclick: () => navigate('/member/register', { state: { mode: 'edit' } }),
  }
  const consumption = {
    icon: SvgIconMap.MemberLog,
    textH2: '消費紀錄',
    textP: '每一次來吃了什麼、花了多少',
    onclick: () => navigate('/member'),
  }
  const point = {
    icon: SvgIconMap.MemberPoints,
    textH2: '點數與優惠券',
    textP: '1,248 點・1 張券可用',
    onclick: () => navigate('/member'),
  }

  return (
    <div className="flex h-full w-full flex-col">
      <CustomerTopBar
        title="會員中心"
        children={<SvgIconMap.MemberRighticon role="img" aria-label="head icon" />}
        showBackButton={true}
      />

      <div className="grid grid-cols-1 gap-section p-page">
        <Card data={cardData} />
        <div className="grid grid-cols-1 gap-2">
          <CardLink data={reserve} />
          <CardLink data={personal} />
          <CardLink data={consumption} />
          <CardLink data={point} />
        </div>

        <InfoBox
          icon="circle"
          col="quiet"
          text="F"
          custimtext={<p>訂位時自動帶入你的姓名與手機，不用每次重填。</p>}
        />
      </div>

      <div className="fixed bottom-0 flex w-full flex-col justify-center bg-surface px-3 pt-2 pb-8 type-caption">
        <button className="flex w-full justify-center py-2 type-body" onClick={handleLogout}>
          登出
        </button>
      </div>
    </div>
  )
}