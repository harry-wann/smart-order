import React,{useState} from 'react'
import {useLocation, useNavigate} from "react-router"
import CustomerTopBar from '@/components/CustomerTopBar'
import SOButton from '../../../components/SOButton'
import InfoBox from '../../../components/InfoBox'
import { SvgIconMap } from '@/assets/SvgIconMap'
import Verify from '../../../components/input/Verify'

// 原檔名 opt.jsx
// 原 component 名 Opt

export default function VerifyCode() {
  

  const navigate=useNavigate();
  const location=useLocation();
  const returnTo=location.state?.returnTo;
  const reservationType=location.state?.reservationType;

  const Data={
    phone:"0912-345-678",
    VERIFY:"482913"
  }

  const[leng,setLeng]=useState(6);
  const[code,setCode]=useState("");


  const handleverifycode=()=>{
    if(code!==Data.VERIFY)return

    if (!returnTo) {
      navigate("/member/center")
      return
    }

    navigate(returnTo, {
      state: {
        reservationType,
        ...(reservationType === 'MEMBER'
          ? { contact: { name: '陳小美', phone: Data.phone.replaceAll('-', '') } }
          : {}),
      },
    })
  }


  
  return (
    <div className="flex h-full w-full flex-col">
    <CustomerTopBar
      title="會員登入"
      showBackButton={true}
    />
     <div className='flex flex-col w-full justify-center p-page'>
        <h1 className='type-h1 pt-card'>輸入驗證碼</h1>
        <p className='type-body-sm pt-3'>已傳送 6 位數字到 {Data.phone} 改號碼</p>
        <div className='grid grid-cols-1 pt-6 gap-2'>
          <Verify length={6} defaultValue="" onChange={(value) =>{
                                                            setLeng(pre=>6-value.length)
                                                            setCode(value)}} />
        </div>
        
        <div className='pt-section'>
          <InfoBox outicon={SvgIconMap.OptPhone} col="info" text="F" custimtext={
            <div>
              <p className='font-semibold'>教學專題・模擬簡訊</p>
              不串接真實簡訊閘道。驗證碼是{Data.VERIFY}，
              直接顯示在這裡。
            </div>
          } />
          <InfoBox icon="circle" col="quiet" text="F" custimtext={
            <p>
              驗證碼 5 分鐘內有效，連續錯 3 次會作廢，重新要一次就好。
            </p>
          } />
        </div >

     </div >
     <div className="flex flex-col w-full bg-surface fixed bottom-0 justify-center type-caption pt-2 pb-8 px-3">

            <SOButton
                      text={`確認（還差 ${leng} 碼）`}
                      disabled={leng>0}
                      height="h-12"
                      onClick={() => {
                        handleverifycode();
                      }}
                    />
  
            <a className='flex justify-center w-full py-2 type-body '>先不登入，繼續</a>    
      </div>
    </div>
    
  )
}
