import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import CustomerTopBar from '../../../components/CustomerTopBar'
import SOFormInput, { SOFormInputType } from '../../../components/input/SOFormInput'
import SOButton from '../../../components/SOButton'
import Card from '../../../components/card/primary/Card'
import Time from '../../../components/opentime/Time'
import Badge from '@/components/Badge'
import { customerClient } from '@/services/client/customerClient'

// 原檔名 register.jsx

const GENDER_TO_API = { '女': 'FEMALE', '男': 'MALE', '不透露': 'OTHER' }
const GENDER_TO_LABEL = { FEMALE: '女', MALE: '男', OTHER: '不透露' }

export function Register() {
  const navigate = useNavigate()
  const location = useLocation()
  const isEdit = location.state?.mode === 'edit'        
  const returnTo = location.state?.returnTo
  const reservationType = location.state?.reservationType

  const [phone, setPhone] = useState(location.state?.phone ?? '')
  const [nickname, setNickname] = useState('')
  const [gender, setGender] = useState(null)               
  const [birthDate, setBirthDate] = useState('')
  const [agree, setAgree] = useState(false)
  const [loaded, setLoaded] = useState(!isEdit)           
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    customerClient
      .get('/member/me', { customerAuth: ['member'] })
      .then(({ data }) => {
        setPhone(data.phone)
        setNickname(data.nickname ?? '')
        setGender(GENDER_TO_LABEL[data.gender] ?? null)
        setBirthDate(data.birthDate ?? '')
        setLoaded(true)
      })
      .catch((e) => {
        if (e.status === 401) {
          navigate('/member/login', { replace: true })
          return
        }
        setError(e.message)
        setLoaded(true)
      })
  }, [])

  const displayPhone = phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1-$2-$3')

  const timeSlots = [
    { time: '女', full: false },
    { time: '男', full: false },
    { time: '不透露', full: false },
  ]

  const cardData = [
    {
      justify: 'between',
      tags: [
        ['h2', displayPhone],
        ['other', <Badge text="已驗證" col="done" />],
      ],
    },
  ]

  function goNext(name) {
    if (isEdit || !returnTo) {
      navigate('/member/center', { replace: true })
      return
    }
    navigate(returnTo, {
      replace: true,
      state: {
        reservationType,
        ...(reservationType === 'MEMBER' ? { contact: { name, phone } } : {}),
      },
    })
  }

  async function saveProfile(skip) {
    setError('')
    setSaving(true)
    try {
      const body = skip
        ? { nickname: null, gender: null, birthDate: null }
        : {
            nickname: nickname.trim() || null,
            gender: GENDER_TO_API[gender] ?? null,
            birthDate: birthDate || null,
          }

      await customerClient.put('/member/me/profile', body, { customerAuth: ['member'] })
      goNext(body.nickname)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) return <p className="p-page">載入中…</p>

  return (
    <div className="flex h-full w-full flex-col">
      <CustomerTopBar title={isEdit ? '個人資料' : '完成註冊'} showBackButton={true} />

      <div className="flex w-full flex-col justify-center p-page">
        <h1 className="pt-card type-h1">{isEdit ? '修改你的資料' : '差幾個欄位就好'}</h1>
        <p className="pt-3 type-body-sm">留這些是為了叫得出你的名字。都不是必填。</p>
      </div>

      <div className="p-page pt-section">
        <p className="type-body-sm text-ink-600 pb-2">手機號碼</p>
        <Card data={cardData} col="dark" />

        <p className="type-body-sm text-ink-600 pt-card-gap pb-2">怎麼稱呼你</p>
        <SOFormInput
          type={SOFormInputType.NORMAL}
          defaultValue={nickname}
          placeholder="請輸入姓名"
          onChange={(value) => setNickname(value)}
        />
        <p className="pt-2">出現在訂位紀錄和櫃檯畫面上</p>

        <p className="type-body-sm text-ink-600 pt-card-gap pb-2">性別</p>
        <Time timeSlots={timeSlots} defaultValue={gender} onChange={(value) => setGender(value)} />

        <p className="type-body-sm text-ink-600 pt-card-gap pb-2">生日</p>
        <input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="w-full border border-line bg-surface p-2 type-body rounded-btn pb-2"
        />
        <p>只用在生日優惠，和櫃檯結帳時確認是你本人</p>

        {!isEdit && (
          <div className="pt-section">
            <input
              type="checkbox"
              id="agree"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="w-6 h-6 type-body-sm accent-brand-600 rounded-check"
            />
            <label htmlFor="agree" className="pl-2">
              我同意店家保存我的訂位與消費紀錄。
            </label>
            <a href="#">看條款</a>
          </div>
        )}

        {error && <p className="type-caption text-red-600 pt-2">{error}</p>}
      </div>

      <div className="fixed bottom-0 flex w-full flex-col justify-center bg-surface px-3 pt-2 pb-8 type-caption">
        <SOButton
          height="h-12"
          text={saving ? '儲存中…' : isEdit ? '儲存' : '完成註冊'}
          disabled={(!isEdit && !agree) || saving}
          onClick={() => saveProfile(false)}
        />

        {!isEdit && (
          <button
            className="flex w-full justify-center py-2 type-body"
            disabled={saving}
            onClick={() => saveProfile(true)}
          >
            跳過，只留手機就好
          </button>
        )}
      </div>
    </div>
  )
}