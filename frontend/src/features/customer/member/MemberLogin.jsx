import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import CustomerTopBar from "@/components/CustomerTopBar";
import SOFormInput, { SOFormInputType } from "../../../components/input/SOFormInput";
import SOButton from "../../../components/SOButton";
import InfoBox from "../../../components/InfoBox";
import { customerClient } from "@/services/client/customerClient";
import { customerTokens } from "@/services/client/tokenStore";   
import { formatCountdown, useRetryCountdown } from "@/hooks/member/useRetryCountdown";

// 驗證碼頁按「先不登入」時回到原本的位置。
function skipLoginPath(state) {
  // 驗證碼頁按「改號碼」回來時，已經算好帶回來了
  if (state?.skipTo) return state.skipTo;
  // 掃碼入桌頁：回那一桌。入桌頁目前還沒有會員登入的入口，之後加的話帶 state: { tableNo } 進來
  if (state?.tableNo) return `/order/checkin/${state.tableNo}`;
  // 入口頁的「會員登入」或直接打網址：回入口頁 C-00
  return "/";
}

export function MemberLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo;
  const skipTo = skipLoginPath(location.state);

  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");          
  const [sending, setSending] = useState(false);   
  // 被限流的是哪支手機：換一支號碼就不用等
  const [limitedPhone, setLimitedPhone] = useState("");
  const { secondsLeft, start: startCountdown } = useRetryCountdown();

  const cleanPhone = phone.replace(/\D/g, ""); 
  const waiting = secondsLeft > 0 && limitedPhone === cleanPhone;

  async function handleSendCode() {
  setError("");
  setSending(true);
  try {
    const { data } = await customerClient.post("/member/otp", { phone: cleanPhone }, { customerAuth: [] });
    navigate("/member/verify", {
      state: { returnTo, skipTo, phone: cleanPhone, demoCode: data.demoCode },
    });
    } catch (e) {
      // 同一支手機 10 分鐘內要超過 3 次：後端回 429 和還要等幾秒，按鈕停用並倒數
      if (e.code === "TOO_MANY_ATTEMPTS") {
        setLimitedPhone(cleanPhone);
        startCountdown(e.retryAfterSeconds ?? 0);
      }
      // 手機格式不對時，後端把哪裡不對放在 details
      setError(e.details?.[0]?.message ?? e.message);
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (customerTokens.member.get()) {
      navigate(returnTo ?? "/member/center", { replace: true });
    }
  }, []);

  return (
    <div className="flex h-full w-full flex-col">
      <CustomerTopBar title="會員" showBackButton={true} />
      <div className="flex flex-col w-full justify-center p-page">
        <h1 className="type-h1 pt-card">用手機號碼就好</h1>
        <p className="type-body-sm pt-3">不用設密碼。每次登入都發一次驗證碼。</p>

        <div className="grid grid-cols-1 pt-6 gap-2">
          <p className="type-caption">手機號碼</p>
          <div className="bg-surface rounded-btn">
            <SOFormInput
              type={SOFormInputType.PHONE}
              defaultValue=""
              placeholder="請輸入手機號碼"
              onChange={(value) => setPhone(value)}
            />
          </div>
          {error && <p className="type-caption text-red-600">{error}</p>} 
        </div>

        <div className="pt-section">
          <SOButton
            text={waiting ? `${formatCountdown(secondsLeft)} 後可以再傳送` : sending ? "傳送中…" : "傳送驗證碼"}
            disabled={sending || !phone || waiting}
            height="h-13"
            onClick={handleSendCode}                                       
          />
        </div>

        <div className="pt-section">
          <InfoBox
            icon="circle"
            col="quiet"
            text="F"
            custimtext={
              <p>
                <span className="font-semibold">第一次來也是按這裡</span>。號碼沒登記過，驗證完
                會直接帶你填姓名與生日，不用先分「登入」還是「註冊」。
              </p>
            }
          />
        </div>

        <div className="flex w-full justify-center pt-section type-body text-ink-600">
          <button type="button" onClick={() => navigate(skipTo, { replace: true })}>先不登入，繼續</button>
        </div>
      </div>
    </div>
  );
}
