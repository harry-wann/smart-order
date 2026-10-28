import React from "react";
import {useNavigate} from "react-router";
import { SvgIconMap } from "@/assets/SvgIconMap";
import CardLink from "../../components/card/CardLink";
import InfoBox from "../../components/InfoBox";

// 原檔名 entrance.jsx
// 原路徑 src/features/customer/order


export default function Entrance() {
  const navigate=useNavigate();
  const member = {
    icon: SvgIconMap.OrderMember,
    textH2: "會員登入",
    textP: "查看與管理你的會員資料",
    onclick:()=>navigate("/member")
  }


  return (
    <>
      <div className="w-full h-[45vh] relative">
        {/* TODO: 店家形象照尚未入庫（ic_test_page.png 已自 repo 移除），先用底色佔位 */}
        <div className="w-full h-full bg-ink-900" />
        <div className="absolute bottom-0 w-ful px-4">
            <h2 className="type-h2 text-surface">鼎沸鍋物</h2>
            <p className="type-caption text-surface">中山北路二段 共鍋 32 年</p>   
        </div>
      </div>
      <div className="grid grid-cols-1 py-5 px-4 gap-3">
        <CardLink data={member} />
      </div>
      {/* 這裡只是提示，真正的入口是桌上 QR（/order/checkin/桌號）；
          點了固定帶到某一桌，會把正在別桌點餐的人登出並帶到錯的桌 */}
      <div className="px-4">
        <InfoBox outicon={SvgIconMap.OrderQrcode} col="quiet" text="F" custimtext={
            <>
              <p>
                <span className="font-semibold">已經坐在店裡了？</span>
                掃桌上的 QR code 就直接開始點餐。
              </p>
            </>} />
      </div>
      <div className="flex w-full bg-surface fixed bottom-0 justify-center type-caption pt-2 pb-8">
          11:30–14:00 17:00–22:00 最後點餐 21:00
      </div>
    </>
  );
}
