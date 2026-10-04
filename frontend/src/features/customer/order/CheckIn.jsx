import React, { useState } from "react";
import Badge from "../../../components/Badge";
import InfoBox from "../../../components/InfoBox";
import SOButton from "../../../components/SOButton";

// 原檔名 Movein.jsx
// 原 component 名 Movein


export function CheckIn() {


  const val={
    tab:"A03",
    adult:2,
    child:1,
    time:'18:32',
    bol:true
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
      <div className="flex flex-col items-center justify-center w-full py-section px-field">
        <Badge text="用餐中" col="rec" />
        <h1 className="type-display pt-field">{val.tab}桌</h1>
        <p className="type-body-sm py-field">{val.adult}大 {val.child}小 {val.time}入座</p>
        <InfoBox icon="check" col="ok" text="F" custimtext=
          {<>
          這桌櫃檯已經開好了，直接開始點就可以。
          同桌的人掃同一張碼會看到一樣的訂單。
          </>} />
        
        <SOButton
                  height="h-12"
                  text="開始點餐"
                  disabled={false}
                  onClick={() => console.log("開始點餐")}
                />
        <a>有訂位？查詢我的預約</a>
        
      </div>



      <div className="flex w-full bg-surface fixed bottom-0 justify-center type-caption pt-2 pb-8">
          桌上的 QR code 是固定的，每次來掃同一張就好
      </div>

    </>
  );
}