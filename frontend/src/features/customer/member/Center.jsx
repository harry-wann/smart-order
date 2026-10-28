import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import CustomerTopBar from '../../../components/CustomerTopBar'
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

  const personal = {
    icon: SvgIconMap.OrderMember,
    textH2: '個人資料',
    textP: '暱稱、生日、手機號碼',
    onclick: () => navigate('/member/register', { state: { mode: 'edit' } }),
  }
  // 「消費紀錄」（A1）、「點數與優惠券」（A6）是進階功能，基礎版的會員中心不放這兩個入口（M8 8.7）

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
          <CardLink data={personal} />
        </div>
      </div>

      <div className="fixed bottom-0 flex w-full flex-col justify-center bg-surface px-3 pt-2 pb-8 type-caption">
        <button className="flex w-full justify-center py-2 type-body" onClick={handleLogout}>
          登出
        </button>
      </div>
    </div>
  )
}
