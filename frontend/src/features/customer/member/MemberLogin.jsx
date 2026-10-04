import React from 'react'
import {useNavigate} from "react-router";
import CustomerTopBar from '@/components/CustomerTopBar'
import SOFormInput, { SOFormInputType } from '../../../components/input/SOFormInput'
import SOButton from '../../../components/SOButton'
import InfoBox from '../../../components/InfoBox'
import CardMap from '../../../components/card/CardMap'
import { SvgIconMap } from '@/assets/SvgIconMap'

const iconSvg=(Icon)=>{
  return <Icon aria-hidden="true" className="svg-icon mx-3 w-5 h-5 shrink-0 text-brand-600" />
}


export function MemberLogin() {

  const cardData = [
    {
      id: 1,
      data: [
        {
          justify: "start",
          tags: [
            ["p", "會員能做什麼"],
          ],
        },
        {
          justify: "start",
          tags: [["other",iconSvg(SvgIconMap.CardCheck) ],
        ["p", "訂位不用每次重填姓名電話"]],
        },
        {
          justify: "start",
          tags: [
            ["other", iconSvg(SvgIconMap.CardCheck)],
            ["p", "換一支手機也查得到「我的預約」"],
          ],
        },
      ],
    },
  ];

  const navigate=useNavigate();

  



  return (
     <div className="flex h-full w-full flex-col">
    <CustomerTopBar
      title="會員"
      showBackButton={true}
    />
     <div className='flex flex-col w-full justify-center p-page'>
        <h1 className='type-h1 pt-card'>用手機號碼就好</h1>
        <p className='type-body-sm pt-3'>不用設密碼。每次登入都發一次驗證碼。</p>
        <div className='grid grid-cols-1 pt-6 gap-2'>
          <p className='type-caption'>手機號碼</p>
          <div className='bg-surface rounded-btn'>
            <SOFormInput
              type={SOFormInputType.PHONE}
              defaultValue=""
              placeholder="請輸入手機號碼"
              onChange={(e) => console.log(e.target.value)}
            />
          </div >
        </div>
        <div className='pt-section'>
          <SOButton
            text="傳送驗證碼"
            disabled={false}
            height="h-12"
            onClick={() => {
              navigate("/member/verify");
            }}
          />
        </div >
        <div className='pt-section'>
          <InfoBox icon="circle" col="quiet" text="F" custimtext={
            <p>
              <span className='font-semibold'>第一次來也是按這裡</span>。號碼沒登記過，驗證完
              會直接帶你填姓名與生日， 不用先分「登入」
              還是「註冊」。
            </p>
          } />
        </div >
  
        <div className='text-ink-600'><CardMap data={cardData} col="1" /></div >
  
        <div className='flex w-full justify-center pt-section type-body text-ink-600'>
          <a href="/order/checkin">先不登入，繼續</a>
          </div>
     </div >
    </div>
  )
}
