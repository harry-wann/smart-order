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
import { useMyReservations } from '@/hooks/reservation/useReservationQueries'

// 原檔名 MemberCenter.jsx
// 原 component 名 MemberCenter

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function formatPhone(phone) {
  return phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1-$2-$3')
}

// 從訂位清單找「還沒到、狀態是已確認」裡最早的一筆
function findNextReservation(list) {
  const now = Date.now()
  return (list ?? [])
    .filter((r) => r.status === 'CONFIRMED' && Date.parse(r.startTime) > now)
    .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))[0]
}

// "2026-10-20T18:30:00+08:00" → "10/20（二）18:30・2 位"
// 照組員的註解：顯示用直接切字串，不轉時區，手機設在別的時區也不會顯示錯
function formatReservation(r) {
  const [y, m, d] = r.startTime.slice(0, 10).split('-').map(Number)
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()]
  const time = r.startTime.slice(11, 16)
  return `${m}/${d}（${weekday}）${time}・${r.partySize} 位`
}

export function Center() {
  const navigate = useNavigate()
  const [member, setMember] = useState(null)
  const [error, setError] = useState('')

  // 我的預約（組員寫好的 hook，跟「我的預約」頁同一份資料）
  const reservationsQuery = useMyReservations(true)

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

  // 登出：signOutMember 會清掉 localStorage 的 customer.memberToken 和會員相關的快取
  function handleLogout() {
    signOutMember()
    navigate('/member/login', { replace: true })
  }

  if (error) return <p className="p-page">{error}</p>
  if (!member) return <p className="p-page">載入中…</p>

  // 入會時間
  const joined = new Date(member.createdAt)
  const years = new Date().getFullYear() - joined.getFullYear()

  const datamember = {
    name: member.nickname || '會員',
    phone: formatPhone(member.phone),
    joinDate: `${joined.getFullYear()} 年 ${joined.getMonth() + 1} 月加入`,
    joinLabel: years < 1 ? '新會員' : `入會 ${years} 年`,
  }

  // 「我的預約」下面那行字
  const nextReservation = findNextReservation(reservationsQuery.data)
  const reserveText = reservationsQuery.isPending
    ? '載入中…'
    : nextReservation
      ? formatReservation(nextReservation)
      : '沒有預約'

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
        ['other', <Badge text={datamember.joinLabel} col="plain" />],
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
    textP: reserveText,
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