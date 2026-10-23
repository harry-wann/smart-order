import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from "react-router"
import CustomerTopBar from '@/components/CustomerTopBar'
import SOButton from '../../../components/SOButton'
import InfoBox from '../../../components/InfoBox'
import { SvgIconMap } from '@/assets/SvgIconMap'
import Verify from '../../../components/input/Verify'
import { customerClient } from '@/services/client/customerClient'
import { signInMember } from '@/services/client/auth'
import { formatCountdown, useRetryCountdown } from '@/hooks/member/useRetryCountdown'

// 原檔名 opt.jsx
// 原 component 名 Opt

export default function VerifyCode() {

  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo;
  const reservationType = location.state?.reservationType;
  // 「先不登入，繼續」的去處，登入頁依來源算好帶過來；沒帶就回入口頁
  const skipTo = location.state?.skipTo ?? "/";
  // 回登入頁（改號碼）時把來源帶回去，登入完或先不登入才回得到原本那一頁
  const loginState = { returnTo, reservationType, skipTo };

  const phone = location.state?.phone ?? "";
  const displayPhone = phone.replace(/(\d{4})(\d{3})(\d{3})/, "$1-$2-$3");

  // 重新傳送後換成新的驗證碼（測試模式顯示在下面的模擬簡訊）
  const [demoCode, setDemoCode] = useState(location.state?.demoCode ?? "");
  // 重新傳送後換一個 key，讓六格輸入框清空重來
  const [round, setRound] = useState(0);
  const [leng, setLeng] = useState(6);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);              
  const [resending, setResending] = useState(false);
  const { secondsLeft, start: startCountdown } = useRetryCountdown();

  useEffect(() => {
    if (!phone) navigate("/member/login", { replace: true, state: loginState });
  }, []);

  const handleverifycode = async () => {
    setError("");
    setVerifying(true);
    try {
      const { data } = await customerClient.post(
        "/member/verify",
        { phone, code },
        { customerAuth: [] }
      );

      signInMember(data.token);

      if (data.newMember) {
        navigate("/member/register", {
          replace: true,
          state: { returnTo, reservationType, phone },
        });
        return;
      }

      if (!returnTo) {
        navigate("/member/center", { replace: true });           
        return;
      }

      navigate(returnTo, {
        replace: true,                                             
        state: {
          reservationType,
          ...(reservationType === 'MEMBER'
            ? { contact: { name: data.nickname ?? '', phone } }
            : {}),
        },
      });
    } catch (e) {
      setError(e.details?.[0]?.message ?? e.message);
    } finally {
      setVerifying(false);
    }
  }

  // 重新傳送：跟登入頁同一支 API，一樣算在「10 分鐘最多 3 次」裡；超過時後端回 429，按鈕停用並倒數
  const handleResend = async () => {
    setError("");
    setResending(true);
    try {
      const { data } = await customerClient.post("/member/otp", { phone }, { customerAuth: [] });
      setDemoCode(data.demoCode);
      setRound((value) => value + 1);
      setLeng(6);
      setCode("");
    } catch (e) {
      if (e.code === "TOO_MANY_ATTEMPTS") startCountdown(e.retryAfterSeconds ?? 0);
      setError(e.details?.[0]?.message ?? e.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex h-full w-full flex-col">
      <CustomerTopBar title="會員登入" showBackButton={true} />
      <div className='flex flex-col w-full justify-center p-page'>
        <h1 className='type-h1 pt-card'>輸入驗證碼</h1>
        <p className='type-body-sm pt-3'>
          已傳送 6 位數字到 {displayPhone}{" "}
          <button className='underline' onClick={() => navigate("/member/login", { replace: true, state: loginState })}>
            改號碼
          </button>
        </p>
        <div className='grid grid-cols-1 pt-6 gap-2'>
          <Verify key={round} length={6} defaultValue="" onChange={(value) => {
            setLeng(6 - value.length)
            setCode(value)
          }} />
          {error && <p className='type-caption text-red-600'>{error}</p>}
          <div className='flex justify-end'>
            <button
              type='button'
              className='type-body-sm text-ink-600 underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40'
              disabled={resending || verifying || secondsLeft > 0}
              onClick={handleResend}
            >
              {secondsLeft > 0 ? `重新傳送（${formatCountdown(secondsLeft)}）` : resending ? '傳送中…' : '重新傳送'}
            </button>
          </div>
        </div>

        <div className='pt-section'>
          <InfoBox outicon={SvgIconMap.OptPhone} col="info" text="F" custimtext={
            <div>
              <p className='font-semibold'>教學專題・模擬簡訊</p>
              不串接真實簡訊閘道。驗證碼是 {demoCode}，
              直接顯示在這裡。
            </div>
          } />
          <InfoBox icon="circle" col="quiet" text="F" custimtext={
            <p>驗證碼 5 分鐘內有效，連續錯 3 次會作廢，重新要一次就好。</p>
          } />
        </div>
      </div>

      <div className="flex flex-col w-full bg-surface fixed bottom-0 justify-center type-caption pt-2 pb-8 px-3">
        <SOButton
          text={verifying ? "驗證中…" : leng > 0 ? `確認（還差 ${leng} 碼）` : "確認"}
          disabled={leng > 0 || verifying || resending}
          height="h-12"
          onClick={handleverifycode}
        />
        <button type='button' className='flex justify-center w-full py-2 type-body' onClick={() => navigate(skipTo, { replace: true })}>
          先不登入，繼續
        </button>
      </div>
    </div>
  )
}